// The main path, end to end, in the order a Program Head meets it. Each test
// undoes what it changed (Undo within its 30 seconds, or the API), so the demo
// database is left as it was; E2E_RESET_CMD, when set, resets it as well.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { signIn, api, currentTerm, isAllCaps, SAMPLES, API, COURSE_ASSIGNMENT } from './helpers.js';

// The BSIT Program of Study (1st–2nd year part), as the server tests use it.
const POS_PDF = path.resolve(SAMPLES, '..', 'server', 'tests', 'fixtures', 'programOfStudy', 'Rev-2-_BSIT-_-PROGRAM-OF-STUDY-1.pdf');

const leadCells = (page) => page.locator('tbody tr').evaluateAll((rows) => rows.map((r) => {
  const cells = r.querySelectorAll('td');
  return cells[3] ? cells[3].innerText.split('\n')[0].trim() : '';
}));

test('1. sign in, log out once: lands on /login and stays there', async ({ page }) => {
  await signIn(page, 'ph');
  await page.locator('[role=button]', { hasText: /log ?out/i }).first().click()
    .catch(() => page.getByRole('button', { name: /log ?out/i }).first().click());
  await page.getByRole('dialog').getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  // The late /auth/me that used to sign the user back in.
  await page.waitForTimeout(3000);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('#login-email')).toBeVisible();
});

test('2. Program Head uploads the course assignments, sees Leads in normal case, then undoes it', async ({ page }) => {
  await signIn(page, 'ph');
  await page.goto(COURSE_ASSIGNMENT);
  await expect(page.locator('tbody tr').first()).toBeVisible();
  const before = await page.locator('tbody tr').count();

  await page.getByRole('button', { name: /^Upload( Course Assignment)?$/ }).click();
  const replace = page.getByRole('button', { name: 'Continue to upload' });
  if (await replace.isVisible().catch(() => false)) await replace.click();
  // The sample for the current term's semester (the demo term is a 1st Semester).
  const term = await currentTerm(page);
  const file = String(term && term.semester) === '2' ? 'sample_course_assignments_2nd_sem.xls' : 'sample_course_assignments_1st_sem.xls';
  await page.locator('input[type=file][accept=".csv,.xlsx,.xls"]').setInputFiles(path.join(SAMPLES, file));
  await page.getByRole('button', { name: 'Review file' }).click();
  await page.getByRole('button', { name: 'Confirm & Import' }).click();

  await expect(page.getByText('Success!')).toBeVisible();
  // Rows that need attention open a summary first.
  const gotIt = page.getByRole('button', { name: 'Got it' });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  const leads = (await leadCells(page)).filter(Boolean);
  expect(leads.length).toBeGreaterThan(0);
  expect(leads.filter(isAllCaps), 'no ALL CAPS registrar names').toEqual([]);

  // Undo, inside its 30 seconds.
  await page.getByRole('status').filter({ hasText: 'Success!' }).getByRole('button', { name: /^Undo/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Undo \(\d+s\)$/ }).click();
  await expect(page.getByText('Undone.')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(before);
});

test('3. Add Assignment works before any upload, in a fresh term', async ({ page, browser }) => {
  test.setTimeout(240 * 1000); // the Program of Study upload reads two PDF pages
  // The VPAA opens the next term; it becomes the current one.
  const vpaa = await browser.newPage();
  await signIn(vpaa, 'vpaa');
  const now = await currentTerm(vpaa);
  expect(now, 'a current term (run npm run demo:reset)').toBeTruthy();
  const start = Number(String(now.school_year).slice(0, 4)) + 1;
  const sy = start + '-' + (start + 1);
  const created = await api(vpaa, 'POST', '/academic-periods', { label: '1st Semester ' + sy, school_year: sy, semester: '1' });
  expect(created.status, JSON.stringify(created.json)).toBe(201);
  const freshId = created.json.id;
  let addedId = null;
  try {
    await signIn(page, 'ph');
    // A new term starts with an empty catalog: the Program Head uploads the
    // Program of Study first (here through the API, with their session). No
    // course assignment file is uploaded. Opening Course Offerings first brings
    // the term its program list and faculty (each new term starts from the last).
    await page.goto('/role/program-head/course-offerings?page=Course%20Offerings');
    await expect(page.getByText('No courses for BSIT yet')).toBeVisible();
    const programs = (await api(page, 'GET', '/programs?period_id=' + freshId)).json || [];
    const bsit = programs.find((p) => p.code === 'BSIT');
    expect(bsit, 'BSIT in the new term').toBeTruthy();
    const pos = await page.request.post(API + '/courses/upload', {
      multipart: {
        period_id: String(freshId),
        programId: String(bsit.id),
        file: { name: 'Rev-2-_BSIT-_-PROGRAM-OF-STUDY-1.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(POS_PDF) },
      },
    });
    expect(pos.status(), await pos.text()).toBe(201);
    await page.goto(COURSE_ASSIGNMENT);
    await expect(page.getByText('No course assignments yet')).toBeVisible({ timeout: 45 * 1000 });
    await page.getByRole('button', { name: 'Add one assignment' }).click();

    const dialog = page.locator('[role=dialog]').filter({ hasText: 'Add Course Assignment' });
    // The pickers' options are buttons styled "item" (CoursePicker, SearchableSelect).
    const option = () => page.locator('button[class*="item"]:visible').first();
    await dialog.getByPlaceholder('Search course code or title…').click();
    await option().click();
    await dialog.getByPlaceholder('Search faculty…').click();
    await option().click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('tbody tr')).toHaveCount(1);

    const rows = await api(page, 'GET', '/course-offering-assignments?period_id=' + freshId);
    expect(rows.json.length).toBe(1);
    addedId = rows.json[0].id;
    expect(isAllCaps(rows.json[0].faculty_name || '')).toBe(false);
  } finally {
    if (addedId) await api(page, 'DELETE', '/course-offering-assignments/' + addedId + '?period_id=' + freshId);
    await api(vpaa, 'DELETE', '/academic-periods/' + freshId);
    await vpaa.close();
  }
});

test('4. Compare with official offerings reads the Subject Offerings PDF and groups the courses', async ({ page }) => {
  await signIn(page, 'ph');
  await page.goto(COURSE_ASSIGNMENT);
  await page.getByRole('button', { name: /^Compare with official/ }).click();
  await page.locator('input[type=file][accept=".pdf,.csv,.xlsx,.xls"]').setInputFiles(path.join(SAMPLES, 'sample_subject_offerings_2nd_sem.pdf'));
  const dialog = page.getByRole('dialog');
  // At least one of the four groups, with its course rows (preview only: nothing is applied).
  await expect(dialog.getByText(/^(Differs|New|Not offered|Confirmed)\b/).first()).toBeVisible({ timeout: 45 * 1000 });
  const groups = await dialog.getByText(/^(Differs|New|Not offered|Confirmed)\b/).allInnerTexts();
  expect(groups.length).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
});

test('5. the Notifications tab shows a status for the Lead', async ({ page }) => {
  await signIn(page, 'ph');
  await page.goto(COURSE_ASSIGNMENT);
  const row = page.locator('tbody tr').filter({ has: page.locator('td') }).first();
  await expect(row).toBeVisible();
  await row.getByText('Edit', { exact: true }).click();
  const dialog = page.locator('[role=dialog]').filter({ hasText: 'Edit assignment' });
  await dialog.getByRole('tab', { name: 'Notifications' }).click();
  await expect(dialog.getByText('Lead Faculty')).toBeVisible();
  await expect(dialog.getByText(/Email sent|Seen|In the app|Notified|Sending soon|Not sent yet|Invitation held|No account|Not emailed|Email failed|Retrying|Not sent/).first()).toBeVisible();
  await page.keyboard.press('Escape');
});
