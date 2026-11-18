import os
import tempfile
import urllib.request
import wave
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response

VOICES_DIR = os.getenv("VOICES_DIR", "/voices")
HF_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"

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

_default_key = "en_US"


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


def _ensure_all_voices() -> None:
    for _key, (name, prefix) in VOICE_MAP.items():
        _ensure_voice(name, prefix)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_all_voices()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "voices": {k: v[0] for k, v in VOICE_MAP.items()}}


@app.post("/speak")
async def speak(body: dict):
    text = (body or {}).get("text", "")
    voice_key = (body or {}).get("voice", _default_key)
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    voice_name, _prefix = VOICE_MAP.get(voice_key, VOICE_MAP[_default_key])
    voice_path = os.path.join(VOICES_DIR, f"{voice_name}.onnx")
    if not os.path.exists(voice_path):
        raise HTTPException(status_code=500, detail=f"Voice not found: {voice_name}")

    try:
        from piper import PiperVoice

        voice = PiperVoice.load(voice_path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        with wave.open(tmp_path, "wb") as wav_file:
            voice.synthesize(text, wav_file)

        with open(tmp_path, "rb") as f:
            audio_data = f.read()

        os.unlink(tmp_path)
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={"Cache-Control": "no-cache"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
