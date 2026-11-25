import asyncio
import os
import tempfile
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile

_model = None
# "small" is a good accuracy/latency balance on CPU for English voice input.
_model_name = os.getenv("STT_MODEL", "small")
_device = os.getenv("STT_DEVICE", "cpu")
_compute_type = os.getenv("STT_COMPUTE_TYPE", "int8")
# Beam search improves transcription accuracy noticeably, especially for
# English interview/conversation answers. Keep it configurable for slower CPUs.
_beam_size = int(os.getenv("STT_BEAM_SIZE", "5"))
# Bias the decoder toward proper English and common interview vocabulary.
_en_initial_prompt = (
    "This is clear spoken English in a job interview or friendly conversation. "
    "Use correct English spelling, punctuation, and full words. Common terms: "
    "experience, skills, strength, project, team, manager, result, challenge, "
    "situation, task, action, communication, career, role, responsibility."
)


def _language_hint(language: str | None) -> str | None:
    if not language:
        return None
    value = language.strip().lower().replace("-", "_")
    if not value:
        return None
    return value.split("_")[0]


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel(_model_name, device=_device, compute_type=_compute_type)
    return _model


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(get_model)
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "model": _model_name}


def _transcribe_file(path: str, language: str | None):
    # Condition the model on English for higher accuracy. VAD filters silence
    # and background noise so the transcript doesn't invent words from noise.
    return get_model().transcribe(
        path,
        language=language,
        beam_size=_beam_size,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300},
        initial_prompt=_en_initial_prompt if language == "en" else None,
        condition_on_previous_text=False,
    )


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str | None = None):
    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # faster-whisper is synchronous; keep FastAPI's event loop responsive.
        segments, info = await asyncio.to_thread(_transcribe_file, tmp_path, _language_hint(language))
        text = " ".join(segment.text for segment in segments).strip()
        return {
            "text": text,
            "language": info.language,
            "duration": info.duration,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
