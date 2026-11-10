import { API_BASE } from './api.js'
import { actingRole } from './session.js'

// A program's uploaded front pages (University; Department / Program and PEOs; POs and PEOs) and the PDF joining
// that puts them in front of the generated learning plan. Server: /api/program-outcomes/:programId/front-pages.

const pdfLib = () => import('pdf-lib')

// The uploaded PDF as bytes, or null when the program has none.
export const fetchFrontPages = async (programId) => {
  if (!programId) return null
  const role = actingRole()
  const res = await fetch(`${API_BASE}/api/program-outcomes/${encodeURIComponent(programId)}/front-pages`, {
    credentials: 'include', headers: role ? { 'X-LPMS-Role': role } : {},
  })
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) throw new Error(`Could not load the program's front pages (HTTP ${res.status}).`)
  return res.arrayBuffer()
}

export const countPdfPages = async (bytes) => {
  const { PDFDocument } = await pdfLib()
  return (await PDFDocument.load(bytes)).getPageCount()
}

// One PDF: every page of `first`, then every page of `second`.
export const joinPdfs = async (first, second) => {
  const { PDFDocument } = await pdfLib()
  const out = await PDFDocument.create()
  for (const bytes of [first, second]) {
    const doc = await PDFDocument.load(bytes)
    for (const page of await out.copyPages(doc, doc.getPageIndices())) out.addPage(page)
  }
  return out.save()
}
