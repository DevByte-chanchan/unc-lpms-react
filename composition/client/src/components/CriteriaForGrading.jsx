import React, { useState, useEffect } from 'react';

const CriteriaForGrading = ({ offeringID, revisionNum, status, styles, stylesB, fetchJson }) => {
    const [criteriaData, setCriteriaData] = useState({ gradingSystem: [] });
    
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [criteriaLoading, setCriteriaLoading] = useState(false);
    const [criteriaError, setCriteriaError] = useState(null);

    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchCriteria() {
            setCriteriaLoading(true);
            setCriteriaError(null);
            try {
                const data = await fetchJson(`/api/course-criteria/${offeringID}/${revisionNum}`);
                if (!mounted) return;
                setCriteriaData({
                    gradingSystem: Array.isArray(data.gradingSystem) ? data.gradingSystem : []
                });
            } catch (err) {
                console.error('fetchCriteria error', err);
                if (!mounted) return;
                setCriteriaError(err.message);
                setCriteriaData({ gradingSystem: [] });
            } finally {
                if (mounted) setCriteriaLoading(false);
            }
        }
        fetchCriteria();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    const handleEditToggle = () => {
        if (isEditing) {
            setShowConfirm(true);
        } else {
            setEditData(JSON.parse(JSON.stringify(criteriaData.gradingSystem)));
            setIsEditing(true);
        }
    };

    const handleSaveConfirm = async () => {
        setIsSaving(true);
        try {
            await fetch(`/api/course-criteria/${offeringID}/${revisionNum}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gradingSystem: editData })
            });
            setCriteriaData({ gradingSystem: editData });
            setIsEditing(false);
            setShowConfirm(false);
        } catch (e) {
            console.error('Failed to save criteria', e);
            alert('Failed to save criteria');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (coIndex, iloIndex, field, value, isWeight = false) => {
        setEditData(prev => {
            const upd = [...prev];
            if (isWeight) {
                upd[coIndex].ilos[iloIndex].weight[field] = value;
            } else {
                upd[coIndex].ilos[iloIndex][field] = value;
            }
            return upd;
        });
    };

    const renderInput = (coIndex, iloIndex, field, isWeight = false) => {
        const ilo = isEditing ? editData[coIndex].ilos[iloIndex] : criteriaData.gradingSystem[coIndex].ilos[iloIndex];
        const val = isWeight ? (ilo.weight ? ilo.weight[field] : '') : ilo[field];
        
        let displayVal = val;
        if (!isEditing && Array.isArray(val)) displayVal = val.join(', ');

        if (isEditing) {
            return (
                <input
                    type="text"
                    value={displayVal || ''}
                    onChange={(e) => handleChange(coIndex, iloIndex, field, e.target.value, isWeight)}
                    className="matrix-edit-input matrix-edit-center"
                />
            );
        }
        return displayVal || '';
    };

    const calcTotalForPeriod = (period, useEditData = false) => {
        const source = useEditData ? editData : criteriaData.gradingSystem;
        let total = 0;
        source.forEach(group => {
            group.ilos.forEach(ilo => {
                const w = parseFloat(ilo.weight ? ilo.weight[period] : 0);
                if (!isNaN(w)) total += w;
            });
        });
        return total;
    };

    const currentSystem = isEditing ? editData : criteriaData.gradingSystem;

    if (criteriaError) return <div className={stylesB.errorContainer}>Error: {criteriaError}</div>;

    return (
        <section className="responsive-container-root">
            <div className="matrix-btns-container">
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
                            Save Criteria
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Edit Criteria
                        </>
                    )}
                </button>
            </div>

            <div className={stylesB.gradingContainer + " cfg-table-wrapper"}>
                <table className={stylesB.documentTable + " mobile-grading-table"}>
                    <thead>
                    <tr>
                        <th rowSpan="2" className={styles.headerLabel} style={{ width: '10%' }}>Course Outcome</th>
                        <th rowSpan="2" className={styles.headerLabel} style={{ minWidth: '80px' }}>ILO</th>
                        <th rowSpan="2" className={styles.headerLabel} style={{ width: '35%' }}>Assessment Strategy</th>
                        <th colSpan="4" className={styles.headerLabelCenter}>Weight</th>
                        <th rowSpan="2" className={styles.headerLabelCenter} style={{ width: '10%' }}>Minimum Passing</th>
                    </tr>
                    <tr>
                        <th className={styles.subHeaderDesc} style={{ minWidth: '60px' }}>Prelim</th>
                        <th className={styles.subHeaderDesc} style={{ minWidth: '60px' }}>Midterm</th>
                        <th className={styles.subHeaderDesc} style={{ minWidth: '60px' }}>Semi</th>
                        <th className={styles.subHeaderDesc} style={{ minWidth: '60px' }}>Final</th>
                    </tr>
                    </thead>
                    <tbody>
                    {criteriaLoading ? (
                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                    ) : currentSystem.length > 0 ? (
                        currentSystem.map((group, coIndex) => (
                            <React.Fragment key={group.co}>
                                {group.ilos.map((ilo, iloIndex) => {
                                    const displayLabel = "ILO " + (iloIndex + 1);
                                    return (
                                        <tr key={group.co + "-" + ilo.id}>
                                            {iloIndex === 0 && (
                                                <td rowSpan={group.ilos.length} className={styles.coCell}>
                                                    <strong>{group.co}</strong>
                                                </td>
                                            )}
                                            <td className={styles.dataCellCenter}>
                                                <span style={{ fontWeight: '500' }}>{displayLabel}</span>
                                            </td>
                                            <td className={styles.dataCellCenter}>
                                                {renderInput(coIndex, iloIndex, 'assessments', false)}
                                            </td>
                                            <td className={stylesB.dataCellCenter}>
                                                {renderInput(coIndex, iloIndex, 'prelim', true)}
                                            </td>
                                            <td className={stylesB.dataCellCenter}>
                                                {renderInput(coIndex, iloIndex, 'midterm', true)}
                                            </td>
                                            <td className={stylesB.dataCellCenter}>
                                                {renderInput(coIndex, iloIndex, 'semi', true)}
                                            </td>
                                            <td className={stylesB.dataCellCenter}>
                                                {renderInput(coIndex, iloIndex, 'final', true)}
                                            </td>
                                            <td className={stylesB.dataCellCenter}>
                                                {renderInput(coIndex, iloIndex, 'minPassing', false)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>
                                No grading criteria configured.
                            </td>
                        </tr>
                    )}
                    {currentSystem.length > 0 && (
                        <tr className={styles.totalsRow}>
                            <td colSpan="3" className={styles.coCell} style={{ textAlign: 'right', paddingRight: '15px' }}>
                                <strong>TOTAL</strong>
                            </td>
                            <td className={stylesB.dataCellCenter}>
                                <strong>{calcTotalForPeriod('prelim', isEditing)}%</strong>
                            </td>
                            <td className={stylesB.dataCellCenter}>
                                <strong>{calcTotalForPeriod('midterm', isEditing)}%</strong>
                            </td>
                            <td className={stylesB.dataCellCenter}>
                                <strong>{calcTotalForPeriod('semi', isEditing)}%</strong>
                            </td>
                            <td className={stylesB.dataCellCenter}>
                                <strong>{calcTotalForPeriod('final', isEditing)}%</strong>
                            </td>
                            <td className={stylesB.dataCellCenter}></td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {showConfirm && (
                <div className="matrix-modal-overlay">
                    <div className="matrix-modal-content">
                        <div className="matrix-modal-title">Confirm Changes</div>
                        <div className="matrix-modal-text">
                            <strong>Caution:</strong> Criteria for Grading originates from the baseline TLA Assessment mappings. Continuing will permanently override these base metrics in the source syllabus tracking configuration.
                            <br/><br/>
                            Are you certain you want to push these new grading criteria?
                        </div>
                        <div className="matrix-modal-actions">
                            <button className="matrix-btn-cancel" onClick={() => setShowConfirm(false)} disabled={isSaving}>Cancel</button>
                            <button className="matrix-btn-confirm" onClick={handleSaveConfirm} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Yes, Modify Criteria'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default CriteriaForGrading;