import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { PeriodProvider, ScopedPeriodProvider } from './services/period.jsx'
import { CurrentUserProvider } from './services/currentUser.jsx'
import DialogBackdrop from './components/DialogBackdrop.jsx'
import { RequireAuth, RequireRole, RequireApproverRole, HomeRedirect, HrStaffRedirect } from './components/RequireAuth.jsx'
import Login from './pages/Login.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import SetPassword from './pages/SetPassword.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

import AssignedCourses from "./pages/AssignedCourses.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import ReferenceForm from "./pages/ReferenceForm.jsx";
import TopicForm from "./pages/TopicForm.jsx";
import ILOForm from "./pages/ILOForm.jsx";
import AssignedTOS from "./pages/AssignedTOS.jsx";
import AssessmentForm from "./pages/AssessmentForm.jsx";
import TOS from "./pages/TOS.jsx";

import SyllabusRevisions from "./pages/SyllabusRevisions.jsx";
import ApprovalCourses from "./pages/ApprovalCourses.jsx";
import ProgramHeadConsultant from "./pages/ProgramHeadConsultant.jsx";
import ProgramHeadIndustryConsultant from "./pages/ProgramHeadIndustryConsultant.jsx";
import ProgramHeadCourses from "./pages/ProgramHeadCourses.jsx";
import ProgramHeadCourseAssignment from "./pages/ProgramHeadCourseAssignment.jsx";
import ApprovalSyllabus from "./pages/ApprovalSyllabus.jsx";
import Dean from "./pages/Dean.jsx";
import OVPAA from "./pages/OVPAA.jsx";
import { homeFor } from './services/roles.js'

const PROGRAM_HEAD_HOME = homeFor('Program Head');

function App() {
  return (
    <Router>
      <PeriodProvider>
        <CurrentUserProvider>
        {/* The app's one modal dim layer. Mounted here, never by a dialog — see
            services/dialogBackdrop.js for why. */}
        <DialogBackdrop />
        <div className="appPage">
          <Routes>
            {/* Public. The emailed-link pages sit here, OUTSIDE RequireAuth, so the
                catch-all HomeRedirect below can never send a link to whoever
                happens to be signed in. */}
            <Route path={'/login'} element={<Login />} />
            <Route path={'/set-password'} element={<SetPassword />} />
            <Route path={'/forgot-password'} element={<ForgotPassword />} />
            <Route path={'/reset-password'} element={<ResetPassword />} />
            {/* Signed in; reachable even while a password change is forced. */}
            <Route path={'/change-password'} element={<RequireAuth allowPasswordChange><ChangePassword /></RequireAuth>} />

            {/* Everything else: signed in, password settled, and the right role. */}
            <Route element={<RequireAuth><Outlet /></RequireAuth>}>
              <Route element={<RequireRole role="Instructor"><Outlet /></RequireRole>}>
                <Route path={'/'} element={<AssignedCourses />} />
                <Route path={'/assignedtos'} element={<AssignedTOS />} />

                <Route path={'/courses/:code'} element={<Syllabus />} />
                <Route path={'/revisions/:code'} element={<SyllabusRevisions />} />

                <Route path={'/references/form/:id'} element={<ReferenceForm />} />
                <Route path={'/references/form/:code/:refId'} element={<ReferenceForm />} />
                <Route path={'/topics/form/:id'} element={<TopicForm />} />
                <Route path={'/topics/form/:code/:topicId'} element={<TopicForm />} />
                <Route path={'/ilos/form/:code/:iloId'} element={<ILOForm />} />
                <Route path={'/assessments/form/:code/:assessmentId'} element={<AssessmentForm />} />

                <Route path={'/tos/:code'} element={<TOS />} />
              </Route>

              {/* Each role page gets its OWN term selection (ScopedPeriodProvider),
                  so viewing a past term on one page never changes another page or
                  role — selection is page-local and resets to the current term on
                  navigation. */}
              <Route path={'/role/industry-consultant'} element={<RequireRole role="Industry Consultant"><ProgramHeadConsultant /></RequireRole>} />
              <Route element={<RequireRole role="Program Head"><Outlet /></RequireRole>}>
                <Route path={'/role/program-head/industry-consultant'} element={<ScopedPeriodProvider><ProgramHeadIndustryConsultant /></ScopedPeriodProvider>} />
                <Route path={'/role/program-head/course-offerings'} element={<ScopedPeriodProvider><ProgramHeadCourses /></ScopedPeriodProvider>} />
                <Route path={'/role/program-head/course-assignment'} element={<ScopedPeriodProvider><ProgramHeadCourseAssignment /></ScopedPeriodProvider>} />
                {/* Program Heads have no Syllabus page any more: old links (and the
                    bare /role/program-head) land on Course Offerings. Listed before
                    the generic /role/:approver routes, which still serve the
                    Director of Libraries and Industry Consultant. */}
                <Route path={'/role/program-head'} element={<Navigate to={PROGRAM_HEAD_HOME} replace />} />
                <Route path={'/role/program-head/approval-course-table'} element={<Navigate to={PROGRAM_HEAD_HOME} replace />} />
                <Route path={'/role/program-head/courses/:courseName'} element={<Navigate to={PROGRAM_HEAD_HOME} replace />} />
              </Route>
              <Route path={'/role/dean'} element={<RequireRole role="Dean"><ScopedPeriodProvider><Dean /></ScopedPeriodProvider></RequireRole>} />
              <Route path={'/role/ovpaa'} element={<RequireRole role="VPAA"><ScopedPeriodProvider><OVPAA /></ScopedPeriodProvider></RequireRole>} />
              {/* There is no HR Staff role; its pages are the VPAA's. */}
              <Route path={'/role/hr-staff'} element={<HrStaffRedirect />} />

              <Route path="/role/:approver" element={<RequireApproverRole><Outlet /></RequireApproverRole>}>
                <Route index element={<Navigate to="approval-course-table" replace />} />
                <Route path="approval-course-table" element={<ApprovalCourses />} />
                <Route path="courses/:courseName" element={<ApprovalSyllabus />} />
              </Route>

              <Route path="*" element={<HomeRedirect />} />
            </Route>
          </Routes>
        </div>
        </CurrentUserProvider>
      </PeriodProvider>
    </Router>
  );
}

export default App;
