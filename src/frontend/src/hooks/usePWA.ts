import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("anonychat_pwa_dismissed") === "true",
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      if (!localStorage.getItem("anonychat_pwa_dismissed")) {
        setCanInstall(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    const { outcome } = await promptRef.current.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
    }
    promptRef.current = null;
  };

  const dismiss = () => {
    localStorage.setItem("anonychat_pwa_dismissed", "true");
    setDismissed(true);
    setCanInstall(false);
  };

  return { canInstall: canInstall && !dismissed, install, dismiss };
}
