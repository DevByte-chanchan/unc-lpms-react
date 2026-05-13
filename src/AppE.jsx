import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import AssignedCourses from "./pages/AssignedCourses.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import ReferenceForm from "./pages/ReferenceForm.jsx";
import TopicForm from "./pages/TopicForm.jsx";
import ILOForm from "./pages/ILOForm.jsx";
import AssignedTOS from "./pages/AssignedTOS.jsx";
import SyllabusRevisions from "./pages/SyllabusRevisions.jsx";
import AssessmentForm from "./pages/AssessmentForm.jsx";
import ApprovalCourses from "./pages/ApprovalCourses.jsx";
import ProgramHeadConsultant from "./pages/ProgramHeadConsultant.jsx";
import ProgramHeadIndustryConsultant from "./pages/ProgramHeadIndustryConsultant.jsx";
import ProgramHeadCourseOfferings from "./pages/ProgramHeadCourseOfferings.jsx";
import ApprovalSyllabus from "./pages/ApprovalSyllabus.jsx";
import Dean from "./pages/Dean.jsx";
import HRStaff from "./pages/HRStaff.jsx";


function App() {

  return (
      <Router>
              <div className="appPage">
                  <Routes>
                      <Route path={'/'} element={<AssignedCourses />} />
                     {/* Specific role pages - must come BEFORE the generic :approver route */}
                    <Route path={'/role/industry-consultant'} element={<ProgramHeadConsultant />} />
                    <Route path={'/role/program-head/industry-consultant'} element={<ProgramHeadIndustryConsultant />} />
                    <Route path={'/role/program-head/course-offerings'} element={<ProgramHeadCourseOfferings />} />
                    <Route path={'/role/dean'} element={<Dean />} />
                    <Route path={'/role/hr-staff'} element={<HRStaff />} />
                     {/* Generic role pages: default to approval-course-table */}
                     <Route path="/role/:approver">
                         <Route index element={<Navigate to="approval-course-table" replace />} />
                         <Route path="approval-course-table" element={<ApprovalCourses />} />
                         
                         {/* course detail for approvers -> ApprovalSyllabus */}
                         <Route path="courses/:courseName" element={<ApprovalSyllabus />} />
                     </Route>
                      <Route path={'/assignedtos'} element={<AssignedTOS />} />
                      <Route path={'/revisions/:code'} element={<SyllabusRevisions />} />
                      <Route path={'/courses/:code'} element={<Syllabus />} />
                      <Route path={'/references/form/:id'} element={<ReferenceForm />} />
                      <Route path={'/references/form/:code/:refId'} element={<ReferenceForm />} />
                      <Route path={'/topics/form/:id'} element={<TopicForm />} />
                      <Route path={'/topics/form/:code/:topicId'} element={<TopicForm />} />
                      <Route path={'/ilos/form/:code/:iloId'} element={<ILOForm />} />
                      <Route path={'/assessments/form/:code/:assessmentId'} element={<AssessmentForm />} />
                  </Routes>
              </div>
      </Router>

  )
}

export default App
