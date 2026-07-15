// controllers/iloController.js
const { Course, ProgramCourseOffering, CourseOutcome, IntendedLearningOutcome } = require('../models');

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
            attributes: ['ilo_id', 'co_id', 'description', 'hours'],
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
                hours: ilo.hours
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

module.exports = { getILOsByPcOffering };