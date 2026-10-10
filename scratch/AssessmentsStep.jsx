import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, FileText, Plus, Check, ChevronDown, ChevronUp, Upload, Trash2 } from "react-feather";
import layout from "../styles/QuestionCognitiveMapping.module.sass";
import { uploadAttachment, fetchAttachments, deleteAttachment } from '../services/api.js';

let _uid = 0;
const uid = () => `${++_uid}_${Math.random().toString(36).slice(2, 6)}`;

export const AutoResizeTextarea = React.forwardRef(({ value, ...props }, ref) => {
    const innerRef = useRef(null);
    const taRef = ref || innerRef;
    useLayoutEffect(() => {
        const el = taRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    });
    return <textarea ref={taRef} {...props} value={value} />;
});

const TrackerPanel = ({ outcomeData, currentCounts, totalRequired, totalCurrent, isOverflow, getIloStatus }) => (
    <div className={layout.tPanel}>
        <div className={layout.tHeader}>
            <span className={layout.tTitle}>Points Allocation</span>
            <span className={`${layout.tTotalPill} ${isOverflow ? layout.tTotalOver : totalCurrent === totalRequired ? layout.tTotalOk : layout.tTotalUnder}`}>
                {totalCurrent} / {totalRequired}
            </span>
        </div>
        <div className={layout.tBody}>
            {outcomeData.map(co => (
                <div key={co.co} className={layout.tCoBlock}>
                    <div className={layout.tCoTitle}>{co.co}</div>
                    {co.ilos.map(ilo => {
                        const used = currentCounts[co.co]?.ilos[ilo.id] || 0;
                        const status = getIloStatus(co.co, ilo.id, ilo.items);
                        const pct = ilo.items > 0 ? Math.min(100, (used / ilo.items) * 100) : (used > 0 ? 100 : 0);
                        return (
                            <div key={ilo.id} className={layout.tIloRow}>
                                <div className={layout.tIloHeader}>
                                    <span className={layout.tIloLabel}>{ilo.id}</span>
                                    <div className={layout.tIloRight}>
                                        <span className={layout.tIloUsed}>{used} / {ilo.items}</span>
                                        {status === 'ok' ? <Check size={14} className={layout.tIconOk} /> :
                                         status === 'over' ? <span className={layout.tIconOver}>!</span> : null}
                                    </div>
                                </div>
                                <div className={layout.tBarBg}>
                                    <div className={`${layout.tBarFill} ${status === 'ok' ? layout.tBarOk : status === 'over' ? layout.tBarOver : layout.tBarUnder}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    </div>
);

const AssessmentsStep = ({
    outcomeData,
    questions,
    setQuestions,
    courseCode,
    examType,
    readOnly = false
}) => {
    const [attachments, setAttachments] = useState([]);
    const [selectedIlo, setSelectedIlo] = useState(null);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (outcomeData && outcomeData.length > 0 && outcomeData[0].ilos && outcomeData[0].ilos.length > 0) {
            const stillExists = selectedIlo && outcomeData.some(c => c.co === selectedIlo.co && c.ilos.some(i => i.id === selectedIlo.ilo));
            if (!stillExists) {
                setSelectedIlo({ co: outcomeData[0].co, ilo: outcomeData[0].ilos[0].id });
            }
        }
    }, [outcomeData]);

    useEffect(() => {
        if (courseCode) {
            fetchAttachments(courseCode, examType).then(data => setAttachments(data)).catch(console.error);
        }
    }, [courseCode]);

    const activeCoData = outcomeData.find(c => c.co === selectedIlo?.co);
    const activeIloData = activeCoData?.ilos.find(i => i.id === selectedIlo?.ilo);

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            const att = await uploadAttachment(courseCode, activeIloData.iloDbId, file, type);
            setAttachments(prev => [...prev, att]);
        } catch (err) {
            alert(err.message || 'Upload failed');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleDeleteAttachment = async (id) => {
        if (!window.confirm("Are you sure? Point rows for this file will also be deleted.")) return;
        try {
            await deleteAttachment(courseCode, id);
            setAttachments(prev => prev.filter(a => a.id !== id));
            setQuestions(prev => prev.filter(q => q.attachmentId !== id));
        } catch (err) {
            alert('Failed to delete attachment');
        }
    };

    const addPointRow = (attachmentId) => {
        setQuestions(prev => [...prev, {
            id: uid(),
            co: activeCoData.co,
            ilo: activeIloData.id,
            iloId: activeIloData.iloDbId,
            instruction: '', // used as item reference
            points: '',
            cognitiveLevel: '',
            span: 1, // default span 1 for logic compatibility
            attachmentId
        }]);
    };

    const updatePointRow = (id, field, value) => {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const deletePointRow = (id) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    const getCognitiveLevelsForIlo = (iloId) => {
        if (iloId === 'ILO1') return ['Remembering', 'Understanding'];
        if (iloId === 'ILO2') return ['Applying', 'Analyzing'];
        if (iloId === 'ILO3') return ['Evaluating', 'Creating'];
        return ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];
    };

    const currentCounts = {};
    outcomeData.forEach(co => {
        currentCounts[co.co] = { ilos: {} };
        co.ilos.forEach(ilo => { currentCounts[co.co].ilos[ilo.id] = 0; });
    });
    questions.forEach(q => {
        if (q.co && q.ilo && currentCounts[q.co]) {
            currentCounts[q.co].ilos[q.ilo] += (Number(q.points) || 0);
        }
    });

    const getIloStatus = (co, ilo, required) => {
        const used = currentCounts[co]?.ilos[ilo] || 0;
        if (used === required) return 'ok';
        if (used > required) return 'over';
        return 'under';
    };

    const totalRequired = outcomeData.reduce((s, co) => s + co.ilos.reduce((is, ilo) => is + (ilo.items || 0), 0), 0);
    const relevantQuestions = questions.filter(q => outcomeData.some(co => co.co === q.co));
    const totalCurrent = relevantQuestions.reduce((s, q) => s + (Number(q.points) || 0), 0);
    const isOverflow = totalCurrent > totalRequired;

    const activeAttachments = attachments.filter(a => a.iloId === activeIloData?.iloDbId);

    return (
        <div className={layout.container}>
            <div className={layout.mainContent} style={{ paddingRight: 320 }}>
                <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Assessments</h2>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {outcomeData.map(co => co.ilos.map(ilo => (
                            <button 
                                key={`${co.co}-${ilo.id}`}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 4,
                                    border: '1px solid #E5E7EB',
                                    background: selectedIlo?.co === co.co && selectedIlo?.ilo === ilo.id ? '#111' : '#fff',
                                    color: selectedIlo?.co === co.co && selectedIlo?.ilo === ilo.id ? '#fff' : '#111',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setSelectedIlo({ co: co.co, ilo: ilo.id })}
                            >
                                {co.co} - {ilo.id}
                            </button>
                        )))}
                    </div>
                </div>

                {activeCoData && activeIloData && (
                    <div style={{ background: '#F9FAFB', padding: 20, borderRadius: 8, marginBottom: 20, border: '1px solid #E5E7EB' }}>
                        <div style={{ marginBottom: 12 }}>
                            <strong style={{ color: '#374151' }}>Course Outcome:</strong> 
                            <span style={{ marginLeft: 8, color: '#4B5563' }}>{activeCoData.description}</span>
                        </div>
                        <div>
                            <strong style={{ color: '#374151' }}>Intended Learning Outcome:</strong> 
                            <span style={{ marginLeft: 8, color: '#4B5563' }}>{activeIloData.description}</span>
                        </div>
                        {activeCoData.topics && activeCoData.topics.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <strong style={{ color: '#374151' }}>Topics:</strong>
                                <ul style={{ margin: '4px 0 0 20px', color: '#4B5563', fontSize: 14 }}>
                                    {activeCoData.topics.map((t, idx) => <li key={idx}>{t}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginBottom: 30 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Attachments</h3>
                        {!readOnly && (
                            <div style={{ display: 'flex', gap: 10 }}>
                                <label style={{ cursor: 'pointer', background: '#3B82F6', color: '#fff', padding: '6px 12px', borderRadius: 4, fontSize: 14 }}>
                                    <Upload size={14} style={{ marginRight: 6 }} /> Objective File
                                    <input type="file" style={{ display: 'none' }} accept=".pdf,.docx" onChange={(e) => handleFileUpload(e, 'objective')} disabled={loading} />
                                </label>
                                <label style={{ cursor: 'pointer', background: '#10B981', color: '#fff', padding: '6px 12px', borderRadius: 4, fontSize: 14 }}>
                                    <Upload size={14} style={{ marginRight: 6 }} /> Non-Objective File
                                    <input type="file" style={{ display: 'none' }} accept=".pdf,.docx" onChange={(e) => handleFileUpload(e, 'non-objective')} disabled={loading} />
                                </label>
                            </div>
                        )}
                    </div>

                    {activeAttachments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#fff', border: '1px dashed #D1D5DB', borderRadius: 8, color: '#9CA3AF' }}>
                            No attachments for this ILO yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {activeAttachments.map(att => (
                                <div key={att.id} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 16, background: '#fff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <FileText size={20} color={att.type === 'objective' ? '#3B82F6' : '#10B981'} />
                                            <span style={{ fontWeight: 500 }}>{att.filename}</span>
                                            <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 12, background: att.type === 'objective' ? '#DBEAFE' : '#D1FAE5', color: att.type === 'objective' ? '#1E40AF' : '#065F46' }}>
                                                {att.type}
                                            </span>
                                        </div>
                                        {!readOnly && (
                                            <button onClick={() => handleDeleteAttachment(att.id)} style={{ color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>
                                        <h4 style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Point Rows</h4>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 13, textAlign: 'left' }}>
                                                    <th style={{ padding: '8px 0', width: '50%' }}>Item Reference</th>
                                                    <th style={{ padding: '8px 0', width: '20%' }}>Points</th>
                                                    <th style={{ padding: '8px 0', width: '25%' }}>Cognitive Level</th>
                                                    <th style={{ padding: '8px 0', width: '5%' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {questions.filter(q => q.attachmentId === att.id).map(row => (
                                                    <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        <td style={{ padding: '8px 0', paddingRight: 10 }}>
                                                            <input 
                                                                type="text" 
                                                                value={row.instruction} 
                                                                onChange={e => updatePointRow(row.id, 'instruction', e.target.value)}
                                                                placeholder="e.g. Items 1-10"
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #D1D5DB' }}
                                                                readOnly={readOnly}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px 0', paddingRight: 10 }}>
                                                            <input 
                                                                type="text" 
                                                                inputMode="numeric"
                                                                value={row.points} 
                                                                onChange={e => updatePointRow(row.id, 'points', e.target.value.replace(/[^0-9]/g, ''))}
                                                                placeholder="0"
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #D1D5DB' }}
                                                                readOnly={readOnly}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px 0', paddingRight: 10 }}>
                                                            <select 
                                                                value={row.cognitiveLevel} 
                                                                onChange={e => updatePointRow(row.id, 'cognitiveLevel', e.target.value)}
                                                                style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #D1D5DB', background: '#fff' }}
                                                                disabled={readOnly}
                                                            >
                                                                <option value="">Select level...</option>
                                                                {getCognitiveLevelsForIlo(activeIloData?.id).map(lvl => (
                                                                    <option key={lvl} value={lvl}>{lvl}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                                            {!readOnly && (
                                                                <button onClick={() => deletePointRow(row.id)} style={{ color: '#9CA3AF', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                                                    <X size={16} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {questions.filter(q => q.attachmentId === att.id).length === 0 && (
                                                    <tr>
                                                        <td colSpan="4" style={{ padding: '16px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No point rows added yet.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                        {!readOnly && (
                                            <button onClick={() => addPointRow(att.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#3B82F6', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                <Plus size={16} /> Add Point Row
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <div style={{ position: 'fixed', right: 20, top: 180, width: 280 }}>
                <TrackerPanel 
                    outcomeData={outcomeData}
                    currentCounts={currentCounts}
                    totalRequired={totalRequired}
                    totalCurrent={totalCurrent}
                    isOverflow={isOverflow}
                    getIloStatus={getIloStatus}
                />
            </div>
        </div>
    );
};

export default AssessmentsStep;
