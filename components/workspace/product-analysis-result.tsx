"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  Compass,
  Flag,
  Lightbulb,
  Loader2,
  Route,
  ShieldAlert,
  Sparkle,
  Users,
} from "lucide-react";
import type {
  HypothesisImportance,
  ProductAnalysisResult,
  ProductRiskType,
  RiskSeverity,
} from "@/lib/types";

interface ProductAnalysisResultViewProps {
  result: ProductAnalysisResult;
  latencyMs: number | null;
  onStartMvp: () => void;
  mvpStarting: boolean;
}

const IMPORTANCE_LABEL: Record<HypothesisImportance, string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
};

const RISK_TYPE_LABEL: Record<ProductRiskType, string> = {
  user: "用户",
  product: "产品",
  value: "价值",
  adoption: "采用",
  business: "商业",
  execution: "执行",
};

const SEVERITY_LABEL: Record<RiskSeverity, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export function ProductAnalysisResultView({
  result,
  latencyMs,
  onStartMvp,
  mvpStarting,
}: ProductAnalysisResultViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-[16px] border border-success/25 bg-success-soft px-5 py-4 animate-fade-in">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
          <Check size={18} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-success">产品分析完成</p>
          <p className="mt-0.5 text-sm leading-6 text-body">
            已基于你确认过的上下文，完成核心用户、场景、问题与风险的系统分析。
          </p>
        </div>
      </div>

      {/* 产品判断摘要：首屏主卡片 */}
      <section className="rounded-[16px] border border-subtle bg-surface p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-strong">
          <Compass size={17} className="text-accent" />
          产品判断摘要
        </h3>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-xl font-semibold text-strong">
            {result.productDefinition.name}
          </p>
          <span className="rounded-[8px] bg-muted-bg px-2 py-0.5 text-xs text-muted">
            {result.productDefinition.category}
          </span>
          <span className="rounded-[8px] bg-muted-bg px-2 py-0.5 text-xs text-muted">
            {result.productDefinition.stage}
          </span>
        </div>
        <p className="mt-2 text-[15px] leading-7 text-body">
          {result.productDefinition.oneLineDefinition}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[12px] border border-subtle p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Users size={14} />
              核心用户
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-strong">
              {result.primaryUser.description}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-body">
              {result.primaryUser.context}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-body">
              <span className="text-muted">主要目标：</span>
              {result.primaryUser.primaryGoal}
            </p>
          </div>

          <div className="rounded-[12px] border border-subtle p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Route size={14} />
              核心场景
            </p>
            <p className="mt-2 text-sm leading-6 text-body">
              <span className="text-muted">触发：</span>
              {result.coreScenario.trigger}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-body">
              {result.coreScenario.scenario}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-body">
              <span className="text-muted">期望结果：</span>
              {result.coreScenario.desiredOutcome}
            </p>
          </div>
        </div>
      </section>

      {/* 用户真正遇到的问题：重点卡片 */}
      <section className="rounded-[16px] border border-accent/25 bg-accent-soft/50 p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-strong">
          <Flag size={17} className="text-accent" />
          用户真正遇到的问题
        </h3>
        <p className="mt-3 text-[15px] font-medium leading-7 text-strong">
          {result.problemAnalysis.coreProblem}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted">问题长期存在的原因</p>
            <BulletList items={result.problemAnalysis.rootCauses} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">当前解决过程中的摩擦</p>
            <BulletList items={result.problemAnalysis.currentPainPoints} />
          </div>
        </div>
      </section>

      {/* 用户现在怎么解决 */}
      {result.currentAlternatives.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-strong">
            <Lightbulb size={16} className="text-muted" />
            用户现在怎么解决
          </h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {result.currentAlternatives.map((item) => (
              <div
                key={item.alternative}
                className="rounded-[12px] border border-subtle bg-surface p-4"
              >
                <p className="text-sm font-medium text-strong">
                  {item.alternative}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-body">
                  {item.whyUsersUseIt}
                </p>
                <div className="mt-2.5">
                  <p className="text-xs text-muted">当前不足</p>
                  <BulletList items={item.limitations} compact />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 产品价值：淡紫背景重点卡片 */}
      <section className="rounded-[16px] border border-violet-accent/25 bg-violet-accent/[0.06] p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-strong">
          <Sparkle size={17} className="text-violet-accent" />
          产品价值
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ValueItem label="核心价值" value={result.valueProposition.coreValue} />
          <ValueItem
            label="使用后的变化"
            value={result.valueProposition.userChange}
          />
          <ValueItem
            label="差异化方向"
            value={result.valueProposition.differentiationDirection}
          />
        </div>
      </section>

      {/* 关键假设 */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-strong">
          <Lightbulb size={16} className="text-muted" />
          关键假设（需要验证）
        </h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {result.keyHypotheses.map((item) => (
            <div
              key={item.hypothesis}
              className="rounded-[12px] border border-subtle bg-surface p-4"
            >
              <span
                className={[
                  "inline-flex rounded-[8px] px-2 py-0.5 text-xs font-medium",
                  item.importance === "high"
                    ? "bg-accent-soft text-accent"
                    : item.importance === "medium"
                      ? "bg-warning-soft text-warning"
                      : "bg-muted-bg text-muted",
                ].join(" ")}
              >
                {IMPORTANCE_LABEL[item.importance]}
              </span>
              <p className="mt-2.5 text-sm font-medium leading-6 text-strong">
                {item.hypothesis}
              </p>
              <p className="mt-2 text-sm leading-6 text-body">
                <span className="text-muted">验证建议：</span>
                {item.validationIdea}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 风险：克制的卡片 */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-strong">
          <ShieldAlert size={16} className="text-muted" />
          主要风险
        </h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {result.risks.map((item) => (
            <div
              key={item.risk}
              className={[
                "rounded-[12px] border p-4",
                item.severity === "high"
                  ? "border-warning/30 bg-warning-soft/60"
                  : "border-subtle bg-surface",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-strong">{item.risk}</p>
                {item.severity === "high" && (
                  <AlertTriangle size={14} className="shrink-0 text-warning" />
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <span className="rounded-[8px] bg-muted-bg px-2 py-0.5 text-[11px] text-muted">
                  {RISK_TYPE_LABEL[item.type]}
                </span>
                <span className="rounded-[8px] bg-muted-bg px-2 py-0.5 text-[11px] text-muted">
                  严重程度：{SEVERITY_LABEL[item.severity]}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-body">{item.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 下一阶段应该关注什么 */}
      <section className="rounded-[16px] border border-subtle bg-surface p-6">
        <h3 className="text-base font-semibold text-strong">
          下一阶段应该关注什么
        </h3>
        <BulletList items={result.analysisSummary.mvpFocus} />

        <div className="mt-5 flex items-center justify-between border-t border-subtle pt-4">
          <div>
            <p className="text-sm font-medium text-strong">准备进入 MVP 收敛</p>
            <p className="mt-0.5 text-xs text-muted">
              MVP 阶段将基于以上关注点收敛第一版范围。
            </p>
          </div>
          <button
            type="button"
            onClick={onStartMvp}
            disabled={mvpStarting}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {mvpStarting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                正在开始
              </>
            ) : (
              <>
                开始收敛 MVP
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </section>

      {latencyMs !== null && (
        <p className="text-right font-mono text-xs text-faint">
          分析耗时 {latencyMs} ms
        </p>
      )}
    </div>
  );
}

function ValueItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-sm leading-6 text-body">{value}</p>
    </div>
  );
}

function BulletList({
  items,
  compact = false,
}: {
  items: string[];
  compact?: boolean;
}) {
  if (items.length === 0) {
    return <p className="mt-1.5 text-sm text-faint">暂无内容</p>;
  }
  return (
    <ul className={compact ? "mt-1.5 space-y-1.5" : "mt-2 space-y-2"}>
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 12)}`} className="flex gap-2.5">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-muted" />
          <span className="text-sm leading-6 text-body">{item}</span>
        </li>
      ))}
    </ul>
  );
}
