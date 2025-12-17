
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const Dean = () => {
  return (
    <SkeletonA
      header={<HeaderA role="Dean" name="NORTON, MONICA" />}
      nav={<SideNavigation />}
      content={
        <div style={{ padding: 20 }}>
          <h2>Dean</h2>
          <p>You are viewing the Dean page.</p>
        </div>
      }
    />
  );
};

export default Dean;
