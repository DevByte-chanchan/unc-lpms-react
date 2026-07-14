/**
 * DialogShell — a centred dialog panel that fades and scales in, and (the part
 * React does not give you for free) fades and scales back OUT before it leaves.
 *
 * WHY A COMPONENT AND NOT A CSS CLASS
 * React unmounts on the render that drops the element, so an exit animation has
 * nowhere to play. The shell keeps the panel MOUNTED after `open` goes false,
 * marks it leaving, and unmounts only once the animation reports it is done —
 * off `animationend`, with a timeout purely as a safety net (see dialogMotionMs).
 *
 * THE HANDOFF (`holdBackdrop`)
 * Closing normally, the dim goes with the panel: both fade together. But when one
 * dialog is handing off to the NEXT one — Preview & Confirm → the import summary —
 * the dim has to survive the gap, or the user sees the page flash between them.
 * Pass `holdBackdrop` and the shell keeps holding the backdrop for the whole exit,
 * then calls `onExited` BEFORE it unmounts. The parent mounts the next dialog in
 * that callback, so the incoming dialog has acquired the backdrop before this one
 * lets go and the count never touches zero.
 *
 *   <DialogShell open={showModal} onBackdropClick={close} panelStyle={{ width: 600 }}>
 *
 * The panel is centred by the flex LAYER, never by translate(-50%, -50%) — the
 * scale animation would overwrite that transform and throw the dialog off-centre.
 */
import React from 'react';
import { useDialogBackdrop, dialogMotionMs } from '../services/dialogBackdrop.js';
import motion from '../styles/DialogMotion.module.sass';

const cx = (...names) => names.filter(Boolean).join(' ');

const DialogShell = ({
  open,
  onBackdropClick,
  onExited,
  holdBackdrop = false,
  panelClassName,
  panelStyle,
  ariaLabel,
  children,
}) => {
  const [mounted, setMounted] = React.useState(!!open);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    if (open) { setMounted(true); setLeaving(false); }
    else if (mounted) { setLeaving(true); }
    // `mounted` is read, not tracked: reacting to it would re-fire this on the
    // unmount it just caused.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Held while open, and through the exit only when this is a handoff. On an
  // ordinary close the dim is released as the panel starts leaving, so the two
  // fade out together instead of the dim lingering behind an empty screen.
  useDialogBackdrop(mounted && (!leaving || holdBackdrop), onBackdropClick);

  // Kept in a ref so the safety-net timeout below always calls the CURRENT one
  // without re-arming itself on every render.
  const finishRef = React.useRef(null);
  finishRef.current = () => {
    if (!leaving) return;
    // onExited FIRST, unmount second — both are state updates from the same
    // handler, so React commits them together and the next dialog is on screen
    // in the very frame this one disappears.
    if (onExited) onExited();
    setLeaving(false);
    setMounted(false);
  };

  React.useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(() => finishRef.current(), dialogMotionMs() + 80);
    return () => clearTimeout(t);
  }, [leaving]);

  // A leaving dialog shows the content it had when it was told to go. Pages
  // clear the state their dialog was built from as they close it (the Courses
  // summary nulls `uploadResult`), and a panel still on screen would re-render
  // as some other pane for the length of the fade. What is leaving must look
  // like what was there.
  const lastChildren = React.useRef(children);
  if (!leaving) lastChildren.current = children;

  if (!mounted) return null;

  return (
    <div className={motion.panelLayer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cx(leaving ? motion.panelLeaving : motion.panelEntering, panelClassName)}
        style={panelStyle}
        // Guard the target: animationend bubbles, and any animated descendant
        // (a spinner, a row) would otherwise tear the dialog down mid-flight.
        onAnimationEnd={(e) => { if (e.target === e.currentTarget) finishRef.current(); }}
      >
        {leaving ? lastChildren.current : children}
      </div>
    </div>
  );
};

export default DialogShell;
