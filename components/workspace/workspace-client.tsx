"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Settings,
} from "lucide-react";
import { WorkflowNav } from "./workflow-nav";
import { AnalysisProgress } from "./analysis-progress";
import { UnderstandingResult } from "./understanding-result";
import {
  ClarifyQuestionsProgress,
  ClarifySynthesisProgress,
} from "./clarification-progress";
import { ClarificationQuestionsFlow } from "./clarification-questions";
import { ClarificationResult } from "./clarification-result";
import { ProductAnalysisProgress } from "./product-analysis-progress";
import { ProductAnalysisResultView } from "./product-analysis-result";
import { MvpScopingProgress } from "./mvp-scoping-progress";
import { MvpScopingResultView } from "./mvp-scoping-result";
import { SettingsModal } from "@/components/settings/settings-modal";
import {
  analyzeProduct,
  ClientAiError,
  generateClarificationQuestions,
  scopeMvp,
  synthesizeClarification,
  understandIdea,
} from "@/lib/client/api";
import { loadSettings, saveProject } from "@/lib/storage";
import { useProject } from "@/lib/client/use-project";
import { useHydrated } from "@/lib/client/use-hydrated";
import type {
  AnalysisRun,
  ClarificationAnswer,
  Project,
  RunError,
  Settings as SettingsType,
  WorkflowStage,
} from "@/lib/types";

interface WorkspaceClientProps {
  projectId: string;
}

/** 编排阶段：在持久化项目状态之上派生当前视图 */
type Phase =
  | "understanding-running"
  | "understanding-error"
  | "questions-running"
  | "questions-error"
  | "questions"
  | "synthesis-running"
  | "synthesis-error"
  | "clarified"
  | "analysis-running"
  | "analysis-error"
  | "analyzed"
  | "mvp-running"
  | "mvp-error"
  | "mvp-done";

function toRunError(error: unknown): RunError {
  if (error instanceof ClientAiError) return error.toRunError();
  return {
    code: "AI_PROVIDER_ERROR",
    message:
      error instanceof Error ? error.message : "处理失败，请稍后重试。",
  };
}

/** 构造一次节点运行记录 */
function makeRun(
  stage: WorkflowStage,
  startedAt: string,
  status: AnalysisRun["status"],
  durationMs: number | null,
  error: RunError | null,
  finishedAt: string | null
): AnalysisRun {
  return {
    id: crypto.randomUUID(),
    stage,
    status,
    startedAt,
    finishedAt,
    durationMs,
    error,
  };
}

export function WorkspaceClient({ projectId }: WorkspaceClientProps) {
  // 项目数据由外部存储订阅驱动，刷新 / 删除 / 保存后自动同步
  const storedProject = useProject(projectId);
  const hydrated = useHydrated();

  const [settingsOpen, setSettingsOpen] = useState(false);
  // 本地瞬时态：仅标记某个模型动作正在进行 / 本会话失败信息。
  // 持久化的 lastRun 保证刷新后不会自动重试，只展示错误并允许手动重试。
  const [localPhase, setLocalPhase] = useState<
    | "questions-running"
    | "synthesis-running"
    | "analysis-running"
    | "mvp-running"
    | null
  >(null);
  const [retryingUnderstanding, setRetryingUnderstanding] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showUnderstanding, setShowUnderstanding] = useState(false);

  const inFlightRef = useRef(false);

  // ---- Stage 1：Idea Understanding ----
  const runUnderstanding = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const settings: SettingsType = loadSettings();
    const current = storedProject ?? null;
    if (!settings.apiKey.trim() || !current) return;

    inFlightRef.current = true;
    const startedAt = new Date().toISOString();

    try {
      const { ideaUnderstanding, latencyMs } = await understandIdea({
        settings,
        rawIdea: current.rawIdea,
      });
      const finishedAt = new Date().toISOString();
      const next: Project = {
        ...current,
        status: "understood",
        updatedAt: finishedAt,
        ideaUnderstanding,
        lastRun: makeRun(
          "idea_understanding",
          startedAt,
          "succeeded",
          latencyMs,
          null,
          finishedAt
        ),
      };
      saveProject(next);
    } catch (error) {
      const runError = toRunError(error);
      const finishedAt = new Date().toISOString();
      const failed: Project = {
        ...current,
        status: "failed",
        updatedAt: finishedAt,
        lastRun: makeRun(
          "idea_understanding",
          startedAt,
          "failed",
          null,
          runError,
          finishedAt
        ),
      };
      saveProject(failed);
    } finally {
      inFlightRef.current = false;
      queueMicrotask(() => setRetryingUnderstanding(false));
    }
  }, [storedProject]);

  // ---- Stage 2a：Clarification Question Generation ----
  const runQuestions = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const settings = loadSettings();
    const current = storedProject ?? null;
    if (
      !settings.apiKey.trim() ||
      !current ||
      !current.ideaUnderstanding
    ) {
      return;
    }

    inFlightRef.current = true;
    setLocalPhase("questions-running");
    setSessionError(null);
    const startedAt = new Date().toISOString();

    try {
      const { questions: result } = await generateClarificationQuestions({
        settings,
        rawIdea: current.rawIdea,
        ideaUnderstanding: current.ideaUnderstanding,
      });

      const finishedAt = new Date().toISOString();
      const nextState: Project["clarification"] = {
        needed: result.clarificationNeeded,
        reason: result.reason,
        questions: result.questions,
        answers: [],
        clarifiedContext: null,
        completedAt: null,
      };
      const saved: Project = {
        ...current,
        status: "understood",
        updatedAt: finishedAt,
        clarification: nextState,
        lastRun: makeRun(
          "clarification",
          startedAt,
          "succeeded",
          null,
          null,
          finishedAt
        ),
      };
      saveProject(saved);
      // 无需澄清时，由下方 shouldAutoSynthesis effect 自动接续 synthesis，
      // 不在此处直接调用，避免 inFlightRef 重入拦截。
    } catch (error) {
      const runError = toRunError(error);
      const finishedAt = new Date().toISOString();
      const failed: Project = {
        ...current,
        status: "failed",
        updatedAt: finishedAt,
        lastRun: makeRun(
          "clarification",
          startedAt,
          "failed",
          null,
          runError,
          finishedAt
        ),
      };
      saveProject(failed);
      setSessionError(runError.message);
    } finally {
      inFlightRef.current = false;
      setLocalPhase((prev) =>
        prev === "questions-running" ? null : prev
      );
    }
  }, [storedProject]);

  // ---- Stage 2b：Clarification Synthesis ----
  const runSynthesis = useCallback(async (): Promise<void> => {
      if (inFlightRef.current) return;
      const settings = loadSettings();
      const current = storedProject ?? null;
      const clarification = current?.clarification;
      if (
        !settings.apiKey.trim() ||
        !current ||
        !current.ideaUnderstanding ||
        !clarification
      ) {
        return;
      }

      inFlightRef.current = true;
      setLocalPhase("synthesis-running");
      setSessionError(null);
      const startedAt = new Date().toISOString();

      try {
        const { clarifiedContext, latencyMs } =
          await synthesizeClarification({
            settings,
            rawIdea: current.rawIdea,
            ideaUnderstanding: current.ideaUnderstanding,
            questions: clarification.questions,
            answers: clarification.answers,
          });

        const finishedAt = new Date().toISOString();
        const nextState: Project["clarification"] = {
          ...clarification,
          clarifiedContext,
          completedAt: finishedAt,
        };
        const saved: Project = {
          ...current,
          status: "clarified",
          updatedAt: finishedAt,
          clarification: nextState,
          lastRun: makeRun(
            "clarification",
            startedAt,
            "succeeded",
            latencyMs,
            null,
            finishedAt
          ),
        };
        saveProject(saved);
      } catch (error) {
        const runError = toRunError(error);
        const finishedAt = new Date().toISOString();
        const failed: Project = {
          ...current,
          status: "failed",
          updatedAt: finishedAt,
          lastRun: makeRun(
            "clarification",
            startedAt,
            "failed",
            null,
            runError,
            finishedAt
          ),
        };
        saveProject(failed);
        setSessionError(runError.message);
      } finally {
        inFlightRef.current = false;
        setLocalPhase((prev) =>
          prev === "synthesis-running" ? null : prev
        );
      }
    },
    [storedProject]
  );

  // 答案实时本地保存：仅更新 clarification.answers，不动 lastRun / status，
  // 因此失败信息与已填答案都不会丢失。
  const handleAnswersChange = useCallback(
    (answers: ClarificationAnswer[]): void => {
      const current = storedProject;
      const clarification = current?.clarification;
      if (!current || !clarification) return;
      if (sessionError) setSessionError(null);
      const next: Project = {
        ...current,
        updatedAt: new Date().toISOString(),
        clarification: { ...clarification, answers },
      };
      saveProject(next);
    },
    [storedProject, sessionError]
  );

  // ---- Stage 3：Product Analysis（仅用户手动触发，不挂自动 effect）----
  const runAnalysis = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const settings = loadSettings();
    const current = storedProject ?? null;
    const clarification = current?.clarification;
    if (
      !settings.apiKey.trim() ||
      !current ||
      !current.ideaUnderstanding ||
      !clarification ||
      !clarification.clarifiedContext
    ) {
      return;
    }

    inFlightRef.current = true;
    setLocalPhase("analysis-running");
    setSessionError(null);
    const startedAt = new Date().toISOString();

    try {
      const { productAnalysis, latencyMs } = await analyzeProduct({
        settings,
        rawIdea: current.rawIdea,
        ideaUnderstanding: current.ideaUnderstanding,
        clarification,
      });

      const finishedAt = new Date().toISOString();
      const saved: Project = {
        ...current,
        status: "analyzed",
        updatedAt: finishedAt,
        productAnalysis: {
          result: productAnalysis,
          completedAt: finishedAt,
        },
        lastRun: makeRun(
          "product_analysis",
          startedAt,
          "succeeded",
          latencyMs,
          null,
          finishedAt
        ),
      };
      saveProject(saved);
    } catch (error) {
      const runError = toRunError(error);
      const finishedAt = new Date().toISOString();
      const failed: Project = {
        ...current,
        status: "failed",
        updatedAt: finishedAt,
        lastRun: makeRun(
          "product_analysis",
          startedAt,
          "failed",
          null,
          runError,
          finishedAt
        ),
      };
      saveProject(failed);
      setSessionError(runError.message);
    } finally {
      inFlightRef.current = false;
      setLocalPhase((prev) =>
        prev === "analysis-running" ? null : prev
      );
    }
  }, [storedProject]);

  // ---- Stage 4：MVP Scoping（仅用户手动触发，不挂自动 effect）----
  const runMvpScoping = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const settings = loadSettings();
    const current = storedProject ?? null;
    const clarification = current?.clarification;
    const productAnalysis = current?.productAnalysis?.result;
    if (
      !settings.apiKey.trim() ||
      !current ||
      !current.ideaUnderstanding ||
      !clarification ||
      !clarification.clarifiedContext ||
      !productAnalysis
    ) {
      return;
    }

    inFlightRef.current = true;
    setLocalPhase("mvp-running");
    setSessionError(null);
    const startedAt = new Date().toISOString();

    try {
      const { mvpScoping: result, latencyMs } = await scopeMvp({
        settings,
        rawIdea: current.rawIdea,
        ideaUnderstanding: current.ideaUnderstanding,
        clarification,
        productAnalysis,
      });

      const finishedAt = new Date().toISOString();
      const saved: Project = {
        ...current,
        status: "scoped",
        updatedAt: finishedAt,
        mvpScoping: {
          result,
          completedAt: finishedAt,
        },
        lastRun: makeRun(
          "mvp_scoping",
          startedAt,
          "succeeded",
          latencyMs,
          null,
          finishedAt
        ),
      };
      saveProject(saved);
    } catch (error) {
      const runError = toRunError(error);
      const finishedAt = new Date().toISOString();
      const failed: Project = {
        ...current,
        status: "failed",
        updatedAt: finishedAt,
        lastRun: makeRun(
          "mvp_scoping",
          startedAt,
          "failed",
          null,
          runError,
          finishedAt
        ),
      };
      saveProject(failed);
      setSessionError(runError.message);
    } finally {
      inFlightRef.current = false;
      setLocalPhase((prev) =>
        prev === "mvp-running" ? null : prev
      );
    }
  }, [storedProject]);

  // ---- 自动运行（仅外部存储事件驱动）----
  const settings = hydrated ? loadSettings() : null;
  const hasKey = Boolean(settings?.apiKey.trim());

  // Stage1 自动：全新项目或刷新恢复到未理解
  const shouldAutoUnderstand =
    hydrated &&
    storedProject !== undefined &&
    storedProject !== null &&
    !storedProject.ideaUnderstanding &&
    storedProject.lastRun?.status !== "failed" &&
    hasKey;

  useEffect(() => {
    if (shouldAutoUnderstand) void runUnderstanding();
  }, [shouldAutoUnderstand, runUnderstanding]);

  // Stage2a 自动：理解已完成但尚未生成问题（含刷新恢复）
  const shouldAutoQuestions =
    hydrated &&
    storedProject !== undefined &&
    storedProject !== null &&
    Boolean(storedProject.ideaUnderstanding) &&
    storedProject.clarification === undefined &&
    storedProject.lastRun?.stage !== "clarification" &&
    hasKey;

  useEffect(() => {
    // 延迟到 effect 提交后执行，避免在 effect 体内同步 setState；
    // inFlightRef 保证 Strict Mode 双调用下只真正执行一次。
    if (!shouldAutoQuestions) return;
    queueMicrotask(() => void runQuestions());
  }, [shouldAutoQuestions, runQuestions]);

  // Stage2b 自动：无需澄清（0 题）时自动接续 synthesis；
  // lastRun 失败时不自动重试，只展示错误并允许手动重试，避免重复计费。
  const shouldAutoSynthesis =
    hydrated &&
    storedProject !== undefined &&
    storedProject !== null &&
    Boolean(storedProject.ideaUnderstanding) &&
    storedProject.clarification !== undefined &&
    storedProject.clarification.clarifiedContext === null &&
    (!storedProject.clarification.needed ||
      storedProject.clarification.questions.length === 0) &&
    storedProject.lastRun?.status !== "failed" &&
    hasKey;

  useEffect(() => {
    if (!shouldAutoSynthesis) return;
    queueMicrotask(() => void runSynthesis());
  }, [shouldAutoSynthesis, runSynthesis]);

  // ---- 派生编排阶段 ----
  function derivePhase(): Phase | null {
    if (storedProject === undefined || storedProject === null) return null;
    const project = storedProject;
    const last = project.lastRun;
    const clarification = project.clarification;

    if (!project.ideaUnderstanding) {
      if (retryingUnderstanding) return "understanding-running";
      if (last?.status === "failed") return "understanding-error";
      if (!hasKey) return "understanding-error";
      return "understanding-running";
    }

    // Stage 4 已完成：刷新后直接展示结果，不再调用模型
    if (project.mvpScoping) return "mvp-done";

    // Stage 3 已完成：刷新后直接展示结果，不再调用模型
    if (project.productAnalysis) {
      if (localPhase === "mvp-running") return "mvp-running";
      if (last?.stage === "mvp_scoping" && last.status === "failed") {
        return "mvp-error";
      }
      return "analyzed";
    }

    // Clarified Context 已完成，等待用户手动启动产品分析
    if (clarification?.clarifiedContext) {
      if (localPhase === "analysis-running") return "analysis-running";
      if (last?.stage === "product_analysis" && last.status === "failed") {
        return "analysis-error";
      }
      return "clarified";
    }

    // synthesis 瞬时态（本地）
    if (localPhase === "synthesis-running") return "synthesis-running";
    // 问题生成瞬时态（本地）
    if (localPhase === "questions-running") return "questions-running";

    // 尚未生成问题
    if (clarification === undefined) {
      if (last?.stage === "clarification" && last.status === "failed") {
        return "questions-error";
      }
      if (!hasKey) return "questions-error";
      return "questions-running";
    }

    // 已有问题
    if (!clarification.needed || clarification.questions.length === 0) {
      // 异常残留：无问题却未 synthesis，继续自动 synthesis
      if (last?.status === "failed") return "synthesis-error";
      return "synthesis-running";
    }

    if (last?.stage === "clarification" && last.status === "failed") {
      // 区分失败发生在哪个动作：有答案说明已提交过 synthesis
      const hasAnyAnswer = clarification.answers.some(
        (answer) =>
          answer.selectedValues.length > 0 ||
          answer.customText.trim().length > 0
      );
      return hasAnyAnswer ? "synthesis-error" : "questions-error";
    }

    return "questions";
  }

  // ---- 加载 / 不存在 ----
  if (!hydrated || storedProject === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-muted" size={20} />
      </div>
    );
  }

  if (storedProject === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-medium text-strong">项目不存在</p>
        <p className="text-sm text-muted">
          该项目可能已被清除，本地数据无法恢复。
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-[12px] bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          返回首页
        </Link>
      </div>
    );
  }

  const project: Project = storedProject;
  const phase = derivePhase();
  const projectName =
    project.ideaUnderstanding?.suggestedName ?? "未命名产品想法";

  const navStage: WorkflowStage =
    phase === "mvp-done" ||
    phase === "mvp-running" ||
    phase === "mvp-error"
      ? "mvp_scoping"
      : phase === "analyzed" ||
        phase === "analysis-running" ||
        phase === "analysis-error"
        ? "product_analysis"
        : phase === "understanding-running" || phase === "understanding-error"
          ? "idea_understanding"
          : "clarification";

  // 阶段标题
  const stageHeader =
    navStage === "mvp_scoping"
      ? { stage: "Stage 4", title: "MVP 范围收敛" }
      : navStage === "product_analysis"
        ? { stage: "Stage 3", title: "产品分析" }
        : navStage === "clarification"
          ? { stage: "Stage 2", title: "信息补全" }
          : { stage: "Stage 1", title: "产品想法" };

  const lastError = project.lastRun?.error?.message ?? null;
  const understandingLatency =
    project.lastRun?.stage === "idea_understanding"
      ? project.lastRun.durationMs
      : null;
  const synthesisLatency =
    project.lastRun?.stage === "clarification"
      ? project.lastRun.durationMs
      : null;
  const analysisLatency =
    project.lastRun?.stage === "product_analysis"
      ? project.lastRun.durationMs
      : null;
  const mvpLatency =
    project.lastRun?.stage === "mvp_scoping"
      ? project.lastRun.durationMs
      : null;
  const autoCompleted =
    project.clarification !== undefined &&
    project.clarification.questions.length === 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-subtle bg-surface px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="返回首页"
            className="rounded-[8px] p-1.5 text-muted transition-colors duration-150 hover:bg-muted-bg hover:text-strong"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-[17px] font-semibold leading-6 text-strong">
            {projectName}
          </h1>
          <StatusBadge phase={phase} />
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-3 text-sm text-body transition-colors duration-150 hover:bg-muted-bg"
        >
          <Settings size={15} />
          设置
        </button>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-subtle bg-surface p-4 lg:w-[240px] lg:border-b-0 lg:border-r">
          <WorkflowNav currentStage={navStage} />
        </aside>

        <main className="flex-1 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-[880px]">
            {/* 阶段标题 */}
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                {stageHeader.stage}
              </p>
              <h2 className="mt-1 text-xl font-semibold leading-8 text-strong">
                {stageHeader.title}
              </h2>
              {phase === "questions" && (
                <p className="mt-1 text-sm text-muted">
                  还有几件会影响产品方向的事情需要确认。
                </p>
              )}
              {phase === "analysis-running" && (
                <p className="mt-1 text-sm text-muted">
                  正在分析这个产品是否解决了一个足够明确的问题。
                </p>
              )}
              {phase === "mvp-running" && (
                <p className="mt-1 text-sm text-muted">
                  正在收敛第一版产品范围，主动保留最小完整闭环。
                </p>
              )}
            </div>

            {/* 原始想法卡片：始终展示 */}
            <div className="mb-6 rounded-[12px] border border-subtle bg-surface px-5 py-4">
              <p className="mb-2 text-xs font-medium text-muted">原始想法</p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-body">
                {project.rawIdea}
              </p>
            </div>

            {/* ---- Stage 1 ---- */}
            {phase === "understanding-running" && <AnalysisProgress />}

            {phase === "understanding-error" && (
              <ErrorPanel
                title="理解没有完成"
                message={
                  !hasKey
                    ? "尚未配置 API Key，请点击右上角设置完成配置后重试。"
                    : sessionError ?? lastError ?? "处理失败，请稍后重试。"
                }
                showSettingsAction={!hasKey}
                onSettings={() => setSettingsOpen(true)}
                onRetry={() => {
                  setRetryingUnderstanding(true);
                  void runUnderstanding();
                }}
              />
            )}

            {navStage === "idea_understanding" && project.ideaUnderstanding && (
              <UnderstandingResult
                result={project.ideaUnderstanding}
                latencyMs={understandingLatency}
              />
            )}

            {/* ---- Stage 2 / 3：首次理解结果折叠 ---- */}
            {navStage !== "idea_understanding" && project.ideaUnderstanding && (
              <details
                open={showUnderstanding}
                onToggle={(event) =>
                  setShowUnderstanding(event.currentTarget.open)
                }
                className="group mb-6 rounded-[12px] border border-subtle bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium text-body [&::-webkit-details-marker]:hidden">
                  查看首次理解结果
                  {showUnderstanding ? (
                    <ChevronUp size={15} className="text-muted" />
                  ) : (
                    <ChevronDown size={15} className="text-muted" />
                  )}
                </summary>
                <div className="border-t border-subtle px-5 py-5">
                  <UnderstandingResult
                    result={project.ideaUnderstanding}
                    latencyMs={understandingLatency}
                  />
                </div>
              </details>
            )}

            {phase === "questions-running" && <ClarifyQuestionsProgress />}

            {phase === "questions-error" && (
              <ErrorPanel
                title="问题没有生成"
                message={
                  !hasKey
                    ? "尚未配置 API Key，请点击右上角设置完成配置后重试。"
                    : sessionError ?? lastError ?? "处理失败，请稍后重试。"
                }
                showSettingsAction={!hasKey}
                onSettings={() => setSettingsOpen(true)}
                onRetry={() => void runQuestions()}
              />
            )}

            {phase === "questions" && project.clarification && (
              <ClarificationQuestionsFlow
                questions={project.clarification.questions}
                answers={project.clarification.answers}
                onAnswersChange={handleAnswersChange}
                onSubmit={() => void runSynthesis()}
                submitting={false}
                submitError={null}
              />
            )}

            {phase === "synthesis-running" && <ClarifySynthesisProgress />}

            {phase === "synthesis-error" && (
              <ErrorPanel
                title="上下文没有整理完成"
                message={sessionError ?? lastError ?? "处理失败，请稍后重试。"}
                onRetry={() => void runSynthesis()}
              />
            )}

            {phase === "clarified" && project.clarification?.clarifiedContext && (
              <ClarificationResult
                context={project.clarification.clarifiedContext}
                latencyMs={synthesisLatency}
                autoCompleted={autoCompleted}
                onStartAnalysis={() => void runAnalysis()}
                analysisStarting={localPhase === "analysis-running"}
              />
            )}

            {/* ---- Stage 3：Product Analysis ---- */}
            {phase === "analysis-running" && <ProductAnalysisProgress />}

            {phase === "analysis-error" && (
              <ErrorPanel
                title="产品分析没有完成"
                message={
                  !hasKey
                    ? "尚未配置 API Key，请点击右上角设置完成配置后重试。"
                    : sessionError ?? lastError ?? "处理失败，请稍后重试。"
                }
                showSettingsAction={!hasKey}
                onSettings={() => setSettingsOpen(true)}
                onRetry={() => void runAnalysis()}
              />
            )}

            {phase === "analyzed" && project.productAnalysis && (
              <ProductAnalysisResultView
                result={project.productAnalysis.result}
                latencyMs={analysisLatency}
                onStartMvp={() => void runMvpScoping()}
                mvpStarting={localPhase === "mvp-running"}
              />
            )}

            {/* ---- Stage 4：MVP Scoping ---- */}
            {phase === "mvp-running" && <MvpScopingProgress />}

            {phase === "mvp-error" && (
              <ErrorPanel
                title="MVP 范围没有收敛完成"
                message={
                  !hasKey
                    ? "尚未配置 API Key，请点击右上角设置完成配置后重试。"
                    : sessionError ?? lastError ?? "处理失败，请稍后重试。"
                }
                showSettingsAction={!hasKey}
                onSettings={() => setSettingsOpen(true)}
                onRetry={() => void runMvpScoping()}
              />
            )}

            {phase === "mvp-done" && project.mvpScoping && (
              <MvpScopingResultView
                result={project.mvpScoping.result}
                latencyMs={mvpLatency}
              />
            )}
          </div>
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

function ErrorPanel({
  title,
  message,
  onRetry,
  showSettingsAction = false,
  onSettings,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  showSettingsAction?: boolean;
  onSettings?: () => void;
}) {
  return (
    <div className="animate-fade-in rounded-[12px] border border-danger/30 bg-danger-soft px-5 py-4">
      <div className="flex items-start gap-3">
        <RefreshCw size={16} className="mt-0.5 shrink-0 text-danger" />
        <div className="flex-1">
          <p className="text-sm font-medium text-danger">{title}</p>
          <p className="mt-1 text-sm leading-6 text-danger/80">{message}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-subtle bg-surface px-3.5 text-sm text-body transition-colors duration-150 hover:bg-muted-bg"
            >
              <RefreshCw size={14} />
              重试
            </button>
            {showSettingsAction && onSettings && (
              <button
                type="button"
                onClick={onSettings}
                className="inline-flex h-9 items-center rounded-[12px] bg-accent px-3.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                打开设置
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ phase }: { phase: Phase | null }) {
  if (phase === "mvp-done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-success-soft px-2 py-0.5 text-xs text-success">
        <CheckCircle2 size={12} />
        MVP 收敛完成
      </span>
    );
  }
  if (phase === "analyzed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-success-soft px-2 py-0.5 text-xs text-success">
        <CheckCircle2 size={12} />
        产品分析完成
      </span>
    );
  }
  if (phase === "clarified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-success-soft px-2 py-0.5 text-xs text-success">
        <CheckCircle2 size={12} />
        信息补全完成
      </span>
    );
  }
  if (
    phase === "understanding-running" ||
    phase === "questions-running" ||
    phase === "synthesis-running" ||
    phase === "analysis-running" ||
    phase === "mvp-running"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-accent-soft px-2 py-0.5 text-xs text-accent">
        <Loader2 size={12} className="animate-spin" />
        AI 处理中
      </span>
    );
  }
  if (
    phase === "understanding-error" ||
    phase === "questions-error" ||
    phase === "synthesis-error" ||
    phase === "analysis-error" ||
    phase === "mvp-error"
  ) {
    return (
      <span className="rounded-[8px] bg-danger-soft px-2 py-0.5 text-xs text-danger">
        需要处理
      </span>
    );
  }
  if (phase === "questions") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-accent-soft px-2 py-0.5 text-xs text-accent">
        待确认
      </span>
    );
  }
  return null;
}
