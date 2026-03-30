import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock,
  Coins,
  Copy,
  Crown,
  Gift,
  Loader2,
  Share2,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { PendingReward, ReferralStats } from "../backend.d";
import { useActor } from "../hooks/useActor";

function formatCountdown(claimableAt: bigint): string {
  const nowNs = BigInt(Date.now()) * 1_000_000n;
  const remaining = claimableAt - nowNs;
  if (remaining <= 0n) return "Talep edilebilir";
  const hours = Number(remaining / (3600n * 1_000_000_000n));
  const mins = Number(
    (remaining % (3600n * 1_000_000_000n)) / (60n * 1_000_000_000n),
  );
  if (hours > 0) return `${hours}s ${mins}d`;
  return `${mins} dakika`;
}

function getLevelInfo(level: PendingReward["level"]) {
  if ("Level1" in level) {
    return { label: "Seviye 1", amount: 1 };
  }
  if ("Level2" in level) {
    return { label: "Seviye 2", amount: 10 };
  }
  return { label: "Seviye 3", amount: 50 };
}

export function EarnTab({ myAnonId }: { myAnonId: string }) {
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const [referralInput, setReferralInput] = useState("");
  const [copied, setCopied] = useState(false);

  const isReady = !!actor && !actorFetching;

  const { data: referralCode } = useQuery<string>({
    queryKey: ["referralCode"],
    queryFn: async () => {
      if (!actor) return myAnonId;
      try {
        return await (actor as any).generateReferralCode();
      } catch {
        return myAnonId;
      }
    },
    enabled: isReady,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ["referralStats"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return await (actor as any).getReferralStats();
    },
    enabled: isReady,
    refetchInterval: 30000,
  });

  const { data: rewards = [] } = useQuery<PendingReward[]>({
    queryKey: ["pendingRewards"],
    queryFn: async () => {
      if (!actor) return [];
      return await (actor as any).getPendingRewards();
    },
    enabled: isReady,
    refetchInterval: 30000,
  });

  const applyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!actor) throw new Error("Not ready");
      // biome-ignore lint/complexity/useLiteralKeys: bracket notation prevents false "useHookAtTopLevel" detection
      await (actor as any)["useReferralCode"](code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referralStats"] });
      setReferralInput("");
      toast.success("Referral kodu uygulandı!");
    },
    onError: () => {
      toast.error("Geçersiz veya kullanılmış kod.");
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (rewardId: bigint) => {
      if (!actor) throw new Error("Not ready");
      return await (actor as any).claimReward(rewardId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingRewards"] });
      queryClient.invalidateQueries({ queryKey: ["referralStats"] });
      toast.success("Ödül talep edildi! AnonCash bakiyene eklendi.");
    },
    onError: () => {
      toast.error("Ödül talep edilemedi.");
    },
  });

  const handleCopy = async () => {
    const code = referralCode ?? myAnonId;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Referral kodu kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopyalanamadı.");
    }
  };

  const handleShare = async () => {
    const code = referralCode ?? myAnonId;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "AnonChat — Kazan!",
          text: `AnonChat'e katıl ve ${code} koduyla kayıt ol — her ikimiz de AnonCash kazanırız!`,
        });
      } else {
        await navigator.clipboard.writeText(code);
        toast.success("Link kopyalandı!");
      }
    } catch {
      // user cancelled
    }
  };

  const balance = stats?.anonCashBalance ?? 0n;
  const pendingAmount = stats?.pendingAmount ?? 0n;
  const level1Count = stats ? Number(stats.level1Count) : 0;
  const level3Count = stats ? Number(stats.level3Count) : 0;
  const totalReferrals = stats ? Number(stats.totalReferrals) : 0;

  const claimableRewards = rewards.filter((r) => "Claimable" in r.status);
  const pendingRewards = rewards.filter((r) => "Pending" in r.status);

  return (
    <div className="px-4 pt-5 pb-8 max-w-md mx-auto w-full space-y-4">
      {/* AnonCash Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5"
        style={{
          background: "oklch(0.18 0.04 85 / 0.5)",
          borderColor: "oklch(0.55 0.15 85 / 0.25)",
        }}
        data-ocid="earn.card"
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.55 0.15 85 / 0.2)" }}
          >
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            AnonCash Bakiye
          </span>
        </div>

        {statsLoading ? (
          <div
            className="flex items-center gap-2 py-2"
            data-ocid="earn.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Yükleniyor...</span>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-bold text-amber-400">
                {Number(balance)}
              </span>
              <span className="text-sm text-amber-400/60 mb-1.5">AC</span>
            </div>
            {pendingAmount > 0n && (
              <p className="text-xs text-amber-400/50 flex items-center gap-1">
                <Clock className="w-3 h-3" />+{Number(pendingAmount)} AC
                beklemede
              </p>
            )}
          </>
        )}
      </motion.div>

      {/* Referral Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card rounded-2xl p-5"
        data-ocid="earn.panel"
      >
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Referral Kodun</span>
        </div>

        <div className="flex items-center gap-2 mb-3 bg-white/5 rounded-xl px-4 py-3">
          <span className="font-mono text-primary flex-1 text-sm tracking-wider break-all">
            {referralCode ?? myAnonId}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            data-ocid="earn.secondary_button"
            className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 h-9 text-xs"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Kopyalandı!" : "Kopyala"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            data-ocid="earn.primary_button"
            className="flex-1 gap-2 border-white/10 bg-white/5 hover:bg-white/10 h-9 text-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            Paylaş
          </Button>
        </div>

        <Separator className="mb-4 bg-white/5" />

        <p className="text-xs text-muted-foreground mb-2">
          Arkadaşının kodunu gir:
        </p>
        <div className="flex gap-2">
          <Input
            value={referralInput}
            onChange={(e) => setReferralInput(e.target.value)}
            placeholder="+777 XXXX XXXX"
            className="flex-1 h-9 text-xs font-mono bg-white/5 border-white/10 focus:border-primary/50"
            data-ocid="earn.input"
          />
          <Button
            size="sm"
            onClick={() =>
              referralInput.trim() &&
              applyCodeMutation.mutate(referralInput.trim())
            }
            disabled={!referralInput.trim() || applyCodeMutation.isPending}
            data-ocid="earn.submit_button"
            className="h-9 px-4 text-xs"
          >
            {applyCodeMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Uygula"
            )}
          </Button>
        </div>
      </motion.div>

      {/* Level Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-5"
        data-ocid="earn.section"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Seviye İlerlemesi</span>
        </div>

        {/* Level 1 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5">
                SEVİYE 1
              </Badge>
              <span className="text-xs text-muted-foreground">
                1 aktif kullanıcı
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-400">+1 AC</span>
          </div>
          <Progress
            value={Math.min(level1Count, 1) * 100}
            className="h-1.5 bg-white/5 [&>div]:bg-emerald-500"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {Math.min(level1Count, 1)}/1
          </p>
        </div>

        <Separator className="mb-4 bg-white/5" />

        {/* Level 2 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/20 text-[10px] px-1.5">
                SEVİYE 2
              </Badge>
              <span className="text-xs text-muted-foreground">
                5 aktif kullanıcı
              </span>
            </div>
            <span className="text-xs font-bold text-sky-400">+10 AC</span>
          </div>
          <Progress
            value={(Math.min(level1Count, 5) / 5) * 100}
            className="h-1.5 bg-white/5 [&>div]:bg-sky-500"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {Math.min(level1Count, 5)}/5
          </p>
        </div>

        <Separator className="mb-4 bg-white/5" />

        {/* Level 3 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[10px] px-1.5">
                SEVİYE 3
              </Badge>
              <span className="text-xs text-muted-foreground">
                Premium alan kullanıcı
              </span>
            </div>
            <span className="text-xs font-bold text-amber-400">+50 AC</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-muted-foreground">
              {level3Count} premium referral
            </span>
          </div>
        </div>

        <Separator className="mt-4 mb-3 bg-white/5" />

        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Toplam referral:{" "}
            <span className="text-foreground">{totalReferrals}</span>
          </span>
        </div>
      </motion.div>

      {/* Claimable Rewards */}
      {claimableRewards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-5"
          style={{
            background: "oklch(0.18 0.06 145 / 0.4)",
            borderColor: "oklch(0.55 0.18 145 / 0.25)",
          }}
          data-ocid="earn.list"
        >
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              Talep Edilebilir Ödüller
            </span>
          </div>
          <div className="space-y-2">
            {claimableRewards.map((reward, idx) => {
              const info = getLevelInfo(reward.level);
              return (
                <div
                  key={String(reward.id)}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5"
                  data-ocid={`earn.item.${idx + 1}`}
                >
                  <div>
                    <p className="text-xs font-medium text-emerald-400">
                      {info.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {reward.referredUserAnonId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-400">
                      +{info.amount} AC
                    </span>
                    <Button
                      size="sm"
                      onClick={() => claimMutation.mutate(reward.id)}
                      disabled={claimMutation.isPending}
                      data-ocid={`earn.primary_button.${idx + 1}`}
                      className="h-7 px-3 text-xs bg-emerald-600/80 hover:bg-emerald-600 text-white border-none"
                    >
                      {claimMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Talep Et"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Pending Rewards */}
      {pendingRewards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-5 opacity-70"
          data-ocid="earn.table"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Bekleyen Ödüller
            </span>
          </div>
          <div className="space-y-2">
            {pendingRewards.map((reward, idx) => {
              const info = getLevelInfo(reward.level);
              return (
                <div
                  key={String(reward.id)}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2.5"
                  data-ocid={`earn.row.${idx + 1}`}
                >
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {info.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono">
                      {reward.referredUserAnonId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground/60">
                      +{info.amount} AC
                    </p>
                    <p className="text-[10px] text-muted-foreground/40">
                      {formatCountdown(reward.claimableAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium">Nasıl Çalışır?</span>
        </div>
        <div className="space-y-3">
          {[
            {
              step: "1",
              text: "Kodunu paylaş, arkadaşın katılır",
              color: "text-primary",
            },
            {
              step: "2",
              text: "Arkadaşın 5 mesaj gönderir → +1 AC (24s sonra)",
              color: "text-emerald-400",
            },
            {
              step: "3",
              text: "5 aktif arkadaşın olur → +10 AC",
              color: "text-sky-400",
            },
            {
              step: "4",
              text: "Arkadaşın premium satın alır → +50 AC",
              color: "text-amber-400",
            },
          ].map(({ step, text, color }) => (
            <div key={step} className="flex items-start gap-3">
              <span
                className={`w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${color}`}
              >
                {step}
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {text}
              </p>
            </div>
          ))}
        </div>
        <Separator className="my-4 bg-white/5" />
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground">
            ⚡ Günlük kazanım limiti: 100 AC
          </p>
          <p className="text-[10px] text-muted-foreground">
            🛡️ Hile tespiti aktif — aynı IP/cihaz geçersiz sayılır
          </p>
          <p className="text-[10px] text-muted-foreground">
            ⏱️ Ödüller onaydan 24 saat sonra talep edilebilir
          </p>
        </div>
      </motion.div>
    </div>
  );
}
