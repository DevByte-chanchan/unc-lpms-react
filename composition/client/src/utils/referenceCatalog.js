// Reference catalog rules for the picker: which references a course may see,
// what counts as current, what counts as a book, what may be attached, and
// where to look when the library holds nothing.
//
// This module only decides. It never fetches and never renders, so
// `referenceCatalog.test.js` can drive every rule under plain node. The picker
// renders whatever `buildCatalogView` returns.
//
// Panel items answered here: course scoping [13:25] [16:13], alphabetical order
// [11:12], the 5-year window [10:55], auto-suggest from subject + topic [10:28]
// [13:07], book-level matching [13:43] [14:18], the per-course catalog with an
// outside search [11:21] [11:39], library availability [49:06] and O'Reilly as
// a source [12:05] [12:32].

const SETTINGS_KEY = 'lpsm_reference_settings_v1'
const CATALOG_KEY = 'lpsm_course_catalog_v1'

// The window is a setting, not two hard-coded years — "within 2021 to 2025" is
// what "last 5 years" evaluates to when the term ends in 2025 [10:55].
export const DEFAULT_CATALOG_SETTINGS = {
    recencyYears: 5,
    windowEnd: null,               // null = the current calendar year
    enforceRecency: true,          // false = keep outdated titles but flag them
    requireLibraryAvailability: true,
    suggestionLimit: 5,
    // A title the library knows is a chapter of something bigger. The picker
    // shows the parent book instead, so a chapter is never listed as a book
    // [13:43]. Directors extend this from the reference library screen.
    chapterOverrides: {}
}

const readJson = (key, fallback) => {
    try {
        const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
        const parsed = raw ? JSON.parse(raw) : null
        return parsed && typeof parsed === 'object' ? parsed : fallback
    } catch {
        return fallback
    }
}

const writeJson = (key, value) => {
    try {
        if (typeof localStorage === 'undefined') return
        localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
        console.error('Failed to persist reference catalog data', e)
    }
}

export const getCatalogSettings = () => ({ ...DEFAULT_CATALOG_SETTINGS, ...readJson(SETTINGS_KEY, {}) })

export const setCatalogSettings = (patch = {}) => {
    const next = { ...getCatalogSettings(), ...patch }
    writeJson(SETTINGS_KEY, next)
    return next
}

// ---------------------------------------------------------------- recency ---

// `/api/references` returns publication_year as a full timestamp
// ("2024-01-01 00:00:00.000 +00:00"); the course endpoints return a bare year.
export const parseYear = (value) => {
    if (value == null || value === '') return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getFullYear()
    const match = /(\d{4})/.exec(String(value))
    if (!match) return null
    const year = Number(match[1])
    return year >= 1000 && year <= 9999 ? year : null
}

export const recencyWindow = (settings = DEFAULT_CATALOG_SETTINGS, now = new Date()) => {
    const span = Math.max(1, Number(settings.recencyYears) || DEFAULT_CATALOG_SETTINGS.recencyYears)
    const to = Number(settings.windowEnd) || now.getFullYear()
    return { from: to - span + 1, to }
}

export const isWithinRecency = (ref, window) => {
    const year = parseYear(ref?.publication_year ?? ref?.year)
    if (year == null) return false
    return year >= window.from && year <= window.to
}

// ------------------------------------------------------------ book level ---

const CHAPTER_PATTERNS = [
    /^\s*chapters?\s+\d+[a-z]?\s*[:.–—-]\s*/i,
    /^\s*ch\.?\s*\d+[a-z]?\s*[:.–—-]\s*/i,
    /^\s*(?:part|section|unit|module|lesson)\s+[\dIVXLC]+\s*[:.–—-]\s*/i
]

const trimTitle = (value) => String(value || '').trim()

// What the library actually knows about a row: an explicit parent field, a
// director override, or a "Chapter 4: ..." style title.
export const chapterInfo = (ref, settings = DEFAULT_CATALOG_SETTINGS) => {
    const title = trimTitle(ref?.title)
    const explicitParent = trimTitle(ref?.parent_title || ref?.book_title || ref?.chapter_of)
    if (explicitParent) return { isChapter: true, parentTitle: explicitParent, chapterLabel: title }

    const override = (settings.chapterOverrides || {})[title.toLowerCase()]
    if (override) return { isChapter: true, parentTitle: trimTitle(override), chapterLabel: title }

    for (const pattern of CHAPTER_PATTERNS) {
        const prefix = pattern.exec(title)
        if (prefix) {
            const remainder = title.slice(prefix[0].length).trim()
            // "Chapter 4: Colour" alone names no book — the row is a chapter of
            // an unnamed book, which is exactly what must not be listed.
            return { isChapter: true, parentTitle: remainder, chapterLabel: title }
        }
    }
    return { isChapter: false, parentTitle: '', chapterLabel: '' }
}

// Fold chapter rows into the book that contains them. A chapter whose parent is
// already in the list disappears into that row (its own title survives as a
// `chapters` hint so the topic match stays visible); a chapter whose parent is
// not in the list is promoted to a book-level row under the parent's title.
export const collapseChaptersToBooks = (refs = [], settings = DEFAULT_CATALOG_SETTINGS) => {
    const byTitle = new Map()
    refs.forEach(r => {
        const key = trimTitle(r.title).toLowerCase()
        if (key && !byTitle.has(key)) byTitle.set(key, r)
    })

    const out = []
    const chaptersByParent = new Map()

    refs.forEach(ref => {
        const info = chapterInfo(ref, settings)
        if (!info.isChapter || !info.parentTitle) {
            out.push({ ...ref, isChapter: false })
            return
        }
        const parentKey = info.parentTitle.toLowerCase()
        const list = chaptersByParent.get(parentKey) || []
        list.push({ ...ref, ...info })
        chaptersByParent.set(parentKey, list)
    })

    chaptersByParent.forEach((chapters, parentKey) => {
        const existing = out.find(r => trimTitle(r.title).toLowerCase() === parentKey)
        const chapterTitles = chapters.map(c => c.chapterLabel)
        if (existing) {
            existing.chapters = [...(existing.chapters || []), ...chapterTitles]
            return
        }
        // Promote to the parent book, carrying the chapter's own metadata so the
        // row still links and dates correctly.
        const seed = chapters[0]
        out.push({
            ...seed,
            title: seed.parentTitle,
            isChapter: false,
            promotedFromChapter: true,
            chapters: chapterTitles
        })
    })

    return out
}

// ------------------------------------------------------------ availability ---

// "itong books ba na to available sa library? kung hindi, di pwede mag-lagay
// references" [49:06]. A row that came out of the library database is available
// by definition; anything a faculty member typed in has to be declared.
export const availabilityOf = (ref) => {
    if (!ref) return 'unverified'
    if (ref.available_in_library === true || ref.availability === 'library') return 'library'
    if (ref.external_approved === true || ref.availability === 'approved-external') return 'approved-external'
    if (ref.reference_id != null && ref.reference_id !== '') return 'library'
    return 'unverified'
}

export const isAttachable = (ref, settings = DEFAULT_CATALOG_SETTINGS) => {
    if (!settings.requireLibraryAvailability) return true
    return availabilityOf(ref) !== 'unverified'
}

// ------------------------------------------------------------- course scope ---

const splitCodes = (value) => String(value || '')
    .split(',')
    .map(s => s.trim().toUpperCase().replace(/\s+/g, ''))
    .filter(Boolean)

export const courseCodesForReference = (ref) =>
    splitCodes(ref?.used_in_courses ?? ref?.courses ?? ref?.course_no)

const sameCode = (a, b) =>
    String(a || '').toUpperCase().replace(/\s+/g, '') === String(b || '').toUpperCase().replace(/\s+/g, '')

// A reference belongs to a course's catalog when the library already records it
// against that course, or when the Director of Libraries assigned it there.
export const isInCourseCatalog = (ref, courseCode, assignedIds = []) => {
    if (!courseCode) return true
    if (courseCodesForReference(ref).some(c => sameCode(c, courseCode))) return true
    return assignedIds.some(id => String(id) === String(ref?.reference_id))
}

// --------------------------------------------------------------- relevance ---

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by',
    'from', 'into', 'its', 'their', 'this', 'that', 'introduction', 'intro', 'course',
    'principles', 'fundamentals', 'concepts', 'advanced', 'basic', 'using', 'design'
])

export const tokenize = (text) => String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t))

// Subjects are cited both ways round — the offering is "Human and Computer
// Interaction" while the shelf says "HCI Models, Theories, and Frameworks" — so
// the initials of a multi-word subject count as one of its terms.
export const acronymOf = (text) => {
    const tokens = tokenize(text)
    return tokens.length >= 2 ? tokens.map(t => t[0]).join('') : ''
}

// "nag-auto-suggest ng libro based sa subject" [10:28] — the subject and the
// topic on the ILO are the query; the faculty types nothing.
export const relevanceScore = (ref, { courseTitle = '', topics = [] } = {}) => {
    const subjectTerms = new Set(tokenize(courseTitle))
    const subjectAcronym = acronymOf(courseTitle)
    if (subjectAcronym) subjectTerms.add(subjectAcronym)
    const topicTerms = new Set(topics.flatMap(t => {
        const title = typeof t === 'string' ? t : t?.title
        const terms = tokenize(title)
        const short = acronymOf(title)
        return short ? [...terms, short] : terms
    }))
    if (!subjectTerms.size && !topicTerms.size) return 0

    const haystack = new Set([
        ...tokenize(ref?.title),
        ...tokenize(ref?.author),
        ...(ref?.chapters || []).flatMap(tokenize)
    ])
    let score = 0
    topicTerms.forEach(t => { if (haystack.has(t)) score += 3 })
    subjectTerms.forEach(t => { if (haystack.has(t)) score += 2 })
    return score
}

// --------------------------------------------------------------- type keys ---

export const TYPE_KEYS = {
    TEXTBOOK: 'textbook',
    OER: 'open educational resources',
    ONLINE: 'online resources'
}

export const normalizeTypeKey = (type) => {
    if (!type) return ''
    const t = String(type).toLowerCase().trim()
    if (t.includes('textbook')) return TYPE_KEYS.TEXTBOOK
    if (t.includes('open') || t.includes('oer')) return TYPE_KEYS.OER
    if (t.includes('online') || t.includes('or')) return TYPE_KEYS.ONLINE
    return t
}

// One label table so a row from the database (TEXTBOOK) and a row from the Add
// Reference modal (Textbook) never sit side by side in different casing.
export const TYPE_LABELS = {
    [TYPE_KEYS.TEXTBOOK]: 'Textbook',
    [TYPE_KEYS.OER]: 'Open Educational Resources',
    [TYPE_KEYS.ONLINE]: 'Online Resources'
}

export const typeLabel = (type) => TYPE_LABELS[normalizeTypeKey(type)] || String(type || 'Unclassified')

const KNOWN_TYPE_KEYS = new Set(Object.values(TYPE_KEYS))

// With the "All" tab gone, a row whose type is blank or off-vocabulary matches
// no tab and becomes unreachable. It gets its own tab instead of disappearing —
// but only when such a row actually exists.
export const UNCLASSIFIED_TYPE = 'Unclassified'

export const isUnclassifiedType = (type) => !KNOWN_TYPE_KEYS.has(normalizeTypeKey(type))

export const countUnclassified = (references = []) =>
    references.filter(r => isUnclassifiedType(r?.type ?? r?.Type)).length

// ------------------------------------------------------- external sources ---

// "kung wala dun yung libro, san ako mag-search? — sa labas" [11:39]. O'Reilly
// leads because the library holds a subscription [12:05]; the live collections
// API is a credentials job and is not wired here [12:41].
export const EXTERNAL_SOURCES = [
    {
        key: 'oreilly',
        label: "O'Reilly Learning",
        subscription: true,
        note: 'UNC library subscription — sign in with the institutional account.',
        searchUrl: (q) => `https://learning.oreilly.com/search/?q=${encodeURIComponent(q)}`
    },
    {
        key: 'openlibrary',
        label: 'Open Library',
        searchUrl: (q) => `https://openlibrary.org/search?q=${encodeURIComponent(q)}`
    },
    {
        key: 'doaj',
        label: 'DOAJ (open access)',
        searchUrl: (q) => `https://doaj.org/search/articles?ref=homepage&q=${encodeURIComponent(q)}`
    },
    {
        key: 'oercommons',
        label: 'OER Commons',
        searchUrl: (q) => `https://oercommons.org/search?f.search=${encodeURIComponent(q)}`
    }
]

export const externalSearchLinks = (query) => {
    const q = String(query || '').trim()
    if (!q) return []
    return EXTERNAL_SOURCES.map(s => ({ key: s.key, label: s.label, subscription: !!s.subscription, note: s.note, url: s.searchUrl(q) }))
}

// So an O'Reilly (or any external) title can be cited once it is attached.
export const citationFor = (ref) => {
    const author = trimTitle(ref?.author) || 'n.a.'
    const year = parseYear(ref?.publication_year ?? ref?.year) || 'n.d.'
    const title = trimTitle(ref?.title)
    const source = trimTitle(ref?.source || ref?.publisher || (ref?.link ? new URL(ref.link, 'https://x').host.replace(/^www\./, '') : ''))
    return [`${author} (${year}).`, `${title}.`, source ? `${source}.` : ''].filter(Boolean).join(' ')
}

// -------------------------------------------------- per-course catalog store ---

// Academic term key, e.g. 'AY2026-2027-1'. The suggested set is versioned by
// term so it "updates every semester after faculty finalize" [16:22] [16:57].
export const termKey = (date = new Date()) => {
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    // Aug–Dec = 1st semester of AY y/y+1; Jan–Jul = 2nd semester of AY y-1/y.
    return m >= 8 ? `AY${y}-${y + 1}-1` : `AY${y - 1}-${y}-2`
}

export const nextTermKey = (term = termKey()) => {
    const m = /^AY(\d{4})-(\d{4})-(\d)$/.exec(String(term))
    if (!m) return termKey()
    const [, start, end, sem] = m
    return sem === '1' ? `AY${start}-${end}-2` : `AY${Number(end)}-${Number(end) + 1}-1`
}

const readCatalogStore = () => readJson(CATALOG_KEY, {})

export const listCatalogTerms = () => Object.keys(readCatalogStore()).sort()

export const getCourseCatalog = (courseCode, term = termKey()) => {
    const store = readCatalogStore()
    const entry = store[term]?.[String(courseCode || '').toUpperCase()]
    return entry || { referenceIds: [], updatedAt: null, updatedBy: null, term }
}

export const setCourseCatalog = (courseCode, referenceIds = [], { term = termKey(), updatedBy = '' } = {}) => {
    const store = readCatalogStore()
    const code = String(courseCode || '').toUpperCase()
    if (!code) return null
    const entry = {
        referenceIds: [...new Set(referenceIds.map(Number).filter(n => !Number.isNaN(n)))],
        updatedAt: new Date().toISOString(),
        updatedBy,
        term
    }
    store[term] = { ...(store[term] || {}), [code]: entry }
    writeJson(CATALOG_KEY, store)
    return entry
}

// Carry a term's assignments forward so the next semester starts from the set
// the faculty finalised rather than from nothing.
export const rolloverCatalog = (fromTerm = termKey(), toTerm = nextTermKey(fromTerm)) => {
    const store = readCatalogStore()
    const source = store[fromTerm] || {}
    const target = { ...(store[toTerm] || {}) }
    let carried = 0
    Object.entries(source).forEach(([code, entry]) => {
        if (target[code]) return
        target[code] = { ...entry, term: toTerm, rolledOverFrom: fromTerm }
        carried += 1
    })
    store[toTerm] = target
    writeJson(CATALOG_KEY, store)
    return { toTerm, carried }
}

// ------------------------------------------------------------ the view ---

export const normalizeReference = (r = {}) => ({
    // Spread first so the normalised fields below actually win — spreading last
    // put the raw timestamp back over the parsed year.
    ...r,
    reference_id: r.reference_id != null ? Number(r.reference_id) : null,
    title: trimTitle(r.title),
    type: r.type || r.Type || '',
    typeKey: normalizeTypeKey(r.type || r.Type || ''),
    typeLabel: typeLabel(r.type || r.Type || ''),
    author: r.author || r.authors || '',
    isbn: r.isbn || '',
    link: r.link || '',
    year: parseYear(r.publication_year ?? r.year),
    _temp_id: r._temp_id || null
})

/**
 * Everything the picker needs for one tab, in one pass.
 *
 * @returns {{rows: Array, suggested: Array, outdated: Array, hiddenByCourse: number, window: {from:number,to:number}}}
 */
export const buildCatalogView = (references = [], {
    courseCode = '',
    courseTitle = '',
    topics = [],
    type = 'Textbook',
    search = '',
    scope = 'catalog',              // 'catalog' | 'library'
    assignedIds = [],
    settings = DEFAULT_CATALOG_SETTINGS,
    now = new Date()
} = {}) => {
    const window = recencyWindow(settings, now)
    const typeKey = normalizeTypeKey(type)
    const term = String(search || '').trim().toLowerCase()

    const normalized = references.map(normalizeReference)
    const books = collapseChaptersToBooks(normalized, settings)

    const ofType = type === UNCLASSIFIED_TYPE
        ? books.filter(r => isUnclassifiedType(r.type))
        : books.filter(r => r.typeKey === typeKey)

    // Course scope before anything else — a programming course must never see
    // "Understanding the Self" [16:13].
    const inScope = scope === 'library'
        ? ofType
        : ofType.filter(r => isInCourseCatalog(r, courseCode, assignedIds))
    const hiddenByCourse = ofType.length - inScope.length

    const outdated = inScope.filter(r => !isWithinRecency(r, window))
    const current = settings.enforceRecency
        ? inScope.filter(r => isWithinRecency(r, window))
        : inScope

    const matched = !term ? current : current.filter(r =>
        String(r.title).toLowerCase().includes(term) ||
        String(r.author).toLowerCase().includes(term) ||
        String(r.isbn).toLowerCase().includes(term)
    )

    const decorated = matched.map(r => ({
        ...r,
        outdated: !isWithinRecency(r, window),
        availability: availabilityOf(r),
        attachable: isAttachable(r, settings),
        score: relevanceScore(r, { courseTitle, topics })
    }))

    // A–Z is the default order [11:12]; suggestions are a separate short strip
    // so recommending never scrambles the list the panel asked to be sorted.
    const rows = [...decorated].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    const suggested = decorated
        .filter(r => r.score > 0 && r.attachable)
        .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
        .slice(0, Math.max(0, Number(settings.suggestionLimit) || 0))

    return { rows, suggested, outdated, hiddenByCourse, window }
}

export default {
    DEFAULT_CATALOG_SETTINGS,
    getCatalogSettings,
    setCatalogSettings,
    parseYear,
    recencyWindow,
    isWithinRecency,
    chapterInfo,
    collapseChaptersToBooks,
    availabilityOf,
    isAttachable,
    courseCodesForReference,
    isInCourseCatalog,
    relevanceScore,
    normalizeTypeKey,
    typeLabel,
    UNCLASSIFIED_TYPE,
    isUnclassifiedType,
    countUnclassified,
    EXTERNAL_SOURCES,
    externalSearchLinks,
    citationFor,
    termKey,
    nextTermKey,
    getCourseCatalog,
    setCourseCatalog,
    rolloverCatalog,
    listCatalogTerms,
    normalizeReference,
    buildCatalogView
}
