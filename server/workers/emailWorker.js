/**
 * The email worker: every 15 seconds, sends the invitations whose send_after
 * has come (upload invitations are due at once; failed sends wait for their
 * retry). Runs inside the API process, started after boot.
 *
 * One tick at a time — a slow SMTP server never stacks ticks up — and each
 * row is claimed atomically (services/invitations.js), so a second API
 * process can't send it twice.
 */
import { deliverDueInvitations } from '../services/invitations.js';

export const POLL_MS = 15 * 1000;

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    await deliverDueInvitations();
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
  console.log('[email-worker] started — checking for due invitations every ' + POLL_MS / 1000 + 's');
  tick();
}

export function stopEmailWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
