import styles from '../styles/MultiSelectA.module.sass'

const MultiSelectA = ({ label, disabled, value, initialValue = [], options = [], onChange, error }) => {

    // Logic: Use 'value' if controlled, otherwise fallback to 'initialValue'
    const actualValue = value !== undefined ? value : initialValue;

    const handleCheckboxChange = (option, isChecked) => {
        if (disabled || !onChange) return;

        let newSelectedOptions = [...actualValue];

        if (isChecked) {
            // Add option
            newSelectedOptions.push(option);
        } else {
            // Remove option
            newSelectedOptions = newSelectedOptions.filter(item => item !== option);
        }

        onChange(newSelectedOptions);
    };

    return (
        <div className={styles.container}>
            <div className={styles.label}>{label}</div>

            {/* Wrapper gets the error class */}
            <div className={`${styles.dropdown} ${error ? styles.error : ''} ${disabled ? styles['disabled-style'] : ''}`}>

                {options.length > 0 ? (
                    options.map((option, index) => {
                        const isChecked = actualValue.includes(option);
                        return (
                            <div key={index} className={styles.option}>
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={disabled}
                                    onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                                />
                                {option}
                            </div>
                        );
                    })
                ) : (
                    <div style={{color: '#999', fontSize: '14px', fontStyle: 'italic'}}>No options available</div>
                )}

            </div>
            {/* Error Message */}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    )
}

export default MultiSelectA;