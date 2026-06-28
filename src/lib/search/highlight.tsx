import type { ReactNode } from "react";

export function highlightMatch(text: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index < 0) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + trimmed.length);
  const after = text.slice(index + trimmed.length);

  return (
    <>
      {before}
      <mark className="rounded bg-primary/25 px-0.5 text-foreground">{match}</mark>
      {after}
    </>
  );
}
