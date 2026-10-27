// One CSV cell. A value that starts with = + - @ (or a tab or return) would be run as a formula by a
// spreadsheet; the apostrophe makes it plain text. Quotes, commas and line breaks are escaped as CSV needs.
export const csvCell = (value) => {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
