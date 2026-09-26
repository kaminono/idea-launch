// 模型与 Provider 集中配置。禁止在页面 / 组件中硬编码这些值。

export const DEFAULT_BASE_URL =
  "https://ark.cn-beijing.volces.com/api/plan/v3";

// 火山方舟 Agent Plan 官方支持模型清单（核查日期 2026-09-27，页面更新于 2026-07-17）：
// https://docs.volcengine.com/docs/82379/2366394
// doubao-seed-evolving：进阶主力模型，1024k 上下文 / 256k 输出，适合长文本分析。
export const DEFAULT_MODEL = "doubao-seed-evolving";

/** 默认请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Execution Planning 节点专用超时（毫秒）。
 * 真实验证该节点耗时约 93～118s，统一 120s 边界过近，
 * 仅对该节点放宽到 180s；其他节点继续使用默认值。
 */
export const EXECUTION_PLANNING_TIMEOUT_MS = 180_000;
