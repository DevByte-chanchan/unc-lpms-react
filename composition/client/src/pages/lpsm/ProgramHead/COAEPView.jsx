import { useEffect, useState } from 'react';
import { ChevronRight, FileText } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import TableScrollRegion from '../../../components/TableScrollRegion.jsx';
import { buildCoaepHtml } from '../../../utils/syllabusPdfHtml.js';
import { fetchJson, apiErrorMessage } from '../../../utils/api.js';
import { getSession } from '../../../utils/session.js';
import { fetchFormInfo } from '../../../utils/formSettings.js';
import { buildGeneratedCoaepRecord } from '../../../utils/generatedCoaepRecord.js';
import unclogo from '../../../assets/unclogo.png';
import tbl from '../../../styles/AlignmentTables.module.sass';
import pageStyles from '../../../styles/ProgramHeadWorkspace.module.sass';
import styles from '../../../styles/PoPeoAlignment.module.sass';

const COAEPView = () => {
  const session = getSession();
  const [courseCode, setCourseCode] = useState('');
  const [courses, setCourses] = useState(null);
  const [programName, setProgramName] = useState('');
  const [serverCoaep, setServerCoaep] = useState(undefined);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // The Program Head's real assigned courses, one entry per course code.
  useEffect(() => {
    let active = true;
    fetchJson('/api/assignments?limit=500')
      .then(response => {
        if (!active) return;
        const rows = Array.isArray(response) ? response : (response.data || []);
        const byCode = new Map();
        rows.forEach(row => {
          const course = row.ProgramCourseOffering?.Course;
          if (course?.course_no && !byCode.has(course.course_no)) byCode.set(course.course_no, { code: course.course_no, name: course.course_title || '' });
        });
        const list = [...byCode.values()].sort((left, right) => left.code.localeCompare(right.code));
        setProgramName(rows.find(row => row.ProgramCourseOffering?.Program?.name)?.ProgramCourseOffering.Program.name || '');
        setCourses(list);
        setCourseCode(list[0]?.code || '');
      })
      .catch(err => { if (active) { setCourses([]); setError(apiErrorMessage(err, 'Could not load your courses.')); } });
    return () => { active = false; };
  }, []);

  // undefined = loading, null = this course has no plan content yet.
  useEffect(() => {
    if (!courseCode) return undefined;
    let active = true;
    setServerCoaep(undefined);
    fetchJson(`/api/coaep/${encodeURIComponent(courseCode)}`)
      .then(payload => { if (active) { setServerCoaep(payload); setError(''); } })
      .catch(err => {
        if (!active) return;
        setServerCoaep(null);
        // 404 simply means the plan has no outcomes yet; anything else is worth showing.
        if (err.status !== 404) setError(apiErrorMessage(err, 'Could not load the COAEP.'));
      });
    return () => { active = false; };
  }, [courseCode]);

  const course = (courses || []).find(item => item.code === courseCode);
  const generatedRecord = buildGeneratedCoaepRecord({
    courseCode,
    courseName: course?.name,
    payload: serverCoaep || null,
  });

  // One target for every row reads better above the table than repeated in a column.
  const targets = new Set((generatedRecord?.cos || []).flatMap(co => (co.ilos || []).map(ilo => ilo.performanceTarget || generatedRecord.performanceTarget)));
  const sharedTarget = targets.size === 1 ? [...targets][0] : null;

  const viewGeneratedCoaep = async () => {
    if (!generatedRecord) return;
    const logoUrl = new URL(unclogo, window.location.origin).href;
    const formInfo = await fetchFormInfo();
    const html = buildCoaepHtml(generatedRecord, logoUrl, { formInfo });
    const fileUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    // A draft export is marked in its file name as well as watermarked inside.
    const fileName = `${courseCode}_generated_COAEP${generatedRecord.approved ? '' : '_DRAFT'}.html`;
    setSelectedFile({
      name: fileName,
      file_name: fileName,
      file_url: fileUrl,
      uploadedBy: 'System generated from syllabus',
      uploadDate: generatedRecord.approved ? generatedRecord.approvalDate : 'Not approved',
      // The viewer's side panel reads these; without them it printed "undefined — undefined".
      course_id: courseCode,
      course_name: course?.name || '',
      instructor_name: '—',
      submission_date: '',
      period_label: generatedRecord.sourceLabel,
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
                {(courses || []).map(item => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}
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
              {programName && <span><strong>Program:</strong> {programName}</span>}
              {generatedRecord && <span className={pageStyles.contextMuted}>{generatedRecord.sourceLabel}</span>}
            </div>
          )}

          {error && <div role="alert" className={styles.alert}>{error}</div>}

          {generatedRecord && !generatedRecord.approved && (
            <div role="status" className={styles.draftBanner}>
              {generatedRecord.banner} — this plan has not been fully approved, so this COAEP is a draft and is not final.
            </div>
          )}

          {sharedTarget && generatedRecord && (
            <div className={pageStyles.contextBar}><span><strong>Performance target:</strong> {sharedTarget}</span></div>
          )}

          {generatedRecord ? (
            <TableScrollRegion label="COURSE ASSESSMENT & EVALUATION PLAN (COAEP)" minWidth={sharedTarget ? 1000 : 1280} className={pageStyles.tableRegion}>
              <table className={tbl.alignTable}>
                <colgroup>
                  <col style={{ width: 40 }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '14%' }} />
                  <col />
                  {!sharedTarget && <col style={{ width: '15%' }} />}
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
                    {!sharedTarget && <th>Performance Target</th>}
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
                        {!sharedTarget && <td>{ilo.performanceTarget || generatedRecord.performanceTarget}</td>}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </TableScrollRegion>
          ) : serverCoaep === undefined && courseCode ? (
            <div className={styles.empty}>Loading…</div>
          ) : courses !== null && courses.length === 0 ? (
            <EmptyState
              icon={<FileText size={22} strokeWidth={1.6} />}
              title="No course is assigned in your program yet"
              hint="Its COAEP appears here once an assigned course has a learning plan with course outcomes."
            />
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
