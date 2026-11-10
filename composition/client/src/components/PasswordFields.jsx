import React, { useState } from 'react';
import { Eye, EyeOff, Check, Circle } from 'react-feather';
import { evaluatePasswordRequirements } from '../services/passwordRules.js';
import styles from '../styles/Login.module.sass';

export function PasswordInput({
    id,
    label,
    value,
    onChange,
    placeholder,
    autoComplete = 'new-password',
    required = true,
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className={styles.fieldGroup}>
            {label && (
                <label className={styles.label} htmlFor={id}>
                    {label}
                </label>
            )}
            <div className={styles.passwordWrap}>
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    className={styles.input}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    required={required}
                />
                <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );
}

export function PasswordRequirementList({ password, confirmPassword, showConfirmStatus = true }) {
    const checks = evaluatePasswordRequirements(password);
    const hasConfirm = typeof confirmPassword === 'string' && confirmPassword.length > 0;
    const matches = hasConfirm && password === confirmPassword;

    return (
        <div className={styles.requirementsBox}>
            <div className={styles.requirementsTitle}>Password requirements</div>
            <ul className={styles.requirementsList}>
                {checks.map((item) => (
                    <li
                        key={item.id}
                        className={`${styles.requirementRow} ${
                            item.passed ? styles.requirementMet : styles.requirementUnmet
                        }`}
                    >
                        {item.passed ? <Check size={14} /> : <Circle size={12} />}
                        <span>{item.label}</span>
                    </li>
                ))}
                {showConfirmStatus && (
                    <li
                        className={`${styles.requirementRow} ${
                            matches ? styles.requirementMet : styles.requirementUnmet
                        }`}
                    >
                        {matches ? <Check size={14} /> : <Circle size={12} />}
                        <span>
                            {hasConfirm
                                ? matches
                                    ? 'Confirmation matches new password'
                                    : 'Confirmation does not match yet'
                                : 'Re-type the new password to confirm'}
                        </span>
                    </li>
                )}
            </ul>
        </div>
    );
}
