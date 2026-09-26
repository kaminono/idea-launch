# 04 · 数据 Schema

> idea-launch 本地数据结构事实来源。所有 TypeScript 类型定义于 `lib/types/`，必须与本文档保持一致。

## 1. 存储概览

V1 使用 `localStorage`，集中封装于 `lib/storage/`，不允许在组件中直接读写。

| Key | 内容 |
|---|---|
| `idea-launch:settings:v1` | 用户设置（API Key / Base URL / Model） |
| `idea-launch:projects:v1` | 全部本地项目 |

版本策略：

- Key 后缀 `:v1` 即数据版本
- 存储内容包含 `version` 字段；版本不匹配或 JSON 损坏时，备份原始值并安全重置为默认值
- SSR 环境无 localStorage：所有读写仅发生在客户端，首屏需要默认值兜底

## 2. Settings

存储形态：

```ts
interface SettingsEnvelope {
  version: 1;
  data: Settings;
}

interface Settings {
  apiKey: string;        // 用户手工输入；仅存本地；禁止进入日志/Project
  baseUrl: string;       // 默认 DEFAULT_BASE_URL
  model: string;         // 默认 DEFAULT_MODEL
}
```

默认值：

```ts
const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/plan/v3";
const DEFAULT_MODEL = "doubao-seed-2.1-pro";
```

AI 层模型目录常量（`lib/ai/config.ts`）：

```ts
interface ModelOption {
  id: string;          // "doubao-seed-2.1-pro"
  label: string;       // "豆包 Seed 2.1 Pro"
  provider: string;    // "Volcengine Ark Agent Plan"
}
```

## 3. 工作流阶段枚举

```ts
type WorkflowStage =
  | "idea_understanding"
  | "clarification"
  | "product_analysis"
  | "mvp_scoping"
  | "execution_planning"
  | "final_review";

// Project 持久化状态（不持久化瞬时的"分析中"状态）
type ProjectStatus =
  | "understanding"
  | "understood"
  | "clarified"
  | "analyzed"
  | "scoped"
  | "failed";
```

- `understanding`：已创建项目，尚无成功理解结果
- `understood`：Idea Understanding 成功并已保存（Clarification 未完成）
- `clarified`：Clarification Synthesis 成功，Clarified Context 已保存
- `analyzed`：Product Analysis 成功，分析结果已保存
- `scoped`：MVP Scoping 成功，第一版范围已保存（Execution Planning 完成后 status 仍保持 `scoped`，执行方案由 `executionPlanning` 字段存在性派生）
- `failed`：最近一次运行失败（保留错误，允许重试）

## 4. Idea Understanding

```ts
interface IdeaUnderstanding {
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
```

字段语义见 [03-ai-workflow.md §3.4](./03-ai-workflow.md)。

## 5. Clarification（信息补全）

### 5.1 问题与答案

```ts
type ClarificationAnswerType = "single_choice" | "multi_choice" | "text";

interface ClarificationOption {
  value: string;
  label: string;
}

interface ClarificationQuestion {
  id: string;
  question: string;              // 自然完整的中文问题
  whyItMatters: string;          // 一句话说明影响
  answerType: ClarificationAnswerType;
  options: ClarificationOption[]; // text 题型为空数组
  allowCustomAnswer: boolean;
}

interface ClarificationQuestions {
  clarificationNeeded: boolean;
  reason: string;
  questions: ClarificationQuestion[]; // 正常 2~4 个，最多 5 个，允许空数组
}

interface ClarificationAnswer {
  questionId: string;
  selectedValues: string[]; // 选中的 option.value；text 题型为空
  customText: string;       // 自定义 / text 回答
}
```

### 5.2 Clarified Context（Synthesis 输出）

```ts
interface ClarifiedContext {
  productName: string;
  oneLineDefinition: string;
  targetUsers: string[];
  primaryScenario: string;
  coreProblem: string;
  userGoal: string;
  currentAlternatives: string[];
  explicitConstraints: string[];     // 仅用户明确说明 / 确认
  confirmedDecisions: string[];      // 仅用户实际确认的方向
  remainingAssumptions: string[];    // 模型推测，必须以「假设：」表达
  remainingUnknowns: string[];       // 仍未知但不阻塞分析，不得编造
  readyForProductAnalysis: boolean;
}
```

### 5.3 Project 上的持久化状态

```ts
interface ClarificationState {
  needed: boolean;                          // 对应 clarificationNeeded
  reason: string;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
  clarifiedContext: ClarifiedContext | null;
  completedAt: string | null;               // Synthesis 成功时间
}
```

### 5.4 Product Analysis（产品分析结果）

```ts
type HypothesisImportance = "high" | "medium" | "low";
type ProductRiskType =
  | "user" | "product" | "value" | "adoption" | "business" | "execution";
type RiskSeverity = "high" | "medium" | "low";

interface ProductDefinition {
  name: string;
  oneLineDefinition: string;
  category: string;            // 普通中文分类
  stage: string;               // 如「概念验证阶段」
}

interface PrimaryUser {
  description: string;         // 第一优先核心用户（分析结论，非用户确认事实）
  context: string;
  primaryGoal: string;
}

interface CoreScenario {
  trigger: string;
  scenario: string;
  desiredOutcome: string;
}

interface ProblemAnalysis {
  coreProblem: string;         // 只聚焦一个最主要问题
  rootCauses: string[];
  currentPainPoints: string[];
}

interface CurrentAlternative {
  alternative: string;
  whyUsersUseIt: string;
  limitations: string[];
}

interface ValueProposition {
  coreValue: string;
  userChange: string;
  differentiationDirection: string; // 仅方向，不声称已形成壁垒
}

interface KeyHypothesis {
  hypothesis: string;
  importance: HypothesisImportance;
  validationNeeded: boolean;
  validationIdea: string;      // 轻量验证建议
}

interface ProductRisk {
  risk: string;
  type: ProductRiskType;
  severity: RiskSeverity;
  reason: string;
}

interface AnalysisSummary {
  strengths: string[];
  uncertainties: string[];
  mvpFocus: string[];          // 只列下一阶段关注点，不列 MVP 功能
  readyForMvpScoping: boolean;
}

interface ProductAnalysisResult {
  productDefinition: ProductDefinition;
  primaryUser: PrimaryUser;
  coreScenario: CoreScenario;
  problemAnalysis: ProblemAnalysis;
  currentAlternatives: CurrentAlternative[];
  valueProposition: ValueProposition;
  keyHypotheses: KeyHypothesis[];   // 正常 3～6 个
  risks: ProductRisk[];             // 正常 3～5 个
  analysisSummary: AnalysisSummary;
}

interface ProductAnalysisState {
  result: ProductAnalysisResult;
  completedAt: string;              // 分析成功时间
}
```

### 5.5 MVP Scoping（MVP 范围收敛结果）

```ts
type MvpRiskImpact = "high" | "medium" | "low";

interface MvpDefinition {
  goal: string;                // 一句话：第一版最重要的目标（可验证）
  primaryUser: string;         // 只保留一个第一优先用户
  coreScenario: string;        // 第一版最重要的核心场景
  coreValue: string;           // 第一版实际交付的核心价值
}

interface ValidationTarget {
  primaryHypothesis: string;   // 正常只有 1 个首要假设
  whyThisFirst: string;
  successSignal: string;       // 可观察行为信号，禁止编造百分比
}

interface CoreLoop {
  entry: string;
  steps: string[];             // 3～6 步，用户视角完整任务闭环
  outcome: string;
}

interface MustHaveFeature {
  name: string;
  userNeed: string;
  reason: string;
  acceptance: string;          // 产品能力描述，不写技术实现
}

interface ShouldDeferFeature {
  name: string;
  reason: string;
  whenToReconsider: string;
}

interface OutOfScopeFeature {
  name: string;
  reason: string;
}

interface MvpRisk {
  risk: string;
  impact: MvpRiskImpact;
  response: string;
}

interface ValidationAction {
  action: string;
  signal: string;
}

interface ScopeSummary {
  buildNow: string[];
  doNotBuildNow: string[];
  readyForExecutionPlanning: boolean;
}

interface MvpScopingResult {
  mvpDefinition: MvpDefinition;
  validationTarget: ValidationTarget;
  coreLoop: CoreLoop;
  mustHave: MustHaveFeature[];            // 正常 3～6 个（最多 7）
  shouldDefer: ShouldDeferFeature[];      // 正常 2～5 个
  explicitlyOutOfScope: OutOfScopeFeature[]; // 正常 1～5 个
  scopeConstraints: string[];
  mvpRisks: MvpRisk[];                    // 正常 2～4 个
  validationPlan: ValidationAction[];     // 正常 2～4 个
  scopeSummary: ScopeSummary;
}

interface MvpScopingState {
  result: MvpScopingResult;
  completedAt: string;                    // 收敛成功时间
}
```

### 5.6 Execution Planning（执行方案规划结果）

```ts
interface ExecutionDefinition {
  goal: string;                  // 本轮开发要达成的目标
  deliveryTarget: string;        // 第一版实际交付物
  primaryUser: string;
  coreScenario: string;
}

interface Surface {
  name: string;                  // MVP 真正需要的界面
  purpose: string;
  keyActions: string[];
}

interface ProductStructure {
  surfaces: Surface[];
  userFlow: string[];            // 3～8 步，用户视角最小完整路径
}

interface TechLayer {
  approach: string;
  responsibilities: string[];
}

interface AiPlan {
  needed: boolean;               // MVP 不需要 AI 时为 false
  role: string;
  integration: string;
}

interface StoragePlan {
  approach: string;
  reason: string;
}

interface ExternalService {
  name: string;
  purpose: string;
  required: boolean;
}

interface TechnicalPlan {
  architecture: string;
  frontend: TechLayer;
  backend: TechLayer;
  ai: AiPlan;
  storage: StoragePlan;
  externalServices: ExternalService[];
}

interface DataObject {
  name: string;                  // 核心业务数据对象，2～6 个
  purpose: string;
  keyFields: string[];
}

interface Milestone {
  id: string;                    // 如 M1，3～6 个
  name: string;
  goal: string;
  deliverables: string[];
  acceptance: string[];
}

type TaskType =
  | "product" | "frontend" | "backend" | "ai"
  | "data" | "integration" | "test" | "release";
type TaskEffort = "S" | "M" | "L";

interface ExecutionTask {
  id: string;                    // 如 T01，8～18 个
  milestoneId: string;           // 引用本次输出存在的 Milestone.id
  title: string;
  objective: string;
  type: TaskType;
  dependencies: string[];        // 仅引用本次输出存在的任务 ID
  acceptance: string[];          // 可人工判断的完成条件
  effort: TaskEffort;
}

interface ValidationCheckpoint {
  afterMilestone: string;        // 2～4 个
  whatToValidate: string;
  signal: string;
}

type ExecutionRiskImpact = "high" | "medium" | "low";

interface ExecutionRisk {
  risk: string;                  // 2～4 项
  impact: ExecutionRiskImpact;
  response: string;
}

interface ExecutionSummary {
  firstActions: string[];        // 3～5 项有序、立即可开始
  definitionOfDone: string[];    // 3～6 项，第一版做到这里就停
  readyForFinalReview: boolean;
}

interface ExecutionPlanningResult {
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

interface ExecutionPlanningState {
  result: ExecutionPlanningResult;
  completedAt: string;                    // 执行方案生成成功时间
}
```

### 5.7 Final Review（最终一致性审计结果）

```ts
type FinalVerdict = "ready" | "needs_attention";
type CheckStatus = "pass" | "warning";
type AdjustmentSeverity = "high" | "medium" | "low";
type AdjustmentTarget =
  | "clarification"
  | "product_analysis"
  | "mvp"
  | "execution";

interface ConsistencyCheck {
  item: string;                   // 5～7 项
  status: CheckStatus;
  detail: string;
}

interface ReintroducedItem {
  item: string;                   // 被排除能力回流；否定语境不算回流
  appearsIn: string;
  reason: string;
}

interface FactIssue {
  issue: string;                  // 事实漂移 / 编造用户确认
  basis: string;
}

interface ScopeIntegrity {
  passed: boolean;
  reintroducedItems: ReintroducedItem[];
  finding: string;
}

interface FactIntegrity {
  passed: boolean;
  issues: FactIssue[];
  finding: string;
}

interface ExecutionReadiness {
  passed: boolean;
  strengths: string[];
  gaps: string[];
}

interface RecommendedAdjustment {
  target: AdjustmentTarget;
  severity: AdjustmentSeverity;
  issue: string;
  suggestion: string;             // 只建议，不自动修改
}

interface FinalSummary {
  readyToBuild: boolean;
  firstAction: string;            // 必须来自 firstActions 之一
  keepInMind: string[];           // 2～4 条
}

interface FinalReviewResult {
  verdict: FinalVerdict;          // 无分数
  consistencyChecks: ConsistencyCheck[];
  scopeIntegrity: ScopeIntegrity;
  factIntegrity: FactIntegrity;
  executionReadiness: ExecutionReadiness;
  recommendedAdjustments: RecommendedAdjustment[]; // 0～5 条
  finalSummary: FinalSummary;
}

interface FinalReviewState {
  result: FinalReviewResult;
  completedAt: string;                    // 审计成功时间
}
```

## 6. Analysis Run（运行记录）

每次调用 AI 节点产生一条运行记录，用于表达当前工作区状态与错误：

```ts
type RunStatus = "running" | "succeeded" | "failed";

interface AnalysisRun {
  id: string;                 // UUID
  stage: WorkflowStage;       // 六个枚举值之一，如 "mvp_scoping" / "execution_planning"
  status: RunStatus;
  startedAt: string;          // ISO 时间
  finishedAt: string | null;  // ISO 时间
  durationMs: number | null;
  error: RunError | null;
}

interface RunError {
  code: AiErrorCode;
  message: string;            // 用户可读、已脱敏
}
```

## 7. Project

```ts
interface ProjectEnvelope {
  version: 1;
  data: Project[];
}

interface Project {
  id: string;                  // UUID
  createdAt: string;           // ISO
  updatedAt: string;           // ISO
  rawIdea: string;             // 用户原始想法
  status: ProjectStatus;
  ideaUnderstanding: IdeaUnderstanding | null;
  clarification?: ClarificationState;   // V1 第二阶段新增，旧项目缺省 undefined
  productAnalysis?: ProductAnalysisState; // V1 第三阶段新增，旧项目缺省 undefined
  mvpScoping?: MvpScopingState;         // V1 第四阶段新增，旧项目缺省 undefined
  executionPlanning?: ExecutionPlanningState; // V1 第五阶段新增，旧项目缺省 undefined
  finalReview?: FinalReviewState;       // V1 第六阶段新增，旧项目缺省 undefined
  lastRun: AnalysisRun | null; // 最近一次运行（含失败信息）
}
```

约束：

- Project 中**禁止出现 API Key**
- Idea Understanding 成功后写入 `ideaUnderstanding`、`status = "understood"`
- Clarification Synthesis 成功后写入 `clarification.clarifiedContext`、`status = "clarified"`
- Product Analysis 成功后写入 `productAnalysis`、`status = "analyzed"`
- MVP Scoping 成功后写入 `mvpScoping`、`status = "scoped"`
- Execution Planning 成功后写入 `executionPlanning`，`status` 保持 `"scoped"` 不变
- Final Review 成功后写入 `finalReview`，`status` 继续保持 `"scoped"` 不变；审计只读，不回写任何上游字段
- ID 使用稳定 UUID（`crypto.randomUUID()`）

### 7.1 旧数据兼容策略（第二～六阶段）

- localStorage namespace 与 envelope 版本均保持不变（`idea-launch:projects:v1`、`version: 1`）
- `clarification` 为可选字段：存储层运行时守卫接受 `undefined`，旧项目按「信息补全未开始」处理，打开时自动继续
- `productAnalysis` 同为可选字段：守卫接受 `undefined`，旧项目按「产品分析未开始」处理；Clarified Context 已存在的旧项目打开后可手动开始分析
- `mvpScoping` 同为可选字段：守卫接受 `undefined`，旧项目按「MVP 未开始」处理；Product Analysis 已存在的旧项目打开后可手动开始收敛
- `executionPlanning` 同为可选字段：守卫接受 `undefined`，旧项目按「执行方案未开始」处理；MVP Scoping 已存在的旧项目打开后可手动生成执行方案
- `finalReview` 同为可选字段：守卫接受 `undefined`，旧项目按「最终审计未开始」处理；Execution Planning 已存在的旧项目打开后可手动开始最终一致性审计
- 不删除、不重命名已有字段；不清空、不迁移现有项目数据

## 8. API 请求 / 响应契约

### 8.1 连接测试 `POST /api/ai/test`

请求：

```ts
interface TestConnectionRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
}
```

成功响应：

```ts
interface ApiSuccess<T> { ok: true; data: T; }

interface TestConnectionResult {
  model: string;
  latencyMs: number;
}
```

失败响应：

```ts
interface ApiFailure {
  ok: false;
  error: { code: AiErrorCode; message: string };
}
```

### 8.2 想法理解 `POST /api/ai/understand`

请求：

```ts
interface UnderstandRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
}
```

成功响应 `data`：

```ts
interface UnderstandResult {
  ideaUnderstanding: IdeaUnderstanding;
  latencyMs: number;
}
```

### 8.3 澄清问题生成 `POST /api/ai/clarify/questions`

请求：

```ts
interface ClarifyQuestionsRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
}
```

成功响应 `data`：

```ts
interface ClarifyQuestionsResult {
  questions: ClarificationQuestions;
  latencyMs: number;
}
```

### 8.4 上下文综合 `POST /api/ai/clarify/synthesize`

请求：

```ts
interface ClarifySynthesisRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
}
```

成功响应 `data`：

```ts
interface ClarifySynthesisResult {
  clarifiedContext: ClarifiedContext;
  latencyMs: number;
}
```

任一问题缺少有效答案时返回 `AI_BAD_REQUEST`（「还有问题没有回答，请补充后再提交。」）；空 `questions`（0 题自动路径）合法。

### 8.5 产品分析 `POST /api/ai/analyze/product`

请求：

```ts
interface ProductAnalysisRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState; // clarifiedContext 必须非 null
}
```

成功响应 `data`：

```ts
interface ProductAnalysisResultResponse {
  productAnalysis: ProductAnalysisResult;
  latencyMs: number;
}
```

`clarification.clarifiedContext` 为 `null` 时返回 `AI_BAD_REQUEST`（「缺少已确认的 Clarified Context，无法进行产品分析。」）。

### 8.6 MVP 范围收敛 `POST /api/ai/scope/mvp`

请求：

```ts
interface MvpScopingRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;      // clarifiedContext 必须非 null
  productAnalysis: ProductAnalysisResult; // 最主要输入，必须存在
}
```

成功响应 `data`：

```ts
interface MvpScopingResultResponse {
  mvpScoping: MvpScopingResult;
  latencyMs: number;
}
```

`clarification.clarifiedContext` 为 `null` 或 `productAnalysis` 缺失时返回 `AI_BAD_REQUEST`。

### 8.7 执行方案规划 `POST /api/ai/plan/execution`

请求：

```ts
interface ExecutionPlanningRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;       // clarifiedContext 必须非 null
  productAnalysis: ProductAnalysisResult;  // 必须存在
  mvpScoping: MvpScopingResult;            // 最高优先级输入，必须存在
}
```

成功响应 `data`：

```ts
interface ExecutionPlanningResultResponse {
  executionPlanning: ExecutionPlanningResult;
  latencyMs: number;
}
```

错误处理：`clarification.clarifiedContext` 为 `null` 时返回 `AI_BAD_REQUEST`（「缺少已确认的 Clarified Context，无法生成执行方案。」）；`rawIdea` 为空时返回「缺少产品想法，无法生成执行方案。」；`productAnalysis` / `mvpScoping` 缺失或请求体不满足运行时守卫时返回通用 `AI_BAD_REQUEST`；未配置 Key 返回 `AI_MISSING_KEY`。

### 8.8 最终一致性审计 `POST /api/ai/review/final`

请求：

```ts
interface FinalReviewRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;       // clarifiedContext 必须非 null
  productAnalysis: ProductAnalysisResult;  // 必须存在
  mvpScoping: MvpScopingResult;            // 必须存在
  executionPlanning: ExecutionPlanningResult; // 必须存在
}
```

成功响应 `data`：

```ts
interface FinalReviewResultResponse {
  finalReview: FinalReviewResult;
  latencyMs: number;
}
```

错误处理：仅用户手动触发；`clarifiedContext` 或 `executionPlanning` 缺失时返回 `AI_BAD_REQUEST`（可读中文提示）；请求使用默认 `REQUEST_TIMEOUT_MS` 120000ms；模型输出经 `FINAL_REVIEW_JSON_SCHEMA` 严格校验，失败返回 `AI_INVALID_RESPONSE`。失败不写入 `finalReview`，全部上游结果保留，可手动重试。

## 9. 错误码

```ts
type AiErrorCode =
  | "AI_MISSING_KEY"          // 未配置 API Key
  | "AI_AUTH_ERROR"           // Key 无效 / 鉴权失败
  | "AI_NETWORK_ERROR"        // 网络失败 / 无法连接
  | "AI_PROVIDER_ERROR"       // Agent Plan 返回错误（限流/服务端）
  | "AI_BAD_REQUEST"          // 请求参数问题
  | "AI_PARSE_ERROR"          // JSON 解析失败
  | "AI_INVALID_RESPONSE"     // 输出结构不符合 Schema
  | "AI_TIMEOUT";             // 请求超时
```

## 10. V1 扩展边界（V1 Complete）

V1 六个节点（含 Final Review）已全部实现，均以 `Project` 可选字段方式扩展。后续如需新增字段：

1. 优先以 `Project` 上新增可选字段的方式扩展（Clarification / Final Review 即按此策略落地）
2. 不删除、不重命名 V1 已有字段
3. 仅在无法通过可选字段兼容时才升级 envelope `version`，并在存储层实现迁移或安全重置
4. 任何阶段都不得引入服务端持久化或 API Key 落盘
