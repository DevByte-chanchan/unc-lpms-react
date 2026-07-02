import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { FileText, LogOut, Users, BookOpen, Upload } from 'react-feather'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const SideNavigation = ({ mode = 'instructor' }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()

    // --- MERGED SELECTION LOGIC ---
    let selected = searchParams.get('page') || 'Syllabus';

    if (location.pathname.startsWith('/assignedtos') || location.pathname.startsWith('/tos')) {
        selected = 'TOS';
    }

    // LPSM Instructor pages
    if (location.pathname.startsWith('/lpsm/instructor')) {
        selected = 'Syllabus';
    }

    // LPSM Program Head upload pages
    if (location.pathname.startsWith('/role/program-head/upload-documents')) {
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
    if (location.pathname.startsWith('/role/director-of-libraries/upload-documents')) {
        selected = 'Upload Documents';
    }

    const [showPopup, setShowPopup] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const logoutRef = useRef(null)
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
        else if (page === 'TOS') {
            navigate('/assignedtos');
        }
        else {
            setSearchParams({ page });
        }
    }

    const onLogoutClick = () => setShowPopup((prev) => !prev)

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
        } catch (e) { console.warn('ResizeObserver failed', e) }
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
                } catch (e) { console.warn('Failed to parse width', e) }
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
                {mode !== 'vpaa' && (
                    <div
                        onClick={() => handlePageChange('Syllabus')}
                        className={`${styles.list} ${selected === 'Syllabus' ? styles.selected : ''}`}
                    >
                        <FileText size={24} />
                        <span className={styles.listText}>Learning Plan</span>
                    </div>
                )}



                {mode === 'program-head' && (
                    <>
                        <div onClick={() => { navigate('/role/program-head/co-po-alignment') }} className={`${styles.list} ${selected === 'CO & PO Alignment' ? styles.selected : ''}`}>
                            <FileText size={24} /> <span className={styles.listText}>CO & PO Alignment</span>
                        </div>

                        <div onClick={() => { navigate('/role/program-head/po-peo-alignment') }} className={`${styles.list} ${selected === 'PO & PEO Alignment' ? styles.selected : ''}`}>
                            <FileText size={24} /> <span className={styles.listText}>PO & PEO Alignment</span>
                        </div>

                        <div onClick={() => { navigate('/role/program-head/upload-documents') }} className={`${styles.list} ${selected === 'COAEP' ? styles.selected : ''}`}>
                            <FileText size={24} /> <span className={styles.listText}>COAEP</span>
                        </div>
                    </>
                )}

                {mode === 'director-of-libraries' && (
                    <div onClick={() => { navigate('/role/director-of-libraries/reference-library') }} className={`${styles.list} ${selected === 'Reference Library' ? styles.selected : ''}`}>
                        <BookOpen size={24} /> <span className={styles.listText}>Reference Library</span>
                    </div>
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

                {mode === 'vpaa' && (
                    <>
                        <div onClick={() => { navigate('/role/vpaa?page=Approved%20Plans') }} className={`${styles.list} ${selected === 'Approved Plans' ? styles.selected : ''}`}>
                            <FileText size={24} /> <span className={styles.listText}>Approved Plans</span>
                        </div>
                    </>
                )}

                <div className={styles.logoutWrapper} ref={logoutRef}>
                    <div className={styles.listB} onClick={onLogoutClick}>
                        <LogOut size={24} color={'#F94545'} /> <span className={styles.listText}>Log Out</span>
                    </div>

                    {showPopup && (
                        <div className={styles.rolePopup}>
                            <div className={styles.popupTitle}>Select role</div>
                            <button className={styles.popupItem} onClick={() => { setShowPopup(false); navigate('/') }}>Instructor</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/program-head/approval-course-table')}>Program Head</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/director-of-libraries/approval-course-table')}>Director of Libraries</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/industry-consultant/approval-course-table')}>Industry Consultant</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/dean')}>Dean</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/vpaa')}>VPAA</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SideNavigation