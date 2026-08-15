
import styles from '../styles/Header.module.sass'
import { getSession, logout } from '../utils/session'

// The signed-in user wins over whatever a page passes in: the props are demo
// placeholders and letting them through is what made the account appear to
// switch between screens.
const Header = ({name, role}) => {
    const session = getSession()
    return (
        <div className={styles.header}>
            <div className={styles.department}>

            </div>
            <div className={styles.info}>
                <div className={styles.name}> {session?.name || name} </div>
                <div className={styles.role}> {session?.roleLabel || role} </div>
            </div>
            {session &&
                <button type="button" onClick={logout} title="Sign out" className={styles.signOut}>
                    Sign out
                </button>
            }

        </div>
    )
}

export default Header
