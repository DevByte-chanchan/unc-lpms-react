import React from 'react';
import { useParams } from 'react-router-dom';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalSyllabusSections from "../components/ApprovalSyllabusSections.jsx";
import WorkflowStepper from "../components/WorkflowStepper/WorkflowStepper.jsx";
import { getWorkflow } from '../utils/workflowHelpers'

const roleNames = {
  'program-head': 'Program Head',
  'director-of-libraries': 'Director of Libraries',
  'industry-consultant': 'Industry Consultant',
  'dean': 'Dean',
  'instructor': 'Instructor',
  'hr-staff': 'HR Staff'
}

const approverDisplayNames = {
  'program-head': 'DANILA, JUNAR',
  'dean': 'REYES, AGNES',
  'industry-consultant': 'CRUZ, ROBERTO',
  'director-of-libraries': 'SANTOS, MARIA'
}

const ApprovalSyllabus = () => {
  const { approver, courseName } = useParams(); // courseName will be encoded code/name

  const formattedRole = approver ? (roleNames[approver] || approver.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')) : 'Approver';
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const approverName = approver ? (approverDisplayNames[approver] || storedUser?.name || 'CASIMERO, DANNY') : (storedUser?.name || 'Approver');

  // normalized role key (pass to SideNavigation and sections)
  const roleKey = approver || 'program-head';

  // decode courseName for display
  const decodedCourse = courseName ? decodeURIComponent(courseName) : '';

  const workflow = getWorkflow(decodedCourse || '')

  return (
    <Skeleton
      header={<Header role={formattedRole} name={approverName} />}
      content={<div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:0}}>{roleKey !== 'director-of-libraries' && roleKey !== 'industry-consultant' && <WorkflowStepper courseCode={decodedCourse} />}<div style={{flex:1,minHeight:0}}><ApprovalSyllabusSections currentRole={roleKey} courseCode={decodedCourse} /></div></div>}
      nav={<SideNavigation mode={roleKey} />}
    />
  );
}

export default ApprovalSyllabus;
