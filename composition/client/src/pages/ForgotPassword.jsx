import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthAPI } from '../utils/api.js';
import uncLogo from '../assets/unclogo.png';
import styles from '../styles/Login.module.sass';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submittedMessage, setSubmittedMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmittedMessage('');
        setSubmitting(true);
        try {
            const res = await AuthAPI.forgotPassword(email);
            setSubmittedMessage(
                res?.message ||
                    'If an active LPMS account matches that email, a temporary password has been sent.'
            );
        } catch (err) {
            setError(err?.message || 'Unable to process request right now.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.brandHeader}>
                    <img src={uncLogo} alt="University of Nueva Caceres" className={styles.logo} />
                    <div className={styles.systemTitle}>Forgot Your Password?</div>
                    <div className={styles.subtitle}>
                        Enter your institutional UNC email address. If it matches an active LPMS account, we
                        will email you a new temporary password.
                    </div>
                </div>

                {error && <div className={styles.errorBanner}>{error}</div>}
                {submittedMessage && <div className={styles.infoBanner}>{submittedMessage}</div>}

                {!submittedMessage ? (
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} htmlFor="lpms-forgot-email">
                                Institutional Email
                            </label>
                            <input
                                id="lpms-forgot-email"
                                type="email"
                                className={styles.input}
                                placeholder="name@unc.edu.ph"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={submitting}>
                            {submitting ? 'Sending temporary password…' : 'Send Temporary Password'}
                        </button>

                        <Link
                            to="/login"
                            className={styles.secondaryBtn}
                            style={{ textAlign: 'center', textDecoration: 'none' }}
                        >
                            Back to Sign In
                        </Link>
                    </form>
                ) : (
                    <div className={styles.form}>
                        <Link
                            to="/login"
                            className={styles.submitBtn}
                            style={{ textAlign: 'center', textDecoration: 'none' }}
                        >
                            Return to Sign In
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
