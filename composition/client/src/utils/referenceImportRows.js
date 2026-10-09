// Turns CSV records and references saved by the old browser-only store into rows for
// POST /api/references/import. The server validates every row against its type config; nothing
// here decides what is valid, it only maps column names and type names.
import { getReferenceTypes } from './referenceTypes.js'

const norm = (value) => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

// CSV column headers (any case) -> row field. The template columns of the Reference Library plus
// the plain field names.
const HEADERS = {
  type: 'type', 'reference type': 'type',
  title: 'title', 'reference title': 'title',
  author: 'authors', authors: 'authors', 'author(s)': 'authors',
  isbn: 'isbn',
  year: 'year', 'publication year': 'year',
  link: 'link', url: 'link', 'subscription link': 'link',
  publisher: 'publisher', provider: 'publisher', 'provider / platform': 'publisher'
}

// Names the old build and old CSV files used for the three original types; matched exactly.
const LEGACY_TYPE_NAMES = {
  'online resources': 'Online Resource',
  'open educational resources': 'OER',
  'open educational resource': 'OER'
}

// "Textbook" / "textbook" / "Online Resource (…)" -> a type key, or the raw text so the server can
// say "Unknown reference type" for that row.
export const typeKeyFromName = (name) => {
  const wanted = norm(name)
  if (!wanted) return ''
  for (const type of getReferenceTypes()) {
    if (norm(type.key) === wanted || norm(type.label) === wanted) return type.key
  }
  return LEGACY_TYPE_NAMES[wanted] || String(name).trim()
}

export const csvRecordToRow = (record = {}) => {
  const row = {}
  for (const [header, value] of Object.entries(record)) {
    const field = HEADERS[norm(header)]
    if (field) row[field] = String(value ?? '').trim()
  }
  row.type = typeKeyFromName(row.type)
  return row
}

// A reference saved by the old localStorage store (authors / year / publisher, display type names).
export const legacyReferenceToRow = (reference = {}) => ({
  type: typeKeyFromName(reference.type),
  title: reference.title ?? '',
  authors: reference.authors ?? reference.author ?? '',
  isbn: reference.isbn ?? '',
  year: reference.year ? String(reference.year) : '',
  link: reference.link ?? '',
  publisher: reference.publisher ?? ''
})
