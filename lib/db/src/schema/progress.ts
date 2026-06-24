import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProgressTable = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  points: integer("points").notNull().default(0),
  badge: text("badge").notNull().default("Beginner"),
  grammarAccuracy: real("grammar_accuracy").notNull().default(0),
  vocabularyLearned: integer("vocabulary_learned").notNull().default(0),
  speakingAttempts: integer("speaking_attempts").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull(),
  description: text("description").notNull(),
  pointsEarned: integer("points_earned").notNull().default(0),
  accuracy: real("accuracy"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserProgressSchema = createInsertSchema(userProgressTable).omit({ id: true });
export const insertActivityLogSchema = createInsertSchema(activityLogTable).omit({ id: true });

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgressRecord = typeof userProgressTable.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogTable.$inferSelect;
