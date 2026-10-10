import { useParams } from 'react-router-dom';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCoursesTable from "../components/ApprovalCoursesTable.jsx";

const ApprovalCourses = ({ isEmbedded = false, roleOverride = null }) => {
    const { approver } = useParams(); // dynamically get role from URL
    const role = roleOverride || approver; // Use override if provided
    // Program Heads never reach this page (App.jsx redirects their old
    // approval links to Course Offerings); it serves the Director of Libraries
    // and the Industry Consultant.

    const content = <ApprovalCoursesTable role={role} />;

    // If embedded (used inside another component), just return the table
    if (isEmbedded) {
        return content;
    }

    // Otherwise, wrap with full layout
    return (
        <Skeleton
            header={<Header />}
            content={content}
            nav={<SideNavigation mode={approver || 'program-head'} />}
        />
    )
}

export default ApprovalCourses;
