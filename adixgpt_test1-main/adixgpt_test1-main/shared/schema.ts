import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userId: varchar("user_id"), // Optional for future user auth
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull(),
  role: varchar("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  model: text("model"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  id: true,
  name: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  role: true,
  content: true,
  model: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// LocalStorage User types
export const localUserSchema = z.object({
  id: z.string(),
  username: z.string().min(1, "Username is required").max(50, "Username too long"),
  createdAt: z.string(),
});

export const insertLocalUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(50, "Username too long"),
});

export type LocalUser = z.infer<typeof localUserSchema>;
export type InsertLocalUser = z.infer<typeof insertLocalUserSchema>;

// AI Provider types for frontend
export const aiProviderSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  endpoint: z.string().url(),
  apiKey: z.string(),
  modelId: z.string(),
  requestsPerMinute: z.number().min(1).max(1000),
  isEditable: z.boolean().default(true),
});

export type AIProvider = z.infer<typeof aiProviderSchema>;

// Chat request schema
export const chatRequestSchema = z.object({
  chatId: z.string(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })),
  model: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
