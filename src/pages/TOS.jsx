import { useLocation } from "react-router-dom";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import TosSections from "../components/TosSections.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const TOS = ({}) => {
    const location = useLocation();
    const role = location.state?.role || 'instructor';
    return (
        <Skeleton
            header={<Header role="Instructor" name="NORTON, MONICA"  />}
            content={<TosSections role={role} />}
            nav={<SideNavigation/> }
        />
    )
}
export default TOS;