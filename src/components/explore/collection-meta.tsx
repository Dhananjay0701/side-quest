import { cn } from "@/lib/utils";

interface CollectionMetaProps {
  children: React.ReactNode;
  className?: string;
  light?: boolean;
}

export function CollectionMeta({ children, className, light }: CollectionMetaProps) {
  return (
    <p
      className={cn(
        "text-[10px] tracking-wide",
        light ? "text-white/35" : "text-muted/30",
        className
      )}
    >
      {children}
    </p>
  );
}
