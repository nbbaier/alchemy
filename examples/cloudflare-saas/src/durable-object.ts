import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { notes, todos } from "./schema";

export class UserDurableObject extends DurableObject {
  private db: ReturnType<typeof drizzle>;
  private app: Hono;
  private initialized = false;

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    
    // Initialize Drizzle with the Durable Object's SQL storage
    this.db = drizzle(ctx.storage.sql);
    
    // Initialize Hono for handling requests
    this.app = new Hono();
    
    // Use blockConcurrencyWhile to ensure schema initialization happens before any requests
    // This prevents race conditions during the first request to a new Durable Object
    ctx.blockConcurrencyWhile(async () => {
      await this.initializeSchema(ctx);
      this.setupRoutes();
      this.initialized = true;
    });
  }

  async initializeSchema(ctx: DurableObjectState) {
    if (this.initialized) return;
    
    try {
      // Create tables if they don't exist
      await ctx.storage.sql.exec(`
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
      
      console.log("Schema initialized successfully");
    } catch (error) {
      console.error("Error initializing schema:", error);
      throw error;
    }
  }

  setupRoutes() {
    // Get all user data
    this.app.get("/data", async (c) => {
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
      const [todoCount, noteCount] = await Promise.all([
        this.db.select({ value: todos.id }).from(todos),
        this.db.select({ value: notes.id }).from(notes),
      ]);
      
      return c.json({
        totalTodos: todoCount.length,
        totalNotes: noteCount.length,
      });
    });
  }

  async fetch(request: Request): Promise<Response> {
    // Wait for initialization to complete if not ready
    if (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.fetch(request);
    }
    
    return this.app.fetch(request);
  }
}