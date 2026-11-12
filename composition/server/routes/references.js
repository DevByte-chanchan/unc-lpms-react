// routes/references.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/referenceController');
const { requirePermission } = require('../middleware/auth');

// Reads: any signed-in role.
// GET /api/references/types — field definitions per type (the form is built from this)
router.get('/types', controller.getReferenceTypes);
// GET /api/references — selectable (non-archived) references; ?includeArchived=1 for all
router.get('/', controller.getAllReferences);
// GET /api/references/library — all references + which courses use them (Reference Library)
router.get('/library', controller.getReferenceLibrary);
// GET /api/references/isbn/:isbn — title, authors, publisher, year from Open Library (utils/isbnLookup.js)
router.get('/isbn/:isbn', async (req, res) => {
    const { normalizeIsbn, lookupIsbn } = require('../utils/isbnLookup');
    const isbn = normalizeIsbn(req.params.isbn);
    if (!isbn) return res.status(400).json({ error: 'This is not a valid ISBN-10 or ISBN-13. Check the digits.' });
    try {
        const book = await lookupIsbn(isbn);
        return book ? res.json(book) : res.status(404).json({ error: 'Open Library has no book with this ISBN. Fill the fields by hand.' });
    } catch (err) {
        console.warn('ISBN lookup failed:', err.message);
        return res.status(502).json({ error: 'Open Library could not be reached. Try again, or fill the fields by hand.' });
    }
});
router.get('/:id', controller.getReference);

// Writes: reference:manage (the Director of Libraries only). There is no DELETE: references are archived.
const manage = requirePermission('reference:manage');
router.post('/import', manage, controller.importReferences);
router.post('/', manage, controller.createReference);
router.put('/:id/archive', manage, controller.archiveReference);
router.put('/:id/unarchive', manage, controller.unarchiveReference);
router.put('/:id', manage, controller.updateReference);

module.exports = router;
