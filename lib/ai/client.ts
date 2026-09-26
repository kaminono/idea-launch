// 服务端 AI Client：六个工作流节点（七个模型动作）的业务编排层。
// 只依赖 AI Runtime（lib/ai/providers），不感知任何具体厂商协议。
// 仅在 Route Handler（服务端）中被引用，API Key 不做任何持久化。

import {
  EXECUTION_PLANNING_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
} from "./config";
import {
  CLARIFIED_CONTEXT_JSON_SCHEMA,
  CLARIFICATION_QUESTIONS_JSON_SCHEMA,
  EXECUTION_PLANNING_JSON_SCHEMA,
  FINAL_REVIEW_JSON_SCHEMA,
  IDEA_UNDERSTANDING_JSON_SCHEMA,
  MVP_SCOPING_JSON_SCHEMA,
  PRODUCT_ANALYSIS_JSON_SCHEMA,
  isClarificationQuestions,
  isClarifiedContext,
  isExecutionPlanningResult,
  isFinalReviewResult,
  isIdeaUnderstanding,
  isMvpScopingResult,
  isProductAnalysisResult,
} from "./schemas";
import {
  CLARIFICATION_QUESTIONS_SYSTEM_PROMPT,
  CLARIFICATION_SYNTHESIS_SYSTEM_PROMPT,
  EXECUTION_PLANNING_SYSTEM_PROMPT,
  FINAL_REVIEW_SYSTEM_PROMPT,
  IDEA_UNDERSTANDING_SYSTEM_PROMPT,
  MVP_SCOPING_SYSTEM_PROMPT,
  PRODUCT_ANALYSIS_SYSTEM_PROMPT,
  buildClarificationQuestionsPrompt,
  buildClarificationSynthesisPrompt,
  buildExecutionPlanningPrompt,
  buildFinalReviewPrompt,
  buildIdeaUnderstandingUserPrompt,
  buildMvpScopingPrompt,
  buildProductAnalysisPrompt,
} from "./prompts";
import { generateStructured, testConnection as runtimeTest } from "./providers";
import { AiError } from "./errors";
import type {
  ClarificationAnswer,
  ClarificationQuestions,
  ClarificationQuestion,
  ClarificationState,
  ClarifiedContext,
  ExecutionPlanningResult,
  FinalReviewResult,
  IdeaUnderstanding,
  ModelConfig,
  MvpScopingResult,
  ProductAnalysisResult,
  TestConnectionResult,
} from "@/lib/types";

interface TimedResult<T> {
  result: T;
  latencyMs: number;
}

/** 连接测试：完整链路（可达 / Key / 模型 / 结构化 {ok:true}） */
export async function testConnection(
  config: ModelConfig
): Promise<TestConnectionResult> {
  const { latencyMs } = await runtimeTest(config);
  return {
    providerId: config.providerId,
    modelId: config.modelId,
    latencyMs,
  };
}

/** Idea Understanding 节点 */
export async function understandIdea(args: {
  config: ModelConfig;
  rawIdea: string;
}): Promise<TimedResult<IdeaUnderstanding>> {
  const { result, latencyMs } = await generateStructured({
    config: args.config,
    system: IDEA_UNDERSTANDING_SYSTEM_PROMPT,
    user: buildIdeaUnderstandingUserPrompt(args.rawIdea),
    jsonSchema: IDEA_UNDERSTANDING_JSON_SCHEMA,
    timeoutMs: REQUEST_TIMEOUT_MS,
    guard: isIdeaUnderstanding,
  });
  const cleaned: IdeaUnderstanding = {
    ...result,
    // 清理字符串数组中的空白项，保证前端展示质量
    targetUsers: cleanArray(result.targetUsers),
    coreProblems: cleanArray(result.coreProblems),
    primaryScenarios: cleanArray(result.primaryScenarios),
    knownConstraints: cleanArray(result.knownConstraints),
    assumptions: cleanArray(result.assumptions),
    missingInformation: cleanArray(result.missingInformation),
  };
  return { result: cleaned, latencyMs };
}

/** Clarification Question Generation 节点 */
export async function generateClarificationQuestions(args: {
  config: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
}): Promise<TimedResult<ClarificationQuestions>> {
  const { result: parsed, latencyMs } = await generateStructured({
    config: args.config,
    system: CLARIFICATION_QUESTIONS_SYSTEM_PROMPT,
    user: buildClarificationQuestionsPrompt({
      rawIdea: args.rawIdea,
      ideaUnderstanding: args.ideaUnderstanding,
    }),
    jsonSchema: CLARIFICATION_QUESTIONS_JSON_SCHEMA,
    timeoutMs: REQUEST_TIMEOUT_MS,
    guard: isClarificationQuestions,
  });
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
    throw new AiError("INVALID_STRUCTURED_OUTPUT");
  }
  return { result, latencyMs };
}

/** Clarification Synthesis 节点 */
export async function synthesizeClarification(args: {
  config: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
}): Promise<TimedResult<ClarifiedContext>> {
  const { result: parsed, latencyMs } = await generateStructured({
    config: args.config,
    system: CLARIFICATION_SYNTHESIS_SYSTEM_PROMPT,
    user: buildClarificationSynthesisPrompt({
      rawIdea: args.rawIdea,
      ideaUnderstanding: args.ideaUnderstanding,
      questions: args.questions,
      answers: args.answers,
    }),
    jsonSchema: CLARIFIED_CONTEXT_JSON_SCHEMA,
    timeoutMs: REQUEST_TIMEOUT_MS,
    guard: isClarifiedContext,
  });
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
  return { result, latencyMs };
}

/** Product Analysis 节点 */
export async function analyzeProduct(args: {
  config: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
}): Promise<TimedResult<ProductAnalysisResult>> {
  const { result: parsed, latencyMs } = await generateStructured({
    config: args.config,
    system: PRODUCT_ANALYSIS_SYSTEM_PROMPT,
    user: buildProductAnalysisPrompt({
      rawIdea: args.rawIdea,
      ideaUnderstanding: args.ideaUnderstanding,
      clarification: args.clarification,
    }),
    jsonSchema: PRODUCT_ANALYSIS_JSON_SCHEMA,
    timeoutMs: REQUEST_TIMEOUT_MS,
    guard: isProductAnalysisResult,
  });
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
  return { result, latencyMs };
}

/** MVP Scoping 节点 */
export async function scopeMvp(args: {
  config: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
  productAnalysis: ProductAnalysisResult;
}): Promise<TimedResult<MvpScopingResult>> {
  const { result: parsed, latencyMs } = await generateStructured({
    config: args.config,
    system: MVP_SCOPING_SYSTEM_PROMPT,
    user: buildMvpScopingPrompt({
      rawIdea: args.rawIdea,
      ideaUnderstanding: args.ideaUnderstanding,
      clarification: args.clarification,
      productAnalysis: args.productAnalysis,
    }),
    jsonSchema: MVP_SCOPING_JSON_SCHEMA,
    timeoutMs: REQUEST_TIMEOUT_MS,
    guard: isMvpScopingResult,
  });
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
  return { result, latencyMs };
}

/** Execution Planning 节点（节点级超时 180s） */
export async function planExecution(args: {
  config: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
  productAnalysis: ProductAnalysisResult;
  mvpScoping: MvpScopingResult;
}): Promise<TimedResult<ExecutionPlanningResult>> {
  const { result: parsed, latencyMs } = await generateStructured({
    config: args.config,
    system: EXECUTION_PLANNING_SYSTEM_PROMPT,
    user: buildExecutionPlanningPrompt({
      rawIdea: args.rawIdea,
      ideaUnderstanding: args.ideaUnderstanding,
      clarification: args.clarification,
      productAnalysis: args.productAnalysis,
      mvpScoping: args.mvpScoping,
    }),
    jsonSchema: EXECUTION_PLANNING_JSON_SCHEMA,
    timeoutMs: EXECUTION_PLANNING_TIMEOUT_MS,
    guard: isExecutionPlanningResult,
  });
  const result: ExecutionPlanningResult = {
    executionDefinition: {
      goal: parsed.executionDefinition.goal.trim(),
      deliveryTarget: parsed.executionDefinition.deliveryTarget.trim(),
      primaryUser: parsed.executionDefinition.primaryUser.trim(),
      coreScenario: parsed.executionDefinition.coreScenario.trim(),
    },
    productStructure: {
      surfaces: parsed.productStructure.surfaces.map((item) => ({
        name: item.name.trim(),
        purpose: item.purpose.trim(),
        keyActions: cleanArray(item.keyActions),
      })),
      userFlow: cleanArray(parsed.productStructure.userFlow),
    },
    technicalPlan: {
      architecture: parsed.technicalPlan.architecture.trim(),
      frontend: {
        approach: parsed.technicalPlan.frontend.approach.trim(),
        responsibilities: cleanArray(
          parsed.technicalPlan.frontend.responsibilities
        ),
      },
      backend: {
        approach: parsed.technicalPlan.backend.approach.trim(),
        responsibilities: cleanArray(
          parsed.technicalPlan.backend.responsibilities
        ),
      },
      ai: {
        needed: parsed.technicalPlan.ai.needed,
        role: parsed.technicalPlan.ai.role.trim(),
        integration: parsed.technicalPlan.ai.integration.trim(),
      },
      storage: {
        approach: parsed.technicalPlan.storage.approach.trim(),
        reason: parsed.technicalPlan.storage.reason.trim(),
      },
      externalServices: parsed.technicalPlan.externalServices.map((item) => ({
        name: item.name.trim(),
        purpose: item.purpose.trim(),
        required: item.required,
      })),
    },
    dataModel: parsed.dataModel.map((item) => ({
      name: item.name.trim(),
      purpose: item.purpose.trim(),
      keyFields: cleanArray(item.keyFields),
    })),
    milestones: parsed.milestones.map((item) => ({
      id: item.id.trim(),
      name: item.name.trim(),
      goal: item.goal.trim(),
      deliverables: cleanArray(item.deliverables),
      acceptance: cleanArray(item.acceptance),
    })),
    tasks: parsed.tasks.map((item) => ({
      id: item.id.trim(),
      milestoneId: item.milestoneId.trim(),
      title: item.title.trim(),
      objective: item.objective.trim(),
      type: item.type,
      dependencies: cleanArray(item.dependencies),
      acceptance: cleanArray(item.acceptance),
      effort: item.effort,
    })),
    validationCheckpoints: parsed.validationCheckpoints.map((item) => ({
      afterMilestone: item.afterMilestone.trim(),
      whatToValidate: item.whatToValidate.trim(),
      signal: item.signal.trim(),
    })),
    executionRisks: parsed.executionRisks.map((item) => ({
      risk: item.risk.trim(),
      impact: item.impact,
      response: item.response.trim(),
    })),
    executionSummary: {
      firstActions: cleanArray(parsed.executionSummary.firstActions),
      definitionOfDone: cleanArray(parsed.executionSummary.definitionOfDone),
      readyForFinalReview:
        parsed.executionSummary.readyForFinalReview,
    },
  };
  return { result, latencyMs };
}

/** Final Review 节点（只读一致性审计，使用默认超时） */
export async function reviewFinal(args: {
  config: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
  productAnalysis: ProductAnalysisResult;
  mvpScoping: MvpScopingResult;
  executionPlanning: ExecutionPlanningResult;
}): Promise<TimedResult<FinalReviewResult>> {
  const { result: parsed, latencyMs } = await generateStructured({
    config: args.config,
    system: FINAL_REVIEW_SYSTEM_PROMPT,
    user: buildFinalReviewPrompt({
      rawIdea: args.rawIdea,
      ideaUnderstanding: args.ideaUnderstanding,
      clarification: args.clarification,
      productAnalysis: args.productAnalysis,
      mvpScoping: args.mvpScoping,
      executionPlanning: args.executionPlanning,
    }),
    jsonSchema: FINAL_REVIEW_JSON_SCHEMA,
    timeoutMs: REQUEST_TIMEOUT_MS,
    guard: isFinalReviewResult,
  });
  const result: FinalReviewResult = {
    verdict: {
      status: parsed.verdict.status,
      summary: parsed.verdict.summary.trim(),
    },
    consistencyChecks: parsed.consistencyChecks
      .map((item) => ({
        dimension: item.dimension.trim(),
        status: item.status,
        finding: item.finding.trim(),
      }))
      .filter((item) => item.dimension && item.finding)
      .slice(0, 7),
    scopeIntegrity: {
      passed: parsed.scopeIntegrity.passed,
      reintroducedItems: cleanArray(parsed.scopeIntegrity.reintroducedItems),
      finding: parsed.scopeIntegrity.finding.trim(),
    },
    factIntegrity: {
      passed: parsed.factIntegrity.passed,
      issues: cleanArray(parsed.factIntegrity.issues),
      finding: parsed.factIntegrity.finding.trim(),
    },
    executionReadiness: {
      passed: parsed.executionReadiness.passed,
      strengths: cleanArray(parsed.executionReadiness.strengths),
      gaps: cleanArray(parsed.executionReadiness.gaps),
    },
    recommendedAdjustments: parsed.recommendedAdjustments
      .map((item) => ({
        priority: item.priority,
        targetStage: item.targetStage,
        adjustment: item.adjustment.trim(),
        reason: item.reason.trim(),
      }))
      .filter((item) => item.adjustment && item.reason)
      .slice(0, 5),
    finalSummary: {
      readyToBuild: parsed.finalSummary.readyToBuild,
      firstAction: parsed.finalSummary.firstAction.trim(),
      keepInMind: cleanArray(parsed.finalSummary.keepInMind).slice(0, 4),
    },
  };
  return { result, latencyMs };
}

function cleanArray(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}
