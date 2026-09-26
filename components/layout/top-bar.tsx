"use client";

import { History, Settings } from "lucide-react";
import Link from "next/link";

interface TopBarProps {
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ onOpenHistory, onOpenSettings }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-subtle bg-paper/85 px-5 backdrop-blur md:px-10 lg:px-12">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark />
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Idea Launch
          </span>
          <span className="hidden text-xs text-muted sm:inline">
            独立开发立项助手
          </span>
        </span>
      </Link>
      <nav className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenHistory}
          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm text-body transition-colors duration-150 hover:bg-surface-secondary"
        >
          <History size={15} />
          <span className="hidden sm:inline">历史项目</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm text-body transition-colors duration-150 hover:bg-surface-secondary"
        >
          <Settings size={15} />
          <span className="hidden sm:inline">设置</span>
        </button>
      </nav>
    </header>
  );
}

/** 品牌标识：一条收敛轨迹，Aubergine 节点汇入 Brand Orange 终点。
 *  抽象路径 / 收敛节点，禁止火箭 / Sparkle / 机器人。
 *  图形源文件：/public/brand-mark.svg，同时作为浏览器 favicon 使用。 */
export function BrandMark() {
  // eslint-disable-next-line @next/next/no-img-element -- 24px 内联品牌矢量图，无需 next/image 优化
  return (
    <img
      src="/brand-mark.svg"
      width="24"
      height="24"
      alt=""
      aria-hidden="true"
      className="shrink-0"
    />
  );
}
