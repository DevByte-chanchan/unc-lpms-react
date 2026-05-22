import React, { useState } from 'react';
import styles from '../styles/TopicSelector.module.sass';
import { Search, Plus, Trash2, Copy, X, ChevronDown, List, Edit2 } from 'react-feather';

const TopicSelector = ({ label, options = [], value = [], onChange, error, disabled }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [lastAddedId, setLastAddedId] = useState(null);

    // Normalize IDs uniformly for comparison
    const getTopicKey = (t) => t.topic_id || t._temp_id;
    const getSubtopicKey = (s) => s.subtopic_id || s._temp_id;

    const handleSelectTopic = (topic) => {
        if (disabled) return;

        // Compare by title to prevent duplicating names
        const isSelected = value.some(t => String(t.title).trim().toLowerCase() === String(topic.title).trim().toLowerCase());

        if (isSelected) {
            onChange(value.filter(t => String(t.title).trim().toLowerCase() !== String(topic.title).trim().toLowerCase()));
        } else {
            const tempId = `temp-topic-${Date.now()}`;
            const newTopic = {
                topic_id: topic.topic_id || null,
                _temp_id: topic.topic_id ? null : tempId,
                title: topic.title,
                subtopics: (topic.subtopics || []).map((s, idx) => ({
                    subtopic_id: s.subtopic_id || null,
                    _temp_id: s.subtopic_id ? null : `temp-sub-${Date.now()}-${idx}-${Math.random()}`,
                    title: s.title || '',
                    sequence_order: s.sequence_order ?? idx
                }))
            };
            onChange([newTopic, ...value]);
            triggerAnimation(topic.topic_id || tempId);
        }
    };

    const handleAddManualTopic = () => {
        const tempId = `temp-topic-${Date.now()}`;
        const manualTopic = {
            topic_id: null,
            _temp_id: tempId,
            title: searchTerm || "New Custom Topic",
            subtopics: [{
                subtopic_id: null,
                _temp_id: `temp-sub-${Date.now()}`,
                title: "",
                sequence_order: 0
            }],
            isManual: true
        };
        onChange([manualTopic, ...value]);
        setSearchTerm('');
        setIsPickerOpen(false);
        triggerAnimation(tempId);
    };

    const triggerAnimation = (id) => {
        setLastAddedId(id);
        setTimeout(() => setLastAddedId(null), 1000);
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

            // Re-index sequence orders cleanly
            const reindexed = newSubtopics.map((s, i) => ({ ...s, sequence_order: i }));
            return { ...t, subtopics: reindexed };
        }));
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
    };

    const filteredOptions = options.filter(opt =>
        opt.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <label className={styles.label}>{label}</label>

            <div className={`${styles.mainWrapper} ${error ? styles.error : ''}`}>
                <div className={styles.stickyHeader}>
                    <div className={styles.searchBar}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search or type to add custom topic..."
                            value={searchTerm}
                            onFocus={() => setIsPickerOpen(true)}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className={styles.addManualBtnInline} onClick={handleAddManualTopic}>
                                <Plus size={14} /> Add Topic
                            </button>
                        )}
                        <ChevronDown
                            size={18}
                            className={`${styles.chevron} ${isPickerOpen ? styles.up : ''}`}
                            onClick={() => setIsPickerOpen(!isPickerOpen)}
                        />
                    </div>

                    {isPickerOpen && (
                        <div className={styles.pickerDropdown}>
                            <div className={styles.optionsList}>
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map(opt => {
                                        const isSelected = value.some(t => String(t.title).trim().toLowerCase() === String(opt.title).trim().toLowerCase());
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
                            <div className={styles.pickerFooter}>
                                <button className={styles.footerAddBtn} onClick={handleAddManualTopic}>
                                    <Plus size={14} /> Create Custom Topic
                                </button>
                                <button className={styles.closeBtn} onClick={() => setIsPickerOpen(false)}>Close</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.scrollContainer}>
                    {value.length === 0 ? (
                        <div className={styles.emptyState}>
                            <List size={36} />
                            <p>No topics selected. Use the search bar above to begin mapping.</p>
                        </div>
                    ) : (
                        <div className={styles.configArea}>
                            {value.map((topic) => {
                                const topicKey = getTopicKey(topic);
                                return (
                                    <div
                                        key={topicKey}
                                        className={`${styles.topicCard} ${lastAddedId === topicKey ? styles.newEntry : ''}`}
                                    >
                                        <div className={styles.topicHeaderCard}>
                                            <div className={styles.topicTitleGroup}>
                                                <span className={styles.topicBadge}>Topic</span>
                                                <div className={styles.inputWrapper}>
                                                    <Edit2 size={12} className={styles.editIcon} />
                                                    <input
                                                        className={styles.topicTitleInput}
                                                        value={topic.title}
                                                        onChange={(e) => {
                                                            const updated = value.map(t => getTopicKey(t) === topicKey ? { ...t, title: e.target.value } : t);
                                                            onChange(updated);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                className={styles.removeTopicBtn}
                                                onClick={() => onChange(value.filter(t => getTopicKey(t) !== topicKey))}
                                            >
                                                <X color={"white"} size={16} />
                                            </button>
                                        </div>

                                        <div className={styles.subtopicsContainer}>
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
                                            <button className={styles.addSubBtn} onClick={() => addBlankSubtopic(topic)}>
                                                <Plus size={14} /> Add Subtopic
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {error && <div className={styles.errorText}>{error}</div>}
        </div>
    );
};

export default TopicSelector;