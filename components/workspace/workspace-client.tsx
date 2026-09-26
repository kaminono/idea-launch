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
import { ExecutionPlanningProgress } from "./execution-planning-progress";
import { ExecutionPlanningResultView } from "./execution-planning-result";
import { FinalReviewProgress } from "./final-review-progress";
import { FinalReviewResultView } from "./final-review-result";
import { SettingsModal } from "@/components/settings/settings-modal";
import {
  analyzeProduct,
  ClientAiError,
  generateClarificationQuestions,
  planExecution,
  reviewFinal,
  scopeMvp,
  synthesizeClarification,
  understandIdea,
} from "@/lib/client/api";
import { saveProject } from "@/lib/storage";
import { useProject } from "@/lib/client/use-project";
import { useHydrated } from "@/lib/client/use-hydrated";
import { useActiveModelConfig } from "@/lib/client/use-settings";
import { getProviderDefinition } from "@/lib/ai/providers/registry";
import type {
  AnalysisRun,
  ClarificationAnswer,
  Project,
  RunError,
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
  | "mvp-done"
  | "execution-running"
  | "execution-error"
  | "execution-done"
  | "review-running"
  | "review-error"
  | "review-done";

function toRunError(error: unknown): RunError {
  if (error instanceof ClientAiError) return error.toRunError();
  return {
    code: "PROVIDER_UNAVAILABLE",
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
    | "execution-running"
    | "review-running"
    | null
  >(null);
  const [retryingUnderstanding, setRetryingUnderstanding] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showUnderstanding, setShowUnderstanding] = useState(false);
  // Final Review 已完成后，允许用户临时回看执行方案；默认仍展示最终检查结果
  const [viewingExecution, setViewingExecution] = useState(false);

  const inFlightRef = useRef(false);

  // 当前激活 Provider 的完整模型配置（含 API Key），由设置订阅驱动；
  // 仅在 localStorage 原始数据变化时才重建引用，可安全作为节点函数依赖。
  const modelConfig = useActiveModelConfig();

  // ---- Stage 1：Idea Understanding ----
  const runUnderstanding = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const current = storedProject ?? null;
    if (!modelConfig?.apiKey.trim() || !current) return;

    inFlightRef.current = true;
    const startedAt = new Date().toISOString();

    try {
      const { ideaUnderstanding, latencyMs } = await understandIdea({
        modelConfig,
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
  }, [storedProject, modelConfig]);

  // ---- Stage 2a：Clarification Question Generation ----
  const runQuestions = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const current = storedProject ?? null;
    if (
      !modelConfig?.apiKey.trim() ||
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
        modelConfig,
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
  }, [storedProject, modelConfig]);

  // ---- Stage 2b：Clarification Synthesis ----
  const runSynthesis = useCallback(async (): Promise<void> => {
      if (inFlightRef.current) return;
      const current = storedProject ?? null;
      const clarification = current?.clarification;
      if (
        !modelConfig?.apiKey.trim() ||
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
            modelConfig,
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
    [storedProject, modelConfig]
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
    const current = storedProject ?? null;
    const clarification = current?.clarification;
    if (
      !modelConfig?.apiKey.trim() ||
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
        modelConfig,
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
  }, [storedProject, modelConfig]);

  // ---- Stage 4：MVP Scoping（仅用户手动触发，不挂自动 effect）----
  const runMvpScoping = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const current = storedProject ?? null;
    const clarification = current?.clarification;
    const productAnalysis = current?.productAnalysis?.result;
    if (
      !modelConfig?.apiKey.trim() ||
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
        modelConfig,
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
  }, [storedProject, modelConfig]);

  // ---- Stage 5：Execution Planning（仅用户手动触发，不挂自动 effect）----
  const runExecutionPlanning = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const current = storedProject ?? null;
    const clarification = current?.clarification;
    const productAnalysis = current?.productAnalysis?.result;
    const mvpScoping = current?.mvpScoping?.result;
    if (
      !modelConfig?.apiKey.trim() ||
      !current ||
      !current.ideaUnderstanding ||
      !clarification ||
      !clarification.clarifiedContext ||
      !productAnalysis ||
      !mvpScoping
    ) {
      return;
    }

    inFlightRef.current = true;
    setLocalPhase("execution-running");
    setSessionError(null);
    const startedAt = new Date().toISOString();

    try {
      const { executionPlanning: result, latencyMs } = await planExecution({
        modelConfig,
        rawIdea: current.rawIdea,
        ideaUnderstanding: current.ideaUnderstanding,
        clarification,
        productAnalysis,
        mvpScoping,
      });

      const finishedAt = new Date().toISOString();
      // 不新增 ProjectStatus：保持 scoped，execution-done 视图由 executionPlanning 派生
      const saved: Project = {
        ...current,
        status: "scoped",
        updatedAt: finishedAt,
        executionPlanning: {
          result,
          completedAt: finishedAt,
        },
        lastRun: makeRun(
          "execution_planning",
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
          "execution_planning",
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
        prev === "execution-running" ? null : prev
      );
    }
  }, [storedProject, modelConfig]);

  // ---- Final Review（仅用户手动触发，只读审计，不修改前序结果）----
  const runFinalReview = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const current = storedProject ?? null;
    const clarification = current?.clarification;
    const productAnalysis = current?.productAnalysis?.result;
    const mvpScoping = current?.mvpScoping?.result;
    const executionPlanning = current?.executionPlanning?.result;
    if (
      !modelConfig?.apiKey.trim() ||
      !current ||
      !current.ideaUnderstanding ||
      !clarification ||
      !clarification.clarifiedContext ||
      !productAnalysis ||
      !mvpScoping ||
      !executionPlanning
    ) {
      return;
    }

    inFlightRef.current = true;
    setLocalPhase("review-running");
    setSessionError(null);
    setViewingExecution(false);
    const startedAt = new Date().toISOString();

    try {
      const { finalReview: result, latencyMs } = await reviewFinal({
        modelConfig,
        rawIdea: current.rawIdea,
        ideaUnderstanding: current.ideaUnderstanding,
        clarification,
        productAnalysis,
        mvpScoping,
        executionPlanning,
      });

      const finishedAt = new Date().toISOString();
      // Review 不改变 ProjectStatus：保持 scoped，review-done 视图由 finalReview 派生
      const saved: Project = {
        ...current,
        status: "scoped",
        updatedAt: finishedAt,
        finalReview: {
          result,
          completedAt: finishedAt,
        },
        lastRun: makeRun(
          "final_review",
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
      // 失败时保留全部前序结果（含 executionPlanning），只写失败运行记录
      const failed: Project = {
        ...current,
        status: "failed",
        updatedAt: finishedAt,
        lastRun: makeRun(
          "final_review",
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
        prev === "review-running" ? null : prev
      );
    }
  }, [storedProject, modelConfig]);

  // ---- 自动运行（仅外部存储事件驱动）----
  const hasKey = Boolean(modelConfig?.apiKey.trim());

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

    // Final Review 进行中：优先于一切持久化视图
    if (localPhase === "review-running") return "review-running";

    // Final Review 已完成：刷新后直接展示结果，零重复模型调用
    if (project.finalReview) {
      if (localPhase === "execution-running") return "execution-running";
      // 用户主动回看执行方案（Review 失败时也可查看原方案）
      if (viewingExecution) return "execution-done";
      if (last?.stage === "final_review" && last.status === "failed") {
        return "review-error";
      }
      return "review-done";
    }

    // Stage 5 已完成：等待手动启动 Final Review（或展示 Review 运行/失败态）
    if (project.executionPlanning) {
      if (last?.stage === "final_review" && last.status === "failed") {
        return "review-error";
      }
      return "execution-done";
    }

    // Stage 4 已完成：等待手动启动执行方案
    if (project.mvpScoping) {
      if (localPhase === "execution-running") return "execution-running";
      if (last?.stage === "execution_planning" && last.status === "failed") {
        return "execution-error";
      }
      return "mvp-done";
    }

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
        <Loader2 className="animate-spin text-ink-muted" size={20} />
      </div>
    );
  }

  if (storedProject === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-medium text-ink">项目不存在</p>
        <p className="text-sm text-ink-secondary">
          该项目可能已被清除，本地数据无法恢复。
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover"
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
    phase === "execution-done" ||
    phase === "execution-running" ||
    phase === "execution-error" ||
    phase === "review-done" ||
    phase === "review-running" ||
    phase === "review-error"
      ? "execution_planning"
      : phase === "mvp-done" ||
        phase === "mvp-running" ||
        phase === "mvp-error"
        ? "mvp_scoping"
        : phase === "analyzed" ||
          phase === "analysis-running" ||
          phase === "analysis-error"
          ? "product_analysis"
          : phase === "understanding-running" ||
              phase === "understanding-error"
            ? "idea_understanding"
            : "clarification";

  // 阶段标题元数据：编号 / English Label / 中文标题 / 阶段目的
  const stageHeader =
    navStage === "execution_planning"
      ? {
          number: "05",
          en: "Execute",
          title: "执行方案",
          purpose: "把冻结的 MVP 范围转化成可以立刻开工的结构、里程碑与任务。",
        }
      : navStage === "mvp_scoping"
        ? {
            number: "04",
            en: "Scope",
            title: "MVP 范围收敛",
            purpose: "主动砍范围，只保留能验证首要假设的最小完整用户闭环。",
          }
        : navStage === "product_analysis"
          ? {
              number: "03",
              en: "Analysis",
              title: "产品分析",
              purpose: "判断这个想法是否在解决一个足够明确、值得做的问题。",
            }
          : navStage === "clarification"
            ? {
                number: "02",
                en: "Clarify",
                title: "信息补全",
                purpose: "只追问会影响产品方向的关键信息，其余以假设标注。",
              }
            : {
                number: "01",
                en: "Idea",
                title: "产品想法",
                purpose: "先用结构化视角复述你的原始想法，确认理解没有偏差。",
              };

  // 工作区模型徽标：随设置中激活的 Provider / Model 动态变化，不写死品牌名
  const modelBadgeLabel = modelConfig
    ? `${getProviderDefinition(modelConfig.providerId).badgePrefix} · ${modelConfig.modelId}`
    : "未配置模型";

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
  const executionLatency =
    project.lastRun?.stage === "execution_planning"
      ? project.lastRun.durationMs
      : null;
  const reviewLatency =
    project.lastRun?.stage === "final_review"
      ? project.lastRun.durationMs
      : null;
  const autoCompleted =
    project.clarification !== undefined &&
    project.clarification.questions.length === 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-paper/85 px-6 backdrop-blur lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="返回首页"
            className="rounded-[8px] p-1.5 text-ink-secondary transition-colors duration-150 hover:bg-surface-secondary hover:text-ink"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="max-w-[420px] truncate text-[17px] font-semibold leading-6 text-ink">
            {projectName}
          </h1>
          <StatusBadge phase={phase} />
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-sm text-ink-secondary transition-colors duration-150 hover:bg-surface-secondary hover:text-ink"
        >
          <Settings size={15} />
          <span className="hidden sm:inline">设置</span>
        </button>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-border bg-paper px-5 py-4 lg:w-[212px] lg:border-b-0 lg:border-r lg:px-4 lg:py-8">
          <WorkflowNav currentStage={navStage} />
        </aside>

        <main className="flex-1 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-[880px]">
            {/* Editorial Stage Header */}
            <div className="mb-7 border-b border-border pb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[13px] font-medium text-brand">
                      {stageHeader.number}
                    </span>
                    <span className="label-editorial">{stageHeader.en}</span>
                  </div>
                  <h2 className="mt-2 text-[26px] font-semibold leading-9 tracking-[-0.01em] text-ink">
                    {stageHeader.title}
                  </h2>
                  <p className="mt-1.5 max-w-[620px] text-sm leading-6 text-ink-secondary">
                    {stageHeader.purpose}
                  </p>
                </div>
                <span className="mt-1 inline-flex max-w-[260px] shrink-0 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-2.5 py-1.5 text-[11px] text-ink-secondary">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  <span className="truncate font-mono uppercase tracking-wide">
                    {modelBadgeLabel}
                  </span>
                </span>
              </div>
              {phase === "questions" && (
                <p className="mt-3 text-sm text-ink-secondary">
                  还有几件会影响产品方向的事情需要确认。
                </p>
              )}
              {phase === "analysis-running" && (
                <p className="mt-3 text-sm text-ink-secondary">
                  正在分析这个产品是否解决了一个足够明确的问题。
                </p>
              )}
              {phase === "mvp-running" && (
                <p className="mt-3 text-sm text-ink-secondary">
                  正在收敛第一版产品范围，主动保留最小完整闭环。
                </p>
              )}
              {phase === "execution-running" && (
                <p className="mt-3 text-sm text-ink-secondary">
                  正在把 MVP 转化成可以开始开发的计划。
                </p>
              )}
              {phase === "review-running" && (
                <p className="mt-3 text-sm text-ink-secondary">
                  正在检查整份立项方案的一致性。
                </p>
              )}
            </div>

            {/* 原始想法卡片：始终展示 */}
            <div className="mb-6 rounded-[12px] border border-border bg-surface px-5 py-4">
              <p className="label-editorial mb-2">Raw Idea · 原始想法</p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-ink-secondary">
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
                className="group mb-6 rounded-[12px] border border-border bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium text-ink-secondary transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono text-[11px] text-brand">01</span>
                    查看首次理解结果
                  </span>
                  {showUnderstanding ? (
                    <ChevronUp size={15} className="text-ink-muted" />
                  ) : (
                    <ChevronDown size={15} className="text-ink-muted" />
                  )}
                </summary>
                <div className="border-t border-border px-5 py-5">
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
                onStartExecution={() => void runExecutionPlanning()}
                executionStarting={localPhase === "execution-running"}
              />
            )}

            {/* ---- Stage 5：Execution Planning ---- */}
            {phase === "execution-running" && <ExecutionPlanningProgress />}

            {phase === "execution-error" && (
              <ErrorPanel
                title="执行方案没有生成完成"
                message={
                  !hasKey
                    ? "尚未配置 API Key，请点击右上角设置完成配置后重试。"
                    : sessionError ?? lastError ?? "处理失败，请稍后重试。"
                }
                showSettingsAction={!hasKey}
                onSettings={() => setSettingsOpen(true)}
                onRetry={() => void runExecutionPlanning()}
              />
            )}

            {phase === "execution-done" && project.executionPlanning && (
              <ExecutionPlanningResultView
                result={project.executionPlanning.result}
                latencyMs={executionLatency}
                onStartReview={() => void runFinalReview()}
                reviewStarting={localPhase === "review-running"}
              />
            )}

            {/* ---- Final Review：挂在 Stage 5，不新增主导航 ---- */}
            {phase === "review-running" && <FinalReviewProgress />}

            {phase === "review-error" && (
              <ErrorPanel
                title="最终检查没有完成"
                message={
                  !hasKey
                    ? "尚未配置 API Key，请点击右上角设置完成配置后重试。"
                    : sessionError ?? lastError ?? "处理失败，请稍后重试。"
                }
                showSettingsAction={!hasKey}
                onSettings={() => setSettingsOpen(true)}
                onRetry={() => void runFinalReview()}
              />
            )}

            {phase === "review-done" && project.finalReview && (
              <FinalReviewResultView
                result={project.finalReview.result}
                latencyMs={reviewLatency}
                onViewExecution={() => setViewingExecution(true)}
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
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3.5 text-sm text-ink-secondary transition-colors duration-150 hover:bg-surface-secondary hover:text-ink"
            >
              <RefreshCw size={14} />
              重试
            </button>
            {showSettingsAction && onSettings && (
              <button
                type="button"
                onClick={onSettings}
                className="inline-flex h-9 items-center rounded-[8px] bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-hover"
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
  if (phase === "review-done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-aubergine-soft px-2 py-0.5 text-xs text-aubergine">
        <CheckCircle2 size={12} />
        立项检查完成
      </span>
    );
  }
  if (phase === "execution-done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-aubergine-soft px-2 py-0.5 text-xs text-aubergine">
        <CheckCircle2 size={12} />
        执行方案完成
      </span>
    );
  }
  if (phase === "mvp-done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-aubergine-soft px-2 py-0.5 text-xs text-aubergine">
        <CheckCircle2 size={12} />
        MVP 收敛完成
      </span>
    );
  }
  if (phase === "analyzed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-aubergine-soft px-2 py-0.5 text-xs text-aubergine">
        <CheckCircle2 size={12} />
        产品分析完成
      </span>
    );
  }
  if (phase === "clarified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-aubergine-soft px-2 py-0.5 text-xs text-aubergine">
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
    phase === "mvp-running" ||
    phase === "execution-running" ||
    phase === "review-running"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-brand-soft px-2 py-0.5 text-xs text-brand">
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
    phase === "mvp-error" ||
    phase === "execution-error" ||
    phase === "review-error"
  ) {
    return (
      <span className="rounded-[8px] bg-danger-soft px-2 py-0.5 text-xs text-danger">
        需要处理
      </span>
    );
  }
  if (phase === "questions") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[8px] bg-brand-soft px-2 py-0.5 text-xs text-brand">
        待确认
      </span>
    );
  }
  return null;
}
