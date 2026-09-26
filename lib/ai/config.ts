// 模型与 Provider 集中配置。禁止在页面 / 组件中硬编码这些值。

export const DEFAULT_BASE_URL =
  "https://ark.cn-beijing.volces.com/api/plan/v3";

export const DEFAULT_MODEL = "doubao-seed-2.1-pro";

/** V1 唯一正式支持的模型 */
export interface ModelOption {
  id: string;
  label: string;
  provider: string;
}

export const MODEL_OPTIONS: readonly ModelOption[] = [
  {
    id: DEFAULT_MODEL,
    label: "豆包 Seed 2.1 Pro",
    provider: "Volcengine Ark Agent Plan",
  },
] as const;

export function getModelOption(model: string): ModelOption {
  return (
    MODEL_OPTIONS.find((option) => option.id === model) ?? {
      id: model,
      label: model,
      provider: "Volcengine Ark Agent Plan",
    }
  );
}

/** 默认请求超时（毫秒） */
export const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Execution Planning 节点专用超时（毫秒）。
 * 真实验证该节点耗时约 93～118s，统一 120s 边界过近，
 * 仅对该节点放宽到 180s；其他节点继续使用默认值。
 */
export const EXECUTION_PLANNING_TIMEOUT_MS = 180_000;
