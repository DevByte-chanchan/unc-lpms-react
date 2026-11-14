import React, { useEffect, useState } from 'react';
import Skeleton from '../layouts/Skeleton.jsx';
import Header from '../components/Header.jsx';
import SideNavigation from '../components/SideNavigation.jsx';
import CurrentTermCard from '../components/CurrentTermCard.jsx';
import MiniAssignedCourses from '../components/MiniAssignedCourses.jsx';
import styles from '../styles/Dashboard.module.sass';
import { fetchJson } from '../utils/api.js';
import { useCurrentUser } from '../services/currentUser.jsx';

const DashboardContent = () => {
    const { user } = useCurrentUser();
    const [summary, setSummary] = useState({
        currentTerm: null,
        counts: { total: 0, draft: 0, pending: 0, returned: 0, approved: 0 },
        assignments: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadDashboardData = async () => {
            setLoading(true);
            try {
                const stakeholderParam = user?.id ? `?stakeholder=${encodeURIComponent(user.id)}` : '';
                const data = await fetchJson(`/api/dashboard/summary${stakeholderParam}`);
                if (isMounted && data) {
                    setSummary({
                        currentTerm: data.currentTerm || null,
                        counts: data.counts || { total: 0, draft: 0, pending: 0, returned: 0, approved: 0 },
                        assignments: data.assignments || [],
                    });
                }
            } catch (err) {
                console.error('Error fetching dashboard summary:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadDashboardData();
        return () => {
            isMounted = false;
        };
    }, [user?.id]);

    return (
        <div className={styles.dashboardPage}>
            <div className={styles.dashboardHeader}>
                <h2>Dashboard</h2>
                <div className={styles.subtitle}>
                    Overview of the current academic term and your assigned course offerings.
                </div>
            </div>

            <div className={styles.twoColumns}>
                {/* Column 1: Current Term Block */}
                <div className={styles.leftColumn}>
                    <CurrentTermCard term={summary.currentTerm} loading={loading} />
                </div>

                {/* Column 2: Assigned Learning Plans and Assigned TOS */}
                <div className={styles.rightColumn}>
                    {/* Row 1: Mini Assigned Course Offerings (Assigned Learning Plans) */}
                    <MiniAssignedCourses
                        assignments={summary.assignments}
                        counts={summary.counts}
                        loading={loading}
                    />

                    {/* ponytail: the Assigned TOS panel (components/MiniAssignedTOS.jsx) is sample data until
                        a TOS module exists here; show it again once it reads real assignments. */}
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    return (
        <Skeleton
            header={<Header role="Instructor" name="NORTON, MONICA" />}
            content={<DashboardContent />}
            nav={<SideNavigation mode="instructor" />}
        />
    );
};

export default Dashboard;
