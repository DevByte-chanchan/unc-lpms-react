import { useParams } from 'react-router-dom';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCoursesTable from "../components/ApprovalCoursesTable.jsx";
import CoursesTable from "../components/CoursesTable.jsx";

const ApprovalCourses = ({ isEmbedded = false, roleOverride = null }) => {
    const { approver } = useParams(); // dynamically get role from URL
    const role = roleOverride || approver; // Use override if provided
    const roleNames = {
      'program-head': 'Program Head',
      'director-of-libraries': 'Director of Libraries',
      'industry-consultant': 'Industry Consultant',
      'dean': 'Dean',
      'instructor': 'Instructor',
      'vpaa': 'VPAA'
    }

    const displayRole = role ? (roleNames[role] || role.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')) : 'Approver';

    const content = role === 'instructor'
      ? <CoursesTable />
      : <ApprovalCoursesTable role={role} />;

    // If embedded (used inside another component), just return the table
    if (isEmbedded) {
        return content;
    }

    // Otherwise, wrap with full layout
    return (
        <Skeleton
            header={<Header role={displayRole} />}
            content={content}
            nav={<SideNavigation mode={role === 'instructor' ? 'instructor' : (approver || 'program-head')} />}
        />
    )
}

export default ApprovalCourses;
