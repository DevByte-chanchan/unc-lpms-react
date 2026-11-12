import { DEFAULT_FORM_INFO, mergeFormInfo } from './formInfo.js';

// The server's current form identity (doc control no., revision, effectivity).
// On the Learning Plan branch this is GET /api/form-settings (editable by the
// Dean). This app's server has no such endpoint yet, so it stays null and the
// built-in defaults are used without a failing request. Once the endpoint is
// added, set it here; an export never fails because of form settings.
const FORM_SETTINGS_ENDPOINT = null;

let cached = null;

export const fetchFormInfo = async () => {
  if (!FORM_SETTINGS_ENDPOINT) return DEFAULT_FORM_INFO;
  if (cached) return cached;
  try {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const res = await fetch(base + FORM_SETTINGS_ENDPOINT, { credentials: 'include' });
    if (!res.ok) return DEFAULT_FORM_INFO;
    cached = mergeFormInfo(await res.json());
    return cached;
  } catch {
    return DEFAULT_FORM_INFO;
  }
};
