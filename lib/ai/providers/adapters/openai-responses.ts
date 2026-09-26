// OpenAI Responses API 兼容协议 Adapter。
// 覆盖 Volcengine Ark Agent Plan（默认）与 OpenAI 官方 /responses。
// 结构化输出使用原生 text.format json_schema（strict）。

import { BaseAdapter } from "./base";
import { joinUrl, postJson } from "../http";
import type {
  AdapterRequest,
  AdapterResult,
  Capabilities,
  ModelConfig,
  ProviderId,
} from "../types";
import { AiError } from "../../errors";

interface ResponsesApiResponse {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

/** 火山 Agent Plan 需要关闭 thinking 与 store，保证确定性纯 JSON 输出 */
const VOLCENGINE_EXTRA = {
  store: false,
  thinking: { type: "disabled" },
} as const;

export class OpenAiResponsesAdapter extends BaseAdapter {
  private readonly providerId: ProviderId;

  constructor(providerId: ProviderId) {
    super();
    this.providerId = providerId;
  }

  getCapabilities(): Capabilities {
    return { structuredOutput: "native" };
  }

  async generateStructured(
    config: ModelConfig,
    request: AdapterRequest
  ): Promise<AdapterResult> {
    const start = Date.now();
    const endpoint = joinUrl(config.baseUrl, "/responses");

    const body: Record<string, unknown> = {
      model: config.modelId,
      ...(this.providerId === "volcengine" ? VOLCENGINE_EXTRA : {}),
      text: {
        format: {
          type: "json_schema",
          name: "structured_result",
          description: "Structured result conforming to the JSON schema.",
          strict: true,
          schema: request.jsonSchema,
        },
      },
      input: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    };

    const { json } = await postJson(endpoint, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body,
      timeoutMs: request.timeoutMs,
    });

    const text = extractOutputText(json);
    if (text === null) {
      throw new AiError("INVALID_STRUCTURED_OUTPUT");
    }
    return { text, latencyMs: Date.now() - start };
  }
}

/** 提取模型输出文本（忽略 reasoning，不展示思维链） */
function extractOutputText(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const response = body as ResponsesApiResponse;

  if (typeof response.output_text === "string") {
    return response.output_text;
  }
  if (!Array.isArray(response.output)) return null;

  const parts: string[] = [];
  for (const item of response.output) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return parts.length > 0 ? parts.join("\n") : null;
}
