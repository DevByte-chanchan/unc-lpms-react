'use strict';

// Cleanup for databases seeded before the demo data was cut to two programs. Removes the named
// programs (with their PEOs and program outcomes) only when nothing uses them: no course offering
// and no course outcome aligned to one of their program outcomes. Anything in use is kept and
// reported. Dry run unless `apply` is true.

const LEGACY_PROGRAMS = Object.freeze([
    'Associate in Computer Technology',
    'Bachelor of Library and Information Science',
    'Bachelor of Science in Accountancy',
    'Bachelor of Science in Civil Engineering'
]);

const removeUnusedPrograms = async ({ names = LEGACY_PROGRAMS, apply = false, models = require('../models') } = {}) => {
    const { sequelize, Program, ProgramOutcome, ProgramOutcomeAlignment, ProgramEducationalObjective, ProgramCourseOffering } = models;
    const report = { removed: [], kept: [], missing: [] };

    await sequelize.transaction(async (transaction) => {
        for (const name of names) {
            const program = await Program.findOne({ where: { name }, transaction });
            if (!program) { report.missing.push(name); continue; }

            const offerings = await ProgramCourseOffering.count({ where: { program_id: program.program_id }, transaction });
            const outcomeIds = (await ProgramOutcome.findAll({ where: { program_id: program.program_id }, attributes: ['po_id'], raw: true, transaction })).map(o => o.po_id);
            const aligned = outcomeIds.length ? await ProgramOutcomeAlignment.count({ where: { po_id: outcomeIds }, transaction }) : 0;
            if (offerings > 0 || aligned > 0) {
                report.kept.push({ name, reason: offerings > 0 ? `${offerings} course offering(s)` : `${aligned} aligned course outcome(s)` });
                continue;
            }
            if (apply) {
                await ProgramEducationalObjective.destroy({ where: { program_id: program.program_id }, transaction });
                await ProgramOutcome.destroy({ where: { program_id: program.program_id }, transaction });
                await program.destroy({ transaction });
            }
            report.removed.push(name);
        }
    });
    return report;
};

module.exports = { removeUnusedPrograms, LEGACY_PROGRAMS };
