export type PwaPlatform = "ios" | "android" | "desktop" | "unknown";

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

export function detectPwaPlatform(): PwaPlatform {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function canShowIosInstallInstructions(platform: PwaPlatform): boolean {
  return platform === "ios" && !isStandalonePwa();
}

export function canShowAndroidInstall(platform: PwaPlatform, hasDeferredPrompt: boolean): boolean {
  return platform === "android" && hasDeferredPrompt && !isStandalonePwa();
}
