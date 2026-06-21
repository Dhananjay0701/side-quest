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
        "flex items-center gap-2 rounded-full border border-secondary/40 bg-gradient-to-r from-secondary/90 to-amber-500/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-secondary/20 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] disabled:opacity-50",
        className
      )}
    >
      <Dices className="h-4 w-4" />
      Random SideQuest
    </button>
  );
}
