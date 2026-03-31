import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Flame,
  Gem,
  ImagePlus,
  Loader2,
  Lock,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { P2PListing, P2PTrade } from "../backend.d";
import { useActor } from "../hooks/useActor";

// ─── Types ────────────────────────────────────────────────────────────────────

type P2PTab = "market" | "listings" | "trades";
type RarityFilter = "all" | "normal" | "rare" | "ultra";
type FakeBuyStep = 1 | 2 | 3 | 4 | 5 | 6;
type RealBuyStep = 1 | 2 | 3 | 4 | 5 | 6;
type Rarity = "normal" | "rare" | "ultra";
type SellerKind = "user" | "admin";
type ListingStatusKind = P2PListing["status"]["__kind__"];
type TradeStatusKind = P2PTrade["status"]["__kind__"];

interface FakeListing {
  id: string;
  anonId: string;
  price: number;
  rarity: Rarity;
  sellerType: SellerKind;
  sellerIban: string;
  sellerName: string;
  rating: number;
  tradeCount: number;
  tags: string[];
  nextDropMs?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_IBAN = "LT913130010131376235";

const FAKE_LISTINGS: FakeListing[] = [
  {
    id: "fake-1",
    anonId: "+777 4839 9281",
    price: 10,
    rarity: "normal",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 00",
    sellerName: "User#4829",
    rating: 4.6,
    tradeCount: 23,
    tags: [],
  },
  {
    id: "fake-2",
    anonId: "+777 1234 5678",
    price: 15,
    rarity: "normal",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 01",
    sellerName: "User#7731",
    rating: 4.7,
    tradeCount: 11,
    tags: [],
  },
  {
    id: "fake-3",
    anonId: "+777 8821 3344",
    price: 20,
    rarity: "normal",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 02",
    sellerName: "User#2091",
    rating: 4.5,
    tradeCount: 8,
    tags: [],
  },
  {
    id: "fake-4",
    anonId: "+777 2222 3333",
    price: 45,
    rarity: "rare",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 03",
    sellerName: "User#6612",
    rating: 4.9,
    tradeCount: 47,
    tags: ["Limited"],
  },
  {
    id: "fake-5",
    anonId: "+777 5555 1111",
    price: 55,
    rarity: "rare",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 04",
    sellerName: "User#3310",
    rating: 4.8,
    tradeCount: 31,
    tags: ["Limited"],
  },
  {
    id: "fake-6",
    anonId: "+777 7000 0001",
    price: 65,
    rarity: "rare",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Limited"],
  },
  {
    id: "fake-7",
    anonId: "+777 8888 0001",
    price: 80,
    rarity: "rare",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Limited"],
  },
  {
    id: "fake-8",
    anonId: "+777 9999 0000",
    price: 120,
    rarity: "ultra",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Locked"],
    nextDropMs: Date.now() + 3_600_000,
  },
  {
    id: "fake-9",
    anonId: "+777 1111 1111",
    price: 150,
    rarity: "ultra",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Locked"],
    nextDropMs: Date.now() + 7_200_000,
  },
  {
    id: "fake-10",
    anonId: "+777 7777 7777",
    price: 200,
    rarity: "ultra",
    sellerType: "admin",
    sellerIban: ADMIN_IBAN,
    sellerName: "Admin",
    rating: 5.0,
    tradeCount: 199,
    tags: ["Official", "Locked"],
    nextDropMs: Date.now() + 10_800_000,
  },
  {
    id: "fake-11",
    anonId: "+777 3333 9999",
    price: 35,
    rarity: "normal",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 05",
    sellerName: "User#9021",
    rating: 4.6,
    tradeCount: 5,
    tags: [],
  },
  {
    id: "fake-12",
    anonId: "+777 6600 4422",
    price: 90,
    rarity: "rare",
    sellerType: "user",
    sellerIban: "DE89 3704 0044 0532 0130 06",
    sellerName: "User#5544",
    rating: 4.7,
    tradeCount: 19,
    tags: ["Limited"],
  },
];

const ACTIVITY_MESSAGES = [
  "🔥 +777 7777 7777 sold for €120",
  "⚡ New rare ID listed",
  "👤 User bought ID",
  "💎 Ultra ID drop in 1 hour",
  "🔥 +777 2222 3333 sold for €45",
  "⚡ Admin listed new Official ID",
  "👤 User #4829 completed trade",
  "💎 +777 9999 0000 unlocked soon",
];

const LISTING_STATUS_CFG: Record<
  ListingStatusKind,
  { label: string; cls: string }
> = {
  Active: {
    label: "Active",
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  Locked: {
    label: "Locked",
    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  Sold: {
    label: "Sold",
    cls: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  Cancelled: {
    label: "Cancelled",
    cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
};

const TRADE_STATUS_CFG: Record<
  TradeStatusKind,
  { label: string; cls: string }
> = {
  Pending: {
    label: "Pending",
    cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  PaymentSent: {
    label: "Payment Sent",
    cls: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
  Confirmed: {
    label: "Confirmed",
    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  Rejected: {
    label: "Rejected",
    cls: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  Disputed: {
    label: "Disputed",
    cls: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  Cancelled: {
    label: "Cancelled",
    cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
};

function genRefCode(): string {
  return `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

function ActivityFeed() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % ACTIVITY_MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-2.5 overflow-hidden">
      <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <div className="flex-1 overflow-hidden">
        <p
          className="text-xs text-muted-foreground truncate transition-all duration-300"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-6px)",
          }}
        >
          {ACTIVITY_MESSAGES[idx]}
        </p>
      </div>
      <span className="text-[9px] font-bold text-amber-400/60 flex-shrink-0 tracking-widest">
        LIVE
      </span>
    </div>
  );
}

// ─── RarityBadge ─────────────────────────────────────────────────────────────

function RarityBadge({ rarity }: { rarity: Rarity }) {
  if (rarity === "ultra") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
        <Gem className="w-2.5 h-2.5" />
        Ultra 💎
      </span>
    );
  }
  if (rarity === "rare") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
        <Flame className="w-2.5 h-2.5" />
        Rare 🔥
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
      Normal
    </span>
  );
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      <Star className="w-2.5 h-2.5 fill-current" />
      <span className="text-[10px] font-semibold">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── TrustBar ─────────────────────────────────────────────────────────────────

function TrustBar() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {["Protected Trade", "Secure Transfer", "Verified System"].map(
        (label) => (
          <span
            key={label}
            className="flex items-center gap-1 text-[9px] text-emerald-400/80 font-medium"
          >
            <Check className="w-2.5 h-2.5 text-emerald-400" />
            {label}
          </span>
        ),
      )}
    </div>
  );
}

// ─── ListingStatusBadge ───────────────────────────────────────────────────────

function ListingStatusBadge({ kind }: { kind: ListingStatusKind }) {
  const { label, cls } = LISTING_STATUS_CFG[kind];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── TradeStatusBadge ─────────────────────────────────────────────────────────

function TradeStatusBadge({ kind }: { kind: TradeStatusKind }) {
  const { label, cls } = TRADE_STATUS_CFG[kind];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── UltraDropCountdown ───────────────────────────────────────────────────────

function UltraDropCountdown({
  nextDropMs,
  onUnlock,
}: { nextDropMs: number; onUnlock: () => void }) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, nextDropMs - Date.now()),
  );
  const cbRef = useRef(onUnlock);
  cbRef.current = onUnlock;

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, nextDropMs - Date.now());
      setRemaining(r);
      if (r === 0) {
        cbRef.current();
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [nextDropMs]);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);

  return (
    <div className="flex items-center gap-1.5 text-orange-400">
      <Clock className="w-3.5 h-3.5 animate-pulse" />
      <span className="text-xs font-mono font-bold tabular-nums">
        Next Drop: {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
        {String(s).padStart(2, "0")}
      </span>
    </div>
  );
}

// ─── TradeCountdownTimer ──────────────────────────────────────────────────────

function TradeCountdownTimer({
  createdAtNs,
  onExpired,
}: {
  createdAtNs: bigint;
  onExpired?: () => void;
}) {
  const [remaining, setRemaining] = useState(0);
  const cbRef = useRef(onExpired);
  cbRef.current = onExpired;

  useEffect(() => {
    const expiresAt = Number(createdAtNs / 1_000_000n) + 15 * 60 * 1000;
    const tick = () => {
      const r = Math.max(0, expiresAt - Date.now());
      setRemaining(r);
      if (r === 0) cbRef.current?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAtNs]);

  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1_000);
  const urgent = remaining > 0 && remaining < 5 * 60 * 1000;
  const expired = remaining === 0;

  return (
    <div className="flex items-center gap-1.5">
      <Clock
        className={cn(
          "w-3.5 h-3.5",
          expired ? "text-red-400" : urgent ? "text-amber-400" : "text-primary",
        )}
      />
      <span
        className={cn(
          "font-mono text-sm font-bold tabular-nums",
          expired
            ? "text-red-400"
            : urgent
              ? "text-amber-400 animate-pulse"
              : "text-primary",
        )}
      >
        {expired
          ? "EXPIRED"
          : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
      </span>
    </div>
  );
}

// ─── CopyBox ─────────────────────────────────────────────────────────────────

function CopyBox({
  value,
  label,
  adminLabel,
}: {
  value: string;
  label: string;
  adminLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {adminLabel && (
          <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-semibold">
            {adminLabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 px-3 py-2.5">
        <span className="font-mono text-sm text-primary flex-1 break-all leading-snug">
          {value}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── StepIndicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all border",
              s <= current
                ? "bg-primary border-primary text-primary-foreground"
                : "border-white/20 text-muted-foreground",
            )}
          >
            {s < current ? <Check className="w-2.5 h-2.5" /> : s}
          </div>
          {s < total && (
            <div
              className={cn(
                "h-0.5 w-4 rounded-full transition-colors",
                s < current ? "bg-primary" : "bg-white/10",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── FakeBuyFlowSheet ─────────────────────────────────────────────────────────

interface FakeBuyFlowSheetProps {
  open: boolean;
  onClose: () => void;
  listing: FakeListing | null;
}

function FakeBuyFlowSheet({ open, onClose, listing }: FakeBuyFlowSheetProps) {
  const [step, setStep] = useState<FakeBuyStep>(1);
  const [refCode, setRefCode] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imagePreviewRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setRefCode(genRefCode());
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
      setImagePreview(null);
      imagePreviewRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    const url = URL.createObjectURL(file);
    imagePreviewRef.current = url;
    setImagePreview(url);
  };

  const isAdminSeller = listing?.sellerType === "admin";

  const STEP_TITLES: Record<FakeBuyStep, string> = {
    1: "Confirm Purchase",
    2: "Payment Details",
    3: "Payment Confirmation",
    4: "Upload Proof",
    5: "Awaiting Confirmation",
    6: "Transfer Complete",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && step < 6 && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[oklch(0.11_0_0)] border-t border-white/10 rounded-t-2xl max-h-[92dvh] overflow-y-auto px-4 pb-10"
        data-ocid="p2p.sheet"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="w-4 h-4 text-primary" />
            {STEP_TITLES[step]}
          </SheetTitle>
        </SheetHeader>

        {step < 6 && <StepIndicator current={step} total={5} />}

        {/* ── Step 1: Confirm Purchase ──────────────────────────────────── */}
        {step === 1 && listing && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="text-center pb-1">
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Anonymous ID for Sale
                </p>
                <span className="font-mono text-2xl font-bold text-primary tracking-wider glow-text">
                  {listing.anonId}
                </span>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-xl font-bold text-emerald-400">
                  €{listing.price}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Rarity</span>
                <RarityBadge rarity={listing.rarity} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seller</span>
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full border",
                    isAdminSeller
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                      : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
                  )}
                >
                  {listing.sellerName}
                </span>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3.5 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/70 leading-relaxed">
                Once locked, complete bank transfer within 15 minutes. Trade
                auto-cancels on timeout.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Coins className="w-3 h-3" />
              This action costs 0.5 AC
            </div>

            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              onClick={() => setStep(2)}
              data-ocid="p2p.confirm_button"
            >
              <Lock className="w-4 h-4 mr-2" />
              Confirm &amp; Lock ID
            </Button>
          </div>
        )}

        {/* ── Step 2: Payment Details ───────────────────────────────────── */}
        {step === 2 && listing && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Amount to Send
                </span>
                <span className="text-xl font-bold text-emerald-400">
                  €{listing.price}
                </span>
              </div>
              <Separator className="bg-white/5" />
              <CopyBox
                value={listing.sellerIban}
                label="Seller IBAN"
                adminLabel={
                  isAdminSeller ? "Admin IBAN (Official Channel)" : undefined
                }
              />
              <CopyBox value={refCode} label="Reference Code" />
            </div>

            <div className="bg-sky-950/30 border border-sky-700/30 rounded-xl p-3.5">
              <p className="text-xs text-sky-300 font-semibold mb-2">
                Payment Instructions
              </p>
              <ol className="text-xs text-sky-200/70 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Open your banking app</li>
                <li>
                  Transfer exactly{" "}
                  <strong className="text-sky-300">€{listing.price}</strong> to
                  the IBAN above
                </li>
                <li>Use the reference code as payment description</li>
                <li>Take a screenshot of the completed transfer</li>
              </ol>
            </div>

            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(3)}
              data-ocid="p2p.primary_button"
            >
              <Check className="w-4 h-4 mr-2" />I Sent Payment
            </Button>
          </div>
        )}

        {/* ── Step 3: Payment Confirmation ──────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-300">
                  Your payment is being verified
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seller will confirm once transfer is received
                </p>
              </div>
              <Separator className="bg-white/5" />
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Your Reference Code
                </p>
                <span className="font-mono text-sm text-primary">
                  {refCode}
                </span>
              </div>
            </div>
            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(4)}
              data-ocid="p2p.primary_button"
            >
              Confirm Sent →
            </Button>
          </div>
        )}

        {/* ── Step 4: Upload Proof ──────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">
                  Upload Payment Screenshot
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Optional but recommended. Helps resolve disputes faster.
              </p>
              <label className="block cursor-pointer">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                    imagePreview
                      ? "border-primary/50 bg-primary/5"
                      : "border-white/15 hover:border-white/30",
                  )}
                  data-ocid="p2p.dropzone"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Payment proof"
                      className="max-h-32 mx-auto rounded-lg object-contain"
                    />
                  ) : (
                    <div>
                      <ImagePlus className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Tap to select screenshot
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                  data-ocid="p2p.upload_button"
                />
              </label>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/15 hover:bg-white/5"
                onClick={() => setStep(5)}
                data-ocid="p2p.secondary_button"
              >
                Skip
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                onClick={() => setStep(5)}
                data-ocid="p2p.submit_button"
              >
                {imagePreview ? "Submit Proof" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Awaiting Confirmation ─────────────────────────────── */}
        {step === 5 && listing && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-6 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full bg-amber-500/5 animate-ping" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  Waiting for seller to confirm
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  You will receive{" "}
                  <span className="font-mono text-primary font-bold">
                    {listing.anonId}
                  </span>{" "}
                  once {isAdminSeller ? "admin" : "seller"} confirms payment.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> Protected Trade
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <Shield className="w-3 h-3" /> Escrow Secured
                </span>
              </div>
            </div>
            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(6)}
              data-ocid="p2p.primary_button"
            >
              Done
            </Button>
          </div>
        )}

        {/* ── Step 6: Transfer Complete ─────────────────────────────────── */}
        {step === 6 && listing && (
          <div
            className="text-center space-y-5 py-6"
            data-ocid="p2p.success_state"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-bold mb-2 text-emerald-300">
                Transfer Complete!
              </h3>
              <p className="font-mono text-xl font-bold text-primary glow-text">
                {listing.anonId}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                is now yours!
              </p>
            </motion.div>
            <Button
              variant="outline"
              className="w-full border-white/15 hover:bg-white/5"
              onClick={onClose}
              data-ocid="p2p.close_button"
            >
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── FakeListingCard ──────────────────────────────────────────────────────────

interface FakeListingCardProps {
  listing: FakeListing;
  index: number;
  onBuyClick: (listing: FakeListing) => void;
}

function FakeListingCard({ listing, index, onBuyClick }: FakeListingCardProps) {
  const [isLocked, setIsLocked] = useState(() =>
    Boolean(listing.nextDropMs && listing.nextDropMs > Date.now()),
  );

  const isUltra = listing.rarity === "ultra";
  const isAdminSeller = listing.sellerType === "admin";
  const hasLockedTag = listing.tags.includes("Locked");
  const showCountdown =
    isUltra && hasLockedTag && isLocked && listing.nextDropMs != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
      className={cn(
        "glass-card rounded-xl p-4",
        isAdminSeller && "border-l-[3px] border-l-amber-500/60",
      )}
      style={
        isUltra ? { animation: "ultraGlow 2s ease-in-out infinite" } : undefined
      }
      data-ocid={`p2p.item.${index + 1}`}
    >
      {/* Top row: anonId + rarity badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-mono text-lg font-bold text-primary tracking-wider glow-text leading-none">
          {listing.anonId}
        </span>
        <RarityBadge rarity={listing.rarity} />
      </div>

      {/* Price + seller type */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-bold text-emerald-400">
          €{listing.price}
        </span>
        <span
          className={cn(
            "text-xs font-bold px-2.5 py-0.5 rounded-full border",
            isAdminSeller
              ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
              : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
          )}
        >
          {isAdminSeller ? "👑 Admin" : "👤 User"}
        </span>
      </div>

      {/* Tags */}
      {listing.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {listing.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                tag === "Official" &&
                  "bg-amber-500/15 text-amber-300 border-amber-500/40",
                tag === "Limited" &&
                  "bg-orange-500/15 text-orange-300 border-orange-500/40",
                tag === "Locked" &&
                  "bg-red-500/15 text-red-300 border-red-500/40",
              )}
            >
              {tag === "Official" && "🔥 "}
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Seller info */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
            isAdminSeller
              ? "bg-amber-500/20 text-amber-300"
              : "bg-primary/15 text-primary",
          )}
        >
          {listing.sellerName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">
              {listing.sellerName}
            </span>
            <StarRating rating={listing.rating} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {listing.tradeCount} trades completed
          </p>
        </div>
      </div>

      <TrustBar />
      <Separator className="bg-white/5 my-3" />

      {/* CTA area */}
      {showCountdown ? (
        <div className="space-y-2">
          <UltraDropCountdown
            nextDropMs={listing.nextDropMs!}
            onUnlock={() => setIsLocked(false)}
          />
          <Button
            className="w-full h-10 opacity-50 cursor-not-allowed"
            disabled
          >
            <Lock className="w-4 h-4 mr-2" />
            Locked
          </Button>
        </div>
      ) : (
        <Button
          className={cn(
            "w-full h-10 font-bold",
            isUltra
              ? "bg-purple-600 hover:bg-purple-500 text-white"
              : "bg-emerald-600 hover:bg-emerald-500 text-white",
          )}
          onClick={() => onBuyClick(listing)}
          data-ocid="p2p.primary_button"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          BUY NOW
        </Button>
      )}

      <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5 flex items-center justify-center gap-1">
        <Coins className="w-2.5 h-2.5" />
        Transfer fee: 0.5 AC
      </p>
    </motion.div>
  );
}

// ─── RealBuyFlowSheet ─────────────────────────────────────────────────────────

interface RealBuyFlowSheetProps {
  open: boolean;
  onClose: () => void;
  listing: P2PListing | null;
  existingTrade: P2PTrade | null;
  onSuccess: () => void;
}

function RealBuyFlowSheet({
  open,
  onClose,
  listing,
  existingTrade,
  onSuccess,
}: RealBuyFlowSheetProps) {
  const { actor } = useActor();
  const [step, setStep] = useState<RealBuyStep>(existingTrade ? 3 : 1);
  const [currentTrade, setCurrentTrade] = useState<P2PTrade | null>(
    existingTrade,
  );
  const [refCode, setRefCode] = useState(
    existingTrade?.referenceNumber ?? genRefCode(),
  );
  const [screenshotHash, setScreenshotHash] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const imagePreviewRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingTrade) {
        setStep(3);
        setCurrentTrade(existingTrade);
        setRefCode(existingTrade.referenceNumber ?? genRefCode());
      } else {
        setStep(1);
        setCurrentTrade(null);
        setRefCode(genRefCode());
      }
      setScreenshotHash("");
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
      setImagePreview(null);
      imagePreviewRef.current = null;
      setLoading(false);
    }
  }, [open, existingTrade]);

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    const url = URL.createObjectURL(file);
    imagePreviewRef.current = url;
    setImagePreview(url);
    setScreenshotHash(`${file.name}-${file.size}-${Date.now()}`);
  };

  const handleConfirmBuy = async () => {
    if (!actor || !listing) return;
    setLoading(true);
    try {
      const trade = (await (actor as any).buyListing(listing.id)) as P2PTrade;
      setCurrentTrade(trade);
      setStep(2);
    } catch {
      toast.error(
        "Failed to initiate purchase. The listing may no longer be available.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!actor || !currentTrade) return;
    if (!refCode.trim()) {
      toast.error("Reference code is required");
      return;
    }
    setLoading(true);
    try {
      await (actor as any).markPaymentSent(
        currentTrade.id,
        refCode.trim(),
        screenshotHash || "no-screenshot",
      );
      setStep(5);
      onSuccess();
      toast.success("Payment proof submitted!");
    } catch {
      toast.error("Failed to submit proof. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const STEP_TITLES: Record<RealBuyStep, string> = {
    1: "Confirm Purchase",
    2: "Payment Details",
    3: "Confirm Sent",
    4: "Upload Proof",
    5: "Awaiting Seller",
    6: "Submitted",
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => !v && !loading && step < 6 && onClose()}
    >
      <SheetContent
        side="bottom"
        className="bg-[oklch(0.11_0_0)] border-t border-white/10 rounded-t-2xl max-h-[92dvh] overflow-y-auto px-4 pb-10"
        data-ocid="p2p.sheet"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            {STEP_TITLES[step]}
          </SheetTitle>
        </SheetHeader>

        {step < 6 && <StepIndicator current={step} total={5} />}

        {/* Step 1: Confirm */}
        {step === 1 && listing && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="text-center pb-1">
                <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Anonymous ID for Sale
                </p>
                <span className="font-mono text-2xl font-bold text-primary tracking-wider glow-text">
                  {listing.listedAnonId}
                </span>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-xl font-bold text-emerald-400">
                  €{listing.price}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seller</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {listing.sellerAnonId.slice(0, 12)}…
                </span>
              </div>
            </div>
            <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3.5 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/70 leading-relaxed">
                Once confirmed, complete bank transfer within 15 minutes. Trade
                auto-cancels on timeout.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Coins className="w-3 h-3" />
              Transfer fee: 0.5 AC
            </div>
            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              onClick={handleConfirmBuy}
              disabled={loading}
              data-ocid="p2p.confirm_button"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              {loading ? "Processing…" : "Confirm & Lock ID"}
            </Button>
          </div>
        )}

        {/* Step 2: Payment Details */}
        {step === 2 && currentTrade && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-xl font-bold text-emerald-400">
                  €{currentTrade.price}
                </span>
              </div>
              <Separator className="bg-white/5" />
              <CopyBox value={currentTrade.iban} label="Seller IBAN" />
              <CopyBox value={refCode} label="Reference Code" />
            </div>
            <div className="bg-sky-950/30 border border-sky-700/30 rounded-xl p-3.5">
              <p className="text-xs text-sky-300 font-semibold mb-2">
                Payment Instructions
              </p>
              <ol className="text-xs text-sky-200/70 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Open your banking app</li>
                <li>
                  Transfer exactly{" "}
                  <strong className="text-sky-300">
                    €{currentTrade.price}
                  </strong>{" "}
                  to the IBAN above
                </li>
                <li>Use reference code as the payment description</li>
                <li>Take a screenshot of the transfer confirmation</li>
              </ol>
            </div>
            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(3)}
              data-ocid="p2p.primary_button"
            >
              <Check className="w-4 h-4 mr-2" />I Sent Payment
            </Button>
          </div>
        )}

        {/* Step 3: Confirm Sent */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-sky-400" />
              </div>
              <p className="text-sm font-semibold text-sky-300">
                Payment is being verified
              </p>
              {refCode && (
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    Reference Code
                  </p>
                  <span className="font-mono text-sm text-primary">
                    {refCode}
                  </span>
                </div>
              )}
            </div>
            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep(4)}
              data-ocid="p2p.primary_button"
            >
              Confirm Sent →
            </Button>
          </div>
        )}

        {/* Step 4: Upload Proof */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">
                Upload Payment Screenshot (Optional)
              </p>
              <label className="block cursor-pointer">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                    imagePreview
                      ? "border-primary/50 bg-primary/5"
                      : "border-white/15 hover:border-white/30",
                  )}
                  data-ocid="p2p.dropzone"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Payment proof"
                      className="max-h-32 mx-auto rounded-lg object-contain"
                    />
                  ) : (
                    <div>
                      <ImagePlus className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Tap to select screenshot
                      </p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                  data-ocid="p2p.upload_button"
                />
              </label>
              <Input
                placeholder="Transaction reference number"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-primary/50 font-mono text-sm"
                data-ocid="p2p.input"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-white/15 hover:bg-white/5"
                onClick={handleSubmitProof}
                disabled={loading}
                data-ocid="p2p.secondary_button"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Skip"
                )}
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                onClick={handleSubmitProof}
                disabled={loading}
                data-ocid="p2p.submit_button"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                {loading ? "Submitting…" : "Submit Proof"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Awaiting */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-6 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              </div>
              <p className="text-sm font-semibold text-amber-300">
                Waiting for seller to confirm
              </p>
              <p className="text-xs text-muted-foreground">
                You will receive the ID once seller confirms payment.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full border-white/15 hover:bg-white/5"
              onClick={() => setStep(6)}
              data-ocid="p2p.primary_button"
            >
              Done
            </Button>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 6 && (
          <div
            className="text-center space-y-5 py-6"
            data-ocid="p2p.success_state"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-emerald-300">
                Proof Submitted!
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Seller will review your payment and confirm transfer shortly.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 w-full"
              onClick={onClose}
              data-ocid="p2p.close_button"
            >
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── AdminDialog ──────────────────────────────────────────────────────────────

interface AdminDialogProps {
  open: boolean;
  onClose: () => void;
  myAnonId: string;
  onListed: () => void;
}

function AdminDialog({ open, onClose, myAnonId, onListed }: AdminDialogProps) {
  const { actor } = useActor();
  const [price, setPrice] = useState("");
  const [iban, setIban] = useState(ADMIN_IBAN);
  const [rarity, setRarity] = useState<Rarity>("normal");
  const [generatedId, setGeneratedId] = useState(myAnonId);
  const [creating, setCreating] = useState(false);

  const generatePreviewId = () => {
    const p1 = String(Math.floor(Math.random() * 9000) + 1000);
    const p2 = String(Math.floor(Math.random() * 9000) + 1000);
    setGeneratedId(`+777 ${p1} ${p2}`);
  };

  const handleList = async () => {
    if (!actor) return;
    if (!price.trim()) {
      toast.error("Enter a price");
      return;
    }
    if (!iban.trim()) {
      toast.error("Enter IBAN");
      return;
    }
    setCreating(true);
    try {
      await (actor as any).createListing(price.trim(), iban.trim());
      toast.success(`ID listed on market! (${rarity})`);
      onListed();
      onClose();
    } catch {
      toast.error("Failed to list ID");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-[oklch(0.13_0_0)] border border-white/10 text-foreground max-w-sm"
        data-ocid="p2p.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            Admin Panel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Generated ID */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Preview ID
            </Label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-primary flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                {generatedId}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-white/15 hover:bg-white/10 h-9 px-3 text-xs flex-shrink-0"
                onClick={generatePreviewId}
                data-ocid="p2p.secondary_button"
              >
                Generate
              </Button>
            </div>
          </div>

          {/* Rarity */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Rarity
            </Label>
            <Select
              value={rarity}
              onValueChange={(v) => setRarity(v as Rarity)}
            >
              <SelectTrigger
                className="bg-white/5 border-white/10 focus:ring-primary/30 h-9 text-sm"
                data-ocid="p2p.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[oklch(0.16_0_0)] border-white/10">
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="rare">Rare 🔥</SelectItem>
                <SelectItem value="ultra">Ultra 💎</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Price (€)
            </Label>
            <Input
              placeholder="e.g. 50"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-primary/50 h-9 text-sm"
              data-ocid="p2p.input"
            />
          </div>

          {/* IBAN */}
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Admin IBAN
            </Label>
            <Input
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-primary/50 font-mono text-xs h-9"
              data-ocid="p2p.input"
            />
          </div>

          <Button
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold h-10"
            onClick={handleList}
            disabled={creating}
            data-ocid="p2p.submit_button"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {creating ? "Listing…" : "List on Market"}
          </Button>

          <p className="text-[10px] text-muted-foreground/60 text-center flex items-center justify-center gap-1">
            <Coins className="w-3 h-3" />
            Listing fee: 1 AC
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── P2PMarket (main export) ──────────────────────────────────────────────────

export function P2PMarket({ myAnonId }: { myAnonId: string }) {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<P2PTab>("market");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [isAdmin, setIsAdmin] = useState(false);

  // Market
  const [listings, setListings] = useState<P2PListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<P2PListing | null>(
    null,
  );
  const [realBuyOpen, setRealBuyOpen] = useState(false);

  // Fake buy flow
  const [fakeBuyListing, setFakeBuyListing] = useState<FakeListing | null>(
    null,
  );
  const [fakeBuyOpen, setFakeBuyOpen] = useState(false);

  // My Listings
  const [myListings, setMyListings] = useState<P2PListing[]>([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [newIban, setNewIban] = useState("");
  const [creating, setCreating] = useState(false);

  // My Trades
  const [trades, setTrades] = useState<P2PTrade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [proofTrade, setProofTrade] = useState<P2PTrade | null>(null);
  const [proofOpen, setProofOpen] = useState(false);

  // Admin
  const [adminOpen, setAdminOpen] = useState(false);

  // ── Check admin role ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!actor) return;
    (actor as any)
      .isCallerAdmin()
      .then((res: boolean) => setIsAdmin(res))
      .catch(() => {});
  }, [actor]);

  // ── Fetchers ─────────────────────────────────────────────────────────────────

  const fetchListings = useCallback(async () => {
    if (!actor) return;
    try {
      const data = (await (actor as any).getActiveListings()) as P2PListing[];
      setListings(data);
    } catch {
      // silent on background poll
    }
  }, [actor]);

  const fetchMyListings = useCallback(async () => {
    if (!actor) return;
    try {
      const data = (await (actor as any).getMyListings()) as P2PListing[];
      setMyListings(data);
    } catch {
      toast.error("Failed to load your listings");
    }
  }, [actor]);

  const fetchTrades = useCallback(async () => {
    if (!actor) return;
    try {
      const data = (await (actor as any).getMyTrades()) as P2PTrade[];
      setTrades(data);
    } catch {
      // silent on background poll
    }
  }, [actor]);

  // ── Initial loads ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!actor) return;
    setListingsLoading(true);
    fetchListings().finally(() => setListingsLoading(false));
  }, [actor, fetchListings]);

  useEffect(() => {
    if (!actor) return;
    setMyListingsLoading(true);
    fetchMyListings().finally(() => setMyListingsLoading(false));
  }, [actor, fetchMyListings]);

  useEffect(() => {
    if (!actor) return;
    setTradesLoading(true);
    fetchTrades().finally(() => setTradesLoading(false));
  }, [actor, fetchTrades]);

  // ── Polling ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!actor) return;
    const id = setInterval(fetchListings, 10_000);
    return () => clearInterval(id);
  }, [actor, fetchListings]);

  useEffect(() => {
    if (!actor) return;
    const id = setInterval(fetchTrades, 5_000);
    return () => clearInterval(id);
  }, [actor, fetchTrades]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleCancelListing = async (id: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).cancelListing(id);
      toast.success("Listing cancelled");
      fetchMyListings();
    } catch {
      toast.error("Failed to cancel listing");
    }
  };

  const handleCreateListing = async () => {
    if (!actor) return;
    if (!newPrice.trim()) {
      toast.error("Enter a price");
      return;
    }
    if (!newIban.trim()) {
      toast.error("Enter your IBAN");
      return;
    }
    setCreating(true);
    try {
      await (actor as any).createListing(newPrice.trim(), newIban.trim());
      toast.success("Listing created!");
      setNewPrice("");
      setNewIban("");
      fetchMyListings();
    } catch {
      toast.error("Failed to create listing");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmTrade = async (id: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).confirmTrade(id);
      toast.success("Trade confirmed! ID transfer initiated.");
      fetchTrades();
    } catch {
      toast.error("Failed to confirm trade");
    }
  };

  const handleRejectTrade = async (id: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).rejectTrade(id);
      toast.success("Trade rejected.");
      fetchTrades();
    } catch {
      toast.error("Failed to reject trade");
    }
  };

  const handleCancelTrade = async (id: bigint) => {
    if (!actor) return;
    try {
      await (actor as any).cancelTrade(id);
      toast.success("Trade cancelled.");
      fetchTrades();
    } catch {
      toast.error("Failed to cancel trade");
    }
  };

  const handleTradeExpired = useCallback(async () => {
    if (!actor) return;
    try {
      await (actor as any).cancelExpiredTrades();
      fetchTrades();
    } catch {
      // silent
    }
  }, [actor, fetchTrades]);

  const onBuySuccess = useCallback(() => {
    fetchListings();
    fetchTrades();
    fetchMyListings();
  }, [fetchListings, fetchTrades, fetchMyListings]);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const realListings = listings.filter((l) => l.sellerAnonId !== myAnonId);

  const filteredFakeListings = FAKE_LISTINGS.filter((l) => {
    if (rarityFilter === "all") return true;
    return l.rarity === rarityFilter;
  });

  const filteredRealListings = realListings.filter((_l) => {
    if (rarityFilter === "all" || rarityFilter === "normal") return true;
    return false; // real listings have no rarity metadata, only show in "all" / "normal"
  });

  const hasActiveListing = myListings.some(
    (l) => l.status.__kind__ === "Active" || l.status.__kind__ === "Locked",
  );

  // Sort fake listings: admin first, then ultra→rare→normal, then price asc
  const RARITY_ORDER: Record<Rarity, number> = { ultra: 0, rare: 1, normal: 2 };
  const sortedFakeListings = [...filteredFakeListings].sort((a, b) => {
    if (a.sellerType === "admin" && b.sellerType !== "admin") return -1;
    if (b.sellerType === "admin" && a.sellerType !== "admin") return 1;
    const rd = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
    if (rd !== 0) return rd;
    return a.price - b.price;
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Inject ultraGlow keyframe */}
      <style>{`
        @keyframes ultraGlow {
          0%, 100% { box-shadow: 0 0 8px oklch(0.627 0.265 303.9 / 0.7), 0 0 16px oklch(0.627 0.265 303.9 / 0.4), 0 0 0 1px oklch(0.627 0.265 303.9 / 0.2); }
          50%       { box-shadow: 0 0 24px oklch(0.627 0.265 303.9 / 1), 0 0 48px oklch(0.5 0.25 280 / 0.6), 0 0 0 1px oklch(0.627 0.265 303.9 / 0.4); }
        }
      `}</style>

      <div className="pb-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-border">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg tracking-tight leading-none">
                  P2P ID Market
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Trade anonymous IDs via bank transfer
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 h-8 px-3 text-xs gap-1.5"
                onClick={() => setAdminOpen(true)}
                data-ocid="p2p.secondary_button"
              >
                <Settings className="w-3.5 h-3.5" />
                Admin
              </Button>
            )}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as P2PTab)}
          className="px-4"
        >
          {/* Sticky tab bar */}
          <div className="sticky top-0 z-10 bg-background -mx-4 px-4 pb-2 pt-1">
            <TabsList className="w-full bg-white/5 border border-white/10 h-9 p-0.5">
              <TabsTrigger
                value="market"
                className="flex-1 text-xs h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-ocid="p2p.tab"
              >
                Market
              </TabsTrigger>
              <TabsTrigger
                value="listings"
                className="flex-1 text-xs h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-ocid="p2p.tab"
              >
                My Listings
              </TabsTrigger>
              <TabsTrigger
                value="trades"
                className="flex-1 text-xs h-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-ocid="p2p.tab"
              >
                My Trades
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Market Tab ───────────────────────────────────────────────── */}
          <TabsContent value="market" className="mt-3 space-y-3">
            {/* Activity Feed */}
            <ActivityFeed />

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(["all", "normal", "rare", "ultra"] as RarityFilter[]).map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRarityFilter(f)}
                    className={cn(
                      "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                      rarityFilter === f
                        ? f === "ultra"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : f === "rare"
                            ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                            : "bg-primary/20 text-primary border-primary/40"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10",
                    )}
                    data-ocid="p2p.toggle"
                  >
                    {f === "all"
                      ? "All"
                      : f === "normal"
                        ? "Normal"
                        : f === "rare"
                          ? "Rare 🔥"
                          : "Ultra 💎"}
                  </button>
                ),
              )}
            </div>

            {/* Real listings (from backend) */}
            {listingsLoading ? (
              <div
                className="flex justify-center py-6"
                data-ocid="p2p.loading_state"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              filteredRealListings.map((listing, i) => (
                <motion.div
                  key={String(listing.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card rounded-xl p-4"
                  data-ocid={`p2p.item.${i + 1}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        Anonymous ID
                      </p>
                      <span className="font-mono text-xl font-bold text-primary tracking-wider glow-text">
                        {listing.listedAnonId}
                      </span>
                    </div>
                    <ListingStatusBadge kind={listing.status.__kind__} />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-emerald-400">
                      €{listing.price}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {listing.sellerAnonId.slice(0, 12)}…
                    </span>
                  </div>
                  <TrustBar />
                  <Separator className="bg-white/5 my-3" />
                  <Button
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    onClick={() => {
                      setSelectedListing(listing);
                      setRealBuyOpen(true);
                    }}
                    disabled={listing.status.__kind__ === "Locked"}
                    data-ocid="p2p.primary_button"
                  >
                    {listing.status.__kind__ === "Locked" ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Trade in Progress
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        BUY NOW
                      </>
                    )}
                  </Button>
                </motion.div>
              ))
            )}

            {/* Fake listings (always shown) */}
            {sortedFakeListings.map((listing, i) => (
              <FakeListingCard
                key={listing.id}
                listing={listing}
                index={filteredRealListings.length + i}
                onBuyClick={(l) => {
                  setFakeBuyListing(l);
                  setFakeBuyOpen(true);
                }}
              />
            ))}

            {/* Empty state only if both lists are empty */}
            {!listingsLoading &&
              filteredRealListings.length === 0 &&
              sortedFakeListings.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center py-12 text-center"
                  data-ocid="p2p.empty_state"
                >
                  <Tag className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No listings match this filter.
                  </p>
                </div>
              )}
          </TabsContent>

          {/* ── My Listings Tab ──────────────────────────────────────────── */}
          <TabsContent value="listings" className="mt-3 space-y-3">
            {myListingsLoading ? (
              <div
                className="flex justify-center py-12"
                data-ocid="p2p.loading_state"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Existing listings */}
                {myListings.length === 0 && (
                  <div className="text-center py-6" data-ocid="p2p.empty_state">
                    <Tag className="w-7 h-7 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      You have no listings yet.
                    </p>
                  </div>
                )}

                {myListings.map((listing, i) => (
                  <div
                    key={String(listing.id)}
                    className="glass-card rounded-xl p-4"
                    data-ocid={`p2p.item.${i + 1}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          Listed ID
                        </p>
                        <span className="font-mono text-base font-bold text-primary tracking-wider">
                          {listing.listedAnonId}
                        </span>
                      </div>
                      <ListingStatusBadge kind={listing.status.__kind__} />
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-emerald-400">
                        €{listing.price}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {listing.iban.slice(0, 8)}…{listing.iban.slice(-4)}
                      </span>
                    </div>
                    {listing.status.__kind__ === "Active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 h-8 text-xs w-full"
                        onClick={() => handleCancelListing(listing.id)}
                        data-ocid="p2p.delete_button"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1.5" />
                        Cancel Listing
                      </Button>
                    )}
                  </div>
                ))}

                <Separator className="bg-white/5 my-2" />

                {/* Create form or warning */}
                {hasActiveListing ? (
                  <div
                    className="bg-amber-950/20 border border-amber-700/30 rounded-xl p-4 text-center"
                    data-ocid="p2p.panel"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-amber-300 font-medium">
                      Active listing exists
                    </p>
                    <p className="text-xs text-amber-200/60 mt-1">
                      Cancel your existing listing to create a new one.
                    </p>
                  </div>
                ) : (
                  <div
                    className="glass-card rounded-xl p-4 space-y-4"
                    data-ocid="p2p.card"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold">Create New Listing</h3>
                    </div>

                    <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your current ID{" "}
                        <span className="text-primary font-mono font-bold">
                          {myAnonId}
                        </span>{" "}
                        will be listed for sale. When sold, you&apos;ll receive
                        a new random ID.
                      </p>
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Asking Price (€) *
                      </Label>
                      <Input
                        placeholder="e.g. 50"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="bg-white/5 border-white/10 focus:border-primary/50"
                        data-ocid="p2p.input"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Your IBAN *
                      </Label>
                      <Input
                        placeholder="DE00 0000 0000 0000 0000 00"
                        value={newIban}
                        onChange={(e) => setNewIban(e.target.value)}
                        className="bg-white/5 border-white/10 focus:border-primary/50 font-mono text-sm"
                        data-ocid="p2p.input"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Buyers will transfer payment to this account.
                      </p>
                    </div>

                    <Button
                      className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                      onClick={handleCreateListing}
                      disabled={creating || !newPrice.trim() || !newIban.trim()}
                      data-ocid="p2p.submit_button"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      {creating ? "Creating…" : "List My ID for Sale"}
                    </Button>

                    <p className="text-[10px] text-muted-foreground/60 text-center flex items-center justify-center gap-1">
                      <Coins className="w-3 h-3" />
                      This action costs 1 AC
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── My Trades Tab ────────────────────────────────────────────── */}
          <TabsContent value="trades" className="mt-3 space-y-3">
            {tradesLoading ? (
              <div
                className="flex justify-center py-12"
                data-ocid="p2p.loading_state"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : trades.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 text-center"
                data-ocid="p2p.empty_state"
              >
                <Wallet className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  No trades yet.
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  Buy or sell an ID to start trading.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {trades.map((trade, i) => {
                  const isBuyer = trade.buyerAnonId === myAnonId;
                  const isSeller = trade.sellerAnonId === myAnonId;
                  const statusKind = trade.status.__kind__;

                  return (
                    <motion.div
                      key={String(trade.id)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card rounded-xl p-4"
                      data-ocid={`p2p.item.${i + 1}`}
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            {isBuyer ? "Buying" : "Selling"}
                          </p>
                          <span className="font-mono text-base font-bold text-primary tracking-wider">
                            {trade.listedAnonId}
                          </span>
                        </div>
                        <TradeStatusBadge kind={statusKind} />
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block mb-0.5">
                            Price
                          </span>
                          <span className="font-bold text-emerald-400">
                            €{trade.price}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-0.5">
                            {isBuyer ? "Seller" : "Buyer"}
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {(isBuyer
                              ? trade.sellerAnonId
                              : trade.buyerAnonId
                            ).slice(0, 12)}
                            …
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-muted-foreground mb-3">
                        Trade #{Number(trade.id)}
                      </p>

                      {/* Countdown for buyer + Pending */}
                      {isBuyer && statusKind === "Pending" && (
                        <div className="flex items-center justify-between mb-3 bg-amber-950/20 rounded-lg px-3 py-2 border border-amber-700/20">
                          <span className="text-xs text-amber-300">
                            Time remaining:
                          </span>
                          <TradeCountdownTimer
                            createdAtNs={trade.createdAt}
                            onExpired={handleTradeExpired}
                          />
                        </div>
                      )}

                      {/* Buyer actions — Pending */}
                      {isBuyer && statusKind === "Pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-9 text-xs"
                            onClick={() => {
                              setProofTrade(trade);
                              setProofOpen(true);
                            }}
                            data-ocid="p2p.primary_button"
                          >
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            Mark Payment Sent
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 px-3"
                            onClick={() => handleCancelTrade(trade.id)}
                            data-ocid="p2p.delete_button"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Seller actions — PaymentSent */}
                      {isSeller && statusKind === "PaymentSent" && (
                        <div className="space-y-3">
                          <div className="bg-sky-950/20 border border-sky-700/20 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-sky-300 font-semibold mb-1.5">
                              Buyer&apos;s Payment Proof
                            </p>
                            {trade.referenceNumber && (
                              <p className="text-xs text-muted-foreground">
                                Ref:{" "}
                                <span className="text-foreground font-mono">
                                  {trade.referenceNumber}
                                </span>
                              </p>
                            )}
                            {trade.proofScreenshotHash && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Hash:{" "}
                                <span className="text-foreground font-mono text-[10px]">
                                  {trade.proofScreenshotHash.slice(0, 24)}…
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-9 text-xs"
                              onClick={() => handleConfirmTrade(trade.id)}
                              data-ocid="p2p.confirm_button"
                            >
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 text-xs"
                              onClick={() => handleRejectTrade(trade.id)}
                              data-ocid="p2p.delete_button"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Confirmed state */}
                      {statusKind === "Confirmed" && (
                        <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-700/20 rounded-lg px-3 py-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <p className="text-xs text-emerald-300 font-medium">
                            Trade complete!
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Fake buy flow sheet ───────────────────────────────────────────── */}
      <FakeBuyFlowSheet
        open={fakeBuyOpen}
        onClose={() => {
          setFakeBuyOpen(false);
          setFakeBuyListing(null);
        }}
        listing={fakeBuyListing}
      />

      {/* ── Real buy flow sheet ───────────────────────────────────────────── */}
      <RealBuyFlowSheet
        open={realBuyOpen}
        onClose={() => {
          setRealBuyOpen(false);
          setSelectedListing(null);
        }}
        listing={selectedListing}
        existingTrade={null}
        onSuccess={onBuySuccess}
      />

      {/* ── Proof sheet for existing pending trade ─────────────────────────── */}
      <RealBuyFlowSheet
        open={proofOpen}
        onClose={() => {
          setProofOpen(false);
          setProofTrade(null);
        }}
        listing={null}
        existingTrade={proofTrade}
        onSuccess={onBuySuccess}
      />

      {/* ── Admin dialog ─────────────────────────────────────────────────────── */}
      <AdminDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        myAnonId={myAnonId}
        onListed={fetchListings}
      />
    </>
  );
}
