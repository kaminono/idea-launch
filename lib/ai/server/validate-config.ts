// Route Handler 服务端的模型配置校验。
// 规则：
// - 结构必须符合 ModelConfig 形状（providerId/protocol/apiKey/baseUrl/modelId）；
// - 内置 Provider 的 protocol / baseUrl 以 Registry 为准，忽略客户端篡改；
// - custom 的 protocol 可在支持协议内选择，baseUrl 必须通过 SSRF 防护；
// - apiKey / modelId 非空；统一 trim。
// 任何不合法都归为 BAD_CONFIGURATION，消息不回显请求内容。

import { AiError } from "../errors";
import { PROVIDER_IDS, getProviderDefinition } from "../providers/registry";
import { assertSafeBaseUrl, SsrfError } from "../providers/ssrf";
import type { ModelConfig, Protocol, ProviderId } from "../providers/types";

const SUPPORTED_PROTOCOLS: readonly Protocol[] = [
  "openai-responses",
  "openai-chat-completions",
  "anthropic-messages",
  "gemini-generate-content",
];

function isProviderId(value: unknown): value is ProviderId {
  return (
    typeof value === "string" &&
    (PROVIDER_IDS as readonly string[]).includes(value)
  );
}

function isProtocol(value: unknown): value is Protocol {
  return (
    typeof value === "string" &&
    (SUPPORTED_PROTOCOLS as readonly string[]).includes(value)
  );
}

/**
 * 校验并归一化请求携带的模型配置。
 * 内置 Provider 强制使用 Registry 的 protocol/baseUrl；
 * custom 使用用户选择的 protocol，并对 baseUrl 做 SSRF 校验。
 */
export async function validateModelConfig(
  value: unknown
): Promise<ModelConfig> {
  if (typeof value !== "object" || value === null) {
    throw badConfiguration();
  }
  const candidate = value as Record<string, unknown>;
  if (
    !isProviderId(candidate.providerId) ||
    typeof candidate.apiKey !== "string" ||
    typeof candidate.baseUrl !== "string" ||
    typeof candidate.modelId !== "string"
  ) {
    throw badConfiguration();
  }

  const apiKey = candidate.apiKey.trim();
  const modelId = candidate.modelId.trim();
  if (!apiKey) {
    throw new AiError("BAD_CONFIGURATION", "请先填写模型 API Key。");
  }
  if (!modelId) {
    throw new AiError("BAD_CONFIGURATION", "请先填写模型 ID。");
  }

  const definition = getProviderDefinition(candidate.providerId);

  if (candidate.providerId === "custom") {
    if (!isProtocol(candidate.protocol)) {
      throw badConfiguration();
    }
    try {
      await assertSafeBaseUrl(candidate.baseUrl);
    } catch (error) {
      if (error instanceof SsrfError) {
        throw new AiError("BAD_CONFIGURATION", error.message);
      }
      throw error;
    }
    return {
      providerId: "custom",
      protocol: candidate.protocol,
      apiKey,
      baseUrl: candidate.baseUrl.trim(),
      modelId,
    };
  }

  // 内置 Provider：协议与地址以服务端 Registry 为准
  return {
    providerId: candidate.providerId,
    protocol: definition.protocol,
    apiKey,
    baseUrl: definition.defaultBaseUrl,
    modelId,
  };
}

function badConfiguration(): AiError {
  return new AiError("BAD_CONFIGURATION");
}
