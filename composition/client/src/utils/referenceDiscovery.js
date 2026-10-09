export const REFERENCE_SAVED_VIEWS_KEY = 'lpsm_reference_saved_views_v1'
export const REFERENCE_PAGE_SIZE = 10
export const referencePageSizeForWidth = width => Number(width) > 1024 ? 15 : REFERENCE_PAGE_SIZE

const SEARCH_FIELDS = new Set(['all', 'title', 'authors', 'id', 'isbn', 'publisher'])
const TABS = new Set(['active', 'archived', 'all'])
const YEAR_RANGES = new Set(['', 'recent', '2020s', 'older', 'unknown'])

const normalizeText = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()

const splitMetadata = value => {
  const values = Array.isArray(value) ? value : String(value || '').split(',')
  return values.map(item => String(item).trim()).filter(Boolean)
}

const stableUnique = values => [...new Set(values)].sort((left, right) => left.localeCompare(right))

const compactWhitespace = value => String(value || '').trim().replace(/\s+/g, ' ')

// Library rows from GET /api/references/library -> the records the Reference Library shows.
// The server is the only source. Rows with the same title and authors (the seeders copy a reference
// per course) are shown as one record whose `sourceIds` lists every server row behind it; edits and
// archiving apply to all of them. `type` is the server's type key, shown through its label.
export const normalizeReferenceLibraryRows = (rows) => {
  const groups = new Map()
  for (const row of Array.isArray(rows) ? rows : []) {
    const numericId = Number.parseInt(row?.reference_id, 10)
    if (!Number.isFinite(numericId)) continue
    const title = compactWhitespace(row?.title)
    const authors = compactWhitespace(row?.author)
    const identity = title ? `${normalizeText(title)}|${normalizeText(authors)}` : `id:${numericId}`
    if (!groups.has(identity)) groups.set(identity, [])
    groups.get(identity).push({ ...row, numericId, title, authors })
  }

  return [...groups.values()]
    .map(group => {
      const sorted = [...group].sort((left, right) => left.numericId - right.numericId)
      const canonical = sorted[0]
      const publicationYear = Number.parseInt(String(canonical.publication_year || '').slice(0, 4), 10)

      return {
        id: `srv-${canonical.numericId}`,
        numericId: canonical.numericId,
        sourceIds: sorted.map(row => row.numericId),
        title: canonical.title,
        authors: canonical.authors,
        type: canonical.type,
        year: Number.isFinite(publicationYear) ? publicationYear : '',
        isbn: compactWhitespace(canonical.isbn),
        link: compactWhitespace(canonical.link),
        publisher: compactWhitespace(canonical.publisher),
        filename: '',
        uploadDate: String(canonical.createdAt || '').slice(0, 10),
        hasIssue: false,
        archived: sorted.every(row => Boolean(row.archived)),
        departments: stableUnique(sorted.flatMap(row => splitMetadata(row.departments))),
        programs: stableUnique(sorted.flatMap(row => splitMetadata(row.programs))),
        usedInCourses: stableUnique(sorted.flatMap(row => splitMetadata(row.used_in_courses))),
      }
    })
    .sort((left, right) => left.numericId - right.numericId)
}

const textForField = (record, field) => {
  if (field !== 'all') return normalizeText(record?.[field])
  return normalizeText([
    record?.id,
    record?.title,
    record?.authors,
    record?.isbn,
    record?.publisher,
  ].filter(Boolean).join(' '))
}

const matchesQuery = (record, query, field) => {
  const tokens = normalizeText(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return true
  const haystack = textForField(record, SEARCH_FIELDS.has(field) ? field : 'all')
  const compactHaystack = haystack.replace(/\s+/g, '')
  return tokens.every(token => haystack.includes(token) || compactHaystack.includes(token))
}

const yearBucket = (value, currentYear) => {
  const year = Number.parseInt(value, 10)
  if (!Number.isFinite(year)) return 'unknown'
  if (year >= currentYear - 2) return 'recent'
  if (year >= 2020) return '2020s'
  return 'older'
}

const uploadedRecently = (uploadDate, now) => {
  const uploadedAt = new Date(uploadDate).getTime()
  const nowAt = new Date(now).getTime()
  if (!Number.isFinite(uploadedAt) || !Number.isFinite(nowAt)) return false
  const ninetyDays = 90 * 24 * 60 * 60 * 1000
  const age = nowAt - uploadedAt
  return age >= 0 && age <= ninetyDays
}

export const isReferenceDeprecated = (record, currentYear = new Date().getFullYear()) => {
  const publicationYear = Number.parseInt(record?.year, 10)
  const comparisonYear = Number.parseInt(currentYear, 10)
  if (!Number.isFinite(publicationYear) || !Number.isFinite(comparisonYear)) return false
  return comparisonYear - publicationYear >= 5
}

export const filterReferenceRecords = (records, criteria = {}) => {
  const {
    query = '',
    searchField = 'all',
    department = '',
    type = '',
    yearRange = '',
    tab = 'active',
    recentOnly = false,
    currentYear = new Date().getFullYear(),
    now = new Date().toISOString(),
  } = criteria

  return (Array.isArray(records) ? records : []).filter(record => {
    if (tab === 'active' && record.archived) return false
    if (tab === 'archived' && !record.archived) return false
    if (!matchesQuery(record, query, searchField)) return false
    if (department && !(record.departments || []).includes(department)) return false
    if (type && record.type !== type) return false
    if (yearRange && yearBucket(record.year, currentYear) !== yearRange) return false
    if (recentOnly && !uploadedRecently(record.uploadDate, now)) return false
    return true
  })
}

const countValues = values => {
  const counts = new Map()
  values.filter(Boolean).forEach(value => counts.set(value, (counts.get(value) || 0) + 1))
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, count]) => ({ value, count }))
}

export const buildReferenceFacets = (records, currentYear = new Date().getFullYear()) => {
  const source = Array.isArray(records) ? records : []
  const departments = source.flatMap(record => Array.isArray(record.departments) ? record.departments : [])
  const yearCounts = new Map([
    ['recent', 0],
    ['2020s', 0],
    ['older', 0],
    ['unknown', 0],
  ])
  source.forEach(record => {
    const bucket = yearBucket(record.year, currentYear)
    yearCounts.set(bucket, yearCounts.get(bucket) + 1)
  })

  return {
    departments: countValues(departments),
    types: countValues(source.map(record => record.type)),
    years: [...yearCounts.entries()].map(([value, count]) => ({ value, count })),
  }
}

export const paginateReferenceRecords = (records, requestedPage = 1, requestedPageSize = REFERENCE_PAGE_SIZE) => {
  const source = Array.isArray(records) ? records : []
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
    ? requestedPageSize
    : REFERENCE_PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(source.length / pageSize))
  const numericPage = Number.isFinite(Number(requestedPage)) ? Math.trunc(Number(requestedPage)) : 1
  const page = Math.min(pageCount, Math.max(1, numericPage))
  const offset = (page - 1) * pageSize
  const items = source.slice(offset, offset + pageSize)

  return {
    items,
    page,
    pageCount,
    total: source.length,
    start: source.length === 0 ? 0 : offset + 1,
    end: source.length === 0 ? 0 : offset + items.length,
  }
}

export const getReferencePreview = (selectedReference, visibleRecords) => {
  const visible = Array.isArray(visibleRecords) ? visibleRecords : []
  if (selectedReference && visible.some(record => record?.id === selectedReference.id)) {
    return selectedReference
  }
  return visible[0] || null
}

const cleanCriteria = value => {
  const criteria = value && typeof value === 'object' ? value : {}
  const searchField = SEARCH_FIELDS.has(criteria.searchField) ? criteria.searchField : 'all'
  const tab = TABS.has(criteria.tab) ? criteria.tab : 'active'
  const yearRange = YEAR_RANGES.has(criteria.yearRange) ? criteria.yearRange : ''
  return {
    query: String(criteria.query || '').trim().slice(0, 200),
    searchField,
    department: String(criteria.department || '').trim().slice(0, 120),
    type: String(criteria.type || '').trim().slice(0, 80),
    yearRange,
    tab,
    recentOnly: Boolean(criteria.recentOnly),
    sortKey: String(criteria.sortKey || 'id').trim().slice(0, 40),
    sortDir: criteria.sortDir === 'desc' ? 'desc' : 'asc',
  }
}

const criteriaSignature = value => JSON.stringify(cleanCriteria(value))

export const getReferenceViewValue = (criteria, savedViews) => {
  const currentSignature = criteriaSignature(criteria)
  const matchingSavedView = sanitizeSavedViews(savedViews).find(
    savedView => criteriaSignature(savedView.criteria) === currentSignature,
  )

  if (matchingSavedView) return `saved:${matchingSavedView.id}`
  if (currentSignature === criteriaSignature({})) return 'active'
  if (currentSignature === criteriaSignature({ recentOnly: true })) return 'recent'
  if (currentSignature === criteriaSignature({ tab: 'archived' })) return 'archived'
  return 'custom'
}

export const sanitizeSavedViews = value => {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const cleaned = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const id = String(item.id || '').trim().slice(0, 80)
    const name = String(item.name || '').trim().slice(0, 50)
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    cleaned.push({ id, name, criteria: cleanCriteria(item.criteria) })
    if (cleaned.length === 10) break
  }
  return cleaned
}

export const loadReferenceSavedViews = storage => {
  try {
    if (!storage?.getItem) return []
    return sanitizeSavedViews(JSON.parse(storage.getItem(REFERENCE_SAVED_VIEWS_KEY) || '[]'))
  } catch {
    return []
  }
}

export const storeReferenceSavedViews = (storage, views) => {
  const cleaned = sanitizeSavedViews(views)
  try {
    storage?.setItem?.(REFERENCE_SAVED_VIEWS_KEY, JSON.stringify(cleaned))
  } catch {
    // The page still works when browser storage is unavailable or full.
  }
  return cleaned
}
