import {
  ArrowLeftRight,
  Bell,
  Check,
  Coins,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  type AppNotification,
  useNotifications,
} from "../context/NotificationContext";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "Az önce";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "message")
    return <MessageSquare className="w-3.5 h-3.5 text-[oklch(0.72_0.2_200)]" />;
  if (type === "p2p_trade" || type === "id_sold")
    return <ArrowLeftRight className="w-3.5 h-3.5 text-[oklch(0.72_0.2_45)]" />;
  return <Coins className="w-3.5 h-3.5 text-[oklch(0.75_0.18_90)]" />;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        data-ocid="notification.open_modal_button"
        className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="notif-panel"
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 shadow-2xl z-[90] overflow-hidden"
            style={{
              background: "oklch(0.12 0.01 240 / 0.98)",
              backdropFilter: "blur(20px)",
            }}
            data-ocid="notification.popover"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-sm font-semibold text-white/90">
                Bildirimler
              </span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    data-ocid="notification.confirm_button"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[oklch(0.72_0.2_200)] hover:bg-white/5 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Tümünü oku
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    data-ocid="notification.delete_button"
                    className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div
                  className="py-10 text-center"
                  data-ocid="notification.empty_state"
                >
                  <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/30">Henüz bildirim yok</p>
                </div>
              ) : (
                notifications.map((n, i) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n.id)}
                    data-ocid={`notification.item.${i + 1}`}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 border-b border-white/5 last:border-0 ${
                      !n.read ? "bg-white/[0.03]" : ""
                    }`}
                  >
                    <div
                      className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "oklch(0.18 0.02 240)" }}
                    >
                      <NotifIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-white/80 truncate">
                          {n.title}
                        </p>
                        <span className="text-[10px] text-white/30 flex-shrink-0">
                          {timeAgo(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.2_200)] flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
