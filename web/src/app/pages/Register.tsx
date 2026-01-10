import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import styles from '../app.module.css';
import { Header } from '../components/Header';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3100' : '')
).replace(/\/$/, '');

export const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    setPasswordError('');
    setPhoneError('');

    let hasError = false;
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      hasError = true;
    }

    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    if (!phoneRegex.test(phone)) {
      setPhoneError(
        'Invalid phone number. Please include country code (e.g., +1234567890).',
      );
      hasError = true;
    }

    if (hasError) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, companyName, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      // Registration successful - Auto-login to show Pending Approval screen
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        navigate('/login');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <Header session={null} />
      <main className={styles.loginContainer}>
        <div className={styles.card} style={{ textAlign: 'center' }}>
          <h2 className={styles.welcomeTitle}>Create Account</h2>
          <p style={{ color: '#5f6368' }}>
            Register to access the Fancy Performance Calculator.
          </p>

          <form onSubmit={handleRegister} style={{ marginTop: '20px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Full Name <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Company Name <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                className={styles.input}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Phone Number <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="tel"
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                required
              />
              {phoneError && (
                <div className={styles.errorText}>{phoneError}</div>
              )}
            </div>
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
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Confirm Password <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="password"
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {passwordError && (
                <div className={styles.errorText}>{passwordError}</div>
              )}
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
              {loading ? 'Processing...' : 'Register'}
            </button>
          </form>
          <div className={styles.toggleText}>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
