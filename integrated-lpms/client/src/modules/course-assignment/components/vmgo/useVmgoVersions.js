/**
 * State machine shared by the VMGO pages (University: OVPAA, Department: Dean).
 *
 *   View      — the Active version + its history.
 *   Step 1    — pick a PDF.
 *   Step 2    — api.extract (writes nothing) → the page's review form.
 *   Step 3    — api.save writes a new Active version.
 *   History   — view a version; restore copies it forward.
 *
 * The page supplies:
 *   api        { current, history, get, extract, save, restore } — already
 *              bound to whatever scopes it (the department code).
 *   scopeKey   changes when the scope does; the page reloads for it.
 *   enabled    false while the scope isn't known yet (nothing is loaded).
 *   listKeys   fields whose warnings are per item ("goals[2].title").
 *   toForm(fields, itemWarnings) → the review form's initial state.
 *   toPayload(form, meta) → the body for api.save; meta is
 *              { source_filename, source_sha256, uploaded_by } to spread in.
 *   loadErrorText  shown when the initial load fails without a message.
 */
import React from 'react';

export default function useVmgoVersions({
  api, scopeKey = '', enabled = true, listKeys, toForm, toPayload, userName, loadErrorText,
}) {
  // Latest callbacks without re-creating every action when the page re-renders.
  const cfg = React.useRef(null);
  cfg.current = { api, listKeys, toForm, toPayload, userName, loadErrorText };

  const [active, setActive]     = React.useState(null);
  const [history, setHistory]   = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);

  // Step 1
  const [showPicker, setShowPicker] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const fileInputRef = React.useRef(null);

  // Step 2 / 3
  const [reviewFile, setReviewFile] = React.useState(null);   // non-null opens the review dialog
  const [extracting, setExtracting] = React.useState(false);
  const [extractError, setExtractError] = React.useState(null);
  const [extracted, setExtracted] = React.useState(null);     // { warnings, sha256, sameAsActive, pages, fieldWarnings, general }
  const [form, setForm]           = React.useState(null);
  const [saving, setSaving]       = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);
  const [saved, setSaved]         = React.useState(null);     // the new row → step 3

  // History
  const [viewing, setViewing]     = React.useState(null);     // a version row
  const [toRestore, setToRestore] = React.useState(null);
  const [restoring, setRestoring] = React.useState(false);
  const [restoreError, setRestoreError] = React.useState(null);

  // Responses for a scope the page has since left are dropped.
  const loadSeq = React.useRef(0);

  const refresh = React.useCallback(async () => {
    const seq = ++loadSeq.current;
    const c = cfg.current;
    setLoadError(null);
    try {
      const [cur, hist] = await Promise.all([
        c.api.current().catch((err) => { if (err.status === 404) return null; throw err; }),
        c.api.history(),
      ]);
      if (seq !== loadSeq.current) return;
      setActive(cur);
      setHistory(hist || []);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setLoadError(err.message || c.loadErrorText);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    setActive(null);
    setHistory([]);
    refresh();
  }, [enabled, scopeKey, refresh]);

  const clearPicker = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openPicker = () => { clearPicker(); setShowPicker(true); };

  const pickFile = (f) => {
    if (!f) return;
    setSelectedFile(f);
  };

  // Step 1 → 2: extract. Nothing is written by this call.
  const startReview = async () => {
    if (!selectedFile) return;
    const c = cfg.current;
    const file = selectedFile;
    setShowPicker(false);
    setReviewFile(file);
    setExtracting(true); setExtractError(null); setExtracted(null); setForm(null);
    setSaveError(null); setSaved(null);
    try {
      const res = await c.api.extract(file);
      const fieldWarnings = {};
      const itemWarnings = {};
      for (const k of c.listKeys) itemWarnings[k] = {};
      const general = [];
      for (const w of res.warnings || []) {
        const m = w.field && w.field.match(/^(\w+)\[(\d+)\]/);
        if (m && itemWarnings[m[1]]) itemWarnings[m[1]][Number(m[2])] = w.message;
        else if (w.field) fieldWarnings[w.field] = w.message;
        else general.push(w);
      }
      setForm(c.toForm(res.fields || {}, itemWarnings));
      setExtracted({ ...res, fieldWarnings, general });
    } catch (err) {
      setExtractError(err.message || 'Could not read that PDF.');
    } finally {
      setExtracting(false);
    }
  };

  const closeReview = () => {
    if (saving) return;
    setReviewFile(null);
    clearPicker();
  };
  const backToPicker = () => {
    if (saving) return;
    setReviewFile(null);
    setShowPicker(true);
  };

  const doSave = async (canSave) => {
    if (!canSave || saving) return;
    const c = cfg.current;
    setSaving(true); setSaveError(null);
    try {
      const row = await c.api.save(c.toPayload(form, {
        source_filename: reviewFile ? reviewFile.name : null,
        source_sha256: extracted ? extracted.sha256 : null,
        uploaded_by: c.userName,
      }));
      setSaved(row);
      await refresh();
    } catch (err) {
      setSaveError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const openVersion = async (v) => {
    setRestoreError(null);
    try {
      setViewing(await cfg.current.api.get(v.id));
    } catch (err) {
      setRestoreError(err.message || 'Could not load that version.');
    }
  };

  const askRestore = (v) => { setRestoreError(null); setToRestore(v); };
  const cancelRestore = () => { if (!restoring) { setToRestore(null); setRestoreError(null); } };

  const doRestore = async () => {
    if (!toRestore) return;
    setRestoring(true); setRestoreError(null);
    try {
      await cfg.current.api.restore(toRestore.id, cfg.current.userName);
      setToRestore(null);
      setViewing(null);
      await refresh();
    } catch (err) {
      setRestoreError(err.message || 'Restore failed.');
    } finally {
      setRestoring(false);
    }
  };

  return {
    active, history, loading, loadError, refresh,
    showPicker, setShowPicker, selectedFile, fileInputRef, clearPicker, openPicker, pickFile, startReview,
    reviewFile, extracting, extractError, extracted, form, setForm,
    saving, saveError, saved, closeReview, backToPicker, doSave,
    viewing, setViewing, openVersion, toRestore, askRestore, cancelRestore, restoring, restoreError, doRestore,
  };
}
