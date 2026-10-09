// node src/utils/tableSort.test.js
//
// The sorting is pure, so it is tested here rather than through the table.
// The cases that matter are the ones a list table gets wrong in practice:
// missing dates, ties, and a status column sorted alphabetically.

import * as tableSort from './tableSort.js'

const { STATUS_SORT_ORDER, statusRank, sortRows, nextSort } = tableSort

let passed = 0
const test = (name, fn) => {
    try { fn(); passed++; console.log(`✓ ${name}`) }
    catch (error) { console.error(`✗ ${name}\n  ${error.message}`); process.exitCode = 1 }
}
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const codes = (rows) => rows.map(r => r.code).join(',')

const COLUMNS = [
    { key: 'date_assigned', label: 'DATE ASSIGNED', type: 'date' },
    { key: 'code', label: 'CODE', type: 'text' },
    { key: 'name', label: 'COURSE NAME', type: 'text' },
    { key: 'status', label: 'STATUS', type: 'number', sortValue: (r) => statusRank('approval', r.status) }
]

const ROWS = [
    { code: 'BSCS511', name: 'Mobile Game Development', date_assigned: '2026-07-04', status: 'APPROVED' },
    { code: 'IT 402', name: 'Advanced Databases', date_assigned: '2026-02-11', status: 'PENDING' },
    { code: 'BIT321L', name: 'Platform Technologies', date_assigned: null, status: 'RETURNED' },
    { code: 'BSCS330', name: 'Human Computer Interaction', date_assigned: '2026-02-11', status: 'PENDING' }
]

test('sorting by date puts the earliest first, and undated rows last', () => {
    const asc = sortRows(ROWS, COLUMNS, 'date_assigned', 'asc')
    assert(asc[asc.length - 1].code === 'BIT321L',
        `a row with no date should sort last, got ${codes(asc)}`)
    assert(asc[0].date_assigned === '2026-02-11', `earliest first, got ${codes(asc)}`)
})

test('a missing date is not treated as 1970', () => {
    // The bug this guards: `new Date(null).getTime()` is 0, so an undated row
    // sorts before every real date — the emptiest row shown first.
    const asc = sortRows(ROWS, COLUMNS, 'date_assigned', 'asc')
    assert(asc[0].code !== 'BIT321L', 'the undated row must not lead the ascending sort')
})

test('the sort is stable, so equal rows do not reshuffle', () => {
    // Rows that compare equal must come out in the order they went in. The
    // table re-sorts on every render; if ties moved, a list of same-day
    // submissions would visibly shuffle itself while the approver reads it.
    //
    // HONEST NOTE: this one documents a guarantee rather than guarding a
    // likely regression. Array#sort has been stable by specification since
    // ES2019, and no mutation of sortRows was found that makes this fail —
    // including a comparator that never returns 0, at 4 rows and at 40. It
    // stays because the behaviour is relied on, and because a future rewrite
    // that sorts by hand would break it.
    const tiedRows = Array.from({ length: 40 }, (_, i) => ({ code: `C${String(i).padStart(2, '0')}`, date_assigned: '2026-02-11' }))
    const sorted = sortRows(tiedRows, COLUMNS, 'date_assigned', 'asc')
    assert(codes(sorted) === codes(tiedRows), `ties were reordered:\n  in  ${codes(tiedRows)}\n  out ${codes(sorted)}`)

    // And the same input always gives the same output.
    const first = sortRows(ROWS, COLUMNS, 'date_assigned', 'asc')
    for (let i = 0; i < 20; i++) {
        assert(codes(sortRows(ROWS, COLUMNS, 'date_assigned', 'asc')) === codes(first),
            'the same input produced a different order')
    }
})

test('status sorts attention-first, not alphabetically', () => {
    const asc = sortRows(ROWS, COLUMNS, 'status', 'asc')
    // Alphabetically APPROVED would lead. It is the one status needing nothing,
    // so it must trail.
    assert(asc[0].status === 'RETURNED', `expected RETURNED first, got ${asc[0].status}`)
    assert(asc[asc.length - 1].status === 'APPROVED', `expected APPROVED last, got ${asc[asc.length - 1].status}`)
})

test('the status order is this module’s statuses, not another module’s', () => {
    // The file this was adapted from ranks department / faculty / courseassign.
    // Those never appear here, so `indexOf` would always return -1 and every
    // row would rank equal — a sort that silently does nothing.
    const ranks = ROWS.map(r => statusRank('approval', r.status))
    assert(new Set(ranks).size > 1, 'every row ranked the same — the status order does not match the data')
    assert(statusRank('approval', 'PENDING') < statusRank('approval', 'APPROVED'), 'pending before approved')
    assert(statusRank('plan', 'returned') < statusRank('plan', 'approved'), 'returned before approved')
})

test('an unknown status sorts last rather than first', () => {
    const order = STATUS_SORT_ORDER.approval
    assert(statusRank('approval', 'SOMETHING NEW') === order.length, 'unknown ranks after every known status')
    assert(statusRank('approval', '') === order.length, 'blank ranks after every known status')
    assert(statusRank('no-such-entity', 'PENDING') === 0, 'an unknown entity ranks everything equally')
})

test('descending is the exact reverse, ties aside', () => {
    const asc = sortRows(ROWS, COLUMNS, 'code', 'asc')
    const desc = sortRows(ROWS, COLUMNS, 'code', 'desc')
    assert(codes(desc) === codes([...asc].reverse()), `${codes(asc)} vs ${codes(desc)}`)
})

test('text sorts case-insensitively', () => {
    const mixed = [{ code: 'b' }, { code: 'A' }, { code: 'a' }, { code: 'B' }]
    const cols = [{ key: 'code', type: 'text' }]
    assert(codes(sortRows(mixed, cols, 'code', 'asc')) === 'A,a,b,B',
        `case must not split the alphabet: ${codes(sortRows(mixed, cols, 'code', 'asc'))}`)
})

test('sorting never mutates the rows it was given', () => {
    const original = codes(ROWS)
    sortRows(ROWS, COLUMNS, 'code', 'desc')
    assert(codes(ROWS) === original, 'sortRows must return a copy')
})

test('rubbish input returns something a table can render', () => {
    assert(Array.isArray(sortRows(null, COLUMNS, 'code', 'asc')), 'null rows → []')
    assert(sortRows(null, COLUMNS, 'code', 'asc').length === 0, 'null rows → empty')
    assert(codes(sortRows(ROWS, [], 'code', 'asc')) === codes(ROWS), 'no columns → unchanged copy')
    assert(codes(sortRows(ROWS, COLUMNS, 'no-such-column', 'asc')) === codes(sortRows(ROWS, COLUMNS, 'date_assigned', 'asc')),
        'an unknown sort key falls back to the first column')
})

test('clicking cycles the same column and resets a new one', () => {
    assert(JSON.stringify(nextSort({ sortKey: 'code', sortDir: 'asc' }, 'code')) === JSON.stringify({ sortKey: 'code', sortDir: 'desc' }), 'same column flips')
    assert(JSON.stringify(nextSort({ sortKey: 'code', sortDir: 'desc' }, 'code')) === JSON.stringify({ sortKey: 'code', sortDir: 'asc' }), 'and flips back')
    assert(JSON.stringify(nextSort({ sortKey: 'code', sortDir: 'desc' }, 'name')) === JSON.stringify({ sortKey: 'name', sortDir: 'asc' }),
        'a new column starts ascending, not carrying the old direction')
    assert(JSON.stringify(nextSort({}, 'code')) === JSON.stringify({ sortKey: 'code', sortDir: 'asc' }), 'no current sort → ascending')
})

test('the instructor table model sorts every visible data column', () => {
    assert(typeof tableSort.instructorCourseColumns === 'function', 'instructor course columns are missing')
    const getCode = row => row.offering.course.code
    const getName = row => row.offering.course.name
    const columns = tableSort.instructorCourseColumns({ approved: true, getCode, getName })
    assert(columns.map(column => column.key).join(',') === 'date_assigned,code,name,date_approved,actions',
        `wrong instructor columns: ${columns.map(column => column.key).join(',')}`)

    const rows = [
        { date_assigned: '2026-08-03', date_approved: '2026-08-20', offering: { course: { code: 'Z9', name: 'Algorithms' } } },
        { date_assigned: '2026-08-01', date_approved: '2026-08-22', offering: { course: { code: 'A1', name: 'Networks' } } }
    ]
    assert(sortRows(rows, columns, 'code', 'asc')[0].offering.course.code === 'A1', 'code arrow must sort nested course codes')
    assert(sortRows(rows, columns, 'name', 'asc')[0].offering.course.name === 'Algorithms', 'course-name arrow must sort nested names')
    assert(sortRows(rows, columns, 'date_approved', 'desc')[0].date_approved === '2026-08-22', 'date-approved arrow must sort newest first')
})

test('the reference-library table model sorts ID, title, authors, type, and year', () => {
    assert(typeof tableSort.referenceLibraryColumns === 'function', 'reference library columns are missing')
    const columns = tableSort.referenceLibraryColumns()
    assert(columns.map(column => column.key).join(',') === 'id,title,authors,type,year,actions',
        `wrong reference columns: ${columns.map(column => column.key).join(',')}`)
    const refs = [
        { id: 'TB-10', title: 'Zoology', authors: 'Bravo', type: 'Textbook', year: 1999 },
        { id: 'TB-02', title: 'Algorithms', authors: 'Alpha', type: 'Online Resources', year: 2024 }
    ]
    assert(sortRows(refs, columns, 'title', 'asc')[0].title === 'Algorithms', 'title arrow must sort alphabetically')
    assert(sortRows(refs, columns, 'authors', 'asc')[0].authors === 'Alpha', 'author arrow must sort alphabetically')
    assert(sortRows(refs, columns, 'year', 'desc')[0].year === 2024, 'year arrow must sort numerically')
})

test('text ids sort by number inside the text: srv-2 comes before srv-10 and srv-100', () => {
    const columns = tableSort.referenceLibraryColumns()
    const refs = ['srv-100', 'srv-2', 'srv-10', 'srv-1'].map(id => ({ id, title: id, authors: '', type: '', year: 0 }))
    const ordered = sortRows(refs, columns, 'id', 'asc').map(ref => ref.id).join(',')
    assert(ordered === 'srv-1,srv-2,srv-10,srv-100', ordered)
})

console.log(`\n${passed} table-sort checks passed.`)
