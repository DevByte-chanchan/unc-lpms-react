/**
 * PDFViewerModal — in-app viewer for uploaded PDFs (Learning Plan, Program of Study).
 *
 * Look ported from the Learning Plan module's viewer
 * (feature/learning-plan-submissions-management-v2, PDFViewerModal.jsx):
 * a stacked header (kicker, title, detail lines) with one toolbar row — zoom,
 * fit width/page, page x / y, print, Download PDF, fullscreen, close — over
 * white page sheets on a slate background. No side panel.
 *
 * The PDF is drawn with pdf.js (never the browser's own PDF toolbar):
 *   - each page is a <canvas> at the current zoom × devicePixelRatio;
 *   - canvases render lazily as pages come near the view (IntersectionObserver);
 *   - every page gets pdf.js's text layer up front, so text can be selected
 *     and Ctrl+F finds it on any page; zooming only rescales it (--scale-factor).
 *
 * Props
 *   file        { file_name, file_url, course_id, course_name, instructor_name,
 *                 period_label, submission_date, approved_date,
 *                 documents?: [{ label, url | file_url, downloadUrl?, file_name? }] }
 *               documents → one tab each (pill toggle). A url may end in #page=N.
 *   kind        "Learning Plan" → kicker "LEARNING PLAN · APPROVED"
 *   eyebrow     replaces that kicker (Program of Study)
 *   details     [{ label, value }] shown as a header line instead of course/faculty
 *   actions     extra toolbar buttons (Program of Study: Previous versions…)
 *   initialTab  which document tab opens first
 *
 * A record without a URL (some mock rows) shows a centred card with its details.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import {
  X, Download, FileText, Columns, File, ZoomIn, ZoomOut, Maximize, Minimize2, Printer,
  ChevronLeft, ChevronRight, Loader, AlertCircle,
} from 'react-feather';
import styles from '../styles/PDFViewerModal.module.sass';
import useDialogFocus from '../utils/useDialogFocus.js';
import { loadPdfjs, CSS_UNITS } from '../utils/pdfjs.js';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const STEP = 1.2;
const MAX_CANVAS_PIXELS = 16777216; // keep a canvas within what browsers will allocate
const API_BASE = (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:4000/api';

const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +z.toFixed(2)));

const fmtDate = (s) => {
  if (!s) return '';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(s);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
};

// Send the session cookie only to this app and its API; a public file host
// (e.g. a CDN answering "Access-Control-Allow-Origin: *") rejects credentialed requests.
const credentialsFor = (url) => {
  try {
    const target = new URL(url, window.location.href).origin;
    const api = new URL(API_BASE, window.location.href).origin;
    return target === window.location.origin || target === api || url.startsWith('blob:') ? 'include' : 'omit';
  } catch {
    return 'omit';
  }
};

const splitPageHash = (url) => {
  const m = /#page=(\d+)/.exec(url || '');
  return { src: (url || '').replace(/#.*$/, ''), page: m ? Number(m[1]) : 1 };
};

function saveBlob(blob, name) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

// ─────────────────────────────── one page ───────────────────────────────
const PdfPage = React.memo(function PdfPage({ page, base, scale, near, number, sheetRef }) {
  const canvasRef = React.useRef(null);
  const textRef = React.useRef(null);

  // Text layer once per page, at scale 1; zoom rescales it through --scale-factor.
  React.useEffect(() => {
    const box = textRef.current;
    if (!box) return undefined;
    let layer = null;
    let cancelled = false;
    loadPdfjs().then(({ TextLayer }) => {
      if (cancelled) return;
      layer = new TextLayer({ textContentSource: page.streamTextContent(), container: box, viewport: page.getViewport({ scale: 1 }) });
      return layer.render();
    }).catch(() => { /* text selection is a bonus; the page still shows */ });
    return () => { cancelled = true; if (layer) layer.cancel(); box.replaceChildren(); };
  }, [page]);

  // Canvas when the page is near the view, re-drawn at each zoom.
  React.useEffect(() => {
    if (!near) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const viewport = page.getViewport({ scale });
    let ratio = window.devicePixelRatio || 1;
    const pixels = viewport.width * viewport.height * ratio * ratio;
    if (pixels > MAX_CANVAS_PIXELS) ratio = Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height));
    // Draw off-screen, then swap in, so zooming never flashes a blank sheet.
    const work = document.createElement('canvas');
    work.width = Math.floor(viewport.width * ratio);
    work.height = Math.floor(viewport.height * ratio);
    const task = page.render({
      canvasContext: work.getContext('2d'),
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
    });
    task.promise.then(() => {
      canvas.width = work.width;
      canvas.height = work.height;
      canvas.getContext('2d').drawImage(work, 0, 0);
    }).catch(() => { /* cancelled by a newer zoom or by closing */ });
    return () => task.cancel();
  }, [page, scale, near]);

  const w = base.width * scale;
  const h = base.height * scale;
  return (
    <div ref={sheetRef} className={styles.sheet} style={{ width: w, height: h }} data-page={number} aria-label={'Page ' + number}>
      <canvas ref={canvasRef} className={styles.canvas} style={{ width: w, height: h }} aria-hidden="true" />
      <div ref={textRef} className="textLayer" style={{ '--scale-factor': scale }} />
    </div>
  );
});

// ─────────────────────────────── viewer ───────────────────────────────
const PDFViewerModal = ({ file, kind, onClose, eyebrow, details, actions, initialTab = 0 }) => {
  const [tab, setTab] = React.useState(initialTab || 0);
  const [status, setStatus] = React.useState('idle'); // idle | loading | ready | error
  const [doc, setDoc] = React.useState(null); // { pdf, pages, bases }
  const [zoom, setZoom] = React.useState(1);
  const [fit, setFit] = React.useState('width'); // 'width' | 'page' | null (chosen zoom)
  const [current, setCurrent] = React.useState(1);
  const [pageDraft, setPageDraft] = React.useState('1');
  const [near, setNear] = React.useState(() => new Set([1, 2]));
  const [fullscreen, setFullscreen] = React.useState(false);
  const dialogRef = React.useRef(null);
  const paneRef = React.useRef(null);
  const sheetRefs = React.useRef([]);
  const bytesRef = React.useRef(null);
  const startPageRef = React.useRef(1);
  useDialogFocus(dialogRef, true);

  React.useEffect(() => { setTab(initialTab || 0); }, [file, initialTab]);

  const docs = React.useMemo(() => {
    if (!file) return [];
    if (Array.isArray(file.documents) && file.documents.length) {
      return file.documents.map((d) => ({ ...d, url: d.url || d.file_url }));
    }
    return [{ label: file.file_name || 'Document', url: file.file_url, file_name: file.file_name }];
  }, [file]);
  const active = docs[Math.min(tab, docs.length - 1)] || null;
  const { src, page: hashPage } = splitPageHash(active && active.url);
  const downloadName = (active && active.file_name) || (docs.length > 1 && active ? active.label + '.pdf' : file && file.file_name) || 'document.pdf';

  // ── load the PDF (per tab) ──
  React.useEffect(() => {
    bytesRef.current = null;
    setDoc(null);
    setCurrent(1);
    setPageDraft('1');
    setNear(new Set([1, 2]));
    setFit('width');
    startPageRef.current = hashPage;
    if (paneRef.current) paneRef.current.scrollTop = 0;
    if (!src) { setStatus('idle'); return undefined; }
    let cancelled = false;
    let task = null;
    let loaded = null;
    setStatus('loading');
    (async () => {
      const res = await fetch(src, { credentials: credentialsFor(src) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = await res.arrayBuffer();
      if (cancelled) return;
      bytesRef.current = new Blob([buf], { type: 'application/pdf' });
      const pdfjs = await loadPdfjs();
      // pdf.js takes ownership of the bytes it is given, so it gets a copy.
      task = pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)), verbosity: pdfjs.VerbosityLevel.ERRORS, isEvalSupported: false });
      loaded = await task.promise;
      const pages = await Promise.all(Array.from({ length: loaded.numPages }, (_, i) => loaded.getPage(i + 1)));
      if (cancelled) return;
      const bases = pages.map((p) => p.getViewport({ scale: 1 })); // in PDF points
      setDoc({ pdf: loaded, pages, bases });
      setStatus('ready');
    })().catch(() => { if (!cancelled) setStatus('error'); });
    return () => {
      cancelled = true;
      if (task) task.destroy();
      else if (loaded) loaded.destroy();
    };
  }, [src, hashPage]);

  // ── fit ──
  const fitZoom = React.useCallback((mode) => {
    const pane = paneRef.current;
    if (!pane || !doc) return null;
    const narrow = pane.clientWidth < 600;
    const pad = narrow ? 16 : 32;
    const maxW = Math.max(...doc.bases.map((b) => b.width)) * CSS_UNITS;
    const maxH = Math.max(...doc.bases.map((b) => b.height)) * CSS_UNITS;
    const byWidth = (pane.clientWidth - pad - 2) / maxW;
    return clampZoom(mode === 'page' ? Math.min(byWidth, (pane.clientHeight - (narrow ? 24 : 48)) / maxH) : byWidth);
  }, [doc]);

  React.useLayoutEffect(() => {
    if (!fit || !doc) return;
    const z = fitZoom(fit);
    if (z) setZoom(z);
  }, [fit, doc, fitZoom, fullscreen]);

  React.useEffect(() => {
    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver !== 'function') return undefined;
    const ro = new ResizeObserver(() => {
      if (!fit) return;
      const z = fitZoom(fit);
      if (z) setZoom((cur) => (cur === z ? cur : z));
    });
    ro.observe(pane);
    return () => ro.disconnect();
  }, [fit, fitZoom]);

  // ── which pages are near the view (render their canvases) ──
  React.useEffect(() => {
    if (!doc || !paneRef.current || typeof IntersectionObserver !== 'function') return undefined;
    const io = new IntersectionObserver((entries) => {
      setNear((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const e of entries) {
          const n = Number(e.target.getAttribute('data-page'));
          if (e.isIntersecting && !next.has(n)) { next.add(n); changed = true; }
          if (!e.isIntersecting && next.has(n)) { next.delete(n); changed = true; }
        }
        return changed ? next : prev;
      });
    }, { root: paneRef.current, rootMargin: '600px 0px' });
    sheetRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [doc]);

  // Open at #page=N once the sheets are laid out.
  React.useEffect(() => {
    if (status !== 'ready' || startPageRef.current <= 1) return;
    const n = Math.min(startPageRef.current, doc.pages.length);
    startPageRef.current = 1;
    requestAnimationFrame(() => {
      const el = sheetRefs.current[n - 1];
      if (el && paneRef.current) paneRef.current.scrollTop = el.offsetTop - 16;
      setCurrent(n);
      setPageDraft(String(n));
    });
  }, [status, doc]);

  // ── page counter follows scrolling (the page most in view) ──
  const onScroll = () => {
    const pane = paneRef.current;
    if (!pane || !doc) return;
    const top = pane.scrollTop;
    const bottom = top + pane.clientHeight;
    let best = 1;
    let bestSeen = -1;
    sheetRefs.current.forEach((el, i) => {
      if (!el) return;
      const seen = Math.min(bottom, el.offsetTop + el.offsetHeight) - Math.max(top, el.offsetTop);
      if (seen > bestSeen) { bestSeen = seen; best = i + 1; }
    });
    if (best !== current) { setCurrent(best); setPageDraft(String(best)); }
  };

  const total = doc ? doc.pages.length : 0;
  const sheetRefFns = React.useMemo(
    () => (doc ? doc.pages.map((_, i) => (el) => { sheetRefs.current[i] = el; }) : []),
    [doc],
  );
  const goTo = React.useCallback((n) => {
    if (!doc) return;
    const target = Math.min(Math.max(1, n), doc.pages.length);
    const el = sheetRefs.current[target - 1];
    if (el && paneRef.current) paneRef.current.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
    setCurrent(target);
    setPageDraft(String(target));
  }, [doc]);

  // Zoom keeps the same spot of the document in view.
  const applyZoom = React.useCallback((next) => {
    const pane = paneRef.current;
    setFit(null);
    setZoom((cur) => {
      const z = clampZoom(typeof next === 'function' ? next(cur) : next);
      if (pane && z !== cur) {
        const ratio = z / cur;
        const centre = pane.scrollTop + pane.clientHeight / 2;
        requestAnimationFrame(() => { pane.scrollTop = centre * ratio - pane.clientHeight / 2; });
      }
      return z;
    });
  }, []);
  const zoomIn = React.useCallback(() => applyZoom((z) => z * STEP), [applyZoom]);
  const zoomOut = React.useCallback(() => applyZoom((z) => z / STEP), [applyZoom]);

  // ── download / print ──
  const download = React.useCallback(() => {
    if (active && active.downloadUrl) {
      const a = document.createElement('a');
      a.href = active.downloadUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    if (bytesRef.current) { saveBlob(bytesRef.current, downloadName); return; }
    if (src) {
      // Not loaded (or couldn't be): hand the original link to the browser.
      const a = document.createElement('a');
      a.href = src;
      a.download = downloadName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }, [active, downloadName, src]);

  const print = React.useCallback(() => {
    const blob = bytesRef.current;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; visibility:hidden;';
    const cleanup = () => { frame.remove(); URL.revokeObjectURL(url); };
    frame.onload = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(cleanup, 60000);
      } catch {
        cleanup();
        window.open(URL.createObjectURL(blob), '_blank', 'noopener');
      }
    };
    frame.src = url;
    document.body.appendChild(frame);
  }, []);

  // ── keyboard ──
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (fullscreen) setFullscreen(false);
        else onClose();
        return;
      }
      const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); zoomIn(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoomOut(); return; }
      if (typing || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(current + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(current - 1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen, onClose, zoomIn, zoomOut, goTo, current]);

  if (!file) return null;

  // ── header text ──
  const kicker = eyebrow || ((kind || 'Document') + ' · Approved');
  const title = file.file_name || (kind || 'File') + ' Preview';
  const detailLine = Array.isArray(details)
    ? details.filter((d) => d && d.value).map((d) => d.label + ': ' + String(d.value).split('\n').join(', ')).join(' · ')
    : [
      file.course_id ? file.course_id + (file.course_name ? ' — ' + file.course_name : '') : '',
      file.instructor_name,
      file.period_label && file.period_label !== '—' ? file.period_label : '',
    ].filter(Boolean).join(' · ');
  const dateLine = Array.isArray(details) ? '' : [
    file.submission_date ? 'Submitted ' + fmtDate(file.submission_date) : '',
    file.approved_date ? 'Approved ' + fmtDate(file.approved_date) : '',
  ].filter(Boolean).join(' · ');

  const hasUrl = !!src;
  const ready = status === 'ready' && doc;

  return createPortal(
    <>
      {!fullscreen && <div className={styles.backdrop} style={{ zIndex: 100 }} onClick={onClose} />}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={styles.modal + ' ' + (fullscreen ? styles.fullscreen : styles.windowed)}
        style={{ zIndex: 101 }}
      >
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.kicker}>{kicker}</div>
            <div className={styles.title} title={title}>{title}</div>
            {detailLine && <div className={styles.line} title={detailLine}>{detailLine}</div>}
            {dateLine && <div className={styles.line} title={dateLine}>{dateLine}</div>}
          </div>

          {docs.length > 1 && (
            <div className={styles.pills} role="tablist" aria-label="Documents">
              {docs.map((d, i) => (
                <button key={d.label + i} type="button" role="tab" aria-selected={i === tab}
                  className={styles.pill + (i === tab ? ' ' + styles.pillOn : '')} onClick={() => setTab(i)}>
                  {d.label}
                </button>
              ))}
            </div>
          )}

          <div className={styles.toolbar}>
            {hasUrl && (
              <div className={styles.group}>
                <button type="button" className={styles.iconBtn} onClick={zoomOut} disabled={!ready || zoom <= MIN_ZOOM} title="Zoom out" aria-label="Zoom out"><ZoomOut size={16} /></button>
                <button type="button" className={styles.zoomPct} onClick={() => setFit('width')} disabled={!ready} title="Reset zoom (fit width)" aria-label={'Zoom ' + Math.round(zoom * 100) + '%, reset to fit width'}>
                  {Math.round(zoom * 100)}%
                </button>
                <button type="button" className={styles.iconBtn} onClick={zoomIn} disabled={!ready || zoom >= MAX_ZOOM} title="Zoom in" aria-label="Zoom in"><ZoomIn size={16} /></button>
                <button type="button" className={styles.iconBtn + ' ' + styles.fitBtn + (fit === 'page' ? ' ' + styles.on : '')}
                  onClick={() => setFit((f) => (f === 'page' ? 'width' : 'page'))} disabled={!ready}
                  title={fit === 'page' ? 'Fit width' : 'Fit page'} aria-label={fit === 'page' ? 'Fit width' : 'Fit page'}>
                  {fit === 'page' ? <File size={16} /> : <Columns size={16} />}
                </button>
              </div>
            )}

            {hasUrl && (
              <div className={styles.group}>
                <button type="button" className={styles.iconBtn} onClick={() => goTo(current - 1)} disabled={!ready || current <= 1} title="Previous page" aria-label="Previous page"><ChevronLeft size={16} /></button>
                <span className={styles.pageBox}>
                  <input
                    className={styles.pageInput}
                    value={pageDraft}
                    inputMode="numeric"
                    aria-label="Page number"
                    title="Go to page"
                    disabled={!ready}
                    onChange={(e) => setPageDraft(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { const n = Number(pageDraft); if (n) goTo(n); else setPageDraft(String(current)); } }}
                    onBlur={() => { const n = Number(pageDraft); if (n && n !== current) goTo(n); else setPageDraft(String(current)); }}
                  />
                  / {total || '–'}
                </span>
                <button type="button" className={styles.iconBtn} onClick={() => goTo(current + 1)} disabled={!ready || current >= total} title="Next page" aria-label="Next page"><ChevronRight size={16} /></button>
              </div>
            )}

            <div className={styles.group + ' ' + styles.actions}>
              {actions}
              {hasUrl && (
                <button type="button" className={styles.iconBtn} onClick={print} disabled={!ready} title="Print" aria-label="Print"><Printer size={16} /></button>
              )}
              {hasUrl && (
                <button type="button" className={styles.primaryBtn} onClick={download} title={'Download ' + downloadName} aria-label={'Download ' + downloadName}>
                  <Download size={15} /> Download PDF
                </button>
              )}
              <button type="button" className={styles.iconBtn} onClick={() => setFullscreen((f) => !f)}
                title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {fullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
              </button>
              <button type="button" className={styles.closeBtn} onClick={onClose} title="Close" aria-label="Close"><X size={16} strokeWidth={2.5} /></button>
            </div>
          </div>
        </div>

        <div ref={paneRef} className={styles.pane} onScroll={onScroll}>
          {!hasUrl && (
            <div className={styles.center}>
              <div className={styles.card}>
                <FileText size={26} color="#19282C" />
                <div className={styles.cardTitle}>{title}</div>
                <div className={styles.cardNote}>No file is attached to this record yet.</div>
                <dl style={{ margin: 0 }}>
                  {(Array.isArray(details) ? details : [
                    { label: 'Faculty', value: file.instructor_name },
                    { label: 'Course', value: file.course_id ? file.course_id + (file.course_name ? ' — ' + file.course_name : '') : '' },
                    { label: 'Submitted', value: fmtDate(file.submission_date) },
                    { label: 'Approved', value: fmtDate(file.approved_date) },
                    { label: 'Academic Period', value: file.period_label },
                    { label: 'File name', value: file.file_name },
                  ]).map((d) => (
                    <div key={d.label} className={styles.cardRow}><dt>{d.label}</dt><dd>{d.value || '—'}</dd></div>
                  ))}
                </dl>
              </div>
            </div>
          )}

          {hasUrl && status === 'loading' && (
            <div className={styles.center} role="status">
              <div className={styles.message}>
                <Loader size={26} className={styles.spinner} />
                Opening document…
              </div>
            </div>
          )}

          {hasUrl && status === 'error' && (
            <div className={styles.center} role="alert">
              <div className={styles.message}>
                <AlertCircle size={26} color="#B91C1C" />
                <span>Couldn&rsquo;t open this file. <button type="button" className={styles.linkBtn} onClick={download}>Download</button> it instead.</span>
              </div>
            </div>
          )}

          {ready && (
            <div className={styles.stack}>
              {doc.pages.map((p, i) => (
                <PdfPage
                  key={i}
                  page={p}
                  base={doc.bases[i]}
                  scale={zoom * CSS_UNITS}
                  near={near.has(i + 1)}
                  number={i + 1}
                  sheetRef={sheetRefFns[i]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};

export default PDFViewerModal;
