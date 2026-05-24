import React, { useState, useEffect, useRef } from "react";
import layout from "../styles/TOSPreview.module.sass";
import { useNavigate } from "react-router-dom";
import { updateStatus } from '../services/api.js';

const TOSPreview = ({ isOpen, onClose, outcomeData, questions, courseName = "Human & Computer Interaction", semester = "1st Sem", schoolYear = "2024 - 2025", courseCode }) => {
    if (!isOpen) return null;

    const [showConfirm, setShowConfirm] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const navigate = useNavigate();
    const countdownRef = useRef(null);

    const handleSubmitApproval = () => {
        setShowConfirm(true);
        setCountdown(5);
    };

    const handleConfirm = () => {
        if (countdownRef.current) clearTimeout(countdownRef.current);
        if (courseCode) updateStatus(courseCode, 'pending').catch(() => {});
        navigate("/assignedtos", { state: { tosStatusUpdate: { courseName, newStatus: 'pending' } } });
    };

    useEffect(() => {
        if (!showConfirm) return;
        if (countdown === 0) { handleConfirm(); return; }
        countdownRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
    }, [showConfirm, countdown]);

    const cognitiveLevels = [
        'Remembering',
        'Understanding',
        'Applying',
        'Analyzing',
        'Evaluating',
        'Creating'
    ];

    // Aggregate cognitive data (counts and sums per CO-ILO-level)
    const getAggregatedData = () => {
        const data = {};
        outcomeData.forEach(co => {
            data[co.co] = {};
            co.ilos.forEach(ilo => {
                data[co.co][ilo.id] = {};
                cognitiveLevels.forEach(level => {
                    data[co.co][ilo.id][level] = { count: 0, sumPoints: 0 };
                });
            });
        });

        questions.forEach(q => {
            if (q.co && q.ilo && q.cognitiveLevel && q.points) {
                data[q.co][q.ilo][q.cognitiveLevel].count += 1;
                data[q.co][q.ilo][q.cognitiveLevel].sumPoints += Number(q.points);
            }
        });

        return data;
    };

    const aggregatedData = getAggregatedData();
    const totalHours = outcomeData.reduce((sum, co) => sum + (co.totalHours || 0), 0);
    const totalPercentage = outcomeData.reduce((sum, co) => sum + (co.totalPercentage || 0), 0);
    const totalItems = outcomeData.reduce((sum, co) => sum + (co.totalItems || 0), 0);

    const totalCognitive = cognitiveLevels.map(level => {
        return outcomeData.reduce((sum, co) => {
            return sum + co.ilos.reduce((iloSum, ilo) => iloSum + (aggregatedData[co.co][ilo.id][level].sumPoints || 0), 0);
        }, 0);
    });

    return (
        <div className={layout.modalOverlay}>
            <div className={layout.modalContent}>
                <button className={layout.closeButton} onClick={onClose}>×</button>
                <h2 className={layout.previewTitle}>TOS Document Preview</h2>

                <div className={layout.headerFields}>
                    <div className={layout.topRow}>
                        <label>Course:</label>
                        <input
                            type="text"
                            disabled
                            value={courseName}
                            className={layout.numberInput}
                        />
                        <label>Exam:</label>
                        <input
                            type="text"
                            disabled
                            value="Midterm"
                            className={layout.numberInput}
                        />
                    </div>
                    <div className={layout.bottomRow}>
                        <label>Semester:</label>
                        <input
                            type="text"
                            disabled
                            value={semester}
                            className={layout.numberInput}
                        />
                        <label>School Year:</label>
                        <input
                            type="text"
                            disabled
                            value={schoolYear}
                            className={layout.numberInput}
                        />
                    </div>
                </div>
                {/* Table */}
                <table className={`${layout.qctable} ${layout.TOSTable}`} style={{ width: '100%', marginBottom: '20px' }}>
                    <thead>
                    <tr>
                        <th>COs & ILOs</th>
                        <th>No. of Hours</th>
                        <th>%</th>
                        <th>No. of Items</th>
                        <th style={{justifyContent: "center", width: "800px"}}>
                            Cognitive Levels
                        </th>
                    </tr>
                    <tr className={layout['sub-column']}>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        {cognitiveLevels.map(level => (
                            <th key={level} className={layout.lighten}>{level}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {outcomeData.map(co => (
                        <React.Fragment key={co.co}>
                            {/* CO Row */}
                            <tr style={{background: "#F9FAFB", height: '50px'}}>
                                <td>
                                    <div className={layout.cellBox} style={{fontSize: '16px', fontWeight: "bold"}}>{co.co}</div>
                                </td>
                                <td>
                                    <div className={layout.cellBox} style={{fontSize: '16px'}}>{co.totalHours || 0}</div>
                                </td>
                                <td>
                                    <div className={layout.cellBox} style={{fontSize: '16px'}}>{co.totalPercentage || 0}</div>
                                </td>
                                <td>
                                    <div className={layout.cellBox} style={{fontSize: '16px'}}>{co.totalItems || 0}</div>
                                </td>
                                {cognitiveLevels.map(level => (
                                    <td key={level}>
                                    </td>
                                ))}
                            </tr>
                            {/* ILO Rows */}
                            {co.ilos.map(ilo => (
                                <tr key={ilo.id}>
                                    <td>
                                        <div className={layout.cellBox}>{ilo.id}</div>
                                    </td>
                                    <td>
                                        <div className={layout.cellBox}>{ilo.hours || 0}</div>
                                    </td>
                                    <td>
                                        <div className={layout.cellBox}>{ilo.percentage || 0}</div>
                                    </td>
                                    <td>
                                        <div className={layout.cellBox}>{ilo.items || 0}</div>
                                    </td>
                                    {cognitiveLevels.map(level => (
                                        <td key={level}>
                                            <div className={layout.cellBox}>
                                                {aggregatedData[co.co][ilo.id][level].count > 0
                                                    ? `${aggregatedData[co.co][ilo.id][level].count} x ${aggregatedData[co.co][ilo.id][level].sumPoints}`
                                                    : '—'
                                                }
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                    {/* Total Row */}
                    <tr style={{background: "#F9FAFB", height: '50px', fontWeight: '500'}} >
                        <td>
                            <div className={layout.cellBox}>Total</div>
                        </td>
                        <td>
                            <div className={layout.cellBox}>{totalHours}</div>
                        </td>
                        <td>
                            <div className={layout.cellBox}>{totalPercentage}</div>
                        </td>
                        <td>
                            <div className={layout.cellBox}>{totalItems}</div>
                        </td>
                        {totalCognitive.map((total, index) => (
                            <td key={index}>
                                <div className={layout.cellBox}>{total}</div>
                            </td>
                        ))}
                    </tr>
                    </tbody>
                </table>
                <div className={layout.exportButtonContainer}>
                    <button className={layout.export} onClick={handleSubmitApproval}>
                        Submit for approval
                    </button>
                </div>
            </div>

            {showConfirm && (
                <div className={layout.modalOverlay} onClick={handleConfirm}>
                    <div className={layout.confirmPopup} onClick={e => e.stopPropagation()}>
                        <div className={layout.confirmTextRow}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#19282C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <p className={layout.confirmText}>Submitting TOS for approval</p>
                        </div>
                        <div className={layout.spinner} />
                        <span className={layout.countdown}>{countdown}s</span>
                        <button className={layout.undoBtn} onClick={() => { if (countdownRef.current) clearTimeout(countdownRef.current); setShowConfirm(false); }}>Undo</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TOSPreview;