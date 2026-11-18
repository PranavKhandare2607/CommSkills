# CommSkills — Replit → Fully Local Docker Migration Plan

Status: implementation in progress (this file is updated as work completes).
Target host: Windows 11 laptop + Docker Desktop (WSL 2 backend).

## 1. Existing architecture (verified from the extracted repository)

This is a **pnpm workspace monorepo** (Node.js 24, TypeScript 5.9, lockfileVersion 9.0).

| Package | Path | Role |
|---|---|---|
| `@workspace/communication-skills` | `artifacts/communication-skills` | React 19 + Vite + Tailwind 4 UI (dashboard, Buddy, analyzer, grammar, 7 C's, speaking, vocabulary, AI Companion, resources, games, landing, pricing, sign-in/up) |
| `@workspace/api-server` | `artifacts/api-server` | Express 5 API, esbuild bundle, `PORT` required, mounted at `/api` |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox` | Separate component-preview artifact (preserved, not used by the app) |
| `@workspace/db` | `lib/db` | Drizzle ORM + `pg` Pool, schema in `src/schema`, requires `DATABASE_URL` at import |
| `@workspace/api-spec` | `lib/api-spec` | Source-of-truth OpenAPI 3.1 (`openapi.yaml`) + Orval codegen |
| `@workspace/api-zod` | `lib/api-zod` | **Generated** Zod schemas (`src/generated`) |
| `@workspace/api-client-react` | `lib/api-client-react` | **Generated** React Query hooks (`src/generated`) |
| `@workspace/integrations-openai-ai-server` | `lib/integrations-openai-ai-server` | OpenAI SDK wrapper (import-time credential throws) |
| `@workspace/integrations-openai-ai-react` | `lib/integrations-openai-ai-react` | Unused browser audio helpers |

### Runtime entry points (current)
- UI dev/build: Vite, `vite.config.ts` **throws** unless `PORT` and `BASE_PATH` are set; always loads `@replit/vite-plugin-runtime-error-modal`; conditionally loads Replit cartographer / dev-banner when `REPL_ID` is set.
- API: `src/index.ts` **throws** unless `PORT` is set. `src/app.ts` mounts Clerk proxy + `clerkMiddleware`.
- DB: `lib/db/src/index.ts` **throws** unless `DATABASE_URL` is set (Replit provisioned it).
- AI: `lib/integrations-openai-ai-server/src/client.ts` **throws at import** unless `AI_INTEGRATIONS_OPENAI_BASE_URL` / `AI_INTEGRATIONS_OPENAI_API_KEY` are set. Routes hard-code `gpt-5.2`, `gpt-5-mini`, `gpt-audio-mini`.
- Auth: Clerk (`@clerk/react` in UI, `@clerk/express` + proxy middleware in API). `requireAuth` also enables a `development_guest` user in `NODE_ENV=development`.
- Speech in: browser `SpeechRecognition` in `AIAssistant.tsx`, `Talk.tsx`, `Companion.tsx` (browser implementation calls Google's servers).
- Speech out: `/api/companion/speak` calls hosted `gpt-audio-mini`; some pages use `speechSynthesis`.
- Fonts: Google Fonts `@import` in `src/index.css` and `<link>` in `index.html`.

### Baseline (captured before edits)
- `pnpm install --frozen-lockfile`: OK (after installing pnpm 10.34.6).
- `pnpm run typecheck`: **FAILS** (pre-existing):
  - `lib/api-zod/src/index.ts` TS2308 ambiguity (`export *` of `generated/api` + `generated/types` share 4 names).
  - `lib/integrations-openai-ai-server` TS2688 `Cannot find type definition file for 'node'` (missing `@types/node`); `p-retry` `AbortError` misuse; `image/client.ts` possibly-undefined.
  - `lib/integrations-openai-ai-react` TS2307 `Cannot find module 'react'`.
- `@workspace/api-server` typecheck fails downstream of the above (TS6305 / missing exports).
- `@workspace/communication-skills` typecheck: **PASSES**.
- Vite build: **FAILS** — `@rollup/rollup-win32-x64-msvc` missing because `pnpm-workspace.yaml` overrides set every `rollup`/`esbuild`/`lightningcss`/`oxide` platform binary to `-` (a Replit/Linux-only hack). Docker on Linux would fail the same way (`@rollup/rollup-linux-x64-gnu` also `-`).
- `node v24.18.0`, Docker 29.6.2, Compose v5.3.1, Ollama 0.40.1 present.

## 2. External-dependency audit (must be zero at runtime)

| Dependency | Where | Disposition |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL`, `@clerk/*` | `App.tsx`, `SignIn/SignUp`, `app.ts`, `requireAuth.ts`, `clerkProxyMiddleware.ts` | **Removed** → local auth |
| `CLERK_*`, `REPL_ID`, Replit secrets/DB | Vite config, `.replit` | **Removed** from local path |
| `AI_INTEGRATIONS_OPENAI_*`, `gpt-5.2/5-mini/audio-mini` | integrations lib + all AI routes | **Replaced** by local Ollama adapter |
| api.openai.com audio | `/api/companion/speak` | **Replaced** by local Piper TTS |
| Browser `SpeechRecognition` | 3 pages | **Replaced** by local faster-whisper |
| Google Fonts | `index.css`, `index.html` | **Removed** → system font stack |
| `@replit/vite-plugin-*` | `vite.config.ts`, artifact `package.json` | **Removed** from local path |
| Stripe/checkout | `Pricing.tsx` alert only | **Replaced** with local-mode copy |
| WhatsApp help link | `AppLayout.tsx` | **Kept** (explicit user-clicked link only) |
| Local images/assets | `public/`, `src/assets/` | **Kept** |

The only permitted non-local network traffic is (a) one-time package/image/model downloads and (b) the API container reaching the **host** Ollama at `host.docker.internal` — local-machine traffic.

## 3. Target local Docker architecture

```
Browser ── http://localhost:3000 ──► web (nginx :80, published 3000)
                                      │  /        → static Vite build (SPA fallback index.html)
                                      │  /api/    → proxy → api:8080
                                      ▼
                                    api (Express 5, :8080, health /api/healthz)
                                      │  DATABASE_URL → db:5432
                                      │  LLM_BASE_URL → host.docker.internal:11434/v1  (host Ollama)
                                      │  STT_URL     → http://stt:8000
                                      │  TTS_URL     → http://tts:5000
                                      ▼
                        ┌─────────────┼───────────────┐───────────────┐
                        ▼             ▼               ▼               ▼
                      db           stt             tts            (Ollama on host)
                 postgres:16   faster-whisper    Piper TTS       qwen3-coder:30b
                 vol pgdata    vol stt-models    vol tts-voices  (OpenAI-compatible /v1)
```

- Private compose network; only `web` publishes a port (3000→80). `db` publishes **nothing** by default.
- Named volumes: `pgdata`, `stt_models`, `tts_voices`.
- Health checks: `pg_isready` (db), `GET /health` (stt, tts), `GET /api/healthz` (api). `depends_on` uses health conditions; no arbitrary sleeps.
- Ollama stays on the host (keeps GPU/CPU native performance); no LAN exposure, no firewall changes. If unavailable, the API returns an explicit `local-model-unavailable` error and the UI shows a local-AI status banner. No cloud fallback.
- Optional `ollama` compose **profile** documented for CPU-only fallback (not enabled by default).

## 4. Environment variables (`.env.example`)

`COMPOSE_PROJECT_NAME`, `POSTGRES_USER/PASSWORD/DB`, `DATABASE_URL`, `PORT`, `APP_ORIGIN`,
`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_CHAT_MODEL`, `LLM_REQUEST_TIMEOUT_MS`,
`STT_URL`, `STT_MODEL`, `STT_DEVICE`, `STT_COMPUTE_TYPE`, `STT_DEFAULT_LANGUAGE`, `STT_MAX_UPLOAD_MB`,
`TTS_URL`, `TTS_VOICE_EN`, `TTS_VOICE_HI`, `TTS_MAX_CHARS`,
`SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`, `COOKIE_SECURE`, `LOCAL_PREMIUM_MODE`, `LOG_LEVEL`.

No secrets are committed; `LLM_API_KEY=ollama` is a local placeholder.

## 5. Migration decisions

1. **Workspace overrides** — remove the `-` exclusions for `rollup`/`esbuild`/`lightningcss`/`oxide` platform binaries so Windows and Linux both resolve native binaries; regenerate lockfile.
2. **Fix generated/lib typecheck** — `api-zod` index uses `export type *` for the type-only barrel; add missing `@types/node` / react dev deps; fix `p-retry` `AbortError`, `image/client.ts` undefined guards; remove import-time credential throws.
3. **Local auth** — `users` + `sessions` tables; passwords via `crypto.scrypt`; random opaque token in an `HttpOnly`, `SameSite=Lax` cookie; only a SHA-256 token hash is stored; revocable/expiring sessions; `/api/auth/{register,login,logout,me}`. Replaces Clerk everywhere. No shared guest identity.
4. **Ownership** — `conversations.userId` added; every conversation/message/progress/usage/subscription query scoped to the authenticated user. Members-only routes call `requireAuth`.
5. **Migrations** — `lib/db` gains `drizzle/` SQL migrations generated with `drizzle-kit generate` and a `runMigrations()` runner (`drizzle-orm/node-postgres/migrator`) invoked once at API startup after DB health. No `push-force`.
6. **Single LLM adapter** — `artifacts/api-server/src/lib/llm.ts` wraps the OpenAI SDK pointed only at `LLM_BASE_URL`. Lazy config (no import-time throw), `chatText`, `chatJson` (JSON extraction + Zod validation + one corrective retry), `chatStream` (SSE, abort on client disconnect). All AI routes use it.
7. **STT service** — Python + FastAPI + `faster-whisper` (`WhisperModel(model, device=cpu, compute_type=int8)`), `POST /transcribe`, `GET /health`, HF cache on a named volume, one-time prefetch script. API proxies `/api/transcribe`.
8. **TTS service** — Python + Flask + `piper-tts`, verified `en_US` female + `hi_IN` female voice `.onnx` assets, `POST /speak` (WAV), `GET /health`, voices on a named volume. `/api/companion/speak` proxies it. Browser `speechSynthesis` remains an explicit local fallback.
9. **Frontend** — local `AuthProvider`/`useAuth`; new design-matched `SignIn`/`SignUp` forms; `ProtectedRoute` redirects preserving intended route; sign-out in `AppLayout`; shared `useLocalRecorder` hook (MediaRecorder → `/api/transcribe`) replacing `SpeechRecognition`; system fonts; Replit copy replaced with browser/local troubleshooting; local AI status banner.
10. **Ops** — Dockerfiles (api/web/stt/tts), nginx SPA+proxy config, `.dockerignore`, `.gitignore` additions, `scripts/prefetch-models.ps1`, `scripts/check-local.ps1`, `LOCAL_SETUP.md`.

## 6. Test plan (must actually run)

- `pnpm install --frozen-lockfile`; `pnpm run typecheck`; `pnpm run build`.
- `docker compose config --quiet`; `docker compose build`.
- Clean `docker compose up -d` → db/stt/tts/api healthy without any Replit/Clerk secrets.
- `GET /api/healthz` and readiness diagnostics show Ollama/STT/TTS status.
- Register → login → refresh protected route → logout; second account cannot read first account's conversations/progress.
- Buddy conversation create/stream/save/reload/delete through Ollama.
- Grammar, vocabulary, analyze, speaking, companion respond/score/feedback return validated JSON.
- STT transcribes a sample recording; TTS returns playable WAV; camera preview on localhost.
- Restart containers → Postgres + model volumes persist; `docker compose down -v` documented as destructive.
- Grep active source + built assets for Replit/Clerk/OpenAI/remote-font references.
- Honest offline note: first-time downloads require internet; record which offline checks were actually run.

## 7. Honest limitations (expected)
- `qwen3-coder:30b` is a coding model; chat/JSON quality and speed will be workable but not tuned for coaching. A general instruct model (e.g. a current Qwen/Llama instruct tag) can be set via `LLM_CHAT_MODEL`.
- Piper has no Indian-accent English voice; `en_US-amy-medium` is used for English and `hi_IN-priyamvada-medium` for Hindi. Hinglish uses the English voice as a documented best-effort.
- faster-whisper on CPU is not true streaming; the UI uses press-to-talk/tap-to-record turn taking.
- Camera "analysis" remains heuristic (posture timer), not computer vision.
