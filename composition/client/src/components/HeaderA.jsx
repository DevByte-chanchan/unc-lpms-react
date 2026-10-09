
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from '../styles/Header.module.sass'
import { getSession, logout } from '../utils/session'
import SignOutDialog from './SignOutDialog.jsx'

// HeaderA keeps the legacy component name used by several role pages, but
// consumes the canonical Header stylesheet so spacing and focus states stay
// identical to Header.
const HeaderA = ({name, role}) => {
    const session = getSession()
    const [showSignOut, setShowSignOut] = useState(false)
    const navigate = useNavigate()

    const confirmSignOut = () => {
        setShowSignOut(false)
        logout()
    }

    return (
        <div className={styles.header}>
            <div className={styles.department} />
            <div className={styles.info}>
                <div className={styles.name}> {session?.name || name} </div>
                <div className={styles.role}> {session?.roleLabel || role} </div>
            </div>
            {session &&
                <button type="button" onClick={() => navigate('/profile')} title="Profile and e-signature" className={styles.signOut}>
            {session &&
                <button type="button" onClick={() => setShowSignOut(true)} title="Sign out" className={styles.signOut}>
                    Sign out
                </button>
            }

            <SignOutDialog
                open={showSignOut}
                onConfirm={confirmSignOut}
                onCancel={() => setShowSignOut(false)}
            />
        </div>
    )
}

export default HeaderA
