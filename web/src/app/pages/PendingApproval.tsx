import { Session } from '@supabase/supabase-js';
import styles from '../app.module.css';
import { Header } from '../components/Header';

export const PendingApproval = ({ session }: { session: Session }) => {
  return (
    <div className={styles.container}>
      <Header session={session} />
      <main className={styles.main}>
        <div className={styles.accessDeniedContainer}>
          <h1 className={styles.errorTitle} style={{ color: '#fbbc05' }}>
            Access Pending
          </h1>
          <p>
            Your account (<strong>{session.user.email}</strong>) is currently
            awaiting admin approval.
          </p>
        </div>
      </main>
    </div>
  );
};
