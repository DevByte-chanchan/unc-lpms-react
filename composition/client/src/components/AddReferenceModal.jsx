import React, { useState, useEffect } from 'react';
import { X, Maximize, Minimize2 } from 'react-feather';
import ReferenceFields from './ReferenceFields.jsx';
import { useReferenceForm } from './useReferenceForm.js';
import styles from '../styles/AddReferenceModal.module.sass';

// Add / edit one reference in a dialog. The fields come from the server's type definitions and the
// save goes to the server (Director of Libraries only). `refToEdit` is a library record.
const AddReferenceModal = ({ show, onClose, refToEdit = null, onSaved }) => {
  const isEditMode = !!refToEdit;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const form = useReferenceForm(refToEdit, show);
  useEffect(() => { if (!show) setSaveError(''); }, [show]);

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
    setSaveError('');
    const result = await form.save();
    if (!result.ok) {
      setSaveError(result.message); // stays in the dialog until the next try
      return;
    }
    onSaved?.({ message: isEditMode ? 'Reference updated successfully!' : 'Reference added successfully!', type: 'success' });
    onClose();
  };

  const toggleFullscreen = () => setIsFullscreen(f => !f);

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
        <div className="app-window-header">
          <h2 id="reference-dialog-title" className="app-window-title">
            {isEditMode ? 'Edit Reference' : 'Reference Details'}
          </h2>
          <div className="app-window-actions">
            <button type="button" className="app-icon-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
            </button>
            <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close">
              <X size={16} strokeWidth={2.5} color="currentColor" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {form.typesError && <div role="alert" style={{ color: '#b91c1c' }}>{form.typesError}</div>}
          {form.typesReady && (
            <ReferenceFields value={form.values} errors={form.errors} onChange={form.change} gap={16} />
          )}
        </div>

        {saveError && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 20px 0' }}>{saveError}</div>}
        <div className={styles.actions}>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={form.saving || !form.typesReady} className="btn btn-primary">
            {form.saving ? 'Saving…' : (isEditMode ? 'Update' : 'Save')}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddReferenceModal;
