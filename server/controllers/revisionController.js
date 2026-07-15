const {
    Course,
    ProgramCourseOffering,
    CourseOfferingAssignment,
    AssignmentWorkflowLog,
    Comment,
    CommentTarget
} = require('../models');

// Helper to format roles neatly
const toTitleCase = (str) => {
    return String(str || '').toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Shared core: given a target offering, build the { revisions: [...] } payload.
async function buildRevisions(targetOffering) {
        const offerings = await ProgramCourseOffering.findAll({
            where: {
                course_id: targetOffering.course_id,
                program_id: targetOffering.program_id
            },
            include: [
                {
                    model: CourseOfferingAssignment,
                    as: 'assignments',
                    include: [
                        { model: AssignmentWorkflowLog, as: 'workflowLogs' },
                        {
                            model: Comment,
                            as: 'comments',
                            include: [{ model: CommentTarget, as: 'targets' }]
                        }
                    ]
                }
            ],
            order: [['revision_number', 'DESC']]
        });

        const formattedRevisions = [];

        for (const offering of offerings) {
            const assignment = offering.assignments?.[0] || {};
            const rawLogs = assignment.workflowLogs || [];
            const rawComments = assignment.comments || [];

            // Sort chronologically (oldest first) to build the timeline correctly
            const sortedLogs = [...rawLogs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            let unassignedComments = [...rawComments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            let pendingReviewers = new Set();
            const timeline = [];

            for (const log of sortedLogs) {
                const rawRole = log.actor_role || 'USER';
                const role = toTitleCase(rawRole.replace(/_/g, ' '));
                const type = log.action_type;
                const logTime = new Date(log.createdAt).getTime();

                let actionMessage = "";
                let actor = role;
                let eventComments = [];

                if (type === 'ASSIGNED') {
                    actionMessage = `Initialized and Routed the learning plan for Peer Evaluation`;
                }
                else if (type === 'RETURNED') {
                    actionMessage = `Returned the learning plan for revision`;
                    pendingReviewers.add(role);

                    // Comments by this role up to 5 minutes AFTER the log
                    eventComments = unassignedComments.filter(c =>
                        c.commenter_role === rawRole && new Date(c.createdAt).getTime() <= (logTime + 5 * 60000)
                    );
                    if (eventComments.length === 0) {
                        eventComments = unassignedComments.filter(c => c.commenter_role === rawRole);
                    }
                    unassignedComments = unassignedComments.filter(c => !eventComments.includes(c));
                }
                else if (type === 'SUBMITTED') {
                    actor = 'Instructor';
                    if (pendingReviewers.size > 0) {
                        const reviewersList = Array.from(pendingReviewers).join(' & ');
                        actionMessage = `Resubmitted the learning plan to ${reviewersList}`;
                        pendingReviewers.clear();
                    } else {
                        actionMessage = `Submitted the learning plan`;
                    }
                }
                else if (type === 'ACCEPTED' || type === 'APPROVED') {
                    if (rawRole === 'DEAN' || type === 'APPROVED') {
                        actionMessage = `Approved the learning plan`;
                    } else {
                        actionMessage = `Accepted the learning plan`;
                    }
                } else {
                    actionMessage = `performed ${type}`;
                }

                // Map comments and resolve specific target names
                const mappedComments = [];
                for (const c of eventComments) {
                    const target = c.targets && c.targets.length > 0 ? c.targets[0] : null;
                    let targetType = c.comment_for ? c.comment_for.toUpperCase() : "GENERAL";
                    let targetName = "General Document";

                    if (target?.target_id && c.comment_for) {
                        targetName = `Target ID: ${target.target_id}`;
                        const models = require('../models');
                        try {
                            const commentForLower = c.comment_for.toLowerCase();
                            if (commentForLower.includes('topic')) {
                                const mKey = Object.keys(models).find(k => k.toLowerCase() === 'topic');
                                if (mKey) {
                                    const match = await models[mKey].findByPk(target.target_id);
                                    if (match) targetName = match.topic_title || match.title || match.name || targetName;
                                }
                            } else if (commentForLower.includes('tla')) {
                                const mKey = Object.keys(models).find(k => k.toLowerCase() === 'teachingandlearningactivity');
                                if (mKey) {
                                    const match = await models[mKey].findByPk(target.target_id);
                                    if (match) targetName = match.tla_name || match.name || match.title || targetName;
                                }
                            } else if (commentForLower.includes('reference')) {
                                const mKey = Object.keys(models).find(k => k.toLowerCase() === 'reference');
                                if (mKey) {
                                    const match = await models[mKey].findByPk(target.target_id);
                                    if (match) targetName = match.reference_title || match.title || match.text || targetName;
                                }
                            }
                        } catch (err) {
                            console.error("Failed to map comment target entity details:", err);
                        }
                    }

                    mappedComments.push({
                        id: c.comment_id,
                        text: c.message,
                        targetType,
                        targetName
                    });
                }

                timeline.push({
                    id: log.log_id,
                    type: type,
                    date: log.createdAt,
                    actor: actor,
                    message: actionMessage,
                    comments: mappedComments
                });
            }

            const sortedLogsDesc = [...rawLogs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            const latestLog = sortedLogsDesc.length > 0 ? sortedLogsDesc[0] : null;

            let computedStatus = 'Draft';
            if (latestLog && latestLog.action_type === 'RETURNED') {
                computedStatus = 'Returned';
            } else if (latestLog && latestLog.action_type === 'ACCEPTED' && latestLog.actor_role === 'DEAN') {
                computedStatus = 'Approved';
            } else {
                // NOTE: in this schema date_submitted lives on the assignment, not the offering.
                const hasBeenSubmitted =
                    (assignment && assignment.date_submitted !== null && assignment.date_submitted !== undefined) ||
                    rawLogs.some(log => log.action_type === 'SUBMITTED' || log.action_type === 'ACCEPTED');
                if (hasBeenSubmitted) {
                    computedStatus = 'Pending';
                }
            }

            formattedRevisions.push({
                revNum: offering.revision_number,
                pcId: offering.pc_offering_id,
                status: computedStatus,
                updatedAt: offering.updatedAt,
                timeline: timeline
            });
        }

        return formattedRevisions;
}

exports.getRevisionsByOffering = async (req, res) => {
    try {
        const targetOffering = await ProgramCourseOffering.findByPk(req.params.pcId);
        if (!targetOffering) return res.status(404).json({ message: "Offering not found" });
        res.status(200).json({ revisions: await buildRevisions(targetOffering) });
    } catch (error) {
        console.error("Revision Controller Error:", error);
        res.status(500).json({ message: "Error fetching revisions", error: error.message });
    }
};

exports.getRevisionsByCode = async (req, res) => {
    try {
        const course = await Course.findOne({ where: { course_no: req.params.code } });
        if (!course) return res.status(404).json({ message: "Course not found" });
        const targetOffering = await ProgramCourseOffering.findOne({
            where: { course_id: course.course_id },
            order: [['revision_number', 'DESC']]
        });
        if (!targetOffering) return res.status(404).json({ message: "Offering not found" });
        res.status(200).json({ revisions: await buildRevisions(targetOffering) });
    } catch (error) {
        console.error("Revision Controller Error:", error);
        res.status(500).json({ message: "Error fetching revisions", error: error.message });
    }
};
