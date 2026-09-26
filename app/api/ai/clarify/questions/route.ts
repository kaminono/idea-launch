import { generateClarificationQuestions } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
import { validateModelConfig } from "@/lib/ai/server/validate-config";
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
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }

  if (!isClarifyQuestionsRequest(parsed)) {
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }
  if (!parsed.rawIdea.trim()) {
    return errorResponse(
      new AiError("BAD_CONFIGURATION", "缺少产品想法，无法生成澄清问题。")
    );
  }

  try {
    const config = await validateModelConfig(parsed.modelConfig);
    const { result, latencyMs } = await generateClarificationQuestions({
      config,
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
    typeof candidate.modelConfig === "object" &&
    candidate.modelConfig !== null &&
    typeof candidate.rawIdea === "string" &&
    isIdeaUnderstanding(candidate.ideaUnderstanding)
  );
}
