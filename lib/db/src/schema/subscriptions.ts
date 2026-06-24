import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  status: text("status").notNull().default("trial"),
  trialStartedAt: timestamp("trial_started_at").defaultNow().notNull(),
  trialEndsAt: timestamp("trial_ends_at").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeStatus: text("stripe_status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dailyUsageTable = pgTable("daily_usage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  grammarChecks: integer("grammar_checks").notNull().default(0),
  vocabularyLookups: integer("vocabulary_lookups").notNull().default(0),
  aiMessages: integer("ai_messages").notNull().default(0),
  speakingAttempts: integer("speaking_attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDailyUsageSchema = createInsertSchema(dailyUsageTable).omit({ id: true, createdAt: true });

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type DailyUsage = typeof dailyUsageTable.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
