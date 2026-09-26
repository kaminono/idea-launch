# 05 · UI 设计系统

idea-launch V1 的统一视觉规则。所有页面与组件必须遵循本文件；本文件与代码实现冲突时，以本文件为准并同步修正代码。

> 视觉方向：**Warm Editorial Intelligence（温暖的、编辑式的智能）**。
> 为火山引擎 ADG 社区直播演示服务，目标是 1440 × 900 下任意关键页截图可直接进入 PPT。

## 1. 设计气质

- **Warm**：暖纸底、柿橙与深茄紫，彻底抛弃冷蓝紫 Indigo / Violet AI SaaS 语汇
- **Editorial**：像一本认真编辑过的产品手册——大标题、编号、细分隔线、明确层级
- **Decisive**：每个页面都在帮用户做决定（砍范围、定先后、给结论），不堆砌信息
- **Expressive**：大字号标题与留白表达态度，但不喧哗
- **Precise**：信息密度与对齐精确，结构化卡片而非大篇 Markdown
- **AI-native**：明确呈现 AI 正在做什么，但不展示思维链，不用机器人 / 闪光图标

Light-first，不做深色模式；主界面不使用聊天气泡，不复制任何具体产品。

### 色彩比例

- 85–90% 中性暖色（Warm Paper / Surface / Ink / Border）
- 8–12% 品牌色（Brand Orange，仅用于关键交互、当前状态、强调区）
- 1–2% 点缀（Aubergine 深茄紫为主，Acid Lime 极少量）

## 2. 设计 Token

### 2.1 颜色

Token 以 `app/globals.css` 中的 `@theme inline` 为代码事实来源。

| 角色 | Token | 色值 | 用途 |
| --- | --- | --- | --- |
| Warm Paper | `bg-paper` / `bg-canvas` | `#F8F5EF` | 全局页面背景 |
| Main Surface | `bg-surface` | `#FFFEFC` | 卡片、主工作区、弹窗 |
| Secondary Surface | `bg-surface-secondary` / `bg-muted-bg` | `#F2EFEA` | 次级卡、标签、hover 浅底、只读基底 |
| Brand Orange | `bg-brand` / `bg-accent` | `#F15A37` | 主按钮、当前节点、关键强调 |
| Brand Orange Hover | `bg-brand-hover` | `#D94828` | 主按钮 hover |
| Brand Orange Soft | `bg-brand-soft` / `bg-accent-soft` | `#FFF0EA` | 选中浅底、强调区浅底、序号底 |
| Aubergine | `text-aubergine` / `bg-aubergine` | `#4A304D` | 完成横幅、产品分析主色、终局判断 |
| Aubergine Soft | `bg-aubergine-soft` | `#EEE7EF` | 完成 / ready 浅底 |
| Acid Lime | `bg-acid` | `#C5EA54` | 极少量点缀，默认不使用 |
| Ink | `text-ink` / `text-strong` | `#1D1B1C` | 标题、主要正文 |
| Secondary Ink | `text-ink-secondary` / `text-muted` / `text-body` | `#706A6B` | 卡片正文、说明 |
| Muted Ink | `text-ink-muted` / `text-faint` | `#98928F` | 占位、时间、禁用、编号 |
| Border | `border-border` / `border-subtle` | `#E8E2DB` | 默认 1px 描边 |
| Strong Border | `border-border-strong` | `#D9D1C8` | 需要更强分隔时 |
| Success | `text-success` / `bg-success-soft` | `#1F7A55` / `#E8F1EC` | 连接成功等小型状态 |
| Warning | `text-warning` / `bg-warning-soft` | `#B45309` / `#F7ECD9` | 需要关注、高风险、需补充 |
| Danger | `text-danger` / `bg-danger-soft` | `#C8402F` / `#FBE9E5` | 错误、删除（克制使用） |

命名约定：新代码一律使用**新语义名**（`brand` / `ink` / `border` / `paper` / `surface-secondary` / `aubergine`），旧名（`accent` / `strong` / `subtle` / `muted` / `faint` / `body` / `canvas`）仅作为等价映射保留，用于平滑过渡。

- Brand Orange 只用于可交互主元素、当前状态与少量强调区，禁止大面积铺色。
- 「不做 / 暂缓」类范围决策**使用暖灰，禁止红色**——这不是错误。
- 否定语境（不做登录、支付等）是正常范围结论，不得用危险色表达。

### 2.2 字体

- Sans：Geist Sans（`--font-geist-sans`）。
- Mono：Geist Mono，用于编号（01–11）、阶段标识、模型 ID、耗时、数据对象名等技术 / 编辑信息。
- 字号阶：

| Token | 尺寸 / 行高 | 用途 |
| --- | --- | --- |
| Hero Display | 68 / 76（小屏 40 / 48） | 首页编辑式大标题 |
| Stage / Verdict | 30–34 / 38–42 | Final Verdict 等结论大标题 |
| Section Statement | 17–19 / 28–30 | 首要假设、First Action 等主叙述 |
| h1 | 22 / 30 | 工作区页标题 |
| h2 | 16 / 24 | 卡片标题 |
| body | 14 / 22 | 默认正文 |
| sm | 13 / 20 | 辅助信息、导航 |
| xs | 11–12 / 16–18 | 标签、时间、脚注 |

- 字重：标题 600，强调正文 500，正文 400；不使用 700 以上字重。
- 大标题使用负字距 `tracking-[-0.02em]`，呈现编辑式紧凑感。
- 编辑式小标签统一使用 `.label-editorial`：11px / 600 / 0.12em / uppercase / Secondary Ink，格式常为「English Label · 中文说明」（如 `MVP Definition · MVP 定义`）。

### 2.3 间距

4 的倍数：4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64。

- 卡片之间：16；卡片内边距：20–24（大面板 24–32）。
- 桌面左右留白：≥ 48；内容主区最大宽约 880，左对齐。
- 大量留白优先于分割线。

### 2.4 圆角

三级，禁止过度圆角（≤ 24px）：

- Badge、小按钮、序号：**8px**
- 卡片、输入框、普通按钮：**12px**
- 大面板、完成横幅、弹窗：**16px**

除小圆点 / 序号圆标外，不使用 `rounded-full` 胶囊。

### 2.5 边框与阴影

- 默认分隔手段：`1px solid #E8E2DB`；**默认无阴影**，靠描边与表面色差分层。
- 阴影仅用于浮层：
  - `--shadow-pop`：`0 10px 30px rgba(29, 27, 28, 0.1)` — Modal / Drawer
  - `--shadow-card`：`0 1px 2px rgba(29, 27, 28, 0.05)` — 仅需要抬起的卡片
- 禁止静态卡片带重阴影、禁止每张卡片都有阴影。

### 2.6 动效

- 时长 150–220ms；统一 easing `cubic-bezier(0.4, 0, 0.2, 1)`。
- 仅使用：fade in、translateY(4–8px) 进入、状态切换、skeleton 微光、运行中橙色边呼吸、结果错峰 reveal。
- 进入动效工具类：`animate-fade-in`、`animate-fade-slide-in`。
- 结果 reveal：`.reveal-group` 容器内的 `.reveal-item` 按顺序以 50ms 步进错峰进入（0–300ms）。
- 运行中面板：`.running-surface` 使用 2.2s 橙色 border 呼吸，表达 AI 正在工作。
- 禁止：弹跳、大幅旋转、炫光、自动播放装饰动画。
- 必须支持 `prefers-reduced-motion`：全局去除位移与循环动效，reveal 项直接可见。
- 抽象装饰元素只用 CSS / SVG / 静态矢量；禁止 Canvas、WebGL、粒子、视频背景。

## 3. 组件规范

### 3.1 按钮

- 主按钮：Brand Orange 实底白字，高 40（首页主 CTA 可 44），圆角 8，padding 0 16；hover `brand-hover`；禁用约 50–60% 透明且不可点击。
- 次按钮：Main Surface 底 + 1px Border + Secondary Ink；hover `surface-secondary`。
- 危险按钮（删除 / 清空）：无底色，文字 danger，hover `danger-soft`；不使用红底。
- 同区域只保留一个主按钮，其余出口按 Link / 次按钮分级。
- 加载中：按钮内替换为小号 spinner + 文案，禁用防重复提交。

### 3.2 输入框 / Textarea

- Surface 底、1px Border、圆角 12、正文 14。
- focus：1px Brand + 同色 2px 浅 ring（brand 15% 透明）。
- 错误态：下方一行 xs danger 说明。
- 首页想法输入：多行 textarea，min-height 160，透明底融入大输入卡，placeholder 使用规格文案。

### 3.3 卡片（编辑式结果范式）

- Surface 底、1px Border、圆角 12（大面板 16）、内边距 20–24、无阴影。
- 卡头：`.label-editorial` 或 h2 + 线性小图标（lucide，16–18px）。
- 有序列表：左侧 mono 两位序号（01、02…），关键列表序号使用 Brand；无序列表使用 Muted Ink 小圆点。
- 结果页统一使用 `reveal-group` / `reveal-item` 错峰进入。
- 空态：Muted Ink 文案 + 中性图标，不使用彩色块。
- 高风险 / 高严重度类卡才使用 `warning-soft`，其余使用 Secondary Surface。

### 3.4 Modal / Drawer

- 遮罩：`rgba(29, 27, 28, 0.36)`（暖 Ink），点击遮罩与 Esc 可关闭。
- 面板：Surface 底、1px Border、圆角 16、`shadow-pop`；Modal 宽约 520，Drawer 宽约 420 右侧滑入。
- 进入：fade + translateY（Drawer 为侧向滑入），约 200ms。
- 内部纵向表单分组，字段之间约 20 间距。

### 3.5 Editorial Process Rail（Workspace 左侧流程导航）

- 细线连接的编辑式步骤条，**无大块选中背景**。
- 每阶段两行：上行 mono `01 · Idea`（Muted Ink），下行中文标签；当前阶段 Ink 600，已完成 Secondary Ink，未到达 Muted Ink。
- 节点为小圆点：当前 Brand 实心（略放大），已完成 Brand 半透明，未到达空心（Paper 底 + Strong Border）。
- 节点间 1px 竖线：已完成 Brand 40%，其余 Border。
- 五个阶段：`01 IDEA` 产品想法 / `02 CLARIFY` 信息补全 / `03 ANALYSIS` 产品分析 / `04 SCOPE` MVP 收敛 / `05 EXECUTE` 执行方案。
- 不使用机器人 / 星星图标。

### 3.6 Stage Header（阶段页眉）

每个阶段主区顶部统一呈现五字段：

1. Stage Number：mono 编号
2. English Label：英文阶段名
3. 中文标题：阶段中文名
4. 阶段目的：一句话说明本阶段要解决什么
5. Model Badge：**动态徽标**，内容为当前激活 Provider 的 `badgePrefix`（Provider Registry）+ 间隔点 + `modelId`，配极小 Orange Dot；随设置中激活 Provider / 模型实时变化，**禁止硬编码任何模型名或品牌名**

### 3.7 状态与反馈

- 空状态：居中小型线性图标（lucide，Muted Ink）+ 一句说明 + 可选次按钮。
- 错误状态：danger-soft 卡片，圆角 12，可读中文说明 + 重试次按钮；**禁止 alert()**。
- 成功 / 完成：使用 Aubergine 横幅（`aubergine-soft` + Aubergine 圆标），不再使用绿色大横幅；小型内联成功可用 success。
- 运行中：`.running-surface` 面板 + 轮换产品级文案；**不展示模型思维链**。

### 3.8 Clarification Decision Card（信息补全）

中心构图，不使用长表单或聊天 UI：

- 顶部中文标题 + 辅助说明「还有几件会影响产品方向的事情需要确认」；显著进度 `n / m`（mono）+ progressbar。
- 一次只展示一张问题大卡：Surface、1px Border、圆角 16、内边距 24–32；问题为 20–22px / 600 完整中文，下方 sm Secondary Ink 的 `whyItMatters` 说明。
- 选项为可点击 Decision Card（高 ≥ 48，圆角 12，描边卡），不用原生 radio / checkbox 作为主视觉；保留 `role` 与键盘可达、焦点环可见。
  - 选中态：Brand 描边 + `brand-soft` + Brand 文字 + 勾选指示。
  - 支持「自己填写」，选中后展开 textarea（autoFocus）；multi_choice 支持多选并含「还没有确定」类选项。
- 底部：「上一题」次按钮（首题禁用）；末题为「完成信息补全」Brand 主按钮，未答完禁用；其余题为「下一题」。
- 单选作答后约 300ms 自动轻推进；切题 fade + translateY，约 200ms。
- 1440 × 900 下单题一屏内完成，不需大范围滚动。

### 3.9 运行进度态（全部节点）

统一使用共享 `StepProgress`（`components/workspace/step-progress.tsx`）：`.running-surface` 面板 + `.label-editorial` 的 `Working · …` 标题 + mono 两位序号圆标（pending 显编号 / active 显 spinner + Brand 实心 / done 显 Check + brand-soft）。

轮换文案（只展示产品级动作，不展示思维链）：

- Understanding：正在理解产品想法 / 识别目标用户 / 提取核心问题 / 检查已有约束 / 识别缺失信息。
- Clarify Questions：确认影响产品方向的信息 / 检查目标用户 / 检查使用场景 / 识别关键约束 / 整理必要问题。
- Clarify Synthesis：整理产品上下文 / 合并原始想法 / 确认关键决策 / 区分事实和假设 / 准备产品分析上下文。
- Product Analysis：收敛核心用户 / 分析核心场景 / 识别当前替代方式 / 梳理核心价值 / 检查关键假设 / 识别主要风险。
- MVP Scoping：确定首要验证目标 / 寻找最小完整闭环 / 判断必须保留的能力 / 主动删除暂时不需要的功能 / 检查独立开发约束 / 准备验证方案。
- Execution Planning：整理产品结构 / 选择最简单技术路径 / 拆解核心数据对象 / 组织开发里程碑 / 拆分可执行任务 / 检查依赖与验收标准。
- Final Review：核对用户与问题一致性 / 检查 MVP 范围回流 / 核对事实与假设边界 / 检查是否过度工程化 / 检查任务依赖与验收 / 形成最终执行建议。

### 3.10 Product Analysis 结果页

以 **Aubergine 为主色**，Core Problem Statement 是页面中心；不使用大篇 Markdown 或竞品矩阵。

- 顶部 Aubergine 完成横幅「产品分析完成」。
- 第一屏两张大卡：
  - 「产品判断摘要」：Compass（Aubergine）；产品名 + 分类 / 阶段 Secondary Surface 标签 + 一句话定义；内含「核心用户」「核心场景」两子卡。
  - 「用户真正遇到的问题」Core Problem Statement：Aubergine / Brand 轻强调区，coreProblem 为主叙述，下方双栏 rootCauses 与 currentPainPoints。
- 向下依次：当前替代方式小卡（替代方式 / 为什么使用 / 当前不足）、产品价值重点卡、关键假设卡（重要程度 badge + validationIdea）、主要风险（高风险 warning-soft，克制）、`mvpFocus` 列表。
- 底部 Brand 主按钮「开始收敛 MVP」（ArrowRight），进行中替换 spinner 并禁用。
- 右下角 mono xs 展示分析耗时。

### 3.11 MVP Scoping 结果页

直播核心页：观众不读长文即可理解「AI 正在主动砍范围」。

- 顶部 Aubergine 完成横幅「MVP 范围已经收敛」。
- 「MVP 定义」大卡：goal 主叙述 + 第一优先用户 / 核心场景 / 核心价值。
- **This MVP Validates**：Brand 轻强调区（`brand/25` 描边 + `brand-soft/50`），primaryHypothesis 升为 17px semibold 主叙述；禁止编造百分比。
- **Build Now / Not Now 核心对比**：
  - Build Now：`brand-soft/40` 容器，每项左侧 mono 大数字序号（22px，Brand）01 / 02…，卡名 Brand，含用户需要 / 为什么必须 / 完成标准。
  - Not Now（暂缓）：Secondary Surface 暖灰容器，Clock / CornerDownRight 使用 Muted Ink，含暂缓原因与重新考虑条件。
  - Never（明确不做）：中性 Border + Surface 容器，Ban Muted Ink，只含名称与原因。
  - 「不做」类内容禁止红色。
- Core Loop：胶囊节点 + ArrowRight（Muted Ink）；起点 Brand Soft，终点 Aubergine Soft，中间 Secondary Surface。
- 范围约束、MVP 风险（高风险 warning）、轻量验证计划、Checkpoints 依次排列。
- 范围总结：Build（brand-soft + Brand）vs Do Not Build（Secondary Surface + Muted Ink）直接对比。
- 底部 Brand 主按钮「生成执行方案」，说明只展开已冻结 MVP、不新增功能。
- 右下角 mono xs 展示收敛耗时。

### 3.12 Execution Planning 结果页

让独立开发者立刻知道**现在先做什么、分几步做完**；不画甘特图、不伪造日期。

- 顶部 Aubergine 完成横幅「执行方案已经生成」。
- **Start Here 首屏行动区**：Brand 轻强调区，label `Start Here · 现在先做什么`；firstActions 每项左侧 mono 大数字（26px，Brand）+ 两位序号，是页面最可立即行动的区域。
- 「执行目标」大卡：goal 主叙述 + 交付目标 / 第一优先用户 / 核心场景。
- **Milestones 横向 M1──M2──M3──M4**：桌面横向，序号圆标（brand-soft + Brand mono `M1`），非末节点之间 1px 横线连接；窄屏（`< md`）自动转为纵向时间线。每阶段含名称、目标、交付物与验收标准。
- Tasks：按里程碑分组的 Accordion（默认展开第一组，`aria-expanded` 可达）；任务卡含 mono 任务 ID（Brand）、标题、类型 badge（brand-soft）、工作量 badge（Secondary Surface）、任务目标、依赖解析、可人工验收的对勾项。
- Product Structure：userFlow 胶囊节点（起点 Brand Soft、终点 Aubergine Soft）+ surfaces 网格小卡。
- Technical Plan：架构陈述 + 前端 / 后端 TechLayerCard + AI 卡（Cpu，仅 needed 时展示）+ 数据存储（Database）+ 外部服务 badge（必需 brand-soft / 可选中性）。
- 核心数据对象：对象名 mono（Brand）/ 用途 / 关键字段，不画完整 ER 图。
- Checkpoints 与执行风险（高风险 warning）。
- DoD「第一版做到这里就可以停」：中性 Surface 卡 + CheckCircle2（Brand）对勾列表。
- 底部 Brand 主按钮「检查完整立项方案」，说明只读审计、不改方案。
- 右下角 mono xs 展示生成耗时。

### 3.13 Final Review 结果页（最终一致性审计）

安静的收尾：以 Aubergine / Ink 为主，First Action 是全流程最后落点；不新增第六步，不提供编辑入口。

- **Final Verdict 首区**：无分数、无评级刻度。
  - ready：`aubergine-soft/50` + Aubergine / 30px 大标题「可以开始开发」，label `Ready to Build`。
  - needs_attention：中性 Secondary Surface 区 + Ink 大标题「需要关注」，label `Needs Attention`。
  - finalSummary 作为主说明。
- 一致性检查并入首区：5–7 行，pass 用裸 Check（Aubergine），异常用 AlertTriangle（warning-soft），每行一句 detail；方案一致即判 ready，不强行制造问题。
- Scope Integrity / Fact Integrity：`.label-editorial` 双段，正常结论用 Muted Ink 图标 + 中性说明，异常项才用 warning；否定语境不得误判为范围回流。
- Execution Readiness：strengths（CheckCircle2 Aubergine）与 gaps（AlertTriangle Muted Ink）双列。
- Recommended Adjustments：0–5 条，仅 high 使用 warning，中 / 低使用中性 Secondary Surface；只给建议，禁止自动修改前序结果。
- **First Action 最后落点**：ready 用 `aubergine-soft/40`，非 ready 用中性 Surface；firstAction 升为 19px semibold，keepInMind 以箭头 / 对勾列出。
- 出口：「返回历史项目」中性 Link + 「重新查看执行方案」Brand 主按钮。
- 右下角 mono xs 展示审计耗时。

## 4. 页面布局

### 4.1 首页

- TopBar：Warm Paper 半透 + 底部 1px Border、高 60；左侧收敛轨迹 Brand Mark（抽象轨迹 / 节点，Orange + Aubergine，禁止火箭 / Sparkle / 机器人），右侧「历史项目」「设置」次按钮。
- Hero 居中单栏，最大宽约 820：`.label-editorial` 眉题 + 64–76px 编辑式大标题（关键词用 Brand）+ 一段说明。
- 轻抽象路径背景：Hero 后方静态 SVG 双路径（Brand / Aubergine 低透明）+ 少量节点圆点；纯静态，禁止 Canvas / 粒子 / 视频。
- 大输入卡：Surface、圆角 16、描边；含 label + 字数（mono）+ textarea + 产品想法模板（Product Idea Templates）+ 右侧 Brand 主按钮「开始分析」。
- Product Idea Templates：四个可点击模板标签（AI 应用 / SaaS / 开发者工具 / 效率工具，配置于 `lib/product-templates.ts`，含 label + 一句话 description）；点击将模板 prompt 填入 textarea 并进入 selected 态（Brand 描边 / brand-soft / 勾选指示），用户可继续编辑；手动改动导致内容偏离模板时自动取消 selected；支持 `aria-pressed` 与键盘操作，hover / focus-visible / selected 样式齐备；**仅填入文本，不自动开始分析**。
- 未配置 API Key：输入卡内 warning-soft 引导条，点击打开设置，想法保留。
- 首屏高度内完成核心操作，不堆营销内容。

### 4.2 Workspace

- Shell：Warm Paper 背景；左侧 Editorial Process Rail，右侧主工作区（内容最大宽约 880）。
- Stage Header 五字段见 §3.6；项目名与状态 badge 位于工作区顶部。
- Raw Idea 卡始终展示。
- 各阶段结果按本文件 §3.9–§3.13 呈现；运行态、错误态、空态统一视觉语言。
- Clarified Context 页：完成后展示产品定义、核心用户 / 场景 / 问题、已确认决策、明确约束、仍然存在的假设、暂不阻塞的未知；事实 / 决策 / 假设 / 未知四类边界视觉可区分；底部 Brand 主按钮进入产品分析。
- Final Review 归属执行方案阶段视图，左侧导航不新增第六步。

## 5. 响应式

- 第一优先：**1440 × 900**、**1920 × 1080**（直播大屏），保证关键页一屏内构图完整、字号在大屏不显小。
- 1280 × 800 下不出现横向滚动 / 布局破坏。
- 断点：
  - `< 1024`：左侧 Process Rail 转为顶部横向步骤条。
  - Milestones：`md` 及以上横向 M1──M4，以下转为纵向时间线。
  - `< 640`：单列、左右留白 16，双栏卡堆叠。
- 移动端仅保证基础可用，不投入复杂手势。

## 6. 品牌 Mark

- 抽象表达「想法沿路径收敛为方案」：轨迹线 + 收敛节点，Orange + Aubergine。
- 禁止：火箭、Sparkle / 闪光、机器人、大脑等具象 AI 符号。

## 7. 明确禁止

- 冷蓝紫 Indigo / Violet 配色、蓝紫光晕、满屏渐变、彩色 mesh 背景
- 大面积深色 / 赛博背景、深色模式翻转
- Canvas / WebGL / 粒子 / 视频背景
- 大量玻璃拟态
- 机器人、AI 星星 / 闪光图标
- 聊天气泡作为主界面
- 过度 Bento Grid、圆角超过 24px、静态卡片重阴影
- 用红色表达「暂缓 / 不做」等正常范围决策
- 弹跳 / 炫光类动画与自动播放装饰
- 硬编码模型名 / 品牌名（必须从 Provider Registry 与当前激活 `modelConfig` 动态派生）
- 使用 emoji 充当功能图标（图标统一使用 lucide-react 线性图标，16–20px，stroke 1.5–2）
