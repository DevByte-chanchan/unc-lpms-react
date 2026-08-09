// src/pages/ReferenceForm.jsx
import React, { useEffect, useMemo, useState } from 'react';
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
import { fetchJson } from "../utils/api.js";
import CommentMessage from "../components/CommentMessage.jsx";
import { getSession } from "../utils/session.js";
import { getCourseCatalog, normalizeReference } from "../utils/referenceCatalog.js";

function InlineModal({ isOpen, title, onClose, children, actions }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3 id="modal-title">{title}</h3>
                    <button type="button" aria-label="Close" className={styles.closeIcon || ''} onClick={onClose} style={{ background: 'transparent', border: 'none', padding: 6 }}>
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
    const [assignedReferences, setAssignedReferences] = useState([]);
    const [selectedRefs, setSelectedRefs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const [course, setCourse] = useState({ code: courseCode || '', name: '' });
    const [iloTopics, setIloTopics] = useState([]);

    // Context-Targeted Comments Checklist Tracking States
    const [reviewComments, setReviewComments] = useState([]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newRefDraft, setNewRefDraft] = useState({
        title: '', type: 'Textbook', author: '', isbn: '', link: '', publication_year: '', external_approved: false
    });

    const [showConfirm, setShowConfirm] = useState(false);

    // Course + topic context for the picker's scoping and its suggestions.
    useEffect(() => {
        let mounted = true;
        if (offeringID && revisionNum) {
            fetchJson(`/api/course-details/${offeringID}/${revisionNum}`)
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
                const normalizedRefs = (Array.isArray(refs) ? refs : []).map(normalizeReference);

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

    const handleOpenAdd = () => {
        setNewRefDraft({ title: '', type: 'Textbook', author: '', isbn: '', link: '', publication_year: '', external_approved: false });
        setValidationError(null);
        setIsAddOpen(true);
    };

    const handleSaveNewRefLocal = () => {
        if (!newRefDraft.title || !newRefDraft.type) {
            setValidationError('Title and Type are required for the new reference.');
            return;
        }
        // "itong books ba na to available sa library? kung hindi, di pwede
        // mag-lagay references" [49:06] — a hand-typed title has to be declared
        // available before the picker will let it be attached.
        if (!newRefDraft.external_approved) {
            setValidationError('Confirm this reference is held by the library or is an approved external resource before adding it.');
            return;
        }

        const tempId = `temp-${Date.now()}`;
        const newOption = {
            reference_id: null,
            _temp_id: tempId,
            title: newRefDraft.title,
            type: newRefDraft.type,
            author: newRefDraft.author,
            isbn: newRefDraft.isbn,
            link: newRefDraft.link,
            publication_year: newRefDraft.publication_year || null,
            external_approved: true
        };

        setAllReferences(prev => [newOption, ...prev]);
        setSelectedRefs(prev => [newOption, ...prev]);
        setIsAddOpen(false);
        setValidationError(null);
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

            const toCreate = selectedRefs.filter(r => !r.reference_id);
            const createdMap = {};

            for (const r of toCreate) {
                const payload = {
                    title: r.title, type: r.type, author: r.author || null,
                    isbn: r.isbn || null, link: r.link || null, publication_year: r.publication_year || null
                };

                const created = await fetchJson(`/api/references`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (r._temp_id) createdMap[r._temp_id] = created;
                setAllReferences(prev => prev.map(x => (x._temp_id && x._temp_id === r._temp_id ? created : x)));
                setSelectedRefs(prev => prev.map(x => (x._temp_id && x._temp_id === r._temp_id ? created : x)));
            }

            const reference_ids = selectedRefs.map(r => {
                if (r.reference_id) return r.reference_id;
                if (r._temp_id && createdMap[r._temp_id]) return createdMap[r._temp_id].reference_id;
                return null;
            }).filter(Boolean);

            await fetchJson(`/api/ilo-references/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ilo_id: Number(iloId), reference_ids })
            });

            setShowConfirm(true);
        } catch (err) {
            console.error('Comprehensive save operation failure:', err);
            setValidationError(err.message || 'Failed to securely synchronize settings changes.');
        } finally {
            setSaving(false);
        }
    };

    const renderDynamicFields = () => {
        const type = newRefDraft.type;
        return (
            <>
                <TextField label="Title" value={newRefDraft.title} onChange={(v) => setNewRefDraft(prev => ({ ...prev, title: v }))} />
                {type === 'Textbook' && (
                    <>
                        <TextField label="Author(s)" value={newRefDraft.author} onChange={(v) => setNewRefDraft(prev => ({ ...prev, author: v }))} />
                        <TextField label="ISBN" value={newRefDraft.isbn} onChange={(v) => setNewRefDraft(prev => ({ ...prev, isbn: v }))} />
                        <TextField label="Publication Year" value={newRefDraft.publication_year} onChange={(v) => setNewRefDraft(prev => ({ ...prev, publication_year: v }))} />
                        <TextField label="Link (optional)" value={newRefDraft.link} onChange={(v) => setNewRefDraft(prev => ({ ...prev, link: v }))} />
                    </>
                )}
                {type === 'Open Educational Resources' && (
                    <>
                        <TextField label="Author / Source" value={newRefDraft.author} onChange={(v) => setNewRefDraft(prev => ({ ...prev, author: v }))} />
                        <TextField label="Link" value={newRefDraft.link} onChange={(v) => setNewRefDraft(prev => ({ ...prev, link: v }))} />
                    </>
                )}
                {type === 'Online Resources' && (
                    <>
                        <TextField label="Author / Publisher" value={newRefDraft.author} onChange={(v) => setNewRefDraft(prev => ({ ...prev, author: v }))} />
                        <TextField label="Link" value={newRefDraft.link} onChange={(v) => setNewRefDraft(prev => ({ ...prev, link: v }))} />
                    </>
                )}
            </>
        );
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
                                    onAddReference={handleOpenAdd}
                                    courseCode={course.code}
                                    courseTitle={course.name}
                                    topics={iloTopics}
                                    assignedIds={catalogIds}
                                />

                                <InlineModal
                                    isOpen={isAddOpen}
                                    title="Add Reference"
                                    onClose={() => setIsAddOpen(false)}
                                    actions={<button style={{ color: "white", fontWeight: 400 }} className="confirmBtn" onClick={handleSaveNewRefLocal}>Add</button>}
                                >
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <Dropdown
                                            label="Type"
                                            value={newRefDraft.type}
                                            options={['Textbook', 'Open Educational Resources', 'Online Resources']}
                                            onChange={(v) => setNewRefDraft(prev => ({ ...prev, type: v }))}
                                        />
                                        {renderDynamicFields()}
                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                                            <input
                                                type="checkbox"
                                                checked={!!newRefDraft.external_approved}
                                                onChange={(e) => setNewRefDraft(prev => ({ ...prev, external_approved: e.target.checked }))}
                                            />
                                            <span>This title is held by the UNC library, or is an approved external resource.</span>
                                        </label>
                                        {validationError && <div style={{ color: '#b00020' }}>{validationError}</div>}
                                    </div>
                                </InlineModal>

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