import React, { useState, useEffect } from "react";
import styles from '../styles/Revisions.module.sass';
import { fetchJson } from "../utils/api.js";
import { getSyllabusByCode } from '../data/syllabiData.js';

// Revisions Tracking modal (ported from the composition reference).
// Left: Course Details.  Right: "Revision Logs" timeline built from /api/revisions.
const Revisions = ({ isOpen, onClose, code }) => {
    if (!isOpen) return null;

    const [selectedSection, setSelectedSection] = useState('Course Details');
    const [details, setDetails] = useState(null);
    const [revisionsData, setRevisionsData] = useState([]);
    const [expanded, setExpanded] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!code) return;
        let mounted = true;

        (async () => {
            setLoading(true);
            // Course details (left) — API with static fallback so it is never blank.
            try {
                const d = await fetchJson('/api/course-details/' + encodeURIComponent(code));
                const s = getSyllabusByCode(code) || {};
                const pick = (a, b) => (a != null && String(a).trim() !== '') ? a : (b ?? '');
                if (mounted) setDetails({
                    code: pick(d.code, s.code || code), name: pick(d.name, s.name),
                    description: pick(d.description, s.description), credits: pick(d.credits, s.credits),
                    contact: pick(d.contact, s.contact), prerequisites: pick(d.prerequisites, s.prerequisites),
                    class: pick(d.class, s.class), cmo: pick(d.cmo, s.cmo),
                    revision: d.revision ?? s.revision ?? 0, year: pick(d.year, s.year), sem: pick(d.sem, s.sem),
                });
            } catch {
                const s = getSyllabusByCode(code) || {};
                if (mounted) setDetails({ code: s.code || code, name: s.name, description: s.description,
                    credits: s.credits, contact: s.contact, prerequisites: s.prerequisites, class: s.class,
                    cmo: s.cmo, revision: s.revision || 0, year: s.year, sem: s.sem });
            }

            // Revision timeline (right)
            try {
                const data = await fetchJson('/api/revisions/by-code/' + encodeURIComponent(code));
                const revs = Array.isArray(data?.revisions) ? data.revisions : [];
                if (mounted) { setRevisionsData(revs); setExpanded(revs[0]?.revNum ?? null); }
            } catch (err) {
                if (mounted) setRevisionsData([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [code]);

    const getIndicatorClass = (type) => {
        switch (String(type || '').toUpperCase()) {
            case "ASSIGNED": return styles.assigned;
            case "SUBMITTED": return styles.submitted;
            case "RETURNED": return styles.returned;
            case "ACCEPTED": return styles.accepted;
            case "APPROVED": return styles.approved;
            default: return "";
        }
    };
    const formatDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : "");

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <button className={styles.closeButton} onClick={onClose}>×</button>
                <h2 className={styles.previewTitle}>Revisions Tracking</h2>

                <div className={styles.splitContainer}>
                    {/* LEFT */}
                    <div className={styles.leftPreviewPane}>
                        <div className={styles.navi} style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                            <div className={styles['section-select']}>
                                <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                                    <option value="Course Details">Course Details</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles['dynamic-sections']} style={{ overflowY: 'auto', maxHeight: '72vh', paddingRight: '4px' }}>
                            {details && (() => {
                                const th = { border: '1px solid #000', padding: '8px 10px', textAlign: 'left', background: '#f2f2f2', width: 175, fontWeight: 600 };
                                const td = { border: '1px solid #000', padding: '8px 10px' };
                                const R = ({ l, v }) => (<tr><th style={th}>{l}</th><td style={td}>{v ?? ''}</td></tr>);
                                return (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                        <tbody>
                                            <tr>
                                                <th style={th}>Course No.</th>
                                                <td style={td}>{details.code}</td>
                                                <th style={{ ...th, width: 150, verticalAlign: 'top' }} rowSpan={10}>Course Description</th>
                                                <td style={{ ...td, verticalAlign: 'top' }} rowSpan={10}>{details.description}</td>
                                            </tr>
                                            <R l="Course Title" v={details.name} />
                                            <R l="Credit" v={details.credits} />
                                            <R l="Contact Hours/Week" v={details.contact} />
                                            <R l="Pre-requisites" v={details.prerequisites} />
                                            <R l="Classification/Field" v={details.class} />
                                            <R l="CMO" v={details.cmo} />
                                            <R l="Syllabus Revision No." v={details.revision} />
                                            <R l="Year Level" v={details.year} />
                                            <R l="Term" v={details.sem} />
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </div>
                    </div>

                    {/* RIGHT — Revision Logs timeline */}
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
                                    const isExpanded = expanded === rev.revNum;
                                    return (
                                        <div key={`rev-${rev.revNum}`} className={styles.accordionItem}>
                                            <div className={styles.accordionHeader} onClick={() => setExpanded(isExpanded ? null : rev.revNum)}>
                                                <div className={styles.accordionMetaInfo}>
                                                    <span className={styles.revLabelText}>Revision {rev.revNum}</span>
                                                </div>
                                                <span className={styles.toggleArrow}>{isExpanded ? "▲" : "▼"}</span>
                                            </div>

                                            <div className={`${styles.accordionContent} ${isExpanded ? styles.open : ""}`}>
                                                <div className={styles.timelineTrack}>
                                                    {(rev.timeline || []).map((event) => (
                                                        <React.Fragment key={`event-${event.id || Math.random()}`}>
                                                            <div className={styles.timelineNode}>
                                                                <div className={`${styles.circleIndicator} ${getIndicatorClass(event.type)}`}></div>
                                                                <div className={styles.timelineNodeBody}>
                                                                    <span className={styles.timelineMessageText}>
                                                                        <span className={styles.semiBoldText}>{event.actor}</span> {String(event.message || '').toLowerCase()} on <span className={styles.semiBoldText}>{formatDate(event.date)}</span>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {event.comments && event.comments.length > 0 && (
                                                                <div className={styles.timelineNode}>
                                                                    <div className={styles.timelineNodeBody} style={{ marginLeft: '1.25rem', width: '95%', borderLeft: '2px dashed #ddd', paddingLeft: '1rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                                                                        {event.comments.map((comment) => (
                                                                            <div key={`comment-${comment.id}`} className={styles.commentCardFrame}>
                                                                                <div className={styles.commentCardMetaBar}>
                                                                                    <span className={`${styles.contextBadge} ${styles.warn}`}>{comment.targetType}</span>
                                                                                    <span className={styles.highContrastEntityText}>{comment.targetName}</span>
                                                                                </div>
                                                                                <blockquote className={styles.commentBlockquoteBox}>"{comment.text}"</blockquote>
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
