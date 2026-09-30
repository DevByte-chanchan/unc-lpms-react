// Column sorting for the module's list tables.
//
// PROVENANCE. Adapted from `src/services/tableSort.js` on this repository's
// `feature/course-assignment` branch — same project, different module. Two
// things changed on the way across, and both matter:
//
//   1. It lives in `utils/`, not `services/`. In THIS module `utils/` is the
//      pure-logic layer with a plain-node test beside each file, and
//      `services/` is the layer that talks to the API. This file has no I/O,
//      so it belongs in utils — and gets tableSort.test.js as a result.
//   2. STATUS_SORT_ORDER is completely rewritten. The original ranks
//      department / faculty / courseoffer / consultant / courseassign, none of
//      which exist here. A learning plan is draft → submitted → under review →
//      returned → dean → approved, so those are the statuses ranked below.
//      Copying the original's orders verbatim would have produced a sort that
//      silently did nothing, because `indexOf` never matches.
//
// The comparison itself (typed compare, missing values last) is unchanged,
// because it was already right. The one further simplification is noted at
// `sortRows`.

// ATTENTION FIRST, not alphabetical. An approver opening a list wants the
// plans that need them at the top; "Approved" is the one status that needs
// nothing. Sorting a status column A–Z would put "Approved" first, which is
// exactly backwards.
export const STATUS_SORT_ORDER = {
    // The workflow status keys.
    plan: ['returned', 'submitted', 'parallel_review', 'dean', 'draft', 'approved'],
    // The upper-case labels the approver tables use in their tabs and rows.
    approval: ['RETURNED', 'PENDING', 'UNDER REVIEW', 'APPROVED']
}

/**
 * Rank of a status within its entity's order. Unknown or blank statuses sort
 * last when ascending, rather than first — an unrecognised value is not
 * urgent, it is unclassified.
 */
export const statusRank = (entity, status) => {
    const order = STATUS_SORT_ORDER[entity] || []
    const i = order.indexOf(status)
    return i === -1 ? order.length : i
}

// Milliseconds since the epoch, or +Infinity when missing or unparseable, so
// rows with no date sort last ascending instead of clumping at the top as 0 —
// "no date yet" is not "1 January 1970".
const timeOf = (value) => {
    if (!value) return Number.POSITIVE_INFINITY
    const t = new Date(value).getTime()
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

const valueOf = (col, row) =>
    (typeof col.sortValue === 'function' ? col.sortValue(row) : row[col.key])

const compareTyped = (a, b, type) => {
    if (type === 'date') return timeOf(a) - timeOf(b)
    if (type === 'number') return (Number(a) || 0) - (Number(b) || 0)
    // localeCompare, not `<`, so "Ángeles" and "Zamora" order the way a person
    // expects rather than by code point.
    return String(a == null ? '' : a).toLowerCase()
        .localeCompare(String(b == null ? '' : b).toLowerCase())
}

/**
 * A new, sorted copy of `rows`.
 *
 * STABLE — equal rows keep the order they arrived in. That is not a detail:
 * the rows come out of the API in a meaningful order already, and an unstable
 * sort would reshuffle same-date rows every time the component re-rendered,
 * which reads as the table twitching.
 *
 * @param {Array} rows
 * @param {Array} columns  [{ key, label, width, type, sortValue?, thStyle? }]
 * @param {string} sortKey
 * @param {'asc'|'desc'} sortDir
 */
export const sortRows = (rows, columns, sortKey, sortDir) => {
    if (!Array.isArray(rows)) return []
    const cols = Array.isArray(columns) ? columns : []
    const col = cols.find(c => c && c.key === sortKey) || cols[0]
    if (!col) return rows.slice()
    const dir = sortDir === 'desc' ? -1 : 1
    // A plain sort on a copy. The original wraps every row in [row, index] and
    // tie-breaks on the index to force stability — but Array#sort has been
    // stable BY SPECIFICATION since ES2019, so that machinery does nothing.
    // Proved rather than assumed: deleting the tie-break from the original
    // shape failed no test, which is the definition of dead code.
    return rows.slice().sort((a, b) =>
        compareTyped(valueOf(col, a), valueOf(col, b), col.type || 'text') * dir)
}

/**
 * The (sortKey, sortDir) pair after a click on `key`: the active column flips
 * direction, a new column is selected ascending.
 */
export const nextSort = (current = {}, key) => {
    if (current.sortKey === key) {
        return { sortKey: key, sortDir: current.sortDir === 'asc' ? 'desc' : 'asc' }
    }
    return { sortKey: key, sortDir: 'asc' }
}

export const instructorCourseColumns = ({
    approved = false,
    getCode = row => row?.code,
    getName = row => row?.name
} = {}) => [
    { key: 'date_assigned', label: 'DATE ASSIGNED', width: 200, type: 'date' },
    { key: 'code', label: 'CODE', width: 150, type: 'text', sortValue: getCode },
    { key: 'name', label: 'COURSE NAME', width: 350, type: 'text', sortValue: getName },
    ...(approved
        ? [{ key: 'date_approved', label: 'DATE APPROVED', width: 200, type: 'date' }]
        : []),
    { key: 'actions', label: '', sortable: false }
]

export const referenceLibraryColumns = () => [
    { key: 'id', label: 'ID', width: 140, type: 'text' },
    { key: 'title', label: 'TITLE', width: 420, type: 'text' },
    { key: 'authors', label: 'AUTHOR(S)', width: 260, type: 'text' },
    { key: 'type', label: 'TYPE', width: 210, type: 'text' },
    { key: 'year', label: 'YEAR', width: 90, type: 'number' },
    { key: 'actions', label: '', sortable: false }
]

export default {
    STATUS_SORT_ORDER,
    statusRank,
    sortRows,
    nextSort,
    instructorCourseColumns,
    referenceLibraryColumns
}
