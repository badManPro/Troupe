"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  Lightbulb,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PHASES, type Phase } from "@/types";

interface Project {
  id: string;
  name: string;
  description: string;
  phase: Phase;
  createdAt: string;
  updatedAt: string;
}

const phaseLabels: Record<Phase, string> = {
  brainstorm: "头脑风暴",
  requirements: "需求定义",
  design: "设计阶段",
  architecture: "架构设计",
  development: "开发规划",
  delivery: "交付准备",
};

const phaseColors: Record<Phase, string> = {
  brainstorm: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  requirements: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  design: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  architecture: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  development: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  delivery: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

function getPhaseProgress(phase: Phase): number {
  const idx = PHASES.findIndex((p) => p.id === phase);
  return Math.round(((idx + 1) / PHASES.length) * 100);
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
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
    fetchProjects();
  }, [fetchProjects]);

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确定要删除这个项目吗？所有数据将无法恢复。")) return;
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    fetchProjects();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Troupe</h1>
            <span className="text-xs text-muted-foreground hidden sm:block">
              AI Product Development Workstation
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/settings")}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">我的项目</h2>
            <p className="text-muted-foreground mt-1">
              选择一个项目继续，或者创建一个新项目
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4" />
                新建项目
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新项目</DialogTitle>
                <DialogDescription>
                  创建项目后，进入工作台与产品经理对话来梳理你的想法
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">项目名称</label>
                  <Input
                    placeholder="比如：个人记账 App"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    项目简介{" "}
                    <span className="text-muted-foreground font-normal">
                      （可选）
                    </span>
                  </label>
                  <Textarea
                    placeholder="仅用于项目列表展示，不会作为产品上下文传递给 AI 角色。详细需求请在工作台中与产品经理沟通。"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={!newName.trim()}>
                  创建并开始
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-2 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">还没有项目</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              脑子里有个想法？不管多模糊都可以，创建一个项目，
              <br />
              让 AI 产品团队帮你把它变成现实。
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              创建第一个项目
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {projects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow group"
                    onClick={() => router.push(`/project/${project.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          {project.name}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(project.id, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                      {project.description && (
                        <CardDescription className="line-clamp-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className={phaseColors[project.phase]}
                        >
                          {phaseLabels[project.phase]}
                        </Badge>
                      </div>
                      <Progress value={getPhaseProgress(project.phase)} />
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
