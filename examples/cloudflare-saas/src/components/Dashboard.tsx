import React, { useEffect, useState } from 'react';
import type { Note, Todo, User } from '../types';
import { apiCall, ApiException } from '../utils/api';

interface DashboardProps {
  user: User;
  setUser: (user: User | null) => void;
}

interface UserData {
  todos: Todo[];
  notes: Note[];
}

interface Stats {
  totalTodos: number;
  totalNotes: number;
}

function Dashboard({ user, setUser }: DashboardProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [todoTitle, setTodoTitle] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    loadUserData();
  }, []);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const loadUserData = async () => {
    try {
      const data = await apiCall<UserData>(`/api/user/${user.id}/data`);
      setTodos(data.todos || []);
      setNotes(data.notes || []);
      setLoading(false);
    } catch (error) {
      if (error instanceof ApiException) {
        showError(error.message);
      }
      console.error('Failed to load user data:', error);
      setLoading(false);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoTitle.trim()) return;

    try {
      await apiCall<Todo>(`/api/user/${user.id}/data/todos`, {
        method: 'POST',
        body: JSON.stringify({ title: todoTitle }),
      });
      setTodoTitle('');
      loadUserData();
    } catch (error) {
      if (error instanceof ApiException) {
        showError(error.message);
      }
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      await apiCall<Todo>(`/api/user/${user.id}/data/todos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ completed }),
      });
      loadUserData();
    } catch (error) {
      if (error instanceof ApiException) {
        showError(error.message);
      }
    }
  };

  const deleteTodo = async (id: number) => {
    if (!confirm('Delete this todo?')) return;
    
    try {
      await apiCall(`/api/user/${user.id}/data/todos/${id}`, {
        method: 'DELETE',
      });
      loadUserData();
    } catch (error) {
      if (error instanceof ApiException) {
        showError(error.message);
      }
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    try {
      await apiCall<Note>(`/api/user/${user.id}/data/notes`, {
        method: 'POST',
        body: JSON.stringify({ title: noteTitle }),
      });
      setNoteTitle('');
      loadUserData();
    } catch (error) {
      if (error instanceof ApiException) {
        showError(error.message);
      }
    }
  };

  const deleteNote = async (id: number) => {
    if (!confirm('Delete this note?')) return;
    
    try {
      await apiCall(`/api/user/${user.id}/data/notes/${id}`, {
        method: 'DELETE',
      });
      loadUserData();
    } catch (error) {
      if (error instanceof ApiException) {
        showError(error.message);
      }
    }
  };

  const handleLogout = () => {
    window.location.href = '/auth/sign-out';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <div className="user-info">
          <h1>Cloudflare SaaS Demo</h1>
          <span>{user.email || user.name || 'User'}</span>
          <button onClick={handleLogout} className="btn">Logout</button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="main-grid">
        <div className="section">
          <h2>Todos</h2>
          <form onSubmit={addTodo} className="form">
            <input
              type="text"
              value={todoTitle}
              onChange={(e) => setTodoTitle(e.target.value)}
              placeholder="Add a new todo..."
              required
            />
            <button type="submit" className="btn">Add</button>
          </form>
          
          <div>
            {todos.length === 0 ? (
              <p style={{ color: '#666' }}>No todos yet. Create your first one!</p>
            ) : (
              todos.map(todo => (
                <div key={todo.id} className={`item ${todo.completed ? 'completed' : ''}`}>
                  <div>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={todo.completed}
                      onChange={(e) => toggleTodo(todo.id, e.target.checked)}
                    />
                    <span>{todo.title}</span>
                    {todo.description && (
                      <small style={{ color: '#666' }}> - {todo.description}</small>
                    )}
                  </div>
                  <div className="item-actions">
                    <button onClick={() => deleteTodo(todo.id)} className="btn btn-danger">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="section">
          <h2>Notes</h2>
          <form onSubmit={addNote} className="form">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Add a new note..."
              required
            />
            <button type="submit" className="btn">Add</button>
          </form>
          
          <div>
            {notes.length === 0 ? (
              <p style={{ color: '#666' }}>No notes yet. Create your first one!</p>
            ) : (
              notes.map(note => (
                <div key={note.id} className="item">
                  <div>
                    <strong>{note.title}</strong>
                    {note.content && (
                      <p style={{ color: '#666', marginTop: '5px' }}>{note.content}</p>
                    )}
                  </div>
                  <div className="item-actions">
                    <button onClick={() => deleteNote(note.id)} className="btn btn-danger">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="section stats">
        <div className="stat-card">
          <div className="stat-value">{todos.length}</div>
          <div>Total Todos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{notes.length}</div>
          <div>Total Notes</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;