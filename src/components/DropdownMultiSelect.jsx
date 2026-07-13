import React, { useState, useRef, useEffect } from 'react';
import styles from '../styles/DropdownMultiSelect.module.sass';
import { ChevronDown, X } from 'react-feather';

const DropdownMultiSelect = ({ label, disabled, value = [], onChange, options = [], inline = false, error, style: containerStyle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggleOption = (option) => {
        if (disabled) return;
        const isSelected = value.includes(option);
        if (isSelected) {
            onChange(value.filter(item => item !== option));
        } else {
            onChange([...value, option]);
        }
    };

    const handleRemoveItem = (e, option) => {
        e.stopPropagation();
        if (disabled) return;
        onChange(value.filter(item => item !== option));
    };

    const RenderDisplayArea = () => (
        <div
            className={styles.dropdownField}
            onClick={() => !disabled && setIsOpen(!isOpen)}
        >
            <div className={styles.pillsContainer}>
                {value.length === 0 ? (
                    <span className={styles.placeholder}>Select options...</span>
                ) : (
                    value.map((item, index) => (
                        <div key={index} className={styles.pill}>
                            <span>{item}</span>
                            {!disabled && (
                                <button
                                    type="button"
                                    className={styles.pillRemoveBtn}
                                    onClick={(e) => handleRemoveItem(e, item)}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
            <ChevronDown
                size={16}
                className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ''}`}
            />
        </div>
    );

    if (inline) {
        return (
            <div ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={styles.label} style={{ fontWeight: 600 }}>{label}</div>
                <div
                    className={`${styles.dropdownContainer} ${error ? styles.error : ''} ${disabled ? styles['disabled-style'] : ''}`}
                    style={{ minWidth: 260, position: 'relative' }}
                >
                    <RenderDisplayArea />
                    {isOpen && !disabled && (
                        <div className={styles.optionsMenu}>
                            {options.map((option, idx) => {
                                const isSelected = value.includes(option);
                                return (
                                    <div
                                        key={idx}
                                        className={`${styles.menuOptionItem} ${isSelected ? styles.selectedOption : ''}`}
                                        onClick={() => handleToggleOption(option)}
                                    >
                                        <input type="checkbox" checked={isSelected} readOnly className={styles.optionCheckbox} />
                                        <span>{option}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div ref={dropdownRef} className={styles.container} style={containerStyle}>
            <div className={styles.label}>{label}</div>
            <div className={`${styles.dropdownContainer} ${error ? styles.error : ''} ${disabled ? styles['disabled-style'] : ''}`}>
                <RenderDisplayArea />
                {isOpen && !disabled && (
                    <div className={styles.optionsMenu}>
                        {options.length > 0 ? (
                            options.map((option, idx) => {
                                const isSelected = value.includes(option);
                                return (
                                    <div
                                        key={idx}
                                        className={`${styles.menuOptionItem} ${isSelected ? styles.selectedOption : ''}`}
                                        onClick={() => handleToggleOption(option)}
                                    >
                                        <input type="checkbox" checked={isSelected} readOnly className={styles.optionCheckbox} />
                                        <span>{option}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className={styles.noOptions}>No options available</div>
                        )}
                    </div>
                )}
            </div>
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    );
};

export default DropdownMultiSelect;