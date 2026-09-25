# 03 · AI Workflow

> 定义 idea-launch 的 AI 工作流契约。**当前实现节点 1 Idea Understanding 与节点 2 Clarification（拆为 Question Generation / Synthesis 两个模型动作）。**

## 1. 设计原则

1. **分节点、分步执行**：禁止把整个流程设计成一次超长 Prompt 一次生成所有内容。
2. **每节点有清晰输入与结构化输出**：输入是上游工件 + 用户补充；输出是经 JSON Schema 约束的结构化数据。
3. **事实与假设分离**：模型推断内容必须显式标注为假设，不能伪装成用户确认的事实。
4. **不越界**：每个节点只完成本节点职责，不提前生成下游产物。
5. **不展示思维链**：前端只展示产品级运行状态，不展示模型私有 Chain of Thought。
6. **可重复、可恢复**：节点产物写入本地 Project，刷新后可恢复；失败可重试。

## 2. 完整节点定义（规划）

| # | 节点 | 英文标识 | 主要输入 | 结构化输出 |
|---|---|---|---|---|
| 1 | 产品想法理解 | `idea_understanding` | `rawIdea`（原始想法文本） | IdeaUnderstanding |
| 2 | 信息补全 | `clarification` | IdeaUnderstanding + 用户回答（拆为 Question Generation / Synthesis 两个模型动作） | ClarificationQuestions → ClarifiedContext |
| 3 | 产品分析 | `product_analysis` | 节点 1+2 产物 | 用户/场景/价值分析 |
| 4 | MVP 范围收敛 | `mvp_scoping` | 节点 1–3 产物 | MVP 功能边界 |
| 5 | 执行方案规划 | `execution_planning` | 节点 1–4 产物 | 技术路径 + 任务拆解 |
| 6 | 最终复核 | `final_review` | 全部上游产物 | 最终立项方案 |

节点按顺序解锁；左侧导航允许回看已完成节点。

## 3. 节点 1：Idea Understanding（已实现）

### 3.1 目标

理解当前产品想法、提取已有信息、识别关键假设和信息缺口，为后续澄清与产品分析建立可靠上下文。

### 3.2 输入

- 用户原始想法文本 `rawIdea`（必填，非空）

### 3.3 System Prompt 要点

- 明确声明：正在执行产品立项流程的**第一个阶段**
- 任务只负责理解想法、提取已有信息、识别关键假设与信息缺口
- 不得把用户未提供的信息当成确定事实
- 可以提出合理假设，但必须明确其为假设
- 不直接生成完整 PRD、不生成开发方案、不扩展成泛泛商业计划书

完整 Prompt 集中维护于 `lib/ai/prompts.ts`。

### 3.4 结构化输出 Schema

```json
{
  "suggestedName": "string —— 临时项目名称",
  "oneLineDefinition": "string —— 一句完整中文定义这个产品",
  "targetUsers": ["string —— 当前能合理推断的主要用户"],
  "coreProblems": ["string —— 最重要的问题，不泛化"],
  "primaryScenarios": ["string —— 真实使用场景"],
  "knownConstraints": ["string —— 用户明确说明或可直接确认的约束"],
  "assumptions": ["string —— 模型推断内容，必须标注为假设"],
  "missingInformation": ["string —— 真正影响立项结论的信息缺口"],
  "clarificationNeeded": "boolean —— 是否需要继续补充关键信息"
}
```

字段约束：

- `suggestedName`：根据想法生成简短临时名称
- `missingInformation`：只列高价值问题，不追求数量
- 所有数组项必须去重、具体、可阅读
- Schema 集中维护于 `lib/ai/schemas.ts`，TypeScript 类型见 [04-data-schema.md](./04-data-schema.md)

### 3.5 调用方式

- 端点：`POST {baseUrl}/responses`（Agent Plan 默认 `https://ark.cn-beijing.volces.com/api/plan/v3`）
- 模型：`doubao-seed-2.1-pro`
- 使用 Responses API 的 `text.format`（`json_schema`、`strict: true`）约束结构化输出
- `thinking: { type: "disabled" }`：本节点是结构化提取任务，关闭深度思考以降低直播时延
- `store: false`：请求内容不在服务端持久化

### 3.6 运行时校验（失败闭环）

即使开启 strict，仍对返回文本做：

1. JSON 解析（容忍模型包裹 ```json 代码块的情况）
2. 逐字段运行时类型校验
3. 校验失败 → 抛出结构化错误（`AI_INVALID_RESPONSE`），前端展示可读错误并允许重试

禁止用假数据、默认填充值掩盖真实模型调用或解析失败。

## 4. 节点 2：Clarification（已实现）

Clarification 拆为两个独立模型动作，禁止合并为一次调用。

### 4.1 动作 A：Clarification Question Generation

- 输入：`rawIdea` + `ideaUnderstanding`
- 职责：只判断还缺什么真正重要的信息；不生成 PRD、不做市场研究、不提前生成 MVP / 技术架构 / 开发计划
- 问题数量：正常 2 ～ 4 个，最多 5 个；信息已足够时允许 0 个（`clarificationNeeded = false` 或空 `questions`）
- 结构化输出 Schema：

```json
{
  "clarificationNeeded": "boolean",
  "reason": "string —— 为什么需要 / 不需要补充，一句话",
  "questions": [
    {
      "id": "string",
      "question": "string —— 自然完整的中文问题",
      "whyItMatters": "string —— 一句话说明影响，不暴露思维链",
      "answerType": "single_choice | multi_choice | text",
      "options": [{ "value": "string", "label": "string" }],
      "allowCustomAnswer": "boolean"
    }
  ]
}
```

- 选项规则：选择题建议 2 ～ 5 个选项，合理时提供「还没有确定」类选项（不机械添加）；预设选项不能覆盖时 `allowCustomAnswer = true`

### 4.2 动作 B：Clarification Synthesis

- 输入：`rawIdea` + `ideaUnderstanding` + `questions` + `answers`
- 职责：把用户已经明确的信息整理成稳定上下文；不新增下游产物
- 事实边界（Prompt 强制约束）：
  - `explicitConstraints` / `confirmedDecisions` 只能来自用户原始输入与 Clarification 回答中明确确认的信息，模型不能自行补充
  - `remainingAssumptions` 仍属模型推测，必须以「假设：」表达
  - `remainingUnknowns` 记录本阶段后依然未知、但已不阻塞产品分析的信息；不得为填满字段编造
- 结构化输出 ClarifiedContext，字段见 [04-data-schema.md §5](./04-data-schema.md)

### 4.3 调用与校验

- 两个动作均使用 `doubao-seed-2.1-pro`、Responses API `json_schema`（strict），`thinking: { type: "disabled" }`、`store: false`
- Route Handler：`POST /api/ai/clarify/questions`、`POST /api/ai/clarify/synthesize`
- 运行时清洗：丢弃空问题 / 空选项、问题数截断为最多 5 个；`clarificationNeeded = true` 却无有效问题时按非法输出处理
- Synthesis 路由逐题校验答案完整性（0 题路径合法）；失败允许重试，已填答案不丢失

## 5. 后续节点边界（仅预留，不实现）

### 5.1 Product Analysis

- 输出：`{ personas: [], scenarios: [], valuePropositions: [], differentiation: [] }`

### 5.2 MVP Scoping

- 输出：`{ inScope: [], outOfScope: [], successCriteria: [], keyMetrics: [] }`

### 5.3 Execution Planning

- 输出：`{ techStackRecommendation: [], risks: [], milestones: [], tasks: [{id, title, description, phase}] }`

### 5.4 Final Review

- 输出：汇总全部工件的立项方案（支持 Markdown 导出，后续实现）

> 后续节点新增字段时，必须同步更新 `docs/04-data-schema.md` 与 `lib/types/`，并保证旧版本地数据可被安全读取或重置。
