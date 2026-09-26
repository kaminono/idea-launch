"use client";

import {
  AlertTriangle,
  Compass,
  Crosshair,
  Flag,
  Lightbulb,
  ListChecks,
  Route,
  Users,
} from "lucide-react";
import type { IdeaUnderstanding } from "@/lib/types";

interface UnderstandingResultProps {
  result: IdeaUnderstanding;
  latencyMs: number | null;
}

export function UnderstandingResult({
  result,
  latencyMs,
}: UnderstandingResultProps) {
  return (
    <div className="space-y-5">
      {result.clarificationNeeded && (
        <div className="flex animate-fade-in items-start gap-2.5 rounded-[12px] bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            当前信息还不足以直接进入产品分析，建议先根据「还需要确认的信息」补充关键内容。
          </p>
        </div>
      )}

      <div className="reveal-group grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          icon={<Compass size={15} />}
          index="01"
          title="产品方向"
          className="lg:col-span-1"
        >
          <p className="text-[17px] font-semibold leading-7 tracking-[-0.01em] text-ink">
            {result.suggestedName}
          </p>
        </Card>

        <Card
          icon={<Crosshair size={15} />}
          index="02"
          title="一句话定义"
          className="lg:col-span-1"
        >
          <p className="text-[15px] leading-7 text-ink">
            {result.oneLineDefinition}
          </p>
        </Card>

        <Card icon={<Users size={15} />} index="03" title="目标用户">
          <StringList items={result.targetUsers} ordered />
        </Card>

        <Card icon={<Flag size={15} />} index="04" title="核心问题">
          <StringList items={result.coreProblems} ordered />
        </Card>

        <Card icon={<Route size={15} />} index="05" title="主要场景">
          <StringList items={result.primaryScenarios} />
        </Card>

        <Card icon={<ListChecks size={15} />} index="06" title="已知约束">
          {result.knownConstraints.length > 0 ? (
            <StringList items={result.knownConstraints} />
          ) : (
            <EmptyText>暂未识别到明确约束</EmptyText>
          )}
        </Card>

        <Card
          icon={<Lightbulb size={15} />}
          index="07"
          title="当前假设"
          tone="warning"
        >
          {result.assumptions.length > 0 ? (
            <StringList items={result.assumptions} />
          ) : (
            <EmptyText>模型没有提出额外假设</EmptyText>
          )}
        </Card>

        <Card
          icon={<AlertTriangle size={15} />}
          index="08"
          title="还需要确认的信息"
          tone="warning"
        >
          {result.missingInformation.length > 0 ? (
            <StringList items={result.missingInformation} ordered />
          ) : (
            <EmptyText>关键信息已基本齐全</EmptyText>
          )}
        </Card>
      </div>

      {latencyMs !== null && (
        <p className="text-right font-mono text-xs text-ink-muted">
          模型耗时 {latencyMs} ms
        </p>
      )}
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
