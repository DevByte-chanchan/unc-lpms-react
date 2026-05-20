import styles from '../styles/Fields.module.sass'

const TextField = ({ label, disabled, value, initialValue, onChange, error, placeholder }) => {

    // LOGIC: Use 'value' if controlled (forms), otherwise use 'initialValue' (read-only views)
    const actualValue = value !== undefined ? value : initialValue;

    return (
        <div className={styles.container}>
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