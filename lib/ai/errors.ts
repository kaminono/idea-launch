// AI 调用错误归一化：对外只暴露错误码与用户可读中文文案。
// 任何错误信息中都不允许包含 API Key。

import type { AiErrorCode, RunError } from "@/lib/types";

const USER_MESSAGES: Record<AiErrorCode, string> = {
  AI_MISSING_KEY: "尚未配置 API Key，请先在设置中填写豆包 API Key。",
  AI_AUTH_ERROR:
    "API Key 无效或没有访问权限，请检查 Key 是否正确、是否已开通 Agent Plan。",
  AI_NETWORK_ERROR:
    "无法连接到模型服务，请检查本机网络或 API 地址后重试。",
  AI_PROVIDER_ERROR: "模型服务返回错误，请稍后重试；若持续失败请检查额度与服务状态。",
  AI_BAD_REQUEST:
    "请求未被模型服务接受，请检查 API 地址、模型名与输入内容后重试。",
  AI_PARSE_ERROR: "模型返回的内容不是有效 JSON，请重试一次。",
  AI_INVALID_RESPONSE:
    "模型返回的结构不符合要求，请重试；若多次失败可调整想法描述后再试。",
  AI_TIMEOUT: "模型响应超时，请稍后重试。",
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
 * 将 fetch 响应中的 HTTP / 开放平台错误归一化为 AiError。
 * 只读取状态码与错误类型，绝不透传请求头，也不回显原始 Key。
 */
export function normalizeHttpError(status: number, body: unknown): AiError {
  const code = mapStatusToCode(status, body);
  let detail = "";
  if (isProviderErrorBody(body)) {
    const type = body.error.type;
    if (typeof type === "string" && type.length <= 60) {
      detail = `（服务错误类型：${type}）`;
    }
  }
  return new AiError(code, `${USER_MESSAGES[code]}${detail}`);
}

interface ProviderErrorBody {
  error: { type?: unknown; code?: unknown };
}

function isProviderErrorBody(body: unknown): body is ProviderErrorBody {
  if (typeof body !== "object" || body === null) return false;
  const error = (body as { error?: unknown }).error;
  return typeof error === "object" && error !== null;
}

function mapStatusToCode(status: number, body: unknown): AiErrorCode {
  if (status === 401 || status === 403) return "AI_AUTH_ERROR";
  if (status === 408 || status === 504) return "AI_TIMEOUT";
  if (status === 400 || status === 404 || status === 422) {
    return "AI_BAD_REQUEST";
  }
  if (status === 429 || status >= 500) return "AI_PROVIDER_ERROR";
  if (isProviderErrorBody(body) && body.error) return "AI_PROVIDER_ERROR";
  return "AI_PROVIDER_ERROR";
}
