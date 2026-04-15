import type { UIMessage } from "ai";

export type ChatStatusPhase =
  | "queued"
  | "thinking"
  | "composing"
  | "streaming"
  | "complete"
  | "error";

export interface ChatStatusData {
  phase: ChatStatusPhase;
  label: string;
  detail?: string;
}

export type ChatUIMessage = UIMessage<
  never,
  {
    chatStatus: ChatStatusData;
  }
>;
