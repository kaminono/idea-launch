<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# idea-launch · AI Coding 项目契约

本文件是所有 AI Coding 会话必须遵守的长期规则。开始任何修改前先完整阅读本文件与 `docs/`。

## 项目目标

idea-launch 是火山引擎 ADG 社区直播演示用的真实可运行 Web Demo：《独立开发立项助手，把产品想法变成可执行方案》。默认开箱 Provider 为火山方舟豆包（doubao-seed-evolving，经 Agent Plan / Responses API 调用），同时内置 Provider-agnostic 多模型运行时。

帮助独立开发者把模糊的产品想法，经当前激活的大模型分阶段理解、补充、分析、收敛，形成可进入设计与开发阶段的立项方案。

- 产品规格：[docs/01-product-spec.md](docs/01-product-spec.md)
- 用户流程：[docs/02-user-flow.md](docs/02-user-flow.md)
- AI 工作流：[docs/03-ai-workflow.md](docs/03-ai-workflow.md)
- 数据结构：[docs/04-data-schema.md](docs/04-data-schema.md)
- 视觉规则：[docs/05-ui-design-system.md](docs/05-ui-design-system.md)

## 技术架构

- Next.js（App Router）+ React + TypeScript（strict）+ Tailwind CSS v4。
- 分层：
  - `lib/types/`：核心领域类型，是数据契约的代码事实来源。
  - `lib/storage/`：localStorage 的唯一出入口，组件不得直接读写 localStorage。
  - `lib/ai/`：`config.ts`（默认 Base URL / 默认模型 / 超时常量）、`schemas.ts`（JSON Schema 与运行时校验）、`prompts.ts`（Prompt 管理）、`errors.ts`（七码错误归一化）、`http.ts`（错误 HTTP 映射）、`client.ts`（业务编排，调用统一 Runtime）。
  - `lib/ai/providers/`：Provider-agnostic AI Runtime——`types.ts`（ModelConfig / Adapter / SettingsV2 契约）、`registry.ts`（内置 Provider 定义）、`runtime.ts`（能力包装 / 结构化守卫 / 最多一次修复）、`adapters/`（四种 Protocol 的 Adapter）、`ssrf.ts`（Custom Base URL 防护）、`validate-config.ts`（请求期配置校验）。
  - `app/api/ai/`：Route Handler，校验请求体（统一接收 `modelConfig`）与业务输入，只做必要数据整理与转发，**禁止复制 Provider 判断逻辑**。
  - UI 组件：不直接发起第三方模型请求，只调用本项目 Route Handler。
- 只允许增加轻量依赖；禁止引入 Ant Design / MUI / Element / Chakra 等大型 UI Framework；图标统一使用 lucide-react。

## 不允许加入的能力

禁止：登录 / 注册 / 用户系统、数据库 / Supabase / Firebase、云同步 / 服务端持久化 / 云端项目存储、支付、权限体系、Analytics / 用户行为追踪、Web Search、RAG / 知识库、Agent Tool Calling、多 Agent、多模型自动路由、自动代码生成平台。

业务数据只保存在浏览器本地 localStorage。

## LocalStorage 规则

- 统一命名空间：`idea-launch:settings:v2`（当前）、`idea-launch:settings:v1`（迁移来源，保留不删）、`idea-launch:projects:v1`。
- 所有读写必须经过 `lib/storage/` 封装，必须处理：
  - SSR 环境不存在 localStorage；
  - JSON 解析失败 / 数据损坏（隔离损坏数据、重置为默认值，不能让页面崩溃）；
  - 数据版本（envelope `{ version, data }`）；
  - 默认值、刷新恢复、清空数据。
- Settings V2 结构：`activeProviderId` + `providerConfigs`（各 Provider 独立配置，切换不清空）。归一化时内置 Provider 只信任 apiKey/modelId，baseUrl/protocol 以 Registry 为准；custom 保留用户 baseUrl，protocol 走四值白名单。
- V1→V2 惰性迁移：浏览器端发现 v2 缺失且 v1 存在时，映射为 volcengine 配置并写 v2，读回校验失败不启用；清空设置同时删除 V1+V2。
- API Key 只允许存在于 settings（按 Provider 存储）中，**禁止进入 Project 数据**。

## API Key 安全规则

- API Key 由用户在设置弹窗手工输入，仅保存在浏览器 localStorage。
- 禁止：写入源代码 / `.env` / Git / 数据库、输出到 console 或服务端日志、写入错误信息或调试信息、持久化到服务端。
- 浏览器可将本次请求所需 API Key 临时发送到本机 Route Handler；请求结束后不得保存。
- 任何面向用户的错误信息都必须脱敏，绝不回显请求头中的 Key。

## 模型配置（Provider-agnostic AI Runtime）

- 一次只使用用户在设置中激活的**一个** Provider；禁止多模型自动路由。
- 内置 Provider（Registry 统一定义，不硬编码品牌名到业务层）：
  - `volcengine` 火山方舟（豆包，默认）：Protocol `openai-responses`，Base URL `https://ark.cn-beijing.volces.com/api/plan/v3`（集中常量，可恢复默认），默认模型 `doubao-seed-evolving`；保持 `store:false` + `thinking:{type:"disabled"}`，结构化 native（json_schema strict）。
  - `openai`：`openai-responses`，native。
  - `anthropic`：`anthropic-messages`，结构化 fallback（JSON-only Prompt）。
  - `gemini`：`gemini-generate-content`，结构化 compatible（JSON mode）。
  - `custom` 自定义（OpenAI 兼容）：`openai-chat-completions`，compatible；Qwen / DeepSeek / Kimi 等均走此项，不设专用 Adapter；仅 custom 可在高级设置修改 Base URL / Protocol。
- 每个 Provider 仅提供少量 modelSuggestions，Model ID 可自由编辑。
- 所有节点：业务 client → Runtime → Adapter（`testConnection()` / `generateStructured()` / `getCapabilities()`）；结构化输出无论能力级别都必须通过运行时 Schema 校验，失败**最多带错误反馈修复一次**，再失败抛 `INVALID_STRUCTURED_OUTPUT`。
- 连接测试走完整链路（可达 / Key / Model / 最小结构化请求），成功只返回 Provider ID / Model ID / 耗时；不暴露 Key、Header、请求体。
- 错误统一七码：INVALID_API_KEY / MODEL_NOT_FOUND / RATE_LIMITED / TIMEOUT / INVALID_STRUCTURED_OUTPUT / PROVIDER_UNAVAILABLE / BAD_CONFIGURATION；中文脱敏文案（HTTP 映射 400/401/504/502）。
- 超时：Execution Planning 180000ms，其余节点 120000ms，动作级 `timeoutMs` 透传。
- SSRF：Custom Base URL 仅允许 http/https；拒绝 localhost/127/::1（含 IPv4-mapped/compatible）/RFC1918/link-local/云 metadata/.local 等内部地址；域名经 DNS 解析后再拒私网。内置 Provider 不走该校验。

## AI Workflow 原则

- 分节点执行：Idea Understanding → Clarification → Product Analysis → MVP Scoping → Execution Planning → Final Review。
- 每一步有独立输入、独立 Prompt、独立结构化输出与运行时校验。
- 禁止用一次超长 Prompt 生成全部内容。
- 当前已实现节点：
  - Idea Understanding（`POST /api/ai/understand`）；
  - Clarification，拆为两个独立模型动作，禁止合并为一次调用：问题生成 `POST /api/ai/clarify/questions` 与上下文综合 `POST /api/ai/clarify/synthesize`；问题正常 2–4 个、最多 5 个、允许 0 个；0 题时自动走 synthesis。
  - Product Analysis（`POST /api/ai/analyze/product`）：仅由用户在 Clarified Context 页面手动点击启动，不挂自动 effect；基于 Clarified Context 输出 ProductAnalysisResult（产品定义 / 核心用户 / 核心场景 / 核心问题 / 替代方式 / 价值 / 关键假设 / 风险 / MVP 关注点），完成后刷新直接展示结果且不重新调用模型。
  - MVP Scoping（`POST /api/ai/scope/mvp`）：仅由用户在 Product Analysis 页面手动点击「开始收敛 MVP」启动，不挂自动 effect；以 Product Analysis 为最主要输入，输出 MvpScopingResult（MVP 定义 / 唯一首要验证假设 / 最小完整用户闭环 / 必须做 / 暂缓做 / 明确不做 / 范围约束 / MVP 风险 / 轻量验证计划 / 范围总结），核心是主动帮独立开发者砍范围；完成后刷新直接展示结果且不重新调用模型。
  - Execution Planning（`POST /api/ai/plan/execution`）：仅由用户在 MVP Scoping 结果页手动点击「生成执行方案」启动，不挂自动 effect；节点级超时 `EXECUTION_PLANNING_TIMEOUT_MS` 180000ms（真实耗时约 93～126s），AI Client 以动作级 `timeoutMs` 覆盖，其他节点默认 `REQUEST_TIMEOUT_MS` 120000ms；输入优先级 MVP Scoping（最高，范围已冻结）> Product Analysis > Clarified Context > rawIdea，输出 ExecutionPlanningResult（执行目标 / 产品结构 / 轻量技术路径 / 核心数据对象 / 里程碑 / 可执行任务 / 验证节点 / 执行风险 / 立即行动项 / 完成定义）。范围冻结：`shouldDefer` / `explicitlyOutOfScope` 已排除能力严禁回流到 surfaces/technicalPlan/dataModel/milestones/tasks；完成后写入 Project 可选字段 `executionPlanning`（status 保持 `scoped`），刷新直接展示结果且不重新调用模型。
  - Final Review（`POST /api/ai/review/final`，默认 120000ms）：仅由用户在 Execution Planning 结果页手动点击「检查完整立项方案」启动，不挂自动 effect。定位为整条立项链路的 **Consistency Audit 只读一致性审计，不是 Regeneration**：输出 FinalReviewResult（verdict ready/needs_attention 无分数、5～7 项 consistencyChecks、scopeIntegrity、factIntegrity、executionReadiness、0～5 条 recommendedAdjustments、finalSummary）。方案一致即判 ready 可开工，不强行制造问题；否定语境（不做登录/支付等）不得误判为范围回流；只给调整建议，禁止自动修改任何前序结果。完成后写入 Project 可选字段 `finalReview: { result, completedAt }`（status 保持 `scoped`），左侧导航不新增第六步，刷新直接展示结果且不重新调用模型；失败保留全部前序结果（含 Execution Planning）可手动重试。
- V1 六个节点已全部实现，**V1 Complete**；停止新增产品核心功能。
- 严格事实边界：`explicitConstraints` / `confirmedDecisions` 只能来自用户原始输入或澄清回答；模型推断必须放入 `remainingAssumptions` 并标注为假设，`remainingUnknowns` 不得编造，不得伪装成用户提供的事实。
- 自动模型调用由持久化状态派生（effect 触发，`queueMicrotask` 延迟到提交后执行），并用 in-flight ref 防重入；刷新不得重复触发已完成的问题生成 / synthesis，避免重复计费；失败后刷新不自动重试，已填写答案必须保留。
- 前端不展示模型 Chain of Thought / reasoning 内容。

## 代码质量红线

- 修改前先读取 `docs/` 与本文件，保证代码与文档一致；契约变更必须同步改文档。
- TypeScript strict 全量通过；**禁止使用 `any`**（包括 `as any`）逃避类型问题；不确定类型时先收窄 / 使用判别联合。
- API 层与 UI 层分离；组件保持小而职责单一；Prompt、Schema、存储各自独立模块。
- 禁止 `alert()`；错误使用页面级 / 组件级错误状态，文案面向普通用户且不泄密。
- **禁止用假数据 / Mock 成功结果掩盖真实模型调用问题**；无 API Key 无法验证时必须明确报告 NOT VERIFIED。
- 不提前抽象、不做规格之外的功能（YAGNI / KISS）。

## 完成任务前必须执行

1. `npm run lint` 必须通过；
2. `npm run build` 必须通过；
3. 无 TypeScript 错误与新增 ESLint 告警；
4. 回读本轮修改的关键文件，确认与 docs 契约一致；
5. 不允许为了方便跳过类型约束、禁用 lint 规则或提交调试日志。
