
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import TOSCoursesTable from "../components/TOSCoursesTable.jsx";

const TOS = ({}) => {

    return (
        <Skeleton
            header={<Header />}
            content={<TOSCoursesTable />}
            nav={<SideNavigation/> }
        />
    )
}
export default TOS;

