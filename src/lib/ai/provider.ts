import { createOpenAI } from "@ai-sdk/openai";
import { getSetting } from "@/lib/db/init";

let cachedProvider: ReturnType<typeof createOpenAI> | null = null;
let cachedKey: string | null = null;

export async function getOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY || (await getSetting("openai_api_key"));

  if (!apiKey) {
    throw new Error("OpenAI API key not configured. Please set it in Settings.");
  }

  if (cachedProvider && cachedKey === apiKey) {
    return cachedProvider;
  }

  cachedProvider = createOpenAI({ apiKey });
  cachedKey = apiKey;
  return cachedProvider;
}

export async function getModel(modelId?: string) {
  const provider = await getOpenAIProvider();
  const model = modelId || (await getSetting("openai_model")) || "gpt-4o";
  return provider(model);
}
