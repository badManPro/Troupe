import { spawn, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const CODEX_HOME = path.join(os.homedir(), ".codex");
const AUTH_JSON_PATH = path.join(CODEX_HOME, "auth.json");
const CONFIG_TOML_PATH = path.join(CODEX_HOME, "config.toml");
const MODELS_CACHE_PATH = path.join(CODEX_HOME, "models_cache.json");

const DEVICE_AUTH_URL = "https://auth.openai.com/codex/device";
const ANSI_ESCAPE_REGEX = /\u001B\[[0-9;]*m/g;
const DEVICE_CODE_REGEX = /\b[A-Z0-9]{4,}-[A-Z0-9]{4,}\b/;

interface CodexTokens {
  id_token: string;
  access_token: string;
  refresh_token: string;
  account_id: string;
}

interface CodexAuthJson {
  auth_mode: string | null;
  OPENAI_API_KEY: string | null;
  tokens: CodexTokens | null;
  last_refresh: string | null;
}

interface PendingCodexLogin {
  process: ReturnType<typeof spawn>;
  authUrl: string | null;
  code: string | null;
  stderr: string;
  stdout: string;
  startedAt: number;
  exited: boolean;
  exitCode: number | null;
}

export interface CodexStatus {
  installed: boolean;
  authenticated: boolean;
  authMode: string | null;
  accountId: string | null;
  lastRefresh: string | null;
  model: string | null;
}

export interface CodexDeviceAuth {
  authUrl: string;
  code: string;
}

export interface CodexModel {
  slug: string;
  displayName: string;
  description: string;
}

export interface CodexExecEvent {
  type?: string;
  item?: {
    type?: string;
    text?: string;
  };
  [key: string]: unknown;
}

let pendingLogin: PendingCodexLogin | null = null;

export function readAuthJson(): CodexAuthJson | null {
  try {
    if (!fs.existsSync(AUTH_JSON_PATH)) return null;
    const raw = fs.readFileSync(AUTH_JSON_PATH, "utf-8");
    return JSON.parse(raw) as CodexAuthJson;
  } catch {
    return null;
  }
}

export function getCodexConfigModel(): string | null {
  return parseModelFromConfig();
}

function parseModelFromConfig(): string | null {
  try {
    if (!fs.existsSync(CONFIG_TOML_PATH)) return null;
    const raw = fs.readFileSync(CONFIG_TOML_PATH, "utf-8");
    const match = raw.match(/^model\s*=\s*"(.+)"/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_REGEX, "");
}

function isCodexInstalled(): boolean {
  try {
    const result = spawnSync("codex", ["--version"], { stdio: "ignore" });
    return !result.error && result.status === 0;
  } catch {
    return false;
  }
}

function getCodexEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    TERM:
      process.env.TERM && process.env.TERM !== "dumb"
        ? process.env.TERM
        : "xterm-256color",
  };
}

function parseCodexError(output: string, exitCode: number | null): string {
  const cleaned = stripAnsi(output).trim();

  if (!cleaned) {
    return `Codex CLI 执行失败${exitCode !== null ? `（退出码 ${exitCode}）` : ""}`;
  }

  if (
    cleaned.includes("Not logged in") ||
    cleaned.includes("Please login") ||
    cleaned.includes("Error logging in")
  ) {
    return "Codex CLI 尚未登录。请先在设置页完成 Codex 登录。";
  }

  return cleaned;
}

export function getCodexStatus(): CodexStatus {
  const auth = readAuthJson();
  const model = parseModelFromConfig();
  const installed = isCodexInstalled() || fs.existsSync(CODEX_HOME);

  if (!auth) {
    return {
      installed,
      authenticated: false,
      authMode: null,
      accountId: null,
      lastRefresh: null,
      model,
    };
  }

  const hasApiKey = !!auth.OPENAI_API_KEY;
  const hasTokens = !!auth.tokens?.access_token;

  return {
    installed,
    authenticated: hasApiKey || hasTokens,
    authMode: auth.auth_mode,
    accountId: auth.tokens?.account_id ?? null,
    lastRefresh: auth.last_refresh,
    model,
  };
}

const FALLBACK_MODELS: CodexModel[] = [
  {
    slug: "gpt-5.4",
    displayName: "gpt-5.4",
    description: "Latest frontier agentic coding model.",
  },
  {
    slug: "gpt-5.2-codex",
    displayName: "gpt-5.2-codex",
    description: "Frontier agentic coding model.",
  },
  {
    slug: "gpt-5.1-codex-max",
    displayName: "gpt-5.1-codex-max",
    description: "Codex-optimized flagship for deep and fast reasoning.",
  },
  {
    slug: "gpt-5.4-mini",
    displayName: "GPT-5.4-Mini",
    description: "Smaller frontier agentic coding model.",
  },
  {
    slug: "gpt-5.3-codex",
    displayName: "gpt-5.3-codex",
    description: "Frontier Codex-optimized agentic coding model.",
  },
  {
    slug: "gpt-5.2",
    displayName: "gpt-5.2",
    description: "Optimized for professional work and long-running agents",
  },
  {
    slug: "gpt-5.1-codex-mini",
    displayName: "gpt-5.1-codex-mini",
    description: "Optimized for codex. Cheaper, faster, but less capable.",
  },
];

export function getCodexModels(): CodexModel[] {
  try {
    if (!fs.existsSync(MODELS_CACHE_PATH)) return FALLBACK_MODELS;
    const raw = fs.readFileSync(MODELS_CACHE_PATH, "utf-8");
    const cache = JSON.parse(raw);
    if (!Array.isArray(cache?.models) || cache.models.length === 0) {
      return FALLBACK_MODELS;
    }
    return cache.models
      .filter((m: Record<string, unknown>) => m.slug !== "codex-auto-review")
      .map((m: Record<string, unknown>) => ({
        slug: m.slug as string,
        displayName: (m.display_name || m.slug) as string,
        description: (m.description || "") as string,
      }));
  } catch {
    return FALLBACK_MODELS;
  }
}

function parseDeviceAuthOutput(output: string) {
  const cleaned = stripAnsi(output);
  const authUrl = cleaned.includes(DEVICE_AUTH_URL) ? DEVICE_AUTH_URL : null;
  const code = cleaned.match(DEVICE_CODE_REGEX)?.[0] ?? null;

  return { authUrl, code };
}

function clearPendingLoginAfterDelay(process: ReturnType<typeof spawn>) {
  setTimeout(() => {
    if (pendingLogin?.process === process) {
      pendingLogin = null;
    }
  }, 1_000);
}

export async function startCodexDeviceLogin(): Promise<CodexDeviceAuth> {
  if (!isCodexInstalled()) {
    throw new Error(
      "未检测到 Codex CLI。请先安装官方 Codex CLI，再在此处登录。"
    );
  }

  if (pendingLogin && !pendingLogin.exited) {
    if (pendingLogin.authUrl && pendingLogin.code) {
      return {
        authUrl: pendingLogin.authUrl,
        code: pendingLogin.code,
      };
    }
  }

  return new Promise<CodexDeviceAuth>((resolve, reject) => {
    const process = spawn("codex", ["login", "--device-auth"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: getCodexEnv(),
    });

    pendingLogin = {
      process,
      authUrl: null,
      code: null,
      stderr: "",
      stdout: "",
      startedAt: Date.now(),
      exited: false,
      exitCode: null,
    };

    let resolved = false;

    const maybeResolve = () => {
      if (
        !resolved &&
        pendingLogin?.process === process &&
        pendingLogin.authUrl &&
        pendingLogin.code
      ) {
        resolved = true;
        resolve({
          authUrl: pendingLogin.authUrl,
          code: pendingLogin.code,
        });
      }
    };

    process.stdout.on("data", (chunk: Buffer) => {
      if (!pendingLogin || pendingLogin.process !== process) return;
      pendingLogin.stdout += stripAnsi(chunk.toString());
      const parsed = parseDeviceAuthOutput(pendingLogin.stdout);
      if (parsed.authUrl) pendingLogin.authUrl = parsed.authUrl;
      if (parsed.code) pendingLogin.code = parsed.code;
      maybeResolve();
    });

    process.stderr.on("data", (chunk: Buffer) => {
      if (!pendingLogin || pendingLogin.process !== process) return;
      pendingLogin.stderr += stripAnsi(chunk.toString());
    });

    process.on("error", (error) => {
      if (!resolved) {
        reject(new Error(`无法启动 Codex CLI 登录：${error.message}`));
      }
      clearPendingLoginAfterDelay(process);
    });

    process.on("close", (exitCode) => {
      if (pendingLogin?.process === process) {
        pendingLogin.exited = true;
        pendingLogin.exitCode = exitCode;
      }

      if (!resolved) {
        const output = `${pendingLogin?.stdout ?? ""}\n${pendingLogin?.stderr ?? ""}`;
        reject(new Error(parseCodexError(output, exitCode)));
      }

      clearPendingLoginAfterDelay(process);
    });
  });
}

function parseCodexExecEvent(line: string): CodexExecEvent | null {
  try {
    const parsed = JSON.parse(line) as CodexExecEvent;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function extractAgentMessageText(event: CodexExecEvent | null): string | null {
  if (
    event?.type === "item.completed" &&
    event.item?.type === "agent_message" &&
    typeof event.item.text === "string"
  ) {
    return event.item.text;
  }

  return null;
}

export async function runCodexPrompt(
  prompt: string,
  options?: {
    cwd?: string;
    model?: string;
    abortSignal?: AbortSignal;
    onEvent?: (event: CodexExecEvent) => void;
  }
): Promise<string> {
  if (!isCodexInstalled()) {
    throw new Error("未检测到 Codex CLI。请先安装官方 Codex CLI。");
  }

  const status = getCodexStatus();
  if (!status.authenticated) {
    throw new Error("Codex CLI 尚未登录。请先在设置页完成 Codex 登录。");
  }

  const args = [
    "exec",
    "--json",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "-C",
    options?.cwd || process.cwd(),
  ];

  if (options?.model) {
    args.push("-m", options.model);
  }

  args.push("-");

  return new Promise<string>((resolve, reject) => {
    const child = spawn("codex", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: getCodexEnv(),
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let finalText = "";
    let settled = false;

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };

    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      resolve(text);
    };

    const consumeStdout = (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();

      while (stdoutBuffer.includes("\n")) {
        const newlineIndex = stdoutBuffer.indexOf("\n");
        const line = stdoutBuffer.slice(0, newlineIndex).trim();
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

        if (!line) continue;

        const event = parseCodexExecEvent(line);
        if (event) {
          options?.onEvent?.(event);
        }

        const maybeText = extractAgentMessageText(event);
        if (maybeText) {
          finalText = maybeText;
        }
      }
    };

    child.stdout.on("data", consumeStdout);

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer += stripAnsi(chunk.toString());
    });

    child.on("error", (error) => {
      fail(`无法启动 Codex CLI：${error.message}`);
    });

    child.on("close", (exitCode) => {
      if (stdoutBuffer.trim()) {
        const event = parseCodexExecEvent(stdoutBuffer.trim());
        if (event) {
          options?.onEvent?.(event);
        }

        const maybeText = extractAgentMessageText(event);
        if (maybeText) {
          finalText = maybeText;
        }
      }

      if (exitCode === 0 && finalText.trim()) {
        finish(finalText.trim());
        return;
      }

      const output = `${stdoutBuffer}\n${stderrBuffer}`;
      fail(parseCodexError(output, exitCode));
    });

    if (options?.abortSignal) {
      options.abortSignal.addEventListener("abort", () => {
        child.kill();
        fail("Codex CLI 请求已取消。");
      });
    }

    child.stdin.write(prompt);
    child.stdin.end();
  });
}
