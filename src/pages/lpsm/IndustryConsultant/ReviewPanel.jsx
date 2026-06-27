import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from '../../../styles/ReviewPanel.module.scss';
import StatusTracker from '../Shared/StatusTracker';
import * as service from '../../../services/learningPlanService';
import { useToast } from '../../../components/Toast';

const ReviewPanel = () => {
  const { role, planId } = useParams();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [comments, setComments] = useState('');
  const [action, setAction] = useState('approve');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const showToast = useToast();

  const userId = parseInt(localStorage.getItem('userId') || '30');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await service.getLearningPlans(role, userId);
        setPlans(res.data.filter(p => p.status === 'under_review'));
        if (planId) {
          const found = res.data.find(p => p.id === parseInt(planId));
          if (found) setSelectedPlan(found);
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [role, userId, planId]);

  const handlePlanSelect = (e) => {
    const id = parseInt(e.target.value);
    const found = plans.find(p => p.id === id);
    if (found) setSelectedPlan(found);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      setSubmitting(true);
      if (action === 'return') {
        await service.approveOrReturn(role, userId, selectedPlan.id, {
          reviewer_id: userId,
          reviewer_role: role,
          action: 'return',
          comments
        });
      } else {
        await service.submitReview(role, userId, selectedPlan.id, {
          reviewer_id: userId,
          reviewer_role: role,
          comments: comments || 'Approved'
        });
      }

      setComments('');
      setAction('approve');
      showToast(`Review ${action === 'return' ? 'returned' : 'submitted'} successfully`);

      const res = await service.getLearningPlans(role, userId);
      setPlans(res.data.filter(p => p.status === 'under_review'));
      setSelectedPlan(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      showToast(err.response?.data?.error || 'Failed to submit review', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  const roleLabel = 'Industry Consultant';

  return (
    <div className={styles.container}>
      <h1>Review Panel - {roleLabel}</h1>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <label>Select Learning Plan to Review:</label>
        <select value={selectedPlan?.id || ''} onChange={handlePlanSelect}>
          <option value="">-- Choose a plan --</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {p.course_name}
            </option>
          ))}
        </select>
      </div>

      {selectedPlan && (
        <>
          <StatusTracker status={selectedPlan.status} approvalStages={selectedPlan.approvalStages} />

          <div className={styles.section}>
            <h2>Learning Plan Details</h2>
            <p><strong>Course:</strong> {selectedPlan.course_name}</p>
            <p><strong>Instructor ID:</strong> {selectedPlan.instructor_id}</p>
            <p><strong>Status:</strong> {selectedPlan.status.replace('_', ' ').toUpperCase()}</p>

            <h3>Documents</h3>
            <div className={styles.docList}>
              {selectedPlan.documents && selectedPlan.documents.length > 0 ? (
                selectedPlan.documents.map(doc => (
                  <div key={doc.id} className={styles.docItem}>
                    <span>{doc.original_filename}</span>
                    <span className={styles.docType}>{doc.document_type.replace('_', ' ')}</span>
                  </div>
                ))
              ) : (
                <p>No documents uploaded</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmitReview} className={styles.section}>
            <h2>Submit Your Review</h2>
            <div className={styles.formGroup}>
              <label>Decision</label>
              <select value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="approve">Approve</option>
                <option value="return">Return for Revisions</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Comments {action === 'return' ? '(required)' : ''}</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter your review comments..."
                rows="6"
                required={action === 'return'}
              />
            </div>
            <button type="submit" className={styles.btnSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : action === 'approve' ? 'Approve' : 'Return for Revisions'}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default ReviewPanel;
