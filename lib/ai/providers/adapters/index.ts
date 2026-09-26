// Adapter 工厂：按 Provider 返回单例 Adapter。
// Runtime 只依赖这里的 getAdapter，不感知任何具体协议实现类。
// 同一协议在不同 Provider 下的细微差异（如火山额外 store/thinking）
// 通过不同实例隔离；custom 按用户选择的 protocol 路由到对应协议 Adapter。

import type {
  AIProviderAdapter,
  ModelConfig,
  Protocol,
  ProviderId,
} from "../types";
import { OpenAiResponsesAdapter } from "./openai-responses";
import { OpenAiChatCompletionsAdapter } from "./openai-chat";
import { AnthropicMessagesAdapter } from "./anthropic";
import { GeminiGenerateContentAdapter } from "./gemini";

const adapterSingletons: Record<
  Exclude<ProviderId, "custom">,
  AIProviderAdapter
> = {
  volcengine: new OpenAiResponsesAdapter("volcengine"),
  openai: new OpenAiResponsesAdapter("openai"),
  anthropic: new AnthropicMessagesAdapter(),
  gemini: new GeminiGenerateContentAdapter(),
};

const customAdapterByProtocol: Record<Protocol, AIProviderAdapter> = {
  "openai-responses": new OpenAiResponsesAdapter("custom"),
  "openai-chat-completions": new OpenAiChatCompletionsAdapter(),
  "anthropic-messages": new AnthropicMessagesAdapter(),
  "gemini-generate-content": new GeminiGenerateContentAdapter(),
};

export function getAdapter(config: ModelConfig): AIProviderAdapter {
  if (config.providerId === "custom") {
    return customAdapterByProtocol[config.protocol];
  }
  return adapterSingletons[config.providerId];
}
