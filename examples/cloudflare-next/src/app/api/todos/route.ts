import { env } from "cloudflare:workers";
import { NextResponse } from 'next/server';
// Define interfaces for your data
interface Todo {
  id: number;
  text: string;
  completed: number; // 0 for false, 1 for true
}

interface NewTodo {
  text: string;
  completed?: boolean; // Optional, defaults to false
}

export async function GET() {
  try {
    const db = env.DATABASE;

    const { results } = await db.prepare("SELECT id, text, completed FROM todos").all<Todo>();
    const todos = results ? results.map(todo => ({ ...todo, completed: !!todo.completed })) : [];
    return NextResponse.json({ success: true, todos });
  } catch (error: any) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch todos", details: error },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Access the database binding using getCloudflareContext
    const db = env.DATABASE;

    // Remove the check for db existence
    // if (!db) {
    //   return NextResponse.json(
    //     { success: false, error: "D1_TODOS environment binding not available." },
    //     { status: 500 }
    //   );
    // }

    const newTodo: NewTodo = await request.json();

    if (!newTodo.text || typeof newTodo.text !== 'string' || newTodo.text.trim() === '') {
      return NextResponse.json(
        { success: false, error: "'text' is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const completedValue = newTodo.completed ? 1 : 0;

    // D1 expects all columns that are part of the insert unless they have a default value or are auto-incrementing
    // Assuming 'id' is AUTOINCREMENT
    const stmt = db.prepare("INSERT INTO todos (text, completed) VALUES (?, ?)");
    const { results, success, meta } = await stmt.bind(newTodo.text, completedValue).run<Todo>();

    if (!success) {
      console.error("Failed to insert todo:", meta?.last_row_id, meta?.changes, meta?.duration, meta?.error)
      // D1 specific error might be in meta.error
      const errorMessage = (meta?.error && typeof meta.error === 'object' && 'message' in meta.error) ? (meta.error as any).message : 'D1 insert failed due to an unknown reason';
      throw new Error(meta?.error ? String(meta.error) : errorMessage);
    }

    // D1's .run() for INSERT might not return the full object directly in `results` in the same way a SELECT would.
    // We need to fetch the inserted row if we want to return it. Or, construct it if `last_row_id` is reliable.
    // For simplicity, we'll assume the client can refetch or we return the input + ID if available.
    const insertedId = meta?.last_row_id;

    return NextResponse.json({ 
      success: true, 
      todo: { 
        id: insertedId, 
        text: newTodo.text, 
        completed: !!completedValue 
      } 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error creating todo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create todo", details: error },
      { status: 500 }
    );
  }
} 