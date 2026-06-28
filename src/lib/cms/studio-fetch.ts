"use client";

import { parseApiJson } from "@/lib/api/response";

export async function studioFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin", ...init });
  const json = await parseApiJson<T>(res);
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}
