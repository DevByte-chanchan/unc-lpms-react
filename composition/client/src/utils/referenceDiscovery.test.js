// node src/utils/referenceDiscovery.test.js

import * as discovery from './referenceDiscovery.js'
import {
  buildReferenceFacets,
  filterReferenceRecords,
  loadReferenceSavedViews,
  normalizeReferenceLibraryRows,
  paginateReferenceRecords,
  sanitizeSavedViews,
  storeReferenceSavedViews,
} from './referenceDiscovery.js'

const { getReferencePreview } = discovery

let passed = 0
const test = (name, fn) => {
  try {
    fn()
    passed += 1
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}\n  ${error.message}`)
    process.exitCode = 1
  }
}
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const equal = (actual, expected, message) => {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  assert(actualJson === expectedJson, `${message}\n  expected ${expectedJson}\n  received ${actualJson}`)
}

const RECORDS = [
  {
    id: 'R-1',
    title: 'Database Systems',
    authors: 'Connolly and Begg',
    isbn: '978-1-292-06118-4',
    publisher: 'Péarson',
    type: 'Textbook',
    year: 2024,
    departments: ['SCIS'],
    uploadDate: '2026-08-20',
    archived: false,
  },
  {
    id: 'R-2',
    title: 'Web Accessibility Guide',
    authors: 'W3C',
    isbn: '',
    publisher: 'World Wide Web Consortium',
    type: 'Online Resources',
    year: 2019,
    departments: ['SCIS', 'General Education'],
    uploadDate: '2025-01-10',
    archived: false,
  },
  {
    id: 'R-3',
    title: 'Principles of Accounting',
    authors: 'Needles',
    isbn: '978-0-1234',
    publisher: 'Cengage',
    type: 'Textbook',
    year: 2022,
    departments: ['CBA'],
    uploadDate: '2026-07-01',
    archived: true,
  },
  {
    id: 'R-4',
    title: 'Undated Learning Resource',
    authors: 'UNC',
    isbn: '',
    publisher: '',
    type: 'Open Educational Resources',
    year: '',
    departments: [],
    uploadDate: '',
    archived: false,
  },
]

test('references become deprecated at the inclusive five-year boundary', () => {
  assert(typeof discovery.isReferenceDeprecated === 'function', 'isReferenceDeprecated must be exported')
  assert(discovery.isReferenceDeprecated({ year: 2021 }, 2026), 'a 2021 reference is five years old in 2026')
  assert(discovery.isReferenceDeprecated({ year: '2020' }, 2026), 'older string years must also be deprecated')
  assert(!discovery.isReferenceDeprecated({ year: 2022 }, 2026), 'a four-year-old reference is not deprecated')
  assert(!discovery.isReferenceDeprecated({ year: '' }, 2026), 'an unknown year must not be labelled deprecated')
  assert(!discovery.isReferenceDeprecated({ year: 'not-a-year' }, 2026), 'an invalid year must not be labelled deprecated')
})

test('server reference duplicates consolidate without losing linked metadata', () => {
  const rows = [
    {
      reference_id: 38,
      title: 'CCS VMO Curated Materials',
      author: "CCS Dean's Office",
      type: 'OER',
      publication_year: '2024-06-01 00:00:00.000 +00:00',
      used_in_courses: 'BIT321L',
      programs: 'Bachelor of Science in Information Technology',
      departments: 'School of Computer and Information Sciences',
    },
    {
      reference_id: 28,
      title: ' CCS VMO  Curated Materials ',
      author: "CCS Dean’s Office",
      type: 'OER',
      publication_year: '2024-06-01 00:00:00.000 +00:00',
      used_in_courses: 'BIT313L',
      programs: 'Bachelor of Science in Information Technology',
      departments: 'School of Computer and Information Sciences',
    },
  ]

  equal(normalizeReferenceLibraryRows(rows), [{
    id: 'srv-28',
    numericId: 28,
    sourceIds: [28, 38],
    title: 'CCS VMO Curated Materials',
    authors: "CCS Dean’s Office",
    type: 'OER',
    year: 2024,
    isbn: '',
    link: '',
    publisher: '',
    filename: '',
    uploadDate: '',
    hasIssue: false,
    archived: false,
    departments: ['School of Computer and Information Sciences'],
    programs: ['Bachelor of Science in Information Technology'],
    usedInCourses: ['BIT313L', 'BIT321L'],
  }], 'exact title and author matches should become one display row with unioned course metadata')
})

test('server references sharing only an ISBN remain separate records', () => {
  const rows = [
    {
      reference_id: 129,
      title: 'Clean Architecture',
      author: 'Robert C. Martin',
      isbn: '978-0134494166',
      type: 'Textbook',
      publication_year: '2017-01-01',
      departments: 'School of Computer and Information Sciences',
    },
    {
      reference_id: 52,
      title: 'Platform Technologies Handbook: Vol 5',
      author: 'Tech Author 5',
      isbn: '978-0134494166',
      type: 'Online Resource',
      publication_year: '2025-01-01',
      departments: 'School of Computer and Information Sciences',
    },
  ]

  const normalized = normalizeReferenceLibraryRows(rows)
  equal(normalized.map(record => record.id), ['srv-52', 'srv-129'], 'ISBN reuse must not collapse different works')
})

test('departments come from the server, and a record is archived only when every row behind it is', () => {
  const row = (id, extra) => ({
    reference_id: id,
    title: 'Baeldung: Guide to Java Streams',
    author: 'Eugen Paraschiv',
    type: 'Online Resource',
    used_in_courses: 'BIT213L',
    programs: 'Bachelor of Science in Information Technology',
    departments: 'School of Computer and Information Sciences',
    ...extra,
  })

  const [mixed] = normalizeReferenceLibraryRows([row(141, { archived: 1 }), row(142, { archived: 0 })])
  equal(mixed.departments, ['School of Computer and Information Sciences'], 'server department relations are used as they are')
  assert(!mixed.archived, 'one active row keeps the consolidated record active')
  equal(mixed.sourceIds, [141, 142], 'the record knows every server row behind it')

  const [archived] = normalizeReferenceLibraryRows([row(141, { archived: 1 }), row(142, { archived: true })])
  assert(archived.archived, 'every row archived: the record is archived')

  const [withPublisher] = normalizeReferenceLibraryRows([row(143, { publisher: "  O'Reilly   Media " })])
  equal(withPublisher.publisher, "O'Reilly Media", 'the publisher / provider comes from the server')
  equal(withPublisher.type, 'Online Resource', 'the type is the server key, unchanged')
})

test('all-field search matches normalized title, author, ID, ISBN, and publisher', () => {
  for (const query of ['database', 'connolly', 'R-1', '1292 06118', 'pearson']) {
    equal(
      filterReferenceRecords(RECORDS, { query, searchField: 'all', tab: 'active' }).map(record => record.id),
      ['R-1'],
      `all-field query ${query} should find R-1`,
    )
  }
})

test('field-specific search does not match values from another field', () => {
  equal(
    filterReferenceRecords(RECORDS, { query: 'Connolly', searchField: 'title', tab: 'active' }),
    [],
    'an author must not match a title-only search',
  )
  equal(
    filterReferenceRecords(RECORDS, { query: 'Connolly', searchField: 'authors', tab: 'active' }).map(record => record.id),
    ['R-1'],
    'the same query should match the author field',
  )
})

test('combined facets require department, type, year range, and tab to match', () => {
  equal(
    filterReferenceRecords(RECORDS, {
      tab: 'active',
      department: 'SCIS',
      type: 'Textbook',
      yearRange: 'recent',
      currentYear: 2026,
    }).map(record => record.id),
    ['R-1'],
    'only the active recent SCIS textbook should remain',
  )
  equal(
    filterReferenceRecords(RECORDS, { tab: 'archived' }).map(record => record.id),
    ['R-3'],
    'the archived view should exclude active records',
  )
})

test('recent additions view uses a stable ninety-day boundary', () => {
  equal(
    filterReferenceRecords(RECORDS, { tab: 'active', recentOnly: true, now: '2026-09-08T00:00:00.000Z' }).map(record => record.id),
    ['R-1'],
    'only active records uploaded in the last ninety days should remain',
  )
})

test('facet counts describe the supplied source records', () => {
  const facets = buildReferenceFacets(RECORDS.filter(record => !record.archived), 2026)
  equal(facets.departments, [
    { value: 'General Education', count: 1 },
    { value: 'SCIS', count: 2 },
  ], 'department counts should be alphabetical and count multi-department records')
  equal(facets.types, [
    { value: 'Online Resources', count: 1 },
    { value: 'Open Educational Resources', count: 1 },
    { value: 'Textbook', count: 1 },
  ], 'type counts should be alphabetical')
  equal(facets.years, [
    { value: 'recent', count: 1 },
    { value: '2020s', count: 0 },
    { value: 'older', count: 1 },
    { value: 'unknown', count: 1 },
  ], 'year buckets should include zero-count choices for a stable UI')
})

test('pagination clamps invalid pages and returns literal boundaries', () => {
  equal(
    paginateReferenceRecords([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23,
    ], 2),
    {
      items: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      page: 2,
      pageCount: 3,
      total: 23,
      start: 11,
      end: 20,
    },
    'the reference library should show ten records per page by default',
  )
  equal(
    paginateReferenceRecords([1, 2, 3, 4, 5], 9, 2),
    { items: [5], page: 3, pageCount: 3, total: 5, start: 5, end: 5 },
    'a page beyond the end should clamp to the final page',
  )
  equal(
    paginateReferenceRecords([], 0, 25),
    { items: [], page: 1, pageCount: 1, total: 0, start: 0, end: 0 },
    'empty results should still expose a usable first page',
  )
})

test('desktop shows fifteen records while compact screens keep ten', () => {
  assert(typeof discovery.referencePageSizeForWidth === 'function', 'responsive page sizing must be available')
  const { referencePageSizeForWidth } = discovery
  equal(referencePageSizeForWidth(1440), 15, 'desktop uses the available results area')
  equal(referencePageSizeForWidth(1025), 15, 'the desktop side of the breakpoint uses fifteen')
  equal(referencePageSizeForWidth(1024), 10, 'the compact side keeps ten')
  equal(referencePageSizeForWidth(390), 10, 'phones keep ten')

  const records = Array.from({ length: 31 }, (_, index) => index + 1)
  equal(
    paginateReferenceRecords(records, 2, referencePageSizeForWidth(1440)),
    {
      items: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
      page: 2,
      pageCount: 3,
      total: 31,
      start: 16,
      end: 30,
    },
    'desktop page boundaries follow the fifteen-row size',
  )
})

test('the workbench always previews a visible record and prefers the selected one', () => {
  assert(typeof getReferencePreview === 'function', 'getReferencePreview must be exported')
  equal(
    getReferencePreview(RECORDS[1], [RECORDS[0], RECORDS[1]]),
    RECORDS[1],
    'a selected visible record should stay in the preview',
  )
  equal(
    getReferencePreview(RECORDS[2], [RECORDS[0], RECORDS[1]]),
    RECORDS[0],
    'a hidden selection should fall back to the first visible record',
  )
  equal(getReferencePreview(null, []), null, 'an empty result set should have no preview')
})

test('saved views discard malformed records, trim names, and retain at most ten', () => {
  const mixed = [
    null,
    { id: '', name: 'Missing ID' },
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `view-${index}`,
      name: ` View ${index} `,
      criteria: { query: `q${index}`, searchField: 'all', tab: 'active' },
    })),
  ]
  const cleaned = sanitizeSavedViews(mixed)
  assert(cleaned.length === 10, `expected ten saved views, received ${cleaned.length}`)
  assert(cleaned[0].name === 'View 0', `expected a trimmed name, received ${cleaned[0].name}`)
  assert(cleaned[0].criteria.searchField === 'all', 'expected validated discovery criteria to survive')
})

test('saved views load safely and store only validated values', () => {
  const memory = new Map()
  const storage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  }
  memory.set('lpsm_reference_saved_views_v1', '{broken json')
  equal(loadReferenceSavedViews(storage), [], 'invalid JSON should fall back to no saved views')

  const stored = storeReferenceSavedViews(storage, [
    { id: 'mine', name: ' My SCIS books ', criteria: { department: 'SCIS', type: 'Textbook', tab: 'active' } },
  ])
  assert(stored[0].name === 'My SCIS books', 'stored view names should be trimmed')
  equal(loadReferenceSavedViews(storage), stored, 'stored views should round-trip through storage')
})

test('reference view selection distinguishes built-in and customized workbench states', () => {
  assert(typeof discovery.getReferenceViewValue === 'function', 'getReferenceViewValue must be exported')
  assert(discovery.getReferenceViewValue({}, []) === 'active', 'the untouched workbench should use All active')
  assert(discovery.getReferenceViewValue({ recentOnly: true }, []) === 'recent', 'recent records should use the Recent additions view')
  assert(discovery.getReferenceViewValue({ tab: 'archived' }, []) === 'archived', 'archived records should use the Archived view')
  assert(
    discovery.getReferenceViewValue({ query: 'algorithms' }, []) === 'custom',
    'a search must become a custom view so Save current view is available',
  )
  assert(
    discovery.getReferenceViewValue({ sortKey: 'year', sortDir: 'desc' }, []) === 'custom',
    'a non-default sort must not be mistaken for the untouched view',
  )
})

test('reference view selection recognizes a matching saved view', () => {
  assert(typeof discovery.getReferenceViewValue === 'function', 'getReferenceViewValue must be exported')
  const savedViews = [{
    id: 'recent-textbooks',
    name: 'Recent textbooks',
    criteria: { type: 'Textbook', sortKey: 'year', sortDir: 'desc' },
  }]
  assert(
    discovery.getReferenceViewValue({ type: 'Textbook', sortKey: 'year', sortDir: 'desc' }, savedViews) === 'saved:recent-textbooks',
    'matching criteria should keep the saved view selected',
  )
  assert(
    discovery.getReferenceViewValue({ type: 'Textbook', sortKey: 'year', sortDir: 'asc' }, savedViews) === 'custom',
    'changing a saved view should mark it custom instead of mislabelling it',
  )
})

process.on('exit', () => {
  if (!process.exitCode) console.log(`\n${passed} reference-discovery tests passed`)
})
