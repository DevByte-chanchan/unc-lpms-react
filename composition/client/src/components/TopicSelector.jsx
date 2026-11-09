import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import styles from '../styles/TopicSelector.module.sass';
import { Search, Plus, Trash2, Copy, X, ChevronDown, Edit2, CornerDownRight, Lock } from 'react-feather';
import AiTopicSuggestModal, { GeminiStar } from './AiTopicSuggestModal.jsx';

const TopicSelector = ({
    label,
    options = [],
    value = [],
    onChange,
    error,
    disabled,
    iloId,
    courseCode,
    weekNumber = 1,
    previousWeekTopics = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isContinueOpen, setIsContinueOpen] = useState(false);
    const [lastAddedId, setLastAddedId] = useState(null);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const wrapperRef = useRef(null);
    const scrollContainerRef = useRef(null);

    const canContinueTopic = Number(weekNumber) > 1;
    const currentContinuedTopic = useMemo(
        () => value.find(t => Boolean(t.isContinuation)),
        [value]
    );

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsPickerOpen(false);
                setIsContinueOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getTopicKey = (t) => t.topic_id || t._temp_id;
    const getSubtopicKey = (s) => s.subtopic_id || s._temp_id;

    const isTopicSelected = useCallback((topic) => {
        if (!topic || !topic.title) return false;
        return value.some(t => String(t.title).trim().toLowerCase() === String(topic.title).trim().toLowerCase());
    }, [value]);

    const filteredOptions = useMemo(() => {
        let results = options.filter(opt =>
            (opt.title || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
        results.sort((a, b) => {
            const aSelected = isTopicSelected(a);
            const bSelected = isTopicSelected(b);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return 0;
        });
        return results;
    }, [options, searchTerm, isTopicSelected]);

    const scrollToMainBottom = () => {
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    const handleSelectTopic = (topic) => {
        if (disabled) return;
        const isSelected = isTopicSelected(topic);
        if (isSelected) {
            onChange(value.filter(t => String(t.title).trim().toLowerCase() !== String(topic.title).trim().toLowerCase()));
        } else {
            const tempId = `temp-topic-${Date.now()}`;
            const newTopic = {
                topic_id: topic.topic_id || null,
                _temp_id: topic.topic_id ? null : tempId,
                title: topic.title,
                isContinuation: false,
                subtopics: (topic.subtopics || []).map((s, idx) => ({
                    subtopic_id: s.subtopic_id || null,
                    _temp_id: s.subtopic_id ? null : `temp-sub-${Date.now()}-${idx}-${Math.random()}`,
                    title: s.title || '',
                    sequence_order: s.sequence_order ?? idx
                }))
            };
            onChange([...value, newTopic]);
            triggerAnimation(topic.topic_id || tempId);
            scrollToMainBottom();
        }
    };

    const handleAddManualTopic = () => {
        const tempId = `temp-topic-${Date.now()}`;
        const manualTopic = {
            topic_id: null,
            _temp_id: tempId,
            title: searchTerm || "New Custom Topic",
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
        setSearchTerm('');
        setIsPickerOpen(false);
        triggerAnimation(tempId);
        scrollToMainBottom();
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

        // Allow only ONE continued topic from the previous week: replace any existing continuation or same-title topic
        const remainingTopics = value.filter(
            t =>
                !t.isContinuation &&
                String(t.title).trim().toLowerCase() !== String(prevTopic.title).trim().toLowerCase()
        );

        onChange([continuedTopicEntry, ...remainingTopics]);
        setIsContinueOpen(false);
        triggerAnimation(prevTopic.topic_id || tempId);
    };

    const handleApplyAiTopics = (newAiTopics) => {
        if (!newAiTopics || newAiTopics.length === 0) return;
        onChange([...value, ...newAiTopics]);
        if (newAiTopics[0]) {
            triggerAnimation(newAiTopics[0]._temp_id || newAiTopics[0].topic_id);
        }
        scrollToMainBottom();
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

    const emptySpots = Math.max(4, value.length + (value.length % 2 === 1 ? 1 : 0)) - value.length;
    const placeholderCards = Array.from({ length: emptySpots }).map((_, i) => (
        <div key={`placeholder-${i}`} className={styles.placeholderCard}>
            <div className={styles.placeholderHeader} />
            <div className={styles.placeholderBody}>
                <div className={styles.placeholderLine} />
                <div className={styles.placeholderLine} />
                <div className={styles.placeholderLine} />
                <div className={styles.placeholderLine} />
                <div className={styles.placeholderLine} />
            </div>
        </div>
    ));

    return (
        <div className={styles.container} style={{ display: "flex", flexDirection: "column", height: "100%", flexGrow: 1, minHeight: 0 }}>
            {label && <label className={styles.label}>{label}</label>}

            <div className={`${styles.mainWrapper} ${error ? styles.error : ''}`}>
                <div ref={wrapperRef} className={styles.stickyHeader}>
                    <div className={styles.headerRow}>
                        <div className={styles.searchBar}>
                            <Search size={16} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search or type to add custom topic..."
                                value={searchTerm}
                                onFocus={() => {
                                    setIsPickerOpen(true);
                                    setIsContinueOpen(false);
                                }}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddManualTopic();
                                }}
                            />
                            <ChevronDown
                                size={18}
                                className={`${styles.chevron} ${isPickerOpen ? styles.up : ''}`}
                                onClick={() => {
                                    setIsPickerOpen(!isPickerOpen);
                                    setIsContinueOpen(false);
                                }}
                            />
                        </div>

                        {canContinueTopic && (
                            <div className={styles.continueTopicWrapper}>
                                <button
                                    type="button"
                                    className={`${styles.continueTopicBtn} ${currentContinuedTopic ? styles.continueActive : ''}`}
                                    onClick={() => {
                                        setIsContinueOpen(!isContinueOpen);
                                        setIsPickerOpen(false);
                                    }}
                                    title={`Continue one topic from Week ${weekNumber - 1} with new subtopics for Week ${weekNumber}`}
                                >
                                    <CornerDownRight size={15} className={styles.btnIcon} />
                                    <span>Continue Previous Topic</span>
                                    <ChevronDown size={14} className={`${styles.continueChevron} ${isContinueOpen ? styles.up : ''}`} />
                                </button>

                                {isContinueOpen && (
                                    <div className={styles.continueDropdown}>
                                        <div className={styles.continueDropdownHeader}>
                                            <span>Select 1 Topic from Week {weekNumber - 1} to Continue</span>
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
                                                                    {(prevTopic.subtopics || []).length} subtopics in Week {weekNumber - 1}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className={styles.noResults}>
                                                    No topics mapped in Week {weekNumber - 1} yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button type="button" className={styles.mainAddBtn} onClick={handleAddManualTopic}>
                            <Plus size={16} className={styles.btnIcon} /> <span>Add Topic</span>
                        </button>
                        <button
                            type="button"
                            className={styles.aiSuggestBtn}
                            onClick={() => setIsAiModalOpen(true)}
                            title="Generate intelligent course topics with Google Gemini AI"
                        >
                            <span className={styles.geminiSparkleIcon}>
                                <GeminiStar size={15} />
                            </span>
                            <span className={styles.aiBtnText}>AI Suggest</span>
                        </button>
                    </div>

                    {isPickerOpen && (
                        <div className={styles.pickerDropdown}>
                            <div className={styles.optionsList}>
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map(opt => {
                                        const isSelected = isTopicSelected(opt);
                                        return (
                                            <div
                                                key={opt.topic_id || opt._temp_id}
                                                className={`${styles.optionItem} ${isSelected ? styles.selectedOpt : ''}`}
                                                onClick={() => handleSelectTopic(opt)}
                                            >
                                                <input type="checkbox" checked={isSelected} readOnly />
                                                <span>{opt.title}</span>
                                                <span className={styles.subCount}>{(opt.subtopics || []).length} items</span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className={styles.noResults}>No matching topics found.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.scrollContainer} ref={scrollContainerRef}>
                    <div className={styles.configArea}>
                        {value.map((topic) => {
                            const topicKey = getTopicKey(topic);
                            const isNewlyAdded = topicKey === lastAddedId;
                            const isLockedContinuation = Boolean(topic.isContinuation);

                            return (
                                <div
                                    key={topicKey}
                                    className={`${styles.topicCard} ${isNewlyAdded ? styles.newEntry : ''} ${isLockedContinuation ? styles.continuedTopicCard : ''}`}
                                >
                                    <div className={styles.topicHeaderCard}>
                                        <div className={styles.topicTitleGroup}>
                                            <div className={styles.inputWrapper}>
                                                {isLockedContinuation ? (
                                                    <Lock size={13} className={styles.lockIcon} title="Continued from previous week (Title locked)" />
                                                ) : (
                                                    <Edit2 size={12} className={styles.editIcon} />
                                                )}
                                                <input
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
                                                    <input
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

            {/* AI Topic Suggestion Modal */}
            <AiTopicSuggestModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onApplyTopics={handleApplyAiTopics}
                iloId={iloId}
                courseCode={courseCode}
                currentTopics={value}
            />
        </div>
    );
};

export default TopicSelector;
