/**
 * Older uploads stored the registrar's ALL-CAPS names on course assignments
 * ("HIGGINS BOWEN"). Rewrite each to the Faculty list's spelling when it
 * matches someone, else to normal case. Idempotent: a name that already has
 * lowercase letters is never touched, so this is safe on every boot.
 */
import db from '../models/index.js';
import { displayName } from './nameCase.js';
import { matchFacultyName } from './officialMatch.js';
import { safeWhere } from './dbHelpers.js';

const isAllCaps = (s) => typeof s === 'string' && /\p{Lu}/u.test(s) && !/\p{Ll}/u.test(s);

export async function fixAllCapsAssignmentNames() {
  const { CourseOfferingAssignment, Faculty } = db;
  if (!CourseOfferingAssignment || !Faculty) return 0;
  const rows = await CourseOfferingAssignment.findAll();
  const facultyByPeriod = new Map();
  const listFor = async (periodId) => {
    if (!facultyByPeriod.has(periodId)) {
      const where = periodId != null ? await safeWhere(Faculty, { period_id: periodId }) : {};
      facultyByPeriod.set(periodId, await Faculty.findAll({ where, attributes: ['id', 'name'] }));
    }
    return facultyByPeriod.get(periodId);
  };
  let fixed = 0;
  for (const row of rows) {
    const list = await listFor(row.period_id ?? null);
    const fix = (name, id) => {
      if (!isAllCaps(name)) return name;
      const byId = id != null ? list.find((f) => f.id === id) : null;
      const match = byId || matchFacultyName(name, list);
      return match ? match.name : displayName(name);
    };
    const patch = {};
    const lead = fix(row.faculty_name, row.faculty_id);
    if (lead !== row.faculty_name) patch.faculty_name = lead;
    for (const field of ['contributors', 'sections']) {
      const arr = row.get(field);
      if (!Array.isArray(arr)) continue;
      let changed = false;
      const next = arr.map((p) => {
        if (!p || typeof p !== 'object') return p;
        const n = fix(p.faculty_name, p.faculty_id);
        if (n === p.faculty_name) return p;
        changed = true;
        return { ...p, faculty_name: n };
      });
      if (changed) patch[field] = next;
    }
    if (Object.keys(patch).length) {
      await row.update(patch, { hooks: false, silent: true });
      fixed += 1;
    }
  }
  return fixed;
}
