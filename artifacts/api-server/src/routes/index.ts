import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import sttRouter from "./stt";
import ttsRouter from "./tts";
import openaiRouter from "./openai";
import grammarRouter from "./grammar";
import vocabularyRouter from "./vocabulary";
import analyzeRouter from "./analyze";
import progressRouter from "./progress";
import speakingRouter from "./speaking";
import companionRouter from "./companion";
import subscriptionRouter from "./subscription";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(sttRouter);
router.use(ttsRouter);
router.use(subscriptionRouter);
router.use(openaiRouter);
router.use(grammarRouter);
router.use(vocabularyRouter);
router.use(analyzeRouter);
router.use(progressRouter);
router.use(speakingRouter);
router.use(companionRouter);

export default router;
