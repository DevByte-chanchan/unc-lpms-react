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
            // Deep copy courseOutcomes for editing
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
                    style={{
                        width: '100%',
                        border: 'none',
                        borderBottom: '2px solid #6366f1',
                        outline: 'none',
                        background: 'transparent',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        padding: '4px 0'
                    }}
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
        <section className="responsive-container-cpa">
            <style>
                {\`
                  .responsive-container-cpa { width: 100%; box-sizing: border-box; }
                  
                  .cpa-header-wrapper {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      flex-wrap: wrap;
                      gap: 12px;
                      margin-bottom: 16px;
                  }
                  
                  .oa-edit-btn {
                      background-color: #f3f4f6;
                      border: 1px solid #d1d5db;
                      color: #374151;
                      padding: 6px 16px;
                      border-radius: 4px;
                      font-size: 14px;
                      font-weight: 600;
                      cursor: pointer;
                      display: flex;
                      align-items: center;
                      gap: 6px;
                      transition: all 0.2s;
                  }
                  .oa-edit-btn:hover { background-color: #e5e7eb; }
                  .oa-edit-btn.save-mode { background-color: #6366f1; color: white; border-color: #4f46e5; }
                  .oa-edit-btn.save-mode:hover { background-color: #4f46e5; }

                  .oa-modal-overlay {
                      position: fixed;
                      top: 0; left: 0; right: 0; bottom: 0;
                      background: rgba(17, 24, 39, 0.4);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      z-index: 9999;
                  }
                  .oa-modal-content {
                      background: white;
                      padding: 24px;
                      border-radius: 8px;
                      width: 90%;
                      max-width: 450px;
                      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                  }
                  .oa-modal-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px; }
                  .oa-modal-text { font-size: 14px; color: #4b5563; margin-bottom: 20px; line-height: 1.5; }
                  .oa-modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
                  .oa-btn-cancel { padding: 8px 16px; background: #f3f4f6; color: #374151; border: none; border-radius: 4px; font-weight: 500; cursor: pointer; }
                  .oa-btn-confirm { padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 4px; font-weight: 500; cursor: pointer; }

                  /* Mobile Layout for Matrix */
                  @media (max-width: 900px) {
                      .mobile-matrix-table { display: block; border: 0 !important; }
                      .mobile-matrix-table thead { display: none; }
                      .mobile-matrix-table tbody { display: flex; flex-direction: column; gap: 16px; }
                      .mobile-matrix-table tr { 
                          display: flex; 
                          flex-direction: column; 
                          border: 1px solid #e5e7eb; 
                          border-radius: 6px; 
                          overflow: hidden; 
                      }
                      .mobile-matrix-table td.desc { 
                          background: #f9fafb; 
                          font-weight: bold; 
                          border-bottom: 1px solid #e5e7eb; 
                          padding: 12px; 
                      }
                      .mobile-matrix-table td.mapping {
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          padding: 8px 12px;
                          border-bottom: 1px solid #f3f4f6;
                      }
                      .mobile-matrix-table td.mapping:last-child { border-bottom: none; }
                      .mobile-matrix-table td.mapping::before {
                          content: attr(data-label);
                          font-weight: 600;
                          color: #6b7280;
                          font-size: 13px;
                      }
                      .cpa-header-wrapper { flex-direction: column; align-items: flex-start; }
                      .oa-edit-btn { align-self: flex-end; }
                  }
                \`}
            </style>

            <div className={stylesB['cpa-container']} style={{ padding: '0' }}>
                <div className="cpa-header-wrapper">
                    <div className={stylesB.legend} style={{ margin: 0, padding: 0, background: 'transparent' }}>
                        <span className={stylesB.legendTitle}>Legend:</span>
                        <div className={stylesB.legendItems}>
                            <span><strong>I</strong>  Introductory</span>
                            <span><strong>E</strong>  Enabling</span>
                            <span><strong>D</strong>  Demonstrative</span>
                        </div>
                    </div>
                    <button 
                        className={\`oa-edit-btn \${isEditing ? 'save-mode' : ''}\`} 
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
                    <table className={\`\${stylesB.alignmentTable} mobile-matrix-table\`}>
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
                                    <td className={\`\${stylesB.descCell} desc\`}>
                                        {co.description}
                                    </td>
                                    {(cpaData.programOutcomes.length > 0 ? cpaData.programOutcomes : Array(9).fill({key: 'PO?'})).map((po, poIndex) => (
                                        <td key={poIndex} className={\`\${stylesB.mappingCell} mapping\`} data-label={po.key}>
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
                <div className="oa-modal-overlay">
                    <div className="oa-modal-content">
                        <div className="oa-modal-title">Confirm Changes</div>
                        <div className="oa-modal-text">
                            <strong>Caution:</strong> Outcome alignments originate from the official curriculum map and should generally be maintained securely. Modifying these matrix allocations will globally reconfigure outcome chaining.
                            <br/><br/>
                            Are you certain you want to commit these alignments?
                        </div>
                        <div className="oa-modal-actions">
                            <button className="oa-btn-cancel" onClick={() => setShowConfirm(false)} disabled={isSaving}>Cancel</button>
                            <button className="oa-btn-confirm" onClick={handleSaveConfirm} disabled={isSaving}>
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