import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { transcribeAudio } from "../lib/stt";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post("/stt/transcribe", requireAuth, upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Audio file required" });
      return;
    }
    const audioBuffer = req.file.buffer;
    const filename = req.file.originalname ?? "audio.webm";
    const result = await transcribeAudio(audioBuffer, filename);
    res.json(result);
  } catch (err: any) {
    console.error("STT error:", err);
    res.status(500).json({ error: err.message || "Transcription failed" });
  }
});

export default router;