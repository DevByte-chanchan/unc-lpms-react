export const RESIZE_SETTLE_MS = 180;

export function subscribeToResizeActivity({
  target,
  onChange,
  delay = RESIZE_SETTLE_MS,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  let active = false;
  let settleTimer = null;

  const handleResize = () => {
    if (!active) {
      active = true;
      onChange(true);
    }

    if (settleTimer !== null) cancel(settleTimer);

    settleTimer = schedule(() => {
      settleTimer = null;
      active = false;
      onChange(false);
    }, delay);
  };

  target.addEventListener("resize", handleResize, { passive: true });

  return () => {
    target.removeEventListener("resize", handleResize);
    if (settleTimer !== null) cancel(settleTimer);
  };
}
