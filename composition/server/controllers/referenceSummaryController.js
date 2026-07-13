// controllers/referenceSummaryController.js
const {
    CourseOutcome,
    IntendedLearningOutcome,
    Reference,
    ILOReference
} = require('../models');

exports.getReferenceSummary = async (req, res, next) => {
    const { pcId, revNum } = req.params;

    if (!pcId || !revNum) {
        return res.status(400).json({ error: "Missing versioning configuration identifiers." });
    }

    try {
        // Direct Query: Skip Course discovery hooks and target CO records directly using pc_offering_id version
        const courseOutcomes = await CourseOutcome.findAll({ where: { pc_offering_id: pcId } });
        const coIds = courseOutcomes.map(co => co.co_id || co.id);
        if (coIds.length === 0) return res.status(200).json({ references: [], Textbook: [], "Open Educational Resources": [], "Online Resources": [] });

        // Find ILOs matching the parent COs
        const ilos = await IntendedLearningOutcome.findAll({ where: { co_id: coIds } });
        const iloIds = ilos.map(ilo => ilo.ilo_id);
        if (iloIds.length === 0) return res.status(200).json({ references: [], Textbook: [], "Open Educational Resources": [], "Online Resources": [] });

        // Fetch References via Junction Table (ILOReference)
        const rawReferences = await ILOReference.findAll({
            where: { ilo_id: iloIds },
            include: [{
                model: Reference,
                as: 'Reference',
                required: true
            }]
        });

        // Deduplication and Categorization
        const seenReferenceIds = new Set();
        const textbooks = [];
        const oer = [];
        const onlineResources = [];
        const allReferences = [];

        rawReferences.forEach(item => {
            const ref = item.Reference;
            if (!ref) return;

            const refId = ref.reference_id || ref.id;

            if (refId && !seenReferenceIds.has(refId)) {
                seenReferenceIds.add(refId);

                let cleanYear = '-';
                if (ref.publication_year) {
                    const dateObj = new Date(ref.publication_year);
                    cleanYear = !isNaN(dateObj) ? dateObj.getFullYear() : ref.publication_year;
                } else if (ref.year) {
                    cleanYear = ref.year;
                }

                const structuredRef = {
                    id: refId,
                    title: ref.title || ref.name || 'Untitled',
                    authors: ref.author || ref.authors || 'N/A',
                    isbn: ref.isbn || ref.isbn_no || '-',
                    link: ref.link || ref.url || '#',
                    year: cleanYear,
                    type: ref.type || 'Textbook'
                };

                const typeKey = (ref.type || '').toLowerCase();
                if (typeKey.includes('oer') || typeKey.includes('open')) {
                    structuredRef.type = 'Open Educational Resources';
                    oer.push(structuredRef);
                } else if (typeKey.includes('online')) {
                    structuredRef.type = 'Online Resources';
                    onlineResources.push(structuredRef);
                } else {
                    structuredRef.type = 'Textbook';
                    textbooks.push(structuredRef);
                }

                allReferences.push(structuredRef);
            }
        });

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