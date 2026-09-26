// OpenAI Chat Completions 兼容协议 Adapter。
// 用于 Custom（OpenAI-compatible，如 Qwen / DeepSeek / Kimi 等兼容网关）。
// 这些服务对 strict json_schema 支持参差不齐，统一使用兼容性最好的
// response_format: json_object，配合 JSON-only Prompt 与运行时守卫。

import { BaseAdapter } from "./base";
import { joinUrl, postJson } from "../http";
import type {
  AdapterRequest,
  AdapterResult,
  Capabilities,
  ModelConfig,
} from "../types";
import { AiError } from "../../errors";

interface ChatCompletionsResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

export class OpenAiChatCompletionsAdapter extends BaseAdapter {
  getCapabilities(): Capabilities {
    return { structuredOutput: "compatible" };
  }

  async generateStructured(
    config: ModelConfig,
    request: AdapterRequest
  ): Promise<AdapterResult> {
    const start = Date.now();
    const endpoint = joinUrl(config.baseUrl, "/chat/completions");

    const body: Record<string, unknown> = {
      model: config.modelId,
      // JSON-only 指令由 Runtime 注入到 system 头部，这里只负责强制 JSON 模式
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      response_format: { type: "json_object" },
    };

    const { json } = await postJson(endpoint, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body,
      timeoutMs: request.timeoutMs,
    });

    const text = extractContent(json);
    if (text === null) {
      throw new AiError("INVALID_STRUCTURED_OUTPUT");
    }
    return { text, latencyMs: Date.now() - start };
  }
}

function extractContent(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const response = body as ChatCompletionsResponse;
  const content = response.choices?.[0]?.message?.content;
  return typeof content === "string" && content.length > 0 ? content : null;
}
