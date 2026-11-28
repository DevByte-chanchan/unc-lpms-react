import styles from '../styles/Fields.module.sass'
import SpellCheckInput from './SpellCheckInput.jsx'

const TextArea = ({ label, disabled, value, initialValue, onChange, error, rows = 3, placeholder, spellCheckEnabled = true }) => {

    // Logic: Use 'value' if provided (controlled), otherwise fallback to 'initialValue'
    const actualValue = value !== undefined ? value : initialValue;

    return (
        <div className={`${styles.container} generic-field-container`}>
            <div className={`${styles.label} generic-field-label`}>{label}</div>

            {/* Wrapper holds the border.
                Added height: 'auto' so it wraps around the multi-line text area properly
            */}
            <div
                className={`${styles.textfield} ${error ? styles.error : ''}`}
                style={{ height: 'auto' }}
            >
                <SpellCheckInput
                    multiline={true}
                    rows={rows}
                    className={`${disabled ? styles['disabled-style'] : ''}`}
                    disabled={disabled}
                    value={actualValue || ''}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{ resize: 'vertical', display: 'block' }}
                    spellCheckEnabled={spellCheckEnabled}
                />
            </div>

            {/* Red error text below */}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    )
}

export default TextArea;
