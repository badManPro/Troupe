export interface ClaudeErrorContext {
  rawBaseURL?: string | null;
  baseURL?: string | null;
  authToken?: string | null;
  apiKey?: string | null;
}

const OFFICIAL_CLAUDE_CLI_ONLY_ERROR =
  "This API endpoint is only accessible via the official Claude CLI";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Claude 调用失败";
}

function isOfficialAnthropicHost(baseURL: string | null | undefined) {
  if (!baseURL) return false;

  try {
    const { hostname } = new URL(baseURL);
    return hostname === "api.anthropic.com";
  } catch {
    return false;
  }
}

export function getClaudeCompatibilityWarning(
  context: ClaudeErrorContext
): string | null {
  if (
    !context.authToken ||
    context.apiKey ||
    !context.rawBaseURL ||
    isOfficialAnthropicHost(context.rawBaseURL)
  ) {
    return null;
  }

  return "当前 Claude 配置使用 Bearer Token 连接自定义网关。Troupe 通过标准 Anthropic Messages API (/v1/messages) 调用 Claude；如果该网关只接受官方 Claude CLI 客户端，而不接受普通 Messages API 请求，运行时会返回 403。";
}

export function formatClaudeError(
  error: unknown,
  context: ClaudeErrorContext = {}
) {
  const message = getErrorMessage(error);

  if (!message.includes(OFFICIAL_CLAUDE_CLI_ONLY_ERROR)) {
    return message;
  }

  const endpoint = context.baseURL ?? context.rawBaseURL ?? "当前 Claude 网关";

  return `${endpoint} 拒绝了标准 Anthropic Messages API (/v1/messages) 调用，并要求使用官方 Claude CLI。Troupe 当前的 Claude 集成不会伪装成官方 CLI，因此无法复用这个仅限 CLI 的端点。请改用兼容 /v1/messages 的 Claude 网关，或改配 ANTHROPIC_API_KEY。原始错误：${message}`;
}
