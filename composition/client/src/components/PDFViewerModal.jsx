import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, FileText, File, Columns, ZoomIn, ZoomOut, Maximize, Minimize2, Printer, ChevronLeft, ChevronRight } from 'react-feather';
import styles from '../styles/PDFViewerModal.module.sass';
import useDialogFocus from '../utils/useDialogFocus.js';

const ACCENT     = '#19282C';
const SLATE_900  = '#0F172A';
const SLATE_700  = '#334155';
const SLATE_500  = '#64748B';
const SLATE_400  = '#94A3B8';
const SLATE_300  = '#CBD5E1';
const SLATE_200  = '#E2E8F0';
const SLATE_100  = '#F1F5F9';
const SLATE_50   = '#F8FAFC';

const PAGE_W = 1247;
const PAGE_H = 816;

// `layer` lifts the viewer above another window that is already open (the Revisions window sits at 1000).
const PDFViewerModal = ({ file, kind, onClose, children, layer = 0 }) => {
  const [pdfSrc, setPdfSrc] = useState(null);
  const [zoom, setZoom] = useState(0.65);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [fitMode, setFitMode] = useState('width');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(4000);
  const [exporting, setExporting] = useState(false);
  // Set when the server could not make the PDF: which button was pressed ('print' or 'download'), for Try again.
  const [pdfFailed, setPdfFailed] = useState(null);
  const paneRef = useRef(null);
  const dialogRef = useRef(null);
  useDialogFocus(dialogRef, true);
  // The file's details, on one line under the title (what the side panel used to list): course and term.
  const detailLine = [
    file?.course_id ? file.course_id + (file.course_name ? ' \u2014 ' + file.course_name : '') : '',
    file?.period_label,
  ].filter(Boolean).join(' \u00b7 ');
  const iframeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isFullscreen]);

  useEffect(() => {
    const src = file?.file_url;
    if (!src || !/^(https?:\/\/|\/|blob:)/i.test(src)) return;
    let cancelled = false;
    setIframeHeight(4000);
    setPageCount(0);
    fetch(src, { credentials: 'include' })
      .then(r => r.blob())
      .then(blob => {
        if (!cancelled) setPdfSrc(URL.createObjectURL(blob) + '#toolbar=0&navpanes=0');
      })
      .catch(() => { if (!cancelled) setPdfSrc(file.file_url); });
    return () => { cancelled = true; };
  }, [file?.file_url]);

  const calcZoom = useCallback(() => {
    if (!paneRef.current) return;
    const pw = paneRef.current.clientWidth - 24;
    const ph = paneRef.current.clientHeight - 32;
    if (fitMode === 'page') {
      const z = Math.min(pw / PAGE_W, ph / PAGE_H) * 0.92;
      setZoom(+z.toFixed(2));
    } else {
      setZoom(+((pw / PAGE_W) * 0.92).toFixed(2));
    }
  }, [fitMode]);

  useEffect(() => { calcZoom(); }, [pdfSrc, calcZoom]);

  useEffect(() => {
    if (!paneRef.current) return;
    const ro = new ResizeObserver(() => calcZoom());
    ro.observe(paneRef.current);
    return () => ro.disconnect();
  }, [calcZoom]);

  const handleIframeLoad = () => {
    const measure = () => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentDocument) return;
      const pages = iframe.contentDocument.querySelectorAll('.page');
      setPageCount(pages.length);
      const body = iframe.contentDocument.body;
      if (!body) return;
      if (pages.length > 0) { setIframeHeight(body.scrollHeight); return; }
      // A flowing document (no fixed .page sheets, e.g. the review record): its height includes the
      // body's own margins, and it grows when fonts and images arrive, so it is re-measured below.
      const style = iframe.contentWindow.getComputedStyle(body);
      setIframeHeight(Math.ceil(body.getBoundingClientRect().height + parseFloat(style.marginTop || 0) + parseFloat(style.marginBottom || 0)));
    };
    measure();
    // The document's measured re-pagination script runs just after load and can
    // change the page count — re-measure once it has settled.
    setTimeout(measure, 250);
    try {
      const idoc = iframeRef.current?.contentDocument;
      idoc?.fonts?.ready?.then(measure);
      if (idoc?.body && typeof iframeRef.current.contentWindow.ResizeObserver === 'function') {
        new iframeRef.current.contentWindow.ResizeObserver(measure).observe(idoc.body);
      }
    } catch { /* a document that cannot be observed keeps the measurements above */ }
  };

  const goToPage = (n) => {
    if (n < 1 || n > pageCount) return;
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const pages = iframe.contentDocument.querySelectorAll('.page');
    const el = pages[n - 1];
    if (!el) return;
    const top = el.offsetTop;
    if (paneRef.current) paneRef.current.scrollTop = top * zoom;
    setCurrentPage(n);
  };

  const zoomIn = () => { setFitMode('width'); setZoom(z => Math.min(2.5, +(z * 1.2).toFixed(2))); };
  const zoomOut = () => setZoom(z => Math.max(0.15, +(z / 1.2).toFixed(2)));
  const toggleFitMode = () => setFitMode(f => f === 'width' ? 'page' : 'width');
  const toggleFullscreen = () => setIsFullscreen(f => !f);
  // The browser printing the page itself drops table lines (Firefox most of all), so Print prints the server's PDF,
  // the same file as Download PDF; the page itself is printed only when the server cannot make it.
  const printPage = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      setTimeout(() => iframe.contentWindow.print(), 200);
    }
  };

  // The server's PDF (front pages first when uploaded); null when the file is not an export page.
  // Throws when the server cannot make it: the user is told and chooses (Try again, or the picture copy),
  // instead of silently getting the picture copy with its faint lines.
  const serverPdf = async () => {
    if (!file?.file_url || !/\.html?$/i.test(file.file_name || '')) return null;
    const html = await (await fetch(file.file_url)).text();
    const { renderPdfOnServer } = await import('../utils/serverPdf.js');
    let bytes = await renderPdfOnServer(html);
    if (file.front_pdf) {
      const { joinPdfs } = await import('../utils/frontPages.js');
      bytes = await joinPdfs(file.front_pdf, bytes);
    }
    return bytes;
  };

  const handlePrint = async () => {
    if (exporting) return;
    setExporting(true);
    setPdfFailed(null);
    try {
      const bytes = await serverPdf();
      if (!bytes) { printPage(); return; }
      const { printPdf } = await import('../utils/printPdf.js');
      await printPdf(bytes);
    } catch (err) {
      console.warn('Server PDF failed:', err?.message || err);
      setPdfFailed('print');
    } finally {
      setExporting(false);
    }
  };

  const downloadName = () => (file?.file_name ? file.file_name.replace(/\.html?$/i, '') + '.pdf' : 'syllabus.pdf');
  const save = (bytes) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    link.download = downloadName();
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  };
  // The server's headless Chrome makes the real PDF (sharp lines, selectable text, small file).
  const handleExportPDF = async () => {
    if (exporting) return;
    setExporting(true);
    setPdfFailed(null);
    try {
      const bytes = await serverPdf();
      if (bytes) { save(bytes); setExporting(false); return; }
    } catch (err) {
      console.warn('Server PDF failed:', err?.message || err);
      setPdfFailed('download');
      setExporting(false);
      return;
    }
    await picturePdf(true);
  };

  // The picture copy: the PDF made in the browser from page pictures (lines lighter, text not selectable).
  // Only when the user picks it after the server failed, or for a file the server does not render.
  // The large libraries load only then. Each `.page` becomes exactly one fixed-size sheet: no scaling, no blanks.
  const picturePdf = async (busy = false) => {
    if (exporting && !busy) return;
    setExporting(true);
    setPdfFailed(null);
    try {
      const idoc = iframeRef.current?.contentDocument;
      const pageEls = idoc ? Array.from(idoc.querySelectorAll('.page')) : [];
      if (!pageEls.length) { printPage(); return; }

      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const PW = 330, PH = 216; // mm — long-bond landscape, matches @page size
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [PW, PH] });
      for (let i = 0; i < pageEls.length; i++) {
        const el = pageEls[i];
        const canvas = await html2canvas(el, {
          scale: 3, // higher DPI so the small table text stays legible
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight,
        });
        // PNG is lossless — avoids the JPEG fuzz that made text look blurry.
        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage([PW, PH], 'landscape');
        // Each .page is already a fixed sheet-height box; render it 1:1 at the fixed
        // paper size (no scaling/shrinking). The paginator splits content so a page
        // never exceeds one sheet.
        // 'FAST' deflates the image: without it jsPDF stores raw pixels (~27 MB a page at scale 3).
        pdf.addImage(imgData, 'PNG', 0, 0, PW, PH, undefined, 'FAST');
      }
      if (file.front_pdf) {
        // The program's uploaded front pages first, then the generated pages (utils/frontPages.js).
        const { joinPdfs } = await import('../utils/frontPages.js');
        save(await joinPdfs(file.front_pdf, pdf.output('arraybuffer')));
      } else {
        pdf.save(downloadName());
      }
    } catch (err) {
      console.warn('PDF export failed, falling back to browser print:', err?.message || err);
      printPage();
    } finally {
      setExporting(false);
    }
  };

  if (!file) return null;

  const hasRealUrl = file.file_url && /^(https?:\/\/|\/|blob:)/i.test(file.file_url);
  // The title shown in the header: a given title, else the file name without its extension and underscores.
  const title = file.title || (file.file_name ? file.file_name.replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ') : (kind || 'File') + ' Preview');

  const modalStyle = isFullscreen ? {
    position: 'fixed', inset: 0, zIndex: 101 + layer,
    background: '#FFFFFF',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  } : {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: '95vw', height: 'min(90vh, calc(100dvh - 24px))',
    background: '#FFFFFF', borderRadius: 8, zIndex: 101 + layer,
    boxShadow: '0 24px 60px rgba(15,23,42,0.30)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };

  return (
    <>
      {!isFullscreen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--backdrop)', zIndex: 100 + layer }} />
      )}
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${kind || 'Document'} preview: ${title}`} className={styles.modal} style={modalStyle}>
        {/* Header */}
        <div className={styles.header} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid #e5e7eb', gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: SLATE_500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {kind || 'Document'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={title}>
                {title}
              </div>
              {detailLine && (
                <div style={{ fontSize: 12, color: SLATE_500, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={detailLine}>
                  {detailLine}
                </div>
              )}
            </div>
          </div>

          {/* Zoom controls */}
          <div className={styles.toolGroup} style={{ flexShrink: 0 }}>
            <button type="button" className="app-icon-btn" onClick={zoomOut} title="Zoom out"><ZoomOut size={16} /></button>
            <span style={{ fontSize: 12, fontWeight: 600, color: SLATE_700, minWidth: 44, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button type="button" className="app-icon-btn" onClick={zoomIn} title="Zoom in"><ZoomIn size={16} /></button>
            <button type="button" className={`app-icon-btn ${fitMode === 'page' ? 'is-on' : ''}`} onClick={toggleFitMode} title={fitMode === 'width' ? 'Fit to page' : 'Fit to width'}>
              {fitMode === 'width' ? <Columns size={16} /> : <File size={16} />}
            </button>
          </div>

          {/* Page navigation */}
          {pageCount > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <button type="button" className="app-icon-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} title="Previous page" aria-label="Previous page"><ChevronLeft size={16} /></button>
              <span style={{ fontSize: 12, fontWeight: 600, color: SLATE_700, whiteSpace: 'nowrap', minWidth: 60, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {currentPage} / {pageCount}
              </span>
              <button type="button" className="app-icon-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount} title="Next page" aria-label="Next page"><ChevronRight size={16} /></button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button type="button" className="app-icon-btn" onClick={handlePrint} disabled={exporting} title="Print"><Printer size={16} /></button>
            <button type="button" className="btn btn-primary" onClick={handleExportPDF} disabled={exporting}
              style={{ padding: '0 14px', fontSize: 13 }}>
              <Download size={16} /> {exporting ? 'Exporting…' : 'Download PDF'}
            </button>
            <button type="button" className="app-icon-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
            </button>
            <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close">
              <X size={16} strokeWidth={2.5} color="currentColor" />
            </button>
          </div>
        </div>

        {pdfFailed && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 16px', fontSize: 13, background: '#fef2f2', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>
            <span style={{ flex: 1, minWidth: 200 }}>The server could not make the PDF. Try again, or use the picture copy (lines lighter, text not selectable).</span>
            <button type="button" className="btn btn-primary" style={{ padding: '0 12px', fontSize: 13 }} disabled={exporting}
              onClick={pdfFailed === 'print' ? handlePrint : handleExportPDF}>Try again</button>
            <button type="button" className="btn btn-secondary" style={{ padding: '0 12px', fontSize: 13 }} disabled={exporting}
              onClick={pdfFailed === 'print' ? () => { setPdfFailed(null); printPage(); } : () => picturePdf()}>
              {pdfFailed === 'print' ? 'Print from the browser' : 'Download picture copy'}
            </button>
          </div>
        )}

        {file.front_pages > 0 && (
          <div role="note" style={{ padding: '6px 16px', fontSize: 13, background: 'var(--accent-soft)', color: 'var(--ink-soft)' }}>
            Download PDF starts with the program&rsquo;s uploaded front pages ({file.front_pages} page{file.front_pages === 1 ? '' : 's'}); the pages below follow them.
          </div>
        )}
        {/* Body: sidebar + preview */}
        <div className={styles.body}>
          <div ref={paneRef} className={styles.previewPane} style={{ background: SLATE_100, position: 'relative' }}>
            {hasRealUrl ? (
              <div style={{ minHeight: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '16px 12px' }}>
                <div style={{
                  zoom: zoom,
                  lineHeight: 0,
                }}>
                  <iframe
                    ref={iframeRef}
                    title={title}
                    src={pdfSrc || file.file_url}
                    onLoad={handleIframeLoad}
                    style={{ width: PAGE_W, height: iframeHeight, border: 'none', background: 'transparent', display: 'block' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                padding: 0, overflow: 'hidden', boxSizing: 'border-box',
              }}>
                {children || (
                  <div style={{
                    width: 'min(580px, 100%)',
                    background: '#FFFFFF',
                    border: '1px solid ' + SLATE_200,
                    borderRadius: 12, padding: 40,
                    boxShadow: '0 6px 18px rgba(15,23,42,0.06)',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 14,
                      background: '#FEE2E2', color: ACCENT,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 14,
                    }}>
                      <FileText size={28} />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: SLATE_900, letterSpacing: '-0.01em' }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 13, color: SLATE_500, marginTop: 6, lineHeight: 1.5 }}>
                      In-app document viewer
                    </div>
                    <div style={{
                      marginTop: 22, padding: '10px 14px',
                      background: SLATE_50, border: '1px dashed ' + SLATE_200, borderRadius: 8,
                      fontSize: 12, color: SLATE_700, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}>
                      {file.file_url || '(no file_url on this mock record)'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PDFViewerModal;
