'use strict';

const {
    sequelize,
    AssignmentWorkflowLog,
    CourseOfferingAssignment,
    ProgramCourseOffering,
    Course,
    Program,
    Department,
    Comment,
    CommentTarget,
    UserAccount,
    Faculty,
    IndustryConsultant
} = require('../models');
const { Op } = require('sequelize');

const formatRoleLabel = (rawRole) => {
    const map = {
        INSTRUCTOR: 'Instructor',
        PROGRAM_HEAD: 'Program Head',
        LIBRARY_DIRECTOR: 'Director of Libraries',
        INDUSTRY_CONSULTANT: 'Industry Consultant',
        DEAN: 'Dean',
        VPAA: 'VPAA'
    };
    if (map[rawRole]) return map[rawRole];
    return String(rawRole || 'Reviewer')
        .toLowerCase()
        .replace(/_/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
};

async function buildUserLookup() {
    const userById = {};
    const userByRole = {};

    try {
        if (UserAccount) {
            const accounts = await UserAccount.findAll({
                include: [
                    Faculty ? { model: Faculty, as: 'faculty', required: false } : null,
                    IndustryConsultant ? { model: IndustryConsultant, as: 'consultant', required: false } : null
                ].filter(Boolean)
            });

            for (const acc of accounts) {
                const fullName = acc.full_name || acc.faculty?.name || acc.consultant?.name;
                const idKey = String(acc.id);
                userById[idKey] = {
                    id: idKey,
                    name: fullName,
                    activeRole: acc.active_role
                };

                const rolesList = Array.isArray(acc.roles) ? acc.roles : [];
                if ((acc.active_role === 'Instructor' || rolesList.includes('Instructor')) && !userByRole['INSTRUCTOR']) {
                    userByRole['INSTRUCTOR'] = fullName;
                }
                if ((acc.active_role === 'Program Head' || rolesList.includes('Program Head')) && !userByRole['PROGRAM_HEAD']) {
                    userByRole['PROGRAM_HEAD'] = fullName;
                }
                if ((acc.active_role === 'Director of Libraries' || rolesList.includes('Director of Libraries')) && !userByRole['LIBRARY_DIRECTOR']) {
                    userByRole['LIBRARY_DIRECTOR'] = fullName;
                }
                if ((acc.active_role === 'Industry Consultant' || rolesList.includes('Industry Consultant')) && !userByRole['INDUSTRY_CONSULTANT']) {
                    userByRole['INDUSTRY_CONSULTANT'] = fullName;
                }
                if ((acc.active_role === 'Dean' || rolesList.includes('Dean')) && !userByRole['DEAN']) {
                    userByRole['DEAN'] = fullName;
                }
                if ((acc.active_role === 'VPAA' || rolesList.includes('VPAA')) && !userByRole['VPAA']) {
                    userByRole['VPAA'] = fullName;
                }
            }
        }
    } catch (err) {
        console.warn('Unable to build user lookup for notifications:', err.message);
    }

    return { userById, userByRole };
}

function computeOverallStatus(logs, dateSubmitted) {
    const deanApproval = logs.find(log =>
        (log.action_type === 'ACCEPTED' || log.action_type === 'APPROVED') &&
        log.actor_role === 'DEAN'
    );
    if (deanApproval) return 'APPROVED';

    const sorted = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sorted[0]?.action_type === 'RETURNED') return 'RETURNED';

    const hasBeenSubmitted = dateSubmitted !== null || logs.some(l => l.action_type === 'SUBMITTED' || l.action_type === 'ACCEPTED');
    if (hasBeenSubmitted) return 'PENDING';

    return 'DRAFT';
}

const listNotifications = async (req, res, next) => {
    try {
        const stakeholderParam = req.query.stakeholder || (req.user?.id ? String(req.user.id) : '1');

        const { userById, userByRole } = await buildUserLookup();

        const resolveActor = (stakeholderId, rawRole) => {
            const roleLabel = formatRoleLabel(rawRole);
            const lookupId = stakeholderId ? String(stakeholderId) : null;
            if (lookupId && userById[lookupId]?.name) {
                return { name: userById[lookupId].name, roleLabel };
            }
            const fallbackName = userByRole[rawRole] || null;
            return { name: fallbackName || roleLabel, roleLabel };
        };

        const whereAssignment = {};
        if (stakeholderParam) {
            whereAssignment.stakeholder_id = String(stakeholderParam);
        }

        const assignments = await CourseOfferingAssignment.findAll({
            where: whereAssignment,
            include: [
                {
                    model: ProgramCourseOffering,
                    include: [
                        { model: Course, attributes: ['course_id', 'course_no', 'course_title'] },
                        { model: Program, attributes: ['program_id', 'name'] },
                        { model: Department, attributes: ['dept_id', 'name'] }
                    ]
                },
                {
                    model: AssignmentWorkflowLog,
                    as: 'workflowLogs'
                },
                {
                    model: Comment,
                    as: 'comments',
                    include: [{ model: CommentTarget, as: 'targets' }]
                }
            ]
        });

        const notifications = [];

        for (const assign of assignments) {
            const pco = assign.ProgramCourseOffering || {};
            const course = pco.Course || {};
            const courseNo = course.course_no || `CRS-${pco.course_id || assign.pc_offering_id}`;
            const courseTitle = course.course_title || pco.course_description || 'Course';
            const revNum = pco.revision_number || 1;
            const pcId = pco.pc_offering_id || assign.pc_offering_id;

            const allLogs = assign.workflowLogs || [];
            const overallStatus = computeOverallStatus(allLogs, assign.date_submitted);
            const allComments = assign.comments || [];

            // Standard workflow logs: ASSIGNED, RETURNED, ACCEPTED, APPROVED
            const standardLogs = allLogs.filter(l =>
                ['ASSIGNED', 'RETURNED', 'ACCEPTED', 'APPROVED'].includes(l.action_type)
            );

            for (const log of standardLogs) {
                const { name: actorName, roleLabel: actorRoleLabel } = resolveActor(log.stakeholder_id, log.actor_role);
                const logTime = new Date(log.createdAt).getTime();

                let notificationType = log.action_type;
                let title = '';
                let message = '';
                let relatedComments = [];
                let targetUrl = `/courses/${pcId}/${revNum}/${overallStatus.toLowerCase()}`;

                if (log.action_type === 'ASSIGNED') {
                    title = `New Assignment: ${courseNo}`;
                    message = `You have been assigned to prepare the Learning Plan for ${courseNo} - ${courseTitle} (Rev ${revNum}) by ${actorRoleLabel} (${actorName}).`;
                } else if (log.action_type === 'RETURNED') {
                    title = `Revision Required: ${courseNo}`;
                    message = `Learning Plan for ${courseNo} (Rev ${revNum}) was returned by ${actorRoleLabel} (${actorName}) with revision feedback.`;

                    relatedComments = allComments.filter(c =>
                        c.commenter_role === log.actor_role &&
                        new Date(c.createdAt).getTime() <= (logTime + 5 * 60000)
                    );
                    if (relatedComments.length === 0) {
                        relatedComments = allComments.filter(c => c.commenter_role === log.actor_role);
                    }
                } else if (log.action_type === 'ACCEPTED' || log.action_type === 'APPROVED') {
                    if (log.actor_role === 'DEAN' || log.action_type === 'APPROVED') {
                        title = `Learning Plan Approved: ${courseNo}`;
                        message = `Dean ${actorName} granted final institutional approval for ${courseNo} - ${courseTitle} (Rev ${revNum}).`;
                        notificationType = 'APPROVED';
                    } else {
                        title = `Review Endorsed: ${courseNo}`;
                        message = `${actorRoleLabel} (${actorName}) reviewed and endorsed ${courseNo} - ${courseTitle} (Rev ${revNum}).`;
                    }
                }

                const formattedComments = relatedComments.map(c => ({
                    comment_id: c.comment_id,
                    comment_for: c.comment_for,
                    message: c.message,
                    resolved_status: Boolean(c.resolved_status)
                }));

                notifications.push({
                    log_id: log.log_id,
                    related_log_ids: [log.log_id],
                    co_assign_id: log.co_assign_id,
                    pc_offering_id: pcId,
                    revision_number: revNum,
                    course_no: courseNo,
                    course_title: courseTitle,
                    overall_status: overallStatus,
                    action_type: notificationType,
                    actor_role: log.actor_role,
                    actor_role_label: actorRoleLabel,
                    actor_name: actorName,
                    title,
                    message,
                    is_viewed: Boolean(log.is_viewed),
                    comments_count: formattedComments.length,
                    comments: formattedComments,
                    target_url: targetUrl,
                    createdAt: log.createdAt
                });
            }
        }

        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const unviewedCount = notifications.filter(n => !n.is_viewed).length;

        res.json({
            unviewed_count: unviewedCount,
            unread_count: unviewedCount,
            total: notifications.length,
            notifications
        });
    } catch (err) {
        next(err);
    }
};

const markAsViewed = async (req, res, next) => {
    try {
        const body = req.body || {};
        const { log_id, log_ids, mark_all, stakeholder_id } = body;
        const paramLogId = req.params?.logId;

        if (mark_all) {
            const stakeholder = stakeholder_id || (req.user?.id ? String(req.user.id) : null);
            const whereClause = { is_viewed: false };
            if (stakeholder) {
                const assignments = await CourseOfferingAssignment.findAll({
                    where: { stakeholder_id: String(stakeholder) },
                    attributes: ['co_assign_id']
                });
                const assignIds = assignments.map(a => a.co_assign_id);
                whereClause.co_assign_id = assignIds;
            }

            await AssignmentWorkflowLog.update(
                { is_viewed: true },
                { where: whereClause }
            );

            return res.json({ success: true, message: 'All notifications marked as viewed' });
        }

        const idsToUpdate = [];
        if (paramLogId) idsToUpdate.push(Number(paramLogId));
        if (log_id) idsToUpdate.push(Number(log_id));
        if (Array.isArray(log_ids)) idsToUpdate.push(...log_ids.map(Number));

        if (idsToUpdate.length === 0) {
            return res.status(400).json({ error: 'log_id or log_ids array is required' });
        }

        const targetState = req.body?.is_viewed !== undefined ? Boolean(req.body.is_viewed) : true;
        await AssignmentWorkflowLog.update(
            { is_viewed: targetState },
            { where: { log_id: idsToUpdate } }
        );

        res.json({ success: true, updated_count: idsToUpdate.length, is_viewed: targetState });
    } catch (err) {
        next(err);
    }
};

const markAllAsViewed = async (req, res, next) => {
    try {
        const stakeholderParam = req.user?.id || req.query.stakeholder || '1';
        const assignments = await CourseOfferingAssignment.findAll({
            where: { stakeholder_id: String(stakeholderParam) },
            attributes: ['co_assign_id']
        });
        const assignIds = assignments.map(a => a.co_assign_id);
        if (assignIds.length > 0) {
            await AssignmentWorkflowLog.update(
                { is_viewed: true },
                { where: { co_assign_id: assignIds, is_viewed: false } }
            );
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listNotifications,
    markAsViewed,
    markAllAsViewed
};
