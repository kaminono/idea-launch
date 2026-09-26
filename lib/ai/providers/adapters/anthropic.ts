// Anthropic Messages API 协议 Adapter。
// 不使用 tool_use 强制结构化，统一走 JSON-only Prompt（fallback），
// 由 Runtime 做运行时守卫与最多一次结构修复。

import { BaseAdapter } from "./base";
import { joinUrl, postJson } from "../http";
import type {
  AdapterRequest,
  AdapterResult,
  Capabilities,
  ModelConfig,
} from "../types";
import { AiError } from "../../errors";

const ANTHROPIC_VERSION = "2023-06-01";

interface MessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
}

export class AnthropicMessagesAdapter extends BaseAdapter {
  getCapabilities(): Capabilities {
    return { structuredOutput: "fallback" };
  }

  async generateStructured(
    config: ModelConfig,
    request: AdapterRequest
  ): Promise<AdapterResult> {
    const start = Date.now();
    const endpoint = joinUrl(config.baseUrl, "/messages");

    const body = {
      model: config.modelId,
      max_tokens: 4096,
      system: request.system,
      messages: [{ role: "user", content: request.user }],
    };

    const { json } = await postJson(endpoint, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body,
      timeoutMs: request.timeoutMs,
    });

    const text = extractText(json);
    if (text === null) {
      throw new AiError("INVALID_STRUCTURED_OUTPUT");
    }
    return { text, latencyMs: Date.now() - start };
  }
}

function extractText(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const response = body as MessagesResponse;
  if (!Array.isArray(response.content)) return null;
  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.length > 0 ? parts.join("\n") : null;
}
