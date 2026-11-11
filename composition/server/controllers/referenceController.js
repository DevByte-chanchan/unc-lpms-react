// controllers/referenceController.js
const { Reference, Week, CourseOutcome, ProgramCourseOffering, Course, IntendedLearningOutcome } = require('../models');
const { Op } = require('sequelize');

/**
 * Resolves course_id and course_no using model relationships:
 * Week -> CourseOutcome -> ProgramCourseOffering -> Course
 */
async function resolveCourseFromIdentifiers({ course_id, course_no, courseCode, pc_offering_id, pcId, week_id, weekId, ilo_id, iloId }) {
    let resolvedCourseId = course_id ? Number(course_id) : null;
    let resolvedCourseNo = course_no || courseCode || null;

    if (resolvedCourseId && resolvedCourseNo) {
        return { courseId: resolvedCourseId, courseNo: resolvedCourseNo };
    }

    if (resolvedCourseId && !resolvedCourseNo) {
        const course = await Course.findByPk(resolvedCourseId);
        if (course) resolvedCourseNo = course.course_no;
        return { courseId: resolvedCourseId, courseNo: resolvedCourseNo };
    }

    if (resolvedCourseNo && !resolvedCourseId) {
        const course = await Course.findOne({ where: { course_no: resolvedCourseNo } });
        if (course) resolvedCourseId = course.course_id;
        return { courseId: resolvedCourseId, courseNo: resolvedCourseNo };
    }

    const targetPcOfferingId = pc_offering_id || pcId;
    if (targetPcOfferingId) {
        const pco = await ProgramCourseOffering.findByPk(targetPcOfferingId);
        if (pco && pco.course_id) {
            resolvedCourseId = pco.course_id;
            const course = await Course.findByPk(resolvedCourseId);
            if (course) resolvedCourseNo = course.course_no;
            return { courseId: resolvedCourseId, courseNo: resolvedCourseNo };
        }
    }

    const rawWeekOrIloId = week_id || weekId || ilo_id || iloId;
    if (rawWeekOrIloId) {
        const numericId = Number(rawWeekOrIloId);
        let week = await Week.findByPk(numericId, {
            include: [{
                model: CourseOutcome,
                as: 'courseOutcome',
                include: [{
                    model: ProgramCourseOffering
                }]
            }]
        });

        if (!week) {
            // Check if ID is an ILO id
            const ilo = await IntendedLearningOutcome.findByPk(numericId);
            if (ilo && ilo.co_id) {
                const co = await CourseOutcome.findByPk(ilo.co_id);
                if (co && co.pc_offering_id) {
                    const pco = await ProgramCourseOffering.findByPk(co.pc_offering_id);
                    if (pco && pco.course_id) {
                        resolvedCourseId = pco.course_id;
                        const course = await Course.findByPk(resolvedCourseId);
                        if (course) resolvedCourseNo = course.course_no;
                        return { courseId: resolvedCourseId, courseNo: resolvedCourseNo };
                    }
                }
            }

            // Check if numericId was a co_id directly
            const co = await CourseOutcome.findByPk(numericId);
            if (co && co.pc_offering_id) {
                const pco = await ProgramCourseOffering.findByPk(co.pc_offering_id);
                if (pco && pco.course_id) {
                    resolvedCourseId = pco.course_id;
                    const course = await Course.findByPk(resolvedCourseId);
                    if (course) resolvedCourseNo = course.course_no;
                    return { courseId: resolvedCourseId, courseNo: resolvedCourseNo };
                }
            }
        } else {
            if (week.courseOutcome && week.courseOutcome.ProgramCourseOffering) {
                resolvedCourseId = week.courseOutcome.ProgramCourseOffering.course_id;
            } else if (week.co_id) {
                const co = await CourseOutcome.findByPk(week.co_id);
                if (co && co.pc_offering_id) {
                    const pco = await ProgramCourseOffering.findByPk(co.pc_offering_id);
                    if (pco && pco.course_id) {
                        resolvedCourseId = pco.course_id;
                    }
                }
            }

            if (resolvedCourseId) {
                const course = await Course.findByPk(resolvedCourseId);
                if (course) resolvedCourseNo = course.course_no;
                return { courseId: resolvedCourseId, courseNo: resolvedCourseNo };
            }
        }
    }

    return { courseId: resolvedCourseId, courseNo: resolvedCourseNo };
}

function normalizePublicationYear(raw) {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    const str = String(raw).trim();
    if (!str) return null;
    if (str.includes('-')) {
        const d = new Date(str);
        return isNaN(d) ? null : d;
    }
    const yearMatch = str.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
        return new Date(`${yearMatch[1]}-01-01`);
    }
    const d = new Date(str);
    return isNaN(d) ? null : d;
}

async function getAllReferences(req, res) {
    try {
        const { courseId, courseNo } = await resolveCourseFromIdentifiers({
            course_id: req.query.course_id,
            course_no: req.query.course_no,
            courseCode: req.query.courseCode,
            pc_offering_id: req.query.pc_offering_id,
            pcId: req.query.pcId,
            week_id: req.query.week_id,
            weekId: req.query.weekId,
            ilo_id: req.query.ilo_id,
            iloId: req.query.iloId
        });

        let whereClause = {};
        if (courseId && courseNo) {
            whereClause = {
                [Op.or]: [
                    { course_id: courseId },
                    { course_no: courseNo }
                ]
            };
        } else if (courseId) {
            whereClause = { course_id: courseId };
        } else if (courseNo) {
            whereClause = { course_no: courseNo };
        }

        const refs = await Reference.findAll({
            where: whereClause,
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
        if (!title || !title.trim()) return res.status(400).json({ message: 'Title is required' });
        if (!type || !type.trim()) return res.status(400).json({ message: 'Type is required' });

        const trimmedType = type.trim();
        const isTextbook = trimmedType.toLowerCase().includes('textbook');
        const isOer = trimmedType.toLowerCase().includes('oer') || trimmedType.toLowerCase().includes('open');
        const isOnline = trimmedType.toLowerCase().includes('online');

        if (!author || !author.trim()) {
            return res.status(400).json({ message: 'Author is required' });
        }

        if (isTextbook) {
            if (!isbn || !isbn.trim()) return res.status(400).json({ message: 'ISBN is required for textbooks' });
            if (!publication_year) return res.status(400).json({ message: 'Publication year is required for textbooks' });
        }

        if (isOer || isOnline) {
            if (!link || !link.trim()) return res.status(400).json({ message: 'Link is required' });
        }

        const { courseId, courseNo } = await resolveCourseFromIdentifiers({
            course_id: req.body.course_id,
            course_no: req.body.course_no,
            courseCode: req.body.courseCode,
            pc_offering_id: req.body.pc_offering_id,
            pcId: req.body.pcId,
            week_id: req.body.week_id,
            weekId: req.body.weekId,
            ilo_id: req.body.ilo_id,
            iloId: req.body.iloId
        });

        const created = await Reference.create({
            title: title.trim(),
            type: trimmedType,
            author: author ? author.trim() : null,
            isbn: isOnline ? null : (isbn && isbn.trim() ? isbn.trim() : null),
            link: isTextbook ? null : (link && link.trim() ? link.trim() : null),
            publication_year: isOnline ? null : normalizePublicationYear(publication_year),
            course_id: courseId || null,
            course_no: courseNo || null
        });

        return res.status(201).json(created);
    } catch (err) {
        console.error('createReference error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateReference(req, res) {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ message: 'Reference ID is required' });

        const refRecord = await Reference.findByPk(id);
        if (!refRecord) return res.status(404).json({ message: 'Reference not found' });

        const { title, type, author, isbn, link, publication_year } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ message: 'Title is required' });
        if (!type || !type.trim()) return res.status(400).json({ message: 'Type is required' });

        const trimmedType = type.trim();
        const isTextbook = trimmedType.toLowerCase().includes('textbook');
        const isOer = trimmedType.toLowerCase().includes('oer') || trimmedType.toLowerCase().includes('open');
        const isOnline = trimmedType.toLowerCase().includes('online');

        if (!author || !author.trim()) {
            return res.status(400).json({ message: 'Author is required' });
        }

        if (isTextbook) {
            if (!isbn || !isbn.trim()) return res.status(400).json({ message: 'ISBN is required for textbooks' });
            if (!publication_year) return res.status(400).json({ message: 'Publication year is required for textbooks' });
        }

        if (isOer || isOnline) {
            if (!link || !link.trim()) return res.status(400).json({ message: 'Link is required' });
        }

        await refRecord.update({
            title: title.trim(),
            type: trimmedType,
            author: author ? author.trim() : null,
            isbn: isOnline ? null : (isbn && isbn.trim() ? isbn.trim() : null),
            link: isTextbook ? null : (link && link.trim() ? link.trim() : null),
            publication_year: isOnline ? null : normalizePublicationYear(publication_year)
        });

        return res.json(refRecord);
    } catch (err) {
        console.error('updateReference error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getAllReferences, createReference, updateReference, resolveCourseFromIdentifiers };
