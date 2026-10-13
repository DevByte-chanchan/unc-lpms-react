/**
 * Who owns the undo countdown right now.
 *
 * The 30-second deadline must be visible in exactly ONE place at a time. Two
 * components can show it:
 *
 *   • UploadPreviewFlow's toast — after an upload.
 *   • UndoUploadButton — the button beside Upload on every page.
 *
 * After an upload both are on screen at once, so the toast counts and the button
 * shows a plain "Undo". But the button has to take the clock back the moment the
 * toast goes away early (the user dismissed it with the X) — a silent 30-second
 * window is worse than a redundant one. And a MANUAL add never raises a toast at
 * all, so there the button is the only place the deadline can live.
 *
 * That makes toast visibility a fact the button needs about a sibling it has no
 * relationship to. Threading it as a prop would mean wiring state through all
 * seven upload pages for something no page cares about, so the toast publishes
 * it here and the button subscribes. A module-scoped store is the honest shape:
 * there is one upload flow per page, so there is one toast.
 *
 * This is presentation only — it decides where the countdown is DRAWN. The
 * deadline itself is the server's (UNDO_WINDOW_MS), and both components count
 * down from the batch's own ms_remaining regardless of what this says.
 */
import { useSyncExternalStore } from 'react';

let visible = false;
const listeners = new Set();

/** Called by the toast as it appears and disappears. */
export const setUndoToastVisible = (next) => {
  if (visible === next) return;
  visible = next;
  listeners.forEach((notify) => notify());
};

const subscribe = (notify) => {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
};

/** True while the undo toast is showing — and therefore owns the countdown. */
export const useUndoToastVisible = () =>
  useSyncExternalStore(subscribe, () => visible, () => false);
