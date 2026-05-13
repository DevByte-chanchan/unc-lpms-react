import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import ApprovalFormNavigation from "../components/ApprovalFormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import TextField from "../components/TextField.jsx";
import TextArea from "../components/TextArea.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const ApprovalILOForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  const roleQuery = qs.get('role') || 'approver';

  const goBackHandler = () => navigate(-1);

  // normalize role
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

  const co1 = 'Apply core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing a User Interface (UI) design using Figma to translate a design brief into interactive screen layouts and UI components with a high-fidelity prototype demonstrating clarity, consistency, and appropriate use of visual hierarchy.';

  const weeks = Array.from({ length: 10 }, (_, i) => `Week ${i + 1}`);
  const titles = ["HCI Models", "Introduction to HCI", "User Centered Design", "Front End Prototyping"];
  const topics = ["OR1 - UI PRINCIPLES", "OR2 - Design Guidelines", "OR3 - Imagery", "OE1 - UI PRINCIPLES", "OE2 - Introduction to Generative AI"];

  return (
      <Skeleton
          header={<Header role={displayRole} name={approverName} />}
          nav={<SideNavigation mode={roleKey} />}
          content={
            <div className={styles.container}>
              <ApprovalFormNavigation goBack={goBackHandler} />
              <div className={`${styles['form-container']} ${styles.approvalReadOnly}`}>
                <h2>ILO & Course Outcome Alignment (Read-only)</h2>
                <TextArea disabled label="Course Outcome" initialValue={co1} />
                <TextArea disabled label="Intended Learning Outcome" initialValue="Demonstrate understanding of HCI principles." />
                <div className={styles.list}>
                  <Dropdown disabled label="Delivery Week" options={weeks} initialValue="Week 1" />
                  <Dropdown disabled label="Allocated Time" options={['1 hour', '1.5 hour','2 hours']} initialValue="1.5 hour" />
                </div>

                <h2>Topics</h2>
                <MultiSelect disabled label="Name(s)" options={titles} initialValue={['HCI Models']} />

                <h2>References</h2>
                <MultiSelect disabled label="Title(s)" options={topics} initialValue={['OR1 - UI PRINCIPLES']} />
              </div>
            </div>
          }
      />
  );
};

export default ApprovalILOForm;
