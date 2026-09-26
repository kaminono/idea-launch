"use client";

import { History, Settings } from "lucide-react";
import Link from "next/link";

interface TopBarProps {
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ onOpenHistory, onOpenSettings }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-border bg-paper/85 px-5 backdrop-blur md:px-10 lg:px-12">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark />
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            idea-launch
          </span>
          <span className="hidden text-xs text-ink-secondary sm:inline">
            独立开发立项助手
          </span>
        </span>
      </Link>
      <nav className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenHistory}
          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm text-ink-secondary transition-colors duration-150 hover:bg-surface-secondary"
        >
          <History size={15} />
          <span className="hidden sm:inline">历史项目</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm text-ink-secondary transition-colors duration-150 hover:bg-surface-secondary"
        >
          <Settings size={15} />
          <span className="hidden sm:inline">设置</span>
        </button>
      </nav>
    </header>
  );
}

/** 品牌标识：一条收敛轨迹，Aubergine 节点汇入 Brand Orange 终点。
 *  抽象路径 / 收敛节点，禁止火箭 / Sparkle / 机器人。 */
export function BrandMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M3.5 18.5C8 18 9.5 10 20.5 6.5"
        stroke="#F15A37"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="3.5" cy="18.5" r="2.1" fill="#4A304D" />
      <circle cx="11.5" cy="13" r="1.6" fill="#4A304D" fillOpacity="0.55" />
      <circle cx="20.5" cy="6.5" r="2.6" fill="#F15A37" />
    </svg>
  );
}
