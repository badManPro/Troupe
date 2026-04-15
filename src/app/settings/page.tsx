"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Key,
  LogIn,
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AiProvider = "openai" | "codex";

interface CodexStatus {
  installed: boolean;
  authenticated: boolean;
  authMode: string | null;
  accountId: string | null;
  lastRefresh: string | null;
  model: string | null;
}

interface CodexModel {
  slug: string;
  displayName: string;
  description: string;
}

export default function SettingsPage() {
  const router = useRouter();

  const [activeProvider, setActiveProvider] = useState<AiProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connected, setConnected] = useState(false);

  const [codexStatus, setCodexStatus] = useState<CodexStatus | null>(null);
  const [codexModel, setCodexModel] = useState("gpt-5.4");
  const [codexModels, setCodexModels] = useState<CodexModel[]>([]);
  const [codexLoggingIn, setCodexLoggingIn] = useState(false);
  const [codexLoginError, setCodexLoginError] = useState<string | null>(null);
  const [codexAuthUrl, setCodexAuthUrl] = useState<string | null>(null);
  const [codexDeviceCode, setCodexDeviceCode] = useState<string | null>(null);
  const codexPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCodexStatus = useCallback(() => {
    fetch("/api/codex/status")
      .then((r) => r.json())
      .then((d: CodexStatus) => {
        setCodexStatus(d);
        if (d.model) setCodexModel(d.model);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/settings?key=ai_provider")
      .then((r) => r.json())
      .then((d) => {
        if (d.value === "codex") setActiveProvider("codex");
      })
      .catch(() => {});

    fetch("/api/settings?key=openai_api_key")
      .then((r) => r.json())
      .then((d) => {
        if (d.value) {
          setApiKey(d.value);
          setConnected(true);
        }
      })
      .catch(() => {});

    fetch("/api/settings?key=openai_model")
      .then((r) => r.json())
      .then((d) => {
        if (d.value) setModel(d.value);
      })
      .catch(() => {});

    fetch("/api/settings?key=codex_model")
      .then((r) => r.json())
      .then((d) => {
        if (d.value) setCodexModel(d.value);
      })
      .catch(() => {});

    fetchCodexStatus();

    fetch("/api/codex/models")
      .then((r) => r.json())
      .then((d) => {
        if (d.models?.length) setCodexModels(d.models);
      })
      .catch(() => {});

    return () => {
      if (codexPollRef.current) clearInterval(codexPollRef.current);
    };
  }, [fetchCodexStatus]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "ai_provider", value: activeProvider }),
      });

      if (activeProvider === "openai") {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "openai_api_key", value: apiKey }),
        });
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "openai_model", value: model }),
        });
        setConnected(!!apiKey);
      } else {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "codex_model", value: codexModel }),
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleCodexLogin = async () => {
    setCodexLoggingIn(true);
    setCodexLoginError(null);
    setCodexAuthUrl(null);
    setCodexDeviceCode(null);
    if (codexPollRef.current) clearInterval(codexPollRef.current);
    try {
      const res = await fetch("/api/codex/login", { method: "POST" });
      const data = await res.json();
      if (data.authUrl) {
        setCodexAuthUrl(data.authUrl);
        setCodexDeviceCode(data.code || null);
        codexPollRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch("/api/codex/status");
            const status = await statusRes.json();
            if (
              status.authenticated &&
              status.lastRefresh !== codexStatus?.lastRefresh
            ) {
              if (codexPollRef.current) clearInterval(codexPollRef.current);
              setCodexLoggingIn(false);
              setCodexAuthUrl(null);
              setCodexDeviceCode(null);
              fetchCodexStatus();
            }
          } catch {}
        }, 2000);
        setTimeout(() => {
          if (codexPollRef.current) clearInterval(codexPollRef.current);
          setCodexLoggingIn(false);
        }, 180_000);
      } else if (!data.success) {
        setCodexLoginError(data.error || "登录失败");
        setCodexLoggingIn(false);
      }
    } catch {
      setCodexLoginError("无法连接登录服务");
      setCodexLoggingIn(false);
    }
  };

  const openaiModels = [
    { id: "gpt-4o", name: "GPT-4o", desc: "最强模型，推荐使用" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "轻量快速，成本低" },
    { id: "gpt-4.1", name: "GPT-4.1", desc: "最新模型" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", desc: "最新轻量模型" },
  ];

  // codexModels loaded dynamically from /api/codex/models

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">设置</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Provider Selector */}
        <Card>
          <CardHeader>
            <CardTitle>AI 提供商</CardTitle>
            <CardDescription>选择用于驱动 AI 角色的服务</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveProvider("openai")}
                className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                  activeProvider === "openai"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Key className="w-4 h-4" />
                  OpenAI API
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  使用自己的 API Key
                </div>
              </button>
              <button
                onClick={() => setActiveProvider("codex")}
                className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                  activeProvider === "codex"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Zap className="w-4 h-4" />
                  Codex CLI
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  复用官方 Codex 登录态
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* OpenAI Config */}
        {activeProvider === "openai" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                OpenAI API 配置
              </CardTitle>
              <CardDescription>
                Troupe 使用 OpenAI 的 API 驱动所有 AI 角色。你需要提供自己的
                API Key。只有 ChatGPT Plus/Pro 而没有 API Key 时，请改用上面的
                Codex CLI 模式。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {connected ? (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    已连接
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    未配置
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  从{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OpenAI 平台
                  </a>{" "}
                  获取你的 API Key
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">默认模型</label>
                <div className="grid grid-cols-2 gap-2">
                  {openaiModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setModel(m.id)}
                      className={`p-3 rounded-lg border text-left text-sm transition-all cursor-pointer ${
                        model === m.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {m.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Codex Config */}
        {activeProvider === "codex" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Codex CLI 配置
              </CardTitle>
              <CardDescription>
                通过官方 Codex CLI 登录后运行对话与文档生成。这个模式适合只有
                ChatGPT Plus/Pro、没有 OpenAI API Key 的情况；应用不会再把
                ChatGPT 登录态伪装成 API Key。需要本地安装{" "}
                <a
                  href="https://github.com/openai/codex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Codex CLI
                </a>
                。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {codexStatus?.authenticated ? (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    已连接 Codex CLI
                    {codexStatus.authMode === "chatgpt" && " (ChatGPT)"}
                  </Badge>
                ) : codexStatus?.installed ? (
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    未登录 Codex CLI
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    未安装 Codex CLI
                  </Badge>
                )}
                {codexStatus?.accountId && (
                  <span className="text-xs text-muted-foreground">
                    Account: {codexStatus.accountId.slice(0, 8)}...
                  </span>
                )}
              </div>

              {!codexStatus?.authenticated && (
                <div className="space-y-3">
                  <Button
                    onClick={handleCodexLogin}
                    disabled={codexLoggingIn}
                    className="w-full"
                    variant="outline"
                  >
                    {codexLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        正在生成设备登录信息...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        启动 Codex 登录
                      </>
                    )}
                  </Button>
                  {codexAuthUrl && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 space-y-2">
                      <p className="text-sm font-medium">
                        在浏览器打开下面的官方登录页，并输入一次性验证码：
                      </p>
                      {codexDeviceCode && (
                        <div className="rounded border border-blue-200 bg-white/80 px-3 py-2 text-sm font-mono tracking-[0.18em] text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                          {codexDeviceCode}
                        </div>
                      )}
                      <a
                        href={codexAuthUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-600 dark:text-blue-400 underline break-all hover:text-blue-800"
                      >
                        打开 Codex 设备登录页 →
                      </a>
                      <p className="text-xs text-muted-foreground">
                        认证完成后，此页面会自动刷新状态。
                      </p>
                    </div>
                  )}
                  {codexLoginError && (
                    <p className="text-sm text-destructive">
                      {codexLoginError}
                    </p>
                  )}
                  {!codexAuthUrl && (
                    <p className="text-xs text-muted-foreground">
                      点击后会调用官方 `codex login --device-auth`，并在浏览器完成
                      ChatGPT / OpenAI 账号认证。
                    </p>
                  )}
                </div>
              )}

              {codexStatus?.authenticated && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">默认模型</label>
                    <div className="grid grid-cols-2 gap-2">
                      {codexModels.map((m) => (
                        <button
                          key={m.slug}
                          onClick={() => setCodexModel(m.slug)}
                          className={`p-3 rounded-lg border text-left text-sm transition-all cursor-pointer ${
                            codexModel === m.slug
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <div className="font-medium">{m.displayName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {m.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleCodexLogin}
                    disabled={codexLoggingIn}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    {codexLoggingIn ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <LogIn className="w-3 h-3" />
                    )}
                    重新触发登录
                  </Button>
                  {codexAuthUrl && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 space-y-2 mt-2">
                      <p className="text-sm font-medium">
                        在浏览器打开下面的官方登录页，并输入一次性验证码：
                      </p>
                      {codexDeviceCode && (
                        <div className="rounded border border-blue-200 bg-white/80 px-3 py-2 text-sm font-mono tracking-[0.18em] text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                          {codexDeviceCode}
                        </div>
                      )}
                      <a
                        href={codexAuthUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-600 dark:text-blue-400 underline break-all hover:text-blue-800"
                      >
                        打开 Codex 设备登录页 →
                      </a>
                      <p className="text-xs text-muted-foreground">
                        认证完成后，此页面会自动刷新状态。
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : "保存设置"}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              已保存
            </span>
          )}
        </div>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>关于 Troupe</CardTitle>
            <CardDescription>
              本地 AI 多智能体产品开发工作台
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Troupe
              模拟一个完整的互联网产品团队，帮助独立开发者将模糊想法逐步推进为可交付的产品方案。
            </p>
            <p>
              所有数据存储在本地，AI 调用通过你自己的 OpenAI API Key 或已登录的
              Codex CLI 进行，数据不出本机。
            </p>
            <p className="text-xs">Version 0.1.0</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
