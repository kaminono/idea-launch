// Route Handlers 共用的错误响应工具。

import { AiError } from "./errors";
import type { AiErrorCode, ApiResponse } from "@/lib/types";

export function errorResponse(error: unknown): Response {
  const aiError =
    error instanceof AiError ? error : new AiError("AI_PROVIDER_ERROR");
  const body: ApiResponse<never> = {
    ok: false,
    error: aiError.toRunError(),
  };
  return Response.json(body, { status: errorStatus(aiError.code) });
}

function errorStatus(code: AiErrorCode): number {
  switch (code) {
    case "AI_MISSING_KEY":
    case "AI_BAD_REQUEST":
      return 400;
    case "AI_AUTH_ERROR":
      return 401;
    case "AI_TIMEOUT":
      return 504;
    default:
      return 502;
  }
}
