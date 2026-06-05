import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from '../../../styles/ApprovalPanel.module.scss';
import StatusTracker from '../Shared/StatusTracker';
import * as service from '../../../services/learningPlanService';

const ApprovalPanel = () => {
  const { role, planId } = useParams();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [comments, setComments] = useState('');
  const [action, setAction] = useState('approve');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = parseInt(localStorage.getItem('userId') || (role === 'program_head' ? '10' : '40'));

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await service.getLearningPlans(role, userId);
        setPlans(res.data.filter(p => p.status === 'under_review' || p.status === 'returned'));
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

  const handleSubmitApproval = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      setSubmitting(true);
      await service.approveOrReturn(role, userId, selectedPlan.id, {
        reviewer_id: userId,
        reviewer_role: role,
        action,
        comments: action === 'return' ? comments : comments || 'Approved'
      });

      setComments('');
      setAction('approve');
      alert(`Learning plan ${action}d successfully`);

      // Refetch plans
      const res = await service.getLearningPlans(role, userId);
      setPlans(res.data.filter(p => p.status === 'under_review' || p.status === 'returned'));
      setSelectedPlan(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  const roleLabel = role === 'program_head' ? 'Program Head' : 'Dean';
  const isDean = role === 'dean';

  return (
    <div className={styles.container}>
      <h1>Approval Panel - {roleLabel}</h1>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <label>Select Learning Plan to Approve:</label>
        <select value={selectedPlan?.id || ''} onChange={handlePlanSelect}>
          <option value="">-- Choose a plan --</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>
              {p.course_name} ({p.status})
            </option>
          ))}
        </select>
      </div>

      {selectedPlan && (
        <>
          <StatusTracker status={selectedPlan.status} />

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
                <p>No documents</p>
              )}
            </div>

            {selectedPlan.comments && selectedPlan.comments.length > 0 && (
              <>
                <h3>Previous Reviews</h3>
                <div className={styles.commentList}>
                  {selectedPlan.comments.map(c => (
                    <div key={c.id} className={styles.comment}>
                      <div className={styles.commentHeader}>
                        <strong>{c.from_role}</strong>
                        <small>{new Date(c.createdAt).toLocaleDateString()}</small>
                      </div>
                      <p>{c.comment}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <form onSubmit={handleSubmitApproval} className={styles.section}>
            <h2>
              {isDean ? 'Relay Comments to Program Head' : 'Approval Decision'}
            </h2>

            <div className={styles.formGroup}>
              <label>Decision</label>
              <select value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="approve">Approve</option>
                <option value="return">Return for Revisions</option>
              </select>
            </div>

            {action === 'return' && (
              <div className={styles.formGroup}>
                <label>Comments (required for return)</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={isDean ? 'Enter comments for Program Head...' : 'Enter feedback...'}
                  rows="6"
                  required={action === 'return'}
                />
              </div>
            )}

            {isDean && action === 'approve' && (
              <div className={styles.formGroup}>
                <label>Optional Comments for Program Head</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Any additional notes for Program Head..."
                  rows="4"
                />
              </div>
            )}

            <button type="submit" className={styles.btnSubmit} disabled={submitting}>
              {submitting ? 'Processing...' : action === 'approve' ? 'Approve' : 'Return for Revisions'}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default ApprovalPanel;
