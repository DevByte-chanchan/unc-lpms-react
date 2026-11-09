// controllers/courseDetailsController.js
const { Course, ProgramCourseOffering, Prerequisite } = require('../models');

async function getCourseDetailsByPcOffering(req, res) {
    try {
        // Extract parameters from the route structure
        const { pcId, revNum } = req.params;

        if (!pcId) {
            return res.status(400).json({ message: 'pcId is required' });
        }

        // 1. Fetch the specific version of the Program Course Offering
        const pco = await ProgramCourseOffering.findOne({
            where: {
                pc_offering_id: pcId,
                ...(revNum ? { revision_number: revNum } : {})
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
            // 0 in the database means no revision number yet (a working copy the Dean has not approved).
            revision: pco.revision_number > 0 ? pco.revision_number : null,
            schoolYear: pco.school_year,
            semester: pco.semester,
            carriedOver: !!pco.carried_from_offering_id,
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

        if (!pcId) return res.status(400).json({ message: 'pcId is required' });

        const pco = await ProgramCourseOffering.findOne({
            where: { pc_offering_id: pcId, ...(revNum ? { revision_number: revNum } : {}) },
            include: [Course]
        });

        if (!pco) return res.status(404).json({ message: 'Program Course Offering version not found' });

        // Update ProgramCourseOffering (course_description)
        if (description !== undefined) {
            pco.course_description = description;
            await pco.save();
        }

        // The Course row is the shared catalog entry (every program, term and revision of this course reads it),
        // so an instructor's plan edit never changes it: only the description above is saved. The fields stay
        // readable here for when an owner of the catalog gets an editor of their own.
        const catalogEditAllowed = false;
        void prerequisites;
        const course = pco.Course;
        if (course && catalogEditAllowed) {
            let hasCourseChanges = false;
            if (code !== undefined) { course.course_no = code; hasCourseChanges = true; }
            if (name !== undefined) { course.course_title = name; hasCourseChanges = true; }
            if (credits !== undefined) { course.credit = credits; hasCourseChanges = true; }
            if (contact !== undefined) { course.contact_hrs = contact; hasCourseChanges = true; }
            if (classification !== undefined) { course.classification = classification; hasCourseChanges = true; }
            if (cmo !== undefined) { course.cmo = cmo; hasCourseChanges = true; }
            if (year !== undefined) { course.year_lvl = year; hasCourseChanges = true; }
            if (sem !== undefined) { course.term = sem; hasCourseChanges = true; }

            if (hasCourseChanges) {
                await course.save();
            }
        }

        return res.json({ message: 'Successfully updated', description: pco.course_description });
    } catch (err) {
        console.error('updateCourseDetails error:', err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
}

module.exports = { getCourseDetailsByPcOffering, updateCourseDetailsByPcOffering };
