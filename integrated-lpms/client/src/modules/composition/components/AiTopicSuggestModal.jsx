import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    X,
    Check,
    RefreshCw,
    Plus,
    Clock,
    CheckCircle,
    AlertTriangle,
    ArrowRight,
    Layers,
    BookOpen,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Shield,
    AlertCircle,
    Bookmark
} from 'react-feather';
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

export function formatMinutesToDuration(totalMinutes) {
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
export function computePrevWeeksSignature(previousWeeksTopics = []) {
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

// Helper to compute a reactive fingerprint of ALL topics & subtopic minutes currently in this week
export function computeCurrentWeekTopicsFingerprint(weekId, isOrientation, currentTopics = []) {
    const key = `${isOrientation ? 'orient' : 'reg'}-${Number(weekId) || 0}`;
    if (!Array.isArray(currentTopics) || currentTopics.length === 0) {
        return `${key}::[]`;
    }
    const serialized = JSON.stringify(
        currentTopics.map(t => ({
            title: String(t?.title || '').trim(),
            isContinuation: Boolean(t?.isContinuation),
            subtopics: (Array.isArray(t?.subtopics) ? t.subtopics : []).map(s => ({
                title: String(typeof s === 'string' ? s : (s?.title || '')).trim(),
                estimated_minutes: s?.estimated_minutes === '' || s?.estimated_minutes === undefined || s?.estimated_minutes === null
                    ? null
                    : Number(s.estimated_minutes)
            }))
        }))
    );
    return `${key}::${serialized}`;
}

function getShortSupportingTypeLabel(type) {
    const lower = String(type || '').toLowerCase();
    if (lower.includes('open educational') || lower.includes('oer')) return 'OER';
    if (lower.includes('subscription')) return 'Subscription';
    if (lower.includes('online')) return 'Online Resource';
    return type || 'Supporting Ref';
}

function formatSourceHost(url) {
    if (!url) return '';
    try {
        return new URL(url).hostname.replace(/^www\./i, '');
    } catch {
        return '';
    }
}

const AiTopicSuggestModal = ({
    isOpen,
    onClose,
    onApplyTopics,
    iloId,
    pcOfferingId = null,
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
    weekTopicsFingerprint = '',
    weekAiCache,
    onUpdateWeekAiCache
}) => {
    // Phase: 'ilo-select' | 'loading' | 'results' | 'prev-week-changed-confirm'
    const [phase, setPhase] = useState('ilo-select');
    const [selectedIloIds, setSelectedIloIds] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [topics, setTopics] = useState([]);
    const [loadingStepIndex, setLoadingStepIndex] = useState(0);
    const [generationError, setGenerationError] = useState('');
    const [attachCitedRefs, setAttachCitedRefs] = useState(true);

    // Automatic Course Reference TOC Resolution State (100% Automatic — No Manual Paste)
    const [tocState, setTocState] = useState({
        loading: false,
        error: '',
        textbooks: [],
        supportingReferences: [],
        summary: null,
        loadedCourseKey: ''
    });
    const [recheckingRefIds, setRecheckingRefIds] = useState(() => new Set());
    const [expandedTocIds, setExpandedTocIds] = useState(() => new Set());
    const [showAllSupporting, setShowAllSupporting] = useState(false);

    const modalBodyRef = useRef(null);
    const lastSelectedIlosByWeekRef = useRef({});

    // 1. Live Remaining-Time Budget Math (Derived directly from ALL existing topics in this week)
    const effectiveWeeklyHours = Number(weeklyHours) > 0 ? Number(weeklyHours) : (isOrientation ? 2 : 3);
    const weeklyBudgetMins = Math.round(effectiveWeeklyHours * 60);

    const existingWeekTopics = useMemo(() => {
        return (Array.isArray(currentTopics) ? currentTopics : [])
            .map(t => {
                const subs = Array.isArray(t?.subtopics) ? t.subtopics : [];
                const normalizedSubs = subs.map(s => {
                    const rawMins = s?.estimated_minutes ?? s?.duration_mins ?? s?.minutes;
                    const parsedMins = Number(rawMins);
                    const mins = Number.isFinite(parsedMins) && parsedMins > 0 ? Math.round(parsedMins) : 0;
                    return {
                        title: String(typeof s === 'string' ? s : (s?.title || '')).trim(),
                        estimated_minutes: mins
                    };
                });
                const totalMinutes = normalizedSubs.reduce((sum, s) => sum + s.estimated_minutes, 0);
                return {
                    title: String(typeof t === 'string' ? t : (t?.title || '')).trim(),
                    totalMinutes,
                    subtopics: normalizedSubs
                };
            })
            .filter(t => Boolean(t.title) || t.totalMinutes > 0);
    }, [currentTopics]);

    const alreadyAllocatedMins = useMemo(
        () => existingWeekTopics.reduce((sum, t) => sum + t.totalMinutes, 0),
        [existingWeekTopics]
    );
    const remainingBudgetMins = Math.max(0, weeklyBudgetMins - alreadyAllocatedMins);
    const overflowMins = Math.max(0, alreadyAllocatedMins - weeklyBudgetMins);

    const isOverBudget = overflowMins > 0;
    const isBudgetFull = !isOverBudget && remainingBudgetMins === 0;

    const effectiveTopicsFingerprint = useMemo(
        () => weekTopicsFingerprint || computeCurrentWeekTopicsFingerprint(iloId, isOrientation, currentTopics),
        [weekTopicsFingerprint, iloId, isOrientation, currentTopics]
    );

    const currentPrevWeeksSignature = useMemo(
        () => computePrevWeeksSignature(previousWeeksTopics),
        [previousWeeksTopics]
    );

    // Cache is only valid if it matches the active week's live topics/minutes fingerprint
    const isCacheFreshForWeekTopics = Boolean(
        weekAiCache &&
        Array.isArray(weekAiCache.topics) &&
        weekAiCache.topics.length > 0 &&
        weekAiCache.weekTopicsFingerprint === effectiveTopicsFingerprint
    );

    // Course key for TOC lookup & per-week ILO selection memory
    const courseLookupKey = `${Number(iloId) || 0}:${Number(pcOfferingId) || 0}:${String(courseCode || '')}`;
    const weekIloPrefKey = `${Number(pcOfferingId) || 0}:${isOrientation ? 'orient' : 'reg'}-${Number(iloId) || 0}`;

    const saveRememberedIloIds = useCallback((prefKey, ids) => {
        if (!prefKey || !Array.isArray(ids) || ids.length === 0) return;
        lastSelectedIlosByWeekRef.current[prefKey] = ids;
        try {
            sessionStorage.setItem(`lpms_ai_selected_ilos_${prefKey}`, JSON.stringify(ids));
        } catch {
            // ignore storage quota/privacy errors
        }
    }, []);

    const readRememberedIloIds = useCallback((prefKey, validIds) => {
        if (!prefKey || !Array.isArray(validIds) || validIds.length === 0) return [];
        const validSet = new Set(validIds);
        let candidate = lastSelectedIlosByWeekRef.current[prefKey];
        if (!Array.isArray(candidate) || candidate.length === 0) {
            try {
                const raw = sessionStorage.getItem(`lpms_ai_selected_ilos_${prefKey}`);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) candidate = parsed;
                }
            } catch {
                // ignore storage read errors
            }
        }
        if (!Array.isArray(candidate) || candidate.length === 0) return [];
        return candidate.filter(id => validSet.has(id));
    }, []);

    // Automatic Course References TOC Resolution on Step 1 Open
    const loadCourseReferenceTocs = useCallback(async ({ forceRefresh = false, referenceIds = null } = {}) => {
        if (!iloId && !pcOfferingId && !courseCode) return;

        const isTargeted = Array.isArray(referenceIds) && referenceIds.length > 0;
        if (isTargeted) {
            setRecheckingRefIds(prev => {
                const next = new Set(prev);
                referenceIds.forEach(id => next.add(Number(id)));
                return next;
            });
        } else {
            setTocState(prev => ({ ...prev, loading: true, error: '' }));
        }

        try {
            const data = await fetchJson('/api/references/resolve-tocs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekId: iloId || null,
                    pcOfferingId: pcOfferingId || null,
                    courseNo: courseCode || null,
                    ...(isTargeted ? { referenceIds } : {}),
                    forceRefresh: Boolean(forceRefresh)
                })
            });

            setTocState({
                loading: false,
                error: '',
                textbooks: Array.isArray(data?.textbooks) ? data.textbooks : [],
                supportingReferences: Array.isArray(data?.supportingReferences) ? data.supportingReferences : [],
                summary: data?.summary || null,
                loadedCourseKey: courseLookupKey
            });
        } catch (err) {
            console.error('Failed to resolve course reference TOCs:', err);
            if (!isTargeted) {
                setTocState(prev => ({
                    ...prev,
                    loading: false,
                    error: err?.message || 'Unable to verify course reference Tables of Contents right now.'
                }));
            }
        } finally {
            if (isTargeted) {
                setRecheckingRefIds(prev => {
                    const next = new Set(prev);
                    referenceIds.forEach(id => next.delete(Number(id)));
                    return next;
                });
            }
        }
    }, [iloId, pcOfferingId, courseCode, courseLookupKey]);

    // Trigger automatic TOC resolution when modal opens
    useEffect(() => {
        if (!isOpen) return;
        loadCourseReferenceTocs({ forceRefresh: false });
    }, [isOpen, loadCourseReferenceTocs]);

    // Initialize, restore, or invalidate modal state when opened or when week topics change
    useEffect(() => {
        if (!isOpen) return;

        const allIds = (ilos || []).map((ilo, idx) => ilo.ilo_id ?? `ilo-${idx}`);
        const validSet = new Set(allIds);
        const rememberedIds = readRememberedIloIds(weekIloPrefKey, allIds);
        setGenerationError('');
        setAttachCitedRefs(true);

        if (isCacheFreshForWeekTopics && !isOverBudget && !isBudgetFull) {
            const cachedValidIlos = Array.isArray(weekAiCache.selectedIloIds)
                ? weekAiCache.selectedIloIds.filter(id => validSet.has(id))
                : [];
            const restoredIlos = cachedValidIlos.length > 0
                ? cachedValidIlos
                : (rememberedIds.length > 0 ? rememberedIds : allIds);
            setSelectedIloIds(restoredIlos);
            saveRememberedIloIds(weekIloPrefKey, restoredIlos);
            setTopics(weekAiCache.topics);

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
            // Stale cache (manual topics or minutes changed) or fresh open -> reset to Step 1
            // while preserving the instructor's previously selected ILO(s) for this week.
            if (weekAiCache && !isCacheFreshForWeekTopics && onUpdateWeekAiCache) {
                onUpdateWeekAiCache(null);
            }
            setSelectedIloIds(rememberedIds.length > 0 ? rememberedIds : allIds);
            setTopics([]);
            setLoadingStepIndex(0);
            setPhase('ilo-select');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, iloId, coNumber, weekNumber, isOrientation, effectiveTopicsFingerprint]);

    // Reference grounding counts
    const verifiedTextbooks = useMemo(
        () => tocState.textbooks.filter(r => Boolean(r.is_verified)),
        [tocState.textbooks]
    );
    const unverifiedTextbooks = useMemo(
        () => tocState.textbooks.filter(r => !r.is_verified),
        [tocState.textbooks]
    );
    const verifiedSupporting = useMemo(
        () => tocState.supportingReferences.filter(r => Boolean(r.is_verified)),
        [tocState.supportingReferences]
    );
    const unverifiedSupporting = useMemo(
        () => tocState.supportingReferences.filter(r => !r.is_verified),
        [tocState.supportingReferences]
    );

    const hasVerifiedTextbook = verifiedTextbooks.length > 0;
    const isGenerateBlocked =
        tocState.loading ||
        !hasVerifiedTextbook ||
        isOverBudget ||
        isBudgetFull ||
        (ilos.length > 0 && selectedIloIds.length === 0);

    // Step-by-step live actions shown while AI is analyzing and generating (never mentioning specific AI model names)
    const loadingSteps = useMemo(() => {
        const steps = [
            {
                title: 'Grounding Against Verified Course Textbook TOCs',
                detail: `Cross-checking ${verifiedTextbooks.length} verified Textbook${verifiedTextbooks.length === 1 ? '' : 's'}${verifiedSupporting.length > 0 ? ` and ${verifiedSupporting.length} verified supporting resource${verifiedSupporting.length === 1 ? '' : 's'}` : ''} to ensure real chapter citations...`
            },
            {
                title: isOrientation
                    ? 'Understanding Course Orientation Objectives'
                    : `Understanding Course Outcome (CO ${coNumber}) & ${selectedIloIds.length} Selected ILO${selectedIloIds.length === 1 ? '' : 's'}`,
                detail: coDescription
                    ? `Aligning with "${coDescription.slice(0, 95)}${coDescription.length > 95 ? '...' : ''}"`
                    : 'Mapping expected course outcome competencies and learning outcomes...'
            },
            ...(existingWeekTopics.length > 0
                ? [{
                    title: `Checking ${existingWeekTopics.length} Existing Topic${existingWeekTopics.length === 1 ? '' : 's'} Already in Week ${weekNumber}`,
                    detail: `Avoiding duplicates with ${formatMinutesToDuration(alreadyAllocatedMins)} already allocated in this week...`
                }]
                : []
            ),
            ...(Number(weekNumber) > 1 && !isOrientation
                ? [{
                    title: `Checking Assigned Topics from Previous Week${Number(weekNumber) > 2 ? `s (Weeks 1–${Number(weekNumber) - 1})` : ' (Week 1)'}`,
                    detail: previousWeeksTopics.length > 0
                        ? `Reviewing ${previousWeeksTopics.reduce((acc, w) => acc + (w.topics?.length || 0), 0)} topic(s) from earlier weeks to maintain sequential progression...`
                        : 'Verifying prior weeks to ensure logical sequence and zero topic duplication...'
                }]
                : [{
                    title: 'Applying First-Week Foundational Sequencing',
                    detail: 'Structuring introductory concepts tailored for the opening week of this Course Outcome...'
                }]
            ),
            {
                title: `Calibrating Subtopics to Remaining ${formatMinutesToDuration(remainingBudgetMins)} (${remainingBudgetMins} mins)`,
                detail: alreadyAllocatedMins > 0
                    ? `Equalizing Week ${weekNumber} from ${formatMinutesToDuration(alreadyAllocatedMins)} existing to ${formatMinutesToDuration(weeklyBudgetMins)} total weekly allocation...`
                    : `Assigning exact minute weights to match your ${formatMinutesToDuration(weeklyBudgetMins)} weekly teaching allocation...`
            }
        ];
        return steps;
    }, [
        verifiedTextbooks.length,
        verifiedSupporting.length,
        isOrientation,
        coNumber,
        selectedIloIds.length,
        coDescription,
        existingWeekTopics.length,
        weekNumber,
        alreadyAllocatedMins,
        previousWeeksTopics,
        remainingBudgetMins,
        weeklyBudgetMins
    ]);

    const persistToWeekCache = useCallback((nextTopics, nextSelectedIloIds = selectedIloIds, nextPrevSig = currentPrevWeeksSignature) => {
        if (onUpdateWeekAiCache) {
            onUpdateWeekAiCache({
                topics: nextTopics,
                selectedIloIds: nextSelectedIloIds,
                prevWeeksSignature: nextPrevSig,
                weekTopicsFingerprint: effectiveTopicsFingerprint
            });
        }
    }, [onUpdateWeekAiCache, selectedIloIds, currentPrevWeeksSignature, effectiveTopicsFingerprint]);

    const toggleIloSelection = (id) => {
        setSelectedIloIds(prev => {
            const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
            if (next.length > 0) {
                saveRememberedIloIds(weekIloPrefKey, next);
            }
            return next;
        });
    };

    const handleSelectAllIlos = () => {
        const allIds = (ilos || []).map((ilo, idx) => ilo.ilo_id ?? `ilo-${idx}`);
        if (selectedIloIds.length === allIds.length) {
            setSelectedIloIds([]);
        } else {
            setSelectedIloIds(allIds);
            saveRememberedIloIds(weekIloPrefKey, allIds);
        }
    };

    const togglePreviewToc = (refId) => {
        const idNum = Number(refId);
        setExpandedTocIds(prev => {
            const next = new Set(prev);
            if (next.has(idNum)) {
                next.delete(idNum);
            } else {
                next.add(idNum);
            }
            return next;
        });
    };

    const runGeneration = useCallback(async (isLoadMore = false) => {
        if (!isLoadMore && isGenerateBlocked) return;

        if (selectedIloIds.length > 0) {
            saveRememberedIloIds(weekIloPrefKey, selectedIloIds);
        }
        setGenerationError('');
        const chosenIlos = (ilos || []).filter((ilo, idx) =>
            selectedIloIds.includes(ilo.ilo_id ?? `ilo-${idx}`)
        );

        if (isLoadMore) {
            setIsLoadingMore(true);
        } else {
            setPhase('loading');
            setLoadingStepIndex(0);
        }

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
                }, 520);
            })
            : Promise.resolve();

        try {
            const alreadySuggested = isLoadMore ? topics.map(t => t.title) : [];

            const [res] = await Promise.all([
                fetchJson('/api/topics/ai-suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        iloId,
                        weekId: iloId,
                        pcOfferingId,
                        courseCode,
                        courseDescription,
                        coNumber,
                        coDescription,
                        weekNumber,
                        weeklyHours: effectiveWeeklyHours,
                        weeklyBudgetMins,
                        alreadyAllocatedMins,
                        remainingBudgetMins,
                        isOrientation,
                        selectedIlos: chosenIlos.map(i => ({
                            ilo_id: i.ilo_id,
                            description: i.description
                        })),
                        previousWeeksTopics,
                        existingWeekTopics,
                        alreadySuggested,
                        isLoadMore
                    })
                }),
                minWaitPromise
            ]);

            const recRaw = Array.isArray(res?.recommendedTopics) ? res.recommendedTopics : [];
            const altRaw = Array.isArray(res?.alternativeTopics) ? res.alternativeTopics : [];

            const mapTopicItem = (t, idx, forceAlt = false) => {
                const isAlt = forceAlt || Boolean(t.isAlternative);
                const subs = (Array.isArray(t.subtopics) ? t.subtopics : []).map((s, sIdx) => {
                    const rawMins = s?.duration_mins ?? s?.minutes ?? s?.estimated_minutes;
                    const exactMins = Number.isFinite(Number(rawMins)) && Number(rawMins) > 0
                        ? Math.round(Number(rawMins))
                        : 30;
                    return {
                        id: s.id || `sub-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${sIdx}-${Math.random().toString(36).slice(2, 6)}`,
                        title: typeof s === 'string' ? s : s.title,
                        duration_mins: exactMins,
                        minutes: exactMins,
                        checked: !isAlt
                    };
                });

                return {
                    id: t.id || `topic-${Date.now()}-${isAlt ? 'alt' : 'rec'}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                    title: t.title,
                    isAlternative: isAlt,
                    checked: !isAlt,
                    primary_textbook: t.primary_textbook || null,
                    supporting_references: Array.isArray(t.supporting_references) ? t.supporting_references : [],
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
            setGenerationError(err?.message || 'Unable to generate textbook-grounded topic suggestions. Please try again.');
            if (!isLoadMore) {
                setPhase('ilo-select');
            }
        } finally {
            if (stepTimer) clearInterval(stepTimer);
            setIsLoadingMore(false);
        }
    }, [
        isGenerateBlocked,
        ilos,
        selectedIloIds,
        loadingSteps.length,
        topics,
        iloId,
        pcOfferingId,
        courseCode,
        courseDescription,
        coNumber,
        coDescription,
        weekNumber,
        effectiveWeeklyHours,
        weeklyBudgetMins,
        alreadyAllocatedMins,
        remainingBudgetMins,
        isOrientation,
        previousWeeksTopics,
        existingWeekTopics,
        persistToWeekCache,
        currentPrevWeeksSignature,
        saveRememberedIloIds,
        weekIloPrefKey
    ]);

    if (!isOpen) return null;

    // Checkbox interaction handlers
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

    const handleConfirmRegenerateFromPrevWeekChange = () => {
        setPhase('ilo-select');
    };

    const handleKeepExistingSuggestionsDespitePrevWeekChange = () => {
        persistToWeekCache(topics, selectedIloIds, currentPrevWeeksSignature);
        setPhase('results');
    };

    // Per-topic minute helpers
    const getTopicSelectedMinutes = (topic) =>
        (topic.subtopics || []).reduce((sum, s) => sum + (s.checked ? (Number(s.duration_mins ?? s.minutes) || 0) : 0), 0);

    const getTopicFullMinutes = (topic) =>
        (topic.subtopics || []).reduce((sum, s) => sum + (Number(s.duration_mins ?? s.minutes) || 0), 0);

    const recommendedTopics = topics.filter(t => !t.isAlternative);
    const alternativeTopics = topics.filter(t => t.isAlternative);

    // Live Step 2 Time Alignment Math: Existing + AI Selected vs Weekly Target
    const aiSelectedMinutes = topics.reduce((sum, t) => sum + getTopicSelectedMinutes(t), 0);
    const newWeekTotalMinutes = alreadyAllocatedMins + aiSelectedMinutes;
    const timeDiffMinutes = newWeekTotalMinutes - weeklyBudgetMins;
    const timeStatus = timeDiffMinutes === 0
        ? 'exact'
        : (timeDiffMinutes < 0 ? 'under' : 'over');

    const selectedTopicsList = topics.filter(t => t.checked && t.subtopics.some(s => s.checked));
    const selectedTopicsCount = selectedTopicsList.length;
    const selectedSubtopicsCount = topics.reduce((sum, t) => sum + t.subtopics.filter(s => s.checked).length, 0);

    // Unique cited reference IDs across currently selected AI topics (for auto-attach toggle)
    const selectedCitedRefIds = (() => {
        const idSet = new Set();
        selectedTopicsList.forEach(t => {
            if (t.primary_textbook?.reference_id) {
                idSet.add(Number(t.primary_textbook.reference_id));
            }
            (t.supporting_references || []).forEach(sr => {
                if (sr?.reference_id) {
                    idSet.add(Number(sr.reference_id));
                }
            });
        });
        return [...idSet].filter(id => Number.isInteger(id) && id > 0);
    })();

    // Append-Only Exact-Duration Import
    const handleApply = () => {
        if (selectedTopicsCount === 0) return;

        const now = Date.now();
        const formattedForForm = selectedTopicsList.map((t, idx) => {
            const activeSubs = t.subtopics.filter(s => s.checked);
            return {
                topic_id: null,
                _temp_id: `temp-topic-ai-${now}-${idx}`,
                aiSourceTopicId: t.id,
                title: t.title,
                isContinuation: false,
                isAiSuggested: true,
                isManual: true,
                primary_textbook: t.primary_textbook || null,
                supporting_references: Array.isArray(t.supporting_references) ? t.supporting_references : [],
                subtopics: activeSubs.map((s, sIdx) => {
                    const exactMins = Math.max(1, Math.min(999, Math.round(Number(s.duration_mins ?? s.minutes) || 30)));
                    return {
                        subtopic_id: null,
                        _temp_id: `temp-sub-ai-${now}-${idx}-${sIdx}`,
                        aiSourceSubtopicId: s.id,
                        title: s.title,
                        duration_mins: exactMins,
                        estimated_minutes: exactMins,
                        sequence_order: sIdx
                    };
                })
            };
        });

        // Preserve instructor's selected ILOs for this week even as we clear the stale topic cache
        if (selectedIloIds.length > 0) {
            saveRememberedIloIds(weekIloPrefKey, selectedIloIds);
        }

        // Clear cache since appending these topics changes this week's live remaining time
        if (onUpdateWeekAiCache) {
            onUpdateWeekAiCache(null);
        }

        onApplyTopics(formattedForForm, attachCitedRefs ? selectedCitedRefIds : []);
        onClose();
    };

    // Render a single Course Reference row inside Step 1 Reference Grounding Card (100% Automatic TOC UI)
    const renderReferenceRow = (refItem, isTextbookGroup) => {
        const refId = Number(refItem.reference_id);
        const isVerified = Boolean(refItem.is_verified);
        const isRechecking = recheckingRefIds.has(refId);
        const isExpanded = expandedTocIds.has(refId);
        const entries = Array.isArray(refItem.toc_entries) ? refItem.toc_entries : [];
        const unitLabel = isTextbookGroup
            ? (entries.length === 1 ? 'chapter' : 'chapters')
            : (entries.length === 1 ? 'section' : 'sections');

        return (
            <div
                key={refId}
                className={`${styles.refRowCard} ${isVerified ? styles.refRowVerified : styles.refRowUnverified}`}
            >
                <div className={styles.refRowMain}>
                    <div className={styles.refRowInfo}>
                        <div className={styles.refRowTitleLine}>
                            <span className={styles.refRowTitle} title={refItem.title}>
                                {refItem.title}
                            </span>
                            {!isTextbookGroup && (
                                <span className={styles.refTypeMiniTag}>
                                    {getShortSupportingTypeLabel(refItem.type)}
                                </span>
                            )}
                        </div>
                        <div className={styles.refRowSubmeta}>
                            {refItem.author && <span>{refItem.author}</span>}
                            {refItem.publication_year && <span>• {refItem.publication_year}</span>}
                            {refItem.isbn && <span>• ISBN {refItem.isbn}</span>}
                        </div>
                    </div>

                    <div className={styles.refRowActions}>
                        {isVerified ? (
                            <span className={styles.tocVerifiedPill}>
                                <CheckCircle size={12} />
                                <span>TOC Verified ({entries.length} {unitLabel})</span>
                            </span>
                        ) : (
                            <span className={styles.tocNotFoundPill}>
                                <AlertTriangle size={12} />
                                <span>TOC Not Found — Excluded</span>
                            </span>
                        )}

                        {isVerified && entries.length > 0 && (
                            <button
                                type="button"
                                className={styles.previewTocBtn}
                                onClick={() => togglePreviewToc(refId)}
                                aria-expanded={isExpanded}
                            >
                                <span>{isExpanded ? 'Hide TOC' : 'Preview TOC'}</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                        )}

                        <button
                            type="button"
                            className={styles.recheckTocIconBtn}
                            onClick={() => loadCourseReferenceTocs({ referenceIds: [refId], forceRefresh: true })}
                            disabled={isRechecking || tocState.loading}
                            title="Re-check Table of Contents online"
                            aria-label={`Re-check TOC for ${refItem.title}`}
                        >
                            <RefreshCw size={13} className={isRechecking ? styles.loadMoreSpin : ''} />
                        </button>
                    </div>
                </div>

                {isVerified && isExpanded && entries.length > 0 && (
                    <div className={styles.tocPreviewDrawer}>
                        <div className={styles.tocPreviewHeader}>
                            <span>Verified Published Outline ({entries.length} {unitLabel})</span>
                            {refItem.source_url && (
                                <a
                                    href={refItem.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.tocSourceLink}
                                >
                                    <span>Source: {formatSourceHost(refItem.source_url) || 'Verified URL'}</span>
                                    <ExternalLink size={11} />
                                </a>
                            )}
                        </div>
                        <ol className={styles.tocPreviewList}>
                            {entries.map((entry, idx) => (
                                <li key={idx} className={styles.tocPreviewItem}>
                                    <div className={styles.tocChapterLine}>
                                        {entry.chapter && (
                                            <span className={styles.tocChapterTag}>{entry.chapter}</span>
                                        )}
                                        <span className={styles.tocChapterTitle}>{entry.title}</span>
                                    </div>
                                    {Array.isArray(entry.sections) && entry.sections.length > 0 && (
                                        <div className={styles.tocSectionsLine}>
                                            {entry.sections.slice(0, 6).join(' • ')}
                                            {entry.sections.length > 6 ? ` (+${entry.sections.length - 6} more)` : ''}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        );
    };

    // Render a single Step 2 AI Topic Card with Textbook & Supporting Reference Citation Pills
    const renderTopicCard = (t, badgeNum, isAlternativeCard = false) => {
        const isCardChecked = t.checked && t.subtopics.some(s => s.checked);
        const activeTopicMins = getTopicSelectedMinutes(t);
        const fullTopicMins = getTopicFullMinutes(t);
        const displayedTopicMins = isCardChecked ? activeTopicMins : fullTopicMins;
        const primaryBook = t.primary_textbook;
        const supportingRefs = Array.isArray(t.supporting_references) ? t.supporting_references : [];

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
                                <span
                                    className={`${styles.topicDurationBadge} ${isCardChecked ? styles.topicDurationActive : styles.topicDurationMuted}`}
                                    title="Exact instructional duration written to subtopics on import"
                                >
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

                {/* Verified Textbook & Optional Supporting Reference Citation Pills */}
                {(primaryBook || supportingRefs.length > 0) && (
                    <div className={styles.citationsStrip}>
                        {primaryBook && (
                            <div
                                className={styles.primaryTextbookPill}
                                title={`Primary Textbook: ${primaryBook.title}${primaryBook.chapter_or_section ? ` — ${primaryBook.chapter_or_section}` : ''}`}
                            >
                                <BookOpen size={11} className={styles.citationIcon} />
                                <span className={styles.citationText}>
                                    <strong>Textbook:</strong> {primaryBook.title}
                                    {primaryBook.chapter_or_section ? ` — ${primaryBook.chapter_or_section}` : ''}
                                </span>
                            </div>
                        )}
                        {supportingRefs.map((sr, srIdx) => (
                            <div
                                key={`${sr.reference_id || srIdx}`}
                                className={styles.supportingRefPill}
                                title={`${sr.type || 'Supporting Reference'}: ${sr.title}${sr.section ? ` — ${sr.section}` : ''}`}
                            >
                                <Bookmark size={11} className={styles.citationIcon} />
                                <span className={styles.citationText}>
                                    <strong>{getShortSupportingTypeLabel(sr.type)}:</strong> {sr.title}
                                    {sr.section ? ` — ${sr.section}` : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Topic Body: Subtopics with exact integer minutes */}
                <div className={styles.topicCardBody}>
                    {(t.subtopics || []).map((s) => {
                        const isSubChecked = s.checked;
                        const subMins = Number(s.duration_mins ?? s.minutes) || 30;
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
                                    <span
                                        className={`${styles.subtopicWeightPill} ${isSubChecked ? styles.subtopicWeightActive : styles.subtopicWeightMuted}`}
                                        title="Exact duration in minutes applied directly on import"
                                    >
                                        {subMins} mins
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

    const visibleSupportingRefs = showAllSupporting
        ? tocState.supportingReferences
        : tocState.supportingReferences.slice(0, 4);

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
                                Weekly Budget: {formatMinutesToDuration(weeklyBudgetMins)} ({weeklyBudgetMins} mins)
                                {alreadyAllocatedMins > 0 && (
                                    <> • Allocated: {formatMinutesToDuration(alreadyAllocatedMins)} • Remaining: {formatMinutesToDuration(remainingBudgetMins)}</>
                                )}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                {/* Top 4-Part Weekly Time Alignment Bar (shown in Step 2 Results View) */}
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
                                        `${alreadyAllocatedMins > 0 ? `${formatMinutesToDuration(alreadyAllocatedMins)} existing + ${formatMinutesToDuration(aiSelectedMinutes)} AI selected equals` : 'Selected subtopics match'} the ${formatMinutesToDuration(weeklyBudgetMins)} (${weeklyBudgetMins} mins) weekly target.`}
                                    {timeStatus === 'under' &&
                                        `New week total is ${formatMinutesToDuration(newWeekTotalMinutes)} out of ${formatMinutesToDuration(weeklyBudgetMins)}. Select additional subtopics to equalize.`}
                                    {timeStatus === 'over' &&
                                        `New week total is ${formatMinutesToDuration(newWeekTotalMinutes)}, exceeding the ${formatMinutesToDuration(weeklyBudgetMins)} weekly budget. Uncheck subtopics to stay within limit.`}
                                </p>
                            </div>
                        </div>

                        <div className={styles.budgetMetricsRight}>
                            <div className={styles.metricBox}>
                                <span className={styles.metricLabel}>Weekly Target</span>
                                <span className={styles.metricValue}>
                                    {formatMinutesToDuration(weeklyBudgetMins)}
                                </span>
                            </div>
                            <div className={styles.metricBox}>
                                <span className={styles.metricLabel}>Existing</span>
                                <span className={styles.metricValue}>
                                    {formatMinutesToDuration(alreadyAllocatedMins)}
                                </span>
                            </div>
                            <div className={styles.metricBox}>
                                <span className={styles.metricLabel}>AI Selected</span>
                                <span className={styles.metricValue}>
                                    {formatMinutesToDuration(aiSelectedMinutes)}
                                </span>
                            </div>
                            <div className={`${styles.metricBox} ${styles.metricBoxSelected}`}>
                                <span className={styles.metricLabel}>New Week Total</span>
                                <span className={styles.metricValueHighlight}>
                                    {formatMinutesToDuration(newWeekTotalMinutes)} / {formatMinutesToDuration(weeklyBudgetMins)}
                                </span>
                            </div>
                            {timeStatus !== 'exact' && (
                                <button
                                    type="button"
                                    className={styles.resetBudgetBtn}
                                    onClick={handleResetToRecommended}
                                    title="Restore pre-selected recommended subtopics calibrated to remaining weekly time"
                                >
                                    Reset to Match
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

                    {/* STEP 1: Remaining Time Breakdown, Verified Course References & ILO Selection */}
                    {phase === 'ilo-select' && (
                        <div className={styles.iloSetupContainer}>
                            {/* Live Remaining-Time Budget Breakdown Strip */}
                            <div className={styles.sequentialMetaStrip}>
                                <div className={styles.metaChip}>
                                    <Clock size={14} />
                                    <span>
                                        <strong>Weekly Budget:</strong> {formatMinutesToDuration(weeklyBudgetMins)} ({weeklyBudgetMins} mins)
                                    </span>
                                </div>
                                {alreadyAllocatedMins > 0 && (
                                    <div className={`${styles.metaChip} ${styles.metaChipAllocated}`}>
                                        <span>
                                            <strong>Already Allocated:</strong> {formatMinutesToDuration(alreadyAllocatedMins)} ({alreadyAllocatedMins} mins)
                                        </span>
                                    </div>
                                )}
                                <div
                                    className={`${styles.metaChip} ${
                                        isOverBudget
                                            ? styles.metaChipOver
                                            : isBudgetFull
                                                ? styles.metaChipFull
                                                : styles.metaChipRemaining
                                    }`}
                                >
                                    <span>
                                        <strong>Remaining to Fill (AI Target):</strong> {formatMinutesToDuration(remainingBudgetMins)} ({remainingBudgetMins} mins)
                                    </span>
                                </div>
                                {Number(weekNumber) > 1 && !isOrientation && (
                                    <div className={`${styles.metaChip} ${styles.metaChipSequential}`}>
                                        <span>
                                            <strong>Prior Weeks (1–{Number(weekNumber) - 1}):</strong>{' '}
                                            {previousWeeksTopics.reduce((sum, w) => sum + (w.topics?.length || 0), 0)} topic(s) checked for continuity
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Edge-Case Time Budget Guards (Over Budget / Fully Allocated) */}
                            {isOverBudget && (
                                <div className={`${styles.guardBanner} ${styles.guardBannerDanger}`}>
                                    <AlertTriangle size={18} className={styles.guardBannerIcon} />
                                    <div className={styles.guardBannerText}>
                                        <strong>Week {weekNumber} is currently over budget by {formatMinutesToDuration(overflowMins)} ({alreadyAllocatedMins} / {weeklyBudgetMins} mins).</strong>{' '}
                                        Reduce existing subtopic durations in the Topics panel before requesting AI suggestions.
                                    </div>
                                </div>
                            )}

                            {isBudgetFull && (
                                <div className={`${styles.guardBanner} ${styles.guardBannerSuccess}`}>
                                    <CheckCircle size={18} className={styles.guardBannerIcon} />
                                    <div className={styles.guardBannerText}>
                                        <strong>Weekly time budget is already fully allocated ({formatMinutesToDuration(alreadyAllocatedMins)} / {formatMinutesToDuration(weeklyBudgetMins)}).</strong>{' '}
                                        Remove or shorten existing subtopics to request additional AI suggestions.
                                    </div>
                                </div>
                            )}

                            {generationError && (
                                <div className={`${styles.guardBanner} ${styles.guardBannerDanger}`}>
                                    <AlertCircle size={18} className={styles.guardBannerIcon} />
                                    <div className={styles.guardBannerText}>
                                        <strong>Generation Blocked:</strong> {generationError}
                                    </div>
                                </div>
                            )}

                            {/* Existing Topics Already in Active Week (Duplicate Prevention Preview) */}
                            {existingWeekTopics.length > 0 && (
                                <div className={styles.existingWeekBox}>
                                    <div className={styles.prevWeeksHeader}>
                                        Existing Topics Already in Week {weekNumber} (AI will complement without duplicating):
                                    </div>
                                    <div className={styles.existingWeekChips}>
                                        {existingWeekTopics.map((t, idx) => (
                                            <span key={idx} className={styles.existingTopicChip}>
                                                {t.title || `Untitled Topic #${idx + 1}`} ({t.totalMinutes} mins)
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

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

                            {/* COURSE REFERENCES GROUNDING CARD (100% Automatic TOC Verification — No Manual Paste) */}
                            <div className={styles.refGroundingCard}>
                                <div className={styles.refGroundingHeader}>
                                    <div className={styles.refGroundingTitleGroup}>
                                        <Shield size={16} className={styles.refGroundingShield} />
                                        <div>
                                            <h4 className={styles.refGroundingTitle}>
                                                Course References Grounding (Verified Table of Contents)
                                            </h4>
                                            <p className={styles.refGroundingSubtitle}>
                                                Topics are grounded strictly in verified published Textbook chapters. OER &amp; Online Resources serve as optional supporting citations.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className={styles.recheckAllBtn}
                                        onClick={() => loadCourseReferenceTocs({ forceRefresh: true })}
                                        disabled={tocState.loading}
                                        title="Re-verify all course references online"
                                    >
                                        <RefreshCw size={12} className={tocState.loading ? styles.loadMoreSpin : ''} />
                                        <span>{tocState.loading ? 'Verifying TOCs...' : 'Re-check All'}</span>
                                    </button>
                                </div>

                                {tocState.loading ? (
                                    <div className={styles.tocLoadingBox}>
                                        <RefreshCw size={16} className={styles.loadMoreSpin} />
                                        <span>Automatically retrieving and verifying Tables of Contents for this course&apos;s Textbooks and supporting resources...</span>
                                    </div>
                                ) : tocState.error ? (
                                    <div className={`${styles.guardBanner} ${styles.guardBannerDanger}`}>
                                        <AlertCircle size={16} className={styles.guardBannerIcon} />
                                        <div className={styles.guardBannerText}>{tocState.error}</div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Mandatory Textbook Blocking Guard */}
                                        {!hasVerifiedTextbook && (
                                            <div className={`${styles.guardBanner} ${styles.guardBannerDanger}`}>
                                                <AlertTriangle size={17} className={styles.guardBannerIcon} />
                                                <div className={styles.guardBannerText}>
                                                    <strong>Cannot Generate Yet — No Verified Textbook TOC Found.</strong>{' '}
                                                    {tocState.textbooks.length === 0
                                                        ? 'This course has no Textbooks registered in the References repository yet. Add a course Textbook with a valid ISBN first.'
                                                        : 'None of this course\'s Textbooks currently have a verified Table of Contents online. Click the Re-check TOC icon on a Textbook or verify its ISBN in References Management (OER and Online Resources are supporting references only).'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Honest Exclusion Notice Banner */}
                                        {(unverifiedTextbooks.length > 0 || unverifiedSupporting.length > 0) && hasVerifiedTextbook && (
                                            <div className={styles.honestExclusionBanner}>
                                                <AlertCircle size={15} className={styles.honestExclusionIcon} />
                                                <div className={styles.honestExclusionText}>
                                                    <strong>Anti-Hallucination Notice:</strong>{' '}
                                                    {unverifiedTextbooks.length > 0 && (
                                                        <span>
                                                            {unverifiedTextbooks.length} Textbook{unverifiedTextbooks.length === 1 ? '' : 's'} ({unverifiedTextbooks.map(b => `"${b.title}"`).join(', ')})
                                                        </span>
                                                    )}
                                                    {unverifiedTextbooks.length > 0 && unverifiedSupporting.length > 0 && ' and '}
                                                    {unverifiedSupporting.length > 0 && (
                                                        <span>
                                                            {unverifiedSupporting.length} supporting resource{unverifiedSupporting.length === 1 ? '' : 's'}
                                                        </span>
                                                    )}{' '}
                                                    could not be verified online and {unverifiedTextbooks.length + unverifiedSupporting.length === 1 ? 'is' : 'are'} excluded from AI generation so chapters are never fabricated.
                                                </div>
                                            </div>
                                        )}

                                        {/* Group 1: Primary Textbooks (Required Basis) */}
                                        <div className={styles.refGroupSection}>
                                            <div className={styles.refGroupHeader}>
                                                <span className={styles.refGroupLabel}>
                                                    Primary Textbooks <span className={styles.requiredTag}>Required Basis</span>
                                                </span>
                                                <span className={styles.refGroupCount}>
                                                    {verifiedTextbooks.length} / {tocState.textbooks.length} Verified
                                                </span>
                                            </div>
                                            {tocState.textbooks.length > 0 ? (
                                                <div className={styles.refRowsList}>
                                                    {tocState.textbooks.map(tb => renderReferenceRow(tb, true))}
                                                </div>
                                            ) : (
                                                <div className={styles.emptyRefNotice}>
                                                    No Textbooks found for this course in the References repository.
                                                </div>
                                            )}
                                        </div>

                                        {/* Group 2: Supporting References (OER / Online Resources — Optional) */}
                                        {tocState.supportingReferences.length > 0 && (
                                            <div className={styles.refGroupSection}>
                                                <div className={styles.refGroupHeader}>
                                                    <span className={styles.refGroupLabel}>
                                                        Supporting References <span className={styles.optionalTag}>OER / Online — Optional</span>
                                                    </span>
                                                    <span className={styles.refGroupCount}>
                                                        {verifiedSupporting.length} / {tocState.supportingReferences.length} Verified
                                                    </span>
                                                </div>
                                                <div className={styles.refRowsList}>
                                                    {visibleSupportingRefs.map(sr => renderReferenceRow(sr, false))}
                                                </div>
                                                {tocState.supportingReferences.length > 4 && (
                                                    <button
                                                        type="button"
                                                        className={styles.showMoreRefsBtn}
                                                        onClick={() => setShowAllSupporting(prev => !prev)}
                                                    >
                                                        {showAllSupporting
                                                            ? 'Show fewer supporting references'
                                                            : `Show all ${tocState.supportingReferences.length} supporting references (${tocState.supportingReferences.length - 4} more)`}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Previous Weeks Preview if on Week > 1 */}
                            {Number(weekNumber) > 1 && !isOrientation && previousWeeksTopics.length > 0 && (
                                <div className={styles.prevWeeksBox}>
                                    <div className={styles.prevWeeksHeader}>
                                        Topics &amp; Subtopics from Previous Weeks (Sequential Context):
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

                    {/* LOADING PHASE: Step-by-Step Action Loading Screen (No mention of specific AI brand/model) */}
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
                                Synthesizing Textbook-Grounded Topics &amp; Subtopics
                            </div>
                            <p className={styles.loadingDescription}>
                                Calibrating verified chapter subtopics to fill the remaining {formatMinutesToDuration(remainingBudgetMins)} ({remainingBudgetMins} mins) for Week {weekNumber}...
                            </p>

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

                    {/* STEP 2: Results View — Recommended Pre-Selected Topics (matching remainingBudgetMins) + Alternative Topics */}
                    {phase === 'results' && (
                        <div className={styles.resultsWrapper}>
                            {generationError && (
                                <div className={`${styles.guardBanner} ${styles.guardBannerDanger}`}>
                                    <AlertCircle size={16} className={styles.guardBannerIcon} />
                                    <div className={styles.guardBannerText}>{generationError}</div>
                                </div>
                            )}

                            {/* Primary Recommended Section */}
                            <div className={styles.sectionBlock}>
                                <div className={styles.sectionHeaderRow}>
                                    <div className={styles.sectionTitleGroup}>
                                        <span className={styles.recommendedPill}>Pre-Selected for Week {weekNumber}</span>
                                        <h4 className={styles.sectionHeading}>
                                            Recommended Topics &amp; Subtopics ({formatMinutesToDuration(remainingBudgetMins)} Remaining Target)
                                        </h4>
                                    </div>
                                    <span className={styles.sectionHint}>
                                        Grounded in verified course Textbooks • Calibrated to equalize Week {weekNumber} to {formatMinutesToDuration(weeklyBudgetMins)}
                                    </span>
                                </div>

                                <div className={styles.topicsGrid}>
                                    {recommendedTopics.map((t, idx) => renderTopicCard(t, idx + 1, false))}
                                </div>
                            </div>

                            {/* Alternative Topics Section */}
                            {alternativeTopics.length > 0 && (
                                <div className={`${styles.sectionBlock} ${styles.alternativeSectionBlock}`}>
                                    <div className={styles.sectionHeaderRow}>
                                        <div className={styles.sectionTitleGroup}>
                                            <span className={styles.alternativePill}>Optional Alternatives</span>
                                            <h4 className={styles.sectionHeadingMuted}>
                                                Alternative Textbook-Grounded Topics
                                            </h4>
                                        </div>
                                        <span className={styles.sectionHint}>
                                            Select to swap in or supplement (watch New Week Total above)
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
                                    {!tocState.loading && (
                                        <> • <span>{verifiedTextbooks.length}</span> Verified Textbook{verifiedTextbooks.length === 1 ? '' : 's'}</>
                                    )}
                                </div>
                                {isCacheFreshForWeekTopics && !isOverBudget && !isBudgetFull && (
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
                                    disabled={isGenerateBlocked}
                                    title={
                                        isOverBudget
                                            ? 'Reduce existing subtopic durations before generating'
                                            : isBudgetFull
                                                ? 'Weekly time budget is already fully allocated'
                                                : !hasVerifiedTextbook
                                                    ? 'At least one course Textbook with a verified TOC is required'
                                                    : 'Generate textbook-grounded topics calibrated to remaining weekly time'
                                    }
                                >
                                    <GeminiStar size={15} />
                                    <span>
                                        {remainingBudgetMins > 0 && alreadyAllocatedMins > 0
                                            ? `Generate for Remaining ${formatMinutesToDuration(remainingBudgetMins)}`
                                            : 'Generate Aligned Topics & Subtopics'}
                                    </span>
                                    <ArrowRight size={15} />
                                </button>
                            </div>
                        </>
                    ) : phase === 'loading' ? (
                        <>
                            <div className={styles.footerLeft}>
                                <div className={styles.selectionBadge}>
                                    Grounding against verified Textbooks &amp; calibrating to {remainingBudgetMins} mins...
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
                                    <span>{selectedTopicsCount}</span> Topic{selectedTopicsCount === 1 ? '' : 's'} (<span>{selectedSubtopicsCount}</span> Subtopics • <span>{formatMinutesToDuration(aiSelectedMinutes)}</span>)
                                </div>
                                <button
                                    type="button"
                                    className={styles.regenerateBtn}
                                    onClick={() => setPhase('ilo-select')}
                                    title="Return to Step 1 to adjust ILOs or review reference TOCs"
                                >
                                    <RefreshCw size={13} />
                                    <span>Back / Regenerate</span>
                                </button>
                                <label
                                    className={styles.attachRefsToggleLabel}
                                    title="Automatically select cited Textbooks & supporting references in this week's References column on import"
                                >
                                    <input
                                        type="checkbox"
                                        className={styles.checkboxInput}
                                        checked={attachCitedRefs}
                                        onChange={(e) => setAttachCitedRefs(e.target.checked)}
                                    />
                                    <span>
                                        Also attach cited references to Week {weekNumber}
                                        {selectedCitedRefIds.length > 0 ? ` (${selectedCitedRefIds.length})` : ''}
                                    </span>
                                </label>
                            </div>
                            <div className={styles.footerActions}>
                                <button type="button" className={styles.cancelBtn} onClick={onClose}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={styles.applyBtn}
                                    onClick={handleApply}
                                    disabled={selectedTopicsCount === 0}
                                >
                                    <Plus size={16} />
                                    <span>Import Selected Topics ({selectedTopicsCount})</span>
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
