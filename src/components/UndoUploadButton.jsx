/**
 * UndoUploadButton — sits beside the Upload button on every page that imports
 * a spreadsheet, and rolls the last upload back.
 *
 * The backend photographs the affected tables before an upload runs and keeps
 * that snapshot restorable for 30 SECONDS (UNDO_WINDOW_MS in
 * server/utils/importUndo.js), so this button is a thin shell over
 * `GET /imports/latest` + `POST /imports/:id/undo`. The deadline is enforced
 * server-side; the countdown here just makes it visible instead of letting it
 * expire as a surprise.
 *
 * The window is short enough that this button is live for only 30 seconds after
 * a change, and inert the rest of the time. UploadPreviewFlow's toast covers the
 * same 30 seconds for uploads; this button remains the entry point for undoing a
 * row added BY HAND (beginManualBatch), which has no toast.
 *
 * The countdown reads the batch's `ms_remaining` from the server. Nothing here
 * hardcodes 30 — move UNDO_WINDOW_MS and this follows.
 *
 * Undo is a POINT-IN-TIME RESTORE, not a selective merge: the period goes back
 * to exactly how it looked before the upload, so edits made after the upload go
 * with it. The confirm dialog says so plainly, because that is the one thing a
 * user could be surprised by.
 *
 * Usage — bump `refreshKey` after a successful upload so the button picks up
 * the new batch, and refresh the page's rows in `onUndone`:
 *
 *   <UndoUploadButton
 *     entity="faculty"
 *     periodId={periodId}
 *     disabled={!isCurrentTermActive}
 *     refreshKey={uploadCount}
 *     onUndone={refresh}
 *   />
 */
import React from 'react';
// CornerUpLeft, not RotateCcw — a circular arrow reads as "retry/refresh",
// which is the opposite of what this does.
import { CornerUpLeft, X } from 'react-feather';
import ConfirmModal from './ConfirmModal.jsx';
import { ImportsAPI } from '../services/api.js';
import { useUndoToastVisible } from '../services/undoToast.js';
import toastStyles from '../styles/UploadPreviewFlow.module.sass';

// The whole window is 30 seconds, so seconds are the only unit there is.
// Round UP: with 400ms to go, "0s left" reads as already gone.
const formatLeft = (ms) => Math.max(0, Math.ceil(ms / 1000)) + 's left';

const UndoUploadButton = ({ entity, periodId, disabled, refreshKey, onUndone }) => {
  const [batch, setBatch]     = React.useState(null);
  const [msLeft, setMsLeft]   = React.useState(0);
  const [asking, setAsking]   = React.useState(false);
  const [busy, setBusy]       = React.useState(false);
  const [error, setError]     = React.useState(null);
  // The receipt for the undo that just ran — see doUndo.
  const [done, setDone]       = React.useState(null);
  // Re-read after an undo. Each batch is a full point-in-time image, so undoing
  // the newest re-exposes the one before it — this is what lets Undo step back
  // through "upload → add" one change at a time.
  const [tick, setTick]       = React.useState(0);

  // Is the upload toast on screen counting these same seconds? If so, this
  // button stays a plain "Undo" and lets the toast own the clock.
  const toastVisible = useUndoToastVisible();

  // Pull the undoable batch whenever the period changes or a change lands.
  React.useEffect(() => {
    if (!periodId) { setBatch(null); return undefined; }
    let cancelled = false;
    ImportsAPI.latest(entity, periodId)
      .then((res) => {
        if (cancelled) return;
        const found = res && res.batch ? res.batch : null;
        setBatch(found);
        setMsLeft(found ? found.ms_remaining : 0);
      })
      .catch(() => { if (!cancelled) setBatch(null); });
    return () => { cancelled = true; };
  }, [entity, periodId, refreshKey, tick]);

  // Local countdown. The server owns the real deadline — this only keeps the
  // label honest and retires the button the moment it lapses.
  //
  // Deadline-based rather than subtract-1000-per-tick: setInterval is throttled
  // in a background tab, and over a 30-second window that drift is the whole
  // window. Anchor to a wall-clock deadline and a slow tick can only skip
  // numbers, never overrun the expiry.
  React.useEffect(() => {
    if (!batch) return undefined;
    const deadline = Date.now() + batch.ms_remaining;
    setMsLeft(batch.ms_remaining);
    const id = setInterval(() => {
      const left = deadline - Date.now();
      if (left <= 0) {
        setBatch(null);      // the server would answer 410 now
        setAsking(false);    // don't leave a confirm dialog open over a dead window
        setMsLeft(0);
        return;
      }
      setMsLeft(left);
    }, 250);
    return () => clearInterval(id);
  }, [batch]);

  const doUndo = async () => {
    setBusy(true); setError(null);
    try {
      const res = await ImportsAPI.undo(batch.id);
      setBatch(null);
      setAsking(false);
      // Same reason as the toast in UploadPreviewFlow: undo is a point-in-time
      // restore, so it can leave a list that looks exactly like the one before
      // it. Reporting the rows it moved is what distinguishes a working undo
      // from a silent one.
      setDone(res || {});
      setTick((n) => n + 1);   // surface the previous change, if there is one
      if (onUndone) await onUndone();
    } catch (err) {
      // Includes the server's own expiry check (410) — the answer to a clock
      // that drifted, or to the last second running out mid-dialog.
      setError(err.message || 'Undo failed.');
    } finally {
      setBusy(false);
    }
  };

  const nothingToUndo = !batch;
  const isDisabled    = disabled || nothingToUndo || busy;

  const isAdd = !!batch && batch.action === 'add';

  // What this specific Undo will do, in the user's terms.
  const describe = () => {
    if (!batch) return '';
    if (isAdd) return 'Remove “' + (batch.subject || 'the row you added') + '”';
    return 'Undo the ' + (batch.filename ? '“' + batch.filename + '”' : 'last') + ' upload';
  };

  // The countdown ticks INSIDE the button rather than only in the tooltip: over
  // a 30-second window a deadline you have to hover to discover is no deadline
  // at all. (It used to be hidden because a number counting down for an HOUR
  // pulls the eye all afternoon — an objection that dies with the hour.)
  //
  // But it must appear exactly ONCE on screen. After an upload the toast is
  // already counting the same seconds two inches away, so the button goes quiet
  // and shows a plain "Undo". Two cases put the clock back in the button:
  //   • a MANUAL add — no toast is ever shown for one, so this is the only place
  //     the deadline could live;
  //   • the user dismissed the toast early — the countdown has nowhere else to
  //     go, and a silent 30-second window is worse than a redundant one.
  const secondsLeft   = Math.max(0, Math.ceil(msLeft / 1000));
  const showCountdown = !nothingToUndo && (isAdd || !toastVisible);

  const title = nothingToUndo
    ? 'Nothing to undo — a change can be reversed for 30 seconds after you make it.'
    : describe() + ' — ' + formatLeft(msLeft);

  return (
    <>
      <button
        onClick={() => { setError(null); setAsking(true); }}
        disabled={isDisabled}
        title={title}
        style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '8px 18px', gap: 8, height: 40,
          background: '#FFFFFF', borderRadius: 6, color: '#374151',
          border: '1px solid #D1D5DB',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap', opacity: isDisabled ? 0.6 : 1,
        }}
      >
        <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <CornerUpLeft size={18} color="#374151" />
        </span>
        Undo
        {showCountdown && (
          <span style={{ color: '#B91C1C', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {secondsLeft}s
          </span>
        )}
      </button>

      <ConfirmModal
        open={asking}
        title={isAdd ? 'Undo this addition?' : 'Undo this upload?'}
        tone="destructive"
        confirmLabel={busy ? 'Undoing…' : 'Undo'}
        busy={busy}
        message={
          <span>
            {isAdd ? (
              <>
                This removes <strong>“{batch.subject || 'the row you added'}”</strong> and restores
                the {batch.label} to exactly how it was just before you added it.
              </>
            ) : (
              <>
                This restores the {batch ? batch.label : 'list'} to exactly how it was before
                {batch && batch.filename ? ' “' + batch.filename + '”' : ' the last file'} was uploaded.
              </>
            )}
            <br /><br />
            <strong>Any changes made since then will be lost</strong> — including rows you added or
            edited by hand afterwards.
            {error && (
              <>
                <br /><br />
                <span style={{ color: '#B91C1C' }}>{error}</span>
              </>
            )}
          </span>
        }
        onConfirm={doUndo}
        onCancel={() => { if (!busy) { setAsking(false); setError(null); } }}
      />

      {/* Styled from UploadPreviewFlow's stylesheet on purpose: this is the same
          toast, raised by the same action, and it must not read as a second
          species of notification depending on which Undo you pressed. */}
      {done && (
        <div className={toastStyles.toast} role="status" aria-live="polite">
          <div className={toastStyles.toastText}>
            {/* Same phrasing as the upload toast, and for the same reason: the
                entity labels mix singular and plural, so the sentence is built
                around the file/change rather than agreeing with the label. */}
            <span>
              <strong>Undone.</strong>{' '}
              {done.filename ? '“' + done.filename + '”' : 'That change'} has been rolled
              back{done.label ? ' — ' + done.label + ' restored to the state before it' : ''}.
            </span>
            <span className={toastStyles.toastSub}>
              {done.summary
                ? done.summary.removed + ' ' + (done.summary.removed === 1 ? 'row' : 'rows')
                  + ' removed · ' + done.summary.restored + ' put back'
                : 'The period was restored.'}
              {done.previous && (
                <>
                  {' — the change before it '}
                  {done.previous.filename ? '(“' + done.previous.filename + '”) ' : ''}
                  can still be undone.
                </>
              )}
            </span>
          </div>
          <div className={toastStyles.toastActions}>
            <button className={toastStyles.dismiss} onClick={() => setDone(null)} aria-label="Dismiss">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default UndoUploadButton;
