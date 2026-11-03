import Select from './Select.jsx'
import { historyRevisionLabel } from "../utils/offeringLabels.js";
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Clock, X, Maximize, Minimize2 } from "react-feather";
import { fetchJson } from "../utils/api";
import EmptyState from "./EmptyState.jsx";
import PDFViewerModal from "./PDFViewerModal.jsx";
import { buildReviewRecordFile } from "../utils/exportSyllabus.js";
import { fmt as fmtMoment, SECTION_NAMES } from "../utils/reviewRecordHtml.js";
import Spinner from "./Spinner.jsx";
import styles from '../styles/Revisions.module.sass';
import stylesB from "../styles/SyllabusPreview.module.sass";

import CourseDetails from "./CourseDetails";
import OutcomeAlignment from './OutcomeAlignment';
import CourseCoverage from "./CourseCoverage";
import ReferenceSummary from "./ReferenceSummary";
import CriteriaForGrading from "./CriteriaForGrading";

// MOUNTED ONLY WHILE OPEN — see the call sites in SyllabusSections.jsx and
// ApprovalSyllabusSections.jsx.
//
// This used to start with `if (!isOpen) return null;` and then call seven
// hooks. Both callers render it unconditionally, so the closed render ran no
// hooks and the render after opening ran seven: React's "Rendered more hooks
// than during the previous render", every time the overlay was opened. The
// guard now lives with the callers, which also means no revision history is
// fetched while nobody is looking at it.
const Revisions = ({ onClose, pcId: propPcId }) => {
    const { status, pcId: paramPcId, code } = useParams();

    const currentPcId = propPcId || paramPcId;
    // Entries are keyed by offering id: a working copy has no revision number yet.
    const [activePcId, setActivePcId] = useState(Number(currentPcId));
    const [expandedAccordion, setExpandedAccordion] = useState(Number(currentPcId));
    const [selectedSection, setSelectedSection] = useState('Course Details');

    const [revisionsData, setRevisionsData] = useState([]);
    // The review record of one revision, opened from its row in the history.
    const [recordFile, setRecordFile] = useState(null);
    // The window can be stretched to the whole screen.
    const [expanded, setExpanded] = useState(false);
    // Escape: leaves full screen first, then closes the window. While the review record is open on top of it, Escape
    // belongs to that viewer, which closes itself.
    useEffect(() => {
        const onKey = (event) => {
            if (event.key !== 'Escape' || recordFile) return;
            if (expanded) setExpanded(false);
            else onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [recordFile, expanded, onClose]);
    const [recordBusy, setRecordBusy] = useState(null);
    const [commentCounts, setCommentCounts] = useState({});
    useEffect(() => {
        const rev = revisionsData.find(item => item.pcId === expandedAccordion);
        if (!rev || rev.status !== 'Approved' || commentCounts[rev.pcId]) return undefined;
        let live = true;
        fetchJson(`/api/assignments/offering/${rev.pcId}/review-record`)
            .then(record => {
                const list = record?.comments || [];
                if (live) setCommentCounts(current => ({ ...current, [rev.pcId]: { total: list.length, resolved: list.filter(c => c.resolved).length } }));
            })
            .catch(() => {});
        return () => { live = false; };
    }, [expandedAccordion, revisionsData, commentCounts]);
    const openRecord = async (rev) => {
        setRecordBusy(rev.pcId);
        try {
            setRecordFile(await buildReviewRecordFile({ pcId: rev.pcId, code }));
        } catch (err) {
            alert('Failed to generate the review record: ' + (err?.message || err));
        } finally {
            setRecordBusy(null);
        }
    };
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRevisions = async () => {
            if (!currentPcId) return;
            try {
                setLoading(true);
                const data = await fetchJson(`/api/revisions/${currentPcId}`);
                setRevisionsData(Array.isArray(data?.revisions) ? data.revisions : []);
            } catch (err) {
                console.error("Failed to load live revisions:", err);
                setRevisionsData([]);
            } finally {
                setLoading(false);
            }
        };
        loadRevisions();
    }, [currentPcId]);

    const handleAccordionToggle = (pcId) => {
        setExpandedAccordion(expandedAccordion === pcId ? null : pcId);
        if (pcId) setActivePcId(Number(pcId));
    };
    // A carried-over term whose only record is its own assignment has no history of its own, so it is not listed
    // (unless it is the one that is open).
    const listed = revisionsData.filter(rev => !(rev.carriedOver && (rev.timeline || []).every(event => String(event.type || '').toUpperCase() === 'ASSIGNED') && rev.pcId !== Number(currentPcId)));
    const selectedRevNum = revisionsData.find(rev => rev.pcId === activePcId)?.revNum ?? null;

    const getIndicatorClass = (type) => {
        const safeType = (type || '').toUpperCase();
        switch (safeType) {
            case "ASSIGNED": return styles.assigned;
            case "SUBMITTED": return styles.submitted;
            case "RETURNED": return styles.returned;
            case "ACCEPTED": return styles.accepted;
            case "APPROVED": return styles.approved;
            default: return "";
        }
    };

    const formatDate = (dateString) => (dateString ? fmtMoment(dateString) : "");

    return (
        <div className={`${styles.modalOverlay} ${expanded ? styles.expanded : ''}`}>
            <div className={`${styles.modalContent} ${expanded ? styles.expanded : ''}`}>
                <div className="app-window-header">
                    <h2 className="app-window-title">Revisions</h2>
                    <div className="app-window-actions">
                        <button type="button" className="app-icon-btn" onClick={() => setExpanded(value => !value)}
                            title={expanded ? 'Exit full screen' : 'Full screen'} aria-label={expanded ? 'Exit full screen' : 'Full screen'}>
                            {expanded ? <Minimize2 size={16} /> : <Maximize size={16} />}
                        </button>
                        <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close revisions">
                            <X size={16} strokeWidth={2.5} color="currentColor" />
                        </button>
                    </div>
                </div>

                <div className={styles.splitContainer}>
                    {/* LEFT SECTION */}
                    <div className={styles.leftPreviewPane}>
                        <div className={styles.navi} style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                            <div className={styles['section-select']}>
                                <Select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} block>
                                    <option value="Course Details">Course Details</option>
                                    <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                                    <option value="Course Coverage">Course Coverage</option>
                                    <option value="References Summary">References Summary</option>
                                    <option value="Criteria for Grading">Criteria for Grading</option>
                                </Select>
                            </div>
                        </div>

                        <div className={styles['dynamic-sections']} style={{ overflowY: 'auto', maxHeight: '72vh', paddingRight: '4px' }}>
                            {selectedSection === 'Course Details' && (
                                <CourseDetails offeringID={activePcId} revisionNum={selectedRevNum} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                            {selectedSection === 'Course and Program Outcome Alignment' && (
                                <OutcomeAlignment offeringID={activePcId} revisionNum={selectedRevNum} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                            {selectedSection === 'Course Coverage' && (
                                <CourseCoverage offeringID={activePcId} revisionNum={selectedRevNum} status={status} selectedSection={selectedSection} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                            {selectedSection === 'References Summary' && (
                                <ReferenceSummary offeringID={activePcId} revisionNum={selectedRevNum} status={status} selectedSection={selectedSection} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                            {selectedSection === 'Criteria for Grading' && (
                                <CriteriaForGrading offeringID={activePcId} revisionNum={selectedRevNum} status={status} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                        </div>
                    </div>

                    {/* RIGHT SECTION (TIMELINE) */}
                    <div className={styles.rightLedgerPane}>
                        <div className={styles.titleBorder}>
                            <div className={styles.sidebarTitle}>History</div>
                        </div>

                        <div className={styles.accordionStack}>
                            {loading ? (
                                <Spinner label="Loading revision history…" minHeight={180} />
                            ) : listed.length === 0 ? (
                                <EmptyState
                                    icon={<Clock size={22} strokeWidth={1.6} />}
                                    title="No revision history yet"
                                    hint="Each time this learning plan is submitted, returned or approved, that step is recorded here."
                                />

                            ) : (
                                listed.map((rev) => {
                                    const isExpanded = expandedAccordion === rev.pcId;
                                    return (
                                        <div key={`rev-${rev.pcId}`} className={styles.accordionItem}>

                                            {/* Accordion Header */}
                                            <div className={styles.accordionHeader} onClick={() => handleAccordionToggle(rev.pcId)}>
                                                <div className={styles.accordionMetaInfo}>
                                                    <span className={styles.revLabelText}>{historyRevisionLabel(rev)}{rev.schoolYear ? ` · ${rev.schoolYear} ${rev.semester} sem` : ''}</span>
                                                    {/*<span className={`${styles.statusMiniTag} ${statusClass}`}>{revStatus}</span>*/}
                                                </div>
                                                <span className={styles.headerEnd}>
                                                    {rev.status === 'Approved' && <span className={styles.revStatus}>Approved</span>}
                                                    <span className={styles.toggleArrow}>{isExpanded ? "▲" : "▼"}</span>
                                                </span>
                                            </div>

                                            {/* Accordion Content */}
                                            <div className={`${styles.accordionContent} ${isExpanded ? styles.open : ""}`}>
                                                {rev.status === 'Approved' && commentCounts[rev.pcId] && (
                                                    <div className={styles.revCounts}>
                                                        {commentCounts[rev.pcId].total} comment{commentCounts[rev.pcId].total === 1 ? '' : 's'} · {commentCounts[rev.pcId].resolved} resolved
                                                    </div>
                                                )}
                                                {rev.status === 'Approved' && (
                                                    <button type="button" className="btn btn-secondary btn-sm" style={{ margin: '4px 0 10px' }}
                                                        disabled={recordBusy === rev.pcId} onClick={() => openRecord(rev)}>
                                                        {recordBusy === rev.pcId ? 'Preparing…' : 'Review record'}
                                                    </button>
                                                )}
                                                <div className={styles.timelineTrack}>

                                                    {(rev.timeline || []).map((event) => (
                                                        <React.Fragment key={`event-${event.id || Math.random()}`}>
                                                            {/* Standard Event Line */}
                                                            <div className={styles.timelineNode}>
                                                                <div className={`${styles.circleIndicator} ${getIndicatorClass(event.type)}`}></div>
                                                                <div className={styles.timelineNodeBody}>
                                                                    <span className={styles.timelineMessageText}>
                                                                        {/* Added semibold class applied directly to actor and date */}
                                                                        <span className={styles.semiBoldText}>{event.actor}</span> {event.message.toLowerCase()}
                                                                        <span className={styles.timelineDate}>{formatDate(event.date)}</span>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Comments directly attached underneath RETURNED events */}
                                                            {event.comments && event.comments.length > 0 && (
                                                                <div className={styles.timelineNode}>
                                                                    <div className={styles.timelineNodeBody} style={{ marginLeft: '1.25rem', width: '95%', borderLeft: '2px dashed #ddd', paddingLeft: '1rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                                                        {event.comments.map((comment) => (
                                                                            <div key={`comment-${comment.id}`} className={styles.commentCardFrame}>
                                                                                <div className={styles.commentCardMetaBar}>
                                                                                    <span className={`${styles.contextBadge} ${styles.warn}`}>
                                                                                        {SECTION_NAMES[String(comment.targetType || '').toUpperCase()] || comment.targetType}
                                                                                    </span>
                                                                                    {/* Removed Target Text entirely */}
                                                                                    <span className={styles.highContrastEntityText}>{comment.targetName}</span>
                                                                                </div>
                                                                                <blockquote className={styles.commentBlockquoteBox}>
                                                                                    "{comment.text}"
                                                                                </blockquote>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </React.Fragment>
                                                    ))}

                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {recordFile && (
                <PDFViewerModal
                    file={recordFile}
                    kind="Review record"
                    layer={1000}
                    onClose={() => {
                        if (recordFile.file_url?.startsWith('blob:')) URL.revokeObjectURL(recordFile.file_url);
                        setRecordFile(null);
                    }}
                />
            )}
        </div>
    );
};

export default Revisions;
