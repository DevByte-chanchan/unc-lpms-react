// src/components/ReferencePicker.jsx
import React, { useState, useMemo } from 'react';
import styles from '../styles/ReferencePicker.module.sass';
import { Search, Book, Globe, Unlock, ExternalLink, Plus } from 'react-feather';

/**
 * ReferencePicker
 * Props:
 *  - options: array of reference objects
 *  - value: array of selected reference objects
 *  - onChange: (newArray) => void
 *  - error: string
 *  - disabled: boolean
 *  - onAddReference: () => void
 */
const ReferencePicker = ({ options = [], value = [], onChange, error, disabled, onAddReference }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const types = ['All', 'Textbook', 'Open Educational Resources', 'Online Resources'];

    // Helper to normalize type strings into a canonical key
    const normalizeTypeKey = (type) => {
        if (!type) return '';
        const t = String(type).toLowerCase().trim();
        if (t.includes('textbook')) return 'textbook';
        if (t.includes('open') || t.includes('oer')) return 'open educational resources';
        if (t.includes('online')) return 'online resources';
        return t;
    };

    // Normalize incoming options so fields are predictable and include a normalized type key
    const normalizedOptions = useMemo(() => {
        return (options || []).map(r => {
            const rawType = r.type || r.Type || '';
            const typeKey = normalizeTypeKey(rawType);
            return {
                reference_id: r.reference_id != null ? Number(r.reference_id) : null,
                title: r.title || '',
                type: rawType || '',
                typeKey,
                author: r.author || r.authors || '',
                isbn: r.isbn || '',
                link: r.link || '',
                publication_year: r.publication_year || r.year || null,
                _temp_id: r._temp_id || null,
                ...r
            };
        });
    }, [options]);

    // Filter by search term and active type (use normalized typeKey for comparison)
    const filteredOptions = useMemo(() => {
        const term = String(searchTerm || '').trim().toLowerCase();
        const activeKey = activeFilter === 'All' ? null : normalizeTypeKey(activeFilter);

        return normalizedOptions.filter(ref => {
            // Type filter using normalized key
            if (activeKey && String(ref.typeKey || '') !== activeKey) {
                return false;
            }

            if (!term) return true;

            const inTitle = String(ref.title || '').toLowerCase().includes(term);
            const inAuthor = String(ref.author || '').toLowerCase().includes(term);
            const inIsbn = String(ref.isbn || '').toLowerCase().includes(term);
            return inTitle || inAuthor || inIsbn;
        });
    }, [normalizedOptions, searchTerm, activeFilter]);

    const getIcon = (type) => {
        if (!type) return <Globe size={16} />;
        const t = String(type).toLowerCase();
        if (t.includes('textbook')) return <Book size={16} />;
        if (t.includes('open') || t.includes('oer')) return <Unlock size={16} />;
        return <Globe size={16} />;
    };

    const isRefSelected = (ref) => {
        return (value || []).some(item => {
            if (!item) return false;
            if (item.reference_id != null && ref.reference_id != null) {
                return Number(item.reference_id) === Number(ref.reference_id);
            }
            // fallback to title match for temp items
            return String(item.title || '').trim() === String(ref.title || '').trim();
        });
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
                return String(item.title || '').trim() !== String(reference.title || '').trim();
            });
        } else {
            newValue = [...(value || []), reference];
        }
        onChange && onChange(newValue);
    };

    return (
        <div className={styles.container}>
            <div className={styles.pickerWrapper + (error ? ` ${styles.error}` : '')}>
                {/* Header: search + filters */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                        <div className={styles.searchBar} style={{ flex: 1 }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search by title, author or ISBN..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={disabled}
                            />
                        </div>

                        <div className={styles.filterTabs} style={{ marginLeft: 12 }}>
                            {types.map(type => {
                                const isActive = activeFilter === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
                                        onClick={() => setActiveFilter(type)}
                                    >
                                        {type === 'Open Educational Resources' ? 'OER' : (type === 'Online Resources' ? 'Online' : type)}
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
                </div>

                {/* List */}
                <div className={styles.list}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((ref, index) => {
                            const selected = isRefSelected(ref);

                            return (
                                <div
                                    key={ref.reference_id != null ? `ref-${ref.reference_id}` : `ref-temp-${index}`}
                                    className={`${styles.row} ${selected ? styles.selectedRow : ''}`}
                                >
                                    {/* Left: checkbox + icon + details (click toggles) */}
                                    <div
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}
                                        onClick={() => handleToggle(ref)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(ref); } }}
                                    >
                                        <input type="checkbox" checked={selected} readOnly />
                                        <div className={styles.icon}>{getIcon(ref.type)}</div>

                                        <div className={styles.details}>
                                            <div className={styles.title}>{ref.title}</div>
                                            <div className={styles.meta}>
                                                <span>{ref.author || 'N/A'}</span> • <span>{ref.publication_year || 'N/A'}</span>
                                                {ref.isbn && <span className={styles.isbn}> • ISBN: {ref.isbn}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: view link and type tag (stopPropagation so clicking view doesn't toggle) */}
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
                                                View <ExternalLink size={12} />
                                            </a>
                                        )}
                                        <div className={styles.typeTag}>{ref.type}</div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className={styles.empty}>No references found matching your criteria.</div>
                    )}
                </div>
            </div>

            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};

export default ReferencePicker;
