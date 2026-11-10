import React from 'react';
import styles from '../styles/AddRecordModal.module.sass';

export default function ConfirmModal({
    open,
    title = 'Are you sure?',
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    danger = true,
    onConfirm,
    onCancel,
}) {
    if (!open) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onCancel} />
            <div className={styles.modal} style={{ width: 420 }} role="dialog" aria-modal="true">
                <div className={styles.title}>{title}</div>
                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                    {message}
                </div>
                <div className={styles.buttons}>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnCancel}`}
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        style={danger ? { background: '#F94545' } : undefined}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </>
    );
}
