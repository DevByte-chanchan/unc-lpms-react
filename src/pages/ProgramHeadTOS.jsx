import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ProgramHeadTOSCoursesTable from "../components/ProgramHeadTOSCoursesTable.jsx";
import { PROGRAM_HEAD } from "../constants/users.js";

const ProgramHeadTOS = () => {
    return (
        <Skeleton
            header={<Header role="Program Head" name={PROGRAM_HEAD.header} />}
            content={<ProgramHeadTOSCoursesTable />}
            nav={<SideNavigation mode="program-head" />}
        />
    )
}

export default ProgramHeadTOS;
