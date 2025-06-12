import { useEffect, useState } from 'react';
import { apiCall } from './lib/api';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import type { User } from './users/user';

interface SessionResponse {
  user: User | null;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    apiCall<SessionResponse>('/api/session')
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Dashboard user={user} setUser={setUser} />;
}

export default App;