"use client";

import {
  AlertTriangle,
  Crosshair,
  Flag,
  Lightbulb,
  ListChecks,
  Route,
  Sparkle,
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
        <div className="flex items-start gap-2.5 rounded-[12px] bg-warning-soft px-4 py-3 text-sm text-warning animate-fade-in">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            当前信息还不足以直接进入产品分析，建议先根据「还需要确认的信息」补充关键内容。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          icon={<Sparkle size={16} />}
          title="产品方向"
          className="lg:col-span-1"
        >
          <p className="text-[15px] font-medium leading-7 text-strong">
            {result.suggestedName}
          </p>
        </Card>

        <Card
          icon={<Crosshair size={16} />}
          title="一句话定义"
          className="lg:col-span-1"
        >
          <p className="text-sm leading-6 text-body">
            {result.oneLineDefinition}
          </p>
        </Card>

        <Card icon={<Users size={16} />} title="目标用户">
          <StringList items={result.targetUsers} ordered />
        </Card>

        <Card icon={<Flag size={16} />} title="核心问题">
          <StringList items={result.coreProblems} ordered />
        </Card>

        <Card icon={<Route size={16} />} title="主要场景">
          <StringList items={result.primaryScenarios} />
        </Card>

        <Card icon={<ListChecks size={16} />} title="已知约束">
          {result.knownConstraints.length > 0 ? (
            <StringList items={result.knownConstraints} />
          ) : (
            <EmptyText>暂未识别到明确约束</EmptyText>
          )}
        </Card>

        <Card
          icon={<Lightbulb size={16} />}
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
          icon={<AlertTriangle size={16} />}
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
        <p className="text-right font-mono text-xs text-faint">
          模型耗时 {latencyMs} ms
        </p>
      )}
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
