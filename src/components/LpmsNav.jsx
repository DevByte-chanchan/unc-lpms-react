import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { BookOpen, Settings, LogOut } from 'react-feather'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'

const LpmsNav = ({ role = 'instructor' }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const [showPopup, setShowPopup] = useState(false)
    const logoutRef = useRef(null)
    const navRef = useRef(null)
    const [pinned, setPinned] = useState(false)

    const getRoleTitle = () => {
        const titles = {
            'instructor': 'Instructor',
            'program-head': 'Program Head',
            'director': 'Director of Libraries'
        }
        return titles[role] || 'User'
    }

    const getNavItems = () => {
        const routes = {
            'instructor': [
                { label: 'Review Syllabi', path: '/lpsm/instructor/documents/2', icon: 'document' },
                { label: 'Settings', path: '/settings', icon: 'settings' }
            ],
            'program-head': [
                { label: 'My Syllabi', path: '/lpsm/program-head/dashboard', icon: 'document' },
                { label: 'Settings', path: '/settings', icon: 'settings' }
            ],
            'director': [
                { label: 'Reference Library', path: '/lpsm/director-of-libraries/dashboard', icon: 'book' },
                { label: 'Settings', path: '/settings', icon: 'settings' }
            ]
        }
        return routes[role] || []
    }

    const isSelected = (path) => location.pathname === path

    const onLogoutClick = () => setShowPopup((prev) => !prev)

    const gotoRole = (path) => {
        setShowPopup(false)
        navigate(path)
    }

    useEffect(() => {
        const handler = (e) => {
            if (!showPopup) return
            if (logoutRef.current && !logoutRef.current.contains(e.target)) setShowPopup(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showPopup])

    useEffect(() => {
        if (!navRef.current) return
        let ro
        try {
            ro = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const w = entry.contentRect.width
                    if (w < 100 && showPopup) {
                        setShowPopup(false)
                    }
                }
            })
            ro.observe(navRef.current)
        } catch (e) {}
        return () => { if (ro && navRef.current) ro.disconnect() }
    }, [showPopup])

    return (
        <div className={styles.container} ref={navRef}>
            <div className={styles.logo}>
                <img src={unclogo} alt="UNC Logo" />
            </div>
            <div className={styles.lpms}>
                LPMS<br />{getRoleTitle()}
            </div>
            <div className={styles['nav-list']}>
                {getNavItems().map((item) => (
                    <div
                        key={item.path}
                        className={`${styles.list} ${isSelected(item.path) ? styles.selected : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        {item.icon === 'document' && <BookOpen size={20} />}
                        {item.icon === 'settings' && <Settings size={20} />}
                        <span className={styles.listText}>{item.label}</span>
                    </div>
                ))}
                <div className={styles.logoutWrapper} ref={logoutRef}>
                    <div className={styles.listB} onClick={onLogoutClick}>
                        <LogOut size={20} />
                        <span className={styles.listText}>Log Out</span>
                    </div>
                    {showPopup && (
                        <div className={styles.rolePopup}>
                            <div className={styles.popupTitle}>Switch Role</div>
                            <button className={styles.popupItem} onClick={() => gotoRole('/lpsm/instructor/documents/2')}>
                                Instructor
                            </button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/lpsm/program-head/dashboard')}>
                                Program Head
                            </button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/lpsm/director-of-libraries/dashboard')}>
                                Director of Libraries
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LpmsNav
