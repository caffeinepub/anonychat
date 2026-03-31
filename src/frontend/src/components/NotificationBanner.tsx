import { ArrowLeftRight, Coins, MessageSquare, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type {
  AppNotification,
  NotificationType,
} from "../hooks/useNotifications";

const AVATAR_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; bg: string; initial?: string }
> = {
  message: {
    icon: <MessageSquare className="w-4 h-4" />,
    bg: "bg-[oklch(0.35_0.12_145)]",
  },
  p2p: {
    icon: <ArrowLeftRight className="w-4 h-4" />,
    bg: "bg-[oklch(0.3_0.1_250)]",
  },
  earn: {
    icon: <Coins className="w-4 h-4" />,
    bg: "bg-[oklch(0.35_0.1_60)]",
  },
};

const AVATAR_ICON_COLOR: Record<NotificationType, string> = {
  message: "text-[oklch(0.72_0.2_145)]",
  p2p: "text-[oklch(0.72_0.15_250)]",
  earn: "text-[oklch(0.75_0.2_60)]",
};

export interface NotificationBannerProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onTap?: (notification: AppNotification) => void;
}

export function NotificationBanner({
  notification,
  onDismiss,
  onTap,
}: NotificationBannerProps) {
  const [visible, setVisible] = useState(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!notification) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => dismissRef.current(), 350);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    setTimeout(() => dismissRef.current(), 350);
  };

  const handleTap = () => {
    if (notification && onTap) onTap(notification);
    setVisible(false);
    setTimeout(() => dismissRef.current(), 350);
  };

  if (!notification) return null;

  const avatarCfg = AVATAR_CONFIG[notification.type];
  const iconColor = AVATAR_ICON_COLOR[notification.type];

  const senderInitial =
    notification.type === "message" && notification.title
      ? notification.title[0]
      : null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={notification.id}
          initial={{ y: -100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          drag="y"
          dragConstraints={{ top: -100, bottom: 0 }}
          onDragEnd={(_e, info) => {
            if (info.offset.y < -40) {
              setVisible(false);
              setTimeout(() => dismissRef.current(), 350);
            }
          }}
          className="fixed left-0 right-0 z-[100] flex justify-center px-3 cursor-pointer"
          style={{ top: "61px" }}
          onClick={handleTap}
          data-ocid="notification.toast"
        >
          <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden bg-[oklch(0.11_0.01_145/0.97)] backdrop-blur-xl border border-white/8">
            {/* Main content */}
            <div className="flex items-start gap-3 px-4 pt-3 pb-2.5">
              {/* Avatar circle */}
              <div
                className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${avatarCfg.bg} ${iconColor} mt-0.5`}
              >
                {senderInitial ? (
                  <span className="text-sm font-bold uppercase">
                    {senderInitial}
                  </span>
                ) : (
                  avatarCfg.icon
                )}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-white truncate leading-tight">
                    {notification.title}
                  </p>
                  <span className="text-[10px] text-white/40 flex-shrink-0">
                    Az önce
                  </span>
                </div>
                <p className="text-[12px] text-white/70 mt-0.5 truncate leading-tight">
                  {notification.body}
                </p>

                {/* Reply button for message type */}
                {notification.type === "message" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTap();
                    }}
                    className="mt-1.5 text-[11px] font-medium text-[oklch(0.72_0.2_145)] hover:text-[oklch(0.82_0.2_145)] transition-colors"
                  >
                    Yanıtla
                  </button>
                )}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={handleClose}
                data-ocid="notification.close_button"
                className="flex-shrink-0 p-1 rounded-md text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                aria-label="Bildirimi kapat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-[2px] bg-white/5">
              <div
                className="h-full bg-[oklch(0.72_0.2_145)] origin-left"
                style={{
                  animation: "notification-progress 5s linear forwards",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
