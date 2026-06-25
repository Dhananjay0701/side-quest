"use client";

import { Download } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

interface InstallAppMenuItemProps {
  onInstallClick: () => void;
  className?: string;
}

export function InstallAppMenuItem({ onInstallClick, className }: InstallAppMenuItemProps) {
  const { showInstallOption } = usePwaInstall();

  if (!showInstallOption) return null;

  return (
    <button
      type="button"
      onClick={onInstallClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-primary hover:bg-primary/10",
        className
      )}
    >
      <Download className="h-4 w-4" />
      Install App
    </button>
  );
}
