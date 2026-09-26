// Projects 读写：唯一允许访问 idea-launch:projects:v1 的模块。

import {
  isClarificationAnswer,
  isClarificationQuestions,
  isClarifiedContext,
  isIdeaUnderstanding,
  isMvpScopingResult,
  isProductAnalysisResult,
} from "@/lib/ai/schemas";
import type {
  AnalysisRun,
  Project,
  ProjectStatus,
  RunStatus,
  WorkflowStage,
} from "@/lib/types";
import { notifyProjectsChanged } from "@/lib/client/events";
import { PROJECTS_KEY } from "./keys";
import { readEnvelope, removeKey, writeEnvelope } from "./core";

const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "understanding",
  "understood",
  "clarified",
  "analyzed",
  "scoped",
  "failed",
];

const RUN_STATUSES: readonly RunStatus[] = [
  "running",
  "succeeded",
  "failed",
];

const WORKFLOW_STAGES: readonly WorkflowStage[] = [
  "idea_understanding",
  "clarification",
  "product_analysis",
  "mvp_scoping",
  "execution_planning",
  "final_review",
];

function isAnalysisRun(value: unknown): value is AnalysisRun {
  if (typeof value !== "object" || value === null) return false;
  const run = value as Record<string, unknown>;
  const error = run.error;
  return (
    typeof run.id === "string" &&
    WORKFLOW_STAGES.includes(run.stage as WorkflowStage) &&
    RUN_STATUSES.includes(run.status as RunStatus) &&
    typeof run.startedAt === "string" &&
    (run.finishedAt === null || typeof run.finishedAt === "string") &&
    (run.durationMs === null || typeof run.durationMs === "number") &&
    (error === null ||
      (typeof error === "object" &&
        error !== null &&
        typeof (error as Record<string, unknown>).code === "string" &&
        typeof (error as Record<string, unknown>).message === "string"))
  );
}

/** 校验信息补全状态；第二阶段前的旧项目没有该字段（undefined 视为合法缺省） */
function isClarificationState(
  value: unknown
): value is NonNullable<Project["clarification"]> {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  // questions 持久化的是 ClarificationQuestion[]，借用 questions 守卫整体校验
  const questionsBundle: unknown = {
    clarificationNeeded: state.needed,
    reason: state.reason,
    questions: state.questions,
  };
  return (
    isClarificationQuestions(questionsBundle) &&
    Array.isArray(state.answers) &&
    state.answers.every(isClarificationAnswer) &&
    (state.clarifiedContext === null ||
      isClarifiedContext(state.clarifiedContext)) &&
    (state.completedAt === null || typeof state.completedAt === "string")
  );
}

/** 校验产品分析状态；第三阶段前的旧项目没有该字段（undefined 视为合法缺省） */
function isProductAnalysisState(
  value: unknown
): value is NonNullable<Project["productAnalysis"]> {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    isProductAnalysisResult(state.result) &&
    typeof state.completedAt === "string"
  );
}

/** 校验 MVP Scoping 状态；第四阶段前的旧项目没有该字段（undefined 视为合法缺省） */
function isMvpScopingState(
  value: unknown
): value is NonNullable<Project["mvpScoping"]> {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    isMvpScopingResult(state.result) &&
    typeof state.completedAt === "string"
  );
}

function isProject(value: unknown): value is Project {
  if (typeof value !== "object" || value === null) return false;
  const project = value as Record<string, unknown>;
  return (
    typeof project.id === "string" &&
    typeof project.createdAt === "string" &&
    typeof project.updatedAt === "string" &&
    typeof project.rawIdea === "string" &&
    PROJECT_STATUSES.includes(project.status as ProjectStatus) &&
    (project.ideaUnderstanding === null ||
      isIdeaUnderstanding(project.ideaUnderstanding)) &&
    (project.clarification === undefined ||
      isClarificationState(project.clarification)) &&
    (project.productAnalysis === undefined ||
      isProductAnalysisState(project.productAnalysis)) &&
    (project.mvpScoping === undefined ||
      isMvpScopingState(project.mvpScoping)) &&
    (project.lastRun === null || isAnalysisRun(project.lastRun))
  );
}

/** 读取全部本地项目，按更新时间倒序；损坏条目自动剔除 */
export function loadProjects(): Project[] {
  const projects = readEnvelope<Project[]>(
    PROJECTS_KEY,
    [],
    (value): value is Project[] =>
      Array.isArray(value) && value.every(isProject)
  );
  return [...projects].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function persist(projects: Project[]): void {
  writeEnvelope(PROJECTS_KEY, projects);
  notifyProjectsChanged();
}

/** 读取原始数组（不逐条校验），写入 / 删除时顺带剔除损坏条目 */
function readRawProjects(): unknown[] {
  return readEnvelope<unknown[]>(PROJECTS_KEY, [], Array.isArray);
}

export function getProject(id: string): Project | null {
  return loadProjects().find((project) => project.id === id) ?? null;
}

export function saveProject(project: Project): void {
  const projects = readRawProjects().filter(isProject);
  const index = projects.findIndex((item) => item.id === project.id);
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  persist(projects);
}

export function deleteProject(id: string): void {
  const projects = readRawProjects().filter(isProject);
  persist(projects.filter((project) => project.id !== id));
}

/** 清空全部本地项目 */
export function clearProjects(): void {
  removeKey(PROJECTS_KEY);
  notifyProjectsChanged();
}
