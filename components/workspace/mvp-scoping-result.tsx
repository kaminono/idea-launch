"use client";

import {
  ArrowRight,
  Ban,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CornerDownRight,
  Layers,
  Loader2,
  MinusCircle,
  ShieldAlert,
  Target,
} from "lucide-react";
import type { MvpRiskImpact, MvpScopingResult } from "@/lib/types";

interface MvpScopingResultViewProps {
  result: MvpScopingResult;
  latencyMs: number | null;
  onStartExecution: () => void;
  executionStarting: boolean;
}

const IMPACT_LABEL: Record<MvpRiskImpact, string> = {
  high: "影响较高",
  medium: "影响中等",
  low: "影响较低",
};

export function MvpScopingResultView({
  result,
  latencyMs,
  onStartExecution,
  executionStarting,
}: MvpScopingResultViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-[16px] border border-aubergine/25 bg-aubergine-soft px-5 py-4 animate-fade-in">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-aubergine text-white">
          <Check size={18} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-aubergine">
            MVP 范围已经收敛
          </p>
          <p className="mt-0.5 text-sm leading-6 text-ink-secondary">
            第一版只保留验证关键假设所需的最小完整闭环，其余能力已明确暂缓或不做。
          </p>
        </div>
      </div>

      {/* MVP 定义 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">MVP Definition · MVP 定义</p>
        <div className="mt-3 flex items-start gap-2.5">
          <Layers size={17} className="mt-1 shrink-0 text-brand" />
          <p className="text-[15px] font-medium leading-7 text-ink">
            {result.mvpDefinition.goal}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DefinitionItem label="第一优先用户" value={result.mvpDefinition.primaryUser} />
          <DefinitionItem label="核心场景" value={result.mvpDefinition.coreScenario} />
          <DefinitionItem label="核心价值" value={result.mvpDefinition.coreValue} />
        </div>
      </section>

      {/* THIS MVP VALIDATES */}
      <section className="rounded-[16px] border border-brand/25 bg-brand-soft/50 p-6">
        <p className="label-editorial text-brand">This MVP Validates · 首要验证假设</p>
        <div className="mt-3 flex items-start gap-2.5">
          <Target size={17} className="mt-1 shrink-0 text-brand" />
          <p className="text-[17px] font-semibold leading-8 tracking-[-0.01em] text-ink">
            {result.validationTarget.primaryHypothesis}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-ink-muted">为什么优先验证它</p>
            <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
              {result.validationTarget.whyThisFirst}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-muted">怎么判断结果</p>
            <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
              {result.validationTarget.successSignal}
            </p>
          </div>
        </div>
      </section>

      {/* BUILD NOW vs NOT NOW：核心视觉对比 */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Build Now */}
        <div className="rounded-[16px] border border-brand/25 bg-brand-soft/40 p-6">
          <p className="label-editorial text-brand">Build Now · 第一版必须做</p>
          <div className="mt-4 space-y-3 reveal-group">
            {result.mustHave.map((item, index) => (
              <div
                key={item.name}
                className="reveal-item flex gap-4 rounded-[12px] border border-brand/20 bg-surface p-4"
              >
                <span className="font-mono text-[22px] font-semibold leading-none text-brand">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand">{item.name}</p>
                  <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                    <span className="text-ink-muted">用户需要：</span>
                    {item.userNeed}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    <span className="text-ink-muted">为什么必须：</span>
                    {item.reason}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    <span className="text-ink-muted">完成标准：</span>
                    {item.acceptance}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Not Now */}
        <div className="space-y-4">
          <div className="rounded-[16px] border border-border bg-surface-secondary/50 p-6">
            <p className="label-editorial">Not Now · 现在先不做，以后再考虑</p>
            <div className="mt-4 space-y-3 reveal-group">
              {result.shouldDefer.map((item) => (
                <div
                  key={item.name}
                  className="reveal-item rounded-[12px] border border-border bg-surface p-4"
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <Clock size={14} className="shrink-0 text-ink-muted" />
                    {item.name}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                    {item.reason}
                  </p>
                  <p className="mt-1.5 flex gap-1.5 text-sm leading-6 text-ink-secondary">
                    <CornerDownRight size={14} className="mt-1 shrink-0 text-ink-muted" />
                    <span>
                      <span className="text-ink-muted">重新考虑的条件：</span>
                      {item.whenToReconsider}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[16px] border border-border bg-surface-secondary/50 p-6">
            <p className="label-editorial">Never · 当前方向明确不做</p>
            <div className="mt-4 space-y-3 reveal-group">
              {result.explicitlyOutOfScope.map((item) => (
                <div
                  key={item.name}
                  className="reveal-item rounded-[12px] border border-border bg-surface px-4 py-3"
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <Ban size={14} className="shrink-0 text-ink-muted" />
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MVP 核心闭环 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Core Loop · 最小完整用户闭环</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-3">
          {[
            result.coreLoop.entry,
            ...result.coreLoop.steps,
            result.coreLoop.outcome,
          ].map((label, index, all) => {
            const isStart = index === 0;
            const isEnd = index === all.length - 1;
            return (
              <span key={`${index}-${label.slice(0, 12)}`} className="flex items-center gap-2.5">
                {!isStart && (
                  <ArrowRight size={15} className="shrink-0 text-ink-muted" />
                )}
                <LoopNode label={label} start={isStart} end={isEnd} />
              </span>
            );
          })}
        </div>
      </section>

      {/* 范围约束 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Constraints · 范围约束</p>
        <BulletList items={result.scopeConstraints} />
      </section>

      {/* MVP 风险与验证 */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-[16px] border border-border bg-surface p-6">
          <p className="label-editorial">Risks · MVP 风险</p>
          <div className="mt-4 space-y-3">
            {result.mvpRisks.map((item) => (
              <div
                key={item.risk}
                className={[
                  "rounded-[12px] border p-4",
                  item.impact === "high"
                    ? "border-warning/30 bg-warning-soft/60"
                    : "border-border bg-surface-secondary/50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <ShieldAlert size={14} className="shrink-0 text-ink-muted" />
                    {item.risk}
                  </p>
                  <span className="shrink-0 rounded-[8px] bg-surface px-2 py-0.5 text-[11px] text-ink-muted">
                    {IMPACT_LABEL[item.impact]}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                  {item.response}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-surface p-6">
          <p className="label-editorial">Validation Plan · 上线后怎么验证</p>
          <div className="mt-4 space-y-3">
            {result.validationPlan.map((item) => (
              <div
                key={item.action}
                className="rounded-[12px] border border-border bg-surface-secondary/50 p-4"
              >
                <p className="flex items-center gap-2 text-sm font-medium leading-6 text-ink">
                  <ClipboardCheck size={14} className="shrink-0 text-ink-muted" />
                  {item.action}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                  <span className="text-ink-muted">观察信号：</span>
                  {item.signal}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 范围总结：Build / Not Build 对比 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Scope Summary · 范围总结</p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[12px] border border-brand/20 bg-brand-soft/40 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-brand">
              <CheckCircle2 size={15} />
              现在做
            </p>
            <BulletList items={result.scopeSummary.buildNow} />
          </div>
          <div className="rounded-[12px] border border-border bg-surface-secondary/60 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
              <MinusCircle size={15} />
              现在不做
            </p>
            <BulletList items={result.scopeSummary.doNotBuildNow} />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-ink">准备进入执行方案</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              将把已冻结的 MVP 范围展开为可以开始开发的安排，不会新增功能。
            </p>
          </div>
          <button
            type="button"
            onClick={onStartExecution}
            disabled={executionStarting}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {executionStarting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                正在生成…
              </>
            ) : (
              <>
                <ArrowRight size={14} />
                生成执行方案
              </>
            )}
          </button>
        </div>
      </section>

      {latencyMs !== null && (
        <p className="text-right font-mono text-xs text-ink-muted">
          MVP 收敛耗时 {latencyMs} ms
        </p>
      )}
    </div>
  );
}

function DefinitionItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1.5 text-sm leading-6 text-ink-secondary">{value}</p>
    </div>
  );
}

function LoopNode({
  label,
  start = false,
  end = false,
}: {
  label: string;
  start?: boolean;
  end?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-[13px]",
        end
          ? "border-aubergine/30 bg-aubergine-soft font-medium text-aubergine"
          : start
            ? "border-brand/25 bg-brand-soft font-medium text-brand"
            : "border-border bg-surface-secondary/60 text-ink-secondary",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="mt-1.5 text-sm text-ink-muted">暂无内容</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 12)}`} className="flex gap-2.5">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
          <span className="text-sm leading-6 text-ink-secondary">{item}</span>
        </li>
      ))}
    </ul>
  );
}
