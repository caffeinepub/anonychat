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

// ─── Voice Mask ────────────────────────────────────────────────────────────

export type VoiceMask = "Normal" | "Deep" | "Robot" | "Alien" | "Echo";

const VOICE_MASKS: {
  id: VoiceMask;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    id: "Normal",
    label: "Normal",
    icon: "🎙️",
    color: "bg-white/10 text-white/70 border-white/20",
  },
  {
    id: "Deep",
    label: "Derin",
    icon: "🎸",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  {
    id: "Robot",
    label: "Robot",
    icon: "🤖",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  {
    id: "Alien",
    label: "Uzaylı",
    icon: "👽",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    id: "Echo",
    label: "Eko",
    icon: "🌊",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
];

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = numSamples * numChannels * 2;
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let s = 0; s < numSamples; s++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[s]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

async function applyVoiceMask(blob: Blob, mask: VoiceMask): Promise<Blob> {
  if (mask === "Normal") return blob;

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);

    const offlineCtx = new OfflineAudioContext(
      decoded.numberOfChannels,
      decoded.length,
      decoded.sampleRate,
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;

    if (mask === "Deep") {
      source.playbackRate.value = 0.75;
      source.connect(offlineCtx.destination);
    } else if (mask === "Alien") {
      source.playbackRate.value = 1.4;
      source.connect(offlineCtx.destination);
    } else if (mask === "Robot") {
      const oscillator = offlineCtx.createOscillator();
      oscillator.frequency.value = 50;
      const ringGain = offlineCtx.createGain();
      ringGain.gain.value = 0;
      oscillator.connect(ringGain.gain as unknown as AudioNode);
      source.connect(ringGain);
      ringGain.connect(offlineCtx.destination);
      oscillator.start(0);
    } else if (mask === "Echo") {
      const delay = offlineCtx.createDelay(1.0);
      delay.delayTime.value = 0.3;
      const feedbackGain = offlineCtx.createGain();
      feedbackGain.gain.value = 0.4;
      source.connect(delay);
      source.connect(offlineCtx.destination);
      delay.connect(feedbackGain);
      feedbackGain.connect(delay);
      delay.connect(offlineCtx.destination);
    }

    source.start(0);
    const rendered = await offlineCtx.startRendering();
    await audioCtx.close();

    return audioBufferToWav(rendered);
  } catch (err) {
    console.warn("Voice mask processing failed, using original:", err);
    return blob;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

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
  const [selectedMask, setSelectedMask] = useState<VoiceMask>("Normal");
  const [isProcessing, setIsProcessing] = useState(false);

  const elapsedRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

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
    setIsProcessing(true);
    try {
      const processed = await applyVoiceMask(audioBlob, selectedMask);
      await onSend(processed, audioDuration);
      discard();
    } catch {
      toast.error("Failed to send voice message.");
    } finally {
      setIsProcessing(false);
    }
  }

  const progressPercent =
    phase === "recording"
      ? (elapsed / MAX_DURATION_SEC) * 100
      : audioDuration > 0
        ? (playbackTime / audioDuration) * 100
        : 0;

  const activeMask = VOICE_MASKS.find((m) => m.id === selectedMask)!;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Mask selector — only in idle phase */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col gap-1.5"
          >
            <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase px-0.5">
              🎭 Ses Maskesi
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {VOICE_MASKS.map((mask) => (
                <button
                  key={mask.id}
                  type="button"
                  onClick={() => setSelectedMask(mask.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-medium flex-shrink-0 transition-all ${
                    selectedMask === mask.id
                      ? `${mask.color} scale-105 shadow-sm`
                      : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                  }`}
                  data-ocid="voice_recorder.toggle"
                >
                  <span>{mask.icon}</span>
                  <span>{mask.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main recorder controls */}
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
                İptal
              </button>
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 flex-1 justify-center py-2 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 transition-colors"
                data-ocid="voice_recorder.primary_button"
              >
                <Mic className="w-4 h-4" />
                <span className="text-sm">Kayıt başlat</span>
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
              {/* Active mask badge */}
              {selectedMask !== "Normal" && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${activeMask.color}`}
                >
                  {activeMask.icon} {activeMask.label} aktif
                </span>
              )}

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
              <button
                type="button"
                onClick={discard}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                data-ocid="voice_recorder.delete_button"
              >
                <Trash2 className="w-4 h-4" />
              </button>

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

              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
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
                    {selectedMask !== "Normal" ? (
                      <>
                        {activeMask.icon} {activeMask.label}
                      </>
                    ) : (
                      <>
                        <MicOff className="w-2.5 h-2.5" /> voice
                      </>
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || isProcessing}
                className="w-8 h-8 rounded-full bg-primary/80 hover:bg-primary flex items-center justify-center text-primary-foreground transition-colors flex-shrink-0 disabled:opacity-50"
                data-ocid="voice_recorder.submit_button"
              >
                {isSending || isProcessing ? (
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
    </div>
  );
}
