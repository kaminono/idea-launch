import { analyzeProduct } from "@/lib/ai/client";
import { AiError } from "@/lib/ai/errors";
import { errorResponse } from "@/lib/ai/http";
import { isClarificationStatePayload } from "@/lib/ai/server/guards";
import { validateModelConfig } from "@/lib/ai/server/validate-config";
import { isIdeaUnderstanding } from "@/lib/ai/schemas";
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
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }

  if (!isProductAnalysisRouteRequest(parsed)) {
    return errorResponse(new AiError("BAD_CONFIGURATION"));
  }
  if (!parsed.rawIdea.trim()) {
    return errorResponse(
      new AiError("BAD_CONFIGURATION", "缺少产品想法，无法进行产品分析。")
    );
  }
  if (parsed.clarification.clarifiedContext === null) {
    return errorResponse(
      new AiError(
        "BAD_CONFIGURATION",
        "缺少已确认的 Clarified Context，无法进行产品分析。"
      )
    );
  }

  try {
    const config = await validateModelConfig(parsed.modelConfig);
    const { result, latencyMs } = await analyzeProduct({
      config,
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
    typeof candidate.modelConfig === "object" &&
    candidate.modelConfig !== null &&
    typeof candidate.rawIdea === "string" &&
    isIdeaUnderstanding(candidate.ideaUnderstanding) &&
    isClarificationStatePayload(candidate.clarification)
  );
}
