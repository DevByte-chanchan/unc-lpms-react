// src/components/ReferencePicker.jsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import styles from '../styles/ReferencePicker.module.sass';
import { Book, Bookmark, Globe, Unlock, ExternalLink, Plus, Edit2, PlusCircle } from 'react-feather';

// Layout metrics synced with ReferencePicker.module.sass for height-driven ghost grid calculation
const LIST_VERTICAL_PADDING = 24; // 12px top + 12px bottom
const CARD_GAP = 12;              // gap: 12px
const CARD_SLOT_HEIGHT = 82;      // min-height / height of reference & ghost cards
const EMPTY_PROMPT_HEIGHT = 176;  // 2 * 82 + 12 (matches exactly 2 card slots)

/**
 * ReferencePicker
 * Props:
 * - options: array of reference objects
 * - value: array of selected reference objects
 * - onChange: (newArray) => void
 * - error: string
 * - disabled: boolean
 * - onAddReference: (defaultType) => void
 * - onEditReference: (ref) => void
 */
const ReferencePicker = ({
    options = [],
    value = [],
    onChange,
    error,
    disabled,
    onAddReference,
    onEditReference
}) => {
    const [activeFilter, setActiveFilter] = useState('Textbook');
    const [listHeight, setListHeight] = useState(0);
    const listRef = useRef(null);

    const filterTabs = [
        { key: 'Textbook', label: 'Textbook' },
        { key: 'Open Educational Resources', label: 'OER' },
        { key: 'Online Resources', label: 'Online' },
    ];

    // Measure the visible list viewport height so empty ghost cards fill the available height dynamically
    useEffect(() => {
        const node = listRef.current;
        if (!node) return;

        const updateHeight = () => {
            const nextHeight = node.clientHeight || 0;
            setListHeight(prev => (prev !== nextHeight ? nextHeight : prev));
        };

        updateHeight();

        let observer;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(updateHeight);
            observer.observe(node);
        }
        window.addEventListener('resize', updateHeight);

        return () => {
            if (observer) observer.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    // Helper to normalize type strings into a canonical key
    const normalizeTypeKey = (type) => {
        if (!type) return '';
        const t = String(type).toLowerCase().trim();
        if (t.includes('textbook')) return 'textbook';
        if (t.includes('open') || t.includes('oer')) return 'open educational resources';
        if (t.includes('online')) return 'online resources';
        return t;
    };

    const getRefYear = (ref) => {
        if (!ref) return null;
        const raw = ref.publication_year || ref.year;
        if (!raw) return null;
        if (typeof raw === 'number') return raw;
        const d = new Date(raw);
        if (!isNaN(d.getFullYear())) return d.getFullYear();
        const match = String(raw).match(/\b(19\d\d|20\d\d)\b/);
        return match ? parseInt(match[1], 10) : null;
    };

    const isDeprecated = (ref) => {
        const rawType = (ref.type || ref.typeKey || '').toLowerCase();
        if (!rawType.includes('textbook')) return false;
        const year = getRefYear(ref);
        if (!year) return false;
        const currentYear = new Date().getFullYear();
        return (currentYear - year) >= 5;
    };

    // Normalize incoming options so fields are predictable and include a normalized type key
    const normalizedOptions = useMemo(() => {
        return (options || []).map(r => {
            const rawType = r.type || r.Type || '';
            const typeKey = normalizeTypeKey(rawType);
            let displayYear = null;
            if (r.publication_year) {
                const d = new Date(r.publication_year);
                displayYear = !isNaN(d.getFullYear()) ? d.getFullYear() : String(r.publication_year).slice(0, 4);
            } else if (r.year) {
                displayYear = r.year;
            }

            return {
                reference_id: r.reference_id != null ? Number(r.reference_id) : null,
                title: r.title || '',
                type: rawType || '',
                typeKey,
                author: r.author || r.authors || '',
                isbn: r.isbn || '',
                link: r.link || '',
                publication_year: r.publication_year || r.year || null,
                displayYear,
                _temp_id: r._temp_id || null,
                ...r
            };
        });
    }, [options]);

    // Extracted selection logic to a useCallback so it can be used for sorting
    const isRefSelected = useCallback((ref) => {
        return (value || []).some(item => {
            if (!item) return false;
            if (item.reference_id != null && ref.reference_id != null) {
                return Number(item.reference_id) === Number(ref.reference_id);
            }
            // fallback to title match for temp items
            return String(item.title || '').trim().toLowerCase() === String(ref.title || '').trim().toLowerCase();
        });
    }, [value]);

    // Count selected references per filter tab so users immediately see selections across Textbook / OER / Online
    const selectedCountByTabKey = useMemo(() => {
        const counts = {
            'textbook': 0,
            'open educational resources': 0,
            'online resources': 0
        };
        (value || []).forEach(item => {
            if (!item) return;
            const tk = normalizeTypeKey(item.type || item.Type || item.typeKey);
            if (tk in counts) {
                counts[tk] += 1;
            }
        });
        return counts;
    }, [value]);

    // Filter AND Sort by active type and selection status
    const filteredOptions = useMemo(() => {
        const activeKey = normalizeTypeKey(activeFilter);

        let results = normalizedOptions.filter(ref => {
            if (activeKey && String(ref.typeKey || '') !== activeKey) {
                return false;
            }
            return true;
        });

        // Sort results so that Selected items ALWAYS bubble to the top
        results.sort((a, b) => {
            const aSelected = isRefSelected(a);
            const bSelected = isRefSelected(b);

            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return 0;
        });

        return results;
    }, [normalizedOptions, activeFilter, isRefSelected]);

    // Compute how many ghost placeholder cards to render based on current list container height
    const ghostPlaceholderCount = useMemo(() => {
        const slotStride = CARD_SLOT_HEIGHT + CARD_GAP;
        const usableHeight = Math.max(0, listHeight - LIST_VERTICAL_PADDING);

        if (filteredOptions.length === 0) {
            if (listHeight === 0) return 3;
            const remainingHeight = usableHeight - EMPTY_PROMPT_HEIGHT;
            return remainingHeight > 0 ? Math.floor(remainingHeight / slotStride) : 0;
        }

        const totalVisibleSlots = listHeight > 0
            ? Math.max(1, Math.floor((usableHeight + CARD_GAP) / slotStride))
            : 5;

        return Math.max(0, totalVisibleSlots - filteredOptions.length);
    }, [listHeight, filteredOptions.length]);

    const emptyCategoryLabel = useMemo(() => {
        if (activeFilter === 'Textbook') return 'textbooks';
        if (activeFilter === 'Open Educational Resources') return 'OER references';
        return 'online resources';
    }, [activeFilter]);

    const getIcon = (type) => {
        if (!type) return <Globe size={16} />;
        const t = String(type).toLowerCase();
        if (t.includes('textbook')) return <Book size={16} />;
        if (t.includes('open') || t.includes('oer')) return <Unlock size={16} />;
        return <Globe size={16} />;
    };

    const handleToggle = (reference) => {
        if (disabled) return;
        const selected = isRefSelected(reference);
        let newValue;
        if (selected) {
            newValue = (value || []).filter(item => {
                if (!item) return false;
                if (item.reference_id != null && reference.reference_id != null) {
                    return Number(item.reference_id) !== Number(reference.reference_id);
                }
                return String(item.title || '').trim().toLowerCase() !== String(reference.title || '').trim().toLowerCase();
            });
        } else {
            newValue = [...(value || []), reference];
        }
        onChange && onChange(newValue);
    };

    return (
        <div className={styles.container} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div className={styles.pickerWrapper + (error ? ` ${styles.error}` : '')} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* Header: Title + total badge (left) | filter buttons (middle) | Add Reference (right) */}
                <div className={styles.header}>
                    <div className={styles.headerTitleGroup}>
                        <Bookmark size={15} className={styles.headerTitleIcon} />
                        <span className={styles.headerTitleText}>References</span>
                        <span className={styles.headerCountBadge}>{(value || []).length}</span>
                    </div>

                    <div className={styles.filterTabs}>
                        {filterTabs.map(tab => {
                            const isActive = activeFilter === tab.key;
                            const count = selectedCountByTabKey[normalizeTypeKey(tab.key)] || 0;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
                                    onClick={() => setActiveFilter(tab.key)}
                                >
                                    <span>{tab.label}</span>
                                    {count > 0 && (
                                        <span className={styles.tabCountBadge}>{count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        className={styles.mainAddBtn}
                        type="button"
                        onClick={() => onAddReference && onAddReference(activeFilter)}
                        disabled={disabled}
                    >
                        <Plus size={15} />
                        <span>Add Reference</span>
                    </button>
                </div>

                {/* Card List with dynamic height-based ghost grid placeholders */}
                <div className={styles.list} ref={listRef}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((ref, index) => {
                            const selected = isRefSelected(ref);
                            const isTextbook = ref.typeKey === 'textbook';
                            const canEdit = Boolean(
                                onEditReference && (
                                    ref.typeKey === 'open educational resources' ||
                                    ref.typeKey === 'online resources'
                                )
                            );
                            const deprecated = isDeprecated(ref);
                            const hasInteractiveActions = Boolean(ref.link || canEdit);
                            const showActionsSlot = hasInteractiveActions || deprecated || isTextbook;

                            return (
                                <div
                                    key={ref.reference_id != null ? `ref-${ref.reference_id}` : `ref-temp-${index}`}
                                    className={`${styles.row} ${selected ? styles.selectedRow : ''} ${isTextbook && !hasInteractiveActions ? styles.textbookRow : ''}`}
                                    onClick={() => handleToggle(ref)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(ref); } }}
                                >
                                    {/* Left: checkbox + icon + details */}
                                    <div className={styles.rowMain}>
                                        <input
                                            type="checkbox"
                                            className={styles.rowCheckbox}
                                            checked={selected}
                                            readOnly
                                        />
                                        <div className={styles.icon}>{getIcon(ref.type)}</div>

                                        <div className={styles.details}>
                                            <div className={`${styles.title} ${isTextbook ? styles.textbookTitle : ''}`}>
                                                {ref.title}
                                            </div>
                                            <div className={styles.meta}>
                                                <span>{ref.author || 'N/A'}</span>
                                                {ref.displayYear && <span> • {ref.displayYear}</span>}
                                                {ref.isbn && <span className={styles.isbn}> • ISBN: {ref.isbn}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: view link, edit button, and deprecated tag (fixed slot reserved for Textbooks) */}
                                    {showActionsSlot && (
                                        <div
                                            className={`${styles.rowActions} ${isTextbook && !hasInteractiveActions ? styles.textbookTagSlot : ''}`}
                                            onClick={hasInteractiveActions ? (e) => e.stopPropagation() : undefined}
                                            aria-hidden={!hasInteractiveActions && !deprecated ? true : undefined}
                                        >
                                            {ref.link && (
                                                <a
                                                    href={ref.link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={styles.link}
                                                    title="View resource"
                                                >
                                                    View <ExternalLink size={12} />
                                                </a>
                                            )}
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    className={styles.editBtn}
                                                    onClick={() => onEditReference && onEditReference(ref)}
                                                    title="Edit reference"
                                                    disabled={disabled}
                                                >
                                                    <Edit2 size={12} />
                                                    <span>Edit</span>
                                                </button>
                                            )}
                                            {deprecated && (
                                                <div className={styles.deprecatedTag}>Deprecated</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className={styles.emptyPromptCard}>
                            <div className={styles.emptyPromptIcon}>
                                <PlusCircle size={20} />
                            </div>
                            <div className={styles.emptyPromptTitle}>No {emptyCategoryLabel} added yet</div>
                            <div className={styles.emptyPromptText}>
                                Click <strong>Add Reference</strong> above to add one, or use <strong>Import Previous</strong> to reuse last term&apos;s references.
                            </div>
                        </div>
                    )}

                    {/* Dynamic Ghost Grid Cards filling remaining ReferencePicker height */}
                    {Array.from({ length: ghostPlaceholderCount }).map((_, idx) => (
                        <div key={`ref-placeholder-${idx}`} className={styles.placeholderCard} aria-hidden="true">
                            <div className={styles.placeholderLeft}>
                                <div className={styles.placeholderCheckbox} />
                                <div className={styles.placeholderIcon} />
                                <div className={styles.placeholderLines}>
                                    <div className={styles.placeholderTitleLine} />
                                    <div className={styles.placeholderMetaLine} />
                                </div>
                            </div>
                            <div className={styles.placeholderBadge} />
                        </div>
                    ))}
                </div>
            </div>

            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};

export default ReferencePicker;
