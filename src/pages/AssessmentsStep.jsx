import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { X, FileText, Plus, ChevronDown, ChevronUp, ChevronRight, Upload, Trash2, Download, Eye } from "react-feather";
import { useSearchParams } from "react-router-dom";
import layout from "../styles/QuestionCognitiveMapping.module.sass";
import { uploadAttachment, fetchAttachments, deleteAttachment, ACTIVE_PERIOD } from '../services/api.js';

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

const normalizeTopics = (topics) => {
    if (!Array.isArray(topics)) return [];
    return topics
        .map(t => {
            if (typeof t === 'string') return { title: t, subtopics: [] };
            if (t && typeof t === 'object') {
                const subs = t.subtopics || t.children || [];
                return {
                    title: t.title || t.name || '',
                    subtopics: subs.map(s => (typeof s === 'string' ? s : (s?.title || s?.name || ''))).filter(Boolean)
                };
            }
            return null;
        })
        .filter(t => t && t.title);
};

const TopicsPanel = ({ co, topics }) => {
    const list = normalizeTopics(topics);
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState({});
    return (
        <div style={{ borderTop: '1px solid #E5E7EB', background: '#fff' }}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={layout.topicsToggleBtn}
            >
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6B7280' }}>
                    Topics <span style={{ marginLeft: 6, padding: '1px 8px', borderRadius: 10, background: '#F1F3F5', color: '#4B5563', letterSpacing: 0 }}>{list.length}</span>
                </span>
                {open ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
            </button>
            {open && (
                <div style={{ padding: '0 0 8px 0' }}>
                    {list.length === 0 ? (
                        <div style={{ fontSize: 14, color: '#9CA3AF' }}>No topics defined for {co}.</div>
                    ) : (
                        <>
                            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {list.map((t, i) => {
                                    const hasSubs = t.subtopics.length > 0;
                                    const isOpen = !!expanded[i];
                                    return (
                                        <li key={i}>
                                            <div
                                                onClick={() => hasSubs && setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                                                className={layout.topicItemRow}
                                                style={{ cursor: hasSubs ? 'pointer' : 'default' }}
                                            >
                                                <span style={{ width: 22, color: '#9CA3AF', fontSize: 13, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                                                <span style={{ flex: 1 }}>{t.title}</span>
                                                {hasSubs && (isOpen ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />)}
                                            </div>
                                            {hasSubs && isOpen && (
                                                <ul style={{ margin: '0 0 6px 36px', padding: '0 0 0 14px', borderLeft: '2px solid #E5E7EB', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                    {t.subtopics.map((s, j) => (
                                                        <li key={j} style={{ fontSize: 13, color: '#4B5563', padding: '2px 0' }}>{s}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const UploadModal = ({ co, ilo, loading, onClose, onUpload }) => {
    const [file, setFile] = useState(null);
    const [type, setType] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);
    const valid = (f) => f && /\.(pdf|docx)$/i.test(f.name);
    const pick = (f) => {
        if (!f) return;
        if (!valid(f)) { alert('Only .pdf and .docx files are supported.'); return; }
        setFile(f);
    };
    const sizeLabel = file ? (file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`) : '';
    const options = [
        { value: 'objective', title: 'Objective', desc: 'Multiple choice, true/false, identification' },
        { value: 'non-objective', title: 'Non-objective', desc: 'Essay, problem solving, rubric-based' }
    ];
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, width: 480, maxWidth: '92%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>Upload file</div>
                        <div style={{ fontSize: 13, color: '#6B7280' }}>{co} · {ilo}</div>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex' }}><X size={20} /></button>
                </div>

                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div
                        onClick={() => inputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
                        style={{ border: `2px dashed ${dragOver ? '#19282C' : '#D1D5DB'}`, background: dragOver ? '#F3F4F6' : '#F9FAFB', borderRadius: 8, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.12s' }}
                    >
                        <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
                        {file ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                <FileText size={22} color="#4B5563" />
                                <div style={{ textAlign: 'left', minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{file.name}</div>
                                    <div style={{ fontSize: 12, color: '#6B7280' }}>{sizeLabel} · click to choose a different file</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Upload size={24} color="#6B7280" style={{ marginBottom: 8 }} />
                                <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>Drag a file here, or <span style={{ textDecoration: 'underline' }}>browse</span></div>
                                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>PDF or DOCX</div>
                            </>
                        )}
                    </div>

                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>This file is…</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {options.map(o => {
                                const selected = type === o.value;
                                return (
                                    <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', border: `1px solid ${selected ? '#19282C' : '#DDDFDF'}`, background: selected ? '#F3F4F6' : '#fff', borderRadius: 6, cursor: 'pointer' }}>
                                        <input type="radio" name="attachment-type" checked={selected} onChange={() => setType(o.value)} style={{ marginTop: 3, accentColor: '#19282C' }} />
                                        <span>
                                            <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{o.title}</span>
                                            <span style={{ display: 'block', fontSize: 12, color: '#6B7280' }}>{o.desc}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px', borderTop: '1px solid #E5E7EB' }}>
                    <button type="button" onClick={onClose} disabled={loading} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #DDDFDF', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                    <button
                        type="button"
                        onClick={() => onUpload(file, type)}
                        disabled={!file || !type || loading}
                        style={{ padding: '8px 22px', borderRadius: 6, border: '1px solid #19282C', background: '#19282C', color: '#fff', fontSize: 14, fontWeight: 500, cursor: (!file || !type || loading) ? 'not-allowed' : 'pointer', opacity: (!file || !type || loading) ? 0.5 : 1 }}
                    >
                        {loading ? 'Uploading…' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AssessmentsStep = ({
    outcomeData,
    questions,
    setQuestions,
    courseCode,
    examType = ACTIVE_PERIOD,
    readOnly = false
}) => {
    const [, setSearchParams] = useSearchParams();
    const [attachments, setAttachments] = useState([]);
    const [selectedIlo, setSelectedIlo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refOpen, setRefOpen] = useState(false);
    const itemRefs = useRef({});

    const flatIlos = useMemo(() => {
        if (!outcomeData || !outcomeData.length) return [];
        return outcomeData.flatMap(co => (co.ilos || []).map(ilo => ({ co: co.co, ilo: ilo.id })));
    }, [outcomeData]);

    useEffect(() => {
        if (outcomeData && outcomeData.length > 0 && outcomeData[0].ilos && outcomeData[0].ilos.length > 0) {
            const stillExists = selectedIlo && outcomeData.some(c => c.co === selectedIlo.co && c.ilos.some(i => i.id === selectedIlo.ilo));
            if (!stillExists) {
                setSelectedIlo({ co: outcomeData[0].co, ilo: outcomeData[0].ilos[0].id });
            }
        }
    }, [outcomeData, selectedIlo]);

    useEffect(() => {
        if (courseCode) {
            fetchAttachments(courseCode, examType).then(data => setAttachments(data)).catch(console.error);
        }
    }, [courseCode, examType]);

    const activeCoData = outcomeData?.find(c => c.co === selectedIlo?.co);
    const activeIloData = activeCoData?.ilos?.find(i => i.id === selectedIlo?.ilo);

    const [showUpload, setShowUpload] = useState(false);

    const handleUpload = async (file, type) => {
        if (!file || !type || !activeIloData) return;
        if (!activeIloData.iloDbId) {
            alert("Couldn't upload. Select an ILO and try again.");
            return;
        }
        setLoading(true);
        try {
            const att = await uploadAttachment(courseCode, examType, activeIloData.iloDbId, file, type);
            setAttachments(prev => [...prev, att]);
            setShowUpload(false);
        } catch (err) {
            alert(err.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAttachment = async (id) => {
        if (readOnly) return;
        if (!window.confirm("Are you sure? Point rows for this file will also be deleted.")) return;
        try {
            await deleteAttachment(courseCode, examType, id);
            setAttachments(prev => prev.filter(a => a.id !== id));
            setQuestions(prev => prev.filter(q => q.attachmentId !== id));
        } catch {
            alert('Failed to delete attachment');
        }
    };

    const addPointRow = (attachmentId) => {
        if (readOnly || !activeCoData || !activeIloData) return;
        setQuestions(prev => [...prev, {
            id: uid(),
            co: activeCoData.co,
            ilo: activeIloData.id,
            iloId: activeIloData.iloDbId,
            instruction: '',
            points: '',
            cognitiveLevel: '',
            span: 1,
            attachmentId
        }]);
    };

    const updatePointRow = (id, field, value) => {
        if (readOnly) return;
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const deletePointRow = (id) => {
        if (readOnly) return;
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    const getCognitiveLevelsForIlo = (iloId) => {
        if (iloId === 'ILO1') return ['Remembering', 'Understanding'];
        if (iloId === 'ILO2') return ['Applying', 'Analyzing'];
        if (iloId === 'ILO3') return ['Evaluating', 'Creating'];
        return ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];
    };

    const currentCounts = {};
    (outcomeData || []).forEach(co => {
        currentCounts[co.co] = { ilos: {} };
        (co.ilos || []).forEach(ilo => { currentCounts[co.co].ilos[ilo.id] = 0; });
    });
    (questions || []).forEach(q => {
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

    const totalRequired = (outcomeData || []).reduce((s, co) => s + (co.ilos || []).reduce((is, ilo) => is + (ilo.items || 0), 0), 0);
    const relevantQuestions = (questions || []).filter(q => (outcomeData || []).some(co => co.co === q.co));
    const totalCurrent = relevantQuestions.reduce((s, q) => s + (Number(q.points) || 0), 0);
    const isOverflow = totalCurrent > totalRequired;

    const activeAttachments = attachments.filter(a => a.iloId === activeIloData?.iloDbId);
    const activeUsed = currentCounts[activeCoData?.co]?.ilos[activeIloData?.id] || 0;
    const activeRequired = activeIloData?.items || 0;
    const activeRemaining = activeRequired - activeUsed;

    const handleIloKeyDown = (e, coName, iloName) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const curIdx = flatIlos.findIndex(x => x.co === coName && x.ilo === iloName);
        if (curIdx === -1) return;
        const targetIdx = e.key === 'ArrowDown' ? Math.min(flatIlos.length - 1, curIdx + 1) : Math.max(0, curIdx - 1);
        const target = flatIlos[targetIdx];
        if (target) {
            setSelectedIlo(target);
            const key = `${target.co}-${target.ilo}`;
            itemRefs.current[key]?.focus();
        }
    };

    const curIloIdx = flatIlos.findIndex(x => x.co === selectedIlo?.co && x.ilo === selectedIlo?.ilo);
    const isLastIlo = curIloIdx !== -1 && curIloIdx === flatIlos.length - 1;
    const nextIlo = !isLastIlo && curIloIdx !== -1 ? flatIlos[curIloIdx + 1] : null;

    const handleNextClick = () => {
        if (isLastIlo) {
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                next.set('section', 'TOS Summary');
                return next;
            });
        } else if (nextIlo) {
            setSelectedIlo(nextIlo);
            const key = `${nextIlo.co}-${nextIlo.ilo}`;
            itemRefs.current[key]?.focus();
        }
    };

    const typeBadge = (type) => type === 'objective'
        ? { label: 'Objective', bg: '#F1F3F5', color: '#4B5563' }
        : { label: 'Non-objective', bg: '#F1F3F5', color: '#4B5563' };

    const topicsList = normalizeTopics(activeCoData?.topics);

    return (
        <div className={layout.container} style={{ padding: '0 0 40px 0' }}>
            <div className={layout.mobileSelectWrap}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>
                    Select ILO
                </label>
                <select
                    value={`${selectedIlo?.co}-${selectedIlo?.ilo}`}
                    onChange={e => {
                        const [co, ilo] = e.target.value.split('-');
                        setSelectedIlo({ co, ilo });
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#fff', fontSize: 14, color: '#1A1A1A' }}
                >
                    {(outcomeData || []).map(co => (
                        <optgroup key={co.co} label={`${co.co} · ${co.description}`}>
                            {(co.ilos || []).map(ilo => (
                                <option key={`${co.co}-${ilo.id}`} value={`${co.co}-${ilo.id}`}>
                                    {co.co} · {ilo.id} ({currentCounts[co.co]?.ilos[ilo.id] || 0}/{ilo.items})
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            <div className={layout.twoColLayout}>
                {/* Left column list */}
                <div className={layout.leftSidebar}>
                    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 4 }}>
                            Points allocated
                        </div>
                        <div className={`${layout.railTotal} ${isOverflow ? layout.railTotalOver : totalCurrent === totalRequired ? layout.railTotalOk : ''}`} style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                            {totalCurrent} / {totalRequired}
                        </div>
                        <div className={layout.stripTrack}>
                            <div
                                className={`${layout.stripFill} ${isOverflow ? layout.stripFillOver : totalCurrent === totalRequired ? layout.stripFillOk : layout.stripFillUnder}`}
                                style={{
                                    width: `${totalRequired > 0 ? Math.min(100, (totalCurrent / totalRequired) * 100) : 0}%`
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, overflowY: 'auto', paddingRight: 2 }}>
                        {(outcomeData || []).map(co => (
                            <div key={co.co} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: '#6B7280',
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        padding: '2px 4px'
                                    }}
                                    title={`${co.co} · ${co.description}`}
                                >
                                    {co.co}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {(co.ilos || []).map(ilo => {
                                        const isSelected = selectedIlo?.co === co.co && selectedIlo?.ilo === ilo.id;
                                        const used = currentCounts[co.co]?.ilos[ilo.id] || 0;
                                        const status = getIloStatus(co.co, ilo.id, ilo.items);
                                        const key = `${co.co}-${ilo.id}`;
                                        return (
                                            <button
                                                key={key}
                                                ref={el => { itemRefs.current[key] = el; }}
                                                type="button"
                                                aria-current={isSelected ? 'true' : undefined}
                                                onClick={() => setSelectedIlo({ co: co.co, ilo: ilo.id })}
                                                onKeyDown={e => handleIloKeyDown(e, co.co, ilo.id)}
                                                className={`${layout.iloNavBtn} ${isSelected ? layout.iloNavBtnSelected : ''}`}
                                            >
                                                <span className={`${layout.statusDot} ${status === 'ok' ? layout.statusDotOk : status === 'over' ? layout.statusDotOver : layout.statusDotUnder}`} />
                                                <span style={{ flex: 1, textAlign: 'left', fontWeight: isSelected ? 600 : 500 }}>
                                                    {ilo.id}
                                                </span>
                                                <span className={status === 'over' ? layout.railCountOver : undefined} style={{ fontSize: 12, opacity: isSelected ? 0.9 : 0.7, fontVariantNumeric: 'tabular-nums' }}>
                                                    {used}/{ilo.items}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right content area */}
                <div className={layout.rightContent}>
                    {/* 1. Title with Bloom's Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                            {activeCoData?.co} · {activeIloData?.id}
                        </h3>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {getCognitiveLevelsForIlo(activeIloData?.id).map(lvl => (
                                <span
                                    key={lvl}
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 500,
                                        padding: '3px 10px',
                                        borderRadius: 12,
                                        background: '#F1F3F5',
                                        color: '#4B5563'
                                    }}
                                >
                                    {lvl}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 2. Strip card */}
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', padding: '12px 16px', marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                            <span style={{ color: '#1F2937' }}>
                                <strong>{activeUsed}</strong> of <strong>{activeRequired}</strong> points allocated
                            </span>
                            {activeRemaining < 0 ? (
                                <span className={`${layout.stripPill} ${layout.stripPillOver}`}>
                                    {Math.abs(activeRemaining)} over
                                </span>
                            ) : activeRemaining === 0 ? (
                                <span className={`${layout.stripPill} ${layout.stripPillOk}`}>
                                    0 remaining
                                </span>
                            ) : (
                                <span className={`${layout.stripPill} ${layout.stripPillMuted}`}>
                                    {activeRemaining} remaining
                                </span>
                            )}
                        </div>
                        <div className={layout.stripTrack}>
                            <div
                                className={`${layout.stripFill} ${activeUsed > activeRequired ? layout.stripFillOver : activeUsed === activeRequired ? layout.stripFillOk : layout.stripFillUnder}`}
                                style={{
                                    width: `${activeRequired > 0 ? Math.min(100, (activeUsed / activeRequired) * 100) : 0}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* 3. Collapsed Reference row */}
                    {activeCoData && activeIloData && (
                        <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, background: '#F9FAFB', marginBottom: 20, overflow: 'hidden' }}>
                            <button
                                type="button"
                                onClick={() => setRefOpen(o => !o)}
                                className={layout.refToggleBtn}
                            >
                                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B7280' }}>
                                    {activeCoData.co} {activeIloData.id} <span style={{ marginLeft: 6, padding: '1px 8px', borderRadius: 10, background: '#F1F3F5', color: '#4B5563', fontWeight: 600, letterSpacing: 0 }}>{topicsList.length} topics</span>
                                </span>
                                {refOpen ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
                            </button>
                            {refOpen && (
                                <div style={{ padding: '14px 16px 16px', borderTop: '1px solid #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 4 }}>
                                            Course Outcome · {activeCoData.co}
                                        </div>
                                        <div style={{ color: '#1F2937', fontSize: 14, lineHeight: 1.5 }}>
                                            {activeCoData.description}
                                        </div>
                                    </div>
                                    <div style={{ borderTop: '1px solid #F1F3F5', paddingTop: 12 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 4 }}>
                                            Intended Learning Outcome · {activeIloData.id}
                                        </div>
                                        <div style={{ color: '#1F2937', fontSize: 14, lineHeight: 1.5 }}>
                                            {activeIloData.description}
                                        </div>
                                    </div>
                                    <TopicsPanel co={activeCoData.co} topics={activeCoData.topics} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. Files Heading */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>Files</h4>
                    </div>

                    {/* 5 & 6. Files list / Empty state */}
                    {activeAttachments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px 20px', background: '#fff', border: '1px dashed #D1D5DB', borderRadius: 8, color: '#6B7280', marginBottom: 24 }}>
                            <FileText size={28} color="#9CA3AF" style={{ marginBottom: 8 }} />
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#1F2937', marginBottom: 4 }}>No files uploaded for this ILO yet</div>
                            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: readOnly ? 0 : 16 }}>
                                1. Upload a file &nbsp;·&nbsp; 2. Add its point rows
                            </div>
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => setShowUpload(true)}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 6, border: '1px solid #19282C', background: '#19282C', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                                >
                                    <Upload size={14} /> Upload file
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
                            {activeAttachments.map(att => {
                                const badge = typeBadge(att.type);
                                const rows = (questions || []).filter(q => Number(q.attachmentId) === Number(att.id));
                                const attPoints = rows.reduce((s, r) => s + (Number(r.points) || 0), 0);
                                const sizeStr = att.size ? (att.size > 1048576 ? `${(att.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(att.size / 1024))} KB`) : '';
                                const isPdf = (att.filepath || '').toLowerCase().endsWith('.pdf');
                                return (
                                    <div key={att.id} style={{ border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                                        <div className={layout.fileCardHeader}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                                <FileText size={18} color="#4B5563" style={{ flexShrink: 0 }} />
                                                <span style={{ fontWeight: 500, fontSize: 14, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {att.filename}
                                                </span>
                                                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: badge.bg, color: badge.color, fontWeight: 500, flexShrink: 0 }}>
                                                    {badge.label}
                                                </span>
                                                {sizeStr && (
                                                    <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>
                                                        {sizeStr}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                <span className={layout.ptsChip}>{attPoints} pts</span>
                                                {isPdf && (
                                                    <a
                                                        href={`/api/attachments/download/${encodeURIComponent(att.filepath)}?inline=1`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="View file"
                                                        aria-label="View file"
                                                        className={layout.iconBtn}
                                                    >
                                                        <Eye size={16} />
                                                    </a>
                                                )}
                                                <a
                                                    href={`/api/attachments/download/${encodeURIComponent(att.filepath)}`}
                                                    download={att.filename}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="Download file"
                                                    aria-label="Download file"
                                                    className={layout.iconBtn}
                                                >
                                                    <Download size={16} />
                                                </a>
                                                {!readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                        title="Delete file"
                                                        aria-label="Delete file"
                                                        className={layout.iconBtn}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ padding: '4px 16px 14px' }}>
                                            <div className={layout.pointTable} role="table" aria-label="Point rows">
                                                <div className={layout.pointHeadRow} role="row">
                                                    <span className={layout.pointTh} role="columnheader">Item reference</span>
                                                    <span className={layout.pointTh} role="columnheader">Points</span>
                                                    <span className={layout.pointTh} role="columnheader">Bloom's level</span>
                                                    <span className={layout.pointTh} role="columnheader"></span>
                                                </div>
                                                {rows.map(row => (
                                                    <div key={row.id} className={layout.pointRow} role="row">
                                                        <div className={layout.pointField} role="cell">
                                                            <span className={layout.pointFieldLabel}>Item reference</span>
                                                            <input
                                                                type="text"
                                                                value={row.instruction || row.question || ''}
                                                                onChange={e => updatePointRow(row.id, 'instruction', e.target.value)}
                                                                placeholder="e.g. Items 1-10"
                                                                aria-label="Item reference"
                                                                className={layout.pointCell}
                                                                readOnly={readOnly}
                                                            />
                                                        </div>
                                                        <div className={layout.pointField} role="cell">
                                                            <span className={layout.pointFieldLabel}>Points</span>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={row.points}
                                                                onChange={e => updatePointRow(row.id, 'points', e.target.value.replace(/[^0-9]/g, ''))}
                                                                placeholder="0"
                                                                aria-label="Points"
                                                                className={layout.pointCell}
                                                                readOnly={readOnly}
                                                            />
                                                        </div>
                                                        <div className={layout.pointField} role="cell">
                                                            <span className={layout.pointFieldLabel}>Bloom's level</span>
                                                            <select
                                                                value={row.cognitiveLevel}
                                                                onChange={e => updatePointRow(row.id, 'cognitiveLevel', e.target.value)}
                                                                aria-label="Bloom's level"
                                                                className={layout.pointSelect}
                                                                disabled={readOnly}
                                                            >
                                                                <option value="">Select level...</option>
                                                                {getCognitiveLevelsForIlo(activeIloData?.id).map(lvl => (
                                                                    <option key={lvl} value={lvl}>{lvl}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className={`${layout.pointField} ${layout.pointFieldActions}`} role="cell">
                                                            {!readOnly && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deletePointRow(row.id)}
                                                                    title="Remove row"
                                                                    aria-label="Delete row"
                                                                    className={layout.pointDelBtn}
                                                                >
                                                                    <X size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {rows.length === 0 && (
                                                    <div className={layout.pointEmptyRow} role="row">
                                                        <span role="cell">No point rows added yet.</span>
                                                    </div>
                                                )}
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => addPointRow(att.id)}
                                                    className={layout.addRowQuiet}
                                                >
                                                    <Plus size={14} /> Add row
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => setShowUpload(true)}
                                    className={layout.uploadSecondary}
                                >
                                    <Upload size={14} /> Upload another file
                                </button>
                            )}
                        </div>
                    )}

                    {/* 7. Footer: Next ILO / Continue to TOS Summary */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
                        <button
                            type="button"
                            onClick={handleNextClick}
                            className={`${layout.nextBtn} ${getIloStatus(activeCoData?.co, activeIloData?.id, activeRequired) === 'ok' ? layout.nextBtnDone : ''}`}
                        >
                            {isLastIlo ? 'Continue to TOS Summary' : `Next: ${nextIlo?.co} · ${nextIlo?.ilo}`}
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {showUpload && (
                <UploadModal
                    ilo={activeIloData?.id}
                    co={activeCoData?.co}
                    loading={loading}
                    onClose={() => !loading && setShowUpload(false)}
                    onUpload={handleUpload}
                />
            )}
        </div>
    );
};

export default AssessmentsStep;
