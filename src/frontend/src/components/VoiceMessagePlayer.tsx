import { Skeleton } from "@/components/ui/skeleton";
import { HttpAgent } from "@icp-sdk/core/agent";
import { Pause, Play } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { loadConfig } from "../config";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { StorageClient } from "../utils/StorageClient";

export interface VoiceMessagePlayerProps {
  audioHash: string;
  duration: number; // seconds
  isSent: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const BAR_HEIGHTS = [
  3, 5, 7, 5, 8, 6, 10, 8, 6, 9, 7, 5, 8, 10, 7, 5, 9, 6, 8, 5, 7, 9, 5, 4,
];

export function VoiceMessagePlayer({
  audioHash,
  duration,
  isSent,
}: VoiceMessagePlayerProps) {
  const { identity } = useInternetIdentity();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchUrl() {
      setLoading(true);
      try {
        const config = await loadConfig();
        const agent = new HttpAgent({
          host: config.backend_host,
          identity: identity ?? undefined,
        });
        const storageClient = new StorageClient(
          config.bucket_name,
          config.storage_gateway_url,
          config.backend_canister_id,
          config.project_id,
          agent,
        );
        const url = await storageClient.getDirectURL(audioHash);
        if (!cancelled) setAudioUrl(url);
      } catch {
        // silently fail; user can retry by re-opening chat
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchUrl();
    return () => {
      cancelled = true;
    };
  }, [audioHash, identity]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  function togglePlay() {
    if (!audioUrl) return;
    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  const total = duration || 1;
  const progressPercent = Math.min((currentTime / total) * 100, 100);
  const displayTime = isPlaying
    ? formatTime(Math.max(0, total - currentTime))
    : formatTime(total);

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 py-1"
        data-ocid="voice_player.loading_state"
      >
        <Skeleton className="w-7 h-7 rounded-full" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-2.5 w-10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[160px] max-w-[220px] py-0.5">
      <button
        type="button"
        onClick={togglePlay}
        disabled={!audioUrl}
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40 ${
          isSent
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-primary/30 hover:bg-primary/40 text-primary"
        }`}
        data-ocid="voice_player.toggle"
      >
        {isPlaying ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3 ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Waveform-style bars (static decorative) + progress overlay */}
        <div className="relative h-5 flex items-center gap-px">
          {BAR_HEIGHTS.map((barH, i) => {
            const pct = ((i + 1) / BAR_HEIGHTS.length) * 100;
            const active = pct <= progressPercent;
            return (
              <motion.div
                // biome-ignore lint/suspicious/noArrayIndexKey: static fixed-length decorative bars
                key={`bar-${i}`}
                className={`rounded-full flex-1 transition-colors ${
                  active
                    ? isSent
                      ? "bg-white/80"
                      : "bg-primary/80"
                    : isSent
                      ? "bg-white/25"
                      : "bg-white/20"
                }`}
                style={{ height: `${barH}px` }}
                animate={
                  isPlaying && active ? { scaleY: [1, 1.3, 1] } : { scaleY: 1 }
                }
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 0.6,
                  delay: i * 0.02,
                }}
              />
            );
          })}
        </div>
        <span
          className={`text-[10px] font-mono ${
            isSent ? "text-white/60" : "text-muted-foreground"
          }`}
        >
          {displayTime}
        </span>
      </div>
    </div>
  );
}
