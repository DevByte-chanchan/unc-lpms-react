import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from '../../../styles/ApprovalPanel.module.scss';
import StatusTracker from '../Shared/StatusTracker';
import * as service from '../../../services/learningPlanService';
import { useToast } from '../../../components/Toast';

const ApprovalPanel = () => {
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
  const [showMyComments, setShowMyComments] = useState(false);
  const [myComments, setMyComments] = useState([]);
  const [myCommentsLoading, setMyCommentsLoading] = useState(false);
  const showToast = useToast();

  const userId = parseInt(localStorage.getItem('userId') || '10');

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

  const fetchMyComments = async (planId) => {
    setMyCommentsLoading(true);
    try {
      const res = await service.getMyComments(role, userId, planId);
      setMyComments(res.data || []);
      setShowMyComments(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load comments', 'warning');
    } finally {
      setMyCommentsLoading(false);
    }
  };

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
      showToast(`Learning plan ${action}d successfully`);

      const res = await service.getLearningPlans(role, userId);
      setPlans(res.data.filter(p => p.status === 'under_review' || p.status === 'returned'));
      setSelectedPlan(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      showToast(err.response?.data?.error || 'Failed to process', 'warning');
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

          <button onClick={() => fetchMyComments(selectedPlan.id)} className={styles.btnSubmit} style={{ marginBottom: 16, background: '#059669' }}>
            {myCommentsLoading ? 'Loading...' : 'View My Comments'}
          </button>

          {showMyComments && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>My Comments</h3>
                <button onClick={() => setShowMyComments(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}>×</button>
              </div>
              {myComments.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 14 }}>No comments submitted yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {myComments.map(c => (
                    <div key={c.id} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: '#d1fae5', color: '#065f46' }}>{c.from_role.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{c.created_at ? new Date(c.created_at).toLocaleString() : '-'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap' }}>{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmitApproval} className={styles.section}>
            <h2>Approval Decision</h2>

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
                  placeholder="Enter feedback..."
                  rows="6"
                  required={action === 'return'}
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
