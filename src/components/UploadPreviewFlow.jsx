/**
 * UploadPreviewFlow — the two safety steps that wrap every spreadsheet upload.
 *
 *   STATE 1  Preview & Confirm. A large centered dialog showing the filename,
 *            the rows the server parsed, and which of them would fail — BEFORE
 *            anything is written. This is the primary safeguard against a wrong
 *            file, because undo only lasts 30 seconds.
 *   STATE 2  Undo toast. After the commit lands, a 30-second escape hatch wired
 *            to the real, server-backed undo (ImportsAPI.undo).
 *
 * ONE component for all seven upload pages — the per-page differences are just
 * the two functions you hand it:
 *
 *   <UploadPreviewFlow
 *     file={pendingFile}                 // File | null — non-null opens the overlay
 *     entity="faculty"                   // the ImportBatch entity, for undo
 *     periodId={periodId}
 *     title="Upload Faculty List"
 *     preview={(f) => FacultyAPI.uploadPreview(f, periodId)}   // ?preview=1 — writes nothing
 *     commit={(f)  => FacultyAPI.upload(f, periodId)}          // the real upload
 *     // commit also receives the preview payload as a 2nd arg — commit(file, preview).
 *     // Ignore it unless you need it; ProgramHeadCourses uses preview.unassigned
 *     // to open its year-level reconciliation popup before committing.
 *     onBack={() => setShowModal(true)}    // re-pick the file
 *     onCancel={() => setPendingFile(null)}
 *     onCommitted={async (result) => { await refresh(); bumpUploadCount(); }}
 *     onUndone={async () => { await refresh(); setShowModal(true); }}
 *   />
 *
 * WHY THE COUNTDOWN IS NOT A HARDCODED 30
 * The deadline is the server's (UNDO_WINDOW_MS, server/utils/importUndo.js). We
 * read the batch we just created via ImportsAPI.latest and count down from its
 * `ms_remaining`, so the toast and the server's 410 expire together. Move the
 * constant server-side and this UI follows without a change.
 *
 * There is no fallback window after the toast: when it goes, undo is genuinely
 * gone. Nothing here may imply otherwise.
 */
import React from 'react';
import {
  X, Check, AlertCircle, AlertTriangle, ChevronLeft, FileText, CornerUpLeft, Filter,
} from 'react-feather';
import ConfirmModal from './ConfirmModal.jsx';
import DialogShell from './DialogShell.jsx';
import { ImportsAPI } from '../services/api.js';
import { setUndoToastVisible } from '../services/undoToast.js';
import styles from '../styles/UploadPreviewFlow.module.sass';

const cx = (...names) => names.filter(Boolean).join(' ');

// Step 3 is drawn but never active: the overlay closes on commit, so "Complete"
// is a promise of where this ends, not a screen the user sits on.
const Stepper = ({ active }) => {
  const steps = ['Upload', 'Review', 'Complete'];
  return (
    <div className={styles.stepper}>
      {steps.map((label, i) => {
        const done   = i < active;
        const isHere = i === active;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div className={cx(styles.stepBar, done && styles.stepBarDone)} />}
            <div className={styles.step}>
              <div className={cx(
                styles.stepDot,
                done && styles.stepDotDone,
                isHere && styles.stepDotActive,
              )}>
                {done ? <Check size={14} color="#FFFFFF" /> : i + 1}
              </div>
              <span className={cx(styles.stepLabel, (isHere || done) && styles.stepLabelActive)}>
                Step {i + 1} {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

const UploadPreviewFlow = ({
  file,
  entity,
  periodId,
  title = 'Review Import',
  preview,
  commit,
  onBack,
  onCancel,
  onCommitted,
  onUndone,
}) => {
  // ---- State 1: preview ----
  const [data, setData]         = React.useState(null);
  const [loading, setLoading]   = React.useState(false);
  const [error, setError]       = React.useState(null);
  const [committing, setCommitting] = React.useState(false);
  const [onlyErrors, setOnlyErrors] = React.useState(false);
  // Set the moment a commit succeeds, so the overlay can't reappear while the
  // parent is still holding the file it just imported.
  const [committed, setCommitted]   = React.useState(false);
  // The commit landed and this dialog is on its way out, but the page has not
  // been told yet — see finishHandoff. Keeps the backdrop up across the swap.
  const [handingOff, setHandingOff] = React.useState(false);
  // What finishHandoff needs once the exit animation has played out.
  const handoffRef = React.useRef(null);

  // ---- State 2: undo toast ----
  const [toast, setToast]       = React.useState(null);   // { batch, rows }
  const [msLeft, setMsLeft]     = React.useState(0);
  const [asking, setAsking]     = React.useState(false);
  const [undoing, setUndoing]   = React.useState(false);
  const [undoError, setUndoError] = React.useState(null);
  // The undo's own receipt — what it removed, what it put back, and whether the
  // change BEFORE it can still be undone. Replaces the toast once undo runs.
  const [undoDone, setUndoDone] = React.useState(null);

  // Dry-run the file the moment it's picked. Nothing is written; this is the
  // real importer's own parse and validation, not a client-side re-guess.
  React.useEffect(() => {
    const reset = () => {
      setData(null); setError(null); setOnlyErrors(false); setCommitted(false);
      setHandingOff(false); handoffRef.current = null;
    };
    // NOT part of reset(): undoing an upload clears the page's pending file, which
    // lands right here — and wiping the receipt on the way through meant the one
    // message confirming the undo had happened was destroyed the instant it was
    // created. It survives the file going away, and is cleared only when a NEW
    // file arrives and starts a new story.
    if (!file) { reset(); return undefined; }
    let cancelled = false;
    reset();
    setUndoDone(null);
    setLoading(true);
    Promise.resolve()
      .then(() => preview(file))
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not read that file.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // `preview` is redefined on each render by the page; keying on the file is
    // what actually decides when a fresh dry run is due.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Deadline-based, not accumulated ticks: a background tab throttles setInterval,
  // and a countdown that drifted would promise seconds the server won't honour.
  React.useEffect(() => {
    if (!toast || !toast.batch) return undefined;
    const deadline = Date.now() + toast.batch.ms_remaining;
    setMsLeft(toast.batch.ms_remaining);
    const id = setInterval(() => {
      const left = deadline - Date.now();
      if (left <= 0) {
        // The window is genuinely closed — the server would answer 410 now.
        // Take the confirm dialog with it rather than leave a button that lies.
        setToast(null);
        setAsking(false);
        setMsLeft(0);
        return;
      }
      setMsLeft(left);
    }, 250);
    // Covers unmount, dismiss and undo alike — each clears `toast`, which
    // re-runs this effect and disposes the interval.
    return () => clearInterval(id);
  }, [toast]);

  // Hand the countdown to the page's Undo button, or take it back. A toast with
  // no undoable batch shows no timer, so it doesn't own the countdown either.
  React.useEffect(() => {
    setUndoToastVisible(!!toast && !!toast.batch);
  }, [toast]);

  // Unmounting takes the toast with it — release the countdown so the button
  // doesn't stay silent waiting on a toast that no longer exists.
  React.useEffect(() => () => setUndoToastVisible(false), []);

  const doCommit = async () => {
    setCommitting(true); setError(null);
    try {
      // The preview payload goes with it. Most pages ignore the second argument;
      // ProgramHeadCourses needs it, because the year-level popup it must open
      // before committing is driven by this very dry run's `unassigned` rows —
      // and re-fetching the preview to get them would parse the workbook twice.
      const result = await commit(file, data);

      // Ask the server which batch that upload just created, and how long it
      // has left. This is the same endpoint the Undo button reads — one undo
      // mechanism, not two — and `ms_remaining` is what the toast counts down.
      let batch = null;
      try {
        const latest = await ImportsAPI.latest(entity, periodId);
        batch = latest && latest.batch ? latest.batch : null;
      } catch {
        // The import succeeded; only its undo handle is missing. Say so in the
        // toast rather than fail an upload that actually landed.
        batch = null;
      }

      // The write is done — but the page's summary must not appear on top of a
      // dialog that is still on screen. Park what the handoff needs and start
      // the exit; finishHandoff picks it up when the animation ends.
      handoffRef.current = {
        result,
        batch,
        rows: (result && countImported(result)) ?? (data ? data.validCount : 0),
      };
      setHandingOff(true);
    } catch (err) {
      setError(err.message || 'Import failed.');
      setCommitting(false);
    }
  };

  // The exit animation has played out: this dialog is invisible but still
  // mounted, and still holding the backdrop. Hand over now — the page mounts its
  // summary in onCommitted, and DialogShell unmounts this one in the same commit,
  // so the dim is continuously held by one dialog or the other and never blinks.
  const finishHandoff = () => {
    const done = handoffRef.current;
    if (!done) return;
    handoffRef.current = null;

    setUndoError(null);
    setToast({ batch: done.batch, rows: done.rows });
    // Deliberately not awaited: every page sets its summary state synchronously
    // here, and awaiting would push the unmount into a later commit — reopening
    // the gap this whole dance exists to close.
    if (onCommitted) onCommitted(done.result);

    setCommitted(true);
    setHandingOff(false);
    setCommitting(false);
  };

  const doUndo = async () => {
    if (!toast || !toast.batch) return;
    setUndoing(true); setUndoError(null);
    try {
      const res = await ImportsAPI.undo(toast.batch.id);
      setToast(null);          // also disposes the countdown interval
      setAsking(false);
      // SAY WHAT THE UNDO DID. It used to just disappear, and because undo is a
      // point-in-time restore rather than a delete, the list it leaves behind can
      // legitimately look identical to the one before it (re-import the same file,
      // then undo). Silence plus an unchanged table reads as "undo is broken" —
      // it wasn't; nothing ever told the user it had run.
      setUndoDone(res || {});
      if (onUndone) await onUndone();
    } catch (err) {
      // Includes the server's 410 if the window closed mid-dialog.
      setUndoError(err.message || 'Undo failed.');
    } finally {
      setUndoing(false);
    }
  };

  // Memoized because the column widths below are measured FROM these: rebuilt on
  // every render, they'd hand the measuring pass a new array each time and it
  // would re-measure the whole sheet on every keystroke and every countdown tick.
  const rows = React.useMemo(
    () => ((data && Array.isArray(data.rows)) ? data.rows : []),
    [data],
  );
  const columns = React.useMemo(
    () => (rows.length > 0 ? Object.keys(rows[0].cells || {}) : []),
    [rows],
  );
  const validCount = data ? data.validCount : 0;
  const errorCount = data ? data.errorCount : 0;
  const shown      = onlyErrors ? rows.filter((r) => r.level === 'error') : rows;
  const canImport  = !!data && validCount > 0 && !committing;
  // The dry run never produced a payload — so THIS is the "we couldn't read your
  // file" case. An error with `data` behind it came from the commit instead, and
  // means something quite different.
  const parseFailed = !!error && !data;

  // Open until the commit lands. `handingOff` closes the shell — which is what
  // starts the exit animation — while `committed` (set at the END of that exit)
  // is what keeps it from ever coming back.
  const showOverlay = !!file && !committed && !handingOff;

  // The panel outlives `file` by one exit animation: Cancel nulls it in the
  // parent while the dialog is still fading. Render the file it was reviewing,
  // or the last frames would blow up dereferencing null.
  const lastFileRef = React.useRef(null);
  if (file) lastFileRef.current = file;
  const shownFile = file || lastFileRef.current;
  const secondsLeft = Math.ceil(msLeft / 1000);

  // Escape cancels. The backdrop deliberately does not — a stray click on the
  // dimmed area must not discard a file the user is part-way through reviewing,
  // which is why no onBackdropClick is handed to DialogShell below.
  React.useEffect(() => {
    if (!showOverlay) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !committing && onCancel) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showOverlay, committing, onCancel]);

  // THE GRID. Row and Issue are fixed; every other column is sized to what is
  // actually in it.
  //
  // Splitting the leftover width EQUALLY between the data columns was the old
  // rule, and it fails as soon as the columns aren't alike: "Credit" and "CMO"
  // were handed the same width as "Course Title", so the short ones sat in a sea
  // of dead space while "Contact Hours" and "Classification" were clipped to
  // "Contact Ho…" — half the table truncated and half of it empty.
  //
  // So each column asks for whichever is wider — its longest VALUE, or its HEADER
  // — clamped so one 80-character title cannot eat the table and a one-character
  // column is still readable.
  //
  // The width is MEASURED, not estimated from a character count. Two rounds of
  // per-character guesswork clipped two different columns, and it was never going
  // to hold: the header is semibold and the cells are not, and "SECOND YEAR" in
  // caps is far wider than eleven average glyphs. Canvas measureText answers the
  // question exactly, in the page's own font, for the price of one offscreen
  // context.
  const ROW_W    = 72;
  const ISSUE_W  = 260;
  const MIN_COL  = 96;
  const MAX_COL  = 280;
  const CELL_PAD = 34;    // 16px padding either side, + 2px of slack

  const measureText = React.useMemo(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    const family = window.getComputedStyle(document.body).fontFamily || 'sans-serif';
    return (text, weight) => {
      if (!ctx) return String(text || '').length * 8;   // no canvas: fall back
      ctx.font = weight + ' 14px ' + family;            // matches .table th/td
      return ctx.measureText(String(text === null || text === undefined ? '' : text)).width;
    };
  }, []);

  const colWidths = React.useMemo(() => columns.map((c) => {
    let widest = measureText(c, '600');                 // the header — never truncate it
    for (const r of rows) {
      const w = measureText(r.cells ? r.cells[c] : '', '400');
      if (w > widest) widest = w;
    }
    return Math.round(Math.min(MAX_COL, Math.max(MIN_COL, widest + CELL_PAD)));
  }), [columns, rows, measureText]);

  // Narrower than the panel → `width: 100%` and fixed layout stretch the columns
  // proportionally to fill it, so a 3-column sheet doesn't huddle on the left.
  // Wider → the wrapper scrolls sideways rather than squeezing everything.
  const minTableWidth = ROW_W + ISSUE_W + colWidths.reduce((a, b) => a + b, 0);

  return (
    <>
      <DialogShell
        open={showOverlay}
        // Hold the dim through the exit ONLY on the way to the page's summary.
        // A plain cancel releases it as the panel starts leaving, so dialog and
        // dim fade out together.
        holdBackdrop={handingOff}
        onExited={finishHandoff}
        panelClassName={styles.panel}
        ariaLabel={title}
      >
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <h2 className={styles.title}>{title}</h2>
              <button
                className={styles.closeBtn}
                onClick={() => !committing && onCancel && onCancel()}
                disabled={committing}
                aria-label="Cancel import"
              >
                <X size={22} color="#18191A" />
              </button>
            </div>

            <Stepper active={1} />

            {/* The wrong-file cue. Nothing else on this screen matters if this
                line is not the file they meant to upload. */}
            <div className={styles.filename} title={shownFile ? shownFile.name : ''}>
              <FileText size={18} color="#6B7280" />
              <span className={styles.filenameText}>{shownFile ? shownFile.name : ''}</span>
              <span className={styles.filenameHint}>— not the right file? Use Back.</span>
            </div>

            {!loading && !error && data && (
              <div className={styles.summary}>
                <div className={cx(styles.card, styles.cardOk)}>
                  <Check size={20} color="#047857" />
                  <span className={styles.cardCount}>{validCount}</span>
                  <span className={styles.cardText}>
                    {validCount === 1 ? 'row ready to import' : 'rows ready to import'}
                  </span>
                </div>
                <div className={cx(styles.card, styles.cardError)}>
                  <AlertCircle size={20} color="#B91C1C" />
                  <span className={styles.cardCount}>{errorCount}</span>
                  <span className={styles.cardText}>
                    {errorCount === 1 ? 'row with errors' : 'rows with errors'}
                  </span>
                </div>
                <button
                  className={cx(styles.toggle, onlyErrors && styles.toggleOn)}
                  onClick={() => setOnlyErrors((v) => !v)}
                  disabled={errorCount === 0}
                  title={errorCount === 0 ? 'No rows have errors.' : undefined}
                >
                  <Filter size={16} color={onlyErrors ? '#B91C1C' : '#6B7280'} />
                  Show only errors
                </button>
              </div>
            )}
          </div>

          <div className={styles.tableWrap}>
            {loading && <div className={styles.empty}>Reading {shownFile ? shownFile.name : 'file'}…</div>}

            {/* Only a failed DRY RUN means we couldn't read the file. A failed
                COMMIT is a different animal — the file parsed fine, we showed the
                user its rows, and the WRITE was rejected. Blanking the table and
                telling them to check it's a spreadsheet (it plainly is, its rows
                were on screen a second ago) sent people hunting a file problem
                that never existed. The table stays; the footer carries the error. */}
            {!loading && parseFailed && (
              <div className={styles.empty}>
                <div className={styles.reasonError} style={{ justifyContent: 'center', marginBottom: 8 }}>{error}</div>
                Check that the file is a .xlsx, .xls or .csv spreadsheet, then try again.
              </div>
            )}

            {!loading && !parseFailed && !error && rows.length === 0 && (
              <div className={styles.empty}>
                No rows found in this file.
                {data && data.detectedColumns && data.detectedColumns.length > 0 && (
                  <><br />Columns detected: {data.detectedColumns.join(', ')}</>
                )}
              </div>
            )}

            {!loading && !parseFailed && rows.length > 0 && (
              <table className={styles.table} style={{ minWidth: minTableWidth }}>
                {/* The grid every row is held to. Without table-layout: fixed +
                    these widths, each cell sizes to its own content and the
                    columns drift row to row. */}
                <colgroup>
                  <col style={{ width: ROW_W }} />
                  {columns.map((c, i) => <col key={c} style={{ width: colWidths[i] }} />)}
                  <col style={{ width: ISSUE_W }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={styles.rowNum}>Row</th>
                    {columns.map((c) => <th key={c}>{c}</th>)}
                    <th>Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const bad = r.level === 'error';
                    // Which cells the reasons point at — so the failing cell is
                    // visible, not just the row.
                    const flagged = new Set((r.errors || []).map((e) => e.field));
                    return (
                      <tr
                        key={r.rowNum}
                        className={cx(bad && styles.rowError, r.level === 'warning' && styles.rowWarning)}
                      >
                        <td className={styles.rowNum}>{r.rowNum}</td>
                        {columns.map((c) => {
                          const raw   = r.cells[c];
                          const blank = raw === '' || raw === null || raw === undefined;
                          const value = blank ? '' : String(raw);
                          return (
                            <td
                              key={c}
                              className={cx(styles.cell, bad && flagged.has(c) && styles.cellBad)}
                              // Truncation is a display choice, not a data loss —
                              // the whole value is one hover away.
                              title={value || undefined}
                            >
                              {blank ? (flagged.has(c) ? '—' : '') : value}
                            </td>
                          );
                        })}
                        <td
                          className={styles.issue}
                          title={(r.errors || []).map((e) => e.message).join(' ') || undefined}
                        >
                          {(r.errors || []).map((e, i) => (
                            <div
                              key={i}
                              className={cx(styles.reason, bad ? styles.reasonError : styles.reasonWarning)}
                            >
                              {bad
                                ? <AlertCircle size={14} color="#B91C1C" style={{ flexShrink: 0, marginTop: 2 }} />
                                : <AlertTriangle size={14} color="#92400E" style={{ flexShrink: 0, marginTop: 2 }} />}
                              <span>{e.message}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.footer}>
            <button
              className={cx(styles.btn, styles.btnGhost)}
              onClick={() => !committing && onBack && onBack()}
              disabled={committing}
            >
              <ChevronLeft size={18} color="#374151" />
              Back
            </button>

            <div className={styles.footerRight}>
              {error && data && <span className={styles.error}>{error}</span>}
              {!loading && !error && data && errorCount > 0 && validCount > 0 && (
                <span className={styles.error}>
                  {errorCount} {errorCount === 1 ? 'row' : 'rows'} will be skipped.
                </span>
              )}
              <button
                className={cx(styles.btn, styles.btnOutline)}
                onClick={() => !committing && onCancel && onCancel()}
                disabled={committing}
              >
                Cancel
              </button>
              <button
                className={cx(styles.btn, styles.btnPrimary)}
                onClick={doCommit}
                disabled={!canImport}
                title={data && validCount === 0 ? 'There are no importable rows in this file.' : undefined}
              >
                {committing ? 'Importing…' : 'Confirm & Import'}
              </button>
            </div>
          </div>
      </DialogShell>

      {/* THE UNDO RECEIPT. Undo restores the period to the instant before the
          upload — it does not "delete what was imported" — so the list it leaves
          can be identical to the one on screen (import the same file twice, undo
          the second). Reporting the rows it moved is the only way the user can
          tell a working undo from a broken one, and there is no honest way to
          show that in the table itself. */}
      {undoDone && (
        <div className={styles.toast} role="status" aria-live="polite">
          <div className={styles.toastText}>
            {/* Phrased around the FILE, not the label: the labels are a mix of
                singular and plural ("department list", "course assignments"), and
                any sentence agreeing with them reads wrong for half the pages. */}
            <span>
              <strong>Undone.</strong>{' '}
              {undoDone.filename ? '“' + undoDone.filename + '”' : 'That upload'} has been rolled
              back{undoDone.label ? ' — ' + undoDone.label + ' restored to the state before it' : ''}.
            </span>
            <span className={styles.toastSub}>
              {undoDone.summary
                ? undoDone.summary.removed + ' ' + (undoDone.summary.removed === 1 ? 'row' : 'rows')
                  + ' removed · ' + undoDone.summary.restored + ' put back'
                : 'The period was restored.'}
              {/* Each upload is its own restore point, so a double import unwinds
                  one click at a time. Without this line the second click is a
                  step nobody knows to take. */}
              {undoDone.previous && (
                <>
                  {' — the upload before it '}
                  {undoDone.previous.filename ? '(“' + undoDone.previous.filename + '”) ' : ''}
                  can still be undone with the Undo button.
                </>
              )}
            </span>
          </div>

          <div className={styles.toastActions}>
            <button
              className={styles.dismiss}
              onClick={() => setUndoDone(null)}
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <div className={styles.toastText}>
            <span>
              <strong>Success!</strong> {toast.rows} {toast.rows === 1 ? 'row has' : 'rows have'} been
              queued for import.
            </span>
            {!toast.batch && (
              <span className={styles.toastSub}>This import can’t be undone.</span>
            )}
            {undoError && <span className={styles.error}>{undoError}</span>}
          </div>

          <div className={styles.toastActions}>
            {/* Same action as the page's Undo button, so it is the same control:
                same icon, same label, same shape, same red tabular-nums
                countdown. Only the colours differ, because this one sits on a
                dark toast. */}
            {toast.batch && (
              <button
                className={styles.undoBtn}
                onClick={() => { setUndoError(null); setAsking(true); }}
                disabled={undoing}
                // No "…and after that you can still use the Undo button" — there
                // is no window after this one.
                title="Undo this import — the only chance to."
              >
                <span className={styles.undoIcon}>
                  <CornerUpLeft size={18} color="#18191A" />
                </span>
                Undo
                <span className={styles.count}>{secondsLeft}s</span>
              </button>
            )}
            <button
              className={styles.dismiss}
              onClick={() => { setToast(null); setAsking(false); }}
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Undo is a point-in-time restore, so the destructive warning stays
          exactly as it is elsewhere. In a 30-second window there is rarely
          anything to lose — but "rarely" is not "never".

          The wrapper carries a stacking context so this dialog clears the
          ReconciliationModal that is usually open behind it (see .undoDialogLayer). */}
      <div className={styles.undoDialogLayer}>
        <ConfirmModal
          open={asking && !!toast && !!toast.batch}
          title="Undo this import?"
          tone="destructive"
          confirmLabel={undoing ? 'Undoing…' : 'Undo (' + secondsLeft + 's)'}
          busy={undoing}
          message={
            <span>
              This restores the {toast && toast.batch ? toast.batch.label : 'list'} to exactly how it was
              before {file ? '“' + file.name + '”' : 'this file'} was imported.
              <br /><br />
              <strong>Any changes made since then will be lost</strong> — including rows you added or
              edited by hand afterwards.
              {undoError && (
                <>
                  <br /><br />
                  <span style={{ color: '#B91C1C' }}>{undoError}</span>
                </>
              )}
            </span>
          }
          onConfirm={doUndo}
          onCancel={() => { if (!undoing) { setAsking(false); setUndoError(null); } }}
        />
      </div>
    </>
  );
};

// How many rows actually landed, straight from the upload's own response. The
// entities word it differently (faculty merges, programs replace), so take
// whatever they report rather than guessing from the preview.
function countImported(result) {
  if (!result || typeof result !== 'object') return null;
  const inserted = Number(result.inserted || 0);
  const updated  = Number(result.updated || 0);
  const total    = inserted + updated;
  return Number.isFinite(total) && total > 0 ? total : null;
}

export default UploadPreviewFlow;
