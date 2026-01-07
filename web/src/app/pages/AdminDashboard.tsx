import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import styles from '../app.module.css';
import { Header } from '../components/Header';
import { Link } from 'react-router-dom';

type UserProfile = {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'pending' | 'disabled';
  created_at: string;
};

// Use environment variable for API URL, fallback to localhost for development
// Ensure VITE_API_URL is set in Vercel Project Settings > Environment Variables
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3100' : '')
).replace(/\/$/, '');

export const AdminDashboard = ({ session }: { session: Session }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      console.log(`[Dashboard] Fetching users from: ${API_BASE_URL}/api/users`);
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Check if the response is actually JSON (prevents "Unexpected token <" error)
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          'API Configuration Error: Endpoint returned HTML instead of JSON. Check Vercel Root Directory settings.',
        );
      }

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session]);

  const updateUserRole = async (email: string, newRole: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${email}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error(
          'API Error: Endpoint returned HTML. Check Vercel configuration.',
        );
      }

      if (!res.ok) throw new Error(await res.text());
      // Refresh list
      fetchUsers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const deleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${email}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error(
          'API Error: Endpoint returned HTML. Check Vercel configuration.',
        );
      }

      if (!res.ok) throw new Error(await res.text());
      fetchUsers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className={styles.main}>Loading...</div>;

  return (
    <div className={styles.container}>
      <Header session={session} />
      <main className={styles.main}>
        <div
          className={styles.card}
          style={{ maxWidth: '1000px', width: '100%' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 className={styles.welcomeTitle} style={{ marginBottom: 0 }}>
              User Management
            </h2>
            <Link to="/reporting" className={styles.link}>
              Go to Fancy Performance Calculator
            </Link>
          </div>
          {error && <p className={styles.errorText}>{error}</p>}

          <table className={styles.userList}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        backgroundColor:
                          user.role === 'admin'
                            ? '#dbeafe'
                            : user.role === 'user'
                              ? '#d1fae5'
                              : user.role === 'disabled'
                                ? '#fee2e2'
                                : '#f3f4f6',
                        color:
                          user.role === 'admin'
                            ? '#1e40af'
                            : user.role === 'user'
                              ? '#065f46'
                              : user.role === 'disabled'
                                ? '#991b1b'
                                : '#374151',
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    {user.role === 'pending' && (
                      <button
                        className={styles.approveBtn}
                        onClick={() => updateUserRole(user.email, 'user')}
                      >
                        Approve
                      </button>
                    )}
                    {user.role !== 'disabled' && user.role !== 'admin' && (
                      <button
                        className={styles.disableBtn}
                        onClick={() => updateUserRole(user.email, 'disabled')}
                      >
                        Disable
                      </button>
                    )}
                    {user.role === 'disabled' && (
                      <button
                        className={styles.approveBtn}
                        onClick={() => updateUserRole(user.email, 'user')}
                      >
                        Enable
                      </button>
                    )}
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteUser(user.email)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
