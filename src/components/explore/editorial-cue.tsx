import { cn } from "@/lib/utils";

interface EditorialCueProps {
  children: React.ReactNode;
  className?: string;
}

export function EditorialCue({ children, className }: EditorialCueProps) {
  return (
    <p
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.14em] text-primary/55",
        className
      )}
    >
      {children}
    </p>
  );
}
