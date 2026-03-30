import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeftRight,
  Check,
  Compass,
  Copy,
  Crown,
  Lock,
  LogIn,
  LogOut,
  MessageSquare,
  Pencil,
  QrCode,
  ScanLine,
  Share2,
  Shield,
  Shuffle,
  User,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { User as UserType } from "./backend";
import { ChatView } from "./components/ChatView";
import { DiscoverTab } from "./components/DiscoverTab";
import { P2PMarket } from "./components/P2PMarket";
import { PremiumModal } from "./components/PremiumModal";
import { QRCodeModal } from "./components/QRCodeModal";
import { QRScannerModal } from "./components/QRScannerModal";
import { RandomChat } from "./components/RandomChat";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useGetMe,
  useRegister,
  useSetOnline,
  useUpdateUsername,
} from "./hooks/useQueries";
import { useUnreadCount } from "./hooks/useUnreadCount";

function formatDate(nanoseconds: bigint): string {
  const ms = Number(nanoseconds / 1_000_000n);
  const date = new Date(ms);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function StatusDot({
  online,
  size = "sm",
}: { online: boolean; size?: "sm" | "md" }) {
  const sizes = size === "sm" ? "w-2 h-2" : "w-3 h-3";
  return (
    <span
      className={`inline-block rounded-full ${sizes} flex-shrink-0 ${
        online
          ? "bg-[oklch(0.72_0.2_145)] online-pulse"
          : "bg-[oklch(0.45_0_0)]"
      }`}
    />
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied!", { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (label) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        data-ocid="profile.copy_button"
        className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-sm h-10"
      >
        {copied ? (
          <Check className="w-4 h-4 text-[oklch(0.72_0.2_145)]" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        {copied ? "Copied!" : label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-ocid="identity.copy_button"
      className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors hover:bg-white/5"
      aria-label="Copy ID to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-[oklch(0.72_0.2_145)]" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

function UsernameEditor({
  username,
  onSave,
}: {
  username?: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await onSave(value.trim());
      setEditing(false);
      toast.success("Username updated!");
    } catch {
      toast.error("Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditing(false);
      setValue(username || "");
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2" data-ocid="profile.panel">
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter username..."
          className="h-8 text-sm bg-white/5 border-white/10 focus:border-primary/50 w-40"
          maxLength={30}
          data-ocid="profile.input"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="p-1.5 rounded text-[oklch(0.72_0.2_145)] hover:bg-white/5 transition-colors"
          data-ocid="profile.save_button"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(username || "");
          }}
          className="p-1.5 rounded text-muted-foreground hover:bg-white/5 transition-colors"
          data-ocid="profile.cancel_button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setEditing(true);
        setValue(username || "");
      }}
      className="flex items-center gap-2 group"
      data-ocid="profile.edit_button"
    >
      <span
        className={`text-sm ${
          username ? "text-foreground" : "text-muted-foreground italic"
        }`}
      >
        {username || "Set a username..."}
      </span>
      <Pencil className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
    </button>
  );
}

function ProfileTab({
  user,
  onStartChat,
}: { user: UserType; onStartChat: (anonId: string) => void }) {
  const updateUsername = useUpdateUsername();
  const setOnline = useSetOnline();
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My AnonChat ID",
          text: `Chat with me on AnonChat: ${user.anonymousId}`,
        });
      } else {
        await navigator.clipboard.writeText(user.anonymousId);
        toast.success("ID copied to clipboard!");
      }
    } catch {
      // user cancelled share
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center px-4 pt-6 pb-6 max-w-md mx-auto w-full"
    >
      {/* ID card */}
      <div
        className="glass-card rounded-2xl p-6 w-full relative overflow-hidden mb-4"
        data-ocid="profile.card"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.75_0.2_200_/50%)] to-transparent" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              AnonID
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-xs border-white/10 text-muted-foreground"
          >
            PERMANENT
          </Badge>
        </div>

        {/* Big ID display */}
        <div className="text-center mb-5">
          <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Anonymous ID
          </p>
          <span className="font-mono text-3xl font-bold tracking-wider glow-text text-primary break-all">
            {user.anonymousId}
          </span>
        </div>

        {/* Copy + Share buttons */}
        <div className="flex gap-2 mb-3">
          <CopyButton text={user.anonymousId} label="Copy ID" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            data-ocid="profile.secondary_button"
            className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-sm h-10"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>

        {/* QR Code buttons */}
        <div className="flex gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQRCode(true)}
            data-ocid="profile.qrcode_button"
            className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-sm h-10"
          >
            <QrCode className="w-4 h-4" />
            QR Kodumu Göster
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQRScanner(true)}
            data-ocid="profile.scan_button"
            className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-sm h-10"
          >
            <ScanLine className="w-4 h-4" />
            QR Tara
          </Button>
        </div>

        {/* Premium ID button */}
        <div className="mb-5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPremium(true)}
            data-ocid="profile.open_modal_button"
            className="w-full gap-2 h-10 text-sm border-amber-700/40 bg-amber-900/10 hover:bg-amber-900/20 text-amber-400 hover:text-amber-300"
          >
            <Crown className="w-4 h-4" />
            Premium ID Seç
          </Button>
        </div>

        <QRCodeModal
          open={showQRCode}
          onClose={() => setShowQRCode(false)}
          anonymousId={user.anonymousId}
        />
        <QRScannerModal
          open={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onFound={(anonId) => {
            setShowQRScanner(false);
            toast.success("Kullanıcı bulundu!");
            onStartChat(anonId);
          }}
        />
        <PremiumModal
          open={showPremium}
          onClose={() => setShowPremium(false)}
          myAnonId={user.anonymousId}
        />

        <Separator className="mb-5 bg-white/5" />

        {/* Online status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StatusDot online={user.isOnline} size="md" />
            <span className="text-sm">
              {user.isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <Switch
            checked={user.isOnline}
            onCheckedChange={(v) => setOnline.mutate(v)}
            data-ocid="profile.toggle"
            className="data-[state=checked]:bg-[oklch(0.72_0.2_145)]"
          />
        </div>

        {/* Username editor */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Username
          </span>
          <UsernameEditor
            username={user.username}
            onSave={async (name) => {
              await updateUsername.mutateAsync(name);
            }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Member since {formatDate(user.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

function LandingPage({
  onGenerate,
  loading,
}: {
  onGenerate: () => void;
  loading: boolean;
}) {
  return (
    <div className="text-center space-y-8 px-4" data-ocid="landing.section">
      <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-border">
        <Shield className="w-10 h-10 text-primary" />
      </div>

      <div className="space-y-3">
        <h1 className="text-5xl font-bold tracking-tight">
          Anon<span className="text-primary glow-text">Chat</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xs mx-auto leading-relaxed">
          Your anonymous identity.
          <br />
          <span className="text-foreground/70">No signup required.</span>
        </p>
      </div>

      <div className="flex justify-center gap-6 text-xs text-muted-foreground">
        {[
          { icon: <Zap className="w-3.5 h-3.5" />, label: "Instant" },
          { icon: <Shield className="w-3.5 h-3.5" />, label: "Private" },
          {
            icon: <MessageSquare className="w-3.5 h-3.5" />,
            label: "Anonymous Chat",
          },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-primary">{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div>
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={loading}
          data-ocid="landing.primary_button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base px-8 py-6 rounded-xl shadow-cyan-glow transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
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
              Generating...
            </>
          ) : (
            <>
              <Zap className="mr-2 w-4 h-4" />
              Generate My ID
            </>
          )}
        </Button>
      </div>

      <div className="font-mono text-xs text-muted-foreground/30 select-none">
        +777 •••• ••••
      </div>
    </div>
  );
}

type AppTab = "chat" | "random" | "discover" | "p2p" | "profile";

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export default function App() {
  const { login, clear, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: me, isLoading: meLoading } = useGetMe();
  const register = useRegister();
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("profile");
  const [initialContact, setInitialContact] = useState<string | undefined>();

  const { data: unreadCount = 0 } = useUnreadCount(me?.anonymousId ?? "");

  const isLoggedIn = !!identity;

  // Loading: during auth init, active registration, or actor loading after login
  const isLoading =
    isInitializing ||
    isRegistering ||
    (isLoggedIn && actorFetching && me == null);

  const handleGenerate = async () => {
    if (!isLoggedIn) {
      await login();
      return;
    }
    // Actor still loading
    if (actorFetching || !actor) {
      return;
    }
    setIsRegistering(true);
    try {
      await register.mutateAsync();
    } catch {
      toast.error("Failed to generate ID. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const doRegister = useCallback(async () => {
    setIsRegistering(true);
    try {
      await register.mutateAsync();
    } catch {
      toast.error("Failed to generate ID. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  }, [register]);

  // Auto-register when actor is ready and user has no identity yet
  useEffect(() => {
    if (
      isLoggedIn &&
      !meLoading &&
      !actorFetching &&
      me == null &&
      !isRegistering &&
      actor != null
    ) {
      doRegister();
    }
  }, [
    isLoggedIn,
    meLoading,
    actorFetching,
    me,
    isRegistering,
    actor,
    doRegister,
  ]);

  // Mark messages as read when switching to chat tab
  const handleTabChange = (tab: AppTab) => {
    if (tab === "chat") {
      const contacts: string[] = JSON.parse(
        localStorage.getItem("anonychat_contacts") ?? "[]",
      );
      for (const contact of contacts) {
        localStorage.setItem(`anonychat_read_${contact}`, String(Date.now()));
      }
    }
    setActiveTab(tab);
  };

  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const caffeineUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`;

  const NAV_ITEMS: {
    id: AppTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "chat",
      label: "Chat",
      icon: <MessageSquare className="w-5 h-5" />,
      badge: unreadCount,
    },
    { id: "random", label: "Random", icon: <Shuffle className="w-5 h-5" /> },
    {
      id: "discover",
      label: "Discover",
      icon: <Compass className="w-5 h-5" />,
    },
    {
      id: "p2p",
      label: "P2P",
      icon: <ArrowLeftRight className="w-5 h-5" />,
    },
    { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 px-4 py-3 flex-shrink-0 z-40">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold tracking-tight">
              Anon<span className="text-primary">Chat</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn && me && (
              <span className="text-xs text-muted-foreground font-mono hidden sm:block">
                {me.anonymousId}
              </span>
            )}
            {isLoggedIn ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                data-ocid="nav.button"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                oturumu Kapat
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={login}
                disabled={loginStatus === "logging-in"}
                data-ocid="nav.button"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogIn className="w-3.5 h-3.5 mr-1.5" />
                Giriş Yap
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className="flex-1 overflow-hidden"
        style={{
          paddingBottom: me
            ? "calc(56px + env(safe-area-inset-bottom, 0px))"
            : 0,
        }}
      >
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
            <div
              className="text-center space-y-4"
              data-ocid="app.loading_state"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="mx-auto w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary"
              />
              <p className="text-sm text-muted-foreground">
                {isRegistering ? "Kimliğin oluşturuluyor..." : "Yükleniyor..."}
              </p>
            </div>
          </div>
        ) : !me ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] py-12">
            <LandingPage
              onGenerate={handleGenerate}
              loading={
                isRegistering ||
                loginStatus === "logging-in" ||
                (isLoggedIn && actorFetching)
              }
            />
          </div>
        ) : (
          <AnimatePresence>
            {activeTab === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
                style={{
                  height:
                    "calc(100dvh - 57px - 56px - env(safe-area-inset-bottom, 0px))",
                }}
              >
                <ChatView
                  myAnonId={me.anonymousId}
                  initialContact={initialContact}
                />
              </motion.div>
            )}
            {activeTab === "random" && (
              <motion.div
                key="random"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  height:
                    "calc(100dvh - 57px - 56px - env(safe-area-inset-bottom, 0px))",
                }}
              >
                <RandomChat myAnonId={me.anonymousId} />
              </motion.div>
            )}
            {activeTab === "discover" && (
              <motion.div
                key="discover"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full overflow-y-auto"
              >
                <DiscoverTab
                  myAnonId={me.anonymousId}
                  onStartChat={(id) => {
                    setInitialContact(id);
                    setActiveTab("chat");
                  }}
                />
              </motion.div>
            )}
            {activeTab === "p2p" && (
              <motion.div
                key="p2p"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full overflow-y-auto"
              >
                <P2PMarket myAnonId={me.anonymousId} />
              </motion.div>
            )}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full overflow-y-auto"
              >
                <ProfileTab
                  user={me}
                  onStartChat={(id) => {
                    setInitialContact(id);
                    setActiveTab("chat");
                  }}
                />
                {/* Footer inside profile */}
                <footer className="py-6 px-4">
                  <p className="text-center text-xs text-muted-foreground">
                    © {year}. Built with ❤️ using{" "}
                    <a
                      href={caffeineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary/70 hover:text-primary transition-colors"
                    >
                      caffeine.ai
                    </a>
                  </p>
                </footer>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Bottom Navigation */}
      {me && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-[oklch(0.09_0_0)] border-t border-white/5"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
          data-ocid="nav.panel"
        >
          <div className="max-w-lg mx-auto flex h-14">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  data-ocid="nav.tab"
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground/70"
                  }`}
                >
                  <span
                    className={`relative transition-transform ${
                      isActive ? "scale-110" : "scale-100"
                    }`}
                  >
                    {item.icon}
                    {item.badge !== undefined && (
                      <UnreadBadge count={item.badge} />
                    )}
                  </span>
                  <span className="text-[10px] font-medium tracking-wide">
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full"
                      style={{
                        bottom: "max(env(safe-area-inset-bottom), 8px)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Footer for non-logged-in state */}
      {!me && !isLoading && (
        <footer className="border-t border-white/5 py-6 px-4 flex-shrink-0">
          <p className="text-center text-xs text-muted-foreground">
            © {year}. Built with ❤️ using{" "}
            <a
              href={caffeineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/70 hover:text-primary transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      )}

      <Toaster position="bottom-center" theme="dark" />
    </div>
  );
}
