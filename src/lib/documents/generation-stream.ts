export type DocumentGenerationStatusPhase =
  | "queued"
  | "thinking"
  | "composing"
  | "streaming"
  | "complete"
  | "error";

export interface DocumentGenerationStatus {
  phase: DocumentGenerationStatusPhase;
  label: string;
  detail?: string;
}

export interface DocumentGenerationState {
  previewText: string;
  status: DocumentGenerationStatus | null;
  isComplete: boolean;
  error: string | null;
}

export type DocumentGenerationEvent =
  | {
      type: "data-chatStatus";
      data: DocumentGenerationStatus;
    }
  | {
      type: "text-delta";
      delta: string;
    }
  | {
      type: "finish";
    }
  | {
      type: "error";
      errorText?: string;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

export interface ParsedDocumentGenerationSse {
  events: DocumentGenerationEvent[];
  remainder: string;
}

export function createDocumentGenerationState(): DocumentGenerationState {
  return {
    previewText: "",
    status: null,
    isComplete: false,
    error: null,
  };
}

export function getDocumentGenerationWaitingStages(
  documentLabel: string
): DocumentGenerationStatus[] {
  return [
    {
      phase: "queued",
      label: `已提交${documentLabel}生成请求`,
      detail: "正在唤起对应 AI 角色。",
    },
    {
      phase: "thinking",
      label: "正在整理项目上下文",
      detail: "我在收集当前阶段文档、对话结论和约束条件。",
    },
    {
      phase: "composing",
      label: `正在生成${documentLabel}`,
      detail: "结构已经开始成型，马上会回传可预览内容。",
    },
  ];
}

export function getDocumentGenerationStreamingStatus(
  documentLabel: string
): DocumentGenerationStatus {
  return {
    phase: "streaming",
    label: `正在回传${documentLabel}内容`,
    detail: "生成结果会实时显示在下方预览区。",
  };
}

export function getDocumentGenerationCompleteStatus(
  documentLabel: string
): DocumentGenerationStatus {
  return {
    phase: "complete",
    label: `${documentLabel}已生成`,
    detail: "正在同步到文档面板。",
  };
}

export function getDocumentGenerationErrorStatus(
  errorText?: string
): DocumentGenerationStatus {
  return {
    phase: "error",
    label: "生成失败",
    detail: errorText ?? "请求未能完成，请稍后重试。",
  };
}

function isDocumentGenerationStatus(
  value: unknown
): value is DocumentGenerationStatus {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DocumentGenerationStatus>;
  return (
    typeof candidate.phase === "string" && typeof candidate.label === "string"
  );
}

export function reduceDocumentGenerationEvent(
  state: DocumentGenerationState,
  event: DocumentGenerationEvent
): DocumentGenerationState {
  if (event.type === "text-delta" && typeof event.delta === "string") {
    return {
      ...state,
      previewText: state.previewText + event.delta,
    };
  }

  if (
    event.type === "data-chatStatus" &&
    isDocumentGenerationStatus(event.data)
  ) {
    return {
      ...state,
      status: event.data,
      error: event.data.phase === "error" ? event.data.detail ?? null : state.error,
      isComplete: event.data.phase === "complete",
    };
  }

  if (event.type === "error") {
    const errorText =
      typeof event.errorText === "string"
        ? event.errorText
        : "请求未能完成，请稍后重试。";

    return {
      ...state,
      error: errorText,
      status: getDocumentGenerationErrorStatus(errorText),
    };
  }

  if (event.type === "finish") {
    return {
      ...state,
      isComplete: true,
    };
  }

  return state;
}

export function parseDocumentGenerationSse(
  input: string
): ParsedDocumentGenerationSse {
  const normalized = input.replace(/\r\n/g, "\n");
  const frames = normalized.split("\n\n");
  const lastFrameCompleted = normalized.endsWith("\n\n");
  const completedFrames = frames.slice(0, -1);
  const remainder = lastFrameCompleted ? "" : frames[frames.length - 1] ?? "";
  const events: DocumentGenerationEvent[] = [];

  for (const frame of completedFrames) {
    if (!frame.trim()) continue;

    const dataLines = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length === 0) continue;

    const payload = dataLines.join("\n").trim();
    if (!payload || payload === "[DONE]") continue;

    try {
      events.push(JSON.parse(payload) as DocumentGenerationEvent);
    } catch {
      // Ignore malformed partial payloads and keep the stream resilient.
    }
  }

  return { events, remainder };
}
