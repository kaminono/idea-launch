// Settings V2 读写：唯一允许访问 idea-launch:settings:v2 的模块。
// 首次读取时执行 V1→V2 迁移：读 V1 → 映射火山方舟配置 → 写 V2 → 读回校验；V1 保留不删。

import { notifySettingsChanged } from "@/lib/client/events";
import type {
  ModelConfig,
  Protocol,
  ProviderConfigV2,
  ProviderId,
  SettingsV2,
} from "@/lib/types";
import {
  PROVIDER_IDS,
  defaultProviderConfig,
  getProviderDefinition,
} from "@/lib/ai/providers/registry";
import {
  SETTINGS_KEY,
  SETTINGS_V2_KEY,
  SETTINGS_V2_VERSION,
} from "./keys";
import {
  hasStorage,
  readEnvelope,
  removeKey,
  writeEnvelope,
} from "./core";
import { loadSettingsV1 } from "./settings";

const SUPPORTED_PROTOCOLS: readonly Protocol[] = [
  "openai-responses",
  "openai-chat-completions",
  "anthropic-messages",
  "gemini-generate-content",
];

function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === "string" &&
    PROVIDER_IDS.includes(value as ProviderId)
  );
}

function isProtocol(value: unknown): value is Protocol {
  return (
    typeof value === "string" &&
    SUPPORTED_PROTOCOLS.includes(value as Protocol)
  );
}

/** 内置 Provider 的配置以 Registry 为准，仅持久化 API Key 与模型 ID（模型可编辑） */
function normalizeBuiltinConfig(
  providerId: Exclude<ProviderId, "custom">,
  value: Partial<ProviderConfigV2> | undefined
): ProviderConfigV2 {
  const fallback = defaultProviderConfig(providerId);
  return {
    providerId,
    apiKey: typeof value?.apiKey === "string" ? value.apiKey.trim() : "",
    baseUrl: fallback.baseUrl,
    modelId:
      typeof value?.modelId === "string" && value.modelId.trim()
        ? value.modelId.trim()
        : fallback.modelId,
    protocol: fallback.protocol,
  };
}

/** Custom 保留用户填写的地址与协议；损坏字段回落到 Registry 默认 */
function normalizeCustomConfig(
  value: Partial<ProviderConfigV2> | undefined
): ProviderConfigV2 {
  const fallback = defaultProviderConfig("custom");
  return {
    providerId: "custom",
    apiKey: typeof value?.apiKey === "string" ? value.apiKey.trim() : "",
    baseUrl:
      typeof value?.baseUrl === "string" ? value.baseUrl.trim() : fallback.baseUrl,
    modelId: typeof value?.modelId === "string" ? value.modelId.trim() : fallback.modelId,
    protocol: isProtocol(value?.protocol) ? value.protocol : fallback.protocol,
  };
}

function normalizeProviderConfig(
  providerId: ProviderId,
  value: Partial<ProviderConfigV2> | undefined
): ProviderConfigV2 {
  return providerId === "custom"
    ? normalizeCustomConfig(value)
    : normalizeBuiltinConfig(providerId, value);
}

/** 结构化宽松校验：仅判断持久化形状，字段纠偏交给 normalize */
function isSettingsV2Shape(value: unknown): value is SettingsV2 {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (!isProviderId(candidate.activeProviderId)) return false;
  if (
    typeof candidate.providerConfigs !== "object" ||
    candidate.providerConfigs === null
  ) {
    return false;
  }
  const configs = candidate.providerConfigs as Record<string, unknown>;
  return Object.entries(configs).every(
    ([id, config]) =>
      isProviderId(id) &&
      typeof config === "object" &&
      config !== null
  );
}

/** 默认设置：激活火山方舟；其余 Provider 等用户切换时再创建，切换不清空已有配置 */
export function defaultSettingsV2(): SettingsV2 {
  return {
    activeProviderId: "volcengine",
    providerConfigs: {
      volcengine: defaultProviderConfig("volcengine"),
    },
  };
}

/** 归一化任意来源的 V2 设置：纠偏字段、补齐 active 配置 */
function normalizeSettingsV2(value: SettingsV2): SettingsV2 {
  const activeProviderId = isProviderId(value.activeProviderId)
    ? value.activeProviderId
    : "volcengine";
  const stored =
    typeof value.providerConfigs === "object" && value.providerConfigs !== null
      ? value.providerConfigs
      : {};

  const providerConfigs = {} as Partial<Record<ProviderId, ProviderConfigV2>>;
  for (const providerId of PROVIDER_IDS) {
    if (stored[providerId]) {
      providerConfigs[providerId] = normalizeProviderConfig(
        providerId,
        stored[providerId]
      );
    }
  }
  if (!providerConfigs[activeProviderId]) {
    providerConfigs[activeProviderId] = defaultProviderConfig(activeProviderId);
  }
  return { activeProviderId, providerConfigs };
}

/** V1→V2 迁移；返回 true 表示完成了一次迁移 */
function migrateFromV1(): boolean {
  const v1 = loadSettingsV1();
  if (!v1) return false;

  const definition = getProviderDefinition("volcengine");
  const migrated: SettingsV2 = {
    activeProviderId: "volcengine",
    providerConfigs: {
      volcengine: {
        providerId: "volcengine",
        apiKey: v1.apiKey,
        // V1 允许编辑 Base URL / 模型：非默认值尊重用户选择，默认值走 Registry
        baseUrl: v1.baseUrl || definition.defaultBaseUrl,
        modelId: v1.model || definition.modelSuggestions[0] || "",
        protocol: definition.protocol,
      },
    },
  };
  writeEnvelope(SETTINGS_V2_KEY, migrated, SETTINGS_V2_VERSION);

  // 读回校验：迁移结果必须可被本模块正确解析
  const verified = readEnvelope<SettingsV2 | null>(
    SETTINGS_V2_KEY,
    null,
    (value): value is SettingsV2 | null =>
      value === null || isSettingsV2Shape(value),
    SETTINGS_V2_VERSION
  );
  if (!verified) return false;
  return true;
}

/**
 * 读取 V2 设置：
 * - SSR / 未水合：返回 null（不触发迁移，避免渲染期写存储）
 * - 无 V2：若存在 V1 则迁移后返回；否则返回默认值（不主动写盘）
 * - 损坏：readEnvelope 已隔离坏数据，返回默认值
 */
export function loadSettingsV2(): SettingsV2 | null {
  if (!hasStorage()) return null;

  if (window.localStorage.getItem(SETTINGS_V2_KEY) === null) {
    const migrated = migrateFromV1();
    if (!migrated) return defaultSettingsV2();
  }

  const stored = readEnvelope<SettingsV2 | null>(
    SETTINGS_V2_KEY,
    null,
    (value): value is SettingsV2 | null =>
      value === null || isSettingsV2Shape(value),
    SETTINGS_V2_VERSION
  );
  if (stored === null) return defaultSettingsV2();
  return normalizeSettingsV2(stored);
}

/** 保存 V2 设置（归一化后写盘） */
export function saveSettingsV2(settings: SettingsV2): SettingsV2 {
  const normalized = normalizeSettingsV2(settings);
  writeEnvelope(SETTINGS_V2_KEY, normalized, SETTINGS_V2_VERSION);
  notifySettingsChanged();
  return normalized;
}

/** 清空全部设置：同时移除 V1 与 V2（V1 存在时不清会在下次读取被再次迁移） */
export function clearSettingsV2(): void {
  removeKey(SETTINGS_V2_KEY);
  removeKey(SETTINGS_KEY);
  notifySettingsChanged();
}

/** 仅清空当前激活 Provider 的 API Key，保留地址与模型 */
export function clearActiveApiKey(): void {
  const settings = loadSettingsV2();
  if (!settings) return;
  const config = settings.providerConfigs[settings.activeProviderId];
  if (!config) return;
  saveSettingsV2({
    ...settings,
    providerConfigs: {
      ...settings.providerConfigs,
      [settings.activeProviderId]: { ...config, apiKey: "" },
    },
  });
}

/** 从 V2 设置派生当前激活 Provider 的 ModelConfig（含 Key）；Key 缺失或未水合时返回 null */
export function getActiveModelConfig(
  settings: SettingsV2 | null
): ModelConfig | null {
  if (!settings) return null;
  const config = settings.providerConfigs[settings.activeProviderId];
  if (!config) return null;
  return {
    providerId: config.providerId,
    protocol: config.protocol,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    modelId: config.modelId,
  };
}
