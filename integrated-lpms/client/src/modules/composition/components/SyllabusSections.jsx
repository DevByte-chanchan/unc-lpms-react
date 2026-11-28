import styles from '../styles/SyllabusSections.module.sass'
import stylesB from '../styles/SyllabusPreview.module.sass';
import {ChevronLeft, Play, Send, MoreVertical, MessageSquare, Clock, Download, X} from 'react-feather';
import React, {useCallback, useEffect, useRef, useState} from "react";
import { createPortal } from "react-dom";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import Select from "./Select.jsx";
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

    const isEditableStatus = status === 'draft' || status === 'returned';
    const isDraftCoverage = status === 'draft' && selectedSection === 'Intended Learning Outcomes';

    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isRevisionsOpen, setIsRevisionsOpen] = useState(false);
    const [suggestionsModal, setSuggestionsModal] = useState({ isOpen: false, data: [] });
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '' });

    // Weekly content validation state (drives Submit button enabled/disabled & hover tooltip)
    const [weeklyValidation, setWeeklyValidation] = useState({
        loading: true,
        data: null,
        error: null
    });
    const [submitTooltipPos, setSubmitTooltipPos] = useState(null);
    const submitBtnRef = useRef(null);

    // Developer bulk import from previous term state
    const [importAllModal, setImportAllModal] = useState({
        isOpen: false,
        importing: false,
        error: ''
    });
    const [iloRefreshKey, setIloRefreshKey] = useState(0);

    const fetchWeeklyValidation = useCallback(async () => {
        if (!offeringID || !revisionNum || !isEditableStatus) {
            setWeeklyValidation({ loading: false, data: null, error: null });
            return;
        }
        setWeeklyValidation(prev => ({ ...prev, loading: true, error: null }));
        try {
            const data = await fetchJson(`/api/courses/${offeringID}/${revisionNum}/weekly-validation`);
            setWeeklyValidation({ loading: false, data, error: null });
        } catch (err) {
            console.error('Failed to validate weekly content:', err);
            setWeeklyValidation({
                loading: false,
                data: null,
                error: err?.message || 'Unable to verify weekly content validity.'
            });
        }
    }, [offeringID, revisionNum, isEditableStatus]);

    useEffect(() => {
        fetchWeeklyValidation();
    }, [fetchWeeklyValidation, selectedSection]);

    useEffect(() => {
        if (!isEditableStatus) return undefined;
        const onFocus = () => fetchWeeklyValidation();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchWeeklyValidation, isEditableStatus]);

    const invalidGroups = weeklyValidation.data?.invalidGroups || [];
    const invalidSlicesCount = Number(weeklyValidation.data?.invalidSlicesCount || 0);
    const totalSlices = Number(weeklyValidation.data?.totalSlices || 0);
    const unresolvedCommentCount = status === 'returned' ? Number(weeklyValidation.data?.unresolvedCommentCount || 0) : 0;
    const isWeeklyContentValid = Boolean(weeklyValidation.data?.allValid) && unresolvedCommentCount === 0;
    const isSubmitDisabled = weeklyValidation.loading || !isWeeklyContentValid;

    const handleSubmitMouseEnter = () => {
        if (!isSubmitDisabled || !submitBtnRef.current) return;
        const rect = submitBtnRef.current.getBoundingClientRect();
        const tooltipW = 340;
        const vw = window.innerWidth;
        let left = rect.right - tooltipW;
        if (left < 12) left = 12;
        if (left + tooltipW > vw - 12) left = Math.max(12, vw - tooltipW - 12);
        setSubmitTooltipPos({
            top: rect.bottom + 8,
            left
        });
    };

    const handleSubmitMouseLeave = () => {
        setSubmitTooltipPos(null);
    };

    const handleOpenImportAllModal = (e) => {
        e.stopPropagation();
        setIsOpen(false);
        setImportAllModal({ isOpen: true, importing: false, error: '' });
    };

    const handleConfirmImportAll = async () => {
        if (importAllModal.importing) return;
        setImportAllModal(prev => ({ ...prev, importing: true, error: '' }));
        try {
            const res = await fetchJson(`/api/courses/${offeringID}/${revisionNum}/import-previous-all-weeks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            setImportAllModal({ isOpen: false, importing: false, error: '' });
            setIloRefreshKey(k => k + 1);
            await fetchWeeklyValidation();
            setInfoModal({
                isOpen: true,
                title: 'Previous Term Contents Imported',
                message: res?.message || 'Previous term weekly contents have been imported to all weeks.'
            });
        } catch (err) {
            setImportAllModal(prev => ({
                ...prev,
                importing: false,
                error: err?.message || 'Failed to import previous term weekly contents.'
            }));
        }
    };

    const handleRevisionsClick = async (e) => {
        e.stopPropagation();
        setIsOpen(false);
        const rev = Number(revisionNum || 1);
        if (rev > 1) {
            setIsRevisionsOpen(true);
            return;
        }
        try {
            const res = await fetchJson(`/api/revisions/${offeringID}`);
            const list = Array.isArray(res?.revisions) ? res.revisions : [];
            if (list.length > 1) {
                setIsRevisionsOpen(true);
            } else {
                setInfoModal({
                    isOpen: true,
                    title: 'Revisions',
                    message: 'This learning plan has no revisions yet. It is the first submission.'
                });
            }
        } catch (err) {
            setInfoModal({
                isOpen: true,
                title: 'Revisions',
                message: 'This learning plan has no revisions yet. It is the first submission.'
            });
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

    useEffect(() => {
        setIsLoading(false);
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

    // --- Submission Logic (direct submit on confirm, no 5s waiting animation) ---
    const handleInitialSubmitClick = () => {
        if (isSubmitDisabled) return;
        setSubmitTooltipPos(null);
        setSubmitPhase('CONFIRM');
    };

    const cancelSubmission = () => {
        setSubmitPhase('IDLE');
    };

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

    const confirmSubmission = () => {
        executeFinalSubmission();
    };


    return (
        <div className={styles.container}>
            <div className={styles.navi}>
                <Link to={`/`} className={styles.return}>
                    <ChevronLeft size={20}/>
                </Link>

                <div className={styles['section-select']}>
                    <Select
                        value={selectedSection}
                        onChange={handleSectionChange}
                        aria-label="Learning plan section"
                        size="lg"
                        block
                    >
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
                    </Select>
                </div>

                {(status === 'draft' || status === 'returned') &&
                    <>
                        <div onClick={() => setIsPreviewOpen(true)} className={styles.draft}>
                            <Play size={14} />
                            Preview
                        </div>

                        <div
                            ref={submitBtnRef}
                            className={styles.submitWrapper}
                            onMouseEnter={handleSubmitMouseEnter}
                            onMouseLeave={handleSubmitMouseLeave}
                        >
                            <div
                                className={`${styles.submit} ${isSubmitDisabled ? styles.submitDisabled : ''}`}
                                onClick={handleInitialSubmitClick}
                                aria-disabled={isSubmitDisabled}
                            >
                                <Send size={14}/>
                                Submit
                            </div>
                        </div>
                    </>
                }

                <div className={styles.divider}>
                    <div className={styles.line}></div>
                </div>

                <div
                    onClick={toggleMenu}
                    ref={dropdownRef}
                    className={`${styles.more} ${isOpen ? styles.active : ''}`}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape' && isOpen) {
                            e.stopPropagation();
                            setIsOpen(false);
                            dropdownRef.current?.querySelector('button')?.focus();
                        }
                    }}
                >
                    <button
                        type="button"
                        className={styles.moreIcon}
                        aria-label="More actions"
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                    >
                        <MoreVertical strokeWidth={2} size={16} />
                    </button>

                    <div className={styles.dropdownMenu} role="menu">
                        <button type="button" role="menuitem" onClick={handleSuggestionsClick}>
                            <MessageSquare strokeWidth={2} size={14} />
                            Future Suggestion
                        </button>
                        <button type="button" role="menuitem" onClick={handleRevisionsClick}>
                            <Clock strokeWidth={2} size={14} />
                            Revisions
                        </button>
                        {isDraftCoverage && (
                            <>
                                <div className={styles.menuDivider} />
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={styles.devMenuItem}
                                    onClick={handleOpenImportAllModal}
                                    disabled={!weeklyValidation.data?.hasPreviousTerm}
                                    title={
                                        weeklyValidation.data?.hasPreviousTerm
                                            ? `Import previous term weekly contents (${weeklyValidation.data?.previousSource?.termLabel || 'Previous Term'}) to all weeks`
                                            : 'No previous term offering found for this course'
                                    }
                                >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                                        <Download strokeWidth={2} size={14} />
                                        Import Previous Contents (All Weeks)
                                    </span>
                                    <span className={styles.devBadge}>DEV</span>
                                </button>
                            </>
                        )}
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
                            <ILOs key={iloRefreshKey} offeringID={offeringID} revisionNum={revisionNum} status={status} styles={styles} fetchJson={fetchJson} />
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
                    </>
                )}
            </div>

            <SyllabusPreview isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />

            <Revisions isOpen={isRevisionsOpen} onClose={() => setIsRevisionsOpen(false)} pcId={offeringID} revNum={revisionNum} />

            {/* Disabled Submit Hover Tooltip Portal */}
            {submitTooltipPos && isSubmitDisabled && createPortal(
                <div
                    className={styles.submitTooltipPortal}
                    style={{ top: submitTooltipPos.top, left: submitTooltipPos.left }}
                    role="tooltip"
                >
                    <div className={styles.submitTooltipHeader}>
                        <span>Submission Unavailable</span>
                        {!weeklyValidation.loading && !weeklyValidation.error && invalidSlicesCount > 0 && (
                            <span className={styles.submitTooltipCount}>
                                {invalidSlicesCount}/{totalSlices} invalid
                            </span>
                        )}
                    </div>

                    {weeklyValidation.loading ? (
                        <p className={styles.submitTooltipSub} style={{ marginBottom: 0 }}>
                            Checking weekly content validation across all Course Outcomes...
                        </p>
                    ) : weeklyValidation.error ? (
                        <p className={styles.submitTooltipSub} style={{ marginBottom: 0 }}>
                            {weeklyValidation.error}
                        </p>
                    ) : (
                        <>
                            {invalidGroups.length > 0 && (
                                <>
                                    <p className={styles.submitTooltipSub}>
                                        Invalid weekly content found in the following Course Outcomes:
                                    </p>
                                    <ul className={styles.submitTooltipList}>
                                        {invalidGroups.map((group) => {
                                            const weekSummary = group.invalidWeeks.length <= 2
                                                ? group.invalidWeeks
                                                    .map((w) => {
                                                        const cols = Array.isArray(w.invalidColumns) && w.invalidColumns.length > 0
                                                            ? ` (${w.invalidColumns.join(', ')})`
                                                            : '';
                                                        return `${w.weekLabel}${cols}`;
                                                    })
                                                    .join(', ')
                                                : group.invalidWeeks.map((w) => w.weekLabel).join(', ');
                                            return (
                                                <li key={group.key} className={styles.submitTooltipRow}>
                                                    <span className={styles.submitTooltipCo}>{group.label}</span>
                                                    <span className={styles.submitTooltipWeeks}>
                                                        Invalid: {weekSummary}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            )}
                            {unresolvedCommentCount > 0 && (
                                <div className={styles.submitTooltipCommentWarn}>
                                    {unresolvedCommentCount} unresolved review {unresolvedCommentCount === 1 ? 'comment' : 'comments'} must be addressed before resubmitting.
                                </div>
                            )}
                        </>
                    )}
                </div>,
                document.body
            )}

            {/* Developer Bulk Import Confirmation Modal */}
            {importAllModal.isOpen && (
                <div
                    className={styles.submitOverlay}
                    onClick={() => !importAllModal.importing && setImportAllModal({ isOpen: false, importing: false, error: '' })}
                >
                    <div className={styles.submitModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.submitModalHeader}>
                            Import Previous Term Contents (All Weeks)
                        </div>
                        <div className={styles.submitModalBody}>
                            <p style={{ margin: '0 0 10px 0' }}>
                                This developer action will import and save previous term weekly contents
                                {weeklyValidation.data?.previousSource?.termLabel
                                    ? ` from ${weeklyValidation.data.previousSource.termLabel} (Rev ${weeklyValidation.data.previousSource.revision_number})`
                                    : ''}
                                {' '}into <strong>all weeks</strong> (Course Orientation and Weeks 1–16) of this draft learning plan.
                            </p>
                            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                                Topics &amp; Subtopics, TLAs &amp; Assessments, and Weekly References will be mapped and assigned directly to the database for every matching week. Existing contents on those weeks will be replaced.
                            </p>
                            {importAllModal.error && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#b91c1c',
                                    fontSize: '12.5px'
                                }}>
                                    {importAllModal.error}
                                </div>
                            )}
                        </div>
                        <div className={styles.submitModalActions}>
                            <button
                                type="button"
                                className={styles.btnCancelPlain}
                                disabled={importAllModal.importing}
                                onClick={() => setImportAllModal({ isOpen: false, importing: false, error: '' })}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.btnConfirmDark}
                                disabled={importAllModal.importing}
                                onClick={handleConfirmImportAll}
                            >
                                {importAllModal.importing ? 'Importing...' : 'Confirm & Import All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                type="button"
                                className="app-icon-close"
                                aria-label="Close"
                                onClick={() => setSuggestionsModal({ isOpen: false, data: [] })}
                            >
                                <X size={18} />
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
                                        borderRadius: '8px',
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
                                type="button"
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
                                Are you sure you want to finalize and submit this learning plan for review? You will no longer be able to edit it unless it is returned.
                            </div>
                            <div className={styles.submitModalActions}>
                                <button type="button" className={styles.btnCancelPlain} onClick={() => setSubmitPhase('IDLE')}>Cancel</button>
                                <button type="button" className={styles.btnConfirmDark} onClick={confirmSubmission}>Yes, Submit</button>
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
