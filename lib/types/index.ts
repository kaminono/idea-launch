// idea-launch 核心领域类型
// 与 docs/04-data-schema.md 保持一致，是数据契约的代码事实来源。

/** 工作流阶段 */
export type WorkflowStage =
  | "idea_understanding"
  | "clarification"
  | "product_analysis"
  | "mvp_scoping"
  | "execution_planning"
  | "final_review";

/** Project 持久化状态（不持久化瞬时的“分析中”状态） */
export type ProjectStatus =
  | "understanding"
  | "understood"
  | "clarified"
  | "analyzed"
  | "scoped"
  | "failed";

/** AI 运行状态 */
export type RunStatus = "running" | "succeeded" | "failed";

/** AI 错误码（统一七码，Provider-agnostic） */
export type AiErrorCode =
  | "INVALID_API_KEY"
  | "MODEL_NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "INVALID_STRUCTURED_OUTPUT"
  | "PROVIDER_UNAVAILABLE"
  | "BAD_CONFIGURATION";

// ---- 多模型 Provider / Settings V2（定义见 lib/ai/providers/types.ts）----

import type {
  ModelConfig,
  ProviderId,
} from "@/lib/ai/providers/types";

export type {
  Protocol,
  ProviderId,
  StructuredOutputMode,
  Capabilities,
  ModelConfig,
  AdapterRequest,
  AdapterResult,
  AIProviderAdapter,
  ProviderDefinition,
  ProviderConfigV2,
  SettingsV2,
  SettingsV2Envelope,
} from "@/lib/ai/providers/types";

/** Idea Understanding 结构化结果 */
export interface IdeaUnderstanding {
  suggestedName: string;
  oneLineDefinition: string;
  targetUsers: string[];
  coreProblems: string[];
  primaryScenarios: string[];
  knownConstraints: string[];
  assumptions: string[];
  missingInformation: string[];
  clarificationNeeded: boolean;
}

// ---- Clarification（信息补全）----

/** 澄清问题的回答方式 */
export type ClarificationAnswerType =
  | "single_choice"
  | "multi_choice"
  | "text";

/** 选择题的预设选项 */
export interface ClarificationOption {
  value: string;
  label: string;
}

/** 单个澄清问题 */
export interface ClarificationQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  answerType: ClarificationAnswerType;
  options: ClarificationOption[];
  allowCustomAnswer: boolean;
}

/** Question Generation 结构化结果 */
export interface ClarificationQuestions {
  clarificationNeeded: boolean;
  reason: string;
  questions: ClarificationQuestion[];
}

/** 单题答案：选项值与自定义文本并存，由提交方按题型保证语义 */
export interface ClarificationAnswer {
  questionId: string;
  selectedValues: string[];
  customText: string;
}

/** Clarification Synthesis 结构化结果：稳定的产品上下文 */
export interface ClarifiedContext {
  productName: string;
  oneLineDefinition: string;
  targetUsers: string[];
  primaryScenario: string;
  coreProblem: string;
  userGoal: string;
  currentAlternatives: string[];
  explicitConstraints: string[];
  confirmedDecisions: string[];
  remainingAssumptions: string[];
  remainingUnknowns: string[];
  readyForProductAnalysis: boolean;
}

/** Project 上的信息补全状态（旧项目缺省为 undefined） */
export interface ClarificationState {
  needed: boolean;
  reason: string;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
  clarifiedContext: ClarifiedContext | null;
  completedAt: string | null;
}

// ---- Product Analysis（产品分析）----

/** 关键假设的重要程度 */
export type HypothesisImportance = "high" | "medium" | "low";

/** 产品风险类型 */
export type ProductRiskType =
  | "user"
  | "product"
  | "value"
  | "adoption"
  | "business"
  | "execution";

/** 产品风险严重程度 */
export type RiskSeverity = "high" | "medium" | "low";

/** 收敛后的产品定义 */
export interface ProductDefinition {
  name: string;
  oneLineDefinition: string;
  category: string;
  stage: string;
}

/** 第一优先核心用户 */
export interface PrimaryUser {
  description: string;
  context: string;
  primaryGoal: string;
}

/** 核心使用场景 */
export interface CoreScenario {
  trigger: string;
  scenario: string;
  desiredOutcome: string;
}

/** 核心问题分析 */
export interface ProblemAnalysis {
  coreProblem: string;
  rootCauses: string[];
  currentPainPoints: string[];
}

/** 用户当前替代方式 */
export interface CurrentAlternative {
  alternative: string;
  whyUsersUseIt: string;
  limitations: string[];
}

/** 产品价值主张 */
export interface ValueProposition {
  coreValue: string;
  userChange: string;
  differentiationDirection: string;
}

/** 关键产品假设 */
export interface KeyHypothesis {
  hypothesis: string;
  importance: HypothesisImportance;
  validationNeeded: boolean;
  validationIdea: string;
}

/** 产品风险 */
export interface ProductRisk {
  risk: string;
  type: ProductRiskType;
  severity: RiskSeverity;
  reason: string;
}

/** 产品分析收敛总结 */
export interface AnalysisSummary {
  strengths: string[];
  uncertainties: string[];
  mvpFocus: string[];
  readyForMvpScoping: boolean;
}

/** Product Analysis 结构化结果 */
export interface ProductAnalysisResult {
  productDefinition: ProductDefinition;
  primaryUser: PrimaryUser;
  coreScenario: CoreScenario;
  problemAnalysis: ProblemAnalysis;
  currentAlternatives: CurrentAlternative[];
  valueProposition: ValueProposition;
  keyHypotheses: KeyHypothesis[];
  risks: ProductRisk[];
  analysisSummary: AnalysisSummary;
}

/** Project 上的产品分析状态（旧项目缺省为 undefined） */
export interface ProductAnalysisState {
  result: ProductAnalysisResult;
  completedAt: string;
}

// ---- MVP Scoping（MVP 范围收敛）----

/** MVP 风险的影响程度 */
export type MvpRiskImpact = "high" | "medium" | "low";

/** MVP 定义：第一版最重要的目标与边界 */
export interface MvpDefinition {
  goal: string;
  primaryUser: string;
  coreScenario: string;
  coreValue: string;
}

/** 第一版的验证目标 */
export interface ValidationTarget {
  primaryHypothesis: string;
  whyThisFirst: string;
  successSignal: string;
}

/** 最小完整用户闭环 */
export interface CoreLoop {
  entry: string;
  steps: string[];
  outcome: string;
}

/** 第一版必须完成的能力 */
export interface MustHaveFeature {
  name: string;
  userNeed: string;
  reason: string;
  acceptance: string;
}

/** 暂缓开发、但未来可能有价值的能力 */
export interface ShouldDeferFeature {
  name: string;
  reason: string;
  whenToReconsider: string;
}

/** 当前产品方向明确排除的能力 */
export interface OutOfScopeFeature {
  name: string;
  reason: string;
}

/** MVP 实施与验证阶段的风险 */
export interface MvpRisk {
  risk: string;
  impact: MvpRiskImpact;
  response: string;
}

/** MVP 上线后的轻量验证动作 */
export interface ValidationAction {
  action: string;
  signal: string;
}

/** 范围收敛总结：现在做什么 / 不做什么 */
export interface ScopeSummary {
  buildNow: string[];
  doNotBuildNow: string[];
  readyForExecutionPlanning: boolean;
}

/** MVP Scoping 结构化结果 */
export interface MvpScopingResult {
  mvpDefinition: MvpDefinition;
  validationTarget: ValidationTarget;
  coreLoop: CoreLoop;
  mustHave: MustHaveFeature[];
  shouldDefer: ShouldDeferFeature[];
  explicitlyOutOfScope: OutOfScopeFeature[];
  scopeConstraints: string[];
  mvpRisks: MvpRisk[];
  validationPlan: ValidationAction[];
  scopeSummary: ScopeSummary;
}

/** Project 上的 MVP 范围收敛状态（旧项目缺省为 undefined） */
export interface MvpScopingState {
  result: MvpScopingResult;
  completedAt: string;
}

// ---- Execution Planning（执行方案规划）----

/** 执行定义：本轮开发的目标与第一版交付物 */
export interface ExecutionDefinition {
  goal: string;
  deliveryTarget: string;
  primaryUser: string;
  coreScenario: string;
}

/** 用户真正会看到或使用的界面 */
export interface Surface {
  name: string;
  purpose: string;
  keyActions: string[];
}

/** 产品结构：核心界面与最小完整用户路径 */
export interface ProductStructure {
  surfaces: Surface[];
  userFlow: string[];
}

/** 单个技术层的实现方式与职责 */
export interface TechLayer {
  approach: string;
  responsibilities: string[];
}

/** 产品中 AI 能力的边界 */
export interface AiPlan {
  needed: boolean;
  role: string;
  integration: string;
}

/** 存储方案 */
export interface StoragePlan {
  approach: string;
  reason: string;
}

/** 需要接入的外部服务 */
export interface ExternalService {
  name: string;
  purpose: string;
  required: boolean;
}

/** 轻量技术方案 */
export interface TechnicalPlan {
  architecture: string;
  frontend: TechLayer;
  backend: TechLayer;
  ai: AiPlan;
  storage: StoragePlan;
  externalServices: ExternalService[];
}

/** 核心业务数据对象 */
export interface DataObject {
  name: string;
  purpose: string;
  keyFields: string[];
}

/** 开发里程碑 */
export interface Milestone {
  id: string;
  name: string;
  goal: string;
  deliverables: string[];
  acceptance: string[];
}

/** 开发任务类型 */
export type TaskType =
  | "product"
  | "frontend"
  | "backend"
  | "ai"
  | "data"
  | "integration"
  | "test"
  | "release";

/** 任务工作量（不使用精确工时） */
export type TaskEffort = "S" | "M" | "L";

/** 可执行开发任务 */
export interface ExecutionTask {
  id: string;
  milestoneId: string;
  title: string;
  objective: string;
  type: TaskType;
  dependencies: string[];
  acceptance: string[];
  effort: TaskEffort;
}

/** 里程碑后的验证节点 */
export interface ValidationCheckpoint {
  afterMilestone: string;
  whatToValidate: string;
  signal: string;
}

/** 执行阶段风险的影响程度 */
export type ExecutionRiskImpact = "high" | "medium" | "low";

/** 执行阶段风险 */
export interface ExecutionRisk {
  risk: string;
  impact: ExecutionRiskImpact;
  response: string;
}

/** 执行方案收尾：立即行动项与完成定义 */
export interface ExecutionSummary {
  firstActions: string[];
  definitionOfDone: string[];
  readyForFinalReview: boolean;
}

/** Execution Planning 结构化结果 */
export interface ExecutionPlanningResult {
  executionDefinition: ExecutionDefinition;
  productStructure: ProductStructure;
  technicalPlan: TechnicalPlan;
  dataModel: DataObject[];
  milestones: Milestone[];
  tasks: ExecutionTask[];
  validationCheckpoints: ValidationCheckpoint[];
  executionRisks: ExecutionRisk[];
  executionSummary: ExecutionSummary;
}

/** Project 上的执行方案规划状态（旧项目缺省为 undefined） */
export interface ExecutionPlanningState {
  result: ExecutionPlanningResult;
  completedAt: string;
}

// ---- Final Review（最终一致性审计）----

/** 总体结论：只允许 ready / needs_attention，不做量化评分 */
export type FinalReviewVerdictStatus = "ready" | "needs_attention";

/** 单项一致性检查结果 */
export type ConsistencyCheckStatus = "pass" | "warning";

/** Final Review 总体结论 */
export interface FinalReviewVerdict {
  status: FinalReviewVerdictStatus;
  summary: string;
}

/** 固定维度的一致性检查项 */
export interface ConsistencyCheck {
  dimension: string;
  status: ConsistencyCheckStatus;
  finding: string;
}

/** 范围完整性：被砍功能有无回流 */
export interface ScopeIntegrity {
  passed: boolean;
  reintroducedItems: string[];
  finding: string;
}

/** 事实完整性：用户事实 / 模型分析 / 假设有无混淆 */
export interface FactIntegrity {
  passed: boolean;
  issues: string[];
  finding: string;
}

/** 执行准备度 */
export interface ExecutionReadiness {
  passed: boolean;
  strengths: string[];
  gaps: string[];
}

/** 建议调整的优先级 */
export type AdjustmentPriority = "high" | "medium" | "low";

/** 建议调整所针对的阶段（仅允许前四个生产阶段） */
export type AdjustmentTargetStage =
  | "clarification"
  | "product_analysis"
  | "mvp"
  | "execution";

/** 有限修正建议（只读审计，不自动改数据） */
export interface RecommendedAdjustment {
  priority: AdjustmentPriority;
  targetStage: AdjustmentTargetStage;
  adjustment: string;
  reason: string;
}

/** 最终收尾：能否开工、第一件事、重要提醒 */
export interface FinalSummary {
  readyToBuild: boolean;
  firstAction: string;
  keepInMind: string[];
}

/** Final Review 结构化结果（只读一致性审计） */
export interface FinalReviewResult {
  verdict: FinalReviewVerdict;
  consistencyChecks: ConsistencyCheck[];
  scopeIntegrity: ScopeIntegrity;
  factIntegrity: FactIntegrity;
  executionReadiness: ExecutionReadiness;
  recommendedAdjustments: RecommendedAdjustment[];
  finalSummary: FinalSummary;
}

/** Project 上的最终复核状态（旧项目缺省为 undefined） */
export interface FinalReviewState {
  result: FinalReviewResult;
  completedAt: string;
}

/** 运行错误（用户可读、已脱敏） */
export interface RunError {
  code: AiErrorCode;
  message: string;
}

/** 单次 AI 节点运行记录 */
export interface AnalysisRun {
  id: string;
  stage: WorkflowStage;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  error: RunError | null;
}

/** 本地项目 */
export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  rawIdea: string;
  status: ProjectStatus;
  ideaUnderstanding: IdeaUnderstanding | null;
  /** V1 第二阶段新增：旧项目缺省为 undefined，读取时按未开始处理 */
  clarification?: ClarificationState;
  /** V1 第三阶段新增：Product Analysis 完成后写入，旧项目缺省为 undefined */
  productAnalysis?: ProductAnalysisState;
  /** V1 第四阶段新增：MVP Scoping 完成后写入，旧项目缺省为 undefined */
  mvpScoping?: MvpScopingState;
  /** V1 第五阶段新增：Execution Planning 完成后写入，旧项目缺省为 undefined */
  executionPlanning?: ExecutionPlanningState;
  /** V1 第六阶段新增：Final Review 完成后写入，旧项目缺省为 undefined */
  finalReview?: FinalReviewState;
  lastRun: AnalysisRun | null;
}

/** projects localStorage envelope */
export interface ProjectEnvelope {
  version: 1;
  data: Project[];
}

// ---- Route Handler 请求 / 响应契约 ----

export interface TestConnectionRequest {
  modelConfig: ModelConfig;
}

export interface UnderstandRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
}

export interface TestConnectionResult {
  providerId: ProviderId;
  modelId: string;
  latencyMs: number;
}

export interface UnderstandResult {
  ideaUnderstanding: IdeaUnderstanding;
  latencyMs: number;
}

export interface ClarifyQuestionsRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
}

export interface ClarifyQuestionsResult {
  questions: ClarificationQuestions;
  latencyMs: number;
}

export interface ClarifySynthesisRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
}

export interface ClarifySynthesisResult {
  clarifiedContext: ClarifiedContext;
  latencyMs: number;
}

export interface ProductAnalysisRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
}

export interface ProductAnalysisResultResponse {
  productAnalysis: ProductAnalysisResult;
  latencyMs: number;
}

export interface MvpScopingRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
  productAnalysis: ProductAnalysisResult;
}

export interface MvpScopingResultResponse {
  mvpScoping: MvpScopingResult;
  latencyMs: number;
}

export interface ExecutionPlanningRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
  productAnalysis: ProductAnalysisResult;
  mvpScoping: MvpScopingResult;
}

export interface ExecutionPlanningResultResponse {
  executionPlanning: ExecutionPlanningResult;
  latencyMs: number;
}

export interface FinalReviewRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;
  productAnalysis: ProductAnalysisResult;
  mvpScoping: MvpScopingResult;
  executionPlanning: ExecutionPlanningResult;
}

export interface FinalReviewResultResponse {
  finalReview: FinalReviewResult;
  latencyMs: number;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: RunError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
