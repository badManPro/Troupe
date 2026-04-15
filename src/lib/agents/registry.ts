import type { AgentConfig, AgentRole, Phase } from "@/types";
import { pmAgent } from "./roles/pm";
import { designerAgent } from "./roles/designer";
import { architectAgent } from "./roles/architect";
import { frontendAgent } from "./roles/frontend";
import { backendAgent } from "./roles/backend";
import { qaAgent } from "./roles/qa";
import { coordinatorAgent } from "./roles/coordinator";

const agents: AgentConfig[] = [
  pmAgent,
  designerAgent,
  architectAgent,
  frontendAgent,
  backendAgent,
  qaAgent,
  coordinatorAgent,
];

export function getAgentById(role: AgentRole): AgentConfig | undefined {
  return agents.find((a) => a.id === role);
}

export function getAgentsForPhase(phase: Phase): AgentConfig[] {
  return agents.filter((a) => a.phases.includes(phase));
}

export function getAllAgents(): AgentConfig[] {
  return agents;
}
