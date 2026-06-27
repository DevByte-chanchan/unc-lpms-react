const { SyllabusApproval, SyllabusVersion, SyllabusContent, User } = require('../models');
const puppeteer = require('puppeteer');

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

exports.getContent = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { academic_year } = req.query;
    const where = { course_code: courseCode };
    if (academic_year) where.academic_year = academic_year;
    const record = await SyllabusContent.findOne({ where, order: [['id', 'DESC']] });
    if (!record) return res.status(404).json({ error: 'Syllabus content not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPreviousYearContent = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const current = await SyllabusContent.findOne({ where: { course_code: courseCode, is_current: true } });
    if (!current) return res.status(404).json({ error: 'Current syllabus content not found' });
    const [start] = current.academic_year.split('-').map(Number);
    const prevYear = `${start - 1}-${start}`;
    const prev = await SyllabusContent.findOne({ where: { course_code: courseCode, academic_year: prevYear } });
    if (!prev) return res.status(404).json({ error: `No previous year (${prevYear}) content found` });
    res.json(prev);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saveContent = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { academic_year, semester, content } = req.body;
    if (!academic_year || !content) return res.status(400).json({ error: 'academic_year and content are required' });
    const [record, created] = await SyllabusContent.upsert({
      course_code: courseCode,
      academic_year,
      semester: semester || null,
      content,
      created_by: req.userId || null,
      is_current: true
    });
    if (!created) {
      await SyllabusContent.update({ is_current: false }, { where: { course_code: courseCode, id: { [require('sequelize').Op.ne]: record.id } } });
    }
    res.status(created ? 201 : 200).json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.exportPdf = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const record = await SyllabusContent.findOne({ where: { course_code: courseCode, is_current: true } });
    if (!record) return res.status(404).json({ error: 'Syllabus content not found for PDF export' });
    const c = typeof record.content === 'string' ? JSON.parse(record.content) : record.content;
    const topics = c.topics || [];
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body{font-family:Arial,sans-serif;padding:40px;color:#333;line-height:1.6}
  .header{text-align:center;border-bottom:2px solid #1e3a5f;padding-bottom:20px;margin-bottom:30px}
  .logo{font-size:24px;font-weight:bold;color:#1e3a5f}
  h1{font-size:22px;margin:20px 0;color:#1e3a5f}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:30px}
  .info-item{font-size:14px}.label{font-weight:bold;color:#555}
  .section{margin-bottom:25px}
  .section-title{font-size:18px;font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:10px;color:#1e3a5f}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{border:1px solid #ddd;padding:10px;text-align:left;font-size:13px}
  th{background-color:#f8f9fa;font-weight:bold}
  .footer{margin-top:50px;font-size:12px;border-top:1px solid #ddd;padding-top:20px;text-align:center;color:#777}
</style></head><body>
<div class="header"><div class="logo">UNIVERSITY OF NUEVA CACERES</div><h1>COURSE SYLLABUS</h1></div>
<div class="section"><div class="section-title">COURSE INFORMATION</div>
<div class="info-grid">
  <div class="info-item"><span class="label">Course Code:</span> ${c.code || courseCode}</div>
  <div class="info-item"><span class="label">Course Title:</span> ${c.name || ''}</div>
  <div class="info-item"><span class="label">Credits:</span> ${c.credits || ''}</div>
  <div class="info-item"><span class="label">Prerequisites:</span> ${c.prerequisites || 'None'}</div>
  <div class="info-item"><span class="label">Year:</span> ${c.year || ''}</div>
  <div class="info-item"><span class="label">Semester:</span> ${c.sem || ''}</div>
</div></div>
<div class="section"><div class="section-title">COURSE DESCRIPTION</div><p>${c.description || ''}</p></div>
${topics.length ? `<div class="section"><div class="section-title">TOPICS</div><table><thead><tr><th>#</th><th>Title</th><th>Subtopics</th></tr></thead><tbody>${topics.map((t,i) => `<tr><td>${i+1}</td><td>${t.title||''}</td><td>${(t.subtopics||[]).map(s=>s.value||'').join(', ')}</td></tr>`).join('')}</tbody></table></div>` : ''}
<div class="footer"><p>Generated by UNC LPSM | ${new Date().toLocaleString()}</p></div>
</body></html>`;
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=Syllabus_${courseCode}.pdf`, 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
