import { Router, type IRouter, type Request, type Response } from "express";
import { synthesizeSpeech, TtsVoice } from "../lib/tts";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post("/tts/speak", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, voice = "en_US" } = req.body ?? {};
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text is required" });
      return;
    }
    const speech = await synthesizeSpeech(text, voice as TtsVoice);
    res.setHeader("Content-Type", speech.contentType);
    res.setHeader("Content-Length", speech.audio.length.toString());
    res.send(speech.audio);
  } catch (err: any) {
    console.error("TTS error:", err);
    res.status(500).json({ error: err.message || "Speech synthesis failed" });
  }
});

export default router;