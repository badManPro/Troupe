import { spawn, spawnSync } from "child_process";
import { getSetting } from "@/lib/db/init";
import {
  extractClaudeFinalText,
  extractClaudeTextDelta,
  getClaudeTransportState,
  normalizeClaudeExecutionMode,
  parseClaudeAuthStatus,
  parseClaudeCliJsonLine,
  resolveClaudeTransport,
  type ClaudeExecutionMode,
} from "@/lib/ai/claude-cli-utils";

const ANSI_ESCAPE_REGEX = /\u001B\[[0-9;]*m/g;

export interface ClaudeCliStatus {
  installed: boolean;
  authenticated: boolean;
  version: string | null;
  authMethod: string | null;
  apiProvider: string | null;
}

interface ClaudePromptOptions {
  cwd?: string;
  model?: string;
  systemPrompt?: string;
  abortSignal?: AbortSignal;
}

interface ClaudeStreamPromptOptions extends ClaudePromptOptions {
  onTextDelta?: (delta: string) => void;
  onEvent?: (event: Record<string, unknown>) => void;
}

function stripAnsi(value: string) {
  return value.replace(ANSI_ESCAPE_REGEX, "");
}

function getClaudeCliEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    TERM:
      process.env.TERM && process.env.TERM !== "dumb"
        ? process.env.TERM
        : "xterm-256color",
  };
}

function getClaudeVersion() {
  try {
    const result = spawnSync("claude", ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    if (result.error || result.status !== 0) {
      return null;
    }

    return stripAnsi(result.stdout).trim() || null;
  } catch {
    return null;
  }
}

export function isClaudeCliInstalled() {
  return !!getClaudeVersion();
}

function buildClaudeArgs(
  prompt: string,
  options: ClaudePromptOptions,
  outputFormat: "json" | "stream-json"
) {
  const args = [
    "-p",
    "--output-format",
    outputFormat,
    "--tools",
    "",
    "--no-session-persistence",
  ];

  if (outputFormat === "stream-json") {
    args.push("--verbose", "--include-partial-messages");
  }

  if (options.model) {
    args.push("--model", options.model);
  }

  if (options.systemPrompt) {
    args.push("--system-prompt", options.systemPrompt);
  }

  args.push(prompt);
  return args;
}

function parseClaudeCliError(output: string, exitCode: number | null) {
  const cleaned = stripAnsi(output).trim();

  if (!cleaned) {
    return `Claude CLI 执行失败${exitCode !== null ? `（退出码 ${exitCode}）` : ""}`;
  }

  if (
    cleaned.includes("Please run `claude auth login`") ||
    cleaned.includes("Not logged in")
  ) {
    return "Claude CLI 尚未登录。请先在本机完成 `claude auth login`。";
  }

  return cleaned;
}

export function getClaudeCliStatus(): ClaudeCliStatus {
  const version = getClaudeVersion();
  if (!version) {
    return {
      installed: false,
      authenticated: false,
      version: null,
      authMethod: null,
      apiProvider: null,
    };
  }

  try {
    const result = spawnSync("claude", ["auth", "status", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: getClaudeCliEnv(),
    });

    const parsed = parseClaudeAuthStatus(
      `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    );

    return {
      installed: true,
      authenticated: parsed?.loggedIn === true,
      version,
      authMethod: parsed?.authMethod ?? null,
      apiProvider: parsed?.apiProvider ?? null,
    };
  } catch {
    return {
      installed: true,
      authenticated: false,
      version,
      authMethod: null,
      apiProvider: null,
    };
  }
}

export async function getClaudeExecutionMode(): Promise<ClaudeExecutionMode> {
  return normalizeClaudeExecutionMode(await getSetting("claude_execution_mode"));
}

export async function getClaudeTransportInfo() {
  const cliStatus = getClaudeCliStatus();
  const executionMode = await getClaudeExecutionMode();
  const transportState = getClaudeTransportState(executionMode, {
    installed: cliStatus.installed,
    authenticated: cliStatus.authenticated,
  });

  return {
    executionMode,
    cliStatus,
    ...transportState,
  };
}

export async function getResolvedClaudeTransport() {
  const executionMode = await getClaudeExecutionMode();
  const status = getClaudeCliStatus();
  return resolveClaudeTransport(executionMode, {
    installed: status.installed,
    authenticated: status.authenticated,
  });
}

export async function runClaudePrompt(
  prompt: string,
  options: ClaudePromptOptions = {}
): Promise<string> {
  const status = getClaudeCliStatus();
  resolveClaudeTransport("cli", {
    installed: status.installed,
    authenticated: status.authenticated,
  });

  const args = buildClaudeArgs(prompt, options, "json");

  return new Promise<string>((resolve, reject) => {
    const child = spawn("claude", args, {
      cwd: options.cwd || process.cwd(),
      env: getClaudeCliEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let settled = false;

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(message));
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer += stripAnsi(chunk.toString());
    });

    child.on("error", (error) => {
      fail(`无法启动 Claude CLI：${error.message}`);
    });

    child.on("close", (exitCode) => {
      if (exitCode !== 0) {
        fail(parseClaudeCliError(`${stdoutBuffer}\n${stderrBuffer}`, exitCode));
        return;
      }

      try {
        const parsed = JSON.parse(stdoutBuffer.trim()) as Record<string, unknown>;
        const result =
          typeof parsed.result === "string" ? parsed.result.trim() : null;

        if (!result) {
          fail("Claude CLI 未返回可用文本结果。");
          return;
        }

        if (!settled) {
          settled = true;
          resolve(result);
        }
      } catch {
        fail(parseClaudeCliError(`${stdoutBuffer}\n${stderrBuffer}`, exitCode));
      }
    });

    if (options.abortSignal) {
      options.abortSignal.addEventListener(
        "abort",
        () => {
          child.kill();
          fail("Claude CLI 请求已取消。");
        },
        { once: true }
      );
    }
  });
}

export async function streamClaudePrompt(
  prompt: string,
  options: ClaudeStreamPromptOptions = {}
) {
  const status = getClaudeCliStatus();
  resolveClaudeTransport("cli", {
    installed: status.installed,
    authenticated: status.authenticated,
  });

  const args = buildClaudeArgs(prompt, options, "stream-json");

  return new Promise<string>((resolve, reject) => {
    const child = spawn("claude", args, {
      cwd: options.cwd || process.cwd(),
      env: getClaudeCliEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    let stderrBuffer = "";
    let finalText = "";
    let streamedText = "";
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

    const consumeLine = (line: string) => {
      const event = parseClaudeCliJsonLine(line);
      if (!event) return;

      options.onEvent?.(event);

      const delta = extractClaudeTextDelta(event);
      if (delta) {
        streamedText += delta;
        options.onTextDelta?.(delta);
      }

      const maybeFinalText = extractClaudeFinalText(event);
      if (maybeFinalText) {
        finalText = maybeFinalText;
      }
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();

      while (stdoutBuffer.includes("\n")) {
        const newlineIndex = stdoutBuffer.indexOf("\n");
        const line = stdoutBuffer.slice(0, newlineIndex);
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        consumeLine(line);
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer += stripAnsi(chunk.toString());
    });

    child.on("error", (error) => {
      fail(`无法启动 Claude CLI：${error.message}`);
    });

    child.on("close", (exitCode) => {
      if (stdoutBuffer.trim()) {
        consumeLine(stdoutBuffer);
      }

      if (exitCode !== 0) {
        fail(parseClaudeCliError(`${stdoutBuffer}\n${stderrBuffer}`, exitCode));
        return;
      }

      const text = finalText.trim() || streamedText.trim();
      if (!text) {
        fail("Claude CLI 未返回可用文本结果。");
        return;
      }

      finish(text);
    });

    if (options.abortSignal) {
      options.abortSignal.addEventListener(
        "abort",
        () => {
          child.kill();
          fail("Claude CLI 请求已取消。");
        },
        { once: true }
      );
    }
  });
}
