/**
 * A short message from anywhere; HeaderA, which is on every signed-in page,
 * shows it. An event rather than a context so the page and the header stay
 * independent.
 */
export const APP_TOAST_EVENT = 'lpms:toast';

export const showToast = (message) => {
  window.dispatchEvent(new CustomEvent(APP_TOAST_EVENT, { detail: { message } }));
};
