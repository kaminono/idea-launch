import { generateClarificationQuestions } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
import { isIdeaUnderstanding } from "@/lib/ai/schemas";
import type {
  ApiResponse,
  ClarifyQuestionsRequest,
  ClarifyQuestionsResult,
} from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }

  if (!isClarifyQuestionsRequest(parsed)) {
    return errorResponse(new AiError("AI_BAD_REQUEST"));
  }
  if (!parsed.apiKey.trim()) {
    return errorResponse(new AiError("AI_MISSING_KEY"));
  }
  if (!parsed.rawIdea.trim()) {
    return errorResponse(
      new AiError("AI_BAD_REQUEST", "缺少产品想法，无法生成澄清问题。")
    );
  }

  try {
    const { result, latencyMs } = await generateClarificationQuestions({
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      rawIdea: parsed.rawIdea,
      ideaUnderstanding: parsed.ideaUnderstanding,
    });
    const data: ClarifyQuestionsResult = {
      questions: result,
      latencyMs,
    };
    return Response.json(
      { ok: true, data } satisfies ApiResponse<ClarifyQuestionsResult>
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function isClarifyQuestionsRequest(
  value: unknown
): value is ClarifyQuestionsRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.apiKey === "string" &&
    typeof candidate.baseUrl === "string" &&
    typeof candidate.model === "string" &&
    typeof candidate.rawIdea === "string" &&
    isIdeaUnderstanding(candidate.ideaUnderstanding)
  );
}
