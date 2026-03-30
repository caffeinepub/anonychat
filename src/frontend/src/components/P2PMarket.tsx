import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Wallet,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { P2PListing, P2PTrade } from "../backend.d";
import { useActor } from "../hooks/useActor";

// ─── Types ───────────────────────────────────────────────────────────────────

type P2PTab = "market" | "listings" | "trades";
type BuyStep = "confirm" | "payment" | "proof" | "done";
type ListingStatusKind = P2PListing["status"]["__kind__"];
type TradeStatusKind = P2PTrade["status"]["__kind__"];

// ─── Status badge configs ────────────────────────────────────────────────────

const LISTING_STATUS: Record<
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

const TRADE_STATUS: Record<TradeStatusKind, { label: string; cls: string }> = {
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

// ─── Small reusable components ───────────────────────────────────────────────

function ListingStatusBadge({ kind }: { kind: ListingStatusKind }) {
  const { label, cls } = LISTING_STATUS[kind];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}
    >
      {label}
    </span>
  );
}

function TradeStatusBadge({ kind }: { kind: TradeStatusKind }) {
  const { label, cls } = TRADE_STATUS[kind];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}
    >
      {label}
    </span>
  );
}

function CountdownTimer({
  createdAtNs,
  onExpired,
}: {
  createdAtNs: bigint;
  onExpired?: () => void;
}) {
  const [remaining, setRemaining] = useState(0);
  const callbackRef = useRef(onExpired);
  callbackRef.current = onExpired;

  useEffect(() => {
    const createdAtMs = Number(createdAtNs / 1_000_000n);
    const expiresAt = createdAtMs + 15 * 60 * 1000;

    const tick = () => {
      const r = Math.max(0, expiresAt - Date.now());
      setRemaining(r);
      if (r === 0) callbackRef.current?.();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAtNs]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining > 0 && remaining < 5 * 60 * 1000;
  const expired = remaining === 0;

  return (
    <div className="flex items-center gap-1.5">
      <Clock
        className={`w-3.5 h-3.5 ${
          expired ? "text-red-400" : urgent ? "text-amber-400" : "text-primary"
        }`}
      />
      <span
        className={`font-mono text-sm font-bold tabular-nums ${
          expired
            ? "text-red-400"
            : urgent
              ? "text-amber-400 animate-pulse"
              : "text-primary"
        }`}
      >
        {expired
          ? "EXPIRED"
          : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
      </span>
    </div>
  );
}

function CopyBox({ value, label }: { value: string; label: string }) {
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
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
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

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors border ${
              s <= current
                ? "bg-primary border-primary text-primary-foreground"
                : "border-white/20 text-muted-foreground"
            }`}
          >
            {s < current ? <Check className="w-3 h-3" /> : s}
          </div>
          {s < total && (
            <div
              className={`h-0.5 w-6 rounded-full transition-colors ${
                s < current ? "bg-primary" : "bg-white/10"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── BuyFlowSheet ─────────────────────────────────────────────────────────────

interface BuyFlowSheetProps {
  open: boolean;
  onClose: () => void;
  listing: P2PListing | null;
  existingTrade: P2PTrade | null;
  onSuccess: () => void;
}

function BuyFlowSheet({
  open,
  onClose,
  listing,
  existingTrade,
  onSuccess,
}: BuyFlowSheetProps) {
  const { actor } = useActor();
  const [step, setStep] = useState<BuyStep>(
    existingTrade ? "proof" : "confirm",
  );
  const [currentTrade, setCurrentTrade] = useState<P2PTrade | null>(
    existingTrade,
  );
  const [refNumber, setRefNumber] = useState("");
  const [screenshotHash, setScreenshotHash] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(existingTrade ? "proof" : "confirm");
      setCurrentTrade(existingTrade);
      setRefNumber("");
      setScreenshotHash("");
      setLoading(false);
    }
  }, [open, existingTrade]);

  const stepNum =
    step === "confirm" ? 1 : step === "payment" ? 2 : step === "proof" ? 3 : 0;

  const stepTitle =
    step === "confirm"
      ? "Confirm Purchase"
      : step === "payment"
        ? "Payment Instructions"
        : step === "proof"
          ? "Payment Proof"
          : "Payment Submitted";

  const handleConfirmBuy = async () => {
    if (!actor || !listing) return;
    setLoading(true);
    try {
      const trade = await (actor as any).buyListing(listing.id);
      setCurrentTrade(trade);
      setStep("payment");
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
    if (!refNumber.trim()) {
      toast.error("Please enter a reference number");
      return;
    }
    if (!screenshotHash.trim()) {
      toast.error("Please enter a screenshot hash or upload ID");
      return;
    }
    setLoading(true);
    try {
      await (actor as any).markPaymentSent(
        currentTrade.id,
        refNumber.trim(),
        screenshotHash.trim(),
      );
      setStep("done");
      onSuccess();
      toast.success("Payment proof submitted!");
    } catch {
      toast.error("Failed to submit payment proof. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[oklch(0.11_0_0)] border-t border-white/10 rounded-t-2xl max-h-[90dvh] overflow-y-auto px-4 pb-8"
        data-ocid="p2p.sheet"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            {stepTitle}
          </SheetTitle>
        </SheetHeader>

        {step !== "done" && <StepIndicator current={stepNum} total={3} />}

        {/* ── Step 1: Confirm ─────────────────── */}
        {step === "confirm" && listing && (
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
                <span className="text-base font-bold">{listing.price}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seller</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {listing.sellerAnonId.slice(0, 14)}…
                </span>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-3.5 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-300 font-semibold mb-0.5">
                  15-Minute Payment Window
                </p>
                <p className="text-xs text-amber-200/60 leading-relaxed">
                  After confirming, complete bank transfer within 15 minutes.
                  Trade auto-cancels on timeout.
                </p>
              </div>
            </div>

            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={handleConfirmBuy}
              disabled={loading}
              data-ocid="p2p.confirm_button"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2" />
              )}
              {loading ? "Processing…" : "Confirm Purchase"}
            </Button>
          </div>
        )}

        {/* ── Step 2: Payment Instructions ────── */}
        {step === "payment" && currentTrade && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Transfer Amount
                </span>
                <span className="text-lg font-bold text-primary">
                  {currentTrade.price}
                </span>
              </div>
              <Separator className="bg-white/5" />
              <CopyBox value={currentTrade.iban} label="Seller IBAN" />
            </div>

            <div className="bg-sky-950/30 border border-sky-700/30 rounded-xl p-3.5">
              <p className="text-xs text-sky-300 font-semibold mb-2">
                Payment Instructions
              </p>
              <ol className="text-xs text-sky-200/70 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Open your banking app or visit your bank</li>
                <li>
                  Transfer exactly{" "}
                  <strong className="text-sky-300">{currentTrade.price}</strong>{" "}
                  to the IBAN above
                </li>
                <li>Save your transaction reference number</li>
                <li>Take a screenshot of the completed transfer</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 bg-amber-950/20 border border-amber-700/20 rounded-xl px-3.5 py-2.5">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300 leading-snug">
                Complete payment and submit proof within 15 minutes
              </p>
            </div>

            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => setStep("proof")}
              data-ocid="p2p.primary_button"
            >
              <Check className="w-4 h-4 mr-2" />
              I&apos;ve Sent Payment →
            </Button>
          </div>
        )}

        {/* ── Step 3: Proof ───────────────────── */}
        {step === "proof" && currentTrade && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl p-3.5 flex gap-3 items-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  Trade
                </p>
                <span className="font-mono text-xs text-muted-foreground">
                  #{Number(currentTrade.id)}
                </span>
              </div>
              <Separator orientation="vertical" className="h-8 bg-white/10" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  Amount
                </p>
                <span className="text-sm font-bold text-primary">
                  {currentTrade.price}
                </span>
              </div>
              <div className="ml-auto">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  ID
                </p>
                <span className="font-mono text-xs text-primary">
                  {currentTrade.listedAnonId.slice(0, 12)}…
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Payment Reference Number *
                </p>
                <Input
                  placeholder="e.g. TRX123456789"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-primary/50 font-mono"
                  data-ocid="p2p.input"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Transaction Screenshot Hash / Upload ID *
                </p>
                <Input
                  placeholder="SHA256 hash or upload reference ID"
                  value={screenshotHash}
                  onChange={(e) => setScreenshotHash(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-primary/50 font-mono text-xs"
                  data-ocid="p2p.textarea"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                  Enter the hash of your payment screenshot or a file upload
                  reference ID as proof.
                </p>
              </div>
            </div>

            <Button
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={handleSubmitProof}
              disabled={loading || !refNumber.trim() || !screenshotHash.trim()}
              data-ocid="p2p.submit_button"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              {loading ? "Submitting…" : "Submit Payment Proof"}
            </Button>
          </div>
        )}

        {/* ── Done ────────────────────────────── */}
        {step === "done" && (
          <div
            className="text-center space-y-5 py-6"
            data-ocid="p2p.success_state"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto"
            >
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <div>
              <h3 className="text-base font-bold mb-1">Proof Submitted!</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                The seller will review your payment and confirm the transfer
                within a few minutes.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5"
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

// ─── Main P2PMarket ───────────────────────────────────────────────────────────

export function P2PMarket({ myAnonId }: { myAnonId: string }) {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<P2PTab>("market");

  // Market
  const [listings, setListings] = useState<P2PListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [buyListing, setBuyListing] = useState<P2PListing | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);

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

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchListings = useCallback(async () => {
    if (!actor) return;
    try {
      const data = await (actor as any).getActiveListings();
      setListings(data);
    } catch {
      // silent on background poll
    }
  }, [actor]);

  const fetchMyListings = useCallback(async () => {
    if (!actor) return;
    try {
      const data = await (actor as any).getMyListings();
      setMyListings(data);
    } catch {
      toast.error("Failed to load your listings");
    }
  }, [actor]);

  const fetchTrades = useCallback(async () => {
    if (!actor) return;
    try {
      const data = await (actor as any).getMyTrades();
      setTrades(data);
    } catch {
      // silent on background poll
    }
  }, [actor]);

  // ── Initial loads ───────────────────────────────────────────────────────────

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

  // ── Polling ─────────────────────────────────────────────────────────────────

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

  // ── Actions ─────────────────────────────────────────────────────────────────

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

  const onProofSuccess = useCallback(() => {
    fetchTrades();
  }, [fetchTrades]);

  const filteredListings = listings.filter((l) => l.sellerAnonId !== myAnonId);
  const hasActiveListing = myListings.some(
    (l) => l.status.__kind__ === "Active" || l.status.__kind__ === "Locked",
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
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

        {/* ── Market Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="market" className="mt-3 space-y-3">
          {listingsLoading ? (
            <div
              className="flex justify-center py-16"
              data-ocid="p2p.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="p2p.empty_state"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-3">
                <Tag className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No active listings yet.
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                Be the first to sell your ID!
              </p>
            </div>
          ) : (
            filteredListings.map((listing, i) => (
              <motion.div
                key={String(listing.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card rounded-xl p-4"
                data-ocid={`p2p.item.${i + 1}`}
              >
                {/* ID */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      Anonymous ID
                    </p>
                    <span className="font-mono text-xl font-bold text-primary tracking-wider">
                      {listing.listedAnonId}
                    </span>
                  </div>
                  <ListingStatusBadge kind={listing.status.__kind__} />
                </div>

                {/* Price + Seller row */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      Price
                    </p>
                    <span className="text-base font-bold">{listing.price}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      Seller
                    </p>
                    <span className="font-mono text-xs text-muted-foreground">
                      {listing.sellerAnonId.slice(0, 12)}…
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  onClick={() => {
                    setBuyListing(listing);
                    setBuyOpen(true);
                  }}
                  data-ocid="p2p.primary_button"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy this ID
                </Button>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* ── My Listings Tab ──────────────────────────────────────────────── */}
        <TabsContent value="listings" className="mt-3 space-y-3">
          {myListingsLoading ? (
            <div
              className="flex justify-center py-16"
              data-ocid="p2p.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {myListings.length === 0 && (
                <div
                  className="text-center py-8 text-muted-foreground text-sm"
                  data-ocid="p2p.empty_state"
                >
                  <Tag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p>You have no listings yet.</p>
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
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        Price
                      </p>
                      <span className="text-sm font-bold">{listing.price}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        IBAN
                      </p>
                      <span className="font-mono text-xs text-muted-foreground">
                        {listing.iban.slice(0, 8)}…{listing.iban.slice(-4)}
                      </span>
                    </div>
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

              {/* Divider */}
              <Separator className="bg-white/5 my-2" />

              {/* Create form or active listing warning */}
              {hasActiveListing ? (
                <div
                  className="bg-amber-950/20 border border-amber-700/30 rounded-xl p-4 text-center"
                  data-ocid="p2p.panel"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm text-amber-300 font-medium">
                    You already have an active listing
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
                      will be listed for sale. When sold, you&apos;ll receive a
                      new random ID automatically.
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Asking Price *
                    </p>
                    <Input
                      placeholder="e.g. 100 TRY"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="bg-white/5 border-white/10 focus:border-primary/50"
                      data-ocid="p2p.input"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Your IBAN (bank account) *
                    </p>
                    <Input
                      placeholder="e.g. TR00 0000 0000 0000 0000 0000 00"
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
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── My Trades Tab ────────────────────────────────────────────────── */}
        <TabsContent value="trades" className="mt-3 space-y-3">
          {tradesLoading ? (
            <div
              className="flex justify-center py-16"
              data-ocid="p2p.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : trades.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="p2p.empty_state"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-3">
                <Wallet className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No trades yet.
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                Buy or sell an ID to start trading.
              </p>
            </div>
          ) : (
            trades.map((trade, i) => {
              const isBuyer = trade.buyerAnonId === myAnonId;
              const isSeller = trade.sellerAnonId === myAnonId;
              const statusKind = trade.status.__kind__;

              return (
                <motion.div
                  key={String(trade.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card rounded-xl p-4"
                  data-ocid={`p2p.item.${i + 1}`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                        {isBuyer ? "You’re Buying" : "You’re Selling"}
                      </p>
                      <span className="font-mono text-base font-bold text-primary tracking-wider">
                        {trade.listedAnonId}
                      </span>
                    </div>
                    <TradeStatusBadge kind={statusKind} />
                  </div>

                  {/* Price + counterparty */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block mb-0.5">
                        Price
                      </span>
                      <span className="font-bold text-sm">{trade.price}</span>
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

                  {/* Trade ID + time */}
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Trade #{Number(trade.id)}
                  </p>

                  {/* Countdown for buyer + Pending */}
                  {isBuyer && statusKind === "Pending" && (
                    <div className="flex items-center justify-between mb-3 bg-amber-950/20 rounded-lg px-3 py-2 border border-amber-700/20">
                      <span className="text-xs text-amber-300">
                        Time remaining:
                      </span>
                      <CountdownTimer
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

                  {/* Seller payment-proof review */}
                  {isSeller && statusKind === "PaymentSent" && (
                    <div className="space-y-3">
                      <div className="bg-sky-950/20 border border-sky-700/20 rounded-lg px-3 py-2.5">
                        <p className="text-xs text-sky-300 font-semibold mb-1.5">
                          Buyer’s Payment Proof
                        </p>
                        {trade.referenceNumber != null &&
                          trade.referenceNumber !== "" && (
                            <p className="text-xs text-muted-foreground">
                              Ref:{" "}
                              <span className="text-foreground font-mono">
                                {trade.referenceNumber}
                              </span>
                            </p>
                          )}
                        {trade.proofScreenshotHash != null &&
                          trade.proofScreenshotHash !== "" && (
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
                          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500 font-semibold h-9 text-xs"
                          onClick={() => handleConfirmTrade(trade.id)}
                          data-ocid="p2p.confirm_button"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
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

                  {/* Completed/settled states info */}
                  {(statusKind === "Confirmed" ||
                    statusKind === "Rejected" ||
                    statusKind === "Disputed" ||
                    statusKind === "Cancelled") && (
                    <div
                      className={`rounded-lg px-3 py-2 text-xs ${
                        statusKind === "Confirmed"
                          ? "bg-emerald-950/20 text-emerald-300"
                          : "bg-zinc-800/40 text-zinc-400"
                      }`}
                    >
                      {statusKind === "Confirmed" &&
                        (isBuyer
                          ? "✔ Trade complete. ID transferred to your account."
                          : "✔ Payment received. ID transferred.")}
                      {statusKind === "Rejected" && "Trade rejected by seller."}
                      {statusKind === "Disputed" &&
                        "This trade is under dispute review."}
                      {statusKind === "Cancelled" && "Trade was cancelled."}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Buy flow sheet (from Market tab) */}
      <BuyFlowSheet
        open={buyOpen}
        onClose={() => {
          setBuyOpen(false);
          setBuyListing(null);
        }}
        listing={buyListing}
        existingTrade={null}
        onSuccess={onBuySuccess}
      />

      {/* Proof flow sheet (from My Trades tab) */}
      <BuyFlowSheet
        open={proofOpen}
        onClose={() => {
          setProofOpen(false);
          setProofTrade(null);
        }}
        listing={null}
        existingTrade={proofTrade}
        onSuccess={onProofSuccess}
      />
    </div>
  );
}
