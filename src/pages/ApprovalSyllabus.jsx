import React from 'react';
import { useParams } from 'react-router-dom';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalSyllabusSections from "../components/ApprovalSyllabusSections.jsx";

const roleNames = {
  'program-head': 'Program Head',
  'director-of-libraries': 'Director of Libraries',
  'industry-consultant': 'Industry Consultant',
  'dean': 'Dean',
  'instructor': 'Instructor',
  'hr-staff': 'HR Staff'
}

const approverDisplayNames = {
  'program-head': 'Dr. Smith',
  'dean': 'Dean Johnson',
  'industry-consultant': 'Consultant Lee',
  'director-of-libraries': 'Director Brown'
}

const ApprovalSyllabus = () => {
  const { approver, courseName } = useParams(); // courseName will be encoded code/name

  const formattedRole = approver ? (roleNames[approver] || approver.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')) : 'Approver';
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const approverName = storedUser?.name || (approver ? (approverDisplayNames[approver] || 'NORTON, MONICA') : 'Approver');

  // normalized role key (pass to SideNavigation and sections)
  const roleKey = approver || 'program-head';

  // decode courseName for display
  const decodedCourse = courseName ? decodeURIComponent(courseName) : '';

  return (
    <Skeleton
      header={<Header role={formattedRole} name={approverName} />}
      content={<ApprovalSyllabusSections currentRole={roleKey} courseCode={decodedCourse} />}
      nav={<SideNavigation mode={roleKey} />}
    />
  );
}

export default ApprovalSyllabus;
