/**
 * EditEntityModal — the single, reusable "Edit <entity>" modal shared by the
 * LPMS list pages (Department, Faculty, Program, Course Offering, Industry
 * Consultant, Course Assignment). One layout; only the `fields` differ.
 *
 * Layout (top → bottom): [back] title + close · term-scope subtitle · date-
 * only metadata (full time on hover) · divider · fields (label, control, a
 * fixed ~16px reserved line for helper/validation text) · divider · Cancel +
 * Save (brand-filled when there are unsaved changes).
 *
 * Field config (`fields: Field[]`):
 *   { key, label,
 *     required?, optional?,             // red "*" / muted "(optional)"
 *     locked?, lockedHelper?,           // read-only identifier (lock icon)
 *     type?: 'text'|'number'|'email'|'date'|'select'|'reference'
 *            |'searchable-select'|'segmented'|'checkboxes'|'textarea',
 *     options?, onSelect?, placeholder?, highlight?, helper?,
 *     reference?: { options, normalize?, placeholder? },
 *     colSpan?,                          // in grid columns (default 1)
 *   }
 *
 * Saving diffs against the opened snapshot and calls onSave(patch) with only
 * the changed, non-locked keys. a11y: focus trapped; Esc / X / overlay close;
 * first editable field autofocused; labels tied to inputs; required/optional
 * and errors exposed to screen readers.
 */
import React from 'react';
import { X, Calendar, Lock, Save, ArrowLeft } from 'react-feather';
import SearchableSelect from './SearchableSelect.jsx';
import { formatDateOnly, formatTimestamp } from './RecordTimestamps.jsx';

const C = {
  bg: '#FFFFFF', bgMuted: '#F3F4F6', border: '#E5E7EB', inputBorder: '#D1D5DB',
  text: '#111827', textSec: '#374151', textMuted: '#6B7280', textTert: '#9CA3AF',
  danger: '#B91C1C', dangerBorder: '#DC2626', primary: '#EA1212',
};

const idOf = (key) => 'eem-field-' + key;
const helpId = (key) => 'eem-help-' + key;
const isCheck = (f) => f.type === 'checkboxes';

const readTimes = (record) => {
  const created = record ? (record.created_at ?? record.createdAt ?? null) : null;
  const updated = record ? (record.updated_at ?? record.updatedAt ?? null) : null;
  const edited = !!(created && updated) && new Date(updated).getTime() - new Date(created).getTime() > 1000;
  return { created, updated, edited };
};

const arraysDiffer = (a, b) => {
  const x = Array.isArray(a) ? a : [], y = Array.isArray(b) ? b : [];
  return x.length !== y.length || x.some((v) => !y.includes(v)) || y.some((v) => !x.includes(v));
};

const EditEntityModal = ({ title, termLabel, record, fields = [], onSave, onClose, onBack, onRemove, removeLabel = 'Remove', columns = 1, width = 'min(460px, 94vw)' }) => {
  const initialValues = React.useMemo(() => {
    const v = {};
    fields.forEach((f) => {
      if (isCheck(f)) v[f.key] = Array.isArray(record && record[f.key]) ? record[f.key] : [];
      else v[f.key] = (record && record[f.key] != null) ? String(record[f.key]) : '';
    });
    return v;
  }, [record, fields]);

  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [formError, setFormError] = React.useState(null);

  const busy = saving || removing;

  const handleRemove = async () => {
    if (!onRemove) return;
    setRemoving(true); setFormError(null);
    try { await onRemove(); }
    catch (err) { setFormError((err && err.message) || 'Remove failed.'); setRemoving(false); }
  };

  const dialogRef = React.useRef(null);
  const bodyRef = React.useRef(null);

  const setField = (key, v) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const isDirty = React.useMemo(() => Object.keys(initialValues).some((k) => {
    const cur = values[k], orig = initialValues[k];
    return (Array.isArray(cur) || Array.isArray(orig)) ? arraysDiffer(cur, orig) : cur !== orig;
  }), [values, initialValues]);

  React.useEffect(() => {
    const first = bodyRef.current && bodyRef.current.querySelector('input:not([readonly]):not([disabled]), select, textarea');
    if (first) first.focus();
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { if (!saving) onClose(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      const list = Array.prototype.filter.call(nodes, (el) => el.offsetParent !== null || el === document.activeElement);
      if (list.length === 0) return;
      const firstEl = list[0], lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const submit = async () => {
    const nextErrors = {};
    fields.forEach((f) => {
      if (!f.required || f.locked) return;
      const v = values[f.key];
      const empty = isCheck(f) ? !(Array.isArray(v) && v.length > 0) : !String(v || '').trim();
      if (empty) nextErrors[f.key] = f.label + ' is required.';
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstBad = fields.find((f) => nextErrors[f.key]);
      const el = firstBad && bodyRef.current && bodyRef.current.querySelector('#' + idOf(firstBad.key));
      if (el && el.focus) el.focus();
      return;
    }
    const patch = {};
    Object.keys(values).forEach((k) => {
      const f = fields.find((x) => x.key === k);
      if (f && f.locked) return;
      const cur = values[k], orig = initialValues[k];
      const changed = (Array.isArray(cur) || Array.isArray(orig)) ? arraysDiffer(cur, orig) : cur !== orig;
      if (changed) patch[k] = cur;
    });
    if (Object.keys(patch).length === 0) { onClose(); return; }

    setSaving(true); setFormError(null);
    try { await onSave(patch); onClose(); }
    catch (err) { setFormError((err && err.message) || 'Save failed.'); setSaving(false); }
  };

  const { created, updated, edited } = readTimes(record);

  const renderHelp = (f) => {
    if (errors[f.key]) return <span style={{ color: C.danger }}>{errors[f.key]}</span>;
    if (f.locked) return <span>{f.lockedHelper || "Identifier — can't be changed after creation."}</span>;
    return f.helper ? <span>{f.helper}</span> : null;
  };

  const renderControl = (f) => {
    const invalid = !!errors[f.key];
    const baseInput = {
      width: '100%', height: 40, padding: '0 12px', fontSize: 14, color: C.text, background: C.bg,
      borderRadius: 6, border: '1px solid ' + (invalid ? C.dangerBorder : (f.highlight ? C.dangerBorder : C.inputBorder)),
      boxShadow: invalid ? '0 0 0 1px rgba(220,38,38,0.22)' : (f.highlight ? '0 0 0 1px rgba(185,28,28,0.30)' : 'none'),
    };

    // A field may supply a fully custom control (e.g. a tag picker). It
    // receives the current value + an onChange and renders whatever it likes.
    if (typeof f.render === 'function') {
      return (
        <div id={idOf(f.key)} aria-describedby={helpId(f.key)}>
          {f.render({ value: values[f.key], onChange: (v) => setField(f.key, v), invalid })}
        </div>
      );
    }
    if (f.locked) {
      return (
        <div style={{ position: 'relative' }}>
          <input id={idOf(f.key)} value={values[f.key] || ''} readOnly aria-describedby={helpId(f.key)}
            style={{ ...baseInput, background: C.bgMuted, color: C.textMuted, paddingRight: 36, cursor: 'not-allowed' }} />
          <Lock size={15} color={C.textTert} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      );
    }
    if (isCheck(f)) {
      const arr = Array.isArray(values[f.key]) ? values[f.key] : [];
      return (
        <div id={idOf(f.key)} aria-describedby={helpId(f.key)} style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid ' + (invalid ? C.dangerBorder : C.inputBorder), borderRadius: 6, padding: '8px 12px' }}>
          {(f.options || []).length === 0 && <div style={{ fontSize: 13, color: C.textMuted }}>No options available.</div>}
          {(f.options || []).map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            const checked = arr.includes(val);
            return (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={checked}
                  onChange={(e) => setField(f.key, e.target.checked ? [...arr, val] : arr.filter((v) => v !== val))} />
                <span style={{ fontSize: 14 }}>{label}</span>
              </label>
            );
          })}
        </div>
      );
    }
    if (f.type === 'segmented') {
      return (
        <div id={idOf(f.key)} aria-describedby={helpId(f.key)} style={{ display: 'flex', alignItems: 'center', padding: 3, background: C.bgMuted, borderRadius: 9999, height: 40 }}>
          {(f.options || []).map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            const selected = values[f.key] === val;
            return (
              <button key={val} type="button" onClick={() => setField(f.key, val)}
                style={{ flex: 1, height: 32, border: 'none', borderRadius: 9999, padding: 0,
                  background: selected ? C.bg : 'transparent', color: selected ? C.text : C.textMuted,
                  fontWeight: selected ? 600 : 500, fontSize: 13, cursor: 'pointer',
                  boxShadow: selected ? 'inset 0 0 0 1.5px #111827' : 'none' }}>
                {label}
              </button>
            );
          })}
        </div>
      );
    }
    if (f.type === 'reference' || f.type === 'searchable-select') {
      const refList = (f.reference && f.reference.options) || f.options || [];
      const opts = refList.slice();
      const cur = String(values[f.key] || '').trim();
      // Keep the current value selectable if it isn't an option. Options may be
      // plain strings or { value, label, sub } objects — match on the value.
      const hasCur = opts.some((o) => String(o && typeof o === 'object' ? o.value : o) === cur);
      if (cur && !hasCur) opts.unshift(cur);
      return (
        <div id={idOf(f.key)} aria-describedby={helpId(f.key)}>
          <SearchableSelect value={values[f.key] || ''} onChange={(v) => setField(f.key, v)} options={opts}
            placeholder={(f.reference && f.reference.placeholder) || f.placeholder || 'Search…'}
            highlight={invalid || f.highlight} />
        </div>
      );
    }
    if (f.type === 'select') {
      // Rendered with the same modern searchable dropdown as the other pickers
      // (not a native <select>), so every dropdown looks consistent.
      return (
        <div id={idOf(f.key)} aria-describedby={helpId(f.key)}>
          <SearchableSelect
            value={values[f.key] || ''}
            onChange={(v) => {
              setErrors((prev) => (prev[f.key] ? { ...prev, [f.key]: undefined } : prev));
              setValues((prev) => { const next = { ...prev, [f.key]: v }; if (f.onSelect) Object.assign(next, f.onSelect(v) || {}); return next; });
            }}
            options={f.options || []}
            placeholder={f.placeholder || (f.required ? 'Select ' + f.label + '…' : '— Select —')}
            highlight={invalid || f.highlight}
          />
        </div>
      );
    }
    if (f.type === 'textarea') {
      return <textarea id={idOf(f.key)} value={values[f.key] || ''} aria-describedby={helpId(f.key)} placeholder={f.placeholder || undefined}
        onChange={(e) => setField(f.key, e.target.value)} style={{ ...baseInput, height: 88, padding: '8px 12px', resize: 'vertical' }} />;
    }
    return (
      <input id={idOf(f.key)} type={f.type || 'text'} value={values[f.key] || ''} aria-describedby={helpId(f.key)}
        aria-required={f.required || undefined} aria-invalid={invalid || undefined} placeholder={f.placeholder || undefined}
        onChange={(e) => setField(f.key, e.target.value)} style={baseInput} />
    );
  };

  const saveEnabled = isDirty && !busy;

  return (
    <>
      {/* z-index stays BELOW the SearchableSelect portal menu (1000) so a
          picker's dropdown overlays the dialog instead of hiding behind it. */}
      <div onClick={() => !busy && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="eem-title"
        style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', background: C.bg, borderRadius: 12, border: '1px solid ' + C.border,
          boxShadow: '0 20px 48px rgba(0,0,0,0.22)', zIndex: 201 }}>

        {/* Header + subtitle */}
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
              {onBack && (
                <button onClick={onBack} disabled={busy} aria-label="Back" title="Back"
                  style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer', color: C.text, marginTop: 1 }}>
                  <ArrowLeft size={20} />
                </button>
              )}
              <div style={{ minWidth: 0 }}>
                <div id="eem-title" style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{title}</div>
                {termLabel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.textMuted, marginTop: 3 }}>
                    <Calendar size={15} color={C.textMuted} /><span>Editing for {termLabel}</span>
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => !busy && onClose()} aria-label="Close"
              style={{ background: 'transparent', border: 'none', padding: 4, lineHeight: 0, color: C.textMuted, cursor: 'pointer', flexShrink: 0 }}>
              <X size={20} />
            </button>
          </div>

          {created && (
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: C.textMuted, margin: '10px 0 14px' }}>
              <span title={formatTimestamp(created)} style={{ cursor: 'help' }}>Created {formatDateOnly(created)}</span>
              <span title={edited ? formatTimestamp(updated) : undefined} style={{ cursor: edited ? 'help' : 'default' }}>
                Last updated {edited ? formatDateOnly(updated) : 'Never'}
              </span>
            </div>
          )}
        </div>

        {/* Fields */}
        <div ref={bodyRef} style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '14px 20px 4px', borderTop: '1px solid ' + C.border }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: 16 }}>
            {fields.map((f) => (
              <div key={f.key} style={{ gridColumn: 'span ' + Math.min(f.colSpan || 1, columns) }}>
                <label htmlFor={idOf(f.key)} style={{ display: 'block', fontSize: 13, color: C.textSec, marginBottom: 4 }}>
                  {f.label}
                  {f.required && <span style={{ color: C.danger }} aria-hidden="true"> *</span>}
                  {f.required && <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}> (required)</span>}
                </label>
                {renderControl(f)}
                <div id={helpId(f.key)} style={{ minHeight: 16, fontSize: 12, color: C.textMuted, margin: '3px 0 6px' }}>
                  {renderHelp(f)}
                </div>
              </div>
            ))}
          </div>
          {formError && <div role="alert" style={{ fontSize: 13, color: C.danger, marginBottom: 12 }}>{formError}</div>}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: onRemove ? 'space-between' : 'flex-end', alignItems: 'center', gap: 8, padding: '14px 20px', borderTop: '1px solid ' + C.border }}>
          {onRemove && (
            <button onClick={handleRemove} disabled={busy}
              style={{ height: 40, padding: '0 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, background: C.bg, color: C.danger,
                border: '1px solid ' + C.danger, cursor: busy ? 'not-allowed' : 'pointer' }}>
              {removing ? 'Removing…' : removeLabel}
            </button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => !busy && onClose()} disabled={busy}
              style={{ height: 40, padding: '0 16px', borderRadius: 6, fontSize: 14, fontWeight: 500, background: C.bg, color: C.textSec,
                border: '1px solid ' + C.inputBorder, cursor: busy ? 'not-allowed' : 'pointer' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={!saveEnabled} title={!isDirty ? 'Make a change to enable saving' : undefined}
              style={{ height: 40, padding: '0 18px', borderRadius: 6, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
                border: 'none', background: saveEnabled ? C.primary : '#E5E7EB', color: saveEnabled ? '#FFFFFF' : '#9CA3AF',
                cursor: saveEnabled ? 'pointer' : 'not-allowed', boxShadow: saveEnabled ? '0 1px 2px rgba(234,18,18,0.35)' : 'none' }}>
              <Save size={16} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditEntityModal;
