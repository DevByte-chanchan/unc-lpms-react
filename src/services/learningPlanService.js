import axios from 'axios';

const API_BASE_URL = 'http://localhost:4002/api';

const getHeaders = (role, userId) => ({
  'X-User-Role': role,
  'X-User-Id': userId
});

// Learning Plans
export const createLearningPlan = (role, userId, data) =>
  axios.post(`${API_BASE_URL}/learning-plans`, data, { headers: getHeaders(role, userId) });

export const getLearningPlans = (role, userId, filters = {}) =>
  axios.get(`${API_BASE_URL}/learning-plans`, {
    params: filters,
    headers: getHeaders(role, userId)
  });

export const getLearningPlan = (role, userId, id) =>
  axios.get(`${API_BASE_URL}/learning-plans/${id}`, { headers: getHeaders(role, userId) });

// Documents
export const uploadDocument = (role, userId, planId, formData) =>
  axios.post(`${API_BASE_URL}/learning-plans/${planId}/documents`, formData, {
    headers: {
      ...getHeaders(role, userId),
      'Content-Type': 'multipart/form-data'
    }
  });

export const deleteDocument = (role, userId, planId, docId) =>
  axios.delete(`${API_BASE_URL}/learning-plans/${planId}/documents/${docId}`, {
    headers: getHeaders(role, userId)
  });

// Submission
export const submitLearningPlan = (role, userId, id) =>
  axios.post(`${API_BASE_URL}/learning-plans/${id}/submit`, {}, {
    headers: getHeaders(role, userId)
  });

// Review
export const submitReview = (role, userId, planId, data) =>
  axios.post(`${API_BASE_URL}/learning-plans/${planId}/review`, data, {
    headers: getHeaders(role, userId)
  });

export const approveOrReturn = (role, userId, planId, data) =>
  axios.post(`${API_BASE_URL}/learning-plans/${planId}/approve`, data, {
    headers: getHeaders(role, userId)
  });

// ============ PROGRAM DOCUMENTS (NEW) ============

// Get program documents for a specific program and academic period
export const getProgramDocuments = (role, userId, programId, academicPeriodId) =>
  axios.get(`${API_BASE_URL}/program-documents`, {
    params: {
      program_id: programId,
      academic_period_id: academicPeriodId
    },
    headers: getHeaders(role, userId)
  });

// Check if all 3 program documents are uploaded
export const checkProgramDocumentsStatus = (role, userId, programId, academicPeriodId) =>
  axios.get(`${API_BASE_URL}/program-documents/status/check`, {
    params: {
      program_id: programId,
      academic_period_id: academicPeriodId
    },
    headers: getHeaders(role, userId)
  });

// Upload a single program document
export const uploadProgramDocument = (role, userId, formData) =>
  axios.post(`${API_BASE_URL}/program-documents/upload`, formData, {
    headers: {
      ...getHeaders(role, userId),
      'Content-Type': 'multipart/form-data'
    }
  });

// Batch upload all 3 program documents at once
export const batchUploadProgramDocuments = (role, userId, formData) =>
  axios.post(`${API_BASE_URL}/program-documents/batch-upload`, formData, {
    headers: {
      ...getHeaders(role, userId),
      'Content-Type': 'multipart/form-data'
    }
  });

// Delete a specific program document
export const deleteProgramDocument = (role, userId, programId, academicPeriodId, documentType) =>
  axios.delete(`${API_BASE_URL}/program-documents/${programId}/${academicPeriodId}/${documentType}`, {
    headers: getHeaders(role, userId)
  });
