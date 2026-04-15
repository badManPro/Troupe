"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Key } from "lucide-react";
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

export default function SettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
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
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const models = [
    { id: "gpt-4o", name: "GPT-4o", desc: "最强模型，推荐使用" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "轻量快速，成本低" },
    { id: "gpt-4.1", name: "GPT-4.1", desc: "最新模型" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", desc: "最新轻量模型" },
  ];

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              OpenAI API 配置
            </CardTitle>
            <CardDescription>
              Troupe 使用 OpenAI 的 API 驱动所有 AI 角色。你需要提供自己的
              API Key。
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
                {models.map((m) => (
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
          </CardContent>
        </Card>

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
              所有数据存储在本地，AI 调用通过你自己的 OpenAI API Key
              进行，数据不出本机。
            </p>
            <p className="text-xs">Version 0.1.0</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
