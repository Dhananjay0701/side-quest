"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getRecentSearches, addRecentSearch } from "@/lib/search/recent-searches";

interface SearchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  sessionToken: string;
  refreshSession: () => void;
  recentSearches: string[];
  recordSearch: (query: string) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

function newSessionToken(): string {
  return crypto.randomUUID();
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState(newSessionToken);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, [open]);

  const refreshSession = useCallback(() => {
    setSessionToken(newSessionToken());
  }, []);

  const recordSearch = useCallback((query: string) => {
    addRecentSearch(query);
    setRecentSearches(getRecentSearches());
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      sessionToken,
      refreshSession,
      recentSearches,
      recordSearch,
    }),
    [open, sessionToken, refreshSession, recentSearches, recordSearch]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearchContext must be used within SearchProvider");
  return ctx;
}
