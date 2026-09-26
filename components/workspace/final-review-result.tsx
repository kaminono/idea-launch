"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type {
  AdjustmentPriority,
  FinalReviewResult,
} from "@/lib/types";

interface FinalReviewResultViewProps {
  result: FinalReviewResult;
  latencyMs: number | null;
  onViewExecution: () => void;
}

const PRIORITY_LABEL: Record<AdjustmentPriority, string> = {
  high: "优先处理",
  medium: "建议处理",
  low: "可再确认",
};

const PRIORITY_STYLE: Record<AdjustmentPriority, string> = {
  high: "border-warning/30 bg-warning-soft/60",
  medium: "border-border bg-surface-secondary/50",
  low: "border-border bg-surface-secondary/50",
};

export function FinalReviewResultView({
  result,
  latencyMs,
  onViewExecution,
}: FinalReviewResultViewProps) {
  const isReady = result.verdict.status === "ready";

  return (
    <div className="space-y-5">
      {/* Final Verdict：安静的终局 */}
      <section
        className={[
          "rounded-[16px] border p-6 sm:p-7 animate-fade-in",
          isReady
            ? "border-aubergine/30 bg-aubergine-soft/50"
            : "border-border bg-surface-secondary/50",
        ].join(" ")}
      >
        <p
          className={[
            "label-editorial",
            isReady ? "text-aubergine" : "text-ink-secondary",
          ].join(" ")}
        >
          {isReady ? "Ready to Build" : "Needs Attention"}
        </p>
        <h3
          className={[
            "mt-3 text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]",
            isReady ? "text-aubergine" : "text-ink",
          ].join(" ")}
        >
          {isReady ? "可以开始开发" : "需要关注"}
        </h3>
        <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-ink-secondary">
          {result.verdict.summary}
        </p>

        <div className="mt-6 border-t border-border pt-5">
          <p className="label-editorial">Consistency Checks · 一致性检查</p>
          <ul className="mt-3 space-y-2.5">
            {result.consistencyChecks.map((check, index) => (
              <li
                key={`${index}-${check.dimension.slice(0, 8)}`}
                className="flex items-start gap-2.5"
              >
                {check.status === "pass" ? (
                  <Check
                    size={15}
                    className="mt-0.5 shrink-0 text-aubergine"
                  />
                ) : (
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0 text-warning"
                  />
                )}
                <div className="min-w-0">
                  <span className="text-sm font-medium text-ink">
                    {check.dimension}
                  </span>
                  <span className="text-sm leading-6 text-ink-secondary">
                    ：{check.finding}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 范围检查 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Scope Integrity · 范围检查</p>
        {result.scopeIntegrity.passed ? (
          <p className="mt-3 flex items-start gap-2.5 text-sm leading-6 text-ink-secondary">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-ink-muted" />
            第一版范围保持稳定，没有发现已经砍掉的功能重新进入开发计划。
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <ul className="space-y-2">
              {result.scopeIntegrity.reintroducedItems.map((item, index) => (
                <li
                  key={`${index}-${item.slice(0, 10)}`}
                  className="flex items-start gap-2.5 rounded-[12px] border border-warning/30 bg-warning-soft/50 px-3.5 py-2.5 text-sm leading-6 text-ink-secondary"
                >
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0 text-warning"
                  />
                  {item}
                </li>
              ))}
            </ul>
            {result.scopeIntegrity.finding && (
              <p className="text-sm leading-6 text-ink-secondary">
                {result.scopeIntegrity.finding}
              </p>
            )}
          </div>
        )}
      </section>

      {/* 事实与假设 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Fact Integrity · 事实与假设</p>
        {result.factIntegrity.passed ? (
          <p className="mt-3 flex items-start gap-2.5 text-sm leading-6 text-ink-secondary">
            <ClipboardCheck size={16} className="mt-0.5 shrink-0 text-ink-muted" />
            用户确认信息与模型分析边界清晰。
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <ul className="space-y-2">
              {result.factIntegrity.issues.map((item, index) => (
                <li
                  key={`${index}-${item.slice(0, 10)}`}
                  className="flex items-start gap-2.5 rounded-[12px] border border-warning/30 bg-warning-soft/50 px-3.5 py-2.5 text-sm leading-6 text-ink-secondary"
                >
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0 text-warning"
                  />
                  {item}
                </li>
              ))}
            </ul>
            {result.factIntegrity.finding && (
              <p className="text-sm leading-6 text-ink-secondary">
                {result.factIntegrity.finding}
              </p>
            )}
          </div>
        )}
      </section>

      {/* 执行方案准备度 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Execution Readiness · 执行方案准备度</p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[12px] border border-border bg-surface-secondary/50 p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <CheckCircle2 size={14} className="text-aubergine" />
              已经做好的
            </p>
            <CompactBulletList items={result.executionReadiness.strengths} />
          </div>
          <div className="rounded-[12px] border border-border bg-surface-secondary/50 p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <AlertTriangle size={14} className="text-ink-muted" />
              还需要关注的
            </p>
            <CompactBulletList items={result.executionReadiness.gaps} />
          </div>
        </div>
      </section>

      {/* 建议调整：为空则不展示 */}
      {result.recommendedAdjustments.length > 0 && (
        <section className="rounded-[16px] border border-border bg-surface p-6">
          <p className="label-editorial">Recommended Adjustments · 建议调整</p>
          <ul className="mt-4 space-y-3">
            {result.recommendedAdjustments.map((item, index) => (
              <li
                key={`${index}-${item.priority}`}
                className={[
                  "rounded-[12px] border p-4",
                  PRIORITY_STYLE[item.priority],
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[8px] bg-surface px-2 py-0.5 text-[11px] text-ink-muted">
                    {PRIORITY_LABEL[item.priority]}
                  </span>
                  <p className="text-sm font-medium text-ink">
                    {item.adjustment}
                  </p>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                  {item.reason}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* First Action：全流程最后的落点 */}
      <section
        className={[
          "rounded-[16px] border p-6 sm:p-7",
          isReady
            ? "border-aubergine/30 bg-aubergine-soft/40"
            : "border-border bg-surface",
        ].join(" ")}
      >
        <p
          className={[
            "label-editorial",
            isReady ? "text-aubergine" : "text-ink-secondary",
          ].join(" ")}
        >
          First Action · 现在第一件事
        </p>
        <p className="mt-3 text-[19px] font-semibold leading-8 tracking-[-0.01em] text-ink">
          {result.finalSummary.firstAction}
        </p>
        <ul className="mt-4 space-y-2">
          {result.finalSummary.keepInMind.map((item, index) => (
            <li
              key={`${index}-${item.slice(0, 10)}`}
              className="flex items-start gap-2.5 text-sm leading-6 text-ink-secondary"
            >
              <ArrowRight
                size={14}
                className="mt-1 shrink-0 text-ink-muted"
              />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-4 text-sm text-ink-secondary transition-colors duration-150 hover:border-border-strong hover:text-ink"
          >
            <ArrowLeft size={14} />
            返回历史项目
          </Link>
          <button
            type="button"
            onClick={onViewExecution}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover"
          >
            重新查看执行方案
            <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {latencyMs !== null && (
        <p className="text-right font-mono text-xs text-ink-muted">
          最终检查耗时 {latencyMs} ms
        </p>
      )}
    </div>
  );
}

function CompactBulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-ink-muted">暂无内容</p>;
  }
  return (
    <ul className="mt-2.5 space-y-1.5">
      {items.map((item, index) => (
        <li
          key={`${index}-${item.slice(0, 12)}`}
          className="flex items-start gap-2 text-sm leading-6 text-ink-secondary"
        >
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
