import { understandIdea } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
import { validateModelConfig } from "@/lib/ai/server/validate-config";
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
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }

  if (!isUnderstandRequest(parsed)) {
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }
  if (!parsed.rawIdea.trim()) {
    return errorResponse(
      new AiError("BAD_CONFIGURATION", "请先输入产品想法，再开始分析。")
    );
  }

  try {
    const config = await validateModelConfig(parsed.modelConfig);
    const { result, latencyMs } = await understandIdea({
      config,
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
    typeof candidate.modelConfig === "object" &&
    candidate.modelConfig !== null &&
    typeof candidate.rawIdea === "string"
  );
}
