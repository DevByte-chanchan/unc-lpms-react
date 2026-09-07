import React, { useState, useEffect } from 'react';
import { Inbox } from 'react-feather';

const CriteriaForGrading = ({ offeringID, revisionNum, status, styles, stylesB, fetchJson, isReadOnly = false }) => {
    const [cfgData, setCfgData] = useState([]);
    const [cfgLoading, setCfgLoading] = useState(false);
    const [cfgError, setCfgError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchCriteria() {
            setCfgLoading(true);
            setCfgError(null);
            try {
                const data = await fetchJson(`/api/course-criteria/${offeringID}/${revisionNum}`);
                if (!mounted) return;
                setCfgData(data ?? []);
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setCfgError(err.message);
            } finally {
                if (mounted) setCfgLoading(false);
            }
        }
        fetchCriteria();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    const handleEditToggle = () => {
        if (isEditing) {
            setShowConfirm(true);
        } else {
            setEditData(JSON.parse(JSON.stringify(cfgData)));
            setIsEditing(true);
        }
    };

    const handleTlaChange = (coIndex, iloIndex, tlaIndex, field, value) => {
        setEditData(prev => {
            const upd = [...prev];
            upd[coIndex].ilos[iloIndex].tlassessments[tlaIndex][field] = value;
            return upd;
        });
    };

    const handleSaveConfirm = async () => {
        try {
            await fetch(`/api/course-criteria/${offeringID}/${revisionNum}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ criteriaData: editData })
            });

            setCfgData(editData);
            setIsEditing(false);
            setShowConfirm(false);
        } catch (e) {
            console.error('Failed to save criteria', e);
        }
    };

    if (cfgLoading) return <div className={stylesB.loadingContainer}>Loading criteria for grading...</div>;
    if (cfgError) return <div className={stylesB.errorContainer}>Error: {cfgError}</div>;

    const renderInput = (value, coIndex, iloIndex, tlaIndex, field, type="number") => {
        if (!isEditing) return value !== null && value !== undefined ? (type === "number" && value > 0 ? value + '%' : value) : '';
        return (
            <input 
                type={type} 
                value={value || ''} 
                onChange={(e) => handleTlaChange(coIndex, iloIndex, tlaIndex, field, e.target.value)} 
                className={"matrix-edit-input " + (type==="number" ? "matrix-edit-center" : "")}
            />
        );
    };

    return (
        <div style={{ position: "relative" }}>
            {!isReadOnly && (
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
            )}

            <div className={stylesB.gradingContainer + " cfg-table-wrapper"} style={{ overflowX: "auto", paddingBottom: "15px", width: "100%" }}>
                <table className={stylesB.gradingTable}>
                    <thead>
                    <tr>
                        <th rowSpan="2" className={stylesB.labelCell} style={{ width: '10%' }}>Course Outcome</th>
                        <th rowSpan="2" className={stylesB.labelCell} style={{ minWidth: '80px' }}>ILO</th>
                        <th rowSpan="2" className={stylesB.labelCell} style={{ width: '35%' }}>Assessment Strategy</th>
                        <th colSpan="4" className={stylesB.labelCell} style={{ textAlign: "center" }}>Weight</th>
                        <th rowSpan="2" className={stylesB.labelCell} style={{ textAlign: "center", width: '10%' }}>Minimum Passing</th>
                    </tr>
                    <tr>
                        <th className={stylesB.labelCell} style={{ minWidth: '60px' }}>Prelim</th>
                        <th className={stylesB.labelCell} style={{ minWidth: '60px' }}>Midterm</th>
                        <th className={stylesB.labelCell} style={{ minWidth: '60px' }}>Semi</th>
                        <th className={stylesB.labelCell} style={{ minWidth: '60px' }}>Final</th>
                    </tr>
                    </thead>
                    <tbody>
                    {(isEditing ? editData : cfgData).length > 0 ? (
                        (isEditing ? editData : cfgData).map((co, coIndex) => (
                            <React.Fragment key={co.co_id}>
                                {co.ilos && co.ilos.length > 0 ? (
                                    co.ilos.map((ilo, iloIndex) => (
                                        <React.Fragment key={ilo.ilo_id}>
                                            {ilo.tlassessments && ilo.tlassessments.length > 0 ? (
                                                ilo.tlassessments.map((tla, tlaIndex) => (
                                                    <tr key={tla.tla_id}>
                                                        {iloIndex === 0 && tlaIndex === 0 && (
                                                            <td rowSpan={co.totalTlaCount} className={stylesB.outcomeCell}>
                                                                {co.co_description}
                                                            </td>
                                                        )}
                                                        {tlaIndex === 0 && (
                                                            <td rowSpan={ilo.tlassessments.length} className={stylesB.iloCell}>
                                                                {ilo.description}
                                                            </td>
                                                        )}
                                                        <td className={stylesB.assessmentCell}>
                                                            {renderInput(tla.assessment_tool, coIndex, iloIndex, tlaIndex, 'assessment_tool', 'text')}
                                                        </td>
                                                        <td className={stylesB.weightCell}>{renderInput(tla.prelim_weight, coIndex, iloIndex, tlaIndex, 'prelim_weight')}</td>
                                                        <td className={stylesB.weightCell}>{renderInput(tla.midterm_weight, coIndex, iloIndex, tlaIndex, 'midterm_weight')}</td>
                                                        <td className={stylesB.weightCell}>{renderInput(tla.semifinal_weight, coIndex, iloIndex, tlaIndex, 'semifinal_weight')}</td>
                                                        <td className={stylesB.weightCell}>{renderInput(tla.finals_weight, coIndex, iloIndex, tlaIndex, 'finals_weight')}</td>
                                                        <td className={stylesB.weightCell}>{renderInput(tla.minimum_passing, coIndex, iloIndex, tlaIndex, 'minimum_passing')}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr key={`empty-tla-${ilo.ilo_id}`}>
                                                    {iloIndex === 0 && (
                                                        <td rowSpan={co.totalTlaCount || 1} className={stylesB.outcomeCell}>
                                                            {co.co_description}
                                                        </td>
                                                    )}
                                                    <td className={stylesB.iloCell}>
                                                        {ilo.description}
                                                    </td>
                                                    <td colSpan="6" className={stylesB.emptyDataCell}>No assessments listed.</td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <tr key={`empty-ilo-${co.co_id}`}>
                                        <td className={stylesB.outcomeCell}>
                                            {co.co_description}
                                        </td>
                                        <td colSpan="7" className={stylesB.emptyDataCell}>No ILOs listed.</td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="8" className={stylesB.emptyDataCell}>
                                <div style={{ textAlign: 'center', padding: '30px' }}>
                                    <Inbox size={40} strokeWidth={1} style={{ display: 'block', margin: '0 auto 10px' }} />
                                    <span>No criteria for grading found.</span>
                                </div>
                            </td>
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
                            <strong>Caution:</strong> Grading criteria matrices calculate exact percentage weights across terms. Changing these can deeply affect student grading logic.
                            <br/><br/>
                            Are you certain you want to commit these weights?
                        </div>
                        <div className="matrix-modal-actions">
                            <button className="matrix-btn-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
                            <button className="matrix-btn-confirm" onClick={handleSaveConfirm}>Yes, Save Criteria</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CriteriaForGrading;