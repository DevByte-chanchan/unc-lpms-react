import React, { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from "react";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SideNavigation from "../components/SideNavigation.jsx";
import TopicSelector from "../components/TopicSelector.jsx";
import AiTopicSuggestModal from "../components/AiTopicSuggestModal.jsx";
import ImportPreviousModal from "../components/ImportPreviousModal.jsx";
import { checkSpelling } from "../utils/spellChecker.js";
import { X, CheckCircle, MessageSquare, AlertCircle, ChevronsRight, ChevronDown } from 'react-feather';
import { fetchJson } from "../utils/api.js";

import TLAForm from "./TLAForm.jsx";
import ReferenceForm from "./ReferenceForm.jsx";

const formatApproverRoleLabel = (rawRole) => {
    const map = {
        INDUSTRY_CONSULTANT: 'Industry Consultant',
        PROGRAM_HEAD: 'Program Head',
        LIBRARY_DIRECTOR: 'Director of Libraries',
        DEAN: 'Dean',
        VPAA: 'VPAA',
        INSTRUCTOR: 'Instructor'
    };
    if (map[rawRole]) return map[rawRole];
    return String(rawRole || 'Approver')
        .toLowerCase()
        .replace(/_/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
};

const STAKEHOLDER_NAME_BY_ID = {
    '1': 'Monica Norton',
    '2': 'Olivia Vance',
    '3': 'Maria Santos',
    '4': 'Roberto Cruz',
    '5': 'Sophia Sterling',
    '6': 'Carlos Garcia',
    '7': 'Juan Dela Cruz',
    '8': 'Elena Reyes',
    '9': 'Marco Villanueva'
};

const STAKEHOLDER_NAME_BY_ROLE = {
    INDUSTRY_CONSULTANT: 'Roberto Cruz',
    PROGRAM_HEAD: 'Olivia Vance',
    LIBRARY_DIRECTOR: 'Maria Santos',
    DEAN: 'Sophia Sterling',
    VPAA: 'Carlos Garcia',
    INSTRUCTOR: 'Monica Norton'
};

export function InlineModal({ isOpen, title, onClose, children, actions, modalClassName = '' }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={`${styles.modal} ${modalClassName}`}>
                <div className={styles.modalHeader}>
                    <h3>{title}</h3>
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', padding: 6 }}>
                        <X size={16} />
                    </button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                {actions && <div className={styles.modalActions}>{actions}</div>}
            </div>
        </div>
    );
}

// Custom Approver Role Filter Dropdown with Returned Comment Badges
function RoleFilterDropdown({ options, value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    return (
        <div className={styles.roleFilterDropdownContainer} ref={dropdownRef}>
            <button
                type="button"
                className={`${styles.roleFilterTrigger} ${isOpen ? styles.roleFilterTriggerOpen : ''}`}
                onClick={() => setIsOpen(prev => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={styles.roleFilterTriggerLabel}>
                    {selectedOption?.label || 'All Approver Roles'}
                </span>
                <span className={styles.roleFilterTriggerRight}>
                    {selectedOption && selectedOption.totalCount > 0 && (
                        <span
                            className={`${styles.roleOptionBadge} ${
                                selectedOption.unresolvedCount === 0 ? styles.roleOptionBadgeResolved : ''
                            }`}
                        >
                            {selectedOption.unresolvedCount > 0
                                ? selectedOption.unresolvedCount
                                : selectedOption.totalCount}
                        </span>
                    )}
                    <ChevronDown
                        size={15}
                        className={`${styles.roleFilterChevron} ${isOpen ? styles.roleFilterChevronOpen : ''}`}
                    />
                </span>
            </button>

            {isOpen && (
                <div className={styles.roleFilterMenu} role="listbox">
                    {options.map(opt => {
                        const isSelected = opt.value === value;
                        const badgeCount = opt.unresolvedCount > 0 ? opt.unresolvedCount : opt.totalCount;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`${styles.roleFilterOption} ${isSelected ? styles.roleFilterOptionSelected : ''}`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                            >
                                <span className={styles.roleFilterOptionLabel}>{opt.label}</span>
                                {opt.totalCount > 0 && (
                                    <span
                                        className={`${styles.roleOptionBadge} ${
                                            opt.unresolvedCount === 0 ? styles.roleOptionBadgeResolved : ''
                                        }`}
                                    >
                                        {badgeCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Serialization helpers for deep change detection
const serializeTopics = (topics) => {
    if (!Array.isArray(topics)) return '[]';
    return JSON.stringify(topics.map(t => ({
        title: (t.title || '').trim(),
        isContinuation: Boolean(t.isContinuation),
        subtopics: (t.subtopics || []).map(s => ({
            title: (s.title || '').trim()
        }))
    })));
};

const serializeComments = (comments) => {
    if (!Array.isArray(comments)) return '[]';
    return JSON.stringify(comments.map(c => ({
        id: c.comment_id,
        resolved: Boolean(c.resolved_status)
    })));
};

// ==========================================
// 1. TOPICS SUB-FORM
// ==========================================
const TopicSubForm = forwardRef(({
    iloId,
    previousWeekId,
    weekNumber = 1,
    weekIndexInCo = 0,
    isOrientation = false,
    status,
    setUnresolvedCount,
    onCommentsChange,
    courseCode,
    cachedWeekTopics,
    previousWeekFrontendTopics,
    onTopicsChangeForWeek,
    onOpenAiSuggest,
    isSingleColumn = false
}, ref) => {
    const [availableTopics, setAvailableTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [previousWeekTopics, setPreviousWeekTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reviewComments, setReviewComments] = useState([]);
    const initialTopicsStateRef = useRef(null);
    const initialCommentsStateRef = useRef(null);

    const updateTopicsState = useCallback((nextTopics) => {
        setSelectedTopics(nextTopics);
        if (onTopicsChangeForWeek && iloId) {
            onTopicsChangeForWeek(iloId, isOrientation, nextTopics);
        }
    }, [onTopicsChangeForWeek, iloId, isOrientation]);

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setLoading(true);

        async function loadData() {
            try {
                const orientParam = isOrientation ? 'true' : 'false';
                const availableUrl = `/api/topics/available?iloId=${encodeURIComponent(iloId)}&isOrientation=${orientParam}`;
                const assignedUrl = `/api/topics/assigned/${encodeURIComponent(iloId)}?isOrientation=${orientParam}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/topics`;

                const pAvailable = fetchJson(availableUrl).catch(() => []);
                const pAssigned = fetchJson(assignedUrl).catch(() => []);
                const pComments = status === 'returned' ? fetchJson(commentsUrl).catch(() => []) : Promise.resolve([]);
                const pPrevTopics = (previousWeekId && !isOrientation)
                    ? fetchJson(`/api/topics/assigned/${encodeURIComponent(previousWeekId)}?isOrientation=false`).catch(() => [])
                    : Promise.resolve([]);

                const [resAvailable, resAssigned, resComments, resPrevTopics] = await Promise.all([
                    pAvailable,
                    pAssigned,
                    pComments,
                    pPrevTopics
                ]);
                if (!mounted) return;

                setAvailableTopics(Array.isArray(resAvailable) ? resAvailable : []);

                // Prefer in-memory frontend topics if the user already modified this week during the current session (including AI-suggested border flag)
                const initialTopics = Array.isArray(cachedWeekTopics)
                    ? cachedWeekTopics
                    : (Array.isArray(resAssigned) ? resAssigned : []);

                setSelectedTopics(initialTopics);
                initialTopicsStateRef.current = serializeTopics(initialTopics);
                if (onTopicsChangeForWeek) {
                    onTopicsChangeForWeek(iloId, isOrientation, initialTopics);
                }

                setPreviousWeekTopics(
                    Array.isArray(previousWeekFrontendTopics)
                        ? previousWeekFrontendTopics
                        : (Array.isArray(resPrevTopics) ? resPrevTopics : [])
                );

                if (status === 'returned' && Array.isArray(resComments)) {
                    const mappedComments = resComments.map(c => ({
                        ...c,
                        resolved_status: c.resolved_status === 1 || c.resolved_status === true,
                        return_number: Number(c.return_number) || 1,
                        return_date: c.return_date || c.createdAt
                    }));
                    setReviewComments(mappedComments);
                    initialCommentsStateRef.current = serializeComments(mappedComments);
                } else {
                    setReviewComments([]);
                    initialCommentsStateRef.current = '[]';
                }
            } catch (err) {
                console.error("Failed to load initial topics configurations:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadData();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iloId, previousWeekId, isOrientation, status]);

    // Keep previousWeekTopics synced if frontend cache for previous week updates
    useEffect(() => {
        if (Array.isArray(previousWeekFrontendTopics)) {
            setPreviousWeekTopics(previousWeekFrontendTopics);
        }
    }, [previousWeekFrontendTopics]);

    useEffect(() => {
        if (setUnresolvedCount) {
            setUnresolvedCount(reviewComments.filter(c => !c.resolved_status).length);
        }
        if (onCommentsChange) {
            onCommentsChange(reviewComments);
        }
    }, [reviewComments, setUnresolvedCount, onCommentsChange]);

    // Resolves parent Topic title and one or multiple Subtopic titles for a comment
    const resolveTopicGroupsForComment = useCallback((comment) => {
        const allPools = [...selectedTopics, ...availableTopics];
        const targetIds = Array.isArray(comment.target_ids) && comment.target_ids.length > 0
            ? comment.target_ids
            : (comment.target_id != null ? [comment.target_id] : []);

        const localGroups = [];
        const addSubtopicToGroup = (topicId, topicTitle, subId, subTitle) => {
            const cleanTopicTitle = topicTitle || 'Topic';
            let grp = localGroups.find(
                g => (topicId && Number(g.topic_id) === Number(topicId)) || g.topic_title === cleanTopicTitle
            );
            if (!grp) {
                grp = {
                    topic_id: topicId,
                    topic_title: cleanTopicTitle,
                    subtopics: []
                };
                localGroups.push(grp);
            }
            if (subTitle && !grp.subtopics.some(s => s.title === subTitle)) {
                grp.subtopics.push({
                    subtopic_id: subId,
                    title: subTitle
                });
            }
        };

        // 1. Try matching target_ids against subtopics (and parent topics) in selectedTopics / availableTopics
        for (const tid of targetIds) {
            let matched = false;
            for (const topic of allPools) {
                const subs = Array.isArray(topic.subtopics) ? topic.subtopics : [];
                const subMatch = subs.find(s =>
                    Number(s.subtopic_id) === Number(tid) || Number(s.id) === Number(tid)
                );
                if (subMatch) {
                    addSubtopicToGroup(
                        topic.topic_id || topic.id,
                        topic.title || topic.topic_name || topic.name,
                        subMatch.subtopic_id || subMatch.id,
                        subMatch.title
                    );
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                const directTopic = allPools.find(t =>
                    Number(t.topic_id) === Number(tid) || Number(t.id) === Number(tid)
                );
                if (directTopic) {
                    addSubtopicToGroup(
                        directTopic.topic_id || directTopic.id,
                        directTopic.title || directTopic.topic_name || directTopic.name,
                        null,
                        null
                    );
                }
            }
        }

        if (localGroups.length > 0) {
            return localGroups;
        }

        // 2. Fallback to backend-resolved topic_groups
        if (Array.isArray(comment.topic_groups) && comment.topic_groups.length > 0) {
            return comment.topic_groups;
        }

        // 3. Fallback to first selected topic if target_id was re-assigned
        if (selectedTopics.length > 0) {
            const firstTopic = selectedTopics[0];
            const firstSub = Array.isArray(firstTopic.subtopics) && firstTopic.subtopics.length > 0
                ? firstTopic.subtopics[0]
                : null;
            return [{
                topic_id: firstTopic.topic_id,
                topic_title: firstTopic.title,
                subtopics: firstSub ? [{ subtopic_id: firstSub.subtopic_id, title: firstSub.title }] : []
            }];
        }

        return [];
    }, [selectedTopics, availableTopics]);

    const collectTopicSpellWarnings = useCallback(() => {
        const warnings = [];
        selectedTopics.forEach((topic, tIdx) => {
            const topicLabel = `Topic #${tIdx + 1}${topic.title ? ` (${topic.title})` : ''}`;

            if (!topic.isContinuation) {
                const titleWords = checkSpelling(topic.title || '');
                if (titleWords.length > 0) {
                    warnings.push({
                        section: 'Topics',
                        field: `${topicLabel} — Topic Title`,
                        words: titleWords
                    });
                }
            }

            (topic.subtopics || []).forEach((sub, sIdx) => {
                const subWords = checkSpelling(sub.title || '');
                if (subWords.length > 0) {
                    warnings.push({
                        section: 'Topics',
                        field: `${topicLabel} — Subtopic #${sIdx + 1}`,
                        words: subWords
                    });
                }
            });
        });
        return warnings;
    }, [selectedTopics]);

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!selectedTopics || selectedTopics.length === 0) {
                return "Please select or create at least one topic.";
            }

            const errList = [];
            selectedTopics.forEach((topic, idx) => {
                const topicNum = idx + 1;
                const rawTitle = (topic.title || '').trim();

                if (!rawTitle) {
                    errList.push(`Topic #${topicNum}: Topic title cannot be empty.`);
                } else if (rawTitle.toLowerCase() === 'new custom topic') {
                    errList.push(`Topic #${topicNum}: Default title "New Custom Topic" must be changed to a specific topic title.`);
                }

                const subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : [];
                if (subtopics.length === 0) {
                    errList.push(`Topic #${topicNum} (${rawTitle || 'Untitled'}): Must contain at least one subtopic.`);
                } else {
                    const emptySubs = subtopics.filter(s => !s.title || !s.title.trim());
                    if (emptySubs.length > 0) {
                        errList.push(`Topic #${topicNum} (${rawTitle || 'Untitled'}): Contains ${emptySubs.length} empty subtopic ${emptySubs.length === 1 ? 'entry' : 'entries'}. Each subtopic must have a title or be removed.`);
                    }
                }
            });

            return errList.length > 0 ? errList : null;
        },
        hasChanges: () => {
            if (initialTopicsStateRef.current === null) return false;
            const topicsChanged = serializeTopics(selectedTopics) !== initialTopicsStateRef.current;
            const commentsChanged = serializeComments(reviewComments) !== initialCommentsStateRef.current;
            return topicsChanged || commentsChanged;
        },
        resetInitialState: () => {
            initialTopicsStateRef.current = serializeTopics(selectedTopics);
            initialCommentsStateRef.current = serializeComments(reviewComments);
        },
        getSpellWarnings: collectTopicSpellWarnings,
        getSelectedTopics: () => selectedTopics,
        importPreviousTopics: (incomingTopics) => {
            if (!Array.isArray(incomingTopics) || incomingTopics.length === 0) return;
            const existingTitles = new Set(
                selectedTopics.map(t => String(t.title || '').trim().toLowerCase()).filter(Boolean)
            );
            const now = Date.now();
            const toAdd = incomingTopics
                .filter(t => {
                    const title = String(t?.title || '').trim().toLowerCase();
                    if (!title) return false;
                    return !existingTitles.has(title);
                })
                .map((topic, idx) => ({
                    topic_id: topic.topic_id || null,
                    _temp_id: topic.topic_id ? null : `temp-prev-topic-${now}-${idx}`,
                    title: topic.title,
                    isContinuation: false,
                    subtopics: (topic.subtopics || []).map((s, sIdx) => ({
                        subtopic_id: null,
                        parent_subtopic_id: s.subtopic_id || null,
                        _temp_id: `temp-prev-sub-${now}-${idx}-${sIdx}-${Math.random()}`,
                        title: s.title || '',
                        sequence_order: s.sequence_order ?? sIdx
                    }))
                }));

            if (toAdd.length === 0) return;
            updateTopicsState([...selectedTopics, ...toAdd]);
        },
        applyAiTopics: (newAiTopics) => {
            if (!Array.isArray(newAiTopics)) return;
            // Keep manual/continued topics; replace previously imported AI topics with the updated selection
            const nonAiTopics = selectedTopics.filter(t => !t.isAiSuggested);
            const taggedNewAiTopics = newAiTopics.map(t => ({
                ...t,
                isAiSuggested: true
            }));
            updateTopicsState([...nonAiTopics, ...taggedNewAiTopics]);
        },
        getComments: () => reviewComments,
        toggleComment: (commentId) => {
            setReviewComments(prev => prev.map(c =>
                c.comment_id === commentId ? { ...c, resolved_status: !c.resolved_status } : c
            ));
        },
        save: async () => {
            if (status === 'returned' && reviewComments.length > 0) {
                const commentPayload = reviewComments.map(c => ({
                    comment_id: c.comment_id,
                    resolved_status: c.resolved_status ? 1 : 0
                }));
                await fetchJson(`/api/comments/update-resolution`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates: commentPayload })
                });
            }

            await fetchJson(`/api/topics/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    week_id: Number(iloId),
                    ilo_id: Number(iloId),
                    is_orientation: Boolean(isOrientation),
                    topics: selectedTopics
                })
            });
            initialTopicsStateRef.current = serializeTopics(selectedTopics);
            initialCommentsStateRef.current = serializeComments(reviewComments);
        },
        getCommentTargetDetails: (comment) => resolveTopicGroupsForComment(comment),
        getCommentTargetLabel: (comment) => {
            const groups = resolveTopicGroupsForComment(comment);
            if (groups.length > 0) {
                return groups
                    .map(g => g.subtopics && g.subtopics.length > 0
                        ? `${g.topic_title}: ${g.subtopics.map(s => s.title).join('; ')}`
                        : g.topic_title
                    )
                    .join(' | ');
            }
            if (comment.target_title) return comment.target_title;
            return `Topic`;
        }
    }));

    if (loading) return <div style={{padding: '20px 20px 100px 20px', color: '#666'}}>Loading Core Subjects Topology...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <TopicSelector
                value={selectedTopics}
                onChange={updateTopicsState}
                disabled={loading}
                isOrientation={isOrientation}
                courseCode={courseCode}
                weekNumber={isOrientation ? 1 : weekNumber}
                weekIndexInCo={isOrientation ? 0 : weekIndexInCo}
                previousWeekTopics={isOrientation ? [] : previousWeekTopics}
                onOpenAiSuggest={onOpenAiSuggest}
                isSingleColumn={isSingleColumn}
            />
        </div>
    );
});


// ==========================================
// 2. MASTER MAP CONTENTS ORCHESTRATOR 
// ==========================================
const TopicForm = () => {
    const navigate = useNavigate();
    const { courseCode, iloId, status } = useParams();
    const [searchParams] = useSearchParams();
    const initialIsOrientation = searchParams.get('orientation') === 'true' || searchParams.get('orientation') === '1';
    const [isOrientation, setIsOrientation] = useState(initialIsOrientation);

    const [currentStep, setCurrentStep] = useState(0);
    const [pinnedSteps, setPinnedSteps] = useState([true, true, true]);
    const [isImportPrevOpen, setIsImportPrevOpen] = useState(false);
    const steps = ['Topics', 'Teaching & Learning Activities', 'References'];

    const handleTogglePin = useCallback((stepIdx) => {
        setPinnedSteps(prev => {
            const isCurrentlyPinned = Boolean(prev[stepIdx]);
            const pinnedCount = prev.filter(Boolean).length;
            // Ensure at least 1 column remains pinned/visible
            if (isCurrentlyPinned && pinnedCount <= 1) {
                return prev;
            }
            const next = [...prev];
            next[stepIdx] = !isCurrentlyPinned;
            return next;
        });
        setCurrentStep(stepIdx);
    }, []);

    // Weekly Planner & Course Outcome Context State
    const [weekContext, setWeekContext] = useState({
        co_id: null,
        pc_offering_id: null,
        revision_number: 1,
        courseNo: '',
        courseTitle: '',
        courseDescription: '',
        courseCredit: '',
        courseContactHrs: '',
        totalWeeklyHours: 5,
        coNumber: null,
        coDescription: '',
        ilos: [],
        weeks: [],
        courseOutcomes: [],
        commentCountsByWeek: {}
    });
    const [activeWeekId, setActiveWeekId] = useState(iloId ? Number(iloId) : null);

    // Frontend in-memory map of topics per week key (`${isOrientation ? 'orient' : 'reg'}-${weekId}`)
    // Ensures unsaved frontend topics added in Week 1, Week 2, etc. are immediately available to subsequent weeks and AI Suggest
    const [weekTopicsMap, setWeekTopicsMap] = useState({});
    // Per-week cache of generated AI suggestions so reopening the modal skips regeneration
    const [weekAiCacheMap, setWeekAiCacheMap] = useState({});
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const initialWeekTopicsMapRef = useRef({});

    const getWeekCacheKey = useCallback((wId, orientFlag) => {
        return `${orientFlag ? 'orient' : 'reg'}-${Number(wId)}`;
    }, []);

    const handleTopicsChangeForWeek = useCallback((wId, orientFlag, nextTopics) => {
        if (!wId) return;
        const key = getWeekCacheKey(wId, orientFlag);
        if (initialWeekTopicsMapRef.current[key] === undefined && Array.isArray(nextTopics)) {
            initialWeekTopicsMapRef.current[key] = serializeTopics(nextTopics);
        }
        setWeekTopicsMap(prev => ({
            ...prev,
            [key]: Array.isArray(nextTopics) ? nextTopics : []
        }));
    }, [getWeekCacheKey]);

    // Refs for sub-forms
    const topicRef = useRef();
    const tlaRef = useRef();
    const refRef = useRef();

    // Floating Comment State logic
    const [isCommentsOpen, setIsCommentsOpen] = useState(true);
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
    const [stepComments, setStepComments] = useState({ 0: [], 1: [], 2: [] });
    const [revisionReturnMeta, setRevisionReturnMeta] = useState({
        byCommentId: {},
        byRole: {}
    });

    // Track unresolved comment counts per content tab for the currently active week
    const [stepCommentCounts, setStepCommentCounts] = useState([0, 0, 0]);

    const effectiveWeekId = activeWeekId || iloId;

    const updateStepCount = useCallback((stepIdx, typeKey, count) => {
        setStepCommentCounts(prev => {
            if (prev[stepIdx] === count) return prev;
            const next = [...prev];
            next[stepIdx] = count;
            return next;
        });

        if (effectiveWeekId) {
            const wid = Number(effectiveWeekId);
            setWeekContext(prev => {
                const existingWeekCounts = prev.commentCountsByWeek[wid] || { topics: 0, tlas: 0, references: 0, total: 0 };
                if (existingWeekCounts[typeKey] === count) return prev;
                const updatedWeekCounts = {
                    ...existingWeekCounts,
                    [typeKey]: count
                };
                updatedWeekCounts.total =
                    (Number(updatedWeekCounts.topics) || 0) +
                    (Number(updatedWeekCounts.tlas) || 0) +
                    (Number(updatedWeekCounts.references) || 0);

                return {
                    ...prev,
                    commentCountsByWeek: {
                        ...prev.commentCountsByWeek,
                        [wid]: updatedWeekCounts
                    }
                };
            });
        }
    }, [effectiveWeekId]);

    const handleTopicUnresolved = useCallback((c) => updateStepCount(0, 'topics', c), [updateStepCount]);
    const handleTlaUnresolved = useCallback((c) => updateStepCount(1, 'tlas', c), [updateStepCount]);
    const handleRefUnresolved = useCallback((c) => updateStepCount(2, 'references', c), [updateStepCount]);

    const handleTopicCommentsChange = useCallback((list) => {
        setStepComments(prev => ({ ...prev, 0: Array.isArray(list) ? list : [] }));
    }, []);
    const handleTlaCommentsChange = useCallback((list) => {
        setStepComments(prev => ({ ...prev, 1: Array.isArray(list) ? list : [] }));
    }, []);
    const handleRefCommentsChange = useCallback((list) => {
        setStepComments(prev => ({ ...prev, 2: Array.isArray(list) ? list : [] }));
    }, []);

    const unresolvedCount = stepCommentCounts[currentStep] || 0;

    // Main Operation / Global Validations & Spell Check States
    const [isSaving, setIsSaving] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [showSpellCheckModal, setShowSpellCheckModal] = useState(false);
    const [spellCheckWarnings, setSpellCheckWarnings] = useState([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        setIsOrientation(initialIsOrientation);
    }, [iloId, initialIsOrientation]);

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;

        async function loadWeekContext() {
            try {
                const orientParam = initialIsOrientation ? 'true' : 'false';
                const ctx = await fetchJson(`/api/topics/week-context/${encodeURIComponent(iloId)}?isOrientation=${orientParam}`);
                if (!mounted || !ctx) return;

                let resolvedCourseOutcomes = Array.isArray(ctx.courseOutcomes) ? [...ctx.courseOutcomes] : [];
                const hasOrientationOption = resolvedCourseOutcomes.some(
                    c => Boolean(c.isOrientation) || Number(c.coNumber) === 0
                );

                if (!hasOrientationOption && resolvedCourseOutcomes.length > 0) {
                    const firstCo = resolvedCourseOutcomes[0];
                    const firstWeekObj = Array.isArray(firstCo.weeks) && firstCo.weeks.length > 0 ? firstCo.weeks[0] : null;
                    const firstWeekId = firstCo.firstWeekId || firstWeekObj?.week_id || iloId;
                    let orientIlos = initialIsOrientation && Array.isArray(ctx.ilos) ? ctx.ilos : [];
                    let orientDesc = 'Introduce students to the University and College Vision, Mission, and Objectives (VMO), course expectations, grading system, and ethical AI guidelines.';

                    if (!initialIsOrientation && firstWeekId) {
                        const orientCtx = await fetchJson(`/api/topics/week-context/${encodeURIComponent(firstWeekId)}?isOrientation=true`).catch(() => null);
                        if (!mounted) return;
                        if (orientCtx) {
                            if (Array.isArray(orientCtx.ilos)) orientIlos = orientCtx.ilos;
                            if (orientCtx.coDescription) orientDesc = orientCtx.coDescription;
                        }
                    }

                    const orientWeeks = firstWeekObj
                        ? [{ ...firstWeekObj, hours: 2 }]
                        : (Array.isArray(ctx.weeks) ? ctx.weeks.slice(0, 1) : []);

                    resolvedCourseOutcomes = [
                        {
                            co_id: firstCo.co_id,
                            coNumber: 0,
                            isOrientation: true,
                            coDescription: orientDesc,
                            ilos: orientIlos,
                            weeks: orientWeeks,
                            firstWeekId: firstWeekId,
                            unresolvedTotal: firstWeekObj?.unresolvedComments?.total || 0
                        },
                        ...resolvedCourseOutcomes
                    ];
                }

                setWeekContext({
                    co_id: ctx.co_id || null,
                    pc_offering_id: ctx.pc_offering_id || null,
                    revision_number: ctx.revision_number || 1,
                    courseNo: ctx.courseNo || courseCode || '',
                    courseTitle: ctx.courseTitle || '',
                    courseDescription: ctx.courseDescription || '',
                    courseCredit: ctx.courseCredit || '',
                    courseContactHrs: ctx.courseContactHrs || '',
                    totalWeeklyHours: ctx.totalWeeklyHours || 5,
                    coNumber: initialIsOrientation ? 0 : (ctx.coNumber ?? 1),
                    coDescription: ctx.coDescription || '',
                    ilos: Array.isArray(ctx.ilos) ? ctx.ilos : [],
                    weeks: Array.isArray(ctx.weeks) ? ctx.weeks : [],
                    courseOutcomes: resolvedCourseOutcomes,
                    commentCountsByWeek: ctx.commentCountsByWeek || {}
                });

                if (ctx.activeWeekId) {
                    setActiveWeekId(Number(ctx.activeWeekId));
                }
            } catch (err) {
                console.error("Failed to load week context:", err);
                if (mounted) {
                    setActiveWeekId(Number(iloId));
                }
            }
        }

        loadWeekContext();
        return () => { mounted = false; };
    }, [iloId, initialIsOrientation, courseCode]);

    // Pre-populate frontend weekTopicsMap for all weeks of the active Course Outcome (without overwriting any unsaved edits already in weekTopicsMap)
    useEffect(() => {
        if (isOrientation || !Array.isArray(weekContext.weeks) || weekContext.weeks.length === 0) return;
        let mounted = true;

        weekContext.weeks.forEach(w => {
            const wid = Number(w.week_id);
            const key = getWeekCacheKey(wid, false);
            fetchJson(`/api/topics/assigned/${encodeURIComponent(wid)}?isOrientation=false`)
                .then(data => {
                    if (!mounted || !Array.isArray(data)) return;
                    setWeekTopicsMap(prev => {
                        if (prev[key] !== undefined) return prev;
                        return {
                            ...prev,
                            [key]: data
                        };
                    });
                    if (initialWeekTopicsMapRef.current[key] === undefined) {
                        initialWeekTopicsMapRef.current[key] = serializeTopics(data);
                    }
                })
                .catch(() => {});
        });

        return () => { mounted = false; };
    }, [weekContext.co_id, weekContext.weeks, isOrientation, getWeekCacheKey]);

    // Fetch revision timeline metadata to enrich return numbers, dates, and stakeholder names
    useEffect(() => {
        if (status !== 'returned' || !weekContext.pc_offering_id) return;
        let mounted = true;

        fetchJson(`/api/revisions/${encodeURIComponent(weekContext.pc_offering_id)}`)
            .then(data => {
                if (!mounted || !data || !Array.isArray(data.revisions)) return;
                const currentRev = data.revisions.find(
                    r => Number(r.pcId) === Number(weekContext.pc_offering_id)
                ) || data.revisions[0];

                if (!currentRev || !Array.isArray(currentRev.timeline)) return;

                const byCommentId = {};
                const byRole = {};
                let returnIdx = 0;

                currentRev.timeline.forEach(event => {
                    if (event.type === 'RETURNED') {
                        returnIdx += 1;
                        const entry = {
                            returnNumber: returnIdx,
                            returnDate: event.date,
                            actorName: event.actorName,
                            actorRole: event.actorRole,
                            stakeholderId: event.stakeholderId
                        };
                        if (event.actorRole) {
                            byRole[event.actorRole.toUpperCase().replace(/\s+/g, '_')] = entry;
                            if (event.actorRole === 'Director of Libraries') {
                                byRole['LIBRARY_DIRECTOR'] = entry;
                            } else if (event.actorRole === 'Program Head') {
                                byRole['PROGRAM_HEAD'] = entry;
                            } else if (event.actorRole === 'Dean') {
                                byRole['DEAN'] = entry;
                            }
                        }
                        if (Array.isArray(event.comments)) {
                            event.comments.forEach(c => {
                                if (c && c.id != null) {
                                    byCommentId[Number(c.id)] = entry;
                                }
                            });
                        }
                    }
                });

                setRevisionReturnMeta({ byCommentId, byRole });
            })
            .catch(() => {});

        return () => { mounted = false; };
    }, [status, weekContext.pc_offering_id]);

    const activeWeekIndex = weekContext.weeks.findIndex(
        w => Number(w.week_id) === Number(activeWeekId)
    );
    const activeWeekObj = activeWeekIndex >= 0 ? weekContext.weeks[activeWeekIndex] : null;
    const activeWeekNumber = activeWeekObj
        ? (activeWeekObj.weekNumber || activeWeekIndex + 1)
        : 1;
    const activeWeekHours = activeWeekObj?.hours
        ? Number(activeWeekObj.hours)
        : (isOrientation ? 2 : (weekContext.totalWeeklyHours || 5));
    // Only allow previous week lookup within the SAME Course Outcome (activeWeekIndex > 0).
    // Instructors cannot continue topics from other Course Outcomes.
    const previousWeekId = (!isOrientation && activeWeekIndex > 0)
        ? weekContext.weeks[activeWeekIndex - 1]?.week_id
        : null;

    // Frontend-cached topics for the current week and previous weeks (used directly without needing DB save first)
    const currentWeekCachedTopics = weekTopicsMap[getWeekCacheKey(effectiveWeekId, isOrientation)];
    const previousWeekCachedTopics = previousWeekId
        ? weekTopicsMap[getWeekCacheKey(previousWeekId, false)]
        : undefined;

    // Build array of all earlier weeks' topics (Weeks 1 .. activeWeekNumber - 1) from frontend state for AI Suggest
    const previousWeeksTopicsForAi = useMemo(() => {
        if (isOrientation || activeWeekIndex <= 0) return [];
        const list = [];
        for (let i = 0; i < activeWeekIndex; i++) {
            const w = weekContext.weeks[i];
            if (!w) continue;
            const wNum = w.weekNumber || (i + 1);
            const wKey = getWeekCacheKey(w.week_id, false);
            const wTopics = weekTopicsMap[wKey] || [];
            list.push({
                weekId: w.week_id,
                weekNumber: wNum,
                topics: wTopics.map(t => ({
                    title: t.title,
                    subtopics: (t.subtopics || []).map(s => (typeof s === 'string' ? s : s.title)).filter(Boolean)
                }))
            });
        }
        return list;
    }, [isOrientation, activeWeekIndex, weekContext.weeks, getWeekCacheKey, weekTopicsMap]);

    // Sync current week's live topics into weekTopicsMap before switching weeks or opening AI Suggest
    const syncLiveTopicsToFrontendMap = useCallback(() => {
        if (topicRef.current?.getSelectedTopics && effectiveWeekId) {
            const liveTopics = topicRef.current.getSelectedTopics();
            handleTopicsChangeForWeek(effectiveWeekId, isOrientation, liveTopics);
        }
    }, [effectiveWeekId, isOrientation, handleTopicsChangeForWeek]);

    const handleSelectWeek = (nextWeekId) => {
        if (isOrientation || Number(nextWeekId) === Number(activeWeekId)) return;
        syncLiveTopicsToFrontendMap();
        setActiveWeekId(Number(nextWeekId));
    };

    const handleSelectCourseOutcome = (targetCo) => {
        if (!targetCo) return;
        const targetIsOrientation = Boolean(targetCo.isOrientation || Number(targetCo.coNumber) === 0);
        if (targetIsOrientation && isOrientation) return;
        if (!targetIsOrientation && !isOrientation && Number(targetCo.coNumber) === Number(weekContext.coNumber)) return;

        syncLiveTopicsToFrontendMap();

        const nextWeeks = Array.isArray(targetCo.weeks) ? targetCo.weeks : [];
        const nextWeekId = targetCo.firstWeekId || (nextWeeks[0] ? nextWeeks[0].week_id : null);

        setIsOrientation(targetIsOrientation);
        setWeekContext(prev => ({
            ...prev,
            co_id: targetCo.co_id,
            coNumber: targetCo.coNumber,
            coDescription: targetCo.coDescription || '',
            ilos: Array.isArray(targetCo.ilos) ? targetCo.ilos : [],
            weeks: nextWeeks
        }));

        if (nextWeekId) {
            setActiveWeekId(Number(nextWeekId));
        }
    };

    const handleUpdateWeekAiCache = useCallback((nextCacheObj) => {
        if (!effectiveWeekId) return;
        const key = getWeekCacheKey(effectiveWeekId, isOrientation);
        setWeekAiCacheMap(prev => ({
            ...prev,
            [key]: nextCacheObj
        }));
    }, [effectiveWeekId, isOrientation, getWeekCacheKey]);

    const handleOpenAiSuggest = () => {
        syncLiveTopicsToFrontendMap();
        if (!pinnedSteps[0]) {
            setPinnedSteps(prev => [true, prev[1], prev[2]]);
        }
        setCurrentStep(0);
        setIsAiModalOpen(true);
    };

    const handleApplyAiTopicsFromModal = (newAiTopics) => {
        if (topicRef.current?.applyAiTopics) {
            topicRef.current.applyAiTopics(newAiTopics);
        }
    };

    const handleImportPreviousSelected = ({ topics = [], tlas = [], references = [] }) => {
        setPinnedSteps(prev => [
            topics.length > 0 ? true : prev[0],
            tlas.length > 0 ? true : prev[1],
            references.length > 0 ? true : prev[2]
        ]);
        if (topics.length > 0 && topicRef.current?.importPreviousTopics) {
            topicRef.current.importPreviousTopics(topics);
        }
        if (tlas.length > 0 && tlaRef.current?.importPreviousTlas) {
            tlaRef.current.importPreviousTlas(tlas);
        }
        if (references.length > 0 && refRef.current?.importPreviousReferences) {
            refRef.current.importPreviousReferences(references);
        }
    };

    const goBackHandler = () => navigate(-1);

    const getActiveRef = () => {
        if (currentStep === 0) return topicRef.current;
        if (currentStep === 1) return tlaRef.current;
        return refRef.current;
    };

    const collectAllSpellWarnings = () => {
        const allWarnings = [];
        if (topicRef.current?.getSpellWarnings) {
            allWarnings.push(...topicRef.current.getSpellWarnings());
        }
        if (tlaRef.current?.getSpellWarnings) {
            allWarnings.push(...tlaRef.current.getSpellWarnings());
        }
        if (refRef.current?.getSpellWarnings) {
            allWarnings.push(...refRef.current.getSpellWarnings());
        }
        return allWarnings;
    };

    const handleSaveClick = async () => {
        syncLiveTopicsToFrontendMap();

        // 1. Detect if any changes exist across Topics, TLAs, References, or other weeks
        const activeTopicHasChanges = topicRef.current?.hasChanges ? topicRef.current.hasChanges() : false;
        const tlaHasChanges = tlaRef.current?.hasChanges ? tlaRef.current.hasChanges() : false;
        const refHasChanges = refRef.current?.hasChanges ? refRef.current.hasChanges() : false;

        let otherWeeksHaveChanges = false;
        const savedActiveKey = getWeekCacheKey(effectiveWeekId, isOrientation);
        for (const [key, topicsArr] of Object.entries(weekTopicsMap)) {
            if (key === savedActiveKey) continue;
            const initialForWeek = initialWeekTopicsMapRef.current[key] || '[]';
            if (serializeTopics(topicsArr) !== initialForWeek) {
                otherWeeksHaveChanges = true;
                break;
            }
        }

        const hasAnyChanges = activeTopicHasChanges || tlaHasChanges || refHasChanges || otherWeeksHaveChanges;

        const errors = {};

        if (!hasAnyChanges) {
            errors['Form'] = "No changes detected. There are no modifications to save.";
        }

        // 2. Validate Topic requirements for active week
        if (topicRef.current) {
            const err = topicRef.current.validate();
            if (err) errors['Topics'] = err;
        }

        // Also validate any other modified weeks in weekTopicsMap
        for (const [key, topicsArr] of Object.entries(weekTopicsMap)) {
            if (key === savedActiveKey || !Array.isArray(topicsArr) || topicsArr.length === 0) continue;
            const [, rawWid] = key.split('-');
            const wid = Number(rawWid);
            const wObj = weekContext.weeks?.find(w => Number(w.week_id) === wid);
            const wLabel = wObj?.weekNumber ? `Week ${wObj.weekNumber}` : `Week ID ${wid}`;

            const weekErrors = [];
            topicsArr.forEach((t, idx) => {
                const topicNum = idx + 1;
                const title = (t.title || '').trim();
                if (!title) {
                    weekErrors.push(`Topic #${topicNum}: Topic title cannot be empty.`);
                } else if (title.toLowerCase() === 'new custom topic') {
                    weekErrors.push(`Topic #${topicNum}: Default title "New Custom Topic" must be changed.`);
                }
                const subs = Array.isArray(t.subtopics) ? t.subtopics : [];
                if (subs.length === 0) {
                    weekErrors.push(`Topic #${topicNum} (${title || 'Untitled'}): Must contain at least one subtopic.`);
                } else {
                    const emptySubs = subs.filter(s => !s.title || !s.title.trim());
                    if (emptySubs.length > 0) {
                        weekErrors.push(`Topic #${topicNum} (${title || 'Untitled'}): Contains ${emptySubs.length} empty subtopic ${emptySubs.length === 1 ? 'field' : 'fields'}.`);
                    }
                }
            });
            if (weekErrors.length > 0) {
                errors[`${wLabel} Topics`] = weekErrors;
            }
        }

        // 3. Validate TLAs requirements
        if (tlaRef.current) {
            const err = tlaRef.current.validate();
            if (err) errors['Teaching & Learning Activities'] = err;
        }

        // 4. Validate Reference requirements
        if (refRef.current) {
            const err = refRef.current.validate();
            if (err) errors['References'] = err;
        }

        // If hard validation errors or no changes, block save completely
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setShowValidationModal(true);
            return;
        }

        // 5. Soft-Warning Pre-Save Spell Check across Topics, TLAs, and References (Save Anyway is allowed only for spellings)
        const warnings = collectAllSpellWarnings();
        if (warnings.length > 0) {
            setSpellCheckWarnings(warnings);
            setShowSpellCheckModal(true);
            return;
        }

        // 6. Clean Save
        await executeGlobalSave();
    };

    const executeGlobalSave = async () => {
        setShowValidationModal(false);
        setShowSpellCheckModal(false);
        setIsSaving(true);
        try {
            syncLiveTopicsToFrontendMap();

            const savedActiveKey = getWeekCacheKey(effectiveWeekId, isOrientation);
            const activeWidNum = Number(effectiveWeekId) || 0;

            const parseCachedEntry = ([key, topicsArr]) => {
                const [prefix, rawWid] = key.split('-');
                return {
                    key,
                    prefix,
                    wid: Number(rawWid),
                    isOrient: prefix === 'orient',
                    topicsArr
                };
            };

            const modifiedNonActiveEntries = Object.entries(weekTopicsMap)
                .filter(([key, topicsArr]) => {
                    if (key === savedActiveKey) return false;
                    if (!Array.isArray(topicsArr)) return false;
                    const initialSnap = initialWeekTopicsMapRef.current[key];
                    if (initialSnap !== undefined && serializeTopics(topicsArr) === initialSnap) {
                        return false;
                    }
                    return true;
                })
                .map(parseCachedEntry)
                .filter((item) => Boolean(item.wid))
                .sort((a, b) => a.wid - b.wid || (a.isOrient === b.isOrient ? 0 : a.isOrient ? -1 : 1));

            const earlierEntries = modifiedNonActiveEntries.filter((item) => item.wid <= activeWidNum);
            const laterEntries = modifiedNonActiveEntries.filter((item) => item.wid > activeWidNum);

            const persistCachedWeek = async (item) => {
                await fetchJson(`/api/topics/assign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        week_id: item.wid,
                        ilo_id: item.wid,
                        is_orientation: item.isOrient,
                        topics: item.topicsArr
                    })
                }).catch(() => {});
                initialWeekTopicsMapRef.current[item.key] = serializeTopics(item.topicsArr);
            };

            // Save earlier modified weeks first so any continued topic creates its canonical Topic row before later weeks reference it
            for (const item of earlierEntries) {
                await persistCachedWeek(item);
            }

            if (topicRef.current) await topicRef.current.save();

            for (const item of laterEntries) {
                await persistCachedWeek(item);
            }

            if (tlaRef.current) await tlaRef.current.save();
            if (refRef.current) await refRef.current.save();

            // Reset initial clean state on saved forms
            if (topicRef.current?.resetInitialState) topicRef.current.resetInitialState();
            if (tlaRef.current?.resetInitialState) tlaRef.current.resetInitialState();
            if (refRef.current?.resetInitialState) refRef.current.resetInitialState();
            if (effectiveWeekId) {
                const liveTopics = topicRef.current?.getSelectedTopics ? topicRef.current.getSelectedTopics() : weekTopicsMap[savedActiveKey];
                initialWeekTopicsMapRef.current[savedActiveKey] = serializeTopics(liveTopics);
            }

            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
            }, 1800);

        } catch (err) {
            console.error("Consolidated save execution failed:", err);
            alert("An error occurred saving changes. Review console details.");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to resolve complete return + stakeholder details for a comment
    const resolveCommentDetails = (comment) => {
        const cid = Number(comment.comment_id);
        const rawRole = comment.commenter_role || 'APPROVER';
        const roleLabel = comment.commenter_role_label || formatApproverRoleLabel(rawRole);
        const revMeta = revisionReturnMeta.byCommentId[cid] || revisionReturnMeta.byRole[rawRole] || null;

        // Resolve actual stakeholder full name (never falling back to role label if stakeholder is known)
        let commenterName = comment.commenter_name;
        if (!commenterName || commenterName.toLowerCase() === roleLabel.toLowerCase()) {
            commenterName =
                revMeta?.actorName ||
                (comment.stakeholder_id ? STAKEHOLDER_NAME_BY_ID[String(comment.stakeholder_id)] : null) ||
                STAKEHOLDER_NAME_BY_ROLE[rawRole] ||
                roleLabel;
        }

        let returnNumber = Number(comment.return_number) || 0;
        if (revMeta?.returnNumber) {
            returnNumber = revMeta.returnNumber;
        } else if (!comment.return_number || returnNumber <= 1) {
            if (rawRole === 'PROGRAM_HEAD') returnNumber = 2;
            else if (rawRole === 'LIBRARY_DIRECTOR') returnNumber = 3;
            else if (rawRole === 'DEAN') returnNumber = 4;
            else returnNumber = 1;
        }

        const returnDate = revMeta?.returnDate || comment.return_date || comment.createdAt;

        return {
            commenterName,
            commenterRoleLabel: roleLabel,
            returnNumber,
            returnDate
        };
    };

    const renderActiveCommentsList = () => {
        const activeRef = getActiveRef();
        const refComments = (activeRef && activeRef.getComments) ? activeRef.getComments() : [];
        const stateComments = stepComments[currentStep] || [];
        const comments = stateComments.length > 0 ? stateComments : refComments;

        // Build Approver Role options (standard approver roles + any role dynamically present in comments)
        const roleOptionsMap = new Map([
            ['ALL', 'All Approver Roles'],
            ['PROGRAM_HEAD', 'Program Head'],
            ['LIBRARY_DIRECTOR', 'Director of Libraries'],
            ['DEAN', 'Dean']
        ]);

        const allWeekComments = [
            ...(stepComments[0] || []),
            ...(stepComments[1] || []),
            ...(stepComments[2] || []),
            ...comments
        ];

        allWeekComments.forEach(c => {
            if (c?.commenter_role && !roleOptionsMap.has(c.commenter_role)) {
                roleOptionsMap.set(
                    c.commenter_role,
                    c.commenter_role_label || formatApproverRoleLabel(c.commenter_role)
                );
            }
            if (Array.isArray(c?.available_returns)) {
                c.available_returns.forEach(ret => {
                    if (ret?.actor_role && !roleOptionsMap.has(ret.actor_role)) {
                        roleOptionsMap.set(
                            ret.actor_role,
                            ret.actor_role_label || formatApproverRoleLabel(ret.actor_role)
                        );
                    }
                });
            }
        });

        // Compute returned comment counts (total & unresolved) per role option for the active tab
        const roleOptions = Array.from(roleOptionsMap.entries()).map(([value, label]) => {
            const matchingComments = value === 'ALL'
                ? comments
                : comments.filter(c => c.commenter_role === value);
            const totalCount = matchingComments.length;
            const unresolvedRoleCount = matchingComments.filter(c => !c.resolved_status).length;
            return {
                value,
                label,
                totalCount,
                unresolvedCount: unresolvedRoleCount
            };
        });

        const filteredComments = selectedRoleFilter === 'ALL'
            ? comments
            : comments.filter(c => c.commenter_role === selectedRoleFilter);

        // Group filtered comments per Return (Return 1, Return 2, ...)
        const groupedByReturn = {};
        const returnDatesByNum = {};

        filteredComments.forEach(comment => {
            const { returnNumber, returnDate } = resolveCommentDetails(comment);
            if (!groupedByReturn[returnNumber]) {
                groupedByReturn[returnNumber] = [];
            }
            groupedByReturn[returnNumber].push(comment);
            if (!returnDatesByNum[returnNumber] && returnDate) {
                returnDatesByNum[returnNumber] = returnDate;
            }
        });

        const sortedReturnNumbers = Object.keys(groupedByReturn)
            .map(Number)
            .sort((a, b) => a - b);

        return (
            <div className={styles.checklistWrapper}>
                {/* Custom Approver Role Filter Dropdown with Returned Comment Badges */}
                <div className={styles.commentFilterBar}>
                    <RoleFilterDropdown
                        options={roleOptions}
                        value={selectedRoleFilter}
                        onChange={setSelectedRoleFilter}
                    />
                </div>

                {comments.length === 0 ? (
                    <div className={styles.emptyChecklist}>
                        <p style={{ textAlign: 'center', paddingTop: '28px', color: '#888', margin: 0 }}>
                            No unresolved notes for {steps[currentStep]}.
                        </p>
                    </div>
                ) : filteredComments.length === 0 ? (
                    <div className={styles.emptyChecklist}>
                        <p style={{ textAlign: 'center', paddingTop: '28px', color: '#888', margin: 0 }}>
                            No comments from {roleOptionsMap.get(selectedRoleFilter) || 'selected role'} for {steps[currentStep]}.
                        </p>
                    </div>
                ) : (
                    sortedReturnNumbers.map((rNum) => {
                        const groupComments = groupedByReturn[rNum] || [];
                        const rawReturnDate = returnDatesByNum[rNum];
                        const formattedReturnDate = rawReturnDate
                            ? new Date(rawReturnDate).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })
                            : '';

                        return (
                            <div key={`return-group-${rNum}`} className={styles.returnGroupSection}>
                                <div className={styles.returnGroupHeader}>
                                    <span className={styles.returnGroupTitle}>
                                        Return {rNum}{formattedReturnDate ? ` - ${formattedReturnDate}` : ''}
                                    </span>
                                </div>

                                <div className={styles.returnGroupCards}>
                                    {groupComments.map((comment) => {
                                        const topicGroups = (currentStep === 0 && activeRef?.getCommentTargetDetails)
                                            ? activeRef.getCommentTargetDetails(comment)
                                            : (Array.isArray(comment.topic_groups) ? comment.topic_groups : []);

                                        const {
                                            commenterName,
                                            commenterRoleLabel,
                                            returnDate
                                        } = resolveCommentDetails(comment);

                                        const commentTimestamp = comment.createdAt || returnDate;

                                        return (
                                            <label
                                                key={comment.comment_id}
                                                className={`${styles.checklistItem} ${comment.resolved_status ? styles.itemResolved : ''}`}
                                            >
                                                <div className={styles.commentContent}>
                                                    {/* 1. Top Header: Stakeholder Name + Role subtext on Left, Checkbox on Top-Right */}
                                                    <div className={styles.commentItemHeader}>
                                                        <div className={styles.commenterIdentity}>
                                                            <span className={styles.commenterName}>{commenterName}</span>
                                                            <span className={styles.commenterRole}>{commenterRoleLabel}</span>
                                                        </div>

                                                        <div className={styles.checkboxControl}>
                                                            <input
                                                                type="checkbox"
                                                                checked={comment.resolved_status}
                                                                onChange={() => activeRef?.toggleComment && activeRef.toggleComment(comment.comment_id)}
                                                            />
                                                            <span className={styles.customCheckmark}></span>
                                                        </div>
                                                    </div>

                                                    {/* 2. Target Context Block */}
                                                    {currentStep === 0 && topicGroups.length > 0 ? (
                                                        <div className={styles.topicTargetContainer}>
                                                            {topicGroups.map((group, gIdx) => (
                                                                <div key={group.topic_id || gIdx} className={styles.topicTargetGroup}>
                                                                    <div className={styles.topicTargetParent}>
                                                                        <span className={styles.topicTargetPrefix}>TOPIC:</span>
                                                                        <span className={styles.topicTargetTitle}>{group.topic_title}</span>
                                                                    </div>
                                                                    {Array.isArray(group.subtopics) && group.subtopics.length > 0 && (
                                                                        <div className={styles.subtopicTargetList}>
                                                                            {group.subtopics.map((sub, sIdx) => (
                                                                                <div key={sub.subtopic_id || sIdx} className={styles.subtopicTargetPill}>
                                                                                    <span className={styles.subtopicBullet}>•</span>
                                                                                    <span className={styles.subtopicTargetText}>{sub.title}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className={styles.targetContextBadge}>
                                                            <span className={styles.targetPrefix}>
                                                                {currentStep === 1 ? 'TLA:' : currentStep === 2 ? 'REF:' : 'TARGET:'}
                                                            </span>
                                                            <span className={styles.targetText}>
                                                                {activeRef?.getCommentTargetLabel
                                                                    ? activeRef.getCommentTargetLabel(comment)
                                                                    : (comment.target_title || 'General Item')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* 3. Feedback Message Body */}
                                                    <p className={styles.commentMessage}>{comment.message}</p>

                                                    {/* 4. Bottom-Left Time-Only Footer (Date is shown in Return Group Header) */}
                                                    <div className={styles.commentMetadata}>
                                                        <span className={styles.metaDate}>
                                                            {new Date(commentTimestamp).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        );
    };

    // Organize validationErrors into 3 columns (Topics, Teaching & Learning Activities, References)
    const validationColumns = useMemo(() => {
        const toList = (val) => {
            if (!val) return [];
            return Array.isArray(val) ? val : [val];
        };

        const topicErrs = [...toList(validationErrors['Topics'])];
        Object.entries(validationErrors).forEach(([k, v]) => {
            if (k !== 'Topics' && k !== 'Teaching & Learning Activities' && k !== 'References' && k !== 'Form') {
                toList(v).forEach(item => topicErrs.push(`${k}: ${item}`));
            }
        });

        return [
            { title: 'Topics', errors: topicErrs },
            { title: 'Teaching & Learning Activities', errors: toList(validationErrors['Teaching & Learning Activities']) },
            { title: 'References', errors: toList(validationErrors['References']) }
        ];
    }, [validationErrors]);

    return (
        <Skeleton
            header={<Header role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    {/* Weekly Content Planner Navigation Bar */}
                    <FormNavigation
                        goBack={goBackHandler}
                        onSave={handleSaveClick}
                        currentStep={currentStep}
                        setStep={setCurrentStep}
                        pinnedSteps={pinnedSteps}
                        onTogglePin={handleTogglePin}
                        onOpenImportPrevious={() => {
                            syncLiveTopicsToFrontendMap();
                            setIsImportPrevOpen(true);
                        }}
                        steps={steps}
                        weeks={weekContext.weeks}
                        activeWeekId={effectiveWeekId}
                        onSelectWeek={handleSelectWeek}
                        coNumber={weekContext.coNumber}
                        coDescription={weekContext.coDescription}
                        ilos={weekContext.ilos}
                        courseOutcomes={weekContext.courseOutcomes}
                        onSelectCourseOutcome={handleSelectCourseOutcome}
                        isOrientation={isOrientation}
                        status={status}
                        stepCommentCounts={stepCommentCounts}
                        weekCommentCounts={weekContext.commentCountsByWeek}
                    />

                    <div className={styles.mainCont} style={{ position: 'relative', flex: 1, minHeight: 0, height: 'auto' }}>

                        {/* -------------------- 3-Column Pinned Sub-Forms Wrapper -------------------- */}
                        <div className={styles.leftCont} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
                            <div className={styles['form-container']} style={{ padding: '16px 18px 24px 18px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'hidden', boxSizing: 'border-box' }}>
                                <div className={styles.threeColPlannerGrid}>
                                    {/* Column 1: Topics */}
                                    <div
                                        className={styles.plannerColumn}
                                        style={{ display: pinnedSteps[0] ? 'flex' : 'none' }}
                                        onClick={() => setCurrentStep(0)}
                                    >
                                        <TopicSubForm
                                            ref={topicRef}
                                            iloId={effectiveWeekId}
                                            previousWeekId={previousWeekId}
                                            weekNumber={activeWeekNumber}
                                            weekIndexInCo={activeWeekIndex >= 0 ? activeWeekIndex : 0}
                                            isOrientation={isOrientation}
                                            status={status}
                                            setUnresolvedCount={handleTopicUnresolved}
                                            onCommentsChange={handleTopicCommentsChange}
                                            courseCode={weekContext.courseNo || courseCode}
                                            cachedWeekTopics={currentWeekCachedTopics}
                                            previousWeekFrontendTopics={previousWeekCachedTopics}
                                            onTopicsChangeForWeek={handleTopicsChangeForWeek}
                                            onOpenAiSuggest={handleOpenAiSuggest}
                                            isSingleColumn={pinnedSteps.filter(Boolean).length === 1}
                                        />
                                    </div>

                                    {/* Column 2: Teaching & Learning Activities */}
                                    <div
                                        className={styles.plannerColumn}
                                        style={{ display: pinnedSteps[1] ? 'flex' : 'none' }}
                                        onClick={() => setCurrentStep(1)}
                                    >
                                        <TLAForm
                                            ref={tlaRef}
                                            iloId={effectiveWeekId}
                                            weekNumber={isOrientation ? 1 : activeWeekNumber}
                                            isOrientation={isOrientation}
                                            status={status}
                                            setUnresolvedCount={handleTlaUnresolved}
                                            onCommentsChange={handleTlaCommentsChange}
                                            isSingleColumn={pinnedSteps.filter(Boolean).length === 1}
                                        />
                                    </div>

                                    {/* Column 3: References */}
                                    <div
                                        className={styles.plannerColumn}
                                        style={{ display: pinnedSteps[2] ? 'flex' : 'none' }}
                                        onClick={() => setCurrentStep(2)}
                                    >
                                        <ReferenceForm
                                            ref={refRef}
                                            iloId={effectiveWeekId}
                                            weekNumber={isOrientation ? 1 : activeWeekNumber}
                                            isOrientation={isOrientation}
                                            status={status}
                                            setUnresolvedCount={handleRefUnresolved}
                                            courseCode={courseCode || weekContext.courseNo}
                                            pcOfferingId={weekContext.pc_offering_id}
                                            onCommentsChange={handleRefCommentsChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* -------------------- Interactive Review Sidebar UX -------------------- */}
                        {status === 'returned' && (
                            <div className={isCommentsOpen ? styles.rightContCollapsible : styles.rightContCollapsed}>
                                {isCommentsOpen ? (
                                    <div className={styles.checklistCard}>
                                        <div className={styles.checklistHeaderCollapsible}>
                                            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                                <MessageSquare size={18} className={styles.headerIcon} />
                                                <h3 style={{fontSize: '14px', margin: 0, fontWeight: 500}}>Review Feedback</h3>
                                            </div>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                {unresolvedCount > 0 && <span className={styles.floatingBadge} style={{position: 'relative', top: 0, right: 0}}>{unresolvedCount}</span>}
                                                <button onClick={() => setIsCommentsOpen(false)} className={styles.closeCollapse}>
                                                    <ChevronsRight size={20} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className={styles.feedbackStepTabs}>
                                            {['Topics', 'TLAs', 'References'].map((shortLabel, idx) => (
                                                <button
                                                    key={shortLabel}
                                                    type="button"
                                                    className={`${styles.feedbackStepTab} ${currentStep === idx ? styles.feedbackStepTabActive : ''}`}
                                                    onClick={() => setCurrentStep(idx)}
                                                >
                                                    <span>{shortLabel}</span>
                                                    {stepCommentCounts[idx] > 0 && (
                                                        <span className={styles.roleOptionBadge}>{stepCommentCounts[idx]}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        {renderActiveCommentsList()}
                                    </div>
                                ) : (
                                    <button
                                        className={styles.sidebarToggle}
                                        onClick={() => setIsCommentsOpen(true)}
                                        title={`View Review Feedback for ${steps[currentStep]}`}
                                    >
                                        <MessageSquare size={20} className={styles.headerIcon} />
                                        {unresolvedCount > 0 && <span className={styles.collapsedBadge}>{unresolvedCount}</span>}
                                    </button>
                                )}
                            </div>
                        )}


                    </div>

                    {/* --- Consolidated 3-Column Import Previous Term Content Modal --- */}
                    <ImportPreviousModal
                        isOpen={isImportPrevOpen}
                        onClose={() => setIsImportPrevOpen(false)}
                        weekId={effectiveWeekId}
                        weekNumber={isOrientation ? 1 : activeWeekNumber}
                        isOrientation={isOrientation}
                        existingTopics={currentWeekCachedTopics || (topicRef.current?.getSelectedTopics ? topicRef.current.getSelectedTopics() : [])}
                        existingTlas={tlaRef.current?.getTlas ? tlaRef.current.getTlas() : []}
                        existingRefs={refRef.current?.getSelectedRefs ? refRef.current.getSelectedRefs() : []}
                        onImportSelected={handleImportPreviousSelected}
                    />

                    {/* --- AI Topic & Subtopic Suggestion Modal --- */}
                    <AiTopicSuggestModal
                        isOpen={isAiModalOpen}
                        onClose={() => setIsAiModalOpen(false)}
                        onApplyTopics={handleApplyAiTopicsFromModal}
                        iloId={effectiveWeekId}
                        courseCode={weekContext.courseNo || courseCode}
                        courseTitle={weekContext.courseTitle}
                        courseDescription={weekContext.courseDescription}
                        coNumber={weekContext.coNumber}
                        coDescription={weekContext.coDescription}
                        ilos={weekContext.ilos}
                        weekNumber={isOrientation ? 1 : activeWeekNumber}
                        weeklyHours={activeWeekHours}
                        isOrientation={isOrientation}
                        previousWeeksTopics={previousWeeksTopicsForAi}
                        currentTopics={currentWeekCachedTopics || []}
                        weekAiCache={weekAiCacheMap[getWeekCacheKey(effectiveWeekId, isOrientation)]}
                        onUpdateWeekAiCache={handleUpdateWeekAiCache}
                    />

                    {/* --- 3-Column Validation Requirements Modal (No Save Anyway for Hard Requirements) --- */}
                    <InlineModal
                        isOpen={showValidationModal}
                        title="Validation Notice"
                        onClose={() => setShowValidationModal(false)}
                        modalClassName={styles.wideModal}
                        actions={
                            <button type="button" className={styles.modalCancelBtn} onClick={() => setShowValidationModal(false)}>
                                Review & Edit
                            </button>
                        }
                    >
                        <div className={styles.validationBanner}>
                            <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                            <div>
                                <p className={styles.validationBannerTitle}>Requirements Not Met</p>
                                <p className={styles.validationBannerSubtext}>
                                    Please review and resolve the highlighted items across the three weekly content sections before saving.
                                </p>
                            </div>
                        </div>

                        {validationErrors['Form'] && (
                            <div className={styles.validationNoChangeBanner}>
                                <AlertCircle size={16} />
                                <span>{validationErrors['Form']}</span>
                            </div>
                        )}

                        <div className={styles.validationThreeColGrid}>
                            {validationColumns.map((col) => {
                                const hasErr = col.errors.length > 0;
                                return (
                                    <div key={col.title} className={styles.validationCol}>
                                        <div className={styles.validationColHeader}>
                                            <span className={styles.validationColTitle}>{col.title}</span>
                                            {hasErr ? (
                                                <span className={styles.validationColBadgeErr}>
                                                    {col.errors.length} {col.errors.length === 1 ? 'Issue' : 'Issues'}
                                                </span>
                                            ) : (
                                                <span className={styles.validationColBadgeOk}>Ready</span>
                                            )}
                                        </div>
                                        <div className={styles.validationColBody}>
                                            {hasErr ? (
                                                <ul className={styles.validationColList}>
                                                    {col.errors.map((errText, idx) => (
                                                        <li key={idx}>{errText}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className={styles.validationColEmpty}>
                                                    <CheckCircle size={14} />
                                                    <span>All requirements met</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </InlineModal>

                    {/* --- Soft-Warning Pre-Save Spell Check Confirmation Modal --- */}
                    <InlineModal
                        isOpen={showSpellCheckModal}
                        title="Spelling Check Warning"
                        onClose={() => setShowSpellCheckModal(false)}
                        actions={
                            <>
                                <button type="button" className={styles.modalCancelBtn} onClick={() => setShowSpellCheckModal(false)}>
                                    Review & Edit
                                </button>
                                <button type="button" className={styles.modalConfirmBtn} onClick={executeGlobalSave}>
                                    Save Anyway
                                </button>
                            </>
                        }
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <AlertCircle size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 600, color: '#1E293B' }}>
                                    Potential Misspellings Detected
                                </p>
                                <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.45 }}>
                                    The following words were flagged across your form fields. Right-click any underlined word to view suggestions or add it to your whitelist:
                                </p>
                                <div className={styles.spellWarningList}>
                                    {spellCheckWarnings.map((item, idx) => (
                                        <div key={idx} className={styles.spellWarningCategory}>
                                            <div className={styles.spellWarningHeaderRow}>
                                                <span className={styles.spellWarningSectionTag}>{item.section}</span>
                                                <span className={styles.spellWarningFieldTitle}>{item.field}</span>
                                            </div>
                                            <div className={styles.spellWarningWordPills}>
                                                {item.words.map((w, wIdx) => (
                                                    <span key={`${w}-${wIdx}`} className={styles.spellWarningWordBadge}>
                                                        {w}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </InlineModal>

                    {/* --- Clean Global Save Success Feedback Modal --- */}
                    <InlineModal
                        isOpen={showSuccessModal}
                        title="Saved Successfully"
                        onClose={() => setShowSuccessModal(false)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
                            <CheckCircle size={22} color="#10B981" style={{ flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 500, color: '#1E293B' }}>
                                Weekly content changes and comment resolutions have been saved.
                            </p>
                        </div>
                    </InlineModal>

                </div>
            }
        />
    );
};

export default TopicForm;
