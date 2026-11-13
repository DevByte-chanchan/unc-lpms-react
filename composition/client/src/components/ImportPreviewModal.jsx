import React from 'react';
import { apiErrorMessage } from '../utils/api.js';
import { importReferences } from '../utils/referenceStore.js';

// Preview, then import, a batch of references (a CSV file, or the references saved on this browser
// by the old build). The server checks every row against the type rules and reports, row by row,
// what is valid, a duplicate (same title and authors already in the library) or invalid and why.
// Nothing is written until "Import" is pressed, and only the valid rows are imported.
//
// props: source { title, rows }  (rows are { type, title, authors, isbn, year, link, publisher })
//        onClose(), onImported(result)  — result is the server's import response
const STATUS_LABEL = { invalid: 'Invalid', duplicate: 'Already in library', ok: 'Ready', created: 'Imported' };

const ImportPreviewModal = ({ source, onClose, onImported }) => {
  const [preview, setPreview] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    importReferences(source.rows, { dryRun: true })
      .then(data => { if (live) setPreview(data); })
      .catch(err => { if (live) setError(apiErrorMessage(err, 'The file could not be checked.')); });
    return () => { live = false; };
  }, [source]);

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
  const problems = (shown?.rows || []).filter(row => row.status === 'invalid' || row.status === 'duplicate');
  const cell = { padding: '4px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: 13, verticalAlign: 'top' };

  return (
    <div role="dialog" aria-modal="true" aria-label={source.title}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, width: 'min(680px, 94vw)', maxHeight: '86vh', overflow: 'auto', padding: 24 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>{source.title}</h2>

        {error && <div role="alert" style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</div>}
        {!shown && !error && <p>Checking {source.rows.length} row(s)…</p>}

        {shown && (
          <>
            <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
              {result ? (
                <>
                  <Stat label="Imported" value={result.created} color="var(--good)" />
                  <Stat label="Skipped" value={result.total - result.created} color="#b45309" />
                </>
              ) : (
                <>
                  <Stat label="Ready to import" value={preview.valid} color="var(--good)" />
                  <Stat label="Already in library" value={preview.duplicates} color="#6b7280" />
                  <Stat label="Invalid" value={preview.invalid} color="var(--danger)" />
                </>
              )}
              <Stat label="Rows" value={shown.total} color="#111827" />
            </div>

            {problems.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                <thead><tr><th style={cell}>Row</th><th style={cell}>Result</th><th style={cell}>Why</th></tr></thead>
                <tbody>
                  {problems.map(row => (
                    <tr key={row.row}>
                      <td style={cell}>{row.row}</td>
                      <td style={cell}>{STATUS_LABEL[row.status]}</td>
                      <td style={cell}>{row.errors ? Object.values(row.errors).join(' ') : (row.reason === 'isbn' ? 'Same ISBN as an existing reference.' : 'Same title and authors as an existing reference.')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {result && result.invalid > 0 && <p style={{ color: '#6b7280', fontSize: 13 }}>Fix the invalid rows and import again. Duplicates are skipped.</p>}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
          {/* The app's own buttons: an inline-styled one took the global button colors (white text on white). */}
          <button type="button" className="btn btn-secondary" onClick={onClose}>{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button type="button" className="btn btn-primary" onClick={commit} disabled={busy || !preview || preview.valid === 0}>
              {busy ? 'Importing…' : !preview ? 'Checking…' : preview.valid === 0 ? 'Nothing to import' : `Import ${preview.valid} valid row${preview.valid === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, color }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
  </div>
);

export default ImportPreviewModal;
