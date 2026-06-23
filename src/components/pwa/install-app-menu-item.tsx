"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { InstallAppModal } from "@/components/pwa/install-app-modal";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

interface InstallAppMenuItemProps {
  onSelect?: () => void;
  className?: string;
}

export function InstallAppMenuItem({ onSelect, className }: InstallAppMenuItemProps) {
  const { showInstallOption } = usePwaInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (!showInstallOption) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setModalOpen(true);
          onSelect?.();
        }}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-primary hover:bg-primary/10",
          className
        )}
      >
        <Download className="h-4 w-4" />
        Install App
      </button>
      <InstallAppModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
