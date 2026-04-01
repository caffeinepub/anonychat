import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Heart, MessageCircle, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Mood = "dark" | "love" | "deep" | "confession";

interface MoodMessage {
  id: string;
  mood: Mood;
  content: string;
  timestamp: number;
  likes: number;
  replies: MoodReply[];
  liked?: boolean;
}

interface MoodReply {
  id: string;
  content: string;
  timestamp: number;
}

const MOOD_MESSAGES_KEY = "mood_messages";

const MOOD_CONFIG: Record<
  Mood,
  {
    label: string;
    emoji: string;
    accent: string;
    bg: string;
    border: string;
    text: string;
    description: string;
  }
> = {
  dark: {
    label: "Karanlık",
    emoji: "🌑",
    accent: "oklch(0.45 0.15 265)",
    bg: "bg-[oklch(0.15_0.08_265)]",
    border: "border-[oklch(0.45_0.15_265_/30%)]",
    text: "text-[oklch(0.75_0.12_265)]",
    description: "Karanlık düşünceler, derin hisler",
  },
  love: {
    label: "Aşk",
    emoji: "💜",
    accent: "oklch(0.65 0.28 340)",
    bg: "bg-[oklch(0.16_0.1_340)]",
    border: "border-[oklch(0.65_0.28_340_/30%)]",
    text: "text-[oklch(0.8_0.2_340)]",
    description: "Sevgi, özlem, kalp çarpıntısı",
  },
  deep: {
    label: "Derin",
    emoji: "🌊",
    accent: "oklch(0.55 0.18 210)",
    bg: "bg-[oklch(0.14_0.08_210)]",
    border: "border-[oklch(0.55_0.18_210_/30%)]",
    text: "text-[oklch(0.72_0.15_210)]",
    description: "Felsefi sorular, derin anlayış",
  },
  confession: {
    label: "İtiraf",
    emoji: "🕯️",
    accent: "oklch(0.7 0.18 65)",
    bg: "bg-[oklch(0.16_0.07_65)]",
    border: "border-[oklch(0.7_0.18_65_/30%)]",
    text: "text-[oklch(0.82_0.14_65)]",
    description: "Sırlar, itiraflar, cesur gerçekler",
  },
};

const FAKE_MESSAGES: Omit<MoodMessage, "liked">[] = [
  {
    id: "fake-1",
    mood: "dark",
    content:
      "Bazen kaybolup gitmek istiyorum, kimse aramayacak gibi hissediyorum.",
    timestamp: Date.now() - 1000 * 60 * 5,
    likes: 14,
    replies: [],
  },
  {
    id: "fake-2",
    mood: "dark",
    content: "Gece 3'te uyuyamıyorum. Zihin durmuyor, geçmiş döngü yapıyor.",
    timestamp: Date.now() - 1000 * 60 * 18,
    likes: 27,
    replies: [],
  },
  {
    id: "fake-3",
    mood: "dark",
    content: "Herkes mutlu görünüyor. Ben neden bu kadar yorgunum?",
    timestamp: Date.now() - 1000 * 60 * 42,
    likes: 31,
    replies: [
      {
        id: "r1",
        content: "Sen yalnız değilsin.",
        timestamp: Date.now() - 1000 * 60 * 38,
      },
    ],
  },
  {
    id: "fake-4",
    mood: "dark",
    content:
      "Hayattan çok şey bekliyordum. Şimdi sadece bir günü geçirmeye çalışıyorum.",
    timestamp: Date.now() - 1000 * 60 * 90,
    likes: 19,
    replies: [],
  },
  {
    id: "fake-5",
    mood: "dark",
    content: "Bazı yaralar görünmüyor ama her gün acıtıyor.",
    timestamp: Date.now() - 1000 * 60 * 130,
    likes: 44,
    replies: [],
  },
  {
    id: "fake-6",
    mood: "love",
    content:
      "Seni her gördüğümde kalbim daha hızlı atıyor. Söyleyemiyorum ama burada yazıyorum.",
    timestamp: Date.now() - 1000 * 60 * 7,
    likes: 38,
    replies: [],
  },
  {
    id: "fake-7",
    mood: "love",
    content: "Yıllarca hep uzaktan sevdim. Artık usandım ama vazgeçemiyorum.",
    timestamp: Date.now() - 1000 * 60 * 22,
    likes: 52,
    replies: [],
  },
  {
    id: "fake-8",
    mood: "love",
    content:
      "Beraber olduğumuzda zaman duruyor. Ayrıldığımızda sonsuz geçiyor.",
    timestamp: Date.now() - 1000 * 60 * 55,
    likes: 29,
    replies: [
      {
        id: "r2",
        content: "Bu çok güzel ❤️",
        timestamp: Date.now() - 1000 * 60 * 50,
      },
    ],
  },
  {
    id: "fake-9",
    mood: "love",
    content:
      "Ona 'seni seviyorum' diyemeden gitti. Şimdi boşluğu doldurmaya çalışıyorum.",
    timestamp: Date.now() - 1000 * 60 * 100,
    likes: 61,
    replies: [],
  },
  {
    id: "fake-10",
    mood: "love",
    content: "Sadece 'iyi misin?' diye soran biri olsa yeterdi.",
    timestamp: Date.now() - 1000 * 60 * 145,
    likes: 77,
    replies: [],
  },
  {
    id: "fake-11",
    mood: "deep",
    content:
      "Farkında olmadan kim olduğumuzu unutuyoruz. Her sabah başkası uyanıyor.",
    timestamp: Date.now() - 1000 * 60 * 12,
    likes: 23,
    replies: [],
  },
  {
    id: "fake-12",
    mood: "deep",
    content: "Eğer anılar kaybolursa, gerçekten o kişi olarak yaşadık mı?",
    timestamp: Date.now() - 1000 * 60 * 35,
    likes: 41,
    replies: [],
  },
  {
    id: "fake-13",
    mood: "deep",
    content: "Mutluluk bir hedef değil, anlık bir his. Onu arayınca kaçıyor.",
    timestamp: Date.now() - 1000 * 60 * 78,
    likes: 35,
    replies: [],
  },
  {
    id: "fake-14",
    mood: "deep",
    content:
      "Her karar alınan yolda başka bir 'ben' yaşıyor. Onları merak ediyorum.",
    timestamp: Date.now() - 1000 * 60 * 115,
    likes: 18,
    replies: [],
  },
  {
    id: "fake-15",
    mood: "deep",
    content: "Gerçekten özgür müyüz yoksa sadece farklı kafesler mi seçiyoruz?",
    timestamp: Date.now() - 1000 * 60 * 160,
    likes: 56,
    replies: [],
  },
  {
    id: "fake-16",
    mood: "confession",
    content:
      "En iyi arkadaşımın sevgilisine aşık oldum. Kimseye söyleyemedim, şimdi söylüyorum.",
    timestamp: Date.now() - 1000 * 60 * 9,
    likes: 88,
    replies: [],
  },
  {
    id: "fake-17",
    mood: "confession",
    content:
      "Çok başarılı görünüyorum ama her gün 'yeterli misin' diye soruyorum kendime.",
    timestamp: Date.now() - 1000 * 60 * 28,
    likes: 64,
    replies: [
      {
        id: "r3",
        content: "Biz hepimiz böyleyiz.",
        timestamp: Date.now() - 1000 * 60 * 24,
      },
    ],
  },
  {
    id: "fake-18",
    mood: "confession",
    content:
      "Bazen mazeretsiz yardım istemek istiyorum. Sadece biri 'nasıl yardım edebilirim?' desin.",
    timestamp: Date.now() - 1000 * 60 * 67,
    likes: 93,
    replies: [],
  },
  {
    id: "fake-19",
    mood: "confession",
    content:
      "Yıllarca yanlış kariyer seçtim. Sonunda değiştirdim ama özür dileyemedim kendime.",
    timestamp: Date.now() - 1000 * 60 * 110,
    likes: 47,
    replies: [],
  },
  {
    id: "fake-20",
    mood: "confession",
    content: "O mesajı gönderdim sonra hemen sildim. Ama sanırım gördü.",
    timestamp: Date.now() - 1000 * 60 * 175,
    likes: 102,
    replies: [],
  },
];

function loadMessages(): MoodMessage[] {
  try {
    const raw = localStorage.getItem(MOOD_MESSAGES_KEY);
    const stored: MoodMessage[] = raw ? JSON.parse(raw) : [];
    const existingIds = new Set(stored.map((m) => m.id));
    const fakeToAdd = FAKE_MESSAGES.filter((f) => !existingIds.has(f.id)).map(
      (f) => ({
        ...f,
        liked: false,
      }),
    );
    return [...fakeToAdd, ...stored];
  } catch {
    return FAKE_MESSAGES.map((f) => ({ ...f, liked: false }));
  }
}

function saveMessages(msgs: MoodMessage[]) {
  const userGenerated = msgs.filter((m) => !m.id.startsWith("fake-"));
  try {
    localStorage.setItem(MOOD_MESSAGES_KEY, JSON.stringify(userGenerated));
  } catch {
    /* ignore */
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "şimdi";
  if (mins < 60) return `${mins} dakika önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} saat önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

function maskId(): string {
  return "+777 ****";
}

export function MoodChat({ onBack }: { onBack: () => void }) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [messages, setMessages] = useState<MoodMessage[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedMood]);

  const filteredMessages = selectedMood
    ? messages.filter((m) => m.mood === selectedMood)
    : [];

  const handleLike = (id: string) => {
    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === id
          ? {
              ...m,
              likes: m.liked ? m.likes - 1 : m.likes + 1,
              liked: !m.liked,
            }
          : m,
      );
      saveMessages(updated);
      return updated;
    });
  };

  const handleSend = () => {
    if (!input.trim() || !selectedMood) return;
    const newMsg: MoodMessage = {
      id: `user-${Date.now()}`,
      mood: selectedMood,
      content: input.trim(),
      timestamp: Date.now(),
      likes: 0,
      replies: [],
      liked: false,
    };
    setMessages((prev) => {
      const updated = [...prev, newMsg];
      saveMessages(updated);
      return updated;
    });
    setInput("");
    toast.success("Anonim mesaj gönderildi");
  };

  const handleReply = (msgId: string) => {
    if (!replyInput.trim()) return;
    const reply: MoodReply = {
      id: `reply-${Date.now()}`,
      content: replyInput.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === msgId ? { ...m, replies: [...m.replies, reply] } : m,
      );
      saveMessages(updated);
      return updated;
    });
    setReplyInput("");
    setReplyTo(null);
    toast.success("Yanıt gönderildi");
  };

  const cfg = selectedMood ? MOOD_CONFIG[selectedMood] : null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b ${
          cfg ? cfg.border : "border-white/10"
        } flex-shrink-0`}
      >
        <button
          type="button"
          onClick={selectedMood ? () => setSelectedMood(null) : onBack}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          data-ocid="mood.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {cfg ? (
          <>
            <span className="text-lg">{MOOD_CONFIG[selectedMood!].emoji}</span>
            <div>
              <p className={`text-sm font-semibold ${cfg.text}`}>
                {MOOD_CONFIG[selectedMood!].label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {filteredMessages.length} anonim mesaj
              </p>
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm font-semibold">🎭 Mood Feed</p>
            <p className="text-[10px] text-muted-foreground">
              Duygu filtreli anonim mesajlar
            </p>
          </div>
        )}
      </div>

      {/* Mood Selector */}
      <AnimatePresence mode="wait">
        {!selectedMood && (
          <motion.div
            key="selector"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-8"
          >
            <div className="text-center space-y-2 mb-2">
              <p className="text-lg font-bold">Şu anki ruh halin?</p>
              <p className="text-xs text-muted-foreground">
                Duygu kanalına gir, anonim mesajları oku ve paylaş
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {(Object.keys(MOOD_CONFIG) as Mood[]).map((mood) => {
                const m = MOOD_CONFIG[mood];
                const count = messages.filter(
                  (msg) => msg.mood === mood,
                ).length;
                return (
                  <motion.button
                    key={mood}
                    type="button"
                    onClick={() => setSelectedMood(mood)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`relative flex flex-col items-center gap-2 p-5 rounded-2xl ${m.bg} border ${m.border} transition-all hover:border-opacity-60 text-center`}
                    data-ocid="mood.tab"
                  >
                    <span className="text-3xl">{m.emoji}</span>
                    <span className={`text-sm font-semibold ${m.text}`}>
                      {m.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {m.description}
                    </span>
                    <span
                      className={`absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${m.bg} border ${m.border} ${m.text}`}
                    >
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Message Feed */}
        {selectedMood && cfg && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            >
              {filteredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <span className="text-3xl mb-3">{cfg.emoji}</span>
                  <p className="text-sm">Henüz mesaj yok.</p>
                  <p className="text-xs mt-1">İlk anonim mesajı sen gönder!</p>
                </div>
              )}
              {filteredMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3.5 rounded-xl ${cfg.bg} border ${cfg.border}`}
                  data-ocid="mood.item.1"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-mono ${cfg.text} flex items-center gap-1`}
                    >
                      {cfg.emoji} {cfg.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {timeAgo(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mb-2">{msg.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {maskId()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(replyTo === msg.id ? null : msg.id);
                          setReplyInput("");
                        }}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        data-ocid="mood.button"
                      >
                        <MessageCircle className="w-3 h-3" />
                        {msg.replies.length > 0 && msg.replies.length}
                        Yanıtla
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLike(msg.id)}
                        className={`flex items-center gap-1 text-[11px] transition-colors ${
                          msg.liked
                            ? cfg.text
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        data-ocid="mood.toggle"
                      >
                        <Heart
                          className={`w-3 h-3 ${msg.liked ? "fill-current" : ""}`}
                        />
                        {msg.likes}
                      </button>
                    </div>
                  </div>

                  {/* Replies */}
                  {msg.replies.length > 0 && (
                    <div className="mt-2 pl-3 border-l border-white/10 space-y-1.5">
                      {msg.replies.map((r) => (
                        <div key={r.id}>
                          <p className="text-[11px] text-muted-foreground">
                            {r.content}
                          </p>
                          <span className="text-[10px] text-muted-foreground/50">
                            {timeAgo(r.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline reply input */}
                  <AnimatePresence>
                    {replyTo === msg.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 flex gap-2"
                      >
                        <input
                          type="text"
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleReply(msg.id);
                          }}
                          placeholder="Anonim yanıt..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-white/20"
                          data-ocid="mood.input"
                          // biome-ignore lint/a11y/noAutofocus: reply ux
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleReply(msg.id)}
                          className={`p-1.5 rounded-lg ${cfg.bg} border ${cfg.border} ${cfg.text} transition-colors hover:opacity-80`}
                          data-ocid="mood.submit_button"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Post input */}
            <div className={`px-4 py-3 border-t ${cfg.border} flex gap-2`}>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`${cfg.emoji} ${cfg.label} kanalına anonim yaz...`}
                rows={2}
                className="flex-1 resize-none bg-white/5 border-white/10 text-sm focus:border-white/20 text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                data-ocid="mood.textarea"
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim()}
                className={`self-end h-9 px-3 border ${cfg.border} ${cfg.text} bg-transparent hover:opacity-80`}
                style={{ borderColor: cfg.accent }}
                data-ocid="mood.primary_button"
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
