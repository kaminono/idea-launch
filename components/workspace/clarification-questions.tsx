"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  PenLine,
  RefreshCw,
} from "lucide-react";
import type {
  ClarificationAnswer,
  ClarificationQuestion,
} from "@/lib/types";

interface ClarificationQuestionsFlowProps {
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
  onAnswersChange: (answers: ClarificationAnswer[]) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}

/** 判断某题是否已有有效答案 */
function hasContent(
  question: ClarificationQuestion,
  answer: ClarificationAnswer | undefined
): boolean {
  if (!answer) return false;
  if (question.answerType === "text") {
    return answer.customText.trim().length > 0;
  }
  if (question.answerType === "single_choice") {
    // 自定义模式下只有真正填写了内容才算已答
    return answer.selectedValues.length > 0
      ? true
      : question.allowCustomAnswer && answer.customText.trim().length > 0;
  }
  // multi_choice：选项与自定义补充任一有内容即可
  return (
    answer.selectedValues.length > 0 || answer.customText.trim().length > 0
  );
}

export function ClarificationQuestionsFlow({
  questions,
  answers,
  onAnswersChange,
  onSubmit,
  submitting,
  submitError,
}: ClarificationQuestionsFlowProps) {
  // 刷新恢复：定位到第一个尚未作答的问题
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnanswered = questions.findIndex(
      (question) =>
        !hasContent(
          question,
          answers.find((answer) => answer.questionId === question.id)
        )
    );
    return firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
  });

  // 单选题自动前进的延迟句柄，卸载 / 手动切题时清理
  const advanceTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const question = questions[currentIndex];
  const answer = answers.find((item) => item.questionId === question.id);
  const answered = hasContent(question, answer);
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = useMemo(
    () =>
      questions.filter((item) =>
        hasContent(
          item,
          answers.find((answer) => answer.questionId === item.id)
        )
      ).length,
    [questions, answers]
  );

  /** 局部更新当前题答案，并同步到外部（实时本地保存由父级完成） */
  function updateAnswer(patch: Partial<ClarificationAnswer>): void {
    const base: ClarificationAnswer = answer ?? {
      questionId: question.id,
      selectedValues: [],
      customText: "",
    };
    const next: ClarificationAnswer = { ...base, ...patch };
    const others = answers.filter(
      (item) => item.questionId !== question.id
    );
    // 保持与问题一致的顺序
    const reordered = questions.map((item) =>
      item.id === question.id
        ? next
        : others.find((candidate) => candidate.questionId === item.id)
    ).filter((item): item is ClarificationAnswer => Boolean(item));
    onAnswersChange(reordered);
  }

  function selectSingle(value: string): void {
    // 选择具体选项即退出自定义模式
    updateAnswer({ selectedValues: [value], customText: "" });
    // 单选题作答后轻微停留再进入下一题；最后一题不自动提交
    if (!isLast) {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
      advanceTimerRef.current = window.setTimeout(() => {
        advanceTimerRef.current = null;
        setCurrentIndex((index) => index + 1);
      }, 320);
    }
  }

  function selectSingleCustom(): void {
    // 切换到自定义时必须清空已选项，否则自定义输入框不会展示
    updateAnswer({ selectedValues: [], customText: answer?.customText ?? "" });
  }

  function toggleMulti(value: string): void {
    const current = answer?.selectedValues ?? [];
    const nextValues = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    updateAnswer({ selectedValues: nextValues });
  }

  function goPrev(): void {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  function goNext(): void {
    if (!isLast && answered) setCurrentIndex(currentIndex + 1);
  }

  const progressPct = Math.round(
    ((currentIndex + 1) / questions.length) * 100
  );

  return (
    <div>
      {/* 问题进度 */}
      <div className="mx-auto mb-6 max-w-[720px]">
        <div className="mb-2 flex items-center justify-between">
          <p className="label-editorial">
            Question
            <span className="ml-2 font-mono text-brand">
              {String(currentIndex + 1).padStart(2, "0")} / {String(questions.length).padStart(2, "0")}
            </span>
          </p>
          <p className="font-mono text-[11px] text-ink-muted">
            已回答 {answeredCount} 题
          </p>
        </div>
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-surface-secondary"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={questions.length}
        >
          <div
            className="h-full rounded-full bg-brand transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 当前问题大卡片：key 切换触发 fade + translateY */}
      <div
        key={question.id}
        className="animate-fade-slide-in mx-auto max-w-[720px] rounded-[16px] border border-border bg-surface p-7 sm:p-8"
      >
        <h3 className="text-[22px] font-semibold leading-8 tracking-[-0.01em] text-ink sm:text-[24px] sm:leading-9">
          {question.question}
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          {question.whyItMatters}
        </p>

        {question.answerType === "text" ? (
          <div className="mt-6">
            <textarea
              value={answer?.customText ?? ""}
              onChange={(event) =>
                updateAnswer({ customText: event.target.value })
              }
              rows={4}
              placeholder="请用自己的话描述，几句话即可"
              className="w-full resize-none rounded-[12px] border border-border bg-paper px-4 py-3 text-[15px] leading-7 text-ink outline-none transition-colors duration-150 placeholder:text-ink-muted focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
            />
          </div>
        ) : (
          <div
            role={question.answerType === "single_choice" ? "radiogroup" : "group"}
            aria-label={question.question}
            className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {question.options.map((option) => {
              const selected =
                answer?.selectedValues.includes(option.value) ?? false;
              const InputIcon = selected ? Check : null;
              return (
                <button
                  key={option.value}
                  type="button"
                  role={
                    question.answerType === "single_choice" ? "radio" : "checkbox"
                  }
                  aria-checked={selected}
                  onClick={() =>
                    question.answerType === "single_choice"
                      ? selectSingle(option.value)
                      : toggleMulti(option.value)
                  }
                  className={[
                    "flex items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left text-[15px] leading-6 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                    selected
                      ? "border-brand/60 bg-brand-soft font-medium text-brand"
                      : "border-border bg-surface text-ink hover:border-brand/40 hover:bg-brand-soft/50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-[8px] border transition-colors duration-150",
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-border-strong bg-surface",
                    ].join(" ")}
                  >
                    {InputIcon && <InputIcon size={13} />}
                  </span>
                  {option.label}
                </button>
              );
            })}

            {question.allowCustomAnswer && (
              question.answerType === "single_choice" ? (
                <button
                  type="button"
                  role="radio"
                  aria-checked={
                    answer !== undefined && answer.selectedValues.length === 0
                  }
                  onClick={selectSingleCustom}
                  className={[
                    "flex items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left text-[15px] leading-6 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                    answer !== undefined && answer.selectedValues.length === 0
                      ? "border-brand/60 bg-brand-soft font-medium text-brand"
                      : "border-dashed border-border-strong bg-surface text-ink hover:border-brand/40 hover:bg-brand-soft/50",
                  ].join(" ")}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[8px] border border-border-strong bg-surface text-ink-muted">
                    <PenLine size={12} />
                  </span>
                  自己填写
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-border-strong bg-surface px-4 py-3">
                  <PenLine size={15} className="shrink-0 text-ink-muted" />
                  <input
                    type="text"
                    value={answer?.customText ?? ""}
                    onChange={(event) =>
                      updateAnswer({ customText: event.target.value })
                    }
                    placeholder="自己补充（可选）"
                    aria-label="自己补充答案"
                    className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
                  />
                </div>
              )
            )}
          </div>
        )}

        {/* 单选题选择「自己填写」后展示输入框 */}
        {question.answerType === "single_choice" &&
          question.allowCustomAnswer &&
          answer !== undefined &&
          answer.selectedValues.length === 0 && (
            <div className="mt-3 animate-fade-in">
              <input
                type="text"
                value={answer.customText}
                onChange={(event) =>
                  updateAnswer({ customText: event.target.value })
                }
                autoFocus
                placeholder="请输入你的答案"
                aria-label="自定义答案"
                className="w-full rounded-[12px] border border-border bg-paper px-4 py-3 text-[15px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-muted focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
              />
            </div>
          )}

        {/* 底部导航 */}
        <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0 || submitting}
            className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-4 text-sm text-ink-secondary transition-colors duration-150 hover:bg-surface-secondary hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft size={15} />
            上一题
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!answered || submitting}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-brand px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  正在整理…
                </>
              ) : (
                <>
                  完成信息补全
                  <Check size={15} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!answered}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一题
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        {submitError && (
          <div className="mt-4 flex animate-fade-in items-start gap-2.5 rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3">
            <RefreshCw size={15} className="mt-0.5 shrink-0 text-danger" />
            <p className="text-sm leading-6 text-danger">{submitError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
