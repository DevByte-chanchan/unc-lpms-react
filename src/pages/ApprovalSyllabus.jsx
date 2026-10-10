import React from 'react';
import { useParams } from 'react-router-dom';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalSyllabusSections from "../components/ApprovalSyllabusSections.jsx";

const ApprovalSyllabus = () => {
  const { approver, courseName } = useParams(); // courseName will be encoded code/name

  // normalized role key (pass to SideNavigation and sections)
  const roleKey = approver || 'program-head';

  // decode courseName for display
  const decodedCourse = courseName ? decodeURIComponent(courseName) : '';

  return (
    <Skeleton
      header={<Header />}
      content={<ApprovalSyllabusSections currentRole={roleKey} courseCode={decodedCourse} />}
      nav={<SideNavigation mode={roleKey} />}
    />
  );
}

export default ApprovalSyllabus;
