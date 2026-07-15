// controllers/courseDetailsController.js
const { Course, ProgramCourseOffering, Prerequisite } = require('../models');

async function getCourseDetailsByPcOffering(req, res) {
    try {
        // Extract parameters from the new route structure
        const { pcId, revNum } = req.params;

        if (!pcId || !revNum) {
            return res.status(400).json({ message: 'pcId and revNum are required' });
        }

        // 1. Fetch the specific version of the Program Course Offering
        const pco = await ProgramCourseOffering.findOne({
            where: {
                pc_offering_id: pcId,
                revision_number: revNum
            },
            include: [{
                model: Course,
                attributes: [
                    'course_id', 'course_no', 'course_title', 'credit',
                    'contact_hrs', 'classification', 'cmo', 'year_lvl', 'term'
                ]
            }]
        });

        if (!pco) return res.status(404).json({ message: 'Program Course Offering version not found' });

        const course = pco.Course;

        // 2. Fetch the prerequisite course details using the retrieved course_id
        const prereqRecords = await Prerequisite.findAll({
            where: { course_id: course.course_id },
            include: [{
                model: Course,
                as: 'PrereqCourse',
                attributes: ['course_no', 'course_title']
            }]
        });

        const prereqTitles = prereqRecords
            .map(r => r.PrereqCourse ? r.PrereqCourse.course_title : null)
            .filter(Boolean);

        const prerequisites = prereqTitles.length ? prereqTitles.join(', ') : '';

        // 3. Construct the response payload maintaining exact previous structure
        const response = {
            code: course.course_no,
            name: course.course_title,
            description: pco.course_description, // Extracted directly from specific PCO version
            credits: course.credit,
            contact: course.contact_hrs,
            prerequisites,
            class: course.classification,
            cmo: course.cmo,
            revision: pco.revision_number,
            year: course.year_lvl,
            sem: course.term
        };

        return res.json(response);
    } catch (err) {
        console.error('getCourseDetailsByPcOffering error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getCourseDetailsByPcOffering };