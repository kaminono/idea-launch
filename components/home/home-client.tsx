"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, KeyRound, Loader2 } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { SettingsModal } from "@/components/settings/settings-modal";
import { HistoryDrawer } from "@/components/projects/history-drawer";
import { saveProject } from "@/lib/storage";
import { useHasApiKey } from "@/lib/client/use-settings";
import { useHydrated } from "@/lib/client/use-hydrated";
import { PRODUCT_TEMPLATES } from "@/lib/product-templates";
import type { Project } from "@/lib/types";

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  const handleIdeaChange = (value: string) => {
    setRawIdea(value);
    if (inputError) setInputError("");
    // 内容明显偏离模板原文时自动取消选中（含重新清空）
    setSelectedTemplateId((current) => {
      if (!current) return current;
      const selected = PRODUCT_TEMPLATES.find((t) => t.id === current);
      return selected && value === selected.prompt ? current : null;
    });
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = PRODUCT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setSelectedTemplateId(templateId);
    setRawIdea(template.prompt);
    if (inputError) setInputError("");
  };

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
    <div className="relative flex min-h-full flex-1 flex-col">
      <TopBar
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* 轻抽象路径背景：纯静态 SVG，禁止 Canvas / 粒子 / 视频 */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[60px] h-[560px] w-full"
        viewBox="0 0 1440 560"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-40 480C260 460 380 220 760 200C1080 184 1180 60 1480 40"
          stroke="#F15A37"
          strokeOpacity="0.1"
          strokeWidth="1.5"
        />
        <path
          d="M-40 540C300 520 520 360 880 340C1160 325 1280 220 1480 200"
          stroke="#4A304D"
          strokeOpacity="0.09"
          strokeWidth="1.5"
        />
        <circle cx="620" cy="70" r="5" fill="#F15A37" fillOpacity="0.18" />
        <circle cx="200" cy="400" r="4" fill="#4A304D" fillOpacity="0.16" />
        <circle cx="1260" cy="132" r="4" fill="#F15A37" fillOpacity="0.16" />
      </svg>

      <main className="relative flex flex-1 justify-center px-4 pb-12 pt-12 sm:px-6 md:pt-14 lg:pt-16">
        <div className="w-full max-w-[820px]">
          <div className="text-center animate-fade-slide-in">
            <p className="label-editorial">From Idea to Plan</p>
            <h1 className="mt-5 text-[40px] font-semibold leading-[48px] tracking-[-0.02em] text-ink sm:text-[54px] sm:leading-[62px] lg:text-[68px] lg:leading-[76px]">
              把一个想法，
              <br className="hidden sm:block" />
              变成<span className="text-brand">可以开始做</span>的产品
            </h1>
            <p className="mx-auto mt-6 max-w-[600px] text-[15px] leading-7 text-ink-secondary">
              输入一个还没完全想清楚的产品想法，Idea Launch
              会帮助你理解问题、收敛范围，并逐步形成可以执行的产品方案。
            </p>
          </div>

          <div className="mt-8 rounded-[16px] border border-border bg-surface p-6 animate-fade-slide-in">
            <div className="flex items-center justify-between gap-3">
              <p className="label-editorial">Product Idea · 产品想法</p>
              <p className="font-mono text-[11px] text-ink-muted">
                {rawIdea.length} 字
              </p>
            </div>
            <textarea
              value={rawIdea}
              onChange={(event) => handleIdeaChange(event.target.value)}
              placeholder={PLACEHOLDER}
              rows={5}
              className="mt-3 min-h-[140px] w-full resize-none bg-transparent text-[15px] leading-7 text-ink outline-none placeholder:text-ink-muted"
            />

            <div className="mt-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                试试这些想法
              </p>
              <div
                role="group"
                aria-label="产品想法模板"
                className="mt-2 flex flex-wrap items-center gap-2"
              >
                {PRODUCT_TEMPLATES.map((template) => {
                  const selected = selectedTemplateId === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      aria-pressed={selected}
                      title={template.description}
                      onClick={() => handleSelectTemplate(template.id)}
                      className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                        selected
                          ? "border-brand/40 bg-brand-soft font-medium text-brand"
                          : "border-transparent bg-surface-secondary text-ink-secondary hover:bg-brand-soft hover:text-brand"
                      }`}
                    >
                      {selected && <Check size={12} aria-hidden="true" />}
                      {template.label}
                    </button>
                  );
                })}
              </div>
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
                className="mt-4 flex w-full items-center gap-2 rounded-[8px] bg-warning-soft px-3.5 py-2.5 text-left text-sm text-warning animate-fade-in"
              >
                <KeyRound size={15} className="shrink-0" />
                <span>
                  尚未配置模型 API Key，点击打开设置；你的想法不会丢失。
                </span>
              </button>
            )}

            <div className="mt-6 flex items-center justify-end border-t border-border pt-5">
              <button
                type="button"
                onClick={handleStart}
                disabled={submitting}
                className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-brand px-6 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    正在创建项目…
                  </>
                ) : (
                  <>
                    开始分析
                    <ArrowUpRight size={16} />
                  </>
                )}
              </button>
            </div>
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
