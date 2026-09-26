// Provider Registry：内置 Provider 的静态定义唯一事实来源。
// Qwen / DeepSeek / Kimi 等不写专用定义，统一走 custom + OpenAI 兼容协议。
// 模型 ID 仅保留少量推荐，用户可自由编辑。

import { DEFAULT_BASE_URL, DEFAULT_MODEL } from "../config";
import type {
  Capabilities,
  ProviderDefinition,
  ProviderId,
} from "./types";

export const PROVIDER_REGISTRY: readonly ProviderDefinition[] = [
  {
    id: "volcengine",
    name: "火山方舟（豆包）",
    description:
      "Volcengine Ark Agent Plan，默认模型豆包 Seed Evolving，使用 Responses 兼容接口。",
    protocol: "openai-responses",
    defaultBaseUrl: DEFAULT_BASE_URL,
    // 官方模型清单（核查 2026-09-27）：https://docs.volcengine.com/docs/82379/2366394
    modelSuggestions: [
      DEFAULT_MODEL,
      "doubao-seed-2.0-pro",
      "doubao-seed-2.0-lite",
    ],
    capabilities: { structuredOutput: "native" },
    badgePrefix: "DOUBAO",
  },
  {
    id: "openai",
    name: "OpenAI",
    description:
      "OpenAI 官方 Responses API，支持 GPT 系列模型的原生结构化输出。",
    protocol: "openai-responses",
    defaultBaseUrl: "https://api.openai.com/v1",
    // 官方模型目录（核查 2026-09-27）：
    // https://developers.openai.com/api/docs/models
    modelSuggestions: ["gpt-6-astra", "gpt-6-sol", "gpt-6-luna"],
    capabilities: { structuredOutput: "native" },
    badgePrefix: "OPENAI",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description:
      "Anthropic Claude 模型，使用 Messages API，配合 JSON 指令与运行时校验。",
    protocol: "anthropic-messages",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    // 官方模型总览（核查 2026-09-27）：
    // https://docs.claude.com/en/docs/about-claude/models/overview
    modelSuggestions: [
      "claude-sonnet-4-6",
      "claude-opus-4-7",
      "claude-haiku-4-5-20251001",
    ],
    capabilities: { structuredOutput: "fallback" },
    badgePrefix: "ANTHROPIC",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description:
      "Google Gemini 模型，使用 generateContent 接口并强制 JSON 输出。",
    protocol: "gemini-generate-content",
    defaultBaseUrl:
      "https://generativelanguage.googleapis.com/v1beta",
    // 官方模型目录（核查 2026-09-27）：
    // https://ai.google.dev/gemini-api/docs/models
    modelSuggestions: [
      "gemini-3.5-flash",
      "gemini-2.5-pro",
      "gemini-3.1-flash-lite",
    ],
    capabilities: { structuredOutput: "compatible" },
    badgePrefix: "GEMINI",
  },
  {
    id: "custom",
    name: "自定义（OpenAI 兼容）",
    description:
      "任何兼容 OpenAI Chat Completions 的服务，例如 Qwen、DeepSeek、Kimi 或自建网关；地址经安全校验。",
    protocol: "openai-chat-completions",
    defaultBaseUrl: "",
    modelSuggestions: [],
    capabilities: { structuredOutput: "compatible" },
    badgePrefix: "CUSTOM",
  },
] as const;

export const PROVIDER_IDS: readonly ProviderId[] = PROVIDER_REGISTRY.map(
  (definition) => definition.id
);

export function getProviderDefinition(
  providerId: ProviderId
): ProviderDefinition {
  const definition = PROVIDER_REGISTRY.find(
    (item) => item.id === providerId
  );
  if (!definition) {
    // 理论不可达：providerId 为受约束字面量联合
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return definition;
}

export function getProviderCapabilities(
  providerId: ProviderId
): Capabilities {
  return getProviderDefinition(providerId).capabilities;
}

/** 新建 Provider 配置时的默认值（空 Key，等待用户填写） */
export function defaultProviderConfig(
  providerId: ProviderId
): import("./types").ProviderConfigV2 {
  const definition = getProviderDefinition(providerId);
  return {
    providerId,
    apiKey: "",
    baseUrl: definition.defaultBaseUrl,
    modelId: definition.modelSuggestions[0] ?? "",
    protocol: definition.protocol,
  };
}
