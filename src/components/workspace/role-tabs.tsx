"use client";

import { cn } from "@/lib/utils";
import type { AgentRole, Phase } from "@/types";
import { getAgentsForPhase } from "@/lib/agents/registry";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Briefcase,
  Palette,
  Boxes,
  Code2,
  Server,
  TestTube,
  ClipboardList,
} from "lucide-react";

const roleIcons: Record<AgentRole, React.ReactNode> = {
  pm: <Briefcase className="w-3.5 h-3.5" />,
  designer: <Palette className="w-3.5 h-3.5" />,
  architect: <Boxes className="w-3.5 h-3.5" />,
  frontend: <Code2 className="w-3.5 h-3.5" />,
  backend: <Server className="w-3.5 h-3.5" />,
  qa: <TestTube className="w-3.5 h-3.5" />,
  coordinator: <ClipboardList className="w-3.5 h-3.5" />,
};

const roleColors: Record<AgentRole, string> = {
  pm: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  designer: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  architect: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  frontend: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  backend: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  qa: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  coordinator: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

interface RoleTabsProps {
  phase: Phase;
  activeRole: AgentRole;
  onRoleSelect: (role: AgentRole) => void;
}

export function RoleTabs({ phase, activeRole, onRoleSelect }: RoleTabsProps) {
  const agents = getAgentsForPhase(phase);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-card/50">
      <span className="text-xs text-muted-foreground mr-1">当前角色:</span>
      {agents.map((agent) => (
        <button
          key={agent.id}
          onClick={() => onRoleSelect(agent.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all cursor-pointer",
            activeRole === agent.id
              ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/20"
              : "hover:bg-muted text-muted-foreground"
          )}
        >
          <Avatar className={cn("w-6 h-6", roleColors[agent.id])}>
            <AvatarFallback className={cn("text-xs", roleColors[agent.id])}>
              {roleIcons[agent.id]}
            </AvatarFallback>
          </Avatar>
          <span>{agent.name}</span>
        </button>
      ))}
    </div>
  );
}
