/**
 * EditRecordModal — generic data-edit modal.
 *
 * Pre-fills inputs from `initial` and calls `onSubmit(patch)` with
 * ONLY the fields the user actually changed — empty form fields the
 * user never touched are not included in the patch. The backend
 * PATCH endpoints treat absent keys as "leave untouched", so this
 * means a partial edit (e.g. just renaming) never accidentally
 * wipes out unrelated columns (Sex, Birthdate, About, …).
 *
 * The modal is keyed in the parent on the selected row's id, so
 * mounting it for a new row resets local state and prevents any
 * "data bleeding" from a previous edit session.
 */
import React from 'react';
import { X, ArrowLeft, Save } from 'react-feather';
import styles from '../styles/AddRecordModal.module.sass';
import SearchableSelect from './SearchableSelect.jsx';
import { RecordMeta } from './RecordTimestamps.jsx';

const EditRecordModal = ({ title, fields, initial, onSubmit, onClose, onRemove, removeLabel, onBack, columns = 2, width = 'min(640px, 94vw)' }) => {
  // Snapshot the initial values once so we can diff against them at submit time.
  const initialValues = React.useMemo(() => {
    const v = {};
    fields.forEach((f) => {
      if (f.type === 'checkboxes') {
        v[f.key] = Array.isArray(initial && initial[f.key]) ? initial[f.key] : [];
      } else {
        v[f.key] = (initial && initial[f.key] != null) ? String(initial[f.key]) : '';
      }
    });
    return v;
  }, [initial, fields]);

  const [values, setValues] = React.useState(initialValues);
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError]   = React.useState(null);

  const setField = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  // True if at least one field's current value differs from its snapshot.
  // Used to disable Save until the user actually changes something.
  const isDirty = React.useMemo(() => {
    return Object.keys(values).some((k) => {
      const cur  = values[k];
      const orig = initialValues[k];
      if (Array.isArray(cur) || Array.isArray(orig)) {
        const a = Array.isArray(cur) ? cur : [];
        const b = Array.isArray(orig) ? orig : [];
        return a.length !== b.length || a.some((x) => !b.includes(x)) || b.some((x) => !a.includes(x));
      }
      return cur !== orig;
    });
  }, [values, initialValues]);

  // Optional "Remove" action (replaces "Cancel" when onRemove is provided).
  // The parent is expected to close the modal on success.
  const handleRemove = async () => {
    if (!onRemove) return;
    setRemoving(true); setError(null);
    try {
      await onRemove();
    } catch (err) {
      setError(err.message || 'Remove failed');
      setRemoving(false);
    }
  };

  const submit = async () => {
    for (const f of fields) {
      if (!f.required) continue;
      const v = values[f.key];
      const empty = f.type === 'checkboxes' ? !(Array.isArray(v) && v.length > 0) : !v;
      if (empty) { setError(f.label + ' is required'); return; }
    }
    // Build a patch of only the keys the user actually modified.
    const patch = {};
    Object.keys(values).forEach((k) => {
      const cur = values[k];
      const orig = initialValues[k];
      let changed;
      if (Array.isArray(cur) || Array.isArray(orig)) {
        const a = Array.isArray(cur) ? cur : [];
        const b = Array.isArray(orig) ? orig : [];
        changed = a.length !== b.length || a.some((x) => !b.includes(x)) || b.some((x) => !a.includes(x));
      } else {
        changed = cur !== orig;
      }
      if (changed) patch[k] = cur;
    });
    // If nothing changed, treat as a no-op close.
    if (Object.keys(patch).length === 0) { onClose(); return; }

    setSaving(true); setError(null);
    try {
      await onSubmit(patch);
      onClose();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Renders just the control for a field (label + cell wrapper handled
  // by the caller). Keeps the field switch in one place.
  const renderControl = (f) => {
    if (f.readOnly) {
      // Display-only field: shows the value but cannot be edited, and since
      // its value never changes it is never included in the saved patch.
      return (
        <input
          className={styles.input}
          value={values[f.key] || ''}
          readOnly
          disabled
          tabIndex={-1}
          style={{ background: '#F3F4F6', color: '#6B7280', cursor: 'not-allowed' }}
        />
      );
    }
    if (f.type === 'checkboxes') {
      return (
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
      );
    }
    if (f.type === 'segmented') {
      // 1-click pill toggle in a unified track (e.g. Female | Male).
      return (
        <div style={{ display: 'flex', alignItems: 'center', padding: 3, gap: 0, background: '#F3F4F6', borderRadius: 9999, height: 36 }}>
          {(f.options || []).map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            const selected = values[f.key] === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setField(f.key, val)}
                style={{
                  flex: 1, height: 30, border: 'none', outline: 'none', borderRadius: 9999,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0, lineHeight: 1,
                  background: selected ? '#FFFFFF' : 'transparent',
                  color: selected ? '#18191A' : '#6B7280',
                  fontWeight: selected ? 600 : 500, fontSize: 13, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: selected ? 'inset 0 0 0 1.5px #18191A' : 'none',
                  transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      );
    }
    if (f.type === 'searchable-select') {
      return (
        <SearchableSelect
          value={values[f.key] || ''}
          onChange={(v) => setField(f.key, v)}
          options={f.options || []}
          placeholder={f.placeholder || 'Search…'}
        />
      );
    }
    if (f.type === 'select') {
      return (
        <select
          className={styles.select}
          value={values[f.key] || ''}
          onChange={(e) => {
            const v = e.target.value;
            setValues((prev) => {
              const next = { ...prev, [f.key]: v };
              if (f.onSelect) Object.assign(next, f.onSelect(v) || {});
              return next;
            });
          }}
          style={f.highlight ? { borderColor: '#B91C1C', boxShadow: '0 0 0 1px rgba(185,28,28,0.35)' } : undefined}
        >
          <option value="">— Select —</option>
          {(f.options || []).map((opt) => (
            typeof opt === 'string'
              ? <option key={opt} value={opt}>{opt}</option>
              : <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    if (f.type === 'textarea') {
      return <textarea className={styles.textarea} value={values[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} />;
    }
    return (
      <input
        className={styles.input}
        type={f.type || 'text'}
        value={values[f.key] || ''}
        onChange={(e) => setField(f.key, e.target.value)}
        style={f.highlight ? { borderColor: '#B91C1C', boxShadow: '0 0 0 1px rgba(185,28,28,0.35)' } : undefined}
      />
    );
  };

  return (
    <>
      <div className={styles.overlay} onClick={() => !saving && onClose()} />
      {/* Override the shared .modal padding/scroll so we can pin a sticky
          header + footer and scroll ONLY the body. */}
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        style={{ padding: 0, gap: 0, overflow: 'hidden', maxHeight: '90vh', width }}
      >
        {/* Sticky header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '14px 24px 10px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {onBack && (
                <button
                  onClick={onBack}
                  disabled={saving || removing}
                  title="Back to view"
                  aria-label="Back"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', borderRadius: 6 }}
                >
                  <ArrowLeft size={20} color="#18191A" />
                </button>
              )}
              <div className={styles.title}>{title}</div>
            </div>
          </div>
          <button onClick={onClose} disabled={saving || removing} style={{ background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 0, display: 'inline-flex', alignItems: 'center' }}>
            <X size={22} color="#18191A" />
          </button>
        </div>

        {/* Scrollable body — only this area scrolls */}
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '8px 24px 22px' }}>
          {/* System-generated audit timestamps — read-only, below the header line. */}
          <RecordMeta record={initial} style={{ marginBottom: 20 }} />
          <div
            className={styles.grid}
            style={columns !== 2 ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
          >
            {fields.map((f) => {
              // 2-column modals keep the class-based half/full behaviour (and
              // its responsive collapse); wider grids span columns explicitly,
              // where colSpan is measured in grid columns.
              const cellProps = columns === 2
                ? { className: styles.field + ' ' + (f.colSpan === 1 ? styles.colHalf : styles.colFull) }
                : { className: styles.field, style: { gridColumn: 'span ' + Math.min(f.colSpan || columns, columns) } };
              return (
                <div key={f.key} {...cellProps}>
                  <label className={styles.label}>{f.label}{f.required && <span style={{ color: '#B91C1C' }}> *</span>}</label>
                  {renderControl(f)}
                  {f.helperText && <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 4 }}>{f.helperText}</div>}
                  {f.note && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{f.note}</div>}
                </div>
              );
            })}
          </div>
          {error && <div className={styles.error} style={{ marginTop: 14 }}>{error}</div>}
        </div>

        {/* Sticky footer */}
        <div className={styles.buttons} style={{ margin: 0, padding: '16px 24px', borderTop: '1px solid #E5E7EB', flexShrink: 0 }}>
          {onRemove && (
            <button
              disabled={saving || removing}
              className={styles.btn + ' ' + styles.btnCancel}
              style={{ borderColor: '#B91C1C', color: '#B91C1C' }}
              onClick={handleRemove}
            >
              {removing ? 'Removing…' : (removeLabel || 'Remove')}
            </button>
          )}
          <button
            disabled={saving || removing || !isDirty}
            className={styles.btn + ' ' + styles.btnPrimary}
            onClick={submit}
            style={{
              opacity: (!isDirty && !saving) ? 0.5 : 1,
              cursor: (!isDirty && !saving) ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Save size={16} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
};

export default EditRecordModal;
