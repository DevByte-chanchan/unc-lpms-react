// controllers/referenceSummaryController.js
const {
    Course,
    ProgramCourseOffering,
    CourseOutcome,
    IntendedLearningOutcome,
    ILOTopic,
    Topic,
    Subtopic,
    TopicTLA,
    TeachingAndLearningActivity,
    TLAAssessment,
    Reference,
    ILOReference
} = require('../models');
const { Op } = require('sequelize');

exports.getReferenceSummary = async (req, res, next) => {
    const courseCode = req.params.code;

    if (!courseCode) {
        return res.status(400).json({
            error: "Missing course identification parameter. Please verify your API endpoint route configurations."
        });
    }

    try {
        // Step 1: Query against 'course_no' (Identical to Course Coverage)
        const courseRecord = await Course.findOne({
            where: { course_no: courseCode }
        });

        if (!courseRecord) {
            return res.status(200).json({ references: [], Textbook: [], "Open Educational Resources": [], "Online Resources": [] });
        }
        const courseId = courseRecord.course_id || courseRecord.id;

        // Step 2: Get pc_offering_id (Identical to Course Coverage)
        const offering = await ProgramCourseOffering.findOne({
            where: { course_id: courseId }
        });

        if (!offering) {
            return res.status(200).json({ references: [], Textbook: [], "Open Educational Resources": [], "Online Resources": [] });
        }
        const pcOfferingId = offering.pc_offering_id || offering.id;

        // Step 3: Retrieve matching co_id records (Identical to Course Coverage)
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcOfferingId }
        });

        const coIds = courseOutcomes.map(co => co.co_id || co.id);
        if (coIds.length === 0) {
            return res.status(200).json({ references: [], Textbook: [], "Open Educational Resources": [], "Online Resources": [] });
        }

        // Step 4: Retrieve all IntendedLearningOutcomes (Identical to Course Coverage)
        const ilos = await IntendedLearningOutcome.findAll({
            where: { co_id: coIds },
            order: [['ilo_id', 'ASC']]
        });

        const iloIds = ilos.map(ilo => ilo.ilo_id);
        if (iloIds.length === 0) {
            return res.status(200).json({ references: [], Textbook: [], "Open Educational Resources": [], "Online Resources": [] });
        }

        // Step 5: Collect references using the exact same structural query from Course Coverage
        let rawReferences = [];
        if (ILOReference && Reference) {
            rawReferences = await ILOReference.findAll({
                where: { ilo_id: iloIds },
                include: [{ model: Reference, required: true }],
                order: [['ilo_reference_id', 'ASC']]
            });
        }

        // Global arrays to track deduplication in exact global sequence
        const seenReferenceIds = new Set();
        const textbooks = [];
        const oer = [];
        const onlineResources = [];
        const allReferences = [];

        // Step 6: Sequential structural traversal loop mapping directly to your frontend table criteria
        rawReferences.forEach(item => {
            const ref = item.Reference || item;
            const refId = ref.reference_id || ref.id;
            const mapKey = `${refId}`;

            if (!seenReferenceIds.has(mapKey)) {
                seenReferenceIds.add(mapKey);

                // Extract safe fallback variables matching your model fields
                const title = ref.title || ref.name || 'Untitled Document';
                const authors = ref.authors || ref.author || ref.publisher || 'Author Not Specified';
                const isbn = ref.isbn || ref.isbn_no || '-';
                const link = ref.link || ref.url || ref.uri || '#';
                const year = ref.year || ref.publication_year || ref.pub_year || '-';
                const rawType = ref.type ? ref.type.trim().toLowerCase() : '';

                const structuredRef = {
                    id: refId,
                    title,
                    authors,
                    isbn,
                    link,
                    year
                };

                // Distribute items into category buckets based on type matching
                if (rawType.includes('textbook') || rawType.includes('reference book') || rawType.includes('reference_book') || rawType.includes('rb')) {
                    structuredRef.type = 'Textbook';
                    textbooks.push(structuredRef);
                } else if (rawType.includes('open educational') || rawType.includes('oer') || rawType.includes('oe')) {
                    structuredRef.type = 'Open Educational Resources';
                    oer.push(structuredRef);
                } else if (rawType.includes('online')) {
                    structuredRef.type = 'Online Resources';
                    onlineResources.push(structuredRef);
                } else {
                    // Fallback to Textbook classification matrix to prevent layout omission
                    structuredRef.type = 'Textbook';
                    textbooks.push(structuredRef);
                }

                allReferences.push(structuredRef);
            }
        });

        // Step 7: Send structured payload back to the client interface
        return res.status(200).json({
            references: allReferences,
            Textbook: textbooks,
            "Open Educational Resources": oer,
            "Online Resources": onlineResources
        });

    } catch (error) {
        next(error);
    }
};