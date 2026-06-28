import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { CmsGuardError } from "@/lib/cms/guards";
import { apiError } from "@/lib/api/response";

export function handleStudioRouteError(
  err: unknown,
  fallbackCode: string,
  fallbackMessage: string
) {
  if (err instanceof AuthError) {
    const status = err.status === 403 ? 403 : 401;
    const code = status === 403 ? "FORBIDDEN" : "UNAUTHORIZED";
    return apiError(code, err.message, status);
  }

  if (err instanceof CmsGuardError) {
    const status = err.code === "DRAFT_REQUIRED" || err.code === "REVISION_FORBIDDEN" ? 409 : 404;
    return apiError(err.code, err.message, status);
  }

  if (err instanceof z.ZodError) {
    return apiError(
      "VALIDATION_ERROR",
      err.issues[0]?.message ?? "Invalid request payload",
      400
    );
  }

  if (err instanceof SyntaxError) {
    return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  return apiError(
    fallbackCode,
    err instanceof Error ? err.message : fallbackMessage,
    500
  );
}
