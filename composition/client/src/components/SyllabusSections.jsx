import styles from '../styles/SyllabusSections.module.sass'
import stylesB from '../styles/SyllabusPreview.module.sass';
import {ChevronLeft, ChevronRight, Plus, Search, Inbox, Play, Send, MoreVertical} from 'react-feather';
import React, {useEffect, useRef, useState} from "react";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import SyllabusPreview from "./SyllabusPreview.jsx";
import Revisions from "./Revisions.jsx";
import {fetchJson} from "../utils/api";

import CourseDetails from "./CourseDetails";
import OutcomeAlignment from './OutcomeAlignment';
import ILOs from "./ILOs";
import CriteriaForGrading from "./CriteriaForGrading";
import CourseCoverage from "./CourseCoverage";
import ReferenceSummary from "./ReferenceSummary";


const SyllabusSections = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Course Details';

    const { status, revNum: revisionNum, pcId: offeringID } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isRevisionsOpen, setIsRevisionsOpen] = useState(false);

    // Submission Modal States
    const [submitPhase, setSubmitPhase] = useState('IDLE');
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
    const handleInitialSubmitClick = () => {
        setSubmitPhase('CONFIRM');
    };

    const confirmSubmission = () => {
        setSubmitPhase('WAITING');
        setTimeLeft(5);
    };

    const cancelSubmission = () => {
        setSubmitPhase('IDLE');
        setTimeLeft(5);
    };

    // Safe useEffect timer implementation
    useEffect(() => {
        if (submitPhase === 'WAITING' && timeLeft > 0) {
            timerRef.current = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
        } else if (submitPhase === 'WAITING' && timeLeft === 0) {
            executeFinalSubmission();
        }

        return () => clearTimeout(timerRef.current);
    }, [submitPhase, timeLeft]);

    const executeFinalSubmission = async () => {
        setSubmitPhase('SUBMITTING');
        try {
            await fetchJson(`/api/submit-learning-plan/${offeringID}/${revisionNum}`, {
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
            alert(`Failed to submit the learning plan: ${error.message}`);
        }
    };


    return (
        <div className={styles.container}>
            <div className={styles.navi}>
                <Link to={`/`} className={styles.return}>
                    <ChevronLeft size={22}/>
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
                    status === 'approved' &&
                    <>
                        <div className={styles.divider}>
                            <div className={styles.line}></div>
                        </div>

                        <div onClick={toggleMenu} ref={dropdownRef} className={`${styles.more} ${isOpen ? styles.active : ''}`}>
                            <div className={styles.moreIcon} >
                                <MoreVertical strokeWidth={2} size={16} />
                            </div>

                            <div className={styles.dropdownMenu}>
                                {
                                    status === 'approved' &&
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsRevisionsOpen(true); setIsOpen(false); }}>
                                        Revisions
                                    </button>
                                }

                            </div>
                        </div>
                    </>
                }

            </div>

            <div className={styles['dynamic-sections']}>
                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                    </div>
                ) : (
                    <>
                        {selectedSection === 'Course Details' &&
                            <CourseDetails offeringID={offeringID} revisionNum={revisionNum} stylesB={stylesB} fetchJson={fetchJson} isReadOnly={!(status === 'draft' || status === 'returned')} />
                        }

                        {selectedSection === 'Course and Program Outcome Alignment' &&
                            <OutcomeAlignment offeringID={offeringID} revisionNum={revisionNum} styles={styles} stylesB={stylesB} fetchJson={fetchJson} isReadOnly={!(status === 'draft' || status === 'returned')} />
                        }

                        {selectedSection === 'Intended Learning Outcomes' && (
                            <ILOs offeringID={offeringID} revisionNum={revisionNum} status={status} styles={styles} fetchJson={fetchJson} />
                        )}

                        {selectedSection === 'Criteria for Grading' && (
                            <CriteriaForGrading offeringID={offeringID} revisionNum={revisionNum} status={status} styles={styles} stylesB={stylesB} fetchJson={fetchJson} isReadOnly={!(status === 'draft' || status === 'returned')} />
                        )}

                        {selectedSection === 'Course Coverage' && (
                            <CourseCoverage offeringID={offeringID} revisionNum={revisionNum} status={status} selectedSection={selectedSection} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                        )}

                        {selectedSection === 'References Summary' && (
                            <ReferenceSummary offeringID={offeringID} revisionNum={revisionNum} status={status} selectedSection={selectedSection} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                        )}

                        <SyllabusPreview isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />

                        <Revisions isOpen={isRevisionsOpen} onClose={() => setIsRevisionsOpen(false)} courseId={revisionNum} offeringID={offeringID} />
                    </>
                )}
            </div>

            {/* --- Custom Submission Modals --- */}
            {submitPhase !== 'IDLE' && (
                <div className={styles.submitOverlay}>

                    {/* Confirmation Phase */}
                    {submitPhase === 'CONFIRM' && (
                        <div className={styles.submitModal}>
                            <div className={styles.submitModalHeader}>
                                Submit Learning Plan
                            </div>
                            <div className={styles.submitModalBody}>
                                Are you sure you want to finalize and submit this learning plan for review? You will no longer be edit it unless it is returned.
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
                                <div className={styles.spinnerDark}></div>
                                <div className={styles.waitingTextSmall}>Processing Submission...</div>
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