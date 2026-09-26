import { scopeMvp } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
import {
  isClarificationAnswer,
  isClarificationQuestion,
  isClarifiedContext,
  isIdeaUnderstanding,
  isProductAnalysisResult,
} from "@/lib/ai/schemas";
import type {
  ApiResponse,
  MvpScopingRequest,
  MvpScopingResultResponse,
} from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }

  if (!isMvpScopingRouteRequest(parsed)) {
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }
  if (!parsed.apiKey.trim()) {
    return errorResponse(new AiError("AI_MISSING_KEY"));
  }
  if (!parsed.rawIdea.trim()) {
    return errorResponse(
      new AiError("AI_BAD_REQUEST", "缺少产品想法，无法收敛 MVP 范围。")
    );
  }
  if (parsed.clarification.clarifiedContext === null) {
    return errorResponse(
      new AiError(
        "AI_BAD_REQUEST",
        "缺少已确认的 Clarified Context，无法收敛 MVP 范围。"
      )
    );
  }

  try {
    const { result, latencyMs } = await scopeMvp({
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      rawIdea: parsed.rawIdea,
      ideaUnderstanding: parsed.ideaUnderstanding,
      clarification: parsed.clarification,
      productAnalysis: parsed.productAnalysis,
    });
    const data: MvpScopingResultResponse = {
      mvpScoping: result,
      latencyMs,
    };
    return Response.json(
      { ok: true, data } satisfies ApiResponse<MvpScopingResultResponse>
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function isMvpScopingRouteRequest(
  value: unknown
): value is MvpScopingRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.apiKey === "string" &&
    typeof candidate.baseUrl === "string" &&
    typeof candidate.model === "string" &&
    typeof candidate.rawIdea === "string" &&
    isIdeaUnderstanding(candidate.ideaUnderstanding) &&
    isClarificationStatePayload(candidate.clarification) &&
    isProductAnalysisResult(candidate.productAnalysis)
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
