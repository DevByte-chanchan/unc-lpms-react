import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_LPSM_API_URL || 'http://localhost:4002/api';

const getHeaders = (role, userId) => ({
  'X-User-Role': role,
  'X-User-Id': userId
});

export const listApprovals = (role, userId) =>
  axios.get(`${API_BASE_URL}/syllabi/approvals`, { headers: getHeaders(role, userId) });

export const getApproval = (role, userId, courseCode) =>
  axios.get(`${API_BASE_URL}/syllabi/approvals/${courseCode}`, { headers: getHeaders(role, userId) });

export const approveSyllabus = (role, userId, courseCode, data) =>
  axios.post(`${API_BASE_URL}/syllabi/${courseCode}/approve`, data, { headers: getHeaders(role, userId) });

export const returnSyllabus = (role, userId, courseCode, data) =>
  axios.post(`${API_BASE_URL}/syllabi/${courseCode}/return`, data, { headers: getHeaders(role, userId) });

export const getSyllabusVersions = (role, userId, courseCode) =>
  axios.get(`${API_BASE_URL}/syllabi/${courseCode}/versions`, { headers: getHeaders(role, userId) });

export const getSyllabusVersion = (role, userId, courseCode, versionNo) =>
  axios.get(`${API_BASE_URL}/syllabi/${courseCode}/versions/${versionNo}`, { headers: getHeaders(role, userId) });
