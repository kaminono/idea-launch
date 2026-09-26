# 01 · 产品规格（idea-launch V1）

> 本文档是 idea-launch 的产品事实来源（Single Source of Truth）。任何功能开发必须与本文档一致；文档与代码冲突时，以更新后的文档为准并同步代码。

## 1. 产品定位

**idea-launch 是一个独立开发立项助手。**

它帮助独立开发者把一个还比较模糊的产品想法，通过大模型逐步理解、补充、分析、收敛，最终形成可以进入设计与开发阶段的可执行立项方案。

- 形态：本地运行的 Web Demo（Next.js）
- 模型：火山引擎豆包 Seed 2.1 Pro（经 Agent Plan 调用）
- 演示场景：火山引擎 ADG 社区直播《基于豆包大模型的独立开发立项助手，把产品想法变成可执行方案》

## 2. 核心用户

有产品想法、希望快速判断并推进产品的**独立开发者（Indie Developer / 独立开发者）**。

典型特征：

- 一个人或极小团队，时间、预算、精力都有限
- 已经有模糊想法，但缺少系统化的立项梳理
- 需要的是「收敛与决策」，而不是一份泛泛的商业计划书
- 重视数据隐私，业务数据只愿意留在本地浏览器

## 3. 核心问题

用户通常已经有一个想法，但还没有完成：

1. 目标用户收敛
2. 使用场景明确
3. 核心问题识别
4. MVP 范围确定
5. 风险识别
6. 技术路径设计
7. 开发任务拆解

idea-launch 通过分步 AI Workflow，逐阶段解决上述问题，而不是一次性生成一份大而全、但无法落地的文档。

## 4. 完整 V1 工作流（规划范围）

最终产品计划包含以下 14 个环节：

1. 输入产品想法
2. AI 理解产品想法（Idea Understanding）
3. AI 判断信息是否充分
4. AI 提出必要追问
5. 用户补充信息（Clarification）
6. 用户与场景分析（Product Analysis）
7. 产品价值分析
8. MVP 范围收敛（MVP Scoping）
9. 风险与关键假设分析
10. 技术实施建议（Execution Planning）
11. 开发任务拆解
12. 最终立项方案（Final Review）
13. 本地保存
14. Markdown 导出

### 4.1 当前实际实现范围（V1 Complete）

**已实现：**

- 第 1 项：输入产品想法
- 第 2 项：AI 理解产品想法（Idea Understanding 节点）
- 第 3、4、5 项：完整 Clarification 信息补全流程
  - AI 判断信息是否充分（Clarification Question Generation）
  - 需要时生成少量高价值澄清问题，用户逐题回答
  - AI 综合原始想法 + 理解结果 + 用户回答，生成 Clarified Context（Clarification Synthesis）
  - 信息已充分时允许 0 个问题，自动完成信息补全
- 第 6、7、9 项：Product Analysis 产品分析节点
  - 用户在 Clarified Context 页面检查后**手动点击**启动，不在 Clarification 完成后自动调用
  - 基于已确认上下文，收敛产品定义、第一优先核心用户、核心场景、核心问题、当前替代方式、产品价值
  - 输出 3～6 个可验证关键假设（含轻量验证建议）与 3～5 个主要风险，并给出下一阶段 MVP 收敛关注点
- 第 8 项：MVP Scoping 范围收敛节点
  - 用户在 Product Analysis 页面检查后**手动点击**「开始收敛 MVP」启动，不挂自动 effect
  - 以 Product Analysis 为最主要依据，输出第一版定义、唯一首要验证假设、最小完整用户闭环、必须做 / 暂缓做 / 明确不做、范围约束、MVP 风险与轻量验证计划
  - 核心是主动帮独立开发者砍范围：想法过大时主动删减，只保留一个完整核心闭环
- 第 10、11 项：Execution Planning 执行方案规划节点
  - 用户在 MVP Scoping 结果页检查后**手动点击**「生成执行方案」启动，不挂自动 effect
  - 以已冻结的 MVP Scoping 为最高优先级输入，输出执行目标、产品结构（界面与用户路径）、轻量技术路径、核心数据对象、开发里程碑、可执行任务、验证节点、执行风险、立即行动项与完成定义
  - 严格遵守范围冻结：不得把上一阶段已暂缓 / 明确不做的能力重新写回执行方案
- 第 12 项：Final Review 最终一致性审计节点
  - 用户在 Execution Planning 结果页**手动点击**「检查完整立项方案」启动，不挂自动 effect
  - 只读审计全部上游产物：输出 verdict（ready / needs_attention，无分数）、5～7 项一致性检查、范围完整性（能否定语境区分）、事实完整性、执行准备度、0～5 条调整建议与最终总结
  - 方案一致即判 ready 可开工，不强行制造问题；发现范围回流 / 事实漂移时给 needs_attention，只建议不自动修改
- 第 13 项相关：localStorage 本地保存、刷新恢复、历史项目（含旧版本数据兼容）
- 模型连接：API Key 设置 + 真实连接测试

### 4.2 未实现环节（仅记录规格）

- 第 14 项：Markdown 最终报告与导出（V1 不实现，业务数据仅保留在本地）

完成 Final Review 后，工作区停在「立项检查完成」状态：ready 时展示「可以开始开发」与第一件事，needs_attention 时保留审计结论与调整建议，用户可回到对应阶段修改后重新检查。

### 4.3 Clarification 产品原则

Clarification 不是普通调查问卷，目标只有一个：补充那些如果不知道答案，就会明显影响产品立项判断的信息。

- 正常 2 ～ 4 个问题，最多 5 个；信息已足够清晰时允许 0 个问题
- 值得问的内容（按上下文取舍，不机械全问）：核心目标用户、最重要使用场景、现有替代方案、第一版平台、独立开发周期、是否收费、明确资源/技术约束、第一版必须解决的问题
- 禁止询问：已明确提供的信息、不影响立项判断的信息、远期战略、详细商业计划/财务预测、品牌 Logo / 产品颜色、非 MVP 阶段 UI 细节
- 严格事实边界：用户明确说明或确认的信息才能进入「明确约束 / 已确认决策」；模型推断只能进入「假设」；不得为填满字段编造信息

### 4.4 Product Analysis 产品原则

Product Analysis 只分析产品问题本身，不产出功能清单、页面设计、技术架构、开发任务或 PRD。

- 输入严格限定为当前 Project 已有数据，优先级：`rawIdea` → Clarified Context（主要输入）→ Idea Understanding → 澄清问答；Clarified Context 与早期理解冲突时，以用户澄清后确认的信息为准
- 必须区分四类内容：**Confirmed Facts**（用户已表达或确认）、**Analysis**（基于事实的产品分析）、**Hypotheses**（尚未经真实用户 / 市场验证的假设）、**Unknowns**（当前未知且不宜继续追问）
- 禁止把分析结论写成已验证市场事实：例如用户未提供证据时，「愿意每月支付 99 元」只能作为待验证假设
- 禁止联网与编造外部数据：不生成市场规模、用户数量、竞品收入、转化率、付费率、增长率、行业统计数字；`currentAlternatives` 只分析用户当前可能采用的解决方式（如 Excel、ChatGPT、手工记录），不是竞品研究
- `differentiationDirection` 只描述未来差异化方向，不声称已形成市场壁垒
- `keyHypotheses` 正常 3～6 个，每个必须具体、可验证并附轻量 `validationIdea`；`risks` 正常 3～5 个，严重程度与原因对应
- `readyForMvpScoping` 正常为 `true`；只有上下文存在明显无法继续的问题时才允许 `false`，不因普通未知信息阻断流程

### 4.5 MVP Scoping 产品原则

MVP 不是产品所有功能的缩小版。目标是用尽可能有限的范围验证最关键的产品假设，同时让目标用户完成一次完整核心任务；模型必须主动控制范围、主动删减。

- 输入优先级：Product Analysis（**最主要依据**）→ Clarified Context → Idea Understanding → `rawIdea`；不重新执行产品分析、不重新提问
- 必须区分：**Confirmed Context**（用户已确认约束）、**Product Analysis**（上一阶段分析）、**MVP Decision**（本阶段范围决策）、**Hypothesis**（仍需验证）；MVP 决策不得描述成市场事实
- `validationTarget` 正常只有 **1 个** primaryHypothesis；`successSignal` 使用可观察的行为信号，用户未提供时禁止编造百分比指标
- `mustHave` 正常 3～6 项（最多 7），`acceptance` 只描述产品能力，不写技术实现；`shouldDefer` 正常 2～5 项且必须给出重新考虑条件；`explicitlyOutOfScope` 正常 1～5 项
- `coreLoop.steps` 3～6 步，必须是用户视角的完整任务闭环，不能只列后台技术过程；`mvpRisks` 2～4 个，只关注 MVP 实施与验证阶段，不复述产品分析风险；`validationPlan` 2～4 项轻量验证动作，不展开成增长 / 运营方案
- 独立开发者默认约束：一人开发、时间与维护能力有限、尽快真实验证、避免过度工程化；Clarified Context 明确给出开发周期时必须遵守，无明确周期时不自行承诺
- 严格工作边界：不写代码、不设计数据库 / API / 技术架构、不输出 Sprint / 开发任务 / 完整 PRD、不做高保真设计、不做商业与运营方案（属 Execution Planning 或以后阶段）
- `scopeSummary.readyForExecutionPlanning` 正常为 `true`，仅存在真正重大范围冲突时才 `false`

### 4.6 Execution Planning 产品原则

Execution Planning 不重新做产品判断，也不重新砍范围；它把**已经冻结的 MVP 范围**翻译成独立开发者真正可以开始执行的开发计划：做哪些界面、走什么技术路径、有哪些核心数据对象、分几个里程碑、每个任务怎么验收、第一版做到哪里就停。

- 输入优先级：MVP Scoping（**最高优先级，范围已冻结**）→ Product Analysis → Clarified Context → `rawIdea`；不重新提问、不重新分析、不改动 MVP 决策
- **范围冻结（最高优先级验收规则）**：MVP Scoping 中 `shouldDefer`（暂缓做）与 `explicitlyOutOfScope`（明确不做）的能力，严禁重新出现在 surfaces / technicalPlan / dataModel / milestones / tasks 中；登录注册、云数据库、云同步、支付、权限体系、社区、多端 App、企业后台、推荐流、音视频等被排除能力不得回流。仅当某项基础设施能力是实现已冻结 MVP 的必要基础（例如本地存储、单一 AI 接口转发）时允许出现，且必须明确说明它是「实现基础」而非新增产品功能
- 输出必须可执行、可验收：任务粒度为一个独立开发者可以直接开工的最小工作项；里程碑不伪造日期、不做甘特图，只表达阶段顺序与交付物
- 数量边界：`milestones` 3～6 个；`tasks` 8～18 个（ID 形如 `T01`，标注 `milestoneId`、类型、工作量 S/M/L、依赖任务 ID 与可人工验收的 acceptance）；`productStructure.userFlow` 3～8 步、`surfaces` 仅包含 MVP 真正需要的界面；`dataModel` 2～6 个核心对象（只写名称 / 用途 / 关键字段）；`validationCheckpoints` 2～4 个；`executionRisks` 2～4 项；`firstActions` 3～5 项（有序、立即可以开始）；`definitionOfDone` 3～6 项
- 技术路径保持轻量：默认沿用 V1 已验证的技术栈与本地优先架构（Next.js + 浏览器本地存储 + 单一豆包模型经本机 Route Handler 转发），不引入服务端持久化、登录、多模型或大型新依赖；AI 能力在 MVP 不需要时显式标注 `needed = false`
- 任务依赖必须真实可解析：`dependencies` 只引用本次输出中存在的任务 ID，不允许悬空依赖；验收标准使用可人工判断的完成条件，不写「代码质量好」这类空泛描述
- 严格工作边界：不重新生成产品分析 / MVP 范围结论，不输出最终立项方案、商业计划、运营增长方案或真实代码；`readyForFinalReview` 正常为 `true`
- 计划只服务第一版：`definitionOfDone` 明确「第一版做到这里就可以停」，防止执行阶段重新膨胀范围

## 5. 明确不做（V1 Out of Scope）

V1 明确不做：

- 用户账号 / 注册 / 登录
- 团队协作
- 云同步
- 数据库（任何服务端持久化）
- 支付
- 权限体系
- 项目管理系统
- 自动代码生成平台
- 知识库
- RAG
- 多模型自动路由
- Web Search
- Agent Tool Calling / 多 Agent
- Analytics 与用户行为追踪

## 6. 数据与隐私原则

- V1 是纯本地 Demo，所有业务数据只保存在浏览器 `localStorage`
- API Key 仅保存在本地浏览器；调用时随单次请求临时发送给本机 Next.js Route Handler，请求结束后不持久化
- 禁止在任何源代码、日志、错误信息中出现 API Key
- 数据结构详见 [04-data-schema.md](./04-data-schema.md)

## 7. 验收取向

产品不是聊天机器人，而是 **Product Workspace**：用户看到的是结构化、可扫描、可继续推进的立项工件（Artifacts），而不是一整块自由文本或聊天气泡。
