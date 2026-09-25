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
  | "failed";

/** AI 运行状态 */
export type RunStatus = "running" | "succeeded" | "failed";

/** AI 错误码 */
export type AiErrorCode =
  | "AI_MISSING_KEY"
  | "AI_AUTH_ERROR"
  | "AI_NETWORK_ERROR"
  | "AI_PROVIDER_ERROR"
  | "AI_BAD_REQUEST"
  | "AI_PARSE_ERROR"
  | "AI_INVALID_RESPONSE"
  | "AI_TIMEOUT";

/** 用户设置（API Key 仅存在于本地） */
export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** localStorage envelope：版本化包装 */
export interface SettingsEnvelope {
  version: 1;
  data: Settings;
}

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
  lastRun: AnalysisRun | null;
}

/** projects localStorage envelope */
export interface ProjectEnvelope {
  version: 1;
  data: Project[];
}

// ---- Route Handler 请求 / 响应契约 ----

export interface TestConnectionRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface UnderstandRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
}

export interface TestConnectionResult {
  model: string;
  latencyMs: number;
}

export interface UnderstandResult {
  ideaUnderstanding: IdeaUnderstanding;
  latencyMs: number;
}

export interface ClarifyQuestionsRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
}

export interface ClarifyQuestionsResult {
  questions: ClarificationQuestions;
  latencyMs: number;
}

export interface ClarifySynthesisRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
}

export interface ClarifySynthesisResult {
  clarifiedContext: ClarifiedContext;
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
