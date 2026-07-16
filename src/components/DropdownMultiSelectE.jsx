import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from 'react-feather';
import styles from "../styles/DropdownMultiSelectE.module.sass";

const DropdownMultiSelectE = ({ options = [], initialValue = [], onChange }) => {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(initialValue);
    const [filter, setFilter] = useState('');
    const ref = useRef(null);

    // Handle clicks outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setFilter(''); // Optional: Reset filter on close
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (option) => {
        const updated = selected.includes(option)
            ? selected.filter(o => o !== option)
            : [...selected, option];

        setSelected(updated);
        onChange?.(updated);
    };

    // Filter logic
    const filtered = options.filter(o =>
        !filter || o.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className={styles.multiSelect} ref={ref}>
            {/* Main Clickable Area */}
            <div
                className={`${styles.dropdown} ${open ? styles.active : ''}`}
                onClick={() => setOpen(!open)}
            >
                <div className={styles.selectedContainer}>
                    {selected.length > 0 ? (
                        <div className={styles.tags}>
                            {selected.map((s, i) => (
                                <span key={i} className={styles.tag}>{s}</span>
                            ))}
                        </div>
                    ) : (
                        <span className={styles.placeholder}>Select items...</span>
                    )}
                </div>
                <ChevronDown size={16} className={styles.chevron} />
            </div>

            {/* Dropdown Body */}
            {open && (
                <div className={styles.dropdownMenu}>
                    {/* Search Bar */}
                    <div className={styles.searchWrapper}>
                        <Search size={14} className={styles.searchIcon}/>
                        <input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Search options..."
                            className={styles.searchInput}
                            autoFocus
                        />
                    </div>

                    {/* Options List */}
                    <div className={styles.optionsList}>
                        {filtered.length > 0 ? (
                            filtered.map(opt => (
                                <label
                                    key={opt}
                                    className={styles.option}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(opt)}
                                        onChange={() => toggleOption(opt)}
                                        className={styles.checkbox}
                                    />
                                    <span>{opt}</span>
                                </label>
                            ))
                        ) : (
                            <div className={styles.noResults}>No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DropdownMultiSelectE;