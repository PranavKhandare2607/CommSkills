import { Router, type IRouter } from "express";
import { getLlmStatus } from "../lib/llm";
import { getSttStatus } from "../lib/stt";
import { getTtsStatus } from "../lib/tts";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const [llm, stt, tts] = await Promise.all([
    getLlmStatus(),
    getSttStatus(),
    getTtsStatus(),
  ]);

  // Return the full diagnostics object. Do not run it through the generated
  // HealthCheckResponse schema (it only declares `status`, which would strip
  // the per-service statuses we need for local troubleshooting).
  res.json({
    status: llm.ok && stt.ok && tts.ok ? "ok" : "degraded",
    services: { llm, stt, tts },
  });
});

export default router;