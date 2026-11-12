import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { LayoutDashboard, NotebookPen, TableProperties, Users, BookOpen, LogOut } from 'lucide-react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useCurrentUser } from '../services/currentUser.jsx'
import ConfirmModal from './ConfirmModal.jsx'

const SideNavigation = ({ mode = 'instructor' }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const { user, logout } = useCurrentUser()

    // --- MERGED SELECTION LOGIC ---
    let selected = searchParams.get('page');

    if (!selected) {
        if (location.pathname === '/' || location.pathname === '/dashboard') {
            selected = 'Dashboard';
        } else if (location.pathname.startsWith('/assignedtos') || location.pathname.startsWith('/tos')) {
            selected = 'TOS';
        } else if (location.pathname.startsWith('/assigned-courses') || location.pathname.startsWith('/courses')) {
            selected = 'Learning Plans';
        } else {
            selected = mode === 'instructor' ? 'Dashboard' : 'Learning Plans';
        }
    } else if (selected === 'Syllabus') {
        selected = 'Learning Plans';
    }

    const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const logoutRef = useRef(null)
    const navRef = useRef(null)
    const [pinned, setPinned] = useState(false)

    const handlePageChange = (page) => {
        if (page === 'Dashboard') {
            navigate('/');
        }
        else if (page === 'Learning Plans' || page === 'Syllabus') {
            if (mode === 'program-head') navigate('/role/program-head/approval-course-table?page=Learning%20Plans');
            else if (mode === 'dean') navigate('/role/dean?page=Learning%20Plans');
            else navigate('/assigned-courses');
        }
        else if (page === 'TOS') {
            navigate('/assignedtos');
        }
        else {
            setSearchParams({ page });
        }
    }

    const onLogoutClick = () => setConfirmLogoutOpen(true)

    const handleConfirmLogout = async () => {
        setConfirmLogoutOpen(false)
        await logout()
        navigate('/login', { replace: true })
    }

    useEffect(() => {
        if (!navRef.current) return
        let ro
        try {
            ro = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const w = entry.contentRect.width
                    setIsExpanded(w > 120)
                }
            })
            ro.observe(navRef.current)
        } catch (e) {}
        return () => { if (ro && navRef.current) ro.disconnect() }
    }, [])

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
                {mode === 'instructor' && (
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

                {mode !== 'hr-staff' && (
                    <div
                        onClick={() => handlePageChange('Learning Plans')}
                        className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${(selected === 'Learning Plans' || selected === 'Syllabus') ? styles.selected : ''}`}
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
                            onClick={() => { navigate('/role/program-head/industry-consultant?page=Industry%20Consultant') }}
                            className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${selected === 'Industry Consultant' ? styles.selected : ''}`}
                            title="Industry Consultant"
                            aria-label="Industry Consultant"
                        >
                            <Users size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Industry Consultant</span>}
                        </div>

                        <div
                            onClick={() => { navigate('/role/program-head/course-offerings?page=Course%20Offerings') }}
                            className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${selected === 'Course Offerings' ? styles.selected : ''}`}
                            title="Course Offerings"
                            aria-label="Course Offerings"
                        >
                            <BookOpen size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Course Offerings</span>}
                        </div>
                    </>
                )}

                {mode === 'dean' && (
                    <>
                        <div
                            onClick={() => { navigate('/role/dean?page=Faculty') }}
                            className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${selected === 'Faculty' ? styles.selected : ''}`}
                            title="Faculty"
                            aria-label="Faculty"
                        >
                            <Users size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Faculty</span>}
                        </div>

                        <div
                            onClick={() => { navigate('/role/dean?page=Programs') }}
                            className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${selected === 'Programs' ? styles.selected : ''}`}
                            title="Programs"
                            aria-label="Programs"
                        >
                            <BookOpen size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Programs</span>}
                        </div>
                    </>
                )}

                {mode === 'hr-staff' && (
                    <>
                        <div
                            onClick={() => { navigate('/role/hr-staff?page=Departments') }}
                            className={`${styles.list} ${!isExpanded ? styles.collapsed : ''} ${selected === 'Departments' ? styles.selected : ''}`}
                            title="Departments"
                            aria-label="Departments"
                        >
                            <Users size={20} strokeWidth={2} className={styles.navIcon} />
                            {isExpanded && <span className={styles.listText}>Departments</span>}
                        </div>
                    </>
                )}

                <div className={styles.logoutWrapper} ref={logoutRef}>
                    <div
                        className={`${styles.listB} ${!isExpanded ? styles.collapsed : ''}`}
                        onClick={onLogoutClick}
                        title="Log Out"
                        aria-label="Log Out"
                    >
                        <LogOut size={20} strokeWidth={2} color={'#F94545'} />
                        {isExpanded && <span className={styles.listText}>Log Out</span>}
                    </div>
                </div>
            </div>

            <ConfirmModal
                open={confirmLogoutOpen}
                title="Sign out of LPMS?"
                message={`You are currently signed in as ${user?.name || user?.email || 'this account'}. Do you want to end your session?`}
                confirmLabel="Sign Out"
                cancelLabel="Stay Signed In"
                danger={true}
                onConfirm={handleConfirmLogout}
                onCancel={() => setConfirmLogoutOpen(false)}
            />
        </div>
    )
}

export default SideNavigation