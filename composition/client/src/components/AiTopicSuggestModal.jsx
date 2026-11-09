import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Check, RefreshCw, AlertCircle, ExternalLink, Plus } from 'react-feather';
import styles from '../styles/AiTopicSuggestModal.module.sass';
import { fetchJson } from '../utils/api.js';

// Gemini Sparkle / 4-pointed Star SVG
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

const AiTopicSuggestModal = ({
    isOpen,
    onClose,
    onApplyTopics,
    iloId,
    courseCode,
    currentTopics = []
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [topics, setTopics] = useState([]);
    const [academicContext, setAcademicContext] = useState(null);
    const [apiKeyMissing, setApiKeyMissing] = useState(false);
    const [loadingStage, setLoadingStage] = useState('Analyzing syllabus context...');
    const modalBodyRef = useRef(null);

    // Dynamic animated loading texts for Google Material Design feel
    useEffect(() => {
        if (!isLoading) return;
        const stages = [
            'Connecting to Google AI Studio...',
            'Analyzing Course Outcome & Syllabus ILO...',
            'Synthesizing academic topics with 5 subtopics...',
            'Finalizing pedagogical alignment...'
        ];
        let idx = 0;
        const interval = setInterval(() => {
            idx = (idx + 1) % stages.length;
            setLoadingStage(stages[idx]);
        }, 700);
        return () => clearInterval(interval);
    }, [isLoading]);

    const fetchSuggestions = useCallback(async (isLoadMore = false, forceSample = false) => {
        if (isLoadMore) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            const alreadySuggested = topics.map(t => t.title);
            const currentTitles = currentTopics.map(t => (typeof t === 'string' ? t : t.title)).filter(Boolean);

            const res = await fetchJson('/api/topics/ai-suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        iloId,
                        courseCode,
                        currentTopics: currentTitles,
                        alreadySuggested,
                        count: 6,
                        useSample: forceSample
                    })
                });

            if (res.error === 'MISSING_API_KEY') {
                setApiKeyMissing(true);
            } else {
                setApiKeyMissing(false);
            }

            if (res.context) {
                setAcademicContext(res.context);
            }

            // Map incoming topics with checked = true by default and ensure exactly 5 subtopics
            const newTopics = (res.topics || []).map((t, idx) => {
                let subs = (t.subtopics || []).map((s, sIdx) => ({
                    id: s.id || `sub-${Date.now()}-${idx}-${sIdx}`,
                    title: typeof s === 'string' ? s : s.title,
                    checked: true
                }));

                if (subs.length > 5) {
                    subs = subs.slice(0, 5);
                }
                while (subs.length < 5) {
                    subs.push({
                        id: `sub-${Date.now()}-${idx}-${subs.length}`,
                        title: `Practical Application & Review ${subs.length + 1}`,
                        checked: true
                    });
                }

                return {
                    id: t.id || `topic-${Date.now()}-${idx}`,
                    title: t.title,
                    checked: true,
                    subtopics: subs
                };
            });

            if (isLoadMore) {
                setTopics(prev => [...prev, ...newTopics]);
                setTimeout(() => {
                    if (modalBodyRef.current) {
                        modalBodyRef.current.scrollTo({
                            top: modalBodyRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }, 100);
            } else {
                setTopics(newTopics);
            }
        } catch (err) {
            console.error('Failed to fetch AI topics:', err);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [iloId, courseCode, topics, currentTopics]);

    // Clear topics if iloId changes so we fetch fresh ones for the new ILO
    useEffect(() => {
        setTopics([]);
        setAcademicContext(null);
    }, [iloId]);

    // Fetch initial batch when modal opens for the first time
    useEffect(() => {
        if (isOpen && topics.length === 0) {
            fetchSuggestions(false, false);
        }
    }, [isOpen, topics.length, fetchSuggestions]);

    if (!isOpen) return null;

    // Checkbox interaction handlers
    const handleToggleTopic = (topicId) => {
        setTopics(prev => prev.map(t => {
            if (t.id !== topicId) return t;
            const newCheckedState = !t.checked;
            return {
                ...t,
                checked: newCheckedState,
                // Cascade check state to all subtopics automatically
                subtopics: t.subtopics.map(s => ({ ...s, checked: newCheckedState }))
            };
        }));
    };

    const handleToggleSubtopic = (topicId, subtopicId) => {
        setTopics(prev => prev.map(t => {
            if (t.id !== topicId) return t;
            const updatedSubtopics = t.subtopics.map(s =>
                s.id === subtopicId ? { ...s, checked: !s.checked } : s
            );
            // If at least one subtopic is checked, the topic is checked
            const hasCheckedSubtopic = updatedSubtopics.some(s => s.checked);
            return {
                ...t,
                checked: hasCheckedSubtopic,
                subtopics: updatedSubtopics
            };
        }));
    };

    const handleToggleAll = (selectAll) => {
        setTopics(prev => prev.map(t => ({
            ...t,
            checked: selectAll,
            subtopics: t.subtopics.map(s => ({ ...s, checked: selectAll }))
        })));
    };

    // Calculate selection totals
    const selectedTopicsList = topics.filter(t => t.checked);
    const selectedTopicsCount = selectedTopicsList.length;
    const selectedSubtopicsCount = topics.reduce((sum, t) => sum + t.subtopics.filter(s => s.checked).length, 0);

    const handleApply = () => {
        if (selectedTopicsCount === 0) return;

        // Transform into format accepted by TopicSelector
        const formattedForForm = selectedTopicsList.map((t, idx) => {
            const activeSubs = t.subtopics.filter(s => s.checked);
            return {
                topic_id: null,
                _temp_id: `temp-topic-ai-${Date.now()}-${idx}`,
                title: t.title,
                subtopics: activeSubs.map((s, sIdx) => ({
                    subtopic_id: null,
                    _temp_id: `temp-sub-ai-${Date.now()}-${idx}-${sIdx}`,
                    title: s.title,
                    sequence_order: sIdx
                })),
                isManual: true
            };
        });

        onApplyTopics(formattedForForm);
        onClose();
    };

    const courseContextLabel = academicContext
        ? `${academicContext.courseNo ? academicContext.courseNo + ' • ' : ''}${academicContext.iloDescription ? academicContext.iloDescription.slice(0, 85) + '...' : ''}`
        : (courseCode ? `Course: ${courseCode}` : 'Learning Outcomes Analysis');

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
                                <span className={styles.sparkleText}>AI Topic Suggestions</span>
                            </h3>
                            <p className={styles.modalSubtitle} title={academicContext?.iloDescription || ''}>
                                {courseContextLabel}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className={styles.modalBody} ref={modalBodyRef}>
                    {/* Setup Notification Card if API Key is not configured */}
                    {apiKeyMissing && (
                        <div className={styles.setupCard}>
                            <div className={styles.setupHeader}>
                                <AlertCircle size={20} color="#8B5CF6" />
                                <h4 className={styles.setupTitle}>Connect Your Free Google Gemini API Key</h4>
                            </div>
                            <ol className={styles.setupStepsList}>
                                <li>Visit <strong>Google AI Studio</strong> and generate a free API key (zero cost, no credit card required).</li>
                                <li>In your project root, open or create <code>composition/server/.env</code>.</li>
                                <li>Add the line: <code>GEMINI_API_KEY=your_key_here</code>.</li>
                                <li>Restart the Express server to enable unlimited real-time Gemini generation.</li>
                            </ol>
                            <div className={styles.setupActions}>
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.getApiKeyLink}
                                >
                                    <span>Get Free Key at Google AI Studio</span>
                                    <ExternalLink size={14} />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => fetchSuggestions(false, true)}
                                    className={styles.trySampleBtn}
                                >
                                    <span>✨ Try with Sample Academic Suggestions</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Material Design 3 Expressive Curved Loading Animation */}
                    {isLoading ? (
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
                                    {/* Curved smooth continuous track */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="none"
                                        stroke="#F1F5F9"
                                        strokeWidth="8"
                                    />
                                    {/* Expressive animated curved arc with rounded line caps */}
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
                            <div className={styles.loadingTitle}>Generating Intelligent Course Topics</div>
                            <p className={styles.loadingDescription}>
                                Evaluating Course Outcomes, Bloom&apos;s taxonomy alignment, and learning competencies...
                            </p>
                            <div className={styles.loadingSteps}>
                                <GeminiStar size={13} />
                                <span>{loadingStage}</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Suggestions Grid (3 rows, 2 per row) */}
                            <div className={styles.topicsGrid}>
                                {topics.map((t, idx) => {
                                    const isCardChecked = t.checked;
                                    return (
                                        <div
                                            key={t.id}
                                            className={`${styles.topicCard} ${isCardChecked ? styles.cardSelected : ''}`}
                                        >
                                            {/* Topic Header with Checkbox on Right */}
                                            <div
                                                className={`${styles.topicCardHeader} ${isCardChecked ? styles.topicCardHeaderSelected : ''}`}
                                                onClick={() => handleToggleTopic(t.id)}
                                            >
                                                <div className={styles.topicTitleLeft}>
                                                    <span className={`${styles.topicNumberBadge} ${isCardChecked ? styles.badgeSelected : ''}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <h4 className={styles.topicCardTitle} title={t.title}>
                                                        {t.title}
                                                    </h4>
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

                                            {/* Topic Body containing Subtopics with Individual Checkboxes */}
                                            <div className={styles.topicCardBody}>
                                                {(t.subtopics || []).map((s) => {
                                                    const isSubChecked = s.checked;
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            className={`${styles.subtopicRow} ${isSubChecked ? styles.subtopicRowSelected : ''}`}
                                                            onClick={() => handleToggleSubtopic(t.id, s.id)}
                                                        >
                                                            <div className={styles.subtopicTitleLeft}>
                                                                <span className={`${styles.subtopicDot} ${isSubChecked ? styles.subtopicDotSelected : ''}`} />
                                                                <span className={`${styles.subtopicText} ${isSubChecked ? styles.subtopicTextSelected : ''}`}>
                                                                    {s.title}
                                                                </span>
                                                            </div>
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
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Load More Button */}
                            {topics.length > 0 && (
                                <div className={styles.loadMoreWrapper}>
                                    <button
                                        type="button"
                                        className={styles.loadMoreBtn}
                                        onClick={() => fetchSuggestions(true, apiKeyMissing)}
                                        disabled={isLoadingMore}
                                    >
                                        {isLoadingMore ? (
                                            <>
                                                <RefreshCw size={15} className={styles.loadMoreSpin} />
                                                <span>Consulting Gemini for More Topics...</span>
                                            </>
                                        ) : (
                                            <>
                                                <GeminiStar size={15} />
                                                <span>Suggest More Topics</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.modalFooter}>
                    <div className={styles.footerLeft}>
                        <div className={styles.selectionBadge}>
                            <span>{selectedTopicsCount}</span> of {topics.length} Topics (<span>{selectedSubtopicsCount}</span> Subtopics) Selected
                        </div>
                        {topics.length > 0 && (
                            <button
                                type="button"
                                className={styles.toggleAllBtn}
                                onClick={() => handleToggleAll(selectedTopicsCount !== topics.length)}
                            >
                                {selectedTopicsCount === topics.length ? 'Deselect All' : 'Select All'}
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
                            onClick={handleApply}
                            disabled={selectedTopicsCount === 0 || isLoading}
                        >
                            <Plus size={16} />
                            <span>Add Selected Topics ({selectedTopicsCount})</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiTopicSuggestModal;
