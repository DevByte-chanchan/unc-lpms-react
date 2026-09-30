import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildCoPoHtml } from '../../../utils/syllabusPdfHtml.js';
import { getAllPrograms, getProgramCourses, getCoPoData } from '../../../utils/programCurriculumData.js';
import unclogo from '../../../assets/unclogo.png';
import tbl from '../../../styles/AlignmentTables.module.sass';
import TableScrollRegion from '../../../components/TableScrollRegion.jsx';
import pageStyles from '../../../styles/ProgramHeadWorkspace.module.sass';

const poLabels = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12', 'PO13'];

const CoPoAlignment = () => {
  const programs = useMemo(() => getAllPrograms(), []);
  const [programCode, setProgramCode] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courses, setCourses] = useState([]);
  const [data, setData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (!programCode && programs.length) setProgramCode(programs[0]);
  }, [programCode, programs]);

  useEffect(() => {
    const nextCourses = getProgramCourses(programCode);
    setCourses(nextCourses);
    setCourseCode(nextCourses[0]?.code || '');
  }, [programCode]);

  useEffect(() => {
    setData(courseCode ? getCoPoData(courseCode) : null);
  }, [programCode, courseCode]);

  const handleView = () => {
    const outcomes = data?.courseOutcomes || [];
    if (!outcomes.length || !courseCode) return;

    const course = courses.find((item) => item.code === courseCode);
    const logoUrl = new URL(unclogo, window.location.origin).href;
    const html = buildCoPoHtml(outcomes, courseCode, course?.name || '', logoUrl);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setSelectedFile({ name: `${programCode}_${courseCode}_CO_PO.html`, file_url: url });
  };

  const course = courses.find((item) => item.code === courseCode);
  const outcomes = data?.courseOutcomes || [];

  const content = (
    <div className={pageStyles.page}>
      <div className={pageStyles.toolbar}>
        <div className={pageStyles.titleBlock}>
          <h2>COURSE OUTCOMES &amp; PO ALIGNMENT</h2>
          <p className={pageStyles.pageSubtitle}>Review the selected syllabus revision and its Program Outcome mappings.</p>
        </div>
        <label className={pageStyles.controlGroup}>
          <span className={pageStyles.controlLabel}>Course</span>
          <select
            className={pageStyles.courseSelect}
            value={courseCode}
            onChange={(event) => setCourseCode(event.target.value)}
            aria-label="Select course"
          >
            {courses.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}
          </select>
        </label>
        <div className={pageStyles.actions}>
          <button type="button" className={pageStyles.primaryButton} onClick={handleView} disabled={!outcomes.length}>
            <ChevronRight size={16} /> View / Export
          </button>
        </div>
      </div>

      {course && (
        <div className={pageStyles.contextBar}>
          <span><strong>Course:</strong> {courseCode} — {course.name}</span>
          <span className={pageStyles.contextMuted}>Request changes through syllabus revision comments.</span>
        </div>
      )}

      <div className={tbl.legend}>
        <span><strong>Legend:</strong></span>
        <span><strong>I</strong> – Introductory</span>
        <span><strong>E</strong> – Enabling</span>
        <span><strong>D</strong> – Demonstrative</span>
        <span style={{ marginLeft: 'auto', color: '#64748b' }}>ILO structure and assessment alignment remain in the syllabus.</span>
      </div>

      <TableScrollRegion
        label="COURSE OUTCOMES & PO ALIGNMENT"
        minWidth={960}
        className={`${pageStyles.tableRegion} ${pageStyles.compactTableRegion}`}
      >
        <table className={`${tbl.alignTable} ${tbl.compactRows}`}>
          <colgroup>
            <col />
            {poLabels.map((po) => <col key={po} style={{ width: 52 }} />)}
          </colgroup>
          <thead>
            <tr>
              <th>After completion of the course, the student should be able to:</th>
              {poLabels.map((po) => <th key={po} className={tbl.center}>{po}</th>)}
            </tr>
          </thead>
          <tbody>
            {outcomes.map((outcome, outcomeIndex) => (
              <tr key={outcome.id || outcomeIndex}>
                <td><strong>{outcome.id || `CO${outcomeIndex + 1}`}:</strong> {outcome.description}</td>
                {Array.from({ length: 13 }, (_, poIndex) => (
                  <td key={poIndex} className={tbl.center} style={{ fontWeight: outcome.poMappings?.[poIndex] ? 700 : 400 }}>
                    {outcome.poMappings?.[poIndex] || ''}
                  </td>
                ))}
              </tr>
            ))}
            {!outcomes.length && (
              <tr><td colSpan={14} className={tbl.emptyCell}>No course outcomes are available for this syllabus revision.</td></tr>
            )}
          </tbody>
        </table>
      </TableScrollRegion>

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
      header={<HeaderA role="Program Head" name="DANILA, JUNAR" />}
      nav={<SideNavigation mode="program-head" />}
      content={content}
    />
  );
};

export default CoPoAlignment;
