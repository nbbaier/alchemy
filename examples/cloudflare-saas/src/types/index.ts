export interface User {
  id: string;
  email?: string;
  name?: string;
}

export interface Todo {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: number;
  title: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
}