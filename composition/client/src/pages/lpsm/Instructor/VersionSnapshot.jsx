import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../../../styles/LearningPlanCompose.module.scss';
import * as service from '../../../services/learningPlanService';

const VersionSnapshot = () => {
  const { role, planId, versionNo } = useParams();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = parseInt(localStorage.getItem('userId') || '1');

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const res = await service.getLPVersion(role, userId, planId, versionNo);
        setSnapshot(res.data.snapshot_data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSnapshot();
  }, [planId, versionNo, role, userId]);

  if (loading) return <div className={styles.container}>Loading snapshot...</div>;
  if (error) return <div className={styles.container}><div className={styles.error}>{error}</div></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.btnSecondary}>
          ← Back
        </button>
        <h1>Version {versionNo} Snapshot (Read-Only)</h1>
      </div>

      <div className={styles.form}>
        <div className={styles.section}>
          <h2>Course Information</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Course Code</label>
              <input type="text" value={snapshot.course_code || ''} disabled />
            </div>
            <div className={styles.formGroup}>
              <label>Course Name</label>
              <input type="text" value={snapshot.course_name || ''} disabled />
            </div>
            <div className={styles.formGroup}>
              <label>Academic Year</label>
              <input type="text" value={snapshot.academic_year || ''} disabled />
            </div>
            <div className={styles.formGroup}>
              <label>Semester</label>
              <input type="text" value={snapshot.semester || ''} disabled />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Documents at this point</h2>
          <div className={styles.docList}>
            {(snapshot.documents || []).map(doc => (
              <div key={doc.id} className={styles.docItem}>
                <span>{doc.document_type.replace(/_/g, ' ').toUpperCase()}</span>
                <span>{doc.original_filename}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.section}>
          <h2>Approval Status at this point</h2>
          <div className={styles.docList}>
            {(snapshot.approvalStages || []).map(stage => (
              <div key={stage.id} className={styles.docItem}>
                <span>{stage.stage.replace(/_/g, ' ').toUpperCase()}</span>
                <span className={styles[stage.status]}>{stage.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionSnapshot;
