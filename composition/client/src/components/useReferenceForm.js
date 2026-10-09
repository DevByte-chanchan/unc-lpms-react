import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../utils/api.js';
import { missingRequired } from '../utils/referenceTypes.js';
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
});

// The server's 400 body is { message, errors: { field: message } }; fetchJson puts it in the error text.
const serverFieldErrors = (err) => {
  const raw = String(err?.message || '');
  const start = raw.indexOf('{');
  if (start < 0) return {};
  try { return JSON.parse(raw.slice(start)).errors || {}; } catch { return {}; }
};

export const useReferenceForm = (record, active = true) => {
  const [values, setValues] = useState(() => fromRecord(record));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [typesReady, setTypesReady] = useState(false);
  const [typesError, setTypesError] = useState('');

  // Reset whenever the form is (re)opened for a different record.
  useEffect(() => {
    if (!active) return;
    setValues(fromRecord(record));
    setErrors({});
  }, [record, active]);

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

  // Resolves { ok: true } or { ok: false, message } (field errors are set on the form).
  const save = useCallback(async () => {
    const missing = missingRequired(values.type, values);
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      return { ok: false, message: 'Please fix the errors in the form before saving.' };
    }
    setSaving(true);
    try {
      if (record) await updateReference(record, values);
      else await createReference(values);
      return { ok: true };
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

  return { values, errors, change, save, saving, typesReady, typesError };
};
