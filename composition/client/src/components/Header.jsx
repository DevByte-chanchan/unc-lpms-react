import styles from '../styles/Header.module.sass'
import { getSession } from '../utils/session'

// The top bar of every screen: the welcome line, and the department when a page passes one. Who is signed in
// (name, role, e-mail, avatar) is the card at the bottom of the sidebar. The signed-in user wins over whatever a
// page passes in: the props are demo placeholders and letting them through is what made the account appear to
// switch between screens.
const Header = ({ name, department }) => {
    const session = getSession()
    const shownName = session?.name || name
    return (
        <div className={styles.header}>
            <div className={styles.welcome}>
                <span className={styles.welcomeLabel}>Welcome,</span>
                <span className={styles.welcomeName}>{shownName}</span>
            </div>
            <div className={styles.department}>{department}</div>
        </div>
    )
}

export default Header
