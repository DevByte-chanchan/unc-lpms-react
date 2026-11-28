import { useState, useRef, useEffect } from "react";
import styles from "../styles/CriteriaForGradingForm.module.sass";

const DropdownMultiSelect = ({ options = [], value = [], onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (option) => {
        const updated = value.includes(option)
            ? value.filter(o => o !== option)
            : [...value, option];

        onChange(updated);
    };

    return (
        <div className={styles.multiSelect} ref={ref}>
            <div className={styles.dropdown} onClick={() => setOpen(!open)}>
                {value.length ? value.join(", ") : "Select assessments"}
            </div>

            {open && (
                <div className={styles.dropdownMenu}>
                    {options.map(opt => (
                        <label
                            key={opt}
                            className={styles.option}
                            onClick={(e) => {
                                e.preventDefault();
                                toggleOption(opt);
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={value.includes(opt)}
                                readOnly
                            />
                            {opt}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DropdownMultiSelect;
