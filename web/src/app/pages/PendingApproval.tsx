import React from 'react';
import { Session } from '@supabase/supabase-js';
import styles from '../app.module.css';
import { Header } from '../components/Header';

export const PendingApproval = ({ session }: { session: Session | null }) => {
  return (
    <div className={styles.container}>
      <Header session={session} />
      <main className={styles.main}>
        <div className={styles.accessDeniedContainer}>
          <h2 className={styles.errorTitle} style={{ color: '#f59e0b' }}>
            Approval Pending
          </h2>
          <p style={{ color: '#4b5563', marginTop: '16px' }}>
            Your account has been created and is currently waiting for
            administrator approval.
          </p>
          <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>
            You will be able to access the dashboard once an admin approves your
            request.
          </p>
          <button
            onClick={() => window.location.reload()}
            className={styles.btn}
            style={{ marginTop: '24px' }}
          >
            Check Status Again
          </button>
        </div>
      </main>
    </div>
  );
};
