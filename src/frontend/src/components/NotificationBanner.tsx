import { ArrowLeftRight, Coins, MessageSquare, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AppNotification,
  useNotifications,
} from "../context/NotificationContext";

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  const base = "w-4 h-4 flex-shrink-0";
  if (type === "message")
    return <MessageSquare className={`${base} text-[oklch(0.72_0.2_200)]`} />;
  if (type === "p2p_trade" || type === "id_sold")
    return <ArrowLeftRight className={`${base} text-[oklch(0.72_0.2_45)]`} />;
  return <Coins className={`${base} text-[oklch(0.75_0.18_90)]`} />;
}

export function NotificationBanner() {
  const { notifications, markRead, enabled } = useNotifications();
  const [queue, setQueue] = useState<AppNotification[]>([]);
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const currentRef = useRef<AppNotification | null>(null);
  currentRef.current = current;

  // Enqueue new (unseen) notifications
  useEffect(() => {
    if (!enabled) return;
    const newest = notifications[0];
    if (newest && !seenRef.current.has(newest.id)) {
      seenRef.current.add(newest.id);
      setQueue((prev) => [...prev, newest]);
    }
  }, [notifications, enabled]);

  // Show next in queue
  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [current, queue]);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const c = currentRef.current;
    if (c) markRead(c.id);
    setCurrent(null);
  }, [markRead]);

  // Auto-dismiss after 4s
  useEffect(() => {
    if (!current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, dismiss]);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="fixed left-0 right-0 z-[100] px-3"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 60px)" }}
          data-ocid="notification.toast"
        >
          <div
            className="max-w-md mx-auto flex items-start gap-3 p-3 rounded-2xl shadow-xl border border-white/10"
            style={{
              background: "oklch(0.14 0.01 240 / 0.97)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Icon */}
            <div
              className="mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(0.20 0.02 240)" }}
            >
              <NotifIcon type={current.type} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/90 truncate">
                {current.title}
              </p>
              <p className="text-xs text-white/60 mt-0.5 line-clamp-2 leading-relaxed">
                {current.body}
              </p>
            </div>

            {/* Dismiss */}
            <button
              type="button"
              onClick={dismiss}
              className="p-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors flex-shrink-0"
              data-ocid="notification.close_button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
