import styles from '../styles/SyllabusSections.module.sass'
import { offeringKey } from '../utils/offeringKey.js'
import stylesB from '../styles/SyllabusPreview.module.sass'; // Ensure this has the new modal CSS classes
import {ChevronLeft, ChevronRight, Plus, Search, Inbox, Play, Send, MoreVertical, Download, Clock} from 'react-feather';
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Link, useNavigate, useParams, useSearchParams, useLocation} from "react-router-dom";
import SyllabusPreview from "./SyllabusPreview.jsx";
import Revisions from "./Revisions.jsx";
import {fetchJson, apiErrorMessage} from "../utils/api";
import { useServerWorkflow } from '../utils/useServerWorkflow.js'
import { exportEligibility } from '../utils/reviewGate.js'
import { fetchFormInfo } from '../utils/formSettings.js'
import { fetchProgramAlignment } from '../utils/programAlignment.js'
import { buildReviewRecordFile } from '../utils/exportSyllabus.js'
import { validateSubmission } from '../utils/submissionGate'
import PDFViewerModal from './PDFViewerModal'
import { buildSyllabusHtml } from '../utils/syllabusPdfHtml.js'
import unclogo from '../assets/unclogo.png'

import CourseDetails from "./CourseDetails";
import OutcomeAlignment from './OutcomeAlignment';
import ILOs from "./ILOs";
import CriteriaForGrading from "./CriteriaForGrading";
import CourseCoverage from "./CourseCoverage";
import ReferenceSummary from "./ReferenceSummary";
import Spinner from './Spinner.jsx';


const SyllabusSections = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Course Details';
    const navigate = useNavigate()
    const location = useLocation()

    // Extracted directly from route: /courses/:pcId/:revNum/:status
    const params = useParams();
    const { status, revNum: revisionNum, pcId: offeringID } = params;
    // One parameter name for a course code now — see utils/routes.js.
    const courseCode = params.code || ''
    const backPath = location.state?.fromTab
        ? `/?tab=${location.state.fromTab}`
        : (location.state?.fromStatus || status)
            ? `/?status=${location.state?.fromStatus || status}`
            : '/'

    // The instructor route is /courses/:pcId/:revNum/:status, which carries no
    // course code, so it is resolved from the offering.
    const [resolvedCode, setResolvedCode] = useState(courseCode)
    useEffect(() => {
        if (courseCode) { setResolvedCode(courseCode); return }
        if (!offeringID) return
        let cancelled = false
        fetchJson(`/api/course-details/${offeringKey(offeringID, revisionNum)}`)
            .then(d => { if (!cancelled && d?.code) setResolvedCode(d.code) })
            .catch(err => console.warn('Could not resolve the course code for this offering:', err))
        return () => { cancelled = true }
    }, [courseCode, offeringID, revisionNum])

    // The export's approval block reads the server workflow log; nothing is kept locally.
    const { workflow } = useServerWorkflow(offeringID, resolvedCode)
    // Exportable once the Director of Libraries and the Program Head have accepted, even before the Dean.
    const exportInfo = exportEligibility(workflow)

    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isRevisionsOpen, setIsRevisionsOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState(null)
    const [exportingPdf, setExportingPdf] = useState(false)

    // The accreditation review record: every comment, workflow action and the final approvers.
    const handleReviewRecord = async () => {
        setExportingPdf(true)
        try {
            setPreviewFile(await buildReviewRecordFile({ pcId: offeringID, code: resolvedCode }))
        } catch (err) {
            alert('Failed to generate the review record: ' + (err?.message || err))
        } finally {
            setExportingPdf(false)
        }
    }

    const handleExport = async () => {
        setExportingPdf(true)
        try {
            const [courseRes, coaRes, covRes, critRes, refRes] = await Promise.all([
                fetchJson(`/api/course-details/${offeringKey(offeringID, revisionNum)}`).catch(() => null),
                fetchJson(`/api/course-outcome-alignment/${offeringKey(offeringID, revisionNum)}`).catch(() => null),
                fetchJson(`/api/course-coverage/${offeringKey(offeringID, revisionNum)}`).catch(() => null),
                fetchJson(`/api/course-criteria/${offeringKey(offeringID, revisionNum)}`).catch(() => null),
                fetchJson(`/api/courses/${offeringKey(offeringID, revisionNum)}/references`).catch(() => null),
            ])
            const refs = (() => {
                if (!refRes) return []
                if (Array.isArray(refRes)) return refRes
                if (refRes.data) {
                    if (Array.isArray(refRes.data)) return refRes.data
                    const m = [...(refRes.data.Textbook || []), ...(refRes.data['Open Educational Resources'] || []), ...(refRes.data['Online Resources'] || []), ...(refRes.data['Online Subscriptions'] || [])]
                    if (m.length) return m
                    return refRes.data.references || []
                }
                return refRes.references || []
            })()
            const syllabus = {
                ...(courseRes || {}),
                courseOutcomes: coaRes?.courseOutcomes || [],
                ilos: covRes?.ilos || [],
                topics: covRes?.topics || [],
                assessments: covRes?.assessments || [],
                gradingSystem: critRes?.gradingSystem || [],
                references: refs,
                code: resolvedCode,
                course_no: courseRes?.code || '',
                course_title: courseRes?.name || '',
            }
            const logoUrl = new URL(unclogo, window.location.origin).href
            const formInfo = await fetchFormInfo()
            const programAlignment = await fetchProgramAlignment(offeringID)
            const html = buildSyllabusHtml(syllabus, resolvedCode, workflow, logoUrl, { formInfo, programAlignment, pendingApproval: exportInfo.pendingDean })
            const blob = new Blob([html], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            setPreviewFile({
                file_url: url,
                file_name: `Syllabus_${resolvedCode}${exportInfo.pendingDean ? '_PENDING_DEAN_APPROVAL' : ''}.html`,
                instructor_name: syllabus?.instructor || '—',
                course_id: resolvedCode,
                course_name: syllabus?.name || '',
                submission_date: syllabus?.update || '',
                period_label: (syllabus?.year || '') + ' — ' + (syllabus?.sem || ''),
            })
        } catch (err) {
            console.warn('Export generation failed:', err)
            alert('Failed to generate export: ' + (err?.message || err))
        } finally {
            setExportingPdf(false)
        }
    }

    // Submission Modal States (undo-window submit flow)
    const [submitPhase, setSubmitPhase] = useState('IDLE');
    const [gateResult, setGateResult] = useState(null);
    const [timeLeft, setTimeLeft] = useState(5);
    const timerRef = useRef(null);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [selectedSection]);

    const handleSectionChange = (e) => {
        setSearchParams({ section: e.target.value });
    };

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const toggleMenu = (event) => {
        event.stopPropagation();
        setIsOpen(prev => !prev);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isOpen]);

    // --- Corrected Submission Logic ---
    // Alignment gate: the plan cannot be submitted while its hours and ILO
    // allocation do not line up, so the program head confirms instead of
    // hand-checking. The checks read the learning-plan / TOS endpoints; they
    // do not recompute anything those modules own.
    const handleInitialSubmitClick = async () => {
        setSubmitPhase('CHECKING');
        try {
            const [details, coverage] = await Promise.all([
                fetchJson(`/api/course-details/${offeringKey(offeringID, revisionNum)}`),
                fetchJson(`/api/course-coverage/${offeringKey(offeringID, revisionNum)}`)
            ]);
            const result = await validateSubmission({
                courseDetails: details,
                coverage,
                textFields: [
                    // Free-text the program head actually reads; feed the
                    // entry spelling gate [46:58] [49:25]. Shapes vary, so
                    // pull whichever key each entry carries.
                    ...(details?.name ? [details.name] : []),
                    ...(coverage?.topics || []).map(t =>
                        t?.text || t?.title || t?.name || t?.topic || ''),
                    ...(coverage?.ilos || []).map(i =>
                        (i?.description || i?.text || i?.title || i?.name || '') +
                        ((i?.topics || []).map(tp => tp?.text || tp?.title || tp?.name || '').join(' '))
                    ),
                ].filter(Boolean)
            });
            setGateResult(result);
            setSubmitPhase(result.ok ? 'CONFIRM' : 'BLOCKED');
        } catch (error) {
            console.error('Alignment check failed:', error);
            setGateResult({ ok: false, blockers: [`The alignment check could not run: ${error.message}`], warnings: [] });
            setSubmitPhase('BLOCKED');
        }
    };

    const confirmSubmission = () => {
        setSubmitPhase('WAITING');
        setTimeLeft(5);
    };

    const cancelSubmission = useCallback(() => {
        setSubmitPhase('IDLE');
        setTimeLeft(5);
    }, []);

    const executeFinalSubmission = useCallback(async () => {
        setSubmitPhase('SUBMITTING');
        try {
            await fetchJson(`/api/submit-learning-plan/${offeringKey(offeringID, revisionNum)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            setSubmitPhase('DONE');

            setTimeout(() => {
                navigate('/');
            }, 1500);

        } catch (error) {
            console.error("Error during submission:", error);
            cancelSubmission();
            alert(`Failed to submit the learning plan: ${apiErrorMessage(error)}`);
        }
    }, [cancelSubmission, navigate, offeringID, revisionNum]);

    // Safe useEffect timer implementation. This is declared after the submit
    // callback so the effect can track the exact function it invokes.
    useEffect(() => {
        if (submitPhase === 'WAITING' && timeLeft > 0) {
            timerRef.current = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
        } else if (submitPhase === 'WAITING' && timeLeft === 0) {
            executeFinalSubmission();
        }

        return () => clearTimeout(timerRef.current);
    }, [submitPhase, timeLeft, executeFinalSubmission]);


    return (
        <div className={styles.container}>
            <div className={styles.navi}>
                <Link  to={backPath} className={'actionLink'} >
                    <div className={styles.return}>
                        <ChevronLeft size={22}/>
                    </div>
                </Link>

                <div className={styles['section-select']}>
                    <select value={selectedSection} onChange={handleSectionChange}>
                        <option value="Course Details">Course Details</option>
                        <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                        {(status === 'approved' || status === 'pending') &&
                            <>
                                <option value="Course Coverage">Course Coverage</option>
                                <option value="References Summary">References</option>
                            </>
                        }
                        {(status === 'draft' || status === 'returned') &&
                            <option value="Intended Learning Outcomes">Intended Learning Outcomes</option>
                        }
                        <option value="Criteria for Grading">Criteria for Grading</option>
                    </select>
                </div>

                {(status === 'draft' || status === 'returned') &&
                    <>
                        <div onClick={() => setIsPreviewOpen(true)} className={styles.draft}>
                            <Play size={14} />
                            Preview
                        </div>

                        <div className={styles.submit} onClick={handleInitialSubmitClick}>
                            <Send size={14}/>
                            Submit
                        </div>
                    </>
                }

                {
                    status !== 'draft' &&
                    <>
                        <div className={styles.divider}><div className={styles.line}></div></div>

                        <div onClick={toggleMenu} ref={dropdownRef} className={`${styles.more} ${isOpen ? styles.active : ''}`}>
                            <div className={styles.moreIcon} >
                                <MoreVertical strokeWidth={2} size={16} />
                            </div>

                            <div className={styles.dropdownMenu}>
                                {
                                    status === 'approved' &&
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsRevisionsOpen(true); setIsOpen(false); }}>
                                        <Clock strokeWidth={2} size={14} /> Revisions
                                    </button>
                                }
                                {
                                    (status === 'approved' || exportInfo.allowed) &&
                                    <button type="button" disabled={exportingPdf} onClick={(e) => { e.stopPropagation(); setIsOpen(false); handleExport(); }}>
                                        <Download strokeWidth={2} size={14} /> {exportingPdf ? 'Exporting...' : (exportInfo.pendingDean ? 'Export (pending Dean approval)' : 'Export')}
                                    </button>
                                }
                                <button type="button" disabled={exportingPdf} onClick={(e) => { e.stopPropagation(); setIsOpen(false); handleReviewRecord(); }}>
                                    <Download strokeWidth={2} size={14} /> Review record
                                </button>

                            </div>
                        </div>
                    </>
                }

            </div>

            <div className={styles['dynamic-sections']}>
                {isLoading ? (
                    <Spinner label="Loading the learning plan…" minHeight={320} />
                ) : (
                    <>
                        {selectedSection === 'Course Details' &&
                            <CourseDetails offeringID={offeringID} revisionNum={revisionNum} stylesB={stylesB} fetchJson={fetchJson} />
                        }

                        {selectedSection === 'Course and Program Outcome Alignment' &&
                            <OutcomeAlignment offeringID={offeringID} revisionNum={revisionNum} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                        }

                        {selectedSection === 'Intended Learning Outcomes' && (
                            <ILOs offeringID={offeringID} revisionNum={revisionNum} status={status} styles={styles} fetchJson={fetchJson} />
                        )}

                        {selectedSection === 'Criteria for Grading' && (
                            <CriteriaForGrading offeringID={offeringID} revisionNum={revisionNum} status={status} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                        )}

                        {selectedSection === 'Course Coverage' && (
                            <CourseCoverage offeringID={offeringID} revisionNum={revisionNum} status={status} selectedSection={selectedSection} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                        )}

                        {selectedSection === 'References Summary' && (
                            <ReferenceSummary offeringID={offeringID} revisionNum={revisionNum} status={status} selectedSection={selectedSection} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                        )}

                        <SyllabusPreview
                            isOpen={isPreviewOpen}
                            onClose={() => setIsPreviewOpen(false)}
                        />

                        {isRevisionsOpen && (
                            <Revisions
                                onClose={() => setIsRevisionsOpen(false)}
                                revNum={revisionNum}
                                pcId={offeringID}
                            />
                        )}

                        {previewFile && (
                            <PDFViewerModal
                                file={previewFile}
                                onClose={() => { if (previewFile) URL.revokeObjectURL(previewFile.file_url); setPreviewFile(null) }}
                            />
                        )}

                    </>
                )}
            </div>

            {/* --- Custom Submission Modals --- */}
            {submitPhase !== 'IDLE' && (
                <div className={styles.submitOverlay}>

                    {/* Alignment check Phase */}
                    {submitPhase === 'CHECKING' && (
                        <div className={styles.submitModal}>
                            <div className={styles.waitingBodyCenter}>
                                <Spinner inline size={32} label="Checking hours and ILO alignment" />
                                <div className={styles.waitingTextSmall}>Checking hours and ILO alignment…</div>
                            </div>
                        </div>
                    )}

                    {/* Blocked Phase — alignment must pass before submission */}
                    {submitPhase === 'BLOCKED' && (
                        <div className={styles.submitModal}>
                            <div className={styles.submitModalHeader}>
                                Alignment check failed
                            </div>
                            <div className={styles.submitModalBody}>
                                This learning plan cannot be submitted yet. Fix the following, then submit again:
                                <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
                                    {(gateResult?.blockers || []).map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
                                </ul>
                            </div>
                            <div className={styles.submitModalActions}>
                                <button className={styles.btnConfirmDark} onClick={() => setSubmitPhase('IDLE')}>Close</button>
                            </div>
                        </div>
                    )}

                    {/* Confirmation Phase */}
                    {submitPhase === 'CONFIRM' && (
                        <div className={styles.submitModal}>
                            <div className={styles.submitModalHeader}>
                                Submit Learning Plan
                            </div>
                            <div className={styles.submitModalBody}>
                                Are you sure you want to finalize and submit this learning plan for review? You will no longer be able to edit it unless it is returned.
                                {(gateResult?.warnings || []).length > 0 &&
                                    <ul style={{ margin: '10px 0 0', paddingLeft: 20, color: '#b45309' }}>
                                        {gateResult.warnings.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>)}
                                    </ul>
                                }
                            </div>
                            <div className={styles.submitModalActions}>
                                <button className={styles.btnCancelPlain} onClick={() => setSubmitPhase('IDLE')}>Cancel</button>
                                <button className={styles.btnConfirmDark} onClick={confirmSubmission}>Yes, Submit</button>
                            </div>
                        </div>
                    )}

                    {/* Waiting / Undo Phase */}
                    {submitPhase === 'WAITING' && (
                        <div className={styles.submitModal}>
                            <div className={styles.waitingBody}>
                                <div className={styles.waitingText}>
                                    Submitting in <strong>{timeLeft}</strong> seconds...
                                </div>
                                <div className={styles.progressContainer}>
                                    <div className={styles.progressBar} style={{ animationDuration: '5s' }}></div>
                                </div>
                            </div>
                            <div className={styles.submitModalActionsFull}>
                                <button className={styles.btnUndoBlock} onClick={cancelSubmission}>Cancel Submission</button>
                            </div>
                        </div>
                    )}

                    {/* Submitting / Loading Phase */}
                    {submitPhase === 'SUBMITTING' && (
                        <div className={styles.submitModal}>
                            <div className={styles.waitingBodyCenter}>
                                <Spinner inline size={32} label="Processing submission" />
                                <div className={styles.waitingTextSmall}>Processing submission…</div>
                            </div>
                        </div>
                    )}

                    {/* Done Phase */}
                    {submitPhase === 'DONE' && (
                        <div className={styles.submitModal}>
                            <div className={styles.waitingBodyCenter}>
                                <div className={styles.successIcon}>✓</div>
                                <div className={styles.waitingTextSmall}>Successfully Submitted!</div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SyllabusSections;
