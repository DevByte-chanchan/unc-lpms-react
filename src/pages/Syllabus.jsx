
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SyllabusSections from "../components/SyllabusSections.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const Syllabus = ({}) => {
    return (
        <SkeletonA
            header={<HeaderA />}
            content={<SyllabusSections />}
            nav={<SideNavigation/> }

        />
    )
}
export default Syllabus;