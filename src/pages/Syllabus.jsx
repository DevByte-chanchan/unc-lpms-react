import { useParams } from "react-router-dom";
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SyllabusSections from "../components/SyllabusSections.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { ProgramOfStudyLink } from "../components/ProgramOfStudy.jsx";
import { usePeriod } from "../services/period.jsx";

// An instructor writes the syllabus from the curriculum, so the program's kept
// Program of Study is one click away — found through the course code in the
// current term (whichever program offers it). Divs only: the syllabus
// stylesheets restyle every <section>.
const Syllabus = () => {
    const { code } = useParams();
    const { currentPeriod } = usePeriod();
    return (
        <SkeletonA
            header={<HeaderA />}
            content={
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ flex: '0 0 auto', padding: '8px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
                        <ProgramOfStudyLink courseCode={code} periodId={currentPeriod && currentPeriod.id} />
                    </div>
                    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <SyllabusSections />
                    </div>
                </div>
            }
            nav={<SideNavigation/> }
        />
    )
}
export default Syllabus;
