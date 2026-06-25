/** Single compile-time-friendly flag — one boolean check on hot paths. */
export const PROFILING_ENABLED = process.env.DEBUG_PROFILING === "true";

export function isProfilingEnabled(): boolean {
  return PROFILING_ENABLED;
}
