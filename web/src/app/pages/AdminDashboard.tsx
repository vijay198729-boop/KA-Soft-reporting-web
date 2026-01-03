import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import styles from '../app.module.css';
import { Header } from '../components/Header';

export const AdminDashboard = ({ session }: { session: Session }) => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users:', res.status);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  const handleApproveUser = async (emailToApprove: string) => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/users/${emailToApprove}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role: 'user' }),
      },
    );
    if (res.ok) fetchUsers();
    else alert('Failed to approve user');
  };

  const handleDeleteUser = async (emailToDelete: string) => {
    if (!confirm(`Are you sure you want to delete ${emailToDelete}?`)) return;
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/users/${emailToDelete}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    );
    if (res.ok) fetchUsers();
    else alert('Failed to delete user');
  };

  return (
    <div className={styles.container}>
      <Header session={session} />
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.welcomeTitle}>Admin Dashboard</h1>
          <p style={{ color: '#5f6368', marginBottom: '20px' }}>
            Welcome, {session.user.email}
          </p>

          <div style={{ marginBottom: '20px' }}>
            <Link to="/reporting" className={styles.link}>
              Go to Fancy Performance Calculator
            </Link>
          </div>

          <h3 style={{ marginTop: '30px', marginBottom: '10px' }}>
            Allowed Users
          </h3>
          <table className={styles.userList}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email}>
                  <td>{u.name || '-'}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    {u.role === 'pending' && (
                      <button
                        className={styles.btn}
                        style={{
                          marginRight: '10px',
                          padding: '6px 12px',
                          fontSize: '12px',
                        }}
                        onClick={() => handleApproveUser(u.email)}
                      >
                        Approve
                      </button>
                    )}
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteUser(u.email)}
                      disabled={u.email === session.user.email}
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
