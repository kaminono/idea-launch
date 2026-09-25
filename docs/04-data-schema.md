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
  | "failed";
```

- `understanding`：已创建项目，尚无成功理解结果
- `understood`：Idea Understanding 成功并已保存（Clarification 未完成）
- `clarified`：Clarification Synthesis 成功，Clarified Context 已保存
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

## 6. Analysis Run（运行记录）

每次调用 AI 节点产生一条运行记录，用于表达当前工作区状态与错误：

```ts
type RunStatus = "running" | "succeeded" | "failed";

interface AnalysisRun {
  id: string;                 // UUID
  stage: WorkflowStage;       // "idea_understanding" 或 "clarification"
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
  clarification?: ClarificationState; // V1 第二阶段新增，旧项目缺省 undefined
  lastRun: AnalysisRun | null; // 最近一次运行（含失败信息）
}
```

约束：

- Project 中**禁止出现 API Key**
- Idea Understanding 成功后写入 `ideaUnderstanding`、`status = "understood"`
- Clarification Synthesis 成功后写入 `clarification.clarifiedContext`、`status = "clarified"`
- ID 使用稳定 UUID（`crypto.randomUUID()`）

### 7.1 旧数据兼容策略（第二阶段）

- localStorage namespace 与 envelope 版本均保持不变（`idea-launch:projects:v1`、`version: 1`）
- `clarification` 为可选字段：存储层运行时守卫接受 `undefined`，旧项目按「信息补全未开始」处理，打开时自动继续
- 不删除、不重命名第一阶段已有字段；不清空、不迁移现有项目数据

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

## 10. 后续工作流预留边界

后续节点（Product Analysis / MVP / Execution / Final）新增字段时：

1. 优先以 `Project` 上新增可选字段的方式扩展（Clarification 即按此策略落地为 `clarification?: ClarificationState`）
2. 不删除、不重命名 V1 已有字段
3. 仅在无法通过可选字段兼容时才升级 envelope `version`，并在存储层实现迁移或安全重置
4. 任何阶段都不得引入服务端持久化或 API Key 落盘
