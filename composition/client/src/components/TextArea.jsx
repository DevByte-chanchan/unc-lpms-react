import styles from '../styles/Fields.module.sass'

const TextArea = ({ label, disabled, value, initialValue, onChange, error, rows = 3, placeholder }) => {

    // Logic: Use 'value' if provided (controlled), otherwise fallback to 'initialValue'
    const actualValue = value !== undefined ? value : initialValue;

    return (
        <div className={styles.container}>
            <div className={styles.label}>{label}</div>

            {/* Wrapper holds the border.
                Added height: 'auto' so it wraps around the multi-line text area properly
            */}
            <div
                className={`${styles.textfield} ${error ? styles.error : ''}`}
                style={{ height: 'auto' }}
            >
                <textarea
                    rows={rows}
                    className={`${disabled ? styles['disabled-style'] : ''}`}
                    disabled={disabled}
                    value={actualValue || ''}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    placeholder={placeholder}
                    // Basic styling overrides to ensure it behaves well inside the flex container
                    style={{ resize: 'vertical', display: 'block' }}
                >
                </textarea>
            </div>

            {/* Red error text below */}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    )
}

export default TextArea;