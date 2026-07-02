import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ProgramHeadTOSCoursesTable from "../components/ProgramHeadTOSCoursesTable.jsx";

const ProgramHeadTOS = () => {
    return (
        <Skeleton
            header={<Header role="Program Head" name="PERALTA, JAKE" />}
            content={<ProgramHeadTOSCoursesTable />}
            nav={<SideNavigation mode="program-head" />}
        />
    )
}

export default ProgramHeadTOS;
