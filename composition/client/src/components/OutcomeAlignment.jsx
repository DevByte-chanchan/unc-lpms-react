import React, { useState, useEffect } from 'react';
import { Inbox } from "react-feather";

const OutcomeAlignment = ({ offeringID, revisionNum, styles, stylesB, fetchJson }) => {
    const [cpaData, setCpaData] = useState({
        course: { code: '', title: '' }, programOutcomes: [], courseOutcomes: []
    });
    
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [cpaLoading, setCpaLoading] = useState(false);
    const [cpaError, setCpaError] = useState(null);

    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchCPA() {
            setCpaLoading(true);
            setCpaError(null);
            try {
                const data = await fetchJson(`/api/course-outcome-alignment/${offeringID}/${revisionNum}`);
                if (!mounted) return;
                setCpaData({
                    course: data.course ?? { code: '', title: '' },
                    programOutcomes: data.programOutcomes ?? [],
                    courseOutcomes: data.courseOutcomes ?? []
                });
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setCpaError(err.message);
            } finally {
                if (mounted) setCpaLoading(false);
            }
        }

        fetchCPA();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    const handleEditToggle = () => {
        if (isEditing) {
            setShowConfirm(true);
        } else {
            setEditData(JSON.parse(JSON.stringify(cpaData.courseOutcomes)));
            setIsEditing(true);
        }
    };

    const handleMappingChange = (coIndex, poIndex, value) => {
        setEditData(prev => {
            const upd = [...prev];
            upd[coIndex].poMappings[poIndex] = value;
            return upd;
        });
    };

    const handleSaveConfirm = async () => {
        setIsSaving(true);
        try {
            await fetch(`/api/course-outcome-alignment/${offeringID}/${revisionNum}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseOutcomes: editData,
                    programOutcomes: cpaData.programOutcomes
                })
            });
            setCpaData(prev => ({ ...prev, courseOutcomes: editData }));
            setIsEditing(false);
            setShowConfirm(false);
        } catch (e) {
            console.error('Failed to save alignments', e);
            alert('Failed to save alignments');
        } finally {
            setIsSaving(false);
        }
    };

    if (cpaLoading) return <div className={stylesB.loadingContainer}>Loading alignment matrix...</div>;
    if (cpaError) return <div className={stylesB.errorContainer}>Error: {cpaError}</div>;

    const renderCell = (co, coIndex, poIndex) => {
        const value = isEditing ? editData[coIndex].poMappings[poIndex] : (co.poMappings && co.poMappings[poIndex] ? co.poMappings[poIndex] : '');
        
        if (isEditing) {
            return (
                <select 
                    value={value} 
                    onChange={(e) => handleMappingChange(coIndex, poIndex, e.target.value)}
                    className="matrix-edit-select"
                >
                    <option value=""></option>
                    <option value="I">I</option>
                    <option value="E">E</option>
                    <option value="D">D</option>
                </select>
            );
        }
        return value;
    };

    return (
        <section className="responsive-container-root">
            <div className={stylesB['cpa-container']} style={{ padding: '0' }}>
                <div className="matrix-btns-container">
                    <div className={stylesB.legend} style={{ margin: 0, padding: 0, background: 'transparent' }}>
                        <span className={stylesB.legendTitle}>Legend:</span>
                        <div className={stylesB.legendItems}>
                            <span><strong>I</strong>  Introductory</span>
                            <span><strong>E</strong>  Enabling</span>
                            <span><strong>D</strong>  Demonstrative</span>
                        </div>
                    </div>
                    {isEditing && (
                    <button className="matrix-cancel-btn" onClick={() => { setIsEditing(false); setShowConfirm(false); }}>
                        Cancel
                    </button>
                )}
                <button 
                        className={"matrix-edit-btn " + (isEditing ? "save-mode" : "")} 
                        onClick={handleEditToggle}
                    >
                        {isEditing ? (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                Save Alignments
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit Alignments
                            </>
                        )}
                    </button>
                </div>

                <div style={{ border: "none" }} className={stylesB.tableScrollWrapper}>
                    <table className={stylesB.alignmentTable + " mobile-matrix-table"}>
                        <thead>
                        <tr>
                            <th className={stylesB.firstColHeader}>
                                After completion of the course, the student should be able to:
                            </th>
                            {cpaData.programOutcomes && cpaData.programOutcomes.length > 0
                                ? cpaData.programOutcomes.map(po => <th key={po.key} className={stylesB.poHeader}>{po.key}</th>)
                                : ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9'].map(po => <th key={po} className={stylesB.poHeader}>{po}</th>)
                            }
                        </tr>
                        </thead>

                        <tbody>
                        {cpaData.courseOutcomes && cpaData.courseOutcomes.length > 0 ? (
                            cpaData.courseOutcomes.map((co, coIndex) => (
                                <tr key={co.id}>
                                    <td className={stylesB.descCell + " mobile-desc"}>
                                        {co.description}
                                    </td>
                                    {(cpaData.programOutcomes.length > 0 ? cpaData.programOutcomes : Array(9).fill({key: 'PO?'})).map((po, poIndex) => (
                                        <td key={poIndex} className={stylesB.mappingCell + " mobile-mapping"} data-label={po.key}>
                                            {renderCell(co, coIndex, poIndex)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr className={styles.emptyRow}>
                                <td colSpan={(cpaData.programOutcomes.length || 9) + 1}>
                                    <div className={styles.emptyStateContainer}>
                                        <Inbox size={40} strokeWidth={1} />
                                        <span>No course outcomes / alignments found for this course.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showConfirm && (
                <div className="matrix-modal-overlay">
                    <div className="matrix-modal-content">
                        <div className="matrix-modal-title">Confirm Changes</div>
                        <div className="matrix-modal-text">
                            <strong>Caution:</strong> Outcome alignments originate from the official curriculum map and should generally be maintained securely. Modifying these matrix allocations will globally reconfigure outcome chaining.
                            <br/><br/>
                            Are you certain you want to commit these alignments?
                        </div>
                        <div className="matrix-modal-actions">
                            <button className="matrix-btn-cancel" onClick={() => setShowConfirm(false)} disabled={isSaving}>Cancel</button>
                            <button className="matrix-btn-confirm" onClick={handleSaveConfirm} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Yes, Save Alignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default OutcomeAlignment;