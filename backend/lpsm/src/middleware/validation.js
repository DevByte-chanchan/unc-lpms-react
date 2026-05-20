/**
 * Input validation middleware for Learning Plans API
 */

// Validate learning plan creation/update
const validateLearningPlan = (req, res, next) => {
  const { course_name, course_code, academic_year, semester } = req.body;

  const errors = [];

  if (!course_name || typeof course_name !== 'string' || course_name.trim().length === 0) {
    errors.push('course_name is required and must be a non-empty string');
  }

  if (course_name && course_name.length > 255) {
    errors.push('course_name must not exceed 255 characters');
  }

  if (course_code && (typeof course_code !== 'string' || course_code.length > 50)) {
    errors.push('course_code must be a string not exceeding 50 characters');
  }

  if (academic_year && !/^\d{4}-\d{4}$/.test(academic_year)) {
    errors.push('academic_year must be in format YYYY-YYYY (e.g., 2025-2026)');
  }

  if (semester && !['1st', '2nd', 'summer'].includes(semester)) {
    errors.push('semester must be one of: 1st, 2nd, summer');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validate document upload
const validateDocumentUpload = (req, res, next) => {
  const { uploader_role, document_type } = req.body;

  const errors = [];

  if (!uploader_role) {
    errors.push('uploader_role is required');
  }

  if (!document_type) {
    errors.push('document_type is required');
  }

  const validRoles = ['program_head', 'director_of_libraries'];
  if (uploader_role && !validRoles.includes(uploader_role)) {
    errors.push(`uploader_role must be one of: ${validRoles.join(', ')}`);
  }

  const validDocTypes = ['peo_alignment', 'coaep', 'co_po_alignment', 'references'];
  if (document_type && !validDocTypes.includes(document_type)) {
    errors.push(`document_type must be one of: ${validDocTypes.join(', ')}`);
  }

  if (!req.file && !req.body.filename) {
    errors.push('file upload is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validate review submission
const validateReview = (req, res, next) => {
  const { reviewer_id, reviewer_role, action, comments } = req.body;

  const errors = [];

  if (!reviewer_role) {
    errors.push('reviewer_role is required');
  }

  if (!action || !['approve', 'return'].includes(action)) {
    errors.push('action must be either "approve" or "return"');
  }

  if (comments && typeof comments !== 'string') {
    errors.push('comments must be a string');
  }

  if (comments && comments.length > 1000) {
    errors.push('comments must not exceed 1000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validate batch export request
const validateBatchExport = (req, res, next) => {
  const { plan_ids } = req.body;

  const errors = [];

  if (!plan_ids || !Array.isArray(plan_ids)) {
    errors.push('plan_ids must be an array');
  }

  if (Array.isArray(plan_ids) && plan_ids.length === 0) {
    errors.push('plan_ids array cannot be empty');
  }

  if (Array.isArray(plan_ids) && plan_ids.length > 50) {
    errors.push('Batch export limited to 50 plans maximum');
  }

  if (Array.isArray(plan_ids) && !plan_ids.every(id => Number.isInteger(id))) {
    errors.push('All plan_ids must be integers');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validate template query
const validateTemplateQuery = (req, res, next) => {
  const { course_code, academic_year } = req.query;

  const errors = [];

  if (!course_code) {
    errors.push('course_code query parameter is required');
  }

  if (course_code && typeof course_code !== 'string') {
    errors.push('course_code must be a string');
  }

  if (academic_year && !/^\d{4}-\d{4}$/.test(academic_year)) {
    errors.push('academic_year must be in format YYYY-YYYY');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

module.exports = {
  validateLearningPlan,
  validateDocumentUpload,
  validateReview,
  validateBatchExport,
  validateTemplateQuery
};
