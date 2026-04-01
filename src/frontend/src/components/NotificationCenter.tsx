import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Check, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { NotificationItem } from "../hooks/useNotifications";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  const d = Math.floor(h / 24);
  return `${d}g önce`;
}

function groupByDay(notifications: NotificationItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: NotificationItem[] }[] = [
    { label: "Bugün", items: [] },
    { label: "Dün", items: [] },
    { label: "Daha Önce", items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.timestamp);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      groups[0].items.push(n);
    } else if (d.getTime() === yesterday.getTime()) {
      groups[1].items.push(n);
    } else {
      groups[2].items.push(n);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

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

export function NotificationCenter({
  open,
  onClose,
  notifications,
  unreadNotifCount,
  markAllRead,
  removeNotification,
  soundEnabled,
  setSoundEnabled,
  pushPermission,
  requestPushPermission,
  onOpenChat,
}: {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadNotifCount: number;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  pushPermission: NotificationPermission | null;
  requestPushPermission: () => Promise<void>;
  onOpenChat: (contactId: string) => void;
}) {
  const groups = groupByDay(notifications);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col border-l border-white/10"
        style={{ background: "oklch(0.10 0 0)" }}
        data-ocid="notifications.sheet"
      >
        <SheetHeader className="px-4 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Bildirimler
              {unreadNotifCount > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "oklch(0.6 0.25 25)",
                    color: "white",
                  }}
                >
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              )}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {unreadNotifCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={markAllRead}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                  data-ocid="notifications.confirm_button"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Tümü Okundu
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Notification list */}
        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-64 gap-3"
              data-ocid="notifications.empty_state"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0.72 0.2 145 / 0.1)" }}
              >
                <Bell
                  className="w-8 h-8"
                  style={{ color: "oklch(0.72 0.2 145)" }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Henüz bildirim yok
              </p>
            </div>
          ) : (
            <div className="p-2">
              <AnimatePresence>
                {groups.map((group) => (
                  <div key={group.label} className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                      {group.label}
                    </p>
                    {group.items.map((n) => (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 80 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                        data-ocid={`notifications.item.${n.id}`}
                        onClick={() => {
                          if (n.contactId) {
                            onOpenChat(n.contactId);
                            onClose();
                          }
                        }}
                      >
                        {/* Unread dot */}
                        <div className="relative mt-0.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                            style={{ background: "oklch(0.18 0.01 260)" }}
                          >
                            {getTypeIcon(n.type)}
                          </div>
                          {!n.read && (
                            <span
                              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                              style={{
                                background: "oklch(0.6 0.25 25)",
                                borderColor: "oklch(0.10 0 0)",
                              }}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-1">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {n.title}
                            </p>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {relativeTime(n.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {n.body}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(n.id);
                          }}
                          data-ocid="notifications.delete_button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Settings footer */}
        <div className="border-t border-white/10 p-4 space-y-3 flex-shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bildirim Ayarları
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Bell className="w-4 h-4 text-primary" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground">Bildirim Sesi</span>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              data-ocid="notifications.switch"
            />
          </div>

          <Separator className="bg-white/5" />

          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">Tarayıcı Bildirimleri</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pushPermission === "granted"
                  ? "✅ Aktif"
                  : pushPermission === "denied"
                    ? "❌ Engellendi — tarayıcı ayarlarından açın"
                    : "Kapalı"}
              </p>
            </div>
            {pushPermission !== "granted" && pushPermission !== "denied" && (
              <Button
                size="sm"
                onClick={requestPushPermission}
                className="ml-2 text-xs h-7 px-2"
                style={{
                  background: "oklch(0.72 0.2 145)",
                  color: "black",
                }}
                data-ocid="notifications.primary_button"
              >
                Aç
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
