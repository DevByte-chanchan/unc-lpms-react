/**
 * Plain helpers for the VMGO pages (kept out of VmgoShared.jsx so that file
 * only exports components — React fast refresh needs that).
 */
export const cx = (...names) => names.filter(Boolean).join(' ');

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');
export const same = (a, b) => String(a || '').replace(/\s+/g, ' ').trim() === String(b || '').replace(/\s+/g, ' ').trim();
export const sameItem = (a, b) => !!a && !!b && same(a.title, b.title) && same(a.description, b.description);
export const listChanged = (items, cur) => items.length !== (cur || []).length || items.some((it, i) => !sameItem(it, cur[i]));

export const versionMeta = (v) => [
  'Last updated ' + fmtDate(v.createdAt),
  v.uploaded_by ? 'by ' + v.uploaded_by : null,
].filter(Boolean).join(' ') + (v.source_filename ? ' · from ' + v.source_filename : '');

let keySeq = 0;
/** API list items → editable rows with a stable React key and their warning. */
export const withKeys = (items, warningsByIndex = {}) =>
  (items || []).map((it, i) => ({
    _key: 'k' + (++keySeq),
    _warning: warningsByIndex[i] || null,
    title: it.title || '',
    description: it.description || '',
  }));

/** Form list rows → [{ order, title, description }], blank rows dropped. */
export const stripItems = (items) => items
  .map(({ title, description }) => ({ title: title.trim(), description: description.trim() }))
  .filter((it) => it.title || it.description)
  .map((it, i) => ({ order: i + 1, ...it }));
