// Shared by the e2e tests: accounts from the environment, sign-in through the
// real form, and API calls made with the signed-in session.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SAMPLES = path.resolve(here, '..', 'sample-uploads');
export const API = (process.env.E2E_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');

const need = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(name + ' is not set (see e2e/playwright.config.js).');
  return v;
};

export const accounts = {
  ph: () => ({ email: process.env.E2E_PH_EMAIL || 'kristine.sanlorenzo@unc.edu.ph', password: need('E2E_PH_PASSWORD') }),
  vpaa: () => ({ email: process.env.E2E_VPAA_EMAIL || 'carlos.garcia@unc.edu.ph', password: need('E2E_VPAA_PASSWORD') }),
};

const ROLE_OF = { ph: 'Program Head', vpaa: 'VPAA' };

/** Sign in through /login (answering "Continue as…" for a many-role account) and wait to leave it. */
export async function signIn(page, who) {
  const { email, password } = accounts[who]();
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const chooser = page.getByText('Continue as…');
  await expect(chooser.or(page.locator('body:not(:has(#login-email))')).first()).toBeVisible();
  if (await chooser.isVisible()) {
    await page.getByRole('button', { name: new RegExp('^' + ROLE_OF[who]) }).click();
  }
  await expect(page).not.toHaveURL(/\/login/);
}

/** JSON from the API with the page's own session cookie. */
export async function api(page, method, p, body) {
  const res = await page.request.fetch(API + p, {
    method,
    data: body === undefined ? undefined : body,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status(), json };
}

/** The current term ({ id, label }) as the app picks it. */
export async function currentTerm(page) {
  const { json } = await api(page, 'GET', '/academic-periods');
  const list = Array.isArray(json) ? json : (json && json.rows) || [];
  const active = list.filter((p) => p.status === 'Active');
  const rank = (p) => Number(String(p.school_year || '').slice(0, 4)) * 10 + (String(p.semester) === '2' ? 2 : String(p.semester).toLowerCase() === 'summer' ? 3 : 1);
  return active.sort((a, b) => rank(b) - rank(a))[0] || null;
}

/** "Some Name" in ALL CAPS? (registrar style, never shown) */
export const isAllCaps = (s) => /\p{Lu}{2,}/u.test(s) && !/\p{Ll}/u.test(s);

export const COURSE_ASSIGNMENT = '/role/program-head/course-assignment';
