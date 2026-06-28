"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveToCollectionToastProps {
  collectionName: string;
  className?: string;
}

/** Minimal inline confirmation — does not block the UI. */
export function SaveToCollectionToast({ collectionName, className }: SaveToCollectionToastProps) {
  return (
    <p
      data-save-feedback
      className={cn(
        "flex items-center justify-center gap-1.5 text-xs font-medium text-primary/90",
        className
      )}
    >
      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">Saved to {collectionName}</span>
    </p>
  );
}
