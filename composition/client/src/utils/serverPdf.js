import { API_BASE } from './api.js'
import { actingRole } from './session.js'

// The export page as a real PDF, made by the server's headless Chrome (POST /api/export/pdf): sharp lines and
// selectable text, unlike page pictures. The server page loads nothing from the network, so every image is
// embedded first. Throws when the server cannot make it; the caller falls back to the in-browser pictures.

const toDataUrl = async (src) => {
  const blob = await (await fetch(src, { credentials: 'include' })).blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// <img src="..."> that is not already a data: URL becomes one (the logo, mostly).
export const embedImages = async (html) => {
  const sources = [...new Set([...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map(m => m[1]).filter(src => !src.startsWith('data:')))]
  let out = html
  for (const src of sources) {
    const data = await toDataUrl(src.replace(/&amp;/g, '&')).catch(() => null)
    if (data) out = out.split(`src="${src}"`).join(`src="${data}"`)
  }
  return out
}

export const renderPdfOnServer = async (html) => {
  const role = actingRole()
  const res = await fetch(`${API_BASE}/api/export/pdf`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/html', ...(role ? { 'X-LPMS-Role': role } : {}) },
    body: await embedImages(html),
  })
  if (!res.ok) throw new Error(`PDF export failed (HTTP ${res.status})`)
  return await res.arrayBuffer()
}
