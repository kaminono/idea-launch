// Idea Understanding 的 JSON Schema（Responses API 结构化输出）
// 与运行时校验。校验失败由调用方归一化为 AI_INVALID_RESPONSE。

import type {
  ClarificationAnswer,
  ClarificationQuestions,
  ClarificationQuestion,
  ClarifiedContext,
  IdeaUnderstanding,
} from "@/lib/types";

const STRING_ARRAY_SCHEMA = {
  type: "array",
  items: { type: "string" },
} as const;

const ANSWER_TYPES = ["single_choice", "multi_choice", "text"] as const;

/** Responses API text.format 使用的 JSON Schema（strict） */
export const IDEA_UNDERSTANDING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    suggestedName: { type: "string" },
    oneLineDefinition: { type: "string" },
    targetUsers: STRING_ARRAY_SCHEMA,
    coreProblems: STRING_ARRAY_SCHEMA,
    primaryScenarios: STRING_ARRAY_SCHEMA,
    knownConstraints: STRING_ARRAY_SCHEMA,
    assumptions: STRING_ARRAY_SCHEMA,
    missingInformation: STRING_ARRAY_SCHEMA,
    clarificationNeeded: { type: "boolean" },
  },
  required: [
    "suggestedName",
    "oneLineDefinition",
    "targetUsers",
    "coreProblems",
    "primaryScenarios",
    "knownConstraints",
    "assumptions",
    "missingInformation",
    "clarificationNeeded",
  ],
} as const;

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

// ---- Clarification Questions ----

const OPTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    value: { type: "string" },
    label: { type: "string" },
  },
  required: ["value", "label"],
} as const;

const QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    question: { type: "string" },
    whyItMatters: { type: "string" },
    answerType: {
      type: "string",
      enum: ["single_choice", "multi_choice", "text"],
    },
    options: { type: "array", items: OPTION_SCHEMA },
    allowCustomAnswer: { type: "boolean" },
  },
  required: [
    "id",
    "question",
    "whyItMatters",
    "answerType",
    "options",
    "allowCustomAnswer",
  ],
} as const;

/** Questions 节点 Responses API JSON Schema（strict） */
export const CLARIFICATION_QUESTIONS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    clarificationNeeded: { type: "boolean" },
    reason: { type: "string" },
    questions: { type: "array", items: QUESTION_SCHEMA },
  },
  required: ["clarificationNeeded", "reason", "questions"],
} as const;

function isClarificationOption(
  value: unknown
): value is ClarificationQuestion["options"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.value === "string" &&
    typeof candidate.label === "string"
  );
}

function isClarificationQuestion(
  value: unknown
): value is ClarificationQuestion {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.question === "string" &&
    typeof candidate.whyItMatters === "string" &&
    typeof candidate.answerType === "string" &&
    (ANSWER_TYPES as readonly string[]).includes(candidate.answerType) &&
    Array.isArray(candidate.options) &&
    candidate.options.every(isClarificationOption) &&
    typeof candidate.allowCustomAnswer === "boolean"
  );
}

/** 运行时守卫：校验 Question Generation 输出 */
export function isClarificationQuestions(
  value: unknown
): value is ClarificationQuestions {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.clarificationNeeded === "boolean" &&
    typeof candidate.reason === "string" &&
    Array.isArray(candidate.questions) &&
    candidate.questions.every(isClarificationQuestion)
  );
}

/** 运行时守卫：校验单题答案（持久化恢复与请求复用） */
export function isClarificationAnswer(
  value: unknown
): value is ClarificationAnswer {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.questionId === "string" &&
    Array.isArray(candidate.selectedValues) &&
    candidate.selectedValues.every((item) => typeof item === "string") &&
    typeof candidate.customText === "string"
  );
}

export { isClarificationQuestion };

// ---- Clarified Context（Synthesis）----

/** Synthesis 节点 Responses API JSON Schema（strict） */
export const CLARIFIED_CONTEXT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    productName: { type: "string" },
    oneLineDefinition: { type: "string" },
    targetUsers: STRING_ARRAY_SCHEMA,
    primaryScenario: { type: "string" },
    coreProblem: { type: "string" },
    userGoal: { type: "string" },
    currentAlternatives: STRING_ARRAY_SCHEMA,
    explicitConstraints: STRING_ARRAY_SCHEMA,
    confirmedDecisions: STRING_ARRAY_SCHEMA,
    remainingAssumptions: STRING_ARRAY_SCHEMA,
    remainingUnknowns: STRING_ARRAY_SCHEMA,
    readyForProductAnalysis: { type: "boolean" },
  },
  required: [
    "productName",
    "oneLineDefinition",
    "targetUsers",
    "primaryScenario",
    "coreProblem",
    "userGoal",
    "currentAlternatives",
    "explicitConstraints",
    "confirmedDecisions",
    "remainingAssumptions",
    "remainingUnknowns",
    "readyForProductAnalysis",
  ],
} as const;

/** 运行时守卫：校验 Synthesis 输出 */
export function isClarifiedContext(
  value: unknown
): value is ClarifiedContext {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.productName === "string" &&
    typeof candidate.oneLineDefinition === "string" &&
    isStringArray(candidate.targetUsers) &&
    typeof candidate.primaryScenario === "string" &&
    typeof candidate.coreProblem === "string" &&
    typeof candidate.userGoal === "string" &&
    isStringArray(candidate.currentAlternatives) &&
    isStringArray(candidate.explicitConstraints) &&
    isStringArray(candidate.confirmedDecisions) &&
    isStringArray(candidate.remainingAssumptions) &&
    isStringArray(candidate.remainingUnknowns) &&
    typeof candidate.readyForProductAnalysis === "boolean"
  );
}

/** 运行时类型守卫：校验模型输出是否符合 IdeaUnderstanding 契约 */
export function isIdeaUnderstanding(
  value: unknown
): value is IdeaUnderstanding {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.suggestedName === "string" &&
    typeof candidate.oneLineDefinition === "string" &&
    isStringArray(candidate.targetUsers) &&
    isStringArray(candidate.coreProblems) &&
    isStringArray(candidate.primaryScenarios) &&
    isStringArray(candidate.knownConstraints) &&
    isStringArray(candidate.assumptions) &&
    isStringArray(candidate.missingInformation) &&
    typeof candidate.clarificationNeeded === "boolean"
  );
}
