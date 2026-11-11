'use strict';

// Is a program's documentation ready for learning plans? A plan aligns its course outcomes to the program's POs,
// and the front pages are generated from the PEOs and POs, so before any plan of the program is started:
//   - the program has its program outcomes (POs)
//   - it has its program educational objectives (PEOs)
//   - every PO supports at least one PEO
// An uploaded front-pages PDF is optional: without one the exports use the generated pages.
// PO numbers are the order of po_id; PEO links are 1-based PEO numbers (controllers/programOutcomeController.js).

const parseNumbers = (text) => { try { const list = JSON.parse(text); return Array.isArray(list) ? list : []; } catch { return []; } };

const programReadiness = async (sequelize, programId, transaction) => {
    const select = (sql) => sequelize.query(sql, { replacements: [programId], type: sequelize.QueryTypes.SELECT, transaction });
    const [pos, [{ n: peos }]] = await Promise.all([
        select('SELECT po_id, peo_numbers FROM ProgramOutcomes WHERE program_id = ? ORDER BY po_id'),
        select('SELECT COUNT(*) AS n FROM ProgramEducationalObjectives WHERE program_id = ?'),
    ]);
    const unlinked = pos
        .map((po, index) => ({ label: `PO${index + 1}`, linked: parseNumbers(po.peo_numbers).some(n => Number(n) >= 1 && Number(n) <= Number(peos)) }))
        .filter(po => !po.linked)
        .map(po => po.label);
    const missing = [
        !pos.length && 'program outcomes (POs)',
        !Number(peos) && 'program educational objectives (PEOs)',
        pos.length && Number(peos) && unlinked.length && `a PEO for ${unlinked.join(', ')}`,
    ].filter(Boolean);
    return { pos: pos.length, peos: Number(peos), unlinked, missing, complete: missing.length === 0 };
};

module.exports = { programReadiness };
