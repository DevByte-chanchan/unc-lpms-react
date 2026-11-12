import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../layouts/Skeleton.jsx';
import Header from '../components/Header.jsx';
import SideNavigation from '../components/SideNavigation.jsx';
import { PROGRAM_HEAD } from '../constants/users.js';
import { fetchCourses } from '../services/api.js';
import styles from '../styles/Dashboard.module.sass';
import { ChevronDown, ChevronRight, ExternalLink, Calendar } from 'react-feather';

// Program Head Learning Plans demo data (3 statuses: pending, returned, approved)
const PH_DEMO_LEARNING_PLANS = {
    pending: [
        { code: 'BSCS321L', date: '2026-11-10', title: 'Database Management Systems' },
        { code: 'BSCS212L', date: '2026-11-09', title: 'Web Development I' }
    ],
    returned: [
        { code: 'BSCS314L', date: '2026-11-02', title: 'Data Communications' }
    ],
    approved: [
        { code: 'BSCS111L', date: '2026-06-15', title: 'Fundamentals of Programming' },
        { code: 'BSCS214L', date: '2026-06-28', title: 'Data Structures and Algorithms' },
        { code: 'BSCS221L', date: '2026-07-05', title: 'Object-Oriented Programming' },
        { code: 'BSCS313L', date: '2026-07-25', title: 'Human & Computer Interaction' },
        { code: 'BSCS341L', date: '2026-08-18', title: 'Artificial Intelligence' }
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

const ProgramHeadDashboardContent = () => {
    const navigate = useNavigate();

    // Learning plans filter state (3 statuses for Program Head, default pending)
    const [lpFilter, setLpFilter] = useState('pending');
    const lpSwipe = useSwipeScroll();

    // Table of Specifications state (3 statuses for Program Head, default pending)
    const [tosFilter, setTosFilter] = useState('pending');
    const tosSwipe = useSwipeScroll();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses()
            .then(data => {
                const fmt = (ts) => {
                    if (!ts) return '';
                    const d = new Date(ts);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                };
                const formatted = (data || []).map(c => {
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
                console.error('Failed to load courses on program head dashboard', err);
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

    // Counts for Program Head TOS (only submitted items: pending, returned, approved)
    const tosPendingCount = courses.filter(c => c.status === 'pending').length;
    const tosReturnedCount = courses.filter(c => c.status === 'returned').length;
    const tosApprovedCount = courses.filter(c => c.status === 'approved').length;
    const tosTotalCount = tosPendingCount + tosReturnedCount + tosApprovedCount;

    const displayedTosCourses = courses.filter(c => c.status === tosFilter);

    // Learning plans demo counts
    const lpPendingCount = PH_DEMO_LEARNING_PLANS.pending.length;
    const lpReturnedCount = PH_DEMO_LEARNING_PLANS.returned.length;
    const lpApprovedCount = PH_DEMO_LEARNING_PLANS.approved.length;
    const lpTotalCount = lpPendingCount + lpReturnedCount + lpApprovedCount;

    const displayedLearningPlans = PH_DEMO_LEARNING_PLANS[lpFilter] || [];

    const handleTosCardClick = (course) => {
        if (tosSwipe.isDragging.current) return;
        navigate(`/tos/${course.code}`, {
            state: {
                tosStatus: course.status,
                courseName: course.name,
                examType: 'Midterm',
                schoolYear: '2026',
                semester: '1st Semester',
                role: 'program-head'
            }
        });
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>Dashboard</h1>
                <p className={styles.subtitle}>Overview of the current academic term and department course offerings.</p>
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

                {/* Right Column: Learning Plans and Table of Specifications */}
                <div className={styles.rightCol}>
                    {/* Top Card: Learning Plans */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.titleGroup}>
                                <h2 className={styles.sectionTitle}>Learning Plans</h2>
                                <span className={styles.totalBadge}>Total: {lpTotalCount}</span>
                            </div>

                            {/* 3 Status Filter Buttons for Program Head */}
                            <div className={styles.controlsGroup}>
                                <div className={styles.filterTabs}>
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

                        {/* Swipeable Cards Row */}
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
                                    <div className={styles.emptyCard}>
                                        No {lpFilter} learning plans for review.
                                    </div>
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
                                                title="Learning plan review is not available in demo mode"
                                            >
                                                {lpFilter === 'pending' ? 'Review' : 'View'} <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Card: Table of Specifications */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.titleGroup}>
                                <h2 className={styles.sectionTitle}>Table of Specifications</h2>
                                <span className={styles.totalBadge}>Total: {tosTotalCount}</span>
                            </div>

                            <div className={styles.controlsGroup}>
                                {/* 3 Status Filter Buttons for Program Head */}
                                <div className={styles.filterTabs}>
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
                                    title="Open Table of Specifications"
                                    onClick={() => navigate(`/role/program-head/tos?status=${tosFilter}`, { state: { initialStatus: tosFilter } })}
                                >
                                    <ExternalLink size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Swipeable Cards Row */}
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
                                        No {tosFilter} Table of Specifications for review.
                                    </div>
                                ) : (
                                    displayedTosCourses.map(course => {
                                        const actionText = course.status === 'pending'
                                            ? 'Review'
                                            : course.status === 'returned'
                                            ? 'View Remarks'
                                            : 'View';

                                        return (
                                            <div
                                                key={course.code}
                                                className={styles.courseCard}
                                            >
                                                <div className={styles.cardHeader}>
                                                    <span className={styles.codePill}>{course.code}</span>
                                                    <span className={styles.cardDate}>{course.formattedDate}</span>
                                                </div>
                                                <div className={styles.cardTitle} title={course.name}>
                                                    {course.name}
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.cardBtn}
                                                    onClick={() => handleTosCardClick(course)}
                                                >
                                                    {actionText} <ChevronRight size={14} />
                                                </button>
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

const ProgramHeadDashboard = () => {
    return (
        <Skeleton
            header={<Header role="Program Head" name={PROGRAM_HEAD.header} />}
            content={<ProgramHeadDashboardContent />}
            nav={<SideNavigation mode="program-head" />}
        />
    );
};

export default ProgramHeadDashboard;
