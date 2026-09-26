// AI 调用错误归一化：对外只暴露错误码与用户可读中文文案。
// 任何错误信息中都不允许包含 API Key、Authorization 头或请求体。

import type { AiErrorCode, RunError } from "@/lib/types";

const USER_MESSAGES: Record<AiErrorCode, string> = {
  INVALID_API_KEY: "API Key 无效或没有访问权限，请检查 Key 是否正确、是否已开通对应服务。",
  MODEL_NOT_FOUND: "模型不可用，请检查模型 ID 是否正确，或该服务是否已提供此模型。",
  RATE_LIMITED: "请求过于频繁或额度已用尽，请稍后重试，或检查账户额度。",
  TIMEOUT: "模型响应超时，请稍后重试。",
  INVALID_STRUCTURED_OUTPUT:
    "模型返回的结构不符合要求，请重试；若多次失败可调整想法描述后再试。",
  PROVIDER_UNAVAILABLE: "模型服务暂时不可用，请稍后重试；若持续失败请检查服务状态。",
  BAD_CONFIGURATION: "模型配置有误，请检查 API 地址、模型 ID 与相关设置后重试。",
};

export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message?: string) {
    super(message ?? USER_MESSAGES[code]);
    this.name = "AiError";
    this.code = code;
  }

  toRunError(): RunError {
    return { code: this.code, message: this.message };
  }
}

export function userMessage(code: AiErrorCode): string {
  return USER_MESSAGES[code];
}

/**
 * 将 Provider 响应中的 HTTP 状态归一化为 AiError（七码）。
 * 各 Provider 的状态码语义统一在此处理：只读状态码，绝不解析回显 Key。
 * 不附带原始错误正文，避免泄露上游细节。
 */
export function normalizeHttpStatus(status: number): AiError {
  if (status === 401 || status === 403) {
    return new AiError("INVALID_API_KEY");
  }
  if (status === 404) {
    return new AiError("MODEL_NOT_FOUND");
  }
  if (status === 408 || status === 504) {
    return new AiError("TIMEOUT");
  }
  if (status === 429) {
    return new AiError("RATE_LIMITED");
  }
  if (status >= 500) {
    return new AiError("PROVIDER_UNAVAILABLE");
  }
  // 400 / 422 等：可能是模型名不支持，也可能是配置问题，
  // 默认归为配置错误，消息不回显上游内容。
  return new AiError("BAD_CONFIGURATION");
}

/**
 * 尽力从错误体中区分「模型不存在」与其他配置错误。
 * 只匹配明确的错误类型 / code 标识，不返回任何上游原文。
 */
export function refineBadRequestError(body: unknown): AiError {
  const marker = extractErrorMarker(body);
  if (marker === null) return new AiError("BAD_CONFIGURATION");
  if (/model.{0,12}(not|unavailable|unknown|exist)|unknown.{0,6}model/i.test(marker)) {
    return new AiError("MODEL_NOT_FOUND");
  }
  if (/api.?key|auth|permission|access/i.test(marker)) {
    return new AiError("INVALID_API_KEY");
  }
  return new AiError("BAD_CONFIGURATION");
}

/** 读取上游错误体中的短标识（type/code），长度受限，绝不拼进对外消息 */
function extractErrorMarker(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const error = (body as { error?: unknown }).error;
  const container =
    typeof error === "object" && error !== null
      ? (error as { type?: unknown; code?: unknown })
      : typeof error === "string"
        ? { code: error }
        : (body as { type?: unknown; code?: unknown });

  const candidates = [container.type, container.code];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length <= 60) {
      return candidate;
    }
  }
  return null;
}
