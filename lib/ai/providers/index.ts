// Provider-agnostic AI Runtime 统一出口。
// 业务层与 Route Handler 只从这里引用 Runtime / Registry / 类型。

export * from "./types";
export {
  PROVIDER_REGISTRY,
  PROVIDER_IDS,
  getProviderDefinition,
  getProviderCapabilities,
  defaultProviderConfig,
} from "./registry";
export { getAdapter } from "./adapters";
export {
  generateStructured,
  testConnection,
  type ResultGuard,
  type StructuredInvocation,
} from "./runtime";
export { assertSafeBaseUrl, SsrfError } from "./ssrf";
