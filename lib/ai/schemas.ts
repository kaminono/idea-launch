// Idea Understanding 的 JSON Schema（Responses API 结构化输出）
// 与运行时校验。校验失败由调用方归一化为 AI_INVALID_RESPONSE。

import type {
  ClarificationAnswer,
  ClarificationQuestions,
  ClarificationQuestion,
  ClarifiedContext,
  HypothesisImportance,
  IdeaUnderstanding,
  MvpRiskImpact,
  MvpScopingResult,
  ProductAnalysisResult,
  ProductRiskType,
  RiskSeverity,
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

// ---- Product Analysis ----

const HYPOTHESIS_IMPORTANCE = ["high", "medium", "low"] as const;
const RISK_TYPES = [
  "user",
  "product",
  "value",
  "adoption",
  "business",
  "execution",
] as const;
const RISK_SEVERITY = ["high", "medium", "low"] as const;

const PRODUCT_DEFINITION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    oneLineDefinition: { type: "string" },
    category: { type: "string" },
    stage: { type: "string" },
  },
  required: ["name", "oneLineDefinition", "category", "stage"],
} as const;

const PRIMARY_USER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    description: { type: "string" },
    context: { type: "string" },
    primaryGoal: { type: "string" },
  },
  required: ["description", "context", "primaryGoal"],
} as const;

const CORE_SCENARIO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    trigger: { type: "string" },
    scenario: { type: "string" },
    desiredOutcome: { type: "string" },
  },
  required: ["trigger", "scenario", "desiredOutcome"],
} as const;

const PROBLEM_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    coreProblem: { type: "string" },
    rootCauses: STRING_ARRAY_SCHEMA,
    currentPainPoints: STRING_ARRAY_SCHEMA,
  },
  required: ["coreProblem", "rootCauses", "currentPainPoints"],
} as const;

const CURRENT_ALTERNATIVE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    alternative: { type: "string" },
    whyUsersUseIt: { type: "string" },
    limitations: STRING_ARRAY_SCHEMA,
  },
  required: ["alternative", "whyUsersUseIt", "limitations"],
} as const;

const VALUE_PROPOSITION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    coreValue: { type: "string" },
    userChange: { type: "string" },
    differentiationDirection: { type: "string" },
  },
  required: ["coreValue", "userChange", "differentiationDirection"],
} as const;

const KEY_HYPOTHESIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    hypothesis: { type: "string" },
    importance: {
      type: "string",
      enum: ["high", "medium", "low"],
    },
    validationNeeded: { type: "boolean" },
    validationIdea: { type: "string" },
  },
  required: [
    "hypothesis",
    "importance",
    "validationNeeded",
    "validationIdea",
  ],
} as const;

const PRODUCT_RISK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    risk: { type: "string" },
    type: {
      type: "string",
      enum: [
        "user",
        "product",
        "value",
        "adoption",
        "business",
        "execution",
      ],
    },
    severity: { type: "string", enum: ["high", "medium", "low"] },
    reason: { type: "string" },
  },
  required: ["risk", "type", "severity", "reason"],
} as const;

const ANALYSIS_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    strengths: STRING_ARRAY_SCHEMA,
    uncertainties: STRING_ARRAY_SCHEMA,
    mvpFocus: STRING_ARRAY_SCHEMA,
    readyForMvpScoping: { type: "boolean" },
  },
  required: [
    "strengths",
    "uncertainties",
    "mvpFocus",
    "readyForMvpScoping",
  ],
} as const;

/** Product Analysis 节点 Responses API JSON Schema（strict） */
export const PRODUCT_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    productDefinition: PRODUCT_DEFINITION_SCHEMA,
    primaryUser: PRIMARY_USER_SCHEMA,
    coreScenario: CORE_SCENARIO_SCHEMA,
    problemAnalysis: PROBLEM_ANALYSIS_SCHEMA,
    currentAlternatives: { type: "array", items: CURRENT_ALTERNATIVE_SCHEMA },
    valueProposition: VALUE_PROPOSITION_SCHEMA,
    keyHypotheses: { type: "array", items: KEY_HYPOTHESIS_SCHEMA },
    risks: { type: "array", items: PRODUCT_RISK_SCHEMA },
    analysisSummary: ANALYSIS_SUMMARY_SCHEMA,
  },
  required: [
    "productDefinition",
    "primaryUser",
    "coreScenario",
    "problemAnalysis",
    "currentAlternatives",
    "valueProposition",
    "keyHypotheses",
    "risks",
    "analysisSummary",
  ],
} as const;

function isProductDefinition(
  value: unknown
): value is ProductAnalysisResult["productDefinition"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.oneLineDefinition === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.stage === "string"
  );
}

function isPrimaryUser(
  value: unknown
): value is ProductAnalysisResult["primaryUser"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.description === "string" &&
    typeof candidate.context === "string" &&
    typeof candidate.primaryGoal === "string"
  );
}

function isCoreScenario(
  value: unknown
): value is ProductAnalysisResult["coreScenario"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.trigger === "string" &&
    typeof candidate.scenario === "string" &&
    typeof candidate.desiredOutcome === "string"
  );
}

function isProblemAnalysis(
  value: unknown
): value is ProductAnalysisResult["problemAnalysis"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.coreProblem === "string" &&
    isStringArray(candidate.rootCauses) &&
    isStringArray(candidate.currentPainPoints)
  );
}

function isCurrentAlternative(
  value: unknown
): value is ProductAnalysisResult["currentAlternatives"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.alternative === "string" &&
    typeof candidate.whyUsersUseIt === "string" &&
    isStringArray(candidate.limitations)
  );
}

function isValueProposition(
  value: unknown
): value is ProductAnalysisResult["valueProposition"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.coreValue === "string" &&
    typeof candidate.userChange === "string" &&
    typeof candidate.differentiationDirection === "string"
  );
}

function isKeyHypothesis(
  value: unknown
): value is ProductAnalysisResult["keyHypotheses"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.hypothesis === "string" &&
    (HYPOTHESIS_IMPORTANCE as readonly string[]).includes(
      candidate.importance as HypothesisImportance
    ) &&
    typeof candidate.validationNeeded === "boolean" &&
    typeof candidate.validationIdea === "string"
  );
}

function isProductRisk(
  value: unknown
): value is ProductAnalysisResult["risks"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.risk === "string" &&
    (RISK_TYPES as readonly string[]).includes(
      candidate.type as ProductRiskType
    ) &&
    (RISK_SEVERITY as readonly string[]).includes(
      candidate.severity as RiskSeverity
    ) &&
    typeof candidate.reason === "string"
  );
}

function isAnalysisSummary(
  value: unknown
): value is ProductAnalysisResult["analysisSummary"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isStringArray(candidate.strengths) &&
    isStringArray(candidate.uncertainties) &&
    isStringArray(candidate.mvpFocus) &&
    typeof candidate.readyForMvpScoping === "boolean"
  );
}

/** 运行时守卫：校验 Product Analysis 输出 */
export function isProductAnalysisResult(
  value: unknown
): value is ProductAnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isProductDefinition(candidate.productDefinition) &&
    isPrimaryUser(candidate.primaryUser) &&
    isCoreScenario(candidate.coreScenario) &&
    isProblemAnalysis(candidate.problemAnalysis) &&
    Array.isArray(candidate.currentAlternatives) &&
    candidate.currentAlternatives.every(isCurrentAlternative) &&
    isValueProposition(candidate.valueProposition) &&
    Array.isArray(candidate.keyHypotheses) &&
    candidate.keyHypotheses.every(isKeyHypothesis) &&
    Array.isArray(candidate.risks) &&
    candidate.risks.every(isProductRisk) &&
    isAnalysisSummary(candidate.analysisSummary)
  );
}

// ---- MVP Scoping ----

const MVP_RISK_IMPACT = ["high", "medium", "low"] as const;

const MVP_DEFINITION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    goal: { type: "string" },
    primaryUser: { type: "string" },
    coreScenario: { type: "string" },
    coreValue: { type: "string" },
  },
  required: ["goal", "primaryUser", "coreScenario", "coreValue"],
} as const;

const VALIDATION_TARGET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    primaryHypothesis: { type: "string" },
    whyThisFirst: { type: "string" },
    successSignal: { type: "string" },
  },
  required: ["primaryHypothesis", "whyThisFirst", "successSignal"],
} as const;

const CORE_LOOP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    entry: { type: "string" },
    steps: STRING_ARRAY_SCHEMA,
    outcome: { type: "string" },
  },
  required: ["entry", "steps", "outcome"],
} as const;

const MUST_HAVE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    userNeed: { type: "string" },
    reason: { type: "string" },
    acceptance: { type: "string" },
  },
  required: ["name", "userNeed", "reason", "acceptance"],
} as const;

const SHOULD_DEFER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    reason: { type: "string" },
    whenToReconsider: { type: "string" },
  },
  required: ["name", "reason", "whenToReconsider"],
} as const;

const OUT_OF_SCOPE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    reason: { type: "string" },
  },
  required: ["name", "reason"],
} as const;

const MVP_RISK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    risk: { type: "string" },
    impact: { type: "string", enum: ["high", "medium", "low"] },
    response: { type: "string" },
  },
  required: ["risk", "impact", "response"],
} as const;

const VALIDATION_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string" },
    signal: { type: "string" },
  },
  required: ["action", "signal"],
} as const;

const SCOPE_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    buildNow: STRING_ARRAY_SCHEMA,
    doNotBuildNow: STRING_ARRAY_SCHEMA,
    readyForExecutionPlanning: { type: "boolean" },
  },
  required: ["buildNow", "doNotBuildNow", "readyForExecutionPlanning"],
} as const;

/** MVP Scoping 节点 Responses API JSON Schema（strict） */
export const MVP_SCOPING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mvpDefinition: MVP_DEFINITION_SCHEMA,
    validationTarget: VALIDATION_TARGET_SCHEMA,
    coreLoop: CORE_LOOP_SCHEMA,
    mustHave: { type: "array", items: MUST_HAVE_SCHEMA },
    shouldDefer: { type: "array", items: SHOULD_DEFER_SCHEMA },
    explicitlyOutOfScope: { type: "array", items: OUT_OF_SCOPE_SCHEMA },
    scopeConstraints: STRING_ARRAY_SCHEMA,
    mvpRisks: { type: "array", items: MVP_RISK_SCHEMA },
    validationPlan: { type: "array", items: VALIDATION_PLAN_SCHEMA },
    scopeSummary: SCOPE_SUMMARY_SCHEMA,
  },
  required: [
    "mvpDefinition",
    "validationTarget",
    "coreLoop",
    "mustHave",
    "shouldDefer",
    "explicitlyOutOfScope",
    "scopeConstraints",
    "mvpRisks",
    "validationPlan",
    "scopeSummary",
  ],
} as const;

function isMvpDefinition(
  value: unknown
): value is MvpScopingResult["mvpDefinition"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.goal === "string" &&
    typeof candidate.primaryUser === "string" &&
    typeof candidate.coreScenario === "string" &&
    typeof candidate.coreValue === "string"
  );
}

function isValidationTarget(
  value: unknown
): value is MvpScopingResult["validationTarget"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.primaryHypothesis === "string" &&
    typeof candidate.whyThisFirst === "string" &&
    typeof candidate.successSignal === "string"
  );
}

function isCoreLoop(value: unknown): value is MvpScopingResult["coreLoop"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.entry === "string" &&
    isStringArray(candidate.steps) &&
    typeof candidate.outcome === "string"
  );
}

function isMustHaveFeature(
  value: unknown
): value is MvpScopingResult["mustHave"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.userNeed === "string" &&
    typeof candidate.reason === "string" &&
    typeof candidate.acceptance === "string"
  );
}

function isShouldDeferFeature(
  value: unknown
): value is MvpScopingResult["shouldDefer"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.reason === "string" &&
    typeof candidate.whenToReconsider === "string"
  );
}

function isOutOfScopeFeature(
  value: unknown
): value is MvpScopingResult["explicitlyOutOfScope"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.reason === "string"
  );
}

function isMvpRisk(value: unknown): value is MvpScopingResult["mvpRisks"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.risk === "string" &&
    (MVP_RISK_IMPACT as readonly string[]).includes(
      candidate.impact as MvpRiskImpact
    ) &&
    typeof candidate.response === "string"
  );
}

function isValidationAction(
  value: unknown
): value is MvpScopingResult["validationPlan"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.action === "string" &&
    typeof candidate.signal === "string"
  );
}

function isScopeSummary(
  value: unknown
): value is MvpScopingResult["scopeSummary"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isStringArray(candidate.buildNow) &&
    isStringArray(candidate.doNotBuildNow) &&
    typeof candidate.readyForExecutionPlanning === "boolean"
  );
}

/** 运行时守卫：校验 MVP Scoping 输出 */
export function isMvpScopingResult(
  value: unknown
): value is MvpScopingResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isMvpDefinition(candidate.mvpDefinition) &&
    isValidationTarget(candidate.validationTarget) &&
    isCoreLoop(candidate.coreLoop) &&
    Array.isArray(candidate.mustHave) &&
    candidate.mustHave.every(isMustHaveFeature) &&
    Array.isArray(candidate.shouldDefer) &&
    candidate.shouldDefer.every(isShouldDeferFeature) &&
    Array.isArray(candidate.explicitlyOutOfScope) &&
    candidate.explicitlyOutOfScope.every(isOutOfScopeFeature) &&
    isStringArray(candidate.scopeConstraints) &&
    Array.isArray(candidate.mvpRisks) &&
    candidate.mvpRisks.every(isMvpRisk) &&
    Array.isArray(candidate.validationPlan) &&
    candidate.validationPlan.every(isValidationAction) &&
    isScopeSummary(candidate.scopeSummary)
  );
}
