import styles from '../styles/DropdownA.module.sass'



const DropdownA = ({ label, disabled, value, initialValue, options, inline = false, onChange, error }) => {



    const handleChange = (e) => {

        if (onChange) onChange(e.target.value)

    }



// LOGIC: Use 'value' if controlled, otherwise use 'initialValue'

    const actualValue = value !== undefined ? value : initialValue;



    const SelectElement = () => (

        <select

            className={`${disabled ? styles['disabled-style'] : ''}`}

            value={actualValue || ''}

            disabled={disabled}

            onChange={handleChange}

            style={{width: '100%', border: 'none', outline: 'none', background: 'transparent'}}

        >

            <option value="">Select an option</option>

            {options.map((option, index) => (

                <option key={index} value={option}>{option}</option>

            ))}

        </select>

    );



    if (inline) {

        return (

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                <div className={styles.label} style={{ fontWeight: 600 }}>{label}</div>

                <div

                    className={`${styles.dropdown} ${error ? styles.error : ''}`}

                    style={{ minWidth: 260, height: 44 }}

                >

                    <SelectElement />

                </div>

            </div>

        )

    }



    return (

        <div className={styles.container}>

            <div className={styles.label}>{label}</div>

            <div className={`${styles.dropdown} ${error ? styles.error : ''}`}>

                <SelectElement />

            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

        </div>

    )

}



export default DropdownA;