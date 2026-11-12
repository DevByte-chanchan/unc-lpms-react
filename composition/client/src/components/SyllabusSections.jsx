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
    const [suggestionsModal, setSuggestionsModal] = useState({ isOpen: false, data: [] });
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });

    const handleRevisionsClick = (e) => {
        e.stopPropagation();
        setIsOpen(false);
        const rev = Number(revisionNum || 1);
        if (rev <= 1) {
            setInfoModal({
                isOpen: true,
                title: 'Revisions',
                message: 'This learning plan has no revisions yet. It is the first submission.'
            });
        } else {
            setIsRevisionsOpen(true);
        }
    };

    const handleSuggestionsClick = async (e) => {
        e.stopPropagation();
        setIsOpen(false);
        try {
            const res = await fetchJson(`/api/comments/suggestions/${offeringID}`);
            const suggestions = Array.isArray(res?.suggestions) ? res.suggestions : [];
            if (suggestions.length === 0) {
                setInfoModal({
                    isOpen: true,
                    title: 'Future Suggestions',
                    message: 'This learning plan has no suggestions yet.'
                });
            } else {
                setSuggestionsModal({
                    isOpen: true,
                    data: suggestions
                });
            }
        } catch (err) {
            console.error('Failed to load suggestions:', err);
            setInfoModal({
                isOpen: true,
                title: 'Future Suggestions',
                message: 'This learning plan has no suggestions yet.'
            });
        }
    };

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
                    <ChevronLeft size={20}/>
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
                            <option value="Intended Learning Outcomes">Course Coverage</option>
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

                <div className={styles.divider}>
                    <div className={styles.line}></div>
                </div>

                <div onClick={toggleMenu} ref={dropdownRef} className={`${styles.more} ${isOpen ? styles.active : ''}`}>
                    <div className={styles.moreIcon}>
                        <MoreVertical strokeWidth={2} size={16} />
                    </div>

                    <div className={styles.dropdownMenu}>
                        <button type="button" onClick={handleSuggestionsClick}>
                            Future Suggestion
                        </button>
                        <button type="button" onClick={handleRevisionsClick}>
                            Revisions
                        </button>
                    </div>
                </div>

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


            {/* Info / Notice Modal */}
            {infoModal.isOpen && (
                <div className={styles.submitOverlay} onClick={() => setInfoModal({ isOpen: false, title: '', message: '' })}>
                    <div className={styles.submitModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.submitModalHeader}>
                            {infoModal.title}
                        </div>
                        <div className={styles.submitModalBody}>
                            {infoModal.message}
                        </div>
                        <div className={styles.submitModalActions}>
                            <button
                                className={styles.btnConfirmDark}
                                onClick={() => setInfoModal({ isOpen: false, title: '', message: '' })}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Industry Consultant Future Suggestions Modal */}
            {suggestionsModal.isOpen && (
                <div className={styles.submitOverlay} onClick={() => setSuggestionsModal({ isOpen: false, data: [] })}>
                    <div className={styles.suggestionModalBox} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.submitModalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Future Suggestions</span>
                            <button
                                onClick={() => setSuggestionsModal({ isOpen: false, data: [] })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1, color: '#6b7280' }}
                            >
                                &times;
                            </button>
                        </div>
                        <div className={styles.suggestionModalBody}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#6b7280' }}>
                                Industry consultant recommendations for future use (to be applied next school year/term):
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflowY: 'auto' }}>
                                {suggestionsModal.data.map(item => (
                                    <div key={item.id} style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        padding: '12px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{item.commenterName}</span>
                                                <span style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 500 }}>{item.commenterRole}</span>
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#475569', marginBottom: '6px' }}>
                                            <strong>Target:</strong> {item.targetTitle} {item.weekNumber ? `(Week ${item.weekNumber})` : ''}
                                        </div>
                                        <div style={{ fontSize: '12.5px', color: '#1e293b', fontStyle: 'italic', background: '#ffffff', padding: '8px 10px', borderRadius: '4px', borderLeft: '3px solid #f59e0b' }}>
                                            "{item.message}"
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.submitModalActions}>
                            <button
                                className={styles.btnConfirmDark}
                                onClick={() => setSuggestionsModal({ isOpen: false, data: [] })}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
