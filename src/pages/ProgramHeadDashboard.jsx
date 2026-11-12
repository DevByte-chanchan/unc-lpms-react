import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../layouts/Skeleton.jsx';
import Header from '../components/Header.jsx';
import SideNavigation from '../components/SideNavigation.jsx';
import CurrentTermCard from '../components/CurrentTermCard.jsx';
import { PROGRAM_HEAD } from '../constants/users.js';
import { fetchCourses } from '../services/api.js';
import styles from '../styles/Dashboard.module.sass';
import { ChevronRight, ExternalLink } from 'react-feather';

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

// Term setup for the interactive desk calendar
const CURRENT_TERM = {
    id: 1,
    school_year: '2026–2027',
    semester: '1st Semester',
    status: 'Active',
    start_date: '2026-08-01',
    classes_start: '2026-08-17',
    prelim_exam: '2026-09-21',
    midterm_exam: '2026-10-26',
    semifinal_exam: '2026-11-16',
    final_exam: '2026-12-07',
    end_date: '2026-12-18',
};

const ProgramHeadDashboardContent = () => {
    const navigate = useNavigate();

    // Learning plans filter state (3 statuses for Program Head, default pending)
    const [lpFilter, setLpFilter] = useState('pending');

    // Table of Specifications state (3 statuses for Program Head, default pending)
    const [tosFilter, setTosFilter] = useState('pending');
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
        <div className={styles.dashboardPage}>
            <div className={styles.dashboardHeader}>
                <h2>Dashboard</h2>
                <div className={styles.subtitle}>
                    Overview of the current academic term and department course offerings.
                </div>
            </div>

            <div className={styles.twoColumns}>
                {/* Column 1: Desk Calendar Current Term */}
                <div className={styles.leftColumn}>
                    <CurrentTermCard term={CURRENT_TERM} loading={false} />
                </div>

                {/* Column 2: Learning Plans and Table of Specifications */}
                <div className={styles.rightColumn}>
                    {/* Row 1: Learning Plans */}
                    <div className={styles.blockCard}>
                        <div className={styles.blockHeader}>
                            <div className={styles.blockTitleGroup}>
                                <h3>Learning Plans</h3>
                                <span className={styles.totalBadge}>Total: {lpTotalCount}</span>
                            </div>

                            <div className={styles.headerActions}>
                                <div className={styles.segmentedControl}>
                                    <button
                                        type="button"
                                        className={`${styles.controlItem} ${lpFilter === 'pending' ? styles.active : ''}`}
                                        onClick={() => setLpFilter('pending')}
                                    >
                                        <span>Pending</span>
                                        <span className={styles.itemBadge}>{lpPendingCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.controlItem} ${lpFilter === 'returned' ? styles.active : ''}`}
                                        onClick={() => setLpFilter('returned')}
                                    >
                                        <span>Returned</span>
                                        <span className={styles.itemBadge}>{lpReturnedCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.controlItem} ${lpFilter === 'approved' ? styles.active : ''}`}
                                        onClick={() => setLpFilter('approved')}
                                    >
                                        <span>Approved</span>
                                        <span className={styles.itemBadge}>{lpApprovedCount}</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className={styles.goToIconBtn}
                                    onClick={() => navigate('/role/program-head/approval-course-table?page=Learning%20Plans')}
                                    title="Go to Learning Plans Approval Table"
                                    aria-label="Go to Learning Plans Approval Table"
                                >
                                    <ExternalLink size={18} color="#334155" />
                                </button>
                            </div>
                        </div>

                        <div className={styles.blockBody}>
                            {displayedLearningPlans.length === 0 ? (
                                <div className={styles.emptyState}>
                                    No {lpFilter} learning plans for review.
                                </div>
                            ) : (
                                <div className={styles.miniGridContainer}>
                                    {displayedLearningPlans.map(lp => (
                                        <div key={lp.code} className={styles.miniCard}>
                                            <div className={styles.miniCardMain}>
                                                <div className={styles.miniCardHeader}>
                                                    <span className={styles.miniCardCode}>{lp.code}</span>
                                                    <span className={styles.miniCardDate}>{lp.date}</span>
                                                </div>
                                                <div className={styles.miniCardTitle} title={lp.title}>
                                                    {lp.title}
                                                </div>
                                                <div className={styles.miniCardFooter}>
                                                    <button
                                                        type="button"
                                                        className={styles.miniActionBtn}
                                                        onClick={() => navigate('/role/program-head/approval-course-table?page=Learning%20Plans')}
                                                        title="Review Learning Plan"
                                                    >
                                                        {lpFilter === 'pending' ? 'Review' : 'View'} <ChevronRight size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Table of Specifications */}
                    <div className={styles.blockCard}>
                        <div className={styles.blockHeader}>
                            <div className={styles.blockTitleGroup}>
                                <h3>Table of Specifications</h3>
                                <span className={styles.totalBadge}>Total: {tosTotalCount}</span>
                            </div>

                            <div className={styles.headerActions}>
                                <div className={styles.segmentedControl}>
                                    <button
                                        type="button"
                                        className={`${styles.controlItem} ${tosFilter === 'pending' ? styles.active : ''}`}
                                        onClick={() => setTosFilter('pending')}
                                    >
                                        <span>Pending</span>
                                        <span className={styles.itemBadge}>{tosPendingCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.controlItem} ${tosFilter === 'returned' ? styles.active : ''}`}
                                        onClick={() => setTosFilter('returned')}
                                    >
                                        <span>Returned</span>
                                        <span className={styles.itemBadge}>{tosReturnedCount}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.controlItem} ${tosFilter === 'approved' ? styles.active : ''}`}
                                        onClick={() => setTosFilter('approved')}
                                    >
                                        <span>Approved</span>
                                        <span className={styles.itemBadge}>{tosApprovedCount}</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className={styles.goToIconBtn}
                                    onClick={() => navigate(`/role/program-head/tos?status=${tosFilter}`, { state: { initialStatus: tosFilter } })}
                                    title="Go to Table of Specifications Table"
                                    aria-label="Go to Table of Specifications Table"
                                >
                                    <ExternalLink size={18} color="#334155" />
                                </button>
                            </div>
                        </div>

                        <div className={styles.blockBody}>
                            {loading ? (
                                <div className={styles.emptyState}>
                                    Loading course offerings…
                                </div>
                            ) : displayedTosCourses.length === 0 ? (
                                <div className={styles.emptyState}>
                                    No {tosFilter} Table of Specifications for review.
                                </div>
                            ) : (
                                <div className={styles.miniGridContainer}>
                                    {displayedTosCourses.map(course => {
                                        const actionText = course.status === 'pending'
                                            ? 'Review'
                                            : course.status === 'returned'
                                            ? 'View Remarks'
                                            : 'View';

                                        return (
                                            <div key={course.code} className={styles.miniCard}>
                                                <div className={styles.miniCardMain}>
                                                    <div className={styles.miniCardHeader}>
                                                        <span className={styles.miniCardCode}>{course.code}</span>
                                                        <span className={styles.miniCardDate}>{course.formattedDate}</span>
                                                    </div>
                                                    <div className={styles.miniCardTitle} title={course.name}>
                                                        {course.name}
                                                    </div>
                                                    <div className={styles.miniCardFooter}>
                                                        <button
                                                            type="button"
                                                            className={styles.miniActionBtn}
                                                            onClick={() => handleTosCardClick(course)}
                                                        >
                                                            {actionText} <ChevronRight size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
