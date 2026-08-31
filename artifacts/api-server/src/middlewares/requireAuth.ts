import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export const DEVELOPMENT_GUEST_USER_ID = "development_guest";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Development guest mode intentionally takes precedence over any stale
  // Clerk cookie, so an expired development subscription cannot block testing.
  // This branch is only active in the API dev workflow; published servers use
  // the authenticated path below.
  if (process.env.NODE_ENV === "development") {
    (req as Request & { userId: string }).userId = DEVELOPMENT_GUEST_USER_ID;
    next();
    return;
  }

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
      await clerkClient.sessions.revokeSession(activeSessionId);
    } catch {
    }
    await db
      .update(subscriptionsTable)
      .set({ activeSessionId: sessionId, updatedAt: new Date() })
      .where(eq(subscriptionsTable.userId, userId));
  }
}
