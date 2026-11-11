import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { FileText, LogOut, Users, BookOpen, Grid } from 'react-feather'
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
            selected = 'Syllabus';
        } else {
            selected = mode === 'instructor' ? 'Dashboard' : 'Syllabus';
        }
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
        else if (page === 'Syllabus') {
            if (mode === 'program-head') navigate('/role/program-head/approval-course-table?page=Syllabus');
            else if (mode === 'dean') navigate('/role/dean?page=Syllabus');
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
                        className={`${styles.list} ${selected === 'Dashboard' ? styles.selected : ''}`}
                    >
                        <Grid size={24} />
                        <span className={styles.listText}>Dashboard</span>
                    </div>
                )}

                {mode !== 'hr-staff' && (
                    <div
                        onClick={() => handlePageChange('Syllabus')}
                        className={`${styles.list} ${selected === 'Syllabus' ? styles.selected : ''}`}
                    >
                        <FileText size={24} />
                        <span className={styles.listText}>Syllabus</span>
                    </div>
                )}

                {mode === 'instructor' && (
                    <div
                        onClick={() => handlePageChange('TOS')}
                        className={`${styles.list} ${selected === 'TOS' ? styles.selected : ''}`}
                    >
                        <FileText size={24} />
                        <span className={styles.listText}>TOS</span>
                    </div>
                )}

                {mode === 'program-head' && (
                    <>
                        <div onClick={() => { navigate('/role/program-head/industry-consultant?page=Industry%20Consultant') }} className={`${styles.list} ${selected === 'Industry Consultant' ? styles.selected : ''}`}>
                            <Users size={24} /> <span className={styles.listText}>Industry Consultant</span>
                        </div>

                        <div onClick={() => { navigate('/role/program-head/course-offerings?page=Course%20Offerings') }} className={`${styles.list} ${selected === 'Course Offerings' ? styles.selected : ''}`}>
                            <BookOpen size={24} /> <span className={styles.listText}>Course Offerings</span>
                        </div>
                    </>
                )}

                {mode === 'dean' && (
                    <>
                        <div onClick={() => { navigate('/role/dean?page=Faculty') }} className={`${styles.list} ${selected === 'Faculty' ? styles.selected : ''}`}>
                            <Users size={24} /> <span className={styles.listText}>Faculty</span>
                        </div>

                        <div onClick={() => { navigate('/role/dean?page=Programs') }} className={`${styles.list} ${selected === 'Programs' ? styles.selected : ''}`}>
                            <BookOpen size={24} /> <span className={styles.listText}>Programs</span>
                        </div>
                    </>
                )}

                {mode === 'hr-staff' && (
                    <>
                        <div onClick={() => { navigate('/role/hr-staff?page=Departments') }} className={`${styles.list} ${selected === 'Departments' ? styles.selected : ''}`}>
                            <Users size={24} /> <span className={styles.listText}>Departments</span>
                        </div>
                    </>
                )}

                <div className={styles.logoutWrapper} ref={logoutRef}>
                    <div className={styles.listB} onClick={onLogoutClick}>
                        <LogOut size={24} color={'#F94545'} /> <span className={styles.listText}>Log Out</span>
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
