"use client";

import { useState } from "react";
import Link from "next/link";
import { History, Loader2, Trash2, X } from "lucide-react";
import {
  clearProjects,
  deleteProject,
  loadProjects,
} from "@/lib/storage";
import type { Project } from "@/lib/types";

interface HistoryDrawerProps {
  onClose: () => void;
}

export function HistoryDrawer({ onClose }: HistoryDrawerProps) {
  // 抽屉由父组件条件渲染：挂载即打开，惰性读取一次本地项目
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());

  const handleDelete = (id: string) => {
    deleteProject(id);
    setProjects(loadProjects());
  };

  const handleClearAll = () => {
    clearProjects();
    setProjects([]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end animate-fade-in"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[rgba(29,27,28,0.36)]" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="历史项目"
        className="relative flex h-full w-full max-w-[420px] flex-col border-l border-border bg-surface shadow-[var(--shadow-pop)] animate-fade-slide-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <History size={16} className="text-ink-muted" />
            历史项目
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-[8px] p-1.5 text-ink-muted hover:bg-surface-secondary hover:text-ink transition-colors duration-150"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {projects.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 rounded-[12px] bg-surface-secondary p-3 text-ink-muted">
                <History size={24} />
              </div>
              <p className="text-sm font-medium text-ink">还没有历史项目</p>
              <p className="mt-1 max-w-[240px] text-xs leading-5 text-ink-secondary">
                完成第一次产品想法理解后，项目会自动保存在这里。
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => (
                <li key={project.id}>
                  <div className="group flex items-start gap-3 rounded-[12px] border border-border bg-surface px-4 py-3.5 transition-colors duration-150 hover:border-brand/30 hover:bg-brand-soft/40">
                    <Link
                      href={`/project/${project.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">
                          {project.ideaUnderstanding?.suggestedName ??
                            "未命名想法"}
                        </p>
                        <StatusBadge status={project.status} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-secondary">
                        {project.rawIdea}
                      </p>
                      <p className="mt-1.5 text-xs text-ink-muted">
                        {formatDate(project.updatedAt)}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(project.id)}
                      aria-label="删除项目"
                      className="rounded-[8px] p-1.5 text-ink-muted opacity-0 transition-all duration-150 hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {projects.length > 0 && (
          <div className="border-t border-border px-6 py-3.5">
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-2.5 text-sm text-danger hover:bg-danger-soft transition-colors duration-150"
            >
              <Trash2 size={14} />
              清空全部项目
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function StatusBadge({ status }: { status: Project["status"] }) {
  if (status === "understood") {
    return (
      <span className="shrink-0 rounded-[8px] bg-success-soft px-1.5 py-0.5 text-xs text-success">
        已理解
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="shrink-0 rounded-[8px] bg-danger-soft px-1.5 py-0.5 text-xs text-danger">
        失败
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-[8px] bg-surface-secondary px-1.5 py-0.5 text-xs text-ink-secondary">
      <Loader2 size={10} className="animate-spin" />
      进行中
    </span>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
