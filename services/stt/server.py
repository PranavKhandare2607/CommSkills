import os
import tempfile
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile

_model = None
_model_name = os.getenv("STT_MODEL", "base")
_device = os.getenv("STT_DEVICE", "cpu")
_compute_type = os.getenv("STT_COMPUTE_TYPE", "int8")


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel(_model_name, device=_device, compute_type=_compute_type)
    return _model


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_model()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok", "model": _model_name}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        segments, info = get_model().transcribe(tmp_path, beam_size=5)
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