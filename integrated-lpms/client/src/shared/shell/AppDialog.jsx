import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { CircleAlert as AlertCircle, TriangleAlert as AlertTriangle, X } from 'lucide-react';
import useDialogFocus from './useDialogFocus.js';
import styles from './DueDateDialog.module.sass';
import Mascot from './Mascot.jsx';

const TONES = {
  error: { Icon: AlertCircle, color: 'var(--danger-solid)' },
  warning: { Icon: AlertTriangle, color: 'var(--warn-solid)' },
};

const AppDialog = ({ title, message, confirmLabel, cancelLabel, danger, tone, onDone }) => {
  const mark = TONES[tone];
  const windowRef = useRef(null);
  useDialogFocus(windowRef, true);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onDone(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <>
      <div role="presentation" className={styles.backdrop} style={{ zIndex: 3500 }} onClick={() => onDone(false)} />
      <div ref={windowRef} role="alertdialog" aria-modal="true" aria-label={title} className={styles.window} style={{ zIndex: 3501 }}>
        <div className="app-window-header">
          <h2 className="app-window-title" style={mark ? { display: 'flex', alignItems: 'center', gap: 8 } : undefined}>
            {mark && <mark.Icon size={20} color={mark.color} aria-hidden="true" />}
            {title}
          </h2>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={() => onDone(false)}>
            <X size={16} strokeWidth={2} color="currentColor" />
          </button>
        </div>
        <div className={styles.body}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Mascot pose={tone === 'error' ? 'worried' : 'thinking'} size={56} />
            <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
              {message}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {cancelLabel && (
              <button type="button" className="btn btn-secondary" onClick={() => onDone(false)}>
                {cancelLabel}
              </button>
            )}
            <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => onDone(true)}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const open = (props) =>
  new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const onDone = (answer) => {
      root.unmount();
      host.remove();
      resolve(answer);
    };
    root.render(<AppDialog {...props} onDone={onDone} />);
  });

export const confirmDialog = (
  message,
  { title = 'Are you sure?', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}
) => open({ title, message, confirmLabel, cancelLabel, danger, tone: danger ? 'warning' : undefined });

export const confirmDiscard = async (dirty, message = 'What you entered in this window will be lost.') =>
  !dirty || confirmDialog(message, { title: 'Discard changes?', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true });

export const alertDialog = (message, { title = 'Something went wrong' } = {}) =>
  open({ title, message, confirmLabel: 'OK', cancelLabel: null, danger: false, tone: 'error' });

export default AppDialog;
