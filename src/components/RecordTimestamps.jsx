/**
 * RecordTimestamps — shared created/updated audit-log statement.
 *
 * Reads the system timestamps off a record (accepts either Sequelize's
 * serialized camelCase `createdAt`/`updatedAt` OR the raw snake_case
 * `created_at`/`updated_at`, so it is backend-compatible either way) and
 * renders them as a muted, read-only statement that sits at the TOP of a
 * modal, just below the header title — in both VIEW and EDIT popups:
 *
 *   Created on: Oct 24, 2025 • 09:14 AM
 *   Last Updated: Mar 27, 2026 • 01:40 PM   (or "Never" if untouched)
 *
 * These are NEVER editable inputs — they are system-generated audit
 * timestamps, so users cannot falsify the historical log.
 */
import React from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Oct 24, 2025 • 09:14 AM" — formatted by hand (not toLocaleString) so it
// reads identically on every machine regardless of the browser's locale.
export const formatTimestamp = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const month = MONTHS[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  const hh = String(d.getHours() % 12 || 12).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${month} ${day}, ${year} • ${hh}:${mm} ${ampm}`;
};

// Date only — "May 19, 2026" (no leading zero on the day, as in the table
// design). Used for table date columns where the exact time is revealed on
// hover rather than shown inline.
export const formatDateOnly = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

/**
 * DateCell — a table date column that shows the DATE ONLY by default and
 * reveals the exact date + time on hover (native title tooltip). Falls back
 * to a muted dash when the value is missing.
 */
export const DateCell = ({ value, style }) => {
  const dateStr = formatDateOnly(value);
  if (!dateStr) {
    return <span style={{ color: '#9CA3AF', ...style }}>—</span>;
  }
  return (
    <span title={formatTimestamp(value)} style={{ color: '#374151', cursor: 'default', ...style }}>
      {dateStr}
    </span>
  );
};

// Pull the two ISO strings off the record (camelCase or snake_case) and
// decide whether it has ever been edited. Sequelize stamps updated_at ===
// created_at on insert, so we treat a <1s gap (or a missing value) as
// "never edited".
const readTimestamps = (record) => {
  const created = record ? (record.created_at ?? record.createdAt ?? null) : null;
  const updated = record ? (record.updated_at ?? record.updatedAt ?? null) : null;
  const edited = !!(created && updated) &&
    new Date(updated).getTime() - new Date(created).getTime() > 1000;
  return { created, updated, edited };
};

/**
 * Muted timestamp statement, meant to sit directly below a modal's
 * header title. `style` is merged last so callers can fine-tune spacing
 * to match each modal's layout.
 */
export const RecordMeta = ({ record, style }) => {
  const { created, updated, edited } = readTimestamps(record);
  const createdStr = formatTimestamp(created);
  if (!createdStr) return null; // nothing to show (e.g. record not yet persisted)
  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'flex-end', gap: 16, fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap', ...style }}>
      <span style={{ whiteSpace: 'nowrap' }}>Created on: {createdStr}</span>
      <span style={{ whiteSpace: 'nowrap' }}>Last Updated: {edited ? formatTimestamp(updated) : 'Never'}</span>
    </div>
  );
};
