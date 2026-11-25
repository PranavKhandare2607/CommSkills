import asyncio
import io
import os
import re
import threading
import urllib.request
import wave
from collections import OrderedDict
from contextlib import asynccontextmanager

import uvicorn
import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response

VOICES_DIR = os.getenv("VOICES_DIR", "/voices")
HF_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"
MAX_AUDIO_CACHE = int(os.getenv("TTS_AUDIO_CACHE_SIZE", "200"))

# Language key -> (Piper voice name, path prefix inside the HF voices repo)
VOICE_MAP = {
    "en_US": (
        os.getenv("TTS_VOICE_EN", "en_US-amy-medium"),
        "en/en_US/amy/medium/en_US-amy-medium",
    ),
    "hi_IN": (
        os.getenv("TTS_VOICE_HI", "hi_IN-priyamvada-medium"),
        "hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium",
    ),
}

# Microsoft's neural Indian voices give a clear Indian accent and need no API
# key. Piper voices remain the offline fallback for each language.
EDGE_VOICES = {
    "en_IN": os.getenv("TTS_VOICE_EN_IN", "en-IN-NeerjaNeural"),
    "hi_IN": os.getenv("TTS_VOICE_HI_IN", "hi-IN-SwaraNeural"),
}

# Slightly lifted pitch and a relaxed pace sound warmer and more expressive
# than the flat default, while keeping speech easy to follow.
EDGE_DEFAULT_RATE = os.getenv("TTS_EDGE_RATE", "-3%")
EDGE_DEFAULT_PITCH = os.getenv("TTS_EDGE_PITCH", "+2Hz")
EDGE_DEFAULT_VOLUME = os.getenv("TTS_EDGE_VOLUME", "+0%")

_PERCENT_RE = re.compile(r"^[+-]\d{1,3}%$")
_PITCH_RE = re.compile(r"^[+-]\d{1,3}Hz$")

_default_key = "en_US"

# A Piper voice takes seconds to load, so keep models and recent audio in memory.
_voices: dict[str, object] = {}
_audio_cache: OrderedDict[tuple, bytes] = OrderedDict()
_voice_lock = threading.Lock()


def _clean_style(style: object) -> tuple[str, str, str]:
    """Accept only safe Edge-TTS prosody strings, with expressive defaults."""
    data = style if isinstance(style, dict) else {}
    rate = data.get("rate")
    pitch = data.get("pitch")
    volume = data.get("volume")
    return (
        rate if isinstance(rate, str) and _PERCENT_RE.match(rate) else EDGE_DEFAULT_RATE,
        pitch if isinstance(pitch, str) and _PITCH_RE.match(pitch) else EDGE_DEFAULT_PITCH,
        volume if isinstance(volume, str) and _PERCENT_RE.match(volume) else EDGE_DEFAULT_VOLUME,
    )


def _ensure_voice(voice_name: str, hf_prefix: str) -> None:
    onnx_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx")
    json_path = onnx_path + ".json"
    if os.path.exists(onnx_path) and os.path.exists(json_path):
        return

    os.makedirs(VOICES_DIR, exist_ok=True)
    for suffix in (".onnx", ".onnx.json"):
        url = f"{HF_BASE}/{hf_prefix}{suffix}"
        dest = os.path.join(VOICES_DIR, f"{voice_name}{suffix}")
        tmp = dest + ".part"
        print(f"Downloading {url}", flush=True)
        urllib.request.urlretrieve(url, tmp)
        os.replace(tmp, dest)
    print(f"Voice ready: {voice_name}", flush=True)


def _load_voice(voice_key: str):
    if voice_key in _voices:
        return _voices[voice_key]

    from piper import PiperVoice

    voice_name, _prefix = VOICE_MAP.get(voice_key, VOICE_MAP[_default_key])
    voice_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx")
    if not os.path.exists(voice_path):
        raise HTTPException(status_code=500, detail=f"Voice not found: {voice_name}")

    with _voice_lock:
        if voice_key not in _voices:
            _voices[voice_key] = PiperVoice.load(voice_path)
    return _voices[voice_key]


def _synthesize(text: str, voice_key: str) -> bytes:
    cache_key = (voice_key, text)
    cached = _audio_cache.get(cache_key)
    if cached is not None:
        _audio_cache.move_to_end(cache_key)
        return cached

    voice = _load_voice(voice_key)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        with _voice_lock:
            voice.synthesize(text, wav_file)

    audio = buffer.getvalue()
    _audio_cache[cache_key] = audio
    _audio_cache.move_to_end(cache_key)
    while len(_audio_cache) > MAX_AUDIO_CACHE:
        _audio_cache.popitem(last=False)
    return audio


async def _edge_synthesize_async(
    text: str,
    voice_name: str,
    rate: str,
    pitch: str,
    volume: str,
) -> bytes:
    chunks: list[bytes] = []
    communicate = edge_tts.Communicate(
        text, voice_name, rate=rate, pitch=pitch, volume=volume
    )
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio" and chunk.get("data"):
            chunks.append(chunk["data"])
    return b"".join(chunks)


def _synthesize_edge_cached(text: str, voice_key: str, style: object = None) -> bytes:
    """Synthesize with the neural Indian voice, reusing the audio cache.

    Prosody is part of the cache key so an expressive chunk never replays a
    flat audio clip generated with different settings.
    """
    rate, pitch, volume = _clean_style(style)
    cache_key = (voice_key, text, rate, pitch, volume)
    cached = _audio_cache.get(cache_key)
    if cached is not None:
        _audio_cache.move_to_end(cache_key)
        return cached

    # to_thread() calls this from a worker thread, so a fresh loop is fine.
    audio = asyncio.run(
        _edge_synthesize_async(text, EDGE_VOICES[voice_key], rate, pitch, volume)
    )
    _audio_cache[cache_key] = audio
    _audio_cache.move_to_end(cache_key)
    while len(_audio_cache) > MAX_AUDIO_CACHE:
        _audio_cache.popitem(last=False)
    return audio


def _preload() -> None:
    for key in VOICE_MAP:
        _load_voice(key)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(_ensure_all_voices)
    await asyncio.to_thread(_preload)
    yield


def _ensure_all_voices() -> None:
    for _key, (name, prefix) in VOICE_MAP.items():
        _ensure_voice(name, prefix)


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    voices = {k: v[0] for k, v in VOICE_MAP.items()}
    voices.update(EDGE_VOICES)
    return {"status": "ok", "voices": voices}


@app.post("/speak")
async def speak(body: dict):
    text = (body or {}).get("text", "")
    voice_key = (body or {}).get("voice", _default_key)
    style = (body or {}).get("style")
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    if voice_key not in VOICE_MAP and voice_key not in EDGE_VOICES:
        voice_key = _default_key

    content_type = "audio/wav"
    try:
        # Keep the event loop free: synthesis blocks for a while on CPU.
        if voice_key in EDGE_VOICES:
            try:
                audio = await asyncio.to_thread(_synthesize_edge_cached, text, voice_key, style)
                content_type = "audio/mpeg"
            except Exception as e:
                # Neural voice needs network access; Piper still works offline.
                # Keep the correct language: Hindi falls back to Piper Hindi.
                fallback_key = voice_key if voice_key in VOICE_MAP else _default_key
                print(f"Edge TTS failed, using Piper fallback: {e}", flush=True)
                audio = await asyncio.to_thread(_synthesize, text, fallback_key)
        else:
            audio = await asyncio.to_thread(_synthesize, text, voice_key)
        return Response(
            content=audio,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
