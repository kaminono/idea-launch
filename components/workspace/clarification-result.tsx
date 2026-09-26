"use client";

import {
  ArrowRight,
  Check,
  Compass,
  Crosshair,
  Flag,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Loader2,
  Route,
  Target,
  Users,
} from "lucide-react";
import type { ClarifiedContext } from "@/lib/types";

interface ClarificationResultProps {
  context: ClarifiedContext;
  latencyMs: number | null;
  autoCompleted: boolean;
  onStartAnalysis: () => void;
  analysisStarting: boolean;
}

export function ClarificationResult({
  context,
  latencyMs,
  autoCompleted,
  onStartAnalysis,
  analysisStarting,
}: ClarificationResultProps) {
  return (
    <div className="space-y-5">
      <div className="flex animate-fade-in items-start gap-3 rounded-[16px] border border-brand/25 bg-brand-soft px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <Check size={18} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-brand">信息补全完成</p>
          <p className="mt-0.5 text-sm leading-6 text-ink-secondary">
            {autoCompleted
              ? "当前信息已经足够进入下一阶段，无需额外补充。"
              : "关键产品信息已经确认，可以进入产品分析阶段。"}
          </p>
        </div>
      </div>

      <div className="reveal-group grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card icon={<Compass size={15} />} index="01" title="产品定义">
          <p className="text-[17px] font-semibold leading-7 tracking-[-0.01em] text-ink">
            {context.productName}
          </p>
        </Card>

        <Card icon={<Crosshair size={15} />} index="02" title="一句话定义">
          <p className="text-[15px] leading-7 text-ink">
            {context.oneLineDefinition}
          </p>
        </Card>

        <Card icon={<Users size={15} />} index="03" title="核心用户">
          <StringList items={context.targetUsers} ordered />
        </Card>

        <Card icon={<Route size={15} />} index="04" title="核心场景">
          <p className="text-[15px] leading-7 text-ink">
            {context.primaryScenario}
          </p>
        </Card>

        <Card icon={<Flag size={15} />} index="05" title="核心问题">
          <p className="text-[15px] leading-7 text-ink">{context.coreProblem}</p>
        </Card>

        <Card icon={<Target size={15} />} index="06" title="用户目标">
          <p className="text-[15px] leading-7 text-ink">{context.userGoal}</p>
        </Card>

        <Card icon={<ListChecks size={15} />} index="07" title="用户现在的替代方案">
          {context.currentAlternatives.length > 0 ? (
            <StringList items={context.currentAlternatives} />
          ) : (
            <EmptyText>暂未提及明确替代方案</EmptyText>
          )}
        </Card>

        <Card icon={<ListChecks size={15} />} index="08" title="已确认决策">
          {context.confirmedDecisions.length > 0 ? (
            <StringList items={context.confirmedDecisions} ordered />
          ) : (
            <EmptyText>本阶段没有额外确认的决策</EmptyText>
          )}
        </Card>

        <Card icon={<ListChecks size={15} />} index="09" title="明确约束">
          {context.explicitConstraints.length > 0 ? (
            <StringList items={context.explicitConstraints} />
          ) : (
            <EmptyText>暂未识别到明确约束</EmptyText>
          )}
        </Card>

        <Card
          icon={<Lightbulb size={15} />}
          index="10"
          title="仍然存在的假设"
          tone="warning"
        >
          {context.remainingAssumptions.length > 0 ? (
            <StringList items={context.remainingAssumptions} />
          ) : (
            <EmptyText>没有遗留的模型假设</EmptyText>
          )}
        </Card>

        <Card
          icon={<HelpCircle size={15} />}
          index="11"
          title="暂时未知但不阻塞的信息"
          tone="warning"
          className="lg:col-span-2"
        >
          {context.remainingUnknowns.length > 0 ? (
            <StringList items={context.remainingUnknowns} />
          ) : (
            <EmptyText>不存在影响下一阶段的未知信息</EmptyText>
          )}
        </Card>
      </div>

      {latencyMs !== null && (
        <p className="text-right font-mono text-xs text-ink-muted">
          整理耗时 {latencyMs} ms
        </p>
      )}

      {/* 下一阶段入口：由用户主动开始产品分析 */}
      <div className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-surface px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="font-mono text-[11px] text-brand">03</span>
            开始产品分析
          </p>
          <p className="mt-0.5 text-xs leading-5 text-ink-secondary">
            基于已确认的上下文，分析产品是否在解决一个足够明确的问题。
          </p>
        </div>
        <button
          type="button"
          onClick={onStartAnalysis}
          disabled={analysisStarting}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {analysisStarting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              正在开始
            </>
          ) : (
            <>
              开始产品分析
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Card({
  icon,
  index,
  title,
  tone = "default",
  className = "",
  children,
}: {
  icon: React.ReactNode;
  index: string;
  title: string;
  tone?: "default" | "warning";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={[
        "reveal-item rounded-[12px] border border-border bg-surface p-5",
        tone === "warning" ? "bg-warning-soft/50" : "",
        className,
      ].join(" ")}
    >
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-ink">
        <span className={tone === "warning" ? "text-warning" : "text-brand"}>
          {icon}
        </span>
        {title}
        <span className="ml-auto font-mono text-[10px] font-normal text-ink-muted">
          {index}
        </span>
      </h3>
      {children}
    </section>
  );
}

function StringList({
  items,
  ordered = false,
}: {
  items: string[];
  ordered?: boolean;
}) {
  if (items.length === 0) return <EmptyText>暂无内容</EmptyText>;
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 12)}`} className="flex gap-2.5">
          {ordered ? (
            <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-[10px] font-medium text-brand">
              {index + 1}
            </span>
          ) : (
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
          )}
          <span className="text-sm leading-6 text-body">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-muted">{children}</p>;
}
