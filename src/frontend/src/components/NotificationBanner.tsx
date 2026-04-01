import { X } from "lucide-react";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { NotificationItem } from "../hooks/useNotifications";

function getTypeIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "p2p_trade":
      return "💱";
    case "id_sold":
      return "🎉";
    case "anoncash":
      return "💰";
    default:
      return "💬";
  }
}

function BannerItem({
  notification,
  onDismiss,
  onReply,
}: {
  notification: NotificationItem;
  onDismiss: (id: string) => void;
  onReply?: (contactId: string) => void;
}) {
  const [progress, setProgress] = useState(100);
  const startTime = useRef(Date.now());
  const rafRef = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const DURATION = 5000;

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDismiss(notification.id);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [notification.id, onDismiss]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY < -30) {
      onDismiss(notification.id);
    }
    touchStartY.current = null;
  };

  return (
    <motion.div
      layout
      initial={{ y: -80, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10"
      style={{
        background: "oklch(0.14 0.005 260)",
      }}
    >
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 transition-none"
        style={{
          width: `${progress}%`,
          background: "oklch(0.72 0.2 145)",
          transition: "width 100ms linear",
        }}
      />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
          style={{ background: "oklch(0.72 0.2 145 / 0.15)" }}
        >
          {getTypeIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {notification.body}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {notification.type === "message" &&
            notification.contactId &&
            onReply && (
              <button
                type="button"
                onClick={() => {
                  onReply(notification.contactId!);
                  onDismiss(notification.id);
                }}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors"
                style={{
                  color: "oklch(0.72 0.2 145)",
                  background: "oklch(0.72 0.2 145 / 0.12)",
                }}
              >
                Yanıtla
              </button>
            )}
          <button
            type="button"
            onClick={() => onDismiss(notification.id)}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationBanner({
  bannerQueue,
  onDismiss,
  onReply,
}: {
  bannerQueue: NotificationItem[];
  onDismiss: (id: string) => void;
  onReply: (contactId: string) => void;
}) {
  return (
    <div
      className="fixed left-0 right-0 z-[100] px-3 pt-1 space-y-1"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 56px)" }}
    >
      <AnimatePresence mode="sync">
        {bannerQueue.map((n) => (
          <BannerItem
            key={n.id}
            notification={n}
            onDismiss={onDismiss}
            onReply={onReply}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
