"use client";

import { useEffect, useState } from "react";

const PROGRESS_STEPS = [
  "正在理解你的产品想法",
  "正在识别目标用户",
  "正在提取核心问题",
  "正在检查已有约束",
  "正在识别缺失信息",
] as const;

export function AnalysisProgress() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) =>
        prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="rounded-[16px] border border-subtle bg-surface p-6">
        <ul className="space-y-4">
          {PROGRESS_STEPS.map((label, index) => {
            const state =
              index < activeIndex
                ? "done"
                : index === activeIndex
                  ? "active"
                  : "pending";
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={[
                    "h-2 w-2 shrink-0 rounded-full transition-colors duration-200",
                    state === "done"
                      ? "bg-success"
                      : state === "active"
                        ? "animate-pulse bg-accent"
                        : "bg-subtle",
                  ].join(" ")}
                />
                <span
                  className={[
                    "text-sm transition-colors duration-200",
                    state === "pending" ? "text-faint" : "text-body",
                  ].join(" ")}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}

function SkeletonCard({ lines }: { lines: number }) {
  return (
    <div className="rounded-[12px] border border-subtle bg-surface p-5">
      <div className="skeleton mb-4 h-3.5 w-24" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="skeleton h-3"
            style={{ width: `${88 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}
