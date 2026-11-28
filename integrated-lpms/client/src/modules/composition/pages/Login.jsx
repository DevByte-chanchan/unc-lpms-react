import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'react-feather';
import { useCurrentUser } from '../services/currentUser.jsx';
import { defaultLandingPath } from '../services/roles.js';
import uncLogo from '../assets/unclogo.png';
import styles from '../styles/Login.module.sass';

const DEMO_ACCOUNTS = [
    { role: 'Instructor', email: 'monica.norton@unc.edu.ph', password: 'Instructor@2026' },
    { role: 'Program Head (+ Instructor)', email: 'olivia.vance@unc.edu.ph', password: 'ProgramHead@2026' },
    { role: 'Director of Libraries', email: 'maria.santos@unc.edu.ph', password: 'Library@2026' },
    { role: 'Industry Consultant', email: 'roberto.cruz@unc.edu.ph', password: 'Consultant@2026' },
    { role: 'Dean', email: 'sophia.sterling@unc.edu.ph', password: 'Dean@2026' },
    { role: 'VPAA', email: 'carlos.garcia@unc.edu.ph', password: 'Vpaa@2026' },
];

export default function Login() {
    const { isAuthenticated, user, activeRole, login } = useCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (isAuthenticated && user) {
        if (user.mustChangePassword) {
            return <Navigate to="/change-password" replace />;
        }
        return <Navigate to={defaultLandingPath(activeRole)} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const loggedIn = await login(email, password);
            if (loggedIn?.mustChangePassword) {
                navigate('/change-password', { replace: true });
                return;
            }
            const fromPath = location.state?.from?.pathname;
            const target =
                fromPath && fromPath !== '/login' && fromPath !== '/change-password'
                    ? fromPath
                    : defaultLandingPath(loggedIn?.activeRole);
            navigate(target, { replace: true });
        } catch (err) {
            setError(err?.message || 'Unable to sign in. Please check your credentials.');
        } finally {
            setSubmitting(false);
        }
    };

    const fillDemo = (account) => {
        setEmail(account.email);
        setPassword(account.password);
        setError('');
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.brandHeader}>
                    <img src={uncLogo} alt="University of Nueva Caceres" className={styles.logo} />
                    <div className={styles.systemTitle}>Learning Plan Management System</div>
                    <div className={styles.subtitle}>
                        Sign in with your institutional UNC account to access your workspace.
                    </div>
                </div>

                {error && <div className={styles.errorBanner}>{error}</div>}

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="lpms-email">
                            Institutional Email
                        </label>
                        <input
                            id="lpms-email"
                            type="email"
                            className={styles.input}
                            placeholder="name@unc.edu.ph"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label} htmlFor="lpms-password">
                            Password
                        </label>
                        <div className={styles.passwordWrap}>
                            <input
                                id="lpms-password"
                                type={showPassword ? 'text' : 'password'}
                                className={styles.input}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className={styles.forgotRow}>
                        <Link to="/forgot-password" className={styles.forgotLink}>
                            Forgot password?
                        </Link>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <div className={styles.demoBox}>
                    <div className={styles.demoTitle}>Quick-fill demo accounts (dev)</div>
                    <div className={styles.demoGrid}>
                        {DEMO_ACCOUNTS.map((acct) => (
                            <button
                                key={acct.email}
                                type="button"
                                className={styles.demoItem}
                                onClick={() => fillDemo(acct)}
                            >
                                <span className={styles.demoRole}>{acct.role}</span>
                                <span className={styles.demoEmail}>{acct.email}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
