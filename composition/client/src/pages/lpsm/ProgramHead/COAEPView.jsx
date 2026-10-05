import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import TableScrollRegion from '../../../components/TableScrollRegion.jsx';
import { buildCoaepHtml } from '../../../utils/syllabusPdfHtml.js';
import { fetchJson } from '../../../utils/api.js';
import { getSession } from '../../../utils/session.js';
import { buildGeneratedCoaepRecord } from '../../../utils/generatedCoaepRecord.js';
import { extractProgramPrefix, getAllPrograms, getProgramCourses, getProgramName } from '../../../utils/programCurriculumData.js';
import unclogo from '../../../assets/unclogo.png';
import tbl from '../../../styles/AlignmentTables.module.sass';
import pageStyles from '../../../styles/ProgramHeadWorkspace.module.sass';

const COAEPView = () => {
  const session = getSession();
  const programs = useMemo(() => getAllPrograms(), []);
  const [courseCode, setCourseCode] = useState('');
  const [courses, setCourses] = useState([]);
  const [serverPrograms, setServerPrograms] = useState([]);
  const [serverCoaep, setServerCoaep] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    let active = true;
    const setFallbackCourses = () => {
      const fallback = getProgramCourses(programs[0]);
      if (!active) return;
      setCourses(fallback);
      setCourseCode(current => current || fallback[0]?.code || '');
    };

    fetchJson('/api/assignments')
      .then(response => {
        const rows = Array.isArray(response) ? response : (response.data || []);
        const courseRows = [];
        const programNames = new Set();
        const seenCourseCodes = new Set();
        rows.forEach(row => {
          const course = row.ProgramCourseOffering?.Course;
          const program = row.ProgramCourseOffering?.Program;
          if (course?.course_no && !seenCourseCodes.has(course.course_no)) {
            seenCourseCodes.add(course.course_no);
            courseRows.push({ code: course.course_no, name: course.course_title || '' });
          }
          if (program?.name) programNames.add(program.name);
        });
        courseRows.sort((left, right) => left.code.localeCompare(right.code));
        if (!active) return;
        if (courseRows.length === 0) {
          setFallbackCourses();
          return;
        }
        setCourses(courseRows);
        setServerPrograms([...programNames].sort());
        setCourseCode(current => courseRows.some(course => course.code === current) ? current : courseRows[0].code);
      })
      .catch(setFallbackCourses);

    return () => { active = false; };
  }, [programs]);

  useEffect(() => {
    if (!courseCode) return undefined;
    let active = true;
    setServerCoaep(null);
    fetchJson(`/api/coaep/${encodeURIComponent(courseCode)}`)
      .then(payload => { if (active) setServerCoaep(payload); })
      .catch(() => { if (active) setServerCoaep(null); });
    return () => { active = false; };
  }, [courseCode]);

  const programCode = extractProgramPrefix(courseCode) || programs[0] || '';
  const course = courses.find(item => item.code === courseCode);
  const generatedRecord = buildGeneratedCoaepRecord({
    courseCode,
    courseName: course?.name,
    payload: serverCoaep,
  });

  const viewGeneratedCoaep = () => {
    if (!generatedRecord) return;
    const logoUrl = new URL(unclogo, window.location.origin).href;
    const html = buildCoaepHtml(generatedRecord, logoUrl);
    const fileUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    // A draft export is marked in its file name as well as watermarked inside.
    const fileName = `${programCode}_${courseCode}_generated_COAEP${generatedRecord.approved ? '' : '_DRAFT'}.html`;
    setSelectedFile({
      name: fileName,
      file_name: fileName,
      file_url: fileUrl,
      uploadedBy: 'System generated from syllabus',
      uploadDate: generatedRecord.approved ? generatedRecord.approvalDate : 'Not approved',
    });
  };

  return (
    <SkeletonA
      header={<HeaderA role={session?.roleLabel || 'Program Head'} name={session?.name || ''} />}
      nav={<SideNavigation mode="program-head" />}
      content={(
        <div className={pageStyles.page}>
          <div className={pageStyles.toolbar}>
            <div className={pageStyles.titleBlock}>
              <h2>COURSE ASSESSMENT &amp; EVALUATION PLAN (COAEP)</h2>
              <p className={pageStyles.pageSubtitle}>View the assessment plan generated from the selected course syllabus.</p>
            </div>
            <label className={pageStyles.controlGroup}>
              <span className={pageStyles.controlLabel}>Course</span>
              <select
                className={pageStyles.courseSelect}
                value={courseCode}
                onChange={event => setCourseCode(event.target.value)}
                aria-label="Select course"
              >
                {courses.map(item => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}
              </select>
            </label>
            <div className={pageStyles.actions}>
              {generatedRecord && (
                <button type="button" className={pageStyles.primaryButton} onClick={viewGeneratedCoaep}>
                  <ChevronRight size={16} /> View Generated COAEP
                </button>
              )}
            </div>
          </div>

          {course && (
            <div className={pageStyles.contextBar}>
              <span><strong>Course:</strong> {courseCode} — {course.name}</span>
              <span><strong>Program:</strong> {serverPrograms[0] || getProgramName(programCode)}</span>
              {generatedRecord && <span className={pageStyles.contextMuted}>{generatedRecord.sourceLabel}</span>}
            </div>
          )}

          {generatedRecord && !generatedRecord.approved && (
            <div
              role="status"
              style={{ margin: '0 0 12px', padding: '10px 14px', border: '1px solid #b45309', background: '#fef3c7', color: '#78350f', borderRadius: 6, fontWeight: 600 }}
            >
              {generatedRecord.banner} — this plan has not been fully approved, so this COAEP is a draft and is not final.
            </div>
          )}

          {generatedRecord ? (
            <TableScrollRegion label="COURSE ASSESSMENT & EVALUATION PLAN (COAEP)" minWidth={1280} className={pageStyles.tableRegion}>
              <table className={tbl.alignTable}>
                <colgroup>
                  <col style={{ width: 40 }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '15%' }} />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th className={tbl.center}>#</th>
                    <th>Course Outcome Statement</th>
                    <th>Intended Learning Outcome</th>
                    <th>Level / Weight</th>
                    <th>Topics</th>
                    <th>TLAs</th>
                    <th>Assessment Tool</th>
                    <th>Performance Target</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedRecord.cos.map((co, courseOutcomeIndex) => {
                    const ilos = co.ilos?.length ? co.ilos : [{ outcome: '', topics: [], tlas: [], assessments: [] }];
                    return ilos.map((ilo, iloIndex) => (
                      <tr key={`${courseOutcomeIndex}-${iloIndex}`}>
                        {iloIndex === 0 && <td className={tbl.center} style={{ fontWeight: 700 }} rowSpan={ilos.length}>{courseOutcomeIndex + 1}</td>}
                        {iloIndex === 0 && <td rowSpan={ilos.length}>{co.statement}</td>}
                        <td>{ilo.outcome}</td>
                        <td>
                          {ilo.level ? <>{ilo.levelName} ({ilo.level})<br />{ilo.levelWeight}% of course</> : '—'}
                        </td>
                        <td>{ilo.topics?.length ? <ul style={{ margin: 0, paddingLeft: 16 }}>{ilo.topics.map(topic => <li key={topic}>{topic}</li>)}</ul> : '—'}</td>
                        <td>{ilo.tlas?.length ? <ul style={{ margin: 0, paddingLeft: 16 }}>{ilo.tlas.map(tla => <li key={tla.name}>{tla.name}{tla.phase ? ` (${tla.phase})` : ''}</li>)}</ul> : '—'}</td>
                        <td>
                          {ilo.assessments?.length
                            ? <ul style={{ margin: 0, paddingLeft: 16 }}>{ilo.assessments.map(item => <li key={item.name}>{item.name} — {item.periodLabel ? `${item.periodLabel}, ` : ''}{item.weight}%</li>)}</ul>
                            : '—'}
                        </td>
                        <td>{ilo.performanceTarget || generatedRecord.performanceTarget}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </TableScrollRegion>
          ) : (
            <EmptyState
              icon={<FileText size={22} strokeWidth={1.6} />}
              title="No generated COAEP for this course yet"
              hint="COAEP is generated from the course learning plan after it contains course outcomes, intended learning outcomes, and assessment tools."
            />
          )}

          {selectedFile && (
            <PDFViewerModal
              file={selectedFile}
              kind="Generated Course Assessment & Evaluation Plan (COAEP)"
              onClose={() => {
                if (selectedFile.file_url?.startsWith('blob:')) URL.revokeObjectURL(selectedFile.file_url);
                setSelectedFile(null);
              }}
              onExport={file => {
                const link = document.createElement('a');
                link.href = file.file_url;
                link.download = file.file_name || file.name || 'generated-coaep.html';
                link.click();
              }}
            />
          )}
        </div>
      )}
    />
  );
};

export default COAEPView;
