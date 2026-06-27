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
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const showToast = useToast();

  const userId = parseInt(localStorage.getItem('userId') || '20');

  const fetchVersions = async (planId) => {
    setVersionsLoading(true);
    try {
      const res = await service.getLPVersions(role, userId, planId);
      setVersions(res.data || []);
      setShowVersionHistory(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load version history', 'warning');
    } finally {
      setVersionsLoading(false);
    }
  };

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

  const roleLabel = 'Director of Libraries';

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

          <button onClick={() => fetchVersions(selectedPlan.id)} className={styles.btnSubmit} style={{ marginBottom: 16, background: '#7c3aed' }}>
            {versionsLoading ? 'Loading...' : 'View Version History'}
          </button>

          {showVersionHistory && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Version History</h3>
                <button onClick={() => setShowVersionHistory(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}>×</button>
              </div>
              {versions.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 14 }}>No version history yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {versions.map(v => (
                    <div key={v.version_no} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                      <div>
                        <strong style={{ fontSize: 14, color: '#334155' }}>v{v.version_no}</strong>
                        <span style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 99, background: '#ede9fe', color: '#6d28d9' }}>{v.trigger_event}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {v.created_at ? new Date(v.created_at).toLocaleDateString() : '-'}
                        {v.creator?.name ? ` — ${v.creator.name}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
