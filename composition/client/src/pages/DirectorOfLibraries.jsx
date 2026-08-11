import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCoursesTable from "../components/ApprovalCoursesTable.jsx";

const DirectorOfLibraries = () => {
  return (
    <Skeleton
      header={<Header role="Director Of Libraries" name="SANTOS, MARIA" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%'
          }}
        >
          <ApprovalCoursesTable role="director-of-libraries" />
        </div>
      }
    />
  );
};

export default DirectorOfLibraries;
