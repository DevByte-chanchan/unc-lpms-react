/**
 * ConfirmModal — shared in-app confirmation dialog.
 *
 * Replaces window.confirm() across the module so every page uses the
 * same look and feel. Two variants:
 *
 *   - tone="default"    (neutral, e.g. upload-overwrite warning)
 *   - tone="destructive"(red, e.g. delete)
 *
 * Usage:
 *   <ConfirmModal
 *     open={!!toDelete}
 *     title="Delete department?"
 *     message={'Are you sure you want to remove "' + toDelete.name + '"? This will only remove it from the current period.'}
 *     confirmLabel="Delete"
 *     tone="destructive"
 *     onConfirm={doDelete}
 *     onCancel={() => setToDelete(null)}
 *   />
 *
 * Optional: `icon` (a react-feather component) replaces the tone's default
 * icon (trash can / warning triangle); `busyLabel` replaces "Working…".
 *
 * The component renders nothing when `open` is false, so it can be
 * mounted unconditionally next to the page content. Cancel is focused when
 * it opens (so a stray Enter doesn't confirm) and Escape cancels.
 */
import React from 'react';
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

  // Explicit box so the global `button` rule in index.css (0.6em 1.2em padding,
  // purple hover border, 4px focus outline) doesn't leak in. A soft ring
  // replaces the outline, since Cancel is focused as soon as the dialog opens.
  const buttonBase = {
    flex: 1, height: 40, padding: '0 16px', boxSizing: 'border-box',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 500, lineHeight: 1,
    outline: 'none', transition: 'box-shadow 0.15s ease',
  };
  const focusRing = '0 0 0 3px ' + (destructive ? 'rgba(185,28,28,0.25)' : 'rgba(24,25,26,0.2)');

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60 }}
        onClick={() => !busy && onCancel && onCancel()}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 440, padding: 24, background: '#FFFFFF', borderRadius: 12,
          display: 'flex', flexDirection: 'column', gap: 16, zIndex: 61,
          boxShadow: '0 18px 40px rgba(0,0,0,0.2)',
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
          <button
            ref={cancelRef}
            disabled={busy}
            onClick={onCancel}
            onFocus={() => setFocused('cancel')}
            onBlur={() => setFocused(null)}
            style={{
              ...buttonBase, background: '#FFFFFF', border: '1px solid #18191A', color: '#18191A',
              cursor: busy ? 'not-allowed' : 'pointer',
              boxShadow: focused === 'cancel' ? focusRing : 'none',
            }}
          >
            {cancelLabel}
          </button>
          <button
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
};

export default ConfirmModal;
