/**
 * The kept Program of Study PDFs, wherever someone needs to read them.
 *
 * (Loading: useProgramOfStudy in services/programOfStudy.js.)
 *
 *   <ProgramOfStudyChip>   the Course Offerings header line:
 *                          "Program of Study · Rev 04 · CMO No. 25 S. 2015 · Effective … · View"
 *   <ProgramOfStudyLink>   "View Program of Study" (Dean's Programs, the instructor's course page)
 *   <ProgramOfStudyViewer> PDFViewerModal with one tab per part, Download, and Previous versions
 *
 * The files load straight from the API (same session cookie), so nothing is
 * downloaded or copied just to look at them.
 */
import React from 'react';
import { FileText, ChevronDown, Clock } from 'react-feather';
import PDFViewerModal from './PDFViewerModal.jsx';
import { CurriculumDocumentsAPI } from '../services/api.js';
import { useProgramOfStudy, shortEffectivity } from '../services/programOfStudy.js';

const SLATE9 = '#0F172A';
const SLATE7 = '#334155';
const SLATE5 = '#64748B';
const SLATE3 = '#CBD5E1';
const SLATE2 = '#E2E8F0';
const SLATE05 = '#F8FAFC';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (s) => {
  const d = s ? new Date(s) : null;
  return d && !Number.isNaN(d.getTime()) ? MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() : '';
};

/** The viewer's tab list for a set of documents. `page` adds #page=N to the iframe URL. */
const tabsFor = (docs, page) => docs.map((d) => ({
  label: d.part_label || d.original_name,
  url: CurriculumDocumentsAPI.fileUrl(d, { page }),
  downloadUrl: CurriculumDocumentsAPI.fileUrl(d, { download: true }),
}));

/** Superseded files grouped by the import that brought them in, newest first. */
const versionsOf = (previous) => {
  const groups = new Map();
  for (const d of previous || []) {
    const k = d.import_batch_id ? 'b' + d.import_batch_id : 'd' + d.id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(d);
  }
  return [...groups.values()].map((docs) => docs.sort((a, b) => (a.years_covered[0] || 9) - (b.years_covered[0] || 9)));
};

export const ProgramOfStudyViewer = ({ data, onClose, initialPart = null, page }) => {
  const [version, setVersion] = React.useState(null); // null = current; else an array of docs
  const [menuOpen, setMenuOpen] = React.useState(false);
  const docs = version || (data && data.active) || [];
  const versions = versionsOf(data && data.previous);
  const first = docs[0] || {};
  const initialTab = initialPart ? Math.max(0, docs.findIndex((d) => d.part_label === initialPart)) : 0;
  if (!docs.length) return null;

  const record = {
    file_name: 'Program of Study' + (first.revision ? ' · Rev ' + first.revision : '') + (first.program_name ? ' — ' + first.program_name : ''),
    documents: tabsFor(docs, page),
  };
  const details = [
    { label: 'Program', value: first.program_name },
    { label: 'Revision', value: first.revision ? 'Rev ' + first.revision + (version ? ' (previous version)' : '') : null },
    { label: 'CMO', value: first.cmo },
    { label: 'Effectivity', value: first.effectivity },
    { label: 'Uploaded', value: [shortDate(first.created_at), first.uploaded_by_name].filter(Boolean).join(' · ') },
    { label: 'Files', value: docs.map((d) => (d.part_label ? d.part_label + ': ' : '') + d.original_name).join('\n') },
  ];
  const actions = versions.length > 0 ? (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid ' + SLATE2, background: '#FFFFFF', color: SLATE7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <Clock size={14} /> {version ? 'Previous version' : 'Previous versions'} <ChevronDown size={14} />
      </button>
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
          <div role="menu" style={{ position: 'absolute', right: 0, top: '110%', zIndex: 2, minWidth: 260, background: '#FFFFFF', border: '1px solid ' + SLATE2, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6 }}>
            <button type="button" role="menuitem" onClick={() => { setVersion(null); setMenuOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', borderRadius: 6, background: version ? 'transparent' : SLATE05, cursor: 'pointer', fontSize: 13, color: SLATE9, fontWeight: 600 }}>
              Current{data.active[0] && data.active[0].revision ? ' · Rev ' + data.active[0].revision : ''}
            </button>
            {versions.map((v) => (
              <button key={v[0].id} type="button" role="menuitem" onClick={() => { setVersion(v); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', borderRadius: 6, background: version === v ? SLATE05 : 'transparent', cursor: 'pointer', fontSize: 13, color: SLATE7 }}>
                <strong style={{ color: SLATE9 }}>{v[0].revision ? 'Rev ' + v[0].revision : 'Earlier upload'}</strong>
                {' · '}{shortDate(v[0].created_at)}
                <div style={{ fontSize: 12, color: SLATE5 }}>{v.map((d) => d.part_label || d.original_name).join(', ')}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  ) : null;

  return (
    <PDFViewerModal
      file={record}
      eyebrow={version ? 'Program of Study · previous version' : 'Program of Study'}
      details={details}
      actions={actions}
      initialTab={version ? 0 : initialTab}
      onClose={onClose}
    />
  );
};

const chipStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: '100%',
  padding: '6px 12px', borderRadius: 9999, background: SLATE05, border: '1px solid ' + SLATE2,
  fontSize: 12.5, color: SLATE7, lineHeight: 1.4,
};
const linkStyle = { padding: 0, border: 'none', background: 'transparent', font: 'inherit', fontWeight: 700, color: SLATE9, textDecoration: 'underline', cursor: 'pointer' };

/** The header line on Course Offerings. `onUpload` points an empty state at the upload button. */
export const ProgramOfStudyChip = ({ state, onView, onUpload }) => {
  const { data, loading } = state;
  if (loading && !data) return null;
  const doc = data && data.active && data.active[0];
  if (!doc) {
    return (
      <div style={{ ...chipStyle, background: '#FFFFFF', borderStyle: 'dashed', borderColor: SLATE3 }}>
        <FileText size={13} color={SLATE5} />
        <span>No Program of Study uploaded yet</span>
        {onUpload && <>· <button type="button" onClick={onUpload} style={linkStyle}>Upload it</button></>}
      </div>
    );
  }
  const parts = [
    doc.revision ? 'Rev ' + doc.revision : null,
    doc.cmo,
    doc.effectivity ? 'Effective ' + shortEffectivity(doc.effectivity) : null,
  ].filter(Boolean);
  return (
    <div style={chipStyle}>
      <FileText size={13} color={SLATE5} />
      <strong style={{ color: SLATE9 }}>Program of Study</strong>
      {parts.map((p) => <span key={p}>· {p}</span>)}
      <span>·</span>
      <button type="button" onClick={onView} style={linkStyle}>View</button>
    </div>
  );
};

/** "View Program of Study" for one program, or for the program that offers a course. */
export const ProgramOfStudyLink = ({ programId, courseCode, periodId, style }) => {
  const [open, setOpen] = React.useState(false);
  const state = useProgramOfStudy({ programId, courseCode, periodId });
  const has = !!(state.data && state.data.active && state.data.active.length);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={!has}
        title={has ? undefined : (state.loading ? 'Loading…' : 'No Program of Study uploaded yet')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'transparent', font: 'inherit', fontSize: 13, fontWeight: 600, color: has ? SLATE9 : SLATE5, textDecoration: has ? 'underline' : 'none', cursor: has ? 'pointer' : 'default', ...style }}>
        <FileText size={14} /> {has ? 'View Program of Study' : 'No Program of Study yet'}
      </button>
      {open && has && <ProgramOfStudyViewer data={state.data} onClose={() => setOpen(false)} />}
    </>
  );
};
