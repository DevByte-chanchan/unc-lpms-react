import { useLocation } from "react-router-dom";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import TosSections from "../components/TosSections.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const TOS = ({}) => {
    const location = useLocation();
    const role = location.state?.role || 'instructor';
    const headerRole = role === 'program-head' ? 'Program Head' : 'Instructor';
    const headerName = role === 'program-head' ? 'PERALTA, JAKE' : 'NORTON, MONICA';
    return (
        <Skeleton
            header={<Header role={headerRole} name={headerName} />}
            content={<TosSections role={role} />}
            nav={<SideNavigation mode={role === 'program-head' ? 'program-head' : 'instructor'} />}
        />
    )
}
export default TOS;