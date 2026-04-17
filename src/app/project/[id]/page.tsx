"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhaseSidebar } from "@/components/workspace/phase-sidebar";
import { RoleTabs } from "@/components/workspace/role-tabs";
import { ConversationTabs } from "@/components/workspace/conversation-tabs";
import { ChatPanel } from "@/components/chat/chat-panel";
import { DocumentPanel } from "@/components/documents/document-panel";
import { WindowHeader } from "@/components/layout/window-header";
import type {
  ConversationSummary,
  Phase,
  AgentRole,
  ProjectDocument,
} from "@/types";
import { PHASES, getNextPhase } from "@/types";
import type { PersistedChatMessage } from "@/types/chat";

interface ProjectData {
  id: string;
  name: string;
  description: string;
  phase: Phase;
  gates: { id: string; phase: string; status: string; checklist: string }[];
  documents: ProjectDocument[];
}

interface PendingStarter {
  conversationId: string;
  prompt: string;
  key: string;
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
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<PersistedChatMessage[]>(
    []
  );
  const [pendingStarter, setPendingStarter] = useState<PendingStarter | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationLoadError, setConversationLoadError] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const conversationRequestRef = useRef(0);

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

  const refreshConversationSummaries = useCallback(
    async (role: AgentRole, phase: Phase) => {
      const res = await fetch(
        `/api/projects/${id}/conversations?role=${role}&phase=${phase}`
      );
      if (!res.ok) {
        return;
      }

      const nextConversations = (await res.json()) as ConversationSummary[];
      setConversations(nextConversations);
    },
    [id]
  );

  const handleDocumentGenerated = useCallback(() => {
    fetchProject();
    refreshConversationSummaries(activeRole, currentPhase);
  }, [activeRole, currentPhase, fetchProject, refreshConversationSummaries]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const loadConversation = useCallback(
    async (
      role: AgentRole,
      phase: Phase,
      preferredConversationId?: string | null
    ) => {
      const requestId = conversationRequestRef.current + 1;
      conversationRequestRef.current = requestId;

      setConversationLoading(true);
      setConversationLoadError(null);
      setInitialMessages([]);

      try {
        let res = await fetch(
          `/api/projects/${id}/conversations?role=${role}&phase=${phase}`
        );
        if (!res.ok) {
          throw new Error("读取会话列表失败");
        }

        let conversationList = (await res.json()) as ConversationSummary[];
        let nextConversationId =
          preferredConversationId &&
          conversationList.some((conversation) => conversation.id === preferredConversationId)
            ? preferredConversationId
            : conversationList[0]?.id ?? null;

        if (!nextConversationId) {
          const createRes = await fetch(`/api/projects/${id}/conversations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role, phase, forceNew: true }),
          });

          if (!createRes.ok) {
            throw new Error("创建会话失败");
          }

          const createdConversation = await createRes.json();
          nextConversationId = createdConversation.id;

          res = await fetch(
            `/api/projects/${id}/conversations?role=${role}&phase=${phase}`
          );
          if (!res.ok) {
            throw new Error("刷新会话列表失败");
          }
          conversationList = (await res.json()) as ConversationSummary[];
        }

        const msgRes = await fetch(
          `/api/projects/${id}/messages?conversationId=${nextConversationId}`
        );
        if (!msgRes.ok) {
          throw new Error("读取历史消息失败");
        }
        const msgs = await msgRes.json();

        if (conversationRequestRef.current !== requestId) {
          return;
        }

        setConversations(conversationList);
        setInitialMessages(
          msgs.map((m: PersistedChatMessage) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
        setConversationId(nextConversationId);
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

  const projectLoaded = !loading && project != null;
  useEffect(() => {
    if (projectLoaded) {
      loadConversation(activeRole, currentPhase);
    }
    // projectLoaded only flips once from false→true on initial load.
    // After that, role/phase changes are the only triggers we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole, currentPhase, projectLoaded, loadConversation]);

  const handlePhaseSelect = (phase: Phase) => {
    setCurrentPhase(phase);
    const phaseInfo = PHASES.find((p) => p.id === phase);
    if (phaseInfo && phaseInfo.roles.length > 0) {
      setActiveRole(phaseInfo.roles[0]);
    }
  };

  const handleApprovePhase = async () => {
    if (!project) return;
    const res = await fetch(`/api/projects/${id}/phase-gate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: project.phase, action: "approve" }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      window.alert(payload?.error ?? "当前阶段还有必交付文档未完成");
      return;
    }
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

  const handleConversationSelect = useCallback(
    (nextConversationId: string) => {
      loadConversation(activeRole, currentPhase, nextConversationId);
    },
    [activeRole, currentPhase, loadConversation]
  );

  const handleCreateConversation = useCallback(
    async (
      nextRole: AgentRole = activeRole,
      nextPhase: Phase = currentPhase,
      starter?: { prompt: string }
    ) => {
      const res = await fetch(`/api/projects/${id}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole, phase: nextPhase, forceNew: true }),
      });

      if (!res.ok) {
        return;
      }

      const conversation = await res.json();
      if (starter?.prompt) {
        setPendingStarter({
          conversationId: conversation.id,
          prompt: starter.prompt,
          key: `${conversation.id}:${Date.now()}`,
        });
      }

      setCurrentPhase(nextPhase);
      setActiveRole(nextRole);
      loadConversation(nextRole, nextPhase, conversation.id);
    },
    [activeRole, currentPhase, id, loadConversation]
  );

  const handleOpenSuggestionConversation = useCallback(
    async (suggestion: {
      prompt: string;
      role: AgentRole;
    }) => {
      await handleCreateConversation(suggestion.role, currentPhase, {
        prompt: suggestion.prompt,
      });
    },
    [currentPhase, handleCreateConversation]
  );

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

  const isCurrentPhaseApproved = approvedPhases.includes(currentPhase);
  const isCurrentProjectPhase = currentPhase === project.phase;

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      <WindowHeader className="shrink-0" containerClassName="window-header-leading">
        <div className="flex items-center gap-3 px-4 pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/20">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">{project.name}</h1>
              <p className="text-xs text-muted-foreground">AI 产品工作台</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => router.push(`/project/${id}/documents`)}
          >
            <FileText className="w-3.5 h-3.5" />
            文档中心
          </Button>
        </div>
      </WindowHeader>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <PhaseSidebar
          currentPhase={currentPhase}
          projectPhase={project.phase}
          approvedPhases={approvedPhases}
          onPhaseSelect={handlePhaseSelect}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <RoleTabs
            phase={currentPhase}
            activeRole={activeRole}
            onRoleSelect={setActiveRole}
          />
          <ConversationTabs
            conversations={conversations}
            activeConversationId={conversationId}
            onSelect={handleConversationSelect}
            onCreate={() => handleCreateConversation()}
          />

          <div className="flex-1 min-h-0 overflow-hidden">
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
                phase={currentPhase}
                hasExistingPrd={project.documents.some((doc) => doc.type === "prd")}
                documents={project.documents}
                showPhaseActions={isCurrentProjectPhase}
                isPhaseApproved={isCurrentPhaseApproved}
                onApprovePhase={handleApprovePhase}
                onAdvancePhase={handleAdvancePhase}
                initialMessages={initialMessages}
                onDocumentGenerated={handleDocumentGenerated}
                autoStartPrompt={
                  pendingStarter?.conversationId === conversationId
                    ? pendingStarter.prompt
                    : null
                }
                autoStartKey={
                  pendingStarter?.conversationId === conversationId
                    ? pendingStarter.key
                    : null
                }
                onAutoStartConsumed={(key) => {
                  setPendingStarter((current) =>
                    current?.key === key ? null : current
                  );
                }}
                onOpenSuggestionConversation={handleOpenSuggestionConversation}
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

        </div>

        <DocumentPanel
          projectId={id}
          phase={currentPhase}
          documents={project.documents}
          onDocumentsChanged={fetchProject}
        />
      </div>
    </div>
  );
}
