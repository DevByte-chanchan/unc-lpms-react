/**
 * FacultyDetailModal — Faculty "View" details. Loads the full row
 * via GET /api/faculty/:id (which includes the long `about` bio AND
 * the resolved Department association so the modal can show the
 * department's Dean alongside Role + Department).
 *
 * Sections shown:
 *   Personal Info     — Sex, Birthdate
 *   Contact Info      — Email, Contact Number
 *   Professional Info — Department, Dean (the department's dean)
 *                       (Role is shown in the header card, not repeated here)
 */
import React from 'react';
import { User, X, Edit2 } from 'react-feather';
import { FacultyAPI } from '../services/api.js';
import styles from '../styles/FacultyDetailModal.module.sass';
import { RecordMeta } from './RecordTimestamps.jsx';

const statusClass = (status) => {
  const s = String(status || '').toLowerCase().replace(/\s+/g, '');
  if (s === 'active') return styles.active;
  if (s === 'onleave') return styles.onleave;
  return styles.inactive;
};

const fmtDate = (d) => {
  if (!d) return '—';
  return String(d).slice(0, 10);
};

const FacultyDetailModal = ({ facultyId, onClose, fallback = null, onEdit, canEdit = true }) => {
  const [data, setData]       = React.useState(fallback);
  const [loading, setLoading] = React.useState(!fallback);
  const [error, setError]     = React.useState(null);

  React.useEffect(() => {
    if (!facultyId) return;
    let cancelled = false;
    setLoading(true);
    FacultyAPI.get(facultyId)
      .then((row) => { if (!cancelled) { setData(row); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [facultyId]);

  const deanName       = (data && data.departmentRef && data.departmentRef.dean) || '—';
  const departmentName = (data && data.department) || (data && data.departmentRef && data.departmentRef.name) || '—';

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.avatar}>
              <User size={56} color="#9CA3AF" />
            </div>
            <div>
              <div className={styles.name}>{(data && data.name) || (loading ? 'Loading…' : 'Unknown')}</div>
              <div className={styles.role} style={{ marginBottom: 8 }}>{(data && data.role) || ''}</div>
              {data && data.status && (
                <span className={styles.statusPill + ' ' + statusClass(data.status)} style={{ marginBottom: 0 }}>
                  {data.status}
                </span>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close" style={{ padding: 0, lineHeight: 0, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <X size={22} color="#111827" />
          </button>
        </div>

        {error && <div className={styles.error}>Could not load faculty profile: {error}</div>}
        {!error && loading && !data && <div className={styles.loading}>Loading faculty profile…</div>}

        {!error && data && (
          <div className={styles.divider}>
            <RecordMeta record={data} style={{ marginTop: -6, marginBottom: 20 }} />
            <div className={styles.sectionLabel}>Personal Information</div>
            <div className={styles.grid} style={{ marginBottom: 14 }}>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Sex</div>
                <div className={styles.fieldValue}>{data.sex || '—'}</div>
              </div>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Birthdate</div>
                <div className={styles.fieldValue}>{fmtDate(data.birthdate)}</div>
              </div>
            </div>

            <div className={styles.sectionLabel}>Contact Information</div>
            <div className={styles.grid} style={{ marginBottom: 14 }}>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Email Address</div>
                <div className={styles.fieldValue}>{data.email || '—'}</div>
              </div>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Contact Number</div>
                <div className={styles.fieldValue}>{data.contact_number || '—'}</div>
              </div>
            </div>

            <div className={styles.sectionLabel}>Professional Information</div>
            <div className={styles.grid} style={{ marginBottom: 14 }}>
              {/* Role is omitted here — it's already shown in the header
                  card. Department (left) | Supervisor (right) keeps the
                  row a balanced 50/50 split. */}
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Department</div>
                <div className={styles.fieldValue}>{departmentName}</div>
              </div>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Dean</div>
                <div className={styles.fieldValue}>{deanName}</div>
              </div>
            </div>

            {canEdit && onEdit && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, paddingTop: 14, borderTop: '1px solid #E5E7EB' }}>
                <button
                  onClick={() => onEdit(data)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 40, padding: '0 18px', background: '#1F2937',
                    color: '#FFFFFF', border: 'none', borderRadius: 8,
                    cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  <Edit2 size={14} /> Edit
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default FacultyDetailModal;
