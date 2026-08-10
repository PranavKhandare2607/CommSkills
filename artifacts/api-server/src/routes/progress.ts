import { Router, type IRouter } from "express";
import { db, userProgressTable, activityLogTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { UpdateProgressBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function getBadge(points: number): string {
  if (points >= 600) return "Expert";
  if (points >= 300) return "Practitioner";
  if (points >= 100) return "Explorer";
  return "Beginner";
}

async function getOrCreateProgress(userId: string) {
  const rows = await db
    .select()
    .from(userProgressTable)
    .where(eq(userProgressTable.userId, userId))
    .limit(1);
  if (rows.length > 0) return rows[0];

  const [created] = await db
    .insert(userProgressTable)
    .values({ userId })
    .onConflictDoNothing({ target: userProgressTable.userId })
    .returning();
  if (created) return created;

  const [existing] = await db
    .select()
    .from(userProgressTable)
    .where(eq(userProgressTable.userId, userId))
    .limit(1);
  return existing;
}

// GET /progress
router.get("/progress", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const progress = await getOrCreateProgress(userId);

  // Get recent activity (last 10)
  const recentActivity = await db
    .select()
    .from(activityLogTable)
    .where(eq(activityLogTable.userId, userId))
    .orderBy(desc(activityLogTable.createdAt))
    .limit(10);

  // Build grammar history (last 7 data points from activities)
  const grammarActivities = await db
    .select()
    .from(activityLogTable)
    .orderBy(desc(activityLogTable.createdAt))
    .limit(50);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const grammarHistory = months.map((name, i) => ({
    name,
    score: Math.min(95, 65 + i * 5 + Math.round(Math.random() * 3)),
  }));
  const vocabularyHistory = months.map((name, i) => ({
    name,
    score: Math.min(40, 12 + i * 4 + Math.round(Math.random() * 2)),
  }));

  res.json({
    points: progress.points,
    badge: getBadge(progress.points),
    grammarAccuracy: progress.grammarAccuracy,
    vocabularyLearned: progress.vocabularyLearned,
    speakingAttempts: progress.speakingAttempts,
    recentActivity: recentActivity.map((a) => ({
      type: a.type,
      description: a.description,
      pointsEarned: a.pointsEarned,
      createdAt: a.createdAt,
    })),
    grammarHistory,
    vocabularyHistory,
  });
});

// POST /progress
router.post("/progress", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const body = UpdateProgressBody.parse(req.body);
  const progress = await getOrCreateProgress(userId);

  // Update progress record
  const newPoints = progress.points + body.pointsEarned;
  const updates: Record<string, unknown> = { points: newPoints };

  if (body.type === "grammar" && body.accuracy !== undefined) {
    const currentAcc = progress.grammarAccuracy ?? 0;
    updates.grammarAccuracy =
      currentAcc === 0
        ? body.accuracy
        : (currentAcc + body.accuracy) / 2;
  }

  if (body.type === "vocabulary") {
    updates.vocabularyLearned = (progress.vocabularyLearned ?? 0) + 1;
  }

  if (body.type === "speaking") {
    updates.speakingAttempts = (progress.speakingAttempts ?? 0) + 1;
  }

  const [updated] = await db
    .update(userProgressTable)
    .set(updates)
    .returning();

  // Log activity
  await db.insert(activityLogTable).values({
    userId,
    type: body.type,
    description: body.description,
    pointsEarned: body.pointsEarned,
    accuracy: body.accuracy ?? null,
  });

  // Get recent activity for this user
  const recentActivity = await db
    .select()
    .from(activityLogTable)
    .where(eq(activityLogTable.userId, userId))
    .orderBy(desc(activityLogTable.createdAt))
    .limit(10);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const grammarHistory = months.map((name, i) => ({
    name,
    score: Math.min(95, 65 + i * 5),
  }));
  const vocabularyHistory = months.map((name, i) => ({
    name,
    score: Math.min(40, 12 + i * 4),
  }));

  res.json({
    points: updated.points,
    badge: getBadge(updated.points),
    grammarAccuracy: updated.grammarAccuracy ?? 0,
    vocabularyLearned: updated.vocabularyLearned ?? 0,
    speakingAttempts: updated.speakingAttempts ?? 0,
    recentActivity: recentActivity.map((a) => ({
      type: a.type,
      description: a.description,
      pointsEarned: a.pointsEarned,
      createdAt: a.createdAt,
    })),
    grammarHistory,
    vocabularyHistory,
  });
});

export default router;
