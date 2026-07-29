import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/Header.jsx";
import TosSections from "../components/TosSections.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const TOS = () => {
    return (
        <Skeleton
            header={<Header role="Instructor" name="CASIMERO, DANNY"  />}
            content={<TosSections />}
            nav={<SideNavigation/> }
        />
    )
}
export default TOS;