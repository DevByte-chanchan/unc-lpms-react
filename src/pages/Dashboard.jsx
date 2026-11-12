import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../layouts/Skeleton.jsx';
import Header from '../components/Header.jsx';
import SideNavigation from '../components/SideNavigation.jsx';
import CurrentTermCard from '../components/CurrentTermCard.jsx';
import { INSTRUCTOR } from '../constants/users.js';
import { fetchCourses } from '../services/api.js';
import styles from '../styles/Dashboard.module.sass';
import { ChevronRight, ExternalLink, Lock } from 'react-feather';

// Static Learning Plans demo data (1 draft, 11 approved, total 12)
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

const DashboardContent = () => {
    const navigate = useNavigate();

    // Learning plans filter state
    const [lpFilter, setLpFilter] = useState('draft');

    // Table of Specifications state
    const [tosFilter, setTosFilter] = useState('draft');
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

    // Counts for TOS
    const tosDraftCount = courses.filter(c => c.status === 'draft').length;
    const tosPendingCount = courses.filter(c => c.status === 'pending').length;
    const tosReturnedCount = courses.filter(c => c.status === 'returned').length;
    const tosApprovedCount = courses.filter(c => c.status === 'approved').length;
    const tosTotalCount = courses.length;

    const displayedTosCourses = courses.filter(c => c.status === tosFilter);

    // Learning plans counts
    const lpDraftCount = DEMO_LEARNING_PLANS.draft.length;
    const lpPendingCount = DEMO_LEARNING_PLANS.pending.length;
    const lpReturnedCount = DEMO_LEARNING_PLANS.returned.length;
    const lpApprovedCount = DEMO_LEARNING_PLANS.approved.length;
    const lpTotalCount = lpDraftCount + lpPendingCount + lpReturnedCount + lpApprovedCount;

    const displayedLearningPlans = DEMO_LEARNING_PLANS[lpFilter] || [];

    const handleTosCardClick = (course) => {
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
        <div className={styles.dashboardPage}>
            <div className={styles.dashboardHeader}>
                <h2>Dashboard</h2>
                <div className={styles.subtitle}>
                    Overview of the current academic term and your assigned course offerings.
                </div>
            </div>

            <div className={styles.twoColumns}>
                {/* Column 1: Desk Calendar Current Term */}
                <div className={styles.leftColumn}>
                    <CurrentTermCard term={CURRENT_TERM} loading={false} />
                </div>

                {/* Column 2: Assigned Learning Plans and Assigned TOS */}
                <div className={styles.rightColumn}>
                    {/* Row 1: Assigned Learning Plans */}
                    <div className={styles.blockCard}>
                        <div className={styles.blockHeader}>
                            <div className={styles.blockTitleGroup}>
                                <h3>Assigned Learning Plans</h3>
                                <span className={styles.totalBadge}>Total: {lpTotalCount}</span>
                            </div>

                            <div className={styles.headerActions}>
                                <div className={styles.segmentedControl}>
                                    <button
                                        type="button"
                                        className={`${styles.controlItem} ${lpFilter === 'draft' ? styles.active : ''}`}
                                        onClick={() => setLpFilter('draft')}
                                    >
                                        <span>Draft</span>
                                        <span className={styles.itemBadge}>{lpDraftCount}</span>
                                    </button>
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
                                    title="Go to Assigned Learning Plans"
                                    aria-label="Go to Assigned Learning Plans"
                                >
                                    <ExternalLink size={18} color="#334155" />
                                </button>
                            </div>
                        </div>

                        <div className={styles.blockBody}>
                            {displayedLearningPlans.length === 0 ? (
                                <div className={styles.emptyState}>
                                    No {lpFilter} learning plans found for the current term.
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
                                                    >
                                                        Compose <ChevronRight size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Assigned Table of Specifications */}
                    <div className={styles.blockCard}>
                        <div className={styles.blockHeader}>
                            <div className={styles.blockTitleGroup}>
                                <h3>Assigned TOS</h3>
                                <span className={styles.totalBadge}>Total: {tosTotalCount}</span>
                            </div>

                            <div className={styles.headerActions}>
                                <div className={styles.segmentedControl}>
                                    <button
                                        type="button"
                                        className={`${styles.controlItem} ${tosFilter === 'draft' ? styles.active : ''}`}
                                        onClick={() => setTosFilter('draft')}
                                    >
                                        <span>Draft</span>
                                        <span className={styles.itemBadge}>{tosDraftCount}</span>
                                    </button>
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
                                    onClick={() => navigate(`/assignedtos?status=${tosFilter}`, { state: { initialStatus: tosFilter } })}
                                    title="Go to Assigned Table of Specifications table"
                                    aria-label="Go to Assigned Table of Specifications table"
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
                                    No {tosFilter} table of specifications found for the current term.
                                </div>
                            ) : (
                                <div className={styles.miniGridContainer}>
                                    {displayedTosCourses.map(course => {
                                        const isLocked = course.midtermLock?.locked;
                                        const actionText = course.status === 'draft'
                                            ? 'Compose'
                                            : course.status === 'returned'
                                            ? 'Revise'
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
                                                        {isLocked ? (
                                                            <div className={styles.lockBadge} title={course.midtermLock?.reason}>
                                                                <Lock size={12} />
                                                                <span>Locked</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className={styles.miniActionBtn}
                                                                onClick={() => handleTosCardClick(course)}
                                                            >
                                                                {actionText} <ChevronRight size={13} />
                                                            </button>
                                                        )}
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
