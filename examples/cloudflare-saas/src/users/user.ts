export interface User {
  id: string;
  email?: string;
  name?: string;
}

export interface UserData {
  todos: Todo[];
  notes: Note[];
}

export interface UserStats {
  totalTodos: number;
  totalNotes: number;
}

// Import from other domains
import type { Note } from '../notes/note';
import type { Todo } from '../todos/todo';
