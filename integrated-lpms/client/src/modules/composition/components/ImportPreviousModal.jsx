// src/components/ImportPreviousModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Activity, Bookmark, X, Check, Award } from 'react-feather';
import { fetchJson } from '../utils/api.js';
import styles from '../styles/ImportPreviousModal.module.sass';

const getTopicKey = (t, idx) => String(t?.topic_id ?? t?.title ?? idx);
const getTlaKey = (t, idx) => String(t?.sourceTlaId ?? t?.tlaName ?? idx);
const getRefKey = (r, idx) => String(r?.reference_id ?? r?.title ?? idx);

const formatRefTypeShort = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('textbook')) return 'Textbook';
    if (t.includes('open') || t.includes('oer')) return 'OER';
    if (t.includes('online')) return 'Online';
    return type || 'Reference';
};

const formatRefYear = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'number') return raw;
    const d = new Date(raw);
    if (!isNaN(d.getFullYear())) return d.getFullYear();
    const match = String(raw).match(/\b(19\d\d|20\d\d)\b/);
    return match ? match[1] : null;
};

/**
 * Consolidated 3-Column Import Previous Term Content Modal
 * Strictly fetches and displays ONLY the latest previous term/revision's matching-week
 * Topics, Teaching & Learning Activities, and References in select mode.
 */
const ImportPreviousModal = ({
    isOpen,
    onClose,
    weekId,
    weekNumber = 1,
    isOrientation = false,
    existingTopics = [],
    existingTlas = [],
    existingRefs = [],
    onImportSelected
}) => {
    const [loading, setLoading] = useState(false);
    const [prevTopics, setPrevTopics] = useState([]);
    const [prevTlas, setPrevTlas] = useState([]);
    const [prevRefs, setPrevRefs] = useState([]);
    const [sourceMeta, setSourceMeta] = useState(null);

    const [selectedTopicKeys, setSelectedTopicKeys] = useState({});
    const [selectedTlaKeys, setSelectedTlaKeys] = useState({});
    const [selectedRefKeys, setSelectedRefKeys] = useState({});

    const existingTopicTitleSet = useMemo(
        () => new Set((existingTopics || []).map(t => String(t?.title || '').trim().toLowerCase()).filter(Boolean)),
        [existingTopics]
    );
    const existingTlaNameSet = useMemo(
        () => new Set((existingTlas || []).map(t => String(t?.tlaName || '').trim().toLowerCase()).filter(Boolean)),
        [existingTlas]
    );
    const existingRefIdSet = useMemo(
        () => new Set((existingRefs || []).map(r => Number(r?.reference_id)).filter(Boolean)),
        [existingRefs]
    );
    const existingRefTitleSet = useMemo(
        () => new Set((existingRefs || []).map(r => String(r?.title || '').trim().toLowerCase()).filter(Boolean)),
        [existingRefs]
    );

    const isTopicAlreadyAdded = (t) => existingTopicTitleSet.has(String(t?.title || '').trim().toLowerCase());
    const isTlaAlreadyAdded = (t) => existingTlaNameSet.has(String(t?.tlaName || '').trim().toLowerCase());
    const isRefAlreadyAdded = (r) => {
        if (r?.reference_id != null && existingRefIdSet.has(Number(r.reference_id))) return true;
        return existingRefTitleSet.has(String(r?.title || '').trim().toLowerCase());
    };

    useEffect(() => {
        if (!isOpen || !weekId) return;
        let mounted = true;
        setLoading(true);

        const orientParam = isOrientation ? 'true' : 'false';

        Promise.all([
            fetchJson(`/api/topics/previous/${encodeURIComponent(weekId)}?isOrientation=${orientParam}`).catch(() => ({})),
            fetchJson(`/api/tlas/previous/${encodeURIComponent(weekId)}?isOrientation=${orientParam}`).catch(() => ({})),
            fetchJson(`/api/ilo-references/previous/${encodeURIComponent(weekId)}?isOrientation=${orientParam}`).catch(() => ({}))
        ]).then(([topicsRes, tlasRes, refsRes]) => {
            if (!mounted) return;

            const tList = Array.isArray(topicsRes?.matchingWeekTopics) ? topicsRes.matchingWeekTopics : [];
            const tlaList = Array.isArray(tlasRes?.tlas) ? tlasRes.tlas : [];
            const refList = Array.isArray(refsRes?.matchingWeekReferences) ? refsRes.matchingWeekReferences : [];

            setPrevTopics(tList);
            setPrevTlas(tlaList);
            setPrevRefs(refList);

            const rev = topicsRes?.selectedRevision || tlasRes?.selectedRevision || refsRes?.sourceOffering || null;
            setSourceMeta(rev);

            const initTopics = {};
            tList.forEach((t, idx) => {
                initTopics[getTopicKey(t, idx)] = !isTopicAlreadyAdded(t);
            });
            setSelectedTopicKeys(initTopics);

            const initTlas = {};
            tlaList.forEach((t, idx) => {
                initTlas[getTlaKey(t, idx)] = !isTlaAlreadyAdded(t);
            });
            setSelectedTlaKeys(initTlas);

            const initRefs = {};
            refList.forEach((r, idx) => {
                initRefs[getRefKey(r, idx)] = !isRefAlreadyAdded(r);
            });
            setSelectedRefKeys(initRefs);
        }).finally(() => {
            if (mounted) setLoading(false);
        });

        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, weekId, isOrientation]);

    if (!isOpen) return null;

    const selectableTopics = prevTopics.filter((t) => !isTopicAlreadyAdded(t));
    const selectableTlas = prevTlas.filter((t) => !isTlaAlreadyAdded(t));
    const selectableRefs = prevRefs.filter((r) => !isRefAlreadyAdded(r));

    const chosenTopics = prevTopics.filter((t, idx) => !isTopicAlreadyAdded(t) && Boolean(selectedTopicKeys[getTopicKey(t, idx)]));
    const chosenTlas = prevTlas.filter((t, idx) => !isTlaAlreadyAdded(t) && Boolean(selectedTlaKeys[getTlaKey(t, idx)]));
    const chosenRefs = prevRefs.filter((r, idx) => !isRefAlreadyAdded(r) && Boolean(selectedRefKeys[getRefKey(r, idx)]));
    const totalSelected = chosenTopics.length + chosenTlas.length + chosenRefs.length;

    const allTopicsChecked = selectableTopics.length > 0 && chosenTopics.length === selectableTopics.length;
    const allTlasChecked = selectableTlas.length > 0 && chosenTlas.length === selectableTlas.length;
    const allRefsChecked = selectableRefs.length > 0 && chosenRefs.length === selectableRefs.length;

    const toggleAllTopics = () => {
        if (selectableTopics.length === 0) return;
        const nextVal = !allTopicsChecked;
        const map = {};
        prevTopics.forEach((t, idx) => {
            map[getTopicKey(t, idx)] = isTopicAlreadyAdded(t) ? false : nextVal;
        });
        setSelectedTopicKeys(map);
    };

    const toggleAllTlas = () => {
        if (selectableTlas.length === 0) return;
        const nextVal = !allTlasChecked;
        const map = {};
        prevTlas.forEach((t, idx) => {
            map[getTlaKey(t, idx)] = isTlaAlreadyAdded(t) ? false : nextVal;
        });
        setSelectedTlaKeys(map);
    };

    const toggleAllRefs = () => {
        if (selectableRefs.length === 0) return;
        const nextVal = !allRefsChecked;
        const map = {};
        prevRefs.forEach((r, idx) => {
            map[getRefKey(r, idx)] = isRefAlreadyAdded(r) ? false : nextVal;
        });
        setSelectedRefKeys(map);
    };

    const handleConfirmImport = () => {
        if (onImportSelected) {
            onImportSelected({
                topics: chosenTopics,
                tlas: chosenTlas,
                references: chosenRefs
            });
        }
        onClose();
    };

    const weekLabel = isOrientation ? 'Course Orientation' : `Week ${weekNumber}`;

    return (
        <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.topBar}>
                    <div className={styles.titleGroup}>
                        <h3 className={styles.modalTitle}>Import Previous Term Content</h3>
                        <span className={styles.weekBadge}>{weekLabel}</span>
                        {sourceMeta && (
                            <span className={styles.sourceBadge}>
                                Rev {sourceMeta.revision_number ?? 1}
                                {sourceMeta.termLabel ? ` · ${sourceMeta.termLabel}` : ''}
                            </span>
                        )}
                    </div>
                    <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <X size={17} />
                    </button>
                </div>

                {/* 3-Column Body */}
                {loading ? (
                    <div className={styles.loadingState}>Loading previous term content...</div>
                ) : (
                    <div className={styles.columnsGrid}>
                        {/* COLUMN 1: TOPICS */}
                        <div className={styles.columnPanel}>
                            <div className={styles.columnHeader}>
                                <div className={styles.colTitleGroup}>
                                    <BookOpen size={14} className={styles.colIcon} />
                                    <span className={styles.colTitle}>Topics</span>
                                    <span className={styles.colCountPill}>{prevTopics.length}</span>
                                </div>
                                <button
                                    type="button"
                                    className={styles.selectAllBtn}
                                    disabled={selectableTopics.length === 0}
                                    onClick={toggleAllTopics}
                                >
                                    {allTopicsChecked ? 'Clear' : 'Select All'}
                                </button>
                            </div>
                            <div className={styles.columnBody}>
                                {prevTopics.length === 0 ? (
                                    <div className={styles.emptyColState}>
                                        <BookOpen size={18} />
                                        <span>No previous topics</span>
                                    </div>
                                ) : (
                                    prevTopics.map((topic, idx) => {
                                        const key = getTopicKey(topic, idx);
                                        const already = isTopicAlreadyAdded(topic);
                                        const checked = !already && Boolean(selectedTopicKeys[key]);
                                        const subs = Array.isArray(topic.subtopics) ? topic.subtopics : [];
                                        return (
                                            <div
                                                key={key}
                                                className={`${styles.selectCard} ${checked ? styles.selectCardActive : ''} ${already ? styles.selectCardDisabled : ''}`}
                                                onClick={() => {
                                                    if (already) return;
                                                    setSelectedTopicKeys(prev => ({ ...prev, [key]: !prev[key] }));
                                                }}
                                                aria-disabled={already}
                                                title={already ? 'Already added to this week' : undefined}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={checked}
                                                    disabled={already}
                                                    onChange={() => {}}
                                                />
                                                <div className={styles.cardContent}>
                                                    <div className={styles.cardTitleRow}>
                                                        <span className={styles.cardTitle}>{topic.title}</span>
                                                        {already && <span className={styles.alreadyTag}>Added</span>}
                                                    </div>
                                                    {subs.length > 0 && (
                                                        <div className={styles.subList}>
                                                            {subs.map((s, sIdx) => (
                                                                <div key={s.subtopic_id || sIdx} className={styles.subItem}>
                                                                    <span className={styles.bullet}>•</span>
                                                                    <span className={styles.subText}>{s.title}</span>
                                                                    {Number(s.estimated_minutes) > 0 && (
                                                                        <span className={styles.subMinTag}>
                                                                            {Number(s.estimated_minutes)}m
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* COLUMN 2: TEACHING & LEARNING ACTIVITIES */}
                        <div className={styles.columnPanel}>
                            <div className={styles.columnHeader}>
                                <div className={styles.colTitleGroup}>
                                    <Activity size={14} className={styles.colIcon} />
                                    <span className={styles.colTitle}>Teaching &amp; Learning Activities</span>
                                    <span className={styles.colCountPill}>{prevTlas.length}</span>
                                </div>
                                <button
                                    type="button"
                                    className={styles.selectAllBtn}
                                    disabled={selectableTlas.length === 0}
                                    onClick={toggleAllTlas}
                                >
                                    {allTlasChecked ? 'Clear' : 'Select All'}
                                </button>
                            </div>
                            <div className={styles.columnBody}>
                                {prevTlas.length === 0 ? (
                                    <div className={styles.emptyColState}>
                                        <Activity size={18} />
                                        <span>No previous TLAs</span>
                                    </div>
                                ) : (
                                    prevTlas.map((tla, idx) => {
                                        const key = getTlaKey(tla, idx);
                                        const already = isTlaAlreadyAdded(tla);
                                        const checked = !already && Boolean(selectedTlaKeys[key]);
                                        return (
                                            <div
                                                key={key}
                                                className={`${styles.selectCard} ${checked ? styles.selectCardActive : ''} ${already ? styles.selectCardDisabled : ''}`}
                                                onClick={() => {
                                                    if (already) return;
                                                    setSelectedTlaKeys(prev => ({ ...prev, [key]: !prev[key] }));
                                                }}
                                                aria-disabled={already}
                                                title={already ? 'Already added to this week' : undefined}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={checked}
                                                    disabled={already}
                                                    onChange={() => {}}
                                                />
                                                <div className={styles.cardContent}>
                                                    <div className={styles.cardTitleRow}>
                                                        <span className={styles.cardTitle}>{tla.tlaName || 'Untitled TLA'}</span>
                                                        {already && <span className={styles.alreadyTag}>Added</span>}
                                                    </div>
                                                    <div className={styles.pillRow}>
                                                        {tla.classPhase && <span className={styles.metaPill}>{tla.classPhase}</span>}
                                                        {tla.performedBy && <span className={styles.metaPill}>{tla.performedBy}</span>}
                                                        {tla.isLab && <span className={styles.labPill}>Lab</span>}
                                                        {(tla.assessmentType || tla.assessmentDetail) && (
                                                            <span className={styles.assPill}>
                                                                <Award size={10} />
                                                                <span>{tla.assessmentType || 'Assessment'}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {tla.tlaDescription && (
                                                        <div className={styles.cardDesc}>{tla.tlaDescription}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* COLUMN 3: REFERENCES */}
                        <div className={styles.columnPanel}>
                            <div className={styles.columnHeader}>
                                <div className={styles.colTitleGroup}>
                                    <Bookmark size={14} className={styles.colIcon} />
                                    <span className={styles.colTitle}>References</span>
                                    <span className={styles.colCountPill}>{prevRefs.length}</span>
                                </div>
                                <button
                                    type="button"
                                    className={styles.selectAllBtn}
                                    disabled={selectableRefs.length === 0}
                                    onClick={toggleAllRefs}
                                >
                                    {allRefsChecked ? 'Clear' : 'Select All'}
                                </button>
                            </div>
                            <div className={styles.columnBody}>
                                {prevRefs.length === 0 ? (
                                    <div className={styles.emptyColState}>
                                        <Bookmark size={18} />
                                        <span>No previous references</span>
                                    </div>
                                ) : (
                                    prevRefs.map((refItem, idx) => {
                                        const key = getRefKey(refItem, idx);
                                        const already = isRefAlreadyAdded(refItem);
                                        const checked = !already && Boolean(selectedRefKeys[key]);
                                        const yr = formatRefYear(refItem.publication_year);
                                        return (
                                            <div
                                                key={key}
                                                className={`${styles.selectCard} ${checked ? styles.selectCardActive : ''} ${already ? styles.selectCardDisabled : ''}`}
                                                onClick={() => {
                                                    if (already) return;
                                                    setSelectedRefKeys(prev => ({ ...prev, [key]: !prev[key] }));
                                                }}
                                                aria-disabled={already}
                                                title={already ? 'Already selected for this week' : undefined}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={checked}
                                                    disabled={already}
                                                    onChange={() => {}}
                                                />
                                                <div className={styles.cardContent}>
                                                    <div className={styles.cardTitleRow}>
                                                        <span className={styles.cardTitle}>{refItem.title}</span>
                                                        {already && <span className={styles.alreadyTag}>Selected</span>}
                                                    </div>
                                                    <div className={styles.pillRow}>
                                                        <span className={styles.metaPill}>{formatRefTypeShort(refItem.type)}</span>
                                                        {yr && <span className={styles.metaPill}>{yr}</span>}
                                                    </div>
                                                    <div className={styles.refMeta}>
                                                        {refItem.author || 'N/A'}
                                                        {refItem.isbn ? ` • ISBN: ${refItem.isbn}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className={styles.footer}>
                    <span className={styles.selectionSummary}>
                        { chosenTopics.length } Topic{chosenTopics.length === 1 ? '' : 's'} · { chosenTlas.length } TLA{chosenTlas.length === 1 ? '' : 's'} · { chosenRefs.length } Reference{chosenRefs.length === 1 ? '' : 's'} selected
                    </span>
                    <div className={styles.footerActions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.importBtn}
                            disabled={totalSelected === 0}
                            onClick={handleConfirmImport}
                        >
                            <Check size={14} />
                            <span>Import Selected ({totalSelected})</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportPreviousModal;
