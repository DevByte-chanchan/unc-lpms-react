import styles from '../styles/Fields.module.sass'

const TextField = ({ label, disabled, value, initialValue, onChange, error, placeholder, style }) => {

    // LOGIC: Use 'value' if controlled (forms), otherwise use 'initialValue' (read-only views)
    const actualValue = value !== undefined ? value : initialValue;

    return (
        // style prop lets callers align this field with DropdownA / DropdownMultiSelect
        // (all three have a default 20px left padding in their sass containers)
        <div className={styles.container} style={style}>
            <div className={styles.label}>{label}</div>

            {/* Wrapper holds the border */}
            <div className={`${styles.textfield} ${error ? styles.error : ''}`}>
                <input
                    className={`${disabled ? styles['disabled-style'] : ''}`}
                    disabled={disabled}
                    // Use the calculated actualValue here
                    value={actualValue || ''}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    type="text"
                    placeholder={placeholder}
                />
            </div>

            {/* Red error text below */}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    )
}

export default TextField;