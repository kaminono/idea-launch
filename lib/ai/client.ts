// 服务端 AI Client：通过 Volcengine Ark Agent Plan 的 OpenAI Responses
// 兼容接口（POST {baseUrl}/responses）调用豆包模型。
// 仅在 Route Handler（服务端）中被引用，API Key 不做任何持久化。

import { REQUEST_TIMEOUT_MS } from "./config";
import { AiError, normalizeHttpError } from "./errors";
import {
  CLARIFIED_CONTEXT_JSON_SCHEMA,
  CLARIFICATION_QUESTIONS_JSON_SCHEMA,
  IDEA_UNDERSTANDING_JSON_SCHEMA,
  MVP_SCOPING_JSON_SCHEMA,
  PRODUCT_ANALYSIS_JSON_SCHEMA,
  isClarificationQuestions,
  isClarifiedContext,
  isIdeaUnderstanding,
  isMvpScopingResult,
  isProductAnalysisResult,
} from "./schemas";
import {
  CLARIFICATION_QUESTIONS_SYSTEM_PROMPT,
  CLARIFICATION_SYNTHESIS_SYSTEM_PROMPT,
  IDEA_UNDERSTANDING_SYSTEM_PROMPT,
  MVP_SCOPING_SYSTEM_PROMPT,
  PRODUCT_ANALYSIS_SYSTEM_PROMPT,
  buildClarificationQuestionsPrompt,
  buildClarificationSynthesisPrompt,
  buildIdeaUnderstandingUserPrompt,
  buildMvpScopingPrompt,
  buildProductAnalysisPrompt,
} from "./prompts";
import type {
  ClarificationAnswer,
  ClarificationQuestions,
  ClarificationQuestion,
  ClarificationState,
  ClarifiedContext,
  IdeaUnderstanding,
  MvpScopingResult,
  ProductAnalysisResult,
} from "@/lib/types";

interface CallParams {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ResponsesApiResponse {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  output_text?: string;
}

/** 连接测试：发起一次最小结构化请求，返回耗时（毫秒） */
export async function testConnection(params: CallParams): Promise<number> {
  const start = Date.now();
  await callResponses({
    ...params,
    systemPrompt: "仅做连通性验证。",
    userPrompt: "ping",
    formatName: "connection_test",
    formatDescription: "连通性验证。",
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: { ok: { type: "boolean" } },
      required: ["ok"],
    },
  });
  return Date.now() - start;
}

/** Idea Understanding 节点 */
export async function understandIdea(
  params: CallParams & { rawIdea: string }
): Promise<{ result: IdeaUnderstanding; latencyMs: number }> {
  const start = Date.now();
  const text = await callResponses({
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model,
    systemPrompt: IDEA_UNDERSTANDING_SYSTEM_PROMPT,
    userPrompt: buildIdeaUnderstandingUserPrompt(params.rawIdea),
    formatName: "idea_understanding",
    formatDescription:
      "产品想法首次理解的结构化结果，包含目标用户、问题、场景、约束、假设与信息缺口。",
    jsonSchema: IDEA_UNDERSTANDING_JSON_SCHEMA,
  });
  const result = parseStructuredJson(text);
  return { result, latencyMs: Date.now() - start };
}

/** Clarification Question Generation 节点 */
export async function generateClarificationQuestions(
  params: CallParams & {
    rawIdea: string;
    ideaUnderstanding: IdeaUnderstanding;
  }
): Promise<{ result: ClarificationQuestions; latencyMs: number }> {
  const start = Date.now();
  const text = await callResponses({
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model,
    systemPrompt: CLARIFICATION_QUESTIONS_SYSTEM_PROMPT,
    userPrompt: buildClarificationQuestionsPrompt({
      rawIdea: params.rawIdea,
      ideaUnderstanding: params.ideaUnderstanding,
    }),
    formatName: "clarification_questions",
    formatDescription:
      "信息补全问题生成结果：是否需要澄清、原因与少量高价值澄清问题。",
    jsonSchema: CLARIFICATION_QUESTIONS_JSON_SCHEMA,
  });
  const parsed = parseJson(text);
  if (!isClarificationQuestions(parsed)) {
    throw new AiError("AI_INVALID_RESPONSE");
  }
  const result: ClarificationQuestions = {
    clarificationNeeded: parsed.clarificationNeeded,
    reason: parsed.reason.trim(),
    questions: parsed.questions
      // 模型声明需要澄清却给出空问题，属于不合法输出
      .filter((q) => q.question.trim() && q.whyItMatters.trim())
      .slice(0, 5)
      .map((q) => ({
        ...q,
        question: q.question.trim(),
        whyItMatters: q.whyItMatters.trim(),
        options: q.options
          .filter((o) => o.value.trim() && o.label.trim())
          .map((o) => ({ value: o.value.trim(), label: o.label.trim() })),
      })),
  };
  if (result.clarificationNeeded && result.questions.length === 0) {
    throw new AiError("AI_INVALID_RESPONSE");
  }
  return { result, latencyMs: Date.now() - start };
}

/** Clarification Synthesis 节点 */
export async function synthesizeClarification(
  params: CallParams & {
    rawIdea: string;
    ideaUnderstanding: IdeaUnderstanding;
    questions: ClarificationQuestion[];
    answers: ClarificationAnswer[];
  }
): Promise<{ result: ClarifiedContext; latencyMs: number }> {
  const start = Date.now();
  const text = await callResponses({
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model,
    systemPrompt: CLARIFICATION_SYNTHESIS_SYSTEM_PROMPT,
    userPrompt: buildClarificationSynthesisPrompt({
      rawIdea: params.rawIdea,
      ideaUnderstanding: params.ideaUnderstanding,
      questions: params.questions,
      answers: params.answers,
    }),
    formatName: "clarified_context",
    formatDescription:
      "信息补全整理结果：稳定的产品上下文，严格区分事实、决策、假设与未知。",
    jsonSchema: CLARIFIED_CONTEXT_JSON_SCHEMA,
  });
  const parsed = parseJson(text);
  if (!isClarifiedContext(parsed)) {
    throw new AiError("AI_INVALID_RESPONSE");
  }
  const result: ClarifiedContext = {
    ...parsed,
    productName: parsed.productName.trim(),
    oneLineDefinition: parsed.oneLineDefinition.trim(),
    targetUsers: cleanArray(parsed.targetUsers),
    primaryScenario: parsed.primaryScenario.trim(),
    coreProblem: parsed.coreProblem.trim(),
    userGoal: parsed.userGoal.trim(),
    currentAlternatives: cleanArray(parsed.currentAlternatives),
    explicitConstraints: cleanArray(parsed.explicitConstraints),
    confirmedDecisions: cleanArray(parsed.confirmedDecisions),
    remainingAssumptions: cleanArray(parsed.remainingAssumptions),
    remainingUnknowns: cleanArray(parsed.remainingUnknowns),
  };
  return { result, latencyMs: Date.now() - start };
}

/** Product Analysis 节点 */
export async function analyzeProduct(
  params: CallParams & {
    rawIdea: string;
    ideaUnderstanding: IdeaUnderstanding;
    clarification: ClarificationState;
  }
): Promise<{ result: ProductAnalysisResult; latencyMs: number }> {
  const start = Date.now();
  const text = await callResponses({
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model,
    systemPrompt: PRODUCT_ANALYSIS_SYSTEM_PROMPT,
    userPrompt: buildProductAnalysisPrompt({
      rawIdea: params.rawIdea,
      ideaUnderstanding: params.ideaUnderstanding,
      clarification: params.clarification,
    }),
    formatName: "product_analysis",
    formatDescription:
      "产品分析结构化结果：产品定义、核心用户与场景、问题分析、替代方式、价值主张、关键假设、风险与 MVP 收敛关注点。",
    jsonSchema: PRODUCT_ANALYSIS_JSON_SCHEMA,
  });
  const parsed = parseJson(text);
  if (!isProductAnalysisResult(parsed)) {
    throw new AiError("AI_INVALID_RESPONSE");
  }
  const result: ProductAnalysisResult = {
    ...parsed,
    productDefinition: {
      ...parsed.productDefinition,
      name: parsed.productDefinition.name.trim(),
      oneLineDefinition: parsed.productDefinition.oneLineDefinition.trim(),
      category: parsed.productDefinition.category.trim(),
      stage: parsed.productDefinition.stage.trim(),
    },
    primaryUser: {
      description: parsed.primaryUser.description.trim(),
      context: parsed.primaryUser.context.trim(),
      primaryGoal: parsed.primaryUser.primaryGoal.trim(),
    },
    coreScenario: {
      trigger: parsed.coreScenario.trigger.trim(),
      scenario: parsed.coreScenario.scenario.trim(),
      desiredOutcome: parsed.coreScenario.desiredOutcome.trim(),
    },
    problemAnalysis: {
      coreProblem: parsed.problemAnalysis.coreProblem.trim(),
      rootCauses: cleanArray(parsed.problemAnalysis.rootCauses),
      currentPainPoints: cleanArray(parsed.problemAnalysis.currentPainPoints),
    },
    currentAlternatives: parsed.currentAlternatives.map((item) => ({
      alternative: item.alternative.trim(),
      whyUsersUseIt: item.whyUsersUseIt.trim(),
      limitations: cleanArray(item.limitations),
    })),
    valueProposition: {
      coreValue: parsed.valueProposition.coreValue.trim(),
      userChange: parsed.valueProposition.userChange.trim(),
      differentiationDirection:
        parsed.valueProposition.differentiationDirection.trim(),
    },
    keyHypotheses: parsed.keyHypotheses.map((item) => ({
      hypothesis: item.hypothesis.trim(),
      importance: item.importance,
      validationNeeded: item.validationNeeded,
      validationIdea: item.validationIdea.trim(),
    })),
    risks: parsed.risks.map((item) => ({
      risk: item.risk.trim(),
      type: item.type,
      severity: item.severity,
      reason: item.reason.trim(),
    })),
    analysisSummary: {
      strengths: cleanArray(parsed.analysisSummary.strengths),
      uncertainties: cleanArray(parsed.analysisSummary.uncertainties),
      mvpFocus: cleanArray(parsed.analysisSummary.mvpFocus),
      readyForMvpScoping: parsed.analysisSummary.readyForMvpScoping,
    },
  };
  return { result, latencyMs: Date.now() - start };
}

/** MVP Scoping 节点 */
export async function scopeMvp(
  params: CallParams & {
    rawIdea: string;
    ideaUnderstanding: IdeaUnderstanding;
    clarification: ClarificationState;
    productAnalysis: ProductAnalysisResult;
  }
): Promise<{ result: MvpScopingResult; latencyMs: number }> {
  const start = Date.now();
  const text = await callResponses({
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model,
    systemPrompt: MVP_SCOPING_SYSTEM_PROMPT,
    userPrompt: buildMvpScopingPrompt({
      rawIdea: params.rawIdea,
      ideaUnderstanding: params.ideaUnderstanding,
      clarification: params.clarification,
      productAnalysis: params.productAnalysis,
    }),
    formatName: "mvp_scoping",
    formatDescription:
      "MVP 范围收敛结构化结果：第一版定义、首要验证目标、最小完整闭环、必须做、暂缓做、明确不做、范围约束、MVP 风险、验证计划与范围总结。",
    jsonSchema: MVP_SCOPING_JSON_SCHEMA,
  });
  const parsed = parseJson(text);
  if (!isMvpScopingResult(parsed)) {
    throw new AiError("AI_INVALID_RESPONSE");
  }
  const result: MvpScopingResult = {
    mvpDefinition: {
      goal: parsed.mvpDefinition.goal.trim(),
      primaryUser: parsed.mvpDefinition.primaryUser.trim(),
      coreScenario: parsed.mvpDefinition.coreScenario.trim(),
      coreValue: parsed.mvpDefinition.coreValue.trim(),
    },
    validationTarget: {
      primaryHypothesis: parsed.validationTarget.primaryHypothesis.trim(),
      whyThisFirst: parsed.validationTarget.whyThisFirst.trim(),
      successSignal: parsed.validationTarget.successSignal.trim(),
    },
    coreLoop: {
      entry: parsed.coreLoop.entry.trim(),
      steps: cleanArray(parsed.coreLoop.steps),
      outcome: parsed.coreLoop.outcome.trim(),
    },
    mustHave: parsed.mustHave.map((item) => ({
      name: item.name.trim(),
      userNeed: item.userNeed.trim(),
      reason: item.reason.trim(),
      acceptance: item.acceptance.trim(),
    })),
    shouldDefer: parsed.shouldDefer.map((item) => ({
      name: item.name.trim(),
      reason: item.reason.trim(),
      whenToReconsider: item.whenToReconsider.trim(),
    })),
    explicitlyOutOfScope: parsed.explicitlyOutOfScope.map((item) => ({
      name: item.name.trim(),
      reason: item.reason.trim(),
    })),
    scopeConstraints: cleanArray(parsed.scopeConstraints),
    mvpRisks: parsed.mvpRisks.map((item) => ({
      risk: item.risk.trim(),
      impact: item.impact,
      response: item.response.trim(),
    })),
    validationPlan: parsed.validationPlan.map((item) => ({
      action: item.action.trim(),
      signal: item.signal.trim(),
    })),
    scopeSummary: {
      buildNow: cleanArray(parsed.scopeSummary.buildNow),
      doNotBuildNow: cleanArray(parsed.scopeSummary.doNotBuildNow),
      readyForExecutionPlanning:
        parsed.scopeSummary.readyForExecutionPlanning,
    },
  };
  return { result, latencyMs: Date.now() - start };
}

async function callResponses(args: {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  formatName: string;
  formatDescription: string;
  jsonSchema: Record<string, unknown>;
}): Promise<string> {
  const endpoint = joinUrl(args.baseUrl, "/responses");

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify({
        model: args.model,
        store: false,
        thinking: { type: "disabled" },
        text: {
          format: {
            type: "json_schema",
            name: args.formatName,
            description: args.formatDescription,
            strict: true,
            schema: args.jsonSchema,
          },
        },
        input: [
          {
            role: "system",
            content: args.systemPrompt,
          },
          {
            role: "user",
            content: args.userPrompt,
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    throw mapFetchError(error);
  } finally {
    clearTimeout(timer);
  }

  const body: unknown = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw normalizeHttpError(response.status, body);
  }

  const text = extractOutputText(body);
  if (text === null) {
    throw new AiError("AI_INVALID_RESPONSE");
  }
  return text;
}

/** 从 Responses API 响应中提取模型输出文本（忽略 reasoning 项，不展示思维链） */
function extractOutputText(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const response = body as ResponsesApiResponse;

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  if (!Array.isArray(response.output)) return null;
  const parts: string[] = [];
  for (const item of response.output) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return parts.length > 0 ? parts.join("\n") : null;
}

/** 解析模型返回的结构化 JSON：容忍 ```json 包裹，失败归一化为解析错误 */
function parseJson(text: string): unknown {
  const cleaned = stripCodeFence(text).trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AiError("AI_PARSE_ERROR");
  }
}

function cleanArray(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

/** Idea Understanding 专用解析：校验 + 清理字符串数组 */
function parseStructuredJson(text: string): IdeaUnderstanding {
  const parsed = parseJson(text);
  if (!isIdeaUnderstanding(parsed)) {
    throw new AiError("AI_INVALID_RESPONSE");
  }
  return {
    ...parsed,
    // 清理字符串数组中的空白项，保证前端展示质量
    targetUsers: cleanArray(parsed.targetUsers),
    coreProblems: cleanArray(parsed.coreProblems),
    primaryScenarios: cleanArray(parsed.primaryScenarios),
    knownConstraints: cleanArray(parsed.knownConstraints),
    assumptions: cleanArray(parsed.assumptions),
    missingInformation: cleanArray(parsed.missingInformation),
  };
}

function stripCodeFence(text: string): string {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text.trim());
  return fenced ? fenced[1] : text;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function mapFetchError(error: unknown): AiError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AiError("AI_TIMEOUT");
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new AiError("AI_TIMEOUT");
  }
  return new AiError("AI_NETWORK_ERROR");
}
