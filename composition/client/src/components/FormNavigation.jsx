import React, { useState } from "react";
import {
    CheckCircle,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Activity,
    Bookmark,
    Layers
} from "react-feather";
import styles from "../styles/FormNavigation.module.sass";

const FormNavigation = ({
    goBack,
    onSave,
    currentStep,
    setStep,
    steps,
    weeks = [],
    activeWeekId,
    onSelectWeek,
    coNumber,
    coDescription = "",
    ilos = [],
    courseOutcomes = [],
    onSelectCourseOutcome,
    isOrientation = false,
    status = "",
    stepCommentCounts = [0, 0, 0],
    weekCommentCounts = {}
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!steps) {
        return (
            <div className={styles.navi}>
                <div onClick={goBack} className={styles.return} title="Return">
                    <ChevronLeft size={20} />
                </div>
                <div className="fill"></div>
                <div className={styles.save} onClick={onSave} style={{ cursor: "pointer" }}>
                    <CheckCircle size={20} /> &nbsp; Save
                </div>
            </div>
        );
    }

    const getContentIcon = (idx) => {
        if (idx === 0) return <BookOpen size={14} className={styles.tabIcon} />;
        if (idx === 1) return <Activity size={14} className={styles.tabIcon} />;
        return <Bookmark size={14} className={styles.tabIcon} />;
    };

    const fallbackWeeks = isOrientation ? [1] : [1, 2, 3, 4];
    const isReturned = String(status).toLowerCase() === "returned";

    // Calculate unresolved comment count for a specific week
    const getWeekUnresolvedCount = (week) => {
        if (!isReturned || !week) return 0;
        const wid = Number(week.week_id);
        if (wid === Number(activeWeekId)) {
            const liveTotal = (stepCommentCounts || []).reduce((acc, n) => acc + (Number(n) || 0), 0);
            if (liveTotal > 0 || weekCommentCounts[wid] !== undefined) {
                return liveTotal;
            }
        }
        if (weekCommentCounts && weekCommentCounts[wid] !== undefined) {
            return Number(weekCommentCounts[wid]?.total) || 0;
        }
        return Number(week.unresolvedComments?.total) || 0;
    };

    // Calculate unresolved comment count for a Course Outcome pill
    const getCoUnresolvedCount = (co) => {
        if (!isReturned || !co) return 0;
        if (Array.isArray(co.weeks) && co.weeks.length > 0) {
            return co.weeks.reduce((sum, w) => sum + getWeekUnresolvedCount(w), 0);
        }
        return Number(co.unresolvedTotal) || 0;
    };

    return (
        <div className={`${styles.navi} ${isExpanded ? styles.naviExpanded : ""}`}>
            <button
                type="button"
                onClick={goBack}
                className={`${styles.return} ${isExpanded ? styles.returnHidden : ""}`}
                title="Return to Section"
                tabIndex={isExpanded ? -1 : 0}
                aria-hidden={isExpanded}
            >
                <ChevronLeft size={20} />
            </button>

            <div className={`${styles.plannerBar} ${isExpanded ? styles.plannerBarExpanded : ""}`}>
                {/* Top Navigation Row: CO Toggler, CO Switcher (when expanded), Weeks, and Content Tabs */}
                <div className={styles.plannerTopRow}>
                    <div className={styles.calendarSection}>
                        {/* Recognizable CO # Toggler Button */}
                        <button
                            type="button"
                            className={`${styles.coToggleBtn} ${isExpanded ? styles.coToggleBtnActive : ""}`}
                            onClick={() => setIsExpanded(prev => !prev)}
                            title={isExpanded ? "Click to collapse Course Outcome & ILO details" : "Click to expand Course Outcome & ILO details"}
                        >
                            <Layers size={14} className={styles.calendarIcon} />
                            <span className={styles.coBadgeText}>
                                {isOrientation
                                    ? "Course Orientation"
                                    : (coNumber ? `CO ${coNumber}` : "Schedule")}
                            </span>
                            <span className={styles.coToggleChevron}>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </span>
                        </button>

                        {/* Course Outcome Number Selector (in Expanded Mode for switching COs) */}
                        {isExpanded && !isOrientation && courseOutcomes.length > 1 && (
                            <div className={styles.coSelectorGroup} role="group" aria-label="Select Course Outcome">
                                {courseOutcomes.map((co) => {
                                    const isCurrentCo = Number(co.coNumber) === Number(coNumber);
                                    const coUnresolved = getCoUnresolvedCount(co);
                                    return (
                                        <button
                                            key={co.co_id || co.coNumber}
                                            type="button"
                                            className={`${styles.coSwitchBtn} ${isCurrentCo ? styles.coSwitchBtnActive : ""} ${coUnresolved > 0 ? styles.coSwitchBtnHasComment : ""}`}
                                            onClick={() => onSelectCourseOutcome && onSelectCourseOutcome(co)}
                                            title={`Switch to Course Outcome ${co.coNumber}${coUnresolved > 0 ? ` (${coUnresolved} unresolved comment${coUnresolved > 1 ? 's' : ''})` : ''}`}
                                        >
                                            <span>CO {co.coNumber}</span>
                                            {coUnresolved > 0 && <span className={styles.coSwitchCommentDot} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className={styles.weekNotepadGroup}>
                            {weeks.length > 0 ? (
                                weeks.map((week, idx) => {
                                    const weekNum = week.weekNumber || idx + 1;
                                    const isActive = Number(week.week_id) === Number(activeWeekId);
                                    const weekUnresolved = getWeekUnresolvedCount(week);
                                    const hasComments = weekUnresolved > 0;

                                    return (
                                        <button
                                            key={week.week_id || idx}
                                            type="button"
                                            className={`${styles.weekNotepadBtn} ${isActive ? styles.activeWeekBtn : ""} ${hasComments ? styles.hasCommentWeekBtn : ""}`}
                                            onClick={() => onSelectWeek && onSelectWeek(week.week_id)}
                                            title={
                                                isOrientation
                                                    ? `Course Orientation • Week 1 (${week.hours || 2} hrs Lecture Session)`
                                                    : (week.globalWeekNumber
                                                        ? `CO ${coNumber || ""} • Week ${weekNum} (Course Week ${week.globalWeekNumber} • ${week.hours || 5} hrs)${hasComments ? ` — ${weekUnresolved} unresolved comment(s)` : ""}`
                                                        : `Week ${weekNum}`)
                                            }
                                        >
                                            <span className={styles.notepadBinding} />
                                            <span className={styles.weekSmallTag}>WEEK</span>
                                            <span className={styles.weekNumText}>{weekNum}</span>
                                            {hasComments && (
                                                <span className={styles.weekCommentBadge} title={`${weekUnresolved} unresolved comment(s)`}>
                                                    {weekUnresolved}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                fallbackWeeks.map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        className={`${styles.weekNotepadBtn} ${num === 1 ? styles.activeWeekBtn : ""}`}
                                    >
                                        <span className={styles.notepadBinding} />
                                        <span className={styles.weekSmallTag}>WEEK</span>
                                        <span className={styles.weekNumText}>{num}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className={styles.barDivider} />

                    {/* Non-Sequential Content Selector Tabs with Comment Badges */}
                    <div className={styles.contentSelectorGroup}>
                        {steps.map((stepLabel, idx) => {
                            const isActive = idx === currentStep;
                            const badgeCount = isReturned ? (Number(stepCommentCounts[idx]) || 0) : 0;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`${styles.contentTabBtn} ${isActive ? styles.activeContentTab : ""} ${badgeCount > 0 ? styles.contentTabHasComment : ""}`}
                                    onClick={() => setStep(idx)}
                                >
                                    {getContentIcon(idx)}
                                    <span>{stepLabel}</span>
                                    {badgeCount > 0 && (
                                        <span className={styles.contentCommentBadge}>
                                            {badgeCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Animated Expandable Course Outcome & ILO Details Panel */}
                <div className={`${styles.expandableCollapseWrapper} ${isExpanded ? styles.expandableCollapseOpen : ""}`}>
                    <div className={styles.expandableCollapseInner}>
                        <div className={styles.expandedDivider} />
                        <div className={styles.outcomesDetailsPanel}>
                            <div className={styles.coSummaryBlock}>
                                <p className={styles.coSummaryText}>
                                    {coDescription || "No course outcome description available."}
                                </p>
                            </div>

                            <div
                                className={styles.iloGridBlocks}
                                style={{
                                    gridTemplateColumns: ilos.length === 1
                                        ? "1fr"
                                        : `repeat(${Math.min(Math.max(ilos.length, 3), 4)}, minmax(0, 1fr))`
                                }}
                            >
                                {ilos.length > 0 ? (
                                    ilos.map((ilo, idx) => (
                                        <div key={ilo.ilo_id || idx} className={styles.iloDetailCard}>
                                            <div className={styles.iloCardHeader}>
                                                <span className={styles.iloBadgePill}>
                                                    {isOrientation ? "ORIENTATION ILO" : `ILO ${idx + 1}`}
                                                </span>
                                                {ilo.assessment_tool && (
                                                    <span className={styles.iloAssessmentTag} title={ilo.assessment_tool}>
                                                        {ilo.assessment_tool}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={styles.iloDescriptionText}>
                                                {ilo.description}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.iloDetailCard}>
                                        <p className={styles.iloDescriptionText}>No Intended Learning Outcomes found for this Course Outcome.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="button"
                className={`${styles.save} ${isExpanded ? styles.saveHidden : ""}`}
                onClick={onSave}
                tabIndex={isExpanded ? -1 : 0}
                aria-hidden={isExpanded}
            >
                <CheckCircle size={18} />
                <span>Save</span>
            </button>
        </div>
    );
};

export default FormNavigation;
