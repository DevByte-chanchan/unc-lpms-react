'use strict';

const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOfferingAccess } = require('../middleware/courseAuthorization');
const {
  requireEditableByOffering,
  requireEditableByWeek,
  requireEditableByIloRef,
} = require('../middleware/editLock');
const { uploadSingle } = require('../middleware/upload');

// Auth & Account Controllers
const authCtrl = require('../controllers/auth/authController');
const userAccountCtrl = require('../controllers/auth/userAccountController');
const profileCtrl = require('../controllers/auth/profileController');
const notificationCtrl = require('../controllers/auth/notificationController');

// M1 Course Assignment Controllers
const academicPeriodCtrl = require('../controllers/courseAssignment/academicPeriodController');
const departmentCtrl = require('../controllers/courseAssignment/departmentController');
const facultyCtrl = require('../controllers/courseAssignment/facultyController');
const programCtrl = require('../controllers/courseAssignment/programController');
const courseCtrl = require('../controllers/courseAssignment/courseController');
const courseAssignCtrl = require('../controllers/courseAssignment/courseOfferingAssignmentController');
const consultantCtrl = require('../controllers/courseAssignment/industryConsultantController');
const supportingCtrl = require('../controllers/courseAssignment/supportingController');

// M2 Learning Plan Composition Controllers (PRIORITY MODULE)
const dashboardCtrl = require('../controllers/composition/dashboardController');
const courseDetailsCtrl = require('../controllers/composition/courseDetailsController');
const courseOutcomeAlignmentCtrl = require('../controllers/composition/courseOutcomeAlignmentController');
const iloCtrl = require('../controllers/composition/iloController');
const iloScheduleCtrl = require('../controllers/composition/iloScheduleController');
const courseCriteriaCtrl = require('../controllers/composition/courseCriteriaController');
const courseCoverageCtrl = require('../controllers/composition/courseCoverageController');
const topicCtrl = require('../controllers/composition/topicController');
const tlaCtrl = require('../controllers/composition/tlaController');
const iloRefCtrl = require('../controllers/composition/iloReferenceController');
const refSummaryCtrl = require('../controllers/composition/referenceSummaryController');
const revisionCtrl = require('../controllers/composition/revisionController');
const submissionCtrl = require('../controllers/composition/submissionController');

// M3 Learning Plan Submissions Management Controllers
const workflowCtrl = require('../controllers/submissions/assignmentWorkflowController');
const commentCtrl = require('../controllers/submissions/commentController');
const refLibCtrl = require('../controllers/submissions/referenceLibraryController');
const progDocCtrl = require('../controllers/submissions/programDocumentsController');
const deadlineConsultCtrl = require('../controllers/submissions/deadlinesAndConsultantsController');

/* ============================================================================
 * 1. AUTHENTICATION, PROFILE, USER ACCOUNTS & NOTIFICATIONS
 * ============================================================================ */
router.get('/auth/demo-accounts', authCtrl.getDemoAccounts);
router.post('/auth/login', authCtrl.login);
router.post('/auth/logout', authCtrl.logout);
router.get('/auth/me', authCtrl.getMe);
router.get('/auth/session', authCtrl.getSession);
router.post('/auth/switch-role', requireAuth, authCtrl.switchRole);
router.post('/auth/change-password', requireAuth, authCtrl.changePassword);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.post('/auth/reset-password', authCtrl.resetPassword);
router.get('/auth/invitations/:token', authCtrl.getInvitation);
router.post('/auth/invitations/:token/accept', authCtrl.acceptInvitation);

// Profile & E-Signature
router.get('/profile', requireAuth, profileCtrl.getProfile);
router.put('/profile', requireAuth, profileCtrl.updateProfile);
router.post('/profile/signature', requireAuth, uploadSingle('signature'), profileCtrl.uploadSignature);
router.get('/profile/signature', requireAuth, profileCtrl.getSignature);
router.get('/profile/signature/:userId', requireAuth, profileCtrl.getSignature);
router.delete('/profile/signature', requireAuth, profileCtrl.deleteSignature);

// User Accounts & Audit Logs (VPAA / Superuser)
router.get('/user-accounts', requireAuth, requireRole('VPAA', 'Superuser'), userAccountCtrl.listAccounts);
router.post('/user-accounts', requireAuth, requireRole('VPAA', 'Superuser'), userAccountCtrl.createAccount);
router.put('/user-accounts/:id', requireAuth, requireRole('VPAA', 'Superuser'), userAccountCtrl.updateAccount);
router.patch('/user-accounts/:id/status', requireAuth, requireRole('VPAA', 'Superuser'), userAccountCtrl.toggleStatus);
router.get('/audit-logs', requireAuth, requireRole('VPAA', 'Superuser', 'Dean'), userAccountCtrl.listAuditLogs);

// Notifications (Unified M1/M2/M3)
router.get('/notifications', requireAuth, notificationCtrl.listNotifications);
router.get('/notifications/unread-count', requireAuth, notificationCtrl.getUnreadCount);
router.patch('/notifications/read-all', requireAuth, notificationCtrl.markAllRead);
router.post('/notifications/read-all', requireAuth, notificationCtrl.markAllRead);
router.patch('/notifications/view-all', requireAuth, notificationCtrl.markAllRead);
router.post('/notifications/view-all', requireAuth, notificationCtrl.markAllRead);
router.patch('/notifications/:id/read', requireAuth, notificationCtrl.markOneRead);
router.post('/notifications/:id/read', requireAuth, notificationCtrl.markOneRead);
router.patch('/notifications/:logId/view', requireAuth, notificationCtrl.markLogViewed);
router.post('/notifications/:logId/view', requireAuth, notificationCtrl.markLogViewed);

/* ============================================================================
 * 2. MODULE 1: COURSE ASSIGNMENT & ACADEMIC GOVERNANCE
 * ============================================================================ */
// Academic Periods (Terms)
router.get('/academic-periods', academicPeriodCtrl.listPeriods);
router.get('/academic-periods/current', academicPeriodCtrl.getCurrentPeriod);
router.post('/academic-periods', requireAuth, requireRole('VPAA'), academicPeriodCtrl.createPeriod);
router.put('/academic-periods/:id', requireAuth, requireRole('VPAA'), academicPeriodCtrl.updatePeriod);
router.post('/academic-periods/:id/close', requireAuth, requireRole('VPAA'), academicPeriodCtrl.closePeriod);
router.post('/academic-periods/:id/reopen', requireAuth, requireRole('VPAA'), academicPeriodCtrl.reopenPeriod);
router.delete('/academic-periods/:id', requireAuth, requireRole('VPAA'), academicPeriodCtrl.deletePeriod);

// Departments & Dean Accounts
router.get('/departments', requireAuth, departmentCtrl.listDepartments);
router.post('/departments', requireAuth, requireRole('VPAA'), departmentCtrl.createDepartment);
router.put('/departments/:id', requireAuth, requireRole('VPAA'), departmentCtrl.updateDepartment);
router.post('/departments/:id/unlist', requireAuth, requireRole('VPAA'), departmentCtrl.unlistDepartment);
router.post('/departments/:id/invite-dean', requireAuth, requireRole('VPAA'), departmentCtrl.inviteDean);
router.delete('/departments/:id', requireAuth, requireRole('VPAA'), departmentCtrl.deleteDepartment);

// Faculty Directory & Accounts
router.get('/faculty', requireAuth, facultyCtrl.listFaculty);
router.post('/faculty', requireAuth, requireRole('VPAA', 'Dean'), facultyCtrl.createFaculty);
router.put('/faculty/:id', requireAuth, requireRole('VPAA', 'Dean'), facultyCtrl.updateFaculty);
router.post('/faculty/:id/inactivate', requireAuth, requireRole('VPAA', 'Dean'), facultyCtrl.inactivateFaculty);
router.post('/faculty/:id/invite', requireAuth, requireRole('VPAA', 'Dean'), facultyCtrl.inviteFaculty);
router.delete('/faculty/:id', requireAuth, requireRole('VPAA', 'Dean'), facultyCtrl.deleteFaculty);

// Programs & Program Heads
router.get('/programs', requireAuth, programCtrl.listPrograms);
router.post('/programs', requireAuth, requireRole('VPAA', 'Dean'), programCtrl.createProgram);
router.put('/programs/:id', requireAuth, requireRole('VPAA', 'Dean'), programCtrl.updateProgram);
router.delete('/programs/:id', requireAuth, requireRole('VPAA', 'Dean'), programCtrl.deleteProgram);

// Courses & Program of Study
router.get('/courses/prereq-options', requireAuth, courseCtrl.getPrereqOptions);
router.get('/courses', requireAuth, courseCtrl.listCourses);
router.post('/courses', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), courseCtrl.createCourse);
router.put('/courses/:id', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), courseCtrl.updateCourse);
router.delete('/courses/:id', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), courseCtrl.deleteCourse);

// M1 Course Offering Assignments (wired to M2 ProgramCourseOffering via offeringSyncService)
router.get('/course-assignments/faculty-load', requireAuth, courseAssignCtrl.getFacultyLoad);
router.get('/course-assignments/history', requireAuth, courseAssignCtrl.getHistory);
router.get('/course-assignments', requireAuth, courseAssignCtrl.listAssignments);
router.post('/course-assignments', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), courseAssignCtrl.createAssignment);
router.put('/course-assignments/:id', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), courseAssignCtrl.updateAssignment);
router.delete('/course-assignments/:id', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), courseAssignCtrl.deleteAssignment);

// Industry Consultants (M1 + M3 bridged)
router.get('/industry-consultants/my-courses', requireAuth, consultantCtrl.getMyAssignedCourses);
router.get('/industry-consultants', requireAuth, consultantCtrl.listConsultants);
router.post('/industry-consultants', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), consultantCtrl.createConsultant);
router.post('/industry-consultants/:id/assign-course', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), consultantCtrl.assignCourse);
router.put('/industry-consultants/:id', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), consultantCtrl.updateConsultant);
router.delete('/industry-consultants/:id', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), consultantCtrl.deleteConsultant);

// University VMGO, Department Vision/Mission, Archive, Supporting Records
router.get('/university-statements', requireAuth, supportingCtrl.getUniversityStatements);
router.post('/university-statements', requireAuth, requireRole('VPAA'), supportingCtrl.saveUniversityStatement);
router.put('/university-statements', requireAuth, requireRole('VPAA'), supportingCtrl.saveUniversityStatement);

router.get('/department-statements', requireAuth, supportingCtrl.getDepartmentStatements);
router.post('/department-statements', requireAuth, requireRole('VPAA', 'Dean'), supportingCtrl.saveDepartmentStatement);
router.put('/department-statements', requireAuth, requireRole('VPAA', 'Dean'), supportingCtrl.saveDepartmentStatement);

router.get('/archive', requireAuth, supportingCtrl.getArchive);
router.get('/imports', requireAuth, supportingCtrl.listImports);
router.get('/curriculum-documents', requireAuth, supportingCtrl.listCurriculumDocuments);
router.get('/school-calendars', requireAuth, supportingCtrl.listSchoolCalendars);

/* ============================================================================
 * 3. MODULE 2: LEARNING PLAN COMPOSITION (PRIORITY MODULE — 100% PRESERVED)
 * ============================================================================ */
// Instructor Dashboard
router.get('/dashboard/summary', requireAuth, dashboardCtrl.getDashboardSummary);
router.get('/dashboard', requireAuth, dashboardCtrl.getDashboardSummary);

// Course Details (Seam #2: metadata from M1 Courses & Offerings)
router.get('/course-details/:pcId/:revNum', requireAuth, requireOfferingAccess, courseDetailsCtrl.getCourseDetailsByPcOffering);
router.put('/course-details/:pcId/:revNum', requireAuth, requireEditableByOffering, courseDetailsCtrl.updateCourseDetailsByPcOffering);

// Course Outcomes & Program Outcomes (CO-PO) Alignment (Seam #3: synced from M3)
router.get('/course-outcome-alignment/:pcId/:revNum', requireAuth, requireOfferingAccess, courseOutcomeAlignmentCtrl.getCourseProgramOutcomeAlignment);
router.put('/course-outcome-alignment/:pcId/:revNum', requireAuth, requireEditableByOffering, courseOutcomeAlignmentCtrl.updateCourseProgramOutcomeAlignment);

// ILOs & Schedule Distribution (Seam #4a: COs/ILOs from M3 COAEP)
router.get('/ilos/:pcId/:revNum', requireAuth, requireOfferingAccess, iloCtrl.getILOsByPcOffering);
router.put('/ilos/:ilo_id/schedule', requireAuth, requireEditableByWeek, iloScheduleCtrl.updateIloSchedule);

// Criteria for Grading (Seam #5: baseline from M3 COAEP + interactive validation)
router.get('/course-criteria/:pcId/:revNum', requireAuth, requireOfferingAccess, courseCriteriaCtrl.getCourseCriteriaByPcOffering);
router.put('/course-criteria/:pcId/:revNum', requireAuth, requireEditableByOffering, courseCriteriaCtrl.updateCourseCriteriaByPcOffering);

// Course Coverage Preview (Print-ready syllabus matrix)
router.get('/course-coverage/:pcId/:revNum', requireAuth, requireOfferingAccess, courseCoverageCtrl.getCourseCoverage);

// Course Reference Summary (APA / Category grouped)
router.get('/courses/:pcId/:revNum/references', requireAuth, requireOfferingAccess, refSummaryCtrl.getReferenceSummary);

// Weekly Topics & Subtopics (Seam #4b: M2 full CRUD + Copy-on-Write + Previous Import + AI Suggest)
router.get('/topics/week-context/:weekId', requireAuth, topicCtrl.getWeekContext);
router.get('/topics/available', requireAuth, topicCtrl.getAvailableTopics);
router.get('/topics/previous/:weekId', requireAuth, topicCtrl.getPreviousTopics);
router.get('/topics/assigned/:iloId', requireAuth, topicCtrl.getAssignedTopics);
router.post('/topics/assign', requireAuth, requireEditableByWeek, topicCtrl.assignTopicsToILO);
router.post('/topics/ai-suggest', requireAuth, topicCtrl.suggestTopicsWithAI);

// Weekly TLAs & Assessments (Seam #4b: M2 full CRUD + 300-min budget)
router.get('/tlas/available', requireAuth, tlaCtrl.getAvailableTlas);
router.get('/tlas/previous/:weekId', requireAuth, tlaCtrl.getPreviousTlas);
router.get('/tlas/ilo/:iloId', requireAuth, tlaCtrl.getTlasForIlo);
router.post('/tlas/ilo/:iloId', requireAuth, requireEditableByWeek, tlaCtrl.syncTlasToIlo);
router.get('/tlas/week/:weekId', requireAuth, tlaCtrl.getTlasForIlo);
router.post('/tlas/week/:weekId', requireAuth, requireEditableByWeek, tlaCtrl.syncTlasToIlo);

// Weekly References (Seam #4c: backed by M3 Unified Reference Repository)
router.get('/ilo-references/previous/:iloId', requireAuth, iloRefCtrl.getPreviousReferences);
router.get('/ilo-references/:iloId', requireAuth, iloRefCtrl.getReferencesByILO);
router.post('/ilo-references/assign', requireAuth, requireEditableByWeek, iloRefCtrl.assignReferencesToILO);
router.delete('/ilo-references/:iloReferenceId', requireAuth, requireEditableByIloRef, iloRefCtrl.deleteILOReference);

// Revision History & Submission
router.get('/revisions/:pcId', requireAuth, requireOfferingAccess, revisionCtrl.getRevisionsByOffering);
router.post('/submit-learning-plan/:pcId/:revNum', requireAuth, requireEditableByOffering, submissionCtrl.submitLearningPlan);

/* ============================================================================
 * 4. MODULE 3: LEARNING PLAN SUBMISSIONS MANAGEMENT & APPROVAL WORKFLOW
 * ============================================================================ */
// Unified Assignments & Workflow State Machine
router.get('/assignments/waiting-on-me', requireAuth, workflowCtrl.getWaitingOnMe);
router.post('/assignments/action', requireAuth, workflowCtrl.performWorkflowAction);
router.get('/assignments', requireAuth, workflowCtrl.listAssignments);
router.get('/assignments/:pcId/workflow', requireAuth, workflowCtrl.getOfferingWorkflow);
router.get('/assignments/:pcId/checks', requireAuth, workflowCtrl.getPlanChecks);
router.get('/assignments/:pcId/review-record', requireAuth, workflowCtrl.getReviewRecord);
router.get('/assignments/:pcId/signatures', requireAuth, workflowCtrl.getOfferingSignatures);
router.post('/assignments/:pcId/start-revision', requireAuth, requireRole('Program Head', 'Dean', 'VPAA', 'Instructor'), deadlineConsultCtrl.startRevision);
router.post('/assignments/:pcId/carry-over', requireAuth, requireRole('Program Head', 'Dean', 'VPAA'), deadlineConsultCtrl.carryOverOffering);
router.get('/assignments/:pcId/export-bundle', requireAuth, deadlineConsultCtrl.getExportBundle);
router.get('/assignments/:pcId', requireAuth, workflowCtrl.getOfferingWorkflow);

// Review Comments & Industry Consultant Suggestions (Unified M2 + M3)
router.get('/comments/unresolved-counts/:pcId/:revNum', requireAuth, commentCtrl.getUnresolvedCounts);
router.get('/comments/unresolved-counts/:pcId', requireAuth, commentCtrl.getUnresolvedCounts);
router.get('/comments/filter/:weekId/:type', requireAuth, commentCtrl.getCommentsByWeekAndType);
router.get('/comments/offering/:pcId', requireAuth, commentCtrl.getCommentsByOffering);
router.get('/comments/course/:courseCode', requireAuth, commentCtrl.getCommentsByCourseCode);
router.get('/comments/suggestions/:pcId', requireAuth, commentCtrl.listSuggestions);
router.post('/comments/suggestions/:pcId', requireAuth, requireRole('Industry Consultant', 'Program Head', 'Dean', 'VPAA'), commentCtrl.createSuggestion);
router.put('/comments/update-resolution', requireAuth, commentCtrl.updateResolution);
router.post('/comments', requireAuth, commentCtrl.createComment);
router.delete('/comments/:commentId', requireAuth, commentCtrl.deleteComment);

// Reference Library & Catalog (Director of Libraries + Composition Picker)
router.get('/references/types', refLibCtrl.getReferenceTypes);
router.get('/references/health', requireAuth, refLibCtrl.getLibraryHealth);
router.get('/references', requireAuth, refLibCtrl.listReferences);
router.post('/references', requireAuth, refLibCtrl.createReference);
router.put('/references/:id', requireAuth, refLibCtrl.updateReference);
router.patch('/references/:id/archive', requireAuth, requireRole('Director of Libraries', 'VPAA'), refLibCtrl.archiveReference);
router.delete('/references/:id', requireAuth, requireRole('Director of Libraries', 'VPAA'), refLibCtrl.deleteReference);

router.get('/course-references', requireAuth, refLibCtrl.listCourseReferences);
router.post('/course-references', requireAuth, requireRole('Director of Libraries', 'Program Head', 'Instructor'), refLibCtrl.fileCourseReference);

router.get('/catalog-settings', requireAuth, refLibCtrl.getCatalogSettings);
router.put('/catalog-settings', requireAuth, requireRole('Director of Libraries', 'VPAA'), refLibCtrl.updateCatalogSettings);

router.get('/title-requests', requireAuth, refLibCtrl.listTitleRequests);
router.post('/title-requests', requireAuth, refLibCtrl.createTitleRequest);
router.put('/title-requests/:id', requireAuth, requireRole('Director of Libraries', 'VPAA'), refLibCtrl.decideTitleRequest);

// Program Documents, Front Pages, PO-PEO, Course Documents (COAEP/CO-PO) & Form Settings
router.get('/program-outcomes', requireAuth, progDocCtrl.getProgramOutcomes);
router.put('/program-outcomes', requireAuth, requireRole('Program Head', 'Dean', 'VPAA'), progDocCtrl.saveProgramOutcomes);

router.post('/programs/:programId/front-page', requireAuth, requireRole('Program Head', 'Dean', 'VPAA'), uploadSingle('file'), progDocCtrl.uploadFrontPage);
router.get('/programs/:programId/front-page', requireAuth, progDocCtrl.getFrontPagePdf);
router.delete('/programs/:programId/front-page', requireAuth, requireRole('Program Head', 'Dean', 'VPAA'), progDocCtrl.deleteFrontPage);

router.get('/course-documents', requireAuth, progDocCtrl.listCourseDocuments);
router.post('/course-documents', requireAuth, requireRole('Program Head', 'Dean', 'VPAA'), uploadSingle('file'), progDocCtrl.saveCourseDocument);
router.post('/course-documents/:pcId/coaep', requireAuth, requireRole('Program Head', 'Dean', 'VPAA'), uploadSingle('file'), (req, res, next) => {
  req.body = { ...req.body, pc_offering_id: req.params.pcId, kind: 'coaep' };
  return progDocCtrl.saveCourseDocument(req, res, next);
});
router.get('/course-documents/:pcId/coaep', requireAuth, progDocCtrl.getCoaepByOffering);

router.get('/form-settings', requireAuth, progDocCtrl.listFormSettings);
router.put('/form-settings/:formKey', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), progDocCtrl.updateFormSetting);

// Term Deadlines, Missing Submissions & Reminders
router.get('/term-deadlines', requireAuth, deadlineConsultCtrl.listTermDeadlines);
router.post('/term-deadlines', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), deadlineConsultCtrl.saveTermDeadline);
router.put('/term-deadlines', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), deadlineConsultCtrl.saveTermDeadline);
router.delete('/term-deadlines/:id', requireAuth, requireRole('VPAA', 'Dean', 'Program Head'), deadlineConsultCtrl.deleteTermDeadline);
router.get('/missing-submissions', requireAuth, deadlineConsultCtrl.listMissingSubmissions);
router.post('/reminders/:pcId/toggle-pause', requireAuth, requireRole('Program Head', 'Dean', 'VPAA'), deadlineConsultCtrl.toggleReminderPause);
router.post('/reminders/:pcId/send-now', requireAuth, requireRole('Program Head', 'Dean', 'VPAA'), deadlineConsultCtrl.sendReminderNow);

// Industry Consultant Signoffs on Approved Plans
router.get('/course-consultants', requireAuth, deadlineConsultCtrl.listCourseConsultants);
router.post('/course-consultants/signoff/:pcId', requireAuth, requireRole('Industry Consultant'), deadlineConsultCtrl.signoffApprovedPlan);

module.exports = router;
