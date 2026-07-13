// controllers/courseOutcomeAlignmentController.js
const { Course, ProgramCourseOffering, CourseOutcome, ProgramOutcomeAlignment, ProgramOutcome } = require('../models');

async function getCourseProgramOutcomeAlignment(req, res) {
    try {
        const { pcId, revNum } = req.params;
        if (!pcId || !revNum) return res.status(400).json({ message: 'pcId and revNum are required' });

        // 1) Find the specific program course offering and include Course to get its metadata
        const pco = await ProgramCourseOffering.findOne({
            where: { pc_offering_id: pcId, revision_number: revNum },
            include: [{ model: Course, attributes: ['course_id', 'course_no', 'course_title'] }]
        });

        if (!pco) return res.status(404).json({ message: 'Program Course Offering version not found' });
        const course = pco.Course;

        // 2) Fetch program outcomes for the program (ordered by po_id to map PO1..POn)
        const programOutcomes = await ProgramOutcome.findAll({
            where: { program_id: pco.program_id },
            attributes: ['po_id', 'description'],
            order: [['po_id', 'ASC']]
        });

        // Build PO keys (PO1..PO9 or as many as programOutcomes length)
        const poKeys = programOutcomes.map((po, idx) => ({ key: `PO${idx + 1}`, po_id: po.po_id, description: po.description }));

        // 3) Fetch course outcomes for this specific pc_offering_id and include alignments
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pco.pc_offering_id },
            attributes: ['co_id', 'co_description'],
            order: [['co_id', 'ASC']]
        });

        // 4) Fetch all alignments for these course outcomes in one query
        const coIds = courseOutcomes.map(co => co.co_id);
        const alignments = await ProgramOutcomeAlignment.findAll({
            where: { co_id: coIds },
            attributes: ['co_id', 'po_id', 'attainment_level'],
            raw: true
        });

        // 5) Map alignments into a lookup: { co_id: { po_id: attainment_level, ... }, ... }
        const alignmentLookup = {};
        for (const a of alignments) {
            if (!alignmentLookup[a.co_id]) alignmentLookup[a.co_id] = {};
            alignmentLookup[a.co_id][a.po_id] = a.attainment_level;
        }

        // 6) Build response courseOutcomes array with poMappings aligned to poKeys order (PO1..)
        const responseCourseOutcomes = courseOutcomes.map(co => {
            const poMappings = poKeys.map(poKey => {
                const level = alignmentLookup[co.co_id] ? alignmentLookup[co.co_id][poKey.po_id] : null;
                return level || '';
            });
            return {
                id: co.co_id,
                description: co.co_description,
                poMappings
            };
        });

        // 7) Build programOutcomes array for frontend headers (PO1..POn with descriptions)
        const responseProgramOutcomes = poKeys.map(poKey => ({
            key: poKey.key,
            po_id: poKey.po_id,
            description: poKey.description
        }));

        return res.json({
            course: { code: course.course_no, title: course.course_title },
            programOutcomes: responseProgramOutcomes,
            courseOutcomes: responseCourseOutcomes
        });
    } catch (err) {
        console.error('getCourseProgramOutcomeAlignment error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getCourseProgramOutcomeAlignment };