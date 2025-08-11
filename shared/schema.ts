import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: text("recurring_pattern"), // daily, weekly, monthly, yearly
  recurringWeeks: text("recurring_weeks"), // Number of weeks for recurring events (e.g., "4", "8", "indefinite")
  parentEventId: varchar("parent_event_id"), // For recurring event instances
  originalDate: timestamp("original_date"), // Original date for recurring instances
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Table for tracking deleted/modified recurring event instances
export const eventExceptions = pgTable("event_exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentEventId: varchar("parent_event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  exceptionDate: timestamp("exception_date").notNull(), // The original date that was modified/deleted
  type: text("type").notNull(), // 'deleted' or 'modified'
  modifiedEventId: varchar("modified_event_id").references(() => events.id, { onDelete: 'cascade' }), // If modified, points to new event
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertEventExceptionSchema = createInsertSchema(eventExceptions).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type EventException = typeof eventExceptions.$inferSelect;
export type InsertEventException = z.infer<typeof insertEventExceptionSchema>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
