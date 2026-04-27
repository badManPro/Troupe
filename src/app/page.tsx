"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Blocks,
  Bot,
  Box,
  BrainCircuit,
  Check,
  Code2,
  FolderKanban,
  Home,
  Library,
  Lightbulb,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  PenTool,
  Plus,
  Rocket,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { WindowHeader } from "@/components/layout/window-header";
import {
  DELETE_PROJECT_CONFIRMATION_TEXT,
  isProjectDeletionConfirmationValid,
} from "@/lib/projects/delete-confirmation";
import { cn } from "@/lib/utils";
import { PHASES, type Phase } from "@/types";

interface Project {
  id: string;
  name: string;
  description: string;
  phase: Phase;
  createdAt: string;
  updatedAt: string;
}

const phaseVisuals: Record<
  Phase,
  {
    label: string;
    Icon: typeof BrainCircuit;
    badgeClassName: string;
    iconClassName: string;
    progressClassName: string;
    glowClassName: string;
  }
> = {
  brainstorm: {
    label: "头脑风暴",
    Icon: BrainCircuit,
    badgeClassName:
      "border-stage-brainstorm/25 bg-stage-brainstorm/12 text-stage-brainstorm",
    iconClassName:
      "bg-stage-brainstorm/14 text-stage-brainstorm shadow-[0_16px_44px_hsl(255_92%_76%/0.20)]",
    progressClassName: "bg-stage-brainstorm",
    glowClassName: "shadow-[0_0_0_1px_hsl(255_92%_76%/0.24),0_22px_74px_hsl(255_92%_76%/0.18)]",
  },
  requirements: {
    label: "需求定义",
    Icon: Target,
    badgeClassName:
      "border-stage-requirements/25 bg-stage-requirements/12 text-stage-requirements",
    iconClassName:
      "bg-stage-requirements/14 text-stage-requirements shadow-[0_16px_44px_hsl(211_92%_68%/0.18)]",
    progressClassName: "bg-stage-requirements",
    glowClassName: "shadow-[0_0_0_1px_hsl(211_92%_68%/0.18),0_20px_60px_hsl(211_92%_68%/0.14)]",
  },
  design: {
    label: "设计阶段",
    Icon: PenTool,
    badgeClassName:
      "border-stage-design/25 bg-stage-design/12 text-stage-design",
    iconClassName:
      "bg-stage-design/14 text-stage-design shadow-[0_16px_44px_hsl(158_74%_67%/0.18)]",
    progressClassName: "bg-stage-design",
    glowClassName: "shadow-[0_0_0_1px_hsl(158_74%_67%/0.18),0_20px_60px_hsl(158_74%_67%/0.14)]",
  },
  architecture: {
    label: "架构设计",
    Icon: Box,
    badgeClassName:
      "border-stage-architecture/25 bg-stage-architecture/12 text-stage-architecture",
    iconClassName:
      "bg-stage-architecture/14 text-stage-architecture shadow-[0_16px_44px_hsl(38_92%_62%/0.18)]",
    progressClassName: "bg-stage-architecture",
    glowClassName: "shadow-[0_0_0_1px_hsl(38_92%_62%/0.18),0_20px_60px_hsl(38_92%_62%/0.13)]",
  },
  development: {
    label: "开发规划",
    Icon: Code2,
    badgeClassName:
      "border-stage-development/25 bg-stage-development/12 text-stage-development",
    iconClassName:
      "bg-stage-development/14 text-stage-development shadow-[0_16px_44px_hsl(12_92%_66%/0.16)]",
    progressClassName: "bg-stage-development",
    glowClassName: "shadow-[0_0_0_1px_hsl(12_92%_66%/0.18),0_20px_60px_hsl(12_92%_66%/0.12)]",
  },
  delivery: {
    label: "交付准备",
    Icon: PackageCheck,
    badgeClassName:
      "border-stage-delivery/25 bg-stage-delivery/12 text-stage-delivery",
    iconClassName:
      "bg-stage-delivery/14 text-stage-delivery shadow-[0_16px_44px_hsl(286_78%_70%/0.18)]",
    progressClassName: "bg-stage-delivery",
    glowClassName: "shadow-[0_0_0_1px_hsl(286_78%_70%/0.18),0_20px_60px_hsl(286_78%_70%/0.14)]",
  },
};

const roleChips = [
  {
    label: "PM",
    className: "border-role-pm/25 bg-role-pm/16 text-role-pm",
  },
  {
    label: "UX",
    className: "border-role-designer/25 bg-role-designer/16 text-role-designer",
  },
  {
    label: "FE",
    className: "border-role-frontend/25 bg-role-frontend/16 text-role-frontend",
  },
  {
    label: "QA",
    className: "border-role-qa/25 bg-role-qa/16 text-role-qa",
  },
];

const sidebarItems = [
  { label: "首页", Icon: Home, active: true, href: "/" },
  { label: "项目", Icon: FolderKanban, active: false, href: "/" },
  { label: "知识库", Icon: Library, active: false },
  { label: "AI 助手", Icon: Bot, active: false },
  { label: "成员", Icon: Users, active: false },
  { label: "集成", Icon: Blocks, active: false },
];

function getPhaseProgress(phase: Phase): number {
  const idx = PHASES.findIndex((p) => p.id === phase);
  return Math.round(((idx + 1) / PHASES.length) * 100);
}

function formatProjectDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "刚刚更新";
  }

  return `更新于 ${parsed.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  })}`;
}

function getRoleChipCount(phase: Phase): number {
  return Math.min(PHASES.findIndex((p) => p.id === phase) + 2, roleChips.length);
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(
    null
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch {
      // will handle on next render
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-side project fetch intentionally hydrates local state after mount.
    void fetchProjects();
  }, [fetchProjects]);

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 3),
    [projects]
  );

  const averageProgress = useMemo(() => {
    if (projects.length === 0) return 0;

    const total = projects.reduce(
      (sum, project) => sum + getPhaseProgress(project.phase),
      0
    );

    return Math.round(total / projects.length);
  }, [projects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
    });
    if (res.ok) {
      const project = await res.json();
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      router.push(`/project/${project.id}`);
    }
  };

  const resetDeleteDialog = () => {
    setProjectPendingDelete(null);
    setDeleteConfirmation("");
    setDeleteError(null);
    setDeletePending(false);
  };

  const closeDeleteDialog = () => {
    if (deletePending) return;
    resetDeleteDialog();
  };

  const handleDeleteRequest = (project: Project, e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setProjectPendingDelete(project);
    setDeleteConfirmation("");
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!projectPendingDelete) return;
    if (!isProjectDeletionConfirmationValid(deleteConfirmation)) return;

    setDeletePending(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/projects/${projectPendingDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setDeleteError(payload?.error ?? "删除失败，请稍后重试。");
        return;
      }

      resetDeleteDialog();
      await fetchProjects();
    } catch {
      setDeleteError("删除失败，请检查网络后重试。");
    } finally {
      setDeletePending(false);
    }
  };

  const openProject = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  const handleProjectCardKeyDown = (
    projectId: string,
    event: KeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openProject(projectId);
  };

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden">
      <WindowHeader
        className="z-30 shrink-0"
        containerClassName="window-header-leading"
      >
        <div className="flex w-full items-center justify-between gap-4 px-4 pb-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/14 text-primary soft-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="truncate font-display text-xl font-semibold tracking-normal sm:text-2xl">
                  Troupe
                </h1>
                <span className="hidden h-6 w-px bg-border-glass sm:block" />
                <span className="hidden truncate text-sm font-medium text-muted-foreground md:block">
                  AI 原生产品工作台
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-full border border-border-glass bg-surface-glass p-1 shadow-sm backdrop-blur">
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl border border-border-glass bg-surface-glass backdrop-blur hover:bg-accent"
              onClick={() => router.push("/settings")}
              aria-label="打开设置"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </WindowHeader>

      <main className="relative mx-auto grid min-h-0 w-full max-w-[92rem] flex-1 grid-cols-1 items-stretch gap-6 overflow-hidden px-4 py-6 sm:px-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:px-8 lg:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-6rem] top-10 h-80 w-80 rounded-full bg-primary/12 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-10 hidden h-72 w-72 rounded-full bg-accent-mint/10 blur-3xl lg:block"
        />

        <aside className="surface-glass hidden min-h-0 flex-col justify-between overflow-y-auto rounded-[1.125rem] p-4 lg:flex">
          <nav className="space-y-2" aria-label="Dashboard navigation">
            {sidebarItems.map(({ label, Icon, active, href }) =>
              href ? (
                <button
                  type="button"
                  key={label}
                  className={cn(
                    "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => router.push(href)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ) : (
                <div
                  key={label}
                  aria-disabled="true"
                  className="flex h-11 w-full cursor-default items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground/70"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              )
            )}
            <button
              type="button"
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-4 w-4" />
              设置
            </button>
          </nav>

          <div className="space-y-5">
            <div className="space-y-3">
              <p className="px-2 text-xs font-medium text-muted-foreground">
                最近访问
              </p>
              {recentProjects.length > 0 ? (
                <div className="space-y-2">
                  {recentProjects.map((project) => {
                    const visual = phaseVisuals[project.phase];
                    const Icon = visual.Icon;

                    return (
                      <button
                        type="button"
                        key={project.id}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => openProject(project.id)}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            visual.iconClassName
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 truncate">{project.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="px-2 text-xs leading-5 text-muted-foreground">
                  暂无最近项目
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border-glass bg-surface-glass p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground soft-glow">
                  PM
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">产品经理</p>
                  <p className="truncate text-xs text-muted-foreground">
                    产品团队 · 管理员
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="relative min-h-0 min-w-0 space-y-6 overflow-x-hidden overflow-y-auto pr-1">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
                    我的项目
                  </h2>
                  <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
                    {projects.length} 个项目
                  </Badge>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  由 AI 团队协作推进你的产品想法。
                </p>
              </div>

              <DialogTrigger asChild>
                <Button className="h-11 rounded-xl px-5 shadow-[0_0_0_1px_hsl(255_92%_76%/0.22),0_18px_54px_hsl(255_92%_76%/0.22)]">
                  <Plus className="h-4 w-4" />
                  新建项目
                </Button>
              </DialogTrigger>
            </div>

            <DialogContent className="surface-glass gap-5 border-border-glass bg-surface-glass p-6 sm:max-w-[34rem] sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl tracking-normal">
                  新建项目
                </DialogTitle>
                <DialogDescription>
                  创建项目后会进入工作台，从头脑风暴阶段开始。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="project-name">
                    项目名 <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="project-name"
                    className="h-11 rounded-xl border-border-glass bg-background/50 focus-visible:ring-primary"
                    placeholder="请输入项目名称"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="project-desc">
                    项目简介{" "}
                    <span className="font-normal text-muted-foreground">
                      （可选）
                    </span>
                  </label>
                  <Textarea
                    id="project-desc"
                    className="min-h-28 resize-none rounded-xl border-border-glass bg-background/50 focus-visible:ring-primary"
                    placeholder="请输入项目简介"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={4}
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {newDesc.length}/200
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  className="rounded-xl border-border-glass bg-background/40"
                  onClick={() => setCreateOpen(false)}
                >
                  取消
                </Button>
                <Button
                  className="rounded-xl"
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                >
                  创建项目
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="surface-glass rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  项目数量
                </span>
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-semibold">{projects.length}</p>
            </div>
            <div className="surface-glass rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  平均进度
                </span>
                <Rocket className="h-4 w-4 text-accent-mint" />
              </div>
              <p className="mt-2 text-2xl font-semibold">{averageProgress}%</p>
            </div>
            <div className="surface-glass rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  工作阶段
                </span>
                <Sparkles className="h-4 w-4 text-accent-orange" />
              </div>
              <p className="mt-2 text-2xl font-semibold">{PHASES.length}</p>
            </div>
          </div>

          <Dialog
            open={Boolean(projectPendingDelete)}
            onOpenChange={(open) => {
              if (!open) {
                closeDeleteDialog();
              }
            }}
          >
            <DialogContent className="surface-glass gap-5 border-border-glass bg-surface-glass p-6 sm:max-w-[30rem] sm:rounded-2xl">
              <DialogHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <DialogTitle className="font-display text-xl tracking-normal">
                  删除项目
                </DialogTitle>
                <DialogDescription className="leading-6">
                  {projectPendingDelete ? (
                    <>
                      项目“{projectPendingDelete.name}”以及它的会话、文档和阶段记录都会被永久删除。
                      请输入
                      <span className="mx-1 rounded-md border border-border-glass bg-muted/70 px-1.5 py-0.5 font-mono text-xs text-foreground">
                        {DELETE_PROJECT_CONFIRMATION_TEXT}
                      </span>
                      继续。
                    </>
                  ) : (
                    "此操作不可恢复。"
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <label
                  className="text-sm font-medium"
                  htmlFor="delete-confirmation"
                >
                  输入确认词
                </label>
                <div className="relative">
                  <Input
                    id="delete-confirmation"
                    autoFocus
                    className={cn(
                      "h-11 rounded-xl border-border-glass bg-background/50 pr-10 focus-visible:ring-primary",
                      deleteConfirmation &&
                        !isProjectDeletionConfirmationValid(deleteConfirmation) &&
                        "border-destructive/70 focus-visible:ring-destructive",
                      isProjectDeletionConfirmationValid(deleteConfirmation) &&
                        "border-status-success/70 focus-visible:ring-status-success"
                    )}
                    placeholder={`请输入 ${DELETE_PROJECT_CONFIRMATION_TEXT}`}
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    disabled={deletePending}
                  />
                  {isProjectDeletionConfirmationValid(deleteConfirmation) ? (
                    <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-status-success" />
                  ) : null}
                </div>
                {deleteError ? (
                  <p className="text-sm text-destructive">{deleteError}</p>
                ) : (
                  <p
                    className={cn(
                      "text-sm text-muted-foreground",
                      deleteConfirmation &&
                        !isProjectDeletionConfirmationValid(deleteConfirmation) &&
                        "text-destructive"
                    )}
                  >
                    {deleteConfirmation &&
                    !isProjectDeletionConfirmationValid(deleteConfirmation)
                      ? "确认词不正确。"
                      : "只有输入完全匹配的确认词后，删除按钮才会启用。"}
                  </p>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  className="rounded-xl border-border-glass bg-background/40"
                  onClick={closeDeleteDialog}
                  disabled={deletePending}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl"
                  onClick={handleDeleteConfirm}
                  disabled={
                    deletePending ||
                    !isProjectDeletionConfirmationValid(deleteConfirmation)
                  }
                >
                  {deletePending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      删除中
                    </>
                  ) : (
                    "删除项目"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="surface-card rounded-2xl border-border-glass p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="skeleton-shimmer h-12 w-12 rounded-2xl" />
                    <div className="skeleton-shimmer h-6 w-8 rounded-full" />
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="skeleton-shimmer h-4 w-3/4 rounded-full" />
                    <div className="skeleton-shimmer h-4 w-1/2 rounded-full" />
                    <div className="skeleton-shimmer h-3 w-full rounded-full" />
                    <div className="skeleton-shimmer h-3 w-2/3 rounded-full" />
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="skeleton-shimmer h-2 w-full rounded-full" />
                    <div className="flex items-center gap-2">
                      <div className="skeleton-shimmer h-7 w-7 rounded-full" />
                      <div className="skeleton-shimmer h-7 w-7 rounded-full" />
                      <div className="skeleton-shimmer h-7 w-7 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-glass relative flex min-h-[28rem] overflow-hidden rounded-[1.125rem] p-8"
            >
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-16 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/16 blur-3xl"
              />
              <div className="relative mx-auto flex max-w-xl flex-col items-center justify-center text-center">
                <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-primary/20 bg-primary/10 text-primary soft-glow">
                  <Lightbulb className="h-10 w-10" />
                </div>
                <h3 className="font-display text-2xl font-semibold tracking-normal">
                  从一个想法开始
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  创建项目后，Troupe 会按阶段推进头脑风暴、需求、设计、架构、开发规划和交付准备。
                </p>
                <Button
                  className="mt-7 h-11 rounded-xl px-5"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  创建第一个项目
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {projects.map((project, idx) => {
                  const visual = phaseVisuals[project.phase];
                  const Icon = visual.Icon;
                  const progress = getPhaseProgress(project.phase);
                  const visibleRoleChips = roleChips.slice(
                    0,
                    getRoleChipCount(project.phase)
                  );

                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: idx * 0.035 }}
                      className="h-full"
                    >
                      <Card
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "group flex h-full min-h-[16rem] cursor-pointer flex-col rounded-2xl border-border-glass bg-card/78 shadow-[var(--shadow-glass)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          idx === 0 && visual.glowClassName
                        )}
                        onClick={() => openProject(project.id)}
                        onKeyDown={(event) =>
                          handleProjectCardKeyDown(project.id, event)
                        }
                      >
                        <CardHeader className="space-y-5 p-5 pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div
                              className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                                visual.iconClassName
                              )}
                            >
                              <Icon className="h-6 w-6" />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                              onClick={(e) => handleDeleteRequest(project, e)}
                              aria-label={`删除项目 ${project.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <h3 className="line-clamp-2 min-h-[3.25rem] text-lg font-semibold leading-[1.45] tracking-normal">
                              {project.name}
                            </h3>
                            <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                              {project.description || "暂无项目简介"}
                            </p>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4 p-5 pt-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "w-fit rounded-lg border px-2.5 py-1 text-xs font-medium",
                              visual.badgeClassName
                            )}
                          >
                            {visual.label}
                          </Badge>

                          <div className="space-y-2">
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  visual.progressClassName
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{progress}%</span>
                              <span>{formatProjectDate(project.updatedAt)}</span>
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="mt-auto flex items-center justify-between p-5 pt-0">
                          <div className="flex items-center gap-1.5">
                            {visibleRoleChips.map((chip) => (
                              <span
                                key={chip.label}
                                className={cn(
                                  "flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-semibold",
                                  chip.className
                                )}
                              >
                                {chip.label}
                              </span>
                            ))}
                            {getRoleChipCount(project.phase) > 3 ? (
                              <span className="flex h-7 min-w-7 items-center justify-center rounded-full border border-border-glass bg-muted/50 px-2 text-[11px] font-semibold text-muted-foreground">
                                +{getRoleChipCount(project.phase) - 3}
                              </span>
                            ) : null}
                          </div>
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      <footer className="relative z-10 shrink-0 border-t border-border-glass bg-surface-glass/70 px-4 py-4 text-center text-sm text-muted-foreground backdrop-blur">
        Troupe · 让 AI 与团队一起，把想法变成价值
        <Sparkles className="ml-2 inline h-3.5 w-3.5 text-primary" />
      </footer>
    </div>
  );
}
