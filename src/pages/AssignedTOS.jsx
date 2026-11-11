
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import TOSCoursesTable from "../components/TOSCoursesTable.jsx";
import { INSTRUCTOR } from "../constants/users.js";

const TOS = ({}) => {

    return (
        <Skeleton
            header={<Header role="Instructor" name={INSTRUCTOR.header}  />}
            content={<TOSCoursesTable />}
            nav={<SideNavigation/> }
        />
    )
}
export default TOS;

