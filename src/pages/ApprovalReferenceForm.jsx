import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import ApprovalFormNavigation from "../components/ApprovalFormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import TextField from "../components/TextField.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const ApprovalReferenceForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  const roleQuery = qs.get('role') || 'approver';
  const goBackHandler = () => navigate(-1);

  const roleKey = roleQuery.toLowerCase().includes('program')
      ? 'program-head'
      : roleQuery.toLowerCase().includes('dean')
          ? 'dean'
          : roleQuery.toLowerCase().includes('industry')
              ? 'industry-consultant'
              : roleQuery.toLowerCase().includes('library')
                  ? 'director-of-libraries'
                  : roleQuery.toLowerCase().includes('instructor')
                      ? 'instructor'
                      : 'approver';

  const displayRole = roleKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const defaultNames = {
    'program-head': 'Dr. Smith',
    'dean': 'Dean Johnson',
    'industry-consultant': 'Consultant Lee',
    'director-of-libraries': 'Director Brown'
  };
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const approverName = storedUser?.name || defaultNames[roleKey] || displayRole;

  const fixed = { type: 'Textbook', title: 'UI PRINCIPLES', authors: 'Don Norman', year: '2015' };
  const ReferenceTypes = ['Textbook', 'Online Resources', 'Open Educational Resources'];

  return (
      <Skeleton
          header={<Header role={displayRole} name={approverName} />}
          nav={<SideNavigation mode={roleKey} />}
          content={
            <div className={styles.container}>
              <ApprovalFormNavigation goBack={goBackHandler} />
              <div className={styles['form-container']}>
                <h2>Reference Details (Read-only)</h2>
                <Dropdown disabled label="Reference Type" options={ReferenceTypes} initialValue={fixed.type} />
                <TextField disabled label="Reference Title" initialValue={fixed.title} />
                <TextField disabled label="Author(s)" initialValue={fixed.authors} />
                <TextField disabled label="Publication Year" initialValue={fixed.year} />
              </div>
            </div>
          }
      />
  );
};

export default ApprovalReferenceForm;
