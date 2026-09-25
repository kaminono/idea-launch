// Settings 读写：唯一允许访问 idea-launch:settings:v1 的模块。

import { DEFAULT_BASE_URL, DEFAULT_MODEL } from "@/lib/ai/config";
import { notifySettingsChanged } from "@/lib/client/events";
import type { Settings } from "@/lib/types";
import { SETTINGS_KEY } from "./keys";
import { readEnvelope, removeKey, writeEnvelope } from "./core";

export function defaultSettings(): Settings {
  return { apiKey: "", baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL };
}

function isSettings(value: unknown): value is Settings {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.apiKey === "string" &&
    typeof candidate.baseUrl === "string" &&
    typeof candidate.model === "string"
  );
}

/** 读取设置；SSR / 损坏 / 缺失时返回默认值 */
export function loadSettings(): Settings {
  const settings = readEnvelope<Settings>(
    SETTINGS_KEY,
    defaultSettings(),
    isSettings
  );
  // 容错：字段缺失时补齐默认值
  return {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl.trim() || DEFAULT_BASE_URL,
    model: settings.model.trim() || DEFAULT_MODEL,
  };
}

export function saveSettings(settings: Settings): Settings {
  const normalized: Settings = {
    apiKey: settings.apiKey.trim(),
    baseUrl: settings.baseUrl.trim() || DEFAULT_BASE_URL,
    model: settings.model.trim() || DEFAULT_MODEL,
  };
  writeEnvelope(SETTINGS_KEY, normalized);
  notifySettingsChanged();
  return normalized;
}

/** 清空全部设置（含 API Key） */
export function clearSettings(): void {
  removeKey(SETTINGS_KEY);
  notifySettingsChanged();
}

/** 仅清除 API Key（保留模型与地址配置） */
export function clearApiKey(): void {
  const settings = loadSettings();
  saveSettings({ ...settings, apiKey: "" });
}
