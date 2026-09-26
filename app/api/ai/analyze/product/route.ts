import { analyzeProduct } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
import {
  isClarificationAnswer,
  isClarificationQuestion,
  isClarifiedContext,
  isIdeaUnderstanding,
} from "@/lib/ai/schemas";
import type {
  ApiResponse,
  ProductAnalysisRequest,
  ProductAnalysisResultResponse,
} from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }

  if (!isProductAnalysisRouteRequest(parsed)) {
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }
  if (!parsed.apiKey.trim()) {
    return errorResponse(new AiError("AI_MISSING_KEY"));
  }
  if (!parsed.rawIdea.trim()) {
    return errorResponse(
      new AiError("AI_BAD_REQUEST", "缺少产品想法，无法进行产品分析。")
    );
  }
  if (parsed.clarification.clarifiedContext === null) {
    return errorResponse(
      new AiError(
        "AI_BAD_REQUEST",
        "缺少已确认的 Clarified Context，无法进行产品分析。"
      )
    );
  }

  try {
    const { result, latencyMs } = await analyzeProduct({
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      rawIdea: parsed.rawIdea,
      ideaUnderstanding: parsed.ideaUnderstanding,
      clarification: parsed.clarification,
    });
    const data: ProductAnalysisResultResponse = {
      productAnalysis: result,
      latencyMs,
    };
    return Response.json(
      { ok: true, data } satisfies ApiResponse<ProductAnalysisResultResponse>
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function isProductAnalysisRouteRequest(
  value: unknown
): value is ProductAnalysisRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.apiKey === "string" &&
    typeof candidate.baseUrl === "string" &&
    typeof candidate.model === "string" &&
    typeof candidate.rawIdea === "string" &&
    isIdeaUnderstanding(candidate.ideaUnderstanding) &&
    isClarificationStatePayload(candidate.clarification)
  );
}

/** 校验请求中的 ClarificationState（必须含 questions/answers/clarifiedContext） */
function isClarificationStatePayload(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.needed === "boolean" &&
    typeof candidate.reason === "string" &&
    Array.isArray(candidate.questions) &&
    candidate.questions.every(isClarificationQuestion) &&
    Array.isArray(candidate.answers) &&
    candidate.answers.every(isClarificationAnswer) &&
    (candidate.clarifiedContext === null ||
      isClarifiedContext(candidate.clarifiedContext)) &&
    (candidate.completedAt === null ||
      typeof candidate.completedAt === "string")
  );
}
