import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { X } from "react-feather";
import Select from "./Select.jsx";
import { fetchJson } from "../utils/api";
import styles from '../styles/Revisions.module.sass';
import stylesB from "../styles/SyllabusPreview.module.sass";

import CourseDetails from "./CourseDetails";
import OutcomeAlignment from './OutcomeAlignment';
import CourseCoverage from "./CourseCoverage";
import ReferenceSummary from "./ReferenceSummary";
import CriteriaForGrading from "./CriteriaForGrading";

const Revisions = ({ isOpen, onClose, pcId: propPcId, revNum: propRevNum }) => {
    const { status, revNum: paramRevNum, pcId: paramPcId } = useParams();

    const currentPcId = propPcId || paramPcId;
    const initialRevNum = Number(propRevNum || paramRevNum || 2);

    const [selectedRevNum, setSelectedRevNum] = useState(initialRevNum);
    const [activePcId, setActivePcId] = useState(Number(currentPcId));
    const [expandedAccordion, setExpandedAccordion] = useState(Number(currentPcId));
    const [selectedSection, setSelectedSection] = useState('Course Details');

    const [revisionsData, setRevisionsData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !currentPcId) return;
        const loadRevisions = async () => {
            try {
                setLoading(true);
                const data = await fetchJson(`/api/revisions/${currentPcId}`);
                const revs = Array.isArray(data?.revisions) ? data.revisions : [];
                setRevisionsData(revs);
                if (revs.length > 0) {
                    const currentMatch = revs.find(r => Number(r.pcId) === Number(currentPcId)) || revs[0];
                    setExpandedAccordion(Number(currentMatch.pcId));
                    setActivePcId(Number(currentMatch.pcId));
                    setSelectedRevNum(Number(currentMatch.revNum));
                }
            } catch (err) {
                console.error("Failed to load live revisions:", err);
                setRevisionsData([]);
            } finally {
                setLoading(false);
            }
        };
        loadRevisions();
    }, [isOpen, currentPcId]);

    if (!isOpen) return null;

    const handleAccordionToggle = (revNum, pcId) => {
        const numericPcId = Number(pcId);
        setExpandedAccordion(expandedAccordion === numericPcId ? null : numericPcId);
        setSelectedRevNum(revNum);
        if (pcId) setActivePcId(numericPcId);
    };

    const getIndicatorClass = (type) => {
        const safeType = (type || '').toUpperCase();
        switch (safeType) {
            case "ASSIGNED": return styles.assigned;
            case "SUBMITTED": return styles.submitted;
            case "RETURNED": return styles.returned;
            case "ACCEPTED": return styles.accepted;
            case "APPROVED": return styles.approved;
            case "SUGGEST": return styles.suggest;
            default: return "";
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.previewHeader}>
                    <h2 className={styles.previewTitle}>Revisions Tracking</h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close revisions"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.splitContainer}>
                    {/* LEFT SECTION */}
                    <div className={styles.leftPreviewPane}>
                        <div className={styles.navi}>
                            <div className={styles['section-select']}>
                                <Select
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    aria-label="Revision section"
                                    size="lg"
                                    block
                                >
                                    <option value="Course Details">Course Details</option>
                                    <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                                    <option value="Course Coverage">Course Coverage</option>
                                    <option value="References Summary">References Summary</option>
                                    <option value="Criteria for Grading">Criteria for Grading</option>
                                </Select>
                            </div>
                        </div>

                        <div className={styles['dynamic-sections']}>
                            {selectedSection === 'Course Details' && (
                                <CourseDetails isReadOnly={true} offeringID={activePcId} revisionNum={selectedRevNum} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                            {selectedSection === 'Course and Program Outcome Alignment' && (
                                <OutcomeAlignment isReadOnly={true} offeringID={activePcId} revisionNum={selectedRevNum} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                            {selectedSection === 'Course Coverage' && (
                                <CourseCoverage offeringID={activePcId} revisionNum={selectedRevNum} status={status} selectedSection={selectedSection} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                            {selectedSection === 'References Summary' && (
                                <ReferenceSummary offeringID={activePcId} revisionNum={selectedRevNum} status={status} selectedSection={selectedSection} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                            {selectedSection === 'Criteria for Grading' && (
                                <CriteriaForGrading isReadOnly={true} offeringID={activePcId} revisionNum={selectedRevNum} status={status} styles={styles} stylesB={stylesB} fetchJson={fetchJson} />
                            )}
                        </div>
                    </div>

                    {/* RIGHT SECTION (TIMELINE) */}
                    <div className={styles.rightLedgerPane}>
                        <div className={styles.titleBorder}>
                            <div className={styles.sidebarTitle}>Revision Logs</div>
                        </div>

                        <div className={styles.accordionStack}>
                            {loading ? (
                                <div style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>Loading history...</div>
                            ) : revisionsData.length === 0 ? (
                                <div style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>No revision history available.</div>
                            ) : (
                                revisionsData.map((rev) => {
                                    const isExpanded = expandedAccordion === Number(rev.pcId);
                                    const revStatus = rev?.status || "UNKNOWN";
                                    const statusClass = styles[revStatus.toLowerCase()] || '';

                                    return (
                                        <div key={`rev-${rev.pcId}-${rev.revNum}`} className={styles.accordionItem}>

                                            {/* Accordion Header */}
                                            <div className={styles.accordionHeader} onClick={() => handleAccordionToggle(rev.revNum, rev.pcId)}>
                                                <div className={styles.accordionMetaInfo}>
                                                    <span className={styles.revLabelText}>
                                                        Revision {rev.revNum} {rev.termLabel ? `• ${rev.termLabel}` : ''} ({revStatus})
                                                    </span>
                                                </div>
                                                <span className={styles.toggleArrow}>{isExpanded ? "▲" : "▼"}</span>
                                            </div>

                                            {/* Accordion Content */}
                                            <div className={`${styles.accordionContent} ${isExpanded ? styles.open : ""}`}>
                                                <div className={styles.timelineTrack}>

                                                    {(rev.timeline || []).map((event) => (
                                                        <React.Fragment key={`event-${event.id || Math.random()}`}>
                                                            {/* Standard Event Line */}
                                                            <div className={styles.timelineNode}>
                                                                <div className={`${styles.circleIndicator} ${getIndicatorClass(event.type)}`}></div>
                                                                <div className={styles.timelineNodeBody}>
                                                                    <div className={styles.eventCard}>
                                                                        <div className={styles.eventHeaderRow}>
                                                                            <div className={styles.actorMetaGroup}>
                                                                                <span className={styles.actorNameText}>
                                                                                    {event.actorName || event.actor}
                                                                                </span>
                                                                                {event.actorRole && (
                                                                                    <span className={styles.actorRoleSubtext}>
                                                                                        {event.actorRole}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {event.actionLabel && (
                                                                                <span className={`${styles.actionStatusPill} ${getIndicatorClass(event.type)}`}>
                                                                                    {event.actionLabel}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className={styles.timelineMessageText}>
                                                                            {event.message}
                                                                        </p>
                                                                        <div className={styles.eventFooterRow}>
                                                                            <span className={styles.eventDateText}>
                                                                                {formatDate(event.date)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Comments directly attached underneath RETURNED events */}
                                                            {event.comments && event.comments.length > 0 && (
                                                                <div className={styles.timelineNode}>
                                                                    <div className={styles.timelineNodeBody} style={{ marginLeft: '1.25rem', width: '95%', borderLeft: '2px dashed #ddd', paddingLeft: '1rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                                                        {event.comments.map((comment) => (
                                                                            <div key={`comment-${comment.id}`} className={styles.commentCardFrame}>
                                                                                <div className={styles.commentCardMetaBar}>
                                                                                    <span className={styles.highContrastEntityText}>{comment.targetName}</span>
                                                                                    <span className={`${styles.contextBadge} ${(event.type || '').toUpperCase() === 'SUGGEST' ? styles.suggestBadge : styles.warn}`}>
                                                                                        {comment.targetType}
                                                                                    </span>
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
        </div>
    );
};

export default Revisions;
