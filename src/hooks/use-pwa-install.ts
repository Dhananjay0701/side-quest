"use client";

import { useCallback, useEffect, useState } from "react";
import {
  canShowAndroidInstall,
  canShowIosInstallInstructions,
  detectPwaPlatform,
  isStandalonePwa,
  type PwaPlatform,
} from "@/lib/pwa/platform";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaPlatform>("unknown");
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandalonePwa());
    setPlatform(detectPwaPlatform());
    setHasDeferredPrompt(Boolean(deferredInstallPrompt));

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt = e as BeforeInstallPromptEvent;
      setHasDeferredPrompt(true);
    };

    const onAppInstalled = () => {
      deferredInstallPrompt = null;
      setHasDeferredPrompt(false);
      setIsInstalled(true);
    };

    const onDisplayModeChange = () => {
      setIsInstalled(isStandalonePwa());
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", onDisplayModeChange);
    };
  }, []);

  const showInstallOption =
    !isInstalled &&
    (canShowAndroidInstall(platform, hasDeferredPrompt) ||
      canShowIosInstallInstructions(platform));

  const promptAndroidInstall = useCallback(async () => {
    if (!deferredInstallPrompt) return false;
    setInstalling(true);
    try {
      await deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      setHasDeferredPrompt(false);
      if (outcome === "accepted") setIsInstalled(true);
      return outcome === "accepted";
    } finally {
      setInstalling(false);
    }
  }, []);

  return {
    isInstalled,
    platform,
    showInstallOption,
    hasDeferredPrompt,
    installing,
    promptAndroidInstall,
    isIosInstall: canShowIosInstallInstructions(platform),
    isAndroidInstall: canShowAndroidInstall(platform, hasDeferredPrompt),
  };
}
