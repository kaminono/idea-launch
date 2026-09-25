// 轻量的本地数据变更事件（同文档内通知，storage 事件不触发于自身写入）。

import { hasStorage } from "@/lib/storage/core";

export const SETTINGS_CHANGE_EVENT = "idea-launch:settings-changed";
export const PROJECTS_CHANGE_EVENT = "idea-launch:projects-changed";

function notify(eventName: string): void {
  if (hasStorage()) {
    window.dispatchEvent(new Event(eventName));
  }
}

export function notifySettingsChanged(): void {
  notify(SETTINGS_CHANGE_EVENT);
}

export function notifyProjectsChanged(): void {
  notify(PROJECTS_CHANGE_EVENT);
}
