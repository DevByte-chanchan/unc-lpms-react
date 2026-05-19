import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import AssignedCourses from "./pages/AssignedCourses.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import ReferenceForm from "./pages/ReferenceForm.jsx";
import TopicForm from "./pages/TopicForm.jsx";
import ILOForm from "./pages/ILOForm.jsx";
import AssignedTOS from "./pages/AssignedTOS.jsx";
import AssessmentForm from "./pages/AssessmentForm.jsx";
import TOS from "./pages/TOS.jsx"; // Kept from your version

import SyllabusRevisions from "./pages/SyllabusRevisions.jsx";
import ApprovalCourses from "./pages/ApprovalCourses.jsx";
import ProgramHead from "./pages/ProgramHead.jsx";
import DirectorOfLibraries from "./pages/DirectorOfLibraries.jsx";
import ProgramHeadConsultant from "./pages/ProgramHeadConsultant.jsx";
import ProgramHeadIndustryConsultant from "./pages/ProgramHeadIndustryConsultant.jsx";
import ProgramHeadCourseOfferings from "./pages/ProgramHeadCourseOfferings.jsx";
import ApprovalSyllabus from "./pages/ApprovalSyllabus.jsx";
import Dean from "./pages/Dean.jsx";
import HRStaff from "./pages/HRStaff.jsx";

// Instructor LPSM Pages
import InstructorDashboard from "./pages/lpsm/InstructorDashboard.jsx";
import DocumentsViewer from "./pages/lpsm/DocumentsViewer.jsx";

// Program Head & Director LPSM Pages
import ProgramHeadDashboard from "./pages/lpsm/ProgramHeadDashboard.jsx";
import ProgramHeadUpload from "./pages/lpsm/ProgramHeadUpload.jsx";
import ProgramHeadDocumentUpload from "./pages/lpsm/ProgramHead/DocumentUpload.jsx";
import COAEPUpload from "./pages/lpsm/ProgramHead/COAEPUpload.jsx";
import DirectorDocumentUpload from "./pages/lpsm/DirectorOfLibraries/DocumentUpload.jsx";
import DirectorReferenceLibrary from "./pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx";
import DirectorAddReference from "./pages/lpsm/DirectorOfLibraries/AddReference.jsx";
import DirectorViewReference from "./pages/lpsm/DirectorOfLibraries/ViewReference.jsx";
import { seedDemoWorkflows } from './utils/workflowHelpers';

// ── Seed demo data only if none exists ───────────────────────────────────
;(function seedOnce() {
  const CURRENT_SEED_VERSION = 'v4'
  const versionFlag = `lpsm_seed_version_${CURRENT_SEED_VERSION}`
  if (localStorage.getItem(versionFlag)) {
    // Already seeded at this version — maintain existing data
    return
  }
  // Version mismatch or first visit — clear old flags so seedDemoWorkflows runs fresh
  ;['lpsm_full_seed_v1', 'lpsm_workflow_seeded_v1', 'lpsm_workflow_seeded_v2', 'lpsm_workflow_seeded_v3'].forEach(k => {
    try { localStorage.removeItem(k) } catch (e) {}
  })

  const refPool = [
    { id: "TB1", title: "Software Engineering: A Practitioner's Approach", type: "Textbook", authors: "Roger S. Pressman", year: 2020, isbn: "978-1260548006", link: "" },
    { id: "TB2", title: "Software Engineering", type: "Textbook", authors: "Ian Sommerville", year: 2021, isbn: "978-0133943030", link: "" },
    { id: "TB3", title: "Clean Architecture", type: "Textbook", authors: "Robert C. Martin", year: 2018, isbn: "978-0134494166", link: "" },
    { id: "TB4", title: "Operating System Concepts", type: "Textbook", authors: "Silberschatz, Galvin, Gagne", year: 2019, isbn: "978-1119456339", link: "" },
    { id: "TB5", title: "Computer Networking: A Top-Down Approach", type: "Textbook", authors: "Kurose & Ross", year: 2022, isbn: "978-0136681557", link: "" },
    { id: "TB6", title: "Database System Concepts", type: "Textbook", authors: "Silberschatz, Korth, Sudarshan", year: 2020, isbn: "978-1260084504", link: "" },
    { id: "TB7", title: "Discrete Mathematics and Its Applications", type: "Textbook", authors: "Kenneth H. Rosen", year: 2019, isbn: "978-1259676512", link: "" },
    { id: "TB8", title: "Introduction to Algorithms", type: "Textbook", authors: "Cormen, Leiserson, Rivest, Stein", year: 2022, isbn: "978-0262046305", link: "" },
    { id: "OE1", title: "SWEBOK", type: "Open Educational Resources", authors: "IEEE Computer Society", year: 2021, isbn: "", link: "https://www.computer.org/education/bodies-of-knowledge/software-engineering" },
    { id: "OE2", title: "MIT 6.828: Operating Systems Engineering", type: "Open Educational Resources", authors: "MIT OpenCourseWare", year: 2022, isbn: "", link: "https://pdos.csail.mit.edu/6.828/" },
    { id: "OE3", title: "Beej's Guide to Network Programming", type: "Open Educational Resources", authors: "Brian Hall", year: 2023, isbn: "", link: "https://beej.us/guide/bgnet/" },
    { id: "OE4", title: "Stanford Database Course", type: "Open Educational Resources", authors: "Jennifer Widom", year: 2021, isbn: "", link: "https://cs145-fb.stanford.edu/" },
    { id: "OE5", title: "FreeCodeCamp Web Design Certification", type: "Open Educational Resources", authors: "FreeCodeCamp", year: 2023, isbn: "", link: "https://www.freecodecamp.org/" },
    { id: "OR1", title: "Agile Manifesto", type: "Online Resources", authors: "Agile Alliance", year: 2001, isbn: "", link: "https://agilemanifesto.org/" },
    { id: "OR2", title: "OWASP Top Ten", type: "Online Resources", authors: "OWASP Foundation", year: 2021, isbn: "", link: "https://owasp.org/www-project-top-ten/" },
    { id: "OR3", title: "MDN Web Docs", type: "Online Resources", authors: "Mozilla", year: 2023, isbn: "", link: "https://developer.mozilla.org/" },
    { id: "OR4", title: "NIST Cybersecurity Framework", type: "Online Resources", authors: "NIST", year: 2024, isbn: "", link: "https://www.nist.gov/cyberframework" },
    { id: "OR5", title: "PostgreSQL Documentation", type: "Online Resources", authors: "PostgreSQL Global Development Group", year: 2024, isbn: "", link: "https://www.postgresql.org/docs/" },
    { id: "OR6", title: "Scikit-learn Documentation", type: "Online Resources", authors: "Scikit-learn Developers", year: 2024, isbn: "", link: "https://scikit-learn.org/stable/" },
  ]
  localStorage.setItem('lpsm_reference_library_v1', JSON.stringify(refPool))
  if (!localStorage.getItem('approval_comments_v1')) localStorage.setItem('approval_comments_v1', JSON.stringify([]))
  if (!localStorage.getItem('lpsm_suggestions_v1')) localStorage.setItem('lpsm_suggestions_v1', JSON.stringify([]))
  if (!localStorage.getItem('lpsm_documents_v1')) localStorage.setItem('lpsm_documents_v1', JSON.stringify({}))
  if (!localStorage.getItem('lpsm_uploads_v1')) localStorage.setItem('lpsm_uploads_v1', JSON.stringify({}))
  localStorage.setItem(versionFlag, '1')
})()

seedDemoWorkflows()

function App() {

    return (
        <Router>
            <div className="appPage">
                <Routes>
                    {/* --- INSTRUCTOR / DEFAULT ROUTES --- */}
                    <Route path={'/'} element={<AssignedCourses />} />
                    <Route path={'/assignedtos'} element={<AssignedTOS />} />

                    {/* --- COURSE EDITING ROUTES --- */}
                    <Route path={'/courses/:code'} element={<Syllabus />} />
                    <Route path={'/revisions/:code'} element={<SyllabusRevisions />} />

                    {/* --- FORMS --- */}
                    <Route path={'/references/form/:id'} element={<ReferenceForm />} />
                    <Route path={'/references/form/:code/:refId'} element={<ReferenceForm />} />
                    <Route path={'/topics/form/:id'} element={<TopicForm />} />
                    <Route path={'/topics/form/:code/:topicId'} element={<TopicForm />} />
                    <Route path={'/ilos/form/:code/:iloId'} element={<ILOForm />} />
                    <Route path={'/assessments/form/:code/:assessmentId'} element={<AssessmentForm />} />

                    {/* --- TOS (Your Feature) --- */}
                    <Route path={'/tos/:code'} element={<TOS />} />

                    {/* --- INSTRUCTOR LPSM ROUTES --- */}
                    <Route path="/lpsm/instructor/documents" element={<Navigate to="/lpsm/instructor/documents/2" replace />} />
                    <Route path="/lpsm/instructor/documents/:syllabusId" element={<DocumentsViewer />} />

                    {/* --- PROGRAM HEAD & DIRECTOR LPSM ROUTES --- */}
                    <Route path="/lpsm/program-head" element={<ProgramHeadDashboard />} />
                    <Route path="/lpsm/program-head/upload/:id" element={<ProgramHeadDocumentUpload />} />
                    <Route path="/lpsm/director" element={<ProgramHeadDashboard />} />
                    <Route path="/lpsm/director/upload/:id" element={<DirectorDocumentUpload />} />

                    {/* --- ROLE-BASED ROUTES (Upcoming Features) --- */}
                    {/* Specific role pages - must come BEFORE the generic :approver route */}
                    <Route path={'/role/industry-consultant'} element={<ProgramHeadConsultant />} />
                    <Route path={'/role/program-head'} element={<ProgramHead />} />
                    <Route path={'/role/program-head/upload-documents'} element={<COAEPUpload />} />
                    <Route path={'/role/director-of-libraries'} element={<DirectorOfLibraries />} />
                    <Route path={'/role/director-of-libraries/upload-documents'} element={<DirectorReferenceLibrary />} />
                    <Route path={'/role/director-of-libraries/reference-library'} element={<DirectorReferenceLibrary />} />
                    <Route path={'/role/director-of-libraries/add-reference'} element={<DirectorAddReference />} />
                    <Route path={'/role/director-of-libraries/view-reference/:id'} element={<DirectorViewReference />} />
                    <Route path={'/role/director-of-libraries/edit-reference/:id'} element={<DirectorAddReference />} />
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

                </Routes>
            </div>
        </Router>

    )
}

export default App