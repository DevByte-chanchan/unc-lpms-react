import React, { useState, useEffect } from 'react';
import { X, Maximize, Minimize2 } from 'react-feather';
import ReferenceFields from './ReferenceFields.jsx';
import { useReferenceForm } from './useReferenceForm.js';
import styles from '../styles/AddReferenceModal.module.sass';

// Add / edit one reference in a dialog. The fields come from the server's type definitions and the
// save goes to the server (Director of Libraries only). `refToEdit` is a library record.
const AddReferenceModal = ({ show, onClose, refToEdit = null, onSaved, onError }) => {
  const isEditMode = !!refToEdit;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const form = useReferenceForm(refToEdit, show);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (isFullscreen) setIsFullscreen(false);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, isFullscreen, onClose]);

  if (!show) return null;

  const handleSave = async () => {
    const result = await form.save();
    if (!result.ok) {
      onError?.({ message: result.message, type: 'error' });
      return;
    }
    onSaved?.({ message: isEditMode ? 'Reference updated successfully!' : 'Reference added successfully!', type: 'success' });
    onClose();
  };

  const toggleFullscreen = () => setIsFullscreen(f => !f);

  const headerBtn = {
    width: 32, height: 32, borderRadius: 7, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, lineHeight: 0,
  };

  return (
    <>
      {!isFullscreen && (
        <div onClick={onClose} className={styles.backdrop} />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-dialog-title"
        className={`${styles.modal} ${isFullscreen ? styles.fullscreen : ''}`}
        onClick={event => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="reference-dialog-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
            {isEditMode ? 'Edit Reference' : 'Reference Details'}
          </h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button type="button" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              style={{ ...headerBtn, background: '#fff', border: '1px solid #d1d5db' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
              {isFullscreen ? <Minimize2 size={16} color="#6b7280" /> : <Maximize size={16} color="#6b7280" />}
            </button>
            <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close">
              <X size={16} strokeWidth={2.5} color="currentColor" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {form.typesError && <div role="alert" style={{ color: '#b91c1c' }}>{form.typesError}</div>}
          {form.typesReady && (
            <ReferenceFields value={form.values} errors={form.errors} onChange={form.change} fieldStyle={{ padding: 0 }} gap={16} />
          )}
        </div>

        <div className={styles.actions}>
          <button onClick={onClose} style={{ padding: '10px 24px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={form.saving || !form.typesReady} style={{ padding: '10px 24px', border: 'none', borderRadius: 10, background: '#1f2937', color: '#fff', fontSize: 14, fontWeight: 600, cursor: form.saving ? 'wait' : 'pointer', fontFamily: "'Poppins', sans-serif" }}>
            {form.saving ? 'Saving…' : (isEditMode ? 'Update' : 'Save')}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddReferenceModal;
