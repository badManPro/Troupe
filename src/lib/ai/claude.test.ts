import assert from "node:assert/strict";
import test from "node:test";

const { formatClaudeError, getClaudeCompatibilityWarning } = await import(
  new URL("./claude-errors.ts", import.meta.url).href
);

test("custom Claude gateway with bearer auth exposes a compatibility warning", () => {
  const warning = getClaudeCompatibilityWarning({
    rawBaseURL: "https://www.packyapi.com",
    baseURL: "https://www.packyapi.com/v1",
    authToken: "token",
    apiKey: null,
  });

  assert.match(warning ?? "", /Anthropic Messages API/i);
  assert.match(warning ?? "", /官方 Claude CLI/);
});

test("Claude CLI-only gateway errors are translated into actionable guidance", () => {
  const message = formatClaudeError(
    new Error(
      "This API endpoint is only accessible via the official Claude CLI (request id: req_123)"
    ),
    {
      rawBaseURL: "https://www.packyapi.com",
      baseURL: "https://www.packyapi.com/v1",
    }
  );

  assert.match(message, /packyapi\.com/);
  assert.match(message, /\/v1\/messages/);
  assert.match(message, /ANTHROPIC_API_KEY/);
});
