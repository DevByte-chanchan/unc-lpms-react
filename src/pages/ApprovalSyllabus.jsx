import React from 'react';
import { useParams } from 'react-router-dom';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalSyllabusSections from "../components/ApprovalSyllabusSections.jsx";
import { getWorkflow } from '../utils/workflowHelpers'

const roleNames = {
  'program-head': 'Program Head',
  'director-of-libraries': 'Director of Libraries',
  'industry-consultant': 'Industry Consultant',
  'dean': 'Dean',
  'instructor': 'Instructor',
  'oic-ovpaa': 'OIC-OVPAA'
}

const approverDisplayNames = {
  'program-head': 'DANILA, JUNAR',
  'dean': 'REYES, AGNES',
  'industry-consultant': 'CRUZ, ROBERTO',
  'director-of-libraries': 'SANTOS, MARIA',
  'instructor': 'CASIMERO, DANNY',
  'oic-ovpaa': 'GARCIA, CARLOS'
}

const normalizeName = (name) => {
  if (!name || name.toLowerCase().includes('norton') || name.toLowerCase().includes('monica')) {
    return 'CASIMERO, DANNY';
  }
  return name;
}

const ApprovalSyllabus = () => {
  const { approver, courseName } = useParams();

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
      content={<div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:0}}><div style={{flex:1,minHeight:0}}><ApprovalSyllabusSections currentRole={roleKey} courseCode={decodedCourse} /></div></div>}
      nav={<SideNavigation mode={roleKey} />}
    />
  );
}

export default ApprovalSyllabus;
