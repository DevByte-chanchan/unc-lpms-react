// controllers/referenceSummaryController.js
const {
    CourseOutcome,
    Week,
    Reference,
    WeeklyReference
} = require('../models');

exports.getReferenceSummary = async (req, res, next) => {
    const { pcId, revNum } = req.params;

    if (!pcId || !revNum) {
        return res.status(400).json({ error: "Missing versioning configuration identifiers." });
    }

    try {
        // 1. Target CO records directly using pc_offering_id
        const courseOutcomes = await CourseOutcome.findAll({
            where: { pc_offering_id: pcId },
            order: [['co_id', 'ASC']]
        });
        const coIds = courseOutcomes.map(co => co.co_id || co.id);
        if (coIds.length === 0) {
            return res.status(200).json({
                references: [],
                Textbook: [],
                "Open Educational Resources": [],
                "Online Resources": []
            });
        }

        // 2. Find Weeks matching the parent COs in chronological order
        const weeks = await Week.findAll({
            where: { co_id: coIds },
            order: [['co_id', 'ASC'], ['week_id', 'ASC']]
        });
        const weekIds = weeks.map(w => w.week_id || w.id);
        if (weekIds.length === 0) {
            return res.status(200).json({
                references: [],
                Textbook: [],
                "Open Educational Resources": [],
                "Online Resources": []
            });
        }

        // 3. Fetch References via WeeklyReference junction table
        const rawReferences = await WeeklyReference.findAll({
            where: { week_id: weekIds },
            include: [{
                model: Reference,
                as: WeeklyReference.associations && WeeklyReference.associations.Reference
                    ? 'Reference'
                    : (WeeklyReference.associations && WeeklyReference.associations.reference ? 'reference' : 'Reference'),
                required: true
            }],
            order: [['week_id', 'ASC'], ['is_orientation', 'DESC'], ['weekly_reference_id', 'ASC']]
        });

        // 4. Deduplication and Categorization (preserving chronological appearance order for TB1, OER1, OR1)
        const seenReferenceIds = new Set();
        const textbooks = [];
        const oer = [];
        const onlineResources = [];
        const allReferences = [];
        const currentYear = new Date().getFullYear();

        rawReferences.forEach(item => {
            const ref = item.Reference || item.reference;
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

                const parsedYearNum = Number(cleanYear);
                const isDeprecated = Boolean(
                    (ref.type || '').toLowerCase().includes('textbook') &&
                    cleanYear !== '-' &&
                    !isNaN(parsedYearNum) &&
                    (currentYear - parsedYearNum >= 5)
                );

                const structuredRef = {
                    id: refId,
                    weekId: item.week_id,
                    weeklyReferenceId: item.weekly_reference_id,
                    title: ref.title || ref.name || 'Untitled',
                    authors: ref.author || ref.authors || 'N/A',
                    isbn: ref.isbn || ref.isbn_no || '-',
                    link: ref.link || ref.url || '#',
                    year: cleanYear,
                    type: ref.type || 'Textbook',
                    is_deprecated: isDeprecated
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
