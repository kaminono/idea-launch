// Settings V1 读取：仅保留给 V1→V2 迁移使用。
// 唯一允许访问 idea-launch:settings:v1 的模块；迁移后 V1 数据保留不删。

import { DEFAULT_BASE_URL, DEFAULT_MODEL } from "@/lib/ai/config";
import { SETTINGS_KEY } from "./keys";
import { readEnvelope } from "./core";

/** V1 设置的本地形状（V2 后类型已从领域类型中移除） */
export interface SettingsV1 {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function isSettingsV1(value: unknown): value is SettingsV1 {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.apiKey === "string" &&
    typeof candidate.baseUrl === "string" &&
    typeof candidate.model === "string"
  );
}

/** 读取 V1 设置；SSR / 损坏 / 缺失时返回 null（不再补齐默认值，避免凭空生成配置） */
export function loadSettingsV1(): SettingsV1 | null {
  const settings = readEnvelope<SettingsV1 | null>(
    SETTINGS_KEY,
    null,
    (value): value is SettingsV1 | null =>
      value === null || isSettingsV1(value)
  );
  if (settings === null) return null;
  return {
    apiKey: settings.apiKey.trim(),
    baseUrl: settings.baseUrl.trim() || DEFAULT_BASE_URL,
    model: settings.model.trim() || DEFAULT_MODEL,
  };
}
