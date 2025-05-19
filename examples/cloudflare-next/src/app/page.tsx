"use client";

import { useEffect, useState } from "react";

// Define interfaces for your data (matching the API response structure)
interface Todo {
  id: number | null;
  text: string;
  completed: boolean;
}

interface FetchTodosResponse {
  success: boolean;
  todos?: Todo[];
  error?: string;
}

interface AddTodoResponse {
  success: boolean;
  todo?: Todo;
  error?: string;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch todos on component mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/todos");
      if (!response.ok) {
        throw new Error(`Error fetching todos: ${response.statusText}`);
      }
      const data: FetchTodosResponse = await response.json();
      if (data.success) {
        setTodos(data.todos || []);
      } else {
        setError(data.error || "Failed to fetch todos");
      }
    } catch (error: any) {
      console.error("Error fetching todos:", error);
      setError(error.message || "Failed to fetch todos");
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async () => {
    if (!newTodoText.trim()) return;

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: newTodoText }),
      });

      if (!response.ok) {
        throw new Error(`Error adding todo: ${response.statusText}`);
      }

      const data: AddTodoResponse = await response.json();
      if (data.success && data.todo) {
        setTodos([...todos, data.todo]);
        setNewTodoText(""); // Clear input
      } else {
        setError(data.error || "Failed to add todo");
      }
    } catch (error: any) {
      console.error("Error adding todo:", error);
      setError(error.message || "Failed to add todo");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Simple Todo App</h1>

      {loading && <p>Loading todos...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="Add a new todo"
          style={{ marginRight: "10px", padding: "8px" }}
        />
        <button onClick={addTodo} style={{ padding: "8px 12px" }}>
          Add Todo
        </button>
      </div>

      <h2>Todos</h2>
      {todos.length === 0 && !loading && !error && <p>No todos yet!</p>}
      <ul>
        {todos.map((todo) => (
          <li
            key={todo.id || todo.text}
            style={{ textDecoration: todo.completed ? "line-through" : "none" }}
          >
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
