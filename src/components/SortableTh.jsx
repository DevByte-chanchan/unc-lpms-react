/**
 * SortableTh — a clickable table header cell that sorts by its column,
 * styled to match the OVPAA "Learning Plan" repository header
 * (ApprovedFileTable): a compact uppercase slate label with a small arrow
 * that's faint on inactive columns and solid on the active one.
 *
 * Rendered as a real <button> (keyboard-focusable, toggled with
 * Enter/Space). The <th> carries aria-sort="ascending" | "descending" |
 * "none", and a visually-hidden span announces the current sort state.
 *
 *   col = { key, label, width, type, sortValue?, thStyle? }
 *
 * Clicking calls onSort(col.key); the parent decides toggle/select.
 */
import { ArrowUp, ArrowDown } from 'react-feather';
import styles from '../styles/SortableHeader.module.sass';

const SortableTh = ({ col, sortKey, sortDir, onSort }) => {
  const active = col.key === sortKey;
  const dir = sortDir === 'desc' ? 'desc' : 'asc';
  const ariaSort = active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none';

  // Opt-out: a column with sortable === false renders a static, non-clickable
  // header (no sort button, no arrow).
  if (col.sortable === false) {
    return (
      <th width={col.width} style={{ overflow: 'visible', ...(col.thStyle || {}) }}>
        <span className={styles.label}>{col.label}</span>
      </th>
    );
  }

  return (
    // overflow:visible so the button's keyboard focus ring isn't clipped by
    // the global `th { overflow: hidden }`.
    <th width={col.width} aria-sort={ariaSort} style={{ overflow: 'visible', ...(col.thStyle || {}) }}>
      <button type="button" className={styles.btn} onClick={() => onSort(col.key)} aria-label={'Sort by ' + col.label}>
        <span className={styles.label}>{col.label}</span>
        <span className={styles.arrow} style={{ opacity: active ? 1 : 0.35 }} aria-hidden="true">
          {active && dir === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
        </span>
        <span className={styles.srOnly}>
          {active ? (dir === 'desc' ? '(sorted descending)' : '(sorted ascending)') : '(click to sort)'}
        </span>
      </button>
    </th>
  );
};

export default SortableTh;
