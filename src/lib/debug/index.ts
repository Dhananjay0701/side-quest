export { PROFILING_ENABLED, isProfilingEnabled } from "@/lib/debug/enabled";
export {
  finalizeRequest,
  initRequestFromHeaders,
  profile,
  profileAI,
  profileApi,
  profileApiRoute,
  profileAsync,
  profileAuth,
  profileCache,
  profileComponent,
  profileDb,
  profileExternal,
  profileImage,
  profileLayout,
  profileLoading,
  profilePage,
  profileR2,
  profileRender,
  profileRenderAsync,
  profileSync,
} from "@/lib/debug/profiler";
export type { ProfileOptions } from "@/lib/debug/profiler";
export { logError, logProfileLine, logRequestSummary } from "@/lib/debug/logger";
export {
  generateRequestId,
  getRequestContext,
  runWithRequestContext,
  runWithRequestContextAsync,
} from "@/lib/debug/request-context";
export type { MetricCategory, ProfileSpan, RequestContext } from "@/lib/debug/request-context";
export {
  getGlobalMetrics,
  recordAiMetric,
  recordCacheMetric,
  recordImageResolve,
  recordR2Transfer,
  cacheHitRate,
} from "@/lib/debug/metrics";
export {
  getAllOperationStatistics,
  getOperationStatistics,
  logTopStatistics,
  recordOperationDuration,
} from "@/lib/debug/statistics";
export { getObservabilitySnapshot } from "@/lib/debug/dashboard";
export type { ObservabilitySnapshot } from "@/lib/debug/dashboard";
