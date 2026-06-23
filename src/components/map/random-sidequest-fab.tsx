"use client";

import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";

interface RandomSidequestFabProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function RandomSidequestFab({ onClick, disabled, className }: RandomSidequestFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-secondary/40 bg-gradient-to-r from-secondary/90 to-amber-500/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-secondary/20 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-50 md:gap-2 md:px-4 md:py-3 md:text-sm",
        className
      )}
    >
      <Dices className="h-2 w-2 md:h-4 md:w-4" />
      Random SideQuest
    </button>
  );
}
