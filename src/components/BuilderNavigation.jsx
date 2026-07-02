import React, { useState } from "react";
import { Trash2, Loader } from "react-feather";
import styles from "../styles/BuilderNavigation.module.sass";

const BuilderNavigation = ({ onSave, onExport, onClearAll, filledCount, totalSlots, allFilled, tosStatus = 'draft', readOnly = false }) => {
    const [saving, setSaving] = useState(false);
    const canExport = tosStatus === 'approved';
    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        try { await onSave(); } finally { setSaving(false); }
    };
    return (
        <div className={styles.navi}>
            {!readOnly ? (
                <div onClick={handleSave} className={styles.return} style={{ cursor: saving ? 'default' : 'pointer' }}>
                    {saving ? <Loader size={16} className={styles.spinner} /> : null}
                    {saving ? 'Saving…' : 'Save & Return'}
                </div>
            ) : (
                <div className={styles.return} style={{ color: '#999', cursor: 'default' }}>View Only</div>
            )}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${totalSlots > 0 ? (filledCount / totalSlots) * 100 : 0}%`, background: allFilled ? '#22c55e' : '#EA1212' }} />
                </div>
                <span className={styles.progressLabel}>{filledCount}/{totalSlots}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!readOnly && (
                    <div className={styles.clearBtn} onClick={onClearAll} style={{ cursor: 'pointer' }}>
                        <Trash2 size={14} />
                    </div>
                )}
                <div style={{ position: 'relative' }}>
                    <div className={`${styles.exportBtn} ${!canExport ? styles.exportDisabled : ''}`} onClick={canExport ? onExport : undefined}>
                        Export
                    </div>
                    {!canExport && <span className={styles.exportTooltip}>Can only export when approved</span>}
                </div>
            </div>
        </div>
    )
}

export default BuilderNavigation;
