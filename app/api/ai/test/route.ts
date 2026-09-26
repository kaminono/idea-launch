import { testConnection } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
import { validateModelConfig } from "@/lib/ai/server/validate-config";
import type {
  ApiResponse,
  TestConnectionRequest,
  TestConnectionResult,
} from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }

  if (!isTestRequest(parsed)) {
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }

  try {
    const config = await validateModelConfig(parsed.modelConfig);
    const data = await testConnection(config);
    return Response.json(
      { ok: true, data } satisfies ApiResponse<TestConnectionResult>
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function isTestRequest(value: unknown): value is TestConnectionRequest {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as { modelConfig?: unknown }).modelConfig === "object";
}
