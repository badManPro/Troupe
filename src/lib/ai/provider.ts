import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { getSetting } from "@/lib/db/init";
import { getClaudeConfig, getClaudeModelId } from "@/lib/ai/claude";
import { getCodexConfigModel } from "@/lib/ai/codex";

let cachedOpenAIProvider: ReturnType<typeof createOpenAI> | null = null;
let cachedOpenAIKey: string | null = null;
let cachedClaudeProvider: ReturnType<typeof createAnthropic> | null = null;
let cachedClaudeConfigKey: string | null = null;

export async function getOpenAIProvider() {
  const apiKey =
    process.env.OPENAI_API_KEY || (await getSetting("openai_api_key"));

  if (!apiKey) {
    throw new Error("OpenAI API key not configured. Please set it in Settings.");
  }

  if (cachedOpenAIProvider && cachedOpenAIKey === apiKey) {
    return cachedOpenAIProvider;
  }

  cachedOpenAIProvider = createOpenAI({ apiKey });
  cachedOpenAIKey = apiKey;
  return cachedOpenAIProvider;
}

export async function getClaudeProvider() {
  const config = await getClaudeConfig();
  const authConfig = config.authToken
    ? { authToken: config.authToken }
    : config.apiKey
      ? { apiKey: config.apiKey }
      : null;

  if (!authConfig) {
    throw new Error(
      "Claude 鉴权未配置。请先在 ~/.claude/settings.json 或设置页中配置。"
    );
  }

  const cacheKey = JSON.stringify({
    baseURL: config.baseURL,
    ...authConfig,
  });

  if (cachedClaudeProvider && cachedClaudeConfigKey === cacheKey) {
    return cachedClaudeProvider;
  }

  cachedClaudeProvider = createAnthropic({
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    ...authConfig,
  });
  cachedClaudeConfigKey = cacheKey;
  return cachedClaudeProvider;
}

export type AiProvider = "openai" | "claude" | "codex";

export async function getActiveProvider(): Promise<AiProvider> {
  const setting = await getSetting("ai_provider");
  if (setting === "codex") return "codex";
  if (setting === "claude") return "claude";
  return "openai";
}

export async function getOpenAIModel(modelId?: string) {
  const provider = await getOpenAIProvider();
  const model = modelId || (await getSetting("openai_model")) || "gpt-4o";
  return provider.chat(model);
}

export async function getCodexModelId(modelId?: string) {
  return modelId || (await getSetting("codex_model")) || getCodexConfigModel() || "gpt-5.4";
}

export async function getClaudeModel(modelId?: string) {
  const provider = await getClaudeProvider();
  const model = await getClaudeModelId(modelId);
  return provider.chat(model);
}
