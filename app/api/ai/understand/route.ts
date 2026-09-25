import { understandIdea } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
import type {
  ApiResponse,
  UnderstandRequest,
  UnderstandResult,
} from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }

  if (!isUnderstandRequest(parsed)) {
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }
  if (!parsed.apiKey.trim()) {
    return errorResponse(new AiError("AI_MISSING_KEY"));
  }
  if (!parsed.rawIdea.trim()) {
    return errorResponse(
      new AiError("AI_BAD_REQUEST", "请先输入产品想法，再开始分析。")
    );
  }

  try {
    const { result, latencyMs } = await understandIdea({
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      rawIdea: parsed.rawIdea,
    });
    const data: UnderstandResult = {
      ideaUnderstanding: result,
      latencyMs,
    };
    return Response.json(
      { ok: true, data } satisfies ApiResponse<UnderstandResult>
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function isUnderstandRequest(value: unknown): value is UnderstandRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.apiKey === "string" &&
    typeof candidate.baseUrl === "string" &&
    typeof candidate.model === "string" &&
    typeof candidate.rawIdea === "string"
  );
}
