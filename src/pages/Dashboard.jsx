import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../layouts/Skeleton.jsx';
import Header from '../components/Header.jsx';
import SideNavigation from '../components/SideNavigation.jsx';
import { INSTRUCTOR } from '../constants/users.js';
import { fetchCourses } from '../services/api.js';
import styles from '../styles/Dashboard.module.sass';
import { ChevronDown, ChevronRight, ExternalLink, Lock, Calendar } from 'react-feather';

// Static Learning Plans demo data: 1 draft (Database Management Systems), 11 approved, total 12
const DEMO_LEARNING_PLANS = {
    draft: [
        {
            code: 'BSCS321L',
            date: '2026-11-11',
            title: 'Database Management Systems'
        }
    ],
    pending: [],
    returned: [],
    approved: [
        { code: 'BSCS111L', date: '2026-06-15', title: 'Fundamentals of Programming' },
        { code: 'BSCS212L', date: '2026-06-20', title: 'Web Development I' },
        { code: 'BSCS214L', date: '2026-06-28', title: 'Data Structures and Algorithms' },
        { code: 'BSCS221L', date: '2026-07-05', title: 'Object-Oriented Programming' },
        { code: 'BSCS222L', date: '2026-07-12', title: 'Discrete Structures 2' },
        { code: 'BSCS223L', date: '2026-07-18', title: 'Web Development II' },
        { code: 'BSCS313L', date: '2026-07-25', title: 'Human & Computer Interaction' },
        { code: 'BSCS314L', date: '2026-08-02', title: 'Data Communications' },
        { code: 'BSCS323L', date: '2026-08-10', title: 'Systems Analysis and Design' },
        { code: 'BSCS341L', date: '2026-08-18', title: 'Artificial Intelligence' },
        { code: 'BSCS342L', date: '2026-08-25', title: 'Machine Learning Fundamentals' }
    ]
};

// Reusable hook for mouse drag-to-swipe and touch swipe
const useSwipeScroll = () => {
    const rowRef = useRef(null);
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const isDragging = useRef(false);

    const onMouseDown = (e) => {
        if (!rowRef.current) return;
        isDown.current = true;
        isDragging.current = false;
        startX.current = e.pageX - rowRef.current.offsetLeft;
        scrollLeft.current = rowRef.current.scrollLeft;
    };

    const onMouseLeave = () => {
        isDown.current = false;
    };

    const onMouseUp = () => {
        isDown.current = false;
        setTimeout(() => {
            isDragging.current = false;
        }, 50);
    };

    const onMouseMove = (e) => {
        if (!isDown.current || !rowRef.current) return;
        const x = e.pageX - rowRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5;
        if (Math.abs(walk) > 4) {
            isDragging.current = true;
        }
        rowRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const resetScroll = () => {
        if (rowRef.current) {
            rowRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
    };

    return { rowRef, isDragging, onMouseDown, onMouseLeave, onMouseUp, onMouseMove, resetScroll };
};

const DashboardContent = () => {
    const navigate = useNavigate();

    // Learning plans filter state (demo only)
    const [lpFilter, setLpFilter] = useState('draft');
    const lpSwipe = useSwipeScroll();

    // Table of Specifications state
    const [tosFilter, setTosFilter] = useState('draft');
    const tosSwipe = useSwipeScroll();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const nortonCourses = new Set([
        'BSCS111L','BSCS212L','BSCS313L','BSCS321L','BSCS221L','BSCS341L',
        'BSCS342L','BSCS214L','BSCS222L','BSCS223L','BSCS314L','BSCS323L'
    ]);

    useEffect(() => {
        fetchCourses()
            .then(data => {
                let filtered = data;
                if (nortonCourses.size > 0) {
                    filtered = data.filter(c => nortonCourses.has(c.code));
                }
                const fmt = (ts) => {
                    if (!ts) return '';
                    const d = new Date(ts);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                };
                const formatted = filtered.map(c => {
                    const status = c.midtermTos?.status || 'draft';
                    const date = fmt(c.midtermTos?.submittedAt || c.updated_at || c.created_at) || '2026-11-11';
                    return {
                        ...c,
                        status,
                        formattedDate: date
                    };
                });
                setCourses(formatted);
            })
            .catch(err => {
                console.error('Failed to load courses on dashboard', err);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleLpFilterChange = (filter) => {
        setLpFilter(filter);
        lpSwipe.resetScroll();
    };

    const handleTosFilterChange = (filter) => {
        setTosFilter(filter);
        tosSwipe.resetScroll();
    };

    // Counts for TOS
    const tosDraftCount = courses.filter(c => c.status === 'draft').length;
    const tosPendingCount = courses.filter(c => c.status === 'pending').length;
    const tosReturnedCount = courses.filter(c => c.status === 'returned').length;
    const tosApprovedCount = courses.filter(c => c.status === 'approved').length;
    const tosTotalCount = courses.length;

    const displayedTosCourses = courses.filter(c => c.status === tosFilter);

    // Learning plans demo counts
    const lpDraftCount = DEMO_LEARNING_PLANS.draft.length;
    const lpPendingCount = DEMO_LEARNING_PLANS.pending.length;
    const lpReturnedCount = DEMO_LEARNING_PLANS.returned.length;
    const lpApprovedCount = DEMO_LEARNING_PLANS.approved.length;
    const lpTotalCount = lpDraftCount + lpPendingCount + lpReturnedCount + lpApprovedCount;

    const displayedLearningPlans = DEMO_LEARNING_PLANS[lpFilter] || [];

    const handleTosCardClick = (course) => {
        if (tosSwipe.isDragging.current) return;
        navigate(`/tos/${course.code}`, {
            state: {
                tosStatus: course.status,
                courseName: course.name,
                examType: 'Midterm',
                schoolYear: '2026',
                semester: '1st Semester'
            }
        });
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>Dashboard</h1>
                <p className={styles.subtitle}>Overview of the current academic term and your assigned course offerings.</p>
            </div>

            <div className={styles.mainGrid}>
                {/* Left Column: Current Term */}
                <div className={styles.leftCol}>
                    <div className={styles.currentTermCard}>
                        <div className={styles.termLabel}>Current Term</div>
                        <div className={styles.termCenter}>
                            <div className={styles.termYear}>2026–2027</div>
                            <div className={styles.termSem}>1st Semester</div>
                            
                            {/* Polished Academic Milestone Widget */}
                            <div className={styles.termNextWidget}>
                                <div className={styles.termNextBody}>
                                    <Calendar size={14} className={styles.termNextIcon} />
                                    <span className={styles.termNextEvent}>Final Exam</span>
                                    <span className={styles.termNextDot}>·</span>
                                    <span className={styles.termNextDate}>December 7, 2026</span>
                                    <span className={styles.termNextBadge}>in 26 days</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.termBottom}>
                            <ChevronDown size={20} color="#64748B" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Assigned Learning Plans and Assigned TOS */}
                <div className={styles.rightCol}>
                    {/* Top Card: Assigned Learning Plans */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.titleGroup}>
                                <h2 className={styles.sectionTitle}>Assigned Learning Plans</h2>
                                <span className={styles.totalBadge}>Total: {lpTotalCount}</span>
                            </div>
                            <div className={styles.controlsGroup}>
                                <div className={styles.filterTabs}>
                                    <button
                                        type="button"
                                        className={`${styles.filterTab} ${lpFilter === 'draft' ? styles.activeFilter : ''}`}
                                        onClick={() => handleLpFilterChange('draft')}
                                    >
                                        Draft <span className={styles.filterCount}>{lpDraftCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.filterTab} ${lpFilter === 'pending' ? styles.activeFilter : ''}`}
                                        onClick={() => handleLpFilterChange('pending')}
                                    >
                                        Pending <span className={styles.filterCount}>{lpPendingCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.filterTab} ${lpFilter === 'returned' ? styles.activeFilter : ''}`}
                                        onClick={() => handleLpFilterChange('returned')}
                                    >
                                        Returned <span className={styles.filterCount}>{lpReturnedCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.filterTab} ${lpFilter === 'approved' ? styles.activeFilter : ''}`}
                                        onClick={() => handleLpFilterChange('approved')}
                                    >
                                        Approved <span className={styles.filterCount}>{lpApprovedCount}</span>
                                    </button>
                                </div>
                                <span className={styles.extLinkDisabled} title="Syllabus access restricted (demo only)">
                                    <ExternalLink size={16} />
                                </span>
                            </div>
                        </div>

                        {/* Swipeable track: swap left & right with drag, trackpad, or touch */}
                        <div className={styles.cardsWrapper}>
                            <div
                                ref={lpSwipe.rowRef}
                                className={styles.cardsRow}
                                onMouseDown={lpSwipe.onMouseDown}
                                onMouseLeave={lpSwipe.onMouseLeave}
                                onMouseUp={lpSwipe.onMouseUp}
                                onMouseMove={lpSwipe.onMouseMove}
                            >
                                {displayedLearningPlans.length === 0 ? (
                                    <div className={styles.emptyCard}>No assigned Learning Plans yet.</div>
                                ) : (
                                    displayedLearningPlans.map(lp => (
                                        <div key={lp.code} className={styles.courseCard}>
                                            <div className={styles.cardHeader}>
                                                <span className={styles.codePill}>{lp.code}</span>
                                                <span className={styles.cardDate}>{lp.date}</span>
                                            </div>
                                            <div className={styles.cardTitle} title={lp.title}>
                                                {lp.title}
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.cardBtnDisabled}
                                                disabled
                                                title="Compose is not available in demo mode"
                                            >
                                                Compose <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Card: Assigned Table of Specifications */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.titleGroup}>
                                <h2 className={styles.sectionTitle}>Assigned Table of Specifications</h2>
                                <span className={styles.totalBadge}>Total: {tosTotalCount}</span>
                            </div>
                            <div className={styles.controlsGroup}>
                                <div className={styles.filterTabs}>
                                    <button
                                        type="button"
                                        className={`${styles.filterTab} ${tosFilter === 'draft' ? styles.activeFilter : ''}`}
                                        onClick={() => handleTosFilterChange('draft')}
                                    >
                                        Draft <span className={styles.filterCount}>{tosDraftCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.filterTab} ${tosFilter === 'pending' ? styles.activeFilter : ''}`}
                                        onClick={() => handleTosFilterChange('pending')}
                                    >
                                        Pending <span className={styles.filterCount}>{tosPendingCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.filterTab} ${tosFilter === 'returned' ? styles.activeFilter : ''}`}
                                        onClick={() => handleTosFilterChange('returned')}
                                    >
                                        Returned <span className={styles.filterCount}>{tosReturnedCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.filterTab} ${tosFilter === 'approved' ? styles.activeFilter : ''}`}
                                        onClick={() => handleTosFilterChange('approved')}
                                    >
                                        Approved <span className={styles.filterCount}>{tosApprovedCount}</span>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className={styles.extLinkBtn}
                                    onClick={() => navigate(`/assignedtos?status=${tosFilter}`, { state: { initialStatus: tosFilter } })}
                                    title="Go to Assigned Table of Specifications table"
                                >
                                    <ExternalLink size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Swipeable track: swap left & right with drag, trackpad, or touch */}
                        <div className={styles.cardsWrapper}>
                            <div
                                ref={tosSwipe.rowRef}
                                className={styles.cardsRow}
                                onMouseDown={tosSwipe.onMouseDown}
                                onMouseLeave={tosSwipe.onMouseLeave}
                                onMouseUp={tosSwipe.onMouseUp}
                                onMouseMove={tosSwipe.onMouseMove}
                            >
                                {loading ? (
                                    <div className={styles.emptyCard}>
                                        Loading course offerings…
                                    </div>
                                ) : displayedTosCourses.length === 0 ? (
                                    <div className={styles.emptyCard}>
                                        No assigned Table of Specifications yet.
                                    </div>
                                ) : (
                                    displayedTosCourses.map(course => {
                                        const isLocked = course.midtermLock?.locked;
                                        const actionText = course.status === 'draft'
                                            ? 'Compose'
                                            : course.status === 'returned'
                                            ? 'Revise'
                                            : 'View';

                                        return (
                                            <div key={course.code} className={styles.courseCard}>
                                                <div className={styles.cardHeader}>
                                                    <span className={styles.codePill}>{course.code}</span>
                                                    <span className={styles.cardDate}>{course.formattedDate}</span>
                                                </div>
                                                <div className={styles.cardTitle} title={course.name}>
                                                    {course.name}
                                                </div>
                                                {isLocked ? (
                                                    <div className={styles.lockBadge} title={course.midtermLock?.reason}>
                                                        <Lock size={12} />
                                                        <span>Locked</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={styles.cardBtn}
                                                        onClick={() => handleTosCardClick(course)}
                                                    >
                                                        {actionText} <ChevronRight size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    return (
        <Skeleton
            header={<Header role="Instructor" name={INSTRUCTOR.header} />}
            content={<DashboardContent />}
            nav={<SideNavigation />}
        />
    );
};

export default Dashboard;
