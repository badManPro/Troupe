"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhaseSidebar } from "@/components/workspace/phase-sidebar";
import { RoleTabs } from "@/components/workspace/role-tabs";
import { ChatPanel } from "@/components/chat/chat-panel";
import { DocumentPanel } from "@/components/documents/document-panel";
import { PhaseGateBar } from "@/components/workspace/phase-gate-bar";
import type { Phase, AgentRole } from "@/types";
import { PHASES, getNextPhase } from "@/types";

interface ProjectData {
  id: string;
  name: string;
  description: string;
  phase: Phase;
  gates: { id: string; phase: string; status: string; checklist: string }[];
  documents: any[];
}

export default function ProjectWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase>("brainstorm");
  const [activeRole, setActiveRole] = useState<AgentRole>("pm");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationLoadError, setConversationLoadError] = useState<
    string | null
  >(null);
  const [docRefresh, setDocRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const conversationRequestRef = useRef(0);

  const handleDocumentGenerated = useCallback(() => {
    setDocRefresh((n) => n + 1);
  }, []);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json();
      setProject(data);
      if (loading) {
        setCurrentPhase(data.phase);
        const phaseInfo = PHASES.find((p) => p.id === data.phase);
        if (phaseInfo && phaseInfo.roles.length > 0) {
          setActiveRole(phaseInfo.roles[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, router, loading]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const loadConversation = useCallback(
    async (role: AgentRole, phase: Phase) => {
      const requestId = conversationRequestRef.current + 1;
      conversationRequestRef.current = requestId;

      setConversationLoading(true);
      setConversationLoadError(null);
      setConversationId(null);
      setInitialMessages([]);

      try {
        const res = await fetch(`/api/projects/${id}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, phase }),
        });
        if (!res.ok) {
          throw new Error("恢复会话失败");
        }
        const conv = await res.json();

        const msgRes = await fetch(
          `/api/projects/${id}/messages?conversationId=${conv.id}`
        );
        if (!msgRes.ok) {
          throw new Error("读取历史消息失败");
        }
        const msgs = await msgRes.json();

        if (conversationRequestRef.current !== requestId) {
          return;
        }

        setInitialMessages(
          msgs.map((m: any) => ({ role: m.role, content: m.content }))
        );
        setConversationId(conv.id);
      } catch (error) {
        if (conversationRequestRef.current === requestId) {
          setConversationLoadError(
            error instanceof Error ? error.message : "恢复对话记录失败"
          );
        }
      } finally {
        if (conversationRequestRef.current === requestId) {
          setConversationLoading(false);
        }
      }
    },
    [id]
  );

  useEffect(() => {
    if (!loading && project) {
      loadConversation(activeRole, currentPhase);
    }
  }, [activeRole, currentPhase, loading, project, loadConversation]);

  const handlePhaseSelect = (phase: Phase) => {
    setCurrentPhase(phase);
    const phaseInfo = PHASES.find((p) => p.id === phase);
    if (phaseInfo && phaseInfo.roles.length > 0) {
      setActiveRole(phaseInfo.roles[0]);
    }
  };

  const handleApprovePhase = async () => {
    if (!project) return;
    await fetch(`/api/projects/${id}/phase-gate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: project.phase, action: "approve" }),
    });
    await fetchProject();
  };

  const handleAdvancePhase = async () => {
    if (!project) return;
    const next = getNextPhase(project.phase);
    if (!next) return;

    await fetch(`/api/projects/${id}/phase-gate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase: project.phase,
        action: "advance",
        nextPhase: next,
      }),
    });

    await fetchProject();
    setCurrentPhase(next);
    const phaseInfo = PHASES.find((p) => p.id === next);
    if (phaseInfo && phaseInfo.roles.length > 0) {
      setActiveRole(phaseInfo.roles[0]);
    }
  };

  const approvedPhases = (project?.gates || [])
    .filter((g) => g.status === "approved")
    .map((g) => g.phase as Phase);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm shrink-0">
        <div className="px-4 py-2.5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <h1 className="text-sm font-semibold">{project.name}</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/project/${id}/documents`)}
            className="text-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            文档中心
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <PhaseSidebar
          currentPhase={currentPhase}
          projectPhase={project.phase}
          approvedPhases={approvedPhases}
          onPhaseSelect={handlePhaseSelect}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <RoleTabs
            phase={currentPhase}
            activeRole={activeRole}
            onRoleSelect={setActiveRole}
          />

          <div className="flex-1 min-h-0">
            {conversationLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在恢复对话记录...
                </div>
              </div>
            ) : conversationId ? (
              <ChatPanel
                key={`${conversationId}-${currentPhase}-${activeRole}`}
                projectId={id}
                conversationId={conversationId}
                role={activeRole}
                initialMessages={initialMessages}
                onDocumentGenerated={handleDocumentGenerated}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="space-y-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    {conversationLoadError || "暂时无法恢复对话记录"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadConversation(activeRole, currentPhase)}
                  >
                    重试恢复
                  </Button>
                </div>
              </div>
            )}
          </div>

          <PhaseGateBar
            currentPhase={currentPhase}
            projectPhase={project.phase}
            onAdvancePhase={handleAdvancePhase}
            onApprovePhase={handleApprovePhase}
            isApproved={approvedPhases.includes(currentPhase)}
          />
        </div>

        <DocumentPanel
          projectId={id}
          phase={currentPhase}
          refreshTrigger={docRefresh}
        />
      </div>
    </div>
  );
}
