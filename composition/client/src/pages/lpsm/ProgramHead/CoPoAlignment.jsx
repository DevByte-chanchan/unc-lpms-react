import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildCoPoHtml } from '../../../utils/syllabusPdfHtml.js';
import { fetchJson, apiErrorMessage } from '../../../utils/api.js';
import { computeOverallStatus } from '../../../utils/assignmentStatus.js';
import { revisionLabel, termLabel } from '../../../utils/offeringLabels.js';
import unclogo from '../../../assets/unclogo.png';
import tbl from '../../../styles/AlignmentTables.module.sass';
import TableScrollRegion from '../../../components/TableScrollRegion.jsx';
import pageStyles from '../../../styles/ProgramHeadWorkspace.module.sass';
import styles from '../../../styles/PoPeoAlignment.module.sass';

// Instructors often type "CO1:" at the start of the outcome; the table numbers them itself.
const withoutNumber = (text) => String(text || '').replace(/^\s*CO\s*\d+\s*[:.-]\s*/i, '');

// One offering per option: the course, its term and its revision, so two revisions of a course
// can be told apart. The outcomes and their PO marks come from the instructor's syllabus.
const describe = (row) => {
  const offering = row.ProgramCourseOffering || {};
  const course = offering.Course || {};
  const parts = [termLabel(offering), revisionLabel(offering)].filter(Boolean);
  return {
    id: String(offering.pc_offering_id),
    code: course.course_no || '',
    name: course.course_title || '',
    status: computeOverallStatus(row),
    label: `${course.course_no || '?'} — ${course.course_title || ''}${parts.length ? ` (${parts.join(', ')})` : ''}`
  };
};

const CoPoAlignment = () => {
  const [offerings, setOfferings] = useState(null);
  const [offeringId, setOfferingId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    let live = true;
    fetchJson('/api/assignments?limit=500')
      .then(response => {
        if (!live) return;
        const rows = Array.isArray(response) ? response : (response.data || []);
        const list = rows.filter(row => row.ProgramCourseOffering?.pc_offering_id).map(describe)
          .sort((a, b) => a.code.localeCompare(b.code) || a.label.localeCompare(b.label));
        setOfferings(list);
        if (list.length > 0) setOfferingId(list[0].id);
      })
      .catch(err => { if (live) { setOfferings([]); setError(apiErrorMessage(err, 'Could not load your courses.')); } });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!offeringId) return undefined;
    let live = true;
    setData(null);
    setError('');
    fetchJson(`/api/course-outcome-alignment/${offeringId}`)
      .then(result => { if (live) setData(result); })
      .catch(err => { if (live) setError(apiErrorMessage(err, 'Could not load the course outcomes.')); });
    return () => { live = false; };
  }, [offeringId]);

  const current = useMemo(() => (offerings || []).find(item => item.id === offeringId), [offerings, offeringId]);
  const outcomes = data?.courseOutcomes || [];
  const programOutcomes = data?.programOutcomes || [];

  const handleView = () => {
    if (!outcomes.length || !current) return;
    const logoUrl = new URL(unclogo, window.location.origin).href;
    const cos = outcomes.map((outcome, index) => ({ description: `CO${index + 1}: ${withoutNumber(outcome.description)}`, poMappings: outcome.poMappings }));
    const html = buildCoPoHtml(cos, current.code, current.name, logoUrl);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    setSelectedFile({ name: `${current.code}_CO_PO.html`, file_url: url });
  };

  const content = (
    <div className={pageStyles.page}>
      <div className={pageStyles.toolbar}>
        <div className={pageStyles.titleBlock}>
          <h2>COURSE OUTCOMES &amp; PO ALIGNMENT</h2>
          <p className={pageStyles.pageSubtitle}>Review how each course outcome supports the program outcomes. The instructor sets these in the syllabus.</p>
        </div>
        <label className={pageStyles.controlGroup}>
          <span className={pageStyles.controlLabel}>Course</span>
          <select className={pageStyles.courseSelect} value={offeringId} onChange={event => setOfferingId(event.target.value)} aria-label="Select course">
            {(offerings || []).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <div className={pageStyles.actions}>
          <button type="button" className={pageStyles.primaryButton} onClick={handleView} disabled={!outcomes.length}>
            <ChevronRight size={16} /> View / Export
          </button>
        </div>
      </div>

      {error && <div role="alert" className={styles.alert}>{error}</div>}

      {offerings !== null && offerings.length === 0 && !error && (
        <div className={pageStyles.contextBar}><span>No course is assigned in your program yet.</span></div>
      )}

      {current && (
        <div className={pageStyles.contextBar}>
          <span><strong>Course:</strong> {current.code} — {current.name}</span>
          <span><strong>Syllabus status:</strong> {current.status}</span>
          <span className={pageStyles.contextMuted}>Request changes through the syllabus review comments.</span>
        </div>
      )}

      <div className={tbl.legend}>
        <span><strong>Legend:</strong></span>
        <span><strong>I</strong> – Introductory</span>
        <span><strong>E</strong> – Enabling</span>
        <span><strong>D</strong> – Demonstrative</span>
        <span style={{ marginLeft: 'auto', color: '#64748b' }}>ILO structure and assessment alignment remain in the syllabus.</span>
      </div>

      {current && (
        <TableScrollRegion
          label="COURSE OUTCOMES & PO ALIGNMENT"
          minWidth={Math.max(640, 320 + programOutcomes.length * 52)}
          className={`${pageStyles.tableRegion} ${pageStyles.compactTableRegion}`}
        >
          <table className={`${tbl.alignTable} ${tbl.compactRows}`}>
            <colgroup>
              <col />
              {programOutcomes.map((po) => <col key={po.key} style={{ width: 52 }} />)}
            </colgroup>
            <thead>
              <tr>
                <th>After completion of the course, the student should be able to:</th>
                {programOutcomes.map((po) => <th key={po.key} className={tbl.center} title={po.description}>{po.key}</th>)}
              </tr>
            </thead>
            <tbody>
              {outcomes.map((outcome, outcomeIndex) => (
                <tr key={outcome.id}>
                  <td><strong>CO{outcomeIndex + 1}:</strong> {withoutNumber(outcome.description)}</td>
                  {programOutcomes.map((po, poIndex) => (
                    <td key={po.key} className={tbl.center} style={{ fontWeight: outcome.poMappings?.[poIndex] ? 700 : 400 }}>
                      {outcome.poMappings?.[poIndex] || ''}
                    </td>
                  ))}
                </tr>
              ))}
              {data && !outcomes.length && (
                <tr><td colSpan={programOutcomes.length + 1} className={tbl.emptyCell}>The instructor has not written course outcomes for this syllabus yet.</td></tr>
              )}
              {!data && !error && (
                <tr><td colSpan={programOutcomes.length + 1} className={tbl.emptyCell}>Loading…</td></tr>
              )}
            </tbody>
          </table>
        </TableScrollRegion>
      )}

      {programOutcomes.length > 0 && (
        <details className={styles.legendList}>
          <summary>Program outcomes ({programOutcomes.length})</summary>
          <ul>
            {programOutcomes.map(po => <li key={po.key}><strong>{po.key}</strong> {po.description}</li>)}
          </ul>
        </details>
      )}

      {selectedFile && (
        <PDFViewerModal
          file={selectedFile}
          kind="CO & PO Alignment"
          onClose={() => {
            if (selectedFile.file_url?.startsWith('blob:')) URL.revokeObjectURL(selectedFile.file_url);
            setSelectedFile(null);
          }}
          onExport={(file) => {
            if (!file.file_url) return;
            const link = document.createElement('a');
            link.href = file.file_url;
            link.download = file.name || 'document';
            link.click();
          }}
        />
      )}
    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role="Program Head" />}
      nav={<SideNavigation mode="program-head" />}
      content={content}
    />
  );
};

export default CoPoAlignment;
