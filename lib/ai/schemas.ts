// Idea Understanding 的 JSON Schema（Responses API 结构化输出）
// 与运行时校验。校验失败由调用方归一化为 AI_INVALID_RESPONSE。

import type {
  AdjustmentPriority,
  AdjustmentTargetStage,
  ClarificationAnswer,
  ClarificationQuestions,
  ClarificationQuestion,
  ClarifiedContext,
  ConsistencyCheckStatus,
  ExecutionPlanningResult,
  ExecutionPlanningState,
  ExecutionRiskImpact,
  FinalReviewResult,
  FinalReviewState,
  FinalReviewVerdictStatus,
  HypothesisImportance,
  IdeaUnderstanding,
  MvpRiskImpact,
  MvpScopingResult,
  ProductAnalysisResult,
  ProductRiskType,
  RiskSeverity,
  TaskEffort,
  TaskType,
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

// ---- Execution Planning ----

const TASK_TYPES = [
  "product",
  "frontend",
  "backend",
  "ai",
  "data",
  "integration",
  "test",
  "release",
] as const;
const TASK_EFFORTS = ["S", "M", "L"] as const;
const EXECUTION_RISK_IMPACTS = ["high", "medium", "low"] as const;

const EXECUTION_DEFINITION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    goal: { type: "string" },
    deliveryTarget: { type: "string" },
    primaryUser: { type: "string" },
    coreScenario: { type: "string" },
  },
  required: ["goal", "deliveryTarget", "primaryUser", "coreScenario"],
} as const;

const SURFACE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    purpose: { type: "string" },
    keyActions: STRING_ARRAY_SCHEMA,
  },
  required: ["name", "purpose", "keyActions"],
} as const;

const PRODUCT_STRUCTURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    surfaces: { type: "array", items: SURFACE_SCHEMA },
    userFlow: STRING_ARRAY_SCHEMA,
  },
  required: ["surfaces", "userFlow"],
} as const;

const TECH_LAYER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    approach: { type: "string" },
    responsibilities: STRING_ARRAY_SCHEMA,
  },
  required: ["approach", "responsibilities"],
} as const;

const AI_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    needed: { type: "boolean" },
    role: { type: "string" },
    integration: { type: "string" },
  },
  required: ["needed", "role", "integration"],
} as const;

const STORAGE_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    approach: { type: "string" },
    reason: { type: "string" },
  },
  required: ["approach", "reason"],
} as const;

const EXTERNAL_SERVICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    purpose: { type: "string" },
    required: { type: "boolean" },
  },
  required: ["name", "purpose", "required"],
} as const;

const TECHNICAL_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    architecture: { type: "string" },
    frontend: TECH_LAYER_SCHEMA,
    backend: TECH_LAYER_SCHEMA,
    ai: AI_PLAN_SCHEMA,
    storage: STORAGE_PLAN_SCHEMA,
    externalServices: { type: "array", items: EXTERNAL_SERVICE_SCHEMA },
  },
  required: [
    "architecture",
    "frontend",
    "backend",
    "ai",
    "storage",
    "externalServices",
  ],
} as const;

const DATA_OBJECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    purpose: { type: "string" },
    keyFields: STRING_ARRAY_SCHEMA,
  },
  required: ["name", "purpose", "keyFields"],
} as const;

const MILESTONE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    goal: { type: "string" },
    deliverables: STRING_ARRAY_SCHEMA,
    acceptance: STRING_ARRAY_SCHEMA,
  },
  required: ["id", "name", "goal", "deliverables", "acceptance"],
} as const;

const EXECUTION_TASK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    milestoneId: { type: "string" },
    title: { type: "string" },
    objective: { type: "string" },
    type: {
      type: "string",
      enum: [
        "product",
        "frontend",
        "backend",
        "ai",
        "data",
        "integration",
        "test",
        "release",
      ],
    },
    dependencies: STRING_ARRAY_SCHEMA,
    acceptance: STRING_ARRAY_SCHEMA,
    effort: { type: "string", enum: ["S", "M", "L"] },
  },
  required: [
    "id",
    "milestoneId",
    "title",
    "objective",
    "type",
    "dependencies",
    "acceptance",
    "effort",
  ],
} as const;

const VALIDATION_CHECKPOINT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    afterMilestone: { type: "string" },
    whatToValidate: { type: "string" },
    signal: { type: "string" },
  },
  required: ["afterMilestone", "whatToValidate", "signal"],
} as const;

const EXECUTION_RISK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    risk: { type: "string" },
    impact: { type: "string", enum: ["high", "medium", "low"] },
    response: { type: "string" },
  },
  required: ["risk", "impact", "response"],
} as const;

const EXECUTION_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    firstActions: STRING_ARRAY_SCHEMA,
    definitionOfDone: STRING_ARRAY_SCHEMA,
    readyForFinalReview: { type: "boolean" },
  },
  required: ["firstActions", "definitionOfDone", "readyForFinalReview"],
} as const;

/** Execution Planning 节点 Responses API JSON Schema（strict） */
export const EXECUTION_PLANNING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    executionDefinition: EXECUTION_DEFINITION_SCHEMA,
    productStructure: PRODUCT_STRUCTURE_SCHEMA,
    technicalPlan: TECHNICAL_PLAN_SCHEMA,
    dataModel: { type: "array", items: DATA_OBJECT_SCHEMA },
    milestones: { type: "array", items: MILESTONE_SCHEMA },
    tasks: { type: "array", items: EXECUTION_TASK_SCHEMA },
    validationCheckpoints: { type: "array", items: VALIDATION_CHECKPOINT_SCHEMA },
    executionRisks: { type: "array", items: EXECUTION_RISK_SCHEMA },
    executionSummary: EXECUTION_SUMMARY_SCHEMA,
  },
  required: [
    "executionDefinition",
    "productStructure",
    "technicalPlan",
    "dataModel",
    "milestones",
    "tasks",
    "validationCheckpoints",
    "executionRisks",
    "executionSummary",
  ],
} as const;

function isExecutionDefinition(
  value: unknown
): value is ExecutionPlanningResult["executionDefinition"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.goal === "string" &&
    typeof candidate.deliveryTarget === "string" &&
    typeof candidate.primaryUser === "string" &&
    typeof candidate.coreScenario === "string"
  );
}

function isSurface(
  value: unknown
): value is ExecutionPlanningResult["productStructure"]["surfaces"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.purpose === "string" &&
    isStringArray(candidate.keyActions)
  );
}

function isProductStructure(
  value: unknown
): value is ExecutionPlanningResult["productStructure"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.surfaces) &&
    candidate.surfaces.every(isSurface) &&
    isStringArray(candidate.userFlow)
  );
}

function isTechLayer(
  value: unknown
): value is ExecutionPlanningResult["technicalPlan"]["frontend"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.approach === "string" &&
    isStringArray(candidate.responsibilities)
  );
}

function isAiPlan(
  value: unknown
): value is ExecutionPlanningResult["technicalPlan"]["ai"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.needed === "boolean" &&
    typeof candidate.role === "string" &&
    typeof candidate.integration === "string"
  );
}

function isStoragePlan(
  value: unknown
): value is ExecutionPlanningResult["technicalPlan"]["storage"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.approach === "string" &&
    typeof candidate.reason === "string"
  );
}

function isExternalService(
  value: unknown
): value is ExecutionPlanningResult["technicalPlan"]["externalServices"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.purpose === "string" &&
    typeof candidate.required === "boolean"
  );
}

function isTechnicalPlan(
  value: unknown
): value is ExecutionPlanningResult["technicalPlan"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.architecture === "string" &&
    isTechLayer(candidate.frontend) &&
    isTechLayer(candidate.backend) &&
    isAiPlan(candidate.ai) &&
    isStoragePlan(candidate.storage) &&
    Array.isArray(candidate.externalServices) &&
    candidate.externalServices.every(isExternalService)
  );
}

function isDataObject(
  value: unknown
): value is ExecutionPlanningResult["dataModel"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.purpose === "string" &&
    isStringArray(candidate.keyFields)
  );
}

function isMilestone(
  value: unknown
): value is ExecutionPlanningResult["milestones"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.goal === "string" &&
    isStringArray(candidate.deliverables) &&
    isStringArray(candidate.acceptance)
  );
}

function isExecutionTask(
  value: unknown
): value is ExecutionPlanningResult["tasks"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.milestoneId === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.objective === "string" &&
    (TASK_TYPES as readonly string[]).includes(
      candidate.type as TaskType
    ) &&
    isStringArray(candidate.dependencies) &&
    isStringArray(candidate.acceptance) &&
    (TASK_EFFORTS as readonly string[]).includes(
      candidate.effort as TaskEffort
    )
  );
}

function isValidationCheckpoint(
  value: unknown
): value is ExecutionPlanningResult["validationCheckpoints"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.afterMilestone === "string" &&
    typeof candidate.whatToValidate === "string" &&
    typeof candidate.signal === "string"
  );
}

function isExecutionRisk(
  value: unknown
): value is ExecutionPlanningResult["executionRisks"][number] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.risk === "string" &&
    (EXECUTION_RISK_IMPACTS as readonly string[]).includes(
      candidate.impact as ExecutionRiskImpact
    ) &&
    typeof candidate.response === "string"
  );
}

function isExecutionSummary(
  value: unknown
): value is ExecutionPlanningResult["executionSummary"] {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isStringArray(candidate.firstActions) &&
    isStringArray(candidate.definitionOfDone) &&
    typeof candidate.readyForFinalReview === "boolean"
  );
}

/** 运行时守卫：校验 Execution Planning 输出 */
export function isExecutionPlanningResult(
  value: unknown
): value is ExecutionPlanningResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isExecutionDefinition(candidate.executionDefinition) &&
    isProductStructure(candidate.productStructure) &&
    isTechnicalPlan(candidate.technicalPlan) &&
    Array.isArray(candidate.dataModel) &&
    candidate.dataModel.every(isDataObject) &&
    Array.isArray(candidate.milestones) &&
    candidate.milestones.every(isMilestone) &&
    Array.isArray(candidate.tasks) &&
    candidate.tasks.every(isExecutionTask) &&
    Array.isArray(candidate.validationCheckpoints) &&
    candidate.validationCheckpoints.every(isValidationCheckpoint) &&
    Array.isArray(candidate.executionRisks) &&
    candidate.executionRisks.every(isExecutionRisk) &&
    isExecutionSummary(candidate.executionSummary)
  );
}

/** 运行时守卫：校验 Project 上的 Execution Planning 状态 */
export function isExecutionPlanningState(
  value: unknown
): value is ExecutionPlanningState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isExecutionPlanningResult(candidate.result) &&
    typeof candidate.completedAt === "string"
  );
}

// ---- Final Review（最终一致性审计）----

const FINAL_REVIEW_VERDICT_STATUSES = ["ready", "needs_attention"] as const;
const CONSISTENCY_CHECK_STATUSES = ["pass", "warning"] as const;
const ADJUSTMENT_PRIORITIES = ["high", "medium", "low"] as const;
const ADJUSTMENT_TARGET_STAGES = [
  "clarification",
  "product_analysis",
  "mvp",
  "execution",
] as const;

/** Responses API text.format 使用的 JSON Schema（strict） */
export const FINAL_REVIEW_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: {
          type: "string",
          enum: FINAL_REVIEW_VERDICT_STATUSES,
        },
        summary: { type: "string" },
      },
      required: ["status", "summary"],
    },
    consistencyChecks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          dimension: { type: "string" },
          status: {
            type: "string",
            enum: CONSISTENCY_CHECK_STATUSES,
          },
          finding: { type: "string" },
        },
        required: ["dimension", "status", "finding"],
      },
    },
    scopeIntegrity: {
      type: "object",
      additionalProperties: false,
      properties: {
        passed: { type: "boolean" },
        reintroducedItems: STRING_ARRAY_SCHEMA,
        finding: { type: "string" },
      },
      required: ["passed", "reintroducedItems", "finding"],
    },
    factIntegrity: {
      type: "object",
      additionalProperties: false,
      properties: {
        passed: { type: "boolean" },
        issues: STRING_ARRAY_SCHEMA,
        finding: { type: "string" },
      },
      required: ["passed", "issues", "finding"],
    },
    executionReadiness: {
      type: "object",
      additionalProperties: false,
      properties: {
        passed: { type: "boolean" },
        strengths: STRING_ARRAY_SCHEMA,
        gaps: STRING_ARRAY_SCHEMA,
      },
      required: ["passed", "strengths", "gaps"],
    },
    recommendedAdjustments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          priority: {
            type: "string",
            enum: ADJUSTMENT_PRIORITIES,
          },
          targetStage: {
            type: "string",
            enum: ADJUSTMENT_TARGET_STAGES,
          },
          adjustment: { type: "string" },
          reason: { type: "string" },
        },
        required: ["priority", "targetStage", "adjustment", "reason"],
      },
    },
    finalSummary: {
      type: "object",
      additionalProperties: false,
      properties: {
        readyToBuild: { type: "boolean" },
        firstAction: { type: "string" },
        keepInMind: STRING_ARRAY_SCHEMA,
      },
      required: ["readyToBuild", "firstAction", "keepInMind"],
    },
  },
  required: [
    "verdict",
    "consistencyChecks",
    "scopeIntegrity",
    "factIntegrity",
    "executionReadiness",
    "recommendedAdjustments",
    "finalSummary",
  ],
} as const;

/** 运行时守卫：校验 Final Review 输出 */
export function isFinalReviewResult(
  value: unknown
): value is FinalReviewResult {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  const verdict = candidate.verdict;
  if (typeof verdict !== "object" || verdict === null) return false;
  const verdictRecord = verdict as Record<string, unknown>;
  if (
    !(FINAL_REVIEW_VERDICT_STATUSES as readonly string[]).includes(
      verdictRecord.status as FinalReviewVerdictStatus
    ) ||
    typeof verdictRecord.summary !== "string"
  ) {
    return false;
  }

  const checksValid =
    Array.isArray(candidate.consistencyChecks) &&
    candidate.consistencyChecks.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const check = item as Record<string, unknown>;
      return (
        typeof check.dimension === "string" &&
        (CONSISTENCY_CHECK_STATUSES as readonly string[]).includes(
          check.status as ConsistencyCheckStatus
        ) &&
        typeof check.finding === "string"
      );
    });
  if (!checksValid) return false;

  const scopeValid =
    typeof candidate.scopeIntegrity === "object" &&
    candidate.scopeIntegrity !== null &&
    (() => {
      const scope = candidate.scopeIntegrity as Record<string, unknown>;
      return (
        typeof scope.passed === "boolean" &&
        isStringArray(scope.reintroducedItems) &&
        typeof scope.finding === "string"
      );
    })();
  if (!scopeValid) return false;

  const factValid =
    typeof candidate.factIntegrity === "object" &&
    candidate.factIntegrity !== null &&
    (() => {
      const fact = candidate.factIntegrity as Record<string, unknown>;
      return (
        typeof fact.passed === "boolean" &&
        isStringArray(fact.issues) &&
        typeof fact.finding === "string"
      );
    })();
  if (!factValid) return false;

  const readinessValid =
    typeof candidate.executionReadiness === "object" &&
    candidate.executionReadiness !== null &&
    (() => {
      const readiness = candidate.executionReadiness as Record<string, unknown>;
      return (
        typeof readiness.passed === "boolean" &&
        isStringArray(readiness.strengths) &&
        isStringArray(readiness.gaps)
      );
    })();
  if (!readinessValid) return false;

  const adjustmentsValid =
    Array.isArray(candidate.recommendedAdjustments) &&
    candidate.recommendedAdjustments.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const adjustment = item as Record<string, unknown>;
      return (
        (ADJUSTMENT_PRIORITIES as readonly string[]).includes(
          adjustment.priority as AdjustmentPriority
        ) &&
        (ADJUSTMENT_TARGET_STAGES as readonly string[]).includes(
          adjustment.targetStage as AdjustmentTargetStage
        ) &&
        typeof adjustment.adjustment === "string" &&
        typeof adjustment.reason === "string"
      );
    });
  if (!adjustmentsValid) return false;

  const summary = candidate.finalSummary;
  if (typeof summary !== "object" || summary === null) return false;
  const summaryRecord = summary as Record<string, unknown>;
  return (
    typeof summaryRecord.readyToBuild === "boolean" &&
    typeof summaryRecord.firstAction === "string" &&
    isStringArray(summaryRecord.keepInMind)
  );
}

/** 运行时守卫：校验 Project 上的 Final Review 状态 */
export function isFinalReviewState(
  value: unknown
): value is FinalReviewState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isFinalReviewResult(candidate.result) &&
    typeof candidate.completedAt === "string"
  );
}
