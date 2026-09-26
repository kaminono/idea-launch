// Adapter 公共基类与共享工具：连接测试、JSON 宽松解析。
// 所有协议 Adapter 继承 BaseAdapter，避免 testConnection 逻辑重复。

import { REQUEST_TIMEOUT_MS } from "../../config";
import { AiError } from "../../errors";
import type {
  AIProviderAdapter,
  AdapterResult,
  ModelConfig,
} from "../types";

/** 连接测试用的最小结构化 Schema */
export const TEST_CONNECTION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
};

/** 非 native 能力时注入的 JSON-only 指令（Runtime 与连接测试共用） */
export const JSON_ONLY_DIRECTIVE =
  "你必须只输出一个符合要求的 JSON 对象，不要输出任何解释、前后缀文字或 Markdown 代码块标记。";

/** 去除模型可能返回的 ```json 代码块包裹 */
export function stripCodeFence(text: string): string {
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text.trim());
  return fenced ? fenced[1] : text;
}

/** 宽松解析：失败返回 null，不抛错（供连接测试使用） */
export function parseLooseJson(text: string): unknown | null {
  try {
    return JSON.parse(stripCodeFence(text).trim());
  } catch {
    return null;
  }
}

/**
 * 完整链路连接测试：可达性 + Key + 模型 + 结构化输出 { "ok": true }。
 * 不打印 / 不回显 Key、请求头或请求体。
 */
async function runConnectionTest(
  adapter: AIProviderAdapter,
  config: ModelConfig
): Promise<{ latencyMs: number }> {
  const start = Date.now();
  const baseSystem = "仅做连通性验证。";
  const system =
    adapter.getCapabilities().structuredOutput === "native"
      ? baseSystem
      : `${JSON_ONLY_DIRECTIVE}\n\n${baseSystem}`;
  let result: AdapterResult;
  try {
    result = await adapter.generateStructured(config, {
      system,
      user: "ping",
      jsonSchema: TEST_CONNECTION_SCHEMA,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });
  } catch (error) {
    // 协议层错误（401/404/超时等）原样向上归一化
    throw error;
  }
  const parsed = parseLooseJson(result.text);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { ok?: unknown }).ok !== true
  ) {
    throw new AiError("INVALID_STRUCTURED_OUTPUT");
  }
  return { latencyMs: Date.now() - start };
}

/** 协议 Adapter 基类：仅统一 testConnection */
export abstract class BaseAdapter implements AIProviderAdapter {
  abstract generateStructured(
    config: ModelConfig,
    request: import("../types").AdapterRequest
  ): Promise<AdapterResult>;

  abstract getCapabilities(): import("../types").Capabilities;

  testConnection(config: ModelConfig): Promise<{ latencyMs: number }> {
    return runConnectionTest(this, config);
  }
}
