import assert from "node:assert/strict";
import test from "node:test";

const {
  extractClaudeFinalText,
  extractClaudeTextDelta,
  getClaudeTransportState,
  normalizeClaudeExecutionMode,
  parseClaudeAuthStatus,
  parseClaudeCliJsonLine,
  resolveClaudeTransport,
} = await import(new URL("./claude-cli-utils.ts", import.meta.url).href);

test("normalizeClaudeExecutionMode defaults to auto for empty or invalid values", () => {
  assert.equal(normalizeClaudeExecutionMode(null), "auto");
  assert.equal(normalizeClaudeExecutionMode(""), "auto");
  assert.equal(normalizeClaudeExecutionMode("weird"), "auto");
});

test("resolveClaudeTransport prefers CLI in auto mode when CLI is available", () => {
  assert.equal(
    resolveClaudeTransport("auto", {
      installed: true,
      authenticated: true,
    }),
    "cli"
  );
});

test("resolveClaudeTransport falls back to API in auto mode when CLI is unavailable", () => {
  assert.equal(
    resolveClaudeTransport("auto", {
      installed: false,
      authenticated: false,
    }),
    "api"
  );
});

test("resolveClaudeTransport throws an actionable error when CLI mode is forced but unavailable", () => {
  assert.throws(
    () =>
      resolveClaudeTransport("cli", {
        installed: true,
        authenticated: false,
      }),
    /Claude CLI 尚未登录/
  );
});

test("getClaudeTransportState reports execution errors without throwing", () => {
  assert.deepEqual(
    getClaudeTransportState("cli", {
      installed: true,
      authenticated: false,
    }),
    {
      effectiveTransport: null,
      executionError: "Claude CLI 尚未登录。请先在本机完成 `claude auth login`。",
    }
  );
});

test("parseClaudeAuthStatus extracts auth fields from Claude CLI JSON output", () => {
  const status = parseClaudeAuthStatus(`{
    "loggedIn": true,
    "authMethod": "oauth_token",
    "apiProvider": "firstParty"
  }`);

  assert.deepEqual(status, {
    loggedIn: true,
    authMethod: "oauth_token",
    apiProvider: "firstParty",
  });
});

test("parseClaudeCliJsonLine and extraction helpers understand stream-json events", () => {
  const deltaEvent = parseClaudeCliJsonLine(
    '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"pong"}}}'
  );
  const assistantEvent = parseClaudeCliJsonLine(
    '{"type":"assistant","message":{"content":[{"type":"text","text":"pong"}]}}'
  );
  const resultEvent = parseClaudeCliJsonLine(
    '{"type":"result","result":"pong"}'
  );

  assert.equal(extractClaudeTextDelta(deltaEvent), "pong");
  assert.equal(extractClaudeFinalText(assistantEvent), "pong");
  assert.equal(extractClaudeFinalText(resultEvent), "pong");
});
