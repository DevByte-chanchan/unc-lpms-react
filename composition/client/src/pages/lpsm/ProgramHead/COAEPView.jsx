import Select from '../../../components/Select.jsx'
import { useEffect, useState } from 'react';
import { ChevronRight, FileText } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import HeadBodyTable from '../../../components/HeadBodyTable.jsx';
import { Loading, TableSkeleton } from '../../../components/LoadingSkeleton.jsx';
import { buildCoaepHtml } from '../../../utils/syllabusPdfHtml.js';
import { fetchJson, apiErrorMessage } from '../../../utils/api.js';
import { getSession } from '../../../utils/session.js';
import { fetchFormInfo } from '../../../utils/formSettings.js';
import { buildGeneratedCoaepRecord } from '../../../utils/generatedCoaepRecord.js';
import unclogo from '../../../assets/unclogo.png';
import cc from '../../../styles/SyllabusPreview.module.sass';
import pageStyles from '../../../styles/ProgramHeadWorkspace.module.sass';
import styles from '../../../styles/PoPeoAlignment.module.sass';

const PHASES = [['pre-class', 'PRE-CLASS'], ['in-class', 'IN-CLASS'], ['post-class', 'POST-CLASS']];

const COAEPView = () => {
  const session = getSession();
  const [courseCode, setCourseCode] = useState('');
  const [courses, setCourses] = useState(null);
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
          <div className={pageStyles.pageHeader}>
            <h2 className="app-page-title">Course Assessment &amp; Evaluation Plan (COAEP)</h2>
            {generatedRecord && (
              <div className={pageStyles.pageHeaderActions}>
                <button type="button" className="btn btn-primary" onClick={viewGeneratedCoaep}>
                  <ChevronRight size={16} /> View Generated COAEP
                </button>
              </div>
            )}
          </div>

          <div className={pageStyles.toolbarControls}>
            <Select
              value={courseCode}
              onChange={event => setCourseCode(event.target.value)}
              aria-label="Select course"
            >
              {(courses || []).map(item => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}
            </Select>
          </div>

          {error && <div role="alert" className={styles.alert}>{error}</div>}

          {generatedRecord && !generatedRecord.approved && (
            <div role="status" className={styles.draftBanner}>
              {generatedRecord.banner} — this plan has not been fully approved, so this COAEP is a draft and is not final.
            </div>
          )}

          {generatedRecord ? (
            <div style={{ minWidth: 0, minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}><HeadBodyTable label="COURSE ASSESSMENT & EVALUATION PLAN (COAEP)" tableClass={cc.ccTable}
              widths={sharedTarget ? [60, 220, 220, 120, 250, 300, 220] : [60, 220, 220, 120, 250, 300, 220, 200]}
              head={(
                <tr>
                  <th className={cc.ccHeader}>CO</th>
                  <th className={cc.ccHeader}>Course outcome statement</th>
                  <th className={cc.ccHeader}>ILO</th>
                  <th className={cc.ccHeader}>Level / weight</th>
                  <th className={cc.ccHeader}>Topics</th>
                  <th className={cc.ccHeader}>Teaching &amp; learning activities (TLAs)</th>
                  <th className={cc.ccHeader}>Assessment tool</th>
                  {!sharedTarget && <th className={cc.ccHeader}>Performance target</th>}
                </tr>
              )}>
                <tbody>
                  {generatedRecord.cos.map((co, courseOutcomeIndex) => {
                    const ilos = co.ilos?.length ? co.ilos : [{ outcome: '', topics: [], tlas: [], assessments: [] }];
                    return ilos.map((ilo, iloIndex) => (
                      <tr key={`${courseOutcomeIndex}-${iloIndex}`}>
                        {iloIndex === 0 && <td className={`${cc.ccCell} ${cc.centerText} ${cc.boldText}`} rowSpan={ilos.length}>{courseOutcomeIndex + 1}</td>}
                        {iloIndex === 0 && <td className={cc.ccCell} rowSpan={ilos.length}>{co.statement}</td>}
                        <td className={cc.ccCell}>
                          <div className={cc.boldText} style={{ marginBottom: 5 }}>ILO{iloIndex + 1}</div>
                          {ilo.outcome}
                        </td>
                        <td className={`${cc.ccCell} ${cc.centerText}`}>
                          {ilo.level ? <><div className={cc.boldText}>{ilo.levelName} ({ilo.level})</div><div>{ilo.levelWeight}% of course</div></> : '—'}
                        </td>
                        <td className={cc.ccCell}>
                          {ilo.topics?.length ? <ul className={cc.subtopicList}>{ilo.topics.map(topic => <li key={topic}>{topic}</li>)}</ul> : '—'}
                        </td>
                        <td className={cc.ccCell}>
                          {PHASES.map(([phase, title]) => {
                            const inPhase = (ilo.tlas || []).filter(tla => String(tla.phase || '').toLowerCase() === phase);
                            return inPhase.length > 0 && (
                              <div key={phase} className={cc.tlaGroupBlock}>
                                <div className={cc.tlaPhaseHeader}>{title}</div>
                                {inPhase.map(tla => <div key={tla.name} className={cc.tlaItem}><span className={cc.boldText}>{tla.name}</span></div>)}
                              </div>
                            );
                          })}
                          {(ilo.tlas || []).filter(tla => !PHASES.some(([phase]) => phase === String(tla.phase || '').toLowerCase())).map(tla => (
                            <div key={tla.name} className={cc.tlaItem}><span className={cc.boldText}>{tla.name}</span></div>
                          ))}
                          {!ilo.tlas?.length && '—'}
                        </td>
                        <td className={cc.ccCell}>
                          {ilo.assessments?.length
                            ? ilo.assessments.map(item => (
                              <div key={item.name} className={cc.assessItem}>
                                <div className={cc.boldText}>{item.name}</div>
                                <div className={cc.descText}>{[item.periodLabel, `${item.weight}%`].filter(Boolean).join(', ')}</div>
                              </div>
                            ))
                            : '—'}
                        </td>
                        {!sharedTarget && <td className={cc.ccCell}>{ilo.performanceTarget || generatedRecord.performanceTarget}</td>}
                      </tr>
                    ));
                  })}
                </tbody>
            </HeadBodyTable></div>
          ) : serverCoaep === undefined && courseCode ? (
            <Loading label="Loading the plan…"><TableSkeleton rows={5} cols={[60, 220, 220, 120, 250, '1fr', 220]} rowHeight={80} /></Loading>
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
