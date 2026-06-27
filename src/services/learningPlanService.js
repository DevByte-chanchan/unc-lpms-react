import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_LPSM_API_URL || 'http://localhost:4002/api';

const getHeaders = (role, userId) => ({
  'X-User-Role': role,
  'X-User-Id': userId
});

export const createLearningPlan = (role, userId, data) =>
  axios.post(`${API_BASE_URL}/learning-plans`, data, { headers: getHeaders(role, userId) });

export const getLearningPlans = (role, userId, filters = {}) =>
  axios.get(`${API_BASE_URL}/learning-plans`, {
    params: filters,
    headers: getHeaders(role, userId)
  });

export const getLearningPlan = (role, userId, id) =>
  axios.get(`${API_BASE_URL}/learning-plans/${id}`, { headers: getHeaders(role, userId) });

export const uploadDocument = (role, userId, planId, formData) =>
  axios.post(`${API_BASE_URL}/learning-plans/${planId}/documents`, formData, {
    headers: { ...getHeaders(role, userId), 'Content-Type': 'multipart/form-data' }
  });

export const deleteDocument = (role, userId, planId, docId) =>
  axios.delete(`${API_BASE_URL}/learning-plans/${planId}/documents/${docId}`, {
    headers: getHeaders(role, userId)
  });

export const submitLearningPlan = (role, userId, id) =>
  axios.post(`${API_BASE_URL}/learning-plans/${id}/submit`, {}, {
    headers: getHeaders(role, userId)
  });

export const submitReview = (role, userId, planId, data) =>
  axios.post(`${API_BASE_URL}/learning-plans/${planId}/review`, data, {
    headers: getHeaders(role, userId)
  });

export const approveOrReturn = (role, userId, planId, data) =>
  axios.post(`${API_BASE_URL}/learning-plans/${planId}/approve`, data, {
    headers: getHeaders(role, userId)
  });

export const getProgramDocuments = (role, userId, programId, academicPeriodId) =>
  axios.get(`${API_BASE_URL}/program-documents`, {
    params: { program_id: programId, academic_period_id: academicPeriodId },
    headers: getHeaders(role, userId)
  });

export const checkProgramDocumentsStatus = (role, userId, programId, academicPeriodId) =>
  axios.get(`${API_BASE_URL}/program-documents/status/check`, {
    params: { program_id: programId, academic_period_id: academicPeriodId },
    headers: getHeaders(role, userId)
  });

export const uploadProgramDocument = (role, userId, formData) =>
  axios.post(`${API_BASE_URL}/program-documents/upload`, formData, {
    headers: { ...getHeaders(role, userId), 'Content-Type': 'multipart/form-data' }
  });

export const batchUploadProgramDocuments = (role, userId, formData) =>
  axios.post(`${API_BASE_URL}/program-documents/batch-upload`, formData, {
    headers: { ...getHeaders(role, userId), 'Content-Type': 'multipart/form-data' }
  });

export const deleteProgramDocument = (role, userId, programId, academicPeriodId, documentType) =>
  axios.delete(`${API_BASE_URL}/program-documents/${programId}/${academicPeriodId}/${documentType}`, {
    headers: getHeaders(role, userId)
  });

export const getLPVersions = (role, userId, id) =>
  axios.get(`${API_BASE_URL}/learning-plans/${id}/versions`, {
    headers: getHeaders(role, userId)
  });

export const getLPVersion = (role, userId, id, versionNo) =>
  axios.get(`${API_BASE_URL}/learning-plans/${id}/versions/${versionNo}`, {
    headers: getHeaders(role, userId)
  });

export const rollbackToVersion = (role, userId, planId, versionNo) =>
  axios.post(`${API_BASE_URL}/learning-plans/${planId}/rollback/${versionNo}`, {}, {
    headers: getHeaders(role, userId)
  });

export const getLPTemplate = (role, userId, courseCode) =>
  axios.get(`${API_BASE_URL}/learning-plans/template`, {
    params: { course_code: courseCode },
    headers: getHeaders(role, userId)
  });

export const getAvailableTemplates = (role, userId, courseCode) =>
  axios.get(`${API_BASE_URL}/learning-plans/templates/available`, {
    params: { course_code: courseCode },
    headers: getHeaders(role, userId)
  });

export const createFromTemplate = (role, userId, data) =>
  axios.post(`${API_BASE_URL}/learning-plans/templates/create-from`, data, {
    headers: getHeaders(role, userId)
  });

export const markAsTemplate = (role, userId, planId) =>
  axios.post(`${API_BASE_URL}/learning-plans/${planId}/mark-as-template`, {}, {
    headers: getHeaders(role, userId)
  });

export const getTemplateStats = (role, userId) =>
  axios.get(`${API_BASE_URL}/learning-plans/templates/stats`, {
    headers: getHeaders(role, userId)
  });

export const exportPDF = (role, userId, planId) =>
  axios.get(`${API_BASE_URL}/learning-plans/${planId}/export/pdf`, {
    headers: getHeaders(role, userId),
    responseType: 'blob'
  });

export const exportBatchPDF = (role, userId, planIds) =>
  axios.post(`${API_BASE_URL}/learning-plans/export/batch`, { plan_ids: planIds }, {
    headers: getHeaders(role, userId),
    responseType: 'blob'
  });
