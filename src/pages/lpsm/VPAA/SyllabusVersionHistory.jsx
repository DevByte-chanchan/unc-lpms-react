import React, { useState, useEffect } from 'react';
import * as syllabusService from '../../../services/syllabusService';

const EVENT_LABELS = {
  submitted: 'Submitted',
  approved: 'Approved',
  returned: 'Returned'
};

const EVENT_COLORS = {
  submitted: '#3498db',
  approved: '#27ae60',
  returned: '#e74c3c'
};

const SyllabusVersionHistory = ({ courseCode, role, userId, onClose }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await syllabusService.getSyllabusVersions(role, userId, courseCode);
        setVersions(res.data || []);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [courseCode, role, userId]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 32,
        minWidth: 500, maxWidth: 600, maxHeight: '80vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#2c3e50' }}>Version History</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7f8c8d' }}>{courseCode}</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, border: 'none', borderRadius: 8,
            background: '#f3f4f6', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6b7280'
          }}>✕</button>
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Loading...</p>}
        {error && <p style={{ color: '#e74c3c' }}>{error}</p>}

        {!loading && !error && versions.length === 0 && (
          <p style={{ textAlign: 'center', color: '#7f8c8d', padding: 40 }}>
            No version history yet.
          </p>
        )}

        {!loading && versions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {versions.map((v, i) => (
              <div key={v.version_no} style={{
                display: 'flex', gap: 16, padding: 16,
                background: '#f8f9fa', borderRadius: 8,
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                  background: (EVENT_COLORS[v.trigger_event] || '#95a5a6') + '20',
                  color: EVENT_COLORS[v.trigger_event] || '#95a5a6'
                }}>
                  {v.trigger_event === 'submitted' ? '📤' : v.trigger_event === 'approved' ? '✅' : '⚠️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 14, color: '#2c3e50' }}>
                      Version {v.version_no}
                    </strong>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px',
                      borderRadius: 99, textTransform: 'uppercase',
                      background: (EVENT_COLORS[v.trigger_event] || '#95a5a6') + '20',
                      color: EVENT_COLORS[v.trigger_event] || '#95a5a6'
                    }}>
                      {EVENT_LABELS[v.trigger_event] || v.trigger_event}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#7f8c8d', marginTop: 4 }}>
                    {new Date(v.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                    {v.creator?.name && <> · by {v.creator.name}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SyllabusVersionHistory;
