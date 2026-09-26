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
  Lock,
  MinusCircle,
  ShieldAlert,
  Sparkle,
  Target,
} from "lucide-react";
import type { MvpRiskImpact, MvpScopingResult } from "@/lib/types";

interface MvpScopingResultViewProps {
  result: MvpScopingResult;
  latencyMs: number | null;
}

const IMPACT_LABEL: Record<MvpRiskImpact, string> = {
  high: "影响较高",
  medium: "影响中等",
  low: "影响较低",
};

export function MvpScopingResultView({
  result,
  latencyMs,
}: MvpScopingResultViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-[16px] border border-success/25 bg-success-soft px-5 py-4 animate-fade-in">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
          <Check size={18} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-success">
            MVP 范围已经收敛
          </p>
          <p className="mt-0.5 text-sm leading-6 text-body">
            第一版只保留验证关键假设所需的最小完整闭环，其余能力已明确暂缓或不做。
          </p>
        </div>
      </div>

      {/* MVP 定义 */}
      <section className="rounded-[16px] border border-subtle bg-surface p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-strong">
          <Sparkle size={17} className="text-accent" />
          MVP 定义
        </h3>
        <p className="mt-3 text-[15px] font-medium leading-7 text-strong">
          {result.mvpDefinition.goal}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DefinitionItem label="第一优先用户" value={result.mvpDefinition.primaryUser} />
          <DefinitionItem label="核心场景" value={result.mvpDefinition.coreScenario} />
          <DefinitionItem label="核心价值" value={result.mvpDefinition.coreValue} />
        </div>
      </section>

      {/* 这一版首先验证什么 */}
      <section className="rounded-[16px] border border-accent/25 bg-accent-soft/50 p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-strong">
          <Target size={17} className="text-accent" />
          这一版首先验证什么
        </h3>
        <p className="mt-3 text-[15px] font-medium leading-7 text-strong">
          {result.validationTarget.primaryHypothesis}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted">为什么优先验证它</p>
            <p className="mt-1.5 text-sm leading-6 text-body">
              {result.validationTarget.whyThisFirst}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">怎么判断结果</p>
            <p className="mt-1.5 text-sm leading-6 text-body">
              {result.validationTarget.successSignal}
            </p>
          </div>
        </div>
      </section>

      {/* 第一版必须做 vs 现在先不做：核心视觉对比 */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Build Now */}
        <div className="rounded-[16px] border border-accent/25 bg-accent-soft/30 p-6">
          <h3 className="flex items-center gap-2 text-base font-semibold text-strong">
            <CheckCircle2 size={17} className="text-accent" />
            第一版必须做
          </h3>
          <div className="mt-4 space-y-3">
            {result.mustHave.map((item) => (
              <div
                key={item.name}
                className="rounded-[12px] border border-accent/20 bg-surface p-4"
              >
                <p className="text-sm font-semibold text-accent">{item.name}</p>
                <p className="mt-1.5 text-sm leading-6 text-body">
                  <span className="text-muted">用户需要：</span>
                  {item.userNeed}
                </p>
                <p className="mt-1 text-sm leading-6 text-body">
                  <span className="text-muted">为什么必须：</span>
                  {item.reason}
                </p>
                <p className="mt-1 text-sm leading-6 text-body">
                  <span className="text-muted">完成标准：</span>
                  {item.acceptance}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Not Now */}
        <div className="space-y-4">
          <div className="rounded-[16px] border border-violet-accent/25 bg-violet-accent/[0.05] p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-strong">
              <Clock size={17} className="text-violet-accent" />
              现在先不做 · 以后再考虑
            </h3>
            <div className="mt-4 space-y-3">
              {result.shouldDefer.map((item) => (
                <div
                  key={item.name}
                  className="rounded-[12px] border border-subtle bg-surface p-4"
                >
                  <p className="text-sm font-medium text-strong">{item.name}</p>
                  <p className="mt-1.5 text-sm leading-6 text-body">
                    {item.reason}
                  </p>
                  <p className="mt-1.5 flex gap-1.5 text-sm leading-6 text-body">
                    <CornerDownRight size={14} className="mt-1 shrink-0 text-violet-accent" />
                    <span>
                      <span className="text-muted">重新考虑的条件：</span>
                      {item.whenToReconsider}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[16px] border border-subtle bg-muted-bg/50 p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-strong">
              <Ban size={17} className="text-muted" />
              当前方向明确不做
            </h3>
            <div className="mt-4 space-y-3">
              {result.explicitlyOutOfScope.map((item) => (
                <div
                  key={item.name}
                  className="rounded-[12px] border border-subtle bg-surface px-4 py-3"
                >
                  <p className="text-sm font-medium text-strong">{item.name}</p>
                  <p className="mt-1 text-sm leading-6 text-body">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MVP 核心闭环 */}
      <section className="rounded-[16px] border border-subtle bg-surface p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-strong">
          <Layers size={17} className="text-accent" />
          最小完整用户闭环
        </h3>
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
                  <ArrowRight size={15} className="shrink-0 text-faint" />
                )}
                <LoopNode label={label} start={isStart} end={isEnd} />
              </span>
            );
          })}
        </div>
      </section>

      {/* 范围约束 */}
      <section className="rounded-[16px] border border-subtle bg-surface p-6">
        <h3 className="text-base font-semibold text-strong">范围约束</h3>
        <BulletList items={result.scopeConstraints} />
      </section>

      {/* MVP 风险与验证 */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-[16px] border border-subtle bg-surface p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-strong">
            <ShieldAlert size={16} className="text-muted" />
            MVP 风险
          </h3>
          <div className="mt-4 space-y-3">
            {result.mvpRisks.map((item) => (
              <div
                key={item.risk}
                className={[
                  "rounded-[12px] border p-4",
                  item.impact === "high"
                    ? "border-warning/30 bg-warning-soft/60"
                    : "border-subtle bg-muted-bg/40",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-strong">{item.risk}</p>
                  <span className="shrink-0 rounded-[8px] bg-surface px-2 py-0.5 text-[11px] text-muted">
                    {IMPACT_LABEL[item.impact]}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-body">
                  {item.response}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-subtle bg-surface p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-strong">
            <ClipboardCheck size={16} className="text-muted" />
            上线后怎么验证
          </h3>
          <div className="mt-4 space-y-3">
            {result.validationPlan.map((item) => (
              <div
                key={item.action}
                className="rounded-[12px] border border-subtle bg-muted-bg/40 p-4"
              >
                <p className="text-sm font-medium leading-6 text-strong">
                  {item.action}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-body">
                  <span className="text-muted">观察信号：</span>
                  {item.signal}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 范围总结：Build / Not Build 对比 */}
      <section className="rounded-[16px] border border-subtle bg-surface p-6">
        <h3 className="text-base font-semibold text-strong">范围总结</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[12px] border border-accent/20 bg-accent-soft/40 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
              <CheckCircle2 size={15} />
              现在做
            </p>
            <BulletList items={result.scopeSummary.buildNow} />
          </div>
          <div className="rounded-[12px] border border-subtle bg-muted-bg/50 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-muted">
              <MinusCircle size={15} />
              现在不做
            </p>
            <BulletList items={result.scopeSummary.doNotBuildNow} />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-subtle pt-4">
          <div>
            <p className="text-sm font-medium text-strong">准备进入执行方案</p>
            <p className="mt-0.5 text-xs text-muted">
              下一阶段开放：将把 MVP 范围展开为可执行的开发安排。
            </p>
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="执行方案将在下一阶段开放"
            className="inline-flex h-10 shrink-0 cursor-not-allowed items-center gap-2 rounded-[12px] border border-subtle bg-muted-bg px-4 text-sm text-faint"
          >
            <Lock size={14} />
            生成执行方案 · 下一阶段开放
          </button>
        </div>
      </section>

      {latencyMs !== null && (
        <p className="text-right font-mono text-xs text-faint">
          MVP 收敛耗时 {latencyMs} ms
        </p>
      )}
    </div>
  );
}

function DefinitionItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-sm leading-6 text-body">{value}</p>
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
          ? "border-success/30 bg-success-soft font-medium text-success"
          : start
            ? "border-accent/25 bg-accent-soft font-medium text-accent"
            : "border-subtle bg-muted-bg/60 text-body",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="mt-1.5 text-sm text-faint">暂无内容</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 12)}`} className="flex gap-2.5">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-muted" />
          <span className="text-sm leading-6 text-body">{item}</span>
        </li>
      ))}
    </ul>
  );
}
