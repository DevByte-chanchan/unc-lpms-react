import React from 'react';
import styles from '../../../styles/StatusTracker.module.scss';

const StatusTracker = ({ status, currentStage }) => {
  const stages = [
    { key: 'draft', label: 'Draft', order: 1 },
    { key: 'under_review', label: 'Under Review', order: 2 },
    { key: 'approved', label: 'Approved', order: 4 },
    { key: 'returned', label: 'Returned', order: 5 }
  ];

  const getStageStatus = (stage) => {
    if (status === 'returned') return 'returned';
    if (status === stage) return 'current';
    const stageOrder = stages.find(s => s.key === stage)?.order || 0;
    const currentOrder = stages.find(s => s.key === status)?.order || 0;
    return stageOrder < currentOrder ? 'completed' : 'pending';
  };

  return (
    <div className={styles.tracker}>
      <div className={styles.stepper}>
        {stages.map((stage, idx) => (
          <React.Fragment key={stage.key}>
            <div
              className={`${styles.step} ${styles[getStageStatus(stage.key)]}`}
            >
              <div className={styles.circle}>
                {getStageStatus(stage.key) === 'completed' && '✓'}
                {getStageStatus(stage.key) === 'current' && '•'}
              </div>
              <div className={styles.label}>{stage.label}</div>
            </div>
            {idx < stages.length - 1 && (
              <div
                className={`${styles.connector} ${
                  getStageStatus(stages[idx + 1].key) !== 'pending'
                    ? styles.completed
                    : ''
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className={styles.status}>
        Status: <strong>{status.replace('_', ' ').toUpperCase()}</strong>
      </div>
    </div>
  );
};

export default StatusTracker;
