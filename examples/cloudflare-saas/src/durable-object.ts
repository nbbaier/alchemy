import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";

// Define the schema for user data
const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Define the notes table
const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export class UserDurableObject extends DurableObject {
  private db: ReturnType<typeof drizzle>;
  private app: Hono;
  private initialized = false;

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    
    // Initialize Drizzle with the Durable Object's SQL storage
    this.db = drizzle(this.ctx.storage.sql);
    
    // Initialize Hono for handling requests
    this.app = new Hono();
    
    // Set up routes
    this.setupRoutes();
  }

  async initializeSchema() {
    if (this.initialized) return;
    
    try {
      // Create tables if they don't exist
      await this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          completed INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      
      this.initialized = true;
    } catch (error) {
      console.error("Error initializing schema:", error);
      throw error;
    }
  }

  setupRoutes() {
    // Get all user data
    this.app.get("/data", async (c) => {
      await this.initializeSchema();
      
      const [userTodos, userNotes] = await Promise.all([
        this.db.select().from(todos),
        this.db.select().from(notes),
      ]);
      
      return c.json({
        todos: userTodos,
        notes: userNotes,
      });
    });

    // Create a new todo
    this.app.post("/data/todos", async (c) => {
      await this.initializeSchema();
      
      const body = await c.req.json();
      const { title, description } = body;
      
      if (!title) {
        return c.json({ error: "Title is required" }, 400);
      }
      
      const newTodo = await this.db.insert(todos).values({
        title,
        description,
      }).returning();
      
      return c.json(newTodo[0]);
    });

    // Update a todo
    this.app.put("/data/todos/:id", async (c) => {
      await this.initializeSchema();
      
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      
      const updated = await this.db
        .update(todos)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(todos.id, id))
        .returning();
      
      if (!updated.length) {
        return c.json({ error: "Todo not found" }, 404);
      }
      
      return c.json(updated[0]);
    });

    // Delete a todo
    this.app.delete("/data/todos/:id", async (c) => {
      await this.initializeSchema();
      
      const id = parseInt(c.req.param("id"));
      
      const deleted = await this.db
        .delete(todos)
        .where(eq(todos.id, id))
        .returning();
      
      if (!deleted.length) {
        return c.json({ error: "Todo not found" }, 404);
      }
      
      return c.json({ success: true });
    });

    // Create a new note
    this.app.post("/data/notes", async (c) => {
      await this.initializeSchema();
      
      const body = await c.req.json();
      const { title, content } = body;
      
      if (!title) {
        return c.json({ error: "Title is required" }, 400);
      }
      
      const newNote = await this.db.insert(notes).values({
        title,
        content,
      }).returning();
      
      return c.json(newNote[0]);
    });

    // Update a note
    this.app.put("/data/notes/:id", async (c) => {
      await this.initializeSchema();
      
      const id = parseInt(c.req.param("id"));
      const body = await c.req.json();
      
      const updated = await this.db
        .update(notes)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(notes.id, id))
        .returning();
      
      if (!updated.length) {
        return c.json({ error: "Note not found" }, 404);
      }
      
      return c.json(updated[0]);
    });

    // Delete a note
    this.app.delete("/data/notes/:id", async (c) => {
      await this.initializeSchema();
      
      const id = parseInt(c.req.param("id"));
      
      const deleted = await this.db
        .delete(notes)
        .where(eq(notes.id, id))
        .returning();
      
      if (!deleted.length) {
        return c.json({ error: "Note not found" }, 404);
      }
      
      return c.json({ success: true });
    });

    // Get stats
    this.app.get("/data/stats", async (c) => {
      await this.initializeSchema();
      
      const todoCount = await this.db.select({ count: todos.id }).from(todos);
      const noteCount = await this.db.select({ count: notes.id }).from(notes);
      
      return c.json({
        totalTodos: todoCount.length,
        totalNotes: noteCount.length,
      });
    });
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }
}