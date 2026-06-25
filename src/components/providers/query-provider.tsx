"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the app with a browser-singleton QueryClient.
 * Ready for future persist-client hydration without API changes.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => getQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
