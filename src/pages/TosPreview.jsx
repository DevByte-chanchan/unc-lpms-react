import React, { useState, useEffect, useRef, useCallback } from "react";
import layout from "../styles/TOSPreview.module.sass";
import { useNavigate } from "react-router-dom";
import { updateStatus, saveOutcomes, saveItems, updateCourse } from '../services/api.js';

const TOSPreview = ({ isOpen, onClose, outcomeData, questions, courseName = "Human & Computer Interaction", semester = "1st Semester", schoolYear, courseCode, assessmentName, examType }) => {
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
            totalItems: r.totalItems || 0,
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
            choices: (q.choices || []).filter(c => (c.text || '').trim()),
            rubricRows: (q.rubricRows || []).filter(r => (r.name || '').trim() || (r.description || '').trim()),
        }));
        Promise.all([
            saveOutcomes(courseCode, outcomesPayload),
            saveItems(courseCode, cleanQuestions),
            assessmentName ? updateCourse(courseCode, { assessmentName }) : Promise.resolve()
        ]).then(() => updateStatus(courseCode, 'pending')).catch(() => updateStatus(courseCode, 'pending'))
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
    const totalItems = outcomeData.reduce((sum, co) => sum + (co.totalItems || 0), 0);

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
                        <span className={layout.assessmentName}>Assessment: <span>{assessmentName || ''}</span></span>
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
                            value={examType || assessmentName || 'Midterm'}
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
                        <th rowSpan={2} className={layout.headerCell}>No. of Items</th>
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
                                    <div className={layout.cellBox}>{co.totalItems || 0}</div>
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
                                            <div className={layout.cellBox} style={{ flexDirection: 'column', gap: 2 }}>
                                                {items.length === 0 ? '—' : items.map((item, i) => (
                                                    <span key={i}>{item.span} x {item.points}</span>
                                                ))}
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
                </div>
                    </>
                ) : (
                    <div className={`${layout.assessmentBody} ${layout.tabContent}`}>
                        <div className={layout.assessmentList}>
                            {questions.length === 0 ? (
                                <div className={layout.emptyState}>
                                    <div className={layout.emptyIcon}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14 2 14 8 20 8"/>
                                            <line x1="16" y1="13" x2="8" y2="13"/>
                                            <line x1="16" y1="17" x2="8" y2="17"/>
                                            <polyline points="10 9 9 9 8 9"/>
                                        </svg>
                                    </div>
                                    <p className={layout.emptyText}>No assessment items yet</p>
                                </div>
                            ) : (
                                (() => {
                                    let c = 0;
                                    const slots = questions.map(q => { const s = c + 1; c += (q.span || 1); return s; });
                                    return questions.map((q, i) => {
                                        const start = slots[i];
                                        const end = start + (q.span || 1) - 1;
                                        const label = start === end ? String(start) : `${start}–${end}`;
                                        const hasRubric = q.rubricRows && q.rubricRows.length > 0;
                                        return (
                                            <div key={q.id} className={layout.assessmentItem}>
                                                <div className={layout.assessmentQuestion}>
                                                    <span className={layout.questionNumber}>{label}.</span>
                                                    <span className={layout.questionText}>{q.question || '(no question)'}</span>
                                                </div>
                                                {q.choices && q.choices.length > 0 && (
                                                    <div className={`${layout.assessmentChoices} ${q.choices.length % 2 === 0 && q.choices.every(c => (c.text || '').length < 30) ? layout.choicesGrid : ''}`}>
                                                        {q.choices.map((choice, ci) => (
                                                            <div key={choice.id || ci} className={layout.choiceRow}>
                                                                <span className={layout.choiceLetter}>{String.fromCharCode(65 + ci)}.</span>
                                                                <span className={layout.choiceText}>{choice.text || ''}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {hasRubric && (
                                                    <div className={layout.rubricBox}>
                                                        <div className={layout.rubricHeader}>
                                                            <span className={layout.rubricLabel}>Rubrics</span>
                                                        </div>
                                                        <div className={layout.rubricTable}>
                                                            <div className={`${layout.rubricRow} ${layout.rubricHeaderRow}`}>
                                                                <span className={layout.rubricName}>Criteria</span>
                                                                <span className={layout.rubricDesc}>Description</span>
                                                                <span className={layout.rubricWeight}>Weight</span>
                                                                <span className={layout.rubricPts}>Pts</span>
                                                            </div>
                                                             {(() => {
                                                                   const totalPts = Number(q.points) || 0;
                                                                   const rawPts = q.rubricRows.map(r => Math.round((totalPts * Number(r.weight || 0)) / 100));
                                                                   const sumPrev = rawPts.slice(0, -1).reduce((s, v) => s + v, 0);
                                                                   const rowPts = rawPts.length > 0
                                                                       ? [...rawPts.slice(0, -1), Math.max(0, totalPts - sumPrev)]
                                                                       : [];
                                                                   const totalW = q.rubricRows.reduce((s, r) => s + Number(r.weight || 0), 0);
                                                                   const wOk = Math.round(totalW) === 100;
                                                                   return (
                                                                      <>
                                                                          {q.rubricRows.map((row, ri) => (
                                                                              <div key={row.id || ri} className={layout.rubricRow}>
                                                                                  <span className={layout.rubricName}>{row.name || ''}</span>
                                                                                  <span className={layout.rubricDesc}>{row.description || ''}</span>
                                                                                   <span className={layout.rubricWeight}>{Math.round(Number(row.weight) || 0)}%</span>
                                                                                  <span className={layout.rubricPts}>{rowPts[ri]}</span>
                                                                              </div>
                                                                          ))}
                                                                           <div className={`${layout.rubricRow} ${layout.rubricTotalRow}`}>
                                                                               <span className={layout.rubricName}><strong>Total</strong></span>
                                                                               <span className={layout.rubricDesc}></span>
                                                                               <span className={layout.rubricWeight}>{Math.round(totalW)}%</span>
                                                                               <span className={layout.rubricPts}><strong>{totalPts}</strong></span>
                                                                           </div>
                                                                      </>
                                                                  );
                                                              })()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()
                            )}
                        </div>
                    </div>
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