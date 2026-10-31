import { Search } from 'react-feather'
import styles from '../styles/Header.module.sass'
import { getSession } from '../utils/session'
import { setPageSearch, usePageSearchBox } from '../utils/pageSearch.js'
import NotificationBell from './NotificationBell.jsx'

// The top bar of every screen: a welcome line, a search box when the page has a list to search, and
// notifications. Who is signed in (name, role, e-mail, avatar) is the card at the bottom of the sidebar. The signed-in user wins over whatever a page passes in: the props
// are demo placeholders and letting them through is what made the account appear to switch between screens.
const Header = ({ name }) => {
    const session = getSession()
    const box = usePageSearchBox()
    const shownName = session?.name || name
    return (
        <div className={styles.header}>
            <div className={styles.welcome}>
                <span className={styles.welcomeLabel}>Welcome,</span>
                <span className={styles.welcomeName}>{shownName}</span>
            </div>
            <div className={styles.department} />
            {box.active && (
                <div className={styles.search}>
                    <Search size={16} aria-hidden="true" />
                    <input value={box.query} onChange={(event) => setPageSearch(event.target.value)}
                        placeholder={box.placeholder} aria-label={box.placeholder} />
                </div>
            )}
            {session && session.role !== 'superuser' && <NotificationBell variant="topbar" />}
        </div>
    )
}

export default Header
