import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../utils/api.js';
import { formErrors, fieldError, fieldsFor } from '../utils/referenceTypes.js';
import { createReference, updateReference, loadReferenceTypes } from '../utils/referenceStore.js';

// Shared by the Add / Edit page and the Add / Edit dialog: form state from a library record, an
// instant required-field check, then the server (which validates everything again and answers
// with per-field errors that are shown on the fields).
const fromRecord = (record) => ({
  type: record?.type || '',
  title: record?.title || '',
  authors: record?.authors || '',
  isbn: record?.isbn || '',
  year: record?.year ? String(record.year) : '',
  link: record?.link || '',
  publisher: record?.publisher || '',
  copies: record?.copies != null ? String(record.copies) : '',
  status: record?.status || 'available',
  category: record?.category || '',
  received: record?.received || '',
});

// The server's 400 body is { message, errors: { field: message } }; fetchJson puts it in the error text.
const serverFieldErrors = (err) => {
  const raw = String(err?.message || '');
  const start = raw.indexOf('{');
  if (start < 0) return {};
  try { return JSON.parse(raw.slice(start)).errors || {}; } catch { return {}; }
};

// prefill: { title, authors } for a new reference started from an instructor's title request.
export const useReferenceForm = (record, active = true, prefill = null) => {
  const start = useCallback(() => fromRecord(record || prefill), [record, prefill]);
  const [values, setValues] = useState(start);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [typesReady, setTypesReady] = useState(false);
  const [typesError, setTypesError] = useState('');

  // Reset whenever the form is (re)opened for a different record.
  useEffect(() => {
    if (!active) return;
    setValues(start());
    setErrors({});
  }, [start, active]);

  useEffect(() => {
    let live = true;
    loadReferenceTypes()
      .then(() => { if (live) setTypesReady(true); })
      .catch(err => { if (live) setTypesError(apiErrorMessage(err, 'The reference types could not be loaded.')); });
    return () => { live = false; };
  }, []);

  const change = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => (prev[field] ? { ...prev, [field]: null } : prev));
  }, []);

  // Leaving a field checks it, so a wrong year or link is flagged there and then, not after Save.
  // `value` is passed when the field has just changed it (a completed link), so the check sees the new value.
  const check = useCallback((fieldKey, value) => {
    const field = fieldsFor(values.type).find(f => f.key === fieldKey);
    if (!field) return;
    setErrors(prev => ({ ...prev, [fieldKey]: fieldError(field, value !== undefined ? value : values[fieldKey]) }));
  }, [values]);

  // Resolves { ok: true, created } (created: the new row, when adding) or { ok: false, message } (field errors are set on the form).
  const save = useCallback(async () => {
    const missing = formErrors(values.type, values);
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      return { ok: false, message: 'Please fix the errors in the form before saving.' };
    }
    setSaving(true);
    try {
      if (record) { await updateReference(record, values); return { ok: true }; }
      return { ok: true, created: await createReference(values) };
    } catch (err) {
      const fieldErrors = serverFieldErrors(err);
      setErrors(fieldErrors);
      return {
        ok: false,
        message: Object.keys(fieldErrors).length ? 'Please fix the errors in the form before saving.' : apiErrorMessage(err, 'The reference was not saved.'),
      };
    } finally {
      setSaving(false);
    }
  }, [values, record]);

  // Something entered that is not saved yet: what is in the form differs from what it was opened with.
  const dirty = JSON.stringify(values) !== JSON.stringify(start());

  return { values, errors, change, check, save, saving, typesReady, typesError, dirty };
};
