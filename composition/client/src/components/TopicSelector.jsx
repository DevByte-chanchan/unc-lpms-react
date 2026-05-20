import React, { useState } from 'react';
import styles from '../styles/TopicSelector.module.sass';
import { Search, Plus, Trash2, Copy, X, ChevronDown, List, Edit2 } from 'react-feather';

const TopicSelector = ({ label, options = [], value = [], onChange, error, disabled }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [lastAddedId, setLastAddedId] = useState(null);

    const handleSelectTopic = (topic) => {
        if (disabled) return;

        // Check selection based on Title to prevent duplication bugs
        const isSelected = value.some(t => t.title === topic.title);

        if (isSelected) {
            // Remove by title
            onChange(value.filter(t => t.title !== topic.title));
        } else {
            const newId = `topic-${Date.now()}`;
            const newTopic = {
                ...topic,
                id: newId,
                subtopics: topic.subtopics.map(s => ({ ...s, id: `sub-${Date.now()}-${Math.random()}` }))
            };
            // PREPEND to top
            onChange([newTopic, ...value]);
            triggerAnimation(newId);
        }
    };

    const handleAddManualTopic = () => {
        const newId = `manual-${Date.now()}`;
        const manualTopic = {
            id: newId,
            title: searchTerm || "New Custom Topic",
            subtopics: [{ id: `sub-${Date.now()}`, value: "" }],
            isManual: true
        };
        onChange([manualTopic, ...value]);
        setSearchTerm('');
        setIsPickerOpen(false);
        triggerAnimation(newId);
    };

    const triggerAnimation = (id) => {
        setLastAddedId(id);
        setTimeout(() => setLastAddedId(null), 1000);
    };

    const updateSubtopic = (topicId, subId, newValue) => {
        onChange(value.map(t => t.id === topicId ? {
            ...t,
            subtopics: t.subtopics.map(s => s.id === subId ? { ...s, value: newValue } : s)
        } : t));
    };

    const deleteSubtopic = (topicId, subId) => {
        onChange(value.map(t => t.id === topicId ? {
            ...t, subtopics: t.subtopics.filter(s => s.id !== subId)
        } : t));
    };

    const duplicateSubtopic = (topicId, subId) => {
        onChange(value.map(t => {
            if (t.id === topicId) {
                const index = t.subtopics.findIndex(s => s.id === subId);
                const target = t.subtopics[index];
                const newNode = { ...target, id: `sub-${Date.now()}-${Math.random()}` };
                const newSubtopics = [...t.subtopics];
                newSubtopics.splice(index + 1, 0, newNode);
                return { ...t, subtopics: newSubtopics };
            }
            return t;
        }));
    };

    const addBlankSubtopic = (topicId) => {
        onChange(value.map(t => t.id === topicId ? {
            ...t, subtopics: [...t.subtopics, { id: `sub-${Date.now()}`, value: "" }]
        } : t));
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
                                        const isSelected = value.some(t => t.title === opt.title);
                                        return (
                                            <div
                                                key={opt.id}
                                                className={`${styles.optionItem} ${isSelected ? styles.selectedOpt : ''}`}
                                                onClick={() => handleSelectTopic(opt)}
                                            >
                                                <input type="checkbox" checked={isSelected} readOnly />
                                                <span>{opt.title}</span>
                                                <span className={styles.subCount}>{opt.subtopics.length} items</span>
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
                            {value.map((topic) => (
                                <div
                                    key={topic.id}
                                    className={`${styles.topicCard} ${lastAddedId === topic.id ? styles.newEntry : ''}`}
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
                                                        const updated = value.map(t => t.id === topic.id ? {...t, title: e.target.value} : t);
                                                        onChange(updated);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            className={styles.removeTopicBtn}
                                            onClick={() => onChange(value.filter(t => t.id !== topic.id))}
                                        >
                                            <X color={"white"} size={16} />
                                        </button>
                                    </div>

                                    <div className={styles.subtopicsContainer}>
                                        {topic.subtopics.map((sub) => (
                                            <div key={sub.id} className={styles.subtopicRow}>
                                                <div className={styles.bullet}>•</div>
                                                <input
                                                    type="text"
                                                    placeholder="Enter subtopic detail..."
                                                    value={sub.value}
                                                    onChange={(e) => updateSubtopic(topic.id, sub.id, e.target.value)}
                                                />
                                                <div className={styles.actions}>
                                                    <button onClick={() => duplicateSubtopic(topic.id, sub.id)} title="Duplicate">
                                                        <Copy size={14} />
                                                    </button>
                                                    <button className={styles.delete} onClick={() => deleteSubtopic(topic.id, sub.id)} title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button className={styles.addSubBtn} onClick={() => addBlankSubtopic(topic.id)}>
                                            <Plus size={14} /> Add Subtopic
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {error && <div className={styles.errorText}>{error}</div>}
        </div>
    );
};

export default TopicSelector;