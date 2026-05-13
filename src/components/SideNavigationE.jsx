import styles from '../styles/SideNavigation.module.sass'
import unclogo from '../assets/unclogo.png'
import { FileText, LogOut, Users, BookOpen } from 'react-feather'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

const SideNavigation = ({ mode = 'instructor' }) => {
    const [searchParams, setSearchParams] = useSearchParams()
    const selected = searchParams.get('page') || 'Syllabus'
    const navigate = useNavigate()

    const [showPopup, setShowPopup] = useState(false)
    const logoutRef = useRef(null)
    const navRef = useRef(null)
    const [pinned, setPinned] = useState(false)

    const handlePageChange = (page) => {
        setSearchParams({ page })
    }

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

    // close popup when selected page changes
    useEffect(() => {
        if (showPopup) setShowPopup(false)
    }, [selected])

    // close popup when sidenav is shrunk (watch width)
    useEffect(() => {
        if (!navRef.current) return
        let ro
        try {
            ro = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const w = entry.contentRect.width
                    if (w < 90 && showPopup) setShowPopup(false)
                }
            })
            ro.observe(navRef.current)
        } catch (e) {
            // ResizeObserver unsupported — ignore
        }
        return () => { if (ro && navRef.current) ro.disconnect() }
    }, [showPopup])

    // expand/collapse nearest sidebar ancestor on hover unless pinned
    useEffect(() => {
        const el = navRef.current
        if (!el) return

        const findSidebarAncestor = (node) => {
            let n = node.parentElement
            while (n && n !== document.body) {
                try {
                    const w = window.getComputedStyle(n).width
                    const num = parseFloat(w)
                    // heuristic: sidebar containers are narrow (~<=110px)
                    if (!isNaN(num) && num <= 110) return n
                } catch (e) {
                    // ignore and continue
                }
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
                <img src={unclogo} alt="" onClick={() => {
                    setPinned(p => !p)
                    const target = navRef.current ? navRef.current.parentElement : null
                    if (target) { target.classList.toggle('expanded'); target.classList.toggle('expanded-left') }
                }} style={{ cursor: 'pointer' }} />
            </div>

            <div className={styles['nav-list']}>
                {mode !== 'hr-staff' && (
                    <div
                        onClick={() => {
                            if (mode === 'program-head') {
                                navigate('/role/program-head/approval-course-table?page=Syllabus')
                            } else if (mode === 'dean') {
                                handlePageChange('Syllabus')
                            } else {
                                handlePageChange('Syllabus')
                            }
                        }}
                        className={`${styles.list} ${selected === 'Syllabus' ? styles.selected : ''}`}
                    >
                        <FileText size={24} /> Syllabus
                    </div>
                )}

                {/* TOS is back, visible only for instructor mode */}
                {mode === 'instructor' && (
                    <div
                        onClick={() => {
                            // navigate to the instructor TOS page and mark selected
                            navigate('/assignedtos')
                            setSearchParams({ page: 'TOS' })
                        }}
                        className={`${styles.list} ${selected === 'TOS' ? styles.selected : ''}`}
                    >
                        <FileText size={24} /> TOS
                    </div>
                )}

                {/* Program Head additional options */}
                {mode === 'program-head' && (
                    <>
                        <div onClick={() => { navigate('/role/program-head/industry-consultant?page=Industry%20Consultant') }} className={`${styles.list} ${selected === 'Industry Consultant' ? styles.selected : ''}`}>
                            <Users size={24} /> Industry Consultant
                        </div>

                        <div onClick={() => { navigate('/role/program-head/course-offerings?page=Course%20Offerings') }} className={`${styles.list} ${selected === 'Course Offerings' ? styles.selected : ''}`}>
                            <BookOpen size={24} /> Course Offerings
                        </div>
                    </>
                )}

                {/* Dean additional options */}
                {mode === 'dean' && (
                    <>
                        <div onClick={() => { navigate('/role/dean?page=Faculty') }} className={`${styles.list} ${selected === 'Faculty' ? styles.selected : ''}`}>
                            <Users size={24} /> Faculty
                        </div>

                        <div onClick={() => { navigate('/role/dean?page=Programs') }} className={`${styles.list} ${selected === 'Programs' ? styles.selected : ''}`}>
                            <BookOpen size={24} /> Programs
                        </div>
                    </>
                )}

                {/* HR Staff additional options */}
                {mode === 'hr-staff' && (
                    <>
                        <div onClick={() => { navigate('/role/hr-staff?page=Departments') }} className={`${styles.list} ${selected === 'Departments' ? styles.selected : ''}`}>
                            <Users size={24} /> Departments
                        </div>
                    </>
                )}

                <div className={styles.logoutWrapper} ref={logoutRef}>
                    <div className={styles.listB} onClick={onLogoutClick}>
                        <LogOut size={24} color={'#F94545'} /> Log Out
                    </div>

                    {showPopup && (
                        <div className={styles.rolePopup}>
                            <div className={styles.popupTitle}>Select role</div>
                            <button className={styles.popupItem} onClick={() => { setShowPopup(false); navigate('/') }}>Instructor</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/program-head/approval-course-table')}>Program head</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/director-of-libraries/approval-course-table')}>Director of Libraries</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/industry-consultant/approval-course-table')}>Industry Consultant</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/dean')}>Dean</button>
                            <button className={styles.popupItem} onClick={() => gotoRole('/role/hr-staff')}>HR staff</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SideNavigation