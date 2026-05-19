const { LearningPlan, LearningPlanDocument, ApprovalStage, ApprovalComment } = require('../models');

// Create a learning plan
exports.createLearningPlan = async (req, res) => {
  try {
    const { course_name } = req.body;
    const plan = await LearningPlan.create({
      instructor_id: req.userId,
      course_name,
      status: 'draft'
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all learning plans
exports.getLearningPlans = async (req, res) => {
  try {
    const { instructor_id, role } = req.query;
    let where = {};

    if (role === 'instructor') {
      where.instructor_id = req.userId;
    } else if (instructor_id) {
      where.instructor_id = instructor_id;
    }

    const plans = await LearningPlan.findAll({
      where,
      include: [
        { association: 'documents', attributes: ['id', 'document_type', 'original_filename', 'uploaded_at'] },
        { association: 'approvalStages', attributes: ['stage', 'status', 'reviewer_role'] }
      ]
    });

    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single learning plan
exports.getLearningPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await LearningPlan.findByPk(id, {
      include: [
        { association: 'documents' },
        { association: 'approvalStages', include: ['comments'] },
        { association: 'comments' }
      ]
    });

    if (!plan) return res.status(404).json({ error: 'Learning plan not found' });

    // Strip dean comments from instructor view
    if (req.userRole === 'instructor') {
      plan.comments = plan.comments.filter(c => c.from_role !== 'dean');
      plan.approvalStages = plan.approvalStages.map(stage => ({
        ...stage.dataValues,
        comments: stage.comments.filter(c => c.from_role !== 'dean')
      }));
    }

    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { uploader_role, document_type } = req.body;

    const plan = await LearningPlan.findByPk(id);
    if (!plan) return res.status(404).json({ error: 'Learning plan not found' });

    // Validate status
    if (plan.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot upload to non-draft learning plan' });
    }

    // Validate role-document match
    const validMapping = {
      program_head: ['peo_alignment', 'coaep', 'co_po_alignment'],
      director_of_libraries: ['references']
    };

    if (!validMapping[uploader_role] || !validMapping[uploader_role].includes(document_type)) {
      return res.status(400).json({ error: 'Invalid document type for this role' });
    }

    const file_path = req.file ? req.file.path : `uploads/${Date.now()}-${req.body.filename}`;

    const doc = await LearningPlanDocument.create({
      learning_plan_id: id,
      uploader_id: req.userId,
      uploader_role,
      document_type,
      file_path,
      original_filename: req.file?.originalname || req.body.filename
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;

    const plan = await LearningPlan.findByPk(id);
    if (!plan) return res.status(404).json({ error: 'Learning plan not found' });

    if (plan.status !== 'draft') {
      return res.status(400).json({ error: 'Cannot delete documents from non-draft learning plan' });
    }

    const doc = await LearningPlanDocument.findByPk(docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    await doc.destroy();
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit learning plan - UPDATED: Check program-level documents
exports.submitLearningPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { ProgramDocument, Program, AcademicPeriod } = require('../models');

    const plan = await LearningPlan.findByPk(id, {
      include: ['documents', 'program', 'academicPeriod']
    });

    if (!plan) return res.status(404).json({ error: 'Learning plan not found' });

    // CHANGED: Check program-level documents (per academic_period + program)
    // NOT per individual course
    const programDoc = await ProgramDocument.findOne({
      where: {
        program_id: plan.program_id,
        academic_period_id: plan.academic_period_id
      }
    });

    if (!programDoc) {
      return res.status(400).json({ 
        error: 'Program head has not uploaded required documents for this academic period and program',
        details: 'The 3 required program documents (PO-PEO Alignment, CO-PO Alignment, COAEP) must be uploaded once per program per semester.'
      });
    }

    // Validate all 3 program documents are present
    if (!programDoc.po_peo_file || !programDoc.co_po_file || !programDoc.coaep_file) {
      return res.status(400).json({ 
        error: 'Program documents incomplete',
        details: 'All 3 program documents must be uploaded: PO-PEO Alignment, CO-PO Alignment, and COAEP'
      });
    }

    // Also check for course-level documents from Director of Libraries (references)
    const directorDocs = plan.documents.filter(d => d.document_type === 'references');
    if (directorDocs.length === 0) {
      return res.status(400).json({ error: 'Missing required course documents: references' });
    }

    // Update status
    plan.status = 'under_review';
    await plan.save();

    // Create approval stages
    const stages = [
      { stage: 'industry_consultant', reviewer_role: 'industry_consultant', reviewer_id: 30 },
      { stage: 'director_of_libraries', reviewer_role: 'director_of_libraries', reviewer_id: 20 },
      { stage: 'program_head', reviewer_role: 'program_head', reviewer_id: 10 },
      { stage: 'dean', reviewer_role: 'dean', reviewer_id: 40 }
    ];

    for (let s of stages.slice(0, 2)) {
      // First two are parallel
      await ApprovalStage.create({
        learning_plan_id: id,
        stage: s.stage,
        reviewer_role: s.reviewer_role,
        reviewer_id: s.reviewer_id,
        status: 'pending'
      });
    }

    res.json({ message: 'Learning plan submitted', plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit review
exports.submitReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewer_id, reviewer_role, comments } = req.body;

    const stage = await ApprovalStage.findOne({
      where: {
        learning_plan_id: id,
        stage: reviewer_role,
        status: 'pending'
      }
    });

    if (!stage) return res.status(404).json({ error: 'No pending stage for this role' });

    stage.status = 'approved';
    stage.comments = comments;
    stage.reviewed_at = new Date();
    await stage.save();

    // Check if both parallel reviews done
    const parallelDone = await ApprovalStage.count({
      where: {
        learning_plan_id: id,
        stage: ['industry_consultant', 'director_of_libraries'],
        status: 'approved'
      }
    });

    if (parallelDone === 2) {
      // Create program head stage
      const existingProgramHead = await ApprovalStage.findOne({
        where: { learning_plan_id: id, stage: 'program_head' }
      });

      if (!existingProgramHead) {
        await ApprovalStage.create({
          learning_plan_id: id,
          stage: 'program_head',
          reviewer_role: 'program_head',
          reviewer_id: 10,
          status: 'pending'
        });
      }
    }

    res.json({ message: 'Review submitted', stage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approve or return
exports.approveOrReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewer_id, reviewer_role, action, comments } = req.body;

    const plan = await LearningPlan.findByPk(id);
    if (!plan) return res.status(404).json({ error: 'Learning plan not found' });

    const stage = await ApprovalStage.findOne({
      where: {
        learning_plan_id: id,
        stage: reviewer_role,
        status: 'pending'
      }
    });

    if (!stage) return res.status(404).json({ error: 'No pending stage for this role' });

    if (action === 'approve') {
      stage.status = 'approved';
      stage.comments = comments;
      stage.reviewed_at = new Date();
      await stage.save();

      // Advance workflow
      if (reviewer_role === 'program_head') {
        plan.status = 'approved'; // Will create dean stage next
        const deanStage = await ApprovalStage.findOne({
          where: { learning_plan_id: id, stage: 'dean' }
        });

        if (!deanStage) {
          await ApprovalStage.create({
            learning_plan_id: id,
            stage: 'dean',
            reviewer_role: 'dean',
            reviewer_id: 40,
            status: 'pending'
          });
        }
      } else if (reviewer_role === 'dean') {
        plan.status = 'approved';
      }

      await plan.save();
    } else if (action === 'return') {
      plan.status = 'returned';
      stage.status = 'returned';
      stage.comments = comments;
      stage.reviewed_at = new Date();
      await stage.save();
      await plan.save();
    }

    // Save comment if dean - force to program_head
    if (comments && reviewer_role === 'dean') {
      await ApprovalComment.create({
        learning_plan_id: id,
        approval_stage_id: stage.id,
        from_role: reviewer_role,
        to_role: 'program_head',
        comment: comments,
        from_id: reviewer_id
      });
    } else if (comments && reviewer_role === 'program_head') {
      await ApprovalComment.create({
        learning_plan_id: id,
        approval_stage_id: stage.id,
        from_role: reviewer_role,
        to_role: 'instructor',
        comment: comments,
        from_id: reviewer_id
      });
    }

    res.json({ message: 'Review processed', plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
