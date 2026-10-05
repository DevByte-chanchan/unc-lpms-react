import { fetchJson } from './api.js'
import { DEFAULT_FORM_INFO, mergeFormInfo } from './formInfo.js'

// The current ISO form identity from the server. An export must never fail because of this,
// so any error falls back to the built-in defaults.
export const fetchFormInfo = async () => {
  try {
    return mergeFormInfo(await fetchJson('/api/form-settings'))
  } catch {
    return DEFAULT_FORM_INFO
  }
}

// Dean only: update one form's revision number / effectivity date (server validates).
export const saveFormInfo = (formKey, values) =>
  fetchJson(`/api/form-settings/${encodeURIComponent(formKey)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values)
  })
