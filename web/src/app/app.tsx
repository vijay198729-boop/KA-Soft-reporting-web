import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [backendData, setBackendData] = useState<string>('');
  const [role, setRole] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Profile/Role whenever session changes
  useEffect(() => {
    if (session) {
      fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((res) => {
          if (res.status === 403) {
            setAccessDenied(true);
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data) setRole(data.role);
        });
    }
  }, [session]);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', // Change to 'github', 'azure', etc. as needed
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setBackendData('');
    setRole(null);
    setAccessDenied(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: newUserEmail, role: 'user' }),
    });

    if (res.ok) alert('User added successfully!');
    else alert('Failed to add user');
  };

  const fetchProtectedData = async () => {
    if (!session) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/protected`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );
      const data = await response.json();
      setBackendData(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error fetching backend:', error);
    }
  };

  if (!session) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}
      >
        <button
          onClick={handleLogin}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h1 style={{ color: 'red' }}>Access Denied</h1>
        <p>
          Your email ({session.user.email}) has not been granted access to this
          application.
        </p>
        <button onClick={handleLogout}>Sign Out</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '50px' }}>
      <h1>
        Welcome, {session.user.email} ({role})
      </h1>
      <button onClick={handleLogout} style={{ marginRight: '10px' }}>
        Sign Out
      </button>
      <hr style={{ margin: '20px 0' }} />

      {role === 'admin' && (
        <div
          style={{
            marginBottom: '20px',
            padding: '20px',
            border: '1px solid #ccc',
          }}
        >
          <h3>Admin: Grant Access</h3>
          <form onSubmit={handleAddUser}>
            <input
              type="email"
              placeholder="User Email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              style={{ marginRight: '10px', padding: '5px' }}
            />
            <button type="submit">Add User</button>
          </form>
        </div>
      )}

      <button onClick={fetchProtectedData}>Fetch Protected Data</button>
      {backendData && (
        <pre
          style={{
            background: '#f4f4f4',
            padding: '15px',
            marginTop: '10px',
            borderRadius: '5px',
          }}
        >
          {backendData}
        </pre>
      )}
    </div>
  );
}

export default App;
