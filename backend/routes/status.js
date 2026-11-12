import { Router } from 'express';
import { Op } from 'sequelize';
import { TosStatus, Comment, CourseOutcome, IloItem, IloAttachment, AssessmentItem } from '../models/index.js';
import { lockGuard } from '../middleware/lockGuard.js';
import { getCourseDeadline } from '../config/season.js';

const router = Router();

router.get('/:code/:period/status', async (req, res) => {
    let status = await TosStatus.findOne({
        where: { courseCode: req.params.code, examPeriod: req.params.period }
    });
    if (!status) {
        status = await TosStatus.create({
            courseCode: req.params.code,
            examPeriod: req.params.period,
            status: 'draft'
        });
    }
    res.json({ ...status.toJSON(), deadline: getCourseDeadline(req.params.code, req.params.period) });
});

const ALLOWED_TRANSITIONS = {
    draft: ['pending'],
    pending: ['returned', 'approved'],
    returned: ['pending'],
    approved: []
};

router.put('/:code/:period/status', lockGuard, async (req, res) => {
    const { status: newStatus } = req.body;
    let status = await TosStatus.findOne({
        where: { courseCode: req.params.code, examPeriod: req.params.period }
    });

    const currentStatus = status ? (status.status || 'draft') : 'draft';

    // Same-status requests are a harmless no-op success (preserves timestamps and returnCount)
    if (status && newStatus === currentStatus) {
        return res.json({ ...status.toJSON(), deadline: getCourseDeadline(req.params.code, req.params.period) });
    }
    if (!status && (!newStatus || newStatus === 'draft')) {
        status = await TosStatus.create({
            courseCode: req.params.code,
            examPeriod: req.params.period,
            status: 'draft'
        });
        return res.json({ ...status.toJSON(), deadline: getCourseDeadline(req.params.code, req.params.period) });
    }

    if (newStatus && newStatus !== currentStatus) {
        const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
        if (!allowed.includes(newStatus)) {
            return res.status(400).json({
                error: `Invalid status transition from ${currentStatus} to ${newStatus}`
            });
        }
    }

    if (newStatus === 'pending') {
        // Server-side mirror of the frontend Submit rules: every ILO in this TOS needs at
        // least one file, and every point row needs points > 0.
        const coFilter = req.params.period === 'Midterm' ? ['CO1', 'CO2'] : req.params.period === 'Finals' ? ['CO3', 'CO4'] : null;
        let outcomes = await CourseOutcome.findAll({
            where: { courseCode: req.params.code },
            include: [{ model: IloItem, as: 'ilos' }]
        });
        if (coFilter) {
            const scoped = outcomes.filter(o => coFilter.includes(o.co));
            if (scoped.length > 0) outcomes = scoped;
        }
        const iloIds = outcomes.flatMap(o => (o.ilos || []).map(i => i.id));
        if (iloIds.length > 0) {
            const attachments = await IloAttachment.findAll({
                where: { courseCode: req.params.code, examPeriod: req.params.period, iloId: iloIds }
            });
            const filedIlos = new Set(attachments.map(a => a.iloId));
            if (iloIds.some(id => !filedIlos.has(id))) {
                return res.status(400).json({ error: 'Cannot submit TOS: every ILO needs at least one uploaded file' });
            }
            const rowsMissingPoints = await AssessmentItem.count({
                where: {
                    courseCode: req.params.code,
                    examPeriod: req.params.period,
                    iloId: iloIds,
                    points: { [Op.or]: [{ [Op.lte]: 0 }, { [Op.is]: null }] }
                }
            });
            if (rowsMissingPoints > 0) {
                return res.status(400).json({ error: 'Cannot submit TOS: every point row needs points greater than 0' });
            }
        }
    }

    if (newStatus === 'returned') {
        const targetRound = (status ? (status.returnCount || 0) : 0) + 1;
        const currentRoundComments = await Comment.count({
            where: {
                courseCode: req.params.code,
                examPeriod: req.params.period,
                returnNumber: targetRound
            }
        });
        if (currentRoundComments === 0) {
            return res.status(400).json({
                error: 'Cannot return TOS without at least one comment in the current review round'
            });
        }
    }
    const now = new Date();
    if (status) {
        status.status = newStatus || 'draft';
        if (newStatus === 'pending') status.submittedAt = now;
        else if (newStatus === 'returned') { status.returnedAt = now; status.returnCount = (status.returnCount || 0) + 1; const dates = JSON.parse(status.returnDates || '[]'); dates.push(now.toISOString()); status.returnDates = JSON.stringify(dates); }
        else if (newStatus === 'approved') status.approvedAt = now;
        await status.save();
    } else {
        const extra = {};
        if (newStatus === 'pending') extra.submittedAt = now;
        else if (newStatus === 'returned') extra.returnedAt = now;
        else if (newStatus === 'approved') extra.approvedAt = now;
        status = await TosStatus.create({
            courseCode: req.params.code,
            examPeriod: req.params.period,
            status: newStatus || 'draft',
            ...extra
        });
    }
    res.json({ ...status.toJSON(), deadline: getCourseDeadline(req.params.code, req.params.period) });
});

export default router;
