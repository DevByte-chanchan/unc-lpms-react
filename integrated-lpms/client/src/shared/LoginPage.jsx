import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import uncLogo from '../modules/composition/assets/unclogo.png';
import { useAuth } from './AuthContext.jsx';
import { AuthAPI } from './api.js';
import { getDefaultRouteForRole } from './navConfig.js';

const FALLBACK_ACCOUNTS = [
  { role: 'VPAA', name: 'Dr. Carlos Garcia', email: 'carlos.garcia@unc.edu.ph', password: 'Vpaa@2026', note: 'Terms, Depts, VMGO, Approved LPs' },
  { role: 'Dean', name: 'Dr. Sophia Sterling', email: 'sophia.sterling@unc.edu.ph', password: 'Dean@2026', note: 'Faculty, Programs, Dept VM, Final Approval' },
  { role: 'Program Head', name: 'Prof. Olivia Vance', email: 'olivia.vance@unc.edu.ph', password: 'ProgramHead@2026', note: 'Assignments, COAEP/CO-PO, Review (+ Instructor Switch)' },
  { role: 'Director of Libraries', name: 'Maria Santos', email: 'maria.santos@unc.edu.ph', password: 'Library@2026', note: 'Reference Repository & Reference Verification' },
  { role: 'Instructor', name: 'Monica Norton', email: 'monica.norton@unc.edu.ph', password: 'Instructor@2026', note: 'Assigned Courses & Full HCI Composition Workspace' },
  { role: 'Industry Consultant', name: 'Engr. Roberto Cruz', email: 'roberto.cruz@unc.edu.ph', password: 'Consultant@2026', note: 'Approved Plans Review, Suggestions & Sign-Off' },
];

export default function LoginPage() {
  const { login, isAuthenticated, activeRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState(FALLBACK_ACCOUNTS);

  useEffect(() => {
    if (isAuthenticated && activeRole) {
      navigate(getDefaultRouteForRole(activeRole), { replace: true });
    }
  }, [isAuthenticated, activeRole, navigate]);

  useEffect(() => {
    AuthAPI.demoAccounts()
      .then((res) => {
        const list = res?.accounts || (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          setDemoAccounts(
            list.map((a) => {
              const fb = FALLBACK_ACCOUNTS.find((f) => f.email === a.email);
              return {
                ...fb,
                ...a,
                role: a.role || a.activeRole || fb?.role,
                password: a.password || a.demoPassword || fb?.password,
              };
            })
          );
        }
      })
      .catch(() => {
        // use fallback accounts
      });
  }, []);

  const performLogin = async (loginEmail, loginPassword) => {
    setError('');
    setSubmitting(true);
    try {
      const user = await login(loginEmail, loginPassword);
      navigate(getDefaultRouteForRole(user?.activeRole), { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    performLogin(email.trim(), password);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        overflowY: 'auto',
        background: 'linear-gradient(135deg, #111827 0%, #7f1d1d 55%, #b91c1c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1080,
          display: 'grid',
          gridTemplateColumns: 'minmax(310px, 410px) 1fr',
          gap: 24,
          alignItems: 'stretch',
        }}
      >
        {/* Left: Credentials Sign-In */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '32px 28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.32)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <img src={uncLogo} alt="UNC Logo" style={{ width: 46, height: 46, objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#991b1b', lineHeight: 1.1 }}>UNC-LPMS</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Unified Learning Plan Management System</div>
            </div>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#111827' }}>Sign in to your account</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
            One unified portal for Course Assignment, Learning Plan Composition, and Submissions Management.
          </p>

          {error && <div className="lpms-alert lpms-alert-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="lpms-field">
              <label htmlFor="login-email">Institutional Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 11, top: 11, color: '#9ca3af' }} />
                <input
                  id="login-email"
                  type="email"
                  required
                  className="lpms-input"
                  style={{ width: '100%', paddingLeft: 34 }}
                  placeholder="name@unc.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="lpms-field">
              <label htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 11, top: 11, color: '#9ca3af' }} />
                <input
                  id="login-password"
                  type="password"
                  required
                  className="lpms-input"
                  style={{ width: '100%', paddingLeft: 34 }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="lpms-btn lpms-btn-primary"
              style={{ width: '100%', padding: '11px 16px', marginTop: 4, fontSize: 14 }}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Right: Visible Dev/QA Quick-Login Switcher (All 6 Roles) */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            borderRadius: 16,
            padding: '26px 26px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.28)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <ShieldCheck size={18} color="#b91c1c" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Dev / QA Quick-Login — All 6 Seeded Roles
            </h3>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#4b5563' }}>
            Click any role below to sign in instantly and test cross-module workflows end-to-end.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 11 }}>
            {demoAccounts.map((acc) => (
              <div
                key={acc.email}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 11,
                  padding: '12px 14px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span className="lpms-badge lpms-badge-red">{acc.role}</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{acc.name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#374151', marginTop: 6, wordBreak: 'break-all' }}>
                    <strong>Email:</strong> {acc.email}
                    <br />
                    <strong>Pass:</strong> <code>{acc.password}</code>
                  </div>
                  {acc.note && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{acc.note}</div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  className="lpms-btn lpms-btn-sm"
                  style={{ width: '100%', borderColor: '#fca5a5', color: '#991b1b', background: '#fef2f2' }}
                  onClick={() => performLogin(acc.email, acc.password)}
                >
                  Quick Sign In as {acc.role}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
