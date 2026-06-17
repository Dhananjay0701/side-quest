import { cn } from "@/lib/utils";

interface TagPillProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TagPill({ label, selected, onClick, className }: TagPillProps) {
  const Comp = onClick ? "button" : "span";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        selected
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border bg-card/80 text-muted hover:border-primary/30 hover:text-foreground",
        onClick && "cursor-pointer",
        className
      )}
    >
      {label}
    </Comp>
  );
}
