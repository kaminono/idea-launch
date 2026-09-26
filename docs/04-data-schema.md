# 04 · 数据 Schema

> idea-launch 本地数据结构事实来源。所有 TypeScript 类型定义于 `lib/types/`，必须与本文档保持一致。

## 1. 存储概览

业务数据使用 `localStorage`，集中封装于 `lib/storage/`，不允许在组件中直接读写。

| Key | 内容 | 状态 |
|---|---|---|
| `idea-launch:settings:v2` | 用户设置 V2（多 Provider 配置 + 当前激活 Provider） | 当前版本 |
| `idea-launch:settings:v1` | 旧版单模型设置（API Key / Base URL / Model） | 迁移来源；迁移后保留不删除 |
| `idea-launch:projects:v1` | 全部本地项目 | 不变 |

版本策略：

- Key 后缀即数据版本（Settings V2 为 `:v2`，Projects 仍为 `:v1`）
- 存储内容包含 `version` 字段；版本不匹配或 JSON 损坏时，隔离损坏数据并安全重置为默认值，不让页面崩溃
- SSR 环境无 localStorage：所有读写仅发生在客户端，首屏返回 `null` 并以默认值兜底

## 2. Settings V2（多 Provider）

类型定义于 `lib/ai/providers/types.ts`，存储封装于 `lib/storage/settings-v2.ts`。

### 2.1 存储形态

```ts
interface SettingsV2Envelope {
  version: 2;
  data: SettingsV2;
}

interface SettingsV2 {
  activeProviderId: ProviderId;                               // 当前激活的 Provider
  providerConfigs: Partial<Record<ProviderId, ProviderConfigV2>>; // 各 Provider 独立配置，切换不清空
}

interface ProviderConfigV2 {
  providerId: ProviderId;
  apiKey: string;   // 用户手工输入；仅存本地；禁止进入日志 / Project / 错误信息
  baseUrl: string;  // 内置 Provider 强制以 Registry 默认值为准；custom 保留用户输入
  modelId: string;  // 可自由编辑，Registry 仅提供少量推荐值
  protocol: Protocol;
}

type ProviderId = "volcengine" | "openai" | "anthropic" | "gemini" | "custom";

type Protocol =
  | "openai-responses"
  | "openai-chat-completions"
  | "anthropic-messages"
  | "gemini-generate-content";
```

归一化规则（写入 / 读取时执行）：

- 内置 Provider 的持久化只信任 `apiKey` 与 `modelId`；`baseUrl` / `protocol` 始终以 Provider Registry 为准，防止本地篡改指向非预期端点
- `custom` 保留用户填写的 `baseUrl`（trim 后），`protocol` 必须命中四种白名单之一，非法值回退默认 `openai-chat-completions`
- 默认设置：`activeProviderId = "volcengine"`，内置默认 Base URL 与模型：

```ts
const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/plan/v3";
const DEFAULT_MODEL = "doubao-seed-evolving";
```

### 2.2 Provider Registry（`lib/ai/providers/registry.ts`）

内置 Provider 静态定义，字段：`id` / `name` / `description` / `protocol` / `defaultBaseUrl` / `modelSuggestions`（少量推荐，可编辑）/ `capabilities.structuredOutput`（`native` / `compatible` / `fallback`）/ `badgePrefix`（工作区动态徽标前缀）。

| Provider ID | 名称 | Protocol | 结构化能力 | 说明 |
|---|---|---|---|---|
| `volcengine` | 火山方舟（豆包） | `openai-responses` | native | 默认 Provider；Responses API + `store:false` + thinking disabled |
| `openai` | OpenAI | `openai-responses` | native | 少量推荐模型，Model ID 可编辑 |
| `anthropic` | Anthropic | `anthropic-messages` | fallback | JSON-only Prompt + 运行时校验 |
| `gemini` | Google Gemini | `gemini-generate-content` | compatible | JSON mode + 运行时校验 |
| `custom` | 自定义（OpenAI 兼容） | `openai-chat-completions` | compatible | Qwen / DeepSeek / Kimi 等均走此项，不设专用 Adapter；Base URL / Protocol 可在高级设置中修改 |

### 2.3 请求期配置 ModelConfig

每次模型请求由浏览器把当前激活 Provider 的配置临时随请求体发送，Route Handler 不持久化、不记录：

```ts
interface ModelConfig {
  providerId: ProviderId;
  apiKey: string;
  baseUrl: string;
  modelId: string;
  protocol: Protocol;
}
```

### 2.4 V1 → V2 惰性迁移

- 浏览器端读取设置时：若 `idea-launch:settings:v2` 不存在且 `idea-launch:settings:v1` 存在，执行一次迁移
- 映射：V1 `{ apiKey, baseUrl, model }` → V2 `activeProviderId: "volcengine"`，`providerConfigs.volcengine = { providerId: "volcengine", apiKey, baseUrl: baseUrl || DEFAULT_BASE_URL, modelId: model || DEFAULT_MODEL, protocol: "openai-responses" }`
- 迁移流程：读 V1 → 映射归一化 → 写入 V2 envelope → 立即读回校验；校验失败则不启用迁移结果
- **V1 原始数据保留不删除**；清空设置（`clearSettingsV2`）时同时删除 V1 与 V2 两个 key
- SSR 环境不迁移（`loadSettingsV2` 返回 `null`）

## 2.5 旧版 Settings V1（仅迁移用途）

```ts
interface SettingsEnvelope {
  version: 1;
  data: Settings;
}

interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
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

所有 Route Handler 统一约定：

- 请求体第一个字段为 `modelConfig: ModelConfig`（定义见 §2.3）；Route 先校验配置与业务输入，再交给 AI Runtime，不感知 Provider 差异
- 统一响应：

```ts
interface ApiSuccess<T> { ok: true; data: T; }
interface ApiFailure { ok: false; error: RunError; } // RunError { code: AiErrorCode; message: string }
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
```

- 错误信息一律为面向用户的中文脱敏文案，不回显 API Key / Authorization / 请求头 / 请求体 / 原始错误全文

### 8.1 连接测试 `POST /api/ai/test`

```ts
interface TestConnectionRequest { modelConfig: ModelConfig; }

interface TestConnectionResult {
  providerId: ProviderId;
  modelId: string;
  latencyMs: number;
}
```

走完整链路：端点可达 → Key 有效 → Model 可用 → 能完成最小结构化请求（`{"ok":true}`）；成功仅返回 Provider ID / Model ID / 耗时。

### 8.2 想法理解 `POST /api/ai/understand`

```ts
interface UnderstandRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
}

interface UnderstandResult {
  ideaUnderstanding: IdeaUnderstanding;
  latencyMs: number;
}
```

### 8.3 澄清问题生成 `POST /api/ai/clarify/questions`

```ts
interface ClarifyQuestionsRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
}

interface ClarifyQuestionsResult {
  questions: ClarificationQuestions;
  latencyMs: number;
}
```

### 8.4 上下文综合 `POST /api/ai/clarify/synthesize`

```ts
interface ClarifySynthesisRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
}

interface ClarifySynthesisResult {
  clarifiedContext: ClarifiedContext;
  latencyMs: number;
}
```

任一问题缺少有效答案时返回 `BAD_CONFIGURATION`（「还有问题没有回答，请补充后再提交。」）；空 `questions`（0 题自动路径）合法。

### 8.5 产品分析 `POST /api/ai/analyze/product`

```ts
interface ProductAnalysisRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState; // clarifiedContext 必须非 null
}

interface ProductAnalysisResultResponse {
  productAnalysis: ProductAnalysisResult;
  latencyMs: number;
}
```

`clarification.clarifiedContext` 为 `null` 时返回 `BAD_CONFIGURATION`（「缺少已确认的 Clarified Context，无法进行产品分析。」）。

### 8.6 MVP 范围收敛 `POST /api/ai/scope/mvp`

```ts
interface MvpScopingRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;      // clarifiedContext 必须非 null
  productAnalysis: ProductAnalysisResult; // 最主要输入，必须存在
}

interface MvpScopingResultResponse {
  mvpScoping: MvpScopingResult;
  latencyMs: number;
}
```

`clarification.clarifiedContext` 为 `null` 或 `productAnalysis` 缺失时返回 `BAD_CONFIGURATION`。

### 8.7 执行方案规划 `POST /api/ai/plan/execution`

```ts
interface ExecutionPlanningRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;       // clarifiedContext 必须非 null
  productAnalysis: ProductAnalysisResult;  // 必须存在
  mvpScoping: MvpScopingResult;            // 最高优先级输入，必须存在
}

interface ExecutionPlanningResultResponse {
  executionPlanning: ExecutionPlanningResult;
  latencyMs: number;
}
```

错误处理：`clarification.clarifiedContext` 为 `null` 时返回 `BAD_CONFIGURATION`（「缺少已确认的 Clarified Context，无法生成执行方案。」）；`rawIdea` 为空时返回「缺少产品想法，无法生成执行方案。」；`productAnalysis` / `mvpScoping` 缺失或请求体不满足运行时守卫时同样返回 `BAD_CONFIGURATION`。本节点动作级超时 180000ms。

### 8.8 最终一致性审计 `POST /api/ai/review/final`

```ts
interface FinalReviewRequest {
  modelConfig: ModelConfig;
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;         // clarifiedContext 必须非 null
  productAnalysis: ProductAnalysisResult;    // 必须存在
  mvpScoping: MvpScopingResult;              // 必须存在
  executionPlanning: ExecutionPlanningResult; // 必须存在
}

interface FinalReviewResultResponse {
  finalReview: FinalReviewResult;
  latencyMs: number;
}
```

仅用户手动触发；`clarifiedContext` 或 `executionPlanning` 缺失时返回 `BAD_CONFIGURATION`（可读中文提示）；动作级超时使用默认 120000ms；模型输出经运行时 Schema 校验，一次修复后仍失败返回 `INVALID_STRUCTURED_OUTPUT`。失败不写入 `finalReview`，全部上游结果保留，可手动重试。

## 9. 错误码（统一七码，Provider-agnostic）

错误归一化集中于 `lib/ai/errors.ts`，HTTP 状态映射集中于 `lib/ai/http.ts`。

```ts
type AiErrorCode =
  | "INVALID_API_KEY"            // Key 无效 / 鉴权失败（401 / 403）
  | "MODEL_NOT_FOUND"            // 模型 ID 不存在（404）
  | "RATE_LIMITED"               // 触发限流（429）
  | "TIMEOUT"                     // 请求超时（408 / 504）
  | "INVALID_STRUCTURED_OUTPUT"  // JSON 解析 / Schema 校验在一次修复后仍失败
  | "PROVIDER_UNAVAILABLE"       // Provider 服务端错误（5xx）/ 网络不可达兜底
  | "BAD_CONFIGURATION";         // 本地配置或请求参数问题（缺 Key、缺上游产物等；400）
```

HTTP 状态映射：`BAD_CONFIGURATION` → 400、`INVALID_API_KEY` → 401、`TIMEOUT` → 504，其余四码 → 502。所有错误响应只携带 `code` 与中文 `message`，不转发 Provider 原始错误全文。

## 10. V1 扩展边界（V1 Complete）

V1 六个节点（含 Final Review）已全部实现，均以 `Project` 可选字段方式扩展。后续如需新增字段：

1. 优先以 `Project` 上新增可选字段的方式扩展（Clarification / Final Review 即按此策略落地）
2. 不删除、不重命名 V1 已有字段
3. 仅在无法通过可选字段兼容时才升级 envelope `version`，并在存储层实现迁移或安全重置
4. 任何阶段都不得引入服务端持久化或 API Key 落盘
