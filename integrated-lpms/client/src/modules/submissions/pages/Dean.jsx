import React from 'react';
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCourses from "./ApprovalCourses.jsx";

const Dean = () => (
  <SkeletonA
    header={<HeaderA role="Dean" />}
    nav={<SideNavigation mode="dean" />}
    content={<ApprovalCourses key="syllabus" isEmbedded={true} roleOverride="dean" />}
  />
);

export default Dean;
