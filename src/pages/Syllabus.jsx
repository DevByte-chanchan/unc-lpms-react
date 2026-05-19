
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SyllabusSections from "../components/SyllabusSections.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import WorkflowStepper from "../components/WorkflowStepper/WorkflowStepper.jsx";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const Syllabus = ({}) => {
    const { code } = useParams();
    const [userRole, setUserRole] = useState('instructor');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.role) {
                setUserRole(user.role);
            }
        } catch (e) {
            console.log('Could not get user role');
        }
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
                <div style={{ textAlign: 'center' }}>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <SkeletonA
            header={<HeaderA role="Instructor" name="CASIMERO, DANNY"  />}
            content={<div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:0}}><WorkflowStepper courseCode={code} /><div style={{flex:1,minHeight:0}}><SyllabusSections /></div></div>}
            nav={<SideNavigation mode="instructor" />}
        />
    )
}
export default Syllabus;