import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCoursesTable from "../components/ApprovalCoursesTable.jsx";

const ProgramHead = () => {
  return (
    <SkeletonA
      header={<HeaderA role="Program Head" name="DANILA, JUNAR" />}
      nav={<SideNavigation mode="program-head" />}
      content={
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%'
          }}
        >
          <ApprovalCoursesTable role="program-head" />
        </div>
      }
    />
  );
};

export default ProgramHead;
