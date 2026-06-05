/**
 * AddRecordModal — generic data-entry modal used by the "Add" button
 * on Departments / Faculty / Programs / Industry Consultants.
 *
 * The caller passes:
 *   title    — modal heading
 *   fields   — Array<{ key, label, type?, options?, required?, render? }>
 *                type: 'text' | 'select' | 'checkboxes' | 'textarea' | 'date' | 'email'
 *                ('checkboxes' value is an array of option values)
 *                render({ value, onChange }) — supply a fully custom control
 *                (e.g. a tag picker); takes precedence over `type`.
 *   onSubmit — async (record) => void   // record is keyed by field.key
 *   onClose  — () => void
 */
import React from 'react';
import { X, Save } from 'react-feather';
import styles from '../styles/AddRecordModal.module.sass';
import SearchableSelect from './SearchableSelect.jsx';

const AddRecordModal = ({ title, fields, initial, onSubmit, onClose }) => {
  const [values, setValues] = React.useState(() => {
    const init = {};
    fields.forEach((f) => {
      if (f.type === 'checkboxes') {
        init[f.key] = Array.isArray(initial && initial[f.key]) ? initial[f.key] : [];
      } else {
        init[f.key] = (initial && initial[f.key]) ?? '';
      }
    });
    return init;
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  const setField = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const submit = async () => {
    for (const f of fields) {
      if (!f.required) continue;
      const v = values[f.key];
      const empty = f.type === 'checkboxes' ? !(Array.isArray(v) && v.length > 0) : !v;
      if (empty) { setError(`${f.label} is required`); return; }
    }
    setSaving(true); setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={() => !saving && onClose()} />
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className={styles.title}>{title}</div>
          <button onClick={onClose} disabled={saving} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, display: 'inline-flex', alignItems: 'center' }}>
            <X size={22} color="#111827" />
          </button>
        </div>

        {fields.map((f) => (
          <div key={f.key} className={styles.field}>
            <label className={styles.label}>{f.label}{f.required && <span style={{ color: '#B91C1C' }}> *</span>}</label>

            {typeof f.render === 'function' ? (
              f.render({ value: values[f.key], onChange: (v) => setField(f.key, v) })
            ) : f.type === 'checkboxes' ? (
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #D1D5DB', borderRadius: 6, padding: '8px 12px' }}>
                {(f.options || []).length === 0 && (
                  <div style={{ fontSize: 13, color: '#6B7280' }}>No options available.</div>
                )}
                {(f.options || []).map((opt) => {
                  const val = typeof opt === 'string' ? opt : opt.value;
                  const label = typeof opt === 'string' ? opt : opt.label;
                  const arr = Array.isArray(values[f.key]) ? values[f.key] : [];
                  const checked = arr.includes(val);
                  return (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setField(f.key, e.target.checked ? [...arr, val] : arr.filter((v) => v !== val))}
                      />
                      <span style={{ fontSize: 14 }}>{label}</span>
                    </label>
                  );
                })}
              </div>
            ) : f.type === 'searchable-select' ? (
              <SearchableSelect
                value={values[f.key] || ''}
                onChange={(v) => setField(f.key, v)}
                options={f.options || []}
                placeholder={f.placeholder || 'Search…'}
              />
            ) : f.type === 'select' ? (
              // Modern searchable dropdown (same as the other pickers), not a
              // native <select>, so all dropdowns look consistent.
              <SearchableSelect
                value={values[f.key] || ''}
                onChange={(v) => setValues((prev) => {
                  const next = { ...prev, [f.key]: v };
                  if (f.onSelect) Object.assign(next, f.onSelect(v) || {});
                  return next;
                })}
                options={f.options || []}
                placeholder={f.placeholder || (f.required ? 'Select ' + f.label + '…' : '— Select —')}
              />
            ) : f.type === 'textarea' ? (
              <textarea
                className={styles.textarea}
                placeholder={f.placeholder || ''}
                value={values[f.key] || ''}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            ) : (
              <input
                className={styles.input}
                type={f.type || 'text'}
                placeholder={f.placeholder || ''}
                value={values[f.key] || ''}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            )}
          </div>
        ))}

        {error && <div className={styles.error}>{error}</div>}

        {/* Footer — same Cancel / Save buttons as EditEntityModal (white Cancel,
            red primary Save with a Save icon). */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <button onClick={() => !saving && onClose()} disabled={saving}
            style={{ height: 40, padding: '0 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, background: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB', cursor: saving ? 'not-allowed' : 'pointer' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{ height: 40, padding: '0 18px', borderRadius: 6, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
              border: 'none', background: saving ? '#E5E7EB' : '#EA1212', color: saving ? '#9CA3AF' : '#FFFFFF',
              cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 1px 2px rgba(234,18,18,0.35)' }}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddRecordModal;
