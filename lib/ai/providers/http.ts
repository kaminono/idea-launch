// Provider HTTP 调用共享工具：统一超时、网络错误与非 2xx 归一化。
// 只处理状态码与短错误标识，绝不解析 / 回显 API Key。

import { AiError, normalizeHttpStatus, refineBadRequestError } from "../errors";

export interface PostJsonOptions {
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
}

/** 发起 POST JSON 请求，返回解析后的响应体；非 2xx 统一抛 AiError */
export async function postJson(
  url: string,
  options: PostJsonOptions
): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: options.headers,
      body: JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    throw mapNetworkError(error);
  } finally {
    clearTimeout(timer);
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw toProviderError(response.status, json);
  }
  return { status: response.status, json };
}

/** 非 2xx → 七码错误；400/422 尽力区分模型不存在 / Key 无效 */
function toProviderError(status: number, json: unknown): AiError {
  if (status === 400 || status === 422) {
    return refineBadRequestError(json);
  }
  return normalizeHttpStatus(status);
}

/** 网络层错误：中断 → TIMEOUT，其余（DNS / 连接失败等）→ PROVIDER_UNAVAILABLE */
export function mapNetworkError(error: unknown): AiError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AiError("TIMEOUT");
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new AiError("TIMEOUT");
  }
  return new AiError("PROVIDER_UNAVAILABLE");
}

/** 拼接 Base URL 与路径（去除尾部斜杠） */
export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.trim().replace(/\/+$/, "")}${path}`;
}
