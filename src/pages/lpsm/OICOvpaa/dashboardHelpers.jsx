import { FileText } from 'react-feather';

export const StatusBadge = ({ stage }) => {
  const map = {
    submitted: { bg: '#fef5e7', color: '#f39c12', label: 'Draft' },
    parallel_review: { bg: '#ebf5fb', color: '#3498db', label: 'Under Review' },
    program_head: { bg: '#fef5e7', color: '#e67e22', label: 'Program Head' },
    dean: { bg: '#fadbd8', color: '#e74c3c', label: 'Dean Review' },
    approved: { bg: '#ecfdf5', color: '#047857', label: 'Approved' },
    returned: { bg: '#fef2f2', color: '#dc2626', label: 'Returned' }
  };
  const c = map[stage] || { bg: '#f8f9fa', color: '#95a5a6', label: stage };
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
};

export const DeanEmptyState = ({ icon: Icon = FileText, title, description }) => (
  <div style={{
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 16, padding: '80px 20px'
  }}>
    <div style={{ width: 100, height: 100, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={48} color="#9CA3AF" />
    </div>
    <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{title}</div>
    <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420, fontSize: 14, lineHeight: '1.5' }}>{description}</div>
  </div>
);

export const ActionButton = ({ children, color = '#3498db', onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      padding: '5px 14px', background: 'transparent', color,
      border: `1px solid ${color}`, borderRadius: 4, fontSize: 11,
      fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
      whiteSpace: 'nowrap', transition: 'all 0.15s'
    }}
  >
    {children}
  </button>
);

export const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch { return '—'; }
};

export const WORKFLOW_KEY = 'lpsm_workflow_v1';

export const readWorkflows = () => {
  try {
    const raw = localStorage.getItem(WORKFLOW_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

export const getApprovalComments = (courseCode) => {
  try {
    const raw = localStorage.getItem('approval_comments_v1');
    const all = raw ? JSON.parse(raw) : [];
    return Array.isArray(all) ? all.filter(c => c.courseCode === courseCode) : [];
  } catch { return []; }
};

export const ACTIVITY_KEY = 'lpsm_audit_activity_v1';

export const getRecentActivity = (limit = 20) => {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return Array.isArray(all) ? all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit) : [];
  } catch { return []; }
};
