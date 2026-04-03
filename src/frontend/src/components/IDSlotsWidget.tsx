import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActor } from "@/hooks/useActor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Copy,
  Crown,
  Plus,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

type IdSlotInfo = {
  ownedIds: string[];
  maxSlots: bigint;
  referralBonus: bigint;
  activityBonus: bigint;
  premiumBonus: bigint;
  inactiveIds: string[];
};

export function IDSlotsWidget({ primaryId }: { primaryId: string }) {
  const { actor } = useActor();
  const qc = useQueryClient();

  const { data: slotInfo, isLoading } = useQuery<IdSlotInfo>({
    queryKey: ["idSlotInfo"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return (actor as any).getIdSlotInfo();
    },
    enabled: !!actor,
    refetchInterval: 30_000,
  });

  const createId = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return (actor as any).createAdditionalId();
    },
    onSuccess: (newId: string) => {
      toast.success(`Yeni ID oluşturuldu: ${newId}`);
      qc.invalidateQueries({ queryKey: ["idSlotInfo"] });
    },
    onError: () => {
      toast.error("ID oluşturulamadı — slot limiti dolmuş olabilir");
    },
  });

  const reclaimId = useMutation({
    mutationFn: async (anonId: string) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).reclaimId(anonId);
    },
    onSuccess: () => {
      toast.success("ID geri alındı — slot serbest bırakıldı");
      qc.invalidateQueries({ queryKey: ["idSlotInfo"] });
    },
  });

  if (isLoading || !slotInfo) return null;

  const owned = slotInfo.ownedIds ?? [];
  const maxSlots = Number(slotInfo.maxSlots ?? 3);
  const usedSlots = owned.length;
  const inactiveIds = slotInfo.inactiveIds ?? [];
  const referralBonus = Number(slotInfo.referralBonus ?? 0);
  const activityBonus = Number(slotInfo.activityBonus ?? 0);
  const premiumBonus = Number(slotInfo.premiumBonus ?? 0);
  const slotsRemaining = maxSlots - usedSlots;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4"
    >
      {/* Slot card */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-sm">🪪</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              ID Slotları
            </span>
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-mono ${
              usedSlots >= maxSlots
                ? "border-red-500/40 text-red-400"
                : "border-primary/30 text-primary"
            }`}
          >
            {usedSlots} / {maxSlots}
          </Badge>
        </div>

        {/* Segment bar */}
        <div className="flex gap-1.5 mb-3">
          {Array.from({ length: maxSlots }).map((_, i) => (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative bar
              key={i}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`h-2.5 flex-1 rounded-full transition-all duration-300 ${
                i < usedSlots ? "bg-primary" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {usedSlots >= maxSlots ? (
            <span className="text-red-400">
              Tüm slotlar dolu — unlock et veya pasif ID'yi geri al
            </span>
          ) : (
            <span>{slotsRemaining} slot boş</span>
          )}
        </p>

        {/* Owned IDs list */}
        <div className="flex flex-col gap-2 mb-4">
          {owned.map((id) => {
            const isInactive = inactiveIds.includes(id);
            const isPrimary = id === primaryId;
            return (
              <div
                key={id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  isInactive
                    ? "bg-yellow-900/20 border border-yellow-700/30"
                    : "bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isInactive && (
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  )}
                  <span className="font-mono text-sm text-primary truncate">
                    {id}
                  </span>
                  {isPrimary && (
                    <Badge
                      variant="outline"
                      className="text-xs border-white/10 text-muted-foreground shrink-0"
                    >
                      Ana
                    </Badge>
                  )}
                  {isInactive && (
                    <Badge
                      variant="outline"
                      className="text-xs border-yellow-700/40 text-yellow-400 shrink-0"
                    >
                      Pasif
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText(id);
                      toast.success("Kopyalandı");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  {!isPrimary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                      onClick={() => reclaimId.mutate(id)}
                      disabled={reclaimId.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {usedSlots < maxSlots && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 h-9 text-sm border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
            onClick={() => createId.mutate()}
            disabled={createId.isPending}
          >
            <Plus className="w-4 h-4" />
            {createId.isPending ? "Oluşturuluyor..." : "Yeni ID Ekle"}
          </Button>
        )}
      </div>

      {/* Unlock missions */}
      <div className="glass-card rounded-2xl p-5 mt-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
          🔓 Slot Aç
        </p>
        <div className="flex flex-col gap-2">
          <UnlockRow
            icon={<Users className="w-4 h-4" />}
            label="1 kullanıcı davet et"
            bonus="+1 slot"
            done={referralBonus > 0}
          />
          <UnlockRow
            icon={<Zap className="w-4 h-4" />}
            label="Aktif kullanıcı ol (5 mesaj)"
            bonus="+1 slot"
            done={activityBonus > 0}
          />
          <UnlockRow
            icon={<Crown className="w-4 h-4" />}
            label="Premium üye ol"
            bonus="+5 slot"
            done={premiumBonus > 0}
            highlight
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Maksimum limit: <span className="text-white font-mono">10</span> slot
        </p>
      </div>
    </motion.div>
  );
}

function UnlockRow({
  icon,
  label,
  bonus,
  done,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  bonus: string;
  done?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
        done
          ? "bg-green-900/20 border border-green-700/30"
          : highlight
            ? "bg-amber-900/10 border border-amber-700/20"
            : "bg-white/5"
      }`}
    >
      <span
        className={
          done
            ? "text-green-400"
            : highlight
              ? "text-amber-400"
              : "text-muted-foreground"
        }
      >
        {icon}
      </span>
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <Badge
        variant="outline"
        className={`text-xs ${
          done
            ? "border-green-700/40 text-green-400"
            : highlight
              ? "border-amber-700/40 text-amber-400"
              : "border-white/10 text-muted-foreground"
        }`}
      >
        {done ? "✓ Kazanıldı" : bonus}
      </Badge>
    </div>
  );
}
