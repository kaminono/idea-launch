"use client";

import {
  Check,
  Crosshair,
  Flag,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Lock,
  Route,
  Sparkle,
  Target,
  Users,
} from "lucide-react";
import type { ClarifiedContext } from "@/lib/types";

interface ClarificationResultProps {
  context: ClarifiedContext;
  latencyMs: number | null;
  autoCompleted: boolean;
}

export function ClarificationResult({
  context,
  latencyMs,
  autoCompleted,
}: ClarificationResultProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-[16px] border border-success/25 bg-success-soft px-5 py-4 animate-fade-in">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-white">
          <Check size={18} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-success">
            信息补全完成
          </p>
          <p className="mt-0.5 text-sm leading-6 text-body">
            {autoCompleted
              ? "当前信息已经足够进入下一阶段，无需额外补充。"
              : "关键产品信息已经确认，可以进入产品分析阶段。"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card icon={<Sparkle size={16} />} title="产品定义">
          <p className="text-[15px] font-medium leading-7 text-strong">
            {context.productName}
          </p>
        </Card>

        <Card icon={<Crosshair size={16} />} title="一句话定义">
          <p className="text-sm leading-6 text-body">
            {context.oneLineDefinition}
          </p>
        </Card>

        <Card icon={<Users size={16} />} title="核心用户">
          <StringList items={context.targetUsers} ordered />
        </Card>

        <Card icon={<Route size={16} />} title="核心场景">
          <p className="text-sm leading-6 text-body">
            {context.primaryScenario}
          </p>
        </Card>

        <Card icon={<Flag size={16} />} title="核心问题">
          <p className="text-sm leading-6 text-body">{context.coreProblem}</p>
        </Card>

        <Card icon={<Target size={16} />} title="用户目标">
          <p className="text-sm leading-6 text-body">{context.userGoal}</p>
        </Card>

        <Card icon={<ListChecks size={16} />} title="用户现在的替代方案">
          {context.currentAlternatives.length > 0 ? (
            <StringList items={context.currentAlternatives} />
          ) : (
            <EmptyText>暂未提及明确替代方案</EmptyText>
          )}
        </Card>

        <Card icon={<ListChecks size={16} />} title="已确认决策">
          {context.confirmedDecisions.length > 0 ? (
            <StringList items={context.confirmedDecisions} ordered />
          ) : (
            <EmptyText>本阶段没有额外确认的决策</EmptyText>
          )}
        </Card>

        <Card icon={<ListChecks size={16} />} title="明确约束">
          {context.explicitConstraints.length > 0 ? (
            <StringList items={context.explicitConstraints} />
          ) : (
            <EmptyText>暂未识别到明确约束</EmptyText>
          )}
        </Card>

        <Card icon={<Lightbulb size={16} />} title="仍然存在的假设" tone="warning">
          {context.remainingAssumptions.length > 0 ? (
            <StringList items={context.remainingAssumptions} />
          ) : (
            <EmptyText>没有遗留的模型假设</EmptyText>
          )}
        </Card>

        <Card
          icon={<HelpCircle size={16} />}
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
        <p className="text-right font-mono text-xs text-faint">
          整理耗时 {latencyMs} ms
        </p>
      )}

      {/* 下一阶段入口：本版本不实现 Product Analysis */}
      <div className="flex items-center justify-between rounded-[16px] border border-subtle bg-surface px-5 py-4">
        <div>
          <p className="text-sm font-medium text-strong">产品分析</p>
          <p className="mt-0.5 text-xs text-muted">
            下一阶段将在此基础上完成产品分析。
          </p>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="产品分析将在下一阶段开放"
          className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-[12px] border border-subtle bg-muted-bg px-4 text-sm text-faint"
        >
          <Lock size={14} />
          当前版本暂未开放
        </button>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  tone = "default",
  className = "",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "default" | "warning";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={[
        "rounded-[12px] border border-subtle bg-surface p-5",
        tone === "warning" ? "bg-warning-soft/40" : "",
        className,
      ].join(" ")}
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-strong">
        <span className={tone === "warning" ? "text-warning" : "text-muted"}>
          {icon}
        </span>
        {title}
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
            <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent">
              {index + 1}
            </span>
          ) : (
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-muted" />
          )}
          <span className="text-sm leading-6 text-body">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-faint">{children}</p>;
}
