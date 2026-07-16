import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../../styles/VersionHistoryPanel.module.scss';
import * as service from '../../../services/learningPlanService';

const VersionHistoryPanel = ({ planId, versions, role, userId, onVersionRestored }) => {
  const navigate = useNavigate();
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [rollbackConfirm, setRollbackConfirm] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const getEventIcon = (event) => {
    const icons = {
      submitted: '📤',
      resubmitted: '🔄',
      returned: '⚠️',
      approved: '✅'
    };
    return icons[event] || '📝';
  };

  const getEventColor = (event) => {
    const colors = {
      submitted: '#3498db',
      resubmitted: '#f39c12',
      returned: '#e74c3c',
      approved: '#27ae60'
    };
    return colors[event] || '#95a5a6';
  };

  const handleRollback = async (versionNo) => {
    try {
      setError(null);
      setRollingBack(true);
      await service.rollbackToVersion(role, userId, planId, versionNo);
      setSuccess(`Successfully rolled back to version ${versionNo}`);
      setRollbackConfirm(null);
      if (onVersionRestored) {
        onVersionRestored();
      }
      // Close panel after success
      setTimeout(() => {
        window.location.reload(); // Refresh to show updated LP
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setRollingBack(false);
    }
  };

  const viewSnapshot = (versionNo) => {
    navigate(`/role/${role}/plans/${planId}/versions/${versionNo}`);
  };

  if (!versions || versions.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyState}>
          <p>No version history yet. Submit your learning plan to create the first version.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>Version History</h2>
        <p className={styles.subtitle}>
          {versions.length} version{versions.length !== 1 ? 's' : ''} recorded
        </p>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {success && <div className={styles.successAlert}>{success}</div>}

      <div className={styles.timeline}>
        {versions.map((version, index) => (
          <div key={version.version_no} className={styles.timelineItem}>
            <div className={styles.timelineMarker}>
              <div
                className={styles.eventIcon}
                style={{ borderColor: getEventColor(version.trigger_event) }}
                title={version.trigger_event}
              >
                {getEventIcon(version.trigger_event)}
              </div>
              {index < versions.length - 1 && <div className={styles.line} />}
            </div>

            <div className={styles.versionCard}>
              <div
                className={styles.cardHeader}
                onClick={() =>
                  setExpandedVersion(
                    expandedVersion === version.version_no ? null : version.version_no
                  )
                }
              >
                <div className={styles.versionMeta}>
                  <span className={styles.versionNumber}>Version {version.version_no}</span>
                  <span
                    className={styles.eventBadge}
                    style={{
                      backgroundColor: getEventColor(version.trigger_event) + '20',
                      color: getEventColor(version.trigger_event)
                    }}
                  >
                    {version.trigger_event.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className={styles.timestamp}>
                  {new Date(version.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  <span className={styles.time}>
                    {new Date(version.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {expandedVersion === version.version_no && (
                <div className={styles.cardBody}>
                  <div className={styles.createdBy}>
                    Created by: <strong>{version.creator?.name || 'System'}</strong> (
                    {version.creator?.role || 'unknown'})
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.btnView}
                      onClick={() => viewSnapshot(version.version_no)}
                    >
                      👁️ View Snapshot
                    </button>

                    {version.version_no !== versions[0].version_no && (
                      <div className={styles.rollbackContainer}>
                        {rollbackConfirm === version.version_no ? (
                          <div className={styles.confirmation}>
                            <p>Restore this version? Your current changes will be lost.</p>
                            <div className={styles.confirmButtons}>
                              <button
                                className={styles.btnCancel}
                                onClick={() => setRollbackConfirm(null)}
                                disabled={rollingBack}
                              >
                                Cancel
                              </button>
                              <button
                                className={styles.btnConfirm}
                                onClick={() => handleRollback(version.version_no)}
                                disabled={rollingBack}
                              >
                                {rollingBack ? 'Restoring...' : 'Confirm Restore'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className={styles.btnRollback}
                            onClick={() => setRollbackConfirm(version.version_no)}
                          >
                            ↩️ Restore Version
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.info}>
        <p>
          💡 Tip: You can view any previous version to review changes or restore an earlier state of
          your learning plan.
        </p>
      </div>
    </div>
  );
};

export default VersionHistoryPanel;
