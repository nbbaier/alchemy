export const demoPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloudflare SaaS Demo</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        @media (max-width: 768px) {
            .main-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .section h2 {
            margin-bottom: 15px;
            color: #444;
        }
        
        .form {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .form input[type="text"] {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            background: #007bff;
            color: white;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .btn:hover {
            background: #0056b3;
        }
        
        .btn-danger {
            background: #dc3545;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
        
        .item {
            padding: 10px;
            margin-bottom: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .item.completed {
            opacity: 0.6;
            text-decoration: line-through;
        }
        
        .item-actions {
            display: flex;
            gap: 5px;
        }
        
        .checkbox {
            margin-right: 10px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="user-info">
                <h1>Cloudflare SaaS Demo</h1>
                <span id="userEmail"></span>
                <a href="/auth/sign-out" class="btn">Logout</a>
            </div>
        </header>
        
        <div id="error" class="error" style="display: none;"></div>
        
        <div class="main-grid">
            <div class="section">
                <h2>Todos</h2>
                <form id="todoForm" class="form">
                    <input type="text" id="todoTitle" placeholder="Add a new todo..." required>
                    <button type="submit" class="btn">Add</button>
                </form>
                <div id="todoList" class="loading">Loading...</div>
            </div>
            
            <div class="section">
                <h2>Notes</h2>
                <form id="noteForm" class="form">
                    <input type="text" id="noteTitle" placeholder="Add a new note..." required>
                    <button type="submit" class="btn">Add</button>
                </form>
                <div id="noteList" class="loading">Loading...</div>
            </div>
        </div>
        
        <div class="section stats">
            <div class="stat-card">
                <div class="stat-value" id="todoCount">0</div>
                <div>Total Todos</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="noteCount">0</div>
                <div>Total Notes</div>
            </div>
        </div>
    </div>

    <script>
        // Get user ID from session
        let userId = null;
        
        // API helper
        async function apiCall(path, options = {}) {
            try {
                const response = await fetch(path, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    credentials: 'same-origin'
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'API error');
                }
                
                return response.json();
            } catch (error) {
                showError(error.message);
                throw error;
            }
        }
        
        function showError(message) {
            const errorEl = document.getElementById('error');
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }
        
        // Load user data
        async function loadUserData() {
            if (!userId) return;
            
            try {
                const data = await apiCall(\`/api/user/\${userId}/data\`);
                renderTodos(data.todos || []);
                renderNotes(data.notes || []);
                updateStats();
            } catch (error) {
                console.error('Failed to load user data:', error);
            }
        }
        
        // Render todos
        function renderTodos(todos) {
            const todoList = document.getElementById('todoList');
            if (todos.length === 0) {
                todoList.innerHTML = '<p style="color: #666;">No todos yet. Create your first one!</p>';
                return;
            }
            
            todoList.innerHTML = todos.map(todo => \`
                <div class="item \${todo.completed ? 'completed' : ''}">
                    <div>
                        <input type="checkbox" class="checkbox" \${todo.completed ? 'checked' : ''} 
                               onchange="toggleTodo(\${todo.id}, \${!todo.completed})">
                        <span>\${escapeHtml(todo.title)}</span>
                        \${todo.description ? \`<small style="color: #666;"> - \${escapeHtml(todo.description)}</small>\` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-danger" onclick="deleteTodo(\${todo.id})">Delete</button>
                    </div>
                </div>
            \`).join('');
        }
        
        // Render notes
        function renderNotes(notes) {
            const noteList = document.getElementById('noteList');
            if (notes.length === 0) {
                noteList.innerHTML = '<p style="color: #666;">No notes yet. Create your first one!</p>';
                return;
            }
            
            noteList.innerHTML = notes.map(note => \`
                <div class="item">
                    <div>
                        <strong>\${escapeHtml(note.title)}</strong>
                        \${note.content ? \`<p style="color: #666; margin-top: 5px;">\${escapeHtml(note.content)}</p>\` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-danger" onclick="deleteNote(\${note.id})">Delete</button>
                    </div>
                </div>
            \`).join('');
        }
        
        // Escape HTML to prevent XSS
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Update stats
        async function updateStats() {
            if (!userId) return;
            
            try {
                const stats = await apiCall(\`/api/user/\${userId}/data/stats\`);
                document.getElementById('todoCount').textContent = stats.totalTodos;
                document.getElementById('noteCount').textContent = stats.totalNotes;
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }
        
        // Todo operations
        async function addTodo(title, description = '') {
            await apiCall(\`/api/user/\${userId}/data/todos\`, {
                method: 'POST',
                body: JSON.stringify({ title, description })
            });
            loadUserData();
        }
        
        async function toggleTodo(id, completed) {
            await apiCall(\`/api/user/\${userId}/data/todos/\${id}\`, {
                method: 'PUT',
                body: JSON.stringify({ completed })
            });
            loadUserData();
        }
        
        async function deleteTodo(id) {
            if (!confirm('Delete this todo?')) return;
            await apiCall(\`/api/user/\${userId}/data/todos/\${id}\`, {
                method: 'DELETE'
            });
            loadUserData();
        }
        
        // Note operations
        async function addNote(title, content = '') {
            await apiCall(\`/api/user/\${userId}/data/notes\`, {
                method: 'POST',
                body: JSON.stringify({ title, content })
            });
            loadUserData();
        }
        
        async function deleteNote(id) {
            if (!confirm('Delete this note?')) return;
            await apiCall(\`/api/user/\${userId}/data/notes/\${id}\`, {
                method: 'DELETE'
            });
            loadUserData();
        }
        
        // Form handlers
        document.getElementById('todoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('todoTitle');
            await addTodo(input.value);
            input.value = '';
        });
        
        document.getElementById('noteForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('noteTitle');
            await addNote(input.value);
            input.value = '';
        });
        
        // Initialize
        async function init() {
            // Get session info
            try {
                const response = await fetch('/api/session', { credentials: 'same-origin' });
                if (response.ok) {
                    const session = await response.json();
                    if (session.user) {
                        userId = session.user.id;
                        document.getElementById('userEmail').textContent = session.user.email || session.user.name || 'User';
                        loadUserData();
                    } else {
                        window.location.href = '/';
                    }
                }
            } catch (error) {
                console.error('Failed to get session:', error);
                window.location.href = '/';
            }
        }
        
        // Make functions available globally for onclick handlers
        window.toggleTodo = toggleTodo;
        window.deleteTodo = deleteTodo;
        window.deleteNote = deleteNote;
        
        init();
    </script>
</body>
</html>`;