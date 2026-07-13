import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    X, FileText,
    Plus, Check, ChevronDown, ChevronUp
} from "react-feather";
import layout from "../styles/QuestionCognitiveMapping.module.sass";
import tosLayout from "../styles/TosSections.module.sass";
import { saveItems, updateCourse } from '../services/api.js';

// ─── UID ─────────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => `${++_uid}_${Math.random().toString(36).slice(2, 6)}`;

// ─── makeItem ─────────────────────────────────────────────────────────────────
const makeItem = (spanVal) => ({
    id: uid(),
    instruction: '',
    span: spanVal || 1,
    choices: [],
    rubricRows: [],
    showRubric: false,
    points: String(spanVal || 1),
});

// ─── Weight distribution ──────────────────────────────────────────────────────
const distributeWeights = (rows, totalPts) => {
    if (!rows.length) return rows;
    const even = Math.floor(100 / rows.length);
    const rem  = 100 - even * (rows.length - 1);
    const ptsRows = rows.map((r, i) => {
        const w = i === rows.length - 1 ? rem : even;
        const pts = totalPts ? Math.round((w / 100) * totalPts) : 0;
        return { ...r, weight: String(w), pts: String(pts) };
    });
    if (totalPts && ptsRows.length > 0) {
        const sum = ptsRows.reduce((s, r) => s + (Number(r.pts) || 0), 0);
        if (sum !== Math.round(totalPts)) {
            const last = ptsRows.length - 1;
            const diff = Math.round(totalPts) - (sum - (Number(ptsRows[last].pts) || 0));
            ptsRows[last] = { ...ptsRows[last], pts: String(Math.max(0, diff)) };
        }
    }
    return ptsRows;
};

// ─── AutoResizeTextarea ────────────────────────────────────────────────────────
const AutoResizeTextarea = React.forwardRef(({ value, ...props }, ref) => {
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

// ─── RubricRow ────────────────────────────────────────────────────────────────
const RubricRow = ({ row, itemPoints, totalWeight, rowPoints, nameError, onChange, onRemove, readOnly }) => {
    const isOver = totalWeight > 100;
    const nameRef = useRef(null);
    const descRef = useRef(null);
    const weightRef = useRef(null);
    const ptsRef = useRef(null);
    useEffect(() => {
        const els = [nameRef.current, descRef.current, weightRef.current, ptsRef.current].filter(Boolean);
        if (els.length < 2) return;
        els.forEach(el => { el.style.height = 'auto'; });
        const maxH = Math.max(...els.map(el => el.scrollHeight));
        els.forEach(el => { el.style.height = maxH + 'px'; });
    });
    return (
        <div className={layout.bRubricRow}>
            <AutoResizeTextarea
                ref={nameRef}
                className={`${layout.bRubricName}${nameError ? ` ${layout.bRubricNameErr}` : ''}`}
                placeholder="Criteria"
                value={row.name}
                rows={1}
                readOnly={readOnly}
                onChange={e => {
                    const v = e.target.value;
                    if (v.startsWith(' ')) return;
                    onChange({ ...row, name: v }, 'name');
                }}
                onBlur={e => {
                    const trimmed = e.target.value.trim();
                    if (trimmed !== e.target.value) onChange({ ...row, name: trimmed }, 'name');
                }}
            />
            <AutoResizeTextarea
                ref={descRef}
                className={layout.bRubricDesc}
                placeholder="Description"
                value={row.description}
                rows={1}
                readOnly={readOnly}
                onChange={e => {
                    const v = e.target.value;
                    if (v.startsWith(' ')) return;
                    onChange({ ...row, description: v }, 'description');
                }}
                onBlur={e => {
                    const trimmed = e.target.value.trim();
                    if (trimmed !== e.target.value) onChange({ ...row, description: trimmed }, 'description');
                }}
            />
            <AutoResizeTextarea
                ref={weightRef}
                className={`${layout.bRubricWeightIn}${isOver ? ` ${layout.bRubricWeightErr}` : ''}`}
                placeholder="0"
                value={row.weight ? row.weight + '%' : ''}
                rows={1}
                readOnly={readOnly}
                onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    const num = Math.min(Number(raw) || 0, 100);
                    onChange({ ...row, weight: String(num) }, 'weight');
                }}
            />
            <AutoResizeTextarea
                ref={ptsRef}
                className={layout.bRubricPts}
                placeholder="0"
                value={rowPoints !== undefined ? String(rowPoints) : ''}
                rows={1}
                readOnly={readOnly}
                onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    const num = Math.min(Number(raw) || 0, 999);
                    onChange({ ...row, pts: String(num) }, 'pts');
                }}
            />
            {!readOnly && (
                <button className={layout.bIconRemove} onClick={onRemove} title="Remove">
                    <X size={12} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
};

// ─── AssessmentBuilder ────────────────────────────────────────────────────────
const AssessmentBuilder = ({ totalSlots, initialItems, onSaveReturn, builderSaveRef, onProgressUpdate, highlightKey, assessmentName, onAssessmentNameChange, assessmentNames = ['Midterm Exam', 'Final Exam', 'Written Exam', 'Practical Exam', 'Oral Exam', 'Quiz', 'Project', 'Assignment', 'Periodic Exam'], showDuplicateWarning, duplicateIds, onDismissDuplicateWarning, readOnly = false, showComments }) => {
    const [selectedAssessment, setSelectedAssessment] = useState(assessmentName || '');
    const [spanEdit, setSpanEdit] = useState(null);
    const [warnData, setWarnData] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [highlightActive, setHighlightActive] = useState(false);
    const [duplicateHighlightKey, setDuplicateHighlightKey] = useState(0);

    const buildSlotMap = (its) => {
        let c = 0;
        return its.map(it => { const s = c + 1; c += (it.span || 1); return s; });
    };

    const initItems = () => {
        if (initialItems && initialItems.length > 0) {
            const hasContent = initialItems.some(q => (q.question || q.rubricItem || '').trim().length > 0);
            if (hasContent) {
                return initialItems.map(q => {
                    const rubricRows = (q.rubricRows || []).map(r => {
                        const pts = Number(r.pts || 0);
                        const weight = Number(r.weight || 0);
                        const totalPts = Number(q.points || 0);
                        return {
                            ...r,
                            pts: pts ? String(pts) : weight && totalPts ? String(Math.round((weight / 100) * totalPts)) : '',
                        };
                    });
                    const sumPts = rubricRows.reduce((s, r) => s + (Number(r.pts || 0) || 0), 0);
                    return {
                        id: q.id || uid(),
                        instruction: q.question || q.rubricItem || '',
                        span: q.span || 1,
                        choices: (q.choices || []).map(c =>
                            typeof c === 'string' ? { id: uid(), text: c } : { ...c }
                        ),
                        rubricRows,
                        showRubric: rubricRows.length > 0,
                        points: rubricRows.length > 0 ? String(sumPts) : (q.points || ''),
                    };
                });
            }
        }
        return Array.from({ length: totalSlots }, () => makeItem(1));
    };

    const [items, setItems] = useState(initItems);
    const upd = (id, fn) => setItems(p => p.map(it => it.id === id ? fn(it) : it));

    // Report real-time filled count to parent nav
    useEffect(() => {
        if (!onProgressUpdate) return;
        const filled = items.reduce((s, it) => {
            const hasContent = (it.instruction || '').trim().length > 0;
            return s + (hasContent ? (it.span || 1) : 0);
        }, 0);
        onProgressUpdate(filled);
    }, [items, onProgressUpdate]);

    // Auto-populate blank items when totalSlots increases
    useEffect(() => {
        setItems(prev => {
            const consumed = prev.reduce((s, it) => s + (it.span || 1), 0);
            if (consumed >= totalSlots) return prev;
            const needed = totalSlots - consumed;
            return [...prev, ...Array.from({ length: needed }, () => makeItem(1))];
        });
    }, [totalSlots]);

    // Auto-remove blank items when totalSlots decreases
    useEffect(() => {
        setItems(prev => {
            let currentConsumed = prev.reduce((s, it) => s + (it.span || 1), 0);
            if (currentConsumed <= totalSlots) return prev;
            
            let next = [...prev];
            let i = next.length - 1;
            while (currentConsumed > totalSlots && i >= 0) {
                const item = next[i];
                const hasContent = (item.instruction || '').trim().length > 0 || item.choices.length > 0 || item.rubricRows.length > 0;
                if (hasContent) { i--; continue; }
                currentConsumed -= (item.span || 1);
                next.splice(i, 1);
                i--;
            }
            return next;
        });
    }, [totalSlots]);

    const consumed = items.reduce((s, it) => s + (it.span || 1), 0);
    const canSave  = consumed === totalSlots;
    const slotMap  = buildSlotMap(items);

    useEffect(() => {
        if (!spanEdit) return;
        const handler = (e) => {
            const el = document.querySelector(`[data-span-edit="${spanEdit.id}"]`);
            if (el && !el.contains(e.target)) {
                setSpanEdit(null);
            }
        };
        const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handler);
        };
    }, [spanEdit]);

    const tryCommitSpan = (id, endNum) => {
        const idx = items.findIndex(it => it.id === id);
        if (idx === -1 || isNaN(endNum)) { setSpanEdit(null); return; }
        const startItem = slotMap[idx];
        const endItem   = Math.max(startItem, Math.min(Math.round(endNum), totalSlots));
        const newSpan   = endItem - startItem + 1;
        const curSpan   = items[idx].span || 1;
        if (newSpan === curSpan) { setSpanEdit(null); return; }

        if (newSpan > curSpan) {
            const toRemove = [];
            const splits = [];
            const newEnd = startItem + newSpan - 1;
            for (let i = idx + 1; i < items.length; i++) {
                const itemSpan = items[i].span || 1;
                const itemEnd  = slotMap[i] + itemSpan - 1;
                if (slotMap[i] >= startItem + newSpan) break;
                toRemove.push(items[i].id);
                if (itemEnd > newEnd) {
                    const remaining = itemEnd - newEnd;
                    splits.push({
                        ...makeItem(remaining),
                        id: uid(),
                        instruction: items[i].instruction || '',
                        choices: items[i].choices.map(c => ({ ...c })),
                        rubricRows: items[i].rubricRows.map(r => ({ ...r })),
                        showRubric: items[i].showRubric,
                        points: items[i].points || '',
                    });
                }
            }
            const fullyLost = toRemove.filter(rid => {
                const fi = items.findIndex(x => x.id === rid);
                if (fi === -1) return true;
                return (slotMap[fi] + (items[fi].span || 1) - 1) <= newEnd;
            });
            const hasFilledAbsorbed = fullyLost.some(rid => {
                const it = items.find(x => x.id === rid);
                return it && ((it.instruction || '').trim().length > 0 || it.choices.length || it.rubricRows.length);
            });
            if (hasFilledAbsorbed) { setWarnData({ id, newSpan, toRemove, splits }); return; }
            applySpan(id, newSpan, toRemove, splits);
        } else {
            applySpan(id, newSpan, []);
        }
        setSpanEdit(null);
    };

    const applySpan = (id, newSpan, toRemove, splits = []) => {
        setItems(prev => {
            const idx = prev.findIndex(it => it.id === id);
            if (idx === -1) return prev;
            const curSpan = prev[idx].span || 1;
            const diff = newSpan - curSpan;
            let next = prev.map((it, i) => i === idx ? { ...it, span: newSpan } : it);
            next = next.filter(it => !toRemove.includes(it.id));
            if (splits.length > 0) {
                next = [...next.slice(0, idx + 1), ...splits, ...next.slice(idx + 1)];
            }
            if (diff < 0) {
                const blanks = Array.from({ length: -diff }, () => makeItem(1));
                next = [...next.slice(0, idx + 1), ...blanks, ...next.slice(idx + 1)];
            }
            return next;
        });
        setSpanEdit(null);
        setWarnData(null);
    };

    const commitSpan = (id) => {
        if (!spanEdit || spanEdit.id !== id) return;
        tryCommitSpan(id, parseInt(spanEdit.draft, 10));
    };

    const shrinkSpan = (id) => {
        const idx = items.findIndex(it => it.id === id);
        if (idx === -1) return;
        const cur = items[idx].span || 1;
        if (cur <= 1) return;
        applySpan(id, cur - 1, []);
    };

    const clearItem = (id) => upd(id, it => ({ ...makeItem(it.span), id: it.id }));
    const deleteItem = (id) => {
        const target = items.find(it => it.id === id);
        if (!target) return;
        const consumed = items.reduce((s, it) => s + (it.span || 1), 0);
        const excess = consumed - totalSlots;
        const targetSpan = target.span || 1;
        if (targetSpan > excess) {
            setItems(prev => prev.map(it => it.id === id ? { ...it, span: targetSpan - excess } : it));
            return;
        }
        const afterConsumed = items.reduce((s, it) => it.id === id ? s : s + (it.span || 1), 0);
        if (afterConsumed < totalSlots) return;
        setDeletingId(id);
        setTimeout(() => {
            setItems(prev => prev.filter(it => it.id !== id));
            setDeletingId(null);
        }, 300);
    };
    const addChoice = (id) => upd(id, it => ({ ...it, choices: [...it.choices, { id: uid(), text: '' }] }));
    const updChoice = (id, cid, v) => upd(id, it => ({ ...it, choices: it.choices.map(c => c.id === cid ? { ...c, text: v } : c) }));
    const remChoice = (id, cid) => upd(id, it => ({ ...it, choices: it.choices.filter(c => c.id !== cid) }));
    const addRubric = (id) => upd(id, it => {
        const rows = distributeWeights([...it.rubricRows, { id: uid(), name: '', description: '', weight: '', pts: '' }], Number(it.points) || 0);
        const sumPts = rows.reduce((s, r) => s + (Number(r.pts || 0) || 0), 0);
        return { ...it, showRubric: true, rubricRows: rows, points: String(sumPts || 0) };
    });
    const updRubric = (id, rid, row, changedField) => upd(id, it => {
        const oldRow = it.rubricRows.find(r => r.id === rid);
        if (!oldRow) return it;

        if (changedField === 'weight') {
            const newW = Math.min(Number(row.weight) || 0, 100);
            const others = it.rubricRows.filter(r => r.id !== rid);
            const totalOther = others.reduce((s, r) => s + (Number(r.weight) || 0), 0);
            const remaining = Math.max(0, 100 - newW);

            let raw = others.map((r, i) => {
                const prop = totalOther > 0 ? (Number(r.weight) || 0) / totalOther : 1 / others.length;
                const w = Math.round(remaining * prop);
                return { id: r.id, weight: w };
            });
            if (others.length > 0) {
                const sum = raw.reduce((s, r) => s + r.weight, 0);
                const last = raw.length - 1;
                raw[last] = { ...raw[last], weight: Math.max(0, remaining - (sum - raw[last].weight)) };
            }
            const newRows = it.rubricRows.map(r => {
                if (r.id === rid) return { ...r, weight: String(newW) };
                const f = raw.find(o => o.id === r.id);
                return { ...r, weight: f ? String(f.weight) : '0' };
            });
            const origTotal = Number(it.points) || 0;
            const ptsRows = newRows.map(r => ({ ...r, pts: String(origTotal ? Math.round((Number(r.weight) / 100) * origTotal) : 0) }));
            const pSum = ptsRows.reduce((s, r) => s + (Number(r.pts) || 0), 0);
            if (pSum !== origTotal && ptsRows.length > 0) {
                const last = ptsRows.length - 1;
                const diff = origTotal - (pSum - (Number(ptsRows[last].pts) || 0));
                ptsRows[last] = { ...ptsRows[last], pts: String(Math.max(0, diff)) };
            }
            const sumPts = ptsRows.reduce((s, r) => s + (Number(r.pts || 0) || 0), 0);
            return { ...it, rubricRows: ptsRows, points: String(sumPts || 0) };
        }

        if (changedField === 'pts') {
            const newPts = Number(row.pts) || 0;
            let newRows = it.rubricRows.map(r => r.id === rid ? { ...r, pts: String(newPts) } : { ...r });
            const totalPts = newRows.reduce((s, r) => s + (Number(r.pts || 0) || 0), 0);
            const wRows = newRows.map((r, i) => ({
                ...r,
                weight: String(totalPts > 0 ? Math.min(Math.round((Number(r.pts || 0) / totalPts) * 100), 100) : 0),
            }));
            const wSum = wRows.reduce((s, r) => s + (Number(r.weight) || 0), 0);
            if (wSum !== 100 && wRows.length > 0) {
                const last = wRows.length - 1;
                const diff = 100 - (wSum - (Number(wRows[last].weight) || 0));
                wRows[last] = { ...wRows[last], weight: String(Math.max(0, Math.min(diff, 100))) };
            }
            return { ...it, rubricRows: wRows, points: String(totalPts) };
        }

        const newRows = it.rubricRows.map(r => r.id === rid ? { ...row } : r);
        return { ...it, rubricRows: newRows };
    });
    const remRubric = (id, rid) => upd(id, it => {
        const next = distributeWeights(it.rubricRows.filter(r => r.id !== rid), Number(it.points) || 0);
        const sumPts = next.reduce((s, r) => s + (Number(r.pts || 0) || 0), 0);
        return { ...it, rubricRows: next, showRubric: next.length > 0, points: String(sumPts || (it.points || '')) };
    });
    const togRubric = (id) => upd(id, it => ({ ...it, showRubric: !it.showRubric }));

    const exportItems = () => {
        const data = JSON.stringify(items.map(it => ({
            item: it.instruction, span: it.span, points: it.points,
            choices: it.choices.map(c => c.text), rubric: it.rubricRows,
        })), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'assessment-items.json'; a.click();
        URL.revokeObjectURL(url);
    };

    const doSave = async () => {
        const exMap = new Map(initialItems?.map(it => [it.id, it]) || []);
        await onSaveReturn(items.map(it => {
            const ex = exMap.get(it.id) || {};
            return {
                id: it.id,
                question: it.instruction,
                rubricItem: '',
                choices: it.choices,
                rubricRows: it.rubricRows,
                span: it.span || 1,
                co: ex.co || '',
                ilo: ex.ilo || '',
                iloId: ex.iloId || null,
                points: it.points || ex.points || '',
                cognitiveLevel: ex.cognitiveLevel || '',
            };
        }));
    };

    const save = async () => {
        await doSave();
    };

    useEffect(() => {
        if (builderSaveRef) {
            builderSaveRef.current = save;
        }
    });

    // Highlight empty items when returning from post-save warning
    useEffect(() => {
        if (!highlightKey) return;
        const emptyItem = items.find(it => !(it.instruction || '').trim());
        if (!emptyItem) return;
        setHighlightActive(true);
        const scrollTimer = setTimeout(() => {
            const el = document.querySelector(`[data-item-id="${emptyItem.id}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        const t = setTimeout(() => setHighlightActive(false), 7000);
        return () => { clearTimeout(t); clearTimeout(scrollTimer); };
    }, [highlightKey]);

    // Highlight duplicate items when Fix is clicked
    useEffect(() => {
        if (!duplicateHighlightKey || !duplicateIds?.length) return;
        setHighlightActive(true);
        const scrollTimer = setTimeout(() => {
            const el = document.querySelector(`[data-item-id="${duplicateIds[0]}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        const t = setTimeout(() => setHighlightActive(false), 7000);
        return () => { clearTimeout(t); clearTimeout(scrollTimer); };
    }, [duplicateHighlightKey]);

    // Pre-build warn message so we have full scope
    const warnMessage = (() => {
        if (!warnData) return null;
        const currentSlotMap = buildSlotMap(items);
        const absorbedItems  = warnData.toRemove
            .map(rid => { const idx = items.findIndex(x => x.id === rid); return idx >= 0 ? { it: items[idx], idx } : null; })
            .filter(Boolean);
        const labels = absorbedItems.map(({ it, idx }) => {
            const start = currentSlotMap[idx];
            const end   = start + (it.span || 1) - 1;
            return start === end ? 'Item ' + start : 'Items ' + start + '–' + end;
        });
        return labels.join(', ');
    })();

    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const el = document.querySelector('[data-bscroll]');
        if (!el) return;
        const handler = () => setShowScrollTop(el.scrollTop > 200);
        el.addEventListener('scroll', handler);
        return () => el.removeEventListener('scroll', handler);
    }, []);

    return (
        <div className={layout.bPage}>

            {/* ── Warning dialog ── */}
            {warnData && (
                <div className={tosLayout.modalOverlay}>
                    <div className={tosLayout.modal}>
                        <div className={tosLayout.modalHeader}>
                            <h3 style={{ color: "#1A1A1A" }}>Items with content will be removed</h3>
                            <span style={{ cursor: "pointer", fontSize: "20px", color: "#999" }} onClick={() => { setWarnData(null); setSpanEdit(null); }}>×</span>
                        </div>
                        <div className={tosLayout.modalBody}>
                            <p style={{ color: "#555" }}><strong>{warnMessage}</strong> already {warnData.toRemove.length === 1 ? 'has' : 'have'} content. Expanding this item will permanently remove {warnData.toRemove.length === 1 ? 'it' : 'them'}. Do you wish to proceed?</p>
                        </div>
                        <div className={tosLayout.modalActions}>
                            <button className={tosLayout.cancelBtn} style={{ background: "#f9f9f9", color: "#374151" }} onClick={() => { setWarnData(null); setSpanEdit(null); }}>Cancel</button>
                            <button className={tosLayout.confirmBtn} style={{ background: "#1A1A1A" }} onMouseEnter={e => e.target.style.backgroundColor = '#444'} onMouseLeave={e => e.target.style.backgroundColor = '#1A1A1A'} onClick={() => applySpan(warnData.id, warnData.newSpan, warnData.toRemove, warnData.splits || [])}>
                                Yes, proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Duplicate Warning Dialog ── */}
            {showDuplicateWarning && duplicateIds?.length > 0 && (
                <div className={tosLayout.modalOverlay}>
                    <div className={tosLayout.modal}>
                        <div className={tosLayout.modalHeader}>
                            <h3 style={{ color: "#1A1A1A" }}>Duplicate Questions Found</h3>
                        </div>
                        <div className={tosLayout.modalBody}>
                            <p style={{ color: "#555" }}>Some items have the exact same content. Please review and fix them before saving.</p>
                        </div>
                        <div className={tosLayout.modalActions}>
                            <button className={tosLayout.confirmBtn} style={{ background: "#1A1A1A" }} onMouseEnter={e => e.target.style.backgroundColor = '#444'} onMouseLeave={e => e.target.style.backgroundColor = '#1A1A1A'} onClick={() => { setDuplicateHighlightKey(k => k + 1); onDismissDuplicateWarning?.(); }}>
                                Fix
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Assessment Name Selector ── */}
            <div className={layout.bAssessBar}>
                <label className={layout.bAssessLabel}>Assessment Name:</label>
                <select
                    className={layout.bAssessSelect}
                    value={selectedAssessment}
                    disabled={readOnly}
                    style={readOnly ? { opacity: 1, pointerEvents: 'none' } : undefined}
                    onChange={e => { setSelectedAssessment(e.target.value); onAssessmentNameChange?.(e.target.value); }}
                >
                    <option value="" disabled>Select assessment</option>
                    {assessmentNames.length === 0 && (
                        <option value="" disabled>No assessments available</option>
                    )}
                    {assessmentNames.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            {/* ── Scrollable content ── */}
            <div className={layout.bScroll} data-bscroll>
                {/* ── Item cards ── */}
                <div className={layout.bList}>
                    {items.map((item, idx) => {
                        const span       = item.span || 1;
                        const startItem  = slotMap[idx];
                        const endItem    = startItem + span - 1;
                        const isEditing  = spanEdit?.id === item.id;
                        const totalWeight = item.rubricRows.reduce((s, r) => s + Number(r.weight || 0), 0);
                        const wOk  = Math.round(totalWeight) === 100;
                        const wOver = totalWeight > 100;

                        const showDelete = consumed > totalSlots || items.length > totalSlots;

                        return (
                                <div key={item.id} className={`${layout.bItemWrap} ${deletingId === item.id ? layout.bItemDeleting : ''}`} data-item-id={item.id}>
                                <div className={`${layout.bCard} ${showDelete ? layout.bCardDelMode : ''} ${highlightActive && (!(item.instruction || '').trim() || duplicateIds?.includes(item.id)) ? layout.bCardIncomplete : ''}`}>

                                    {/* ── Card header ── */}
                                    <div className={layout.bCardHead}>
                                        <div className={layout.bCardHeadLeft}>
                                    <span className={layout.bItemRangeLabel}>
                                        {span === 1 ? `Item ${startItem}` : `Item ${startItem} – ${endItem}`}
                                    </span>

                                            {isEditing ? (
                                                <div className={layout.bSpanEditRow} data-span-edit={item.id}>
                                                    <span className={layout.bSpanEditHint}>to item</span>
                                                    <input
                                                        className={layout.bSpanInput}
                                                        placeholder={String(endItem + 1)}
                                                        value={spanEdit.draft}
                                                        autoFocus
                                                        onFocus={e => e.target.select()}
                                                        onChange={e => {
                                                            const v = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '') || '';
                                                            const num = parseInt(v, 10);
                                                            setSpanEdit({ id: item.id, draft: num > totalSlots ? String(totalSlots) : v });
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') commitSpan(item.id);
                                                            if (e.key === 'Escape') setSpanEdit(null);
                                                        }}
                                                    />
                                                    <button className={layout.bBtnConfirm} onClick={() => commitSpan(item.id)}>
                                                        <Check size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button className={layout.bBtnCancelSpan} onClick={() => setSpanEdit(null)}>
                                                        <X size={14} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            ) : endItem < totalSlots ? (
                                                <button
                                                    className={layout.bBtnEditSpan}
                                                    onClick={() => setSpanEdit({ id: item.id, draft: String(endItem + 1) })}
                                                    title="Edit item range"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                    </svg>
                                                </button>
                                            ) : null}
                                        </div>

                                        <div className={layout.bCardHeadRight}>
                                            <div className={layout.bPtsInline}>
                                                <span className={layout.bPtsInlineLabel}>Points</span>
                                                <input
                                                    className={layout.bPtsInlineInput}
                                                    placeholder="0"
                                                    value={item.points}
                                                    readOnly={readOnly}
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/[^0-9]/g, '');
                                                        const newPts = v === '' ? '0' : String(parseInt(v, 10));
                                                        upd(item.id, it => {
                                                            if (it.rubricRows.length > 0) {
                                                                const total = Number(newPts) || 0;
                                                                const rows = it.rubricRows.map((r, i) => {
                                                                    const wt = Number(r.weight || 0);
                                                                    const p = total ? Math.round((wt / 100) * total) : 0;
                                                                    return { ...r, pts: String(p) };
                                                                });
                                                                const sum = rows.reduce((s, r) => s + (Number(r.pts) || 0), 0);
                                                                if (sum !== total && rows.length > 0) {
                                                                    const last = rows.length - 1;
                                                                    const diff = total - (sum - (Number(rows[last].pts) || 0));
                                                                    rows[last] = { ...rows[last], pts: String(Math.max(0, diff)) };
                                                                }
                                                                return { ...it, points: newPts, rubricRows: rows };
                                                            }
                                                            return { ...it, points: newPts };
                                                        });
                                                    }}
                                                />
                                            </div>
                                            {!readOnly && (
                                                <button
                                                    className={layout.bBtnClear}
                                                    onClick={() => clearItem(item.id)}
                                                    disabled={!item.instruction.trim() && !item.choices.length && !item.rubricRows.length}
                                                >Clear</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Card body ── */}
                                    <div className={layout.bCardBody}>

                                        {/* Instruction */}
                                        <AutoResizeTextarea
                                            className={layout.bInstruction}
                                            placeholder="Type your question or instruction here…"
                                            value={item.instruction}
                                            rows={2}
                                            readOnly={readOnly}
                                            onChange={e => {
                                                const v = e.target.value;
                                                if (v.startsWith(' ')) return;
                                                upd(item.id, it => ({ ...it, instruction: v }));
                                            }}
                                            onBlur={e => {
                                                const trimmed = e.target.value.trim();
                                                if (trimmed !== e.target.value) {
                                                    upd(item.id, it => ({ ...it, instruction: trimmed }));
                                                }
                                            }}
                                        />

                                        {/* Choices */}
                                        {item.choices.length > 0 && (
                                            <div className={layout.bChoicesWrap}>
                                                <div className={layout.bGroupLabel}>Choices</div>
                                                {item.choices.map((ch, ci) => (
                                                    <div key={ch.id} className={layout.bChoiceRow}>
                                                        <span className={layout.bChoiceLetter}>{String.fromCharCode(65 + ci)}.</span>
                                                        <AutoResizeTextarea
                                                            className={layout.bChoiceInput}
                                                            placeholder={`Choice ${String.fromCharCode(65 + ci)}`}
                                                            value={ch.text}
                                                            rows={1}
                                                            readOnly={readOnly}
                                                            onChange={e => {
                                                                const v = e.target.value;
                                                                if (v.startsWith(' ')) return;
                                                                updChoice(item.id, ch.id, v);
                                                            }}
                                                            onBlur={e => {
                                                                const trimmed = e.target.value.trim();
                                                                if (trimmed !== e.target.value) updChoice(item.id, ch.id, trimmed);
                                                            }}
                                                        />
                                                        {!readOnly && (
                                                            <button className={layout.bIconRemove} onClick={() => remChoice(item.id, ch.id)}>
                                                                <X size={12} strokeWidth={2.5} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {!readOnly && (
                                                    <button className={layout.bLinkBtn} onClick={() => addChoice(item.id)}>
                                                        <Plus size={11} /> Add another choice
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Rubric */}
                                        {item.showRubric && item.rubricRows.length > 0 && (
                                            <div className={layout.bRubricWrap}>
                                                <div className={layout.bRubricHead}>
                                                    <span className={layout.bGroupLabel}>Rubrics</span>
                                                </div>
                                                <div className={layout.bRubricCols}>
                                                    <span className={layout.bRhLeft}>Criteria</span>
                                                    <span className={layout.bRhLeft}>Description</span>
                                                    <span className={layout.bRhCenter}>Weight</span>
                                                    <span className={layout.bRhCenter}>Pts</span>
                                                    <span />
                                                </div>
                                                {(() => {
                                                    const totalPts = Number(item.points) || 0;
                                                    const rowPts = item.rubricRows.map(r => Number(r.pts || 0) || 0);

                                                    return item.rubricRows.map((row, i) => (
                                                        <RubricRow
                                                            key={row.id}
                                                            row={row}
                                                            itemPoints={item.points}
                                                            totalWeight={totalWeight}
                                                            rowPoints={rowPts[i]}
                                                            nameError={!!((row.description || '').trim() && !(row.name || '').trim())}
                                                            onChange={(r, field) => updRubric(item.id, row.id, r, field)}
                                                            onRemove={() => remRubric(item.id, row.id)}
                                                            readOnly={readOnly}
                                                        />
                                                    ));
                                                })()}
                                                <div className={layout.bRubricTotalRow}>
                                                    <span />
                                                    <span />
                                                    <span className={`${layout.bWeightPill} ${wOk ? layout.bWeightOk : wOver ? layout.bWeightOver : layout.bWeightUnder}`}>
                                                        {Math.round(totalWeight)}% {wOk ? '✓' : wOver ? '— over!' : 'of 100%'}
                                                    </span>
                                                    <span className={layout.bRubricPtsTotal}>
                                                        {item.points ? Math.round(Number(item.points)) : '—'}
                                                    </span>
                                                    <span />
                                                </div>
                                                {!readOnly && (
                                                    <button className={layout.bLinkBtn} onClick={() => addRubric(item.id)}>
                                                        <Plus size={11} /> Add criteria row
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Action bar: Add Choices (left) | Add/Toggle Rubric (right) */}
                                        {!readOnly && (
                                            <div className={layout.bActionBar}>
                                                <div className={layout.bActionLeft}>
                                                    {item.choices.length === 0 && (
                                                        <button className={layout.bBtnAddChoices} onClick={() => addChoice(item.id)}>
                                                            <Plus size={13} strokeWidth={2} /> Add Choices
                                                        </button>
                                                    )}
                                                </div>
                                                <div className={layout.bActionRight}>
                                                    {item.rubricRows.length === 0 ? (
                                                        <button className={layout.bBtnAddRubric} onClick={() => addRubric(item.id)}>
                                                            <Plus size={13} strokeWidth={2} /> Add Rubric
                                                        </button>
                                                    ) : (
                                                        <button className={layout.bBtnToggleRubric} onClick={() => togRubric(item.id)}>
                                                            {item.showRubric
                                                                ? <><ChevronUp size={13} /> Hide Rubric</>
                                                                : <><ChevronDown size={13} /> Show Rubric</>
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {showDelete && !readOnly && (
                                    <button className={layout.bItemDel} onClick={() => deleteItem(item.id)} title="Delete item">
                                        <X size={16} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>{/* end bScroll */}

            <button className={`${layout.bScrollTop}${showComments ? ` ${layout.bScrollTopShifted}` : ''} ${showScrollTop ? layout.bScrollTopVisible : ''}`} onClick={() => {
                document.querySelector('[data-bscroll]')?.scrollTo({ top: 0, behavior: 'smooth' });
            }}>
                <ChevronUp size={40} strokeWidth={2.5} />
            </button>
        </div>
    );
};

// ─── TrackerPanel ─────────────────────────────────────────────────────────────
// Full-height right panel. Each CO gets a section; ILOs show a progress bar.
// The panel itself is sticky; the scroll happens only inside .mScrollArea.
const TrackerPanel = ({ outcomeData, currentCounts, totalRequired, totalCurrent, isOverflow, getIloStatus }) => (
    <div className={layout.tPanel}>
        <div className={layout.tHeader}>
            <span className={layout.tTitle}>Item Allocation</span>
            <span className={`${layout.tTotalPill} ${
                isOverflow ? layout.tTotalOver
                    : totalCurrent === totalRequired ? layout.tTotalOk
                        : layout.tTotalUnder}`}>
                {totalCurrent} / {totalRequired}
            </span>
        </div>

        <div className={layout.tBody}>
            {outcomeData.map(co => (
                <div key={co.co} className={layout.tCoBlock}>
                    <div className={layout.tCoTitle}>{co.co}</div>
                    {co.ilos.map(ilo => {
                        const used   = currentCounts[co.co]?.ilos[ilo.id] || 0;
                        const status = getIloStatus(co.co, ilo.id, ilo.items);
                        const pct    = ilo.items > 0 ? Math.min(100, (used / ilo.items) * 100) : (used > 0 ? 100 : 0);
                        return (
                            <div key={ilo.id} className={layout.tIloRow}>
                                <span className={layout.tIloId}>{ilo.id}</span>
                                <div className={layout.tBarTrack}>
                                    <div
                                        className={`${layout.tBarFill} ${
                                            status === 'over' ? layout.tFillOver
                                                : status === 'ok' ? layout.tFillOk
                                                    : layout.tFillUnder}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className={`${layout.tIloCount} ${
                                    status === 'over' ? layout.tCountOver
                                        : status === 'ok' ? layout.tCountOk : ''}`}>
                                    {used}/{ilo.items}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const QuestionCognitiveMapping = ({
                                      outcomeData,
                                      questions,
                                      setQuestions,
                                      assessmentMode,
                                      rubricCategories,
                                      setRubricCategories,
                                      showBuilder,
                                      onShowBuilderChange,
                                      builderSaveRef,
                                      onProgressUpdate,
                                      errorFields = {},
                                       clearFieldError,
                                       courseCode,
                                       assessmentName,
                                       onAssessmentNameChange,
                                       readOnly = false,
                                       showComments,
                                   }) => {

    const [showPostSaveWarning, setShowPostSaveWarning] = useState(false);
    const [highlightKey, setHighlightKey] = useState(0);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [duplicateIds, setDuplicateIds] = useState([]);

    const cognitiveLevels = ['Remembering','Understanding','Applying','Analyzing','Evaluating','Creating'];

    const createEmptyQuestion = () => ({
        id: uid(), question: '', rubricItem: '',
        choices: [], rubricRows: [], points: '',
        co: '', ilo: '', iloId: null, cognitiveLevel: '', span: 1,
    });

    const getTotalRequiredItems = () =>
        outcomeData.reduce((s, co) => s + Number(co.totalItems || 0), 0);

    const getAvailableILOs = (coId) => {
        const co = outcomeData.find(c => c.co === coId);
        return co ? co.ilos : [];
    };

    const getAllowedCognitiveLevels = (iloId) => {
        if (!iloId) return [];
        switch (iloId) {
            case 'ILO1': return ['Remembering','Understanding'];
            case 'ILO2': return ['Understanding','Applying','Analyzing','Evaluating'];
            case 'ILO3': return ['Applying','Analyzing','Evaluating','Creating'];
            default:     return cognitiveLevels;
        }
    };

    const getCurrentItemCount = () => {
        const counts = {};
        outcomeData.forEach(co => {
            counts[co.co] = { total: 0, ilos: {} };
            co.ilos.forEach(ilo => { counts[co.co].ilos[ilo.id] = 0; });
        });
        questions.forEach(q => {
            if (q.co && q.ilo && counts[q.co]) {
                const s = q.span || 1;
                counts[q.co].total += s;
                counts[q.co].ilos[q.ilo] += s;
            }
        });
        return counts;
    };

    const getIloStatus = (coId, iloId, required) => {
        const cur = currentCounts[coId]?.ilos[iloId] || 0;
        if (cur === required) return 'ok';
        if (cur > required)   return 'over';
        return 'under';
    };

    const totalSlotsUsedByOthers = (excludeId) =>
        questions.reduce((s, q) => q.id === excludeId ? s : s + (q.span || 1), 0);

    const handleDeleteQuestion = (id) =>
        setQuestions(prev => prev.filter(q => q.id !== id));

    const handleQuestionChange = (id, field, value) => {
        setQuestions(prev => prev.map(q => {
            if (q.id !== id) return q;
            const u = { ...q, [field]: value };
            if (field === 'co') { u.ilo = ''; u.cognitiveLevel = ''; u.iloId = null; }
            if (field === 'ilo' && !getAllowedCognitiveLevels(value).includes(u.cognitiveLevel))
                u.cognitiveLevel = '';
            // resolve iloId from outcomeData when both co and ilo are set
            if (u.co && u.ilo) {
                const outcome = outcomeData.find(o => o.co === u.co);
                const iloItem = outcome?.ilos?.find(il => il.id === u.ilo);
                if (iloItem && iloItem.iloDbId) u.iloId = iloItem.iloDbId;
            }
            return u;
        }));
    };

    const handleSpanChange = (id, delta) => {
        setQuestions(prev => {
            const idx    = prev.findIndex(q => q.id === id);
            if (idx === -1) return prev;
            const cur    = prev[idx].span || 1;
            const others = prev.reduce((s, q, i) => i === idx ? s : s + (q.span || 1), 0);
            const next   = Math.max(1, Math.min(cur + delta, getTotalRequiredItems() - others));
            if (next === cur) return prev;
            return prev.map((q, i) => i === idx ? { ...q, span: next } : q);
        });
    };

    const handleBuilderSave = async (savedItems) => {
        // Detect duplicate questions
        const textMap = {};
        const dupeIds = [];
        savedItems.forEach(si => {
            const text = (si.question || '').trim();
            if (!text) return;
            if (textMap[text] !== undefined) {
                if (!dupeIds.includes(textMap[text])) dupeIds.push(textMap[text]);
                if (!dupeIds.includes(si.id)) dupeIds.push(si.id);
            } else {
                textMap[text] = si.id;
            }
        });
        if (dupeIds.length > 0) {
            setDuplicateIds(dupeIds);
            setShowDuplicateWarning(true);
            return;
        }

        const exMap = new Map(questions.map(q => [q.id, q]));
        const merged = savedItems.map(si => {
            const ex = exMap.get(si.id) || {};
            const cleanQuestion = (si.question || '').trim();
            const cleanRubricItem = (si.rubricItem || '').trim();
            const isCleared = !(cleanQuestion || cleanRubricItem);
            const cleanChoices = (si.choices || []).filter(c => (c.text || '').trim()).map(c => ({ ...c, text: (c.text || '').trim() }));
            const cleanRubric = (si.rubricRows || []).filter(r => (r.name || '').trim() || (r.description || '').trim()).map(r => ({
                ...r,
                name: (r.name || '').trim(),
                description: (r.description || '').trim(),
            }));
            return {
                ...createEmptyQuestion(), ...ex,
                id: si.id, question: cleanQuestion, rubricItem: cleanRubricItem,
                choices: cleanChoices, rubricRows: cleanRubric,
                points: si.points || ex.points || '',
                span: si.span || ex.span || 1,
                co: isCleared ? '' : (ex.co || si.co || ''),
                ilo: isCleared ? '' : (ex.ilo || si.ilo || ''),
                iloId: isCleared ? null : (ex.iloId || si.iloId || null),
                cognitiveLevel: isCleared ? '' : (ex.cognitiveLevel || si.cognitiveLevel || ''),
            };
        });
        setQuestions(merged);
        setShowDuplicateWarning(false);
        setDuplicateIds([]);
        if (courseCode) {
            try {
                await saveItems(courseCode, merged);
                if (assessmentName) await updateCourse(courseCode, { assessmentName });
            } catch (err) {
                console.error('Builder save failed:', err);
            }
        }
        onShowBuilderChange(false);
        const hasEmpty = savedItems.some(si => !(si.question || si.rubricItem || '').trim());
        if (hasEmpty) setShowPostSaveWarning(true);
    };

    useEffect(() => {
        if (assessmentMode === 'question') setRubricCategories([]);
    }, [assessmentMode]);

    useEffect(() => {
        if (questions.length === 0) setQuestions([createEmptyQuestion()]);
    }, []);

    useEffect(() => {
        if (!showPostSaveWarning) return;
        const t = setTimeout(() => setShowPostSaveWarning(false), 7000);
        return () => clearTimeout(t);
    }, [showPostSaveWarning]);

    const currentCounts = getCurrentItemCount();
    const totalRequired = getTotalRequiredItems();
    const totalCurrent  = Object.values(currentCounts).reduce((s, c) => s + c.total, 0);
    const hasBuiltItems = questions.some(q => (q.question || q.rubricItem || '').trim().length > 0);
    const totalBuilderSlots = questions.reduce((s, q) => s + (q.span || 1), 0);
    const isOverflow    = totalRequired > 0 && totalBuilderSlots > totalRequired;

    if (showBuilder) {
        return (
            <AssessmentBuilder
                totalSlots={totalRequired}
                initialItems={questions}
                onSaveReturn={handleBuilderSave}
                builderSaveRef={builderSaveRef}
                onProgressUpdate={onProgressUpdate}
                highlightKey={highlightKey}
                assessmentName={assessmentName}
                onAssessmentNameChange={onAssessmentNameChange}
                showDuplicateWarning={showDuplicateWarning}
                duplicateIds={duplicateIds}
                onDismissDuplicateWarning={() => {
                    setShowDuplicateWarning(false);
                }}
                readOnly={readOnly}
                showComments={showComments}
            />
        );
    }

    const mappingRows = [];
    let slotCursor = 0;
    questions.forEach(q => {
        const span = q.span || 1;
        mappingRows.push({ q, startSlot: slotCursor + 1, endSlot: slotCursor + span, span });
        slotCursor += span;
    });

    return (
        <div className={layout.mOuter}>
            {/* LEFT: scrollable mapping */}
            <div className={layout.mScrollArea}>
                {showComments && !showBuilder && (
                    <div style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: 16, padding: '12px 16px', background: '#F9FAFB', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 13, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
                        <span style={{ fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Item Allocation</span>
                        <span style={{
                             padding: '2px 10px', borderRadius: 4, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                             background: isOverflow ? '#FEE2E2' : totalCurrent === totalRequired ? '#DCFCE7' : '#FEF3C7',
                             color: isOverflow ? '#B00000' : totalCurrent === totalRequired ? '#166534' : '#92400E'
                         }}>{totalCurrent}/{totalRequired}</span>
                        <span style={{ width: 1, height: 20, background: '#D1D5DB', flexShrink: 0 }} />
                        {outcomeData.map(co => (
                            <span key={co.co} style={{ display: 'inline-flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 500, color: '#6B7280', whiteSpace: 'nowrap' }}>{co.co}</span>
                                {co.ilos.map(ilo => {
                                    const used = currentCounts[co.co]?.ilos[ilo.id] || 0;
                                    const status = used === ilo.items ? 'ok' : used > ilo.items ? 'over' : 'under';
                                    return (
                                        <span key={ilo.id} style={{
                                             whiteSpace: 'nowrap', padding: '2px 10px', borderRadius: 4, fontSize: 13, fontWeight: 500,
                                             background: status === 'ok' ? '#DCFCE7' : status === 'over' ? '#FEE2E2' : '#FEF3C7',
                                             color: status === 'ok' ? '#166534' : status === 'over' ? '#B00000' : '#92400E'
                                         }}>
                                            {ilo.id}:&nbsp;&nbsp;{used}/{ilo.items}
                                        </span>
                                    );
                                })}
                            </span>
                        ))}
                    </div>
                )}
                <div className={layout.section} style={{ position: 'relative' }}>
                    <div className={layout.sectionHeader}>
                        <div>
                            <h2 className={layout.mSectionTitle}>Assessment Item – Cognitive Level Alignment</h2>
                            <p className={layout.mSectionSub}>Edit assessment first then map each item to a CO, ILO, and Bloom's level.</p>
                        </div>
                        <button className={layout.uploadButton} onClick={() => onShowBuilderChange(true)}>
                            <FileText size={14} style={{ marginRight: 6 }} />
                            {readOnly ? 'Assessment Items' : hasBuiltItems ? 'Edit Assessment' : 'Build Assessment'}
                        </button>
                    </div>

                    {isOverflow && (
                        <div className={layout.mOverflowWarn}>
                            Item count exceeds the total required. Please edit items in the builder.
                        </div>
                    )}

                    {showPostSaveWarning && (
                        <div className={layout.mPostSaveWarn}>
                            <span>There are still empty items, complete to submit your TOS.</span>
                            <button onClick={() => {
                                setShowPostSaveWarning(false);
                                setHighlightKey(prev => prev + 1);
                                onShowBuilderChange(true);
                            }}>Complete</button>
                        </div>
                    )}

                    {/* Headers — grid must match .tableRow exactly */}
                    <div className={layout.tableHeader}>
                        <div className={layout.headerCell}>Item(s)</div>
                        <div className={`${layout.headerCell} ${layout.mThLeft}`}>Instruction</div>
                        <div className={layout.headerCell}>CO</div>
                        <div className={layout.headerCell}>ILO</div>
                        <div className={layout.headerCell}>Pts</div>
                        <div className={layout.headerCell}>Cognitive Level</div>
                    </div>

                    {mappingRows.map(({ q, startSlot, endSlot, span }) => {
                        const itemLabel   = span === 1 ? `${startSlot}` : `${startSlot}–${endSlot}`;
                        const hasContent  = !!(q.question || q.rubricItem) && (q.question || q.rubricItem || '').trim().length > 0;

                        return (
                            <div key={q.id} className={layout.tableRow}>
                                <div className={layout.numberCell}>{itemLabel}</div>

                                <div className={layout.mItemCell}>
                                    {hasContent
                                        ? <span className={layout.mItemText}>{q.question || q.rubricItem}</span>
                                        : <span className={layout.mItemEmpty}>Open builder to add text</span>
                                    }
                                </div>

                                <select
                                    value={q.co}
                                    onChange={e => { handleQuestionChange(q.id, 'co', e.target.value); if (clearFieldError) clearFieldError(`map-co-${q.id}`); }}
                                    disabled={!hasContent || isOverflow}
                                    style={readOnly ? { pointerEvents: 'none' } : undefined}
                                    className={`${layout.mSelect} ${(!hasContent || isOverflow) && !readOnly ? layout.mSelectDisabled : ''} ${errorFields[`map-co-${q.id}`] ? layout.mSelectError : ''}`}
                                >
                                    <option value="" disabled>CO</option>
                                    {outcomeData.map(co => <option key={co.co} value={co.co}>{co.co}</option>)}
                                </select>

                                <select
                                    value={q.ilo}
                                    onChange={e => { handleQuestionChange(q.id, 'ilo', e.target.value); if (clearFieldError) clearFieldError(`map-ilo-${q.id}`); }}
                                    disabled={!hasContent || !q.co || isOverflow}
                                    style={readOnly ? { pointerEvents: 'none' } : undefined}
                                    className={`${layout.mSelect} ${(!hasContent || !q.co || isOverflow) && !readOnly ? layout.mSelectDisabled : ''} ${errorFields[`map-ilo-${q.id}`] ? layout.mSelectError : ''}`}
                                >
                                    <option value="" disabled>ILO</option>
                                    {q.co && getAvailableILOs(q.co).map(ilo => <option key={ilo.id} value={ilo.id}>{ilo.id}</option>)}
                                </select>

                                <AutoResizeTextarea
                                    className={layout.mNum}
                                    placeholder="0"
                                    value={q.points}
                                    rows={1}
                                    readOnly={readOnly}
                                    onChange={e => {
                                        const v = e.target.value.replace(/[^0-9]/g, '');
                                        handleQuestionChange(q.id, 'points', v === '' ? '0' : String(parseInt(v, 10)));
                                    }}
                                    disabled={!hasContent || isOverflow || (q.rubricRows && q.rubricRows.length > 0)}
                                />
                                <select
                                    value={q.cognitiveLevel}
                                    onChange={e => { handleQuestionChange(q.id, 'cognitiveLevel', e.target.value); if (clearFieldError) clearFieldError(`map-cognitiveLevel-${q.id}`); }}
                                    disabled={!hasContent || !q.ilo || isOverflow}
                                    style={readOnly ? { pointerEvents: 'none' } : undefined}
                                    className={`${layout.mSelect} ${(!hasContent || !q.ilo || isOverflow) && !readOnly ? layout.mSelectDisabled : ''} ${errorFields[`map-cognitiveLevel-${q.id}`] ? layout.mSelectError : ''}`}
                                >
                                    <option value="" disabled>Level</option>
                                    {getAllowedCognitiveLevels(q.ilo).map(lv => <option key={lv} value={lv}>{lv}</option>)}
                                </select>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT: sticky tracker panel */}
            {!showComments && (
                <TrackerPanel
                    outcomeData={outcomeData}
                    currentCounts={currentCounts}
                    totalRequired={totalRequired}
                    totalCurrent={totalCurrent}
                    isOverflow={isOverflow}
                    getIloStatus={getIloStatus}
                />
            )}
        </div>
    );
};

export { AutoResizeTextarea };
export default QuestionCognitiveMapping;