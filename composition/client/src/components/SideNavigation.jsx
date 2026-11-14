import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { BookOpen, Briefcase, CheckCircle, Clipboard, Clock, FileText, Folder, GitMerge, Grid, Layers, LogOut, Sidebar, Target, UserCheck, Users } from 'react-feather'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { logout } from '../utils/session'
import { routes } from '../utils/routes.js';
import SignOutDialog from './SignOutDialog.jsx'
import { navigationIconName } from '../utils/navigationIcons.js'
import { useNav } from '../layouts/NavContext.js'

const NAVIGATION_ICON_COMPONENTS = {
    BookOpen,
    Briefcase,
    Clock,
    CheckCircle,
    Clipboard,
    FileText,
    Folder,
    Grid,
    GitMerge,
    Layers,
    Target,
    UserCheck,
    Users,
}

const NavigationIcon = ({ label }) => {
    const Icon = NAVIGATION_ICON_COMPONENTS[navigationIconName(label)] || FileText
    return <Icon size={24} />
}

const SideNavigation = ({ mode = 'instructor' }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()

    // --- MERGED SELECTION LOGIC ---
    let selected = searchParams.get('page') || 'Syllabus';

    // LPSM Instructor pages
    if (location.pathname.startsWith('/lpsm/instructor')) {
        selected = 'Syllabus';
    }

    if (location.pathname === '/dashboard') selected = 'Dashboard';

    // LPSM Program Head pages
    if (location.pathname.startsWith(routes.coaepView())) {
        selected = 'COAEP';
    }
    if (location.pathname.startsWith('/role/program-head/course-assignment')) {
        selected = 'Course Assignment';
    }
    if (location.pathname.startsWith('/role/program-head/program-documents')) {
        selected = 'Program Documents';
    }
    if (location.pathname.startsWith('/role/program-head/outcomes-alignment')) {
        selected = 'Outcomes Alignment';
    }

    // LPSM Director of Libraries pages
    if (location.pathname.startsWith('/role/director-of-libraries/reference-library') ||
        location.pathname.startsWith('/role/director-of-libraries/add-reference') ||
        location.pathname.startsWith('/role/director-of-libraries/view-reference') ||
        location.pathname.startsWith('/role/director-of-libraries/edit-reference')) {
        selected = 'Reference Library';
    }
    if (location.pathname.startsWith(routes.referenceLibrary())) {
        selected = 'Upload Documents';
    }

    const [showPopup, setShowPopup] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const navRef = useRef(null)
    const nav = useNav()

    const handlePageChange = (page) => {
        if (page === 'Syllabus') {
            if (mode === 'program-head') navigate('/role/program-head/approval-course-table?page=Syllabus');
            else if (mode === 'dean') navigate('/role/dean?page=Syllabus');
            else if (mode === 'director-of-libraries') navigate('/role/director-of-libraries/approval-course-table?page=Syllabus');
            else if (mode === 'industry-consultant') navigate('/role/industry-consultant/approval-course-table?page=Syllabus');
            else navigate('/');
        }
        else {
            setSearchParams({ page });
        }
    }

    const onLogoutClick = () => setShowPopup(true)
    const activateWithKeyboard = (event, action) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            action()
        }
    }

    // Log Out used to open a "Select role" list that jumped straight into
    // another role's view — that is the mid-flow account switch the panel saw
    // [45:27] [45:45]. It now ends the session; changing role means signing in
    // as that person.
    const confirmLogout = () => {
        setShowPopup(false)
        logout()
        navigate('/', { replace: true })
    }

    useEffect(() => {
        setShowPopup(false)
    }, [selected])

    useEffect(() => {
        const navElement = navRef.current
        if (!navElement) return
        let ro
        try {
            ro = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const w = entry.contentRect.width
                    setIsExpanded(w > 120)
                }
            })
            ro.observe(navElement)
        } catch (e) { console.warn('ResizeObserver failed', e) }
        return () => { if (ro) ro.disconnect() }
    }, [])

    return (
        <div ref={navRef} className={styles.container}>
            <div className={styles.logo}>
                <img src={unclogo} alt="University Of Nueva Caceres Logo" />
                {nav.available && (
                    <button type="button" className={styles.navToggle} onClick={nav.toggle}
                        aria-label={nav.collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!nav.collapsed}
                        title={nav.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                        <Sidebar size={18} />
                    </button>
                )}
            </div>
            {isExpanded && (
                <div className={styles.lpms}>Learning Plan<br />Management System</div>
            )}

            <div className={styles['nav-list']}>
                {mode === 'instructor' && (
                    <div onClick={() => navigate('/dashboard')} className={`${styles.list} ${selected === 'Dashboard' ? styles.selected : ''}`} role="link" tabIndex={0} title="Dashboard" aria-label="Dashboard" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/dashboard'))}>
                        <NavigationIcon label="Dashboard" /> <span className={styles.listText}>Dashboard</span>
                    </div>
                )}

                {mode !== 'vpaa' && mode !== 'superuser' && (
                    <div
                        onClick={() => handlePageChange('Syllabus')}
                        className={`${styles.list} ${selected === 'Syllabus' && location.pathname !== '/dashboard' ? styles.selected : ''}`}
                        role="link"
                        tabIndex={0}
                        title="Learning Plan"
                        aria-label="Learning Plan"
                        onKeyDown={(event) => activateWithKeyboard(event, () => handlePageChange('Syllabus'))}
                    >
                        <NavigationIcon label="Learning Plan" />
                        <span className={styles.listText}>Learning Plan</span>
                    </div>
                )}



                {mode === 'program-head' && (
                    <>
                        <div onClick={() => { navigate('/role/program-head/course-assignment') }} className={`${styles.list} ${selected === 'Course Assignment' ? styles.selected : ''}`} role="link" tabIndex={0} title="Course Assignment" aria-label="Course Assignment" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/program-head/course-assignment'))}>
                            <NavigationIcon label="Course Assignment" /> <span className={styles.listText}>Course Assignment</span>
                        </div>

                        <div onClick={() => { navigate('/role/program-head/program-documents') }} className={`${styles.list} ${selected === 'Program Documents' ? styles.selected : ''}`} role="link" tabIndex={0} title="Program Documents" aria-label="Program Documents" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/program-head/program-documents'))}>
                            <NavigationIcon label="Program Documents" /> <span className={styles.listText}>Program Documents</span>
                        </div>
                    </>
                )}

                {mode === 'director-of-libraries' && (
                    <>
                        <div onClick={() => { navigate('/role/director-of-libraries/reference-library') }} className={`${styles.list} ${selected === 'Reference Library' ? styles.selected : ''}`} role="link" tabIndex={0} title="Reference Library" aria-label="Reference Library" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/director-of-libraries/reference-library'))}>
                            <NavigationIcon label="Reference Library" /> <span className={styles.listText}>Reference Library</span>
                        </div>
                    </>
                )}

                

                {mode === 'superuser' && (
                    <div onClick={() => { navigate(routes.userManagement()) }} className={`${styles.list} ${styles.selected}`} role="link" tabIndex={0} title="User Management" aria-label="User Management" onKeyDown={(event) => activateWithKeyboard(event, () => navigate(routes.userManagement()))}>
                        <NavigationIcon label="User Management" /> <span className={styles.listText}>User Management</span>
                    </div>
                )}

                {mode === 'vpaa' && (
                    <>
                        <div onClick={() => { navigate('/role/vpaa?page=Approved%20Plans') }} className={`${styles.list} ${selected === 'Approved Plans' ? styles.selected : ''}`} role="link" tabIndex={0} title="Approved Plans" aria-label="Approved Plans" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/vpaa?page=Approved%20Plans'))}>
                            <NavigationIcon label="Approved Plans" /> <span className={styles.listText}>Approved Plans</span>
                        </div>
                        <div onClick={() => { navigate('/role/vpaa?page=User%20Accounts') }} className={`${styles.list} ${selected === 'User Accounts' ? styles.selected : ''}`} role="link" tabIndex={0} title="User Accounts" aria-label="User Accounts" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/vpaa?page=User%20Accounts'))}>
                            <NavigationIcon label="User Management" /> <span className={styles.listText}>User Accounts</span>
                        </div>
                    </>
                )}

                <div className={styles.logoutWrapper}>
                    <div className={styles.listB} onClick={onLogoutClick} role="button" tabIndex={0} title="Log Out" aria-label="Log Out" onKeyDown={(event) => activateWithKeyboard(event, onLogoutClick)}>
                        <LogOut size={24} /> <span className={styles.listText}>Log Out</span>
                    </div>
                </div>

                <SignOutDialog
                    open={showPopup}
                    onConfirm={confirmLogout}
                    onCancel={() => setShowPopup(false)}
                />
            </div>
        </div>
    )
}

export default SideNavigation
