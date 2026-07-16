import { ChevronLeft } from 'react-feather';
import React from 'react';
import styles from '../styles/FormNavigation.module.sass';
import { useNavigate } from 'react-router-dom';

/**
 * Read-only form navigation for approval pages.
 * - Back button markup copied from instructor FormNavigation (same classes).
 * - No Save button.
 */
const ApprovalFormNavigation = ({ goBack }) => {
  const navigate = useNavigate();

  const goBackHandler = (e) => {
    if (typeof goBack === 'function') return goBack();
    return navigate(-1);
  };

  return (
    <div className={styles.navi}>
      <div onClick={goBackHandler} className={styles.return}>
        <ChevronLeft />
      </div>
      <div className={'fill'}></div>
      {/* no Save button for approval view */}
    </div>
  );
};

export default ApprovalFormNavigation;