import Select from '../../../components/Select.jsx'
import { useEffect, useState } from 'react';
import { Eye, FileText } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import CourseDocumentBar from '../../../components/CourseDocumentBar.jsx';
import { openCourseDocument } from '../../../utils/courseDocuments.js';
import EmptyState from '../../../components/EmptyState.jsx';
import HeadBodyTable from '../../../components/HeadBodyTable.jsx';
import { Loading, TableSkeleton } from '../../../components/LoadingSkeleton.jsx';
import { buildCoaepHtml } from '../../../utils/syllabusPdfHtml.js';
import { revisionLabel, termLabel } from '../../../utils/offeringLabels.js';
import { fetchJson, apiErrorMessage } from '../../../utils/api.js';
import { getSession } from '../../../utils/session.js';
import { fetchFormInfo } from '../../../utils/formSettings.js';
import { buildGeneratedCoaepRecord } from '../../../utils/generatedCoaepRecord.js';
import unclogo from '../../../assets/unclogo.png';
import cc from '../../../styles/SyllabusPreview.module.sass';
import pageStyles from '../../../styles/ProgramHeadWorkspace.module.sass';
import styles from '../../../styles/PoPeoAlignment.module.sass';


// `tabs`: shown as the page header when this page is a tab of Program Documents.
const COAEPView = ({ tabs = null }) => {
  const session = getSession();
  const [offeringId, setOfferingId] = useState('');
  const [courses, setCourses] = useState(null);
  const [serverCoaep, setServerCoaep] = useState(undefined);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaded, setUploaded] = useState(null);

  // The Program Head's assigned offerings, one entry per term and revision (like the CO and PO tab),
  // so the COAEP of an older term can be opened too.
  useEffect(() => {
    let active = true;
    fetchJson('/api/assignments?limit=500')
      .then(response => {
        if (!active) return;
        const rows = Array.isArray(response) ? response : (response.data || []);
        const byOffering = new Map();
        rows.forEach(row => {
          const offering = row.ProgramCourseOffering;
          const course = offering?.Course;
          if (!course?.course_no || !offering.pc_offering_id || byOffering.has(offering.pc_offering_id)) return;
          const parts = [termLabel(offering), revisionLabel(offering)].filter(Boolean);
          byOffering.set(offering.pc_offering_id, {
            id: String(offering.pc_offering_id),
            code: course.course_no,
            name: course.course_title || '',
            label: `${course.course_no} — ${course.course_title || ''}${parts.length ? ` (${parts.join(', ')})` : ''}`,
          });
        });
        const list = [...byOffering.values()].sort((left, right) => left.code.localeCompare(right.code) || left.label.localeCompare(right.label));
        setCourses(list);
        setOfferingId(list[0]?.id || '');
      })
      .catch(err => { if (active) { setCourses([]); setError(apiErrorMessage(err, 'Could not load your courses.')); } });
    return () => { active = false; };
  }, []);

  const course = (courses || []).find(item => item.id === offeringId);
  const courseCode = course?.code || '';

  // undefined = loading, null = this course has no plan content yet.
  useEffect(() => {
    if (!courseCode) return undefined;
    let active = true;
    setServerCoaep(undefined);
    fetchJson(`/api/coaep/${encodeURIComponent(courseCode)}?pcId=${encodeURIComponent(offeringId)}`)
      .then(payload => { if (active) { setServerCoaep(payload); setError(''); } })
      .catch(err => {
        if (!active) return;
        setServerCoaep(null);
        // 404 simply means the plan has no outcomes yet; anything else is worth showing.
        if (err.status !== 404) setError(apiErrorMessage(err, 'Could not load the COAEP.'));
      });
    return () => { active = false; };
  }, [courseCode, offeringId]);

  const generatedRecord = buildGeneratedCoaepRecord({
    courseCode,
    courseName: course?.name,
    payload: serverCoaep || null,
  });

  const viewGeneratedCoaep = async () => {
    if (uploaded) { openCourseDocument(offeringId, 'coaep', uploaded).catch(() => setError('The uploaded file could not be opened.')); return; }
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
        <div className={`${pageStyles.page} ${pageStyles.flowPage}`}>
          <div className={pageStyles.pageHeader}>
            {tabs || <h2 className="app-page-title">Course Assessment &amp; Evaluation Plan (COAEP)</h2>}
            {(generatedRecord || uploaded) && (
              <div className={pageStyles.pageHeaderActions}>
                <button type="button" className="btn btn-primary" onClick={viewGeneratedCoaep}>
                  <Eye size={16} /> Preview / Export
                </button>
              </div>
            )}
          </div>

          <div className={pageStyles.toolbarControls}>
            <Select
              variant="term"
              value={offeringId}
              onChange={event => setOfferingId(event.target.value)}
              aria-label="Select course"
            >
              {(courses || []).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </Select>
          </div>

          <CourseDocumentBar pcId={offeringId} kind="coaep" label="COAEP" onChange={setUploaded} />

          {error && <div role="alert" className={styles.alert}>{error}</div>}

          {generatedRecord && !generatedRecord.approved && (
            <div role="status" className={styles.draftBanner}>
              {generatedRecord.banner} — this plan has not been fully approved, so this COAEP is a draft and is not final.
            </div>
          )}

          {generatedRecord ? (
            <div style={{ minWidth: 0 }}><HeadBodyTable flow label="COURSE ASSESSMENT & EVALUATION PLAN (COAEP)" tableClass={cc.ccTable}
              widths={[40, 250, 300, 260, 220]}
              head={(
                // The official form's columns (UNC-FM-VPAA-02): the CO number shares the statement's header.
                <tr>
                  <th className={cc.ccHeader} colSpan={2}>Course Outcome Statement</th>
                  <th className={cc.ccHeader}>Intended Learning Outcome</th>
                  <th className={cc.ccHeader}>Assessment Tool</th>
                  <th className={cc.ccHeader}>Performance Target</th>
                </tr>
              )}>
                <tbody>
                  {generatedRecord.cos.map((co, courseOutcomeIndex) => {
                    const ilos = co.ilos?.length ? co.ilos : [{ outcome: '', assessments: [] }];
                    return ilos.map((ilo, iloIndex) => (
                      <tr key={`${courseOutcomeIndex}-${iloIndex}`}>
                        {iloIndex === 0 && <td className={`${cc.ccCell} ${cc.boldText}`} rowSpan={ilos.length}>{courseOutcomeIndex + 1}</td>}
                        {iloIndex === 0 && <td className={cc.ccCell} rowSpan={ilos.length}>{co.statement}</td>}
                        <td className={cc.ccCell}>{ilo.outcome || '—'}</td>
                        <td className={cc.ccCell}>
                          {ilo.assessments?.length
                            ? ilo.assessments.map(item => <div key={item.name} className={cc.assessItem}>{item.name}</div>)
                            : '—'}
                        </td>
                        <td className={cc.ccCell}>{ilo.performanceTarget || generatedRecord.performanceTarget}</td>
                      </tr>
                    ));
                  })}
                </tbody>
            </HeadBodyTable></div>
          ) : serverCoaep === undefined && courseCode ? (
            <Loading label="Loading the plan…"><TableSkeleton rows={5} cols={[40, 250, '1fr', 260, 220]} rowHeight={80} /></Loading>
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
