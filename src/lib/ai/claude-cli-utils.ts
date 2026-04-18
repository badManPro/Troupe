export type ClaudeExecutionMode = "auto" | "cli" | "api";

interface ClaudeCliAvailability {
  installed: boolean;
  authenticated: boolean;
}

interface ClaudeAuthStatusShape {
  loggedIn: boolean;
  authMethod: string | null;
  apiProvider: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

export function normalizeClaudeExecutionMode(
  value: string | null | undefined
): ClaudeExecutionMode {
  if (value === "cli" || value === "api" || value === "auto") {
    return value;
  }

  return "auto";
}

export function resolveClaudeTransport(
  mode: ClaudeExecutionMode,
  availability: ClaudeCliAvailability
) {
  const state = getClaudeTransportState(mode, availability);
  if (state.executionError) {
    throw new Error(state.executionError);
  }

  return state.effectiveTransport;
}

export function getClaudeTransportState(
  mode: ClaudeExecutionMode,
  availability: ClaudeCliAvailability
) {
  if (mode === "api") {
    return {
      effectiveTransport: "api" as const,
      executionError: null,
    };
  }

  if (availability.installed && availability.authenticated) {
    return {
      effectiveTransport: "cli" as const,
      executionError: null,
    };
  }

  if (mode === "auto") {
    return {
      effectiveTransport: "api" as const,
      executionError: null,
    };
  }

  if (!availability.installed) {
    return {
      effectiveTransport: null,
      executionError: "未检测到 Claude CLI。请先安装官方 Claude CLI。",
    };
  }

  return {
    effectiveTransport: null,
    executionError: "Claude CLI 尚未登录。请先在本机完成 `claude auth login`。",
  };
}

export function parseClaudeAuthStatus(
  raw: string
): ClaudeAuthStatusShape | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      loggedIn: parsed.loggedIn === true,
      authMethod:
        typeof parsed.authMethod === "string" ? parsed.authMethod : null,
      apiProvider:
        typeof parsed.apiProvider === "string" ? parsed.apiProvider : null,
    };
  } catch {
    return null;
  }
}

export function parseClaudeCliJsonLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function extractClaudeTextDelta(event: unknown) {
  if (!isRecord(event) || event.type !== "stream_event") {
    return null;
  }

  const streamEvent = event.event;
  if (!isRecord(streamEvent) || streamEvent.type !== "content_block_delta") {
    return null;
  }

  const delta = streamEvent.delta;
  if (!isRecord(delta) || delta.type !== "text_delta") {
    return null;
  }

  return typeof delta.text === "string" ? delta.text : null;
}

function extractTextParts(content: unknown) {
  if (!Array.isArray(content)) return null;

  const text = content
    .map((part) =>
      isRecord(part) && part.type === "text" && typeof part.text === "string"
        ? part.text
        : ""
    )
    .join("");

  return text || null;
}

export function extractClaudeFinalText(event: unknown) {
  if (!isRecord(event)) {
    return null;
  }

  if (event.type === "assistant") {
    const message = event.message;
    if (!isRecord(message)) return null;
    return extractTextParts(message.content);
  }

  if (event.type === "result") {
    return typeof event.result === "string" ? event.result : null;
  }

  return null;
}
