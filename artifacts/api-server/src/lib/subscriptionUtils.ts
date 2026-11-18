import { db } from "@workspace/db";
import { subscriptionsTable, dailyUsageTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export const TRIAL_DAYS = 10;

export const FREE_LIMITS = {
  grammar: 3,
  vocabulary: 5,
  aiMessages: 10,
  speaking: 2,
} as const;

export type UsageType = "grammar" | "vocabulary" | "aiMessages" | "speaking";
export type LockedFeature = "companion" | "analyzer";

/**
 * Local installs have no billing provider. When LOCAL_PREMIUM_MODE=true every
 * premium feature is unlocked (usage limits are bypassed). Set it to "false"
 * to exercise the free-trial / paywall flow.
 */
export function isLocalPremiumMode(): boolean {
  const v = (process.env.LOCAL_PREMIUM_MODE ?? "false").toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getOrCreateSubscription(userId: string) {
  const rows = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);

  if (rows.length > 0) return rows[0];

  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  const [created] = await db
    .insert(subscriptionsTable)
    .values({
      userId,
      plan: "free",
      status: "trial",
      trialStartedAt: trialStart,
      trialEndsAt: trialEnd,
    })
    .onConflictDoNothing({ target: subscriptionsTable.userId })
    .returning();
  if (created) return created;

  const [existing] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .limit(1);
  return existing;
}

export async function getSubscriptionStatus(userId: string) {
  const sub = await getOrCreateSubscription(userId);
  const now = new Date();
  const trialEndsAt = new Date(sub.trialEndsAt);

  if (isLocalPremiumMode()) {
    return {
      plan: "premium",
      status: "active",
      isPremium: true,
      isInTrial: false,
      trialDaysRemaining: 0,
      trialEndsAt: trialEndsAt.toISOString(),
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
    };
  }

  const isInTrial = sub.status === "trial" && now < trialEndsAt;
  const isPremium = sub.status === "active" || isInTrial;
  const trialDaysRemaining = isInTrial
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (sub.status === "trial" && now >= trialEndsAt) {
    await db
      .update(subscriptionsTable)
      .set({ status: "free", updatedAt: new Date() })
      .where(eq(subscriptionsTable.userId, userId));
  }

  return {
    plan: sub.plan,
    status: isInTrial ? "trial" : sub.status === "trial" ? "free" : sub.status,
    isPremium,
    isInTrial,
    trialDaysRemaining,
    trialEndsAt: trialEndsAt.toISOString(),
    stripeCustomerId: sub.stripeCustomerId,
    stripeSubscriptionId: sub.stripeSubscriptionId,
  };
}

export async function getTodayUsage(userId: string) {
  const date = todayDate();
  const rows = await db
    .select()
    .from(dailyUsageTable)
    .where(and(eq(dailyUsageTable.userId, userId), eq(dailyUsageTable.date, date)))
    .limit(1);

  if (rows.length > 0) return rows[0];

  const [created] = await db
    .insert(dailyUsageTable)
    .values({ userId, date })
    .onConflictDoNothing({
      target: [dailyUsageTable.userId, dailyUsageTable.date],
    })
    .returning();
  if (created) return created;

  const [existing] = await db
    .select()
    .from(dailyUsageTable)
    .where(and(eq(dailyUsageTable.userId, userId), eq(dailyUsageTable.date, date)))
    .limit(1);
  return existing;
}

export async function checkAndIncrementUsage(
  userId: string,
  type: UsageType,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (isLocalPremiumMode()) {
    return { allowed: true, remaining: 999, limit: 999 };
  }

  const { isPremium } = await getSubscriptionStatus(userId);

  if (isPremium) {
    return { allowed: true, remaining: 999, limit: 999 };
  }

  const usage = await getTodayUsage(userId);
  const limit = FREE_LIMITS[type];

  const fieldMap: Record<UsageType, keyof typeof usage> = {
    grammar: "grammarChecks",
    vocabulary: "vocabularyLookups",
    aiMessages: "aiMessages",
    speaking: "speakingAttempts",
  };

  const field = fieldMap[type];
  const current = (usage[field] as number) ?? 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0, limit };
  }

  const updateField: Record<string, number> = {};
  updateField[field as string] = current + 1;

  await db
    .update(dailyUsageTable)
    .set(updateField)
    .where(and(eq(dailyUsageTable.userId, userId), eq(dailyUsageTable.date, todayDate())));

  return { allowed: true, remaining: limit - current - 1, limit };
}

export async function checkLockedFeatureAccess(userId: string): Promise<boolean> {
  if (isLocalPremiumMode()) return true;
  const { isPremium } = await getSubscriptionStatus(userId);
  return isPremium;
}
