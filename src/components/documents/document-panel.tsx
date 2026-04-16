"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Save,
  Download,
  Sparkles,
  Loader2,
  Eye,
  PencilLine,
  Expand,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DOCUMENT_TYPE_LABELS,
  PHASE_DOCUMENT_TYPES,
} from "@/lib/documents/catalog";
import { DocumentEditor } from "./document-editor";
import { MarkdownViewer } from "./markdown-viewer";
import type { DocumentType, Phase } from "@/types";
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

interface DocumentPanelProps {
  projectId: string;
  phase: Phase;
  refreshTrigger?: number;
}

export function DocumentPanel({
  projectId,
  phase,
  refreshTrigger,
}: DocumentPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"preview" | "edit">("preview");

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents?projectId=${projectId}`);
      const data = await res.json();
      setDocuments(data);
    } catch {
      // retry on next trigger
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshTrigger]);

  useEffect(() => {
    const availableDocTypes = PHASE_DOCUMENT_TYPES[phase] || [];
    const relevantPhaseDoc = documents.find(
      (doc) =>
        doc.phase === phase ||
        availableDocTypes.includes(doc.type as DocumentType)
    );
    const fallbackDoc = relevantPhaseDoc || documents[0] || null;

    if (!fallbackDoc) {
      setActiveDoc(null);
      setEditContent("");
      setEditTitle("");
      return;
    }

    if (activeDoc?.id !== fallbackDoc.id) {
      setActiveDoc(fallbackDoc);
      setEditContent(fallbackDoc.content);
      setEditTitle(fallbackDoc.title);
    }
  }, [documents, phase, activeDoc?.id]);

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
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const text = JSON.parse(line.slice(2));
              fullText += text;
            } catch {
              // skip non-JSON lines
            }
          }
        }
      }

      await fetchDocuments();

      const updatedRes = await fetch(`/api/documents?projectId=${projectId}`);
      const updatedDocs = await updatedRes.json();
      setDocuments(updatedDocs);

      const newDoc = updatedDocs.find(
        (d: Document) => d.type === docType
      );
      if (newDoc) {
        setActiveDoc(newDoc);
        setEditContent(newDoc.content);
        setEditTitle(newDoc.title);
      }
    } catch (err) {
      console.error("Document generation error:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectDoc = (doc: Document) => {
    setActiveDoc(doc);
    setEditContent(doc.content);
    setEditTitle(doc.title);
  };

  const openDocumentDialog = (tab: "preview" | "edit" = "preview") => {
    if (!activeDoc) return;
    setEditorTab(tab);
    setDialogOpen(true);
  };

  const availableDocTypes = PHASE_DOCUMENT_TYPES[phase] || [];
  const phaseDocs = documents.filter(
    (doc) =>
      doc.phase === phase ||
      availableDocTypes.includes(doc.type as DocumentType)
  );
  const existingTypes = phaseDocs.map((d) => d.type);
  const generatableTypes = availableDocTypes.filter(
    (t) => !existingTypes.includes(t)
  );
  const sectionCount = editContent.match(/^#{1,3}\s+/gm)?.length ?? 0;
  const updatedLabel = activeDoc
    ? new Date(activeDoc.updatedAt).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <>
    <div className="flex h-full w-[23rem] min-w-[23rem] flex-col border-l bg-card/40 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">产出物</h3>
        </div>
        <div className="flex items-center gap-1">
          {activeDoc && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => openDocumentDialog("preview")}
                title="展开查看"
              >
                <Expand className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleExport}
                title="导出 Markdown"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Document List & Generation */}
      <Tabs defaultValue="current" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 h-9 w-fit rounded-xl bg-muted/80 p-1">
          <TabsTrigger value="current" className="text-xs">
            当前阶段
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            全部文档
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-0 flex min-h-0 flex-1 flex-col">
          <div className="space-y-2 px-4 py-3">
            {phaseDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className={`w-full cursor-pointer rounded-2xl border px-3 py-2.5 text-left text-sm transition-all ${
                  activeDoc?.id === doc.id
                    ? "border-primary/25 bg-primary/8 shadow-sm"
                    : "border-border/70 bg-background/70 hover:border-primary/15 hover:bg-accent/35"
                }`}
              >
                <div className="truncate text-[13px] font-semibold text-foreground">
                  {doc.title}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant="secondary" className="h-4 text-[10px]">
                    {DOCUMENT_TYPE_LABELS[doc.type as DocumentType] || doc.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground/90">
                    v{doc.version}
                  </span>
                </div>
              </button>
            ))}

            {/* Generate Buttons */}
            {(generatableTypes.length > 0 || availableDocTypes.length > 0) && (
              <div className="space-y-1.5 pt-2">
                {availableDocTypes.map((docType) => {
                  const exists = existingTypes.includes(docType);
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
                      {exists ? "重新生成" : "生成"}
                      {DOCUMENT_TYPE_LABELS[docType]}
                    </Button>
                  );
                })}
              </div>
            )}

            {phaseDocs.length === 0 && availableDocTypes.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>当前还没有可展示的结构化产出物</p>
                <p className="text-xs mt-1">
                  继续和产品经理梳理需求，或进入下一阶段生成正式文档
                </p>
              </div>
            )}
          </div>

          {/* Document Preview Summary */}
          {activeDoc && (
            <>
              <Separator />
              <div className="flex min-h-0 flex-1 flex-col p-4">
                <div className="rounded-[22px] border border-border/70 bg-background/92 shadow-sm">
                  <div className="space-y-3 px-4 py-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {editTitle}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <Badge variant="secondary" className="h-4 rounded-md text-[10px]">
                              {DOCUMENT_TYPE_LABELS[activeDoc.type] || activeDoc.type}
                            </Badge>
                            <span>v{activeDoc.version}</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {updatedLabel}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
                          {sectionCount} 节
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 flex-1 rounded-xl"
                        onClick={() => openDocumentDialog("preview")}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        查看
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 rounded-xl"
                        onClick={() => openDocumentDialog("edit")}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        编辑
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="relative px-4 py-3">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-background via-background/92 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/92 to-transparent" />
                    <div className="max-h-[24rem] overflow-hidden">
                      <MarkdownViewer
                        content={editContent}
                        density="compact"
                        showDiagramPreview={false}
                        className="text-[13px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-2 px-4 py-3">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无文档
                </p>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc)}
                    className={`w-full cursor-pointer rounded-2xl border px-3 py-2.5 text-left text-sm transition-all ${
                      activeDoc?.id === doc.id
                        ? "border-primary/25 bg-primary/8 shadow-sm"
                        : "border-border/70 bg-background/70 hover:border-primary/15 hover:bg-accent/35"
                    }`}
                  >
                    <div className="truncate text-[13px] font-semibold text-foreground">
                      {doc.title}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary" className="h-4 text-[10px]">
                        {DOCUMENT_TYPE_LABELS[doc.type as DocumentType] || doc.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/90">
                        v{doc.version}
                      </span>
                      <span className="text-[10px] text-muted-foreground/90">
                        {PHASES.find((p) => p.id === doc.phase)?.name}
                      </span>
                    </div>
                  </button>
                ))
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
                  <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary" className="h-5 rounded-md text-[10px]">
                      {DOCUMENT_TYPE_LABELS[activeDoc.type] || activeDoc.type}
                    </Badge>
                    <span>v{activeDoc.version}</span>
                    <span>{PHASES.find((item) => item.id === activeDoc.phase)?.name}</span>
                    <span>最近更新于 {updatedLabel}</span>
                  </DialogDescription>
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
  );
}
