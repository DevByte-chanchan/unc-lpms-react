const { LearningPlan, LearningPlanDocument, ApprovalStage, ApprovalComment, LearningPlanVersion } = require('../models');

/**
 * Create a snapshot of the current learning plan state
 */
const createLPSnapshot = async (planId, userId, triggerEvent) => {
  try {
    const plan = await LearningPlan.findByPk(planId, {
      include: [
        { association: 'documents' },
        { association: 'approvalStages', include: ['comments'] },
        { association: 'comments' }
      ]
    });

    if (!plan) return;

    const versionCount = await LearningPlanVersion.count({ where: { learning_plan_id: planId } });
    
    await LearningPlanVersion.create({
      learning_plan_id: planId,
      version_no: versionCount + 1,
      snapshot_data: plan.toJSON(),
      created_by: userId,
      trigger_event: triggerEvent
    });
  } catch (error) {
    console.error('Failed to create LP snapshot:', error);
  }
};

// Get template from previous year's approved LP for auto-population
exports.getTemplate = async (req, res) => {
  try {
    const { course_code } = req.query;
    const { academic_year } = req.query;
    
    if (!course_code) {
      return res.status(400).json({ error: 'course_code required' });
    }

    // Calculate previous academic year (e.g., 2025-2026 -> 2024-2025)
    const currentYear = academic_year || '2025-2026';
    const [startYear, endYear] = currentYear.split('-').map(Number);
    const prevYear = `${startYear - 1}-${endYear - 1}`;

    // Find most recent approved LP for same course code from previous year
    const previousLP = await LearningPlan.findOne({
      where: {
        course_code,
        academic_year: prevYear,
        status: 'approved'
      },
      include: [
        { association: 'documents' },
        { association: 'approvalStages' }
      ],
      order: [['updated_at', 'DESC']],
      limit: 1
    });

    if (!previousLP) {
      return res.status(404).json({ 
        error: 'No approved learning plan found for this course in previous academic year' 
      });
    }

    // Return full LP data as template
    res.json({
      course_name: previousLP.course_name,
      course_code: previousLP.course_code,
      academic_year: currentYear,
      semester: previousLP.semester,
      documents: previousLP.documents,
      approvalStages: previousLP.approvalStages,
      previousAcademicYear: prevYear,
      isTemplate: true,
      flaggedForReview: true // Mark all sections for potential review
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a learning plan
exports.createLearningPlan = async (req, res) => {
  try {
    const { course_name, course_code, academic_year, semester } = req.body;
    const plan = await LearningPlan.create({
      instructor_id: req.userId,
      course_name,
      course_code,
      academic_year,
      semester,
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

    // CREATE SNAPSHOT BEFORE STATUS CHANGE
    const versionCount = await LearningPlanVersion.count({ where: { learning_plan_id: id } });
    const triggerEvent = versionCount === 0 ? 'submitted' : 'resubmitted';
    await createLPSnapshot(id, req.userId, triggerEvent);

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

    if (reviewer_role !== req.userRole) {
      return res.status(403).json({ error: 'Role mismatch: reviewer role does not match authenticated user role' });
    }

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

    if (reviewer_role !== req.userRole) {
      return res.status(403).json({ error: 'Role mismatch: reviewer role does not match authenticated user role' });
    }

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
        plan.status = 'under_review';
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
        // Final approval snapshot
        await createLPSnapshot(id, reviewer_id, 'approved');
      }

      await plan.save();
    } else if (action === 'return') {
      plan.status = 'returned';
      stage.status = 'returned';
      stage.comments = comments;
      stage.reviewed_at = new Date();
      await stage.save();
      await plan.save();

      // Return snapshot
      await createLPSnapshot(id, reviewer_id, 'returned');
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

// Get all versions for a learning plan
exports.getLPVersions = async (req, res) => {
  try {
    const { id } = req.params;
    const versions = await LearningPlanVersion.findAll({
      where: { learning_plan_id: id },
      attributes: ['version_no', 'trigger_event', 'created_at', 'created_by'],
      include: [{ association: 'creator', attributes: ['name', 'role'] }],
      order: [['version_no', 'DESC']]
    });
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific version snapshot
exports.getLPVersion = async (req, res) => {
  try {
    const { id, versionNo } = req.params;
    const version = await LearningPlanVersion.findOne({
      where: { learning_plan_id: id, version_no: versionNo }
    });

    if (!version) return res.status(404).json({ error: 'Version not found' });

    res.json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rollback to a specific version
exports.rollbackToVersion = async (req, res) => {
  try {
    const { id, versionNo } = req.params;
    
    // Get the version to rollback to
    const version = await LearningPlanVersion.findOne({
      where: { learning_plan_id: id, version_no: versionNo }
    });

    if (!version) return res.status(404).json({ error: 'Version not found' });

    // Get current LP
    const plan = await LearningPlan.findByPk(id);
    if (!plan) return res.status(404).json({ error: 'Learning plan not found' });

    // Only instructors can rollback
    if (req.userRole !== 'instructor' || plan.instructor_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized: Only the instructor can rollback' });
    }

    // Only allow rollback if status is 'draft' or 'returned'
    if (plan.status !== 'draft' && plan.status !== 'returned') {
      return res.status(400).json({ 
        error: 'Cannot rollback: Plan must be in draft or returned status' 
      });
    }

    // Restore data from snapshot
    const snapshotData = version.snapshot_data;
    plan.course_name = snapshotData.course_name;
    plan.course_code = snapshotData.course_code;
    plan.academic_year = snapshotData.academic_year;
    plan.semester = snapshotData.semester;
    await plan.save();

    // Create a new snapshot recording the rollback
    await createLPSnapshot(id, req.userId, `rollback_to_v${versionNo}`);

    res.json({ 
      message: `Rolled back to version ${versionNo}`, 
      plan 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const puppeteer = require('puppeteer');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

/**
 * Generate HTML for LP PDF
 */
const generateLPHTML = (plan) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #1e3a5f; }
        .sub-header { font-size: 14px; color: #666; }
        h1 { font-size: 22px; margin: 20px 0; color: #1e3a5f; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; }
        .info-item { font-size: 14px; }
        .label { font-weight: bold; color: #555; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; color: #1e3a5f; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #e7f1ff; color: #1e3a5f; }
        .footer { margin-top: 50px; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #777; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
        .sig-box { border-top: 1px solid #000; padding-top: 5px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">UNIVERSITY OF NUEVA CACERES</div>
        <div class="sub-header">School of Computer & Information Sciences</div>
        <h1>LEARNING PLAN</h1>
        <div class="status-badge">STATUS: ${plan.status.toUpperCase()}</div>
      </div>

      <div class="section">
        <div class="section-title">COURSE INFORMATION</div>
        <div class="info-grid">
          <div class="info-item"><span class="label">Course Name:</span> ${plan.course_name}</div>
          <div class="info-item"><span class="label">Course Code:</span> ${plan.course_code || 'N/A'}</div>
          <div class="info-item"><span class="label">Academic Year:</span> ${plan.academic_year || 'N/A'}</div>
          <div class="info-item"><span class="label">Semester:</span> ${plan.semester || 'N/A'}</div>
          <div class="info-item"><span class="label">Instructor:</span> ${plan.instructor?.name || 'N/A'}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">DOCUMENTS</div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Filename</th>
              <th>Uploaded By</th>
            </tr>
          </thead>
          <tbody>
            ${(plan.documents || []).map(doc => `
              <tr>
                <td>${doc.document_type.replace(/_/g, ' ').toUpperCase()}</td>
                <td>${doc.original_filename}</td>
                <td>${doc.uploaded_by_name || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">APPROVAL TRAIL</div>
        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Status</th>
              <th>Reviewed At</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            ${(plan.approvalStages || []).map(stage => `
              <tr>
                <td>${stage.stage.replace(/_/g, ' ').toUpperCase()}</td>
                <td>${stage.status.toUpperCase()}</td>
                <td>${stage.reviewed_at ? new Date(stage.reviewed_at).toLocaleString() : '-'}</td>
                <td>${stage.comments || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="signatures">
        <div class="sig-box">
          <div class="label">Reviewer Signature</div>
          <div style="font-size: 11px">Industry Consultant / Director of Libraries</div>
        </div>
        <div class="sig-box">
          <div class="label">Approval Signature</div>
          <div style="font-size: 11px">Program Head / Dean</div>
        </div>
      </div>

      <div class="footer">
        <p>This is an electronically generated document. | UNC LPSM System</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

// Export single LP as PDF
exports.exportPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await LearningPlan.findByPk(id, {
      include: [
        { association: 'instructor', attributes: ['name'] },
        { association: 'documents' },
        { association: 'approvalStages' }
      ]
    });

    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const html = generateLPHTML(plan);
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=LP_${plan.course_code || id}.pdf`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Batch export LPs as ZIP
exports.exportBatchPDF = async (req, res) => {
  try {
    const { plan_ids } = req.body;
    if (!plan_ids || !Array.isArray(plan_ids)) {
      return res.status(400).json({ error: 'plan_ids array required' });
    }

    const plans = await LearningPlan.findAll({
      where: { id: plan_ids },
      include: [
        { association: 'instructor', attributes: ['name'] },
        { association: 'documents' },
        { association: 'approvalStages' }
      ]
    });

    const browser = await puppeteer.launch({ headless: 'new' });
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment('batch_learning_plans.zip');
    archive.pipe(res);

    for (const plan of plans) {
      const page = await browser.newPage();
      const html = generateLPHTML(plan);
      await page.setContent(html);
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      archive.append(pdfBuffer, { name: `LP_${plan.course_code || plan.id}.pdf` });
      await page.close();
    }

    await browser.close();
    await archive.finalize();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Template Management Functions
 */

// Get all available templates for a given course code
exports.getAvailableTemplates = async (req, res) => {
  try {
    const { course_code } = req.query;

    if (!course_code) {
      return res.status(400).json({ error: 'course_code query parameter required' });
    }

    const templates = await LearningPlan.findAll({
      where: {
        course_code,
        status: 'approved'
      },
      attributes: ['id', 'course_name', 'course_code', 'academic_year', 'semester', 'updated_at'],
      order: [['updated_at', 'DESC']],
      limit: 10
    });

    if (templates.length === 0) {
      return res.status(404).json({
        message: 'No approved learning plans found for this course code',
        available_templates: []
      });
    }

    res.json({
      count: templates.length,
      templates: templates.map(t => ({
        id: t.id,
        course_name: t.course_name,
        course_code: t.course_code,
        academic_year: t.academic_year,
        semester: t.semester,
        updated_at: t.updated_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new LP from template
exports.createFromTemplate = async (req, res) => {
  try {
    const { template_lp_id, academic_year, semester } = req.body;

    if (!template_lp_id) {
      return res.status(400).json({ error: 'template_lp_id is required' });
    }

    // Fetch template LP
    const templateLP = await LearningPlan.findByPk(template_lp_id, {
      include: [
        { association: 'documents' },
        { association: 'approvalStages' }
      ]
    });

    if (!templateLP) {
      return res.status(404).json({ error: 'Template learning plan not found' });
    }

    if (templateLP.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved learning plans can be used as templates' });
    }

    // Create new LP from template
    const newLP = await LearningPlan.create({
      instructor_id: req.userId,
      course_name: templateLP.course_name,
      course_code: templateLP.course_code,
      academic_year: academic_year || templateLP.academic_year,
      semester: semester || templateLP.semester,
      status: 'draft',
      template_source_id: template_lp_id
    });

    // Record template usage
    const { LearningPlanTemplate, TemplateUsage } = require('../models');
    let template = await LearningPlanTemplate.findOne({
      where: { source_lp_id: template_lp_id }
    });

    if (!template) {
      template = await LearningPlanTemplate.create({
        source_lp_id: template_lp_id,
        is_active: true
      });
    }

    await TemplateUsage.create({
      template_id: template.id,
      new_lp_id: newLP.id,
      used_at: new Date()
    });

    // Create initial snapshot for the new LP
    await createLPSnapshot(newLP.id, req.userId, 'created_from_template');

    res.status(201).json({
      message: 'Learning plan created from template',
      plan: newLP,
      template_metadata: {
        source_id: templateLP.id,
        source_year: templateLP.academic_year,
        source_semester: templateLP.semester
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark an approved LP as template-eligible
exports.markAsTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await LearningPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ error: 'Learning plan not found' });
    }

    if (plan.status !== 'approved') {
      return res.status(400).json({
        error: 'Only approved learning plans can be marked as templates'
      });
    }

    plan.is_template_eligible = true;
    await plan.save();

    // Create template record
    const { LearningPlanTemplate } = require('../models');
    let template = await LearningPlanTemplate.findOne({
      where: { source_lp_id: id }
    });

    if (!template) {
      template = await LearningPlanTemplate.create({
        source_lp_id: id,
        is_active: true
      });
    }

    res.json({
      message: 'Learning plan marked as template',
      template_id: template.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get template statistics
exports.getTemplateStats = async (req, res) => {
  try {
    const { LearningPlanTemplate, TemplateUsage } = require('../models');

    const templates = await LearningPlanTemplate.findAll({
      attributes: ['id', 'source_lp_id', 'is_active', 'created_at'],
      include: [
        {
          association: 'sourceLearningPlan',
          attributes: ['course_code', 'course_name', 'academic_year']
        },
        {
          association: 'usages',
          attributes: ['new_lp_id', 'used_at', 'modifications_count']
        }
      ]
    });

    const stats = templates.map(t => ({
      template_id: t.id,
      source_lp_id: t.source_lp_id,
      course_code: t.sourceLearningPlan?.course_code,
      course_name: t.sourceLearningPlan?.course_name,
      source_year: t.sourceLearningPlan?.academic_year,
      is_active: t.is_active,
      times_used: t.usages?.length || 0,
      created_at: t.created_at,
      last_used: t.usages?.length > 0 ? t.usages[t.usages.length - 1].used_at : null
    }));

    res.json({
      total_templates: stats.length,
      templates: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
