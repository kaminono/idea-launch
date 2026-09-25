import { testConnection } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
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
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }

  if (!isTestRequest(parsed)) {
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }
  if (!parsed.apiKey.trim()) {
    return errorResponse(new AiError("AI_MISSING_KEY"));
  }

  try {
    const latencyMs = await testConnection({
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
    });
    const data: TestConnectionResult = {
      model: parsed.model,
      latencyMs,
    };
    return Response.json(
      { ok: true, data } satisfies ApiResponse<TestConnectionResult>
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function isTestRequest(value: unknown): value is TestConnectionRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.apiKey === "string" &&
    typeof candidate.baseUrl === "string" &&
    typeof candidate.model === "string"
  );
}
