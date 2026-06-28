import { CollectionMeta } from "@/components/explore/collection-meta";
import type { CardTextDisplay } from "@/lib/cms/card-text-display";
import {
  descriptionSizeClass,
  descriptionVisibilityClass,
  metaVisibilityClass,
} from "@/lib/cms/card-text-display";
import { cn } from "@/lib/utils";

export interface CollectionCardTextProps {
  display: CardTextDisplay;
  name: string;
  vibe?: string;
  description?: string | null;
  meta?: string;
  tags?: string[];
  nameClassName?: string;
  vibeClassName?: string;
  descriptionClassName?: string;
  metaClassName?: string;
  tagClassName?: string;
  metaLight?: boolean;
}

export function CollectionCardText({
  display,
  name,
  vibe,
  description,
  meta,
  tags,
  nameClassName,
  vibeClassName,
  descriptionClassName,
  metaClassName,
  tagClassName,
  metaLight = true,
}: CollectionCardTextProps) {
  const hasDescription = Boolean(description?.trim());
  const hasMeta = Boolean(meta?.trim());
  const hasTags = Boolean(tags && tags.length > 0);
  const descVisibility = descriptionVisibilityClass(display);
  const metaVisibility = metaVisibilityClass(display);

  return (
    <>
      {display.showName ? <h3 className={nameClassName}>{name}</h3> : null}
      {display.showVibe && vibe ? <p className={vibeClassName}>{vibe}</p> : null}
      {display.showVibe && hasTags ? (
        <div className={cn("flex flex-wrap gap-1", tagClassName)}>
          {tags!.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {hasDescription ? (
        <div className={descVisibility}>
          <p className={cn(descriptionClassName, descriptionSizeClass(display))}>
            {description}
          </p>
        </div>
      ) : null}
      {hasMeta ? (
        <div className={metaVisibility}>
          <CollectionMeta light={metaLight} className={metaClassName}>
            {meta}
          </CollectionMeta>
        </div>
      ) : null}
    </>
  );
}
