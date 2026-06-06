import React, { useState, useCallback } from 'react';
import { X, Download, FileText, User, Calendar, BookOpen, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'react-feather';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const ACCENT = '#B91C1C';
const SLATE_900 = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_300 = '#CBD5E1';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50 = '#F8FAFC';

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

const defaultExport = (file) => {
  const a = document.createElement('a');
  a.href = file.file_url;
  a.download = file.file_name || 'document';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

const PDFViewerModal = ({ file, kind, onClose, onExport, children }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(false);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onDocumentLoadSuccess = useCallback(({ numPages: pages }) => {
    setNumPages(pages);
    setPageNumber(1);
  }, []);

  const goToPrevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages || 1, p + 1));

  const zoomIn = () => setScale((s) => Math.min(MAX_ZOOM, +(s + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(MIN_ZOOM, +(s - ZOOM_STEP).toFixed(2)));

  if (!file) return null;

  const hasRealUrl = file.file_url && /^https?:\/\//i.test(file.file_url);
  const title = file.file_name || (kind || 'File') + ' Preview';

  const pageInputStyle = {
    width: 40, height: 28, textAlign: 'center', border: '1px solid ' + SLATE_300,
    borderRadius: 4, fontSize: 13, fontWeight: 500, color: SLATE_900,
    outline: 'none', background: '#FFFFFF',
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 100, backdropFilter: 'blur(2px)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(1080px, 94vw)', height: 'min(760px, 90vh)',
        background: '#FFFFFF', borderRadius: 14, zIndex: 101,
        boxShadow: '0 24px 60px rgba(15,23,42,0.30)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid ' + SLATE_200, gap: 16, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#FEE2E2', color: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileText size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: SLATE_500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {kind || 'Document'} {'\u00B7'} Approved
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: SLATE_900, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => (onExport || defaultExport)(file)}
              style={{
                height: 36, padding: '0 14px', borderRadius: 8,
                background: ACCENT, color: '#FFFFFF', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(185,28,28,0.20)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#991B1B'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT; }}
            >
              <Download size={13} /> Export
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: '#FFFFFF', color: SLATE_700, border: '1px solid ' + SLATE_200,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, lineHeight: 0,
                transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = SLATE_50; e.currentTarget.style.color = ACCENT; e.currentTarget.style.borderColor = ACCENT; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = SLATE_700; e.currentTarget.style.borderColor = SLATE_200; }}
              aria-label="Close"
              title="Close"
            >
              <X size={18} strokeWidth={2.5} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: showThumbnails ? '200px 260px 1fr' : '260px 1fr' }}>
          {/* Metadata sidebar */}
          <div style={{ borderRight: '1px solid ' + SLATE_200, background: SLATE_50, padding: '16px 18px', overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SLATE_500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              File details
            </div>
            <MetaRow icon={<User size={14} />}     label="Faculty"          value={file.instructor_name} />
            <MetaRow icon={<BookOpen size={14} />} label="Course"           value={file.course_id + ' \u2014 ' + file.course_name} />
            <MetaRow icon={<Calendar size={14} />} label="Submitted"        value={fmtDate(file.submission_date)} />
            <MetaRow icon={<FileText size={14} />} label="Academic Period"  value={file.period_label} />
            <MetaRow icon={<FileText size={14} />} label="File name"        value={file.file_name} />
          </div>

          {/* Preview pane */}
          <div style={{ background: SLATE_100, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {hasRealUrl ? (
              <>
                {/* Toolbar */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderBottom: '1px solid ' + SLATE_200,
                  background: '#FFFFFF', flexShrink: 0, gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={goToPrevPage} disabled={pageNumber <= 1}
                      style={{ width: 30, height: 28, border: '1px solid ' + SLATE_300, borderRadius: 4, background: '#FFF', cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pageNumber <= 1 ? 0.4 : 1 }}>
                      <ChevronLeft size={14} color={SLATE_700} />
                    </button>
                    <input
                      type="text"
                      value={pageNumber}
                      onChange={(e) => { const v = parseInt(e.target.value, 10); if (v >= 1 && v <= (numPages || 1)) setPageNumber(v); }}
                      style={pageInputStyle}
                    />
                    <span style={{ fontSize: 13, color: SLATE_500, fontWeight: 500 }}>/ {numPages || '—'}</span>
                    <button onClick={goToNextPage} disabled={pageNumber >= (numPages || 1)}
                      style={{ width: 30, height: 28, border: '1px solid ' + SLATE_300, borderRadius: 4, background: '#FFF', cursor: pageNumber >= (numPages || 1) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pageNumber >= (numPages || 1) ? 0.4 : 1 }}>
                      <ChevronRight size={14} color={SLATE_700} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={zoomOut} disabled={scale <= MIN_ZOOM}
                      style={{ width: 30, height: 28, border: '1px solid ' + SLATE_300, borderRadius: 4, background: '#FFF', cursor: scale <= MIN_ZOOM ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: scale <= MIN_ZOOM ? 0.4 : 1 }}>
                      <ZoomOut size={14} color={SLATE_700} />
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600, color: SLATE_700, minWidth: 44, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
                    <button onClick={zoomIn} disabled={scale >= MAX_ZOOM}
                      style={{ width: 30, height: 28, border: '1px solid ' + SLATE_300, borderRadius: 4, background: '#FFF', cursor: scale >= MAX_ZOOM ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: scale >= MAX_ZOOM ? 0.4 : 1 }}>
                      <ZoomIn size={14} color={SLATE_700} />
                    </button>
                  </div>
                </div>

                {/* PDF pages */}
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, gap: 12 }}>
                  <Document
                    file={file.file_url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(err) => console.error('PDF load error:', err)}
                    loading={
                      <div style={{ padding: 40, textAlign: 'center', color: SLATE_500, fontSize: 14 }}>
                        Loading PDF...
                      </div>
                    }
                    error={
                      <div style={{ padding: 40, textAlign: 'center', color: ACCENT, fontSize: 14 }}>
                        Failed to load PDF.
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div style={{ width: 400, height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SLATE_500, fontSize: 14 }}>
                          Loading page...
                        </div>
                      }
                    />
                  </Document>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 32, overflow: 'auto', boxSizing: 'border-box',
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
                      In-app document viewer \u2014 once the submission pipeline is wired,<br />
                      the approved {kind ? kind.toLowerCase() : 'document'} loads inline here.
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
