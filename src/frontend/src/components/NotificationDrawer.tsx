import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeftRight,
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  Coins,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import type {
  AppNotification,
  NotificationType,
} from "../hooks/useNotifications";

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  if (hours < 24) return `${hours} sa önce`;
  return `${days} gün önce`;
}

function getDayGroup(timestamp: number): "today" | "yesterday" | "older" {
  const now = new Date();

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterdayStart = todayStart - 86400000;
  if (timestamp >= todayStart) return "today";
  if (timestamp >= yesterdayStart) return "yesterday";
  return "older";
}

const DAY_LABEL: Record<string, string> = {
  today: "Bugün",
  yesterday: "Dün",
  older: "Daha Önce",
};

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; iconColor: string; avatarBg: string }
> = {
  message: {
    icon: <MessageSquare className="w-4 h-4" />,
    iconColor: "text-[oklch(0.72_0.2_145)]",
    avatarBg: "bg-[oklch(0.35_0.12_145)]",
  },
  p2p: {
    icon: <ArrowLeftRight className="w-4 h-4" />,
    iconColor: "text-[oklch(0.72_0.15_250)]",
    avatarBg: "bg-[oklch(0.3_0.1_250)]",
  },
  earn: {
    icon: <Coins className="w-4 h-4" />,
    iconColor: "text-[oklch(0.75_0.2_60)]",
    avatarBg: "bg-[oklch(0.35_0.1_60)]",
  },
};

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onClearAll: () => void;
  onMarkRead: (id: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function NotificationDrawer({
  open,
  onClose,
  notifications,
  onClearAll,
  onMarkRead,
  soundEnabled,
  onToggleSound,
}: NotificationDrawerProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group notifications by day
  const groups: Record<string, AppNotification[]> = {};
  for (const n of notifications) {
    const group = getDayGroup(n.timestamp);
    if (!groups[group]) groups[group] = [];
    groups[group].push(n);
  }
  const groupOrder = ["today", "yesterday", "older"] as const;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-sm bg-[oklch(0.09_0_0)] border-white/10 p-0 flex flex-col"
        data-ocid="notification.sheet"
      >
        <SheetHeader className="px-4 pt-5 pb-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2 text-foreground">
                <BellRing className="w-4 h-4 text-[oklch(0.72_0.2_145)]" />
                Bildirimler
              </SheetTitle>
              {unreadCount > 0 ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unreadCount} okunmamış bildirim
                </p>
              ) : (
                <p className="text-xs text-[oklch(0.72_0.2_145)] mt-0.5 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tümü okundu
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Sound toggle */}
              <button
                type="button"
                onClick={onToggleSound}
                data-ocid="notification.toggle"
                aria-label={soundEnabled ? "Sesi kapat" : "Sesi aç"}
                title={soundEnabled ? "Sesi kapat" : "Sesi aç"}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                {soundEnabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  data-ocid="notification.delete_button"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Temizle
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20 text-center px-6"
              data-ocid="notification.empty_state"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Bell className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Henüz bildirim yok
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1 max-w-[180px]">
                Yeni mesaj veya işlem olduğunda burada görünür
              </p>
            </div>
          ) : (
            <div className="py-1">
              {groupOrder.map((group) => {
                const items = groups[group];
                if (!items || items.length === 0) return null;
                return (
                  <div key={group}>
                    {/* Day separator */}
                    <div className="px-4 py-2 flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                        {DAY_LABEL[group]}
                      </span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                    <ul>
                      {items.map((n, i) => {
                        const config = TYPE_CONFIG[n.type];
                        const senderInitial =
                          n.type === "message" && n.title ? n.title[0] : null;
                        return (
                          <li
                            key={n.id}
                            data-ocid={`notification.item.${i + 1}`}
                          >
                            <button
                              type="button"
                              className={`w-full flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors hover:bg-white/5 text-left ${
                                n.read ? "opacity-60" : ""
                              }`}
                              onClick={() => onMarkRead(n.id)}
                            >
                              {/* Avatar */}
                              <div
                                className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${config.avatarBg} ${config.iconColor}`}
                              >
                                {senderInitial ? (
                                  <span className="text-sm font-bold uppercase">
                                    {senderInitial}
                                  </span>
                                ) : (
                                  config.icon
                                )}
                              </div>

                              {/* Text */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm truncate ${
                                    n.read
                                      ? "font-normal text-muted-foreground"
                                      : "font-semibold text-foreground"
                                  }`}
                                >
                                  {n.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {n.body}
                                </p>
                                <p className="text-[10px] text-muted-foreground/40 mt-1">
                                  {relativeTime(n.timestamp)}
                                </p>
                              </div>

                              {/* Right side: unread dot or read check */}
                              <div className="flex-shrink-0 mt-1.5">
                                {!n.read ? (
                                  <motion.span
                                    animate={{ opacity: [1, 0.4, 1] }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Number.POSITIVE_INFINITY,
                                    }}
                                    className="block w-2.5 h-2.5 rounded-full bg-blue-500"
                                  />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5 text-muted-foreground/30" />
                                )}
                              </div>

                              {/* Delete button */}
                              <X className="w-3.5 h-3.5 text-muted-foreground/20 hover:text-muted-foreground flex-shrink-0 mt-1.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
