/**
 * ConfirmModal — shared in-app confirmation dialog.
 *
 * Replaces window.confirm() across the module so every page uses the
 * same look and feel. Two variants:
 *
 *   - tone="default"    (neutral, e.g. upload-overwrite warning)
 *   - tone="destructive"(red, e.g. delete / log out)
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2 } from 'react-feather';

const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  busyLabel    = 'Working…',
  tone         = 'default',
  icon,
  busy         = false,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = React.useRef(null);
  const [focused, setFocused] = React.useState(null);

  React.useEffect(() => {
    if (open && cancelRef.current) cancelRef.current.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy && onCancel) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const destructive = tone === 'destructive';
  const accent      = destructive ? '#B91C1C' : '#18191A';
  const accentBg    = destructive ? '#FEE2E2' : '#E5E7EB';
  const Icon        = icon || (destructive ? Trash2 : AlertTriangle);

  const buttonBase = {
    flex: 1, height: 40, padding: '0 16px', boxSizing: 'border-box',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 500, lineHeight: 1,
    outline: 'none', transition: 'box-shadow 0.15s ease',
  };
  const focusRing = '0 0 0 3px ' + (destructive ? 'rgba(185,28,28,0.25)' : 'rgba(24,25,26,0.2)');

  const modalContent = (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000 }}
        onClick={() => !busy && onCancel && onCancel()}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 440, maxWidth: 'calc(100vw - 32px)', padding: 24, background: '#FFFFFF', borderRadius: 12,
          display: 'flex', flexDirection: 'column', gap: 16, zIndex: 3001,
          boxShadow: '0 18px 40px rgba(0,0,0,0.2)', boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22, background: accentBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={22} color={accent} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#18191A' }}>{title}</div>
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: '1.5' }}>{message}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          {cancelLabel ? (
            <button
              ref={cancelRef}
              type="button"
              disabled={busy}
              onClick={onCancel}
              style={{
                ...buttonBase, background: '#FFFFFF', border: '1px solid #D1D5DB', color: '#18191A',
                cursor: busy ? 'not-allowed' : 'pointer',
                boxShadow: 'none',
                outline: 'none',
              }}
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            onFocus={() => setFocused('confirm')}
            onBlur={() => setFocused(null)}
            style={{
              ...buttonBase,
              background: destructive ? '#B91C1C' : '#18191A',
              border: '1px solid ' + (destructive ? '#B91C1C' : '#18191A'), color: '#FFFFFF',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
              boxShadow: focused === 'confirm' ? focusRing : 'none',
            }}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default ConfirmModal;
