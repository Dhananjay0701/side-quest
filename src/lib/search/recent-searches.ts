const STORAGE_KEY = "rsq:recent-searches";
const MAX_RECENT = 10;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed || typeof window === "undefined") return;
  const existing = getRecentSearches().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
