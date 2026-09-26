// 通过 useSyncExternalStore 订阅本地设置 V2，避免在 effect 中同步 setState。
// 首次订阅若仅存在 V1 数据，loadSettingsV2 会完成 V1→V2 迁移并派发变更事件。

import { useSyncExternalStore } from "react";
import { SETTINGS_CHANGE_EVENT } from "./events";
import { SETTINGS_V2_KEY } from "@/lib/storage/keys";
import { hasStorage } from "@/lib/storage/core";
import {
  getActiveModelConfig,
  loadSettingsV2,
} from "@/lib/storage/settings-v2";
import type { ModelConfig, SettingsV2 } from "@/lib/types";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(SETTINGS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SETTINGS_CHANGE_EVENT, callback);
  };
}

let lastRaw: string | null | undefined;
let cached: SettingsV2 | null = null;

function getSnapshot(): SettingsV2 | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(SETTINGS_V2_KEY);
  if (raw !== lastRaw) {
    lastRaw = raw;
    cached = loadSettingsV2();
  }
  return cached;
}

function getServerSnapshot(): SettingsV2 | null {
  return null;
}

/** 当前设置 V2；SSR / 未水合时返回 null */
export function useSettings(): SettingsV2 | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 当前激活 Provider 的完整 ModelConfig（含 API Key）；未水合时返回 null */
export function useActiveModelConfig(): ModelConfig | null {
  const settings = useSettings();
  return getActiveModelConfig(settings);
}

/** 当前激活 Provider 是否已配置 API Key */
export function useHasApiKey(): boolean {
  const modelConfig = useActiveModelConfig();
  return Boolean(modelConfig?.apiKey);
}
