/**
 * DialogBackdrop — the one dim layer, mounted once for the whole app (App.jsx).
 *
 * It is never mounted or unmounted in response to a dialog opening: it fades its
 * opacity instead, and is transparent + click-through at rest. That is what makes
 * a dialog-to-dialog handoff seamless — the element the user is looking at is the
 * same DOM node before, during and after, so there is nothing to flash.
 *
 * Who is holding it, and what a click on it does, lives in services/dialogBackdrop.js.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { subscribeDialogBackdrop, getDialogBackdropHolders } from '../services/dialogBackdrop.js';
import motion from '../styles/DialogMotion.module.sass';

const DialogBackdrop = () => {
  const [holders, setHolders] = React.useState(getDialogBackdropHolders);

  React.useEffect(
    () => subscribeDialogBackdrop(() => setHolders(getDialogBackdropHolders())),
    [],
  );

  const open = holders.length > 0;
  // Topmost holder owns the click — a dialog opened on top of another dismisses
  // itself, not the one underneath.
  const top = open ? holders[holders.length - 1] : null;

  // Portalled to <body> so no page's stacking context can trap it below a panel.
  return createPortal(
    <div
      className={open ? motion.backdrop + ' ' + motion.backdropOpen : motion.backdrop}
      aria-hidden="true"
      onClick={() => { if (top && top.onClick) top.onClick(); }}
    />,
    document.body,
  );
};

export default DialogBackdrop;
