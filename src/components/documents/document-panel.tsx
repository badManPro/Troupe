"use client";

import { useState, useEffect, useMemo, type MouseEvent } from "react";
import {
  FileText,
  Save,
  Download,
  Sparkles,
  Loader2,
  Eye,
  PencilLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import {
  getPhaseArtifactSnapshot,
  getLatestDocumentOfType,
  getPhaseRelevantDocuments,
} from "@/lib/workspace/phase-artifacts";
import { isDesignSpecReadyForExecution } from "@/lib/documents/design-spec";
import { DocumentEditor } from "./document-editor";
import type { DocumentType, Phase, ProjectDocument } from "@/types";
import { PHASES } from "@/types";

interface DocumentPanelProps {
  projectId: string;
  phase: Phase;
  documents: ProjectDocument[];
  onDocumentsChanged?: () => void;
}

export function DocumentPanel({
  projectId,
  phase,
  documents,
  onDocumentsChanged,
}: DocumentPanelProps) {
  const [activeDoc, setActiveDoc] = useState<ProjectDocument | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"preview" | "edit">("preview");
  const phaseArtifacts = useMemo(
    () => getPhaseArtifactSnapshot(phase, documents),
    [documents, phase]
  );
  const phaseDocs = useMemo(
    () => getPhaseRelevantDocuments(phase, documents),
    [documents, phase]
  );
  const designSpec = useMemo(
    () => getLatestDocumentOfType(documents, "design_spec"),
    [documents]
  );
  const designMockup = useMemo(
    () => getLatestDocumentOfType(documents, "design_mockup"),
    [documents]
  );
  const canGenerateDesignMockup = useMemo(
    () =>
      phase === "design" &&
      Boolean(designSpec?.content) &&
      isDesignSpecReadyForExecution(designSpec?.content ?? ""),
    [designSpec?.content, phase]
  );

  useEffect(() => {
    const fallbackDoc = phaseDocs[0] ?? documents[0] ?? null;

    if (!fallbackDoc) {
      setActiveDoc(null);
      setEditContent("");
      setEditTitle("");
      return;
    }

    if (
      activeDoc?.id !== fallbackDoc.id ||
      activeDoc?.version !== fallbackDoc.version ||
      activeDoc?.updatedAt !== fallbackDoc.updatedAt
    ) {
      setActiveDoc(fallbackDoc);
      setEditContent(fallbackDoc.content);
      setEditTitle(fallbackDoc.title);
    }
  }, [activeDoc?.id, activeDoc?.updatedAt, activeDoc?.version, documents, phaseDocs]);

  const handleSave = async () => {
    if (!activeDoc) return;
    setSaving(true);
    try {
      await fetch("/api/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeDoc.id,
          content: editContent,
          title: editTitle,
        }),
      });
      onDocumentsChanged?.();
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
    a.download = `${editTitle || "document"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async (docType: DocumentType) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          documentType: docType,
          phase,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Generation failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              JSON.parse(line.slice(2));
            } catch {
              // skip non-JSON lines
            }
          }
        }
      }

      onDocumentsChanged?.();
    } catch (err) {
      console.error("Document generation error:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectDoc = (doc: ProjectDocument) => {
    setActiveDoc(doc);
    setEditContent(doc.content);
    setEditTitle(doc.title);
  };

  const handleOpenDocumentDialog = (
    doc: ProjectDocument,
    tab: "preview" | "edit",
    event?: MouseEvent<HTMLButtonElement>
  ) => {
    event?.stopPropagation();
    handleSelectDoc(doc);
    setEditorTab(tab);
    setDialogOpen(true);
  };

  const sidebarGenerationDocuments = phaseArtifacts.requiredDocuments.filter(
    (document) => document.type !== "prd" || document.state === "missing"
  );
  const updatedLabel = activeDoc
    ? new Date(activeDoc.updatedAt).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const renderDocumentCard = (
    doc: ProjectDocument,
    options?: { showPhase?: boolean }
  ) => (
    <div
      key={doc.id}
      role="button"
      tabIndex={0}
      onClick={() => handleSelectDoc(doc)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelectDoc(doc);
        }
      }}
      className={`w-full cursor-pointer rounded-2xl border px-3 py-2.5 text-left text-sm transition-all ${
        activeDoc?.id === doc.id
          ? "border-primary/25 bg-primary/8 shadow-sm"
          : "border-border/70 bg-background/70 hover:border-primary/15 hover:bg-accent/35"
      }`}
      aria-pressed={activeDoc?.id === doc.id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-foreground">
            {doc.title}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="h-4 text-[10px]">
              {DOCUMENT_TYPE_LABELS[doc.type as DocumentType] || doc.type}
            </Badge>
            <span className="text-[10px] text-muted-foreground/90">
              v{doc.version}
            </span>
            {options?.showPhase && (
              <span className="text-[10px] text-muted-foreground/90">
                {PHASES.find((phaseItem) => phaseItem.id === doc.phase)?.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={(event) =>
                  handleOpenDocumentDialog(doc, "preview", event)
                }
                aria-label={`查看 ${doc.title}`}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">查看</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={(event) => handleOpenDocumentDialog(doc, "edit", event)}
                aria-label={`编辑 ${doc.title}`}
              >
                <PencilLine className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">编辑</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={250}>
      <>
        <div className="flex h-full min-h-0 w-[23rem] min-w-[23rem] shrink-0 flex-col overflow-hidden border-l bg-card/40 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">产出物</h3>
            </div>
            <div className="flex items-center gap-1">
              {activeDoc && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleExport}
                  title="导出 Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <Tabs
            defaultValue="current"
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <TabsList className="mx-4 mt-3 h-9 w-fit shrink-0 rounded-xl bg-muted/80 p-1">
              <TabsTrigger value="current" className="text-xs">
                当前阶段
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                全部文档
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="current"
              className="mt-0 min-h-0 flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="space-y-4 py-3">
                  <div className="space-y-2 px-4">
                    {phaseArtifacts.totalRequiredDocuments > 0 && (
                      <div className="rounded-[22px] border border-border/70 bg-background/85 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              当前阶段必交付
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              {phaseArtifacts.currentDocumentCount}/
                              {phaseArtifacts.totalRequiredDocuments} 份文档已在当前阶段确认
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="rounded-full text-[10px]"
                          >
                            {PHASES.find((item) => item.id === phase)?.name}
                          </Badge>
                        </div>

                        <div className="mt-3 space-y-2">
                          {phaseArtifacts.requiredDocuments.map((document) => (
                            <div
                              key={document.type}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="text-[13px] font-medium text-foreground">
                                  {document.label}
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  {document.hint}
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  document.state === "current"
                                    ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : document.state === "inherited"
                                      ? "rounded-full border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                                      : "rounded-full"
                                }
                              >
                                {document.state === "current"
                                  ? "已确认"
                                  : document.state === "inherited"
                                    ? "沿用旧稿"
                                    : "待产出"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {phaseDocs.map((doc) => renderDocumentCard(doc))}

                    {phase === "design" && (
                      <div className="rounded-[22px] border border-border/70 bg-background/85 p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              设计执行
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              设计稿只会基于当前这份《设计方案》生成，不再直接参考某一个单独 tab。
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full text-[10px]">
                            设计阶段
                          </Badge>
                        </div>

                        <div className="mt-3 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2">
                          <div className="text-[13px] font-medium text-foreground">
                            {designSpec ? "设计方案已接入" : "设计方案待建立"}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {canGenerateDesignMockup
                              ? "用户流程、页面结构和设计规范已具备，可以开始生成设计稿。"
                              : "先让 3 条设计专题把《设计方案》补齐，再从这份文档统一生成设计稿。"}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 h-8 w-full justify-start rounded-xl border-border/70 bg-background/80 text-xs shadow-sm"
                          onClick={() => handleGenerate("design_mockup")}
                          disabled={generating || !canGenerateDesignMockup}
                        >
                          {generating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3" />
                          )}
                          {designMockup ? "重新生成设计稿" : "生成设计稿"}
                        </Button>
                      </div>
                    )}

                    {sidebarGenerationDocuments.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        {sidebarGenerationDocuments.map((document) => {
                          const docType = document.type;
                          return (
                            <Button
                              key={docType}
                              variant="outline"
                              size="sm"
                              className="h-8 w-full justify-start rounded-xl border-border/70 bg-background/80 text-xs shadow-sm"
                              onClick={() => handleGenerate(docType)}
                              disabled={generating}
                            >
                              {generating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              {document.state === "current"
                                ? "重新生成"
                                : document.state === "inherited"
                                  ? "更新"
                                  : "生成"}
                              {DOCUMENT_TYPE_LABELS[docType]}
                            </Button>
                          );
                        })}
                      </div>
                    )}

                    {phaseDocs.length === 0 &&
                      phaseArtifacts.totalRequiredDocuments === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                          <p>当前还没有可展示的结构化产出物</p>
                          <p className="mt-1 text-xs">
                            继续和产品经理梳理需求，或进入下一阶段生成正式文档
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="mt-0 min-h-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2 px-4 py-3">
                  {documents.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      暂无文档
                    </p>
                  ) : (
                    documents.map((doc) =>
                      renderDocumentCard(doc, { showPhase: true })
                    )
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="h-[88vh] max-w-6xl gap-0 overflow-hidden p-0">
            {activeDoc && (
              <div className="flex h-full min-h-0 flex-col bg-background">
                <DialogHeader className="border-b px-6 py-4 pr-14">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <DialogTitle className="text-xl text-foreground">
                        {editTitle}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        {`${DOCUMENT_TYPE_LABELS[activeDoc.type] || activeDoc.type}，v${
                          activeDoc.version
                        }，${
                          PHASES.find((item) => item.id === activeDoc.phase)?.name ??
                          activeDoc.phase
                        }，最近更新于 ${updatedLabel}`}
                      </DialogDescription>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                          variant="secondary"
                          className="h-5 rounded-md text-[10px]"
                        >
                          {DOCUMENT_TYPE_LABELS[activeDoc.type] || activeDoc.type}
                        </Badge>
                        <span>v{activeDoc.version}</span>
                        <span>
                          {PHASES.find((item) => item.id === activeDoc.phase)?.name}
                        </span>
                        <span>最近更新于 {updatedLabel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        className="rounded-xl"
                      >
                        <Download className="h-3.5 w-3.5" />
                        导出
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-xl"
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        保存
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mb-3 h-10 rounded-xl border-border/70 bg-background px-4 text-sm font-medium shadow-sm"
                  />
                  <div className="min-h-0 flex-1 rounded-[22px] border border-border/70 bg-card/50 shadow-sm">
                    <DocumentEditor
                      content={editContent}
                      onChange={setEditContent}
                      tab={editorTab}
                      onTabChange={(tab) =>
                        setEditorTab(tab as "preview" | "edit")
                      }
                      tabsListClassName="mx-4 mt-4 rounded-xl bg-muted/80"
                      previewClassName="px-5 pb-5"
                      textareaClassName="px-4 pb-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
}
