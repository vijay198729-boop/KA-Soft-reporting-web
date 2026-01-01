import { supabase } from '../../supabaseClient';
import styles from '../app.module.css';
import { Session } from '@supabase/supabase-js';

export const Header = ({ session }: { session: Session | null }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>KA Soft</div>
      {session && (
        <button onClick={handleLogout} className={styles.btnSecondary}>
          Sign Out
        </button>
      )}
    </header>
  );
};
