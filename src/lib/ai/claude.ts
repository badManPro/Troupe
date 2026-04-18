import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getSetting } from "@/lib/db/init";
import { getClaudeTransportInfo } from "@/lib/ai/claude-cli";
import { getClaudeCompatibilityWarning } from "@/lib/ai/claude-errors";
import type { ClaudeExecutionMode } from "@/lib/ai/claude-cli-utils";

const CLAUDE_HOME = path.join(os.homedir(), ".claude");
const CLAUDE_SETTINGS_PATH = path.join(CLAUDE_HOME, "settings.json");
const CLAUDE_STATE_PATH = path.join(os.homedir(), ".claude.json");

export interface ClaudeModel {
  slug: string;
  displayName: string;
  description: string;
}

export interface ClaudeStatus {
  configured: boolean;
  configPath: string;
  baseUrl: string | null;
  normalizedBaseUrl: string | null;
  hasAuthToken: boolean;
  hasApiKey: boolean;
  executionMode: ClaudeExecutionMode;
  effectiveTransport: "cli" | "api" | null;
  executionError: string | null;
  cliInstalled: boolean;
  cliAuthenticated: boolean;
  cliVersion: string | null;
  cliAuthMethod: string | null;
  cliApiProvider: string | null;
  compatibilityWarning: string | null;
  detectedModels: ClaudeModel[];
  defaultModel: string;
}

interface ClaudeSettingsFile {
  env?: {
    ANTHROPIC_BASE_URL?: string;
    ANTHROPIC_AUTH_TOKEN?: string;
    ANTHROPIC_API_KEY?: string;
  };
}

interface ClaudeProjectState {
  lastModelUsage?: Record<string, unknown>;
}

interface ClaudeStateFile {
  projects?: Record<string, ClaudeProjectState>;
}

interface ClaudeConfig {
  baseURL: string | null;
  rawBaseURL: string | null;
  authToken: string | null;
  apiKey: string | null;
}

const MODEL_METADATA: Record<string, Omit<ClaudeModel, "slug">> = {
  "claude-sonnet-4-6": {
    displayName: "Claude Sonnet 4.6",
    description: "优先推荐，适合主对话、文档生成和复杂推理。",
  },
  "claude-haiku-4-5-20251001": {
    displayName: "Claude Haiku 4.5",
    description: "响应更快，适合轻量任务和低成本场景。",
  },
};

const FALLBACK_MODELS = Object.entries(MODEL_METADATA).map(
  ([slug, metadata]): ClaudeModel => ({
    slug,
    ...metadata,
  })
);

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeSettingValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeClaudeBaseURL(baseURL: string | null) {
  if (!baseURL) return null;

  const trimmed = baseURL.replace(/\/+$/, "");

  // Claude Code accepts a gateway root, while AI SDK Anthropic expects the
  // Messages API prefix. Add /v1 unless the user already configured it.
  if (/\/v\d+$/i.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}/v1`;
}

function getClaudeSettingsFile() {
  return readJsonFile<ClaudeSettingsFile>(CLAUDE_SETTINGS_PATH);
}

function toClaudeModel(slug: string): ClaudeModel {
  const metadata = MODEL_METADATA[slug];
  if (metadata) {
    return { slug, ...metadata };
  }

  return {
    slug,
    displayName: slug,
    description: "从本机 Claude 使用记录检测到的模型。",
  };
}

function getDetectedClaudeModelSlugs(projectPath = process.cwd()) {
  const state = readJsonFile<ClaudeStateFile>(CLAUDE_STATE_PATH);
  const projectState = state?.projects?.[projectPath];
  const usage = projectState?.lastModelUsage;

  if (!usage) return [];

  return Object.keys(usage).filter((modelId) => modelId.startsWith("claude-"));
}

export function getClaudeModels(projectPath = process.cwd()): ClaudeModel[] {
  const seen = new Set<string>();
  const models: ClaudeModel[] = [];

  for (const slug of getDetectedClaudeModelSlugs(projectPath)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    models.push(toClaudeModel(slug));
  }

  for (const model of FALLBACK_MODELS) {
    if (seen.has(model.slug)) continue;
    seen.add(model.slug);
    models.push(model);
  }

  return models;
}

async function resolveClaudeValue(
  envKeys: string[],
  settingKey: string,
  fallback: string | null
) {
  for (const envKey of envKeys) {
    const envValue = normalizeSettingValue(process.env[envKey]);
    if (envValue) return envValue;
  }

  const savedSetting = normalizeSettingValue(await getSetting(settingKey));
  if (savedSetting) return savedSetting;

  return normalizeSettingValue(fallback);
}

export async function getClaudeConfig(): Promise<ClaudeConfig> {
  const settings = getClaudeSettingsFile();
  const env = settings?.env;

  const rawBaseURL = await resolveClaudeValue(
    ["ANTHROPIC_BASE_URL"],
    "claude_base_url",
    env?.ANTHROPIC_BASE_URL ?? null
  );

  const authToken = await resolveClaudeValue(
    ["ANTHROPIC_AUTH_TOKEN"],
    "claude_auth_token",
    env?.ANTHROPIC_AUTH_TOKEN ?? null
  );

  const apiKey = await resolveClaudeValue(
    ["ANTHROPIC_API_KEY"],
    "claude_api_key",
    env?.ANTHROPIC_API_KEY ?? null
  );

  return {
    rawBaseURL,
    baseURL: normalizeClaudeBaseURL(rawBaseURL),
    authToken,
    apiKey,
  };
}

export async function getClaudeModelId(modelId?: string) {
  if (modelId) return modelId;

  const savedModel = normalizeSettingValue(await getSetting("claude_model"));
  if (savedModel) return savedModel;

  return getClaudeModels()[0]?.slug ?? "claude-sonnet-4-6";
}

export async function getClaudeStatus(): Promise<ClaudeStatus> {
  const config = await getClaudeConfig();
  const transportInfo = await getClaudeTransportInfo();

  return {
    configured: !!config.authToken || !!config.apiKey,
    configPath: CLAUDE_SETTINGS_PATH,
    baseUrl: config.rawBaseURL,
    normalizedBaseUrl: config.baseURL,
    hasAuthToken: !!config.authToken,
    hasApiKey: !!config.apiKey,
    executionMode: transportInfo.executionMode,
    effectiveTransport: transportInfo.effectiveTransport,
    executionError: transportInfo.executionError,
    cliInstalled: transportInfo.cliStatus.installed,
    cliAuthenticated: transportInfo.cliStatus.authenticated,
    cliVersion: transportInfo.cliStatus.version,
    cliAuthMethod: transportInfo.cliStatus.authMethod,
    cliApiProvider: transportInfo.cliStatus.apiProvider,
    compatibilityWarning:
      transportInfo.effectiveTransport === "api"
        ? getClaudeCompatibilityWarning(config)
        : null,
    detectedModels: getClaudeModels(),
    defaultModel: await getClaudeModelId(),
  };
}
