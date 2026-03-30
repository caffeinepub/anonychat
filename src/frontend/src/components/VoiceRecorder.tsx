import { Mic, MicOff, Pause, Play, Send, Square, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_DURATION_SEC = 60;
const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500KB

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getPreferredMimeType(): string {
  const types = ["audio/webm", "audio/ogg", "audio/mp4"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => Promise<void>;
  onCancel: () => void;
  isSending?: boolean;
}

type Phase = "idle" | "recording" | "preview";

export function VoiceRecorder({
  onSend,
  onCancel,
  isSending,
}: VoiceRecorderProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Use ref to track elapsed in closures (avoids stale state capture)
  const elapsedRef = useRef(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  function stopStream() {
    const tracks = streamRef.current?.getTracks() ?? [];
    for (const t of tracks) t.stop();
    streamRef.current = null;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      elapsedRef.current = 0;

      const mimeType = getPreferredMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const mtype = mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mtype });
        if (blob.size > MAX_FILE_SIZE_BYTES) {
          toast.error(
            "Recording too large (max 500KB). Try a shorter message.",
          );
          setPhase("idle");
          setElapsed(0);
          elapsedRef.current = 0;
          return;
        }
        // Use ref value to avoid stale closure capturing initial elapsed=0
        const dur =
          elapsedRef.current > 0 ? elapsedRef.current : MAX_DURATION_SEC;
        setAudioDuration(dur);
        setAudioBlob(blob);
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = URL.createObjectURL(blob);
        setPhase("preview");
      };

      mr.start(100);
      setElapsed(0);
      elapsedRef.current = 0;
      setPhase("recording");

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          elapsedRef.current = next;
          if (next >= MAX_DURATION_SEC) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch {
      toast.error("Microphone permission denied.");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    stopStream();
  }

  function discard() {
    stopRecording();
    setPhase("idle");
    setElapsed(0);
    elapsedRef.current = 0;
    setAudioBlob(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackTime(0);
  }

  function togglePlayback() {
    if (!audioUrlRef.current) return;
    if (!audioRef.current) {
      const audio = new Audio(audioUrlRef.current);
      audioRef.current = audio;
      audio.ontimeupdate = () => setPlaybackTime(audio.currentTime);
      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
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

  async function handleSend() {
    if (!audioBlob) return;
    try {
      await onSend(audioBlob, audioDuration);
      discard();
    } catch {
      toast.error("Failed to send voice message.");
    }
  }

  const progressPercent =
    phase === "recording"
      ? (elapsed / MAX_DURATION_SEC) * 100
      : audioDuration > 0
        ? (playbackTime / audioDuration) * 100
        : 0;

  return (
    <div className="flex items-center gap-2 w-full">
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 w-full"
          >
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
              data-ocid="voice_recorder.cancel_button"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-2 flex-1 justify-center py-2 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition-colors"
              data-ocid="voice_recorder.primary_button"
            >
              <Mic className="w-4 h-4" />
              <span className="text-sm">Tap to record</span>
            </button>
          </motion.div>
        )}

        {phase === "recording" && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 w-full"
          >
            {/* Pulsing mic */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 1.2,
                ease: "easeInOut",
              }}
              className="w-8 h-8 rounded-full bg-red-500/30 border border-red-500/50 flex items-center justify-center flex-shrink-0"
            >
              <Mic className="w-3.5 h-3.5 text-red-400" />
            </motion.div>

            {/* Timer + progress */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-400 font-mono">
                  {formatTime(elapsed)}
                </span>
                <span className="text-muted-foreground/50 font-mono">
                  {formatTime(MAX_DURATION_SEC)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-red-500/70 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stop */}
            <button
              type="button"
              onClick={stopRecording}
              className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0"
              data-ocid="voice_recorder.secondary_button"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </motion.div>
        )}

        {phase === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 w-full"
          >
            {/* Discard */}
            <button
              type="button"
              onClick={discard}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              data-ocid="voice_recorder.delete_button"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Play/pause */}
            <button
              type="button"
              onClick={togglePlayback}
              className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors flex-shrink-0"
              data-ocid="voice_recorder.toggle"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>

            {/* Progress + duration */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden cursor-pointer">
                <motion.div
                  className="h-full bg-primary/70 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>
                  {isPlaying
                    ? formatTime(Math.floor(playbackTime))
                    : formatTime(audioDuration)}
                </span>
                <span className="opacity-50 flex items-center gap-0.5">
                  <MicOff className="w-2.5 h-2.5" /> voice
                </span>
              </div>
            </div>

            {/* Send */}
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="w-8 h-8 rounded-full bg-primary/80 hover:bg-primary flex items-center justify-center text-primary-foreground transition-colors flex-shrink-0 disabled:opacity-50"
              data-ocid="voice_recorder.submit_button"
            >
              {isSending ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 0.8,
                    ease: "linear",
                  }}
                  className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
