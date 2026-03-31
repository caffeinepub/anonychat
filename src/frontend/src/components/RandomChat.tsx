import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HttpAgent } from "@icp-sdk/core/agent";
import { Mic } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { RandomVoiceMessage } from "../backend.d";
import { loadConfig } from "../config";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { StorageClient } from "../utils/StorageClient";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import { VoiceRecorder } from "./VoiceRecorder";

type MatchStatus =
  | { NotInQueue: null }
  | { Waiting: { joinedAt: bigint } }
  | { Matched: { sessionId: bigint; partnerAnonId: string } }
  | { TimedOut: null };

interface RandomMessage {
  id: bigint;
  sessionId: bigint;
  senderAnonId: string;
  content: string;
  timestamp: bigint;
}

type ChatPhase = "idle" | "waiting" | "chatting";

interface RandomChatProps {
  myAnonId: string;
}

type UnifiedMsg =
  | { kind: "text"; id: string; timestamp: bigint; msg: RandomMessage }
  | { kind: "voice"; id: string; timestamp: bigint; msg: RandomVoiceMessage };

function PulsingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

export function RandomChat({ myAnonId }: RandomChatProps) {
  const { actor: _actor, isFetching } = useActor();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = _actor as any;
  const { identity } = useInternetIdentity();
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [countdown, setCountdown] = useState(30);
  const [sessionId, setSessionId] = useState<bigint | null>(null);
  const [partnerAnonId, setPartnerAnonId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RandomMessage[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<RandomVoiceMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const msgPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clearPollIntervals = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const clearMsgPoll = useCallback(() => {
    if (msgPollTimeoutRef.current) {
      clearTimeout(msgPollTimeoutRef.current);
      msgPollTimeoutRef.current = null;
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup on unmount only
  useEffect(() => {
    return () => {
      clearPollIntervals();
      clearMsgPoll();
    };
  }, []);

  // Auto-scroll on new messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, voiceMessages]);

  const startMatchPolling = useCallback(() => {
    if (!actor) return;

    setCountdown(30);

    // Countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearPollIntervals();
          setPhase("idle");
          toast.error("No stranger found. Try again!", { duration: 3000 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Status poll (recursive setTimeout avoids overlap on slow network)
    const pollMatch = async () => {
      try {
        const status: MatchStatus = await actor.checkMatchStatus();
        if ("Matched" in status) {
          clearPollIntervals();
          setSessionId(status.Matched.sessionId);
          setPartnerAnonId(status.Matched.partnerAnonId);
          setMessages([]);
          setVoiceMessages([]);
          setPhase("chatting");
          toast.success("Connected with a stranger!", { duration: 2500 });
          return; // stop polling
        }
        if ("TimedOut" in status || "NotInQueue" in status) {
          clearPollIntervals();
          setPhase("idle");
          toast.error("No stranger found. Try again!", { duration: 3000 });
          return; // stop polling
        }
      } catch {
        // silent
      }
      pollTimeoutRef.current = setTimeout(pollMatch, 1500);
    };
    pollTimeoutRef.current = setTimeout(pollMatch, 1500);
  }, [actor, clearPollIntervals]);

  const startMsgPolling = useCallback(
    (sid: bigint) => {
      if (!actor) return;
      const pollMsgs = async () => {
        try {
          const [msgs, vMsgs] = await Promise.all([
            actor.getRandomMessages(sid),
            actor.getRandomVoiceMessages(sid),
          ]);
          setMessages(
            [...msgs].sort((a: RandomMessage, b: RandomMessage) =>
              a.timestamp < b.timestamp ? -1 : 1,
            ),
          );
          setVoiceMessages(
            [...vMsgs].sort((a: RandomVoiceMessage, b: RandomVoiceMessage) =>
              a.timestamp < b.timestamp ? -1 : 1,
            ),
          );
        } catch {
          // silent
        }
        msgPollTimeoutRef.current = setTimeout(pollMsgs, 2000);
      };
      pollMsgs();
    },
    [actor],
  );

  useEffect(() => {
    if (phase === "chatting" && sessionId !== null) {
      startMsgPolling(sessionId);
      return () => clearMsgPoll();
    }
  }, [phase, sessionId, startMsgPolling, clearMsgPoll]);

  const handleFindStranger = async () => {
    if (!actor || isFetching) return;
    setIsConnecting(true);
    try {
      const status: MatchStatus = await actor.joinMatchQueue();
      if ("Matched" in status) {
        setSessionId(status.Matched.sessionId);
        setPartnerAnonId(status.Matched.partnerAnonId);
        setMessages([]);
        setVoiceMessages([]);
        setPhase("chatting");
        toast.success("Instantly matched!", { duration: 2500 });
      } else if ("Waiting" in status) {
        setPhase("waiting");
        startMatchPolling();
      } else {
        toast.error("Could not join queue. Try again.");
      }
    } catch {
      toast.error("Failed to join queue. Try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCancel = async () => {
    clearPollIntervals();
    try {
      if (actor) await actor.leaveMatchQueue();
    } catch {
      // silent
    }
    setPhase("idle");
    setCountdown(30);
  };

  const handleDisconnect = async () => {
    clearMsgPoll();
    try {
      if (actor && sessionId !== null) await actor.endRandomSession(sessionId);
    } catch {
      // silent
    }
    setPhase("idle");
    setSessionId(null);
    setPartnerAnonId(null);
    setMessages([]);
    setVoiceMessages([]);
    setShowVoiceRecorder(false);
  };

  const handleSend = async () => {
    if (!actor || !sessionId || !inputValue.trim() || isSending) return;
    const text = inputValue.trim();
    setInputValue("");
    setIsSending(true);
    try {
      await actor.sendRandomMessage(sessionId, text);
      // Immediately fetch updated messages
      const msgs = await actor.getRandomMessages(sessionId);
      setMessages(
        [...msgs].sort((a: RandomMessage, b: RandomMessage) =>
          a.timestamp < b.timestamp ? -1 : 1,
        ),
      );
    } catch {
      toast.error("Failed to send message");
      setInputValue(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    if (!actor || !sessionId) return;
    setIsSendingVoice(true);
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
      const bytes = new Uint8Array(await audioBlob.arrayBuffer());
      const { hash } = await storageClient.putFile(bytes);
      await actor.sendRandomVoiceMessage(
        sessionId,
        hash,
        BigInt(Math.round(duration)),
      );
      // Immediately refresh voice messages
      const vMsgs = await actor.getRandomVoiceMessages(sessionId);
      setVoiceMessages(
        [...vMsgs].sort((a: RandomVoiceMessage, b: RandomVoiceMessage) =>
          a.timestamp < b.timestamp ? -1 : 1,
        ),
      );
      setShowVoiceRecorder(false);
      toast.success("Voice message sent");
    } catch {
      toast.error("Failed to send voice message");
    } finally {
      setIsSendingVoice(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Merge text + voice messages sorted by timestamp
  const unified: UnifiedMsg[] = [
    ...messages.map((m) => ({
      kind: "text" as const,
      id: `t-${m.id}`,
      timestamp: m.timestamp,
      msg: m,
    })),
    ...voiceMessages.map((m) => ({
      kind: "voice" as const,
      id: `v-${m.id}`,
      timestamp: m.timestamp,
      msg: m,
    })),
  ].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  return (
    <div className="h-full flex flex-col">
      <AnimatePresence mode="wait">
        {/* === IDLE === */}
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-12"
            data-ocid="random.section"
          >
            <div className="text-center space-y-4 max-w-xs">
              <motion.div
                animate={{ rotate: [0, 10, -10, 6, -6, 0] }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 4,
                }}
                className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-10 h-10 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="Shuffle icon"
                  role="img"
                >
                  <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
                  <path d="m18 2 4 4-4 4" />
                  <path d="M2 6h1.9c1 0 1.8.4 2.5 1" />
                  <path d="M22 18h-5.9c-1 0-1.8-.4-2.5-1" />
                  <path d="m18 14 4 4-4 4" />
                </svg>
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Random Chat</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Connect instantly with an anonymous stranger. No names, no
                  history — just conversation.
                </p>
              </div>

              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                {["Anonymous", "Instant", "Voice"].map((label) => (
                  <span
                    key={label}
                    className="px-2 py-1 rounded-full bg-white/5 border border-white/10"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleFindStranger}
              disabled={isConnecting || isFetching}
              data-ocid="random.primary_button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-10 py-6 rounded-xl shadow-cyan-glow transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-base"
            >
              {isConnecting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                    className="mr-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  />
                  Connecting...
                </>
              ) : (
                "Find Stranger"
              )}
            </Button>
          </motion.div>
        )}

        {/* === WAITING === */}
        {phase === "waiting" && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-12"
            data-ocid="random.loading_state"
          >
            <div className="text-center space-y-6">
              {/* Animated radar */}
              <div className="relative mx-auto w-24 h-24">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-primary/30"
                    animate={{ scale: [1, 1.8 + i * 0.3], opacity: [0.5, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.5,
                      ease: "easeOut",
                    }}
                  />
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center">
                    <PulsingDots />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Searching for a stranger...
                </p>
                <p className="text-sm text-muted-foreground">
                  Timeout in{" "}
                  <span
                    className={`font-mono font-bold ${
                      countdown <= 3 ? "text-red-400" : "text-primary"
                    }`}
                  >
                    {countdown}s
                  </span>
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-48 h-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 30, ease: "linear" }}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={handleCancel}
              data-ocid="random.cancel_button"
              className="text-muted-foreground hover:text-foreground border border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
          </motion.div>
        )}

        {/* === CHATTING === */}
        {phase === "chatting" && (
          <motion.div
            key="chatting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col min-h-0"
            data-ocid="random.panel"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-xs text-primary font-bold">?</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Stranger</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {partnerAnonId}
                  </p>
                </div>
                <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.2_145)] inline-block ml-1" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                data-ocid="random.delete_button"
                className="text-muted-foreground hover:text-red-400 border border-white/10 hover:border-red-400/30 hover:bg-red-400/5 text-xs"
              >
                Disconnect
              </Button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 px-4 py-4"
              data-ocid="random.table"
            >
              {unified.length === 0 ? (
                <div
                  className="text-center py-12 space-y-2"
                  data-ocid="random.empty_state"
                >
                  <p className="text-sm text-muted-foreground">
                    Say hello to your stranger! 👋
                  </p>
                  <p className="text-xs text-muted-foreground/50">
                    Text and voice messages supported
                  </p>
                </div>
              ) : (
                unified.map((item, idx) => {
                  if (item.kind === "text") {
                    const msg = item.msg as RandomMessage;
                    const isOwn = msg.senderAnonId === myAnonId;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        data-ocid={`random.item.${idx + 1}`}
                        className={`flex ${
                          isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[72%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                            isOwn
                              ? "bg-[oklch(0.38_0.12_185)] text-[oklch(0.92_0.05_185)] rounded-br-sm"
                              : "bg-white/8 text-foreground rounded-bl-sm border border-white/8"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </motion.div>
                    );
                  }

                  // voice message
                  const vMsg = item.msg as RandomVoiceMessage;
                  const isOwn = vMsg.senderAnonId === myAnonId;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      data-ocid={`random.item.${idx + 1}`}
                      className={`flex ${
                        isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`px-3 py-2 rounded-2xl ${
                          isOwn
                            ? "bg-[oklch(0.38_0.12_185)] rounded-br-sm"
                            : "bg-white/8 rounded-bl-sm border border-white/8"
                        }`}
                      >
                        <VoiceMessagePlayer
                          audioHash={vMsg.audioHash}
                          duration={Number(vMsg.duration)}
                          isSent={isOwn}
                        />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Input area */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 flex-shrink-0">
              {showVoiceRecorder ? (
                <VoiceRecorder
                  onSend={handleVoiceSend}
                  onCancel={() => setShowVoiceRecorder(false)}
                  isSending={isSendingVoice}
                />
              ) : (
                <>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isSending}
                    maxLength={500}
                    data-ocid="random.input"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 placeholder:text-muted-foreground/50 transition-colors disabled:opacity-50"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowVoiceRecorder(true)}
                    disabled={isSending}
                    data-ocid="random.toggle"
                    className="border border-white/10 hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-muted-foreground rounded-xl px-3 py-2.5 h-auto shrink-0"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isSending}
                    data-ocid="random.submit_button"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2.5 h-auto shrink-0 disabled:opacity-40"
                  >
                    {isSending ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.8,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                      />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4"
                        fill="currentColor"
                        aria-label="Send"
                        role="img"
                      >
                        <path d="M2 21 23 12 2 3v7l15 2-15 2z" />
                      </svg>
                    )}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
