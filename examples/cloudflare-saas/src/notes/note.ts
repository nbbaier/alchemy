import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Note entity type
export interface Note {
  id: number;
  title: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

// Note input type
export interface NewNote {
  title: string;
  content?: string;
}

// Drizzle schema for notes
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});