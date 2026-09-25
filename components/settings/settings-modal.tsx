"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { testConnection } from "@/lib/client/api";
import {
  DEFAULT_BASE_URL,
  MODEL_OPTIONS,
} from "@/lib/ai/config";
import {
  clearSettings,
  defaultSettings,
  loadSettings,
  saveSettings,
} from "@/lib/storage";
import type { Settings } from "@/lib/types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; model: string; latencyMs: number }
  | { status: "error"; message: string };

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [form, setForm] = useState<Settings>(defaultSettings());
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: "idle" });
  const [saved, setSaved] = useState(false);

  // 每次打开时从 localStorage 同步最新设置：
  // 在渲染期间调整 state（React 官方推荐模式），避免 effect 内 setState。
  const [syncedForOpen, setSyncedForOpen] = useState(false);
  if (open && !syncedForOpen) {
    setSyncedForOpen(true);
    setForm(loadSettings());
    setTestState({ status: "idle" });
    setSaved(false);
    setShowKey(false);
  }
  if (!open && syncedForOpen) {
    setSyncedForOpen(false);
  }

  const update = (patch: Partial<Settings>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const persist = () => {
    const next = saveSettings(form);
    setForm(next);
    setSaved(true);
  };

  const handleClear = () => {
    clearSettings();
    const next = defaultSettings();
    setForm(next);
    setTestState({ status: "idle" });
  };

  const handleTest = async () => {
    const current = saveSettings(form);
    setForm(current);
    setSaved(false);
    setTestState({ status: "testing" });
    try {
      const result = await testConnection(current);
      setTestState({
        status: "success",
        model: result.model,
        latencyMs: result.latencyMs,
      });
    } catch (error) {
      setTestState({
        status: "error",
        message:
          error instanceof Error ? error.message : "连接失败，请稍后重试。",
      });
    }
  };

  const modelOption = MODEL_OPTIONS[0];

  return (
    <Modal open={open} title="设置" onClose={onClose}>
      <div className="space-y-5">
        <Field
          label="API Key"
          hint="仅保存在当前浏览器，本地演示结束后可随时清除。"
        >
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={form.apiKey}
              onChange={(event) => update({ apiKey: event.target.value })}
              placeholder="请输入豆包 API Key"
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-[12px] border border-subtle bg-surface px-3 pr-10 text-sm text-strong outline-none transition-shadow duration-150 placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] p-1.5 text-muted hover:bg-muted-bg hover:text-strong transition-colors duration-150"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        <Field label="模型">
          <div className="flex h-10 items-center justify-between rounded-[12px] border border-subtle bg-muted-bg px-3">
            <span className="text-sm text-strong">{modelOption.label}</span>
            <span className="font-mono text-xs text-muted">
              {modelOption.id}
            </span>
          </div>
        </Field>

        <Field
          label="API 地址"
          hint="默认使用火山方舟 Agent Plan 地址，通常无需修改。"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={form.baseUrl}
              onChange={(event) => update({ baseUrl: event.target.value })}
              spellCheck={false}
              className="h-10 min-w-0 flex-1 rounded-[12px] border border-subtle bg-surface px-3 font-mono text-xs text-strong outline-none transition-shadow duration-150 focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            <button
              type="button"
              onClick={() => update({ baseUrl: DEFAULT_BASE_URL })}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] border border-subtle bg-surface px-3 text-sm text-body hover:bg-muted-bg transition-colors duration-150"
            >
              <RotateCcw size={14} />
              恢复默认
            </button>
          </div>
        </Field>

        {testState.status === "success" && (
          <div className="flex items-start gap-2.5 rounded-[12px] bg-success-soft px-3.5 py-3 text-sm text-success animate-fade-in">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">已连接</p>
              <p className="mt-0.5 text-xs">
                模型 <span className="font-mono">{testState.model}</span> ·
                请求耗时 {testState.latencyMs} ms
              </p>
            </div>
          </div>
        )}

        {testState.status === "error" && (
          <div className="flex items-start gap-2.5 rounded-[12px] bg-danger-soft px-3.5 py-3 text-sm text-danger animate-fade-in">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">连接失败</p>
              <p className="mt-0.5 text-xs leading-5">{testState.message}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-subtle pt-4">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-2.5 text-sm text-danger hover:bg-danger-soft transition-colors duration-150"
          >
            <Trash2 size={14} />
            清除全部设置
          </button>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-success animate-fade-in">
                已保存
              </span>
            )}
            <button
              type="button"
              onClick={handleTest}
              disabled={testState.status === "testing" || !form.apiKey.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-subtle bg-surface px-3.5 text-sm text-body hover:bg-muted-bg disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150"
            >
              {testState.status === "testing" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  测试中…
                </>
              ) : (
                "测试连接"
              )}
            </button>
            <button
              type="button"
              onClick={persist}
              className="inline-flex h-9 items-center rounded-[12px] bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover transition-colors duration-150"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-strong">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs leading-5 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
