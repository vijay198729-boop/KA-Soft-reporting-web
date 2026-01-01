import { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import styles from '../app.module.css';
import { Header } from '../components/Header';

export const ReportingDashboard = ({ session }: { session: Session }) => {
  const [backendData, setBackendData] = useState<string>('');

  const fetchProtectedData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/protected`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const data = await response.json();
      setBackendData(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error fetching backend:', error);
    }
  };

  return (
    <div className={styles.container}>
      <Header session={session} />
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.welcomeTitle}>Reporting Dashboard</h1>
          <p style={{ color: '#5f6368', marginBottom: '20px' }}>
            Welcome, {session.user.email}
          </p>

          <button onClick={fetchProtectedData} className={styles.btnSecondary}>
            Fetch Protected Data
          </button>
          {backendData && <pre className={styles.pre}>{backendData}</pre>}
        </div>
      </main>
    </div>
  );
};
