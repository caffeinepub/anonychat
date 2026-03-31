import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { HttpAgent } from "@icp-sdk/core/agent";
import {
  Ban,
  ChevronLeft,
  Flag,
  Mic,
  MoreVertical,
  Search,
  Send,
  Smile,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import type { VoiceMessage } from "../backend.d";
import { loadConfig } from "../config";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  type Message,
  useBlockUser,
  useDeleteMessage,
  useFindUser,
  useGetBlockedUsers,
  useGetConversation,
  useGetVoiceMessages,
  useReportUser,
  useSendMessage,
  useSendVoiceMessage,
  useUnblockUser,
} from "../hooks/useQueries";
import { StorageClient } from "../utils/StorageClient";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import { VoiceRecorder } from "./VoiceRecorder";

const CONTACTS_KEY = "anonychat_contacts";

const COMMON_EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "😢",
  "😡",
  "👍",
  "👎",
  "❤️",
  "🔥",
  "✨",
  "🎉",
  "💯",
  "🙏",
  "👀",
  "💀",
  "🤣",
  "😭",
  "🫡",
  "🤩",
  "😴",
  "🤫",
  "🫶",
  "💪",
  "🤝",
  "👻",
  "🌚",
  "🎭",
  "💬",
  "🔐",
  "⚡",
  "🌙",
  "⭐",
  "🎯",
  "🕵️",
  "🧊",
  "🫥",
  "🌀",
];

function loadContacts(): string[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveContacts(contacts: string[]) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

function addContact(anonId: string) {
  const contacts = loadContacts();
  if (!contacts.includes(anonId)) {
    saveContacts([anonId, ...contacts]);
  }
}

function formatTime(nanoseconds: bigint): string {
  const ms = Number(nanoseconds / 1_000_000n);
  const date = new Date(ms);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function GhostCountdown({
  ghostDeleteAt,
  onExpire,
}: {
  ghostDeleteAt: bigint;
  onExpire: () => void;
}) {
  const [seconds, setSeconds] = useState(() => {
    const nowNs = BigInt(Date.now()) * 1_000_000n;
    const diff = ghostDeleteAt - nowNs;
    return Math.max(0, Number(diff / 1_000_000_000n));
  });

  useEffect(() => {
    if (seconds <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          onExpire();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds, onExpire]);

  return (
    <span className="text-[10px] text-muted-foreground ml-1 font-mono">
      {seconds}s
    </span>
  );
}

function MessageBubble({
  msg,
  isMine,
  otherAnonId,
}: {
  msg: Message;
  isMine: boolean;
  otherAnonId: string;
}) {
  const [expired, setExpired] = useState(false);
  const deleteMessage = useDeleteMessage();

  const handleExpire = useCallback(() => {
    setExpired(true);
    deleteMessage.mutate({ msgId: msg.id, otherAnonId });
  }, [deleteMessage, msg.id, otherAnonId]);

  if (expired) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: isMine ? 20 : -20, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words ${
          isMine
            ? "bg-primary/20 text-foreground rounded-br-sm border border-primary/30"
            : "bg-white/5 text-foreground rounded-bl-sm border border-white/8"
        } ${msg.isGhost ? "border-dashed" : ""}`}
      >
        {msg.isGhost && <span className="mr-1 text-[13px]">👻</span>}
        <span>{msg.content}</span>
        <div
          className={`flex items-center gap-1 mt-0.5 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span className="text-[10px] text-muted-foreground">
            {formatTime(msg.timestamp)}
          </span>
          {msg.isGhost && msg.ghostDeleteAt != null && (
            <GhostCountdown
              ghostDeleteAt={msg.ghostDeleteAt}
              onExpire={handleExpire}
            />
          )}
          {isMine && (
            <button
              type="button"
              onClick={() =>
                deleteMessage.mutate({ msgId: msg.id, otherAnonId })
              }
              className="ml-1 text-muted-foreground/30 hover:text-destructive transition-colors"
              data-ocid="chat.delete_button"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function VoiceBubble({
  msg,
  isMine,
}: {
  msg: VoiceMessage;
  isMine: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: isMine ? 20 : -20, y: 4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
    >
      <div
        className={`rounded-2xl px-3 py-2 ${
          isMine
            ? "bg-primary/20 border border-primary/30 rounded-br-sm"
            : "bg-white/5 border border-white/8 rounded-bl-sm"
        }`}
      >
        <VoiceMessagePlayer
          audioHash={msg.audioHash}
          duration={Number(msg.duration)}
          isSent={isMine}
        />
        <div
          className={`flex items-center gap-1 mt-0.5 ${
            isMine ? "justify-end" : "justify-start"
          }`}
        >
          <span className="text-[10px] text-muted-foreground">
            {formatTime(msg.timestamp)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ReportDialog({
  open,
  onClose,
  targetAnonId,
}: {
  open: boolean;
  onClose: () => void;
  targetAnonId: string;
}) {
  const [reason, setReason] = useState("");
  const reportUser = useReportUser();

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    try {
      await reportUser.mutateAsync({
        anonId: targetAnonId,
        reason: reason.trim(),
      });
      toast.success("Report submitted");
      setReason("");
      onClose();
    } catch {
      toast.error("Failed to submit report");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-[oklch(0.13_0_0)] border-white/10"
        data-ocid="chat.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Report User</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-3">
            Report{" "}
            <span className="font-mono text-primary">{targetAnonId}</span>
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue..."
            className="bg-white/5 border-white/10 resize-none"
            rows={4}
            data-ocid="chat.textarea"
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            data-ocid="chat.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || reportUser.isPending}
            className="bg-destructive/80 hover:bg-destructive text-white"
            data-ocid="chat.confirm_button"
          >
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type UnifiedMessage =
  | { type: "text"; id: string; timestamp: bigint; data: Message }
  | { type: "voice"; id: string; timestamp: bigint; data: VoiceMessage };

function ChatWindow({
  myAnonId,
  contactAnonId,
  contactProfile,
  onBack,
}: {
  myAnonId: string;
  contactAnonId: string;
  contactProfile: UserProfile | null;
  onBack: () => void;
}) {
  const [input, setInput] = useState("");
  const [ghostMode, setGhostMode] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { identity } = useInternetIdentity();

  const { data: messages = [] } = useGetConversation(contactAnonId);
  const { data: voiceMessages = [] } = useGetVoiceMessages(contactAnonId);
  const { data: blockedUsers = [] } = useGetBlockedUsers();
  const sendMessage = useSendMessage();
  const sendVoiceMessage = useSendVoiceMessage();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  const isBlocked = blockedUsers.includes(contactAnonId);

  // Merge text + voice messages, sort by timestamp
  const unified: UnifiedMessage[] = [
    ...messages.map(
      (m): UnifiedMessage => ({
        type: "text",
        id: `t-${m.id.toString()}`,
        timestamp: m.timestamp,
        data: m,
      }),
    ),
    ...voiceMessages.map(
      (m): UnifiedMessage => ({
        type: "voice",
        id: `v-${m.id.toString()}`,
        timestamp: m.timestamp,
        data: m,
      }),
    ),
  ].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  const msgCount = unified.length;

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [msgCount]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      await sendMessage.mutateAsync({
        receiverAnonId: contactAnonId,
        content: text,
        isGhost: ghostMode,
      });
    } catch {
      toast.error("Failed to send message");
      setInput(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBlock = async () => {
    try {
      if (isBlocked) {
        await unblockUser.mutateAsync(contactAnonId);
        toast.success("User unblocked");
      } else {
        await blockUser.mutateAsync(contactAnonId);
        toast.success("User blocked");
      }
    } catch {
      toast.error("Action failed");
    }
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
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
      await sendVoiceMessage.mutateAsync({
        receiverAnonId: contactAnonId,
        audioHash: hash,
        duration: BigInt(Math.round(duration)),
      });
      setShowVoiceRecorder(false);
      toast.success("Voice message sent");
    } catch {
      toast.error("Failed to send voice message");
    } finally {
      setIsSendingVoice(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[oklch(0.11_0_0)]">
        <button
          type="button"
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground"
          data-ocid="chat.secondary_button"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-medium text-primary truncate">
            {contactAnonId}
          </div>
          {contactProfile?.username && (
            <div className="text-xs text-muted-foreground truncate">
              {contactProfile.username}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {contactProfile && (
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                contactProfile.isOnline
                  ? "bg-[oklch(0.72_0.2_145)] online-pulse"
                  : "bg-[oklch(0.45_0_0)]"
              }`}
            />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                data-ocid="chat.dropdown_menu"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[oklch(0.14_0_0)] border-white/10"
            >
              <DropdownMenuItem
                onClick={handleBlock}
                className="text-sm cursor-pointer"
                data-ocid="chat.toggle"
              >
                <Ban className="w-4 h-4 mr-2" />
                {isBlocked ? "Unblock User" : "Block User"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setReportOpen(true)}
                className="text-sm cursor-pointer text-destructive focus:text-destructive"
                data-ocid="chat.button"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-center">
          <p className="text-xs text-destructive">
            You have blocked this user. Unblock to send messages.
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {unified.length === 0 ? (
          <div
            className="text-center py-12 text-muted-foreground"
            data-ocid="chat.empty_state"
          >
            <div className="text-4xl mb-3">👻</div>
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1">
              Send a message to start the conversation.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {unified.map((item) =>
              item.type === "text" ? (
                <MessageBubble
                  key={item.id}
                  msg={item.data as Message}
                  isMine={(item.data as Message).senderId === myAnonId}
                  otherAnonId={contactAnonId}
                />
              ) : (
                <VoiceBubble
                  key={item.id}
                  msg={item.data as VoiceMessage}
                  isMine={(item.data as VoiceMessage).senderId === myAnonId}
                />
              ),
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-white/5 bg-[oklch(0.11_0_0)]">
        <AnimatePresence mode="wait">
          {showVoiceRecorder ? (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <VoiceRecorder
                onSend={handleVoiceSend}
                onCancel={() => setShowVoiceRecorder(false)}
                isSending={isSendingVoice}
              />
            </motion.div>
          ) : (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <div className="flex items-end gap-2">
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
                      data-ocid="chat.button"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-64 p-2 bg-[oklch(0.14_0_0)] border-white/10"
                    side="top"
                    align="start"
                    data-ocid="chat.popover"
                  >
                    <div className="grid grid-cols-8 gap-1">
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setInput((prev) => prev + emoji);
                            setEmojiOpen(false);
                          }}
                          className="text-lg h-8 w-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGhostMode((v) => !v)}
                  className={`h-9 w-9 p-0 flex-shrink-0 transition-colors ${
                    ghostMode
                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={
                    ghostMode
                      ? "Ghost mode ON (auto-delete in 60s)"
                      : "Ghost mode OFF"
                  }
                  data-ocid="chat.toggle"
                >
                  <span className="text-base">👻</span>
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    ghostMode ? "Ghost message (60s)..." : "Message..."
                  }
                  disabled={isBlocked}
                  className={`flex-1 bg-white/5 border-white/10 focus:border-primary/40 rounded-xl h-9 text-sm ${
                    ghostMode ? "border-dashed border-primary/30" : ""
                  }`}
                  data-ocid="chat.input"
                />

                {/* Mic button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowVoiceRecorder(true)}
                  disabled={isBlocked}
                  className="h-9 w-9 p-0 flex-shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-40"
                  data-ocid="chat.secondary_button"
                  title="Record voice message"
                >
                  <Mic className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!input.trim() || isBlocked || sendMessage.isPending}
                  className="h-9 w-9 p-0 flex-shrink-0 bg-primary/80 hover:bg-primary text-primary-foreground rounded-xl"
                  data-ocid="chat.submit_button"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>

              {ghostMode && (
                <p className="text-[10px] text-primary/60 mt-1.5 flex items-center gap-1">
                  <span>👻</span> Ghost mode — messages auto-delete after 60
                  seconds
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetAnonId={contactAnonId}
      />
    </div>
  );
}

function ContactRow({
  anonId,
  isActive,
  onClick,
}: {
  anonId: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const { data: profile } = useFindUser(anonId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${
        isActive ? "bg-primary/10 border-r-2 border-primary" : ""
      }`}
      data-ocid="chat.row"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-base">
        👤
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs text-primary truncate">{anonId}</div>
        {profile?.username && (
          <div className="text-xs text-muted-foreground truncate">
            {profile.username}
          </div>
        )}
      </div>
      {profile && (
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            profile.isOnline
              ? "bg-[oklch(0.72_0.2_145)]"
              : "bg-[oklch(0.45_0_0)]"
          }`}
        />
      )}
    </button>
  );
}

export function ChatView({
  myAnonId,
  initialContact,
}: { myAnonId: string; initialContact?: string }) {
  const [contacts, setContacts] = useState<string[]>(() => loadContacts());
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<
    UserProfile | null | undefined
  >(undefined);
  const [searching, setSearching] = useState(false);
  const { actor } = useActor();

  const handleSearch = async () => {
    const id = searchId.trim();
    if (!id || !actor) return;
    setSearching(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).findUserByAnonId(id);
      setSearchResult(result);
      if (!result) toast.error("User not found");
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = (anonId: string, profile: UserProfile | null) => {
    addContact(anonId);
    setContacts(loadContacts());
    setActiveContact(anonId);
    setActiveProfile(profile);
    setSearchId("");
    setSearchResult(undefined);
  };

  const handleSelectContact = (anonId: string) => {
    setActiveContact(anonId);
    setActiveProfile(null);
  };

  useEffect(() => {
    if (initialContact) {
      addContact(initialContact);
      setContacts(loadContacts());
      setActiveContact(initialContact);
      setActiveProfile(null);
    }
  }, [initialContact]);

  const showMobileChat = activeContact !== null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left panel */}
      <div
        className={`flex flex-col border-r border-white/5 bg-[oklch(0.10_0_0)] ${
          showMobileChat
            ? "hidden md:flex md:w-72 lg:w-80"
            : "flex w-full md:w-72 lg:w-80"
        }`}
      >
        <div className="p-3 border-b border-white/5">
          <div className="flex gap-2">
            <Input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="+777 XXXX XXXX"
              className="bg-white/5 border-white/10 text-xs font-mono h-9 focus:border-primary/40"
              data-ocid="chat.search_input"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSearch}
              disabled={!searchId.trim() || searching}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
              data-ocid="chat.secondary_button"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <AnimatePresence>
            {searchResult !== undefined && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2"
              >
                {searchResult ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-primary truncate">
                        {searchId.trim()}
                      </div>
                      {searchResult.username && (
                        <div className="text-xs text-muted-foreground">
                          {searchResult.username}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleStartChat(searchId.trim(), searchResult)
                      }
                      className="h-7 text-xs bg-primary/80 hover:bg-primary text-primary-foreground"
                      data-ocid="chat.primary_button"
                    >
                      Chat
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    No user found
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div
              className="text-center py-10 px-4 text-muted-foreground"
              data-ocid="chat.empty_state"
            >
              <div className="text-3xl mb-2">💬</div>
              <p className="text-xs">No conversations yet.</p>
              <p className="text-xs mt-1">
                Search by anonymous ID to start chatting.
              </p>
            </div>
          ) : (
            contacts.map((anonId) => (
              <ContactRow
                key={anonId}
                anonId={anonId}
                isActive={activeContact === anonId}
                onClick={() => handleSelectContact(anonId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          showMobileChat ? "flex" : "hidden md:flex"
        }`}
      >
        {activeContact ? (
          <ChatWindow
            myAnonId={myAnonId}
            contactAnonId={activeContact}
            contactProfile={activeProfile}
            onBack={() => setActiveContact(null)}
          />
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center text-muted-foreground"
            data-ocid="chat.panel"
          >
            <div className="text-5xl mb-4">🔐</div>
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs mt-1">or search by Anonymous ID to start</p>
          </div>
        )}
      </div>
    </div>
  );
}
