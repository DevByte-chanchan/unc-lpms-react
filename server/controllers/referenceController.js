// controllers/referenceController.js
const { Reference } = require('../models');

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

module.exports = { getAllReferences, createReference };
