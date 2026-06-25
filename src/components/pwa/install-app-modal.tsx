"use client";

import { Download, Share, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePwaInstall } from "@/hooks/use-pwa-install";

interface InstallAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const IOS_STEPS = [
  { step: 1, label: "Tap Share", detail: "Use the share button in Safari's toolbar", icon: Share },
  { step: 2, label: 'Tap "Add to Home Screen"', detail: "Scroll down in the share menu if needed", icon: Smartphone },
  { step: 3, label: 'Tap "Add"', detail: "Confirm to install Random Sidequest", icon: Download },
];

export function InstallAppModal({ open, onOpenChange }: InstallAppModalProps) {
  const { isInstalled, showInstallOption, isIosInstall, isAndroidInstall, installing, promptAndroidInstall } =
    usePwaInstall();

  if (isInstalled) return null;
  if (!showInstallOption && !open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DialogHeader>
          <DialogTitle>Install Random Sidequest</DialogTitle>
          <DialogDescription>
            Add to your home screen for fullscreen access, faster launch, and a native app feel.
          </DialogDescription>
        </DialogHeader>

        {isAndroidInstall && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Install directly to your home screen with one tap.
            </p>
            <button
              type="button"
              disabled={installing}
              onClick={async () => {
                const accepted = await promptAndroidInstall();
                if (accepted) onOpenChange(false);
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {installing ? "Installing…" : "Install App"}
            </button>
          </div>
        )}

        {isIosInstall && (
          <ol className="space-y-3">
            {IOS_STEPS.map(({ step, label, detail, icon: Icon }) => (
              <li
                key={step}
                className="flex gap-3 rounded-xl border border-border/50 bg-card/40 p-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {step}. {label}
                  </p>
                  <p className="text-xs text-muted">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
