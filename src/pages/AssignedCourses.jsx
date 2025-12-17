
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import CoursesTable from "../components/CoursesTable.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const Syllabus = ({}) => {

    return (
        <SkeletonA
            header={<HeaderA role="Instructor" name="NORTON, MONICA"  />}
            content={ <CoursesTable /> }
            nav={<SideNavigation/> }
        />
    )
}
export default Syllabus;

