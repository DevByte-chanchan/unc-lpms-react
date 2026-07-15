// controllers/iloController.js
const { getILOs: getStaticILOs } = require('../utils/staticData');
const { Course, ProgramCourseOffering, CourseOutcome, IntendedLearningOutcome } = require('../models');

async function getILOsByCourseCode(req, res) {
    try {
        const courseCode = req.params.courseCode;
        if (!courseCode) {
            return res.status(400).json({ message: 'courseCode is required' });
        }

        // 1) find course by course_no
        const course = await Course.findOne({
            where: { course_no: courseCode },
            attributes: ['course_id', 'course_no']
        });
        if (!course) {
            const fallback = getStaticILOs(courseCode);
            if (fallback) return res.json(fallback);
            return res.status(404).json({ message: 'Course not found' });
        }

        // 2) find program course offering(s) for that course_id
        const pcos = await ProgramCourseOffering.findAll({
            where: { course_id: course.course_id },
            attributes: ['pc_offering_id']
        });
        if (!pcos || pcos.length === 0) {
            const fallback = getStaticILOs(courseCode);
            if (fallback) return res.json(fallback);
            return res.status(404).json({ message: 'Program course offering not found for this course' });
        }

        // Collect pc_offering_ids (there may be multiple offerings; we will gather outcomes for all)
        const pcOfferingIds = pcos.map(p => p.pc_offering_id);

        // 3) get course outcomes for those pc_offering_ids (expect 4)
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcOfferingIds },
            attributes: ['co_id', 'pc_offering_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        // 4) get all ILOs for those course outcomes
        const coIds = courseOutcomes.map(co => co.co_id);
        const ilos = await IntendedLearningOutcome.findAll({
            where: { co_id: coIds },
            attributes: ['ilo_id', 'co_id', 'description', 'hours'],
            order: [['co_id', 'ASC'], ['ilo_id', 'ASC']]
        });

        // 5) group ILOs by co_id
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

        if (courseOutcomes.length === 0) {
            const fallback = getStaticILOs(courseCode);
            if (fallback) return res.json(fallback);
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
        console.error('getILOsByCourseCode error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getILOsByCourseCode };
