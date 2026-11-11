/**
 * DocumentViewerModal — viewer for generated documents in the official UNC
 * form layout (ported from the Learning Plan export's PDFViewerModal on
 * feature/learning-plan-submissions-management-v2).
 *
 * The document is HTML made of fixed 330 × 216 mm `.page` sheets, shown in an
 * iframe at PAGE_W and scaled with zoom. Tools: zoom in/out, fit to width/page,
 * page x / y, print, Download PDF (one `.page` = one PDF page, then any
 * `appendix_pdfs`), fullscreen.
 *
 * file: {
 *   title, kicker?, course_id?, course_name?, period_label?,
 *   file_url?, file_name?,                       — one document, or
 *   documents?: [{ label, file_url, file_name, appendix_pdfs? }]  — one tab each
 * }
 * Switching tabs loads that document and resets to page 1; the zoom is kept.
 * Page counter, print and Download PDF act on the open tab. With more than one
 * document, the Download menu also offers "Download both".
 *
 * (src/components/PDFViewerModal.jsx stays the pdf.js viewer for uploaded PDFs:
 * the Program of Study.)
 */
import React from 'react';
import { createPortal } from 'react-dom';
import {
  X, Download, File, Columns, ZoomIn, ZoomOut, Maximize, Minimize2, Printer,
  ChevronLeft, ChevronRight, ChevronDown, Loader,
} from 'react-feather';
import styles from '../styles/DocumentViewerModal.module.sass';
import useDialogFocus from '../utils/useDialogFocus.js';
import { PAGE_W, downloadDocumentPdf } from '../utils/pdfExport.js';

const PAGE_H = 816; // 216 mm at 96 dpi

// "2026-11-02" → "Nov 2, 2026"
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return y && m && d ? `${SHORT_MONTHS[m - 1]} ${d}, ${y}` : String(s);
};

const docsOf = (file) => (Array.isArray(file && file.documents) && file.documents.length
  ? file.documents
  : file && file.file_url ? [{ label: file.title || 'Document', file_url: file.file_url, file_name: file.file_name, appendix_pdfs: file.appendix_pdfs }] : []);

const DocumentViewerModal = ({ file, kind, onClose, layer = 0 }) => {
  const docs = React.useMemo(() => docsOf(file), [file]);
  const [tab, setTab] = React.useState(0);
  const [zoom, setZoom] = React.useState(0.65);
  const [fitMode, setFitMode] = React.useState('width');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageCount, setPageCount] = React.useState(0);
  const [iframeHeight, setIframeHeight] = React.useState(PAGE_H + 48);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [exporting, setExporting] = React.useState(null); // null | 'one' | 'all'
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [error, setError] = React.useState('');
  const paneRef = React.useRef(null);
  const iframeRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  const observerRef = React.useRef(null);
  const menuRef = React.useRef(null);
  useDialogFocus(dialogRef, true);

  const active = docs[Math.min(tab, docs.length - 1)] || null;
  const activeUrl = active ? active.file_url : null;

  // Escape: close the menu, then leave fullscreen, then close.
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (menuOpen) setMenuOpen(false);
      else if (isFullscreen) setIsFullscreen(false);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isFullscreen, menuOpen]);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const calcZoom = React.useCallback(() => {
    const pane = paneRef.current;
    if (!pane) return;
    const pw = pane.clientWidth - 24;
    const ph = pane.clientHeight - 32;
    const z = fitMode === 'page' ? Math.min(pw / PAGE_W, ph / PAGE_H) * 0.96 : (pw / PAGE_W) * 0.96;
    setZoom(Math.max(0.15, +z.toFixed(2)));
  }, [fitMode]);

  // Fit on open, on a fit-mode change and when the window resizes — not on a tab
  // switch. A height-only change (a note bar appearing on one tab) doesn't refit
  // in fit-to-width mode, so a zoom the user chose survives switching tabs.
  React.useEffect(() => {
    calcZoom();
    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver !== 'function') return undefined;
    let last = { w: pane.clientWidth, h: pane.clientHeight };
    const ro = new ResizeObserver(() => {
      const now = { w: pane.clientWidth, h: pane.clientHeight };
      const changed = now.w !== last.w || (fitMode === 'page' && now.h !== last.h);
      last = now;
      if (changed) calcZoom();
    });
    ro.observe(pane);
    return () => ro.disconnect();
  }, [calcZoom, isFullscreen, fitMode]);

  // A different tab: back to page 1, top of the pane; measure again on load.
  React.useEffect(() => {
    setCurrentPage(1);
    setPageCount(0);
    setError('');
    if (paneRef.current) paneRef.current.scrollTop = 0;
  }, [activeUrl]);

  React.useEffect(() => () => { if (observerRef.current) observerRef.current.disconnect(); }, []);

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    const measure = () => {
      const idoc = iframe && iframe.contentDocument;
      if (!idoc || !idoc.body) return;
      setPageCount(idoc.querySelectorAll('.page').length);
      setIframeHeight(Math.max(PAGE_H, idoc.body.scrollHeight));
    };
    measure();
    // The measuring script spreads the rows over sheets just after load.
    setTimeout(measure, 250);
    try {
      const idoc = iframe.contentDocument;
      if (idoc.fonts && idoc.fonts.ready) idoc.fonts.ready.then(measure);
      if (observerRef.current) observerRef.current.disconnect();
      const RO = iframe.contentWindow.ResizeObserver;
      if (typeof RO === 'function') {
        observerRef.current = new RO(measure);
        observerRef.current.observe(idoc.body);
      }
    } catch { /* keeps the measurements above */ }
  };

  const pageTops = () => {
    const idoc = iframeRef.current && iframeRef.current.contentDocument;
    return idoc ? Array.from(idoc.querySelectorAll('.page')).map((el) => el.offsetTop) : [];
  };

  const goToPage = (n) => {
    if (n < 1 || n > pageCount) return;
    const top = pageTops()[n - 1];
    if (top === undefined || !paneRef.current) return;
    paneRef.current.scrollTop = top * zoom;
    setCurrentPage(n);
  };

  // Keep "page x" in step with scrolling.
  const onScroll = () => {
    const pane = paneRef.current;
    if (!pane || !pageCount) return;
    const y = pane.scrollTop / zoom + 40;
    const tops = pageTops();
    let n = 1;
    for (let i = 0; i < tops.length; i++) if (tops[i] <= y) n = i + 1;
    if (n !== currentPage) setCurrentPage(n);
  };

  const zoomIn = () => setZoom((z) => Math.min(2.5, +(z * 1.2).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.15, +(z / 1.2).toFixed(2)));

  const handlePrint = () => {
    const win = iframeRef.current && iframeRef.current.contentWindow;
    if (!win) return;
    win.focus();
    setTimeout(() => win.print(), 150);
  };

  const download = async (which) => {
    if (exporting) return;
    setMenuOpen(false);
    setError('');
    setExporting(which);
    try {
      const list = which === 'all' ? docs : [active];
      for (const d of list) await downloadDocumentPdf(d);
    } catch (err) {
      setError('Download PDF failed: ' + ((err && err.message) || 'unknown error') + ' You can still print the document.');
    } finally {
      setExporting(null);
    }
  };

  if (!file || !active) return null;

  const title = file.title || (active.file_name || 'Document').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
  const detailLine = [
    file.course_id ? file.course_id + (file.course_name ? ' — ' + file.course_name : '') : '',
    file.instructor_name,
    file.period_label,
  ].filter(Boolean).join(' · ');
  const dateLine = [
    file.submission_date ? 'Submitted ' + shortDate(file.submission_date) : '',
    file.approved_date ? 'Approved ' + shortDate(file.approved_date) : '',
  ].filter(Boolean).join(' · ');
  const appendixCount = (active.appendix_pdfs || []).length;

  return createPortal(
    <>
      {!isFullscreen && <div className={styles.backdrop} style={{ zIndex: 100 + layer }} onClick={onClose} />}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={(kind || 'Document') + ' preview: ' + title}
        className={styles.modal + ' ' + (isFullscreen ? styles.fullscreen : styles.windowed)}
        style={{ zIndex: 101 + layer }}
      >
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.kicker}>{file.kicker || kind || 'Document'}</div>
            <div className={styles.title} title={title}>{title}</div>
            {detailLine && <div className={styles.detail} title={detailLine}>{detailLine}</div>}
            {dateLine && <div className={styles.detail} title={dateLine}>{dateLine}</div>}
          </div>

          {docs.length > 1 && (
            <div className={styles.pillToggle} role="tablist" aria-label="Documents">
              {docs.map((d, i) => (
                <button
                  key={d.label + i}
                  type="button"
                  role="tab"
                  aria-selected={i === tab}
                  className={styles.pillOption + (i === tab ? ' ' + styles.pillActive : '')}
                  onClick={() => setTab(i)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          <div className={styles.toolGroup}>
            <button type="button" className={styles.iconBtn} onClick={zoomOut} title="Zoom out" aria-label="Zoom out"><ZoomOut size={16} /></button>
            <span className={styles.counter} aria-live="polite">{Math.round(zoom * 100)}%</span>
            <button type="button" className={styles.iconBtn} onClick={zoomIn} title="Zoom in" aria-label="Zoom in"><ZoomIn size={16} /></button>
            <button
              type="button"
              className={styles.iconBtn + (fitMode === 'page' ? ' ' + styles.on : '')}
              onClick={() => setFitMode((f) => (f === 'width' ? 'page' : 'width'))}
              title={fitMode === 'width' ? 'Fit to page' : 'Fit to width'}
              aria-label={fitMode === 'width' ? 'Fit to page' : 'Fit to width'}
            >
              {fitMode === 'width' ? <Columns size={16} /> : <File size={16} />}
            </button>
          </div>

          {pageCount > 0 && (
            <div className={styles.toolGroup}>
              <button type="button" className={styles.iconBtn} onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} title="Previous page" aria-label="Previous page"><ChevronLeft size={16} /></button>
              <span className={styles.counter} style={{ minWidth: 56 }}>{currentPage} / {pageCount}</span>
              <button type="button" className={styles.iconBtn} onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount} title="Next page" aria-label="Next page"><ChevronRight size={16} /></button>
            </div>
          )}

          <div className={styles.toolGroup}>
            <button type="button" className={styles.iconBtn} onClick={handlePrint} title="Print" aria-label="Print"><Printer size={16} /></button>
            <div className={styles.downloadWrap} ref={menuRef}>
              <button
                type="button"
                className={styles.primaryBtn + (docs.length > 1 ? '' : ' ' + styles.solo)}
                onClick={() => download('one')}
                disabled={!!exporting}
                title={'Download ' + (active.file_name || 'PDF')}
              >
                {exporting === 'one' ? <Loader size={15} className={styles.spin} /> : <Download size={15} />}
                {exporting === 'one' ? 'Exporting…' : 'Download PDF'}
              </button>
              {docs.length > 1 && (
                <button type="button" className={styles.caretBtn} onClick={() => setMenuOpen((o) => !o)} disabled={!!exporting} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="More download options">
                  {exporting === 'all' ? <Loader size={14} className={styles.spin} /> : <ChevronDown size={14} />}
                </button>
              )}
              {menuOpen && (
                <div className={styles.menu} role="menu">
                  <button type="button" role="menuitem" className={styles.menuItem} onClick={() => download('all')}>
                    <Download size={14} /> Download both ({docs.length} PDFs)
                  </button>
                </div>
              )}
            </div>
            <button type="button" className={styles.iconBtn} onClick={() => setIsFullscreen((f) => !f)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
            </button>
            <button type="button" className={styles.iconBtn} onClick={onClose} title="Close" aria-label="Close"><X size={16} strokeWidth={2.5} /></button>
          </div>
        </div>

        {appendixCount > 0 && (
          <div className={styles.note} role="note">
            Download PDF adds the attached questionnaire{appendixCount === 1 ? '' : 's'} ({appendixCount} PDF{appendixCount === 1 ? '' : 's'}) after these pages.
          </div>
        )}
        {error && <div className={styles.error} role="alert">{error}</div>}

        <div className={styles.body}>
          <div ref={paneRef} className={styles.previewPane} onScroll={onScroll}>
            <div className={styles.stage}>
              {/* Scaled with a transform, not CSS zoom: zoom reaches into the iframe's own
                  layout (minimum font sizes at small zoom change where pages break). The
                  outer box takes the scaled size so the pane scrolls correctly. */}
              <div style={{ width: PAGE_W * zoom, height: iframeHeight * zoom, flexShrink: 0, lineHeight: 0 }}>
                <div style={{ width: PAGE_W, transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
                <iframe
                  key={active.file_url}
                  ref={iframeRef}
                  title={title + ' — ' + (active.label || '')}
                  src={active.file_url}
                  onLoad={handleIframeLoad}
                  style={{ width: PAGE_W, height: iframeHeight, border: 'none', background: 'transparent', display: 'block' }}
                />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default DocumentViewerModal;
