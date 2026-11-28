// Print a PDF the same in every browser: each page is drawn as a sharp picture (pdfjs-dist, 200 dpi) and the
// pictures are printed, one sheet per page at the PDF's own page size. Printing the PDF file itself goes through the
// browser's PDF viewer, and Firefox's turns some letters into empty boxes (every "1" in the exports' Arial).
// Download PDF is still the real file (text and lines); this is only for paper.

const DPI = 200

export const printPdf = async (bytes) => {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const data = bytes instanceof Blob ? await bytes.arrayBuffer() : bytes.slice(0)
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false }).promise
  const urls = []
  let size = null
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const base = page.getViewport({ scale: 1 }) // points (1/72 in)
      if (!size) size = base
      const viewport = page.getViewport({ scale: DPI / 72 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport }).promise
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      urls.push(URL.createObjectURL(blob))
      canvas.width = 0 // let the memory go
    }
  } finally {
    doc.destroy()
  }

  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const w = frame.contentDocument
  w.open()
  w.write(`<!DOCTYPE html><html><head><style>
    @page { size: ${size.width}pt ${size.height}pt; margin: 0; }
    html, body { margin: 0; padding: 0; }
    img { display: block; width: ${size.width}pt; height: ${size.height}pt; break-after: page; }
    img:last-child { break-after: auto; }
  </style></head><body>${urls.map(u => `<img src="${u}">`).join('')}</body></html>`)
  w.close()
  await Promise.all([...w.images].map(img => (img.complete ? null : new Promise(r => { img.onload = img.onerror = r }))))
  frame.contentWindow.focus()
  frame.contentWindow.print()
  setTimeout(() => { frame.remove(); urls.forEach(u => URL.revokeObjectURL(u)) }, 120000)
}
