"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Download,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WindowHeader } from "@/components/layout/window-header";
import { DocumentEditor } from "@/components/documents/document-editor";
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

  return (
    <div className="app-shell flex h-screen flex-col">
      <WindowHeader className="shrink-0" containerClassName="window-header-leading">
        <div className="flex items-center justify-between px-6 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => router.push(`/project/${id}`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">{projectName}</h1>
              <p className="text-xs text-muted-foreground">文档中心</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeDoc && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="w-3.5 h-3.5" />
                  保存
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
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
                className="rounded-full"
                onClick={handleExportAll}
              >
                <Download className="w-3.5 h-3.5" />
                全部导出
              </Button>
            )}
          </div>
        </div>
      </WindowHeader>

      <div className="flex flex-1 min-h-0">
        {/* Left: Document List */}
        <div className="w-64 border-r bg-sidebar">
          <ScrollArea className="h-full">
            <div className="p-3">
              {groupedDocs.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>还没有生成任何文档</p>
                  <p className="text-xs mt-1">回到工作台与 AI 角色对话来生成</p>
                </div>
              ) : (
                groupedDocs.map(({ phase, docs }) => (
                  <div key={phase.id} className="mb-4">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-2">
                      {phase.name}
                    </div>
                    {docs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc)}
                        className={`w-full text-left p-2.5 rounded-lg text-sm transition-colors cursor-pointer mb-1 ${
                          activeDoc?.id === doc.id
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                        }`}
                      >
                        <div className="font-medium truncate text-xs">
                          {doc.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-3.5"
                          >
                            v{doc.version}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(doc.updatedAt).toLocaleDateString("zh-CN")}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Document Content */}
        <div className="flex-1 min-w-0">
          {activeDoc ? (
            <DocumentEditor
              content={editContent}
              onChange={setEditContent}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">选择一个文档查看</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
