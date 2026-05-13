import React, { useState } from 'react';
import styles from '../styles/MultiSelectA.module.sass';
import { Search } from 'react-feather'; // Ensure you have react-feather installed

const MultiSelectA = ({ label, disabled, value, initialValue = [], options = [], onChange, error }) => {

    // Logic: Use 'value' if controlled, otherwise fallback to 'initialValue'
    const actualValue = value !== undefined ? value : initialValue;

    // Local state for search
    const [searchTerm, setSearchTerm] = useState('');

    const handleCheckboxChange = (option, isChecked) => {
        if (disabled || !onChange) return;

        let newSelectedOptions = [...actualValue];

        if (isChecked) {
            newSelectedOptions.push(option);
        } else {
            newSelectedOptions = newSelectedOptions.filter(item => item !== option);
        }

        onChange(newSelectedOptions);
    };

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.label}>{label}</div>

            {/* Wrapper gets the error class */}
            <div className={`${styles.dropdown} ${error ? styles.error : ''} ${disabled ? styles['disabled-style'] : ''}`}>

                {/* --- 1. SEARCH BAR --- */}
                <div className={styles.searchWrapper}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={disabled}
                    />
                </div>

                {/* --- 2. SCROLLABLE OPTIONS LIST --- */}
                <div className={styles.optionsList}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => {
                            const isChecked = actualValue.includes(option);
                            return (
                                <label key={index} className={styles.option}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={disabled}
                                        onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                                    />
                                    <span>{option}</span>
                                </label>
                            );
                        })
                    ) : (
                        <div className={styles.noData}>
                            {options.length === 0 ? "No options available" : "No results found"}
                        </div>
                    )}
                </div>

            </div>
            {/* Error Message */}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    )
}

export default MultiSelectA;