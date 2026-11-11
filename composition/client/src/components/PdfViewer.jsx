import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Columns, Download, File, Maximize, Minimize2, Printer, ZoomIn, ZoomOut } from 'react-feather'
import styles from '../styles/PdfViewer.module.sass'

// The app's own PDF viewer, laid out like the export preview (PDFViewerModal) without its close button: the title on
// the left; zoom out / % / zoom in / fit width or page; previous / page X / Y / next; print, Download PDF, full screen.
// pdfjs-dist draws the pages and is loaded only when a PDF is shown.
//
//   bytes      the PDF (ArrayBuffer, Uint8Array, or a File / Blob)
//   fileName   used for Download
//   kind       the small heading over the title (e.g. 'Front pages'); title, detail: the lines under it
//   height     the viewer's height when not full screen (CSS length)

const loadPdfjs = async () => {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const GAP = 24 // the backdrop around a page

const PdfViewer = ({ bytes, fileName = 'document.pdf', kind = 'PDF', title, detail, height = '70vh' }) => {
  const [doc, setDoc] = useState(null)
  const [first, setFirst] = useState(null) // page 1's size at 100%, for fitting
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(null) // null = fit
  const [fitMode, setFitMode] = useState('width')
  const [full, setFull] = useState(false)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const scroller = useRef(null)
  const pageRefs = useRef([])

  useEffect(() => {
    let cancelled = false
    let loaded = null
    setDoc(null); setFirst(null); setError(''); setPage(1)
    // pdfjs hands the data to its worker (the copy is used up), so the caller's bytes stay whole for Download
    const data = bytes instanceof Blob ? bytes.arrayBuffer() : Promise.resolve(bytes.slice(0))
    Promise.all([loadPdfjs(), data])
      .then(([pdfjs, copy]) => pdfjs.getDocument({ data: new Uint8Array(copy), isEvalSupported: false }).promise)
      .then(async d => {
        loaded = d
        const p = await d.getPage(1)
        const v = p.getViewport({ scale: 1 })
        if (!cancelled) { setFirst({ w: v.width, h: v.height }); setDoc(d) }
      })
      .catch(() => { if (!cancelled) setError('This PDF could not be shown.') })
    return () => { cancelled = true; if (loaded) loaded.destroy() }
  }, [bytes])

  // fitting follows the viewer's own size
  useEffect(() => {
    const el = scroller.current
    if (!el) return undefined
    const observe = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    observe.observe(el)
    return () => observe.disconnect()
  }, [])

  // which page is in view, for "X / Y"
  useEffect(() => {
    const el = scroller.current
    if (!el || !doc) return undefined
    const onScroll = () => {
      const top = el.getBoundingClientRect().top
      let current = 1
      pageRefs.current.forEach((p, i) => { if (p && p.getBoundingClientRect().top - top < el.clientHeight / 2) current = i + 1 })
      setPage(current)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [doc])

  useEffect(() => {
    if (!full) return undefined
    // Escape leaves full screen only (caught first, so a window around the viewer stays open)
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setFull(false) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [full])

  const fitScale = first && box.w
    ? (fitMode === 'width'
      ? (box.w - GAP * 2) / first.w
      : Math.min((box.w - GAP * 2) / first.w, (box.h - GAP * 2) / first.h))
    : 0
  const scale = zoom ?? fitScale
  const stepZoom = (factor) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(scale * factor * 100) / 100)))

  const goTo = useCallback((n) => {
    const target = pageRefs.current[n - 1]
    if (target && scroller.current) scroller.current.scrollTo({ top: target.offsetTop - GAP, behavior: 'smooth' })
  }, [])

  const blobUrl = () => URL.createObjectURL(bytes instanceof Blob ? bytes : new Blob([bytes], { type: 'application/pdf' }))

  const download = () => {
    const url = blobUrl()
    const a = document.createElement('a')
    a.href = url; a.download = fileName; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  // pages printed as pictures (utils/printPdf.js), the same in every browser
  const print = async () => {
    const { printPdf } = await import('../utils/printPdf.js')
    await printPdf(bytes).catch(() => {})
  }

  const pages = doc ? doc.numPages : 0

  return (
    <div className={`${styles.viewer} ${full ? styles.full : ''}`} style={full ? undefined : { height }}>
      <div className={styles.header} role="toolbar" aria-label="PDF">
        <div className={styles.titles}>
          <div className={styles.kind}>{kind}</div>
          {title && <div className={styles.title} title={title}>{title}</div>}
          {detail && <div className={styles.detail} title={detail}>{detail}</div>}
        </div>

        <div className={styles.group}>
          <button type="button" className="app-icon-btn" onClick={() => stepZoom(1 / 1.1)} disabled={!scale || scale <= MIN_ZOOM} title="Zoom out" aria-label="Zoom out"><ZoomOut size={16} /></button>
          <span className={styles.label}>{scale ? `${Math.round(scale * 100)}%` : '–'}</span>
          <button type="button" className="app-icon-btn" onClick={() => stepZoom(1.1)} disabled={!scale || scale >= MAX_ZOOM} title="Zoom in" aria-label="Zoom in"><ZoomIn size={16} /></button>
          <button type="button" className={`app-icon-btn ${fitMode === 'page' ? 'is-on' : ''}`}
            onClick={() => { setFitMode(m => (m === 'width' ? 'page' : 'width')); setZoom(null) }}
            title={fitMode === 'width' ? 'Fit to page' : 'Fit to width'} aria-label={fitMode === 'width' ? 'Fit to page' : 'Fit to width'}>
            {fitMode === 'width' ? <Columns size={16} /> : <File size={16} />}
          </button>
        </div>

        {pages > 0 && (
          <div className={styles.group}>
            <button type="button" className="app-icon-btn" onClick={() => goTo(page - 1)} disabled={page <= 1} title="Previous page" aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span className={styles.label}>{page} / {pages}</span>
            <button type="button" className="app-icon-btn" onClick={() => goTo(page + 1)} disabled={page >= pages} title="Next page" aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        )}

        <div className={styles.group}>
          <button type="button" className="app-icon-btn" onClick={print} title="Print" aria-label="Print"><Printer size={16} /></button>
          <button type="button" className={`btn btn-primary ${styles.download}`} onClick={download}><Download size={16} /> Download PDF</button>
          <button type="button" className="app-icon-btn" onClick={() => setFull(f => !f)} title={full ? 'Exit full screen' : 'Full screen'} aria-label={full ? 'Exit full screen' : 'Full screen'}>
            {full ? <Minimize2 size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      <div ref={scroller} className={styles.pages}>
        {error && <div role="alert" className={styles.note}>{error}</div>}
        {!doc && !error && <div className={styles.note}>Loading…</div>}
        {doc && scale > 0 && Array.from({ length: pages }, (_, i) => (
          <PdfPage key={i} doc={doc} number={i + 1} scale={scale} ref={el => { pageRefs.current[i] = el }} />
        ))}
      </div>
    </div>
  )
}

// One page drawn on a canvas at the screen's pixel density, re-drawn when the zoom changes.
const PdfPage = ({ doc, number, scale, ref }) => {
  const canvas = useRef(null)
  const [size, setSize] = useState(null)
  useEffect(() => {
    let task = null
    let cancelled = false
    doc.getPage(number).then(page => {
      if (cancelled) return
      const ratio = window.devicePixelRatio || 1
      const viewport = page.getViewport({ scale: scale * ratio })
      const c = canvas.current
      if (!c) return
      c.width = Math.floor(viewport.width)
      c.height = Math.floor(viewport.height)
      setSize({ w: viewport.width / ratio, h: viewport.height / ratio })
      task = page.render({ canvasContext: c.getContext('2d'), viewport })
      task.promise.catch(() => {})
    })
    return () => { cancelled = true; if (task) task.cancel() }
  }, [doc, number, scale])
  return (
    <div ref={ref} className={styles.page} style={size ? { width: size.w, height: size.h } : { minHeight: 400 }}>
      <canvas ref={canvas} style={size ? { width: size.w, height: size.h } : undefined} aria-label={`Page ${number}`} />
    </div>
  )
}

export default PdfViewer
