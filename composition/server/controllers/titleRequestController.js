'use strict';

// Title requests (approver plan 4.4). An instructor asks the Director of Libraries for a title the library does not
// have; the Director adds it to the library, then marks the request added (naming that reference), or declines it
// with a reason. Each side is told in-app. A person decides; nothing is added by itself.
//
//   GET  /api/title-requests                    the Director: every request, open ones first; an instructor: their own
//   POST /api/title-requests                    { title, authors?, note?, pcId? }   an instructor asks
//   PUT  /api/title-requests/:id/added          { reference_id }                    the Director added it
//   PUT  /api/title-requests/:id/declined       { reason }                          the Director declines

const { Op } = require('sequelize');
const { sequelize, Sequelize, User, Reference } = require('../models');
const { notify } = require('../utils/notify');
const { canAccessCourseRows, loadOfferingCourseRows } = require('../middleware/courseAuthorization');

const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: Sequelize.QueryTypes.SELECT });
const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const asId = (value) => (/^[0-9]+$/.test(String(value ?? '')) ? Number(value) : null);
const isDirector = (req) => req.user?.role === 'director-of-libraries';

const LIST_SQL = `SELECT r.request_id AS id, r.title, r.authors, r.note, r.status, r.reason, r.reference_id AS referenceId,
                         r.createdAt, r.decided_at AS decidedAt, r.pc_offering_id AS offeringId, c.course_no AS courseCode,
                         u.name AS requestedBy, ref.title AS referenceTitle
                  FROM TitleRequests r
                      LEFT JOIN ProgramCourseOfferings pco ON pco.pc_offering_id = r.pc_offering_id
                      LEFT JOIN Courses c ON c.course_id = pco.course_id
                      LEFT JOIN Users u ON u.user_id = r.requested_by
                      LEFT JOIN \`References\` ref ON ref.reference_id = r.reference_id`;

// "BIT311L — title requested: Clean Code" (the bell shows the code as the title of the notice)
const notice = (code, text) => `${clean(code, 30) || 'Library'} — ${text}`.slice(0, 200);

const directorIds = async () => (await User.findAll({
    where: { is_active: true, [Op.or]: [{ role: 'director-of-libraries' }, { roles: { [Op.like]: '%"director-of-libraries"%' } }] },
    attributes: ['user_id'], raw: true
})).map(u => u.user_id);

const listRequests = async (req, res, next) => {
    try {
        const rows = isDirector(req)
            ? await select(`${LIST_SQL} ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.createdAt DESC LIMIT 500`)
            : await select(`${LIST_SQL} WHERE r.requested_by = ? ORDER BY r.createdAt DESC LIMIT 200`, [req.user.id]);
        // The instructor sees their own requests; who asked is only for the Director.
        return res.json({ requests: isDirector(req) ? rows : rows.map(({ requestedBy: _who, ...row }) => row) });
    } catch (error) {
        return next(error);
    }
};

const createRequest = async (req, res, next) => {
    try {
        const title = clean(req.body?.title, 300);
        const authors = clean(req.body?.authors, 300) || null;
        const note = clean(req.body?.note, 1000) || null;
        if (title.length < 2) return res.status(400).json({ error: 'Write the title you need.' });
        let offeringId = null;
        let courseCode = '';
        if (req.body?.pcId != null && req.body.pcId !== '') {
            offeringId = asId(req.body.pcId);
            const rows = offeringId ? await loadOfferingCourseRows(offeringId) : [];
            if (!rows.length) return res.status(404).json({ error: 'That learning plan was not found.' });
            if (!canAccessCourseRows(req.user, rows)) return res.status(403).json({ error: 'You do not have access to this course.' });
            const [course] = await select('SELECT course_no FROM Courses WHERE course_id = ?', [rows[0].course_id]);
            courseCode = course?.course_no || '';
        }
        // The same title asked again by the same person while still open: no second request.
        const [open] = await select(`SELECT request_id FROM TitleRequests WHERE requested_by = ? AND status = 'pending' AND LOWER(title) = LOWER(?)`, [req.user.id, title]);
        if (open) return res.status(409).json({ error: 'You already asked for this title; the Director of Libraries has not answered yet.' });

        const now = new Date();
        const [id] = await sequelize.query(
            `INSERT INTO TitleRequests (title, authors, note, pc_offering_id, requested_by, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
            { replacements: [title, authors, note, offeringId, req.user.id, now, now], type: Sequelize.QueryTypes.INSERT });
        await notify(await directorIds(), 'title_request', null, notice(courseCode, `title requested: ${title}`), 'instructor', now);
        return res.status(201).json({ id, status: 'pending' });
    } catch (error) {
        return next(error);
    }
};

// The open request, or the response already sent.
const openRequest = async (req, res) => {
    const id = asId(req.params.id);
    const [row] = id ? await select(`${LIST_SQL} WHERE r.request_id = ?`, [id]) : [];
    if (!row) { res.status(404).json({ error: 'That request no longer exists.' }); return null; }
    if (row.status !== 'pending') { res.status(409).json({ error: 'This request was already answered.' }); return null; }
    const [owner] = await select('SELECT requested_by FROM TitleRequests WHERE request_id = ?', [id]);
    return { ...row, requesterId: owner.requested_by };
};

const decide = async (req, row, status, fields, text) => {
    const now = new Date();
    await sequelize.query(
        `UPDATE TitleRequests SET status = ?, reason = ?, reference_id = ?, decided_by = ?, decided_at = ?, updatedAt = ? WHERE request_id = ? AND status = 'pending'`,
        { replacements: [status, fields.reason ?? null, fields.referenceId ?? null, req.user.id, now, now, row.id] });
    await notify([row.requesterId], 'title_request_answered', row.offeringId || null, notice(row.courseCode, text), 'director-of-libraries', now);
};

const markAdded = async (req, res, next) => {
    try {
        const row = await openRequest(req, res);
        if (!row) return undefined;
        const referenceId = asId(req.body?.reference_id);
        const reference = referenceId ? await Reference.findByPk(referenceId, { attributes: ['reference_id', 'title', 'archived'], raw: true }) : null;
        if (!reference || reference.archived) return res.status(400).json({ error: 'Pick the library title that answers this request.' });
        await decide(req, row, 'added', { referenceId }, `the title you asked for is in the library: ${reference.title}`);
        return res.json({ id: row.id, status: 'added', referenceId });
    } catch (error) {
        return next(error);
    }
};

const markDeclined = async (req, res, next) => {
    try {
        const row = await openRequest(req, res);
        if (!row) return undefined;
        const reason = clean(req.body?.reason, 1000);
        if (reason.length < 5) return res.status(400).json({ error: 'Say why, so the instructor knows (a few words).' });
        await decide(req, row, 'declined', { reason }, `your title request was declined: ${reason}`);
        return res.json({ id: row.id, status: 'declined' });
    } catch (error) {
        return next(error);
    }
};

module.exports = { listRequests, createRequest, markAdded, markDeclined };
