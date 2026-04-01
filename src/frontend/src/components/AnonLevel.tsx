import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

// ─── XP / Level definitions ───────────────────────────────────────────────────

export const LEVELS = [
  {
    level: 0,
    name: "Hayalet",
    emoji: "👻",
    xpRequired: 0,
    colorCls: "text-slate-400",
    bgCls: "bg-slate-500/20 border-slate-500/40",
  },
  {
    level: 1,
    name: "Gölge",
    emoji: "🌑",
    xpRequired: 100,
    colorCls: "text-indigo-400",
    bgCls: "bg-indigo-500/20 border-indigo-500/40",
  },
  {
    level: 2,
    name: "Phantom",
    emoji: "🔮",
    xpRequired: 500,
    colorCls: "text-purple-400",
    bgCls: "bg-purple-500/20 border-purple-500/40",
  },
  {
    level: 3,
    name: "Efsane",
    emoji: "⚡",
    xpRequired: 2000,
    colorCls: "text-amber-400",
    bgCls: "bg-amber-500/20 border-amber-500/40",
    myth: true,
  },
] as const;

export type LevelDef = (typeof LEVELS)[number];

export const XP_KEY = "anon_xp";
export const LEVEL_KEY = "anon_level";
export const DAILY_LOGIN_KEY = "anon_daily_login";

export function getXP(): number {
  return Number(localStorage.getItem(XP_KEY) ?? 0);
}

export function addXP(amount: number): number {
  const current = getXP();
  const next = current + amount;
  localStorage.setItem(XP_KEY, String(next));
  const lvl = computeLevel(next);
  localStorage.setItem(LEVEL_KEY, String(lvl.level));
  return next;
}

export function computeLevel(xp: number): LevelDef {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) return LEVELS[i];
  }
  return LEVELS[0];
}

export function xpToNextLevel(xp: number): {
  current: number;
  needed: number;
  pct: number;
} {
  const lvl = computeLevel(xp);
  if (lvl.level === 3)
    return { current: xp, needed: LEVELS[3].xpRequired, pct: 100 };
  const next = LEVELS[lvl.level + 1];
  const prev = LEVELS[lvl.level];
  const current = xp - prev.xpRequired;
  const needed = next.xpRequired - prev.xpRequired;
  return { current, needed, pct: Math.round((current / needed) * 100) };
}

// ─── AnonLevel badge (full card variant) ─────────────────────────────────────

export function AnonLevelCard({
  onLevelUp,
}: { onLevelUp?: (lvl: LevelDef) => void }) {
  const [xp, setXp] = useState(getXP);
  const [canClaim, setCanClaim] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const lvl = computeLevel(xp);
  const progress = xpToNextLevel(xp);

  useEffect(() => {
    const last = localStorage.getItem(DAILY_LOGIN_KEY);
    const today = new Date().toDateString();
    setCanClaim(last !== today);
  }, []);

  const handleClaim = () => {
    const today = new Date().toDateString();
    localStorage.setItem(DAILY_LOGIN_KEY, today);
    const prevLvl = computeLevel(xp);
    const newXp = addXP(20);
    const newLvl = computeLevel(newXp);
    setXp(newXp);
    setClaimed(true);
    setCanClaim(false);
    if (newLvl.level > prevLvl.level && onLevelUp) {
      onLevelUp(newLvl);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 mb-4 ${lvl.level === 3 ? "animate-phantom-pulse" : ""} ${lvl.bgCls}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{lvl.emoji}</span>
          <div>
            <p className={`text-sm font-bold ${lvl.colorCls}`}>{lvl.name}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Seviye {lvl.level}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold font-mono ${lvl.colorCls}`}>
            {xp} XP
          </p>
          {lvl.level < 3 && (
            <p className="text-[10px] text-muted-foreground">
              {progress.needed - progress.current} XP kaldı
            </p>
          )}
        </div>
      </div>

      {lvl.level < 3 && (
        <div className="mb-3">
          <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
            <span>{LEVELS[lvl.level].name}</span>
            <span>
              {LEVELS[lvl.level + 1].name} {LEVELS[lvl.level + 1].emoji}
            </span>
          </div>
          <Progress value={progress.pct} className="h-1.5" />
        </div>
      )}

      {canClaim && !claimed && (
        <button
          type="button"
          onClick={handleClaim}
          data-ocid="profile.primary_button"
          className={`w-full text-xs font-semibold py-2 rounded-lg border transition-all ${lvl.bgCls} ${lvl.colorCls} hover:opacity-80`}
        >
          🎁 Bugün giriş yaptın: +20 XP al
        </button>
      )}
      {claimed && (
        <p className="text-center text-[10px] text-muted-foreground">
          ✅ Günlük XP alındı
        </p>
      )}
      {!canClaim && !claimed && (
        <p className="text-center text-[10px] text-muted-foreground">
          Yarın tekrar gel: +20 XP
        </p>
      )}
    </div>
  );
}

// ─── Small inline badge ───────────────────────────────────────────────────────

export function AnonLevelBadge({ xp }: { xp?: number }) {
  const currentXp = xp ?? getXP();
  const lvl = computeLevel(currentXp);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${lvl.bgCls} ${lvl.colorCls}`}
    >
      {lvl.emoji} {lvl.name}
    </span>
  );
}
