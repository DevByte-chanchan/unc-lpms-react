/**
 * Version bookkeeping for university_statements and department_statements.
 * Takes the model as an argument so the tests can run it against a scratch
 * table instead of the live one.
 *
 * Invariant: at most one row is 'Active' per SCOPE. The university passes no
 * scope (one Active row in the table); departments pass { department_code },
 * so each department has its own Active row and saving one never touches
 * another's. A save marks the scope's current Active row 'Superseded' and
 * inserts the new one in the SAME transaction. Rows are never edited
 * otherwise — restore copies an old version forward as a new row.
 */
export const CONTENT_FIELDS = ['vision', 'mission', 'educational_policy', 'core_values', 'graduate_attributes'];

export function findActiveVersion(Model, opts = {}, scope = {}) {
  return Model.findOne({ where: { ...scope, status: 'Active' }, order: [['createdAt', 'DESC'], ['id', 'DESC']], ...opts });
}

export function saveNewVersion(Model, values, meta = {}, scope = {}) {
  return Model.sequelize.transaction(async (t) => {
    await Model.update({ status: 'Superseded' }, { where: { ...scope, status: 'Active' }, transaction: t });
    return Model.create({ ...values, ...meta, ...scope, status: 'Active' }, { transaction: t });
  });
}

/**
 * Copy version `id` forward as the new Active row. Resolves null if it doesn't
 * exist. `scopeFields` names the columns that scope versioning (e.g.
 * ['department_code']); the copy stays in the old row's scope.
 */
export async function restoreVersion(Model, id, { uploaded_by, contentFields = CONTENT_FIELDS, scopeFields = [] } = {}) {
  const old = await Model.findByPk(id);
  if (!old) return null;
  const values = {};
  for (const f of contentFields) values[f] = old[f];
  const scope = {};
  for (const f of scopeFields) scope[f] = old[f];
  return saveNewVersion(Model, values, {
    source_filename: old.source_filename,
    source_sha256: old.source_sha256,
    uploaded_by: uploaded_by || old.uploaded_by,
  }, scope);
}
