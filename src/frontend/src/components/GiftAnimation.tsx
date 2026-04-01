import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

type AnimationType = "message" | "trade" | "levelup";

interface Particle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  scale: number;
}

const EMOJIS: Record<AnimationType, string[]> = {
  message: ["💬"],
  trade: ["🎉", "💰", "✨"],
  levelup: ["🔮", "⚡", "👻", "🌑", "💫", "✨", "🎊", "🎉", "🔥", "💎"],
};

const COUNT: Record<AnimationType, number> = {
  message: 1,
  trade: 3,
  levelup: 10,
};

function createParticles(type: AnimationType): Particle[] {
  const emojis = EMOJIS[type];
  const count = COUNT[type];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: emojis[i % emojis.length],
    x: type === "levelup" ? Math.random() * 90 + 5 : 30 + Math.random() * 40,
    delay: i * 0.08,
    scale: 0.8 + Math.random() * 0.7,
  }));
}

interface GiftAnimationProps {
  type: AnimationType;
  trigger: boolean;
  onComplete?: () => void;
}

export function GiftAnimation({
  type,
  trigger,
  onComplete,
}: GiftAnimationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const isFullScreen = type === "levelup";

  useEffect(() => {
    if (!trigger) return;
    setParticles(createParticles(type));
    const timer = setTimeout(
      () => {
        setParticles([]);
        onComplete?.();
      },
      isFullScreen ? 2000 : 1200,
    );
    return () => clearTimeout(timer);
  }, [trigger, type, isFullScreen, onComplete]);

  if (particles.length === 0) return null;

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                opacity: 1,
                y: "110vh",
                x: `${p.x}vw`,
                scale: p.scale,
              }}
              animate={{ opacity: 0, y: "-10vh" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, delay: p.delay, ease: "easeOut" }}
              className="absolute text-3xl select-none"
            >
              {p.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, y: 0, x: `${p.x}%`, scale: p.scale }}
            animate={{ opacity: 0, y: -60 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: p.delay, ease: "easeOut" }}
            className="absolute bottom-4 text-xl select-none"
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
