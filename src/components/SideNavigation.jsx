import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { FileText, LogOut, Users, BookOpen, UserCheck, Grid, Award, Key } from 'react-feather'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCurrentUser } from '../services/currentUser.jsx'
import ConfirmModal from './ConfirmModal.jsx'

const SideNavigation = ({ mode: requestedMode = 'instructor' }) => {
    // There is no HR Staff role: its pages are the VPAA's.
    const mode = requestedMode === 'hr-staff' ? 'ovpaa' : requestedMode
    const { logout, roles } = useCurrentUser()
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()

    // --- MERGED SELECTION LOGIC ---
    // Program Heads and Deans don't write syllabi, so they have no Syllabus
    // page; VPAA never had one.
    const hasSyllabus = !['program-head', 'dean', 'ovpaa'].includes(mode)
    let defaultPage = 'Syllabus';
    if (mode === 'ovpaa') defaultPage = 'Dashboard';
    else if (mode === 'program-head') defaultPage = 'Course Offerings';
    else if (mode === 'dean') defaultPage = 'Faculty';
    let selected = searchParams.get('page') || defaultPage;

    if (location.pathname.startsWith('/assignedtos') || location.pathname.startsWith('/tos')) {
        selected = 'TOS';
    }

    const [isExpanded, setIsExpanded] = useState(false)
    const navRef = useRef(null)
    const [pinned, setPinned] = useState(false)

    const handlePageChange = (page) => {
        if (page === 'Syllabus') {
            navigate('/');
        }
        else if (page === 'TOS') {
            navigate('/assignedtos');
        }
        else {
            setSearchParams({ page });
        }
    }

    // Log Out only signs out, after a confirmation. Switching roles lives in the
    // header's user menu. Expiry / idle sign-outs don't come through here, so
    // they never show the pop-up.
    const [confirmLogout, setConfirmLogout] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)

    const signOut = async () => {
        setLoggingOut(true)
        try {
            // logout() clears the client session even when the server call fails.
            await logout()
        } catch (err) {
            console.error('Log out failed; signing out locally anyway.', err)
        }
        navigate('/login', { replace: true })
    }

    // --- RESIZE LOGIC ---
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
                {hasSyllabus && (
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

                        <div onClick={() => { navigate('/role/program-head/course-assignment?page=Course%20Assignment') }} className={`${styles.list} ${selected === 'Course Assignment' ? styles.selected : ''}`}>
                            <UserCheck size={24} /> <span className={styles.listText}>Course Assignment</span>
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

                        <div onClick={() => { navigate('/role/dean?page=Vision%20%26%20Mission') }} className={`${styles.list} ${selected === 'Vision & Mission' ? styles.selected : ''}`}>
                            <Award size={24} /> <span className={styles.listText}>Vision &amp; Mission</span>
                        </div>
                    </>
                )}

                {mode === 'ovpaa' && (
                    <>
                        <div onClick={() => { navigate('/role/ovpaa?page=Dashboard') }} className={`${styles.list} ${selected === 'Dashboard' ? styles.selected : ''}`}>
                            <BookOpen size={24} /> <span className={styles.listText}>Dashboard</span>
                        </div>

                        <div onClick={() => { navigate('/role/ovpaa?page=Department%20List') }} className={`${styles.list} ${selected === 'Department List' ? styles.selected : ''}`}>
                            <Users size={24} /> <span className={styles.listText}>Department List</span>
                        </div>

                        <div onClick={() => { navigate('/role/ovpaa?page=Learning%20Plan') }} className={`${styles.list} ${selected === 'Learning Plan' ? styles.selected : ''}`}>
                            <FileText size={24} /> <span className={styles.listText}>Learning Plan</span>
                        </div>

                        <div onClick={() => { navigate('/role/ovpaa?page=TOS') }} className={`${styles.list} ${selected === 'TOS' ? styles.selected : ''}`}>
                            <Grid size={24} /> <span className={styles.listText}>TOS</span>
                        </div>
                    </>
                )}

                {mode === 'ovpaa' && (
                    <div onClick={() => { navigate('/role/ovpaa?page=University%20VMGO') }} className={`${styles.list} ${selected === 'University VMGO' ? styles.selected : ''}`}>
                        <Award size={24} /> <span className={styles.listText}>University VMGO</span>
                    </div>
                )}

                {mode === 'ovpaa' && (
                    <div onClick={() => { navigate('/role/ovpaa?page=User%20Accounts') }} className={`${styles.list} ${selected === 'User Accounts' ? styles.selected : ''}`}>
                        <Key size={24} /> <span className={styles.listText}>User Accounts</span>
                    </div>
                )}

                <div className={styles.logoutWrapper}>
                    <div className={styles.listB} onClick={() => setConfirmLogout(true)} role="button">
                        <LogOut size={24} color={'#F94545'} /> <span className={styles.listText}>Log Out</span>
                    </div>
                </div>
            </div>

            {createPortal(<ConfirmModal
                open={confirmLogout}
                icon={LogOut}
                tone="destructive"
                title="Log out?"
                message={roles.length > 1
                    ? "You'll be signed out of all your roles. You'll need to sign in again to continue."
                    : "You'll need to sign in again to continue."}
                confirmLabel="Log out"
                busyLabel="Logging out…"
                busy={loggingOut}
                onConfirm={signOut}
                onCancel={() => { if (!loggingOut) setConfirmLogout(false) }}
            />, document.body)}
        </div>
    )
}

export default SideNavigation