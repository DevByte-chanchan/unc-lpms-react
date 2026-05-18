import { useEffect, useState } from "react";
import {
    X, FileText, ArrowLeft, Download,
    Plus, Check, ChevronDown, ChevronUp
} from "react-feather";
import layout from "../styles/QuestionCognitiveMapping.module.sass";

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
    points: '',
});

// ─── Weight distribution ──────────────────────────────────────────────────────
const distributeWeights = (rows) => {
    if (!rows.length) return rows;
    const even = Math.floor(100 / rows.length);
    const rem  = 100 - even * (rows.length - 1);
    return rows.map((r, i) => ({ ...r, weight: String(i === rows.length - 1 ? rem : even) }));
};

// ─── RubricRow ────────────────────────────────────────────────────────────────
const RubricRow = ({ row, itemPoints, totalWeight, rowPoints, onChange, onRemove }) => {
    const isOver = totalWeight > 100;
    return (
        <div className={layout.bRubricRow}>
            <textarea
                className={layout.bRubricName}
                placeholder="Criteria"
                value={row.name}
                rows={1}
                onChange={e => {
                    onChange({ ...row, name: e.target.value });
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                }}
            />
            <textarea
                className={layout.bRubricDesc}
                placeholder="Description"
                value={row.description}
                rows={1}
                onChange={e => {
                    onChange({ ...row, description: e.target.value });
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                }}
            />
            <div className={`${layout.bRubricWeightWrap} ${isOver ? layout.bRubricWeightErr : ''}`}>
                <textarea
                    className={layout.bRubricWeightIn}
                    placeholder="0"
                    value={row.weight}
                    rows={1}
                    onChange={e => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        onChange({ ...row, weight: v });
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                />
                <span className={layout.bRubricPctLabel}>%</span>
            </div>
            <div className={layout.bRubricPts}>{rowPoints !== undefined ? rowPoints : '—'}</div>
            <button className={layout.bIconRemove} onClick={onRemove} title="Remove">
                <X size={12} strokeWidth={2.5} />
            </button>
        </div>
    );
};

// ─── AssessmentBuilder ────────────────────────────────────────────────────────
const AssessmentBuilder = ({ totalSlots, initialItems, onSaveReturn }) => {
    const [spanEdit, setSpanEdit] = useState(null);
    const [warnData, setWarnData] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const buildSlotMap = (its) => {
        let c = 0;
        return its.map(it => { const s = c + 1; c += (it.span || 1); return s; });
    };

    const initItems = () => {
        if (initialItems && initialItems.length > 0) {
            const hasContent = initialItems.some(q => q.question || q.rubricItem);
            if (hasContent) {
                return initialItems.map(q => ({
                    id: q.id || uid(),
                    instruction: q.question || q.rubricItem || '',
                    span: q.span || 1,
                    choices: (q.choices || []).map(c =>
                        typeof c === 'string' ? { id: uid(), text: c } : { ...c }
                    ),
                    rubricRows: (q.rubricRows || []).map(r => ({ ...r })),
                    showRubric: (q.rubricRows || []).length > 0,
                    points: q.points || '',
                }));
            }
        }
        return Array.from({ length: totalSlots }, () => makeItem(1));
    };

    const [items, setItems] = useState(initItems);
    const upd = (id, fn) => setItems(p => p.map(it => it.id === id ? fn(it) : it));

    // Auto-populate blank items when totalSlots increases
    useEffect(() => {
        setItems(prev => {
            const consumed = prev.reduce((s, it) => s + (it.span || 1), 0);
            if (consumed >= totalSlots) return prev;
            const needed = totalSlots - consumed;
            return [...prev, ...Array.from({ length: needed }, () => makeItem(1))];
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
        setTimeout(() => document.addEventListener('mousedown', handler), 0);
        return () => document.removeEventListener('mousedown', handler);
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
            for (let i = idx + 1; i < items.length; i++) {
                if (slotMap[i] < startItem + newSpan) toRemove.push(items[i].id);
                else break;
            }
            const hasFilledAbsorbed = toRemove.some(rid => {
                const it = items.find(x => x.id === rid);
                return it && (it.instruction || it.choices.length || it.rubricRows.length);
            });
            if (hasFilledAbsorbed) { setWarnData({ id, newSpan, toRemove }); return; }
            applySpan(id, newSpan, toRemove);
        } else {
            applySpan(id, newSpan, []);
        }
        setSpanEdit(null);
    };

    const applySpan = (id, newSpan, toRemove) => {
        const idx     = items.findIndex(it => it.id === id);
        const curSpan = items[idx].span || 1;
        const diff    = newSpan - curSpan;
        setItems(prev => {
            let next = prev.map((it, i) => i === idx ? { ...it, span: newSpan } : it);
            next = next.filter(it => !toRemove.includes(it.id));
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
    const addRubric = (id) => upd(id, it => ({
        ...it, showRubric: true,
        rubricRows: distributeWeights([...it.rubricRows, { id: uid(), name: '', description: '', weight: '' }]),
    }));
    const updRubric = (id, rid, row) => upd(id, it => ({ ...it, rubricRows: it.rubricRows.map(r => r.id === rid ? row : r) }));
    const remRubric = (id, rid) => upd(id, it => {
        const next = distributeWeights(it.rubricRows.filter(r => r.id !== rid));
        return { ...it, rubricRows: next, showRubric: next.length > 0 };
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

    const save = () => {
        if (!canSave) return;
        const exMap = new Map(initialItems?.map(it => [it.id, it]) || []);
        onSaveReturn(items.map(it => {
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
                points: it.points || ex.points || '',
                cognitiveLevel: ex.cognitiveLevel || '',
            };
        }));
    };

    const statusCls = canSave ? layout.bStatusOk
        : consumed > totalSlots ? layout.bStatusOver : layout.bStatusUnder;

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

    return (
        <div className={layout.bPage}>

            {/* Bar lives outside the scroll container so it never disappears */}
            <div className={layout.bBar}>
                <button className={layout.bBtnSave} onClick={save} disabled={!canSave}
                        title={!canSave ? 'All item counts must equal TOS total' : ''}>
                    <ArrowLeft size={14} />
                    Save &amp; Return
                </button>
                <div className={layout.bBarCenter}>
                    <span className={layout.bBarTitle}>Assessment Builder</span>
                    <span className={`${layout.bStatusPill} ${statusCls}`}>
                        {consumed} / {totalSlots} items
                    </span>
                </div>
                <button className={layout.bBtnExport} onClick={exportItems}>
                    <Download size={14} />
                    Export
                </button>
            </div>

            {/* ── Warning dialog ── */}
            {warnData && (
                <div className={layout.bWarnOverlay}>
                    <div className={layout.bWarnBox}>
                        <p className={layout.bWarnTitle}>⚠ Items with content will be removed</p>
                        <p className={layout.bWarnBody}>
                            <strong>{warnMessage}</strong> already {warnData.toRemove.length === 1 ? 'has' : 'have'} content. Expanding this item will permanently remove {warnData.toRemove.length === 1 ? 'it' : 'them'}. Do you wish to proceed?
                        </p>
                        <div className={layout.bWarnActions}>
                            <button className={layout.bWarnCancel} onClick={() => { setWarnData(null); setSpanEdit(null); }}>Cancel</button>
                            <button className={layout.bWarnConfirm} onClick={() => applySpan(warnData.id, warnData.newSpan, warnData.toRemove)}>
                                Yes, proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Scrollable content ── */}
            <div className={layout.bScroll}>
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
                            <div key={item.id} className={`${layout.bItemWrap} ${deletingId === item.id ? layout.bItemDeleting : ''}`}>
                                <div className={`${layout.bCard} ${showDelete ? layout.bCardDelMode : ''}`}>

                                    {/* ── Card header ── */}
                                    <div className={layout.bCardHead}>
                                        <div className={layout.bCardHeadLeft}>
                                    <span className={layout.bItemRangeLabel}>
                                        {span === 1 ? `Item ${startItem}` : `Item ${startItem} – ${endItem}`}
                                    </span>

                                            {isEditing ? (
                                                <div className={layout.bSpanEditRow} data-span-edit={item.id}>
                                                    <span className={layout.bSpanEditHint}>to item</span>
                                                    <textarea
                                                        className={layout.bSpanInput}
                                                        placeholder={String(endItem + 1)}
                                                        value={spanEdit.draft}
                                                        rows={1}
                                                        autoFocus
                                                        onChange={e => {
                                                            const v = e.target.value.replace(/[^0-9]/g, '');
                                                            setSpanEdit({ id: item.id, draft: v });
                                                            e.target.style.height = 'auto';
                                                            e.target.style.height = e.target.scrollHeight + 'px';
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
                                            ) : (
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
                                            )}
                                        </div>

                                        <div className={layout.bCardHeadRight}>
                                            <div className={layout.bPtsInline}>
                                                <span className={layout.bPtsInlineLabel}>Points</span>
                                                <textarea
                                                    className={layout.bPtsInlineInput}
                                                    placeholder="0"
                                                    value={item.points}
                                                    rows={1}
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/[^0-9]/g, '');
                                                        upd(item.id, it => ({ ...it, points: v }));
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }}
                                                />
                                            </div>
                                            <button
                                                className={layout.bBtnClear}
                                                onClick={() => clearItem(item.id)}
                                                disabled={!item.instruction && !item.choices.length && !item.rubricRows.length}
                                            >Clear</button>
                                        </div>
                                    </div>

                                    {/* ── Card body ── */}
                                    <div className={layout.bCardBody}>

                                        {/* Instruction */}
                                        <textarea
                                            className={layout.bInstruction}
                                            placeholder="Type your question or instruction here…"
                                            value={item.instruction}
                                            rows={2}
                                            onChange={e => {
                                                upd(item.id, it => ({ ...it, instruction: e.target.value }));
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                        />

                                        {/* Choices */}
                                        {item.choices.length > 0 && (
                                            <div className={layout.bChoicesWrap}>
                                                <div className={layout.bGroupLabel}>Choices</div>
                                                {item.choices.map((ch, ci) => (
                                                    <div key={ch.id} className={layout.bChoiceRow}>
                                                        <span className={layout.bChoiceLetter}>{String.fromCharCode(65 + ci)}.</span>
                                                        <input
                                                            className={layout.bChoiceInput}
                                                            placeholder={`Choice ${String.fromCharCode(65 + ci)}`}
                                                            value={ch.text}
                                                            onChange={e => updChoice(item.id, ch.id, e.target.value)}
                                                        />
                                                        <button className={layout.bIconRemove} onClick={() => remChoice(item.id, ch.id)}>
                                                            <X size={12} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button className={layout.bLinkBtn} onClick={() => addChoice(item.id)}>
                                                    <Plus size={11} /> Add another choice
                                                </button>
                                            </div>
                                        )}

                                        {/* Rubric */}
                                        {item.showRubric && item.rubricRows.length > 0 && (
                                            <div className={layout.bRubricWrap}>
                                                <div className={layout.bRubricHead}>
                                                    <span className={layout.bGroupLabel}>Rubric Criteria</span>
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
                                                    const rowPts = item.rubricRows.map((r, i) => {
                                                        const raw = (totalPts * Number(r.weight || 0)) / 100;
                                                        return Math.round(raw);
                                                    });
                                                    const sumOthers = rowPts.slice(0, -1).reduce((s, v) => s + v, 0);
                                                    rowPts[rowPts.length - 1] = totalPts - sumOthers;

                                                    return item.rubricRows.map((row, i) => (
                                                        <RubricRow
                                                            key={row.id}
                                                            row={row}
                                                            itemPoints={item.points}
                                                            totalWeight={totalWeight}
                                                            rowPoints={rowPts[i]}
                                                            onChange={r => updRubric(item.id, row.id, r)}
                                                            onRemove={() => remRubric(item.id, row.id)}
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
                                                <button className={layout.bLinkBtn} onClick={() => addRubric(item.id)}>
                                                    <Plus size={11} /> Add criteria row
                                                </button>
                                            </div>
                                        )}

                                        {/* Action bar: Add Choices (left) | Add/Toggle Rubric (right) */}
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
                                    </div>
                                </div>
                                {showDelete && (
                                    <button className={layout.bItemDel} onClick={() => deleteItem(item.id)} title="Delete item">
                                        <X size={16} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>{/* end bScroll */}
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
                                  }) => {
    const [showBuilder, setShowBuilder] = useState(false);

    const cognitiveLevels = ['Remembering','Understanding','Applying','Analyzing','Evaluating','Creating'];

    const createEmptyQuestion = () => ({
        id: uid(), question: '', rubricItem: '',
        choices: [], rubricRows: [], points: '',
        co: '', ilo: '', cognitiveLevel: '', span: 1,
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
            if (q.co && q.ilo) {
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
        setQuestions(questions.map(q => {
            if (q.id !== id) return q;
            const u = { ...q, [field]: value };
            if (field === 'co') { u.ilo = ''; u.cognitiveLevel = ''; }
            if (field === 'ilo' && !getAllowedCognitiveLevels(value).includes(u.cognitiveLevel))
                u.cognitiveLevel = '';
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

    const handleBuilderSave = (savedItems) => {
        setQuestions(prev => {
            const exMap = new Map(prev.map(q => [q.id, q]));
            return savedItems.map(si => {
                const ex = exMap.get(si.id) || {};
                return {
                    ...createEmptyQuestion(), ...ex,
                    id: si.id, question: si.question, rubricItem: si.rubricItem,
                    choices: si.choices, rubricRows: si.rubricRows,
                    points: si.points || ex.points || '',
                    span: si.span || ex.span || 1,
                    co: ex.co || si.co || '',
                    ilo: ex.ilo || si.ilo || '',
                    cognitiveLevel: ex.cognitiveLevel || si.cognitiveLevel || '',
                };
            });
        });
        setShowBuilder(false);
    };

    useEffect(() => {
        if (assessmentMode === 'question') setRubricCategories([]);
    }, [assessmentMode]);

    useEffect(() => {
        if (questions.length === 0) setQuestions([createEmptyQuestion()]);
    }, []);

    const currentCounts = getCurrentItemCount();
    const totalRequired = getTotalRequiredItems();
    const totalCurrent  = Object.values(currentCounts).reduce((s, c) => s + c.total, 0);
    const hasBuiltItems = questions.some(q => q.question || q.rubricItem);
    const totalBuilderSlots = questions.reduce((s, q) => s + (q.span || 1), 0);
    const isOverflow    = totalBuilderSlots > totalRequired;

    if (showBuilder) {
        return (
            <AssessmentBuilder
                totalSlots={totalRequired}
                initialItems={questions}
                onSaveReturn={handleBuilderSave}
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
                <div className={layout.section}>
                    <div className={layout.sectionHeader}>
                        <div>
                            <h2 className={layout.mSectionTitle}>Assessment Item – Cognitive Level Alignment</h2>
                            <p className={layout.mSectionSub}>Map each item to a CO, ILO, and Bloom's level.</p>
                        </div>
                        <button className={layout.uploadButton} onClick={() => setShowBuilder(true)}>
                            <FileText size={14} style={{ marginRight: 6 }} />
                            {hasBuiltItems ? 'Edit Assessment' : 'Build Assessment'}
                        </button>
                    </div>

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
                        const hasContent  = !!(q.question || q.rubricItem);

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
                                    onChange={e => handleQuestionChange(q.id, 'co', e.target.value)}
                                    disabled={!hasContent || isOverflow}
                                    className={`${layout.mSelect} ${!hasContent || isOverflow ? layout.mSelectDisabled : ''}`}
                                >
                                    <option value="" disabled>CO</option>
                                    {outcomeData.map(co => <option key={co.co} value={co.co}>{co.co}</option>)}
                                </select>

                                <select
                                    value={q.ilo}
                                    onChange={e => handleQuestionChange(q.id, 'ilo', e.target.value)}
                                    disabled={!hasContent || !q.co || isOverflow}
                                    className={`${layout.mSelect} ${!hasContent || !q.co || isOverflow ? layout.mSelectDisabled : ''}`}
                                >
                                    <option value="" disabled>ILO</option>
                                    {q.co && getAvailableILOs(q.co).map(ilo => <option key={ilo.id} value={ilo.id}>{ilo.id}</option>)}
                                </select>

                                <textarea
                                    className={layout.mNum}
                                    placeholder="0"
                                    value={q.points}
                                    rows={1}
                                    onChange={e => {
                                        const v = e.target.value.replace(/[^0-9]/g, '');
                                        handleQuestionChange(q.id, 'points', v);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    disabled={!hasContent || isOverflow}
                                />

                                <select
                                    value={q.cognitiveLevel}
                                    onChange={e => handleQuestionChange(q.id, 'cognitiveLevel', e.target.value)}
                                    disabled={!hasContent || !q.ilo || isOverflow}
                                    className={`${layout.mSelect} ${!hasContent || !q.ilo || isOverflow ? layout.mSelectDisabled : ''}`}
                                >
                                    <option value="" disabled>Level</option>
                                    {getAllowedCognitiveLevels(q.ilo).map(lv => <option key={lv} value={lv}>{lv}</option>)}
                                </select>
                            </div>
                        );
                    })}

                    {isOverflow && (
                        <div className={layout.mOverflowWarn}>
                            Item count exceeds the total required. Please edit items in the builder.
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: sticky tracker panel */}
            <TrackerPanel
                outcomeData={outcomeData}
                currentCounts={currentCounts}
                totalRequired={totalRequired}
                totalCurrent={totalCurrent}
                isOverflow={isOverflow}
                getIloStatus={getIloStatus}
            />
        </div>
    );
};

export default QuestionCognitiveMapping;