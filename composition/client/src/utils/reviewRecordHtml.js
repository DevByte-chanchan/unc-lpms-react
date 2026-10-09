// The accreditation review record of one learning-plan revision, as a printable document:
// every reviewer comment (who, role, section, message, date, resolved), every workflow
// action (who, role, action, date) and the final approvers. It is deliberately a different
// document from the clean syllabus export, which carries no comments.
import { escapeHtml, signatureImageSrc } from './sanitize.js'

const esc = (value, fallback = '—') =>
  (value === null || value === undefined || value === '') ? fallback : escapeHtml(String(value))

const fmt = (iso) => {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })
}

const CELL = 'border:1px solid #000; padding:4px 6px; vertical-align:top; font-size:9pt;'
const HEAD = 'border:1px solid #000; padding:4px 6px; background:#e5e7eb; font-size:9pt; text-align:left;'

const table = (headers, rows, emptyText) => `<table style="width:100%; border-collapse:collapse; margin:4px 0 14px;">
  <thead><tr>${headers.map(h => `<th style="${HEAD}">${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.length
    ? rows.map(cells => `<tr>${cells.map(c => `<td style="${CELL}">${c}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" style="${CELL} color:#555;">${esc(emptyText)}</td></tr>`}</tbody>
</table>`

export const buildReviewRecordHtml = (record) => {
  const course = record?.course || {}
  const status = record?.status || {}
  const comments = record?.comments || []
  const where = (c) => [c.section, c.location].filter(Boolean).join(' — ')

  const approvers = table(
    ['Approver', 'Role', 'Accepted on', 'Signature'],
    (record?.approvers || []).map(a => {
      const image = a.accepted ? signatureImageSrc(a.signature) : ''
      return [
        a.accepted ? esc(a.name, 'Name not recorded') : '<em>Not yet accepted</em>',
        esc(a.roleLabel),
        a.accepted ? esc(fmt(a.date)) : '—',
        image ? `<img src="${image}" alt="Signature" style="max-height:14mm; max-width:40mm;">` : '—'
      ]
    }),
    'No approvers recorded.')

  const actions = table(
    ['Date', 'Action', 'By', 'Role'],
    (record?.actions || []).map(a => [
      esc(fmt(a.date)),
      esc(a.action),
      esc(a.name, 'Name not recorded'),
      esc(a.roleLabel) + (a.inChain === false ? ' <em>(not part of the approval chain)</em>' : '')
    ]),
    'No workflow actions recorded.')

  const commentRows = table(
    ['Date', 'Reviewer', 'Role', 'Section', 'Comment', 'Resolved'],
    comments.map(c => [
      esc(fmt(c.date)),
      esc(c.reviewerName, 'Name not recorded'),
      esc(c.roleLabel) + (c.documentationOnly ? ' <em>(documentation only)</em>' : ''),
      esc(where(c)) + (c.targets?.length ? `<br><small>${c.targets.map(t => esc(t)).join('; ')}</small>` : ''),
      esc(c.message),
      c.resolved ? `Yes${c.resolvedDate ? ` (${esc(fmt(c.resolvedDate))})` : ''}` : 'No'
    ]),
    'No comments were recorded for this revision.')

  const approvalLine = status.approved
    ? `Approved by the Dean on ${esc(fmt(status.approvedAt))}.`
    : `Not yet approved by the Dean (status: ${esc(status.state)}).`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Review record</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color:#000; margin: 24px 32px; }
  h1 { font-size: 15pt; margin: 0 0 2px; } h2 { font-size: 11pt; margin: 14px 0 2px; }
  p { font-size: 9.5pt; margin: 2px 0; } td, th { word-break: break-word; }
  /* On screen the record is drawn as a paper sheet, like the other exports. */
  @media screen {
    html { background: transparent; }
    body { background: #fff; box-sizing: border-box; width: 330mm; max-width: 100%; margin: 24px auto; padding: 42px 85px 32px; box-shadow: 0 2px 16px rgba(0,0,0,0.12); }
  }
  @media print { body { margin: 12mm; } tr { page-break-inside: avoid; } }
</style></head><body>
  <h1>COURSE REVIEW RECORD</h1>
  <p><strong>University of Nueva Caceres</strong> — for accreditation. This record is separate from the approved syllabus.</p>
  <p><strong>Course:</strong> ${esc(course.code)} — ${esc(course.title)}</p>
  <p><strong>Syllabus revision:</strong> ${esc(course.revisionNumber)} &nbsp; <strong>Term:</strong> ${esc(course.term)}</p>
  <p><strong>Status:</strong> ${esc(status.state)}. ${approvalLine}</p>
  <p><strong>Generated:</strong> ${esc(fmt(record?.generatedAt))}</p>

  <h2>Final approvers</h2>
  ${approvers}
  <h2>Workflow actions</h2>
  ${actions}
  <h2>Reviewer comments (${comments.length})</h2>
  ${commentRows}
</body></html>`
}

export default { buildReviewRecordHtml }
