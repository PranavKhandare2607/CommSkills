---
name: Companion voice-chat latency fix
description: Why Aisha/Priya voice replies felt delayed, and the fix (sentence-chunked speech queue) so future latency work stays consistent with it.
---

The AI Companion (`Companion.tsx`) voice flow felt slow because it was strictly
sequential: the full LLM text reply (`/api/companion/respond`, SSE stream)
had to finish completely before a *separate* full-body request to
`/api/companion/speak` (non-streaming `gpt-audio` TTS) would even start. Only
after that entire audio clip was generated did playback begin. This meant the
user waited for (full LLM generation time) + (full TTS generation time) before
hearing anything.

**Fix:** speak sentence-by-sentence as text streams in, instead of waiting for
the whole reply. As SSE chunks arrive, scan the newly-arrived text for
complete sentences (regex on `.`/`!`/`?`/newline boundaries) and immediately
enqueue each finished sentence to a speech queue; a queue runner plays chunks
in order via sequential `/companion/speak` calls. This lets audio for the
first sentence start playing while the model is still generating later
sentences, cutting perceived delay substantially without touching the backend
audio-generation approach.

**Why:** the backend's custom Indian-accent persona instruction (accent
instruction + `shimmer` voice + `gpt-audio`, hand-rolled in
`companion.ts`'s `/companion/speak`) needed to be preserved as-is — so the fix
had to be on the calling/orchestration side (frontend), not by swapping in the
shared lib's generic `textToSpeech`/`textToSpeechStream` helpers (which lack
the persona/accent instruction).

**How to apply:** if future work touches Companion voice mode or its latency,
keep the "speak completed sentences as they stream in" pattern — do not
regress to "wait for full text, then generate one full audio clip." Any place
that sets a full assistant message directly (e.g. the welcome message on
`startSession`) must explicitly call the speech-enqueue function itself, since
there is no longer a generic "auto-speak any new assistant message" effect
watching `messages`.
