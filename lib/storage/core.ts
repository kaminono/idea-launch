// localStorage 底层封装：SSR 守卫、版本化 envelope、损坏隔离与安全重置。
// 业务层只通过本文件读写，组件中禁止直接操作 localStorage。

import { STORAGE_VERSION } from "./keys";

interface Envelope<T> {
  version: number;
  data: T;
}

/** 当前是否运行在可访问 localStorage 的浏览器环境 */
export function hasStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

/**
 * 读取并解析 envelope。
 * - SSR / 无数据：返回 fallback
 * - JSON 损坏 / 版本不符 / 结构异常：备份原始值并安全重置为 fallback
 * - version 可指定数据版本（默认 v1），供 Settings V2 等复用
 */
export function readEnvelope<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
  version: number = STORAGE_VERSION
): T {
  if (!hasStorage()) return fallback;

  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    quarantine(key, raw);
    return fallback;
  }

  const envelope = parsed as Partial<Envelope<T>>;
  if (
    envelope.version !== version ||
    envelope.data === undefined ||
    !validate(envelope.data)
  ) {
    quarantine(key, raw);
    return fallback;
  }

  return envelope.data;
}

/** 写入版本化 envelope */
export function writeEnvelope<T>(
  key: string,
  data: T,
  version: number = STORAGE_VERSION
): void {
  if (!hasStorage()) return;
  const envelope: Envelope<T> = { version, data };
  window.localStorage.setItem(key, JSON.stringify(envelope));
}

/** 移除一个 key */
export function removeKey(key: string): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(key);
}

/** 备份损坏数据后删除原 key，避免一条坏数据持续导致解析失败 */
function quarantine(key: string, raw: string): void {
  if (!hasStorage()) return;
  const backupKey = `${key}:corrupted:${Date.now()}`;
  try {
    window.localStorage.setItem(backupKey, raw);
    window.localStorage.removeItem(key);
  } catch {
    // 存储已满等极端情况下直接移除，保证后续读写可用
    window.localStorage.removeItem(key);
  }
}
