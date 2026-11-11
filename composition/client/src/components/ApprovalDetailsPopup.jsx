import { X } from 'react-feather'
import styles from '../styles/CoursesTable.module.sass'

// "View details" of a plan's approval, opened by the ? in a course row (the instructor's list and the approvers'):
// when it was submitted, and each approver's state with its date.
// data: { submittedAt: latestSubmissionAt(row), approverStatuses: buildApproverStatus(row) } (utils/assignmentStatus.js)

const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';

    const datePart = d.toISOString().split('T')[0]; // YYYY-MM-DD

    // Manually construct 12-hour time to avoid browser locale inconsistencies
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // convert hour '0' to '12'

    const timePart = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    return `${datePart} ${timePart}`; // Outputs: YYYY-MM-DD HH:MM AM/PM
};

const ApprovalDetailsPopup = ({ data, onClose }) => {
    if (!data) return null;
    const { submittedAt, approverStatuses } = data;
    return (
        <div className={styles.detailsPopup} style={{
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 6,
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            padding: 12
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong>View details</strong>
                <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close details">
                    <X size={16} strokeWidth={2.5} color="currentColor" />
                </button>
            </div>

            <div style={{ fontSize: 13, marginBottom: 10 }}>
                <div style={{ color: '#666', marginBottom: 8 }}>
                    <strong>Submitted at:</strong> {formatDateTime(submittedAt)}
                </div>

                {approverStatuses.map((a, idx) => (
                    <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ fontWeight: 600 }}>{a.title}</div>
                        <div style={{ fontSize: 13, color: '#333' }}>
                            {a.status === 'Accepted' && <div>Accepted at: {formatDateTime(a.acceptedAt)}</div>}
                            {a.status === 'Returned' && (
                                <>
                                    <div>Returned at: {formatDateTime(a.returnedAt)}</div>
                                    {a.updatedAt && <div>Updated at: {formatDateTime(a.updatedAt)}</div>}
                                </>
                            )}
                            {a.status === 'Pending' && <div>Pending</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ApprovalDetailsPopup
