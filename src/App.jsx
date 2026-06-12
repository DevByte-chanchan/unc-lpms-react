import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { PeriodProvider, ScopedPeriodProvider } from './services/period.jsx'
import { CurrentUserProvider } from './services/currentUser.jsx'

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
import ProgramHeadCourseOfferings from "./pages/ProgramHeadCourseOfferings.jsx";
import ProgramHeadCourseAssignment from "./pages/ProgramHeadCourseAssignment.jsx";
import ApprovalSyllabus from "./pages/ApprovalSyllabus.jsx";
import Dean from "./pages/Dean.jsx";
import OVPAA from "./pages/OVPAA.jsx";

function App() {
  return (
    <Router>
      <PeriodProvider>
        <CurrentUserProvider>
        <div className="appPage">
          <Routes>
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

            {/* Each role page gets its OWN term selection (ScopedPeriodProvider),
                so viewing a past term on one page never changes another page or
                role — selection is page-local and resets to the current term on
                navigation. */}
            <Route path={'/role/industry-consultant'} element={<ProgramHeadConsultant />} />
            <Route path={'/role/program-head/industry-consultant'} element={<ScopedPeriodProvider><ProgramHeadIndustryConsultant /></ScopedPeriodProvider>} />
            <Route path={'/role/program-head/course-offerings'} element={<ScopedPeriodProvider><ProgramHeadCourseOfferings /></ScopedPeriodProvider>} />
            <Route path={'/role/program-head/course-assignment'} element={<ScopedPeriodProvider><ProgramHeadCourseAssignment /></ScopedPeriodProvider>} />
            <Route path={'/role/dean'} element={<ScopedPeriodProvider><Dean /></ScopedPeriodProvider>} />
            <Route path={'/role/ovpaa'} element={<ScopedPeriodProvider><OVPAA /></ScopedPeriodProvider>} />
            <Route path={'/role/hr-staff'} element={<ScopedPeriodProvider><OVPAA /></ScopedPeriodProvider>} />

            <Route path="/role/:approver">
              <Route index element={<Navigate to="approval-course-table" replace />} />
              <Route path="approval-course-table" element={<ApprovalCourses />} />
              <Route path="courses/:courseName" element={<ApprovalSyllabus />} />
            </Route>
          </Routes>
        </div>
        </CurrentUserProvider>
      </PeriodProvider>
    </Router>
  );
}

export default App;
