import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { LayoutDashboard, NotebookPen, TableProperties, Users, BookOpen, LogOut, UserCheck } from 'lucide-react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmModal from './ConfirmModal.jsx'

const SideNavigation = ({ mode = 'instructor' }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()

    // --- MERGED SELECTION LOGIC ---
    let defaultPage = 'Syllabus';
    if (mode === 'ovpaa') defaultPage = 'Dashboard';
    let selected = searchParams.get('page') || defaultPage;

    if (location.pathname === '/assignedtos' || location.pathname.startsWith('/tos/') || location.pathname === '/role/program-head/tos') {
        selected = 'TOS';
    } else if (location.pathname === '/dashboard' || location.pathname === '/role/program-head/dashboard') {
        selected = 'Dashboard';
    }

    const [showPopup, setShowPopup] = useState(false)
    const [confirmLogout, setConfirmLogout] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const logoutRef = useRef(null)
    const navRef = useRef(null)
    const [pinned, setPinned] = useState(false)

    const handlePageChange = (page) => {
        if (page === 'Dashboard') {
            if (mode === 'program-head') {
                navigate('/role/program-head/dashboard');
            } else {
                navigate('/dashboard');
            }
        }
        else if (page === 'Syllabus') {
            if (mode === 'program-head') navigate('/role/program-head/approval-course-table?page=Syllabus');
            else if (mode === 'dean') navigate('/role/dean?page=Syllabus');
            else navigate('/');
        }
        else if (page === 'TOS') {
            if (mode === 'program-head') {
                navigate('/role/program-head/tos');
            } else {
                navigate('/assignedtos');
            }
        }
        else {
            setSearchParams({ page });
        }
    }

    const onLogoutClick = () => {
        setShowPopup(false)
        setConfirmLogout(true)
    }

    const handleConfirmLogout = () => {
        setLoggingOut(true)
        setTimeout(() => {
            setLoggingOut(false)
            setConfirmLogout(false)
            navigate('/login', { replace: true })
        }, 250)
    }

    const gotoRole = (path) => {
        setShowPopup(false)
        navigate(path)
    }

    // --- POPUP & RESIZE LOGIC ---
    useEffect(() => {
        const handler = (e) => {
            if (!showPopup) return
            if (logoutRef.current && !logoutRef.current.contains(e.target)) setShowPopup(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showPopup])

    useEffect(() => {
        if (showPopup) setShowPopup(false)
    }, [selected])

    useEffect(() => {
        if (!navRef.current) return
        let ro
        try {
            ro = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const w = entry.contentRect.width
                    setIsExpanded(w > 120)
                    if (w < 100 && showPopup) {
                        setShowPopup(false)
                    }
                }
            })
            ro.observe(navRef.current)
        } catch (e) {}
        return () => { if (ro && navRef.current) ro.disconnect() }
    }, [showPopup])

    useEffect(() => {
        const el = navRef.current
        if (!el) return
        const findSidebarAncestor = (node) => {
            let n = node.parentElement
            while (n && n !== document.body) {
                try {
                    const w = window.getComputedStyle(n).width
                    const num = parseFloat(w)
                    if (!isNaN(num) && num <= 110) return n
                } catch (e) {}
                n = n.parentElement
            }
            return null
        }
        const target = findSidebarAncestor(el) || el.parentElement
        const enter = () => { if (target && !pinned) { target.classList.add('expanded'); target.classList.add('expanded-left') } }
        const leave = () => { if (target && !pinned) { target.classList.remove('expanded'); target.classList.remove('expanded-left') } }
        el.addEventListener('mouseenter', enter)
        el.addEventListener('mouseleave', leave)
        return () => {
            el.removeEventListener('mouseenter', enter)
            el.removeEventListener('mouseleave', leave)
            if (target) { target.classList.remove('expanded'); target.classList.remove('expanded-left') }
        }
    }, [pinned])

    return (
        <div ref={navRef} className={styles.container}>
            <div className={styles.logo}>
                <img src={unclogo} alt="University Of Nueva Caceres Logo" onClick={() => {
                    setPinned(p => !p)
                    const target = navRef.current ? navRef.current.parentElement : null
                    if (target) { target.classList.toggle('expanded'); target.classList.toggle('expanded-left') }
                }} style={{ cursor: 'pointer' }} />
            </div>

            {/* Dynamic Title with 3-line format */}
            <div className={styles.lpms}>
                {isExpanded ? (
                    <>
                        Learning Plan<br />
                        Management System
                    </>
                ) : (
                    "LPMS"
                )}
            </div>

            <div className={styles['nav-list']}>
                {mode !== 'hr-staff' && mode !== 'ovpaa' && (
                    <div
                        onClick={() => handlePageChange('Dashboard')}
                        className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${selected === 'Dashboard' ? styles.selected : ''}`}
                        title="Dashboard"
                        aria-label="Dashboard"
                    >
                        <LayoutDashboard size={20} strokeWidth={2} className={styles.navIcon} />
                        {isExpanded && <span className={styles.listText}>Dashboard</span>}
                    </div>
                )}

                {mode !== 'hr-staff' && mode !== 'ovpaa' && (
                    <div
                        className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled} ${selected === 'Syllabus' ? styles.selected : ''}`}
                        title="Learning Plans"
                        aria-label="Learning Plans"
                    >
                        <NotebookPen size={20} strokeWidth={2} className={styles.navIcon} />
                        {isExpanded && <span className={styles.listText}>Learning Plans</span>}
                    </div>
                )}

                {mode === 'instructor' && (
                    <div
                        onClick={() => handlePageChange('TOS')}
                        className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${selected === 'TOS' ? styles.selected : ''}`}
                        title="TOS"
                        aria-label="TOS"
                    >
                        <TableProperties size={20} strokeWidth={2} className={styles.navIcon} />
                        {isExpanded && <span className={styles.listText}>TOS</span>}
                    </div>
                )}

                {mode === 'program-head' && (
                    <>
                        <div
                            onClick={() => handlePageChange('TOS')}
                            className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${selected === 'TOS' ? styles.selected : ''}`}
                            title="TOS"
                            aria-label="TOS"
                        >
                            <TableProperties size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>TOS</span>}
                        </div>

                        <div className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled}`} title="Industry Consultant">
                            <Users size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Industry Consultant</span>}
                        </div>

                        <div className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled}`} title="Course Offerings">
                            <BookOpen size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Course Offerings</span>}
                        </div>

                        <div className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled}`} title="Course Assignment">
                            <UserCheck size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Course Assignment</span>}
                        </div>
                    </>
                )}

                {mode === 'dean' && (
                    <>
                        <div className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled}`}>
                            <Users size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Faculty</span>}
                        </div>

                        <div className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled}`}>
                            <BookOpen size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Programs</span>}
                        </div>
                    </>
                )}

                {(mode === 'ovpaa' || mode === 'hr-staff') && (
                    <>
                        <div className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled}`}>
                            <BookOpen size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Dashboard</span>}
                        </div>

                        <div className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled}`}>
                            <Users size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Department List</span>}
                        </div>

                        <div className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled}`}>
                            <NotebookPen size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Learning Plan</span>}
                        </div>

                        <div className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${styles.disabled}`}>
                            <TableProperties size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>TOS</span>}
                        </div>
                    </>
                )}

                <div className={styles.logoutWrapper} ref={logoutRef}>
                    <div className={`${styles.listB} ${!isExpanded ? styles.collapsed : ''}`} onClick={onLogoutClick} title="Log Out" aria-label="Log Out">
                        <LogOut size={20} strokeWidth={2} color={'#F94545'} />
                        {isExpanded && <span className={styles.listText}>Log Out</span>}
                    </div>

                    {showPopup && (
                        <div className={styles.rolePopup}>
                            <div className={styles.popupTitle}>Select role</div>
                            <button className={styles.popupItem} onClick={() => { setShowPopup(false); navigate('/dashboard') }}>Instructor</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/program-head/dashboard')}>Program head</button>
                            <button className={`${styles.popupItem} ${styles.disabled}`}>Director of Libraries</button>
                            <button className={`${styles.popupItem} ${styles.disabled}`}>Industry Consultant</button>
                            <button className={`${styles.popupItem} ${styles.disabled}`}>Dean</button>
                            <button className={`${styles.popupItem} ${styles.disabled}`}>OIC-OVPAA</button>
                        </div>
                    )}
                </div>
            </div>

            {createPortal(
                <ConfirmModal
                    open={confirmLogout}
                    icon={LogOut}
                    tone="destructive"
                    title="Log out?"
                    message="You'll need to sign in again to continue."
                    confirmLabel="Log out"
                    busyLabel="Logging out…"
                    busy={loggingOut}
                    onConfirm={handleConfirmLogout}
                    onCancel={() => { if (!loggingOut) setConfirmLogout(false) }}
                />,
                document.body
            )}
        </div>
    )
}

export default SideNavigation