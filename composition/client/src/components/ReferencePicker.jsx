// src/components/ReferencePicker.jsx
import React, { useState, useMemo, useCallback } from 'react';
import styles from '../styles/ReferencePicker.module.sass';
import { Search, Book, Globe, Unlock, ExternalLink, Plus, X, AlertTriangle, Star, Lock, FileText } from 'react-feather';
import {
    buildCatalogView,
    getCatalogSettings,
    countUnclassified,
    externalSearchLinks,
    typeLabel,
    UNCLASSIFIED_TYPE
} from '../utils/referenceCatalog.js';

/**
 * ReferencePicker
 * Props:
 * - options: array of reference objects
 * - value: array of selected reference objects
 * - onChange: (newArray) => void
 * - error: string
 * - disabled: boolean
 * - onAddReference: () => void
 * - courseCode / courseTitle / topics: the course context the results are scoped
 *   to. Without them the picker falls back to the whole library, which is what
 *   the panel objected to [13:25] [16:13] — every caller should pass them.
 */
const ReferencePicker = ({
    options = [],
    value = [],
    onChange,
    error,
    disabled,
    onAddReference,
    courseCode = '',
    courseTitle = '',
    topics = [],
    assignedIds = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('Textbook');
    // Default scope is the course's own catalog; widening it is the deliberate
    // "kung wala dun yung libro, san ako mag-search?" step [11:39].
    const [scope, setScope] = useState('catalog');

    const settings = useMemo(() => getCatalogSettings(), []);
    const unclassifiedCount = useMemo(() => countUnclassified(options), [options]);

    const types = useMemo(() => {
        const base = ['Textbook', 'Open Educational Resources', 'Online Resources'];
        return unclassifiedCount > 0 ? [...base, UNCLASSIFIED_TYPE] : base;
    }, [unclassifiedCount]);

    const { rows, suggested, outdated, hiddenByCourse, window: recency } = useMemo(
        () => buildCatalogView(options, {
            courseCode,
            courseTitle,
            topics,
            type: activeFilter,
            search: searchTerm,
            scope,
            assignedIds,
            settings
        }),
        [options, courseCode, courseTitle, topics, activeFilter, searchTerm, scope, assignedIds, settings]
    );

    const isRefSelected = useCallback((ref) => {
        return (value || []).some(item => {
            if (!item) return false;
            if (item.reference_id != null && ref.reference_id != null) {
                return Number(item.reference_id) === Number(ref.reference_id);
            }
            return String(item.title || '').trim() === String(ref.title || '').trim();
        });
    }, [value]);

    const getIcon = (type) => {
        const label = typeLabel(type);
        if (label === 'Textbook') return <Book size={16} />;
        if (label === 'Open Educational Resources') return <Unlock size={16} />;
        if (label === 'Online Resources') return <Globe size={16} />;
        return <FileText size={16} />;
    };

    const handleToggle = (reference) => {
        if (disabled) return;
        const selected = isRefSelected(reference);
        // "kung hindi [available sa library], di pwede mag-lagay references" [49:06]
        if (!selected && reference.attachable === false) return;
        let newValue;
        if (selected) {
            newValue = (value || []).filter(item => {
                if (!item) return false;
                if (item.reference_id != null && reference.reference_id != null) {
                    return Number(item.reference_id) !== Number(reference.reference_id);
                }
                return String(item.title || '').trim() !== String(reference.title || '').trim();
            });
        } else {
            newValue = [...(value || []), reference];
        }
        onChange && onChange(newValue);
    };

    // The selection spans every tab, so it has to be visible from every tab.
    const selectionChips = (value || []).filter(Boolean);
    const externalLinks = externalSearchLinks(searchTerm || courseTitle || courseCode);

    const renderRow = (ref, index, compact = false) => {
        const selected = isRefSelected(ref);
        const blocked = ref.attachable === false && !selected;

        return (
            <div
                key={ref.reference_id != null ? `ref-${ref.reference_id}` : `ref-temp-${index}`}
                className={`${styles.row} ${selected ? styles.selectedRow : ''} ${blocked ? styles.blockedRow : ''}`}
                title={blocked ? 'Not confirmed available in the library — it cannot be attached.' : undefined}
            >
                <div
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}
                    onClick={() => handleToggle(ref)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(ref); } }}
                >
                    <input type="checkbox" checked={selected} readOnly disabled={blocked} />
                    <div className={styles.icon}>{blocked ? <Lock size={16} /> : getIcon(ref.type)}</div>

                    <div className={styles.details}>
                        <div className={styles.title}>
                            {ref.title}
                            {!compact && ref.promotedFromChapter && (
                                <span className={styles.hintTag}>book containing “{ref.chapters?.[0]}”</span>
                            )}
                        </div>
                        <div className={styles.meta}>
                            <span>{ref.author || 'N/A'}</span> • <span>{ref.year || 'N/A'}</span>
                            {ref.isbn && <span className={styles.isbn}> • ISBN: {ref.isbn}</span>}
                            {ref.outdated && (
                                <span className={styles.outdatedTag}>
                                    <AlertTriangle size={11} /> outside {recency.from}–{recency.to}
                                </span>
                            )}
                            {blocked && <span className={styles.outdatedTag}>not in library</span>}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {ref.link && (
                        <a
                            href={ref.link}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.link}
                            onClick={(e) => e.stopPropagation()}
                            title="View resource"
                        >
                            View <ExternalLink size={14} />
                        </a>
                    )}
                    <div className={styles.typeTag}>{ref.typeLabel || typeLabel(ref.type)}</div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.pickerWrapper + (error ? ` ${styles.error}` : '')}>
                {/* Header: search + filters */}
                <div className={styles.header}>
                    <div className={styles.headerRow}>
                        <div className={styles.searchBar} style={{ flex: 1 }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder={scope === 'catalog' ? `Search ${courseCode || 'this course'}’s catalog` : 'Search the whole library'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={disabled}
                            />
                        </div>

                        <div className={styles.filterTabs}>
                            {types.map(type => {
                                const isActive = activeFilter === type;
                                const short = type === 'Open Educational Resources'
                                    ? 'OER'
                                    : (type === 'Online Resources' ? 'Online' : type);
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
                                        onClick={() => setActiveFilter(type)}
                                    >
                                        {short}
                                    </button>
                                );
                            })}

                            <button
                                className={styles.selfAdder}
                                type="button"
                                onClick={() => onAddReference && onAddReference()}
                                disabled={disabled}
                                style={{ marginLeft: 8 }}
                            >
                                <Plus size={14} />&nbsp; Add my own Reference
                            </button>
                        </div>
                    </div>

                    <div className={styles.scopeRow}>
                        <button
                            type="button"
                            className={`${styles.scopeTab} ${scope === 'catalog' ? styles.activeTab : ''}`}
                            onClick={() => setScope('catalog')}
                        >
                            {courseCode ? `${courseCode} catalog` : 'Course catalog'}
                        </button>
                        <button
                            type="button"
                            className={`${styles.scopeTab} ${scope === 'library' ? styles.activeTab : ''}`}
                            onClick={() => setScope('library')}
                        >
                            Search outside the catalog
                        </button>
                        <span className={styles.scopeNote}>
                            {scope === 'catalog' && hiddenByCourse > 0
                                ? `${hiddenByCourse} title${hiddenByCourse === 1 ? '' : 's'} hidden — not assigned to this course`
                                : `Showing ${recency.from}–${recency.to}${outdated.length ? ` · ${outdated.length} older title${outdated.length === 1 ? '' : 's'} withheld` : ''}`}
                        </span>
                    </div>

                    {selectionChips.length > 0 && (
                        <div className={styles.chipRow}>
                            <span className={styles.chipCount}>{selectionChips.length} selected</span>
                            {selectionChips.map((ref, i) => (
                                <span key={ref.reference_id ?? ref._temp_id ?? `chip-${i}`} className={styles.chip}>
                                    {ref.title}
                                    <button
                                        type="button"
                                        aria-label={`Remove ${ref.title}`}
                                        onClick={() => handleToggle(ref)}
                                        disabled={disabled}
                                    >
                                        <X size={11} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Suggested from the subject + topic, so nothing has to be typed [10:28] */}
                {suggested.length > 0 && (
                    <div className={styles.suggestBlock}>
                        <div className={styles.suggestHeader}>
                            <Star size={13} /> Suggested for {courseTitle || courseCode || 'this course'}
                        </div>
                        {suggested.map((ref, i) => renderRow(ref, `s${i}`, true))}
                    </div>
                )}

                {/* List */}
                <div className={styles.list}>
                    {rows.length > 0 ? (
                        rows.map((ref, index) => renderRow(ref, index))
                    ) : (
                        <div className={styles.empty}>
                            <div>No references found matching your criteria.</div>
                            {scope === 'catalog' && (
                                <button type="button" className={styles.linkBtn} onClick={() => setScope('library')}>
                                    Search outside {courseCode || 'this course'}’s catalog
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {scope === 'library' && externalLinks.length > 0 && (
                    <div className={styles.externalBar}>
                        <span>Still nothing? Search outside UNC:</span>
                        {externalLinks.map(link => (
                            <a key={link.key} href={link.url} target="_blank" rel="noreferrer" title={link.note || ''}>
                                {link.label}{link.subscription ? ' ★' : ''} <ExternalLink size={11} />
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};

export default ReferencePicker;