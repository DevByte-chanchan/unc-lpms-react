/**
 * The password rules the pages show live. The server re-checks them
 * (passwordProblems in server/controllers/authController.js).
 */
export const MIN_PASSWORD = 8;

/** The rules for a brand-new password: [{ ok, label }]. */
export const newPasswordChecks = (next, confirm) => [
  { ok: next.length >= MIN_PASSWORD, label: 'At least ' + MIN_PASSWORD + ' characters' },
  { ok: next !== '' && next === confirm, label: 'Matches the confirmation' },
];
