// src/pages/ReferenceForm.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { offeringKey } from '../utils/offeringKey.js'
import Skeleton from '../layouts/Skeleton.jsx';
import Header from '../components/Header.jsx';
import FormNavigation from '../components/FormNavigation.jsx';
import styles from '../styles/Form.module.sass';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation.jsx';
import ReferencePicker from '../components/ReferencePicker.jsx';
import TextField from '../components/TextField.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { X, CheckCircle, MessageSquare } from 'react-feather';

// Imported universal API client utility
import { fetchJson, apiErrorMessage } from "../utils/api.js";
import CommentMessage from "../components/CommentMessage.jsx";
import { getSession } from "../utils/session.js";
import { getCourseCatalog, normalizeReference } from "../utils/referenceCatalog.js";
import { loadReferenceTypes } from "../utils/referenceStore.js";

function InlineModal({ isOpen, title, onClose, children, actions }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3 id="modal-title">{title}</h3>
                    <button type="button" aria-label="Close" className={`${styles.closeIcon || ''} app-icon-close`} onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                <div className={styles.modalActions}>{actions}</div>
            </div>
        </div>
    );
}

const ReferenceForm = () => {
    const navigate = useNavigate();
    const { courseCode, iloId, status } = useParams();
    const [searchParams] = useSearchParams();
    const goBackHandler = () => navigate(-1);
    const session = getSession();

    // The picker has to know which course it is picking for, otherwise it can
    // only offer the whole library — the "Understanding the Self on a
    // programming course" complaint [13:25] [16:13]. ILOs.jsx puts the offering
    // on the link; query params rather than router state so a reload keeps it.
    const offeringID = searchParams.get('pcId') || '';
    const revisionNum = searchParams.get('rev') || '';

    const [allReferences, setAllReferences] = useState([]);
    const [, setAssignedReferences] = useState([]);
    const [selectedRefs, setSelectedRefs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const [course, setCourse] = useState({ code: courseCode || '', name: '' });
    const [iloTopics, setIloTopics] = useState([]);

    // Context-Targeted Comments Checklist Tracking States
    const [reviewComments, setReviewComments] = useState([]);

    const [showConfirm, setShowConfirm] = useState(false);

    // Course + topic context for the picker's scoping and its suggestions.
    useEffect(() => {
        let mounted = true;
        if (offeringID) {
            fetchJson(`/api/course-details/${offeringKey(offeringID, revisionNum)}`)
                .then(d => { if (mounted && d) setCourse({ code: d.code || '', name: d.name || '' }); })
                .catch(err => console.warn('Could not resolve the course for this ILO:', err?.message));
        }
        if (iloId) {
            fetchJson(`/api/topics/assigned/${encodeURIComponent(iloId)}`)
                .then(t => { if (mounted) setIloTopics(Array.isArray(t) ? t.map(x => x.title) : []); })
                .catch(err => console.warn('Could not resolve the topics for this ILO:', err?.message));
        }
        return () => { mounted = false; };
    }, [offeringID, revisionNum, iloId]);

    // References the Director of Libraries assigned to this course this term.
    const catalogIds = useMemo(
        () => (course.code ? getCourseCatalog(course.code).referenceIds : []),
        [course.code]
    );

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setLoading(true);

        async function load() {
            try {
                // /library is the same rows plus `used_in_courses`, which is what
                // scopes the picker to this course rather than the whole shelf.
                const refsUrl = `/api/references/library`;
                const assignedUrl = `/api/ilo-references/${encodeURIComponent(iloId)}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/references`;

                // Leveraging the centralized utility setup to auto-parse promises
                await loadReferenceTypes();
                const fetchPromises = [fetchJson(refsUrl), fetchJson(assignedUrl)];
                if (status === 'returned') {
                    fetchPromises.push(fetchJson(commentsUrl));
                }

                const results = await Promise.all(fetchPromises);

                const refs = results[0];
                const assigned = results[1];
                let targetedComments = [];

                if (status === 'returned' && results[2]) {
                    targetedComments = results[2];
                }

                if (!mounted) return;

                setReviewComments(targetedComments.map(c => ({
                    ...c,
                    resolved_status: c.resolved_status === 1 || c.resolved_status === true
                })));

                // normalizeReference spreads the raw row FIRST so the parsed
                // fields win; the old shape spread `...r` last, which put the
                // raw "2024-01-01 00:00:00.000 +00:00" straight back on top.
                // An archived reference stays visible on a plan that already uses it, but cannot be
                // picked for a new link (the server refuses it too).
                const alreadyAssigned = new Set((Array.isArray(assigned) ? assigned : []).map(a => Number(a.reference_id)));
                const normalizedRefs = (Array.isArray(refs) ? refs : [])
                    .filter(r => !r.archived || alreadyAssigned.has(Number(r.reference_id)))
                    .map(normalizeReference);

                setAllReferences(normalizedRefs);
                setAssignedReferences(Array.isArray(assigned) ? assigned : []);

                const assignedRefObjects = (Array.isArray(assigned) ? assigned : [])
                    .map(a => a.reference)
                    .filter(Boolean)
                    .map(ar => {
                        if (ar.reference_id != null) {
                            const match = normalizedRefs.find(r => r.reference_id != null && Number(r.reference_id) === Number(ar.reference_id));
                            if (match) return match;
                        }
                        return ar;
                    });

                setSelectedRefs(assignedRefObjects);
            } catch (err) {
                console.error('Load initial targets failure: ', err);
                if (mounted) setValidationError(err.message || 'Failed to initialize view data.');
            } finally {
                // FIXED: Resolved syntax slip block from 'file' back to 'finally'
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => { mounted = false; };
    }, [iloId, status]);

    // Persists immediately so approvers see the check without waiting for Save
    const handleToggleCommentResolution = (commentId) => {
        const current = reviewComments.find(c => c.comment_id === commentId);
        const nextStatus = !(current?.resolved_status);
        setReviewComments(prev => prev.map(c =>
            c.comment_id === commentId ? { ...c, resolved_status: nextStatus } : c
        ));
        fetchJson(`/api/comments/update-resolution`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: [{ comment_id: commentId, resolved_status: nextStatus ? 1 : 0 }] })
        }).catch(err => console.warn('Failed to persist comment resolution:', err?.message));
    };

    const handleSave = async () => {
        setValidationError(null);
        if (!selectedRefs || selectedRefs.length === 0) {
            setValidationError('Please select at least one reference before saving.');
            return;
        }

        setSaving(true);
        try {
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

            const reference_ids = selectedRefs.map(r => r.reference_id).filter(Boolean);

            await fetchJson(`/api/ilo-references/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ilo_id: Number(iloId), reference_ids })
            });

            setShowConfirm(true);
        } catch (err) {
            console.error('Comprehensive save operation failure:', err);
            setValidationError(apiErrorMessage(err, 'Failed to securely synchronize settings changes.'));
        } finally {
            setSaving(false);
        }
    };

    const getCommentTargetLabel = (comment) => {
        if (comment.target_title) return comment.target_title;
        const match = allReferences.find(r => Number(r.reference_id) === Number(comment.target_id));
        return match ? match.title : `Reference Element ID: ${comment.target_id}`;
    };

    return (
        <Skeleton
            header={<Header role={session?.roleLabel || 'Instructor'} name={session?.name || ''} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    <FormNavigation goBack={goBackHandler} onSave={handleSave} />

                    <div className={styles.mainCont}>
                        <div className={styles.leftCont}>
                            <div className={styles['form-container']}>
                                <h2>References Assignment</h2>

                                <ReferencePicker
                                    options={allReferences}
                                    value={selectedRefs}
                                    onChange={(val) => setSelectedRefs(val)}
                                    error={validationError}
                                    disabled={loading || saving}
                                    courseCode={course.code}
                                    courseTitle={course.name}
                                    topics={iloTopics}
                                    assignedIds={catalogIds}
                                />

                                <InlineModal isOpen={showConfirm} title="Saved" onClose={() => setShowConfirm(false)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <CheckCircle size={20} color="#2e7d32" />
                                        <div>Syllabus adjustments synchronized successfully.</div>
                                    </div>
                                </InlineModal>
                            </div>
                        </div>

                        {status === 'returned' && (
                            <div className={styles.rightCont}>
                                <div className={styles.checklistCard}>
                                    <div className={styles.checklistHeader}>
                                        <MessageSquare size={18} className={styles.headerIcon} />
                                        <h3>Review Corrections</h3>
                                    </div>

                                    {reviewComments.length === 0 ? (
                                        <div className={styles.emptyChecklist}>
                                            <p>No unresolved reference concerns found for this entry.</p>
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
                                                        <div className={styles.targetContextBadge}>
                                                            {/*<span className={styles.targetPrefix}>Target:</span>*/}
                                                            <span className={styles.targetText}>{getCommentTargetLabel(comment)}</span>
                                                        </div>

                                                        <CommentMessage className={styles.commentMessage} message={comment.message} />

                                                        <div className={styles.commentMetadata}>
                                                            <span className={styles.metaRole}>{comment.commenter_role.replace(/_/g, ' ')}</span>
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

export default ReferenceForm;
