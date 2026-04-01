import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Coins,
  Loader2,
  RefreshCw,
  Settings,
  Shield,
  ShieldOff,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { backendInterface } from "../backend";
import type { AdminDashboard, P2PTrade, User } from "../backend.d";
import { useActor } from "../hooks/useActor";

// Extended actor type with admin methods
type AdminActor = backendInterface & {
  getAllTradesAdmin(): Promise<P2PTrade[]>;
  getAllUsersAdmin(): Promise<User[]>;
  freezeUser(
    target: import("@icp-sdk/core/principal").Principal,
  ): Promise<void>;
  unfreezeUser(
    target: import("@icp-sdk/core/principal").Principal,
  ): Promise<void>;
  isUserFrozen(
    target: import("@icp-sdk/core/principal").Principal,
  ): Promise<boolean>;
  getAdminDashboard(): Promise<AdminDashboard>;
  resolveDispute(tradeId: bigint, favorBuyer: boolean): Promise<void>;
  getDisputedTrades(): Promise<P2PTrade[]>;
  getDisputeEvidence(tradeId: bigint): Promise<[] | [string]>;
  getCommissionBalance(): Promise<bigint>;
  openDispute(tradeId: bigint, evidence: string): Promise<void>;
};

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
}

type TradeStatusKind = P2PTrade["status"]["__kind__"];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Pending: {
    label: "Bekliyor",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  WaitingPayment: {
    label: "Ödeme Bekleniyor",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  PaymentSent: {
    label: "Ödeme Gönderildi",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  Confirmed: {
    label: "Onaylandı",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  Completed: {
    label: "Tamamlandı",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  Disputed: {
    label: "Anlaşmazlık",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  Cancelled: {
    label: "İptal",
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
  Rejected: {
    label: "Reddedildi",
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  },
};

function getStatusConfig(kind: string) {
  return (
    STATUS_CONFIG[kind] ?? {
      label: kind,
      className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    }
  );
}

function StatCard({
  label,
  value,
  icon,
}: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-primary">{icon}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold font-mono">{value}</p>
    </div>
  );
}

function TradeCard({
  trade,
  onResolve,
  resolving,
}: {
  trade: P2PTrade;
  onResolve?: (tradeId: bigint, favorBuyer: boolean) => Promise<void>;
  resolving?: boolean;
}) {
  const statusKind = trade.status.__kind__;
  const cfg = getStatusConfig(statusKind);
  const tradeId = trade.id;

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
      data-ocid="admin.trade.card"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">
          Trade #{String(tradeId)}
        </span>
        <Badge className={`text-xs border ${cfg.className}`}>{cfg.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Satıcı</p>
          <p className="font-mono text-foreground/90 truncate">
            {trade.sellerAnonId}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Alıcı</p>
          <p className="font-mono text-foreground/90 truncate">
            {trade.buyerAnonId}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">ID</p>
          <p className="font-mono text-foreground/90">{trade.listedAnonId}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Fiyat</p>
          <p className="font-semibold text-primary">€{trade.price}</p>
        </div>
      </div>

      {statusKind === "Disputed" && onResolve && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30"
            onClick={() => onResolve(tradeId, true)}
            disabled={resolving}
            data-ocid="admin.dispute.confirm_button"
          >
            {resolving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3" />
            )}
            <span className="ml-1">ID'yi Alıcıya Ver</span>
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30"
            onClick={() => onResolve(tradeId, false)}
            disabled={resolving}
            data-ocid="admin.dispute.cancel_button"
          >
            {resolving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            <span className="ml-1">Satıcıya İade</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdminPanel({ open, onClose }: AdminPanelProps) {
  const { actor: _actor, isFetching } = useActor();
  const actor = _actor as AdminActor | null;

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [allTrades, setAllTrades] = useState<P2PTrade[]>([]);
  const [disputedTrades, setDisputedTrades] = useState<P2PTrade[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loadingDash, setLoadingDash] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [tradeFilter, setTradeFilter] = useState<TradeStatusKind | "all">(
    "all",
  );
  const [resolvingId, setResolvingId] = useState<bigint | null>(null);
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [frozenUsers, setFrozenUsers] = useState<Set<string>>(new Set());
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!actor) return;
    setLoadingDash(true);
    try {
      const data = await actor.getAdminDashboard();
      setDashboard(data);
      setUnauthorized(false);
    } catch {
      setUnauthorized(true);
    } finally {
      setLoadingDash(false);
    }
  }, [actor]);

  const fetchTrades = useCallback(async () => {
    if (!actor) return;
    setLoadingTrades(true);
    try {
      const data = await actor.getAllTradesAdmin();
      setAllTrades(data);
    } catch {
      // unauthorized
    } finally {
      setLoadingTrades(false);
    }
  }, [actor]);

  const fetchDisputedTrades = useCallback(async () => {
    if (!actor) return;
    setLoadingDisputes(true);
    try {
      const data = await actor.getDisputedTrades();
      setDisputedTrades(data);
    } catch {
      // unauthorized
    } finally {
      setLoadingDisputes(false);
    }
  }, [actor]);

  const fetchUsers = useCallback(async () => {
    if (!actor) return;
    setLoadingUsers(true);
    try {
      const data = await actor.getAllUsersAdmin();
      setUsers(data);
    } catch {
      // unauthorized
    } finally {
      setLoadingUsers(false);
    }
  }, [actor]);

  useEffect(() => {
    if (!open || isFetching || !actor) return;
    void fetchDashboard();
    void fetchTrades();
    void fetchUsers();
    void fetchDisputedTrades();
  }, [
    open,
    isFetching,
    actor,
    fetchDashboard,
    fetchTrades,
    fetchUsers,
    fetchDisputedTrades,
  ]);

  const handleResolveDispute = async (tradeId: bigint, favorBuyer: boolean) => {
    if (!actor) return;
    setResolvingId(tradeId);
    try {
      await actor.resolveDispute(tradeId, favorBuyer);
      toast.success(
        favorBuyer ? "ID alıcıya transfer edildi" : "ID satıcıya iade edildi",
      );
      await Promise.all([
        fetchTrades(),
        fetchDisputedTrades(),
        fetchDashboard(),
      ]);
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setResolvingId(null);
    }
  };

  const handleFreezeToggle = async (user: User, frozen: boolean) => {
    if (!actor) return;
    // We need Principal — using anonId as display key
    setFreezingId(user.anonymousId);
    try {
      if (frozen) {
        await actor.unfreezeUser(user.principal);
        setFrozenUsers((prev) => {
          const next = new Set(prev);
          next.delete(user.anonymousId);
          return next;
        });
        toast.success("Kullanıcı serbest bırakıldı");
      } else {
        await actor.freezeUser(user.principal);
        setFrozenUsers((prev) => new Set([...prev, user.anonymousId]));
        toast.success("Kullanıcı donduruldu");
      }
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setFreezingId(null);
    }
  };

  const filteredTrades =
    tradeFilter === "all"
      ? allTrades
      : allTrades.filter((t) => t.status.__kind__ === tradeFilter);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] bg-[oklch(0.12_0.015_240)] border-t border-white/10 p-0 flex flex-col"
        data-ocid="admin.panel"
      >
        <SheetHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            Admin Kontrol Paneli
          </SheetTitle>
        </SheetHeader>

        {unauthorized ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
            <ShieldOff className="w-12 h-12 text-red-400" />
            <p className="text-center text-muted-foreground text-sm">
              Bu panele erişim yetkiniz yok.
            </p>
          </div>
        ) : (
          <Tabs
            defaultValue="dashboard"
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="mx-4 mb-2 bg-white/5 border border-white/10 h-9 flex-shrink-0">
              <TabsTrigger
                value="dashboard"
                className="flex-1 text-xs data-[state=active]:bg-primary/20"
                data-ocid="admin.tab"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="trades"
                className="flex-1 text-xs data-[state=active]:bg-primary/20"
                data-ocid="admin.tab"
              >
                İşlemler
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="flex-1 text-xs data-[state=active]:bg-primary/20"
                data-ocid="admin.tab"
              >
                <Users className="w-3 h-3 mr-1" />
                Kullanıcılar
              </TabsTrigger>
              <TabsTrigger
                value="disputes"
                className="flex-1 text-xs data-[state=active]:bg-primary/20"
                data-ocid="admin.tab"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Uyuşmazlıklar
              </TabsTrigger>
            </TabsList>

            {/* ── DASHBOARD ─────────────────────────────────────── */}
            <TabsContent
              value="dashboard"
              className="flex-1 overflow-hidden px-4"
            >
              <ScrollArea className="h-full">
                <div className="pb-6">
                  {loadingDash || !dashboard ? (
                    <div
                      className="grid grid-cols-2 gap-3"
                      data-ocid="admin.loading_state"
                    >
                      {["a", "b", "c", "d", "e", "f"].map((sk) => (
                        <Skeleton
                          key={sk}
                          className="h-24 rounded-xl bg-white/5"
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <StatCard
                          label="Toplam Kullanıcı"
                          value={String(dashboard.totalUsers)}
                          icon={<Users className="w-4 h-4" />}
                        />
                        <StatCard
                          label="Toplam İşlem"
                          value={String(dashboard.totalTrades)}
                          icon={<BarChart3 className="w-4 h-4" />}
                        />
                        <StatCard
                          label="Aktif İşlem"
                          value={String(dashboard.activeTrades)}
                          icon={<RefreshCw className="w-4 h-4" />}
                        />
                        <StatCard
                          label="Tamamlanan"
                          value={String(dashboard.completedTrades)}
                          icon={<CheckCircle className="w-4 h-4" />}
                        />
                        <StatCard
                          label="Uyuşmazlık"
                          value={String(dashboard.disputedTrades)}
                          icon={<AlertTriangle className="w-4 h-4" />}
                        />
                        <StatCard
                          label="Komisyon (AC)"
                          value={String(dashboard.commissionBalance)}
                          icon={<Coins className="w-4 h-4" />}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <StatCard
                          label="Toplam İlan"
                          value={String(dashboard.totalListings)}
                          icon={<Shield className="w-4 h-4" />}
                        />
                        <StatCard
                          label="Aktif İlan"
                          value={String(dashboard.activeListings)}
                          icon={<Shield className="w-4 h-4" />}
                        />
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── ALL TRADES ────────────────────────────────────── */}
            <TabsContent
              value="trades"
              className="flex-1 overflow-hidden flex flex-col min-h-0 px-4"
            >
              {/* Filter pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 scrollbar-hide">
                {(
                  [
                    "all",
                    "Pending",
                    "PaymentSent",
                    "Completed",
                    "Disputed",
                    "Cancelled",
                  ] as const
                ).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTradeFilter(f as TradeStatusKind | "all")}
                    data-ocid="admin.tab"
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition-colors ${
                      tradeFilter === f
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {f === "all" ? "Tümü" : getStatusConfig(f).label}
                  </button>
                ))}
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-3 pb-6">
                  {loadingTrades ? (
                    <div data-ocid="admin.loading_state">
                      {["a", "b", "c"].map((sk) => (
                        <Skeleton
                          key={sk}
                          className="h-32 rounded-xl bg-white/5 mb-3"
                        />
                      ))}
                    </div>
                  ) : filteredTrades.length === 0 ? (
                    <div
                      className="text-center py-12 text-muted-foreground text-sm"
                      data-ocid="admin.empty_state"
                    >
                      Bu filtrede işlem yok.
                    </div>
                  ) : (
                    filteredTrades.map((trade, i) => (
                      <TradeCard
                        key={String(trade.id)}
                        trade={trade}
                        onResolve={
                          trade.status.__kind__ === "Disputed"
                            ? handleResolveDispute
                            : undefined
                        }
                        resolving={resolvingId === trade.id}
                        data-ocid={`admin.trade.item.${i + 1}`}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── USERS ─────────────────────────────────────────── */}
            <TabsContent value="users" className="flex-1 overflow-hidden px-4">
              <ScrollArea className="h-full">
                <div className="space-y-2 pb-6">
                  {loadingUsers ? (
                    <div data-ocid="admin.loading_state">
                      {["a", "b", "c", "d"].map((sk) => (
                        <Skeleton
                          key={sk}
                          className="h-14 rounded-xl bg-white/5 mb-2"
                        />
                      ))}
                    </div>
                  ) : users.length === 0 ? (
                    <div
                      className="text-center py-12 text-muted-foreground text-sm"
                      data-ocid="admin.empty_state"
                    >
                      Kullanıcı bulunamadı.
                    </div>
                  ) : (
                    users.map((u, i) => {
                      const isFrozen = frozenUsers.has(u.anonymousId);
                      const isLoading = freezingId === u.anonymousId;
                      return (
                        <div
                          key={u.anonymousId}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                          data-ocid={`admin.users.item.${i + 1}`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">
                                {u.anonymousId}
                              </span>
                              {isFrozen && (
                                <Badge className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30 border">
                                  Donduruldu
                                </Badge>
                              )}
                            </div>
                            {u.username && (
                              <p className="text-xs text-muted-foreground truncate">
                                {u.username}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFreezeToggle(u, isFrozen)}
                            disabled={isLoading}
                            data-ocid="admin.users.toggle"
                            className={`h-8 text-xs gap-1 border ${
                              isFrozen
                                ? "border-green-600/30 bg-green-600/10 text-green-400 hover:bg-green-600/20"
                                : "border-red-600/30 bg-red-600/10 text-red-400 hover:bg-red-600/20"
                            }`}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isFrozen ? (
                              <Shield className="w-3 h-3" />
                            ) : (
                              <ShieldOff className="w-3 h-3" />
                            )}
                            {isFrozen ? "Serbest" : "Dondur"}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── DISPUTES ──────────────────────────────────────── */}
            <TabsContent
              value="disputes"
              className="flex-1 overflow-hidden px-4"
            >
              <ScrollArea className="h-full">
                <div className="space-y-3 pb-6">
                  {loadingDisputes ? (
                    <div data-ocid="admin.loading_state">
                      {["a", "b", "c"].map((sk) => (
                        <Skeleton
                          key={sk}
                          className="h-40 rounded-xl bg-white/5 mb-3"
                        />
                      ))}
                    </div>
                  ) : disputedTrades.length === 0 ? (
                    <div
                      className="flex flex-col items-center py-12 gap-3"
                      data-ocid="admin.empty_state"
                    >
                      <CheckCircle className="w-10 h-10 text-green-400/40" />
                      <p className="text-muted-foreground text-sm">
                        Açık uyuşmazlık yok.
                      </p>
                    </div>
                  ) : (
                    disputedTrades.map((trade, i) => (
                      <DisputeCard
                        key={String(trade.id)}
                        trade={trade}
                        onResolve={handleResolveDispute}
                        resolving={resolvingId === trade.id}
                        index={i + 1}
                        actor={actor}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DisputeCard({
  trade,
  onResolve,
  resolving,
  index,
  actor,
}: {
  trade: P2PTrade;
  onResolve: (tradeId: bigint, favorBuyer: boolean) => Promise<void>;
  resolving: boolean;
  index: number;
  actor: AdminActor | null;
}) {
  const [evidence, setEvidence] = useState<string | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  useEffect(() => {
    if (!actor) return;
    setLoadingEvidence(true);
    actor
      .getDisputeEvidence(trade.id)
      .then((res) => {
        setEvidence(
          Array.isArray(res) && res.length > 0 && res[0] != null
            ? res[0]
            : null,
        );
      })
      .catch(() => null)
      .finally(() => setLoadingEvidence(false));
  }, [actor, trade.id]);

  return (
    <div
      className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3"
      data-ocid={`admin.dispute.item.${index}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-mono">
          Trade #{String(trade.id)}
        </span>
        <Badge className="text-xs border bg-red-500/20 text-red-400 border-red-500/30">
          Uyuşmazlık
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Satıcı</p>
          <p className="font-mono text-foreground/90 truncate">
            {trade.sellerAnonId}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Alıcı</p>
          <p className="font-mono text-foreground/90 truncate">
            {trade.buyerAnonId}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">ID</p>
          <p className="font-mono text-foreground/90">{trade.listedAnonId}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Fiyat</p>
          <p className="font-semibold text-primary">€{trade.price}</p>
        </div>
      </div>

      {/* Evidence */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Kanıt</p>
        {loadingEvidence ? (
          <Skeleton className="h-10 bg-white/5" />
        ) : evidence ? (
          <Textarea
            readOnly
            value={evidence}
            className="text-xs h-16 resize-none bg-black/20 border-white/10 text-muted-foreground"
          />
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">Kanıt yok</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-9 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30"
          onClick={() => onResolve(trade.id, true)}
          disabled={resolving}
          data-ocid="admin.dispute.confirm_button"
        >
          {resolving ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <CheckCircle className="w-3 h-3 mr-1" />
          )}
          ✅ ID'yi Alıcıya Ver
        </Button>
        <Button
          size="sm"
          className="flex-1 h-9 text-xs bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border border-orange-600/30"
          onClick={() => onResolve(trade.id, false)}
          disabled={resolving}
          data-ocid="admin.dispute.cancel_button"
        >
          {resolving ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <XCircle className="w-3 h-3 mr-1" />
          )}
          ↩️ Satıcıya İade
        </Button>
      </div>
    </div>
  );
}
