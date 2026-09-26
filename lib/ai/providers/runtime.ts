// AI Runtime：业务节点访问模型的唯一入口。
// 职责：按 modelConfig 选择 Adapter；按结构化能力包装 JSON-only 指令；
//       解析输出并用业务守卫运行时校验；失败最多做一次结构修复。
// 业务 Prompt / Schema / 守卫全部由上层（client.ts）传入，Runtime 不感知业务。

import { AiError } from "../errors";
import { getAdapter } from "./adapters";
import { JSON_ONLY_DIRECTIVE, stripCodeFence } from "./adapters/base";
import type { AdapterResult, ModelConfig } from "./types";

/** 守卫：判定 unknown 是否为目标结构化结果 */
export type ResultGuard<T> = (value: unknown) => value is T;

export interface StructuredInvocation<T> {
  config: ModelConfig;
  system: string;
  user: string;
  jsonSchema: Record<string, unknown>;
  /** 动作级超时（毫秒），默认 120000 */
  timeoutMs: number;
  guard: ResultGuard<T>;
}

const REPAIR_DIRECTIVE =
  "上一次输出不是合法或不合规的 JSON。请严格依据要求，仅输出修正后的完整 JSON 对象，不要输出任何解释或 Markdown 标记。";

/**
 * 执行一次结构化生成并通过守卫校验。
 * native：直接依赖协议强制 Schema，仍做解析与守卫兜底；
 * compatible / fallback：在 system 头部注入 JSON-only 指令。
 * 校验失败时最多修复一次，再失败抛 INVALID_STRUCTURED_OUTPUT。
 */
export async function generateStructured<T>(
  invocation: StructuredInvocation<T>
): Promise<{ result: T; latencyMs: number }> {
  const adapter = getAdapter(invocation.config);
  const capabilities = adapter.getCapabilities();

  const wrappedSystem =
    capabilities.structuredOutput === "native"
      ? invocation.system
      : `${JSON_ONLY_DIRECTIVE}\n\n${invocation.system}`;

  const first = await safeCallAdapter(invocation, wrappedSystem, invocation.user);

  const firstParsed = tryParse(first.text);
  if (firstParsed.ok && invocation.guard(firstParsed.value)) {
    return { result: firstParsed.value, latencyMs: first.latencyMs };
  }

  // 最多一次结构修复
  const repairSystem = `${REPAIR_DIRECTIVE}\n\n${wrappedSystem}`;
  const repairUser = `${invocation.user}\n\n请重新输出合规的 JSON 对象。`;
  const second = await safeCallAdapter(invocation, repairSystem, repairUser);

  const secondParsed = tryParse(second.text);
  if (secondParsed.ok && invocation.guard(secondParsed.value)) {
    return {
      result: secondParsed.value,
      latencyMs: first.latencyMs + second.latencyMs,
    };
  }

  throw new AiError("INVALID_STRUCTURED_OUTPUT");
}

/** 连接测试：完整链路（可达 / Key / 模型 / 结构化 {ok:true}），返回耗时 */
export async function testConnection(
  config: ModelConfig
): Promise<{ latencyMs: number }> {
  const adapter = getAdapter(config);
  return adapter.testConnection(config);
}

async function safeCallAdapter<T>(
  invocation: StructuredInvocation<T>,
  system: string,
  user: string
): Promise<AdapterResult> {
  const adapter = getAdapter(invocation.config);
  return adapter.generateStructured(invocation.config, {
    system,
    user,
    jsonSchema: invocation.jsonSchema,
    timeoutMs: invocation.timeoutMs,
  });
}

interface ParseSuccess {
  ok: true;
  value: unknown;
}
interface ParseFailure {
  ok: false;
}

function tryParse(text: string): ParseSuccess | ParseFailure {
  try {
    return { ok: true, value: JSON.parse(stripCodeFence(text).trim()) };
  } catch {
    return { ok: false };
  }
}
