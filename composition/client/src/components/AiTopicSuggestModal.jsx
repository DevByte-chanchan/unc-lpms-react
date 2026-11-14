import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Check, RefreshCw, Plus, Clock, CheckCircle, AlertTriangle, ArrowRight, Layers, BookOpen } from 'react-feather';
import styles from '../styles/AiTopicSuggestModal.module.sass';
import { fetchJson } from '../utils/api.js';

// Sparkle / 4-pointed AI Star SVG
export const GeminiStar = ({ size = 16, className, style }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        style={style}
    >
        <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
    </svg>
);

function formatMinutesToDuration(totalMinutes) {
    const mins = Math.max(0, Math.round(Number(totalMinutes) || 0));
    if (mins === 0) return '0 mins';
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0 && remMins > 0) {
        return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ${remMins} mins`;
    }
    if (hrs > 0) {
        return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
    }
    return `${remMins} mins`;
}

// Helper to compute a stable signature of previous weeks' topics and subtopics
function computePrevWeeksSignature(previousWeeksTopics = []) {
    if (!Array.isArray(previousWeeksTopics) || previousWeeksTopics.length === 0) {
        return '[]';
    }
    const normalized = previousWeeksTopics.map(pw => ({
        weekNumber: Number(pw.weekNumber) || 0,
        topics: (Array.isArray(pw.topics) ? pw.topics : []).map(t => ({
            title: String(t?.title || '').trim().toLowerCase(),
            subtopics: (Array.isArray(t?.subtopics) ? t.subtopics : []).map(s =>
                String(typeof s === 'string' ? s : (s?.title || '')).trim().toLowerCase()
            )
        }))
    }));
    return JSON.stringify(normalized);
}

const AiTopicSuggestModal = ({
    isOpen,
    onClose,
    onApplyTopics,
    iloId,
    courseCode,
    courseTitle = '',
    courseDescription = '',
    coNumber = 1,
    coDescription = '',
    ilos = [],
    weekNumber = 1,
    weeklyHours = 3,
    isOrientation = false,
    previousWeeksTopics = [],
    currentTopics = [],
    weekAiCache,
    onUpdateWeekAiCache
}) => {
    // Phase: 'ilo-select' | 'loading' | 'results' | 'prev-week-changed-confirm'
    const [phase, setPhase] = useState('ilo-select');
    const [selectedIloIds, setSelectedIloIds] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [topics, setTopics] = useState([]);
    const [loadingStepIndex, setLoadingStepIndex] = useState(0);
    const modalBodyRef = useRef(null);

    const effectiveWeeklyHours = Number(weeklyHours) > 0 ? Number(weeklyHours) : (isOrientation ? 2 : 3);
    const targetWeeklyMinutes = Math.round(effectiveWeeklyHours * 60);

    const currentPrevWeeksSignature = useMemo(
        () => computePrevWeeksSignature(previousWeeksTopics),
        [previousWeeksTopics]
    );

    const hasCachedSuggestions = Boolean(
        weekAiCache && Array.isArray(weekAiCache.topics) && weekAiCache.topics.length > 0
    );

    // Sync cached topics with currently assigned topics in the form so if the user deleted an AI topic or subtopic on the form, or kept it, the modal checkboxes reflect it accurately
    const syncTopicsWithCurrentForm = useCallback((cachedTopics, formTopics) => {
        const aiFormTopics = (Array.isArray(formTopics) ? formTopics : []).filter(t => Boolean(t.isAiSuggested));
        const hasAnyImportedInCache = cachedTopics.some(t => Boolean(t.wasImported));
        if (!hasAnyImportedInCache && aiFormTopics.length === 0) {
            return cachedTopics;
        }

        return cachedTopics.map(ct => {
            const matchingFormTopic = aiFormTopics.find(ft =>
                (ft.aiSourceTopicId && ft.aiSourceTopicId === ct.id) ||
                String(ft.title || '').trim().toLowerCase() === String(ct.title || '').trim().toLowerCase()
            );

            if (matchingFormTopic) {
                const formSubs = Array.isArray(matchingFormTopic.subtopics) ? matchingFormTopic.subtopics : [];
                const updatedSubs = (ct.subtopics || []).map(cs => {
                    const matchedSub = formSubs.some(fs =>
                        (fs.aiSourceSubtopicId && fs.aiSourceSubtopicId === cs.id) ||
                        String(fs.title || '').trim().toLowerCase() === String(cs.title || '').trim().toLowerCase()
                    );
                    return {
                        ...cs,
                        checked: matchedSub
                    };
                });
                const anySubChecked = updatedSubs.some(s => s.checked);
                return {
                    ...ct,
                    checked: anySubChecked,
                    wasImported: true,
                    subtopics: updatedSubs
                };
            }

            // If this topic was previously imported into the form, and the user deleted it from the form (or all AI topics were removed), uncheck it in the modal
            if (ct.wasImported) {
                return {
                    ...ct,
                    checked: false,
                    wasImported: false,
                    subtopics: (ct.subtopics || []).map(cs => ({
                        ...cs,
                        checked: false
                    }))
                };
            }

            return ct;
        });
    }, []);

    // Initialize or restore modal state when opened
    useEffect(() => {
        if (!isOpen) return;

        const allIds = (ilos || []).map((ilo, idx) => ilo.ilo_id ?? `ilo-${idx}`);

        if (hasCachedSuggestions) {
            const restoredIlos = Array.isArray(weekAiCache.selectedIloIds) && weekAiCache.selectedIloIds.length > 0
                ? weekAiCache.selectedIloIds
                : allIds;
            setSelectedIloIds(restoredIlos);

            const synced = syncTopicsWithCurrentForm(weekAiCache.topics, currentTopics);
            setTopics(synced);

            const prevChanged =
                Number(weekNumber) > 1 &&
                !isOrientation &&
                weekAiCache.prevWeeksSignature !== undefined &&
                weekAiCache.prevWeeksSignature !== currentPrevWeeksSignature;

            if (prevChanged) {
                setPhase('prev-week-changed-confirm');
            } else {
                setPhase('results');
            }
        } else {
            setSelectedIloIds(allIds);
            setTopics([]);
            setLoadingStepIndex(0);
            setPhase('ilo-select');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, iloId, coNumber, weekNumber, isOrientation]);

    // Step-by-step live actions shown while AI is analyzing and generating (never mentioning specific AI model names)
    const loadingSteps = useMemo(() => {
        const steps = [
            {
                title: 'Understanding Course Description & Scope',
                detail: courseDescription
                    ? `Analyzing "${courseDescription.slice(0, 95)}${courseDescription.length > 95 ? '...' : ''}"`
                    : 'Evaluating core academic domain and course foundations...'
            },
            {
                title: isOrientation
                    ? 'Understanding Course Orientation Objectives'
                    : `Understanding Course Outcome (CO ${coNumber}) Description`,
                detail: coDescription
                    ? `Aligning with "${coDescription.slice(0, 95)}${coDescription.length > 95 ? '...' : ''}"`
                    : 'Mapping expected course outcome competencies...'
            },
            {
                title: `Analyzing ${selectedIloIds.length} Selected Intended Learning Outcome${selectedIloIds.length === 1 ? '' : 's'} (ILOs)`,
                detail: 'Determining the exact knowledge and skills learners must demonstrate from the suggested subtopics...'
            },
            ...(Number(weekNumber) > 1 && !isOrientation
                ? [{
                    title: `Checking Assigned Topics from Previous Week${Number(weekNumber) > 2 ? `s (Weeks 1–${Number(weekNumber) - 1})` : ' (Week 1)'}`,
                    detail: previousWeeksTopics.length > 0
                        ? `Reviewing ${previousWeeksTopics.reduce((acc, w) => acc + (w.topics?.length || 0), 0)} topic(s) from earlier weeks in the current session to ensure sequential progression without repetition...`
                        : 'Verifying prior weeks to ensure logical sequence and zero topic duplication...'
                }]
                : [{
                    title: 'Applying First-Week Foundational Sequencing',
                    detail: 'Structuring introductory concepts tailored for the opening week of this Course Outcome...'
                }]
            ),
            {
                title: `Evaluating ${effectiveWeeklyHours}-Hour (${targetWeeklyMinutes} mins) Weekly Time Feasibility`,
                detail: `Asking: "Can these subtopics realistically be taught within ${effectiveWeeklyHours} ${effectiveWeeklyHours === 1 ? 'hour' : 'hours'}?" Assigning minute weights and calibrating subtopics...`
            }
        ];
        return steps;
    }, [courseDescription, isOrientation, coNumber, coDescription, selectedIloIds.length, weekNumber, previousWeeksTopics, effectiveWeeklyHours, targetWeeklyMinutes]);

    const persistToWeekCache = useCallback((nextTopics, nextSelectedIloIds = selectedIloIds, nextSig = currentPrevWeeksSignature) => {
        if (onUpdateWeekAiCache) {
            onUpdateWeekAiCache({
                topics: nextTopics,
                selectedIloIds: nextSelectedIloIds,
                prevWeeksSignature: nextSig,
                hasImportedOnce: Boolean(weekAiCache?.hasImportedOnce)
            });
        }
    }, [onUpdateWeekAiCache, selectedIloIds, currentPrevWeeksSignature, weekAiCache?.hasImportedOnce]);

    const toggleIloSelection = (id) => {
        setSelectedIloIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllIlos = () => {
        const allIds = (ilos || []).map((ilo, idx) => ilo.ilo_id ?? `ilo-${idx}`);
        if (selectedIloIds.length === allIds.length) {
            setSelectedIloIds([]);
        } else {
            setSelectedIloIds(allIds);
        }
    };

    const runGeneration = useCallback(async (isLoadMore = false) => {
        const chosenIlos = (ilos || []).filter((ilo, idx) =>
            selectedIloIds.includes(ilo.ilo_id ?? `ilo-${idx}`)
        );

        if (isLoadMore) {
            setIsLoadingMore(true);
        } else {
            setPhase('loading');
            setLoadingStepIndex(0);
        }

        // Advance through every step visibly so the instructor sees each reasoning action in real time
        let stepTimer = null;
        const minWaitPromise = !isLoadMore
            ? new Promise(resolve => {
                let current = 0;
                const total = loadingSteps.length;
                stepTimer = setInterval(() => {
                    current += 1;
                    if (current < total) {
                        setLoadingStepIndex(current);
                    } else {
                        clearInterval(stepTimer);
                        resolve();
                    }
                }, 620);
            })
            : Promise.resolve();

        try {
            const alreadySuggested = isLoadMore ? topics.map(t => t.title) : [];
            const nonAiCurrentTitles = (currentTopics || [])
                .filter(t => !t.isAiSuggested)
                .map(t => (typeof t === 'string' ? t : t.title))
                .filter(Boolean);

            const [res] = await Promise.all([
                fetchJson('/api/topics/ai-suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        iloId,
                        weekId: iloId,
                        courseCode,
                        courseDescription,
                        coNumber,
                        coDescription,
                        weekNumber,
                        weeklyHours: effectiveWeeklyHours,
                        isOrientation,
                        selectedIlos: chosenIlos.map(i => ({
                            ilo_id: i.ilo_id,
                            description: i.description
                        })),
                        previousWeeksTopics,
                        currentTopics: nonAiCurrentTitles,
                        alreadySuggested
                    })
                }),
                minWaitPromise
            ]);

            const recRaw = Array.isArray(res.recommendedTopics) ? res.recommendedTopics : [];
            const altRaw = Array.isArray(res.alternativeTopics) ? res.alternativeTopics : [];

            const mapTopicItem = (t, idx, forceAlt = false) => {
                const isAlt = forceAlt || Boolean(t.isAlternative);
                const subs = (Array.isArray(t.subtopics) ? t.subtopics : []).map((s, sIdx) => ({
                    id: s.id || `sub-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${sIdx}-${Math.random().toString(36).slice(2, 6)}`,
                    title: typeof s === 'string' ? s : s.title,
                    minutes: Number(s.minutes) || 30,
                    checked: !isAlt
                }));

                return {
                    id: t.id || `topic-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                    title: t.title,
                    isAlternative: isAlt,
                    checked: !isAlt,
                    wasImported: false,
                    subtopics: subs
                };
            };

            if (isLoadMore) {
                const extraAlts = [...recRaw, ...altRaw].map((t, i) => mapTopicItem(t, topics.length + i, true));
                const nextAll = [...topics, ...extraAlts];
                setTopics(nextAll);
                persistToWeekCache(nextAll, selectedIloIds, currentPrevWeeksSignature);
                setTimeout(() => {
                    if (modalBodyRef.current) {
                        modalBodyRef.current.scrollTo({
                            top: modalBodyRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }, 100);
            } else {
                const mappedRec = recRaw.map((t, i) => mapTopicItem(t, i, false));
                const mappedAlt = altRaw.map((t, i) => mapTopicItem(t, i, true));
                const nextAll = [...mappedRec, ...mappedAlt];
                setTopics(nextAll);
                persistToWeekCache(nextAll, selectedIloIds, currentPrevWeeksSignature);
                setPhase('results');
            }
        } catch (err) {
            console.error('Failed to generate AI topics:', err);
            setPhase('results');
        } finally {
            if (stepTimer) clearInterval(stepTimer);
            setIsLoadingMore(false);
        }
    }, [
        ilos,
        selectedIloIds,
        loadingSteps.length,
        topics,
        currentTopics,
        iloId,
        courseCode,
        courseDescription,
        coNumber,
        coDescription,
        weekNumber,
        effectiveWeeklyHours,
        isOrientation,
        previousWeeksTopics,
        persistToWeekCache,
        currentPrevWeeksSignature
    ]);

    if (!isOpen) return null;

    // Checkbox interaction handlers (also keep background cache updated)
    const handleToggleTopic = (topicId) => {
        setTopics(prev => {
            const next = prev.map(t => {
                if (t.id !== topicId) return t;
                const newCheckedState = !t.checked;
                return {
                    ...t,
                    checked: newCheckedState,
                    subtopics: t.subtopics.map(s => ({ ...s, checked: newCheckedState }))
                };
            });
            persistToWeekCache(next);
            return next;
        });
    };

    const handleToggleSubtopic = (topicId, subtopicId) => {
        setTopics(prev => {
            const next = prev.map(t => {
                if (t.id !== topicId) return t;
                const updatedSubtopics = t.subtopics.map(s =>
                    s.id === subtopicId ? { ...s, checked: !s.checked } : s
                );
                const hasCheckedSubtopic = updatedSubtopics.some(s => s.checked);
                return {
                    ...t,
                    checked: hasCheckedSubtopic,
                    subtopics: updatedSubtopics
                };
            });
            persistToWeekCache(next);
            return next;
        });
    };

    const handleResetToRecommended = () => {
        setTopics(prev => {
            const next = prev.map(t => {
                const shouldCheck = !t.isAlternative;
                return {
                    ...t,
                    checked: shouldCheck,
                    subtopics: t.subtopics.map(s => ({ ...s, checked: shouldCheck }))
                };
            });
            persistToWeekCache(next);
            return next;
        });
    };

    // Confirmation handlers when previous week's topic assignments have changed
    const handleConfirmRegenerateFromPrevWeekChange = () => {
        setPhase('ilo-select');
    };

    const handleKeepExistingSuggestionsDespitePrevWeekChange = () => {
        // Update stored signature so we don't nag again unless previous week changes again
        persistToWeekCache(topics, selectedIloIds, currentPrevWeeksSignature);
        setPhase('results');
    };

    // Compute per-topic active minutes and total minutes
    const getTopicSelectedMinutes = (topic) =>
        (topic.subtopics || []).reduce((sum, s) => sum + (s.checked ? (Number(s.minutes) || 0) : 0), 0);

    const getTopicFullMinutes = (topic) =>
        (topic.subtopics || []).reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);

    const recommendedTopics = topics.filter(t => !t.isAlternative);
    const alternativeTopics = topics.filter(t => t.isAlternative);

    // Combined time of all currently selected subtopics across all topics
    const selectedTotalMinutes = topics.reduce(
        (sum, t) => sum + getTopicSelectedMinutes(t),
        0
    );

    const timeDiffMinutes = selectedTotalMinutes - targetWeeklyMinutes;
    const timeStatus = timeDiffMinutes === 0
        ? 'exact'
        : (timeDiffMinutes < 0 ? 'under' : 'over');

    const selectedTopicsList = topics.filter(t => t.checked && t.subtopics.some(s => s.checked));
    const selectedTopicsCount = selectedTopicsList.length;
    const selectedSubtopicsCount = topics.reduce((sum, t) => sum + t.subtopics.filter(s => s.checked).length, 0);

    const hasPreviouslyImportedAiTopicsInForm = (currentTopics || []).some(t => Boolean(t.isAiSuggested)) || Boolean(weekAiCache?.hasImportedOnce);

    const handleApply = () => {
        // Allow applying even when 0 topics are selected if the user is removing previously imported AI suggestions
        if (selectedTopicsCount === 0 && !hasPreviouslyImportedAiTopicsInForm) return;

        // Mark which topics were imported in the cache so reopening the modal remembers their imported state
        const updatedCacheTopics = topics.map(t => {
            const isSelectedNow = t.checked && t.subtopics.some(s => s.checked);
            return {
                ...t,
                wasImported: isSelectedNow
            };
        });

        setTopics(updatedCacheTopics);
        if (onUpdateWeekAiCache) {
            onUpdateWeekAiCache({
                topics: updatedCacheTopics,
                selectedIloIds,
                prevWeeksSignature: currentPrevWeeksSignature,
                hasImportedOnce: selectedTopicsCount > 0
            });
        }

        // Transform into format accepted by TopicSelector (with isAiSuggested: true for gradient border, and NO weights attached)
        const formattedForForm = selectedTopicsList.map((t, idx) => {
            const activeSubs = t.subtopics.filter(s => s.checked);
            return {
                topic_id: null,
                _temp_id: `temp-topic-ai-${Date.now()}-${idx}`,
                aiSourceTopicId: t.id,
                title: t.title,
                isContinuation: false,
                isAiSuggested: true,
                isManual: true,
                subtopics: activeSubs.map((s, sIdx) => ({
                    subtopic_id: null,
                    _temp_id: `temp-sub-ai-${Date.now()}-${idx}-${sIdx}`,
                    aiSourceSubtopicId: s.id,
                    title: s.title,
                    sequence_order: sIdx
                }))
            };
        });

        onApplyTopics(formattedForForm);
        onClose();
    };

    const renderTopicCard = (t, badgeNum, isAlternativeCard = false) => {
        const isCardChecked = t.checked && t.subtopics.some(s => s.checked);
        const activeTopicMins = getTopicSelectedMinutes(t);
        const fullTopicMins = getTopicFullMinutes(t);
        const displayedTopicMins = isCardChecked ? activeTopicMins : fullTopicMins;

        return (
            <div
                key={t.id}
                className={`${styles.topicCard} ${isAlternativeCard ? styles.topicCardAlternative : styles.topicCardPrimary} ${isCardChecked ? styles.cardSelected : styles.cardUnselected}`}
            >
                {/* Topic Header with Total Time Weight & Checkbox */}
                <div
                    className={`${styles.topicCardHeader} ${isCardChecked ? styles.topicCardHeaderSelected : ''}`}
                    onClick={() => handleToggleTopic(t.id)}
                >
                    <div className={styles.topicTitleLeft}>
                        <span className={`${styles.topicNumberBadge} ${isCardChecked ? styles.badgeSelected : ''} ${isAlternativeCard ? styles.badgeAlternative : ''}`}>
                            {badgeNum}
                        </span>
                        <div className={styles.topicTitleTextGroup}>
                            <h4 className={styles.topicCardTitle} title={t.title}>
                                {t.title}
                            </h4>
                            <div className={styles.topicMetaSubrow}>
                                <span className={`${styles.topicDurationBadge} ${isCardChecked ? styles.topicDurationActive : styles.topicDurationMuted}`}>
                                    <Clock size={11} />
                                    <span>
                                        {formatMinutesToDuration(displayedTopicMins)}
                                        {isCardChecked && activeTopicMins !== fullTopicMins
                                            ? ` of ${formatMinutesToDuration(fullTopicMins)}`
                                            : ''}
                                    </span>
                                </span>
                                <span className={styles.subtopicCountHint}>
                                    {t.subtopics.filter(s => s.checked).length}/{t.subtopics.length} subtopics
                                </span>
                            </div>
                        </div>
                    </div>
                    <label
                        className={styles.checkboxLabel}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            className={styles.checkboxInput}
                            checked={isCardChecked}
                            onChange={() => handleToggleTopic(t.id)}
                        />
                    </label>
                </div>

                {/* Topic Body: Dynamic Subtopic Count Based on AI Response (row heights align automatically via CSS Grid) */}
                <div className={styles.topicCardBody}>
                    {(t.subtopics || []).map((s) => {
                        const isSubChecked = s.checked;
                        return (
                            <div
                                key={s.id}
                                className={`${styles.subtopicRow} ${isSubChecked ? styles.subtopicRowSelected : styles.subtopicRowUnselected}`}
                                onClick={() => handleToggleSubtopic(t.id, s.id)}
                            >
                                <div className={styles.subtopicTitleLeft}>
                                    <span className={`${styles.subtopicDot} ${isSubChecked ? styles.subtopicDotSelected : ''}`} />
                                    <span className={`${styles.subtopicText} ${isSubChecked ? styles.subtopicTextSelected : ''}`}>
                                        {s.title}
                                    </span>
                                </div>
                                <div className={styles.subtopicRightMeta}>
                                    <span className={`${styles.subtopicWeightPill} ${isSubChecked ? styles.subtopicWeightActive : styles.subtopicWeightMuted}`}>
                                        {s.minutes} mins
                                    </span>
                                    <label
                                        className={styles.checkboxLabel}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            className={styles.checkboxInput}
                                            checked={isSubChecked}
                                            onChange={() => handleToggleSubtopic(t.id, s.id)}
                                        />
                                    </label>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.headerTitleGroup}>
                        <div className={styles.geminiBadge}>
                            <GeminiStar size={20} />
                        </div>
                        <div>
                            <h3 className={styles.modalTitle}>
                                <span className={styles.sparkleText}>AI Topic &amp; Subtopic Suggestions</span>
                                <span className={styles.headerContextPill}>
                                    {isOrientation ? 'Course Orientation • Week 1' : `CO ${coNumber} • Week ${weekNumber}`}
                                </span>
                            </h3>
                            <p className={styles.modalSubtitle} title={coDescription || courseDescription}>
                                {courseCode ? `${courseCode}${courseTitle ? ` — ${courseTitle}` : ''} • ` : ''}
                                {effectiveWeeklyHours} {effectiveWeeklyHours === 1 ? 'hr' : 'hrs'}/week target ({targetWeeklyMinutes} mins)
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                {/* Top Weekly Time Budget Bar (shown in Results View) */}
                {phase === 'results' && (
                    <div
                        className={`${styles.timeBudgetBanner} ${
                            timeStatus === 'exact'
                                ? styles.budgetExact
                                : timeStatus === 'under'
                                    ? styles.budgetUnder
                                    : styles.budgetOver
                        }`}
                    >
                        <div className={styles.budgetLeft}>
                            <div className={styles.budgetStatusIcon}>
                                {timeStatus === 'exact' && <CheckCircle size={18} />}
                                {timeStatus === 'under' && <Clock size={18} />}
                                {timeStatus === 'over' && <AlertTriangle size={18} />}
                            </div>
                            <div className={styles.budgetTextContent}>
                                <div className={styles.budgetTitleRow}>
                                    <span className={styles.budgetMainStatus}>
                                        {timeStatus === 'exact' && 'Optimal Weekly Time Alignment'}
                                        {timeStatus === 'under' && `Under Weekly Time Budget by ${formatMinutesToDuration(Math.abs(timeDiffMinutes))}`}
                                        {timeStatus === 'over' && `Exceeds Weekly Time Budget by ${formatMinutesToDuration(Math.abs(timeDiffMinutes))}`}
                                    </span>
                                </div>
                                <p className={styles.budgetSubtext}>
                                    {timeStatus === 'exact' &&
                                        `Selected subtopics match the ${effectiveWeeklyHours}-hour (${targetWeeklyMinutes} mins) weekly teaching allocation.`}
                                    {timeStatus === 'under' &&
                                        `Selected subtopics total ${formatMinutesToDuration(selectedTotalMinutes)}, which is less than the ${effectiveWeeklyHours}-hour (${targetWeeklyMinutes} mins) weekly allocation.`}
                                    {timeStatus === 'over' &&
                                        `Selected subtopics total ${formatMinutesToDuration(selectedTotalMinutes)}, exceeding the ${effectiveWeeklyHours}-hour (${targetWeeklyMinutes} mins) weekly allocation.`}
                                </p>
                            </div>
                        </div>

                        <div className={styles.budgetMetricsRight}>
                            <div className={styles.metricBox}>
                                <span className={styles.metricLabel}>Weekly Target</span>
                                <span className={styles.metricValue}>
                                    {formatMinutesToDuration(targetWeeklyMinutes)}
                                </span>
                            </div>
                            <div className={styles.metricDivider} />
                            <div className={`${styles.metricBox} ${styles.metricBoxSelected}`}>
                                <span className={styles.metricLabel}>Selected Total</span>
                                <span className={styles.metricValueHighlight}>
                                    {formatMinutesToDuration(selectedTotalMinutes)}
                                </span>
                            </div>
                            {timeStatus !== 'exact' && (
                                <button
                                    type="button"
                                    className={styles.resetBudgetBtn}
                                    onClick={handleResetToRecommended}
                                    title="Restore pre-selected recommended subtopics to match weekly hours"
                                >
                                    Reset to {effectiveWeeklyHours}h Match
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className={styles.modalBody} ref={modalBodyRef}>
                    {/* CONFIRMATION VIEW: Previous Week's Topic Assignments Changed */}
                    {phase === 'prev-week-changed-confirm' && (
                        <div className={styles.confirmChangeContainer}>
                            <div className={styles.confirmChangeCard}>
                                <div className={styles.confirmIconCircle}>
                                    <AlertTriangle size={26} />
                                </div>
                                <h4 className={styles.confirmChangeTitle}>
                                    Previous Week Topic Assignments Have Changed
                                </h4>
                                <p className={styles.confirmChangeDesc}>
                                    We detected that topics or subtopics in{' '}
                                    <strong>
                                        {Number(weekNumber) === 2
                                            ? 'Week 1'
                                            : `Weeks 1–${Number(weekNumber) - 1}`}
                                    </strong>{' '}
                                    were modified after Week {weekNumber}&apos;s suggestions were generated. Would you like to regenerate Week {weekNumber}&apos;s topic suggestions so they stay sequentially aligned with your updated earlier weeks?
                                </p>

                                {previousWeeksTopics.length > 0 && (
                                    <div className={styles.confirmPrevWeeksPreview}>
                                        <div className={styles.prevWeeksHeader}>
                                            Updated Topics from Earlier Weeks:
                                        </div>
                                        <div className={styles.prevWeeksList}>
                                            {previousWeeksTopics.map((pw) => (
                                                <div key={pw.weekNumber} className={styles.prevWeekItem}>
                                                    <span className={styles.prevWeekBadge}>Week {pw.weekNumber}</span>
                                                    <span className={styles.prevWeekTitles}>
                                                        {(pw.topics || []).length > 0
                                                            ? pw.topics.map(t => `${t.title} (${(t.subtopics || []).length} subtopics)`).join(' • ')
                                                            : 'No topics currently assigned'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className={styles.confirmActionsRow}>
                                    <button
                                        type="button"
                                        className={styles.keepExistingBtn}
                                        onClick={handleKeepExistingSuggestionsDespitePrevWeekChange}
                                    >
                                        No, Keep Previous Suggestions
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.confirmRegenerateBtn}
                                        onClick={handleConfirmRegenerateFromPrevWeekChange}
                                    >
                                        <RefreshCw size={15} />
                                        <span>Yes, Review Data &amp; Regenerate</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PHASE 1: Multi-Select Intended Learning Outcomes (ILOs) + Context Summary */}
                    {phase === 'ilo-select' && (
                        <div className={styles.iloSetupContainer}>
                            {/* Context Inputs Card */}
                            <div className={styles.contextSummaryGrid}>
                                <div className={styles.contextInfoCard}>
                                    <div className={styles.contextCardHeader}>
                                        <BookOpen size={14} className={styles.contextIcon} />
                                        <span>Course Description</span>
                                    </div>
                                    <p className={styles.contextCardText}>
                                        {courseDescription || 'Standard academic course description from course details.'}
                                    </p>
                                </div>

                                <div className={styles.contextInfoCard}>
                                    <div className={styles.contextCardHeader}>
                                        <Layers size={14} className={styles.contextIcon} />
                                        <span>{isOrientation ? 'Course Orientation Outcome' : `Course Outcome ${coNumber} Description`}</span>
                                    </div>
                                    <p className={styles.contextCardText}>
                                        {coDescription || 'Core competency and learning outcome for this unit.'}
                                    </p>
                                </div>
                            </div>

                            {/* Weekly Time & Previous Weeks Sequential Context Bar */}
                            <div className={styles.sequentialMetaStrip}>
                                <div className={styles.metaChip}>
                                    <Clock size={14} />
                                    <span>
                                        <strong>Calculated Weekly Hours:</strong> {effectiveWeeklyHours} {effectiveWeeklyHours === 1 ? 'hr' : 'hrs'} ({targetWeeklyMinutes} mins)
                                    </span>
                                </div>
                                {Number(weekNumber) === 1 || isOrientation ? (
                                    <div className={styles.metaChip}>
                                        <span>
                                            <strong>Week 1 Scope:</strong> Foundational topics for {isOrientation ? 'Orientation' : `CO ${coNumber}`} (no prior weeks needed)
                                        </span>
                                    </div>
                                ) : (
                                    <div className={`${styles.metaChip} ${styles.metaChipSequential}`}>
                                        <span>
                                            <strong>Sequential Continuity (Weeks 1–{Number(weekNumber) - 1}):</strong>{' '}
                                            {previousWeeksTopics.reduce((sum, w) => sum + (w.topics?.length || 0), 0)} topic(s) from earlier weeks in your current form will be passed to prevent repetition
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Previous Weeks Preview if on Week > 1 */}
                            {Number(weekNumber) > 1 && !isOrientation && previousWeeksTopics.length > 0 && (
                                <div className={styles.prevWeeksBox}>
                                    <div className={styles.prevWeeksHeader}>
                                        Topics &amp; Subtopics from Previous Weeks (Frontend Session State):
                                    </div>
                                    <div className={styles.prevWeeksList}>
                                        {previousWeeksTopics.map((pw) => (
                                            <div key={pw.weekNumber} className={styles.prevWeekItem}>
                                                <span className={styles.prevWeekBadge}>Week {pw.weekNumber}</span>
                                                <span className={styles.prevWeekTitles}>
                                                    {(pw.topics || []).length > 0
                                                        ? pw.topics.map(t => `${t.title} (${(t.subtopics || []).length} subtopics)`).join(' • ')
                                                        : 'No topics added yet'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Multi-select Intended Learning Outcomes */}
                            <div className={styles.iloSelectSection}>
                                <div className={styles.iloSelectHeader}>
                                    <div>
                                        <h4 className={styles.iloSelectTitle}>
                                            Select Intended Learning Outcomes (ILOs) to Target
                                        </h4>
                                        <p className={styles.iloSelectSubtitle}>
                                            Choose one or more ILOs from {isOrientation ? 'Course Orientation' : `CO ${coNumber}`} that the suggested subtopics should achieve:
                                        </p>
                                    </div>
                                    {ilos.length > 1 && (
                                        <button
                                            type="button"
                                            className={styles.selectAllIlosBtn}
                                            onClick={handleSelectAllIlos}
                                        >
                                            {selectedIloIds.length === ilos.length ? 'Deselect All' : 'Select All ILOs'}
                                        </button>
                                    )}
                                </div>

                                <div className={styles.iloOptionsList}>
                                    {ilos.length > 0 ? (
                                        ilos.map((ilo, idx) => {
                                            const iloKey = ilo.ilo_id ?? `ilo-${idx}`;
                                            const isSelected = selectedIloIds.includes(iloKey);
                                            return (
                                                <div
                                                    key={iloKey}
                                                    className={`${styles.iloOptionCard} ${isSelected ? styles.iloOptionCardSelected : ''}`}
                                                    onClick={() => toggleIloSelection(iloKey)}
                                                >
                                                    <label
                                                        className={styles.checkboxLabel}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className={styles.checkboxInput}
                                                            checked={isSelected}
                                                            onChange={() => toggleIloSelection(iloKey)}
                                                        />
                                                    </label>
                                                    <div className={styles.iloOptionBody}>
                                                        <div className={styles.iloOptionTop}>
                                                            <span className={styles.iloCodeTag}>
                                                                {isOrientation ? 'ORIENTATION ILO' : `ILO ${idx + 1}`}
                                                            </span>
                                                            {ilo.assessment_tool && (
                                                                <span className={styles.iloAssessmentPill}>
                                                                    {ilo.assessment_tool}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={styles.iloOptionDesc}>{ilo.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className={styles.emptyIloNotice}>
                                            No specific ILO records found for this Course Outcome; suggestions will align directly with the Course Outcome description.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PHASE 2: Step-by-Step Action Loading Screen (No mention of specific AI brand/model) */}
                    {phase === 'loading' && (
                        <div className={styles.loadingContainer}>
                            <div className={styles.m3LoaderWrapper}>
                                <svg
                                    className={styles.m3SvgLoader}
                                    viewBox="0 0 100 100"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <defs>
                                        <linearGradient id="m3CurvedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#3B82F6" />
                                            <stop offset="50%" stopColor="#8B5CF6" />
                                            <stop offset="100%" stopColor="#EC4899" />
                                        </linearGradient>
                                    </defs>
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="none"
                                        stroke="#F1F5F9"
                                        strokeWidth="8"
                                    />
                                    <circle
                                        className={styles.m3Arc1}
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="none"
                                        stroke="url(#m3CurvedGradient)"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className={styles.m3CenterIcon}>
                                    <GeminiStar size={24} />
                                </div>
                            </div>

                            <div className={styles.loadingTitle}>
                                Synthesizing Time-Feasible Subtopics &amp; Topics
                            </div>
                            <p className={styles.loadingDescription}>
                                Aligning subtopic depth and duration weights to your {effectiveWeeklyHours}-hour weekly teaching schedule...
                            </p>

                            {/* Live Step-by-Step Progress Checklist */}
                            <div className={styles.stepTrackerList}>
                                {loadingSteps.map((step, idx) => {
                                    const isDone = idx < loadingStepIndex;
                                    const isCurrent = idx === loadingStepIndex;
                                    return (
                                        <div
                                            key={idx}
                                            className={`${styles.stepTrackerItem} ${
                                                isCurrent ? styles.stepItemActive : isDone ? styles.stepItemDone : styles.stepItemPending
                                            }`}
                                        >
                                            <div className={styles.stepStatusIndicator}>
                                                {isDone ? (
                                                    <Check size={13} />
                                                ) : isCurrent ? (
                                                    <span className={styles.stepPulseDot} />
                                                ) : (
                                                    <span>{idx + 1}</span>
                                                )}
                                            </div>
                                            <div className={styles.stepTextGroup}>
                                                <div className={styles.stepTitleText}>{step.title}</div>
                                                {(isCurrent || isDone) && (
                                                    <div className={styles.stepDetailText}>{step.detail}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PHASE 3: Results View — Recommended Pre-Selected Topics (matching weekly hours) + Alternative Topics below */}
                    {phase === 'results' && (
                        <div className={styles.resultsWrapper}>
                            {/* Primary Recommended Section */}
                            <div className={styles.sectionBlock}>
                                <div className={styles.sectionHeaderRow}>
                                    <div className={styles.sectionTitleGroup}>
                                        <span className={styles.recommendedPill}>Pre-Selected for Week {weekNumber}</span>
                                        <h4 className={styles.sectionHeading}>
                                            Recommended Topics &amp; Subtopics ({formatMinutesToDuration(targetWeeklyMinutes)} Total)
                                        </h4>
                                    </div>
                                    <span className={styles.sectionHint}>
                                        Calibrated to fit your {effectiveWeeklyHours}-hour weekly teaching allocation
                                    </span>
                                </div>

                                <div className={styles.topicsGrid}>
                                    {recommendedTopics.map((t, idx) => renderTopicCard(t, idx + 1, false))}
                                </div>
                            </div>

                            {/* Alternative Topics Section (Lighter / Less Relevant Styling) */}
                            {alternativeTopics.length > 0 && (
                                <div className={`${styles.sectionBlock} ${styles.alternativeSectionBlock}`}>
                                    <div className={styles.sectionHeaderRow}>
                                        <div className={styles.sectionTitleGroup}>
                                            <span className={styles.alternativePill}>Optional Alternatives</span>
                                            <h4 className={styles.sectionHeadingMuted}>
                                                Alternative Topics &amp; Subtopics
                                            </h4>
                                        </div>
                                        <span className={styles.sectionHint}>
                                            Select to swap in or supplement (watch the weekly time indicator above)
                                        </span>
                                    </div>

                                    <div className={styles.topicsGrid}>
                                        {alternativeTopics.map((t, idx) =>
                                            renderTopicCard(t, recommendedTopics.length + idx + 1, true)
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Load More Alternative Topics */}
                            {topics.length > 0 && (
                                <div className={styles.loadMoreWrapper}>
                                    <button
                                        type="button"
                                        className={styles.loadMoreBtn}
                                        onClick={() => runGeneration(true)}
                                        disabled={isLoadingMore}
                                    >
                                        {isLoadingMore ? (
                                            <>
                                                <RefreshCw size={15} className={styles.loadMoreSpin} />
                                                <span>Generating Additional Alternative Subtopics...</span>
                                            </>
                                        ) : (
                                            <>
                                                <GeminiStar size={15} />
                                                <span>Generate More Alternative Topics</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.modalFooter}>
                    {phase === 'prev-week-changed-confirm' ? (
                        <>
                            <div className={styles.footerLeft}>
                                <div className={styles.selectionBadge}>
                                    Sequential continuity check for Week {weekNumber}
                                </div>
                            </div>
                            <div className={styles.footerActions}>
                                <button type="button" className={styles.cancelBtn} onClick={onClose}>
                                    Close
                                </button>
                            </div>
                        </>
                    ) : phase === 'ilo-select' ? (
                        <>
                            <div className={styles.footerLeft}>
                                <div className={styles.selectionBadge}>
                                    <span>{selectedIloIds.length}</span> of {ilos.length} ILO{ilos.length === 1 ? '' : 's'} Selected
                                </div>
                                {hasCachedSuggestions && (
                                    <button
                                        type="button"
                                        className={styles.toggleAllBtn}
                                        onClick={() => setPhase('results')}
                                    >
                                        Back to Existing Suggestions
                                    </button>
                                )}
                            </div>
                            <div className={styles.footerActions}>
                                <button type="button" className={styles.cancelBtn} onClick={onClose}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={styles.applyBtn}
                                    onClick={() => runGeneration(false)}
                                    disabled={ilos.length > 0 && selectedIloIds.length === 0}
                                >
                                    <GeminiStar size={15} />
                                    <span>Generate Aligned Topics &amp; Subtopics</span>
                                    <ArrowRight size={15} />
                                </button>
                            </div>
                        </>
                    ) : phase === 'loading' ? (
                        <>
                            <div className={styles.footerLeft}>
                                <div className={styles.selectionBadge}>
                                    Analyzing outcomes and calibrating subtopic durations...
                                </div>
                            </div>
                            <div className={styles.footerActions}>
                                <button type="button" className={styles.cancelBtn} onClick={onClose}>
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.footerLeft}>
                                <div className={styles.selectionBadge}>
                                    <span>{selectedTopicsCount}</span> Topic{selectedTopicsCount === 1 ? '' : 's'} (<span>{selectedSubtopicsCount}</span> Subtopics • <span>{formatMinutesToDuration(selectedTotalMinutes)}</span>)
                                </div>
                                <button
                                    type="button"
                                    className={styles.regenerateBtn}
                                    onClick={() => setPhase('ilo-select')}
                                    title="Return to the input data and ILO selection screen to regenerate suggestions"
                                >
                                    <RefreshCw size={13} />
                                    <span>Regenerate Again</span>
                                </button>
                            </div>
                            <div className={styles.footerActions}>
                                <button type="button" className={styles.cancelBtn} onClick={onClose}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={styles.applyBtn}
                                    onClick={handleApply}
                                    disabled={selectedTopicsCount === 0 && !hasPreviouslyImportedAiTopicsInForm}
                                >
                                    <Plus size={16} />
                                    <span>
                                        {selectedTopicsCount === 0 && hasPreviouslyImportedAiTopicsInForm
                                            ? 'Remove Imported Suggestions'
                                            : hasPreviouslyImportedAiTopicsInForm
                                                ? `Update Imported Topics (${selectedTopicsCount})`
                                                : `Import Selected Topics (${selectedTopicsCount})`}
                                    </span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiTopicSuggestModal;
