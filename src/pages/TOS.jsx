import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/HeaderA.jsx";
import TosSections from "../components/TosSections.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const TOS = ({}) => {
    return (
        <Skeleton
            header={<Header />}
            content={<TosSections />}
            nav={<SideNavigation/> }
        />
    )
}
export default TOS;