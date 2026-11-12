/**
 * The email worker: every 15 seconds, the ONE sender path for every
 * person-facing email. Runs inside the API process, started after boot.
 *
 * Each tick, in order:
 *   1. deliverDueInvitations  scheduled invitations whose send_after has come
 *                             (upload invitations wait out the undo window;
 *                             failed sends wait for their retry)
 *   2. deliverDueNotices      dirty account_notices past their send_after: the
 *                             bell + one update email or first invitation
 *   3. sendDueReminders       day-3 / day-6 reminders to people not signed in
 *   4. once an hour           exam-date reminders (services/deadlineReminders.js):
 *                             7 days and 1 day before the midterm and final
 *   5. once a day             the clean-up of read notifications older than 90 days
 *
 * One tick at a time — a slow SMTP server never stacks ticks up — and each
 * row is claimed atomically, so a second API process can't send it twice.
 * Everything pending lives in the database, so a restart loses nothing.
 */
import { deliverDueInvitations, sendDueReminders } from '../services/invitations.js';
import { deliverDueNotices, cleanupNotifications } from '../services/notices.js';
import { sendDeadlineReminders } from '../services/deadlineReminders.js';

export const POLL_MS = 15 * 1000;

let timer = null;
let running = false;
let lastDailyDate = null;
let lastDeadlineHour = null;

const dayKey = (d) => d.toISOString().slice(0, 10);

/** The whole tick, exported so tests (and a manual run) can drive it. */
export async function runWorkerTick({ now = new Date() } = {}) {
  const out = {};
  out.invitations = await deliverDueInvitations();
  out.notices = await deliverDueNotices({ now });
  out.reminders = await sendDueReminders({ now });
  // Hourly: a failed send gives its claim back and is retried the next hour.
  const hour = now.toISOString().slice(0, 13);
  if (lastDeadlineHour !== hour) {
    lastDeadlineHour = hour;
    out.deadlines = await sendDeadlineReminders({ now }).catch((err) => { console.error('[deadlines] failed:', err.message); return null; });
  }
  if (lastDailyDate !== dayKey(now)) {
    lastDailyDate = dayKey(now);
    out.daily = await runDailyTasks({ now });
  }
  return out;
}

/** The once-a-day step, on its own for tests. */
export async function runDailyTasks({ now = new Date() } = {}) {
  const cleaned = await cleanupNotifications({ now });
  if (cleaned) console.log(`[email-worker] daily: ${cleaned} old notifications removed`);
  return { cleaned };
}

async function tick() {
  if (running) return;
  running = true;
  try {
    await runWorkerTick();
  } catch (err) {
    console.error('[email-worker] tick failed:', err.message);
  } finally {
    running = false;
  }
}

export function startEmailWorker() {
  if (timer) return;
  timer = setInterval(tick, POLL_MS);
  if (timer.unref) timer.unref();
  console.log('[email-worker] started — invitations, notices and reminders every ' + POLL_MS / 1000 + 's; exam-date reminders hourly (DEADLINE_REMINDERS=' + (String(process.env.DEADLINE_REMINDERS || 'on').toLowerCase() === 'off' ? 'off' : 'on') + ')');
  tick();
}

export function stopEmailWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
