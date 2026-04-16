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

export interface PersistedChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ChatQuestionFieldType =
  | "single_choice"
  | "short_text"
  | "long_text";

export interface ChatQuestionOption {
  id: string;
  label: string;
}

export interface ChatQuestion {
  id: string;
  prompt: string;
  description?: string;
  fieldType: ChatQuestionFieldType;
  placeholder?: string;
  options?: ChatQuestionOption[];
  required: boolean;
}

export interface ChatQuestionnaire {
  title: string;
  description?: string;
  questions: ChatQuestion[];
}

export type ChatUIMessage = UIMessage<
  never,
  {
    chatStatus: ChatStatusData;
  }
>;
