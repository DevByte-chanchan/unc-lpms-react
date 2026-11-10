import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { BookOpen, Briefcase, CheckCircle, Clipboard, Clock, FileText, GitMerge, Layers, LogOut, Search, Settings, Sidebar, Target, UserCheck, Users } from 'react-feather'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getSession, logout, setActiveRole, homeRouteForRole, roleMeta } from '../utils/session'
import { routes } from '../utils/routes.js';
import SignOutDialog from './SignOutDialog.jsx'
import NotificationBell from './NotificationBell.jsx'
import Select from './Select.jsx'
import SettingsModal from './SettingsModal.jsx'
import { navigationIconName } from '../utils/navigationIcons.js'
import { useNav } from '../layouts/NavContext.js'
import { initialsOf } from '../utils/userInitials.js'

const NAVIGATION_ICON_COMPONENTS = {
    BookOpen,
    Briefcase,
    Clock,
    CheckCircle,
    Clipboard,
    FileText,
    GitMerge,
    Layers,
    Target,
    UserCheck,
    Users,
}

const NavigationIcon = ({ label }) => {
    const Icon = NAVIGATION_ICON_COMPONENTS[navigationIconName(label)] || FileText
    return <Icon size={20} />
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
    // Account settings (name, password, appearance) open in a window instead of taking sidebar rows.
    const [settingsOpen, setSettingsOpen] = useState(false)
    // "Search anything": finds a menu item by name (pages, Notifications, Settings) and opens it. `/` jumps here.
    const [query, setQuery] = useState('')
    const [matches, setMatches] = useState([])
    const searchRef = useRef(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const navRef = useRef(null)
    const nav = useNav()
    const account = getSession()

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

    const menuItems = () => [...(navRef.current?.querySelectorAll('[role="link"], [role="button"]') || [])]
        .filter(el => el.getAttribute('aria-label') && el.getAttribute('aria-label') !== 'Log out')
    const findMatches = (text) => {
        const term = text.trim().toLowerCase()
        if (!term) return []
        const seen = new Set()
        return menuItems().filter(el => {
            const label = el.getAttribute('aria-label')
            if (seen.has(label) || !label.toLowerCase().includes(term)) return false
            seen.add(label)
            return true
        }).map(el => ({ label: el.getAttribute('aria-label'), el }))
    }
    const openMatch = (match) => { setQuery(''); setMatches([]); match?.el.click() }
    const onSearchKey = (event) => {
        if (event.key === 'Enter') { event.preventDefault(); openMatch(matches[0]) }
        else if (event.key === 'Escape') { setQuery(''); setMatches([]); event.currentTarget.blur() }
    }

    useEffect(() => {
        const onKey = (event) => {
            if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
            event.preventDefault()
            searchRef.current?.focus()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [])

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
                {isExpanded && (
                    <div className={styles.brand}>
                        <span>Learning Plan</span>
                        <span>Management System</span>
                    </div>
                )}
                {nav.available && (
                    <button type="button" className={styles.navToggle} onClick={nav.toggle}
                        aria-label={nav.collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!nav.collapsed}
                        title={nav.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                        <Sidebar size={18} />
                    </button>
                )}
            </div>

            <div className={styles.searchWrap}>
                <div className={styles.search}>
                    <Search size={16} aria-hidden="true" />
                    <input ref={searchRef} value={query} placeholder="Search anything" aria-label="Search the menu (press / to jump here)"
                        onChange={(event) => { setQuery(event.target.value); setMatches(findMatches(event.target.value)) }}
                        onKeyDown={onSearchKey} onBlur={() => setTimeout(() => setMatches([]), 150)} />
                </div>
                {query.trim() && (
                    <ul className={styles.searchResults} role="listbox" aria-label="Menu items">
                        {matches.length === 0 ? <li className={styles.searchEmpty}>No page called that</li> : matches.map((match, index) => (
                            <li key={match.label} role="option" aria-selected={index === 0}>
                                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => openMatch(match)}>{match.label}</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>


            <div className={styles['nav-list']}>
                {account && account.role !== 'superuser' && <NotificationBell />}
                {mode !== 'vpaa' && mode !== 'superuser' && (
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
                    <div className={styles.dock}>
                        <div
                            onClick={() => setSettingsOpen(true)}
                            className={`${styles.list} ${styles.dockItem}`}
                            role="button" tabIndex={0} title="Settings" aria-label="Settings" aria-haspopup="dialog"
                            onKeyDown={(event) => activateWithKeyboard(event, () => setSettingsOpen(true))}
                        >
                            <Settings size={20} /> <span className={styles.listText}>Settings</span>
                        </div>
                        <div className={`${styles.listB} ${styles.dockItem}`} onClick={onLogoutClick} role="button" tabIndex={0} title="Log out" aria-label="Log out" onKeyDown={(event) => activateWithKeyboard(event, onLogoutClick)}>
                            <LogOut size={20} /> <span className={styles.listText}>Log out</span>
                        </div>
                    </div>

                    {/* Multi-role accounts: switch the role this session acts as (feature/course-assignment). */}
                    {account?.roles?.length > 1 && (
                        <div className={styles.roleSwitch}>
                        <Select block aria-label="Switch role" value={account.role}
                            onChange={(event) => { setActiveRole(event.target.value); navigate(homeRouteForRole(event.target.value)) }}>
                            {account.roles.map(role => <option key={role} value={role}>{roleMeta(role)?.label || role}</option>)}
                        </Select>
                        </div>
                    )}

                    <div className={styles.account} title={account?.email || undefined} role="button" tabIndex={0} aria-label="Account settings"
                        onClick={() => setSettingsOpen(true)} onKeyDown={(event) => activateWithKeyboard(event, () => setSettingsOpen(true))}>
                    <div className={styles.avatar} aria-hidden="true">{initialsOf(account?.name)}</div>
                    <div className={styles.accountText}>
                        <div className={styles.accountName}>{account?.name}</div>
                        <div className={styles.accountRole}>{account?.roleLabel}</div>
                    </div>
                    </div>
                </div>

                <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

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
