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
  pm: "border-role-pm/25 bg-role-pm/15 text-role-pm",
  designer: "border-role-designer/25 bg-role-designer/15 text-role-designer",
  architect: "border-role-architect/25 bg-role-architect/15 text-role-architect",
  frontend: "border-role-frontend/25 bg-role-frontend/15 text-role-frontend",
  backend: "border-role-backend/25 bg-role-backend/15 text-role-backend",
  qa: "border-role-qa/25 bg-role-qa/15 text-role-qa",
  coordinator: "border-role-coordinator/25 bg-role-coordinator/15 text-role-coordinator",
};

interface RoleTabsProps {
  phase: Phase;
  activeRole: AgentRole;
  onRoleSelect: (role: AgentRole) => void;
  disabledRoles?: Partial<Record<AgentRole, string>>;
}

export function RoleTabs({
  phase,
  activeRole,
  onRoleSelect,
  disabledRoles = {},
}: RoleTabsProps) {
  const agents = getAgentsForPhase(phase);

  return (
    <div className="border-b border-border/55 bg-background/42 px-4 py-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3 overflow-x-auto pb-0.5">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          当前角色
        </span>
        <div className="flex min-w-max items-center gap-2">
          {agents.map((agent) => {
            const active = activeRole === agent.id;
            const disabled = Boolean(disabledRoles[agent.id]);

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  if (disabledRoles[agent.id]) {
                    return;
                  }
                  onRoleSelect(agent.id);
                }}
                disabled={disabled}
                title={disabledRoles[agent.id]}
                className={cn(
                  "relative flex h-11 items-center gap-2 rounded-2xl border px-3 pr-4 text-sm transition-all",
                  active
                    ? "border-primary/35 bg-primary/12 text-primary shadow-[0_12px_34px_hsl(255_92%_76%/0.12)]"
                    : "border-border/55 bg-background/55 text-muted-foreground",
                  disabled
                    ? "cursor-not-allowed opacity-55"
                    : "cursor-pointer hover:border-primary/20 hover:bg-accent/30 hover:text-foreground"
                )}
              >
                <Avatar className={cn("h-7 w-7 border", roleColors[agent.id])}>
                  <AvatarFallback className={cn("text-xs", roleColors[agent.id])}>
                    {roleIcons[agent.id]}
                  </AvatarFallback>
                </Avatar>
                <span className="whitespace-nowrap font-medium">{agent.name}</span>
                {active && (
                  <span className="absolute inset-x-3 -bottom-[0.8rem] h-0.5 rounded-full bg-primary shadow-[0_0_16px_hsl(255_92%_76%/0.65)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
