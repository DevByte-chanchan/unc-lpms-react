const MAX_CSV_BYTES = 2 * 1024 * 1024

const parseCsvCells = (text) => {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"' && field.length === 0) {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (quoted) throw new Error('CSV contains an unterminated quoted field.')
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

export const parseReferenceCsv = (input) => {
  const text = String(input ?? '')
  if (new TextEncoder().encode(text).byteLength > MAX_CSV_BYTES) {
    throw new Error('CSV file is larger than 2 MB.')
  }

  const rows = parseCsvCells(text).filter(row => row.some(cell => cell.trim() !== ''))
  if (rows.length === 0) return []

  const headers = rows[0].map((value, index) => {
    const header = value.replace(/^\uFEFF/, '').trim()
    if (!header) throw new Error(`CSV column ${index + 1} has no header.`)
    return header
  })
  if (new Set(headers.map(header => header.toLowerCase())).size !== headers.length) {
    throw new Error('CSV contains duplicate column headers.')
  }

  return rows.slice(1).map(cells => Object.fromEntries(
    headers.map((header, index) => [header, String(cells[index] ?? '').trim()])
  ))
}

export { MAX_CSV_BYTES }
