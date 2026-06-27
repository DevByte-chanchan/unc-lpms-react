const { SyllabusApproval, SyllabusVersion, User } = require('../models');

const createSnapshot = async (courseCode, userId, triggerEvent) => {
  const approval = await SyllabusApproval.findOne({ where: { course_code: courseCode } });
  if (!approval) return;
  const versionCount = await SyllabusVersion.count({ where: { course_code: courseCode } });
  await SyllabusVersion.create({
    course_code: courseCode,
    version_no: versionCount + 1,
    snapshot_data: approval.toJSON(),
    created_by: userId,
    trigger_event: triggerEvent
  });
};

exports.listApprovals = async (req, res) => {
  try {
    const approvals = await SyllabusApproval.findAll({ order: [['course_code', 'ASC']] });
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getApproval = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const approval = await SyllabusApproval.findOne({ where: { course_code: courseCode } });
    if (!approval) return res.status(404).json({ error: 'Syllabus approval not found' });
    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveSyllabus = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { comments } = req.body;

    const approval = await SyllabusApproval.findOne({ where: { course_code: courseCode } });
    if (!approval) return res.status(404).json({ error: 'Syllabus not found' });

    if (approval.oic_status !== 'pending') {
      return res.status(400).json({ error: 'Syllabus already processed' });
    }

    approval.oic_status = 'approved';
    approval.oic_comment = comments || null;
    approval.oic_reviewed_at = new Date();
    approval.current_stage = 'approved';
    await approval.save();

    await createSnapshot(courseCode, req.userId, 'approved');

    res.json({ message: 'Syllabus approved', approval });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.returnSyllabus = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { comments } = req.body;

    const approval = await SyllabusApproval.findOne({ where: { course_code: courseCode } });
    if (!approval) return res.status(404).json({ error: 'Syllabus not found' });

    if (approval.oic_status !== 'pending') {
      return res.status(400).json({ error: 'Syllabus already processed' });
    }

    approval.oic_status = 'returned';
    approval.oic_comment = comments || null;
    approval.oic_reviewed_at = new Date();
    approval.current_stage = 'returned';
    await approval.save();

    await createSnapshot(courseCode, req.userId, 'returned');

    res.json({ message: 'Syllabus returned', approval });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVersions = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const versions = await SyllabusVersion.findAll({
      where: { course_code: courseCode },
      attributes: ['version_no', 'trigger_event', 'created_at', 'created_by'],
      include: [{ association: 'creator', attributes: ['name', 'role'] }],
      order: [['version_no', 'DESC']]
    });
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVersion = async (req, res) => {
  try {
    const { courseCode, versionNo } = req.params;
    const version = await SyllabusVersion.findOne({
      where: { course_code: courseCode, version_no: versionNo }
    });
    if (!version) return res.status(404).json({ error: 'Version not found' });
    res.json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
