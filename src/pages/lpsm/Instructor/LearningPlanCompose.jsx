import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './LearningPlanCompose.module.scss';
import StatusTracker from '../Shared/StatusTracker';
import * as service from '../../../services/learningPlanService';

const LearningPlanCompose = () => {
  const navigate = useNavigate();
  const { role, planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(!!planId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const userId = parseInt(localStorage.getItem('userId') || '1');

  useEffect(() => {
    if (planId) {
      const fetchPlan = async () => {
        try {
          const res = await service.getLearningPlan(role, userId, planId);
          setPlan(res.data);
          setCourseName(res.data.course_name);
        } catch (err) {
          setError(err.response?.data?.error || err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchPlan();
    }
  }, [planId, role, userId]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (planId) {
        // Update existing
        await service.getLearningPlan(role, userId, planId);
      } else {
        // Create new
        const res = await service.createLearningPlan(role, userId, { course_name: courseName });
        setPlan(res.data);
      }
      navigate(`/role/${role}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (!planId) {
        setError('Save the plan first');
        return;
      }
      await service.submitLearningPlan(role, userId, planId);
      navigate(`/role/${role}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  const requiredDocs = [
    { type: 'peo_alignment', label: 'Program Outcome & PEO Alignment' },
    { type: 'coaep', label: 'COAEP' },
    { type: 'co_po_alignment', label: 'Course Outcomes & PO Alignment' },
    { type: 'references', label: 'References' }
  ];

  const uploadedTypes = (plan?.documents || []).map(d => d.document_type);
  const allDocsUploaded = requiredDocs.every(d => uploadedTypes.includes(d.type));

  return (
    <div className={styles.container}>
      <h1>Learning Plan Composition</h1>

      {plan && <StatusTracker status={plan.status} />}

      <div className={styles.form}>
        <div className={styles.section}>
          <h2>Course Information</h2>
          <div className={styles.formGroup}>
            <label>Course Name</label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              disabled={plan && plan.status !== 'draft'}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.section}>
          <h2>Required Documents</h2>
          <div className={styles.docList}>
            {requiredDocs.map(doc => (
              <div key={doc.type} className={styles.docItem}>
                <span>{doc.label}</span>
                <span className={uploadedTypes.includes(doc.type) ? styles.uploaded : styles.pending}>
                  {uploadedTypes.includes(doc.type) ? '✓ Uploaded' : '✗ Missing'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={() => navigate(`/role/${role}`)} className={styles.btnSecondary}>
            Cancel
          </button>
          <button onClick={handleSave} className={styles.btnPrimary} disabled={submitting}>
            Save Plan
          </button>
          {plan?.status === 'draft' && (
            <button
              onClick={handleSubmit}
              className={styles.btnSuccess}
              disabled={submitting || !allDocsUploaded}
              title={!allDocsUploaded ? 'All documents must be uploaded' : ''}
            >
              Submit for Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningPlanCompose;
