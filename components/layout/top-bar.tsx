"use client";

import { History, Settings } from "lucide-react";
import Link from "next/link";

interface TopBarProps {
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ onOpenHistory, onOpenSettings }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-subtle bg-surface/90 px-6 backdrop-blur lg:px-12">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark />
        <span className="text-[15px] font-semibold tracking-tight text-strong">
          idea-launch
        </span>
      </Link>
      <nav className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenHistory}
          className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3 text-sm text-body hover:bg-muted-bg transition-colors duration-150"
        >
          <History size={15} />
          历史项目
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3 text-sm text-body hover:bg-muted-bg transition-colors duration-150"
        >
          <Settings size={15} />
          设置
        </button>
      </nav>
    </header>
  );
}

/** 极简几何标识：两个叠放的圆角方块，Indigo → Violet，禁止机器人 / 星星 */
export function BrandMark() {
  return (
    <span className="relative flex h-7 w-7 items-center justify-center">
      <span className="absolute h-4 w-4 rotate-6 rounded-[7px] bg-accent/20" />
      <span className="absolute h-4 w-4 -rotate-6 rounded-[7px] bg-gradient-to-br from-accent to-violet-accent opacity-90" />
    </span>
  );
}
