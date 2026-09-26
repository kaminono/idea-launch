// 浏览器端调用本项目 Route Handler 的统一入口。
// 组件不直接 fetch，也不直接请求第三方模型服务。

import type {
  ClarificationAnswer,
  ClarificationQuestions,
  ClarificationState,
  ClarificationQuestion,
  ClarifiedContext,
  IdeaUnderstanding,
  MvpScopingResult,
  ProductAnalysisResult,
  RunError,
  Settings,
  TestConnectionResult,
  UnderstandResult,
} from "@/lib/types";

async function postJson<T>(
  url: string,
  body: unknown
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ClientAiError({
      code: "AI_NETWORK_ERROR",
      message: "无法连接本地服务，请确认开发服务器正在运行后重试。",
    });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // 响应非 JSON（如 500 HTML 页）
  }

  if (isApiFailure(payload)) {
    throw new ClientAiError(payload.error);
  }
  if (response.ok && isApiSuccess<T>(payload)) {
    return payload.data;
  }
  throw new ClientAiError({
    code: "AI_PROVIDER_ERROR",
    message: "服务暂时不可用，请稍后重试。",
  });
}

export function testConnection(
  settings: Settings
): Promise<TestConnectionResult> {
  return postJson<TestConnectionResult>("/api/ai/test", settings);
}

export function understandIdea(args: {
  settings: Settings;
  rawIdea: string;
}): Promise<UnderstandResult> {
  return postJson<UnderstandResult>("/api/ai/understand", {
    apiKey: args.settings.apiKey,
    baseUrl: args.settings.baseUrl,
    model: args.settings.model,
    rawIdea: args.rawIdea,
  });
}

export function generateClarificationQuestions(args: {
  settings: Settings;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
}): Promise<{ questions: ClarificationQuestions; latencyMs: number }> {
  return postJson<{ questions: ClarificationQuestions; latencyMs: number }>(
    "/api/ai/clarify/questions",
    {
      apiKey: args.settings.apiKey,
      baseUrl: args.settings.baseUrl,
      model: args.settings.model,
      rawIdea: args.rawIdea,
      ideaUnderstanding: args.ideaUnderstanding,
    }
  );
}

export function synthesizeClarification(args: {
  settings: Settings;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
}): Promise<{ clarifiedContext: ClarifiedContext; latencyMs: number }> {
  return postJson<{ clarifiedContext: ClarifiedContext; latencyMs: number }>(
    "/api/ai/clarify/synthesize",
    {
      apiKey: args.settings.apiKey,
      baseUrl: args.settings.baseUrl,
      model: args.settings.model,
      rawIdea: args.rawIdea,
      ideaUnderstanding: args.ideaUnderstanding,
      questions: args.questions,
      answers: args.answers,
    }
  );
}

export function analyzeProduct(args: {
  settings: Settings;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
}): Promise<{ productAnalysis: ProductAnalysisResult; latencyMs: number }> {
  return postJson<{
    productAnalysis: ProductAnalysisResult;
    latencyMs: number;
  }>("/api/ai/analyze/product", {
    apiKey: args.settings.apiKey,
    baseUrl: args.settings.baseUrl,
    model: args.settings.model,
    rawIdea: args.rawIdea,
    ideaUnderstanding: args.ideaUnderstanding,
    clarification: args.clarification,
  });
}

export function scopeMvp(args: {
  settings: Settings;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
  productAnalysis: ProductAnalysisResult;
}): Promise<{ mvpScoping: MvpScopingResult; latencyMs: number }> {
  return postJson<{
    mvpScoping: MvpScopingResult;
    latencyMs: number;
  }>("/api/ai/scope/mvp", {
    apiKey: args.settings.apiKey,
    baseUrl: args.settings.baseUrl,
    model: args.settings.model,
    rawIdea: args.rawIdea,
    ideaUnderstanding: args.ideaUnderstanding,
    clarification: args.clarification,
    productAnalysis: args.productAnalysis,
  });
}

export class ClientAiError extends Error {
  readonly code: RunError["code"];

  constructor(error: RunError) {
    super(error.message);
    this.name = "ClientAiError";
    this.code = error.code;
  }

  toRunError(): RunError {
    return { code: this.code, message: this.message };
  }
}

interface ApiFailureShape {
  ok: false;
  error: RunError;
}

function isApiFailure(value: unknown): value is ApiFailureShape {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { ok?: unknown; error?: unknown };
  return (
    candidate.ok === false &&
    typeof candidate.error === "object" &&
    candidate.error !== null &&
    typeof (candidate.error as RunError).code === "string" &&
    typeof (candidate.error as RunError).message === "string"
  );
}

function isApiSuccess<T>(
  value: unknown
): value is { ok: true; data: T } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === true
  );
}
