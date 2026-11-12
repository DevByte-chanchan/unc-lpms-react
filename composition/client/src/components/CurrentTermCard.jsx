import React, { useState } from 'react';
import { Calendar, RotateCw, CheckCircle, Clock, AlertTriangle } from 'react-feather';
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
    const [isFlipped, setIsFlipped] = useState(false);
    const today = manilaToday();

    if (loading) {
        return (
            <div className={styles.termCardLoading}>
                <div className={styles.loadingText}>Loading current term...</div>
            </div>
        );
    }

    if (!term) {
        return (
            <div className={styles.termCardLoading}>
                <div className={styles.noTermTitle}>No active term</div>
                <div className={styles.noTermSub}>No current academic term set.</div>
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

    // Days left label for badge
    const daysLeftText = progress?.daysLeft != null
        ? (progress.daysLeft === 0 ? 'Last day' : `${progress.daysLeft} days left`)
        : (pText?.rest || null);

    return (
        <div className={styles.flipCardContainer}>
            <div className={`${styles.flipCardInner} ${isFlipped ? styles.isFlipped : ''}`}>
                {/* ════════════ FRONT FACE: CURRENT TERM ════════════ */}
                <div className={`${styles.cardFace} ${styles.cardFront}`}>
                    {/* Desk Calendar Binder Rings & Punch Holes */}
                    <div className={styles.binderRingLeft} />
                    <div className={styles.binderHoleLeft} />
                    <div className={styles.binderRingRight} />
                    <div className={styles.binderHoleRight} />

                    {/* Top Calendar Header Strip */}
                    <div className={styles.calendarHeaderStrip}>
                        <div className={styles.headerTitleGroup}>
                            <Calendar size={14} className={styles.headerCalendarIcon} />
                            <span className={styles.headerTitle}>Current Term</span>
                        </div>
                        {term.status === 'Active' && (
                            <div className={styles.activePill}>
                                <span className={styles.activeDot} />
                                <span>Active</span>
                            </div>
                        )}
                    </div>

                    {/* Front Face Body with Dot-Grid Texture */}
                    <div className={styles.frontBody}>
                        <div className={styles.centerpiece}>
                            <div className={styles.termYear}>{term.school_year}</div>
                            <div className={styles.semesterPill}>
                                {formatSemester(term.semester)}
                            </div>
                        </div>

                        <div className={styles.frontBottom}>
                            {nextDate && (
                                <div className={styles.nextMilestoneBox}>
                                    <div className={styles.nextMilestoneEyebrow}>
                                        <Clock size={12} />
                                        <span>Upcoming Milestone</span>
                                    </div>
                                    <div className={styles.nextMilestoneText}>
                                        Next: <strong>{nextDate.label}</strong> · {fmtDate(nextDate.day)}{' '}
                                        <span className={styles.nextHint}>({nextDate.hint})</span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                className={styles.flipBtnFront}
                                onClick={() => setIsFlipped(true)}
                                title="View School Calendar"
                                aria-label="View School Calendar"
                            >
                                <RotateCw size={14} className={styles.flipIcon} />
                                <span>View School Calendar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ════════════ BACK FACE: SCHOOL CALENDAR ════════════ */}
                <div className={`${styles.cardFace} ${styles.cardBack}`}>
                    {/* Desk Calendar Binder Rings & Punch Holes */}
                    <div className={styles.binderRingLeft} />
                    <div className={styles.binderHoleLeft} />
                    <div className={styles.binderRingRight} />
                    <div className={styles.binderHoleRight} />

                    {/* Top Header Strip */}
                    <div className={styles.calendarHeaderStrip}>
                        <div className={styles.headerTitleGroup}>
                            <Calendar size={14} className={styles.headerCalendarIcon} />
                            <span className={styles.headerTitle}>School Calendar</span>
                        </div>
                        <button
                            type="button"
                            className={styles.flipBtnBack}
                            onClick={() => setIsFlipped(false)}
                            title="Back to Term"
                            aria-label="Back to Term"
                        >
                            <RotateCw size={12} className={styles.flipIcon} />
                            <span>Back to Term</span>
                        </button>
                    </div>

                    {/* Back Face Scrollable Content */}
                    <div className={styles.calendarScrollArea}>
                        {/* Term Progress & Duration Summary Card */}
                        <div className={styles.progressSummaryCard}>
                            <div className={styles.progressHeaderRow}>
                                <span className={styles.progressWeekText}>
                                    {pText?.strong || (progress?.week ? `Week ${progress.week} of ${progress.weeks}` : 'Term Progress')}
                                </span>
                                {daysLeftText && (
                                    <span className={styles.daysLeftBadge}>
                                        {daysLeftText}
                                    </span>
                                )}
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

                            <div className={styles.summaryHairline} />

                            <div className={styles.durationRow}>
                                <div className={styles.durationLabel}>
                                    <Calendar size={12} />
                                    <span>Semester Duration</span>
                                </div>
                                <div className={styles.durationValue}>
                                    {fmtDate(term.start_date)} &nbsp;—&nbsp; {fmtDate(term.end_date)}
                                    {weeksCount != null && (
                                        <span className={styles.durationWeeks}> · {weeksCount} weeks</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Milestone Timeline */}
                        <div className={styles.timelineSection}>
                            <ol aria-label="School calendar milestones" className={styles.milestoneList}>
                                {rows.map((r, i) => {
                                    const isNext = r.state === 'next';
                                    const isDone = r.state === 'done';
                                    const isUnset = r.state === 'unset';
                                    const isUpcoming = r.state === 'upcoming';
                                    const isLast = i === rows.length - 1;

                                    if (isNext) {
                                        return (
                                            <li key={r.key} className={styles.milestoneItemStandout}>
                                                {!isLast && <span aria-hidden="true" className={styles.milestoneConnector} />}
                                                <div className={styles.milestoneMarkerCol}>
                                                    <span className={styles.nextDotPulse} />
                                                </div>
                                                <div className={styles.standoutCard}>
                                                    <div className={styles.standoutHeader}>
                                                        <span className={styles.standoutLabel}>{r.label}</span>
                                                        <span className={styles.standoutNextBadge}>Next</span>
                                                    </div>
                                                    <div className={styles.standoutDateRow}>
                                                        <strong>{fmtDate(r.day)}</strong>
                                                        {r.hint && (
                                                            <span className={styles.standoutHint}> · {r.hint}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    }

                                    return (
                                        <li
                                            key={r.key}
                                            className={`${styles.milestoneItem} ${isDone ? styles.milestoneDone : ''}`}
                                        >
                                            {!isLast && <span aria-hidden="true" className={styles.milestoneConnector} />}
                                            <div className={styles.milestoneMarkerCol}>
                                                {isDone ? (
                                                    <CheckCircle size={15} className={styles.doneCheckIcon} />
                                                ) : (
                                                    <span className={styles.milestoneDot} />
                                                )}
                                            </div>
                                            <div className={styles.milestoneBody}>
                                                <div className={styles.milestoneTextCol}>
                                                    <span className={styles.milestoneLabel}>{r.label}</span>
                                                    {isUnset ? (
                                                        <span className={styles.unsetItalic}>Not set</span>
                                                    ) : (
                                                        <span className={styles.milestoneDateText}>
                                                            {fmtDate(r.day)}
                                                            {isUpcoming && r.hint && (
                                                                <span className={styles.timelineHint}> ({r.hint})</span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                {isDone && <span className={styles.doneTag}>Done</span>}
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
                </div>
            </div>
        </div>
    );
};

export default CurrentTermCard;
