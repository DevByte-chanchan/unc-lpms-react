import React from 'react';
import styles from '../../../styles/StatusTracker.module.scss';

const STAGES = [
  { key: 'draft', label: 'Draft', mainStage: true },
  { key: 'industry_consultant', label: 'Industry Consultant', parallel: true, group: 'parallel_review' },
  { key: 'director_of_libraries', label: 'Director of Libraries', parallel: true, group: 'parallel_review' },
  { key: 'program_head', label: 'Program Head' },
  { key: 'dean', label: 'Dean' },
  { key: 'approved', label: 'Approved', final: true }
];

const PARALLEL_KEY = 'parallel_review';

const StatusTracker = ({ status, currentStage, approvalStages = [], returnedStage }) => {
  const getStageStatus = (stageKey) => {
    if (status === 'returned') {
      if (stageKey === 'draft') return 'completed';
      if (stageKey === returnedStage) return 'returned';
      if (STAGES.findIndex(s => s.key === stageKey) < STAGES.findIndex(s => s.key === returnedStage)) return 'completed';
      return 'pending';
    }

    if (status === 'approved') return stageKey === 'draft' ? 'completed' : stageKey === 'approved' ? 'current' : 'completed';
    if (status === 'draft') return stageKey === 'draft' ? 'current' : 'pending';

    if (currentStage) {
      if (stageKey === currentStage) return 'current';
      const currentIdx = STAGES.findIndex(s => s.key === currentStage);
      const stageIdx = STAGES.findIndex(s => s.key === stageKey);
      if (stageIdx < currentIdx) return 'completed';
      return 'pending';
    }

    if (approvalStages.length > 0) {
      const stageInfo = approvalStages.find(s => s.stage === stageKey || s.stage === stageKey.replace('_', '-'));
      if (stageInfo) {
        if (stageInfo.status === 'approved') return 'completed';
        if (stageInfo.status === 'returned') return 'returned';
        if (stageInfo.status === 'pending') return 'current';
      }
      if (stageKey === 'draft') return 'completed';
      if (stageKey === 'approved') return 'pending';
      return 'pending';
    }

    if (status === 'under_review') {
      if (stageKey === 'draft') return 'completed';
      return 'pending';
    }

    return 'pending';
  };

  const stageStatus = (key) => getStageStatus(key);

  const renderStage = (stage) => {
    const ss = stageStatus(stage.key);
    return (
      <div key={stage.key} className={`${styles.step} ${styles[ss] || styles.pending}`}>
        <div className={styles.circle}>
          {ss === 'completed' && '✓'}
          {ss === 'returned' && '✗'}
          {ss === 'current' && '•'}
          {ss === 'pending' && ''}
        </div>
        <div className={styles.label}>{stage.label}</div>
      </div>
    );
  };

  const renderConnector = (key) => {
    const nextStage = STAGES.find((_, i) => STAGES[i + 1] && STAGES[i].key === key);
    if (!nextStage) return null;
    const ss = stageStatus(key);
    return (
      <div key={`conn-${key}`} className={`${styles.connector} ${(ss === 'completed' || ss === 'returned') ? styles.completed : ''}`} />
    );
  };

  const getStatusLabel = () => {
    if (status === 'returned' && returnedStage) {
      const stage = STAGES.find(s => s.key === returnedStage);
      return `Returned by ${stage ? stage.label : returnedStage.replace('_', ' ')}`;
    }
    return status.replace('_', ' ').toUpperCase();
  };

  return (
    <div className={styles.tracker}>
      <div className={styles.stepper}>
        {STAGES.map((stage) => (
          !stage.parallel ? (
            <React.Fragment key={stage.key}>
              {renderStage(stage)}
              {renderConnector(stage.key)}
            </React.Fragment>
          ) : null
        ))}
      </div>
      {STAGES.filter(s => s.parallel).length > 0 && (
        <div className={styles.parallelRow}>
          <span className={styles.parallelLabel}>Parallel Review:</span>
          {STAGES.filter(s => s.parallel).map(renderStage)}
        </div>
      )}
      <div className={styles.status}>
        Status: <strong>{getStatusLabel()}</strong>
      </div>
    </div>
  );
};

export default StatusTracker;
