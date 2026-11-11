import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, AlertTriangle } from 'react-feather';
import styles from '../styles/Dashboard.module.sass';
import { fmtDate, formatSemester } from '../services/periodLabel.js';
import {
    manilaToday,
    termWeeks,
    termProgress,
    progressText,
    calendarRows,
    nextCalendarDate,
    calendarChecks,
} from '../services/termCalendar.js';

const CurrentTermCard = ({ term, loading }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const today = manilaToday();

    if (loading) {
        return (
            <div className={styles.termCard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: '#64748B', fontSize: 13 }}>Loading current term...</div>
            </div>
        );
    }

    if (!term) {
        return (
            <div className={styles.termCard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A' }}>No active term</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>No current academic term set.</div>
                </div>
            </div>
        );
    }

    const weeksCount = termWeeks(term);
    const progress = termProgress(term, today);
    const pText = progressText(progress);
    const pct = progress ? Math.round(progress.ratio * 100) : 0;
    const nextDate = nextCalendarDate(term, today);
    const rows = calendarRows(term, today);
    const checks = calendarChecks(term);

    return (
        <div className={styles.termCard}>
            {/* ── COLLAPSED STATE ── */}
            {!isExpanded && (
                <>
                    <div className={styles.eyebrow}>Current Term</div>
                    <div className={styles.collapsedHero}>
                        <div className={styles.yearText}>{term.school_year}</div>
                        <div className={styles.semesterText}>{formatSemester(term.semester)}</div>

                        {nextDate && (
                            <div className={styles.nextDateLine}>
                                Next: <strong>{nextDate.label}</strong> · {fmtDate(nextDate.day)}{' '}
                                <span title={nextDate.hint}>({nextDate.hint})</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className={styles.expandBtn}
                        onClick={() => setIsExpanded(true)}
                        title="Show details"
                        aria-label="Expand term details"
                    >
                        <ChevronDown size={22} color="#0F172A" strokeWidth={2.5} />
                    </button>
                </>
            )}

            {/* ── EXPANDED STATE ── */}
            {isExpanded && (
                <>
                    <button
                        type="button"
                        className={styles.collapseBtn}
                        onClick={() => setIsExpanded(false)}
                        title="Hide details"
                        aria-label="Collapse term details"
                    >
                        <ChevronUp size={22} color="#0F172A" strokeWidth={2.5} />
                    </button>

                    <div className={styles.divider} />

                    <div className={styles.expandedScrollContent}>
                        {/* Progress Strip */}
                        {progress && pText && (
                            <div className={styles.progressBlock}>
                                <div className={styles.progressHeader}>
                                    <strong>{pText.strong}</strong>
                                    {pText.rest && <> · {pText.rest}</>}
                                </div>
                                <div
                                    className={styles.progressBarOuter}
                                    role="progressbar"
                                    aria-valuenow={pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                >
                                    <div className={styles.progressBarInner} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Semester Duration */}
                        <div className={styles.detailRowGroup}>
                            <div className={styles.detailLabel}>
                                <Calendar size={12} /> Semester Duration
                            </div>
                            <div className={styles.detailValue}>
                                {fmtDate(term.start_date)} &nbsp;—&nbsp; {fmtDate(term.end_date)}
                                {weeksCount != null && <span> · {weeksCount} weeks</span>}
                            </div>
                        </div>

                        {/* School Calendar */}
                        <div className={styles.detailRowGroup}>
                            <div className={styles.detailLabel}>
                                <Calendar size={12} /> School Calendar
                            </div>
                            <ol aria-label="School calendar" className={styles.timelineList}>
                                {rows.map((r, i) => {
                                    const isNext = r.state === 'next';
                                    const muted = r.state === 'done' || r.state === 'unset';
                                    const dotColor = isNext ? '#0F172A' : r.state === 'upcoming' ? '#64748B' : '#CBD5E1';

                                    return (
                                        <li key={r.key} className={styles.timelineItem}>
                                            {i < rows.length - 1 && <span aria-hidden="true" className={styles.timelineConnector} />}
                                            <span
                                                aria-hidden="true"
                                                className={styles.timelineDot}
                                                style={{
                                                    background: dotColor,
                                                    boxShadow: isNext ? '0 0 0 3px #E2E8F0' : 'none',
                                                }}
                                            />
                                            <div className={styles.timelineItemContent}>
                                                <span
                                                    className={styles.timelineLabel}
                                                    style={{
                                                        fontWeight: isNext ? 700 : 500,
                                                        color: muted ? '#64748B' : '#0F172A',
                                                    }}
                                                >
                                                    {r.label}
                                                    {isNext && <span className={styles.nextChip}>Next</span>}
                                                </span>

                                                {r.state === 'unset' ? (
                                                    <span className={styles.timelineUnset}>Not set</span>
                                                ) : (
                                                    <span className={styles.timelineDateText}>
                                                        <span style={{ color: muted ? '#64748B' : '#0F172A' }}>
                                                            {fmtDate(r.day)}
                                                        </span>
                                                        <span className={styles.timelineHint}>
                                                            ({r.hint})
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>

                        {/* Calendar warning checks if any */}
                        {checks.length > 0 && (
                            <div role="note" className={styles.calendarChecksNote}>
                                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                                <div>
                                    {checks.map((l) => (
                                        <div key={l}>{l}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CurrentTermCard;
