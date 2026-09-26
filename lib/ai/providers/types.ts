// Provider-agnostic AI Runtime 的核心类型契约。
// 业务节点只依赖这里的统一抽象，不知道任何具体厂商。
// 与 docs/04-data-schema.md 的 Settings V2 / modelConfig 章节保持一致。

/** 内置 Provider 标识（Qwen/DeepSeek/Kimi 等走 custom） */
export type ProviderId =
  | "volcengine"
  | "openai"
  | "anthropic"
  | "gemini"
  | "custom";

/** 统一支持的调用协议；协议差异全部留在 Adapter */
export type Protocol =
  | "openai-responses"
  | "openai-chat-completions"
  | "anthropic-messages"
  | "gemini-generate-content";

/** 结构化输出能力：
 * native     —— 协议原生支持强制 JSON Schema；
 * compatible —— 支持 JSON mode / 受限 schema，不保证严格；
 * fallback   —— 只能靠 JSON-only Prompt + 运行时校验。 */
export type StructuredOutputMode = "native" | "compatible" | "fallback";

export interface Capabilities {
  structuredOutput: StructuredOutputMode;
}

/** 随每次请求临时发送的模型配置；API Key 仅在请求生命周期内存在 */
export interface ModelConfig {
  providerId: ProviderId;
  protocol: Protocol;
  apiKey: string;
  baseUrl: string;
  modelId: string;
}

/** Adapter 统一入参：业务层已准备好的 system/user 与 JSON Schema */
export interface AdapterRequest {
  system: string;
  user: string;
  jsonSchema: Record<string, unknown>;
  /** 动作级超时（毫秒），由业务节点透传，默认 120000 */
  timeoutMs: number;
}

/** Adapter 统一出参：模型原始输出文本与耗时 */
export interface AdapterResult {
  text: string;
  latencyMs: number;
}

/** Provider Adapter：单一 Provider 协议的全部差异都收敛在此 */
export interface AIProviderAdapter {
  /** 发起一次最小结构化请求（{ ok: true }）验证可达性 / Key / 模型 / 结构化能力 */
  testConnection(config: ModelConfig): Promise<{ latencyMs: number }>;
  /** 按统一入参发起结构化生成，返回模型输出文本 */
  generateStructured(
    config: ModelConfig,
    request: AdapterRequest
  ): Promise<AdapterResult>;
  /** 声明该 Provider 的结构化输出能力 */
  getCapabilities(): Capabilities;
}

/** Registry 中的 Provider 静态定义 */
export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  description: string;
  protocol: Protocol;
  defaultBaseUrl: string;
  /** 少量推荐模型，可自由编辑；禁止硬编码长清单 */
  modelSuggestions: readonly string[];
  capabilities: Capabilities;
  /** 动态 Badge 前缀，如 DOUBAO / OPENAI / CUSTOM */
  badgePrefix: string;
}

/** Settings V2 中单个 Provider 的持久化配置 */
export interface ProviderConfigV2 {
  providerId: ProviderId;
  apiKey: string;
  baseUrl: string;
  modelId: string;
  protocol: Protocol;
}

/** Settings V2 持久化结构 */
export interface SettingsV2 {
  activeProviderId: ProviderId;
  providerConfigs: Partial<Record<ProviderId, ProviderConfigV2>>;
}

/** localStorage envelope：Settings V2 */
export interface SettingsV2Envelope {
  version: 2;
  data: SettingsV2;
}
