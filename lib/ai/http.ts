// Route Handlers 共用的错误响应工具。

import { AiError } from "./errors";
import type { AiErrorCode, ApiResponse } from "@/lib/types";

export function errorResponse(error: unknown): Response {
  const aiError =
    error instanceof AiError ? error : new AiError("PROVIDER_UNAVAILABLE");
  const body: ApiResponse<never> = {
    ok: false,
    error: aiError.toRunError(),
  };
  return Response.json(body, { status: errorStatus(aiError.code) });
}

function errorStatus(code: AiErrorCode): number {
  switch (code) {
    case "BAD_CONFIGURATION":
      return 400;
    case "INVALID_API_KEY":
      return 401;
    case "TIMEOUT":
      return 504;
    default:
      // MODEL_NOT_FOUND / RATE_LIMITED / INVALID_STRUCTURED_OUTPUT /
      // PROVIDER_UNAVAILABLE 统一作为上游失败
      return 502;
  }
}
