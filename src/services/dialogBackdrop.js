/**
 * The app's single modal backdrop — a ref-counted dim layer.
 *
 * THE PROBLEM THIS SOLVES
 * Every dialog used to paint its own `position: fixed` dim div. That is fine in
 * isolation and wrong the moment one dialog hands off to another: on "Confirm &
 * Import" React unmounts Preview & Confirm and mounts the import summary in the
 * same frame, so backdrop A is destroyed and backdrop B created — a dark flash
 * between two dialogs that should read as one continuous surface.
 *
 * So the backdrop no longer belongs to any dialog. It is mounted ONCE
 * (components/DialogBackdrop.jsx, rendered in App) and merely observed here.
 * Dialogs acquire and release it; it is visible whenever at least one holder
 * wants it. During a handoff the incoming dialog acquires BEFORE the outgoing one
 * releases, so the count never reaches zero and the layer is never touched:
 * nothing to flicker.
 *
 *   useDialogBackdrop(open, onClick)   // hold the dim while `open`
 *
 * `onClick` is the backdrop's click handler while THIS holder is the topmost one
 * — a dialog stacked over another keeps its own dismiss behaviour, and a dialog
 * that passes nothing (Preview & Confirm, deliberately) makes the dim inert.
 */
import React from 'react';

// Bottom-to-top. The last entry owns the click.
let holders = [];
let nextId = 1;
const listeners = new Set();

const emit = () => { listeners.forEach((fn) => fn()); };

export function subscribeDialogBackdrop(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// A fresh array each call: DialogBackdrop stores this in state, so it has to
// change identity when the stack changes or React will skip the re-render.
export function getDialogBackdropHolders() {
  return holders.slice();
}

/**
 * How long a dialog's enter/exit animation runs, read from the CSS custom
 * property that DEFINES it (styles/DialogMotion.module.sass) rather than
 * duplicated here — including the `prefers-reduced-motion` override, which
 * collapses it to ~0.
 *
 * Only used for the safety-net timeout behind `animationend`: a panel that is
 * display:none'd or detached mid-exit never fires the event, and a dialog that
 * never finishes leaving would wedge the flow.
 */
export function dialogMotionMs() {
  if (typeof window === 'undefined' || !window.getComputedStyle) return 200;
  const raw = window.getComputedStyle(document.documentElement)
    .getPropertyValue('--dialog-motion')
    .trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return 200;
  return raw.endsWith('ms') ? n : n * 1000;   // `s` and `ms` are both legal CSS
}

export function useDialogBackdrop(open, onClick) {
  // The handler is read at click time, so a holder can re-render with a new
  // closure without re-acquiring (which would reshuffle the stack).
  const clickRef = React.useRef(onClick);
  clickRef.current = onClick;

  React.useEffect(() => {
    if (!open) return undefined;
    const id = nextId;
    nextId += 1;
    holders = holders.concat({ id, onClick: () => clickRef.current && clickRef.current() });
    emit();
    return () => {
      holders = holders.filter((h) => h.id !== id);
      emit();
    };
  }, [open]);
}
