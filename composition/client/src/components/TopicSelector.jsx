import React, { useState, useMemo, useRef, useEffect } from 'react';
import styles from '../styles/TopicSelector.module.sass';
import { BookOpen, Plus, Trash2, Copy, X, ChevronDown, Edit2, CornerDownRight, Lock, PlusCircle } from 'react-feather';
import { GeminiStar } from './AiTopicSuggestModal.jsx';
import SpellCheckInput from './SpellCheckInput.jsx';

const TopicSelector = ({
    label,
    value = [],
    onChange,
    error,
    disabled,
    isOrientation = false,
    weekNumber = 1,
    weekIndexInCo = 0,
    previousWeekTopics = [],
    onOpenAiSuggest,
    isSingleColumn = false
}) => {
    const [isContinueOpen, setIsContinueOpen] = useState(false);
    const [lastAddedId, setLastAddedId] = useState(null);
    const wrapperRef = useRef(null);
    const scrollContainerRef = useRef(null);

    // Topics can only be continued starting from the 2nd week within the same Course Outcome (weekIndexInCo >= 1).
    // Instructors cannot continue topics across different Course Outcomes.
    const canContinueTopic = !isOrientation && Number(weekIndexInCo) >= 1;
    const prevWeekDisplay = Number(weekNumber) > 1 ? Number(weekNumber) - 1 : 1;
    const currentContinuedTopic = useMemo(
        () => value.find(t => Boolean(t.isContinuation)),
        [value]
    );

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsContinueOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getTopicKey = (t) => t.topic_id || t._temp_id;
    const getSubtopicKey = (s) => s.subtopic_id || s._temp_id;

    // Only scroll when the newly added card extends outside the visible scroll viewport (i.e. container is full)
    const scrollCardIntoViewIfNeeded = (cardId) => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                const container = scrollContainerRef.current;
                if (!container) return;
                const cardEl = container.querySelector(`[data-card-id="${String(cardId).replace(/"/g, '\\"')}"]`);
                if (!cardEl) return;
                const containerRect = container.getBoundingClientRect();
                const cardRect = cardEl.getBoundingClientRect();

                if (cardRect.top >= containerRect.top && cardRect.bottom <= containerRect.bottom) {
                    return;
                }
                if (cardRect.height > containerRect.height || cardRect.top < containerRect.top) {
                    const targetTop = container.scrollTop + (cardRect.top - containerRect.top) - 12;
                    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
                    return;
                }
                const targetTop = container.scrollTop + (cardRect.bottom - containerRect.bottom) + 12;
                container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            }, 60);
        });
    };

    const handleAddManualTopic = () => {
        if (disabled) return;
        const tempId = `temp-topic-${Date.now()}`;
        const manualTopic = {
            topic_id: null,
            _temp_id: tempId,
            title: "New Custom Topic",
            isContinuation: false,
            subtopics: [{
                subtopic_id: null,
                _temp_id: `temp-sub-${Date.now()}`,
                title: "",
                sequence_order: 0
            }],
            isManual: true
        };
        onChange([...value, manualTopic]);
        triggerAnimation(tempId);
        scrollCardIntoViewIfNeeded(tempId);
    };

    const handleSelectContinueTopic = (prevTopic) => {
        if (disabled || !prevTopic) return;
        const isAlreadyContinued =
            currentContinuedTopic &&
            String(currentContinuedTopic.title).trim().toLowerCase() === String(prevTopic.title).trim().toLowerCase();

        if (isAlreadyContinued) {
            // Deselect if clicked again
            onChange(value.filter(t => !t.isContinuation));
            setIsContinueOpen(false);
            return;
        }

        const tempId = `temp-cont-topic-${Date.now()}`;
        const continuedTopicEntry = {
            topic_id: prevTopic.topic_id || null,
            _temp_id: prevTopic.topic_id ? null : tempId,
            title: prevTopic.title,
            isContinuation: true,
            subtopics: [
                {
                    subtopic_id: null,
                    _temp_id: `temp-sub-${Date.now()}`,
                    title: "",
                    sequence_order: 0
                }
            ]
        };

        // Allow only ONE continued topic from the previous week within the same Course Outcome: replace any existing continuation or same-title topic
        const remainingTopics = value.filter(
            t =>
                !t.isContinuation &&
                String(t.title).trim().toLowerCase() !== String(prevTopic.title).trim().toLowerCase()
        );

        onChange([continuedTopicEntry, ...remainingTopics]);
        setIsContinueOpen(false);
        triggerAnimation(prevTopic.topic_id || tempId);
    };

    const triggerAnimation = (id) => {
        setLastAddedId(id);
        setTimeout(() => setLastAddedId(null), 1500);
    };

    const updateSubtopic = (topicTarget, subTarget, newTitle) => {
        onChange(value.map(t => {
            if (getTopicKey(t) !== getTopicKey(topicTarget)) return t;
            return {
                ...t,
                subtopics: t.subtopics.map(s =>
                    getSubtopicKey(s) === getSubtopicKey(subTarget) ? { ...s, title: newTitle } : s
                )
            };
        }));
    };

    const deleteSubtopic = (topicTarget, subTarget) => {
        onChange(value.map(t => {
            if (getTopicKey(t) !== getTopicKey(topicTarget)) return t;
            return {
                ...t,
                subtopics: t.subtopics.filter(s => getSubtopicKey(s) !== getSubtopicKey(subTarget))
            };
        }));
    };

    const duplicateSubtopic = (topicTarget, subTarget) => {
        onChange(value.map(t => {
            if (getTopicKey(t) !== getTopicKey(topicTarget)) return t;
            const index = t.subtopics.findIndex(s => getSubtopicKey(s) === getSubtopicKey(subTarget));
            if (index === -1) return t;
            const target = t.subtopics[index];
            const newNode = {
                subtopic_id: null,
                _temp_id: `temp-sub-${Date.now()}-${Math.random()}`,
                title: `${target.title} (Copy)`,
                sequence_order: target.sequence_order + 1
            };
            const newSubtopics = [...t.subtopics];
            newSubtopics.splice(index + 1, 0, newNode);
            const reindexed = newSubtopics.map((s, i) => ({ ...s, sequence_order: i }));
            return { ...t, subtopics: reindexed };
        }));
    };

    const scrollToSubtopicsBottom = (topicKey) => {
        setTimeout(() => {
            const el = document.getElementById(`subtopics-${topicKey}`);
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }, 50);
    };

    const addBlankSubtopic = (topicTarget) => {
        onChange(value.map(t => {
            if (getTopicKey(t) !== getTopicKey(topicTarget)) return t;
            return {
                ...t,
                subtopics: [
                    ...t.subtopics,
                    {
                        subtopic_id: null,
                        _temp_id: `temp-sub-${Date.now()}`,
                        title: "",
                        sequence_order: t.subtopics.length
                    }
                ]
            };
        }));
        scrollToSubtopicsBottom(getTopicKey(topicTarget));
    };

    const emptySpots = Math.max(2, value.length) - value.length;
    const placeholderCards = Array.from({ length: emptySpots }).map((_, i) => {
        if (value.length === 0 && i === 0) {
            return (
                <div key="placeholder-empty-prompt" className={styles.emptyPromptCard}>
                    <div className={styles.emptyPromptIcon}>
                        <PlusCircle size={20} />
                    </div>
                    <div className={styles.emptyPromptTitle}>
                        No topics added for {isOrientation ? 'orientation' : `week ${weekNumber}`} yet
                    </div>
                    <div className={styles.emptyPromptText}>
                        Click <strong>Add Topic</strong>, use <strong>AI Suggest</strong>, or click <strong>Import Previous</strong> in the top bar.
                    </div>
                </div>
            );
        }
        return (
            <div key={`placeholder-${i}`} className={styles.placeholderCard}>
                <div className={styles.placeholderHeader} />
                <div className={styles.placeholderBody}>
                    <div className={styles.placeholderLine} />
                    <div className={styles.placeholderLine} />
                    <div className={styles.placeholderLine} />
                    <div className={styles.placeholderLine} />
                    <div className={styles.placeholderLine} />
                    <div className={styles.placeholderLine} />
                    <div className={styles.placeholderLine} />
                </div>
            </div>
        );
    });

    return (
        <div className={styles.container} style={{ display: "flex", flexDirection: "column", height: "100%", flexGrow: 1, minHeight: 0 }}>
            {label && <label className={styles.label}>{label}</label>}

            <div className={`${styles.mainWrapper} ${error ? styles.error : ''}`}>
                <div ref={wrapperRef} className={styles.stickyHeader}>
                    <div className={styles.headerRow}>
                        <div className={styles.headerTitleGroup}>
                            <BookOpen size={15} className={styles.headerTitleIcon} />
                            <span className={styles.headerTitleText}>Topics</span>
                            <span className={styles.headerCountBadge}>{value.length}</span>
                        </div>

                        <div className={styles.headerActionsGroup}>
                            {canContinueTopic && (
                                <div className={styles.continueTopicWrapper}>
                                    <button
                                        type="button"
                                        className={`${styles.continueTopicBtn} ${currentContinuedTopic ? styles.continueActive : ''}`}
                                        onClick={() => setIsContinueOpen(!isContinueOpen)}
                                        title={`Continue one topic from Week ${prevWeekDisplay} with new subtopics for Week ${weekNumber}`}
                                    >
                                        <CornerDownRight size={14} className={styles.btnIcon} />
                                        <span>Continue Prev</span>
                                        <ChevronDown size={13} className={`${styles.continueChevron} ${isContinueOpen ? styles.up : ''}`} />
                                    </button>

                                    {isContinueOpen && (
                                        <div className={styles.continueDropdown}>
                                            <div className={styles.continueDropdownHeader}>
                                                <span>Select 1 Topic from Week {prevWeekDisplay} to Continue</span>
                                            </div>
                                            <div className={styles.continueOptionsList}>
                                                {previousWeekTopics && previousWeekTopics.length > 0 ? (
                                                    previousWeekTopics.map((prevTopic, idx) => {
                                                        const isSelectedCont =
                                                            currentContinuedTopic &&
                                                            String(currentContinuedTopic.title).trim().toLowerCase() ===
                                                                String(prevTopic.title).trim().toLowerCase();
                                                        return (
                                                            <div
                                                                key={prevTopic.topic_id || prevTopic._temp_id || idx}
                                                                className={`${styles.continueOptionItem} ${isSelectedCont ? styles.selectedContinueOpt : ''}`}
                                                                onClick={() => handleSelectContinueTopic(prevTopic)}
                                                            >
                                                                <input type="radio" checked={Boolean(isSelectedCont)} readOnly />
                                                                <div className={styles.continueOptText}>
                                                                    <span className={styles.continueOptTitle}>{prevTopic.title}</span>
                                                                    <span className={styles.continueOptMeta}>
                                                                        {(prevTopic.subtopics || []).length} subtopics in Week {prevWeekDisplay}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className={styles.noResults}>
                                                        No topics mapped in Week {prevWeekDisplay} yet.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {onOpenAiSuggest && (
                                <button
                                    type="button"
                                    className={styles.aiSuggestBtn}
                                    onClick={onOpenAiSuggest}
                                    title="AI Suggest sequential topics & subtopics aligned to Course Outcomes, ILOs, and weekly hours"
                                >
                                    <span className={styles.geminiSparkleIcon}>
                                        <GeminiStar size={15} />
                                    </span>
                                    <span className={styles.aiBtnText}>AI Suggest</span>
                                </button>
                            )}

                            <button type="button" className={styles.mainAddBtn} onClick={handleAddManualTopic}>
                                <Plus size={15} className={styles.btnIcon} /> <span>Add Topic</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.scrollContainer} ref={scrollContainerRef}>
                    <div className={`${styles.configArea} ${isSingleColumn ? styles.configAreaTwoCol : ''}`}>
                        {value.map((topic) => {
                            const topicKey = getTopicKey(topic);
                            const isNewlyAdded = topicKey === lastAddedId;
                            const isLockedContinuation = Boolean(topic.isContinuation);
                            const isAiSuggested = Boolean(topic.isAiSuggested);

                            return (
                                <div
                                    key={topicKey}
                                    data-card-id={topicKey}
                                    className={`${styles.topicCard} ${isNewlyAdded ? styles.newEntry : ''} ${isLockedContinuation ? styles.continuedTopicCard : ''} ${isAiSuggested ? styles.aiSuggestedTopicCard : ''}`}
                                >
                                    <div className={styles.topicHeaderCard}>
                                        <div className={styles.topicTitleGroup}>
                                            <div className={styles.inputWrapper}>
                                                {isLockedContinuation ? (
                                                    <Lock size={13} className={styles.lockIcon} title="Continued from previous week (Title locked)" />
                                                ) : (
                                                    <Edit2 size={12} className={styles.editIcon} />
                                                )}
                                                <SpellCheckInput
                                                    className={`${styles.topicTitleInput} ${isLockedContinuation ? styles.lockedTitleInput : ''}`}
                                                    value={topic.title}
                                                    readOnly={isLockedContinuation}
                                                    onChange={(e) => {
                                                        if (isLockedContinuation) return;
                                                        const newTitle = e.target.value;
                                                        onChange(value.map(t => getTopicKey(t) === topicKey ? { ...t, title: newTitle } : t));
                                                    }}
                                                    placeholder="Enter Topic Title..."
                                                />
                                                {isLockedContinuation && (
                                                    <span className={styles.continuedBadge}>Continued</span>
                                                )}
                                            </div>
                                        </div>
                                        <button className={styles.removeTopicBtn} onClick={() => onChange(value.filter(t => getTopicKey(t) !== topicKey))}>
                                            <X color={"white"} size={16} />
                                        </button>
                                    </div>

                                    <div className={styles.topicControls}>
                                        <button className={styles.addSubBtnSticky} onClick={() => addBlankSubtopic(topic)}>
                                            <Plus size={14} className={styles.btnIcon} /> <span>Add Subtopic</span>
                                        </button>
                                    </div>

                                    <div className={styles.subtopicsContainer} id={`subtopics-${topicKey}`}>
                                        {(topic.subtopics || []).map((sub) => {
                                            const subKey = getSubtopicKey(sub);
                                            return (
                                                <div key={subKey} className={styles.subtopicRow}>
                                                    <div className={styles.bullet}>•</div>
                                                    <SpellCheckInput
                                                        type="text"
                                                        placeholder="Enter subtopic detail..."
                                                        value={sub.title}
                                                        onChange={(e) => updateSubtopic(topic, sub, e.target.value)}
                                                    />
                                                    <div className={styles.actions}>
                                                        <button onClick={() => duplicateSubtopic(topic, sub)} title="Duplicate">
                                                            <Copy size={14} />
                                                        </button>
                                                        <button className={styles.delete} onClick={() => deleteSubtopic(topic, sub)} title="Delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        {placeholderCards}
                    </div>
                </div>
            </div>
            {error && <div className={styles.errorText}>{error}</div>}
        </div>
    );
};

export default TopicSelector;

