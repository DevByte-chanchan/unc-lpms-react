// controllers/referenceController.js
const { Reference, sequelize, Sequelize } = require('../models');

async function getAllReferences(req, res) {
    try {
        const refs = await Reference.findAll({
            order: [['title', 'ASC']],
            raw: true
        });
        return res.json(refs);
    } catch (err) {
        console.error('getAllReferences error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function createReference(req, res) {
    try {
        const { title, type, author, isbn, link, publication_year } = req.body;
        if (!title || !type) return res.status(400).json({ message: 'title and type are required' });

        const created = await Reference.create({
            title,
            type,
            author: author || null,
            isbn: isbn || null,
            link: link || null,
            publication_year: publication_year ? new Date(publication_year) : null
        });

        return res.status(201).json(created);
    } catch (err) {
        console.error('createReference error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

/**
 * GET /api/references/library
 * Reference Library source of truth: every reference in the database plus the
 * list of courses that actually use it (via ILOReferences → ILO → CO → Offering).
 */
async function getReferenceLibrary(req, res) {
    try {
        const rows = await sequelize.query(
            `SELECT
                 r.reference_id,
                 r.title,
                 r.type,
                 r.author,
                 r.isbn,
                 r.link,
                 r.publication_year,
                 r.createdAt,
                 GROUP_CONCAT(DISTINCT crs.course_no) AS used_in_courses
             FROM \`References\` r
                 LEFT JOIN ILOReferences ir ON ir.reference_id = r.reference_id
                 LEFT JOIN IntendedLearningOutcomes ilo ON ilo.ilo_id = ir.ilo_id
                 LEFT JOIN CourseOutcomes co ON co.co_id = ilo.co_id
                 LEFT JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = co.pc_offering_id
                 LEFT JOIN Courses crs ON crs.course_id = pco.course_id
             GROUP BY r.reference_id
             ORDER BY r.title ASC;`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        return res.json(rows);
    } catch (err) {
        console.error('getReferenceLibrary error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getAllReferences, createReference, getReferenceLibrary };
