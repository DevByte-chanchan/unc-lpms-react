import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import ApprovalFormNavigation from "../components/ApprovalFormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import TextField from "../components/TextField.jsx";
import TextArea from "../components/TextArea.jsx";
import SideNavigation from "../components/SideNavigation.jsx";

const ApprovalTopicForm = () => {
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

  const topic = {
    title: 'Project: Front End Prototype (detailed)',
    subtopics: ['Intro & Scope', 'Wireframes', 'Prototype Implementation'],
    flipped: false,
    tlas: [
      { classPhase: 'In-class', performedBy: 'Student', tlaName: 'Prototype Build', tlaDescription: 'Hands-on implementation', laboratory: false }
    ]
  };

  return (
      <Skeleton
          header={<Header role={displayRole} name={approverName} />}
          nav={<SideNavigation mode={roleKey} />}
          content={
            <div className={styles.container}>
              <ApprovalFormNavigation goBack={goBackHandler} />
              <div className={`${styles['form-container']} ${styles.approvalReadOnly}`}>
                <h2>Core Topic (Read-only)</h2>
                <TextField disabled initialValue={topic.title} />
                <h2>Subtopic Lists</h2>
                {topic.subtopics.map((s, i) => (
                    <div className={styles['list']} key={i}>
                      <TextField disabled initialValue={s} />
                    </div>
                ))}

                <h2>Teaching & Learning Activities (Read-only)</h2>
                <div className="checkbox">
                  <input checked={topic.flipped} disabled type="checkbox" aria-disabled="true" /> Flipped Approach
                </div>

                {topic.tlas.map((tla, idx) => (
                    <div className={styles.list} key={idx}>
                      <div className={styles.tlas}>
                        <div className={styles.list}>
                          <Dropdown disabled options={['Pre-class','In-class','Post-class']} label="Class Phase" initialValue={tla.classPhase} />
                          <Dropdown disabled options={['Student','Instructor']} label="Performed By" initialValue={tla.performedBy} />
                        </div>
                        <TextField disabled label="TLA Name" initialValue={tla.tlaName} />
                        <TextArea disabled label="Text Description" initialValue={tla.tlaDescription} />
                        <div className="checkbox">
                          <input checked={tla.laboratory} disabled type="checkbox" aria-disabled="true" /> Laboratory
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          }
      />
  );
};

export default ApprovalTopicForm;
