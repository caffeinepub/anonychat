import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Copy, Lock, LogIn, Plus, Send, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface RoomMessage {
  id: string;
  content: string;
  timestamp: number;
  sender: string;
}

interface SecretRoom {
  id: string;
  name: string;
  code: string;
  ephemeral: boolean;
  screenshotWarning: boolean;
  members: number;
  messages: RoomMessage[];
  createdAt: number;
  mood: "blue" | "purple" | "green" | "amber";
}

const ROOMS_KEY = "secret_rooms";

const MOOD_COLORS: Record<
  SecretRoom["mood"],
  { bg: string; border: string; text: string; badge: string }
> = {
  blue: {
    bg: "bg-[oklch(0.14_0.06_240)]",
    border: "border-[oklch(0.5_0.14_240_/35%)]",
    text: "text-[oklch(0.72_0.14_240)]",
    badge: "oklch(0.5 0.14 240)",
  },
  purple: {
    bg: "bg-[oklch(0.14_0.07_290)]",
    border: "border-[oklch(0.6_0.2_290_/35%)]",
    text: "text-[oklch(0.75_0.18_290)]",
    badge: "oklch(0.6 0.2 290)",
  },
  green: {
    bg: "bg-[oklch(0.14_0.06_150)]",
    border: "border-[oklch(0.55_0.15_150_/35%)]",
    text: "text-[oklch(0.72_0.15_150)]",
    badge: "oklch(0.55 0.15 150)",
  },
  amber: {
    bg: "bg-[oklch(0.15_0.06_65)]",
    border: "border-[oklch(0.7_0.16_65_/35%)]",
    text: "text-[oklch(0.8_0.14_65)]",
    badge: "oklch(0.7 0.16 65)",
  },
};

const FAKE_ROOMS: SecretRoom[] = [
  {
    id: "fake-room-1",
    name: "Gece Düşünceleri",
    code: "GCE77X",
    ephemeral: true,
    screenshotWarning: true,
    members: 8,
    messages: [
      {
        id: "m1",
        content: "Bugün çok yorucu geçti...",
        timestamp: Date.now() - 60000 * 5,
        sender: "+777 ****",
      },
      {
        id: "m2",
        content: "Benimle aynı 😔",
        timestamp: Date.now() - 60000 * 3,
        sender: "+777 ****",
      },
    ],
    createdAt: Date.now() - 60000 * 120,
    mood: "blue",
  },
  {
    id: "fake-room-2",
    name: "Sır Paylaşım Odası",
    code: "SIR42K",
    ephemeral: false,
    screenshotWarning: true,
    members: 14,
    messages: [
      {
        id: "m3",
        content: "Kimseye söyleyemediğim bir şey var...",
        timestamp: Date.now() - 60000 * 15,
        sender: "+777 ****",
      },
    ],
    createdAt: Date.now() - 60000 * 300,
    mood: "purple",
  },
  {
    id: "fake-room-3",
    name: "Fısıltılar",
    code: "FIS9QP",
    ephemeral: true,
    screenshotWarning: false,
    members: 5,
    messages: [],
    createdAt: Date.now() - 60000 * 45,
    mood: "amber",
  },
];

function generateCode(): string {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

function loadRooms(): SecretRoom[] {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    const stored: SecretRoom[] = raw ? JSON.parse(raw) : [];
    const existingIds = new Set(stored.map((r) => r.id));
    const fakeToAdd = FAKE_ROOMS.filter((f) => !existingIds.has(f.id));
    return [...fakeToAdd, ...stored];
  } catch {
    return [...FAKE_ROOMS];
  }
}

function saveRooms(rooms: SecretRoom[]) {
  const userCreated = rooms.filter((r) => !r.id.startsWith("fake-room-"));
  try {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(userCreated));
  } catch {
    /* ignore */
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "şimdi";
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}s önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

type Screen = "list" | "room";

export function SecretRooms({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<Screen>("list");
  const [rooms, setRooms] = useState<SecretRoom[]>(() => loadRooms());
  const [activeRoom, setActiveRoom] = useState<SecretRoom | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEphemeral, setNewEphemeral] = useState(true);
  const [newScreenshot, setNewScreenshot] = useState(true);
  const [newMood, setNewMood] = useState<SecretRoom["mood"]>("blue");
  const [joinCode, setJoinCode] = useState("");
  const [msgInput, setMsgInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Screenshot warning
  useEffect(() => {
    if (!activeRoom?.screenshotWarning) return;
    const handler = () => {
      toast.warning("📸 Ekran görüntüsü alınmamalı", { duration: 3000 });
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [activeRoom]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeRoom?.messages.length]);

  const handleCreateRoom = () => {
    if (!newName.trim()) return;
    const moodOptions: SecretRoom["mood"][] = [
      "blue",
      "purple",
      "green",
      "amber",
    ];
    const room: SecretRoom = {
      id: `room-${Date.now()}`,
      name: newName.trim(),
      code: generateCode(),
      ephemeral: newEphemeral,
      screenshotWarning: newScreenshot,
      members: 1,
      messages: [],
      createdAt: Date.now(),
      mood:
        newMood || moodOptions[Math.floor(Math.random() * moodOptions.length)],
    };
    setRooms((prev) => {
      const updated = [...prev, room];
      saveRooms(updated);
      return updated;
    });
    setNewName("");
    setShowCreate(false);
    toast.success(`Oda oluşturuldu — Kod: ${room.code}`);
    setActiveRoom(room);
    setScreen("room");
  };

  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    const found = rooms.find((r) => r.code === code);
    if (!found) {
      toast.error("Oda bulunamadı");
      return;
    }
    setActiveRoom(found);
    setScreen("room");
    setJoinCode("");
    setShowJoin(false);
  };

  const handleSendMessage = () => {
    if (!msgInput.trim() || !activeRoom) return;
    const msg: RoomMessage = {
      id: `msg-${Date.now()}`,
      content: msgInput.trim(),
      timestamp: Date.now(),
      sender: "+777 ****",
    };
    const updatedRoom = {
      ...activeRoom,
      messages: [...activeRoom.messages, msg],
    };
    setActiveRoom(updatedRoom);
    setRooms((prev) => {
      const updated = prev.map((r) =>
        r.id === activeRoom.id ? updatedRoom : r,
      );
      saveRooms(updated);
      return updated;
    });
    setMsgInput("");
  };

  const handleLeaveRoom = () => {
    if (activeRoom?.ephemeral) {
      // Clear messages on leave for ephemeral rooms
      const clearedRoom = { ...activeRoom, messages: [] };
      setRooms((prev) => {
        const updated = prev.map((r) =>
          r.id === activeRoom.id ? clearedRoom : r,
        );
        saveRooms(updated);
        return updated;
      });
    }
    setActiveRoom(null);
    setScreen("list");
  };

  const activeCfg = activeRoom ? MOOD_COLORS[activeRoom.mood] : null;

  return (
    <div className="flex flex-col h-full bg-background">
      <AnimatePresence mode="wait">
        {/* Room List */}
        {screen === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  data-ocid="rooms.back_button"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Lock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">🔐 Gizli Odalar</p>
                  <p className="text-[10px] text-muted-foreground">
                    {rooms.length} oda mevcut
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowJoin(!showJoin)}
                  className="h-7 px-2 text-xs gap-1"
                  data-ocid="rooms.secondary_button"
                >
                  <LogIn className="w-3 h-3" /> Katıl
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCreate(!showCreate)}
                  className="h-7 px-2 text-xs gap-1"
                  data-ocid="rooms.primary_button"
                >
                  <Plus className="w-3 h-3" /> Oluştur
                </Button>
              </div>
            </div>

            {/* Join code input */}
            <AnimatePresence>
              {showJoin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 border-b border-white/10 flex gap-2"
                >
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="6 haneli oda kodu"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:border-white/20"
                    data-ocid="rooms.input"
                  />
                  <Button
                    size="sm"
                    onClick={handleJoinRoom}
                    disabled={joinCode.length < 6}
                    className="px-4"
                    data-ocid="rooms.submit_button"
                  >
                    Gir
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Create Room Form */}
            <AnimatePresence>
              {showCreate && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-4 border-b border-white/10 space-y-3"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    Yeni Oda
                  </p>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Oda adı"
                    maxLength={30}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/20"
                    data-ocid="rooms.input"
                  />
                  {/* Mood color */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Renk:
                    </span>
                    {(
                      [
                        "blue",
                        "purple",
                        "green",
                        "amber",
                      ] as SecretRoom["mood"][]
                    ).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewMood(m)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          newMood === m
                            ? "border-white scale-125"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: MOOD_COLORS[m].badge }}
                        data-ocid="rooms.toggle"
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ephemeral-toggle" className="text-xs">
                      Mesajlar kalıcı değil
                    </Label>
                    <Switch
                      id="ephemeral-toggle"
                      checked={newEphemeral}
                      onCheckedChange={setNewEphemeral}
                      data-ocid="rooms.switch"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="screenshot-toggle" className="text-xs">
                      Ekran görüntüsü uyarısı
                    </Label>
                    <Switch
                      id="screenshot-toggle"
                      checked={newScreenshot}
                      onCheckedChange={setNewScreenshot}
                      data-ocid="rooms.switch"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCreateRoom}
                    disabled={!newName.trim()}
                    className="w-full"
                    data-ocid="rooms.confirm_button"
                  >
                    Oda Oluştur
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Room list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {rooms.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center py-20 text-muted-foreground"
                  data-ocid="rooms.empty_state"
                >
                  <Lock className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-sm">Henüz oda yok.</p>
                  <p className="text-xs mt-1">İlk gizli odayı oluştur!</p>
                </div>
              )}
              {rooms.map((room, idx) => {
                const c = MOOD_COLORS[room.mood];
                return (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`p-3.5 rounded-xl ${c.bg} border ${c.border} cursor-pointer hover:opacity-90 transition-all`}
                    onClick={() => {
                      setActiveRoom(room);
                      setScreen("room");
                    }}
                    data-ocid={`rooms.item.${idx + 1}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Lock className={`w-3.5 h-3.5 ${c.text}`} />
                        <span className="text-sm font-semibold">
                          {room.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {room.ephemeral && (
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 h-4 border-current ${c.text}`}
                          >
                            Geçici
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 border-white/20 text-muted-foreground"
                        >
                          Davetli
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {room.members} üye
                        </span>
                        <span className="font-mono">
                          {timeAgo(room.createdAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(room.code);
                          toast.success(`Kod kopyalandı: ${room.code}`);
                        }}
                        className={`flex items-center gap-1 text-[10px] font-mono ${c.text} hover:opacity-80 transition-opacity`}
                        data-ocid="rooms.button"
                      >
                        <Copy className="w-3 h-3" />
                        {room.code}
                      </button>
                    </div>
                    {room.messages.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
                        {room.messages[room.messages.length - 1].content}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Room Chat */}
        {screen === "room" && activeRoom && activeCfg && (
          <motion.div
            key="room"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex flex-col h-full"
          >
            {/* Room header */}
            <div
              className={`flex items-center gap-3 px-4 py-3 border-b ${activeCfg.border} flex-shrink-0`}
            >
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                data-ocid="rooms.back_button"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <Lock className={`w-4 h-4 ${activeCfg.text}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${activeCfg.text}`}>
                  {activeRoom.name}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  {activeRoom.members} üye •
                  <span className="font-mono">{activeRoom.code}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeRoom.code);
                  toast.success(`Kod kopyalandı: ${activeRoom.code}`);
                }}
                className={`text-[10px] font-mono ${activeCfg.text} flex items-center gap-1 hover:opacity-80`}
                data-ocid="rooms.button"
              >
                <Copy className="w-3 h-3" /> Kodu Paylaş
              </button>
            </div>

            {/* Ephemeral / no record banner */}
            <div
              className={`mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-xl ${activeCfg.bg} border ${activeCfg.border}`}
            >
              <Lock className={`w-3 h-3 ${activeCfg.text} flex-shrink-0`} />
              <p className={`text-[10px] ${activeCfg.text}`}>
                🔐 Gizli Oda •{" "}
                {activeRoom.ephemeral
                  ? "Mesajlar çıkışta silinir"
                  : "Mesajlar kaydedilmez"}
              </p>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
            >
              {activeRoom.messages.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center py-16 text-muted-foreground"
                  data-ocid="rooms.empty_state"
                >
                  <Lock className="w-6 h-6 mb-2 opacity-30" />
                  <p className="text-xs">Henüz mesaj yok. İlk mesajı gönder!</p>
                </div>
              )}
              {activeRoom.messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-sm ${activeCfg.bg} border ${activeCfg.border}`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {msg.sender} • {timeAgo(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Message input */}
            <div
              className={`px-4 py-3 border-t ${activeCfg.border} flex gap-2`}
            >
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder="Anonim mesaj..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-white/20"
                data-ocid="rooms.input"
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!msgInput.trim()}
                className="self-stretch px-3"
                data-ocid="rooms.primary_button"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
