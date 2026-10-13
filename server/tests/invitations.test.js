/**
 * The pure parts of the invitation / password-link flow: the school-email
 * rule, "same person", tokens, and the email templates' wording and
 * signatures. (The database flows — upload → scheduled → sent → accepted —
 * need a running stack and are exercised end to end, not here.)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { schoolEmail, samePerson } from '../utils/schoolEmail.js';
import { newToken, hashToken, looksLikeToken } from '../utils/tokens.js';
import { invitationEmail } from '../templates/invitationEmail.js';
import { passwordResetEmail } from '../templates/passwordResetEmail.js';
import { rolesForFacultyRow } from '../services/invitations.js';

test('schoolEmail: firstname.surname@unc.edu.ph', () => {
  assert.equal(schoolEmail('Kristine San Lorenzo'), 'kristine.sanlorenzo@unc.edu.ph');
  assert.equal(schoolEmail('June Arreb Danila'), 'june.danila@unc.edu.ph');
  assert.equal(schoolEmail('Danny B. Casimero'), 'danny.casimero@unc.edu.ph');
  assert.equal(schoolEmail('Dr. Teresita L. Gomez'), 'teresita.gomez@unc.edu.ph');
  assert.equal(schoolEmail('Atty. Ramon D. Fernandez'), 'ramon.fernandez@unc.edu.ph');
  assert.equal(schoolEmail('Engr. Paolo Mendoza'), 'paolo.mendoza@unc.edu.ph');
  assert.equal(schoolEmail('Marco Dela Rosa'), 'marco.delarosa@unc.edu.ph');
  assert.equal(schoolEmail('Juan de los Santos'), 'juan.delossantos@unc.edu.ph');
  assert.equal(schoolEmail('José Peña'), 'jose.pena@unc.edu.ph');
  assert.equal(schoolEmail('Madonna'), null);
  assert.equal(schoolEmail(''), null);
});

test('samePerson: honorifics and initials ignored, middle names not', () => {
  assert.ok(samePerson('Danny B. Casimero', 'danny casimero'));
  assert.ok(samePerson('Dr. Edrian Lait', 'Edrian Lait'));
  assert.ok(!samePerson('Maria Elena Santos', 'Maria Santos'));
  assert.ok(!samePerson('', ''));
});

test('tokens: 32 random bytes, stored only as a SHA-256 hash', () => {
  const t = newToken();
  assert.ok(looksLikeToken(t));
  assert.notEqual(newToken(), t);
  assert.match(hashToken(t), /^[0-9a-f]{64}$/);
  assert.equal(hashToken(t), hashToken(t));
  assert.ok(!looksLikeToken('TEST-ONLY'));
  assert.ok(!looksLikeToken(undefined));
});

test('faculty Role → account roles: Instructor only (the Role column is information)', () => {
  assert.deepEqual(rolesForFacultyRow('Program Head'), ['Instructor']);
  assert.deepEqual(rolesForFacultyRow('Dean'), ['Instructor']);
  assert.deepEqual(rolesForFacultyRow('Associate Professor'), ['Instructor']);
});

const link = 'http://localhost:5173/set-password?token=abc';

test('invitation: signed by the person who gave the access', () => {
  const m = invitationEmail({
    name: 'Kristine San Lorenzo',
    roles: ['Program Head (BSIT)', 'Instructor'],
    link,
    sender: { name: 'Edrian Lait', title: 'Dean, School of Computer & Information Sciences' },
  });
  assert.equal(m.subject, 'Your UNC Learning Plan Management System account');
  assert.match(m.text, /Edrian Lait has given you access to the UNC Learning Plan Management System \(LPMS\) as: Program Head \(BSIT\), Instructor\./);
  assert.match(m.text, /— Edrian Lait\nDean, School of Computer & Information Sciences/);
  assert.match(m.html, /Edrian Lait has given you access/);
  assert.match(m.html, /Dean, School of Computer &amp; Information Sciences/);
  assert.doesNotMatch(m.text + m.html, /Office of the Vice President/);
  assert.match(m.html, /cid:unclogo@lpms/);
  assert.equal(m.attachments[0].cid, 'unclogo@lpms');
});

test('invitation: no sender → the system signature and the impersonal sentence', () => {
  const m = invitationEmail({ name: 'A B', roles: ['Instructor'], link });
  assert.match(m.text, /You've been given access to the UNC Learning Plan Management System \(LPMS\) as: Instructor\./);
  assert.match(m.text, /— UNC Learning Plan Management System/);
});

test('invitation: names are escaped in the HTML', () => {
  const m = invitationEmail({ name: '<b>x</b>', roles: ['Instructor'], link, sender: { name: 'Evil <script>', title: null } });
  assert.doesNotMatch(m.html, /<script>|<b>x<\/b>/);
});

test('password reset: 1 hour, ignore-if-not-you, system signature', () => {
  const m = passwordResetEmail({ name: 'Kristine San Lorenzo', link: 'http://localhost:5173/reset-password?token=abc' });
  assert.equal(m.subject, 'Reset your LPMS password');
  assert.match(m.text, /expires in 1 hour/);
  assert.match(m.text, /If you didn't ask for this, ignore this email — your password hasn't changed\./);
  assert.match(m.text, /— UNC Learning Plan Management System/);
  assert.match(m.html, /reset-password\?token=abc/);
});
