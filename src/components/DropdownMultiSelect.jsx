import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/DropdownMultiSelect.module.sass';
import { ChevronDown, X } from 'react-feather';

const DropdownMultiSelect = ({ label, disabled, value = [], onChange, options = [], inline = false, error, style: containerStyle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const [menuStyle, setMenuStyle] = useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
            if (menuRef.current && menuRef.current.contains(event.target)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Position the portalled menu (non-inline) with fixed coordinates so it can't be
    // clipped by scrolling/overflow-hidden ancestors. Auto-flips up/down based on space.
    const computePosition = () => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        const desiredMaxH = 220;
        const spaceBelow = window.innerHeight - r.bottom;
        const spaceAbove = r.top;
        const openUp = spaceBelow < Math.min(desiredMaxH, 180) && spaceAbove > spaceBelow;
        const maxHeight = Math.max(120, Math.min(desiredMaxH, (openUp ? spaceAbove : spaceBelow) - 12));
        const style = {
            position: 'fixed',
            left: r.left,
            width: r.width,
            maxHeight,
            zIndex: 100000,
        };
        if (openUp) {
            style.bottom = window.innerHeight - r.top + 4;
            style.top = 'auto';
        } else {
            style.top = r.bottom + 4;
            style.bottom = 'auto';
        }
        setMenuStyle(style);
    };

    useLayoutEffect(() => {
        if (!isOpen || inline) return;
        computePosition();
        const onChangeView = () => computePosition();
        window.addEventListener('scroll', onChangeView, true);
        window.addEventListener('resize', onChangeView);
        return () => {
            window.removeEventListener('scroll', onChangeView, true);
            window.removeEventListener('resize', onChangeView);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, inline]);

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

    const OptionRows = () => (
        options.length > 0 ? (
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
        )
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
            {label != null && label !== '' && <div className={styles.label}>{label}</div>}
            <div
                ref={triggerRef}
                className={`${styles.dropdownContainer} ${error ? styles.error : ''} ${disabled ? styles['disabled-style'] : ''}`}
            >
                <RenderDisplayArea />
            </div>
            {isOpen && !disabled && menuStyle && createPortal(
                <div ref={menuRef} className={styles.optionsMenu} style={{ ...menuStyle, overflowY: 'auto' }}>
                    <OptionRows />
                </div>,
                document.body
            )}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    );
};

export default DropdownMultiSelect;
