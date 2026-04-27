"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileText,
  Download,
  FileCode2,
  Save,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WindowHeader } from "@/components/layout/window-header";
import { DocumentEditor } from "@/components/documents/document-editor";
import { ThemeToggle } from "@/components/theme-toggle";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import { cn } from "@/lib/utils";
import type { DocumentType } from "@/types";
import { PHASES } from "@/types";

interface Document {
  id: string;
  projectId: string;
  type: DocumentType;
  title: string;
  content: string;
  version: number;
  phase: string;
  createdAt: string;
  updatedAt: string;
}

const phaseStyles = [
  "border-stage-brainstorm/25 bg-stage-brainstorm/12 text-stage-brainstorm",
  "border-stage-requirements/25 bg-stage-requirements/12 text-stage-requirements",
  "border-stage-design/25 bg-stage-design/12 text-stage-design",
  "border-stage-architecture/25 bg-stage-architecture/12 text-stage-architecture",
  "border-stage-development/25 bg-stage-development/12 text-stage-development",
  "border-stage-delivery/25 bg-stage-delivery/12 text-stage-delivery",
];

export default function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState("");

  const fetchDocuments = useCallback(async () => {
    const [docsRes, projRes] = await Promise.all([
      fetch(`/api/documents?projectId=${id}`),
      fetch(`/api/projects/${id}`),
    ]);
    const docs = await docsRes.json();
    const proj = await projRes.json();
    setDocuments(docs);
    setProjectName(proj.name || "");
    if (docs.length > 0 && !activeDoc) {
      setActiveDoc(docs[0]);
      setEditContent(docs[0].content);
    }
  }, [id, activeDoc]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- document data is fetched on route entry and saved into client state for editing.
    void fetchDocuments();
  }, [fetchDocuments]);

  const handleSelectDoc = (doc: Document) => {
    setActiveDoc(doc);
    setEditContent(doc.content);
  };

  const handleSave = async () => {
    if (!activeDoc) return;
    setSaving(true);
    try {
      await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeDoc.id, content: editContent }),
      });
      await fetchDocuments();
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!activeDoc) return;
    const blob = new Blob([editContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const allContent = documents
      .map((d) => `# ${d.title}\n\n${d.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([allContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName || "project"}-all-documents.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupedDocs = PHASES.reduce(
    (acc, phase) => {
      const phaseDocs = documents.filter((d) => d.phase === phase.id);
      if (phaseDocs.length > 0) {
        acc.push({ phase, docs: phaseDocs });
      }
      return acc;
    },
    [] as { phase: (typeof PHASES)[number]; docs: Document[] }[]
  );
  const activePhase = activeDoc
    ? PHASES.find((phase) => phase.id === activeDoc.phase)
    : null;
  const activePhaseIndex = activePhase
    ? PHASES.findIndex((phase) => phase.id === activePhase.id)
    : -1;
  const activeUpdatedLabel = activeDoc
    ? new Date(activeDoc.updatedAt).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const activeTypeLabel = activeDoc
    ? DOCUMENT_TYPE_LABELS[activeDoc.type] || activeDoc.type
    : "";

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      <WindowHeader className="shrink-0" containerClassName="window-header-leading">
        <div className="flex items-center justify-between gap-4 px-4 pb-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-xl border-border/70 bg-background/65 px-3 shadow-sm backdrop-blur"
              onClick={() => router.push(`/project/${id}`)}
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <div className="hidden h-8 w-px bg-border/70 sm:block" />
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/12 text-primary shadow-[0_14px_38px_hsl(255_92%_76%/0.20)]">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="max-w-[12rem] truncate text-base font-semibold tracking-tight sm:max-w-[18rem] sm:text-lg lg:max-w-none">
                    {projectName || "项目文档"}
                  </h1>
                  <span className="hidden whitespace-nowrap rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary sm:inline-flex">
                    文档中心
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  统一查看、编辑和导出阶段产出物
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 rounded-xl border-border/70 bg-background/65 px-3 shadow-sm backdrop-blur sm:inline-flex"
              onClick={() => router.push("/settings")}
            >
              <Settings className="w-3.5 h-3.5" />
              设置
            </Button>
            {activeDoc && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-border/70 bg-background/65 px-3 shadow-sm backdrop-blur"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <FileCode2 className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">保存</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden h-9 rounded-xl border-border/70 bg-background/65 px-3 shadow-sm backdrop-blur sm:inline-flex"
                  onClick={handleExport}
                >
                  <Download className="w-3.5 h-3.5" />
                  导出
                </Button>
              </>
            )}
            {documents.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-border/70 bg-background/65 px-3 shadow-sm backdrop-blur"
                onClick={handleExportAll}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">全部导出</span>
              </Button>
            )}
          </div>
        </div>
      </WindowHeader>

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden px-3 pb-3">
        <aside className="surface-glass hidden h-full min-h-0 w-[21.5rem] shrink-0 flex-col overflow-hidden rounded-[1.35rem] lg:flex">
          <div className="border-b border-border/55 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  全部文档
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {documents.length} 份文档，按阶段归档
                </p>
              </div>
              <Badge variant="secondary" className="rounded-full">
                {documents.length}
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-full">
            <div className="space-y-3 p-3">
              {groupedDocs.length === 0 ? (
                <div className="rounded-[1.35rem] border border-border/60 bg-background/55 px-5 py-10 text-center text-sm text-muted-foreground">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <FileText className="w-7 h-7" />
                  </div>
                  <p className="font-medium text-foreground">还没有文档</p>
                  <p className="mt-1 text-xs">新文档会出现在这里</p>
                </div>
              ) : (
                groupedDocs.map(({ phase, docs }) => {
                  const phaseIndex = PHASES.findIndex((item) => item.id === phase.id);
                  return (
                  <section
                    key={phase.id}
                    className="rounded-[1.1rem] border border-border/55 bg-background/42 p-2.5"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                            phaseStyles[phaseIndex] ?? "border-border bg-muted text-muted-foreground"
                          )}
                        >
                          {phaseIndex + 1}
                        </span>
                        <span className="truncate text-xs font-semibold text-foreground">
                          {phase.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {docs.length}
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </div>
                    {docs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc)}
                        className={cn(
                          "mb-1 flex w-full cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition-all",
                          activeDoc?.id === doc.id
                            ? "border-primary/35 bg-primary/12 text-primary shadow-[0_10px_30px_hsl(255_92%_76%/0.12)]"
                            : "border-transparent text-sidebar-foreground hover:border-primary/15 hover:bg-sidebar-accent/35"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                            activeDoc?.id === doc.id
                              ? "border-primary/25 bg-primary/15 text-primary"
                              : "border-border/50 bg-muted/45 text-muted-foreground"
                          )}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold">
                            {doc.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="h-4 rounded-md px-1.5 text-[9px]"
                            >
                              {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              v{doc.version}
                            </span>
                          </div>
                        </div>
                        {activeDoc?.id === doc.id && (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                    ))}
                  </section>
                );
                })
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="surface-glass flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.35rem]">
          {documents.length > 0 && (
            <div className="shrink-0 border-b border-border/55 px-4 py-3 lg:hidden">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-muted-foreground">
                  文档
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {documents.length}
                </Badge>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleSelectDoc(doc)}
                    className={cn(
                      "flex min-w-[10.5rem] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all",
                      activeDoc?.id === doc.id
                        ? "border-primary/35 bg-primary/12 text-primary"
                        : "border-border/60 bg-background/50 text-muted-foreground"
                    )}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {doc.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeDoc ? (
            <>
              <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-border/55 px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_14px_38px_hsl(255_92%_76%/0.16)]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-semibold tracking-tight">
                        {activeDoc.title}
                      </h2>
                      <Badge className="rounded-md bg-primary/12 text-primary hover:bg-primary/12">
                        {activeTypeLabel}
                      </Badge>
                      <Badge variant="outline" className="rounded-md">
                        v{activeDoc.version}
                      </Badge>
                      {activePhase && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-md",
                            phaseStyles[activePhaseIndex] ?? ""
                          )}
                        >
                          {activePhase.name}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      最后更新于 {activeUpdatedLabel}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-border/70 bg-background/60"
                    onClick={handleExport}
                  >
                    <Download className="h-3.5 w-3.5" />
                    导出
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 rounded-xl shadow-[0_14px_38px_hsl(255_92%_76%/0.20)]"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="h-3.5 w-3.5" />
                    保存
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 p-4">
                <div className="h-full min-h-0 overflow-hidden rounded-[1.35rem] border border-border/60 bg-background/55 shadow-sm backdrop-blur">
                  <DocumentEditor
                    content={editContent}
                    onChange={setEditContent}
                    className="h-full"
                    tabsListClassName="mx-4 mt-4 h-10 rounded-xl border border-border/60 bg-background/60 p-1"
                    previewClassName="px-5 pb-5"
                    textareaClassName="px-4 pb-4"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="rounded-[1.35rem] border border-border/60 bg-background/55 px-8 py-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  选择一个文档查看
                </p>
                <p className="mt-1 text-xs">从左侧阶段文档列表开始</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
