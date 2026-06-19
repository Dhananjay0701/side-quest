import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) }, { status });
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export type ApiJson<T = unknown> = {
  data?: T;
  error?: { code?: string; message?: string };
};

export async function parseApiJson<T = unknown>(res: Response): Promise<ApiJson<T>> {
  return (await res.json()) as ApiJson<T>;
}
