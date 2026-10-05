import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { BookOpen, CheckCircle, Clipboard, FileText, GitMerge, Layers, LogOut, Target } from 'react-feather'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { logout } from '../utils/session'
import { routes } from '../utils/routes.js';
import SignOutDialog from './SignOutDialog.jsx'
import { navigationIconName } from '../utils/navigationIcons.js'

const NAVIGATION_ICON_COMPONENTS = {
    BookOpen,
    CheckCircle,
    Clipboard,
    FileText,
    GitMerge,
    Layers,
    Target,
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

    // LPSM Program Head pages
    if (location.pathname.startsWith(routes.coaepView())) {
        selected = 'COAEP';
    }
    if (location.pathname.startsWith('/role/program-head/co-po-alignment')) {
        selected = 'CO & PO Alignment';
    }
    if (location.pathname.startsWith('/role/program-head/po-peo-alignment')) {
        selected = 'PO & PEO Alignment';
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
    if (location.pathname.startsWith('/role/director-of-libraries/course-catalog')) {
        selected = 'Course Catalog';
    }

    const [showPopup, setShowPopup] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const navRef = useRef(null)
    const [pinned, setPinned] = useState(false)

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
                } catch (e) { console.warn('Failed to parse width', e) }
                n = n.parentElement
            }
            return null
        }
        const target = findSidebarAncestor(el) || el.parentElement
        const toggle = (add) => { if (target) { target.classList.toggle('expanded', add); target.classList.toggle('expanded-left', add) }; document.body.classList.toggle('sidebar-expanded', add) }
        const enter = () => { if (!pinned) toggle(true) }
        const leave = () => { if (!pinned) toggle(false) }
        el.addEventListener('mouseenter', enter)
        el.addEventListener('mouseleave', leave)
        return () => {
            el.removeEventListener('mouseenter', enter)
            el.removeEventListener('mouseleave', leave)
            toggle(false)
        }
    }, [pinned])

    return (
        <div ref={navRef} className={styles.container}>
            <div className={styles.logo}>
                <img src={unclogo} alt="University Of Nueva Caceres Logo" onClick={() => {
                    setPinned(p => !p)
                    const target = navRef.current ? navRef.current.parentElement : null
                    if (target) { target.classList.toggle('expanded'); target.classList.toggle('expanded-left') }
                    document.body.classList.toggle('sidebar-expanded')
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
                {mode !== 'vpaa' && (
                    <div
                        onClick={() => handlePageChange('Syllabus')}
                        className={`${styles.list} ${selected === 'Syllabus' ? styles.selected : ''}`}
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
                        <div onClick={() => { navigate('/role/program-head/co-po-alignment') }} className={`${styles.list} ${selected === 'CO & PO Alignment' ? styles.selected : ''}`} role="link" tabIndex={0} title="CO & PO Alignment" aria-label="CO & PO Alignment" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/program-head/co-po-alignment'))}>
                            <NavigationIcon label="CO & PO Alignment" /> <span className={styles.listText}>CO & PO Alignment</span>
                        </div>

                        <div onClick={() => { navigate('/role/program-head/po-peo-alignment') }} className={`${styles.list} ${selected === 'PO & PEO Alignment' ? styles.selected : ''}`} role="link" tabIndex={0} title="PO & PEO Alignment" aria-label="PO & PEO Alignment" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/program-head/po-peo-alignment'))}>
                            <NavigationIcon label="PO & PEO Alignment" /> <span className={styles.listText}>PO & PEO Alignment</span>
                        </div>

                        <div onClick={() => { navigate(routes.coaepView()) }} className={`${styles.list} ${selected === 'COAEP' ? styles.selected : ''}`} role="link" tabIndex={0} title="COAEP" aria-label="COAEP" onKeyDown={(event) => activateWithKeyboard(event, () => navigate(routes.coaepView()))}>
                            <NavigationIcon label="COAEP" /> <span className={styles.listText}>COAEP</span>
                        </div>
                    </>
                )}

                {mode === 'director-of-libraries' && (
                    <>
                        <div onClick={() => { navigate('/role/director-of-libraries/reference-library') }} className={`${styles.list} ${selected === 'Reference Library' ? styles.selected : ''}`} role="link" tabIndex={0} title="Reference Library" aria-label="Reference Library" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/director-of-libraries/reference-library'))}>
                            <NavigationIcon label="Reference Library" /> <span className={styles.listText}>Reference Library</span>
                        </div>
                        <div onClick={() => { navigate('/role/director-of-libraries/course-catalog') }} className={`${styles.list} ${selected === 'Course Catalog' ? styles.selected : ''}`} role="link" tabIndex={0} title="Course Catalog" aria-label="Course Catalog" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/director-of-libraries/course-catalog'))}>
                            <NavigationIcon label="Course Catalog" /> <span className={styles.listText}>Course Catalog</span>
                        </div>
                    </>
                )}

                

                {mode === 'vpaa' && (
                    <>
                        <div onClick={() => { navigate('/role/vpaa?page=Approved%20Plans') }} className={`${styles.list} ${selected === 'Approved Plans' ? styles.selected : ''}`} role="link" tabIndex={0} title="Approved Plans" aria-label="Approved Plans" onKeyDown={(event) => activateWithKeyboard(event, () => navigate('/role/vpaa?page=Approved%20Plans'))}>
                            <NavigationIcon label="Approved Plans" /> <span className={styles.listText}>Approved Plans</span>
                        </div>
                    </>
                )}

                <div className={styles.logoutWrapper}>
                    <div className={styles.listB} onClick={onLogoutClick} role="button" tabIndex={0} title="Log out" aria-label="Log out" onKeyDown={(event) => activateWithKeyboard(event, onLogoutClick)}>
                        <LogOut size={24} color={'#F94545'} /> <span className={styles.listText}>Log Out</span>
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
