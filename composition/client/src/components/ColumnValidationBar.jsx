import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertCircle,
    Award,
    CheckCircle2,
    Clock,
    SpellCheck2,
    X,
    Crosshair,
    CheckCheck
} from 'lucide-react';
import { addWordsToWhitelist } from '../utils/spellChecker.js';
import styles from '../styles/ColumnValidationBar.module.sass';

const formatHoursCompact = (minutes) => {
    const num = Number(minutes) || 0;
    const hrs = num / 60;
    if (Number.isInteger(hrs)) return String(hrs);
    return Number(hrs.toFixed(2)).toString();
};

/**
 * Shared inline validation status bar rendered in Row 1 of each weekly content column header
 * (Topics, Teaching & Learning Activities, References).
 *
 * - Turns green when all active validation checks for the column pass (including 0 misspellings).
 * - Displays concise portal tooltips on hover for fixed checks (content requirements, weekly time budget, assessment coverage).
 * - Displays a clickable orange spell-check trigger that opens a portal popup with per-field "Fix"
 *   (jump & orange highlight) and "Accept All" (persist to personal dictionary).
 */
const ColumnValidationBar = ({
    columnName = 'Column',
    contentIssues = [],
    validItemCount = null,
    validSummaryText = '',
    timeInfo = null, // { usedMinutes: number, budgetMinutes: number, isValid: boolean, tooltip: string } | null
    assessmentInfo = null, // { count: number, isValid: boolean, tooltip: string } | null
    spellItems = null, // Array<{ fieldId: string, label: string, words: string[] }> | null
    onFixSpellField
}) => {
    const [tooltipState, setTooltipState] = useState(null); // { title, lines, x, y }
    const [spellOpen, setSpellOpen] = useState(false);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

    const spellBtnRef = useRef(null);
    const popoverRef = useRef(null);

    const hasTime = timeInfo !== null && timeInfo !== undefined;
    const hasAssessment = assessmentInfo !== null && assessmentInfo !== undefined;
    const hasSpell = Array.isArray(spellItems);

    const slotCount = 1 + (hasTime ? 1 : 0) + (hasAssessment ? 1 : 0) + (hasSpell ? 1 : 0);

    const contentIssueCount = contentIssues.length;
    const contentValid = contentIssueCount === 0;
    const contentBadgeValue = validItemCount !== null && validItemCount !== undefined
        ? validItemCount
        : contentIssueCount;
    const timeValid = !hasTime || Boolean(timeInfo.isValid);
    const assessmentValid = !hasAssessment || Boolean(assessmentInfo.isValid);

    const allFlaggedWords = useMemo(() => {
        if (!hasSpell) return [];
        const seen = new Set();
        const words = [];
        spellItems.forEach(item => {
            (item.words || []).forEach(w => {
                const lower = String(w).toLowerCase();
                if (!seen.has(lower)) {
                    seen.add(lower);
                    words.push(w);
                }
            });
        });
        return words;
    }, [hasSpell, spellItems]);

    const spellCount = useMemo(() => {
        if (!hasSpell) return 0;
        return spellItems.reduce((acc, item) => acc + (item.words?.length || 0), 0);
    }, [hasSpell, spellItems]);

    const spellValid = !hasSpell || spellCount === 0;
    const isColumnValid = contentValid && timeValid && assessmentValid && spellValid;

    // Auto-close spell popup if all spellings get resolved
    useEffect(() => {
        if (spellOpen && spellCount === 0) {
            setSpellOpen(false);
        }
    }, [spellOpen, spellCount]);

    const updatePopoverPosition = useCallback(() => {
        const btn = spellBtnRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const popW = 340;
        const popEstimatedH = 320;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = rect.right - popW;
        if (left < 12) left = 12;
        if (left + popW > vw - 12) left = Math.max(12, vw - popW - 12);

        let top = rect.bottom + 8;
        if (top + popEstimatedH > vh - 12 && rect.top - popEstimatedH - 8 > 12) {
            top = rect.top - popEstimatedH - 8;
        }

        setPopoverPos({ top, left });
    }, []);

    useEffect(() => {
        if (!spellOpen) return;
        updatePopoverPosition();

        const handleOutsideMouseDown = (e) => {
            if (
                popoverRef.current?.contains(e.target) ||
                spellBtnRef.current?.contains(e.target)
            ) {
                return;
            }
            setSpellOpen(false);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSpellOpen(false);
        };

        const handleResize = () => updatePopoverPosition();

        document.addEventListener('mousedown', handleOutsideMouseDown, true);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);
        return () => {
            document.removeEventListener('mousedown', handleOutsideMouseDown, true);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
        };
    }, [spellOpen, updatePopoverPosition]);

    const showTooltip = (e, title, lines) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const estW = 260;
        const vw = window.innerWidth;
        let left = rect.left + rect.width / 2 - estW / 2;
        if (left < 10) left = 10;
        if (left + estW > vw - 10) left = Math.max(10, vw - estW - 10);

        setTooltipState({
            title,
            lines,
            left,
            top: rect.bottom + 7
        });
    };

    const hideTooltip = () => setTooltipState(null);

    const handleToggleSpellPopover = () => {
        if (spellCount === 0) return;
        hideTooltip();
        setSpellOpen(prev => !prev);
    };

    const handleFixClick = (fieldId) => {
        setSpellOpen(false);
        if (onFixSpellField) {
            onFixSpellField(fieldId);
        }
    };

    const handleAcceptAll = () => {
        if (allFlaggedWords.length > 0) {
            addWordsToWhitelist(allFlaggedWords);
        }
        setSpellOpen(false);
    };

    const slotClass =
        slotCount === 3
            ? (hasTime ? styles.slots3 : styles.slots3Compact)
            : slotCount === 2
                ? styles.slots2
                : styles.slots1;

    return (
        <>
            <div
                className={`${styles.barContainer} ${slotClass} ${isColumnValid ? styles.allValid : ''}`}
                aria-label={`${columnName} validation status`}
            >
                {/* 1. Content / Required Validation Segment */}
                <div
                    className={`${styles.segment} ${contentValid ? styles.segmentValid : styles.segmentError}`}
                    onMouseEnter={(e) =>
                        showTooltip(
                            e,
                            `${columnName} Validation`,
                            contentValid
                                ? [validSummaryText || 'All required fields are valid.']
                                : contentIssues
                        )
                    }
                    onMouseLeave={hideTooltip}
                >
                    {contentValid
                        ? <CheckCircle2 size={14} strokeWidth={2.25} className={styles.segmentIcon} />
                        : <AlertCircle size={14} strokeWidth={2.25} className={styles.segmentIcon} />}
                    <span className={styles.segmentText}>{contentBadgeValue}</span>
                </div>

                {/* 2A. Weekly Time Budget Segment (Topics Only) */}
                {hasTime && (
                    <>
                        <div className={styles.divider} aria-hidden="true" />
                        <div
                            className={`${styles.segment} ${timeValid ? styles.segmentValid : styles.segmentError}`}
                            onMouseEnter={(e) =>
                                showTooltip(
                                    e,
                                    'Weekly Time Budget',
                                    [timeInfo.tooltip || `${formatHoursCompact(timeInfo.usedMinutes)} / ${formatHoursCompact(timeInfo.budgetMinutes)} hrs`]
                                )
                            }
                            onMouseLeave={hideTooltip}
                        >
                            <Clock size={14} strokeWidth={2.25} className={styles.segmentIcon} />
                            <span className={styles.segmentText}>
                                {formatHoursCompact(timeInfo.usedMinutes)} / {formatHoursCompact(timeInfo.budgetMinutes)} hrs
                            </span>
                        </div>
                    </>
                )}

                {/* 2B. Assessment Assignment Segment (TLAs Only) */}
                {hasAssessment && (
                    <>
                        <div className={styles.divider} aria-hidden="true" />
                        <div
                            className={`${styles.segment} ${assessmentValid ? styles.segmentValid : styles.segmentError}`}
                            onMouseEnter={(e) =>
                                showTooltip(
                                    e,
                                    'Assessment Validation',
                                    [
                                        assessmentInfo.tooltip ||
                                            (assessmentValid
                                                ? `${assessmentInfo.count} assessment${assessmentInfo.count === 1 ? '' : 's'} assigned across TLAs.`
                                                : 'Assign at least 1 assessment across your TLAs.')
                                    ]
                                )
                            }
                            onMouseLeave={hideTooltip}
                        >
                            <Award size={14} strokeWidth={2.25} className={styles.segmentIcon} />
                            <span className={styles.segmentText}>{assessmentInfo.count ?? 0}</span>
                        </div>
                    </>
                )}

                {/* 3. Spelling Check Segment (Topics & TLAs) */}
                {hasSpell && (
                    <>
                        <div className={styles.divider} aria-hidden="true" />
                        <button
                            ref={spellBtnRef}
                            type="button"
                            className={`${styles.segment} ${
                                spellValid ? styles.segmentNeutralBtn : styles.segmentWarningBtn
                            } ${spellOpen ? styles.popupOpen : ''}`}
                            onClick={handleToggleSpellPopover}
                            onMouseEnter={(e) => {
                                if (!spellOpen) {
                                    showTooltip(
                                        e,
                                        'Spell Check',
                                        spellValid
                                            ? ['No misspelled words detected.']
                                            : [`${spellCount} misspelled word${spellCount === 1 ? '' : 's'} found. Click to review or accept.`]
                                    );
                                }
                            }}
                            onMouseLeave={hideTooltip}
                            aria-expanded={spellOpen}
                            aria-haspopup="dialog"
                        >
                            <SpellCheck2 size={14} strokeWidth={2.25} className={styles.segmentIcon} />
                            <span className={styles.segmentText}>{spellCount}</span>
                        </button>
                    </>
                )}
            </div>

            {/* Hover Tooltip Portal */}
            {tooltipState && typeof document !== 'undefined' && createPortal(
                <div
                    className={styles.tooltipPortal}
                    style={{ top: `${tooltipState.top}px`, left: `${tooltipState.left}px` }}
                    role="tooltip"
                >
                    <div className={styles.tooltipTitle}>{tooltipState.title}</div>
                    {tooltipState.lines.length > 1 ? (
                        <ul className={styles.tooltipList}>
                            {tooltipState.lines.map((line, idx) => (
                                <li key={idx}>{line}</li>
                            ))}
                        </ul>
                    ) : (
                        <div className={styles.tooltipSingle}>{tooltipState.lines[0]}</div>
                    )}
                </div>,
                document.body
            )}

            {/* Spell-Check Review Popup Portal */}
            {spellOpen && hasSpell && spellCount > 0 && typeof document !== 'undefined' && createPortal(
                <div
                    ref={popoverRef}
                    className={styles.spellPopover}
                    style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
                    role="dialog"
                    aria-label={`${columnName} spelling issues`}
                >
                    <div className={styles.spellPopoverHeader}>
                        <div className={styles.spellPopoverTitleGroup}>
                            <SpellCheck2 size={15} />
                            <span>{columnName} Spelling</span>
                            <span className={styles.spellCountPill}>{spellCount}</span>
                        </div>
                        <button
                            type="button"
                            className={styles.closePopoverBtn}
                            onClick={() => setSpellOpen(false)}
                            aria-label="Close spelling review"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className={styles.spellPopoverList}>
                        {spellItems.map((item) => (
                            <div key={item.fieldId} className={styles.spellItemRow}>
                                <div className={styles.spellItemInfo}>
                                    <div className={styles.spellFieldLabel}>{item.label}</div>
                                    <div className={styles.spellWordChips}>
                                        {(item.words || []).map((word, wIdx) => (
                                            <span key={`${word}-${wIdx}`} className={styles.spellWordChip}>
                                                {word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={styles.fixBtn}
                                    onClick={() => handleFixClick(item.fieldId)}
                                >
                                    <Crosshair size={12} />
                                    <span>Fix</span>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className={styles.spellPopoverFooter}>
                        <span className={styles.footerHint}>
                            Saves accepted terms to your personal dictionary.
                        </span>
                        <button
                            type="button"
                            className={styles.acceptAllBtn}
                            onClick={handleAcceptAll}
                        >
                            <CheckCheck size={13} />
                            <span>Accept All</span>
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default ColumnValidationBar;
