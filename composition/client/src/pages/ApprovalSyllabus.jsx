import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalSyllabusSections from "../components/ApprovalSyllabusSections.jsx";
import Syllabus from "./Syllabus.jsx";
import { getWorkflow } from '../utils/workflowHelpers'

const roleNames = {
  'program-head': 'Program Head',
  'director-of-libraries': 'Director of Libraries',
  'industry-consultant': 'Industry Consultant',
  'dean': 'Dean',
  'instructor': 'Instructor',
  'vpaa': 'VPAA'
}

const approverDisplayNames = {
  'program-head': 'DANILA, JUNAR',
  'dean': 'REYES, AGNES',
  'industry-consultant': 'CRUZ, ROBERTO',
  'director-of-libraries': 'SANTOS, MARIA',
  'instructor': 'CASIMERO, DANNY',
  'vpaa': 'GARCIA, CARLOS'
}

const normalizeName = (name) => {
  if (!name || name.toLowerCase().includes('norton') || name.toLowerCase().includes('monica')) {
    return 'CASIMERO, DANNY';
  }
  return name;
}

const ApprovalSyllabus = () => {
  const { approver, courseName } = useParams();
  const [searchParams] = useSearchParams();

  // Extract pcId and revNum from query params (passed from ApprovalCoursesTable)
  const pcId = searchParams.get('pcId');
  const revNum = searchParams.get('revNum');

  if (approver === 'instructor') {
    return <Syllabus />;
  }

  const formattedRole = approver ? (roleNames[approver] || approver.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')) : 'Approver';
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const rawName = approver ? (approverDisplayNames[approver] || storedUser?.name || 'CASIMERO, DANNY') : (storedUser?.name || 'Approver');
  const approverName = normalizeName(rawName);

  // normalized role key (pass to SideNavigation and sections)
  const roleKey = approver || 'program-head';

  // decode courseName for display
  const decodedCourse = courseName ? decodeURIComponent(courseName) : '';

  const workflow = getWorkflow(decodedCourse || '')

  return (
    <Skeleton
      header={<Header role={formattedRole} name={approverName} />}
      content={<div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:0}}><div style={{flex:1,minHeight:0}}><ApprovalSyllabusSections currentRole={roleKey} courseCode={decodedCourse} pcId={pcId} revNum={revNum} /></div></div>}
      nav={<SideNavigation mode={roleKey} />}
    />
  );
}

export default ApprovalSyllabus;
