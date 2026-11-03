import styles from '../styles/Header.module.sass'
import { getSession } from '../utils/session'

// The top bar of every screen: just the welcome line. Search lives with each list's filters, notifications in
// the sidebar. Who is signed in (name, role, e-mail, avatar) is the card at the bottom of the sidebar. The signed-in user wins over whatever a page passes in: the props
// are demo placeholders and letting them through is what made the account appear to switch between screens.
const Header = ({ name }) => {
    const session = getSession()
    const shownName = session?.name || name
    return (
        <div className={styles.header}>
            <div className={styles.welcome}>
                <span className={styles.welcomeLabel}>Welcome,</span>
                <span className={styles.welcomeName}>{shownName}</span>
            </div>
            <div className={styles.department} />
        </div>
    )
}

export default Header
