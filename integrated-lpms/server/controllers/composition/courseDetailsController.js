// controllers/courseDetailsController.js
const { Course, ProgramCourseOffering, Prerequisite } = require('../../models');
const { findOfferingByPcIdAndRev, markOfferingModified } = require('../../utils/versionHelper');

async function getCourseDetailsByPcOffering(req, res) {
    try {
        // Extract parameters from the route structure
        const { pcId, revNum } = req.params;

        if (!pcId || !revNum) {
            return res.status(400).json({ message: 'pcId and revNum are required' });
        }

        // 1. Fetch the specific version of the Program Course Offering
        const pco = await findOfferingByPcIdAndRev(pcId, revNum, {
            include: [{
                model: Course,
                as: 'Course',
                attributes: [
                    'course_id', 'course_no', 'course_title', 'credit',
                    'contact_hrs', 'classification', 'cmo', 'year_lvl', 'term'
                ]
            }]
        });

        if (!pco) return res.status(404).json({ message: 'Program Course Offering version not found' });

        const course = pco.Course;

        // 2. Fetch the prerequisite course details using the retrieved course_id
        let prerequisites = '';
        if (course && course.course_id) {
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

            prerequisites = prereqTitles.length ? prereqTitles.join(', ') : '';
        }

        // 3. Construct the response payload
        const response = {
            code: course ? course.course_no : '',
            name: course ? course.course_title : '',
            description: pco.course_description || '',
            credits: course ? course.credit : '',
            contact: course ? course.contact_hrs : '',
            prerequisites,
            class: course ? course.classification : '',
            cmo: course ? course.cmo : '',
            revision: pco.revision_number,
            year: course ? course.year_lvl : '',
            sem: course ? course.term : ''
        };

        return res.json(response);
    } catch (err) {
        console.error('getCourseDetailsByPcOffering error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateCourseDetailsByPcOffering(req, res) {
    try {
        const { pcId, revNum } = req.params;
        const { code, name, description, credits, contact, prerequisites, class: classification, cmo, year, sem } = req.body;

        if (!pcId || !revNum) return res.status(400).json({ message: 'pcId and revNum are required' });

        const pco = await findOfferingByPcIdAndRev(pcId, revNum, {
            include: [{ model: Course, as: 'Course' }]
        });

        if (!pco) return res.status(404).json({ message: 'Program Course Offering version not found' });

        let hasAnyChanges = false;
        // Update ProgramCourseOffering (course_description)
        if (description !== undefined && description !== pco.course_description) {
            pco.course_description = description;
            await pco.save();
            hasAnyChanges = true;
        }

        // Update Course if other fields were provided
        const course = pco.Course;
        if (course) {
            let hasCourseChanges = false;
            if (code !== undefined && code !== course.course_no) { course.course_no = code; hasCourseChanges = true; }
            if (name !== undefined && name !== course.course_title) { course.course_title = name; hasCourseChanges = true; }
            if (credits !== undefined && String(credits) !== String(course.credit)) { course.credit = credits; hasCourseChanges = true; }
            if (contact !== undefined && contact !== course.contact_hrs) { course.contact_hrs = contact; hasCourseChanges = true; }
            if (classification !== undefined && classification !== course.classification) { course.classification = classification; hasCourseChanges = true; }
            if (cmo !== undefined && cmo !== course.cmo) { course.cmo = cmo; hasCourseChanges = true; }
            if (year !== undefined && year !== course.year_lvl) { course.year_lvl = year; hasCourseChanges = true; }
            if (sem !== undefined && sem !== course.term) { course.term = sem; hasCourseChanges = true; }

            if (hasCourseChanges) {
                await course.save();
                hasAnyChanges = true;
            }
        }

        if (hasAnyChanges) {
            await markOfferingModified(pco.pc_offering_id);
        }

        return res.json({ message: 'Successfully updated', description: pco.course_description });
    } catch (err) {
        console.error('updateCourseDetails error:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}

module.exports = { getCourseDetailsByPcOffering, updateCourseDetailsByPcOffering };
