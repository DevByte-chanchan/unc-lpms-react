import React, { useState, useEffect, useRef } from "react";
import layout from "../styles/TOSPreview.module.sass";
import { useNavigate } from "react-router-dom";
import { updateStatus, saveOutcomes, saveItems, updateCourse, ACTIVE_PERIOD } from '../services/api.js';
import AssessmentOutput from "../components/AssessmentOutput.jsx";

const TOSPreview = ({ isOpen, onClose, outcomeData = [], questions = [], courseName = "Human & Computer Interaction", semester = "1st Semester", schoolYear, courseCode, assessmentName, examType = ACTIVE_PERIOD }) => {
    
    const [showConfirm, setShowConfirm] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [activeTab, setActiveTab] = useState('tosReport');
    const navigate = useNavigate();
    const countdownRef = useRef(null);

    const handleSubmitApproval = () => {
        setShowConfirm(true);
        setCountdown(5);
    };

    const handleConfirm = () => {
        if (countdownRef.current) clearTimeout(countdownRef.current);
        const goToTable = () => navigate("/assignedtos", { state: { tosStatusUpdate: { courseName, newStatus: 'pending' }, initialStatus: 'pending' } });
        if (!courseCode) { goToTable(); return; }
        const outcomesPayload = outcomeData.map(r => ({
            id: r.dbId,
            co: r.co,
            description: r.description || '',
            totalPoints: r.totalPoints || 0,
            ilos: (r.ilos || []).map(ilo => ({
                iloDbId: ilo.iloDbId,
                description: ilo.description || '',
                hours: ilo.hours || 0,
                percentage: ilo.percentage || 0,
                items: ilo.items || 0
            }))
        }));
        const cleanQuestions = questions.map(q => ({
            ...q,
            
            rubricRows: (q.rubricRows || []).filter(r => (r.name || '').trim() || (r.description || '').trim()),
        }));
        const period = examType || ACTIVE_PERIOD;
        Promise.all([
            saveOutcomes(courseCode, outcomesPayload),
            saveItems(courseCode, period, cleanQuestions),
            assessmentName ? updateCourse(courseCode, { assessmentName }) : Promise.resolve()
        ]).then(() => updateStatus(courseCode, period, 'pending')).catch(() => updateStatus(courseCode, period, 'pending'))
        .then(goToTable);
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

    // Aggregate cognitive data (list of items per CO-ILO-level)
    const getAggregatedData = () => {
        const data = {};
        outcomeData.forEach(co => {
            data[co.co] = {};
            co.ilos.forEach(ilo => {
                data[co.co][ilo.id] = {};
                cognitiveLevels.forEach(level => {
                    data[co.co][ilo.id][level] = [];
                });
            });
        });

        questions.forEach(q => {
            if (q.co && q.ilo && q.cognitiveLevel && q.points && data[q.co] && data[q.co][q.ilo]) {
                data[q.co][q.ilo][q.cognitiveLevel].push({ span: q.span || 1, points: Number(q.points) });
            }
        });

        return data;
    };

    const aggregatedData = getAggregatedData();
    const totalHours = outcomeData.reduce((sum, co) => sum + (co.totalHours || 0), 0);
    const totalPercentage = Math.min(outcomeData.reduce((sum, co) => sum + (co.totalPercentage || 0), 0), 100);
    const totalPoints = outcomeData.reduce((sum, co) => sum + (co.totalPoints || 0), 0);

    const totalCognitive = cognitiveLevels.map(level => {
        return outcomeData.reduce((sum, co) => {
            return sum + co.ilos.reduce((iloSum, ilo) => {
                const items = aggregatedData[co.co][ilo.id][level];
                return iloSum + items.reduce((s, item) => s + item.points, 0);
            }, 0);
        }, 0);
    });

    if (!isOpen) return null;

    return (
        <div className={layout.modalOverlay}>
            <div className={layout.modalContent}>

                <div className={layout.headerRow}>
                    <div>
                        <h2 className={layout.previewTitle}>TOS Document Preview</h2>
                    </div>
                    <div className={layout.pillToggle}>
                        <div className={layout.pillSlider} style={{ transform: `translateX(${activeTab === 'tosReport' ? '0' : 'calc(100% + 2px)'})` }} />
                        <button className={`${layout.pillOption} ${activeTab === 'tosReport' ? layout.pillActive : ''}`} onClick={() => setActiveTab('tosReport')}>
                            TOS Report
                        </button>
                        <button className={`${layout.pillOption} ${activeTab === 'assessment' ? layout.pillActive : ''}`} onClick={() => setActiveTab('assessment')}>
                            Assessment
                        </button>
                    </div>
                </div>

                {activeTab === 'tosReport' && (
                <div className={layout.headerFields}>
                    <div className={layout.topRow}>
                        <label>Course:</label>
                        <input
                            type="text"
                            disabled
                            value={courseCode ? `${courseCode}${courseName ? ` - ${courseName}` : ''}` : courseName}
                            className={layout.numberInput}
                        />
                        <label>Type:</label>
                        <input
                            type="text"
                            disabled
                            value={examType || assessmentName}
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
                )}

                {activeTab === 'tosReport' ? (
                    <>
                <div className={layout.tableWrapper}>
                <table className={`${layout.qctable} ${layout.TOSTable}`} style={{ width: '100%' }}>
                    <thead>
                    <tr>
                        <th rowSpan={2} className={layout.headerCell}>COs & ILOs</th>
                        <th rowSpan={2} className={layout.headerCell}>No. of Hours</th>
                        <th rowSpan={2} className={layout.headerCell}>%</th>
                        <th rowSpan={2} className={layout.headerCell}>Points</th>
                        <th colSpan={6} className={layout.headerCell}>
                            Cognitive Levels
                        </th>
                    </tr>
                    <tr className={layout['sub-column']}>
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
                                    <div className={layout.cellBox} style={{fontWeight: "bold"}}>{co.co}</div>
                                </td>
                                <td>
                                    <div className={layout.cellBox}>{co.totalHours || 0}</div>
                                </td>
                                <td>
                                    <div className={layout.cellBox}>{co.totalPercentage || 0}</div>
                                </td>
                                <td>
                                    <div className={layout.cellBox}>{co.totalPoints || 0}</div>
                                </td>
                                {cognitiveLevels.map(level => (
                                    <td key={level} className={layout.mutedCell}>
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
                                    {cognitiveLevels.map(level => {
                                        const items = aggregatedData[co.co][ilo.id][level];
                                        return (
                                        <td key={level}>
                                            <div className={layout.cellBox}>
                                                {(() => {
                                                    const pts = items.reduce((s, item) => s + (Number(item.points) || 0), 0);
                                                    return pts > 0 ? pts : '—';
                                                })()}
                                            </div>
                                        </td>
                                        );
                                    })}
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
                            <div className={layout.cellBox}>{totalPoints}</div>
                        </td>
                        {totalCognitive.map((total, index) => (
                            <td key={index}>
                                <div className={layout.cellBox}>{total}</div>
                            </td>
                        ))}
                    </tr>
                    </tbody>
                </table>
                </div>
                    </>
                ) : (
                    <AssessmentOutput
                        outcomeData={outcomeData}
                        questions={questions}
                        courseCode={courseCode}
                        period={examType || ACTIVE_PERIOD}
                    />
                )}
                <div className={`${layout.exportButtonContainer} ${activeTab === 'assessment' ? layout.noBorderTop : ''}`}>
                    <button className={layout.export} onClick={handleSubmitApproval}>
                        Submit for approval
                    </button>
                    <button className={layout.cancelBtn} onClick={onClose}>
                        Cancel
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






