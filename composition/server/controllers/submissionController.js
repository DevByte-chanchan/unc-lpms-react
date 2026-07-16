const { CourseOfferingAssignment, AssignmentWorkflowLog, ProgramCourseOffering } = require('../models');

async function submitLearningPlan(req, res) {
    try {
        const { pcId, revNum } = req.params;
        const actorRole = 'INSTRUCTOR'; // Defaulting to instructor based on the use case

        // 1. Validate inputs
        if (!pcId || !revNum) {
            return res.status(400).json({ message: 'pcId and revNum are required' });
        }

        // 2. Find the correct Assignment ID using the offering ID
        const offering = await ProgramCourseOffering.findOne({
            where: { pc_offering_id: pcId, revision_number: revNum },
            attributes: ['pc_offering_id']
        });

        if (!offering) return res.status(404).json({ message: 'Learning Plan Offering not found.' });

        const assignment = await CourseOfferingAssignment.findOne({
            where: { pc_offering_id: offering.pc_offering_id }
        });

        if (!assignment) return res.status(404).json({ message: 'Course Assignment not found for this offering.' });

        // --- Idempotency Check (Prevents Double Creation) ---
        const latestLog = await AssignmentWorkflowLog.findOne({
            where: { co_assign_id: assignment.co_assign_id },
            order: [['createdAt', 'DESC']]
        });

        if (latestLog && latestLog.action_type === 'SUBMITTED') {
            return res.status(200).json({
                message: 'Learning plan was already submitted.',
                status: 'success'
            });
        }
        // ----------------------------------------------------

        const now = new Date();

        // 3. Update the CourseOfferingAssignment to mark it as submitted
        await assignment.update({
            date_submitted: now,
            updatedAt: now
        });

        // 4. Log the action in AssignmentWorkflowLog
        await AssignmentWorkflowLog.create({
            co_assign_id: assignment.co_assign_id,
            actor_role: actorRole,
            action_type: 'SUBMITTED',
            createdAt: now,
            updatedAt: now
        });

        return res.status(200).json({ message: 'Learning Plan submitted successfully.', status: 'success' });

    } catch (error) {
        console.error('Error submitting learning plan:', error);
        return res.status(500).json({ message: 'Internal server error during submission.' });
    }
}

module.exports = { submitLearningPlan };