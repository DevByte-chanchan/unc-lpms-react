import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import DeanFaculty from "./DeanFaculty.jsx";
import DeanPrograms from "./DeanPrograms.jsx";
import DeanDepartmentStatements from "./DeanDepartmentStatements.jsx";
import { useCurrentUser } from "../services/currentUser.jsx";

// TODO(auth): the department the signed-in dean is assigned to. The account
// links to a faculty row by email; once deans have one, read the department
// from it. The Vision & Mission page only ever shows this one department.
const DEAN_DEPARTMENT_CODE = 'SCIS';

const Dean = () => {
  const { name } = useCurrentUser();
  const [searchParams] = useSearchParams();
  const page = searchParams.get('page') || 'Faculty';

  // Deans have no Syllabus page any more; old links land on Faculty.
  if (page === 'Syllabus') return <Navigate to="/role/dean?page=Faculty" replace />;

  const renderContent = () => {
    switch (page) {
      case 'Programs':
        return <DeanPrograms key="programs" />;
      case 'Vision & Mission':
        return <DeanDepartmentStatements key="department-vm" userName={name} departmentCode={DEAN_DEPARTMENT_CODE} />;
      case 'Faculty':
      default:
        return <DeanFaculty key="faculty" />;
    }
  };

  return (
    <SkeletonA
      header={<HeaderA />}
      nav={<SideNavigation mode="dean" />}
      content={renderContent()}
    />
  );
};

export default Dean;
