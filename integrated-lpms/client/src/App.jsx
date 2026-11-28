import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/AuthContext.jsx';
import { getDefaultRouteForRole } from './shared/navConfig.js';
import RequireRole from './shared/RequireRole.jsx';
import Login from './shared/auth/Login.jsx';
import ForgotPassword from './shared/auth/ForgotPassword.jsx';
import ChangePassword from './shared/auth/ChangePassword.jsx';
import { ResetPassword, SetPassword } from './shared/auth/PasswordLinkPage.jsx';
import ProfilePage from './shared/ProfilePage.jsx';

// Module 1: Course Assignment Pages & Context
import { PeriodProvider } from './modules/course-assignment/services/period.jsx';
import DialogBackdrop from './modules/course-assignment/components/DialogBackdrop.jsx';
import AcademicTermsPage from './modules/course-assignment/AcademicTermsPage.jsx';
import DepartmentsPage from './modules/course-assignment/DepartmentsPage.jsx';
import UniversityVmgoPage from './modules/course-assignment/UniversityVmgoPage.jsx';
import UserAccountsPage from './modules/course-assignment/UserAccountsPage.jsx';
import DeanFacultyPage from './modules/course-assignment/DeanFacultyPage.jsx';
import DeanProgramsPage from './modules/course-assignment/DeanProgramsPage.jsx';
import DepartmentVisionMissionPage from './modules/course-assignment/DepartmentVisionMissionPage.jsx';
import CourseOfferingsPage from './modules/course-assignment/CourseOfferingsPage.jsx';
import CourseAssignmentsPage from './modules/course-assignment/CourseAssignmentsPage.jsx';
import IndustryConsultantsPage from './modules/course-assignment/IndustryConsultantsPage.jsx';

// Module 2: Learning Plan Composition Pages (100% PRESERVED PRIORITY MODULE)
import CompDashboard from './modules/composition/pages/Dashboard.jsx';
import CompAssignedCourses from './modules/composition/pages/AssignedCourses.jsx';
import CompSyllabus from './modules/composition/pages/Syllabus.jsx';
import CompTopicForm from './modules/composition/pages/TopicForm.jsx';
import CompTLAForm from './modules/composition/pages/TLAForm.jsx';
import CompReferenceForm from './modules/composition/pages/ReferenceForm.jsx';

// Module 3: Learning Plan Submissions Management Pages & Helpers
import SubmissionsQueuePage from './modules/submissions/SubmissionsQueuePage.jsx';
import LearningPlanReviewPage from './modules/submissions/LearningPlanReviewPage.jsx';
import ReferenceRepositoryPage from './modules/submissions/ReferenceRepositoryPage.jsx';
import LibraryDashboardPage from './modules/submissions/LibraryDashboardPage.jsx';
import ProgramDocumentsPage from './modules/submissions/ProgramDocumentsPage.jsx';
import SubApprovalCourses from './modules/submissions/pages/ApprovalCourses.jsx';
import SubAddReference from './modules/submissions/pages/lpsm/DirectorOfLibraries/AddReference.jsx';
import SubViewReference from './modules/submissions/pages/lpsm/DirectorOfLibraries/ViewReference.jsx';
import ResizeVeil from './modules/submissions/components/ResizeVeil.jsx';
import OverflowTooltip from './modules/submissions/components/OverflowTooltip.jsx';

function RoleHomeRedirect() {
  const { isAuthenticated, activeRole, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultRouteForRole(activeRole)} replace />;
}

function CompositionDeepLinkRedirect() {
  const { pcId, revNum, section } = useParams();
  const s = String(section || '').toLowerCase();
  const targetStatus = (s === 'returned' || s === 'revisions') ? 'returned' : (s === 'approved' ? 'approved' : 'draft');
  return <Navigate to={`/courses/${pcId}/${revNum || 1}/${targetStatus}`} replace />;
}

function CompositionScopeWrap({ children }) {
  return (
    <div
      className="lpms-composition-scope"
      style={{ width: '100vw', height: '100vh', overflow: 'auto', display: 'flex', flexDirection: 'column', background: '#F3F4F6' }}
    >
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <PeriodProvider>
        <AuthProvider>
          <DialogBackdrop />
          <ResizeVeil />
          <OverflowTooltip />
          <Routes>
          {/* Public & Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route
            path="/change-password"
            element={
              <RequireRole>
                <ChangePassword />
              </RequireRole>
            }
          />
          <Route path="/" element={<RoleHomeRedirect />} />
          <Route
            path="/profile"
            element={
              <RequireRole>
                <ProfilePage />
              </RequireRole>
            }
          />

          {/* ======================== VPAA ROUTES ======================== */}
          <Route
            path="/vpaa/academic-terms"
            element={
              <RequireRole allowedRoles={['VPAA']}>
                <AcademicTermsPage />
              </RequireRole>
            }
          />
          <Route
            path="/vpaa/departments"
            element={
              <RequireRole allowedRoles={['VPAA']}>
                <DepartmentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/vpaa/university-vmgo"
            element={
              <RequireRole allowedRoles={['VPAA']}>
                <UniversityVmgoPage />
              </RequireRole>
            }
          />
          <Route
            path="/vpaa/approved-plans"
            element={
              <RequireRole allowedRoles={['VPAA']}>
                <SubmissionsQueuePage mode="approved-only" />
              </RequireRole>
            }
          />
          <Route
            path="/vpaa/user-accounts"
            element={
              <RequireRole allowedRoles={['VPAA', 'Superuser']}>
                <UserAccountsPage />
              </RequireRole>
            }
          />

          {/* ======================== DEAN ROUTES ======================== */}
          <Route
            path="/dean/faculty"
            element={
              <RequireRole allowedRoles={['Dean', 'VPAA']}>
                <DeanFacultyPage />
              </RequireRole>
            }
          />
          <Route
            path="/dean/programs"
            element={
              <RequireRole allowedRoles={['Dean', 'VPAA']}>
                <DeanProgramsPage />
              </RequireRole>
            }
          />
          <Route
            path="/dean/vision-mission"
            element={
              <RequireRole allowedRoles={['Dean', 'VPAA']}>
                <DepartmentVisionMissionPage />
              </RequireRole>
            }
          />
          <Route
            path="/dean/learning-plans"
            element={
              <RequireRole allowedRoles={['Dean', 'VPAA']}>
                <SubmissionsQueuePage />
              </RequireRole>
            }
          />
          <Route
            path="/dean/user-accounts"
            element={
              <RequireRole allowedRoles={['Dean', 'VPAA', 'Superuser']}>
                <UserAccountsPage />
              </RequireRole>
            }
          />

          {/* ==================== PROGRAM HEAD ROUTES ==================== */}
          <Route
            path="/program-head/course-offerings"
            element={
              <RequireRole allowedRoles={['Program Head', 'Dean', 'VPAA']}>
                <CourseOfferingsPage />
              </RequireRole>
            }
          />
          <Route
            path="/program-head/course-assignments"
            element={
              <RequireRole allowedRoles={['Program Head', 'Dean', 'VPAA']}>
                <CourseAssignmentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/program-head/course-assignment"
            element={
              <RequireRole allowedRoles={['Program Head', 'Dean', 'VPAA']}>
                <CourseAssignmentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/program-head/industry-consultants"
            element={
              <RequireRole allowedRoles={['Program Head', 'Dean', 'VPAA']}>
                <IndustryConsultantsPage />
              </RequireRole>
            }
          />
          <Route
            path="/program-head/program-documents"
            element={
              <RequireRole allowedRoles={['Program Head', 'Dean', 'VPAA']}>
                <ProgramDocumentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/program-head/learning-plans"
            element={
              <RequireRole allowedRoles={['Program Head', 'Dean', 'VPAA']}>
                <SubmissionsQueuePage />
              </RequireRole>
            }
          />

          {/* =============== DIRECTOR OF LIBRARIES ROUTES ================ */}
          <Route
            path="/library/dashboard"
            element={
              <RequireRole allowedRoles={['Director of Libraries', 'VPAA']}>
                <LibraryDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/library/references"
            element={
              <RequireRole allowedRoles={['Director of Libraries', 'VPAA']}>
                <ReferenceRepositoryPage />
              </RequireRole>
            }
          />
          <Route
            path="/library/learning-plans"
            element={
              <RequireRole allowedRoles={['Director of Libraries', 'VPAA']}>
                <SubmissionsQueuePage />
              </RequireRole>
            }
          />

          {/* ================ INDUSTRY CONSULTANT ROUTES ================= */}
          <Route
            path="/consultant/learning-plans"
            element={
              <RequireRole allowedRoles={['Industry Consultant', 'Program Head', 'Dean', 'VPAA']}>
                <SubmissionsQueuePage mode="approved-only" />
              </RequireRole>
            }
          />

          {/* ============= UNIFIED SUBMISSIONS REVIEW ROUTE ============== */}
          <Route
            path="/submissions/review/:pcId"
            element={
              <RequireRole>
                <LearningPlanReviewPage />
              </RequireRole>
            }
          />

          {/* ==== VERBATIM SUBMISSIONS INTERNAL /role/* SUB-ROUTES ==== */}
          <Route
            path="/role/director-of-libraries/dashboard"
            element={
              <RequireRole allowedRoles={['Director of Libraries', 'VPAA']}>
                <LibraryDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/role/director-of-libraries/reference-library"
            element={
              <RequireRole allowedRoles={['Director of Libraries', 'VPAA']}>
                <ReferenceRepositoryPage />
              </RequireRole>
            }
          />
          <Route
            path="/role/director-of-libraries/add-reference"
            element={
              <RequireRole allowedRoles={['Director of Libraries', 'VPAA']}>
                <SubAddReference />
              </RequireRole>
            }
          />
          <Route
            path="/role/director-of-libraries/view-reference/:refId"
            element={
              <RequireRole allowedRoles={['Director of Libraries', 'VPAA']}>
                <SubViewReference />
              </RequireRole>
            }
          />
          <Route
            path="/role/director-of-libraries/edit-reference/:refId"
            element={
              <RequireRole allowedRoles={['Director of Libraries', 'VPAA']}>
                <SubAddReference />
              </RequireRole>
            }
          />
          <Route
            path="/role/director-of-libraries"
            element={
              <RequireRole allowedRoles={['Director of Libraries', 'VPAA']}>
                <SubmissionsQueuePage roleOverride="Director of Libraries" />
              </RequireRole>
            }
          />
          <Route
            path="/role/program-head/program-documents"
            element={
              <RequireRole allowedRoles={['Program Head', 'Dean', 'VPAA']}>
                <ProgramDocumentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/role/program-head/coaep"
            element={<Navigate to="/program-head/program-documents?tab=coaep" replace />}
          />
          <Route
            path="/role/program-head/co-po-alignment"
            element={<Navigate to="/program-head/program-documents?tab=course" replace />}
          />
          <Route
            path="/role/program-head/po-peo-alignment"
            element={<Navigate to="/program-head/program-documents?tab=program" replace />}
          />
          <Route
            path="/role/program-head/outcomes-alignment"
            element={<Navigate to="/program-head/program-documents?tab=program" replace />}
          />
          <Route
            path="/role/program-head/course-assignment"
            element={
              <RequireRole allowedRoles={['Program Head', 'Dean', 'VPAA']}>
                <CourseAssignmentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/role/program-head"
            element={
              <RequireRole allowedRoles={['Program Head', 'Dean', 'VPAA']}>
                <SubmissionsQueuePage roleOverride="Program Head" />
              </RequireRole>
            }
          />
          <Route
            path="/role/dean"
            element={
              <RequireRole allowedRoles={['Dean', 'VPAA']}>
                <SubmissionsQueuePage roleOverride="Dean" />
              </RequireRole>
            }
          />
          <Route
            path="/role/vpaa"
            element={
              <RequireRole allowedRoles={['VPAA']}>
                <SubmissionsQueuePage roleOverride="VPAA" />
              </RequireRole>
            }
          />
          <Route
            path="/role/industry-consultant"
            element={
              <RequireRole allowedRoles={['Industry Consultant', 'Program Head', 'Dean', 'VPAA']}>
                <SubmissionsQueuePage roleOverride="Industry Consultant" />
              </RequireRole>
            }
          />
          <Route
            path="/role/:approver/approval-course-table"
            element={
              <RequireRole>
                <SubApprovalCourses />
              </RequireRole>
            }
          />
          <Route
            path="/role/:approver/courses/:code"
            element={
              <RequireRole>
                <LearningPlanReviewPage />
              </RequireRole>
            }
          />

          {/* ======= INSTRUCTOR / MODULE 2 COMPOSITION (100% PRESERVED) ======= */}
          <Route
            path="/instructor/dashboard"
            element={
              <RequireRole>
                <CompDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireRole>
                <CompDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/instructor/assigned-courses"
            element={
              <RequireRole>
                <CompAssignedCourses />
              </RequireRole>
            }
          />
          <Route
            path="/assigned-courses"
            element={
              <RequireRole>
                <CompAssignedCourses />
              </RequireRole>
            }
          />
          <Route
            path="/courses"
            element={
              <RequireRole>
                <CompAssignedCourses />
              </RequireRole>
            }
          />
          <Route
            path="/courses/:pcId/:revNum/:status"
            element={
              <RequireRole>
                <CompSyllabus />
              </RequireRole>
            }
          />
          <Route
            path="/composition/course/:pcId/:revNum/:section"
            element={
              <RequireRole>
                <CompositionDeepLinkRedirect />
              </RequireRole>
            }
          />
          <Route
            path="/topics/form/:iloId/:status"
            element={
              <RequireRole>
                <CompTopicForm />
              </RequireRole>
            }
          />
          <Route
            path="/tlas/form/:iloId/:status"
            element={
              <RequireRole>
                <CompositionScopeWrap>
                  <CompTLAForm />
                </CompositionScopeWrap>
              </RequireRole>
            }
          />
          <Route
            path="/references/form/:iloId/:status"
            element={
              <RequireRole>
                <CompositionScopeWrap>
                  <CompReferenceForm />
                </CompositionScopeWrap>
              </RequireRole>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<RoleHomeRedirect />} />
          </Routes>
        </AuthProvider>
      </PeriodProvider>
    </Router>
  );
}
