# 03 · AI Workflow

> 定义 idea-launch 的 AI 工作流契约。**V1 六个节点已全部实现：节点 1 Idea Understanding、节点 2 Clarification（拆为 Question Generation / Synthesis 两个模型动作）、节点 3 Product Analysis、节点 4 MVP Scoping、节点 5 Execution Planning、节点 6 Final Review（最终一致性审计）。V1 Complete。**

## 1. 设计原则

1. **分节点、分步执行**：禁止把整个流程设计成一次超长 Prompt 一次生成所有内容。
2. **每节点有清晰输入与结构化输出**：输入是上游工件 + 用户补充；输出是经 JSON Schema 约束的结构化数据。
3. **事实与假设分离**：模型推断内容必须显式标注为假设，不能伪装成用户确认的事实。
4. **不越界**：每个节点只完成本节点职责，不提前生成下游产物。
5. **不展示思维链**：前端只展示产品级运行状态，不展示模型私有 Chain of Thought。
6. **可重复、可恢复**：节点产物写入本地 Project，刷新后可恢复；失败可重试。

## 2. 完整节点定义（V1 已全部实现）

| # | 节点 | 英文标识 | 主要输入 | 结构化输出 |
|---|---|---|---|---|
| 1 | 产品想法理解 | `idea_understanding` | `rawIdea`（原始想法文本） | IdeaUnderstanding |
| 2 | 信息补全 | `clarification` | IdeaUnderstanding + 用户回答（拆为 Question Generation / Synthesis 两个模型动作） | ClarificationQuestions → ClarifiedContext |
| 3 | 产品分析 | `product_analysis` | `rawIdea` + IdeaUnderstanding + ClarificationState（Clarified Context 为主要输入） | ProductAnalysisResult（手动触发） |
| 4 | MVP 范围收敛 | `mvp_scoping` | Product Analysis（主要输入）+ Clarified Context + Idea Understanding + rawIdea | MvpScopingResult（手动触发） |
| 5 | 执行方案规划 | `execution_planning` | MVP Scoping（最高优先级）+ Product Analysis + Clarified Context + rawIdea | ExecutionPlanningResult（手动触发） |
| 6 | 最终一致性审查 | `final_review` | 全部上游产物（rawIdea / IdeaUnderstanding / ClarifiedContext / ProductAnalysis / MvpScoping / ExecutionPlanning） | FinalReviewResult（手动触发，只读审计） |

节点按顺序解锁；左侧导航允许回看已完成节点。

## 2.5 模型调用基础设施：Provider-agnostic AI Runtime

所有节点的模型调用都经过统一分层，业务节点不感知具体 Provider：

```
Workflow（业务节点 / client.ts 编排）
  → AI Runtime（runtime.ts：能力包装、结构化守卫、最多一次结构修复）
    → Provider Adapter（按 Protocol 处理协议差异）
      → Provider API（openai-responses / openai-chat-completions / anthropic-messages / gemini-generate-content）
```

- Route Handler 只做请求校验与数据整理，统一接收 `modelConfig`（Provider ID / Protocol / API Key / Base URL / Model ID），再交给 Runtime；禁止在各 Route 复制 Provider 判断逻辑。
- 内置 Provider 由 Registry 统一描述：火山方舟（默认，`openai-responses`）、OpenAI（`openai-responses`）、Anthropic（`anthropic-messages`）、Google Gemini（`gemini-generate-content`）、自定义（OpenAI 兼容，`openai-chat-completions`；Qwen / DeepSeek / Kimi 等均走此项，不设专用 Adapter）。
- 结构化输出三级：
  1. **native**：协议原生 strict schema（Responses API `json_schema` strict）；
  2. **compatible**：Chat Completions `json_object`、Gemini `responseMimeType: application/json`，以 JSON-only Prompt 约束；
  3. **fallback**：Anthropic 等不支持结构化模式的协议，仅用 JSON-only Prompt。
- 无论哪一级，返回文本都必须通过 JSON 解析 + 运行时 Schema 校验（`lib/ai/schemas.ts`）。校验失败时 Runtime **最多带错误反馈自动修复一次**；仍失败抛出 `INVALID_STRUCTURED_OUTPUT`，前端展示可读中文错误并允许重试。
- 火山方舟（默认）调用保持 Responses API、`store: false`、`thinking: { type: "disabled" }`，默认模型 `doubao-seed-evolving`；其他 Provider 按其 Adapter 能力执行，不额外注入火山专有参数。
- 超时：Execution Planning 节点 180000ms，其余节点（含 Final Review）120000ms。
- API Key 只在本次请求内从浏览器经本机 Route Handler 转发给当前激活 Provider，不写日志、不进 Project、不出现在错误信息中。

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

- 端点：`POST /api/ai/understand`（Route Handler 接收 `modelConfig` 后经统一 AI Runtime 调用当前激活 Provider）
- 默认 Provider（火山方舟）：`POST {baseUrl}/responses`（Agent Plan 默认 `https://ark.cn-beijing.volces.com/api/plan/v3`），模型 `doubao-seed-evolving`
- 使用 Responses API 的 `text.format`（`json_schema`、`strict: true`）约束结构化输出（native 模式）；其他 Provider 按 §2.5 三级能力降级处理
- 火山方舟调用携带 `thinking: { type: "disabled" }`（结构化提取任务，关闭深度思考以降低直播时延）与 `store: false`（请求内容不在服务端持久化）

### 3.6 运行时校验（失败闭环）

即使开启 strict，仍对返回文本做：

1. JSON 解析（容忍模型包裹 ```json 代码块的情况）
2. 逐字段运行时类型校验
3. 校验失败 → Runtime 带错误反馈自动修复最多一次；仍失败抛出结构化错误（`INVALID_STRUCTURED_OUTPUT`），前端展示可读错误并允许重试

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

- 两个动作均经统一 AI Runtime 调用当前激活 Provider（见 §2.5）；默认火山方舟保持 Responses API `json_schema`（strict）、`thinking: { type: "disabled" }`、`store: false`
- Route Handler：`POST /api/ai/clarify/questions`、`POST /api/ai/clarify/synthesize`
- 运行时清洗：丢弃空问题 / 空选项、问题数截断为最多 5 个；`clarificationNeeded = true` 却无有效问题时按非法输出处理（经一次修复仍失败抛 `INVALID_STRUCTURED_OUTPUT`）
- Synthesis 路由逐题校验答案完整性（0 题路径合法），缺失答案返回 `BAD_CONFIGURATION`；模型类失败允许重试，已填答案不丢失

## 5. 节点 3：Product Analysis（已实现）

### 5.1 目标与触发

- 目标：基于已确认的 Clarified Context 做系统产品分析——服务谁、在什么场景下、遇到什么问题、现在如何解决、核心价值、关键假设、主要风险、MVP 收敛应关注什么
- 触发：**仅由用户在 Clarified Context 页面手动点击启动**，不挂自动 effect；因此完成后刷新直接显示结果、绝不重新调用模型，避免重复计费
- 本节点不重新执行 Clarification、不再次提问、不生成 MVP / 页面 / 技术架构 / 开发计划 / PRD

### 5.2 输入

```ts
{
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState; // 必须含 questions / answers / clarifiedContext
}
```

- Clarified Context 是主要输入；与早期 Idea Understanding 冲突时，以用户澄清后确认的信息为准
- Route Handler 强制校验 `clarification.clarifiedContext` 非空，缺失时返回 `BAD_CONFIGURATION`

### 5.3 事实边界（Prompt 最高优先级）

- 逐字段区分：Confirmed Facts / Analysis / Hypotheses / Unknowns
- 禁止把模型分析写成已验证市场事实；禁止编造市场规模、用户数量、竞品收入、转化率、付费率、增长率与行业统计（本节点无 Web Search / RAG）
- `currentAlternatives` 只分析用户当前可能采用的解决方式，不做竞品研究；`differentiationDirection` 只描述方向，不声称已有壁垒
- `keyHypotheses` 3～6 个，`validationNeeded: true` 并给出轻量 `validationIdea`；`risks` 3～5 个；`readyForMvpScoping` 正常为 `true`，需非常克制地使用 `false`

### 5.4 结构化输出 Schema

```json
{
  "productDefinition": {
    "name": "string",
    "oneLineDefinition": "string",
    "category": "string —— 普通中文分类，如 AI 效率工具",
    "stage": "string —— 如 概念验证阶段"
  },
  "primaryUser": {
    "description": "string —— 第一优先核心用户（属分析结论）",
    "context": "string",
    "primaryGoal": "string"
  },
  "coreScenario": {
    "trigger": "string",
    "scenario": "string",
    "desiredOutcome": "string"
  },
  "problemAnalysis": {
    "coreProblem": "string —— 聚焦一个最主要问题",
    "rootCauses": ["string"],
    "currentPainPoints": ["string"]
  },
  "currentAlternatives": [
    {
      "alternative": "string",
      "whyUsersUseIt": "string",
      "limitations": ["string"]
    }
  ],
  "valueProposition": {
    "coreValue": "string",
    "userChange": "string",
    "differentiationDirection": "string"
  },
  "keyHypotheses": [
    {
      "hypothesis": "string",
      "importance": "high | medium | low",
      "validationNeeded": true,
      "validationIdea": "string"
    }
  ],
  "risks": [
    {
      "risk": "string",
      "type": "user | product | value | adoption | business | execution",
      "severity": "high | medium | low",
      "reason": "string"
    }
  ],
  "analysisSummary": {
    "strengths": ["string"],
    "uncertainties": ["string"],
    "mvpFocus": ["string —— 只说明关注点，不列 MVP 功能"],
    "readyForMvpScoping": true
  }
}
```

### 5.5 调用与校验

- 端点：`POST /api/ai/analyze/product`
- 经统一 AI Runtime 调用当前激活 Provider（见 §2.5）；默认火山方舟保持 Responses API `json_schema`（strict）、`thinking: { type: "disabled" }`、`store: false`，不新建第二套客户端
- 运行时清洗：字符串字段 trim、空项丢弃、枚举值原样保留；守卫校验失败经一次修复仍不通过时抛出 `INVALID_STRUCTURED_OUTPUT`
- 失败时只写 `lastRun`（stage `product_analysis`、failed），不动 `clarification` 与已有 `productAnalysis`，前序数据不丢失，可手动重试

## 6. 节点 4：MVP Scoping（已实现）

### 6.1 目标与触发

- 目标：在产品分析之上收敛第一版范围——第一版验证什么、必须完成哪些能力、哪些暂缓 / 明确不做、最小完整用户闭环、范围约束、MVP 风险与轻量验证计划
- 触发：**仅由用户在 Product Analysis 页面手动点击「开始收敛 MVP」启动**，不挂任何自动 effect；完成后刷新直接显示结果、绝不重新调用模型
- 本节点不重新执行产品分析、不再次提问、不写代码 / 数据库 / API / 技术架构、不输出 Sprint / 开发任务 / PRD / 高保真设计 / 商业与运营方案

### 6.2 输入

```ts
{
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState; // 必须含 clarifiedContext
  productAnalysis: ProductAnalysisResult; // 最主要输入
}
```

- Product Analysis 是最主要依据；仅在核对事实时读取 Clarified Context、Idea Understanding 与 rawIdea
- Route Handler 强制校验 `clarification.clarifiedContext` 与 `productAnalysis` 非空，缺失时返回 `BAD_CONFIGURATION`

### 6.3 事实边界（Prompt 强制约束）

- 区分 Confirmed Context（用户已确认约束）/ Product Analysis（上一阶段分析）/ MVP Decision（本阶段范围决策）/ Hypothesis（仍需验证）
- MVP 设计决策不得描述成市场事实；模型额外建议的范围约束必须以「范围建议：」前缀表达，不能混成用户事实
- 禁止编造百分比指标；无明确开发周期时不自行承诺精确周期

### 6.4 结构化输出 Schema

```json
{
  "mvpDefinition": {
    "goal": "string —— 一句话说明第一版最重要的目标（可验证，非宏大愿景）",
    "primaryUser": "string —— 只保留一个第一优先用户",
    "coreScenario": "string —— 只保留第一版最重要的核心场景",
    "coreValue": "string —— 第一版实际交付的核心价值"
  },
  "validationTarget": {
    "primaryHypothesis": "string —— 正常只有 1 个首要假设",
    "whyThisFirst": "string",
    "successSignal": "string —— 可观察的行为信号，禁止编造百分比"
  },
  "coreLoop": {
    "entry": "string",
    "steps": ["string —— 3～6 步，用户视角完整任务闭环"],
    "outcome": "string"
  },
  "mustHave": [
    {
      "name": "string",
      "userNeed": "string",
      "reason": "string",
      "acceptance": "string —— 产品能力描述，不写技术实现"
    }
  ],
  "shouldDefer": [
    { "name": "string", "reason": "string", "whenToReconsider": "string" }
  ],
  "explicitlyOutOfScope": [
    { "name": "string", "reason": "string" }
  ],
  "scopeConstraints": ["string —— 优先来自用户确认；建议须加「范围建议：」"],
  "mvpRisks": [
    {
      "risk": "string",
      "impact": "high | medium | low",
      "response": "string"
    }
  ],
  "validationPlan": [
    { "action": "string", "signal": "string" }
  ],
  "scopeSummary": {
    "buildNow": ["string"],
    "doNotBuildNow": ["string"],
    "readyForExecutionPlanning": true
  }
}
```

数量边界：`mustHave` 3～6（最多 7）、`shouldDefer` 2～5、`explicitlyOutOfScope` 1～5、`mvpRisks` 2～4、`validationPlan` 2～4。

### 6.5 调用与校验

- 端点：`POST /api/ai/scope/mvp`
- 经统一 AI Runtime 调用当前激活 Provider（见 §2.5）；默认火山方舟保持 Responses API `json_schema`（strict）、`thinking: { type: "disabled" }`、`store: false`，复用现有 AI Client（`scopeMvp()`），不新建第二套客户端
- 运行时清洗：字符串字段 trim、空项丢弃、枚举值原样保留；守卫 `isMvpScopingResult` 校验失败经一次修复仍不通过时抛出 `INVALID_STRUCTURED_OUTPUT`
- 失败时只写 `lastRun`（stage `mvp_scoping`、failed），不动前三阶段产物，可手动重试

## 7. 节点 5：Execution Planning（已实现）

### 7.1 目标与触发

- 目标：把已经冻结的 MVP 范围翻译成独立开发者可以直接开工的开发计划——执行目标、产品结构（界面与用户路径）、轻量技术路径、核心数据对象、里程碑、可执行任务、验证节点、执行风险、立即行动项与完成定义
- 触发：**仅由用户在 MVP Scoping 结果页手动点击「生成执行方案」启动**，不挂任何自动 effect；完成后刷新直接显示结果、绝不重新调用模型
- 本节点不重新做产品分析、不重新提问、不改动 MVP 范围决策、不产出最终立项方案 / 商业计划 / 真实代码

### 7.2 输入

```ts
{
  rawIdea: string;
  ideaUnderstanding: IdeaUnderstanding;
  clarification: ClarificationState;   // 必须含 clarifiedContext
  productAnalysis: ProductAnalysisResult;
  mvpScoping: MvpScopingResult;        // 最高优先级输入，范围已冻结
}
```

- 输入优先级：MVP Scoping → Product Analysis → Clarified Context → rawIdea
- Prompt 显式传入 MVP Scoping 的 `mustHave` / `shouldDefer` / `explicitlyOutOfScope` 三段
- Route Handler 强制校验 `clarification.clarifiedContext`、`productAnalysis`、`mvpScoping` 非空，缺失时返回 `BAD_CONFIGURATION`

### 7.3 范围冻结（Prompt 最高优先级）

- `shouldDefer` 与 `explicitlyOutOfScope` 已排除的能力严禁回流到 surfaces / technicalPlan / dataModel / milestones / tasks；明确点名禁止登录注册、云数据库、云同步、支付、权限体系、社区、多端、企业后台、推荐流、音视频
- 仅当某项能力是实现已冻结 MVP 的必要基础设施时允许出现，且必须表述为「实现基础」而非新增功能
- 沿用独立开发者约束：一人开发、轻量技术栈、本地优先、尽快真实验证、避免过度工程化
- 模型推荐的技术 / 范围决策必须与用户已确认约束（Confirmed Constraints）区分表达，不得伪装成用户事实

### 7.4 结构化输出 Schema

```json
{
  "executionDefinition": {
    "goal": "string —— 本轮开发要达成的目标",
    "deliveryTarget": "string —— 第一版实际交付物",
    "primaryUser": "string",
    "coreScenario": "string"
  },
  "productStructure": {
    "surfaces": [
      { "name": "string", "purpose": "string", "keyActions": ["string"] }
    ],
    "userFlow": ["string —— 3～8 步，用户视角最小完整路径"]
  },
  "technicalPlan": {
    "architecture": "string —— 总体架构一句话 + 轻量说明",
    "frontend": { "approach": "string", "responsibilities": ["string"] },
    "backend": { "approach": "string", "responsibilities": ["string"] },
    "ai": {
      "needed": true,
      "role": "string —— AI 在产品中的角色",
      "integration": "string —— 接入方式；needed=false 时说明本阶段不需要"
    },
    "storage": { "approach": "string", "reason": "string" },
    "externalServices": [
      { "name": "string", "purpose": "string", "required": true }
    ]
  },
  "dataModel": [
    { "name": "string", "purpose": "string", "keyFields": ["string"] }
  ],
  "milestones": [
    {
      "id": "string —— 如 M1",
      "name": "string",
      "goal": "string",
      "deliverables": ["string"],
      "acceptance": ["string"]
    }
  ],
  "tasks": [
    {
      "id": "string —— 如 T01",
      "milestoneId": "string —— 必须引用本次输出存在的里程碑",
      "title": "string",
      "objective": "string",
      "type": "product | frontend | backend | ai | data | integration | test | release",
      "dependencies": ["string —— 仅引用本次输出存在的任务 ID"],
      "acceptance": ["string —— 可人工判断的完成条件"],
      "effort": "S | M | L"
    }
  ],
  "validationCheckpoints": [
    { "afterMilestone": "string", "whatToValidate": "string", "signal": "string" }
  ],
  "executionRisks": [
    { "risk": "string", "impact": "high | medium | low", "response": "string" }
  ],
  "executionSummary": {
    "firstActions": ["string —— 3～5 项有序、立即可开始"],
    "definitionOfDone": ["string —— 3～6 项，第一版做到这里就停"],
    "readyForFinalReview": true
  }
}
```

数量边界：`milestones` 3～6、`tasks` 8～18、`userFlow` 3～8、`dataModel` 2～6、`validationCheckpoints` 2～4、`executionRisks` 2～4、`firstActions` 3～5、`definitionOfDone` 3～6。

### 7.5 调用与校验

- 端点：`POST /api/ai/plan/execution`
- 经统一 AI Runtime 调用当前激活 Provider（见 §2.5）；默认火山方舟保持 Responses API `json_schema`（strict）、`thinking: { type: "disabled" }`、`store: false`，复用现有 AI Client（`planExecution()`），不新建第二套客户端、不做多模型自动路由
- **节点级超时 180000ms（`EXECUTION_PLANNING_TIMEOUT_MS`）**：真实验证该节点耗时约 93～126s，统一默认 120s 边界过近；仅本节点放宽到 180s，其他节点（含 Final Review）继续使用默认 `REQUEST_TIMEOUT_MS` 120000ms。超时由 AI Client 的动作级 `timeoutMs` 经 Adapter 透传实现，不做全局放宽，不引入异步队列 / 后台任务 / streaming
- 运行时清洗：字符串字段 trim、空项丢弃、枚举值（type / effort / impact）与布尔值（needed / required / readyForFinalReview）原样保留；守卫 `isExecutionPlanningResult` 校验失败经一次修复仍不通过时抛出 `INVALID_STRUCTURED_OUTPUT`
- 成功后写入 Project 可选字段 `executionPlanning: { result, completedAt }`，`status` 保持 `"scoped"`（不新增 ProjectStatus），并写 `lastRun`（stage `execution_planning`、succeeded、记录 durationMs）
- 失败时只写 `lastRun`（stage `execution_planning`、failed），不动前四阶段产物与已有 `executionPlanning`，可手动重试

## 8. 节点 6：Final Review（已实现）

### 8.1 定位：一致性审计，不是重新生成

- Final Review 是整条立项链路的 **Consistency Audit（一致性审计）**，不是 Regeneration（重新生成）
- 只检查各阶段之间的关系：想法有没有无依据漂移、用户确认信息有没有被改变、Product Analysis 是否与 Clarified Context 一致、MVP 是否围绕 Product Analysis、Execution Planning 是否遵守 MVP、defer/out-of-scope 能力有没有回流、假设有没有被写成事实、技术是否过度工程化、任务是否具体可开工
- **只读审计**：禁止自动修改 Product Analysis / MVP / Execution Plan 等任何前序结果，不背后改数据
- 不重新输出输入中的已有内容；方案一致就明确判 `ready` 并告知可以开工，不为显示工作量强行制造问题；`needs_attention` 只用于真正影响执行的问题

### 8.2 输入与触发

- 触发：**仅由用户在 Execution Planning 结果页手动点击「检查完整立项方案」启动**，不挂任何自动 effect；完成后刷新直接显示结果、绝不重新调用模型
- 输入：`rawIdea`、`ideaUnderstanding`、`clarification`（含 `clarifiedContext`）、`productAnalysis`、`mvpScoping`、`executionPlanning`
- 缺少 Execution Planning（或 Clarified Context）时返回可读中文错误（`BAD_CONFIGURATION`）
- 端点：`POST /api/ai/review/final`；经统一 AI Runtime 调用当前激活 Provider（见 §2.5），默认火山方舟保持 Responses API `json_schema`（strict）、`thinking: { type: "disabled" }`、`store: false`；超时使用默认 120s，不复用 Execution Planning 的 180s

### 8.3 否定语境区分（Prompt 强制约束）

- 当「登录 / 注册 / 支付 / 云数据库 / 社区 / 多端」等词出现在「不接入 / 不建设 / 不需要 / 明确排除」等否定语境时，属于正常边界声明，**绝不能误判为回流**
- 只有当某项已排除能力被当作要实现的功能、任务或交付物时，才算范围回流

### 8.4 结构化输出 Schema（七段）

```json
{
  "verdict": {
    "status": "ready | needs_attention",
    "summary": "string —— 一句话整体结论，不输出分数 / 等级"
  },
  "consistencyChecks": [
    {
      "dimension": "string",
      "status": "pass | warning",
      "finding": "string —— 简洁说明依据，不引用大段原文"
    }
  ],
  "scopeIntegrity": {
    "passed": "boolean",
    "reintroducedItems": ["string —— 回流项；无回流给空数组 []"],
    "finding": "string"
  },
  "factIntegrity": {
    "passed": "boolean",
    "issues": ["string —— 假设写成事实等问题；无问题给空数组 []"],
    "finding": "string"
  },
  "executionReadiness": {
    "passed": "boolean",
    "strengths": ["string"],
    "gaps": ["string —— 无缺口给空数组"]
  },
  "recommendedAdjustments": [
    {
      "priority": "high | medium | low",
      "targetStage": "clarification | product_analysis | mvp | execution",
      "adjustment": "string —— 可执行的有限修正",
      "reason": "string"
    }
  ],
  "finalSummary": {
    "readyToBuild": "boolean",
    "firstAction": "string —— 必须从 executionSummary.firstActions 中挑选，不发明新任务",
    "keepInMind": ["string —— 2～4 条真正重要的提醒"]
  }
}
```

数量边界：`consistencyChecks` 5～7、`recommendedAdjustments` 0～5（没有必要修改时为 `[]`）、`keepInMind` 2～4。

### 8.5 调用、校验与恢复

- AI Client `reviewFinal()` 复用统一 AI Runtime，不新建第二套；运行时做 trim、空项丢弃、枚举校验与数量截断；守卫 `isFinalReviewResult` 校验失败经一次修复仍不通过时抛出 `INVALID_STRUCTURED_OUTPUT`
- 成功后写入 Project 可选字段 `finalReview: { result, completedAt }`，`status` 保持 `"scoped"`（不新增 ProjectStatus），并写 `lastRun`（stage `final_review`、succeeded、记录 durationMs）
- 失败时只写 `lastRun`（stage `final_review`、failed），**保留全部前序结果（含 Execution Planning）**，可手动重试；刷新后失败态不自动重试
- 导航不新增第六步：Final Review 仍归属左侧第五阶段视图，运行态只在主区域展示审计动作，不展示思维链
