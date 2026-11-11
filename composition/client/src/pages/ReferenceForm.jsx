import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import ReferencePicker from '../components/ReferencePicker.jsx';
import TextField from '../components/TextField.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { checkSpelling } from '../utils/spellChecker.js';
import { X, AlertCircle } from 'react-feather';
import { fetchJson } from "../utils/api.js";
import styles from '../styles/Form.module.sass';

export function InlineModal({ isOpen, title, onClose, children, actions }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3 id="modal-title">{title}</h3>
                    <button type="button" aria-label="Close" className={styles.closeIcon || ''} onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                {actions && <div className={styles.modalActions}>{actions}</div>}
            </div>
        </div>
    );
}

const ReferenceForm = forwardRef(({
    iloId,
    isOrientation = false,
    status,
    setUnresolvedCount,
    onCommentsChange,
    courseCode,
    pcOfferingId
}, ref) => {
    const [allReferences, setAllReferences] = useState([]);
    const [selectedRefs, setSelectedRefs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState(null);

    // Context-Targeted Comments Checklist Tracking States
    const [reviewComments, setReviewComments] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingRef, setEditingRef] = useState(null);
    const [newRefDraft, setNewRefDraft] = useState({
        reference_id: null,
        _temp_id: null,
        title: '',
        type: 'Textbook',
        author: '',
        isbn: '',
        link: '',
        publication_year: ''
    });
    const [refSpellWarnings, setRefSpellWarnings] = useState([]);
    const [showRefSpellModal, setShowRefSpellModal] = useState(false);

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setLoading(true);

        async function load() {
            try {
                const orientParam = isOrientation ? 'true' : 'false';
                const queryParams = new URLSearchParams();
                if (iloId) queryParams.set('weekId', iloId);
                if (courseCode) queryParams.set('courseCode', courseCode);
                if (pcOfferingId) queryParams.set('pcOfferingId', pcOfferingId);

                const refsUrl = `/api/references?${queryParams.toString()}`;
                const assignedUrl = `/api/ilo-references/${encodeURIComponent(iloId)}?isOrientation=${orientParam}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/references`;

                const pRefs = fetchJson(refsUrl).catch(() => []);
                const pAssigned = fetchJson(assignedUrl).catch(() => []);
                const pComments = status === 'returned' ? fetchJson(commentsUrl).catch(() => []) : Promise.resolve([]);

                const [refs, assigned, targetedComments] = await Promise.all([pRefs, pAssigned, pComments]);

                if (!mounted) return;

                const initialComments = (Array.isArray(targetedComments) ? targetedComments : []).map(c => ({
                    ...c,
                    resolved_status: c.resolved_status === 1 || c.resolved_status === true,
                    return_number: Number(c.return_number) || 1,
                    return_date: c.return_date || c.createdAt
                }));
                setReviewComments(initialComments);

                const normalizedRefs = (Array.isArray(refs) ? refs : []).map(r => ({
                    reference_id: r.reference_id != null ? Number(r.reference_id) : null,
                    title: r.title || '',
                    type: r.type || '',
                    author: r.author || r.authors || '',
                    isbn: r.isbn || '',
                    link: r.link || '',
                    publication_year: r.publication_year ? (typeof r.publication_year === 'string' ? r.publication_year.split('T')[0] : r.publication_year) : null,
                    ...r
                }));

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
                if (mounted) setValidationError(err.message || 'Failed to initialize view data.');
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => { mounted = false; };
    }, [iloId, isOrientation, status, courseCode, pcOfferingId]);

    // Update unresolved count and sync comment list for Master layout
    useEffect(() => {
        if (setUnresolvedCount) {
            setUnresolvedCount(reviewComments.filter(c => !c.resolved_status).length);
        }
        if (onCommentsChange) {
            onCommentsChange(reviewComments);
        }
    }, [reviewComments, setUnresolvedCount, onCommentsChange]);

    const handleOpenAdd = (defaultTab = 'Textbook') => {
        let initialType = 'Textbook';
        const t = String(defaultTab).toLowerCase();
        if (t.includes('open') || t.includes('oer')) {
            initialType = 'Open Educational Resources';
        } else if (t.includes('online')) {
            initialType = 'Online Resources';
        }

        setIsEditing(false);
        setEditingRef(null);
        setNewRefDraft({
            reference_id: null,
            _temp_id: null,
            title: '',
            type: initialType,
            author: '',
            isbn: '',
            link: '',
            publication_year: ''
        });
        setValidationError(null);
        setRefSpellWarnings([]);
        setShowRefSpellModal(false);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (reference) => {
        if (!reference) return;
        setIsEditing(true);
        setEditingRef(reference);

        let cleanYear = '';
        if (reference.publication_year) {
            const d = new Date(reference.publication_year);
            cleanYear = !isNaN(d.getFullYear()) ? String(d.getFullYear()) : String(reference.publication_year).slice(0, 4);
        } else if (reference.year) {
            cleanYear = String(reference.year);
        }

        setNewRefDraft({
            reference_id: reference.reference_id || null,
            _temp_id: reference._temp_id || null,
            title: reference.title || '',
            type: reference.type || 'Open Educational Resources',
            author: reference.author || reference.authors || '',
            isbn: reference.isbn || '',
            link: reference.link || '',
            publication_year: cleanYear
        });
        setValidationError(null);
        setRefSpellWarnings([]);
        setShowRefSpellModal(false);
        setIsModalOpen(true);
    };

    // Spell check ability strictly applies to Reference Title
    const getDraftSpellWarnings = (draft, labelPrefix = 'Reference') => {
        const warnings = [];
        const titleWords = checkSpelling(draft.title || '');
        if (titleWords.length > 0) {
            warnings.push({
                section: 'References',
                field: `${labelPrefix} — Title`,
                words: titleWords
            });
        }
        return warnings;
    };

    const validateDraft = (draft) => {
        if (!draft.title || !draft.title.trim()) {
            return 'Title is required.';
        }
        if (!draft.author || !draft.author.trim()) {
            return 'Author is required.';
        }

        const type = draft.type;
        if (type === 'Textbook') {
            if (!draft.isbn || !draft.isbn.trim()) {
                return 'ISBN is required for Textbooks.';
            }
            if (!draft.publication_year || !String(draft.publication_year).trim()) {
                return 'Publication Year is required for Textbooks.';
            }
            const yearStr = String(draft.publication_year).trim();
            const yearNum = Number(yearStr);
            if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
                return 'Please enter a valid 4-digit Publication Year (e.g. 2024).';
            }
        } else if (type === 'Open Educational Resources') {
            if (!draft.link || !draft.link.trim()) {
                return 'Link is required for Open Educational Resources.';
            }
            if (draft.publication_year && String(draft.publication_year).trim()) {
                const yearNum = Number(String(draft.publication_year).trim());
                if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
                    return 'Please enter a valid 4-digit Publication Year (e.g. 2024).';
                }
            }
        } else if (type === 'Online Resources') {
            if (!draft.link || !draft.link.trim()) {
                return 'Link is required for Online Resources.';
            }
        }
        return null;
    };

    const commitDraftLocal = async () => {
        const type = newRefDraft.type;
        const sanitizedYear = type === 'Online Resources'
            ? null
            : (newRefDraft.publication_year ? String(newRefDraft.publication_year).trim() : null);

        if (isEditing && editingRef) {
            // Updating existing reference
            if (editingRef.reference_id) {
                try {
                    const payload = {
                        title: newRefDraft.title.trim(),
                        type,
                        author: newRefDraft.author.trim(),
                        isbn: type === 'Online Resources' ? null : (newRefDraft.isbn ? newRefDraft.isbn.trim() : null),
                        link: type === 'Textbook' ? null : (newRefDraft.link ? newRefDraft.link.trim() : null),
                        publication_year: sanitizedYear
                    };

                    const updated = await fetchJson(`/api/references/${editingRef.reference_id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const merged = { ...editingRef, ...updated };
                    setAllReferences(prev => prev.map(r => (r.reference_id === editingRef.reference_id ? merged : r)));
                    setSelectedRefs(prev => prev.map(r => (r.reference_id === editingRef.reference_id ? merged : r)));
                } catch (err) {
                    console.error('Failed to update reference:', err);
                    setValidationError(err.message || 'Failed to update reference.');
                    return;
                }
            } else {
                // Updating unpersisted temp reference
                const updatedDraft = {
                    ...editingRef,
                    title: newRefDraft.title.trim(),
                    type,
                    author: newRefDraft.author.trim(),
                    isbn: type === 'Online Resources' ? null : (newRefDraft.isbn ? newRefDraft.isbn.trim() : null),
                    link: type === 'Textbook' ? null : (newRefDraft.link ? newRefDraft.link.trim() : null),
                    publication_year: sanitizedYear
                };
                setAllReferences(prev => prev.map(r => (r._temp_id === editingRef._temp_id ? updatedDraft : r)));
                setSelectedRefs(prev => prev.map(r => (r._temp_id === editingRef._temp_id ? updatedDraft : r)));
            }
        } else {
            // Adding new reference
            const tempId = `temp-${Date.now()}`;
            const newOption = {
                reference_id: null,
                _temp_id: tempId,
                title: newRefDraft.title.trim(),
                type,
                author: newRefDraft.author.trim(),
                isbn: type === 'Online Resources' ? null : (newRefDraft.isbn ? newRefDraft.isbn.trim() : null),
                link: type === 'Textbook' ? null : (newRefDraft.link ? newRefDraft.link.trim() : null),
                publication_year: sanitizedYear
            };

            setAllReferences(prev => [newOption, ...prev]);
            setSelectedRefs(prev => [newOption, ...prev]);
        }

        setShowRefSpellModal(false);
        setIsModalOpen(false);
        setIsEditing(false);
        setEditingRef(null);
        setValidationError(null);
    };

    const handleSaveDraft = () => {
        const error = validateDraft(newRefDraft);
        if (error) {
            setValidationError(error);
            return;
        }

        const prefix = isEditing ? 'Edit Reference' : 'Add Reference';
        const warnings = getDraftSpellWarnings(newRefDraft, prefix);
        if (warnings.length > 0) {
            setRefSpellWarnings(warnings);
            setShowRefSpellModal(true);
            return;
        }

        commitDraftLocal();
    };

    const collectSpellWarnings = () => {
        const warnings = [];
        // Check newly added references in selectedRefs (Title only)
        const newlyAddedRefs = selectedRefs.filter(r => !r.reference_id);
        newlyAddedRefs.forEach((r, idx) => {
            const prefix = `Added Reference #${idx + 1}${r.title ? ` (${r.title})` : ''}`;
            warnings.push(...getDraftSpellWarnings(r, prefix));
        });

        // Also include draft if the modal happens to be open
        if (isModalOpen && newRefDraft.title) {
            warnings.push(...getDraftSpellWarnings(newRefDraft, 'Reference Pop-up Draft'));
        }

        return warnings;
    };

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!selectedRefs || selectedRefs.length === 0) {
                return "Please select at least one reference assignment.";
            }
            return null;
        },
        getSpellWarnings: collectSpellWarnings,
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

            const toCreate = selectedRefs.filter(r => !r.reference_id);
            const createdMap = {};

            for (const r of toCreate) {
                const payload = {
                    title: r.title,
                    type: r.type,
                    author: r.author || null,
                    isbn: r.isbn || null,
                    link: r.link || null,
                    publication_year: r.publication_year || null,
                    course_no: courseCode || null,
                    pc_offering_id: pcOfferingId || null,
                    week_id: Number(iloId)
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
                <TextField
                    label="Title"
                    value={newRefDraft.title}
                    onChange={(v) => setNewRefDraft(prev => ({ ...prev, title: v }))}
                    spellCheckEnabled={true}
                    placeholder="Enter reference title..."
                />
                <TextField
                    label="Author"
                    value={newRefDraft.author}
                    onChange={(v) => setNewRefDraft(prev => ({ ...prev, author: v }))}
                    spellCheckEnabled={false}
                    placeholder="e.g. John Doe"
                />
                {type === 'Textbook' && (
                    <>
                        <TextField
                            label="ISBN"
                            value={newRefDraft.isbn}
                            onChange={(v) => setNewRefDraft(prev => ({ ...prev, isbn: v }))}
                            spellCheckEnabled={false}
                            placeholder="e.g. 978-0-123456-47-2"
                        />
                        <TextField
                            label="Publication Year"
                            value={newRefDraft.publication_year}
                            onChange={(v) => setNewRefDraft(prev => ({ ...prev, publication_year: v }))}
                            spellCheckEnabled={false}
                            placeholder="e.g. 2024"
                        />
                    </>
                )}
                {type === 'Open Educational Resources' && (
                    <>
                        <TextField
                            label="ISBN (optional)"
                            value={newRefDraft.isbn}
                            onChange={(v) => setNewRefDraft(prev => ({ ...prev, isbn: v }))}
                            spellCheckEnabled={false}
                            placeholder="e.g. 978-0-123456-47-2 (optional)"
                        />
                        <TextField
                            label="Publication Year (optional)"
                            value={newRefDraft.publication_year}
                            onChange={(v) => setNewRefDraft(prev => ({ ...prev, publication_year: v }))}
                            spellCheckEnabled={false}
                            placeholder="e.g. 2024 (optional)"
                        />
                        <TextField
                            label="Link"
                            value={newRefDraft.link}
                            onChange={(v) => setNewRefDraft(prev => ({ ...prev, link: v }))}
                            spellCheckEnabled={false}
                            placeholder="https://..."
                        />
                    </>
                )}
                {type === 'Online Resources' && (
                    <>
                        <TextField
                            label="Link"
                            value={newRefDraft.link}
                            onChange={(v) => setNewRefDraft(prev => ({ ...prev, link: v }))}
                            spellCheckEnabled={false}
                            placeholder="https://..."
                        />
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
                onEditReference={handleOpenEdit}
            />

            <InlineModal
                isOpen={isModalOpen}
                title={isEditing ? "Edit Reference" : "Add Reference"}
                onClose={() => {
                    setIsModalOpen(false);
                    setIsEditing(false);
                    setEditingRef(null);
                }}
                actions={
                    <>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={() => {
                                setIsModalOpen(false);
                                setIsEditing(false);
                                setEditingRef(null);
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.confirmBtn}
                            onClick={handleSaveDraft}
                        >
                            {isEditing ? "Save Changes" : "Add"}
                        </button>
                    </>
                }
            >
                <div className={styles.refModalBodyContent}>
                    <Dropdown
                        label="Type"
                        value={newRefDraft.type}
                        options={['Textbook', 'Open Educational Resources', 'Online Resources']}
                        onChange={(v) => setNewRefDraft(prev => ({ ...prev, type: v }))}
                    />
                    {renderDynamicFields()}
                    {validationError && <div className={styles.modalError}>{validationError}</div>}
                </div>
            </InlineModal>

            {/* Soft-Warning Pre-Save Spell Check Modal for Reference Pop-up Title */}
            <InlineModal
                isOpen={showRefSpellModal}
                title="Spelling Check Warning"
                onClose={() => setShowRefSpellModal(false)}
                actions={
                    <>
                        <button type="button" className={styles.modalCancelBtn} onClick={() => setShowRefSpellModal(false)}>
                            Review & Edit
                        </button>
                        <button type="button" className={styles.modalConfirmBtn} onClick={commitDraftLocal}>
                            Save Anyway
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertCircle size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 600, color: '#1E293B' }}>
                            Potential Misspellings Detected in Title
                        </p>
                        <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.45 }}>
                            The following words in the reference title were flagged by the spell checker. You can right-click underlined words to replace or whitelist them, or proceed anyway:
                        </p>
                        <div className={styles.spellWarningList}>
                            {refSpellWarnings.map((item, idx) => (
                                <div key={idx} className={styles.spellWarningCategory}>
                                    <div className={styles.spellWarningFieldTitle}>{item.field}</div>
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
        </div>
    );
});

export default ReferenceForm;
