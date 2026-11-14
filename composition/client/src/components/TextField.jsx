import styles from '../styles/Fields.module.sass'
import SpellCheckInput from './SpellCheckInput.jsx'

const TextField = ({ label, disabled, value, initialValue, onChange, error, placeholder, style, spellCheckEnabled = true }) => {

    // LOGIC: Use 'value' if controlled (forms), otherwise use 'initialValue' (read-only views)
    const actualValue = value !== undefined ? value : initialValue;

    return (
        // style prop lets callers align this field with DropdownA / DropdownMultiSelect
        // (all three have a default 20px left padding in their sass containers)
        <div className={`${styles.container} generic-field-container`} style={style}>
            <div className={`${styles.label} generic-field-label`}>{label}</div>

            {/* Wrapper holds the border */}
            <div className={`${styles.textfield} ${error ? styles.error : ''}`}>
                <SpellCheckInput
                    className={`${disabled ? styles['disabled-style'] : ''}`}
                    disabled={disabled}
                    value={actualValue || ''}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    type="text"
                    placeholder={placeholder}
                    spellCheckEnabled={spellCheckEnabled}
                />
            </div>

            {/* Red error text below */}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    )
}

export default TextField;
