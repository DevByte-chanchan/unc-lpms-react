import React, { useState } from "react";
import {
    CheckCircle,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Activity,
    Bookmark,
    Layers,
    RotateCcw
} from "react-feather";
import styles from "../styles/FormNavigation.module.sass";

const PushPinIcon = () => (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3l5 5-2 2-3-1-4 4 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 4-4-1-3 2-2z" />
    </svg>
);

const getFallbackPeriodInfo = (coNumber, totalCos = 4) => {
    const n = Number(coNumber);
    if (!Number.isFinite(n) || n <= 0) {
        return { short: 'Orientation', label: 'Course Orientation' };
    }
    if (totalCos <= 2) {
        return n === 1
            ? { short: 'Midterm', label: 'Midterm' }
            : { short: 'Final', label: 'Final' };
    }
    if (totalCos === 3) {
        const map3 = {
            1: { short: 'Prelim', label: 'Prelim' },
            2: { short: 'Midterm', label: 'Midterm' },
            3: { short: 'Final', label: 'Final' }
        };
        return map3[n] || { short: `Period ${n}`, label: `Period ${n}` };
    }
    const map4 = {
        1: { short: 'Prelim', label: 'Prelim' },
        2: { short: 'Midterm', label: 'Midterm' },
        3: { short: 'Semi-Final', label: 'Semi-Final' },
        4: { short: 'Final', label: 'Final' }
    };
    return map4[n] || { short: `Period ${n}`, label: `Period ${n}` };
};

const stripTermSuffix = (val) => String(val || '').replace(/\s+term$/i, '').trim();

const FormNavigation = ({
    goBack,
    onSave,
    currentStep,
    setStep,
    steps,
    pinnedSteps,
    onTogglePin,
    onOpenImportPrevious,
    weeks = [],
    activeWeekId,
    onSelectWeek,
    coNumber,
    coDescription = "",
    periodLabel = "",
    ilos = [],
    courseOutcomes = [],
    onSelectCourseOutcome,
    isOrientation = false,
    status = "",
    stepCommentCounts = [0, 0, 0],
    weekCommentCounts = {},
    isSaveDisabled = false,
    saveDisabledReason = "",
    blockedUnpinStep = null
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

    const isMultiPinMode = Array.isArray(pinnedSteps);
    const totalNonOrientationCos = courseOutcomes.filter(co => !(co.isOrientation || Number(co.coNumber) === 0)).length || 4;
    const resolvedPeriodLabel = stripTermSuffix(periodLabel) || getFallbackPeriodInfo(coNumber, totalNonOrientationCos).label;

    const getContentIcon = (idx) => {
        if (idx === 0) return <BookOpen size={14} className={styles.tabIcon} />;
        if (idx === 1) return <Activity size={14} className={styles.tabIcon} />;
        return <Bookmark size={14} className={styles.tabIcon} />;
    };

    const getFallbackWeeks = (coNum, orient) => {
        if (orient) return [1];
        const n = Number(coNum) || 1;
        if (n === 1) return [1, 2, 3, 4];
        if (n === 2) return [5, 6, 7, 8];
        if (n === 3) return [10, 11, 12, 13];
        if (n === 4) return [14, 15, 16, 17];
        const start = n <= 2 ? (n - 1) * 4 + 1 : (n - 1) * 4 + 2;
        return [start, start + 1, start + 2, start + 3];
    };
    const fallbackWeeks = getFallbackWeeks(coNumber, isOrientation);
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

    const handleContentBtnClick = (idx) => {
        if (isMultiPinMode && onTogglePin) {
            onTogglePin(idx);
        } else if (setStep) {
            setStep(idx);
        }
    };

    const handleSaveClick = () => {
        if (isSaveDisabled) return;
        if (onSave) onSave();
    };

    const saveTooltip = isSaveDisabled
        ? (saveDisabledReason || "Resolve all column validation issues before saving")
        : "Save weekly content";

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
                {/* Top Navigation Row: CO Toggler, CO Switcher (when expanded), Weeks, and Left-Aligned Content Pins */}
                <div className={styles.plannerTopRow}>
                    <div className={styles.calendarSection}>
                        {/* Recognizable CO # + Examination Period Toggler Button (COMP-007) */}
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
                                    : (coNumber ? `CO ${coNumber} — ${resolvedPeriodLabel}` : "Schedule")}
                            </span>
                            <span className={styles.coToggleChevron}>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </span>
                        </button>

                        {/* Course Outcome Number Selector (in Expanded Mode for switching COs) */}
                        {isExpanded && courseOutcomes.length > 1 && (
                            <div className={styles.coSelectorGroup} role="group" aria-label="Select Course Outcome">
                                {courseOutcomes.map((co) => {
                                    const coIsOrientation = Boolean(co.isOrientation || Number(co.coNumber) === 0);
                                    const isCurrentCo = coIsOrientation
                                        ? Boolean(isOrientation)
                                        : (!isOrientation && Number(co.coNumber) === Number(coNumber));
                                    const coUnresolved = getCoUnresolvedCount(co);
                                    const coPeriodShort = stripTermSuffix(co.periodShort) || getFallbackPeriodInfo(co.coNumber, totalNonOrientationCos).short;
                                    const coPeriodFull = stripTermSuffix(co.periodLabel) || getFallbackPeriodInfo(co.coNumber, totalNonOrientationCos).label;
                                    return (
                                        <button
                                            key={coIsOrientation ? "co-orientation" : (co.co_id || co.coNumber)}
                                            type="button"
                                            className={`${styles.coSwitchBtn} ${isCurrentCo ? styles.coSwitchBtnActive : ""} ${coUnresolved > 0 ? styles.coSwitchBtnHasComment : ""}`}
                                            onClick={() => onSelectCourseOutcome && onSelectCourseOutcome(co)}
                                            title={
                                                coIsOrientation
                                                    ? `Switch to Course Orientation${coUnresolved > 0 ? ` (${coUnresolved} unresolved comment${coUnresolved > 1 ? 's' : ''})` : ''}`
                                                    : `Switch to Course Outcome ${co.coNumber} (${coPeriodFull})${coUnresolved > 0 ? ` (${coUnresolved} unresolved comment${coUnresolved > 1 ? 's' : ''})` : ''}`
                                            }
                                        >
                                            <span>{coIsOrientation ? "CO0" : `CO ${co.coNumber} · ${coPeriodShort}`}</span>
                                            {coUnresolved > 0 && <span className={styles.coSwitchCommentDot} />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className={styles.weekNotepadGroup}>
                            {weeks.length > 0 ? (
                                weeks.map((week, idx) => {
                                    const weekNum = week.weekNumber || fallbackWeeks[idx] || (idx + 1);
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
                                                    : `CO ${coNumber || ""} (${resolvedPeriodLabel}) • Week ${weekNum} (${week.hours || 5} hrs)${hasComments ? " — " + weekUnresolved + " unresolved comment(s)" : ""}`
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
                                        className={`${styles.weekNotepadBtn} ${num === fallbackWeeks[0] ? styles.activeWeekBtn : ""}`}
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

                    {/* Left-Aligned Pinned Content Selector Buttons + Compact Responsive Actions */}
                    <div className={styles.contentSelectorGroup}>
                        <div className={styles.pinnedTabsCluster}>
                            {steps.map((stepLabel, idx) => {
                                const isPinned = isMultiPinMode ? Boolean(pinnedSteps[idx]) : idx === currentStep;
                                const isOnlyPinned = isMultiPinMode && isPinned && pinnedSteps.filter(Boolean).length <= 1;
                                const isBlockedShake = blockedUnpinStep === idx;
                                const badgeCount = isReturned ? (Number(stepCommentCounts[idx]) || 0) : 0;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        aria-pressed={isPinned}
                                        className={`${styles.contentTabBtn} ${isPinned ? styles.activeContentTab : ""} ${badgeCount > 0 ? styles.contentTabHasComment : ""} ${isBlockedShake ? styles.contentTabBlocked : ""}`}
                                        onClick={() => handleContentBtnClick(idx)}
                                        title={
                                            isOnlyPinned
                                                ? `At least one content column must remain pinned`
                                                : (isPinned ? `Click to unpin ${stepLabel}` : `Click to pin ${stepLabel}`)
                                        }
                                    >
                                        {getContentIcon(idx)}
                                        <span>{stepLabel}</span>
                                        {badgeCount > 0 && (
                                            <span className={styles.contentCommentBadge}>
                                                {badgeCount}
                                            </span>
                                        )}
                                        {isPinned && (
                                            <span className={styles.pinCornerBadge} aria-hidden="true">
                                                <PushPinIcon />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {!isExpanded && (
                            <div className={styles.mobileActionCluster}>
                                {onOpenImportPrevious && (
                                    <button
                                        type="button"
                                        className={styles.importPrevInlineMobile}
                                        onClick={onOpenImportPrevious}
                                        title="Import previous term Topics, Teaching & Learning Activities, and References for this week"
                                    >
                                        <RotateCcw size={13} />
                                        <span>Import Previous</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={`${styles.saveInlineMobile} ${isSaveDisabled ? styles.saveDisabled : ""}`}
                                    onClick={handleSaveClick}
                                    disabled={isSaveDisabled}
                                    title={saveTooltip}
                                >
                                    <CheckCircle size={15} />
                                    <span>Save</span>
                                </button>
                            </div>
                        )}
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

            <div className={`${styles.rightActionsGroup} ${isExpanded ? styles.rightActionsHidden : ""}`}>
                {onOpenImportPrevious && (
                    <button
                        type="button"
                        className={styles.importPrevBtn}
                        onClick={onOpenImportPrevious}
                        title="Import previous term Topics, Teaching & Learning Activities, and References for this week"
                        tabIndex={isExpanded ? -1 : 0}
                        aria-hidden={isExpanded}
                    >
                        <RotateCcw size={15} />
                        <span>Import Previous</span>
                    </button>
                )}

                <button
                    type="button"
                    className={`${styles.save} ${isSaveDisabled ? styles.saveDisabled : ""}`}
                    onClick={handleSaveClick}
                    disabled={isSaveDisabled}
                    title={saveTooltip}
                    tabIndex={isExpanded ? -1 : 0}
                    aria-hidden={isExpanded}
                >
                    <CheckCircle size={18} />
                    <span>Save</span>
                </button>
            </div>
        </div>
    );
};

export default FormNavigation;
