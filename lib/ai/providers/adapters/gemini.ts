// Google Gemini generateContent 协议 Adapter。
// API Key 以 ?key= 查询参数传递（服务端转发，不写日志）。
// 强制 JSON 输出（responseMimeType），复杂 Schema 不强转，
// 统一走 compatible：JSON-only Prompt + 运行时守卫。

import { BaseAdapter } from "./base";
import { postJson } from "../http";
import type {
  AdapterRequest,
  AdapterResult,
  Capabilities,
  ModelConfig,
} from "../types";
import { AiError } from "../../errors";

interface GenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export class GeminiGenerateContentAdapter extends BaseAdapter {
  getCapabilities(): Capabilities {
    return { structuredOutput: "compatible" };
  }

  async generateStructured(
    config: ModelConfig,
    request: AdapterRequest
  ): Promise<AdapterResult> {
    const start = Date.now();
    const base = config.baseUrl.trim().replace(/\/+$/, "");
    const url = `${base}/models/${encodeURIComponent(config.modelId)}:generateContent`;
    const endpoint = `${url}?key=${encodeURIComponent(config.apiKey)}`;

    const body = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [
        { role: "user", parts: [{ text: request.user }] },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const { json } = await postJson(endpoint, {
      headers: { "Content-Type": "application/json" },
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
  const response = body as GenerateContentResponse;
  const parts = response.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const textParts = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter(Boolean);
  return textParts.length > 0 ? textParts.join("\n") : null;
}
