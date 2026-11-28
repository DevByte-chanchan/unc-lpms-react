import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import ReferencePicker from '../components/ReferencePicker.jsx';
import TextField from '../components/TextField.jsx';
import Dropdown from '../components/Dropdown.jsx';
import {
    checkSpelling,
    getSuggestions,
    addToWhitelist,
    addWordsToWhitelist,
    subscribeWhitelist,
    tokenizeAndCheckText
} from '../utils/spellChecker.js';
import { X, AlertCircle, BookOpen } from 'react-feather';
import { fetchJson } from "../utils/api.js";
import styles from '../styles/Form.module.sass';

export function InlineModal({ isOpen, title, onClose, children, actions }) {
    if (!isOpen) return null;
    const modalContent = (
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
    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

// Serialization helpers for deep change detection
const serializeRefs = (items) => {
    if (!Array.isArray(items)) return '[]';
    const ids = items.map(r => String(r.reference_id || r._temp_id || r.title)).sort();
    return JSON.stringify(ids);
};

const serializeComments = (comments) => {
    if (!Array.isArray(comments)) return '[]';
    return JSON.stringify(comments.map(c => ({
        id: c.comment_id,
        resolved: Boolean(c.resolved_status)
    })));
};

const isTextbookReference = (ref) => {
    const raw = String(ref?.type || ref?.Type || ref?.typeKey || '').toLowerCase();
    return raw.includes('textbook');
};

const isValidIsbn = (raw) => {
    const cleaned = String(raw || '').replace(/[-\s]/g, '').toUpperCase();
    return /^\d{9}[\dX]$/.test(cleaned) || /^(978|979)\d{10}$/.test(cleaned);
};

const isValidPublicationYear = (raw) => {
    const trimmed = String(raw || '').trim();
    if (!/^\d{4}$/.test(trimmed)) return false;
    const num = Number(trimmed);
    return num >= 1900 && num <= 2100;
};

const isValidHttpUrl = (raw) => {
    const trimmed = String(raw || '').trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;
    try {
        const parsed = new URL(trimmed);
        return (
            (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
            Boolean(parsed.hostname) &&
            (parsed.hostname.includes('.') || parsed.hostname === 'localhost')
        );
    } catch {
        return false;
    }
};

const validateReferenceDraftFields = (draft) => {
    const errors = {};
    const title = String(draft.title || '').trim();
    const author = String(draft.author || '').trim();
    const isbn = String(draft.isbn || '').trim();
    const year = String(draft.publication_year || '').trim();
    const link = String(draft.link || '').trim();
    const type = draft.type;

    if (!title) {
        errors.title = 'Title is required.';
    } else if (title.length < 2) {
        errors.title = 'Title must be at least 2 characters.';
    }

    if (!author) {
        errors.author = 'Author is required.';
    } else if (author.length < 2) {
        errors.author = 'Author must be at least 2 characters.';
    }

    if (type === 'Textbook') {
        if (!isbn) {
            errors.isbn = 'ISBN is required for Textbooks.';
        } else if (!isValidIsbn(isbn)) {
            errors.isbn = 'Enter a valid ISBN-10 or ISBN-13 (e.g. 978-0-123456-47-2).';
        }

        if (!year) {
            errors.publication_year = 'Publication Year is required for Textbooks.';
        } else if (!isValidPublicationYear(year)) {
            errors.publication_year = 'Enter a valid 4-digit year (1900–2100).';
        }
    } else if (type === 'Open Educational Resources') {
        if (isbn && !isValidIsbn(isbn)) {
            errors.isbn = 'Enter a valid ISBN-10 or ISBN-13 (or leave blank).';
        }
        if (year && !isValidPublicationYear(year)) {
            errors.publication_year = 'Enter a valid 4-digit year (1900–2100).';
        }
        if (!link) {
            errors.link = 'Link is required for Open Educational Resources.';
        } else if (!isValidHttpUrl(link)) {
            errors.link = 'Enter a valid URL starting with http:// or https://.';
        }
    } else if (type === 'Online Resources') {
        if (!link) {
            errors.link = 'Link is required for Online Resources.';
        } else if (!isValidHttpUrl(link)) {
            errors.link = 'Enter a valid URL starting with http:// or https://.';
        }
    }

    return errors;
};

const ReferenceForm = forwardRef(({
    iloId,
    isOrientation = false,
    status,
    setUnresolvedCount,
    onCommentsChange,
    onValidationStateChange,
    courseCode,
    pcOfferingId
}, ref) => {
    const [allReferences, setAllReferences] = useState([]);
    const [selectedRefs, setSelectedRefs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalSubmitError, setModalSubmitError] = useState(null);
    const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
    const [touchedFields, setTouchedFields] = useState({});
    const [titleSpellHighlighted, setTitleSpellHighlighted] = useState(false);
    const [whitelistVersion, setWhitelistVersion] = useState(0);

    // Context-Targeted Comments Checklist Tracking States
    const [reviewComments, setReviewComments] = useState([]);
    const initialRefsRef = useRef(null);
    const initialCommentsRef = useRef(null);

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
    const [showRefSpellModal, setShowRefSpellModal] = useState(false);

    useEffect(() => {
        return subscribeWhitelist(() => {
            setWhitelistVersion(v => v + 1);
        });
    }, []);

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
                initialRefsRef.current = serializeRefs(assignedRefObjects);
                initialCommentsRef.current = serializeComments(initialComments);
            } catch (err) {
                console.error('Load initial targets failure: ', err);
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

    // Live Reference column validation: requires at least 1 Textbook selected (OER & Online are optional)
    const liveValidationState = useMemo(() => {
        const list = selectedRefs || [];
        const totalSelected = list.length;
        const textbookCount = list.filter(isTextbookReference).length;
        const supportingCount = totalSelected - textbookCount;
        const hasTextbook = textbookCount > 0;

        const contentIssues = hasTextbook
            ? []
            : [
                supportingCount > 0
                    ? `Select at least 1 Textbook reference (${supportingCount} supporting ${supportingCount === 1 ? 'reference' : 'references'} selected).`
                    : 'Select at least 1 Textbook reference (OER and Online resources are optional).'
            ];

        const validSummaryText = supportingCount > 0
            ? `${totalSelected} references selected (${textbookCount} ${textbookCount === 1 ? 'Textbook' : 'Textbooks'}, ${supportingCount} supporting).`
            : `${textbookCount} Textbook ${textbookCount === 1 ? 'reference' : 'references'} selected.`;

        return {
            contentIssues,
            validItemCount: totalSelected,
            validSummaryText,
            isValid: contentIssues.length === 0
        };
    }, [selectedRefs]);

    useEffect(() => {
        if (!loading && onValidationStateChange) {
            onValidationStateChange(liveValidationState);
        }
    }, [loading, liveValidationState, onValidationStateChange]);

    // Live modal field validation (disables Save/Add button when empty or invalid)
    const draftFieldErrors = useMemo(
        () => validateReferenceDraftFields(newRefDraft),
        [newRefDraft]
    );

    const isDraftValid = Object.keys(draftFieldErrors).length === 0;
    const firstDraftError = Object.values(draftFieldErrors)[0] || '';

    // Live spell check on Reference Title inside Add/Edit modal
    const titleMisspelledWords = useMemo(() => {
        void whitelistVersion;
        if (!isModalOpen) return [];
        return checkSpelling(newRefDraft.title || '');
    }, [isModalOpen, newRefDraft.title, whitelistVersion]);

    // Auto-close spell action modal once all flagged title words are fixed or added to dictionary
    useEffect(() => {
        if (showRefSpellModal && titleMisspelledWords.length === 0) {
            setShowRefSpellModal(false);
        }
    }, [showRefSpellModal, titleMisspelledWords.length]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowRefSpellModal(false);
        setIsEditing(false);
        setEditingRef(null);
        setModalSubmitError(null);
        setTouchedFields({});
        setTitleSpellHighlighted(false);
    };

    const markFieldTouched = (fieldName) => {
        setTouchedFields(prev => (prev[fieldName] ? prev : { ...prev, [fieldName]: true }));
    };

    const updateDraftField = (fieldName, value) => {
        setNewRefDraft(prev => ({ ...prev, [fieldName]: value }));
        markFieldTouched(fieldName);
        if (modalSubmitError) setModalSubmitError(null);
        if (fieldName === 'title' && titleSpellHighlighted) {
            setTitleSpellHighlighted(false);
        }
    };

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
        setModalSubmitError(null);
        setTouchedFields({});
        setTitleSpellHighlighted(false);
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
        setModalSubmitError(null);
        setTouchedFields({
            title: true,
            author: true,
            isbn: true,
            publication_year: true,
            link: true
        });
        setTitleSpellHighlighted(false);
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

    const handleReplaceMisspelledWord = (targetWord, replacement) => {
        const current = newRefDraft.title || '';
        const tokens = tokenizeAndCheckText(current, { requireBoundaryAtEnd: false });
        const match = tokens.find(
            t => t.isWord && t.isMisspelled && t.cleanWord.toLowerCase() === String(targetWord).toLowerCase()
        );
        if (!match) return;
        const prefix = current.slice(0, match.start);
        const suffix = current.slice(match.end);
        const cleanIdx = match.text.toLowerCase().indexOf(match.cleanWord.toLowerCase());
        const replacedToken = cleanIdx >= 0
            ? match.text.slice(0, cleanIdx) + replacement + match.text.slice(cleanIdx + match.cleanWord.length)
            : replacement;
        updateDraftField('title', `${prefix}${replacedToken}${suffix}`);
    };

    const handleAddWordToDictionary = (word) => {
        if (!word) return;
        addToWhitelist(word);
    };

    const handleFixTitleClick = () => {
        setShowRefSpellModal(false);
        setTitleSpellHighlighted(true);
        requestAnimationFrame(() => {
            const titleEl = document.querySelector('[data-spell-field-id="ref-modal-title"]');
            if (titleEl && typeof titleEl.focus === 'function') {
                titleEl.focus();
            }
        });
    };

    const commitDraftLocal = async () => {
        if (isSubmittingDraft) return;
        setIsSubmittingDraft(true);
        setModalSubmitError(null);

        const type = newRefDraft.type;
        const sanitizedYear = type === 'Online Resources'
            ? null
            : (newRefDraft.publication_year ? String(newRefDraft.publication_year).trim() : null);

        try {
            if (isEditing && editingRef) {
                // Updating existing reference
                if (editingRef.reference_id) {
                    const payload = {
                        title: newRefDraft.title.trim(),
                        type,
                        author: newRefDraft.author.trim(),
                        isbn: type === 'Online Resources' ? null : (newRefDraft.isbn ? newRefDraft.isbn.trim() : null),
                        link: type === 'Textbook' ? null : (newRefDraft.link ? newRefDraft.link.trim() : null),
                        publication_year: sanitizedYear,
                        week_id: Number(iloId) || null,
                        pc_offering_id: Number(pcOfferingId) || null
                    };

                    const updated = await fetchJson(`/api/references/${editingRef.reference_id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const merged = { ...editingRef, ...updated };
                    setAllReferences(prev => prev.map(r => (r.reference_id === editingRef.reference_id ? merged : r)));
                    setSelectedRefs(prev => prev.map(r => (r.reference_id === editingRef.reference_id ? merged : r)));
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

            handleCloseModal();
        } catch (err) {
            console.error('Failed to save reference:', err);
            setModalSubmitError(err.message || 'Failed to save reference.');
        } finally {
            setIsSubmittingDraft(false);
        }
    };

    const handleAddAllToDictionaryAndSave = () => {
        if (titleMisspelledWords.length > 0) {
            addWordsToWhitelist(titleMisspelledWords);
        }
        setShowRefSpellModal(false);
        commitDraftLocal();
    };

    const handleSaveDraft = () => {
        if (!isDraftValid) {
            setTouchedFields({
                title: true,
                author: true,
                isbn: true,
                publication_year: true,
                link: true
            });
            return;
        }

        if (titleMisspelledWords.length > 0) {
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
            if (!selectedRefs || !selectedRefs.some(isTextbookReference)) {
                return "Please select at least 1 Textbook reference (OER and Online resources are optional).";
            }
            return null;
        },
        getSelectedRefs: () => selectedRefs,
        importPreviousReferences: (incomingRefs) => {
            if (!Array.isArray(incomingRefs) || incomingRefs.length === 0) return;
            const normalizedIncoming = incomingRefs.map(pr => ({
                reference_id: pr.reference_id != null ? Number(pr.reference_id) : null,
                title: pr.title || '',
                type: pr.type || '',
                author: pr.author || pr.authors || '',
                isbn: pr.isbn || '',
                link: pr.link || '',
                publication_year: pr.publication_year
                    ? (typeof pr.publication_year === 'string' ? pr.publication_year.split('T')[0] : pr.publication_year)
                    : null
            }));

            const allRefIds = new Set(allReferences.map(r => Number(r.reference_id)).filter(Boolean));
            const allRefTitles = new Set(allReferences.map(r => String(r.title || '').trim().toLowerCase()));
            const missingFromPool = normalizedIncoming.filter(pr => {
                const hasId = pr.reference_id != null && allRefIds.has(Number(pr.reference_id));
                const hasTitle = allRefTitles.has(String(pr.title || '').trim().toLowerCase());
                return !hasId && !hasTitle;
            });
            if (missingFromPool.length > 0) {
                setAllReferences(prev => [...prev, ...missingFromPool]);
            }

            const resolvedIncoming = normalizedIncoming.map(pr => {
                const matchById = pr.reference_id != null
                    ? allReferences.find(ar => ar.reference_id != null && Number(ar.reference_id) === Number(pr.reference_id))
                    : null;
                if (matchById) return matchById;
                const matchByTitle = allReferences.find(
                    ar => String(ar.title || '').trim().toLowerCase() === String(pr.title || '').trim().toLowerCase()
                );
                return matchByTitle || pr;
            });

            const existingIds = new Set(selectedRefs.map(r => Number(r.reference_id)).filter(Boolean));
            const existingTitles = new Set(selectedRefs.map(r => String(r.title || '').trim().toLowerCase()));

            const newlyAdded = [];
            resolvedIncoming.forEach(pr => {
                if (pr.reference_id != null && existingIds.has(Number(pr.reference_id))) return;
                if (existingTitles.has(String(pr.title || '').trim().toLowerCase())) return;
                newlyAdded.push(pr);
            });

            if (newlyAdded.length > 0) {
                setSelectedRefs(prev => [...prev, ...newlyAdded]);
            }
        },
        hasChanges: () => {
            if (initialRefsRef.current === null) return false;
            const refsChanged = serializeRefs(selectedRefs) !== initialRefsRef.current;
            const commentsChanged = serializeComments(reviewComments) !== initialCommentsRef.current;
            return refsChanged || commentsChanged;
        },
        resetInitialState: () => {
            initialRefsRef.current = serializeRefs(selectedRefs);
            initialCommentsRef.current = serializeComments(reviewComments);
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
            initialRefsRef.current = serializeRefs(selectedRefs);
            initialCommentsRef.current = serializeComments(reviewComments);
        },
        getCommentTargetLabel: (comment) => {
            if (comment.target_title) return comment.target_title;
            const match = allReferences.find(r => Number(r.reference_id) === Number(comment.target_id));
            return match ? match.title : `Reference Element ID: ${comment.target_id}`;
        }
    }));

    const renderDynamicFields = () => {
        const type = newRefDraft.type;
        const fieldError = (key) => (touchedFields[key] ? draftFieldErrors[key] || null : null);

        return (
            <>
                <TextField
                    label="Title"
                    value={newRefDraft.title}
                    onChange={(v) => updateDraftField('title', v)}
                    onBlur={() => markFieldTouched('title')}
                    error={fieldError('title')}
                    fieldId="ref-modal-title"
                    isHighlighted={titleSpellHighlighted}
                    spellCheckEnabled={true}
                    placeholder="Enter reference title..."
                />
                {titleMisspelledWords.length > 0 && !fieldError('title') && (
                    <div className={styles.refInlineSpellHint}>
                        <div className={styles.refInlineSpellHintText}>
                            <AlertCircle size={13} color="#D97706" style={{ flexShrink: 0 }} />
                            <span>
                                {titleMisspelledWords.length === 1
                                    ? `Possible misspelling: "${titleMisspelledWords[0]}"`
                                    : `${titleMisspelledWords.length} possible misspellings in Title`}
                            </span>
                        </div>
                        <button
                            type="button"
                            className={styles.refSpellDictBtn}
                            onClick={() => setShowRefSpellModal(true)}
                        >
                            Fix / Dictionary
                        </button>
                    </div>
                )}
                <TextField
                    label="Author"
                    value={newRefDraft.author}
                    onChange={(v) => updateDraftField('author', v)}
                    onBlur={() => markFieldTouched('author')}
                    error={fieldError('author')}
                    spellCheckEnabled={false}
                    placeholder="e.g. John Doe"
                />
                {type === 'Textbook' && (
                    <>
                        <TextField
                            label="ISBN"
                            value={newRefDraft.isbn}
                            onChange={(v) => updateDraftField('isbn', v)}
                            onBlur={() => markFieldTouched('isbn')}
                            error={fieldError('isbn')}
                            spellCheckEnabled={false}
                            placeholder="e.g. 978-0-123456-47-2"
                        />
                        <TextField
                            label="Publication Year"
                            value={newRefDraft.publication_year}
                            onChange={(v) => updateDraftField('publication_year', v)}
                            onBlur={() => markFieldTouched('publication_year')}
                            error={fieldError('publication_year')}
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
                            onChange={(v) => updateDraftField('isbn', v)}
                            onBlur={() => markFieldTouched('isbn')}
                            error={fieldError('isbn')}
                            spellCheckEnabled={false}
                            placeholder="e.g. 978-0-123456-47-2 (optional)"
                        />
                        <TextField
                            label="Publication Year (optional)"
                            value={newRefDraft.publication_year}
                            onChange={(v) => updateDraftField('publication_year', v)}
                            onBlur={() => markFieldTouched('publication_year')}
                            error={fieldError('publication_year')}
                            spellCheckEnabled={false}
                            placeholder="e.g. 2024 (optional)"
                        />
                        <TextField
                            label="Link"
                            value={newRefDraft.link}
                            onChange={(v) => updateDraftField('link', v)}
                            onBlur={() => markFieldTouched('link')}
                            error={fieldError('link')}
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
                            onChange={(v) => updateDraftField('link', v)}
                            onBlur={() => markFieldTouched('link')}
                            error={fieldError('link')}
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
                disabled={loading}
                onAddReference={handleOpenAdd}
                onEditReference={handleOpenEdit}
                validationState={liveValidationState}
            />

            <InlineModal
                isOpen={isModalOpen}
                title={isEditing ? "Edit Reference" : "Add Reference"}
                onClose={handleCloseModal}
                actions={
                    <>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={handleCloseModal}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.confirmBtn}
                            onClick={handleSaveDraft}
                            disabled={!isDraftValid || isSubmittingDraft}
                            title={!isDraftValid ? firstDraftError : (isEditing ? "Save Changes" : "Add Reference")}
                        >
                            {isSubmittingDraft ? "Saving..." : (isEditing ? "Save Changes" : "Add")}
                        </button>
                    </>
                }
            >
                <div className={styles.refModalBodyContent}>
                    <Dropdown
                        label="Type"
                        value={newRefDraft.type}
                        options={['Textbook', 'Open Educational Resources', 'Online Resources']}
                        onChange={(v) => {
                            setNewRefDraft(prev => ({ ...prev, type: v }));
                            if (modalSubmitError) setModalSubmitError(null);
                        }}
                    />
                    {renderDynamicFields()}
                    {modalSubmitError && <div className={styles.modalError}>{modalSubmitError}</div>}
                </div>
            </InlineModal>

            {/* Pre-Save Spell Check Actions Modal for Reference Pop-up Title */}
            <InlineModal
                isOpen={showRefSpellModal}
                title="Spelling Check — Reference Title"
                onClose={() => setShowRefSpellModal(false)}
                actions={
                    <>
                        <button type="button" className={styles.cancelBtn} onClick={handleFixTitleClick}>
                            Fix Title
                        </button>
                        <button
                            type="button"
                            className={styles.confirmBtn}
                            onClick={handleAddAllToDictionaryAndSave}
                            disabled={isSubmittingDraft}
                        >
                            Add to Dictionary &amp; Save
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
                            Choose a suggested replacement to fix each word, edit the title manually, or add valid terms to your dictionary:
                        </p>
                        <div className={styles.spellWarningList}>
                            {titleMisspelledWords.map((word) => {
                                const suggestions = getSuggestions(word, 4);
                                return (
                                    <div key={word} className={styles.refSpellWordRow}>
                                        <div className={styles.refSpellWordTop}>
                                            <span className={styles.spellWarningWordBadge}>{word}</span>
                                            <button
                                                type="button"
                                                className={styles.refSpellDictBtn}
                                                onClick={() => handleAddWordToDictionary(word)}
                                                title={`Add "${word}" to personal dictionary`}
                                            >
                                                <BookOpen size={11} />
                                                <span>Add to Dictionary</span>
                                            </button>
                                        </div>
                                        <div className={styles.refSpellSuggestionsRow}>
                                            {suggestions.length > 0 ? (
                                                <>
                                                    <span className={styles.refSpellSuggestLabel}>Fix with:</span>
                                                    {suggestions.map((s) => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            className={styles.refSpellSuggestChip}
                                                            onClick={() => handleReplaceMisspelledWord(word, s)}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </>
                                            ) : (
                                                <span className={styles.refSpellNoSuggest}>No automatic suggestions — click Fix Title to edit manually</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </InlineModal>
        </div>
    );
});

export default ReferenceForm;
