// src/pages/ReferenceForm.jsx
import React, { useEffect, useState } from 'react';
import Skeleton from '../layouts/Skeleton.jsx';
import Header from '../components/Header.jsx';
import FormNavigation from '../components/FormNavigation.jsx';
import styles from '../styles/Form.module.sass'; // contains modal classes too
import { useNavigate, useParams } from 'react-router-dom';
import SideNavigation from '../components/SideNavigation.jsx';
import ReferencePicker from '../components/ReferencePicker.jsx';
import TextField from '../components/TextField.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { X, CheckCircle, AlertCircle } from 'react-feather';

// Backend base URL: set VITE_API_BASE in .env (e.g., VITE_API_BASE=http://localhost:5000)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

/* Inline modal using project's modal classes (styles) */
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
    const { courseCode, iloId } = useParams(); // route: /references/form/:courseCode/:iloId
    const goBackHandler = () => navigate(-1);

    const [allReferences, setAllReferences] = useState([]);
    const [assignedReferences, setAssignedReferences] = useState([]);
    const [selectedRefs, setSelectedRefs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [validationError, setValidationError] = useState(null);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newRefDraft, setNewRefDraft] = useState({
        title: '',
        type: 'Textbook',
        author: '',
        isbn: '',
        link: '',
        publication_year: ''
    });

    const [showConfirm, setShowConfirm] = useState(false);

    // Helper: fetch wrapper that returns parsed JSON or throws with text
    async function fetchJson(url, opts) {
        const res = await fetch(url, opts);
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const message = text ? `HTTP ${res.status}: ${text}` : `HTTP ${res.status}`;
            const err = new Error(message);
            err.status = res.status;
            throw err;
        }
        // safe parse
        return res.json();
    }

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setLoading(true);

        async function load() {
            try {
                const refsUrl = `${API_BASE}/api/references`;
                const assignedUrl = `${API_BASE}/api/ilo-references/${encodeURIComponent(iloId)}`;

                // fetch both; handle non-JSON errors gracefully
                const [refsRes, assignedRes] = await Promise.all([
                    fetch(refsUrl),
                    fetch(assignedUrl)
                ]);

                // If either returned HTML (index.html) or error page, read text and throw
                if (!refsRes.ok) {
                    const txt = await refsRes.text().catch(() => '');
                    throw new Error(`Failed to load references: ${refsRes.status} ${txt}`);
                }
                if (!assignedRes.ok) {
                    const txt = await assignedRes.text().catch(() => '');
                    throw new Error(`Failed to load assigned references: ${assignedRes.status} ${txt}`);
                }

                // parse JSON
                const refs = await refsRes.json();
                const assigned = await assignedRes.json();

                if (!mounted) return;

                // Normalize references to consistent shape expected by ReferencePicker
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
                setAssignedReferences(Array.isArray(assigned) ? assigned : []);

                // Build selectedRefs by matching assigned references to normalizedRefs (object identity)
                const assignedRefObjects = (Array.isArray(assigned) ? assigned : [])
                    .map(a => a.reference)
                    .filter(Boolean)
                    .map(ar => {
                        if (ar.reference_id != null) {
                            const match = normalizedRefs.find(r => r.reference_id != null && Number(r.reference_id) === Number(ar.reference_id));
                            if (match) return match;
                        }
                        const matchByTitle = normalizedRefs.find(r => String(r.title || '').trim() === String(ar.title || '').trim());
                        if (matchByTitle) return matchByTitle;
                        return {
                            reference_id: ar.reference_id != null ? Number(ar.reference_id) : null,
                            title: ar.title || '',
                            type: ar.type || '',
                            author: ar.author || ar.authors || '',
                            isbn: ar.isbn || '',
                            link: ar.link || '',
                            publication_year: ar.publication_year ? (typeof ar.publication_year === 'string' ? ar.publication_year.split('T')[0] : ar.publication_year) : null,
                            ...ar
                        };
                    });

                setSelectedRefs(assignedRefObjects);

                // Debug logs (remove in production)
                // eslint-disable-next-line no-console
                console.log('ReferenceForm: API_BASE', API_BASE);
                // eslint-disable-next-line no-console
                console.log('ReferenceForm: normalizedRefs', normalizedRefs);
                // eslint-disable-next-line no-console
                console.log('ReferenceForm: assigned (raw)', assigned);
                // eslint-disable-next-line no-console
                console.log('ReferenceForm: selectedRefs (after match)', assignedRefObjects);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('load references error', err);
                if (mounted) setValidationError(err.message || 'Failed to load references');
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => { mounted = false; };
    }, [iloId]);

    // Open add modal
    const handleOpenAdd = () => {
        setNewRefDraft({ title: '', type: 'Textbook', author: '', isbn: '', link: '', publication_year: '' });
        setValidationError(null);
        setIsAddOpen(true);
    };

    // Save new reference locally (not persisted yet)
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

    // Save (create new references first, then assign)
    const handleSave = async () => {
        setValidationError(null);
        if (!selectedRefs || selectedRefs.length === 0) {
            setValidationError('Please select at least one reference before saving.');
            return;
        }

        setSaving(true);
        try {
            // Create any new references (those without reference_id)
            const toCreate = selectedRefs.filter(r => !r.reference_id);
            const createdMap = {};

            for (const r of toCreate) {
                const payload = {
                    title: r.title,
                    type: r.type,
                    author: r.author || null,
                    isbn: r.isbn || null,
                    link: r.link || null,
                    publication_year: r.publication_year || null
                };

                const created = await fetchJson(`${API_BASE}/api/references`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (r._temp_id) createdMap[r._temp_id] = created;

                // Replace temp in allReferences and selectedRefs
                setAllReferences(prev => prev.map(x => (x._temp_id && x._temp_id === r._temp_id ? created : x)));
                setSelectedRefs(prev => prev.map(x => (x._temp_id && x._temp_id === r._temp_id ? created : x)));
            }

            // Build reference_ids preserving order
            const reference_ids = selectedRefs.map(r => {
                if (r.reference_id) return r.reference_id;
                if (r._temp_id && createdMap[r._temp_id]) return createdMap[r._temp_id].reference_id;
                return null;
            }).filter(Boolean);

            // Assign to ILO
            await fetchJson(`${API_BASE}/api/ilo-references/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ilo_id: Number(iloId), reference_ids })
            });

            setShowConfirm(true);

            // Refresh assignedReferences and selectedRefs from server
            const assigned = await fetchJson(`${API_BASE}/api/ilo-references/${encodeURIComponent(iloId)}`);
            setAssignedReferences(assigned);

            // match assigned to current allReferences
            const normalizedRefs = allReferences;
            const assignedRefObjects = (assigned || []).map(a => a.reference).filter(Boolean).map(ar => {
                const match = normalizedRefs.find(r => r.reference_id != null && ar.reference_id != null && Number(r.reference_id) === Number(ar.reference_id));
                return match || ar;
            });
            setSelectedRefs(assignedRefObjects);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('save error', err);
            setValidationError(err.message || 'Failed to save assignments');
        } finally {
            setSaving(false);
        }
    };

    const handleCloseConfirm = () => setShowConfirm(false);

    // Dynamic fields for add modal
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

    return (
        <Skeleton
            header={<Header role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    {/* Use FormNavigation's Save and Back buttons */}
                    <FormNavigation goBack={goBackHandler} onSave={handleSave} />

                    <div className={styles['form-container']}>
                        <h2>References Assignment</h2>

                        <ReferencePicker
                            options={allReferences}
                            value={selectedRefs}
                            onChange={(val) => setSelectedRefs(val)}
                            error={validationError}
                            disabled={loading || saving}
                            onAddReference={handleOpenAdd}
                        />

                        {/*{validationError && (*/}
                        {/*    <div style={{ marginTop: 12, color: '#b00020' }}>*/}
                        {/*        <AlertCircle size={16} /> {validationError}*/}
                        {/*    </div>*/}
                        {/*)}*/}

                        {/* Add Reference Modal (local only until saved) */}
                        <InlineModal
                            isOpen={isAddOpen}
                            title="Add Reference"
                            onClose={() => setIsAddOpen(false)}
                            actions={
                                <>
                                    <button style={{color: "white", fontWeight:400}} className="confirmBtn" onClick={handleSaveNewRefLocal}>Add</button>
                                </>
                            }
                        >
                            <div style={{ display: 'grid', gap: 12 }}>
                                <Dropdown
                                    label="Type"
                                    value={newRefDraft.type}
                                    options={['Textbook', 'Open Educational Resources', 'Online Resources']}
                                    onChange={(v) => setNewRefDraft(prev => ({ ...prev, type: v }))}
                                />
                                {renderDynamicFields()}
                                {validationError && <div style={{ color: '#b00020' }}>{validationError}</div>}
                            </div>
                        </InlineModal>

                        {/* Confirmation modal */}
                        <InlineModal
                            isOpen={showConfirm}
                            title="Saved"
                            onClose={handleCloseConfirm}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <CheckCircle size={20} color="#2e7d32" />
                                <div>References assigned successfully.</div>
                            </div>
                        </InlineModal>
                    </div>
                </div>
            }
        />
    );
};

export default ReferenceForm;
