import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

interface User {
  id: string;
  email?: string;
  name?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/session', { credentials: 'same-origin' })
      .then(res => res.json())
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