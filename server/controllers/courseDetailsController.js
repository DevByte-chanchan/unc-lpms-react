// controllers/courseDetailsController.js
const { getCourseDetails: getStaticCourseDetails } = require('../utils/staticData');
const { Course, ProgramCourseOffering, Prerequisite } = require('../models');

async function getCourseDetailsByCourseCode(req, res) {
    try {
        const courseCode = req.params.courseCode;
        if (!courseCode) return res.status(400).json({ message: 'courseCode is required' });

        const course = await Course.findOne({
            where: { course_no: courseCode },
            attributes: [
                'course_id',
                'course_no',
                'course_title',
                'credit',
                'contact_hrs',
                'classification',
                'cmo',
                'year_lvl',
                'term'
            ]
        });
        if (!course) {
            const fallback = getStaticCourseDetails(courseCode);
            if (fallback) return res.json(fallback);
            return res.status(404).json({ message: 'Course not found' });
        }

        const pco = await ProgramCourseOffering.findOne({
            where: { course_id: course.course_id },
            attributes: ['pc_offering_id', 'revision_number', 'course_description', 'program_id', 'dept_id'],
            order: [['revision_number', 'DESC']]
        });

        // include the prerequisite course details
        const prereqRecords = await Prerequisite.findAll({
            where: { course_id: course.course_id },
            include: [{ model: Course, as: 'PrereqCourse', attributes: ['course_no', 'course_title'] }]
        });

        const prereqTitles = prereqRecords
            .map(r => r.PrereqCourse ? r.PrereqCourse.course_title : null)
            .filter(Boolean);

        const prerequisites = prereqTitles.length ? prereqTitles.join(', ') : '';

        const response = {
            code: course.course_no,
            name: course.course_title,
            description: pco ? pco.course_description : '',
            credits: course.credit,
            contact: course.contact_hrs,
            prerequisites,
            class: course.classification,
            cmo: course.cmo,
            revision: pco ? pco.revision_number : 0,
            year: course.year_lvl,
            sem: course.term
        };

        return res.json(response);
    } catch (err) {
        console.error('getCourseDetailsByCourseCode error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getCourseDetailsByCourseCode };
