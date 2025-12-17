
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const ProgramHead = () => {
  return (
    <SkeletonA
      header={<HeaderA role="Program Head" name="NORTON, MONICA" />}
      nav={<SideNavigation />}
      content={
        <div style={{ padding: 20 }}>
          <h2>Program Head</h2>
          <p>You are viewing the Program Head page.</p>
        </div>
      }
    />
  );
};

export default ProgramHead;
