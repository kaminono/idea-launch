import { useSyncExternalStore } from "react";

const EMPTY_SUBSCRIBE = (): (() => void) => () => {};

/** 是否已完成水合：服务端与首次渲染返回 false，水合后恒为 true */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    EMPTY_SUBSCRIBE,
    () => true,
    () => false
  );
}
