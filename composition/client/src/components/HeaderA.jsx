
import styles from '../styles/Header.module.sass'
import { getSession } from '../utils/session'

// HeaderA keeps the legacy component name used by several role pages, but
// consumes the canonical Header stylesheet so spacing and focus states stay
// identical to Header.
const HeaderA = ({name, role}) => {
    const session = getSession()
    return (
        <div className={styles.header}>
            <div className={styles.department} />
            <div className={styles.info}>
                <div className={styles.name}> {session?.name || name} </div>
                <div className={styles.role}> {session?.roleLabel || role} </div>
            </div>
        </div>
    )
}

export default HeaderA
