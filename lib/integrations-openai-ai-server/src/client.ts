import OpenAI from "openai";

/**
 * Shared OpenAI-compatible client for the local model server.
 *
 * This project is configured to talk ONLY to a local OpenAI-compatible server
 * (Ollama by default). It must never be pointed at a hosted cloud endpoint.
 * Configuration is read lazily so that importing this module never throws when
 * the local model server has not been configured or is temporarily down; the
 * caller receives an explicit "local model unavailable" error instead.
 */
function resolveBaseUrl(): string {
  return process.env.LLM_BASE_URL ?? "http://host.docker.internal:11434/v1";
}

function resolveApiKey(): string {
  return process.env.LLM_API_KEY ?? "ollama";
}

let cachedClient: { client: OpenAI; baseURL: string; apiKey: string } | null = null;

export function getOpenAIClient(): OpenAI {
  const baseURL = resolveBaseUrl();
  const apiKey = resolveApiKey();

  if (!cachedClient || cachedClient.baseURL !== baseURL || cachedClient.apiKey !== apiKey) {
    cachedClient = { client: new OpenAI({ apiKey, baseURL }), baseURL, apiKey };
  }

  return cachedClient.client;
}

/**
 * Backwards-compatible named export. Accessing a method on this proxy resolves
 * the lazily-configured local client on first use.
 */
export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    return Reflect.get(getOpenAIClient(), prop, receiver);
  },
});
