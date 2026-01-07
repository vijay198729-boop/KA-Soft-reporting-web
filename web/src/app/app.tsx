import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/AdminDashboard';
import { FancyPerformanceCalculator } from './pages/FancyPerformanceCalculator';
import { PendingApproval } from './pages/PendingApproval';
import styles from './app.module.css'; // Used for Access Denied screen

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

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

  const API_BASE_URL = (
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:3100' : '')
  ).replace(/\/$/, '');

  // Fetch Profile/Role whenever session changes
  useEffect(() => {
    if (session) {
      setLoadingRole(true);
      fetch(`${API_BASE_URL}/api/profile`, {
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
      setLoadingRole(false);
    } else {
      setRole(null);
      setAccessDenied(false);
    }
  }, [session]);

  if (accessDenied) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>KA Soft</div>
          <button
            onClick={() => supabase.auth.signOut()}
            className={styles.btnSecondary}
          >
            Sign Out
          </button>
        </header>
        <main className={styles.main}>
          <div className={styles.accessDeniedContainer}>
            <h1 className={styles.errorTitle}>Access Denied</h1>
            <p>
              Your email (<strong>{session?.user.email}</strong>) has not been
              granted access to this application.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (session && loadingRole) {
    return <div style={{ padding: '20px' }}>Loading profile...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={!session ? <Login /> : <Navigate to="/" />}
      />
      <Route
        path="/register"
        element={!session ? <Register /> : <Navigate to="/" />}
      />

      {/* Protected Routes */}
      <Route
        path="/admin"
        element={
          session && role === 'admin' ? (
            <AdminDashboard session={session} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/reporting"
        element={
          session && (role === 'user' || role === 'admin') ? (
            <FancyPerformanceCalculator session={session} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/pending"
        element={
          session && role === 'pending' ? (
            <PendingApproval session={session} />
          ) : (
            <Navigate to="/" />
          )
        }
      />

      {/* Root Redirect Logic */}
      <Route
        path="/"
        element={
          !session ? (
            <Navigate to="/login" />
          ) : role === 'admin' ? (
            <Navigate to="/admin" />
          ) : role === 'user' ? (
            <Navigate to="/reporting" />
          ) : role === 'pending' ? (
            <Navigate to="/pending" />
          ) : (
            <div>Loading...</div>
          )
        }
      />
    </Routes>
  );
}

export default App;
