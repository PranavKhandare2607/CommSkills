import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import grammarRouter from "./grammar";
import vocabularyRouter from "./vocabulary";
import analyzeRouter from "./analyze";
import progressRouter from "./progress";
import speakingRouter from "./speaking";
import companionRouter from "./companion";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(grammarRouter);
router.use(vocabularyRouter);
router.use(analyzeRouter);
router.use(progressRouter);
router.use(speakingRouter);
router.use(companionRouter);

export default router;
