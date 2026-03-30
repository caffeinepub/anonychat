import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Crown, Gem, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Rarity = "normal" | "rare" | "ultra";

function detectRarity(id: string): Rarity {
  const digits = id.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  if (last4[0] === last4[1] && last4[1] === last4[2] && last4[2] === last4[3])
    return "ultra";
  if (last4[2] === last4[3]) return "rare";
  return "normal";
}

function generateIds(pattern: string): string[] {
  const patternDigits = pattern.replace(/\D/g, "");
  return Array.from({ length: 5 }, () => {
    const base = patternDigits.padEnd(8, "");
    let digits = base;
    while (digits.length < 8) {
      digits += String(Math.floor(Math.random() * 10));
    }
    const suffix =
      String(Math.floor(Math.random() * 10)) +
      String(Math.floor(Math.random() * 10));
    const full = `${digits}${suffix}`.slice(0, 10);
    const p1 = full.slice(0, 4);
    const p2 = full.slice(4, 8);
    const p3 = full.slice(8, 10);
    return `+777 ${p1} ${p2}${p3}`;
  });
}

const RARITY_CONFIG = {
  normal: {
    label: "Normal",
    price: "Ücretsiz",
    color: "text-gray-400",
    border: "border-gray-700",
    bg: "bg-gray-800/40",
    icon: null,
  },
  rare: {
    label: "Nadir",
    price: "500 ICP Kredi",
    color: "text-amber-400",
    border: "border-amber-700/50",
    bg: "bg-amber-900/20",
    icon: <Star className="w-3 h-3 fill-amber-400 text-amber-400" />,
  },
  ultra: {
    label: "Ultra Nadir",
    price: "2000 ICP Kredi",
    color: "text-violet-400",
    border: "border-violet-600/50",
    bg: "bg-violet-900/20",
    icon: <Gem className="w-3 h-3 fill-violet-400 text-violet-400" />,
  },
};

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const cfg = RARITY_CONFIG[rarity];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        cfg.border
      } ${cfg.bg} ${cfg.color} ${
        rarity === "ultra" ? "shadow-[0_0_8px_rgba(139,92,246,0.4)]" : ""
      }`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

interface IdResult {
  id: string;
  rarity: Rarity;
}

export function PremiumModal({
  open,
  onClose,
  myAnonId,
}: {
  open: boolean;
  onClose: () => void;
  myAnonId: string;
}) {
  const [pattern, setPattern] = useState("");
  const [results, setResults] = useState<IdResult[]>([]);
  const [selected, setSelected] = useState<IdResult | null>(null);

  const myRarity = detectRarity(myAnonId);

  const handlePatternChange = (val: string) => {
    setPattern(val);
    setSelected(null);
    if (val.trim().length === 0) {
      setResults([]);
      return;
    }
    const ids = generateIds(val);
    setResults(ids.map((id) => ({ id, rarity: detectRarity(id) })));
  };

  const handleBuy = () => {
    toast.success("Bu özellik yakında geliyor! 🎉", { duration: 3000 });
    setSelected(null);
    setPattern("");
    setResults([]);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[oklch(0.11_0_0)] border-t border-white/10 rounded-t-2xl max-h-[90dvh] overflow-y-auto px-4 pb-8"
        data-ocid="premium.sheet"
      >
        <SheetHeader className="mb-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Crown className="w-5 h-5 text-amber-400" />
            <span className="text-foreground">Premium ID Seç</span>
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Özel kimliğini seç ve satın al
          </p>
        </SheetHeader>

        {/* Current ID */}
        <div className="glass-card rounded-xl p-4 mb-5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            Mevcut Kimliğin
          </p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-base font-bold text-primary tracking-wider">
              {myAnonId}
            </span>
            <RarityBadge rarity={myRarity} />
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="flex gap-2 mb-5">
          {(["normal", "rare", "ultra"] as Rarity[]).map((r) => {
            const cfg = RARITY_CONFIG[r];
            return (
              <div
                key={r}
                className={`flex-1 rounded-xl p-3 border ${cfg.border} ${cfg.bg} flex flex-col items-center gap-1`}
              >
                <span
                  className={`text-[10px] font-bold uppercase ${cfg.color} flex items-center gap-1`}
                >
                  {cfg.icon}
                  {cfg.label}
                </span>
                <span className="text-[9px] text-muted-foreground text-center">
                  {cfg.price}
                </span>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">
            Aradığın deseni gir:
          </p>
          <Input
            placeholder="Örnek: +777 1234"
            value={pattern}
            onChange={(e) => handlePatternChange(e.target.value)}
            className="bg-white/5 border-white/10 focus:border-primary/50 font-mono"
            data-ocid="premium.input"
          />
        </div>

        {/* Results */}
        {results.length > 0 && !selected && (
          <div className="space-y-2 mb-4" data-ocid="premium.list">
            {results.map((result, i) => (
              <div
                key={result.id}
                className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5"
                data-ocid={`premium.item.${i + 1}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-primary tracking-wider">
                    {result.id}
                  </span>
                  <RarityBadge rarity={result.rarity} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {RARITY_CONFIG[result.rarity].price}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(result)}
                    data-ocid="premium.secondary_button"
                    className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Seç
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation */}
        {selected && (
          <div
            className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 mb-4 space-y-3"
            data-ocid="premium.dialog"
          >
            <p className="text-xs text-amber-300 font-medium">Seçilen Kimlik</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-bold text-primary tracking-wider">
                {selected.id}
              </span>
              <RarityBadge rarity={selected.rarity} />
            </div>
            <p className="text-xs text-muted-foreground">
              Fiyat:{" "}
              <span className="text-amber-400 font-semibold">
                {RARITY_CONFIG[selected.rarity].price}
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold"
                onClick={handleBuy}
                data-ocid="premium.confirm_button"
              >
                Satın Al
              </Button>
              <Button
                variant="outline"
                className="border-white/10 text-muted-foreground hover:bg-white/5"
                onClick={() => setSelected(null)}
                data-ocid="premium.cancel_button"
              >
                İptal
              </Button>
            </div>
          </div>
        )}

        {results.length === 0 && pattern.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Crown className="w-8 h-8 mx-auto mb-2 text-amber-400/40" />
            <p>Bir desen girerek özel ID ara</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
