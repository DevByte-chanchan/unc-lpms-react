/**
 * Why does (or doesn't) someone have a role?   npm run access:check -- <email> [--fix]
 *
 * Prints the account, the active term, the person's faculty row in that term, and
 * every program whose head is them (by id or by name). With --fix, runs the same
 * Program Head reconcile the app runs after faculty / programs changes and at boot.
 */
import dotenv from 'dotenv';
import db from '../models/index.js';
import { getActiveTermId } from '../utils/latestPeriod.js';
import { samePerson } from '../utils/schoolEmail.js';
import { normalizeEmail } from '../utils/roles.js';
import { reconcileProgramHeads } from '../controllers/programController.js';

dotenv.config();
const { UserAccount, Faculty, Program, AcademicPeriod } = db;

const email = normalizeEmail(process.argv.slice(2).find((a) => !a.startsWith('--')));
const fix = process.argv.includes('--fix');

async function main() {
  if (!email) { console.log('Usage: npm run access:check -- name.surname@unc.edu.ph [--fix]'); return; }
  const acc = await UserAccount.findOne({ where: { email } });
  if (!acc) { console.log('No account for ' + email + '.'); return; }
  console.log(`Account   ${acc.email} · ${acc.display_name} · ${acc.status} · roles: ${(acc.roles || []).join(', ') || '(none)'}`);

  const pid = await getActiveTermId();
  const term = pid ? await AcademicPeriod.findByPk(pid, { attributes: ['id', 'label'] }) : null;
  console.log(`Term      ${term ? term.label + ' (#' + term.id + ')' : 'no active term'}`);
  if (!pid) return;

  const facs = (await Faculty.findAll({ where: { period_id: pid }, attributes: ['id', 'name', 'email', 'status'] }))
    .filter((f) => normalizeEmail(f.email) === acc.email || samePerson(f.name, acc.display_name));
  console.log(`Faculty   ${facs.length ? facs.map((f) => `#${f.id} ${f.name} <${f.email || 'no email'}> ${f.status}`).join(' | ') : 'NOT in this term\'s faculty list (upload the faculty list, or fix the name/email)'}`);

  const progs = (await Program.findAll({ where: { period_id: pid }, attributes: ['id', 'code', 'program_head', 'program_head_id', 'status'] }))
    .filter((p) => facs.some((f) => f.id === p.program_head_id) || samePerson(p.program_head, acc.display_name));
  if (!progs.length) console.log('Programs  heads none in this term (the programs list doesn\'t name them)');
  for (const p of progs) {
    const linked = facs.some((f) => f.id === p.program_head_id);
    console.log(`Programs  ${p.code}: head "${p.program_head}" · ${p.status} · ${linked ? 'linked to faculty #' + p.program_head_id : 'NOT linked (program_head_id = ' + p.program_head_id + ')'}`);
  }

  const shouldBe = progs.some((p) => p.status !== 'Unlisted' && p.status !== 'Archived');
  const has = (acc.roles || []).includes('Program Head');
  console.log(`Verdict   Program Head: ${has ? 'has it' : 'missing'}${shouldBe && !has ? ' — SHOULD have it' : ''}`);

  if (fix) {
    const out = await reconcileProgramHeads(pid);
    await acc.reload();
    console.log(`Fixed     ${out ? out.fixedIds : 0} head link(s), granted ${out ? out.granted.join(', ') || 'none' : 'none'} · roles now: ${(acc.roles || []).join(', ')}`);
  } else if (shouldBe && !has) {
    console.log('Run again with --fix to grant it.');
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => db.sequelize.close());
