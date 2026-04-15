"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Save,
  Download,
  Plus,
  Sparkles,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentEditor } from "./document-editor";
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

const docTypeLabels: Record<DocumentType, string> = {
  prd: "产品需求文档",
  user_flow: "用户流程",
  wireframe: "线框图描述",
  architecture: "架构设计",
  api_spec: "API 设计",
  db_schema: "数据库设计",
  test_plan: "测试方案",
  project_plan: "项目计划",
};

const phaseDocTypes: Record<string, DocumentType[]> = {
  brainstorm: [],
  requirements: ["prd"],
  design: ["user_flow", "wireframe"],
  architecture: ["architecture", "db_schema"],
  development: ["api_spec"],
  delivery: ["test_plan", "project_plan"],
};

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
    if (documents.length > 0 && !activeDoc) {
      const phaseDoc = documents.find((d) => d.phase === phase);
      if (phaseDoc) {
        setActiveDoc(phaseDoc);
        setEditContent(phaseDoc.content);
        setEditTitle(phaseDoc.title);
      }
    }
  }, [documents, phase, activeDoc]);

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

  const phaseDocs = documents.filter((d) => d.phase === phase);
  const availableDocTypes = phaseDocTypes[phase] || [];
  const existingTypes = phaseDocs.map((d) => d.type);
  const generatableTypes = availableDocTypes.filter(
    (t) => !existingTypes.includes(t)
  );

  return (
    <div className="w-80 border-l bg-card/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
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
                onClick={handleSave}
                disabled={saving}
                title="保存"
              >
                <Save className="w-3.5 h-3.5" />
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
      <Tabs defaultValue="current" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-3 mt-2 w-fit">
          <TabsTrigger value="current" className="text-xs">
            当前阶段
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            全部文档
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="flex-1 flex flex-col mt-0 min-h-0">
          <div className="p-3 space-y-2">
            {phaseDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  activeDoc?.id === doc.id
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                }`}
              >
                <div className="font-medium truncate">{doc.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] h-4">
                    {docTypeLabels[doc.type as DocumentType] || doc.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    v{doc.version}
                  </span>
                </div>
              </button>
            ))}

            {/* Generate Buttons */}
            {(generatableTypes.length > 0 || availableDocTypes.length > 0) && (
              <div className="pt-2 space-y-1.5">
                {availableDocTypes.map((docType) => {
                  const exists = existingTypes.includes(docType);
                  return (
                    <Button
                      key={docType}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs h-8"
                      onClick={() => handleGenerate(docType)}
                      disabled={generating}
                    >
                      {generating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {exists ? "重新生成" : "生成"}
                      {docTypeLabels[docType]}
                    </Button>
                  );
                })}
              </div>
            )}

            {phaseDocs.length === 0 && availableDocTypes.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>头脑风暴阶段无需产出文档</p>
                <p className="text-xs mt-1">先和产品经理聊聊你的想法</p>
              </div>
            )}
          </div>

          {/* Document Preview / Editor */}
          {activeDoc && (
            <>
              <Separator />
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="px-3 pt-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xs font-medium h-7 border-0 px-0 focus-visible:ring-0"
                  />
                </div>
                <div className="flex-1 min-h-0">
                  <DocumentEditor
                    content={editContent}
                    onChange={setEditContent}
                  />
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="all" className="flex-1 flex flex-col mt-0 min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无文档
                </p>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc)}
                    className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                      activeDoc?.id === doc.id
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="font-medium truncate">{doc.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {docTypeLabels[doc.type as DocumentType] || doc.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        v{doc.version}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
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
  );
}
