"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { testConnection } from "@/lib/client/api";
import {
  PROVIDER_REGISTRY,
  defaultProviderConfig,
  getProviderDefinition,
} from "@/lib/ai/providers/registry";
import {
  clearSettingsV2,
  defaultSettingsV2,
  getActiveModelConfig,
  loadSettingsV2,
  saveSettingsV2,
} from "@/lib/storage";
import type {
  Protocol,
  ProviderConfigV2,
  ProviderId,
  SettingsV2,
} from "@/lib/types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type TestState =
  | { status: "idle" }
  | { status: "testing" }
  | {
      status: "success";
      providerName: string;
      modelId: string;
      latencyMs: number;
    }
  | { status: "error"; message: string };

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [form, setForm] = useState<SettingsV2>(defaultSettingsV2());
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testState, setTestState] = useState<TestState>({ status: "idle" });
  const [saved, setSaved] = useState(false);

  // 每次打开时从 localStorage 同步最新设置：
  // 在渲染期间调整 state（React 官方推荐模式），避免 effect 内 setState。
  const [syncedForOpen, setSyncedForOpen] = useState(false);
  if (open && !syncedForOpen) {
    setSyncedForOpen(true);
    setForm(loadSettingsV2() ?? defaultSettingsV2());
    setTestState({ status: "idle" });
    setSaved(false);
    setShowKey(false);
    // 折叠高级设置只影响面板展开状态，不触碰任何配置。
    setShowAdvanced(false);
  }
  if (!open && syncedForOpen) {
    setSyncedForOpen(false);
  }

  const activeId = form.activeProviderId;
  const activeConfig = form.providerConfigs[activeId];
  const isCustom = activeId === "custom";

  /** 切换 Provider：不清空其他 Provider 配置；新 Provider 缺配置时补默认值 */
  const selectProvider = (providerId: ProviderId) => {
    if (providerId === activeId) return;
    setForm((prev) => ({
      activeProviderId: providerId,
      providerConfigs: prev.providerConfigs[providerId]
        ? prev.providerConfigs
        : {
            ...prev.providerConfigs,
            [providerId]: defaultProviderConfig(providerId),
          },
    }));
    setSaved(false);
    setTestState({ status: "idle" });
  };

  const updateActiveConfig = (patch: Partial<ProviderConfigV2>) => {
    if (!activeConfig) return;
    setForm((prev) => ({
      ...prev,
      providerConfigs: {
        ...prev.providerConfigs,
        [prev.activeProviderId]: { ...activeConfig, ...patch },
      },
    }));
    setSaved(false);
  };

  const persist = () => {
    const next = saveSettingsV2(form);
    setForm(next);
    setSaved(true);
  };

  const handleClear = () => {
    clearSettingsV2();
    const next = defaultSettingsV2();
    setForm(next);
    setTestState({ status: "idle" });
  };

  const handleTest = async () => {
    const current = saveSettingsV2(form);
    setForm(current);
    setSaved(false);
    const modelConfig = getActiveModelConfig(current);
    if (!modelConfig) return;
    setTestState({ status: "testing" });
    try {
      const result = await testConnection(modelConfig);
      setTestState({
        status: "success",
        providerName: getProviderDefinition(result.providerId).name,
        modelId: result.modelId,
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

  const activeDefinition = getProviderDefinition(activeId);
  const canTest = Boolean(
    activeConfig &&
      activeConfig.apiKey.trim() &&
      activeConfig.modelId.trim() &&
      (!isCustom || activeConfig.baseUrl.trim())
  );
  const isTesting = testState.status === "testing";

  return (
    <Modal open={open} title="设置" onClose={onClose}>
      <div className="space-y-5">
        {/* 基础区域：当前服务商与模型（只读摘要，不使用介绍卡片） */}
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-surface-secondary px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-secondary">当前服务商</p>
            <p className="mt-0.5 truncate text-sm font-medium text-ink">
              {activeDefinition.name}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs text-ink-secondary">当前模型</p>
            <p className="mt-0.5 truncate font-mono text-xs text-ink">
              {activeConfig?.modelId || "未设置模型"}
            </p>
          </div>
        </div>

        {/* 基础区域：只需填写 API Key 即可测试连接并保存 */}
        <Field
          label="API Key"
          hint="仅保存在当前浏览器本地，不会写入项目数据；每次请求临时发送，结束后不保留。"
        >
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={activeConfig?.apiKey ?? ""}
              onChange={(event) => updateActiveConfig({ apiKey: event.target.value })}
              placeholder="请输入 API Key"
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-[12px] border border-border bg-surface px-3 pr-10 text-sm text-ink outline-none transition-shadow duration-150 placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] p-1.5 text-ink-secondary hover:bg-surface-secondary hover:text-ink transition-colors duration-150"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {/* 连接验证状态 */}
        {testState.status === "success" && (
          <div className="flex items-start gap-2.5 rounded-[12px] bg-success-soft px-3.5 py-3 text-sm text-success animate-fade-in">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">连接成功</p>
              <p className="mt-0.5 text-xs">
                {testState.providerName} · 模型{" "}
                <span className="font-mono">{testState.modelId}</span> · 耗时{" "}
                {testState.latencyMs} ms
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

        {/* 高级设置：默认收起，集中放置服务商切换等低频配置；展开/收起不重置配置 */}
        <div className="rounded-[12px] border border-border">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            aria-expanded={showAdvanced}
            className="flex h-10 w-full items-center justify-between px-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface-secondary rounded-[12px]"
          >
            高级设置
            <ChevronDown
              size={16}
              className={`text-ink-secondary transition-transform duration-150 ${
                showAdvanced ? "rotate-180" : ""
              }`}
            />
          </button>
          {showAdvanced && (
            <div className="space-y-4 border-t border-border px-3 py-3.5 animate-fade-in">
              <Field label="模型服务商">
                <select
                  value={activeId}
                  onChange={(event) =>
                    selectProvider(event.target.value as ProviderId)
                  }
                  className="h-10 w-full rounded-[12px] border border-border bg-surface px-3 text-sm text-ink outline-none transition-shadow duration-150 focus:border-brand focus:ring-2 focus:ring-brand/15"
                >
                  {PROVIDER_REGISTRY.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs leading-5 text-ink-secondary">
                  {activeDefinition.description}
                </p>
              </Field>

              <Field label="模型 ID">
                <input
                  type="text"
                  value={activeConfig?.modelId ?? ""}
                  onChange={(event) =>
                    updateActiveConfig({ modelId: event.target.value })
                  }
                  list="model-id-suggestions"
                  spellCheck={false}
                  placeholder="请输入模型 ID"
                  className="h-10 w-full rounded-[12px] border border-border bg-surface px-3 font-mono text-xs text-ink outline-none transition-shadow duration-150 placeholder:font-sans placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
                <datalist id="model-id-suggestions">
                  {activeDefinition.modelSuggestions.map((modelId) => (
                    <option key={modelId} value={modelId} />
                  ))}
                </datalist>
                <p className="mt-1.5 text-xs leading-5 text-ink-secondary">
                  可直接填写，也可从推荐列表中选择；推荐项不是白名单。
                  {activeDefinition.modelSuggestions[0] &&
                    activeConfig?.modelId.trim() !==
                      activeDefinition.modelSuggestions[0] && (
                      <button
                        type="button"
                        // 只更新当前表单中的模型 ID，不触碰地址 / Key / 其他服务商；保存后才生效。
                        onClick={() =>
                          updateActiveConfig({
                            modelId: activeDefinition.modelSuggestions[0],
                          })
                        }
                        className="ml-1 text-brand hover:text-brand-hover hover:underline"
                      >
                        使用推荐模型
                      </button>
                    )}
                </p>
              </Field>

              {isCustom ? (
                <>
                  <Field
                    label="API 地址"
                    hint="仅允许 http/https 公网地址；本地、内网与云元数据地址会被拒绝。"
                  >
                    <input
                      type="text"
                      value={activeConfig?.baseUrl ?? ""}
                      onChange={(event) =>
                        updateActiveConfig({ baseUrl: event.target.value })
                      }
                      spellCheck={false}
                      placeholder="https://your-api-host/v1"
                      className="h-10 w-full rounded-[12px] border border-border bg-surface px-3 font-mono text-xs text-ink outline-none transition-shadow duration-150 placeholder:font-sans placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/15"
                    />
                  </Field>
                  <Field label="调用协议">
                    <select
                      value={activeConfig?.protocol ?? "openai-chat-completions"}
                      onChange={(event) =>
                        updateActiveConfig({
                          protocol: event.target.value as Protocol,
                        })
                      }
                      className="h-10 w-full rounded-[12px] border border-border bg-surface px-3 text-sm text-ink outline-none transition-shadow duration-150 focus:border-brand focus:ring-2 focus:ring-brand/15"
                    >
                      <option value="openai-responses">OpenAI Responses</option>
                      <option value="openai-chat-completions">
                        OpenAI Chat Completions
                      </option>
                      <option value="anthropic-messages">
                        Anthropic Messages
                      </option>
                      <option value="gemini-generate-content">
                        Gemini Generate Content
                      </option>
                    </select>
                  </Field>
                </>
              ) : (
                <Field label="API 地址" hint="由服务商统一提供，无需配置。">
                  <input
                    type="text"
                    value={activeDefinition.defaultBaseUrl}
                    readOnly
                    spellCheck={false}
                    className="h-10 w-full cursor-default rounded-[12px] border border-border bg-surface-secondary px-3 font-mono text-xs text-ink-secondary outline-none"
                  />
                </Field>
              )}
            </div>
          )}
        </div>

        {/* 底部操作：清除设置弱化为次要文字操作，保存保持主按钮 */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-9 items-center gap-1 rounded-[8px] px-2 text-xs text-ink-muted hover:text-danger hover:bg-danger-soft transition-colors duration-150"
          >
            <Trash2 size={13} />
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
              disabled={isTesting || !canTest}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3.5 text-sm text-ink-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150"
            >
              {isTesting ? (
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
              className="inline-flex h-9 items-center rounded-[8px] bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover transition-colors duration-150"
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
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs leading-5 text-ink-secondary">{hint}</p>
      ) : null}
    </div>
  );
}
