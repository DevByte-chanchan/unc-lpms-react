import React, { useState } from 'react';
import { X } from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import styles from '../styles/TitleRequests.module.sass';

// The Director of Libraries' title requests (approver plan 4.4): what instructors asked for that the library does not
// have. "Add to library" opens the Add Reference window filled with the title; saving it answers the request. "Decline"
// asks for a reason, which the instructor is shown. Answered requests are listed below, newest first.
//   requests: from GET /api/title-requests; onAdd(request); onDecline(request, reason) resolves true when sent
const day = (at) => (at ? new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const TitleRequestsPanel = ({ open, onClose, requests = [], onAdd, onDecline }) => {
  const [declining, setDeclining] = useState(null); // request id whose reason box is open
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  if (!open) return null;
  const pending = requests.filter(r => r.status === 'pending');
  const answered = requests.filter(r => r.status !== 'pending');

  const sendDecline = async (request) => {
    setSending(true);
    const ok = await onDecline(request, reason);
    setSending(false);
    if (ok) { setDeclining(null); setReason(''); }
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.window} role="dialog" aria-modal="true" aria-labelledby="title-requests-heading" onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <h2 id="title-requests-heading">Title requests</h2>
          <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className={styles.body}>
          {pending.length === 0 ? <EmptyState title="No open requests" hint="An instructor's request for a missing title appears here." /> : (
            <ul className={styles.list}>
              {pending.map(request => (
                <li key={request.id} className={styles.item}>
                  <strong>{request.title}</strong>
                  {request.authors && <span className={styles.meta}>{request.authors}</span>}
                  <span className={styles.meta}>{[request.requestedBy, request.courseCode, day(request.createdAt)].filter(Boolean).join(' · ')}</span>
                  {request.note && <p className={styles.note}>{request.note}</p>}
                  {declining === request.id ? (
                    <div className={styles.decline}>
                      <label htmlFor={`reason-${request.id}`}>Why not? The instructor sees this.</label>
                      <textarea id={`reason-${request.id}`} className="app-input" rows={2} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
                      <div className={styles.actions}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDeclining(null); setReason(''); }}>Cancel</button>
                        <button type="button" className="btn btn-primary btn-sm" disabled={sending || reason.trim().length < 5} onClick={() => sendDecline(request)}>Send</button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.actions}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDeclining(request.id); setReason(''); }}>Decline</button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => onAdd(request)}>Add to library</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {answered.length > 0 && (
            <details className={styles.answered}>
              <summary>Answered ({answered.length})</summary>
              <ul className={styles.list}>
                {answered.map(request => (
                  <li key={request.id} className={styles.item}>
                    <strong>{request.title}</strong>
                    <span className={styles.meta}>
                      {request.status === 'added' ? `Added${request.referenceTitle ? `: ${request.referenceTitle}` : ''}` : `Declined: ${request.reason}`}
                      {request.decidedAt ? ` · ${day(request.decidedAt)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default TitleRequestsPanel;
