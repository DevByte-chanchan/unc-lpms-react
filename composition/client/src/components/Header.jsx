import { Search } from 'react-feather'
import styles from '../styles/Header.module.sass'
import { getSession } from '../utils/session'
import { setPageSearch, usePageSearchBox } from '../utils/pageSearch.js'
import { initialsOf } from '../utils/userInitials.js'
import NotificationBell from './NotificationBell.jsx'

// The top bar of every screen: a search box when the page has a list to search,
// notifications, and who is signed in. The signed-in user wins over whatever a page passes in: the props
// are demo placeholders and letting them through is what made the account appear to switch between screens.
const Header = ({ name, role }) => {
    const session = getSession()
    const box = usePageSearchBox()
    const shownName = session?.name || name
    return (
        <div className={styles.header}>
            {box.active && (
                <div className={styles.search}>
                    <Search size={16} aria-hidden="true" />
                    <input value={box.query} onChange={(event) => setPageSearch(event.target.value)}
                        placeholder={box.placeholder} aria-label={box.placeholder} />
                </div>
            )}
            <div className={styles.department} />
            {session && session.role !== 'superuser' && <NotificationBell variant="topbar" />}
            <div className={styles.person}>
                <div className={styles.info}>
                    <div className={styles.name}> {shownName} </div>
                    <div className={styles.role}> {session?.roleLabel || role} </div>
                </div>
                <div className={styles.avatar} aria-hidden="true">{initialsOf(shownName)}</div>
            </div>
        </div>
    )
}

export default Header
