import { synthesizeClarification } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
import { validateModelConfig } from "@/lib/ai/server/validate-config";
import {
  isClarificationAnswer,
  isClarificationQuestion,
  isIdeaUnderstanding,
} from "@/lib/ai/schemas";
import type {
  ApiResponse,
  ClarifySynthesisRequest,
  ClarifySynthesisResult,
} from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }

  if (!isClarifySynthesisRequest(parsed)) {
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }
  if (!parsed.rawIdea.trim()) {
    return errorResponse(
      new AiError("BAD_CONFIGURATION", "缺少产品想法，无法整理产品上下文。")
    );
  }
  if (
    parsed.questions.some(
      (question) =>
        !parsed.answers.some(
          (answer) =>
            answer.questionId === question.id && hasAnswerContent(answer)
        )
    )
  ) {
    return errorResponse(
      new AiError("BAD_CONFIGURATION", "还有问题没有回答，请补充后再提交。")
    );
  }

  try {
    const config = await validateModelConfig(parsed.modelConfig);
    const { result, latencyMs } = await synthesizeClarification({
      config,
      rawIdea: parsed.rawIdea,
      ideaUnderstanding: parsed.ideaUnderstanding,
      questions: parsed.questions,
      answers: parsed.answers,
    });
    const data: ClarifySynthesisResult = {
      clarifiedContext: result,
      latencyMs,
    };
    return Response.json(
      { ok: true, data } satisfies ApiResponse<ClarifySynthesisResult>
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function hasAnswerContent(answer: {
  selectedValues: string[];
  customText: string;
}): boolean {
  return (
    answer.selectedValues.some((value) => value.trim().length > 0) ||
    answer.customText.trim().length > 0
  );
}

function isClarifySynthesisRequest(
  value: unknown
): value is ClarifySynthesisRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.modelConfig === "object" &&
    candidate.modelConfig !== null &&
    typeof candidate.rawIdea === "string" &&
    isIdeaUnderstanding(candidate.ideaUnderstanding) &&
    Array.isArray(candidate.questions) &&
    candidate.questions.every(isClarificationQuestion) &&
    Array.isArray(candidate.answers) &&
    candidate.answers.every(isClarificationAnswer)
  );
}
