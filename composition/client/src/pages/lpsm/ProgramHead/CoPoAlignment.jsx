import Select from '../../../components/Select.jsx'
import { useEffect, useMemo, useState } from 'react';
import { Eye } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import CourseDocumentBar from '../../../components/CourseDocumentBar.jsx';
import { openCourseDocument } from '../../../utils/courseDocuments.js';
import { buildCoPoHtml } from '../../../utils/syllabusPdfHtml.js';
import { fetchJson, apiErrorMessage } from '../../../utils/api.js';
import { computeOverallStatus } from '../../../utils/assignmentStatus.js';
import { revisionLabel, termLabel } from '../../../utils/offeringLabels.js';
import unclogo from '../../../assets/unclogo.png';
import cc from '../../../styles/SyllabusPreview.module.sass';
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

// `tabs`: shown as the page header when this page is a tab of Outcomes Alignment.
const CoPoAlignment = ({ tabs = null }) => {
  const [offerings, setOfferings] = useState(null);
  const [offeringId, setOfferingId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaded, setUploaded] = useState(null);

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
  // An uploaded Excel file, read by the server, stands in for the outcomes from the plan.
  const sheet = uploaded?.parsed?.cos || null;
  const outcomes = sheet ? sheet.map((co, i) => ({ id: `sheet-${i}`, description: co.description, poMappings: co.poMappings })) : (data?.courseOutcomes || []);
  const planPos = data?.programOutcomes || [];
  const sheetWidth = sheet ? Math.max(0, ...sheet.map(co => co.poMappings.length)) : 0;
  const programOutcomes = sheetWidth > planPos.length
    ? [...planPos, ...Array.from({ length: sheetWidth - planPos.length }, (_, i) => ({ key: `PO${planPos.length + i + 1}`, description: '' }))]
    : planPos;

  const handleView = () => {
    if (uploaded && !sheet) { openCourseDocument(offeringId, 'co-po', uploaded).catch(() => setError('The uploaded file could not be opened.')); return; }
    if (!outcomes.length || !current) return;
    const logoUrl = new URL(unclogo, window.location.origin).href;
    const cos = outcomes.map((outcome, index) => ({ description: `CO${index + 1}: ${withoutNumber(outcome.description)}`, poMappings: outcome.poMappings }));
    const html = buildCoPoHtml(cos, current.code, current.name, logoUrl);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    setSelectedFile({ name: `${current.code}_CO_PO.html`, file_url: url });
  };

  const content = (
    <div className={`${pageStyles.page} ${pageStyles.flowPage}`}>
      <div className={pageStyles.pageHeader}>
        {tabs || <h2 className="app-page-title">Course Outcomes &amp; PO Alignment</h2>}
        <div className={pageStyles.pageHeaderActions}>
          <button type="button" className="btn btn-primary" onClick={handleView} disabled={!outcomes.length && !uploaded}>
            <Eye size={16} /> Preview / Export
          </button>
        </div>
      </div>

      <div className={pageStyles.toolbarControls}>
        <Select variant="term" value={offeringId} onChange={event => setOfferingId(event.target.value)} aria-label="Select course">
            {(offerings || []).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
      </div>

      <CourseDocumentBar pcId={offeringId} kind="co-po" label="CO and PO alignment" onChange={setUploaded} />

      {error && <div role="alert" className={styles.alert}>{error}</div>}

      {current && (
        <div className={`${cc.legend} ${pageStyles.legendRow}`}>
          <span className={cc.legendTitle}>Legend:</span>
          <div className={cc.legendItems}>
            <span><strong>I</strong> – Introductory</span>
            <span><strong>E</strong> – Enabling</span>
            <span><strong>D</strong> – Demonstrative</span>
          </div>
        </div>
      )}

      {offerings !== null && offerings.length === 0 && !error && (
        <div className={pageStyles.contextBar}><span>No course is assigned in your program yet.</span></div>
      )}

      {current && (
        <div style={{ minWidth: 0 }}><TableScrollRegion
          label="COURSE OUTCOMES & PO ALIGNMENT"
          minWidth={Math.max(640, 320 + programOutcomes.length * 52)}
          className={`${cc.tableScrollWrapper} ${tbl.plainWrap} ${pageStyles.flowTable}`}
        >
          <table className={`${cc.alignmentTable} ${tbl.plain}`}>
            <colgroup>
              <col />
              {programOutcomes.map((po) => <col key={po.key} style={{ width: 52 }} />)}
            </colgroup>
            <thead>
              <tr>
                <th className={cc.firstColHeader}>After completion of the course, the student should be able to:</th>
                {programOutcomes.map((po) => <th key={po.key} className={cc.poHeader} title={po.description}>{po.key}</th>)}
              </tr>
            </thead>
            <tbody>
              {outcomes.map((outcome, outcomeIndex) => (
                <tr key={outcome.id}>
                  <td className={cc.descCell}><strong>CO{outcomeIndex + 1}:</strong> {withoutNumber(outcome.description)}</td>
                  {programOutcomes.map((po, poIndex) => (
                    <td key={po.key} className={cc.mappingCell}>
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
        </TableScrollRegion></div>
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
