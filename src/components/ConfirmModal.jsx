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
 * The component renders nothing when `open` is false, so it can be
 * mounted unconditionally next to the page content.
 */
import React from 'react';
import { AlertTriangle, Trash2 } from 'react-feather';

const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  tone         = 'default',
  busy         = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const destructive = tone === 'destructive';
  const accent      = destructive ? '#B91C1C' : '#18191A';
  const accentBg    = destructive ? '#FEE2E2' : '#E5E7EB';
  const Icon        = destructive ? Trash2 : AlertTriangle;

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
            disabled={busy}
            onClick={onCancel}
            style={{
              flex: 1, height: 40, background: '#FFFFFF', border: '1px solid #18191A',
              borderRadius: 8, color: '#18191A', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>
          <button
            disabled={busy}
            onClick={onConfirm}
            style={{
              flex: 1, height: 40,
              background: destructive ? '#B91C1C' : '#18191A',
              border: 'none', borderRadius: 8, color: '#FFFFFF',
              cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 500,
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmModal;
