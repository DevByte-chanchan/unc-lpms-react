import React, { useEffect, useState } from "react";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams } from "react-router-dom";
import SideNavigation from "../components/SideNavigation.jsx";
import TopicSelector from "../components/TopicSelector.jsx";
import { X, CheckCircle, MessageSquare } from 'react-feather';

// Imported universal API client utility
import { fetchJson } from "../utils/api.js";

function InlineModal({ isOpen, title, onClose, children }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{title}</h3>
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', padding: 6 }}>
                        <X size={16} />
                    </button>
                </div>
                <div className={styles.modalBody}>{children}</div>
            </div>
        </div>
    );
}

const TopicForm = () => {
    const navigate = useNavigate();
    const { courseCode, iloId, status } = useParams();

    const [availableTopics, setAvailableTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

    // Checklist State for Topics Reviews
    const [reviewComments, setReviewComments] = useState([]);

    const goBackHandler = () => navigate(-1);

    // Fetch Content Options & Target Sub-Topic Reviews Checklists
    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setLoading(true);

        async function loadData() {
            try {
                const availableUrl = `/api/topics/available?iloId=${encodeURIComponent(iloId)}`;
                const assignedUrl = `/api/topics/assigned/${encodeURIComponent(iloId)}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/topics`;

                const fetchPromises = [fetchJson(availableUrl), fetchJson(assignedUrl)];
                if (status === 'returned') {
                    fetchPromises.push(fetchJson(commentsUrl));
                }

                const results = await Promise.all(fetchPromises);

                if (!mounted) return;

                setAvailableTopics(Array.isArray(results[0]) ? results[0] : []);
                setSelectedTopics(Array.isArray(results[1]) ? results[1] : []);

                if (status === 'returned' && results[2]) {
                    setReviewComments(results[2].map(c => ({
                        ...c,
                        resolved_status: c.resolved_status === 1 || c.resolved_status === true
                    })));
                }
            } catch (err) {
                console.error("Failed to load initial topics configurations:", err);
                if (mounted) setValidationError("Failed to securely load form profile collections.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadData();
        return () => { mounted = false; };
    }, [iloId, status]);

    // Handle local toggle clicks on the review checklists panel
    const handleToggleCommentResolution = (commentId) => {
        setReviewComments(prev => prev.map(c =>
            c.comment_id === commentId ? { ...c, resolved_status: !c.resolved_status } : c
        ));
    };

    // Save Execution Mapping Routine
    const handleSave = async () => {
        setValidationError(null);

        if (!selectedTopics || selectedTopics.length === 0) {
            setValidationError("Please select or create at least one topic before saving.");
            return;
        }

        setSaving(true);
        try {
            // Part A: Synchronize local checklist interaction flags with the database
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

            // Part B: Post standard Subject Topics mapping profile payload
            await fetchJson(`/api/topics/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ilo_id: Number(iloId),
                    topics: selectedTopics
                })
            });

            setShowConfirm(true);

            const assignedRes = await fetchJson(`/api/topics/assigned/${encodeURIComponent(iloId)}`);
            setSelectedTopics(Array.isArray(assignedRes) ? assignedRes : []);

        } catch (err) {
            console.error("Topics save processing exception profile:", err);
            setValidationError(err.message || "Failed to update learning topics metadata allocations.");
        } finally {
            setSaving(false);
        }
    };

    // Helper to extract clean topic target contexts dynamically
    const getCommentTargetLabel = (comment) => {
        if (comment.target_title) return comment.target_title;
        const match = availableTopics.find(t =>
            Number(t.topic_id) === Number(comment.target_id) || Number(t.id) === Number(comment.target_id)
        );
        return match ? (match.title || match.topic_name || match.name) : `Topic Element ID: ${comment.target_id}`;
    };

    return (
        <Skeleton
            header={<Header role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    <FormNavigation goBack={goBackHandler} onSave={handleSave} />

                    <div className={styles.mainCont}>
                        <div className={styles.leftCont}>
                            <div className={styles['form-container']}>
                                <h2>Topics Assignment</h2>

                                <TopicSelector
                                    label="Map Learning Topics"
                                    options={availableTopics}
                                    value={selectedTopics}
                                    onChange={setSelectedTopics}
                                    disabled={loading || saving}
                                    error={validationError}
                                />

                                <InlineModal
                                    isOpen={showConfirm}
                                    title="Saved Successfully"
                                    onClose={() => setShowConfirm(false)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <CheckCircle size={20} color="#2e7d32" />
                                        <div>Topic assignments successfully synchronized.</div>
                                    </div>
                                </InlineModal>
                            </div>
                        </div>

                        {/* Interactive Dynamic Topics Review Corrections Card Container */}
                        {status === 'returned' && (
                            <div className={styles.rightCont}>
                                <div className={styles.checklistCard}>
                                    <div className={styles.checklistHeader}>
                                        <MessageSquare size={18} className={styles.headerIcon} />
                                        <h3>Review Corrections</h3>
                                    </div>

                                    {reviewComments.length === 0 ? (
                                        <div className={styles.emptyChecklist}>
                                            <p>No unresolved thematic topic corrections found for this item.</p>
                                        </div>
                                    ) : (
                                        <div className={styles.checklistWrapper}>
                                            {reviewComments.map((comment) => (
                                                <label
                                                    key={comment.comment_id}
                                                    className={`${styles.checklistItem} ${comment.resolved_status ? styles.itemResolved : ''}`}
                                                >
                                                    <div className={styles.checkboxControl}>
                                                        <input
                                                            type="checkbox"
                                                            checked={comment.resolved_status}
                                                            onChange={() => handleToggleCommentResolution(comment.comment_id)}
                                                        />
                                                        <span className={styles.customCheckmark}></span>
                                                    </div>

                                                    <div className={styles.commentContent}>
                                                        {/* Contextual Target Info Block */}
                                                        <div className={styles.targetContextBadge}>
                                                            <span className={styles.targetPrefix}>Target:</span>
                                                            <span className={styles.targetText}>{getCommentTargetLabel(comment)}</span>
                                                        </div>

                                                        <p className={styles.commentMessage}>{comment.message}</p>

                                                        <div className={styles.commentMetadata}>
                                                            <span className={styles.metaRole}>{comment.commenter_role}</span>
                                                            <span className={styles.metaDivider}>•</span>
                                                            <span className={styles.metaDate}>
                                                                {new Date(comment.createdAt).toLocaleDateString(undefined, {
                                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            }
        />
    );
};

export default TopicForm;