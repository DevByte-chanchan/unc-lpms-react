import React from 'react';
import { createPortal } from 'react-dom';
import { X, Upload } from 'react-feather';
import { apiErrorMessage } from '../utils/api.js';
import { importReferences } from '../utils/referenceStore.js';
import useDialogFocus from '../utils/useDialogFocus.js';
import styles from '../styles/DueDateDialog.module.sass';

// Preview, then import, a batch of references (a CSV file, or the references saved on this browser
// by the old build). The server checks every row against the type rules and reports, row by row,
// what is valid, a duplicate (same title and authors already in the library) or invalid and why.
// Nothing is written until "Import" is pressed, and only the valid rows are imported.
// Laid out like the app's other windows (DueDateDialog styles): header with close, body, footer buttons.
//
// props: source { title, rows }  (rows are { type, title, authors, isbn, year, link, publisher })
//        onClose(), onImported(result)  — result is the server's import response
const STATUS = {
  invalid: { label: 'Invalid', color: 'var(--danger)', bg: 'rgba(220, 38, 38, 0.08)' },
  duplicate: { label: 'Already in library', color: '#4B5563', bg: '#F3F4F6' },
};

const ImportPreviewModal = ({ source, onClose, onImported }) => {
  const [preview, setPreview] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const windowRef = React.useRef(null);
  useDialogFocus(windowRef, true);

  React.useEffect(() => {
    let live = true;
    importReferences(source.rows, { dryRun: true })
      .then(data => { if (live) setPreview(data); })
      .catch(err => { if (live) setError(apiErrorMessage(err, 'The file could not be checked.')); });
    return () => { live = false; };
  }, [source]);

  React.useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const commit = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await importReferences(source.rows);
      setResult(data);
      onImported?.(data);
    } catch (err) {
      setError(apiErrorMessage(err, 'The import failed.'));
    } finally {
      setBusy(false);
    }
  };

  const shown = result || preview;
  const problems = (shown?.rows || []).filter(row => STATUS[row.status]);
  const th = { padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', background: '#F9FAFB', borderBottom: '1px solid var(--line, #e5e7eb)' };
  const td = { padding: '8px 10px', textAlign: 'left', fontSize: 13, verticalAlign: 'top', borderBottom: '1px solid var(--line, #e5e7eb)' };
  const sub = result
    ? `${result.created} of ${result.total} row${result.total === 1 ? '' : 's'} imported.`
    : preview ? 'Checked against the library. Nothing is saved until you import.' : `Checking ${source.rows.length} row${source.rows.length === 1 ? '' : 's'}…`;

  return createPortal(
    <>
      <div role="presentation" className={styles.backdrop} onClick={() => !busy && onClose()} />
      <div ref={windowRef} role="dialog" aria-modal="true" aria-label={source.title} className={styles.window} style={{ width: 'min(680px, calc(100vw - 24px))' }}>
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">{source.title}</h2>
            <div className={styles.sub}>{sub}</div>
          </div>
          <button type="button" className="app-icon-close" aria-label="Close" onClick={onClose} disabled={busy}><X size={16} strokeWidth={2.5} color="currentColor" /></button>
        </div>

        <div className={styles.body}>
          {error && <div role="alert" className={styles.error}>{error}</div>}

          {shown && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${result ? 3 : 4}, minmax(0, 1fr))`, gap: 10 }}>
              {result ? (
                <>
                  <Stat label="Imported" value={result.created} color="var(--good)" />
                  <Stat label="Skipped" value={result.total - result.created} color="#B45309" />
                </>
              ) : (
                <>
                  <Stat label="Ready to import" value={preview.valid} color="var(--good)" />
                  <Stat label="Already in library" value={preview.duplicates} color="#4B5563" />
                  <Stat label="Invalid" value={preview.invalid} color="var(--danger)" />
                </>
              )}
              <Stat label="Rows" value={shown.total} color="var(--ink)" />
            </div>
          )}

          {problems.length > 0 && (
            <div style={{ border: '1px solid var(--line, #e5e7eb)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={{ ...th, width: 56 }}>Row</th><th style={{ ...th, width: 150 }}>Result</th><th style={th}>Why</th></tr></thead>
                <tbody>
                  {problems.map(row => (
                    <tr key={row.row}>
                      <td style={td}>{row.row}</td>
                      <td style={td}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 600, color: STATUS[row.status].color, background: STATUS[row.status].bg, whiteSpace: 'nowrap' }}>
                          {STATUS[row.status].label}
                        </span>
                      </td>
                      <td style={td}>{row.errors ? Object.values(row.errors).join(' ') : (row.reason === 'isbn' ? 'Same ISBN as an existing reference.' : 'Same title and authors as an existing reference.')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {shown && problems.length === 0 && !result && <div className={styles.hint}>Every row is valid and new to the library.</div>}
          {result && result.invalid > 0 && <div className={styles.hint}>Fix the invalid rows and import again. Duplicates are skipped.</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{result ? 'Close' : 'Cancel'}</button>
            {!result && (
              <button type="button" className="btn btn-primary" onClick={commit} disabled={busy || !preview || preview.valid === 0}>
                <Upload size={15} /> {busy ? 'Importing…' : !preview ? 'Checking…' : preview.valid === 0 ? 'Nothing to import' : `Import ${preview.valid} valid row${preview.valid === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

const Stat = ({ label, value, color }) => (
  <div style={{ border: '1px solid var(--line, #e5e7eb)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
    <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{label}</div>
  </div>
);

export default ImportPreviewModal;
