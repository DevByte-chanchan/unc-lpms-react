import styles from '../styles/Fields.module.sass'
import SpellCheckInput from './SpellCheckInput.jsx'

const TextField = ({
    label,
    disabled,
    value,
    initialValue,
    onChange,
    onFocus,
    onBlur,
    error,
    placeholder,
    spellCheckEnabled = true,
    fieldId,
    isHighlighted = false
}) => {

    // LOGIC: Use 'value' if controlled (forms), otherwise use 'initialValue' (read-only views)
    const actualValue = value !== undefined ? value : initialValue;

    return (
        <div className={`${styles.container} generic-field-container`}>
            <div className={`${styles.label} generic-field-label`}>{label}</div>

            {/* Wrapper holds the border */}
            <div className={`${styles.textfield} ${error ? styles.error : ''} ${isHighlighted ? styles.spellHighlighted : ''}`}>
                <SpellCheckInput
                    className={`${disabled ? styles['disabled-style'] : ''}`}
                    disabled={disabled}
                    value={actualValue || ''}
                    onChange={(e) => onChange && onChange(e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    type="text"
                    placeholder={placeholder}
                    spellCheckEnabled={spellCheckEnabled}
                    data-spell-field-id={fieldId || undefined}
                />
            </div>

            {/* Red error text below */}
            {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
    )
}

export default TextField;
