/**
 * The Program of Study parts of the Course Offerings upload preview — shown by
 * UploadPreviewFlow above (ProgramOfStudyFiles) and below (ProgramOfStudyReconcile)
 * the rows the server read out of the PDFs.
 *
 *   Files      each picked PDF with its year range and a View button. View opens
 *              the LOCAL file (URL.createObjectURL), so nothing is uploaded or kept
 *              before Confirm & Import; the URLs are revoked when the viewer closes.
 *   Summary    "27 courses · 77 units · 102 hrs/week" for the term's semester,
 *              per year below it, plus the checks the server worked out.
 *   Reconcile  "Not in the Program of Study": each existing course the PDF doesn't
 *              list for this semester, ticked Archive or Keep.
 *
 * Plain divs throughout: index.css turns every <table> into a flexbox, and the
 * syllabus stylesheets restyle every <section>.
 */
import React from 'react';
import { FileText, Eye, AlertTriangle, Info, Check, Archive } from 'react-feather';
import PDFViewerModal from './PDFViewerModal.jsx';
import { AiMark, AiTitle, AiChip, AI_TINT, AI_TINT_BORDER } from './AiScan.jsx';

const SLATE9 = '#0F172A';
const SLATE7 = '#334155';
const SLATE5 = '#64748B';
const SLATE3 = '#CBD5E1';
const SLATE2 = '#E2E8F0';
const SLATE05 = '#F8FAFC';
const AMBER_BG = '#FFFBEB';
const AMBER_BORDER = '#FDE68A';
const AMBER_TEXT = '#92400E';

const box = { margin: '12px 14px', padding: '12px 14px', borderRadius: 8, border: '1px solid ' + SLATE2, background: SLATE05, fontSize: 13, color: SLATE7, lineHeight: 1.5 };
const smallBtn = { display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid ' + SLATE3, background: '#FFFFFF', color: SLATE7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 };

/** Picked PDFs, matched to what the server read from each (by name). */
export const ProgramOfStudyFiles = ({ data, files }) => {
  const [viewing, setViewing] = React.useState(null); // { urls, index }
  const pos = data && data.programOfStudy;
  // Revoke the local URLs when the viewer closes or this preview goes away.
  React.useEffect(() => () => { if (viewing) viewing.urls.forEach((u) => URL.revokeObjectURL(u)); }, [viewing]);
  if (!pos) return null;
  const docs = pos.documents || [];
  const picked = Array.isArray(files) ? files : [];
  const ordered = docs.map((d) => ({ doc: d, file: picked.find((f) => f.name === d.name) })).filter((x) => x.file);

  const open = (index) => {
    const urls = ordered.map((x) => URL.createObjectURL(x.file));
    setViewing({ urls, index });
  };
  const s = pos.summary;
  const h = pos.header || {};

  return (
    <div>
      <div style={{ ...box, background: AI_TINT, border: '1px solid ' + AI_TINT_BORDER }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <AiMark size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <AiTitle size={15}>Program of Study Scan{h.program_name ? ' — ' + h.program_name : ''}</AiTitle>
              <AiChip>Read from the PDF</AiChip>
            </div>
            <div style={{ fontSize: 12.5, color: SLATE5 }}>
              {[h.revision && 'Rev ' + h.revision, h.cmo, h.effectivity && 'Effective ' + h.effectivity].filter(Boolean).join(' · ') || 'Units, hours and prerequisites were read from the PDF.'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ordered.map((x, i) => (
            <div key={x.doc.sha256} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <FileText size={15} color={SLATE5} style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: SLATE9, overflowWrap: 'anywhere', minWidth: 0 }}>{x.doc.name}</span>
              {x.doc.part_label && <span style={{ color: SLATE5 }}>· {x.doc.part_label}</span>}
              <button type="button" onClick={() => open(i)} style={smallBtn}><Eye size={13} /> View</button>
            </div>
          ))}
        </div>
        {(pos.notes || []).map((n) => (
          <div key={n} style={{ marginTop: 8, display: 'flex', gap: 6, color: AMBER_TEXT }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 3 }} /> {n}
          </div>
        ))}
      </div>

      {s && (
        <div style={{ ...box, background: '#FFFFFF' }}>
          <div style={{ fontSize: 14, color: SLATE9 }}>
            <strong>{pos.semesterLabel}:</strong> {s.courses} course{s.courses === 1 ? '' : 's'} · {s.units} units · {s.hrs} hrs/week
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {s.byYear.map((y) => (
              <span key={y.year} style={{ padding: '3px 10px', borderRadius: 9999, background: SLATE05, border: '1px solid ' + SLATE2, fontSize: 12.5 }}>
                {y.label} <strong style={{ color: SLATE9 }}>{y.courses}</strong> course{y.courses === 1 ? '' : 's'} · {y.units} units · {y.hrs} hrs/wk
              </span>
            ))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
            {pos.checks.semesters.length === 0 ? (
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: '#047857' }}><Check size={14} /> Every semester's rows add up to its Total row.</span>
            ) : pos.checks.semesters.map((x) => (
              <span key={x.label} style={{ display: 'inline-flex', gap: 6, color: AMBER_TEXT }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {x.label}: {x.issues.join(' ')}</span>
            ))}
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: pos.checks.program.ok === false ? AMBER_TEXT : (pos.checks.program.ok ? '#047857' : SLATE5) }}>
              {pos.checks.program.ok ? <Check size={14} /> : <Info size={14} />} {pos.checks.program.message}
            </span>
            <span style={{ color: SLATE5 }}>
              Units and hours are worked out from LEC, LAB and Hrs/Week (18-week semester). A row with a note has a warning in the Issue column.
            </span>
          </div>
        </div>
      )}

      {viewing && (
        <PDFViewerModal
          file={{ file_name: 'Program of Study — not imported yet', documents: ordered.map((x, i) => ({ label: x.doc.part_label || x.doc.name, url: viewing.urls[i] })) }}
          eyebrow="Preview · nothing is saved yet"
          details={[
            { label: 'Program', value: h.program_name },
            { label: 'Revision', value: h.revision ? 'Rev ' + h.revision : null },
            { label: 'CMO', value: h.cmo },
            { label: 'Effectivity', value: h.effectivity },
            { label: 'Files', value: ordered.map((x) => x.doc.name).join('\n') },
          ]}
          initialTab={viewing.index}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
};

/** "Not in the Program of Study" — Archive / Keep per existing course. */
export const ProgramOfStudyReconcile = ({ data, decisions, onDecide }) => {
  const pos = data && data.programOfStudy;
  if (!pos) return null;
  const list = pos.reconcile || [];
  const decisionOf = (r) => (decisions && decisions[r.course_id]) || r.decision;
  return (
    <div style={{ ...box, background: '#FFFFFF' }}>
      <div style={{ fontWeight: 700, color: SLATE9 }}>Not in the Program of Study ({list.length})</div>
      <div style={{ fontSize: 12.5, color: SLATE5, marginTop: 2 }}>
        {list.length === 0
          ? 'Every active course of this program in this term is in the Program of Study.'
          : 'Courses already in this term that the PDF doesn\'t list for ' + pos.semesterLabel + '. Archived ones move to View Archived (restorable, and Undo brings them back); a duplicate\'s assignments and consultant links move to the course it duplicates first.'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
        {list.map((r) => {
          const d = decisionOf(r);
          const links = [
            r.links.assignments && r.links.assignments + ' assignment' + (r.links.assignments === 1 ? '' : 's'),
            r.links.consultants && r.links.consultants + ' consultant link' + (r.links.consultants === 1 ? '' : 's'),
          ].filter(Boolean);
          return (
            <div key={r.course_id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid ' + SLATE2 }}>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div><strong style={{ color: SLATE9 }}>{r.course_no}</strong> <span style={{ color: SLATE7 }}>— {r.course_title}</span></div>
                <div style={{ fontSize: 12, color: r.kind === 'unknown' ? AMBER_TEXT : SLATE5 }}>
                  {r.reason}
                  {links.length > 0 && ' · ' + links.join(', ') + (d === 'archive' && r.kind === 'duplicate' ? ' will move to ' + r.match_code : '')}
                </div>
              </div>
              <div role="radiogroup" aria-label={'What to do with ' + r.course_no} style={{ display: 'inline-flex', border: '1px solid ' + SLATE3, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                {[['archive', 'Archive'], ['keep', 'Keep']].map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={d === k} onClick={() => onDecide(r.course_id, k)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: d === k ? '#18191A' : '#FFFFFF', color: d === k ? '#FFFFFF' : SLATE7 }}>
                    {k === 'archive' && <Archive size={12} />} {label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
