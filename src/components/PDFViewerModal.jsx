import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, FileText, User, Calendar, BookOpen, ZoomIn, ZoomOut, Maximize, Printer, ChevronLeft, ChevronRight } from 'react-feather';
import axios from 'axios';

const ACCENT     = '#19282C';
const SLATE_900  = '#0F172A';
const SLATE_700  = '#334155';
const SLATE_500  = '#64748B';
const SLATE_400  = '#94A3B8';
const SLATE_300  = '#CBD5E1';
const SLATE_200  = '#E2E8F0';
const SLATE_100  = '#F1F5F9';
const SLATE_50   = '#F8FAFC';

const fmtDate = (s) => {
  if (!s) return '\u2014';
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(s);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
};

const MetaRow = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
    <span style={{ color: SLATE_400, marginTop: 2 }}>{icon}</span>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: SLATE_500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, color: SLATE_900, marginTop: 2, fontWeight: 500, lineHeight: 1.4 }}>{value || '\u2014'}</div>
    </div>
  </div>
);


const btnBase = {
  height: 32, width: 32, borderRadius: 6, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid ' + SLATE_200, background: '#fff', color: SLATE_700,
  padding: 0, lineHeight: 0, transition: 'all 0.15s ease',
};

const PAGE_W = 1247;
const PAGE_H = 816;

const PDFViewerModal = ({ file, kind, onClose, onExport, children }) => {
  const [pdfSrc, setPdfSrc] = useState(null);
  const [zoom, setZoom] = useState(0.65);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [fitMode, setFitMode] = useState('width');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(4000);
  const [exporting, setExporting] = useState(false);
  const paneRef = useRef(null);
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
    if (!file?.file_url || !/^(https?:\/\/|\/|blob:)/i.test(file.file_url)) return;
    let cancelled = false;
    setIframeHeight(4000);
    setPageCount(0);
    fetch(file.file_url)
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
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const pages = iframe.contentDocument.querySelectorAll('.page');
    setPageCount(pages.length);
    const body = iframe.contentDocument.body;
    if (body) setIframeHeight(body.scrollHeight);
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
  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      setTimeout(() => iframe.contentWindow.print(), 200);
    }
  };

  const handleExportPDF = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const src = pdfSrc || file?.file_url;
      if (!src) { alert('No content to export.'); setExporting(false); return; }

      const resp = await fetch(src);
      const html = await resp.text();

      const pdfResp = await axios.post('/api/export-pdf', { html }, {
        responseType: 'blob',
        timeout: 10000,
      });

      const url = URL.createObjectURL(new Blob([pdfResp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = file?.file_name ? file.file_name.replace(/\.html?$/i, '') + '.pdf' : 'syllabus.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export PDF error:', err);
      const msg = err?.response?.data?.error || err.message || err;
      if (msg.includes('timeout') || msg.includes('Network Error') || msg.includes('500') || msg.includes('connect') || msg.includes('ERR_CONNECTION')) {
        alert('PDF export failed. Make sure the backend server is running:\n  cd server && node server.js\n\n' + msg);
      } else {
        alert('PDF export failed: ' + msg);
      }
    } finally {
      setExporting(false);
    }
  };

  if (!file) return null;

  const hasRealUrl = file.file_url && /^(https?:\/\/|\/|blob:)/i.test(file.file_url);
  const title = file.file_name || (kind || 'File') + ' Preview';

  const modalStyle = isFullscreen ? {
    position: 'fixed', inset: 0, zIndex: 101,
    background: '#FFFFFF',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  } : {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 'min(1360px, 96vw)', height: 'min(920px, 94vh)',
    background: '#FFFFFF', borderRadius: 14, zIndex: 101,
    boxShadow: '0 24px 60px rgba(15,23,42,0.30)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };

  return (
    <>
      {!isFullscreen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
      )}
      <div style={modalStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px', borderBottom: '1px solid ' + SLATE_200, gap: 10, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: '#FEE2E2', color: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <FileText size={16} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: SLATE_500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {kind || 'Document'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: SLATE_900, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </div>
            </div>
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0, background: SLATE_50, borderRadius: 8, padding: '2px 4px', border: '1px solid ' + SLATE_200 }}>
            <button type="button" onClick={zoomOut} title="Zoom out" style={btnBase}
              onMouseEnter={e => { e.currentTarget.style.background = SLATE_100; e.currentTarget.style.borderColor = SLATE_300; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = SLATE_200; }}>
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: SLATE_700, minWidth: 40, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button type="button" onClick={zoomIn} title="Zoom in" style={btnBase}
              onMouseEnter={e => { e.currentTarget.style.background = SLATE_100; e.currentTarget.style.borderColor = SLATE_300; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = SLATE_200; }}>
              <ZoomIn size={14} />
            </button>
            <button type="button" onClick={toggleFitMode} title={fitMode === 'width' ? 'Fit to page' : 'Fit to width'} style={{
              ...btnBase, background: fitMode === 'page' ? SLATE_200 : '#fff',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = SLATE_100; }}
              onMouseLeave={e => { e.currentTarget.style.background = fitMode === 'page' ? SLATE_200 : '#fff'; }}>
              <Maximize size={14} />
            </button>
          </div>

          {/* Page navigation */}
          {pageCount > 0 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
              <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} style={{ ...btnBase, opacity: currentPage <= 1 ? 0.3 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.background = SLATE_100; e.currentTarget.style.borderColor = SLATE_300; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = SLATE_200; }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: SLATE_700, whiteSpace: 'nowrap', minWidth: 60, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {currentPage} / {pageCount}
              </span>
              <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount} style={{ ...btnBase, opacity: currentPage >= pageCount ? 0.3 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.background = SLATE_100; e.currentTarget.style.borderColor = SLATE_300; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = SLATE_200; }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button type="button" onClick={handlePrint} title="Print" style={btnBase}
              onMouseEnter={e => { e.currentTarget.style.background = SLATE_100; e.currentTarget.style.borderColor = SLATE_300; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = SLATE_200; }}>
              <Printer size={14} />
            </button>
            <button type="button" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} style={btnBase}
              onMouseEnter={e => { e.currentTarget.style.background = SLATE_100; e.currentTarget.style.borderColor = SLATE_300; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = SLATE_200; }}>
              <Maximize size={14} />
            </button>
            <button
              type="button" onClick={handleExportPDF} disabled={exporting}
              style={{
                height: 32, padding: '0 12px', borderRadius: 7,
                background: exporting ? '#94a3b8' : ACCENT, color: '#FFFFFF', border: 'none', cursor: exporting ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                boxShadow: '0 2px 8px rgba(185,28,28,0.20)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = '#991B1B' }}
              onMouseLeave={e => e.currentTarget.style.background = ACCENT}
            >
              <Download size={12} /> {exporting ? 'Exporting…' : 'Download PDF'}
            </button>
            <button type="button" onClick={isFullscreen ? () => setIsFullscreen(false) : onClose}
              style={{
                width: 32, height: 32, borderRadius: 7,
                background: '#FFFFFF', color: SLATE_700, border: '1px solid ' + SLATE_200,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, lineHeight: 0,
                transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = SLATE_50; e.currentTarget.style.color = ACCENT; e.currentTarget.style.borderColor = ACCENT; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = SLATE_700; e.currentTarget.style.borderColor = SLATE_200; }}
              aria-label="Close">
              <X size={16} strokeWidth={2.5} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Body: sidebar + preview */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '220px 1fr' }}>
          <div style={{ borderRight: '1px solid ' + SLATE_200, background: SLATE_50, padding: '14px 16px', overflowY: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: SLATE_500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              File details
            </div>
            <MetaRow icon={<User size={12} />}     label="Faculty"          value={file.instructor_name} />
            <MetaRow icon={<BookOpen size={12} />} label="Course"           value={file.course_id + ' \u2014 ' + file.course_name} />
            <MetaRow icon={<Calendar size={12} />} label="Submitted"        value={fmtDate(file.submission_date)} />
            <MetaRow icon={<FileText size={12} />} label="Academic Period"  value={file.period_label} />
            <MetaRow icon={<FileText size={12} />} label="File name"        value={file.file_name} />
          </div>

          <div ref={paneRef} style={{ overflow: 'auto', background: SLATE_100, position: 'relative' }}>
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
