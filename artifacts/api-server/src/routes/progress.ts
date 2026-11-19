import { Router, type IRouter } from "express";
import { db, userProgressTable, activityLogTable } from "@workspace/db";
import { and, desc, eq, gte } from "drizzle-orm";
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

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Aggregate the last 7 months of this user's activity into chart data.
 * Returns real values (0 when there is no activity) instead of fake numbers.
 */
async function buildHistory(userId: string) {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const rows = await db
    .select()
    .from(activityLogTable)
    .where(
      and(
        eq(activityLogTable.userId, userId),
        gte(activityLogTable.createdAt, since),
      ),
    );

  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      name: MONTH_LABELS[d.getMonth()],
      grammarSum: 0,
      grammarCount: 0,
      vocabulary: 0,
    };
  });

  for (const row of rows) {
    const d = new Date(row.createdAt);
    const bucket = buckets.find(
      (b) => b.key === `${d.getFullYear()}-${d.getMonth()}`,
    );
    if (!bucket) continue;
    if (row.type === "grammar" && row.accuracy != null) {
      bucket.grammarSum += row.accuracy;
      bucket.grammarCount += 1;
    }
    if (row.type === "vocabulary") {
      bucket.vocabulary += 1;
    }
  }

  return {
    grammarHistory: buckets.map((b) => ({
      name: b.name,
      score:
        b.grammarCount > 0 ? Math.round(b.grammarSum / b.grammarCount) : 0,
    })),
    vocabularyHistory: buckets.map((b) => ({
      name: b.name,
      score: b.vocabulary,
    })),
  };
}

// GET /progress
router.get("/progress", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  // These reads are independent — run them together so the dashboard paints
  // after one DB round trip instead of three.
  const [progress, recentActivity, { grammarHistory, vocabularyHistory }] =
    await Promise.all([
      getOrCreateProgress(userId),
      db
        .select()
        .from(activityLogTable)
        .where(eq(activityLogTable.userId, userId))
        .orderBy(desc(activityLogTable.createdAt))
        .limit(10),
      buildHistory(userId),
    ]);

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

  const [[updated], { grammarHistory, vocabularyHistory }] = await Promise.all([
    db
      .update(userProgressTable)
      .set(updates)
      .where(eq(userProgressTable.userId, userId))
      .returning(),
    buildHistory(userId),
  ]);

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
