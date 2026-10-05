// controllers/iloController.js
const { Course, ProgramCourseOffering, CourseOutcome, IntendedLearningOutcome } = require('../models');
const { IED_LEVELS } = require('../utils/iedRule');

async function getILOsByPcOffering(req, res) {
    try {
        const { pcId, revNum } = req.params;
        if (!pcId || !revNum) {
            return res.status(400).json({ message: 'pcId and revNum are required' });
        }

        // 1) Find the program course offering version and include course configuration details
        const pco = await ProgramCourseOffering.findOne({
            where: { pc_offering_id: pcId, revision_number: revNum },
            include: [{ model: Course, attributes: ['course_id', 'course_no'] }]
        });

        if (!pco) {
            return res.status(404).json({ message: 'Program course offering version not found' });
        }
        const course = pco.Course;

        // 2) Get course outcomes specifically bound to this pc_offering_id
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcId },
            attributes: ['co_id', 'pc_offering_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        // 3) Get all ILOs for those course outcomes
        const coIds = courseOutcomes.map(co => co.co_id);
        const ilos = await IntendedLearningOutcome.findAll({
            where: { co_id: coIds },
            attributes: ['ilo_id', 'co_id', 'description', 'hours', 'weeks', 'ied_level', 'is_orientation', 'target_students_percent', 'target_score_percent'],
            order: [['co_id', 'ASC'], ['ilo_id', 'ASC']]
        });

        // 4) Group ILOs by co_id
        const ilosByCo = {};
        for (const ilo of ilos) {
            if (!ilosByCo[ilo.co_id]) ilosByCo[ilo.co_id] = [];
            ilosByCo[ilo.co_id].push({
                id: ilo.ilo_id,
                co_id: ilo.co_id,
                description: ilo.description,
                hours: ilo.hours,
                weeks: ilo.weeks,
                ied_level: ilo.ied_level,
                is_orientation: !!ilo.is_orientation,
                target_students_percent: ilo.target_students_percent,
                target_score_percent: ilo.target_score_percent,
            });
        }

        const resultCourseOutcomes = courseOutcomes.map(co => ({
            co_id: co.co_id,
            pc_offering_id: co.pc_offering_id,
            description: co.co_description,
            ilos: ilosByCo[co.co_id] || []
        }));

        return res.json({
            course: { course_id: course.course_id, course_no: course.course_no },
            courseOutcomes: resultCourseOutcomes
        });
    } catch (err) {
        console.error('getILOsByPcOffering error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// PUT /api/ilos/:ilo_id — edit an ILO's text, IED level and COAEP performance
// target. Only the fields present in the body change.
const MAX_DESCRIPTION = 500;
const MIN_DESCRIPTION = 10;

const percent = value => {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    return Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
};

async function updateIlo(req, res) {
    try {
        const ilo = await IntendedLearningOutcome.findByPk(req.params.ilo_id);
        if (!ilo) return res.status(404).json({ message: 'ILO not found' });

        const body = req.body || {};
        const changes = {};

        if (body.description !== undefined) {
            const description = String(body.description ?? '').replace(/\s+/g, ' ').trim();
            if (description.length < MIN_DESCRIPTION) {
                return res.status(400).json({ message: `Description must be at least ${MIN_DESCRIPTION} characters.` });
            }
            if (description.length > MAX_DESCRIPTION) {
                return res.status(400).json({ message: `Description must be at most ${MAX_DESCRIPTION} characters.` });
            }
            changes.description = description;
        }

        if (body.ied_level !== undefined) {
            const level = body.ied_level === '' ? null : body.ied_level;
            if (level !== null && !IED_LEVELS.includes(level)) {
                return res.status(400).json({ message: 'IED level must be I, E or D.' });
            }
            if (level !== null && ilo.is_orientation) {
                return res.status(400).json({ message: 'An orientation ILO has no IED level.' });
            }
            changes.ied_level = level;
        }

        for (const field of ['target_students_percent', 'target_score_percent']) {
            if (body[field] === undefined) continue;
            const value = percent(body[field]);
            if (value === null) {
                return res.status(400).json({ message: `${field.replace(/_/g, ' ')} must be a whole number from 1 to 100.` });
            }
            changes[field] = value;
        }

        if (Object.keys(changes).length === 0) {
            return res.status(400).json({ message: 'Nothing to update.' });
        }

        await ilo.update(changes);
        return res.json({
            id: ilo.ilo_id,
            co_id: ilo.co_id,
            description: ilo.description,
            hours: ilo.hours,
            weeks: ilo.weeks,
            ied_level: ilo.ied_level,
            target_students_percent: ilo.target_students_percent,
            target_score_percent: ilo.target_score_percent
        });
    } catch (err) {
        console.error('updateIlo error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getILOsByPcOffering, updateIlo };
