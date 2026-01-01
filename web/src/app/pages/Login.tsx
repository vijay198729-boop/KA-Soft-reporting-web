import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import styles from '../app.module.css';
import { Header } from '../components/Header';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setAuthError(error.message);
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <Header session={null} />
      <main className={styles.loginContainer}>
        <div className={styles.card} style={{ textAlign: 'center' }}>
          <h2 className={styles.welcomeTitle}>Sign In</h2>
          <p style={{ color: '#5f6368' }}>
            Please sign in to access the reporting dashboard.
          </p>

          <form onSubmit={handleLogin} style={{ marginTop: '20px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Email Address <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Password <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {authError && (
              <div
                className={styles.errorText}
                style={{ marginBottom: '10px' }}
              >
                {authError}
              </div>
            )}
            <button
              type="submit"
              className={styles.btn}
              style={{ width: '100%', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Sign In'}
            </button>
          </form>

          <div className={styles.toggleText}>
            Don't have an account?{' '}
            <Link to="/register" className={styles.link}>
              Register
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
