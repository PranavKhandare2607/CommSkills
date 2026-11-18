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
    model: process.env.LLM_CHAT_MODEL ?? "qwen3-coder:30b",
    // Cold-loading a large local model can take several minutes on CPU, so the
    // default is intentionally generous (10 min). Override per machine.
    timeoutMs: envNumber("LLM_REQUEST_TIMEOUT_MS", 600000),
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
      },
      { signal: params.signal },
    );

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = parseJsonLoose(raw);

    if (schema) {
      const result = schema.safeParse(parsed);
      if (!result.success || result.data === undefined) {
        throw new Error("Local model JSON failed schema validation");
      }
      return result.data;
    }
    return parsed as T;
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
      },
      { signal: params.signal },
    );

    for await (const chunk of stream) {
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
    const client = getLlmClient();
    const models = await client.models.list();
    const hasModel = models.data.some((m: any) => m.id === cfg.model);
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
