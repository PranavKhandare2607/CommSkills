import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  const sessionId = auth?.sessionId;
  if (!userId || !sessionId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as Request & { userId: string }).userId = userId;

  enforceSingleSession(userId, sessionId).catch((err) => {
    req.log?.warn({ err }, "Single-session enforcement error");
  });

  next();
}

async function enforceSingleSession(userId: string, sessionId: string) {
  const rows = await db
    .select({ activeSessionId: subscriptionsTable.activeSessionId })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);

  if (!rows.length) return;

  const { activeSessionId } = rows[0];

  if (!activeSessionId) {
    await db
      .update(subscriptionsTable)
      .set({ activeSessionId: sessionId, updatedAt: new Date() })
      .where(eq(subscriptionsTable.userId, userId));
    return;
  }

  if (activeSessionId !== sessionId) {
    try {
      await (await clerkClient()).sessions.revokeSession(activeSessionId);
    } catch {
    }
    await db
      .update(subscriptionsTable)
      .set({ activeSessionId: sessionId, updatedAt: new Date() })
      .where(eq(subscriptionsTable.userId, userId));
  }
}
