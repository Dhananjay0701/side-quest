"use client";

import type { CardTextDisplay } from "@/lib/cms/card-text-display";

interface CardTextDisplayEditorProps {
  label: string;
  value: CardTextDisplay;
  disabled?: boolean;
  onChange: (value: CardTextDisplay) => void;
}

export function CardTextDisplayEditor({
  label,
  value,
  disabled,
  onChange,
}: CardTextDisplayEditorProps) {
  function patch(partial: Partial<CardTextDisplay>) {
    onChange({
      showName: value.showName,
      showVibe: value.showVibe,
      descriptionFull: value.descriptionFull,
      descriptionWithoutHover: value.descriptionWithoutHover,
      ...partial,
    });
  }

  return (
    <fieldset className="space-y-2 rounded-lg border border-border/15 bg-background/25 p-3">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted/50">
        {label}
      </legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.showName}
          disabled={disabled}
          onChange={(e) => patch({ showName: e.target.checked })}
        />
        Name
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.showVibe}
          disabled={disabled}
          onChange={(e) => patch({ showVibe: e.target.checked })}
        />
        Vibe tags
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.descriptionFull}
          disabled={disabled}
          onChange={(e) => patch({ descriptionFull: e.target.checked })}
        />
        Description full (off = one line + …)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.descriptionWithoutHover}
          disabled={disabled}
          onChange={(e) => patch({ descriptionWithoutHover: e.target.checked })}
        />
        Description without hover (off = show on hover/tap only)
      </label>
    </fieldset>
  );
}
