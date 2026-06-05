/**
 * ViewRecordModal — read-only view of a record.
 *
 * Takes the same `fields` shape as AddRecordModal / EditRecordModal so a
 * page can hand it the same field list and get a clean labelled display.
 * Footer renders an "Edit" button that fires onEdit (the parent typically
 * closes the view and opens its EditRecordModal in response). When
 * `onEdit` is omitted the modal is purely informational.
 *
 * This is the single entry point for inspecting / editing a row across
 * the app: row click → View → (Edit from inside the view).
 */
import React from 'react';
import { X, Edit2 } from 'react-feather';
import styles from '../styles/AddRecordModal.module.sass';
import { RecordMeta } from './RecordTimestamps.jsx';

const renderValue = (f, raw) => {
  if (raw == null || raw === '') return '—';
  if (f.type === 'checkboxes' && Array.isArray(raw)) {
    return raw.length === 0 ? '—' : raw.join(', ');
  }
  if (f.type === 'select' && Array.isArray(f.options)) {
    // Show the option label instead of the raw value when available.
    const opt = f.options.find((o) => (typeof o === 'string' ? o : o.value) === raw);
    if (opt) return typeof opt === 'string' ? opt : opt.label;
  }
  if (f.type === 'date') {
    return String(raw).slice(0, 10);
  }
  return String(raw);
};

const ViewRecordModal = ({ title, fields, initial, onClose, onEdit, canEdit = true }) => {
  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className={styles.title}>{title}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, display: 'inline-flex', alignItems: 'center' }}>
            <X size={22} color="#111827" />
          </button>
        </div>

        <RecordMeta record={initial} style={{ marginTop: -4, marginBottom: 10 }} />

        {fields.map((f) => (
          <div key={f.key} className={styles.field}>
            <label className={styles.label}>{f.label}</label>
            <div style={{
              padding: '4px 0',
              fontSize: 14, fontWeight: 500, color: '#111827',
              whiteSpace: f.type === 'textarea' ? 'pre-wrap' : 'normal',
            }}>
              {renderValue(f, initial && initial[f.key])}
            </div>
          </div>
        ))}

        {canEdit && onEdit && (
          <div className={styles.buttons}>
            <button
              className={styles.btn + ' ' + styles.btnPrimary}
              onClick={onEdit}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Edit2 size={14} /> Edit
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ViewRecordModal;
