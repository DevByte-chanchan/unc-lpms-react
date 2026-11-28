/**
 * "Fill from school calendar" — the VPAA uploads the official academic calendar
 * (a picture or a PDF) and the term form's dates are filled from it, after a
 * review. Nothing is saved here: the form's own Save does that.
 *
 *   <SchoolCalendarFill schoolYear="2026-2027" semester="2" purpose="create"
 *     onApply={(values) => …} />          values: { start_date: 'YYYY-MM-DD', … } (found fields only)
 *
 * When the school year already has a kept calendar, the button reads "Fill from
 * the 2026-2027 calendar" and needs no upload; "Upload a different one" replaces it.
 *
 * Also here:
 *   SchoolCalendarReview  the review dialog: the calendar on the left (zoomable,
 *                         this semester's block outlined), the seven dates on the right
 *   SchoolCalendarLink    "View school calendar" for the term card
 */
import React from 'react';
import { Upload, Loader, AlertTriangle, X, ZoomIn, ChevronDown, ChevronRight, FileText } from 'react-feather';
import DialogShell from './DialogShell.jsx';
import { AiMark, AiTitle, AiChip, AiButton, AiOutlineButton, Sparkle } from './AiScan.jsx';
import PDFViewerModal from './PDFViewerModal.jsx';
import useDialogFocus from '../utils/useDialogFocus.js';
import { loadPdfjs } from '../utils/pdfjs.js';
import { SchoolCalendarsAPI } from '../services/api.js';
import { calendarOrderIssue } from '../services/schoolCalendar.js';

const ACCENT = '#18191A';
const SLATE_900 = '#0F172A';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const SLATE_400 = '#94A3B8';
const SLATE_200 = '#E2E8F0';
const SLATE_100 = '#F1F5F9';
const SLATE_50 = '#F8FAFC';
const AMBER_BG = '#FFFBEB';
const AMBER_BORDER = '#FDE68A';
const AMBER_TEXT = '#92400E';

const FIELDS = [
  ['start_date', 'Start of Semester'],
  ['end_date', 'End of Semester'],
  ['classes_start', 'Start of classes'],
  ['prelim_exam', 'Prelim exam'],
  ['midterm_exam', 'Midterm exam'],
  ['semifinal_exam', 'Semi-final exam'],
  ['final_exam', 'Final exam'],
];
const SEMESTER_NAMES = { '1st': 'First Semester', '2nd': 'Second Semester', Summer: 'Summer' };
const SOURCE_NAMES = { pdf: 'Read from the PDF text', ocr: 'Scanned by OCR', ai: 'Scanned by AI' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
/** '2026-09-25' → 'Sept 25, 2026' */
const calDay = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  return m ? MONTHS[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1] : '';
};
const shortDay = (ymd) => calDay(ymd).replace(/, \d{4}$/, '');

const ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf';
const MAX_BYTES = 10 * 1024 * 1024;
const TYPE_MESSAGE = 'Upload a PNG, JPG or WEBP picture, or a PDF, of the school calendar.';

/** A problem with the file before it is sent, or null. */
function fileProblem(file) {
  if (!file) return TYPE_MESSAGE;
  if (!/\.(png|jpe?g|webp|pdf)$/i.test(file.name || '')) return TYPE_MESSAGE;
  if (file.size > MAX_BYTES) return 'That file is larger than 10 MB.';
  if (file.size === 0) return 'That file is empty.';
  return null;
}

const isPdf = (cal, file) => (file ? /\.pdf$/i.test(file.name) || file.type === 'application/pdf' : cal && cal.mime === 'application/pdf');

// ───────────────────────────── the button ─────────────────────────────

export default function SchoolCalendarFill({ schoolYear, semester, purpose = 'create', disabled, onApply }) {
  const inputRef = React.useRef(null);
  const [kept, setKept] = React.useState(null); // the year's kept calendar (summary)
  const [busy, setBusy] = React.useState(false);
  const [slow, setSlow] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [review, setReview] = React.useState(null); // { data, preview: { kind, url, local } }
  // Set on every mount (StrictMode mounts twice), cleared on unmount.
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // Is there a calendar for this school year already?
  React.useEffect(() => {
    let off = false;
    setKept(null);
    if (!/^\d{4}-\d{4}$/.test(String(schoolYear || ''))) return undefined;
    SchoolCalendarsAPI.latest(schoolYear)
      .then((r) => { if (!off) setKept(r && r.calendar ? r.calendar : null); })
      .catch(() => { if (!off) setKept(null); });
    return () => { off = true; };
  }, [schoolYear]);

  // "This can take a few seconds" once reading has gone on for 5 s.
  React.useEffect(() => {
    if (!busy) { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, [busy]);

  // Free a local preview URL when the review closes.
  const closeReview = React.useCallback(() => {
    setReview((r) => {
      if (r && r.preview && r.preview.local) URL.revokeObjectURL(r.preview.url);
      return null;
    });
  }, []);

  const show = (data, file) => {
    if (data.message) { setError(data.message); return; }
    const preview = file
      ? { kind: isPdf(null, file) ? 'pdf' : 'image', url: URL.createObjectURL(file), local: true }
      : { kind: isPdf(data) ? 'pdf' : 'image', url: SchoolCalendarsAPI.fileUrl(data), local: false };
    setReview({ data, preview });
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const problem = fileProblem(file);
    if (problem) { setError(problem); return; }
    setError(null);
    setBusy(true);
    try {
      const data = await SchoolCalendarsAPI.upload(file, { semester, school_year: schoolYear, purpose });
      if (!alive.current) return;
      setKept(data);
      show(data, file);
    } catch (err) {
      if (alive.current) setError(err.message || "Couldn't read the calendar.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const fromKept = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await SchoolCalendarsAPI.latest(schoolYear, { semester, purpose });
      if (!alive.current) return;
      if (!r || !r.calendar) { setKept(null); inputRef.current && inputRef.current.click(); return; }
      show(r.calendar, null);
    } catch (err) {
      if (alive.current) setError(err.message || "Couldn't open the calendar.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const pick = () => { setError(null); if (inputRef.current) inputRef.current.click(); };
  const label = kept && kept.school_year ? 'Fill from the ' + kept.school_year + ' calendar' : 'Fill from school calendar';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={onFile} style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <AiOutlineButton
          onClick={kept ? fromKept : pick}
          disabled={disabled || busy}
          aria-busy={busy}
          icon={busy ? <Loader size={14} className="calSpin" aria-hidden="true" /> : (kept ? <Sparkle size={14} /> : <Upload size={14} aria-hidden="true" />)}
        >
          {busy ? 'Scanning the calendar…' : label}
        </AiOutlineButton>
        {kept && !busy && (
          <button type="button" onClick={pick} disabled={disabled}
            style={{ padding: 0, border: 'none', background: 'transparent', font: 'inherit', fontSize: 12.5, fontWeight: 500, color: SLATE_600, textDecoration: 'underline', cursor: 'pointer' }}>
            Upload a different one
          </button>
        )}
      </div>
      <div aria-live="polite" style={{ fontSize: 12, color: SLATE_500, lineHeight: 1.45 }}>
        {busy && slow
          ? 'This can take a few seconds.'
          : kept
            ? 'Uses the calendar uploaded for ' + kept.school_year + '. You can check every date before saving.'
            : 'Upload the official calendar (picture or PDF) and the system scans the dates for you. You can check every date before saving.'}
      </div>
      {error && (
        <div role="alert" style={{ fontSize: 12.5, color: ACCENT, background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '8px 10px', borderRadius: 10, display: 'inline-flex', alignItems: 'flex-start', gap: 6, maxWidth: '100%' }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" /> <span>{error}</span>
        </div>
      )}
      <SchoolCalendarReview
        open={!!review}
        data={review && review.data}
        preview={review && review.preview}
        onCancel={closeReview}
        onUse={(values) => { onApply(values); closeReview(); }}
      />
    </div>
  );
}

// ───────────────────────────── the calendar picture ─────────────────────────────

/** Page 1 of a PDF drawn into a canvas (twice the display size, for the 2× zoom). */
function PdfPage({ url, onReady }) {
  const ref = React.useRef(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let off = false;
    let doc = null;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        doc = await pdfjs.getDocument({ url, withCredentials: true, isEvalSupported: false }).promise;
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 2400 / base.width });
        const canvas = ref.current;
        if (off || !canvas) return;
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        if (!off && onReady) onReady();
      } catch {
        if (!off) setFailed(true);
      }
    })();
    return () => { off = true; if (doc) doc.destroy(); };
  }, [url, onReady]);
  if (failed) return <div style={{ padding: 24, fontSize: 13, color: SLATE_500 }}>The PDF can&apos;t be shown here.</div>;
  return <canvas ref={ref} aria-label="School calendar, page 1" style={{ display: 'block', width: '100%', height: 'auto' }} />;
}

/**
 * The calendar, fitted to its pane. Click to zoom 2× at that point, click again
 * to fit; drag to pan while zoomed. `bbox` (0–1 of the picture) outlines this
 * semester's block.
 */
function CalendarPreview({ preview, bbox, label }) {
  const paneRef = React.useRef(null);
  const [zoom, setZoom] = React.useState(1);
  // The pane keeps its fitted height while zoomed, so zooming in scrolls inside the
  // pane instead of making the picture (and the whole dialog) twice as tall.
  const [lockedHeight, setLockedHeight] = React.useState(null);
  const drag = React.useRef(null);

  const toggleAt = (clientX, clientY) => {
    const pane = paneRef.current;
    if (!pane) return;
    const r = pane.getBoundingClientRect();
    const fx = (clientX - r.left + pane.scrollLeft) / pane.scrollWidth;
    const fy = (clientY - r.top + pane.scrollTop) / pane.scrollHeight;
    const next = zoom === 1 ? 2 : 1;
    setLockedHeight(next === 2 ? pane.clientHeight : null);
    setZoom(next);
    requestAnimationFrame(() => {
      if (!paneRef.current) return;
      const p = paneRef.current;
      p.scrollLeft = fx * p.scrollWidth - (clientX - r.left);
      p.scrollTop = fy * p.scrollHeight - (clientY - r.top);
    });
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 || !paneRef.current) return;
    drag.current = { x: e.clientX, y: e.clientY, left: paneRef.current.scrollLeft, top: paneRef.current.scrollTop, moved: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || zoom === 1) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (d.moved && paneRef.current) {
      paneRef.current.scrollLeft = d.left - dx;
      paneRef.current.scrollTop = d.top - dy;
    }
  };
  // A drag that moved is not a click: remember it until the click event that follows.
  const dragged = React.useRef(false);
  const onPointerUp = () => {
    dragged.current = !!(drag.current && drag.current.moved);
    drag.current = null;
  };
  const onClick = (e) => {
    if (dragged.current) { dragged.current = false; return; }
    const pane = paneRef.current;
    if (!pane) return;
    const r = pane.getBoundingClientRect();
    // A click from the keyboard or a screen reader has no position: zoom at the centre.
    const at = e.detail === 0 || (!e.clientX && !e.clientY) ? [r.left + r.width / 2, r.top + r.height / 2] : [e.clientX, e.clientY];
    toggleAt(at[0], at[1]);
  };
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div
        ref={paneRef}
        role="button"
        tabIndex={0}
        aria-label={(zoom === 1 ? 'Zoom in on ' : 'Zoom out of ') + label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { drag.current = null; }}
        onClick={onClick}
        onKeyDown={onKeyDown}
        style={{
          flex: lockedHeight ? '0 0 auto' : 1, minHeight: 0, overflow: 'auto', borderRadius: 10, background: SLATE_100,
          height: lockedHeight ? lockedHeight + 'px' : undefined, maxHeight: lockedHeight ? undefined : '70vh',
          // The outline's dim (a huge box-shadow) must stay inside the pane.
          position: 'relative', isolation: 'isolate',
          // Fitted, the picture sits in the middle; zoomed, it scrolls from its corner.
          display: zoom === 1 ? 'flex' : 'block', alignItems: 'center',
          border: '1px solid ' + SLATE_200, cursor: zoom === 1 ? 'zoom-in' : 'grab', touchAction: zoom === 1 ? 'auto' : 'none',
          outlineOffset: 2,
        }}
      >
        <div style={{ position: 'relative', width: zoom * 100 + '%', margin: zoom === 1 ? '0 auto' : 0, userSelect: 'none' }}>
          {preview.kind === 'pdf'
            ? <PdfPage url={preview.url} />
            : <img src={preview.url} alt={label} draggable={false} style={{ display: 'block', width: '100%', height: 'auto' }} />}
          {bbox && (
            <div aria-hidden="true" style={{
              position: 'absolute', left: bbox.x * 100 + '%', top: bbox.y * 100 + '%', width: bbox.w * 100 + '%', height: bbox.h * 100 + '%',
              border: '2px solid #2563EB', borderRadius: 4, boxShadow: '0 0 0 9999px rgba(15,23,42,0.28)', pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 11.5, color: SLATE_500, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ZoomIn size={12} aria-hidden="true" /> {zoom === 1 ? 'Click to zoom in.' : 'Drag to move around; click to zoom out.'}
        {bbox ? ' This semester is outlined.' : ''}
      </div>
    </div>
  );
}

// ───────────────────────────── the review dialog ─────────────────────────────

export function SchoolCalendarReview({ open, data, preview, onCancel, onUse }) {
  const boxRef = React.useRef(null);
  const [values, setValues] = React.useState({});
  const [showEvents, setShowEvents] = React.useState(false);
  useDialogFocus(boxRef, open);

  React.useEffect(() => {
    if (!open || !data) return;
    setValues({ ...(data.fields || {}) });
    setShowEvents(false);
  }, [open, data]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  const d = data || {};
  const sources = d.sources || {};
  const alternatives = d.alternatives || {};
  const notInCalendar = new Set(d.notInCalendar || []);
  const order = calendarOrderIssue(values);
  const warnings = (d.warnings || []).filter((w) => !/must be on or after/.test(w));
  const semName = d.block ? SEMESTER_NAMES[d.block.key] || '' : '';
  const label = (semName ? semName + ' ' : '') + 'school calendar';
  const filled = Object.values(values).filter(Boolean).length;

  return (
    <DialogShell
      open={open}
      onBackdropClick={onCancel}
      ariaLabel="Check the dates read from the school calendar"
      panelStyle={{ width: 1120, maxWidth: '96vw', height: '88vh', maxHeight: 820, background: '#FFFFFF', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', overflow: 'hidden' }}
    >
      {data && preview && (
        <div ref={boxRef} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid ' + SLATE_200, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <AiMark />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <AiTitle>Calendar Scan · Check the dates</AiTitle>
                {d.source && SOURCE_NAMES[d.source] && <AiChip>{SOURCE_NAMES[d.source]}</AiChip>}
              </div>
              <div style={{ fontSize: 13, color: SLATE_500, marginTop: 2, overflowWrap: 'anywhere' }}>
                {[semName && semName + (d.block && d.block.schoolYear ? ' · SY ' + d.block.schoolYear : ''), d.original_name].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button type="button" onClick={onCancel} aria-label="Close" title="Close"
              style={{ border: 'none', background: 'transparent', color: SLATE_500, cursor: 'pointer', padding: 4, borderRadius: 8, display: 'inline-flex' }}>
              <X size={18} />
            </button>
          </div>

          {(warnings.length > 0 || order) && (
            <div role="note" style={{ margin: '12px 20px 0', padding: '8px 12px', borderRadius: 10, background: AMBER_BG, border: '1px solid ' + AMBER_BORDER, color: AMBER_TEXT, fontSize: 12.5, lineHeight: 1.45, display: 'flex', gap: 8 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <div>
                {warnings.map((w) => <div key={w}>{w}</div>)}
                {order && <div>{order.message}</div>}
              </div>
            </div>
          )}

          <div className="calReviewBody" style={{ flex: 1, minHeight: 0, display: 'flex', gap: 18, padding: '12px 20px', overflow: 'auto', flexWrap: 'wrap' }}>
            <div style={{ flex: '1.3 1 380px', minWidth: 0, minHeight: 320, display: 'flex', flexDirection: 'column' }}>
              <CalendarPreview preview={preview} bbox={d.block && d.block.bbox} label={label} />
            </div>

            <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {FIELDS.map(([key, name]) => {
                const v = values[key] || '';
                const src = sources[key];
                const alts = alternatives[key];
                const changed = v !== ((d.fields || {})[key] || '');
                const badOrder = order && order.key === key;
                return (
                  <div key={key} style={{ padding: '8px 0', borderBottom: '1px solid ' + SLATE_100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <label htmlFor={'cal-' + key} style={{ flex: '1 1 120px', fontSize: 13, fontWeight: 600, color: SLATE_700 }}>{name}</label>
                      {!v && !notInCalendar.has(key) && (
                        <span style={{ padding: '1px 8px', borderRadius: 9999, background: AMBER_BG, border: '1px solid ' + AMBER_BORDER, color: AMBER_TEXT, fontSize: 11, fontWeight: 600 }}>Not found</span>
                      )}
                      {!v && notInCalendar.has(key) && (
                        <span style={{ fontSize: 11.5, color: SLATE_400 }}>None in this calendar</span>
                      )}
                      <input
                        id={'cal-' + key}
                        type="date"
                        value={v}
                        onChange={(e) => setValues((x) => ({ ...x, [key]: e.target.value }))}
                        aria-describedby={'cal-src-' + key}
                        style={{
                          height: 32, padding: '0 8px', borderRadius: 8, fontSize: 13, color: SLATE_900,
                          border: '1px solid ' + (badOrder ? ACCENT : SLATE_200), background: v ? '#FFFFFF' : SLATE_50, colorScheme: 'light',
                        }}
                      />
                    </div>
                    <div id={'cal-src-' + key} style={{ marginTop: 3, fontSize: 12, color: SLATE_500, lineHeight: 1.4, overflowWrap: 'anywhere' }}>
                      {v ? <strong style={{ color: SLATE_900, fontWeight: 600 }}>{calDay(v)}</strong> : null}
                      {v && (src || changed) ? <span> · </span> : null}
                      {changed ? <span>changed here</span> : src ? <span>{src.text}</span> : null}
                      {!v && !notInCalendar.has(key) ? <span>Not found in the calendar. Type it from the picture, or leave it for later.</span> : null}
                    </div>
                    {alts && alts.length > 1 && (
                      <div role="radiogroup" aria-label={name + ': which one'} style={{ marginTop: 6, display: 'inline-flex', border: '1px solid ' + SLATE_200, borderRadius: 9999, padding: 2, gap: 2, flexWrap: 'wrap' }}>
                        {alts.map((a) => {
                          const on = v === a.value;
                          return (
                            <button key={a.value + (a.label || '')} type="button" role="radio" aria-checked={on}
                              onClick={() => setValues((x) => ({ ...x, [key]: a.value }))}
                              title={a.text}
                              style={{
                                border: 'none', borderRadius: 9999, padding: '3px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                background: on ? SLATE_900 : 'transparent', color: on ? '#FFFFFF' : SLATE_600,
                              }}>
                              {(a.label ? a.label + ' · ' : '') + shortDay(a.value)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {(d.events || []).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => setShowEvents((s) => !s)} aria-expanded={showEvents}
                    style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: 13, fontWeight: 600, color: SLATE_700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {showEvents ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Other dates in this semester ({d.events.length})
                  </button>
                  {showEvents && (
                    <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>
                      {d.events.map((e, i) => (
                        <li key={i} style={{ display: 'flex', gap: 10, padding: '4px 0', fontSize: 12.5, color: SLATE_600, borderBottom: '1px dashed ' + SLATE_100 }}>
                          <span style={{ flex: '0 0 118px', color: SLATE_900, fontWeight: 500 }}>
                            {e.date ? shortDay(e.date) + (e.end ? ' – ' + shortDay(e.end) : '') : e.dateText || '—'}
                          </span>
                          <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{e.event}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: '1px solid ' + SLATE_200, flexWrap: 'wrap' }}>
            <span style={{ marginRight: 'auto', fontSize: 12, color: SLATE_500 }}>
              Nothing is saved until you press Save on the form.
            </span>
            <button type="button" onClick={onCancel}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 14px', fontSize: 14, fontWeight: 500, color: SLATE_500 }}>
              Cancel
            </button>
            <AiButton disabled={filled === 0}
              onClick={() => onUse(Object.fromEntries(Object.entries(values).filter(([, x]) => x)))}>
              Use these dates
            </AiButton>
          </div>
        </div>
      )}
    </DialogShell>
  );
}

// ───────────────────────────── term card link ─────────────────────────────

/** A picture calendar in a dialog: fitted, click to zoom. */
function ImageViewer({ cal, onClose }) {
  const boxRef = React.useRef(null);
  useDialogFocus(boxRef, true);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <DialogShell open onBackdropClick={onClose} ariaLabel={'School calendar ' + (cal.school_year || '')}
      panelStyle={{ width: 1100, maxWidth: '96vw', height: '86vh', background: '#FFFFFF', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
      <div ref={boxRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid ' + SLATE_200, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: SLATE_900 }}>School calendar {cal.school_year}</div>
            <div style={{ fontSize: 12.5, color: SLATE_500, overflowWrap: 'anywhere' }}>{cal.original_name}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" title="Close"
            style={{ border: 'none', background: 'transparent', color: SLATE_500, cursor: 'pointer', padding: 4, borderRadius: 8, display: 'inline-flex' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 14 }}>
          <CalendarPreview preview={{ kind: 'image', url: SchoolCalendarsAPI.fileUrl(cal) }} bbox={null} label={'school calendar ' + (cal.school_year || '')} />
        </div>
      </div>
    </DialogShell>
  );
}

/** "View school calendar" — shown only when a calendar is kept for the school year. */
export function SchoolCalendarLink({ schoolYear }) {
  const [cal, setCal] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    let off = false;
    setCal(null);
    if (!/^\d{4}-\d{4}$/.test(String(schoolYear || ''))) return undefined;
    SchoolCalendarsAPI.latest(schoolYear)
      .then((r) => { if (!off) setCal(r && r.calendar ? r.calendar : null); })
      .catch(() => {});
    return () => { off = true; };
  }, [schoolYear]);
  if (!cal) return null;
  const pdf = cal.mime === 'application/pdf';
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        style={{ marginTop: 6, padding: 0, border: 'none', background: 'transparent', font: 'inherit', fontSize: 13, fontWeight: 600, color: SLATE_900, textDecoration: 'underline', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <FileText size={13} aria-hidden="true" /> View school calendar
      </button>
      {open && pdf && (
        <PDFViewerModal
          file={{ file_name: cal.original_name, file_url: SchoolCalendarsAPI.fileUrl(cal) }}
          eyebrow={'School calendar · ' + (cal.school_year || '')}
          onClose={() => setOpen(false)}
        />
      )}
      {open && !pdf && <ImageViewer cal={cal} onClose={() => setOpen(false)} />}
    </>
  );
}
