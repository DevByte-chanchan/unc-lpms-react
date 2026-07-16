import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import AssignedCourses from "./pages/AssignedCourses.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import ReferenceForm from "./pages/ReferenceForm.jsx";
import TopicForm from "./pages/TopicForm.jsx";
import TLAForm from "./pages/TLAForm.jsx";
import AssessmentForm from "./pages/AssessmentForm.jsx";
import CommentRecorder from "./pages/CommentRecorder.jsx";
import ILOForm from "./pages/ILOForm.jsx";
import TOS from "./pages/TOS.jsx";
import AssignedTOS from "./pages/AssignedTOS.jsx";
import SyllabusRevisions from "./pages/SyllabusRevisions.jsx";
import ApprovalCourses from "./pages/ApprovalCourses.jsx";
import ProgramHead from "./pages/ProgramHead.jsx";
import DirectorOfLibraries from "./pages/DirectorOfLibraries.jsx";
import ProgramHeadConsultant from "./pages/ProgramHeadConsultant.jsx";
import ProgramHeadIndustryConsultant from "./pages/ProgramHeadIndustryConsultant.jsx";
import ProgramHeadCourseOfferings from "./pages/ProgramHeadCourseOfferings.jsx";
import COAEPUpload from "./pages/lpsm/ProgramHead/COAEPUpload.jsx";
import CoPoAlignment from "./pages/lpsm/ProgramHead/CoPoAlignment.jsx";
import PoPeoAlignment from "./pages/lpsm/ProgramHead/PoPeoAlignment.jsx";
import DirectorReferenceLibrary from "./pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx";
import DirectorAddReference from "./pages/lpsm/DirectorOfLibraries/AddReference.jsx";
import DirectorViewReference from "./pages/lpsm/DirectorOfLibraries/ViewReference.jsx";
import ApprovalSyllabus from "./pages/ApprovalSyllabus.jsx";
import Dean from "./pages/Dean.jsx";
import VPAA from "./pages/VPAA.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import { seedDemoWorkflowsCanonical } from './utils/demoCourses';
seedDemoWorkflowsCanonical()

function App() {

    return (
        <Router>
            <div className="appPage">
                <ErrorBoundary>
                    <Routes>
                        {/* --- INSTRUCTOR / DEFAULT ROUTES --- */}
                        <Route path={'/'} element={<ErrorBoundary><AssignedCourses /></ErrorBoundary>} />
                        <Route path={'/record-comments'} element={<ErrorBoundary><CommentRecorder /></ErrorBoundary>} />

                        {/* --- COURSE EDITING ROUTES --- */}
                        <Route path={'/courses/:pcId/:revNum/:status'} element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path={'/courses/:code'} element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path={'/courses/:code/:status'} element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path={'/revisions/:code'} element={<ErrorBoundary><SyllabusRevisions /></ErrorBoundary>} />

                        {/* --- TOS --- */}
                        <Route path={'/assignedtos'} element={<ErrorBoundary><AssignedTOS /></ErrorBoundary>} />
                        <Route path={'/tos/:code'} element={<ErrorBoundary><TOS /></ErrorBoundary>} />

                        {/* --- FORMS --- */}
                        <Route path={'/references/form/:iloId/:status'} element={<ErrorBoundary><ReferenceForm /></ErrorBoundary>} />
                        <Route path={'/references/form/:id'} element={<ErrorBoundary><ReferenceForm /></ErrorBoundary>} />
                        <Route path={'/references/form/:code/:refId'} element={<ErrorBoundary><ReferenceForm /></ErrorBoundary>} />
                        <Route path={'/topics/form/:iloId/:status'} element={<ErrorBoundary><TopicForm /></ErrorBoundary>} />
                        <Route path={'/topics/form/:id'} element={<ErrorBoundary><TopicForm /></ErrorBoundary>} />
                        <Route path={'/topics/form/:code/:topicId'} element={<ErrorBoundary><TopicForm /></ErrorBoundary>} />
                        <Route path={'/tlas/form/:iloId/:status'} element={<ErrorBoundary><TLAForm /></ErrorBoundary>} />
                        <Route path={'/tlas/form/:code/:iloId/:status'} element={<ErrorBoundary><TLAForm /></ErrorBoundary>} />
                        <Route path={'/ilos/form/:code/:iloId'} element={<ErrorBoundary><ILOForm /></ErrorBoundary>} />
                        <Route path={'/assessments/form/:code/:assessmentId'} element={<ErrorBoundary><AssessmentForm /></ErrorBoundary>} />

                        {/* --- ROLE-BASED APPROVER ROUTES --- */}
                        <Route path={'/role/industry-consultant'} element={<ErrorBoundary><ProgramHeadConsultant /></ErrorBoundary>} />
                        <Route path={'/role/program-head'} element={<ErrorBoundary><ProgramHead /></ErrorBoundary>} />
                        <Route path={'/role/program-head/upload-documents'} element={<ErrorBoundary><COAEPUpload /></ErrorBoundary>} />
                        <Route path={'/role/program-head/co-po-alignment'} element={<ErrorBoundary><CoPoAlignment /></ErrorBoundary>} />
                        <Route path={'/role/program-head/po-peo-alignment'} element={<ErrorBoundary><PoPeoAlignment /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries'} element={<ErrorBoundary><DirectorOfLibraries /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/upload-documents'} element={<ErrorBoundary><DirectorReferenceLibrary /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/reference-library'} element={<ErrorBoundary><DirectorReferenceLibrary /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/add-reference'} element={<ErrorBoundary><DirectorAddReference /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/view-reference/:id'} element={<ErrorBoundary><DirectorViewReference /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/edit-reference/:id'} element={<ErrorBoundary><DirectorAddReference /></ErrorBoundary>} />
                        <Route path={'/role/program-head/industry-consultant'} element={<ErrorBoundary><ProgramHeadIndustryConsultant /></ErrorBoundary>} />
                        <Route path={'/role/program-head/course-offerings'} element={<ErrorBoundary><ProgramHeadCourseOfferings /></ErrorBoundary>} />
                        <Route path={'/role/dean'} element={<ErrorBoundary><Dean /></ErrorBoundary>} />
                        <Route path={'/role/vpaa'} element={<ErrorBoundary><VPAA /></ErrorBoundary>} />

                        {/* Generic role pages: default to approval-course-table */}
                        <Route path="/role/:approver">
                            <Route index element={<Navigate to="approval-course-table" replace />} />
                            <Route path="approval-course-table" element={<ErrorBoundary><ApprovalCourses /></ErrorBoundary>} />
                            <Route path="courses/:courseName" element={<ErrorBoundary><ApprovalSyllabus /></ErrorBoundary>} />
                        </Route>
                        {/* Instructor role should use instructor course UI when browsing courses */}
                        <Route path="/role/instructor/courses/:courseName" element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                    </Routes>
                </ErrorBoundary>
            </div>
        </Router>
    )
}

export default App
