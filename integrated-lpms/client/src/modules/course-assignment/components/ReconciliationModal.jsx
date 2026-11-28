/**
 * ReconciliationModal — shown after a Department upload.
 *
 * Props:
 *   missing       — Array<{ id, name, code, status }> rows that
 *                   exist in DB but were absent from the Excel
 *   onConfirm     — async (idsToUnlist: number[]) => void
 *   onKeepAll     — () => void
 *   onClose       — () => void
 *
 * Each row gets a toggle. Yellow "Confirm Selection" applies the
 * Unlist status to the rows toggled ON. White "Keep Everything"
 * closes the modal without changes.
 */
import React from 'react';
import { X } from 'react-feather';
import DialogShell from './DialogShell.jsx';
import styles from '../styles/ReconciliationModal.module.sass';

const ReconciliationModal = ({
  missing,
  onConfirm,
  onKeepAll,
  onClose,
  title = 'Reconcile Departments',
  noun = 'departments',
  archiveLabel = 'Unlisted',
  keepLabel = 'Active',
  renderMeta = (r) => 'Code: ' + r.code + ' · Currently: ' + (r.status || 'Active'),
}) => {
  const [picks, setPicks] = React.useState(() => {
    const m = {};
    (missing || []).forEach((r) => { m[r.id] = false; });
    return m;
  });
  const [saving, setSaving] = React.useState(false);

  const toggle = (id) => setPicks((p) => ({ ...p, [id]: !p[id] }));

  const confirm = async () => {
    setSaving(true);
    try {
      const ids = Object.entries(picks).filter(([, v]) => v).map(([k]) => Number(k));
      await onConfirm(ids);
    } finally {
      setSaving(false);
    }
  };

  // `open` is always true: the pages mount this only when there is something to
  // reconcile. What DialogShell buys us is the shared backdrop and the same fade
  // + scale as the dialog that just handed off to it — Preview & Confirm fades
  // out, this fades in, and the dim underneath is one continuous layer.
  return (
    <DialogShell
      open
      onBackdropClick={() => !saving && onClose && onClose()}
      panelClassName={styles.modal}
      ariaLabel={title}
    >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h2 className={styles.title}>{title}</h2>
            <button
              onClick={() => !saving && onClose && onClose()}
              disabled={saving}
              aria-label="Close"
              style={{ background: 'transparent', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', padding: 0, lineHeight: 0, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
            >
              <X size={22} color="#18191A" />
            </button>
          </div>
          <p className={styles.subtitle}>
            These {noun} exist in the current period but weren't in the file you just uploaded.
            Toggle ON to mark them as <strong>{archiveLabel}</strong>; leave OFF to keep them <strong>{keepLabel}</strong>.
          </p>
        </div>

        {missing && missing.length > 0 ? (
          missing.map((r) => (
            <div key={r.id} className={styles.row}>
              <div className={styles.rowText}>
                <span className={styles.rowName}>{r.name}</span>
                <span className={styles.rowMeta}>{renderMeta(r)}</span>
              </div>
              <label className={styles.switch} title={'Mark as ' + archiveLabel}>
                <input
                  type="checkbox"
                  checked={!!picks[r.id]}
                  onChange={() => toggle(r.id)}
                  disabled={saving}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          ))
        ) : (
          <div style={{ fontSize: 14, color: '#6B7280' }}>No missing rows — nothing to reconcile.</div>
        )}

        <div className={styles.actions}>
          <button className={styles.btnOutline} disabled={saving} onClick={onKeepAll}>Keep Everything</button>
          <button className={styles.btnPrimary} disabled={saving} onClick={confirm}>
            {saving ? 'Saving…' : 'Confirm Selection'}
          </button>
        </div>
    </DialogShell>
  );
};

export default ReconciliationModal;
