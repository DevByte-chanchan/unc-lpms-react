import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import AssignedCourses from "./pages/AssignedCourses.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import ReferenceForm from "./pages/ReferenceForm.jsx";
import TopicForm from "./pages/TopicForm.jsx";
import ILOForm from "./pages/ILOForm.jsx";
import AssignedTOS from "./pages/AssignedTOS.jsx";
import AssessmentForm from "./pages/AssessmentForm.jsx";
import TLAForm from "./pages/TLAForm.jsx";
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
import VPAA from "./pages/VPAA.jsx";

// Instructor LPSM Pages
import InstructorDashboard from "./pages/lpsm/InstructorDashboard.jsx";
import DocumentsViewer from "./pages/lpsm/DocumentsViewer.jsx";
import LearningPlanCompose from "./pages/lpsm/Instructor/LearningPlanCompose.jsx";
import VersionSnapshot from "./pages/lpsm/Instructor/VersionSnapshot.jsx";

// Program Head & Director LPSM Pages
import ProgramHeadDashboard from "./pages/lpsm/ProgramHeadDashboard.jsx";
import ProgramHeadUpload from "./pages/lpsm/ProgramHeadUpload.jsx";
import ProgramHeadDocumentUpload from "./pages/lpsm/ProgramHead/DocumentUpload.jsx";
import COAEPUpload from "./pages/lpsm/ProgramHead/COAEPUpload.jsx";
import CoPoAlignment from "./pages/lpsm/ProgramHead/CoPoAlignment.jsx";
import PoPeoAlignment from "./pages/lpsm/ProgramHead/PoPeoAlignment.jsx";
import DirectorDocumentUpload from "./pages/lpsm/DirectorOfLibraries/DocumentUpload.jsx";
import DirectorReferenceLibrary from "./pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx";
import DirectorAddReference from "./pages/lpsm/DirectorOfLibraries/AddReference.jsx";
import DirectorViewReference from "./pages/lpsm/DirectorOfLibraries/ViewReference.jsx";

// VPAA LPSM Pages
import VPAADashboard from "./pages/lpsm/VPAA/VPAADashboard.jsx";

// Route Guard
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Error Boundary
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import { seedDemoWorkflows } from './utils/workflowHelpers';
import { logActivity } from './utils/auditLogger';

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

// One-time migration: fix corrupted instructor names in localStorage
;(function fixInstructorNames() {
  const FLAG = 'lpsm_instructor_fix_v1'
  if (localStorage.getItem(FLAG)) return
  try {
    const raw = localStorage.getItem('lpms_syllabi_v1')
    if (raw) {
      const data = JSON.parse(raw)
      let changed = false
      data.forEach(s => {
        if (!s.instructor || s.instructor.toLowerCase().includes('norton') || s.instructor.toLowerCase().includes('monica')) {
          s.instructor = 'CASIMERO, DANNY'
          changed = true
        }
      })
      if (changed) localStorage.setItem('lpms_syllabi_v1', JSON.stringify(data))
    }
  } catch (e) {}
  localStorage.setItem(FLAG, '1')
})()

// Seed audit activity log if empty
;(function seedActivityLog() {
  const ACTIVITY_KEY = 'lpsm_audit_activity_v1'
  const SEED_FLAG = 'lpsm_audit_seeded_v1'
  if (localStorage.getItem(SEED_FLAG)) return

  const now = new Date()
  const d = (hours) => new Date(now.getTime() - hours * 3600000).toISOString()

  const activities = [
    { action: 'approval_approved', user: { name: 'GARCIA, CARLOS', role: 'vpaa' }, details: { courseCode: 'BSCS121' }, message: 'Approved syllabus BSCS121', timestamp: d(2) },
    { action: 'approval_approved', user: { name: 'GARCIA, CARLOS', role: 'vpaa' }, details: { courseCode: 'IT 211' }, message: 'Approved syllabus IT 211', timestamp: d(4) },
    { action: 'export', user: { name: 'CASIMERO, DANNY', role: 'instructor' }, details: { exportType: 'pdf', courseCode: 'BSCS313L' }, message: 'Exported syllabus BSCS313L to PDF', timestamp: d(6) },
    { action: 'form_submission', user: { name: 'CASIMERO, DANNY', role: 'instructor' }, details: { formName: 'Syllabus', courseCode: 'BSCS322L' }, message: 'Submitted syllabus BSCS322L for review', timestamp: d(8) },
    { action: 'approval_approved', user: { name: 'REYES, AGNES', role: 'dean' }, details: { courseCode: 'BSCS313L' }, message: 'Dean approved syllabus BSCS313L', timestamp: d(10) },
    { action: 'approval_returned', user: { name: 'DANILA, JUNAR', role: 'program-head' }, details: { courseCode: 'IT 321' }, message: 'Returned syllabus IT 321 for revisions', timestamp: d(12) },
    { action: 'document_upload', user: { name: 'SANTOS, MARIA', role: 'director-of-libraries' }, details: { documentType: 'reference' }, message: 'Added new reference to library', timestamp: d(14) },
    { action: 'form_submission', user: { name: 'DANILA, JUNAR', role: 'program-head' }, details: { formName: 'COAEP' }, message: 'Uploaded COAEP documents', timestamp: d(16) },
    { action: 'export', user: { name: 'CASIMERO, DANNY', role: 'instructor' }, details: { exportType: 'pdf', courseCode: 'IT 211' }, message: 'Exported learning plan IT 211 to PDF', timestamp: d(20) },
    { action: 'page_view', user: { name: 'GARCIA, CARLOS', role: 'vpaa' }, details: { page: '/vpaa/dashboard' }, message: 'Accessed VPAA dashboard', timestamp: d(24) },
  ]

  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities))
  localStorage.setItem(SEED_FLAG, '1')
})()

function App() {

    return (
        <Router>
            <div className="appPage">
                <ErrorBoundary>
                    <Routes>
                        {/* --- INSTRUCTOR / DEFAULT ROUTES --- */}
                        <Route path={'/'} element={<ErrorBoundary><AssignedCourses /></ErrorBoundary>} />
                        <Route path={'/assignedtos'} element={<ErrorBoundary><AssignedTOS /></ErrorBoundary>} />

                        {/* --- COURSE EDITING ROUTES --- */}
                        <Route path={'/courses/:code'} element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path={'/courses/:code/:status'} element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path={'/revisions/:code'} element={<ErrorBoundary><SyllabusRevisions /></ErrorBoundary>} />

                        {/* --- FORMS --- */}
                        {/* Original routes */}
                        <Route path={'/references/form/:id'} element={<ErrorBoundary><ReferenceForm /></ErrorBoundary>} />
                        <Route path={'/references/form/:code/:refId'} element={<ErrorBoundary><ReferenceForm /></ErrorBoundary>} />
                        <Route path={'/topics/form/:id'} element={<ErrorBoundary><TopicForm /></ErrorBoundary>} />
                        <Route path={'/topics/form/:code/:topicId'} element={<ErrorBoundary><TopicForm /></ErrorBoundary>} />
                        <Route path={'/ilos/form/:code/:iloId'} element={<ErrorBoundary><ILOForm /></ErrorBoundary>} />
                        <Route path={'/assessments/form/:code/:assessmentId'} element={<ErrorBoundary><AssessmentForm /></ErrorBoundary>} />

                        {/* DevByte's routes with :status for status-aware sections */}
                        <Route path={'/references/form/:code/:iloId/:status'} element={<ErrorBoundary><ReferenceForm /></ErrorBoundary>} />
                        <Route path={'/topics/form/:code/:iloId/:status'} element={<ErrorBoundary><TopicForm /></ErrorBoundary>} />
                        <Route path={'/tlas/form/:code/:iloId/:status'} element={<ErrorBoundary><TLAForm /></ErrorBoundary>} />

                        {/* --- TOS (Your Feature) --- */}
                        <Route path={'/tos/:code'} element={<ErrorBoundary><TOS /></ErrorBoundary>} />

                        {/* --- INSTRUCTOR LPSM ROUTES --- */}
                        <Route path="/lpsm/instructor/documents" element={<Navigate to="/lpsm/instructor/documents/2" replace />} />
                        <Route path="/lpsm/instructor/documents/:syllabusId" element={<ErrorBoundary><DocumentsViewer /></ErrorBoundary>} />
                        <Route path="/role/instructor/compose" element={<ErrorBoundary><LearningPlanCompose /></ErrorBoundary>} />
                        <Route path="/role/instructor/compose/:planId" element={<ErrorBoundary><LearningPlanCompose /></ErrorBoundary>} />
                        <Route path="/role/instructor/plans/:planId/versions/:versionNo" element={<ErrorBoundary><VersionSnapshot /></ErrorBoundary>} />

                        {/* --- PROGRAM HEAD & DIRECTOR LPSM ROUTES --- */}
                        <Route path="/lpsm/program-head" element={<ErrorBoundary><ProgramHeadDashboard /></ErrorBoundary>} />
                        <Route path="/lpsm/program-head/upload/:id" element={<ErrorBoundary><ProgramHeadDocumentUpload /></ErrorBoundary>} />
                        <Route path="/lpsm/director" element={<ErrorBoundary><ProgramHeadDashboard /></ErrorBoundary>} />
                        <Route path="/lpsm/director/upload/:id" element={<ErrorBoundary><DirectorDocumentUpload /></ErrorBoundary>} />

                        {/* --- ROLE-BASED ROUTES --- */}
                        {/* Specific role pages - must come BEFORE the generic :approver route */}
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

                        {/* VPAA Dashboard Routes (Protected) */}
                        <Route path="/vpaa/dashboard" element={
                            <ProtectedRoute allowedRoles={['vpaa']}>
                                <ErrorBoundary><VPAADashboard /></ErrorBoundary>
                            </ProtectedRoute>
                        } />
                        <Route path="/vpaa/learning-plans" element={
                            <ProtectedRoute allowedRoles={['vpaa']}>
                                <ErrorBoundary><VPAADashboard /></ErrorBoundary>
                            </ProtectedRoute>
                        } />
                        <Route path="/vpaa/approvals" element={
                            <ProtectedRoute allowedRoles={['vpaa']}>
                                <ErrorBoundary><VPAADashboard /></ErrorBoundary>
                            </ProtectedRoute>
                        } />

                        {/* Generic role pages: default to approval-course-table */}
                        <Route path="/role/:approver">
                            <Route index element={<Navigate to="approval-course-table" replace />} />
                            <Route path="approval-course-table" element={<ErrorBoundary><ApprovalCourses /></ErrorBoundary>} />
                            <Route path="courses/:courseName" element={<ErrorBoundary><ApprovalSyllabus /></ErrorBoundary>} />
                        </Route>

                    </Routes>
                </ErrorBoundary>
            </div>
        </Router>

    )
}

export default App