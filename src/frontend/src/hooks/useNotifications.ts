import { useCallback, useEffect, useRef, useState } from "react";

export type NotificationType = "message" | "p2p" | "earn";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

type Listener = (notification: AppNotification) => void;

function playNotificationSound() {
  try {
    const ctx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      440,
      ctx.currentTime + 0.1,
    );
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // AudioContext not available
  }
}

// Singleton emitter so any component can fire notifications
class NotificationEmitter {
  private listeners: Listener[] = [];
  private soundEnabled: boolean;

  constructor() {
    const stored = localStorage.getItem("anonychat_notif_sound");
    this.soundEnabled = stored === null ? true : stored === "true";
  }

  getSoundEnabled() {
    return this.soundEnabled;
  }

  setSoundEnabled(val: boolean) {
    this.soundEnabled = val;
    localStorage.setItem("anonychat_notif_sound", String(val));
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(type: NotificationType, title: string, body: string) {
    const notification: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      body,
      timestamp: Date.now(),
      read: false,
    };

    // Sound
    if (this.soundEnabled) {
      playNotificationSound();
    }

    // Haptic feedback
    navigator.vibrate?.([100, 50, 100]);

    // Browser Push Notification (when app not focused)
    if (document.hidden && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: type,
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification(title, {
              body,
              icon: "/favicon.ico",
              tag: type,
            });
          }
        });
      }
    }

    for (const listener of this.listeners) {
      listener(notification);
    }
  }
}

export const notificationEmitter = new NotificationEmitter();

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState(() =>
    notificationEmitter.getSoundEnabled(),
  );

  useEffect(() => {
    const unsub = notificationEmitter.subscribe((n) => {
      setNotifications((prev) => [n, ...prev].slice(0, 20));
    });
    return unsub;
  }, []);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (type: NotificationType, title: string, body: string) => {
      notificationEmitter.emit(type, title, body);
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleSound = useCallback(() => {
    const next = !notificationEmitter.getSoundEnabled();
    notificationEmitter.setSoundEnabled(next);
    setSoundEnabledState(next);
  }, []);

  return {
    notifications,
    unreadNotifCount,
    addNotification,
    markAllRead,
    markRead,
    clearAll,
    soundEnabled,
    toggleSound,
  };
}
