import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "./useActor";
import type { Message } from "./useQueries";

export interface NotificationItem {
  id: string;
  type: "message" | "p2p_trade" | "id_sold" | "anoncash";
  title: string;
  body: string;
  contactId?: string;
  timestamp: number;
  read: boolean;
}

const MAX_NOTIFICATIONS = 50;

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext not available
  }
}

function showBrowserPush(title: string, body: string, contactId?: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: contactId ?? "anonchat",
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

export function useNotifications({
  myAnonId,
  activeTab,
  chatActiveContact,
}: {
  myAnonId: string;
  activeTab: string;
  chatActiveContact: string | null;
}) {
  const { actor, isFetching } = useActor();

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("anonychat_notifications") ?? "[]",
      );
    } catch {
      return [];
    }
  });

  const [bannerQueue, setBannerQueue] = useState<NotificationItem[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState(
    localStorage.getItem("anonychat_notif_sound") !== "false",
  );
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission | null>(
      typeof Notification !== "undefined" ? Notification.permission : null,
    );

  const seenMessageIds = useRef<Set<string>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    localStorage.setItem("anonychat_notif_sound", v ? "true" : "false");
  }, []);

  const muteChat = useCallback((contactId: string, muted: boolean) => {
    localStorage.setItem(
      `anonychat_mute_${contactId}`,
      muted ? "true" : "false",
    );
  }, []);

  const isMuted = useCallback((contactId: string) => {
    return localStorage.getItem(`anonychat_mute_${contactId}`) === "true";
  }, []);

  const addNotification = useCallback(
    (item: Omit<NotificationItem, "id" | "read">) => {
      const newItem: NotificationItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        read: false,
      };

      setNotifications((prev) => {
        const updated = [newItem, ...prev].slice(0, MAX_NOTIFICATIONS);
        localStorage.setItem(
          "anonychat_notifications",
          JSON.stringify(updated),
        );
        return updated;
      });

      // Don't banner if current contact is active and chat tab is open
      const isActiveChat =
        activeTab === "chat" && chatActiveContact === item.contactId;
      if (!isActiveChat) {
        setBannerQueue((prev) => {
          const updated = [newItem, ...prev].slice(0, 3);
          return updated;
        });
      }

      const muted = item.contactId ? isMuted(item.contactId) : false;

      if (!muted) {
        if (soundEnabled) playNotificationSound();
        navigator.vibrate?.([100]);
        if (document.hidden) {
          showBrowserPush(item.title, item.body, item.contactId);
        }
      }
    },
    [activeTab, chatActiveContact, isMuted, soundEnabled],
  );

  const dismissBanner = useCallback((id: string) => {
    setBannerQueue((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem("anonychat_notifications", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      localStorage.setItem("anonychat_notifications", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const requestPushPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPushPermission(result);
  }, []);

  // Poll contacts for new messages
  useEffect(() => {
    if (!actor || isFetching || !myAnonId) return;

    const poll = async () => {
      try {
        const contacts: string[] = JSON.parse(
          localStorage.getItem("anonychat_contacts") ?? "[]",
        );

        await Promise.all(
          contacts.map(async (contactId) => {
            const muted = isMuted(contactId);
            const isActiveChat =
              activeTab === "chat" && chatActiveContact === contactId;

            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const messages: Message[] = await (actor as any).getConversation(
                contactId,
              );

              const lastRead = Number(
                localStorage.getItem(`anonychat_read_${contactId}`) ?? "0",
              );

              const newMessages = messages.filter(
                (m) =>
                  m.receiverId === myAnonId &&
                  Number(m.timestamp / 1_000_000n) > lastRead &&
                  !seenMessageIds.current.has(String(m.id)),
              );

              for (const msg of newMessages) {
                seenMessageIds.current.add(String(msg.id));

                if (!isActiveChat) {
                  addNotification({
                    type: "message",
                    title: contactId,
                    body:
                      msg.content.length > 60
                        ? `${msg.content.slice(0, 60)}…`
                        : msg.content,
                    contactId,
                    timestamp: Number(msg.timestamp / 1_000_000n),
                  });
                } else if (muted) {
                  // mark as seen but don't notify
                  seenMessageIds.current.add(String(msg.id));
                }
              }
            } catch {
              // ignore per-contact errors
            }
          }),
        );
      } catch {
        // ignore
      } finally {
        pollingRef.current = setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [
    actor,
    isFetching,
    myAnonId,
    activeTab,
    chatActiveContact,
    addNotification,
    isMuted,
  ]);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadNotifCount,
    markAllRead,
    muteChat,
    soundEnabled,
    setSoundEnabled,
    requestPushPermission,
    pushPermission,
    bannerQueue,
    dismissBanner,
    addNotification,
    removeNotification,
  };
}
