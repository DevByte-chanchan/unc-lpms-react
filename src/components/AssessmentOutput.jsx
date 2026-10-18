import React, { useState, useEffect } from "react";
import { Eye, Download, ChevronDown, ChevronRight } from "react-feather";
import layout from "../styles/TosPreview.module.sass";
import { fetchAttachments, ACTIVE_PERIOD } from "../services/api.js";

const getCognitiveLevelsForIlo = (iloId) => {
    if (iloId === 'ILO1') return ['Remembering', 'Understanding'];
    if (iloId === 'ILO2') return ['Applying', 'Analyzing'];
    if (iloId === 'ILO3') return ['Evaluating', 'Creating'];
    return ['Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating'];
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export default function AssessmentOutput({ outcomeData = [], questions = [], courseCode, period = ACTIVE_PERIOD, examType, targetScope = null, addingComment = false, activeScope = null, onFileClick = null }) {
    const [attachments, setAttachments] = useState([]);
    const [attLoading, setAttLoading] = useState(false);
    const [collapsedCOs, setCollapsedCOs] = useState(new Set());
    const [collapsedILOs, setCollapsedILOs] = useState(new Set());

    const isCoExpanded = (coName) => !collapsedCOs.has(coName);
    const isIloExpanded = (coName, iloId) => !collapsedILOs.has(`${coName}|${iloId}`);

    const toggleCO = (coName) => {
        setCollapsedCOs(prev => {
            const next = new Set(prev);
            if (next.has(coName)) next.delete(coName);
            else next.add(coName);
            return next;
        });
    };

    const toggleILO = (coName, iloId) => {
        const key = `${coName}|${iloId}`;
        setCollapsedILOs(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    useEffect(() => {
        if (!targetScope) return;
        let targetCo = targetScope.co;
        let targetIlo = targetScope.ilo;
        if ((!targetCo || !targetIlo) && targetScope.itemId && questions.length > 0) {
            const match = questions.find(q => String(q.id) === String(targetScope.itemId));
            if (match) {
                targetCo = targetCo || match.co;
                targetIlo = targetIlo || match.ilo;
            }
        }
        if (targetCo) {
            setCollapsedCOs(prev => {
                if (!prev.has(targetCo)) return prev;
                const next = new Set(prev);
                next.delete(targetCo);
                return next;
            });
        }
        if (targetCo && targetIlo && targetIlo !== '\u2014') {
            const key = `${targetCo}|${targetIlo}`;
            setCollapsedILOs(prev => {
                if (!prev.has(key)) return prev;
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, [targetScope, questions]);

    const activePeriod = period || examType || ACTIVE_PERIOD;

    useEffect(() => {
        if (courseCode) {
            setAttLoading(true);
            fetchAttachments(courseCode, activePeriod)
                .then(data => setAttachments(Array.isArray(data) ? data : []))
                .catch(() => setAttachments([]))
                .finally(() => setAttLoading(false));
        } else {
            setAttachments([]);
        }
    }, [courseCode, activePeriod]);

    return (
        <div className={`${layout.assessmentBody} ${layout.tabContent}`}>
            {attLoading ? (
                <div className={layout.emptyState}>
                    <p className={layout.emptyText}>Loading assessment preview…</p>
                </div>
            ) : outcomeData.length === 0 ? (
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
                    <p className={layout.emptyText}>No assessment points yet</p>
                </div>
            ) : (
                <div className={layout.coList}>
                    {outcomeData.map(co => (
                        <div key={co.co} className={layout.coBlock} id={`co-block-${co.co}`} data-co={co.co}>
                            <div className={layout.coHeader} id={`co-header-${co.co}`} data-co={co.co}>
                                <div className={layout.coHeaderLeft}>
                                    <button
                                        type="button"
                                        className={layout.aoCollapseBtn}
                                        onClick={() => toggleCO(co.co)}
                                        aria-expanded={isCoExpanded(co.co)}
                                        aria-label={`${isCoExpanded(co.co) ? 'Collapse' : 'Expand'} ${co.co}`}
                                    >
                                        {isCoExpanded(co.co) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                    <span className={layout.coTitle}>{co.co}{co.description ? ` · ${co.description}` : ''}</span>
                                </div>
                                <span className={layout.coPts}>{co.totalPoints || 0} pts</span>
                            </div>
                            {isCoExpanded(co.co) && (
                            <div className={layout.iloList}>
                                {(co.ilos || []).map(ilo => {
                                    const iloFiles = attachments.filter(a => Number(a.iloId) === Number(ilo.iloDbId));

                                    return (
                                        <div key={ilo.id} className={layout.iloBlock} id={`ilo-block-${co.co}-${ilo.id}`} data-co={co.co} data-ilo={ilo.id}>
                                            <div className={layout.iloHeader} id={`ilo-header-${co.co}-${ilo.id}`} data-ilo-header={`${co.co}|${ilo.id}`} data-co={co.co} data-ilo={ilo.id}>
                                                <div className={layout.iloHeaderLeft}>
                                                    <button
                                                        type="button"
                                                        className={layout.aoCollapseBtn}
                                                        onClick={() => toggleILO(co.co, ilo.id)}
                                                        aria-expanded={isIloExpanded(co.co, ilo.id)}
                                                        aria-label={`${isIloExpanded(co.co, ilo.id) ? 'Collapse' : 'Expand'} ${ilo.id}`}
                                                    >
                                                        {isIloExpanded(co.co, ilo.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>
                                                    <span className={layout.iloTitle}>{ilo.id}{ilo.description ? ` · ${ilo.description}` : ''}</span>
                                                </div>
                                                <div className={layout.bloomChips}>
                                                    {getCognitiveLevelsForIlo(ilo.id).map(lvl => (
                                                        <span key={lvl} className={layout.bloomChip}>{lvl}</span>
                                                    ))}
                                                </div>
                                            </div>

                                            {isIloExpanded(co.co, ilo.id) && (
                                            iloFiles.length === 0 ? (
                                                <div className={layout.noFiles}>No files for this ILO</div>
                                            ) : (
                                                <div className={layout.fileCardsList}>
                                                    {iloFiles.map(att => {
                                                        const fileRows = questions.filter(q => Number(q.attachmentId) === Number(att.id));
                                                        const filePoints = fileRows.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
                                                        const sizeStr = formatFileSize(att.size);
                                                        const typeLabel = att.type === 'objective' ? 'Objective' : 'Non-objective';
                                                        const isPdf = (att.filepath || '').toLowerCase().endsWith('.pdf');

                                                        const isFileActive = activeScope && (
                                                            (activeScope.fileId && Number(activeScope.fileId) === Number(att.id)) ||
                                                            (activeScope.filename && activeScope.filename === att.filename && activeScope.co === co.co && activeScope.ilo === ilo.id)
                                                        );
                                                        const fileCardClass = `${layout.fileCard}${addingComment ? ` ${layout.aoFileSelectable}` : ''}${isFileActive ? ` ${layout.aoFileActiveComment}` : ''}`;

                                                        return (
                                                            <div
                                                                key={att.id}
                                                                className={fileCardClass}
                                                                data-file-id={att.id}
                                                                data-filename={att.filename}
                                                                data-co={co.co}
                                                                data-ilo={ilo.id}
                                                                onClick={() => {
                                                                    if (addingComment && onFileClick) {
                                                                        onFileClick(att, co, ilo, fileRows);
                                                                    }
                                                                }}
                                                            >
                                                                <div className={layout.fileCardHeader}>
                                                                    <div className={layout.fileCardLeft}>
                                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                                            <polyline points="14 2 14 8 20 8"/>
                                                                        </svg>
                                                                        <span className={layout.fileName}>{att.filename}</span>
                                                                        <span className={layout.fileTypeChip}>{typeLabel}</span>
                                                                        {sizeStr && <span className={layout.fileSize}>{sizeStr}</span>}
                                                                    </div>
                                                                    <div className={layout.fileCardRight}>
                                                                        <span className={layout.filePointsChip}>{filePoints} pts</span>
                                                                        {isPdf && (
                                                                            <a
                                                                                href={`/api/attachments/download/${encodeURIComponent(att.filepath)}?inline=1`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                title="Open file in new tab"
                                                                                aria-label="Open file in new tab"
                                                                                className={layout.iconBtn}
                                                                                onClick={e => e.stopPropagation()}
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
                                                                            onClick={e => e.stopPropagation()}
                                                                        >
                                                                            <Download size={16} />
                                                                        </a>
                                                                    </div>
                                                                </div>

                                                                <div className={layout.pointGrid}>
                                                                    <div className={layout.pointGridHeader}>
                                                                        <span className={layout.pointColRef}>Item reference</span>
                                                                        <span className={layout.pointColPts}>Points</span>
                                                                        <span className={layout.pointColBloom}>Bloom's level</span>
                                                                    </div>
                                                                    {fileRows.length === 0 ? (
                                                                        <div className={layout.emptyPointRows}>No point rows for this file</div>
                                                                    ) : (
                                                                        fileRows.map(row => (
                                                                            <div
                                                                                key={row.id}
                                                                                className={layout.pointGridRow}
                                                                                data-item-id={row.id}
                                                                                data-co={co.co}
                                                                                data-ilo={ilo.id}
                                                                                data-cog={row.cognitiveLevel}
                                                                            >
                                                                                <span className={layout.pointColRef}>{row.instruction || row.question || '—'}</span>
                                                                                <span className={layout.pointColPts}>{row.points || 0}</span>
                                                                                <span className={layout.pointColBloom}>{row.cognitiveLevel || '—'}</span>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
