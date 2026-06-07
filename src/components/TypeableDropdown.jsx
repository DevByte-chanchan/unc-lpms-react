import React, { useState, useRef, useEffect } from 'react';
import styles from '../styles/TypeableDropdown.module.sass';
import { ChevronDown } from 'react-feather';

const TypeableDropdown = ({ label, disabled, value, initialValue, options = [], inline = false, onChange, error }) => {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(initialValue || '');
    const actualValue = isControlled ? value : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState(options);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!actualValue) {
            setFilteredOptions(options);
        } else {
            const searchStr = String(actualValue).toLowerCase();
            setFilteredOptions(
                options.filter(opt => String(opt).toLowerCase().includes(searchStr))
            );
        }
    }, [actualValue, options]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value;
        if (!isControlled) setInternalValue(val);
        if (onChange) onChange(val);
        setIsOpen(true);
    };

    const handleSelectOption = (option) => {
        if (!isControlled) setInternalValue(option);
        if (onChange) onChange(option);
        setIsOpen(false);
    };

    const handleInputFieldClick = () => {
        if (!disabled) {
            setIsOpen(true);
        }
    };

    // Helper function to render the input (Not a component)
    const renderInput = () => (
        <div className={styles.inputWrapper}>
            <input
                type="text"
                className={`${styles.typeableInput} ${disabled ? styles['disabled-style'] : ''}`}
                value={actualValue || ''}
                disabled={disabled}
                placeholder="Select or type..."
                onChange={handleInputChange}
                onClick={handleInputFieldClick}
            />
            <ChevronDown
                size={16}
                className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            />

            {isOpen && !disabled && (
                <div className={styles.optionsMenu}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                className={`${styles.menuOptionItem} ${actualValue === option ? styles.selectedOption : ''}`}
                                onClick={() => handleSelectOption(option)}
                            >
                                {option}
                            </div>
                        ))
                    ) : (
                        <div className={styles.noOptions}>No matches found</div>
                    )}
                </div>
            )}
        </div>
    );

    if (inline) {
        return (
            <div ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={styles.label} style={{ fontWeight: 600 }}>{label}</div>
                <div
                    className={`${styles.dropdown} ${error ? styles.error : ''}`}
                    style={{ minWidth: 260, height: 44, position: 'relative' }}
                >
                    {renderInput()}
                </div>
            </div>
        );
    }

    return (
        <div ref={dropdownRef} className={styles.container}>
            <div className={styles.label}>{label}</div>
            <div className={`${styles.dropdown} ${error ? styles.error : ''}`} style={{ position: 'relative' }}>
                {renderInput()}
            </div>
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    );
};

export default TypeableDropdown;