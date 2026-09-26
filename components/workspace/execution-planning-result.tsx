"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Compass,
  Cpu,
  Database,
  Loader2,
  MonitorSmartphone,
  Plug,
  Server,
  ShieldAlert,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type {
  ExecutionPlanningResult,
  ExecutionRiskImpact,
  TaskEffort,
  TaskType,
} from "@/lib/types";

interface ExecutionPlanningResultViewProps {
  result: ExecutionPlanningResult;
  latencyMs: number | null;
  onStartReview: () => void;
  reviewStarting?: boolean;
}

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  product: "产品",
  frontend: "前端",
  backend: "后端",
  ai: "AI",
  data: "数据",
  integration: "集成",
  test: "测试",
  release: "发布",
};

const EFFORT_LABEL: Record<TaskEffort, string> = {
  S: "工作量小",
  M: "工作量中",
  L: "工作量大",
};

const RISK_IMPACT_LABEL: Record<ExecutionRiskImpact, string> = {
  high: "影响较高",
  medium: "影响中等",
  low: "影响较低",
};

export function ExecutionPlanningResultView({
  result,
  latencyMs,
  onStartReview,
  reviewStarting = false,
}: ExecutionPlanningResultViewProps) {
  const {
    executionDefinition,
    productStructure,
    technicalPlan,
    dataModel,
    milestones,
    tasks,
    validationCheckpoints,
    executionRisks,
    executionSummary,
  } = result;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    [milestones[0]?.id ?? ""]: true,
  }));

  const toggleGroup = (id: string): void =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-[16px] border border-aubergine/25 bg-aubergine-soft px-5 py-4 animate-fade-in">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-aubergine text-white">
          <Check size={18} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-aubergine">
            执行方案已经生成
          </p>
          <p className="mt-0.5 text-sm leading-6 text-ink-secondary">
            方案严格基于已冻结的 MVP 范围，只规划第一版真正要做的事情。
          </p>
        </div>
      </div>

      {/* START HERE：首屏大数字行动区 */}
      <section className="rounded-[16px] border border-brand/25 bg-brand-soft/40 p-6">
        <p className="label-editorial text-brand">Start Here · 现在先做什么</p>
        <ol className="mt-5 space-y-3 reveal-group">
          {executionSummary.firstActions.map((action, index) => (
            <li
              key={`${index}-${action.slice(0, 12)}`}
              className="reveal-item flex items-start gap-4 rounded-[12px] border border-brand/20 bg-surface p-4"
            >
              <span className="font-mono text-[26px] font-semibold leading-none text-brand">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="pt-0.5 text-[15px] leading-7 text-ink">
                {action}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* 执行目标 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Goal · 执行目标</p>
        <div className="mt-3 flex items-start gap-2.5">
          <Compass size={17} className="mt-1 shrink-0 text-brand" />
          <p className="text-[15px] font-medium leading-7 text-ink">
            {executionDefinition.goal}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DefinitionItem
            label="交付结果"
            value={executionDefinition.deliveryTarget}
          />
          <DefinitionItem
            label="第一优先用户"
            value={executionDefinition.primaryUser}
          />
          <DefinitionItem
            label="核心场景"
            value={executionDefinition.coreScenario}
          />
        </div>
      </section>

      {/* 开发阶段：M1──M2──M3──M4 横向 Milestones（窄屏纵向） */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Milestones · 开发阶段</p>
        <p className="mt-2 text-xs text-ink-muted">
          按依赖顺序推进，完成一个阶段的验收标准后再进入下一阶段。
        </p>
        <ol className="mt-6 flex flex-col md:flex-row md:gap-0">
          {milestones.map((milestone, index) => {
            const isLast = index === milestones.length - 1;
            return (
              <li key={milestone.id} className="relative md:flex-1 md:pr-6 last:md:pr-0">
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute left-4 top-4 hidden h-px w-[calc(100%-1rem)] bg-border md:block"
                  />
                )}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-4 top-8 w-px bg-border md:hidden"
                  />
                )}
                <div className="flex gap-4 pb-5 md:block md:pb-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand-soft font-mono text-[11px] font-semibold text-brand">
                    M{index + 1}
                  </span>
                  <div className="flex-1 rounded-[12px] border border-border bg-surface-secondary/50 p-4 md:mt-3 md:p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-ink-muted">
                        {milestone.id}
                      </span>
                      <p className="text-sm font-semibold leading-5 text-ink">
                        {milestone.name}
                      </p>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-5 text-ink-secondary">
                      {milestone.goal}
                    </p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-[11px] font-medium text-ink-muted">交付物</p>
                        <CompactBulletList items={milestone.deliverables} dense />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-ink-muted">验收标准</p>
                        <CompactBulletList items={milestone.acceptance} dense />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 任务：按里程碑分组，折叠查看 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Tasks · 开发任务</p>
        <p className="mt-2 text-xs text-ink-muted">共 {tasks.length} 个，按里程碑分组</p>
        <div className="mt-4 space-y-3">
          {milestones.map((milestone) => {
            const groupTasks = tasks.filter(
              (task) => task.milestoneId === milestone.id
            );
            if (groupTasks.length === 0) return null;
            const open = Boolean(openGroups[milestone.id]);
            return (
              <div
                key={milestone.id}
                className="overflow-hidden rounded-[12px] border border-border"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(milestone.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 bg-surface-secondary/50 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-secondary"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-ink-muted">
                      {milestone.id}
                    </span>
                    <span className="text-sm font-medium text-ink">
                      {milestone.name}
                    </span>
                    <span className="rounded-[8px] bg-surface px-2 py-0.5 text-[11px] text-ink-muted">
                      {groupTasks.length} 个任务
                    </span>
                  </span>
                  {open ? (
                    <ChevronUp size={15} className="shrink-0 text-ink-muted" />
                  ) : (
                    <ChevronDown size={15} className="shrink-0 text-ink-muted" />
                  )}
                </button>
                {open && (
                  <div className="divide-y divide-border border-t border-border">
                    {groupTasks.map((task) => (
                      <article key={task.id} className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-brand">
                            {task.id}
                          </span>
                          <p className="text-sm font-semibold text-ink">
                            {task.title}
                          </p>
                          <span className="ml-auto flex items-center gap-1.5">
                            <span className="rounded-[8px] bg-brand-soft px-2 py-0.5 text-[11px] text-brand">
                              {TASK_TYPE_LABEL[task.type]}
                            </span>
                            <span className="rounded-[8px] bg-surface-secondary px-2 py-0.5 text-[11px] text-ink-muted">
                              {EFFORT_LABEL[task.effort]}
                            </span>
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                          {task.objective}
                        </p>
                        {task.dependencies.length > 0 && (
                          <p className="mt-2 text-xs leading-5 text-ink-muted">
                            依赖：
                            {task.dependencies
                              .map((id) => {
                                const dep = tasks.find((t) => t.id === id);
                                return dep ? `${id} ${dep.title}` : id;
                              })
                              .join("；")}
                          </p>
                        )}
                        <ul className="mt-2 space-y-1.5">
                          {task.acceptance.map((item, index) => (
                            <li
                              key={`${index}-${item.slice(0, 12)}`}
                              className="flex gap-2 text-sm leading-6 text-ink-secondary"
                            >
                              <CheckCircle2
                                size={14}
                                className="mt-1 shrink-0 text-brand"
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 产品结构：Surfaces + 用户主流程 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Product Structure · 产品结构</p>
        <p className="mt-3 text-xs font-medium text-ink-muted">用户主流程</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-3">
          {productStructure.userFlow.map((label, index, all) => (
            <span
              key={`${index}-${label.slice(0, 12)}`}
              className="flex items-center gap-2.5"
            >
              {index > 0 && (
                <ArrowRight size={15} className="shrink-0 text-ink-muted" />
              )}
              <span
                className={[
                  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-[13px]",
                  index === 0
                    ? "border-brand/25 bg-brand-soft font-medium text-brand"
                    : index === all.length - 1
                      ? "border-aubergine/30 bg-aubergine-soft font-medium text-aubergine"
                      : "border-border bg-surface-secondary/60 text-ink-secondary",
                ].join(" ")}
              >
                {label}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-5 text-xs font-medium text-ink-muted">页面 / 界面</p>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {productStructure.surfaces.map((surface) => (
            <div
              key={surface.name}
              className="rounded-[12px] border border-border bg-surface-secondary/40 p-4"
            >
              <p className="text-sm font-semibold text-ink">
                {surface.name}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-secondary">
                {surface.purpose}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {surface.keyActions.map((action) => (
                  <span
                    key={action}
                    className="rounded-[8px] bg-surface px-2.5 py-1 text-xs text-ink-secondary"
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 技术路径：轻量 Technical Plan */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Technical Plan · 技术路径</p>
        <p className="mt-3 rounded-[12px] border border-border bg-surface-secondary/40 px-4 py-3 text-sm leading-6 text-ink-secondary">
          {technicalPlan.architecture}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TechLayerCard
            icon={<MonitorSmartphone size={16} className="text-brand" />}
            title="前端"
            approach={technicalPlan.frontend.approach}
            responsibilities={technicalPlan.frontend.responsibilities}
          />
          <TechLayerCard
            icon={<Server size={16} className="text-brand" />}
            title="后端"
            approach={technicalPlan.backend.approach}
            responsibilities={technicalPlan.backend.responsibilities}
          />
          <div className="rounded-[12px] border border-border bg-surface-secondary/40 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Cpu size={16} className="text-brand" />
              AI 能力
              {!technicalPlan.ai.needed && (
                <span className="rounded-[8px] bg-surface px-2 py-0.5 text-[11px] font-normal text-ink-muted">
                  本阶段不需要
                </span>
              )}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {technicalPlan.ai.role}
            </p>
            {technicalPlan.ai.needed && (
              <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                <span className="text-ink-muted">接入方式：</span>
                {technicalPlan.ai.integration}
              </p>
            )}
          </div>
          <div className="rounded-[12px] border border-border bg-surface-secondary/40 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Database size={16} className="text-brand" />
              数据存储
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              {technicalPlan.storage.approach}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
              <span className="text-ink-muted">为什么这样选：</span>
              {technicalPlan.storage.reason}
            </p>
          </div>
        </div>
        {technicalPlan.externalServices.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Plug size={16} className="text-brand" />
              外部服务
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {technicalPlan.externalServices.map((service) => (
                <div
                  key={service.name}
                  className="rounded-[12px] border border-border bg-surface-secondary/40 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">
                      {service.name}
                    </p>
                    <span
                      className={[
                        "shrink-0 rounded-[8px] px-2 py-0.5 text-[11px]",
                        service.required
                          ? "bg-brand-soft text-brand"
                          : "bg-surface-secondary text-ink-muted",
                      ].join(" ")}
                    >
                      {service.required ? "必需" : "可选"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ink-secondary">
                    {service.purpose}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 核心数据对象 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Data Model · 核心数据对象</p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {dataModel.map((object) => (
            <div
              key={object.name}
              className="rounded-[12px] border border-border bg-surface-secondary/40 p-4"
            >
              <p className="font-mono text-sm font-semibold text-brand">
                {object.name}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-secondary">
                {object.purpose}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {object.keyFields.map((field) => (
                  <span
                    key={field}
                    className="rounded-[8px] bg-surface px-2.5 py-1 font-mono text-xs text-ink-secondary"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 验证节点 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Checkpoints · 验证节点</p>
        <div className="mt-4 space-y-3">
          {validationCheckpoints.map((checkpoint, index) => (
            <div
              key={`${index}-${checkpoint.afterMilestone}`}
              className="rounded-[12px] border border-border bg-surface-secondary/40 p-4"
            >
              <p className="text-xs font-medium text-ink-muted">
                {checkpoint.afterMilestone} 之后
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-ink">
                {checkpoint.whatToValidate}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                <span className="text-ink-muted">有效信号：</span>
                {checkpoint.signal}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 执行风险 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Risks · 执行风险</p>
        <div className="mt-4 space-y-3">
          {executionRisks.map((item) => (
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
                  {RISK_IMPACT_LABEL[item.impact]}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-ink-secondary">
                {item.response}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 完成定义 + Final Review 入口 */}
      <section className="rounded-[16px] border border-border bg-surface p-6">
        <p className="label-editorial">Definition of Done · 第一版做到这里就可以停</p>
        <ul className="mt-4 space-y-2.5">
          {executionSummary.definitionOfDone.map((item, index) => (
            <li
              key={`${index}-${item.slice(0, 12)}`}
              className="flex gap-2.5"
            >
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-brand"
              />
              <span className="text-sm leading-6 text-ink">{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-ink">最终一致性检查</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              核对整条立项链路：范围有没有回流、事实与假设是否清晰、方案能不能开工。
            </p>
          </div>
          <button
            type="button"
            onClick={onStartReview}
            disabled={reviewStarting}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reviewStarting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ClipboardCheck size={15} />
            )}
            检查完整立项方案
          </button>
        </div>
      </section>

      {latencyMs !== null && (
        <p className="text-right font-mono text-xs text-ink-muted">
          执行方案生成耗时 {latencyMs} ms
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

function TechLayerCard({
  icon,
  title,
  approach,
  responsibilities,
}: {
  icon: ReactNode;
  title: string;
  approach: string;
  responsibilities: string[];
}) {
  return (
    <div className="rounded-[12px] border border-border bg-surface-secondary/40 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{approach}</p>
      <CompactBulletList items={responsibilities} />
    </div>
  );
}

function CompactBulletList({ items, dense = false }: { items: string[]; dense?: boolean }) {
  if (items.length === 0) {
    return <p className={`${dense ? "mt-1 text-xs" : "mt-1.5 text-sm"} text-ink-muted`}>暂无内容</p>;
  }
  return (
    <ul className={`${dense ? "mt-1 space-y-0.5" : "mt-1.5 space-y-1"}`}>
      {items.map((item, index) => (
        <li
          key={`${index}-${item.slice(0, 12)}`}
          className={`flex gap-1.5 text-ink-secondary ${
            dense ? "text-xs leading-[18px]" : "text-sm leading-6"
          }`}
        >
          <span
            className={`${
              dense ? "mt-[7px]" : "mt-[9px]"
            } h-1 w-1 shrink-0 rounded-full bg-ink-muted`}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
