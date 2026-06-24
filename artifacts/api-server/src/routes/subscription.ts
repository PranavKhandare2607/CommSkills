import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  getSubscriptionStatus,
  getTodayUsage,
  FREE_LIMITS,
  TRIAL_DAYS,
} from "../lib/subscriptionUtils";

const router: IRouter = Router();

// GET /subscription — returns status, usage, limits for the current user
router.get("/subscription", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;

  const [status, usage] = await Promise.all([
    getSubscriptionStatus(userId),
    getTodayUsage(userId),
  ]);

  res.json({
    ...status,
    usage: {
      grammar: usage.grammarChecks,
      vocabulary: usage.vocabularyLookups,
      aiMessages: usage.aiMessages,
      speaking: usage.speakingAttempts,
    },
    limits: FREE_LIMITS,
    trialDays: TRIAL_DAYS,
  });
});

export default router;
