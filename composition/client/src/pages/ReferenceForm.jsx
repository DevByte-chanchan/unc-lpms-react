import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import ReferencePicker from '../components/ReferencePicker.jsx';
import TextField from '../components/TextField.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { X } from 'react-feather';
import { fetchJson, apiErrorMessage } from "../utils/api.js";
import { offeringKey } from '../utils/offeringKey.js';
import { normalizeReference } from "../utils/referenceCatalog.js";
import { loadReferenceTypes } from "../utils/referenceStore.js";
import { getReferenceTypes } from "../utils/referenceTypes.js";
import styles from '../styles/Form.module.sass';

export function InlineModal({ isOpen, title, onClose, children, actions }) {
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
                {actions && <div className={styles.modalActions}>{actions}</div>}
            </div>
        </div>
    );
}

const ReferenceForm = forwardRef(({ iloId, isOrientation = false, status, setUnresolvedCount }, ref) => {
    const [allReferences, setAllReferences] = useState([]);
    const [selectedRefs, setSelectedRefs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState(null);

    // Context-Targeted Comments Checklist Tracking States
    const [reviewComments, setReviewComments] = useState([]);

    // The picker scopes its list to this course and suggests by this week's topics, so it needs both.
    const [course, setCourse] = useState({ code: '', name: '' });
    const [weekTopics, setWeekTopics] = useState([]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newRefDraft, setNewRefDraft] = useState({
        title: '', type: 'Textbook', author: '', isbn: '', link: '', publication_year: ''
    });

    // Course and topic context of this week (the week id comes in as iloId).
    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        fetchJson(`/api/topics/week-context/${encodeURIComponent(iloId)}`)
            .then(ctx => ctx?.pc_offering_id
                ? fetchJson(`/api/course-details/${offeringKey(ctx.pc_offering_id)}`)
                : null)
            .then(d => { if (mounted && d) setCourse({ code: d.code || '', name: d.name || '' }); })
            .catch(err => console.warn('Could not resolve the course for this week:', err?.message));
        fetchJson(`/api/topics/assigned/${encodeURIComponent(iloId)}`)
            .then(t => { if (mounted) setWeekTopics(Array.isArray(t) ? t.map(x => x.title).filter(Boolean) : []); })
            .catch(err => console.warn('Could not resolve the topics for this week:', err?.message));
        return () => { mounted = false; };
    }, [iloId]);

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setLoading(true);

        async function load() {
            try {
                const orientParam = isOrientation ? 'true' : 'false';
                // /library is the same rows plus `used_in_courses`, which is what
                // scopes the picker to this course rather than the whole shelf.
                const refsUrl = `/api/references/library`;
                await loadReferenceTypes();
                const assignedUrl = `/api/ilo-references/${encodeURIComponent(iloId)}?isOrientation=${orientParam}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/references`;

                const pRefs = fetchJson(refsUrl).catch(() => []);
                const pAssigned = fetchJson(assignedUrl).catch(() => []);
                const pComments = status === 'returned' ? fetchJson(commentsUrl).catch(() => []) : Promise.resolve([]);

                const [refs, assigned, targetedComments] = await Promise.all([pRefs, pAssigned, pComments]);

                if (!mounted) return;

                const initialComments = (Array.isArray(targetedComments) ? targetedComments : []).map(c => ({
                    ...c,
                    resolved_status: c.resolved_status === 1 || c.resolved_status === true
                }));
                setReviewComments(initialComments);

                // An archived reference stays visible on a plan that already uses it, but cannot be
                // picked for a new link (the server refuses it too). normalizeReference spreads the
                // raw row first so the parsed fields win.
                const alreadyAssigned = new Set((Array.isArray(assigned) ? assigned : [])
                    .map(a => Number(a.reference?.reference_id ?? a.reference_id)));
                const normalizedRefs = (Array.isArray(refs) ? refs : [])
                    .filter(r => !r.archived || alreadyAssigned.has(Number(r.reference_id)))
                    .map(normalizeReference);

                setAllReferences(normalizedRefs);

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
                if (mounted) setValidationError(apiErrorMessage(err, 'Failed to initialize view data.'));
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => { mounted = false; };
    }, [iloId, isOrientation, status]);

    // Update unresolved count for Master layout
    useEffect(() => {
        if (setUnresolvedCount) {
            setUnresolvedCount(reviewComments.filter(c => !c.resolved_status).length);
        }
    }, [reviewComments, setUnresolvedCount]);

    const handleOpenAdd = () => {
        setNewRefDraft({ title: '', type: 'Textbook', author: '', isbn: '', link: '', publication_year: '' });
        setValidationError(null);
        setIsAddOpen(true);
    };

    const handleSaveNewRefLocal = () => {
        if (!newRefDraft.title || !newRefDraft.type) {
            setValidationError('Title and Type are required for the new reference.');
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
            publication_year: newRefDraft.publication_year || null
        };

        setAllReferences(prev => [newOption, ...prev]);
        setSelectedRefs(prev => [newOption, ...prev]);
        setIsAddOpen(false);
        setValidationError(null);
    };

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!selectedRefs || selectedRefs.length === 0) {
                return "Please select at least one reference assignment.";
            }
            return null;
        },
        getComments: () => reviewComments,
        // The planner page saves the check at once (TopicForm); here it only flips locally.
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
                body: JSON.stringify({
                    week_id: Number(iloId),
                    ilo_id: Number(iloId),
                    is_orientation: Boolean(isOrientation),
                    reference_ids
                })
            });
        },
        getCommentTargetLabel: (comment) => {
            if (comment.target_title) return comment.target_title;
            const match = allReferences.find(r => Number(r.reference_id) === Number(comment.target_id));
            return match ? match.title : `Reference Element ID: ${comment.target_id}`;
        }
    }));

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
                {type === 'OER' && (
                    <>
                        <TextField label="Author / Source" value={newRefDraft.author} onChange={(v) => setNewRefDraft(prev => ({ ...prev, author: v }))} />
                        <TextField label="Link" value={newRefDraft.link} onChange={(v) => setNewRefDraft(prev => ({ ...prev, link: v }))} />
                    </>
                )}
                {(type === 'Online Resource' || type === 'Online Subscription') && (
                    <>
                        <TextField label="Author / Publisher" value={newRefDraft.author} onChange={(v) => setNewRefDraft(prev => ({ ...prev, author: v }))} />
                        <TextField label="Link" value={newRefDraft.link} onChange={(v) => setNewRefDraft(prev => ({ ...prev, link: v }))} />
                    </>
                )}
            </>
        );
    };

    if (loading) return <div className={styles.emptyChecklist} style={{padding: '20px'}}>Loading Target Environment...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0 }}>
            <ReferencePicker
                options={allReferences}
                value={selectedRefs}
                onChange={(val) => setSelectedRefs(val)}
                error={validationError}
                disabled={loading}
                onAddReference={handleOpenAdd}
                courseCode={course.code}
                courseTitle={course.name}
                topics={weekTopics}
            />

            <InlineModal
                isOpen={isAddOpen}
                title="Add Reference"
                onClose={() => setIsAddOpen(false)}
                actions={
                    <>
                        <button type="button" className={styles.cancelBtn} onClick={() => setIsAddOpen(false)}>Cancel</button>
                        <button type="button" className={styles.confirmBtn} onClick={handleSaveNewRefLocal}>Add</button>
                    </>
                }
            >
                <div className={styles.refModalBodyContent}>
                    <Dropdown
                        label="Type"
                        value={newRefDraft.type}
                        options={getReferenceTypes().map(t => t.key)}
                        onChange={(v) => setNewRefDraft(prev => ({ ...prev, type: v }))}
                    />
                    {renderDynamicFields()}
                    {validationError && <div className={styles.modalError}>{validationError}</div>}
                </div>
            </InlineModal>
        </div>
    );
});

export default ReferenceForm;
