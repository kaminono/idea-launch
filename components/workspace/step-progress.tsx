"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

interface StepProgressProps {
  steps: readonly string[];
  label: string;
  intervalMs?: number;
}

/** 产品级运行状态：只展示阶段动作，不展示模型思维链 */
export function StepProgress({
  steps,
  label,
  intervalMs = 1900,
}: StepProgressProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [steps.length, intervalMs]);

  return (
    <div className="animate-fade-in">
      <div className="running-surface rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial mb-5">{label}</p>
        <ul className="space-y-3.5">
          {steps.map((step, index) => {
            const state =
              index < activeIndex
                ? "done"
                : index === activeIndex
                  ? "active"
                  : "pending";
            return (
              <li key={step} className="flex items-center gap-3">
                <StepMarker state={state} index={index} />
                <span
                  className={[
                    "text-sm transition-colors duration-200",
                    state === "pending"
                      ? "text-ink-muted"
                      : state === "active"
                        ? "font-medium text-ink"
                        : "text-ink-secondary",
                  ].join(" ")}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StepMarker({
  state,
  index,
}: {
  state: "done" | "active" | "pending";
  index: number;
}) {
  return (
    <span
      className={[
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition-colors duration-200",
        state === "done"
          ? "border-brand/30 bg-brand-soft text-brand"
          : state === "active"
            ? "border-brand bg-brand text-white"
            : "border-border bg-surface text-ink-muted/50",
      ].join(" ")}
    >
      {state === "active" ? (
        <Loader2 size={10} className="animate-spin" />
      ) : state === "done" ? (
        <Check size={10} />
      ) : (
        String(index + 1).padStart(2, "0")
      )}
    </span>
  );
}
