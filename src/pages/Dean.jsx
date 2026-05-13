import React from 'react';
import { useSearchParams } from 'react-router-dom';
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import DeanFaculty from "./DeanFaculty.jsx";
import DeanPrograms from "./DeanPrograms.jsx";
import ApprovalCourses from "./ApprovalCourses.jsx";

const Dean = () => {
  const [searchParams] = useSearchParams();
  const page = searchParams.get('page') || 'Syllabus';

  const renderContent = () => {
    switch (page) {
      case 'Programs':
        return <DeanPrograms key="programs" />;
      case 'Faculty':
        return <DeanFaculty key="faculty" />;
      case 'Syllabus':
      default:
        return <ApprovalCourses key="syllabus" isEmbedded={true} roleOverride="dean" />;
    }
  };

  return (
    <SkeletonA
      header={<HeaderA role="Dean" name="DANILA, JUN ARREB" />}
      nav={<SideNavigation mode="dean" />}
      content={renderContent()}
    />
  );
};

export default Dean;
