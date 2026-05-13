import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCoursesTable from "../components/ApprovalCoursesTable.jsx";

const ApprovalCourses = ({ isEmbedded = false, roleOverride = null }) => {
    const { approver } = useParams(); // dynamically get role from URL
    const role = roleOverride || approver; // Use override if provided
        const [searchParams] = useSearchParams();
        const navigate = useNavigate();

        useEffect(() => {
            const page = searchParams.get('page');
            if (!page) return;
            if (role === 'program-head' && page === 'Course Offerings') {
                navigate('/role/program-head/course-offerings', { replace: true });
            } else if (role === 'program-head' && page === 'Industry Consultant') {
                navigate('/role/program-head/industry-consultant', { replace: true });
            }
        }, [searchParams, role, navigate]);

    const roleNames = {
      'program-head': 'Program Head',
      'director-of-libraries': 'Director of Libraries',
      'industry-consultant': 'Industry Consultant',
      'dean': 'Dean',
      'instructor': 'Instructor',
      'hr-staff': 'HR Staff'
    }

    const displayRole = role ? (roleNames[role] || role.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')) : 'Approver';

    const content = <ApprovalCoursesTable role={role} />;

    // If embedded (used inside another component), just return the table
    if (isEmbedded) {
        return content;
    }

    // Otherwise, wrap with full layout
    return (
        <Skeleton
            header={<Header role={displayRole} name="DANILA, JUN ARREB" />}
            content={content}
            nav={<SideNavigation mode={approver || 'program-head'} />}
        />
    )
}

export default ApprovalCourses;
