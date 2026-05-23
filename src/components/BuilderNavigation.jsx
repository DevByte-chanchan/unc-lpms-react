import React from "react";
import { Trash2 } from "react-feather";
import styles from "../styles/BuilderNavigation.module.sass";

const BuilderNavigation = ({ onSave, onExport, onClearAll, filledCount, totalSlots, allFilled, tosStatus = 'draft' }) => {
    const canExport = tosStatus === 'approved';
    return (
        <div className={styles.navi}>
            <div onClick={onSave} className={styles.return} style={{ cursor: 'pointer' }}>
                Save &amp; Return
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${totalSlots > 0 ? (filledCount / totalSlots) * 100 : 0}%`, background: allFilled ? '#22c55e' : '#EA1212' }} />
                </div>
                <span className={styles.progressLabel}>{filledCount}/{totalSlots}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={styles.clearBtn} onClick={onClearAll} style={{ cursor: 'pointer' }}>
                    <Trash2 size={14} />
                </div>
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
