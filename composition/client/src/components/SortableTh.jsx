import { ArrowUp, ArrowDown } from 'react-feather'
import styles from '../styles/SortableHeader.module.sass'

/**
 * A table header cell you can click to sort by.
 *
 * PROVENANCE. From `src/components/SortableTh.jsx` on this repository's
 * `feature/course-assignment` branch. Copied close to verbatim — it was
 * already right — with the colours moved onto this module's design tokens so
 * the focus ring matches every other focus ring here.
 *
 *   col = { key, label, width, type, sortValue?, thStyle?, className?, sortable? }
 *
 * The parent owns the sort state and decides what a click means; this only
 * reports which column was clicked. Pair it with `utils/tableSort.js`.
 *
 * Two details that are easy to lose and hard to notice:
 *  - It is a real <button>, so it is reachable by keyboard and activates on
 *    Enter and Space without any of that being written here.
 *  - `overflow: visible` on the <th> overrides the global `th { overflow:
 *    hidden }` in index.css, which would otherwise clip the focus ring to
 *    nothing for the keyboard user who needs it.
 */
const SortableTh = ({ col, sortKey, sortDir, onSort }) => {
    const active = col.key === sortKey
    const dir = sortDir === 'desc' ? 'desc' : 'asc'
    const ariaSort = active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'

    // A column that opts out renders as a plain header — no button, no arrow,
    // nothing to click. Used for the actions column, which sorts by nothing.
    if (col.sortable === false) {
        return (
            <th width={col.width} className={col.className} style={{ overflow: 'visible', ...(col.thStyle || {}) }}>
                <span className={styles.label}>{col.label}</span>
            </th>
        )
    }

    return (
        <th width={col.width} className={col.className} aria-sort={ariaSort} style={{ overflow: 'visible', ...(col.thStyle || {}) }}>
            <button type="button" className={styles.btn} onClick={() => onSort(col.key)} aria-label={`Sort by ${col.label}`}>
                <span className={styles.label}>{col.label}</span>
                <span className={styles.arrow} style={{ opacity: active ? 1 : 0.35 }} aria-hidden="true">
                    {active && dir === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                </span>
                {/* The arrow is aria-hidden, so the state has to be said in
                    words for anyone who cannot see it. */}
                <span className={styles.srOnly}>
                    {active ? (dir === 'desc' ? '(sorted descending)' : '(sorted ascending)') : '(click to sort)'}
                </span>
            </button>
        </th>
    )
}

export default SortableTh
