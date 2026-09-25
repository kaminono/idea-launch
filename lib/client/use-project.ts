import { useMemo, useSyncExternalStore } from "react";
import { PROJECTS_CHANGE_EVENT } from "./events";
import { getProject } from "@/lib/storage/projects";
import { hasStorage } from "@/lib/storage/core";
import type { Project } from "@/lib/types";

interface ProjectStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Project | null;
}

/**
 * 单个项目的外部存储：首次读取惰性缓存，收到 storage / 项目变更事件后刷新。
 */
function createProjectStore(projectId: string): ProjectStore {
  let cached: Project | null = null;
  let initialized = false;
  const listeners = new Set<() => void>();

  const getSnapshot = (): Project | null => {
    if (!hasStorage()) return null;
    if (!initialized) {
      initialized = true;
      cached = getProject(projectId);
    }
    return cached;
  };

  const refresh = () => {
    if (!hasStorage()) return;
    cached = getProject(projectId);
    initialized = true;
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    window.addEventListener("storage", refresh);
    window.addEventListener(PROJECTS_CHANGE_EVENT, refresh);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(PROJECTS_CHANGE_EVENT, refresh);
    };
  };

  return { subscribe, getSnapshot };
}

/**
 * 订阅单个本地项目的最新快照。
 * 返回 undefined 表示尚未水合；null 表示项目不存在。
 */
export function useProject(projectId: string): Project | null | undefined {
  const store = useMemo(() => createProjectStore(projectId), [projectId]);
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => undefined
  );
}
