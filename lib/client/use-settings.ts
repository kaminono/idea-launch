// 通过 useSyncExternalStore 订阅本地设置，避免在 effect 中同步 setState。

import { useSyncExternalStore } from "react";
import { SETTINGS_CHANGE_EVENT } from "./events";
import { SETTINGS_KEY } from "@/lib/storage/keys";
import { hasStorage } from "@/lib/storage/core";
import { loadSettings } from "@/lib/storage/settings";
import type { Settings } from "@/lib/types";

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(SETTINGS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SETTINGS_CHANGE_EVENT, callback);
  };
}

let lastRaw: string | null | undefined;
let cached: Settings | null = null;

function getSnapshot(): Settings | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (raw !== lastRaw) {
    lastRaw = raw;
    cached = raw === null ? null : loadSettings();
  }
  return cached;
}

function getServerSnapshot(): Settings | null {
  return null;
}

/** 当前设置；SSR / 未水合时返回 null */
export function useSettings(): Settings | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 当前是否已配置 API Key */
export function useHasApiKey(): boolean {
  const settings = useSettings();
  return Boolean(settings?.apiKey);
}

/** 通知同页面设置已变更（storage 事件不会在同文档触发） */
export function notifySettingsChanged(): void {
  if (hasStorage()) {
    window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT));
  }
}
