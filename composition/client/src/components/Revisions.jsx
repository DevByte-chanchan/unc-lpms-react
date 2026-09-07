import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchJson } from "../utils/api";
import styles from '../styles/Revisions.module.sass';
import stylesB from "../styles/SyllabusPreview.module.sass";

import CourseDetails from "./CourseDetails";
import OutcomeAlignment from './OutcomeAlignment';
import CourseCoverage from "./CourseCoverage";
import ReferenceSummary from "./ReferenceSummary";
import CriteriaForGrading from "./CriteriaForGrading";

const Revisions = ({ isOpen, onClose, pcId: propPcId, revNum: propRevNum }) => {
    if (!isOpen) return null;

    const { status, revNum: paramRevNum, pcId: paramPcId } = useParams();

    const currentPcId = propPcId || paramPcId;
    const initialRevNum = Number(propRevNum || paramRevNum || 2);

    const [selectedRevNum, setSelectedRevNum] = useState(initialRevNum);
    const [activePcId, setActivePcId] = useState(Number(currentPcId));
    const [expandedAccordion, setExpandedAccordion] = useState(initialRevNum);
    const [selectedSection, setSelectedSection] = useState('Course Details');

    const [revisionsData, setRevisionsData] = useState([]);
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

    const handleAccordionToggle = (revNum, pcId) => {
        setExpandedAccordion(expandedAccordion === revNum ? null : revNum);
        setSelectedRevNum(revNum);
        if (pcId) setActivePcId(Number(pcId));
    };

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

    const formatDate = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toISOString().split('T')[0];
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <button className={styles.closeButton} onClick={onClose}>×</button>
                <h2 className={styles.previewTitle}>Revisions Tracking</h2>

                <div className={styles.splitContainer}>
                    {/* LEFT SECTION */}
                    <div className={styles.leftPreviewPane}>
                        <div className={styles.navi} style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                            <div className={styles['section-select']}>
                                <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                                    <option value="Course Details">Course Details</option>
                                    <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                                    <option value="Course Coverage">Course Coverage</option>
                                    <option value="References Summary">References Summary</option>
                                    <option value="Criteria for Grading">Criteria for Grading</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles['dynamic-sections']} style={{ overflowY: 'auto', maxHeight: '72vh', paddingRight: '4px' }}>
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
                                    const isExpanded = expandedAccordion === rev.revNum;
                                    const revStatus = rev?.status || "UNKNOWN";
                                    const statusClass = styles[revStatus.toLowerCase()] || '';

                                    return (
                                        <div key={`rev-${rev.revNum}`} className={styles.accordionItem}>

                                            {/* Accordion Header */}
                                            <div className={styles.accordionHeader} onClick={() => handleAccordionToggle(rev.revNum, rev.pcId)}>
                                                <div className={styles.accordionMetaInfo}>
                                                    <span className={styles.revLabelText}>Revision {rev.revNum}</span>
                                                    {/*<span className={`${styles.statusMiniTag} ${statusClass}`}>{revStatus}</span>*/}
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
                                                                    <span className={styles.timelineMessageText}>
                                                                        {/* Added semibold class applied directly to actor and date */}
                                                                        <span className={styles.semiBoldText}>{event.actor}</span> {event.message.toLowerCase()} on <span className={styles.semiBoldText}>{formatDate(event.date)}</span>
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
                                                                                        {comment.targetType}
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
        </div>
    );
};

export default Revisions;