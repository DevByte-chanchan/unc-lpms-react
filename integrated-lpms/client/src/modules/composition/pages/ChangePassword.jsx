import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthAPI } from '../utils/api.js';
import { useCurrentUser } from '../services/currentUser.jsx';
import { defaultLandingPath } from '../services/roles.js';
import { validatePassword } from '../services/passwordRules.js';
import { PasswordInput, PasswordRequirementList } from '../components/PasswordFields.jsx';
import uncLogo from '../assets/unclogo.png';
import styles from '../styles/Login.module.sass';

export default function ChangePassword() {
    const { user, activeRole, refresh, logout } = useCurrentUser();
    const navigate = useNavigate();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isForced = Boolean(user?.mustChangePassword);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validationError = validatePassword(newPassword, confirmPassword);
        if (validationError) {
            setError(validationError);
            return;
        }
        if (newPassword === currentPassword) {
            setError('New password must be different from your current password.');
            return;
        }

        setSubmitting(true);
        try {
            await AuthAPI.changePassword(currentPassword, newPassword);
            await refresh();
            navigate(defaultLandingPath(activeRole), { replace: true });
        } catch (err) {
            setError(err?.message || 'Unable to change password.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (isForced) {
            await logout();
            navigate('/login', { replace: true });
        } else {
            navigate(-1);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.brandHeader}>
                    <img src={uncLogo} alt="University of Nueva Caceres" className={styles.logo} />
                    <div className={styles.systemTitle}>
                        {isForced ? 'Update Your Temporary Password' : 'Change Password'}
                    </div>
                    <div className={styles.subtitle}>
                        {isForced
                            ? 'For your security, please set a new personal password before accessing LPMS.'
                            : `Signed in as ${user?.email || ''}`}
                    </div>
                </div>

                {error && <div className={styles.errorBanner}>{error}</div>}

                <form className={styles.form} onSubmit={handleSubmit}>
                    <PasswordInput
                        id="current-pw"
                        label={isForced ? 'Temporary Password' : 'Current Password'}
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        placeholder={isForced ? 'Enter temporary password' : 'Enter current password'}
                        autoComplete="current-password"
                    />

                    <PasswordInput
                        id="new-pw"
                        label="New Password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="At least 8 chars, upper, lower, number"
                        autoComplete="new-password"
                    />

                    <PasswordInput
                        id="confirm-pw"
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                    />

                    <PasswordRequirementList
                        password={newPassword}
                        confirmPassword={confirmPassword}
                    />

                    <button type="submit" className={styles.submitBtn} disabled={submitting}>
                        {submitting ? 'Saving…' : 'Save New Password'}
                    </button>

                    <button type="button" className={styles.secondaryBtn} onClick={handleCancel}>
                        {isForced ? 'Sign out instead' : 'Cancel'}
                    </button>
                </form>
            </div>
        </div>
    );
}
