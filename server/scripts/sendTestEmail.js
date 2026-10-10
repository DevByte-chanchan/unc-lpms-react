/**
 * Sends a REAL invitation to an existing account, to check mail delivery and
 * the set-password page end to end. The subject is prefixed [TEST]; the link
 * works like any invitation (and replaces the account's earlier unaccepted ones).
 *
 *   docker exec ca-api npm run mail:test -- --to kristine.sanlorenzo@unc.edu.ph
 *   … --from-email edrian.lait@unc.edu.ph   preview a specific signer
 *
 * Signed by --from-email's account if given, otherwise by whoever sent the
 * account's latest invitation (its uploader), otherwise by the system.
 * Where it goes depends on MAIL_MODE (see services/mailer.js).
 */
import dotenv from 'dotenv';
import db from '../models/index.js';
import { mailStatus } from '../services/mailer.js';
import { createInvitation, sendInvitation, appBaseUrl } from '../services/invitations.js';
import { isAllowedEmail, allowedEmailDomain, normalizeEmail } from '../utils/roles.js';

dotenv.config();

const arg = (name) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const to = normalizeEmail(arg('to'));
const fromEmail = normalizeEmail(arg('from-email'));

const done = async (code) => {
  await db.sequelize.close().catch(() => {});
  process.exit(code);
};

const status = mailStatus();
console.log(`Mail mode:   ${status.mode}`);
console.log(`Configured:  ${status.configured ? 'yes' : 'no'}`);
console.log(`From:        ${status.from}`);
console.log(`Links open:  ${appBaseUrl()}`);
console.log('');

if (!to) {
  console.error('Usage: npm run mail:test -- --to someone@' + allowedEmailDomain() + ' [--from-email signer@' + allowedEmailDomain() + ']');
  await done(2);
}
if (!isAllowedEmail(to)) {
  console.error(`Refused: ${to} is not an @${allowedEmailDomain()} address.`);
  await done(2);
}

const account = await db.UserAccount.findOne({ where: { email: to } });
if (!account) {
  console.error('No LPMS account for that email yet — upload them (or create one in User Accounts) first. Nothing was sent.');
  await done(1);
}
if (account.status !== 'Active') {
  console.error(`${account.display_name}'s account is disabled. Nothing was sent.`);
  await done(1);
}

let senderId = null;
let source = 'manual';
let periodId = null;
if (fromEmail) {
  const signer = await db.UserAccount.findOne({ where: { email: fromEmail } });
  if (!signer) {
    console.error(`No LPMS account for --from-email ${fromEmail}. Nothing was sent.`);
    await done(1);
  }
  senderId = signer.id;
  // Sign as the role that would have given this access.
  const roles = signer.roles || [];
  source = roles.includes('VPAA') ? 'manual' : roles.includes('Dean') ? 'faculty' : roles.includes('Program Head') ? 'industry_consultants' : 'manual';
} else {
  const latest = await db.AccountInvitation.findOne({
    where: { user_account_id: account.id },
    order: [['id', 'DESC']],
  });
  if (latest) {
    senderId = latest.sent_by_account_id;
    source = latest.source_entity || 'manual';
    periodId = latest.period_id;
  }
}

if (!account.must_change_password) {
  console.log(`Note: ${account.display_name} has already set a password. The link still works and would replace it.`);
}

const invitation = await createInvitation(account, {
  source, emailSource: 'manual', senderId, periodId, supersede: true, immediate: true,
});
const result = await sendInvitation(invitation, {
  subjectPrefix: '[TEST] ',
  note: 'This is a test message from the LPMS development team.',
});
console.log(`Signed by:   ${senderId ? (await db.UserAccount.findByPk(senderId)).display_name : 'the system (UNC Learning Plan Management System)'}`);
console.log('');

switch (result.status) {
  case 'captured':
    console.log('captured → open http://localhost:8025');
    break;
  case 'sent':
    console.log('sent → check the inbox (and Spam)');
    break;
  case 'skipped':
    console.log(status.mode === 'off'
      ? 'skipped → MAIL_MODE=off sends nothing; set MAIL_MODE=capture or live'
      : 'skipped → add the address to MAIL_DEV_ALLOWLIST');
    break;
  default:
    console.error('failed → ' + result.reason);
    await done(1);
}
await done(0);
