import { OpenAI } from "openai";

/**
 * Local LLM adapter.
 *
 * Talks ONLY to an OpenAI-compatible server (Ollama by default) reached via
 * LLM_BASE_URL. Configuration is read lazily so importing this module never
 * throws when the local model server is down; callers receive an explicit
 * LlmUnavailableError instead, and there is no cloud fallback.
 */

export class LlmUnavailableError extends Error {
  kind: "unavailable" = "unavailable";
  constructor(message: string) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

/**
 * Ollama keeps a model in memory for a short period after the last request,
 * which makes the first request after an idle spell painfully slow on CPU.
 * We ask Ollama to pin the configured model indefinitely and warm it at boot.
 */
const KEEP_MODEL_LOADED = -1;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getLlmConfig(): LlmConfig {
  return {
    baseUrl: process.env.LLM_BASE_URL ?? "http://host.docker.internal:11434/v1",
    apiKey: process.env.LLM_API_KEY ?? "ollama",
    model: process.env.LLM_CHAT_MODEL ?? "commskills-turbo",
    // Small local model + pinned context means requests finish in seconds.
    timeoutMs: envNumber("LLM_REQUEST_TIMEOUT_MS", 120000),
  };
}

let cached: { client: OpenAI; key: string } | null = null;

export function getLlmClient(): OpenAI {
  const cfg = getLlmConfig();
  const key = `${cfg.baseUrl}|${cfg.apiKey}|${cfg.timeoutMs}`;
  if (!cached || cached.key !== key) {
    cached = {
      client: new OpenAI({ baseURL: cfg.baseUrl, apiKey: cfg.apiKey, timeout: cfg.timeoutMs }),
      key,
    };
  }
  return cached.client;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatJsonParams {
  system?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

interface SchemaLike<T> {
  safeParse(data: unknown): { success: boolean; data?: T };
}

// Short-lived cache for identical analysis/lookup prompts. Repeat submissions
// and double-clicks return instantly instead of re-running the CPU model.
const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;
const RESPONSE_CACHE_MAX = 200;
const responseCache = new Map<string, { value: unknown; expires: number }>();

function cacheKey(cfg: LlmConfig, params: ChatJsonParams): string {
  return JSON.stringify([
    cfg.model,
    params.system ?? "",
    params.messages,
    params.maxTokens ?? 4096,
    params.temperature ?? 0.7,
  ]);
}

function isUnavailable(err: any): boolean {
  return (
    err?.code === "ECONNREFUSED" ||
    err?.code === "ENOTFOUND" ||
    err?.kind === "unavailable" ||
    /fetch failed|connection refused|ENOTFOUND|ECONNREFUSED/i.test(err?.message ?? "")
  );
}

function parseJsonLoose(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Invalid JSON from local model");
  }
}

/**
 * Single-shot JSON completion. Extracts JSON from the response, then (if a
 * schema is supplied) validates it. Returns the parsed value.
 */
export async function chatJson<T = any>(
  params: ChatJsonParams,
  schema?: SchemaLike<T>,
): Promise<T> {
  const cfg = getLlmConfig();
  const client = getLlmClient();
  const key = cacheKey(cfg, params);

  const cached = responseCache.get(key);
  if (cached) {
    if (cached.expires > Date.now()) {
      cached.expires = Date.now() + RESPONSE_CACHE_TTL_MS;
      return cached.value as T;
    }
    responseCache.delete(key);
  }

  const messages: any[] = [
    ...(params.system ? [{ role: "system", content: params.system }] : []),
    ...params.messages,
  ];

  try {
    const completion = await client.chat.completions.create(
      {
        model: cfg.model,
        max_completion_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
        messages,
        response_format: { type: "json_object" },
        keep_alive: KEEP_MODEL_LOADED,
      } as any,
      { signal: params.signal },
    );

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = parseJsonLoose(raw);

    let result: T;
    if (schema) {
      const validated = schema.safeParse(parsed);
      if (!validated.success || validated.data === undefined) {
        throw new Error("Local model JSON failed schema validation");
      }
      result = validated.data;
    } else {
      result = parsed as T;
    }

    if (responseCache.size >= RESPONSE_CACHE_MAX) {
      const oldest = responseCache.keys().next().value;
      if (oldest !== undefined) responseCache.delete(oldest);
    }
    responseCache.set(key, {
      value: result,
      expires: Date.now() + RESPONSE_CACHE_TTL_MS,
    });
    return result;
  } catch (err) {
    if (isUnavailable(err)) {
      throw new LlmUnavailableError("Local LLM unavailable. Check Ollama is running.");
    }
    throw err;
  }
}

export interface StreamChatParams {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  onContent: (delta: string) => void;
}

/** Streaming text completion, emitting incremental content deltas. */
export async function streamChat(params: StreamChatParams): Promise<void> {
  const cfg = getLlmConfig();
  const client = getLlmClient();

  try {
    const stream = await client.chat.completions.create(
      {
        model: cfg.model,
        max_completion_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
        messages: params.messages as any,
        stream: true,
        keep_alive: KEEP_MODEL_LOADED,
      } as any,
      { signal: params.signal },
    );

    for await (const chunk of stream as any) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) params.onContent(content);
    }
  } catch (err) {
    if (isUnavailable(err)) {
      throw new LlmUnavailableError("Local LLM unavailable. Check Ollama is running.");
    }
    throw err;
  }
}

export interface LlmStatus {
  ok: boolean;
  model: string;
  baseUrl: string;
  error?: string;
}

export async function getLlmStatus(): Promise<LlmStatus> {
  const cfg = getLlmConfig();
  try {
    // Health checks must not inherit the (much longer) generation timeout.
    const client = new OpenAI({
      baseURL: cfg.baseUrl,
      apiKey: cfg.apiKey,
      timeout: 2000,
      maxRetries: 0,
    });
    const models = await client.models.list();
    const hasModel = models.data.some(
      (m: any) => m.id === cfg.model || m.id === `${cfg.model}:latest`,
    );
    return {
      ok: hasModel,
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      error: hasModel
        ? undefined
        : `Model "${cfg.model}" not found in Ollama. Available: ${models.data
            .map((m: any) => m.id)
            .join(", ")}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      error: `Cannot reach Ollama: ${err?.message ?? err}`,
    };
  }
}

/**
 * Ask Ollama to load and pin the configured model at startup so the first real
 * user request never pays the cold-load cost.
 */
export async function warmLlm(): Promise<void> {
  const cfg = getLlmConfig();
  try {
    const client = new OpenAI({
      baseURL: cfg.baseUrl,
      apiKey: cfg.apiKey,
      timeout: 30000,
      maxRetries: 0,
    });
    await client.chat.completions.create({
      model: cfg.model,
      messages: [{ role: "user", content: "ok" }],
      max_completion_tokens: 1,
      keep_alive: KEEP_MODEL_LOADED,
    } as any);
  } catch {
    // Ollama may be starting separately; requests will still work once it is up.
  }
}
