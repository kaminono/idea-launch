"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { SettingsModal } from "@/components/settings/settings-modal";
import { HistoryDrawer } from "@/components/projects/history-drawer";
import { saveProject } from "@/lib/storage";
import { useHasApiKey } from "@/lib/client/use-settings";
import { useHydrated } from "@/lib/client/use-hydrated";
import type { Project } from "@/lib/types";

const SCENE_TAGS = ["AI 应用", "SaaS", "开发者工具", "效率工具"];

const PLACEHOLDER =
  "我想做一个帮助开发者快速学习新技术的 AI 产品，希望一个人可以开发，后面考虑收费……";

export function HomeClient() {
  const router = useRouter();
  const [rawIdea, setRawIdea] = useState("");
  const hasApiKey = useHasApiKey();
  const hydrated = useHydrated();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inputError, setInputError] = useState("");

  const handleStart = () => {
    if (submitting) return;
    const idea = rawIdea.trim();
    if (!idea) {
      setInputError("请先描述你的产品想法，再开始分析。");
      return;
    }
    if (!hasApiKey) {
      // 未配置 API Key：打开设置引导，保留已输入的想法
      setSettingsOpen(true);
      return;
    }

    setSubmitting(true);
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      rawIdea: idea,
      status: "understanding",
      ideaUnderstanding: null,
      lastRun: null,
    };
    saveProject(project);
    router.push(`/project/${project.id}`);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopBar
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex flex-1 justify-center px-4 pb-24 pt-20 sm:px-6 lg:pt-24">
        <div className="w-full max-w-[760px]">
          <div className="text-center animate-fade-slide-in">
            <h1 className="text-[32px] font-semibold leading-[42px] tracking-tight text-strong sm:text-[36px] sm:leading-[44px]">
              把一个想法，变成可以开始做的产品
            </h1>
            <p className="mx-auto mt-4 max-w-[600px] text-[15px] leading-7 text-muted">
              输入一个还没完全想清楚的产品想法，idea-launch
              会帮助你理解问题、收敛范围，并逐步形成可以执行的产品方案。
            </p>
          </div>

          <div className="mt-10 rounded-[16px] border border-subtle bg-surface p-5 shadow-[var(--shadow-card)] animate-fade-slide-in">
            <textarea
              value={rawIdea}
              onChange={(event) => {
                setRawIdea(event.target.value);
                if (inputError) setInputError("");
              }}
              placeholder={PLACEHOLDER}
              rows={6}
              className="min-h-[160px] w-full resize-none rounded-[12px] bg-transparent text-[15px] leading-7 text-strong outline-none placeholder:text-faint"
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {SCENE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setRawIdea((prev) =>
                      prev ? prev : `我想做一个${tag}方向的产品，`
                    )
                  }
                  className="rounded-[8px] bg-muted-bg px-2.5 py-1 text-xs text-body hover:bg-accent-soft hover:text-accent transition-colors duration-150"
                >
                  {tag}
                </button>
              ))}
            </div>

            {inputError && (
              <p className="mt-3 text-xs text-danger animate-fade-in">
                {inputError}
              </p>
            )}

            {hydrated && !hasApiKey && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="mt-4 flex w-full items-center gap-2 rounded-[12px] bg-warning-soft px-3.5 py-2.5 text-left text-sm text-warning animate-fade-in"
              >
                <KeyRound size={15} className="shrink-0" />
                <span>
                  尚未配置豆包 API Key，点击打开设置；你的想法不会丢失。
                </span>
              </button>
            )}
          </div>

          <div className="mt-6 flex justify-end animate-fade-slide-in">
            <button
              type="button"
              onClick={handleStart}
              disabled={submitting}
              className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-accent px-6 text-[15px] font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-150"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  正在创建项目…
                </>
              ) : (
                <>
                  开始分析
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      {historyOpen && (
        <HistoryDrawer onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  );
}
