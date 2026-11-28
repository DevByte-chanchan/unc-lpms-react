const {
    ProgramCourseOffering,
    CourseOfferingAssignment,
    AssignmentWorkflowLog,
    Comment,
    CommentTarget,
    UserAccount,
    Faculty,
    IndustryConsultant,
    Subtopic,
    Topic,
    TeachingAndLearningActivity,
    WeeklyReference,
    Reference
} = require('../../models');
const { formatTermFromDate, evaluateAndIncrementRevisionOnApproval } = require('../../utils/versionHelper');
const { computeWorkflowState, normalizeAction } = require('../../utils/workflowRules');

// Helper to format roles neatly
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
    return String(rawRole || 'User')
        .toLowerCase()
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const formatOfferingTermLabel = (offering, assignment) => {
    if (offering?.school_year && offering?.semester) {
        const sem = String(offering.semester).trim();
        const semLabel = /semester/i.test(sem) ? sem : `${sem.replace(/\bsem\b/i, 'Semester')}`;
        const finalSem = /semester/i.test(semLabel) ? semLabel : `${semLabel} Semester`;
        return `${finalSem}, SY ${offering.school_year}`;
    }
    return formatTermFromDate(assignment?.date_assigned || offering?.createdAt);
};

exports.getRevisionsByOffering = async (req, res) => {
    try {
        const { pcId } = req.params;
        const isInstructorViewer = req.user?.activeRole === 'Instructor';

        // 1. Get the target offering to extract its Course and Program IDs
        const targetOffering = await ProgramCourseOffering.findByPk(pcId);
        if (!targetOffering) {
            return res.status(404).json({ message: "Offering not found" });
        }

        // Build Stakeholder Lookup Maps (by stakeholder_id and by role)
        const userById = {};
        const userByRole = {};

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
                if (acc.active_role === 'Instructor' && !userByRole['INSTRUCTOR']) {
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

        const resolveActorInfo = (log, fallbackAssignmentStakeholderId = null) => {
            const rawRole = log.actor_role || 'USER';
            const roleLabel = formatRoleLabel(rawRole);
            const lookupId = log.stakeholder_id
                ? String(log.stakeholder_id)
                : (rawRole === 'INSTRUCTOR' && fallbackAssignmentStakeholderId
                    ? String(fallbackAssignmentStakeholderId)
                    : null);

            if (log.actor_name) {
                return {
                    stakeholderId: lookupId,
                    actorName: log.actor_name,
                    actorRole: roleLabel
                };
            }

            if (lookupId && userById[lookupId]?.name) {
                return {
                    stakeholderId: lookupId,
                    actorName: userById[lookupId].name,
                    actorRole: roleLabel
                };
            }

            const roleFallbackName = userByRole[rawRole] || null;
            return {
                stakeholderId: lookupId,
                actorName: roleFallbackName || roleLabel,
                actorRole: roleLabel
            };
        };

        // 2. Fetch ALL revisions that share this exact Course and Program
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
            order: [['pc_offering_id', 'DESC'], ['revision_number', 'DESC']]
        });

        const formattedRevisions = [];

        for (const offering of offerings) {
            const sortedAssigns = [...(offering.assignments || [])].sort((a, b) => Number(b.co_assign_id) - Number(a.co_assign_id));
            const assignment = sortedAssigns[0] || {};
            const rawLogs = assignment.workflowLogs || [];
            const rawComments = assignment.comments || [];

            const wfState = computeWorkflowState(rawLogs, offering);
            const hideDeanTriage = isInstructorViewer && wfState.stage === 'with_program_head';

            // Sort chronologically (oldest first) to build the timeline correctly
            const sortedLogs = [...rawLogs]
                .sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) || (Number(a.log_id || 0) - Number(b.log_id || 0)))
                .filter((log) => {
                    if (hideDeanTriage && String(log.actor_role || '').toUpperCase() === 'DEAN' && normalizeAction(log.action_type) === 'RETURNED') {
                        return false;
                    }
                    return true;
                });

            let unassignedComments = [...rawComments]
                .filter((c) => !(hideDeanTriage && String(c.commenter_role || '').toUpperCase() === 'DEAN'))
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            let pendingReviewers = new Set();
            const timeline = [];

            for (const log of sortedLogs) {
                const rawRole = String(log.actor_role || 'USER').toUpperCase();
                const type = log.action_type;
                const normType = normalizeAction(type);
                const logTime = new Date(log.createdAt).getTime();

                const { stakeholderId, actorName, actorRole } = resolveActorInfo(log, assignment.stakeholder_id);

                let actionMessage = "";
                let actionLabel = type;
                let eventComments = [];

                if (normType === 'ASSIGNED') {
                    actionLabel = 'Assigned';
                    actionMessage = `Assigned the course learning plan for preparation and composition.`;
                } else if (normType === 'RETURNED') {
                    actionLabel = rawRole === 'DEAN' ? 'Returned to Program Head' : 'Returned for Revision';
                    actionMessage = rawRole === 'DEAN'
                        ? `Returned the course learning plan to the Program Head for review triage.${log.note ? ` Note: ${log.note}` : ''}`
                        : `Returned the course learning plan with review comments requiring revision.${log.note ? ` Note: ${log.note}` : ''}`;
                    pendingReviewers.add(`${actorName} (${actorRole})`);

                    eventComments = unassignedComments.filter(c =>
                        String(c.commenter_role || '').toUpperCase() === rawRole &&
                        String(c.commenter_role || '').toUpperCase() !== 'INDUSTRY_CONSULTANT' &&
                        new Date(c.createdAt).getTime() <= (logTime + 5 * 60000)
                    );

                    if (eventComments.length === 0) {
                        eventComments = unassignedComments.filter(c =>
                            String(c.commenter_role || '').toUpperCase() === rawRole &&
                            String(c.commenter_role || '').toUpperCase() !== 'INDUSTRY_CONSULTANT'
                        );
                    }

                    unassignedComments = unassignedComments.filter(c => !eventComments.includes(c));
                } else if (normType === 'FORWARDED') {
                    actionLabel = 'Forwarded for Revision';
                    actionMessage = `Forwarded the Dean's review feedback to the instructor for revision.${log.note ? ` Note: ${log.note}` : ''}`;
                    pendingReviewers.add(`${actorName} (${actorRole})`);

                    eventComments = unassignedComments.filter(c =>
                        ['DEAN', 'PROGRAM_HEAD'].includes(String(c.commenter_role || '').toUpperCase()) &&
                        new Date(c.createdAt).getTime() <= (logTime + 5 * 60000)
                    );
                    unassignedComments = unassignedComments.filter(c => !eventComments.includes(c));
                } else if (normType === 'COUNTERED') {
                    actionLabel = 'Sent Back to Dean';
                    actionMessage = `Responded to the Dean's return and sent the plan back for reconsideration.${log.note ? ` Note: ${log.note}` : ''}`;
                } else if (normType === 'SUBMITTED') {
                    if (pendingReviewers.size > 0) {
                        const reviewersList = Array.from(pendingReviewers).join(' & ');
                        actionLabel = 'Resubmitted';
                        actionMessage = `Addressed review feedback and resubmitted the revised learning plan to ${reviewersList}.`;
                        pendingReviewers.clear();
                    } else {
                        actionLabel = 'Submitted';
                        actionMessage = `Submitted the course learning plan for multi-stakeholder evaluation.`;
                    }
                } else if (normType === 'ACCEPTED') {
                    if (rawRole === 'DEAN' || String(type).toUpperCase() === 'APPROVED') {
                        actionLabel = 'Approved';
                        actionMessage = `Granted final institutional approval for the course learning plan.`;
                    } else {
                        actionLabel = 'Endorsed';
                        actionMessage = `Reviewed and endorsed the course learning plan for the next approval stage.`;
                    }
                } else if (type === 'Suggest' || normType === 'SUGGEST' || rawRole === 'INDUSTRY_CONSULTANT') {
                    actionLabel = 'Future Suggestion';
                    actionMessage = `Provided industry recommendations and future suggestions to be applied next school year/term.`;
                    eventComments = unassignedComments.filter(c => String(c.commenter_role || '').toUpperCase() === 'INDUSTRY_CONSULTANT');
                    unassignedComments = unassignedComments.filter(c => !eventComments.includes(c));
                } else {
                    actionMessage = `Performed ${type}.`;
                }

                // Map comments and resolve specific target names asynchronously
                const mappedComments = [];
                for (const c of eventComments) {
                    const target = c.targets && c.targets.length > 0 ? c.targets[0] : null;
                    let targetType = c.comment_for ? c.comment_for.toUpperCase() : "GENERAL";
                    let targetName = "General Document";

                    if (target?.target_id && c.comment_for) {
                        targetName = `Target ID: ${target.target_id}`;
                        try {
                            const commentForLower = c.comment_for.toLowerCase();
                            if (commentForLower.includes('topic')) {
                                if (Subtopic) {
                                    const subMatch = await Subtopic.findByPk(target.target_id);
                                    if (subMatch?.title) targetName = subMatch.title;
                                }
                                if (targetName.startsWith('Target ID:') && Topic) {
                                    const match = await Topic.findByPk(target.target_id);
                                    if (match) targetName = match.topic_title || match.title || match.name || targetName;
                                }
                            } else if (commentForLower.includes('tla')) {
                                if (TeachingAndLearningActivity) {
                                    const match = await TeachingAndLearningActivity.findByPk(target.target_id);
                                    if (match) targetName = match.tla_name || match.name || match.title || targetName;
                                }
                            } else if (commentForLower.includes('reference')) {
                                if (WeeklyReference && Reference) {
                                    const wrMatch = await WeeklyReference.findByPk(target.target_id, {
                                        include: [{ model: Reference, as: 'reference' }]
                                    });
                                    if (wrMatch?.reference?.title) targetName = wrMatch.reference.title;
                                }
                                if (targetName.startsWith('Target ID:') && Reference) {
                                    const match = await Reference.findByPk(target.target_id);
                                    if (match) targetName = match.reference_title || match.title || match.text || targetName;
                                }
                            }
                        } catch (err) {
                            console.error("Failed to map comment title target entity details:", err);
                        }
                    }

                    mappedComments.push({
                        id: c.comment_id,
                        text: c.message,
                        targetType,
                        targetName,
                        resolvedStatus: Boolean(c.resolved_status)
                    });
                }

                const displayType = (normType === 'ACCEPTED' && rawRole === 'DEAN')
                    ? 'APPROVED'
                    : (normType === 'FORWARDED' ? 'RETURNED' : (type === 'Suggest' || normType === 'SUGGEST' ? 'SUGGEST' : normType));

                timeline.push({
                    id: log.log_id,
                    type: displayType,
                    date: log.createdAt,
                    stakeholderId,
                    actorName,
                    actorRole,
                    actionLabel,
                    actor: `${actorName} (${actorRole})`,
                    message: actionMessage,
                    note: log.note || null,
                    comments: mappedComments
                });
            }

            let computedStatus = wfState.compositionStatus;
            if (wfState.stage === 'approved' && offering.base_pc_offering_id && !offering.is_revision_incremented) {
                const evalRes = await evaluateAndIncrementRevisionOnApproval(offering.pc_offering_id);
                if (evalRes.incremented) {
                    offering.revision_number = evalRes.revision_number;
                    offering.is_revision_incremented = true;
                }
            }

            formattedRevisions.push({
                revNum: offering.revision_number,
                pcId: offering.pc_offering_id,
                basePcId: offering.base_pc_offering_id || null,
                schoolYear: offering.school_year || '',
                semester: offering.semester || '',
                approvedAt: offering.approved_at || wfState.approvedAt || null,
                hasModifications: Boolean(offering.has_modifications),
                isRevisionIncremented: Boolean(offering.is_revision_incremented),
                termLabel: formatOfferingTermLabel(offering, assignment),
                status: computedStatus,
                workflowStage: wfState.stage,
                updatedAt: offering.updatedAt,
                timeline: timeline
            });
        }

        res.status(200).json({ revisions: formattedRevisions });
    } catch (error) {
        console.error("Revision Controller Error:", error);
        res.status(500).json({ message: "Error fetching revisions", error: error.message });
    }
};

