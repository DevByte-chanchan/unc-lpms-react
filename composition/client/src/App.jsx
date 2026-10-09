import './App.css'
import {lazy, Suspense, useEffect, useState} from 'react'
import {BrowserRouter as Router, Routes, Route, Navigate, useLocation} from 'react-router-dom'
import { LEGACY_REDIRECTS } from "./utils/routes.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ResizeVeil from "./components/ResizeVeil.jsx";
import OverflowTooltip from "./components/OverflowTooltip.jsx";
import Login from "./pages/Login.jsx";

import { getSession, onSessionChange, reconcileSession, routeGuardRedirect } from './utils/session';
// A plan's approval state lives in the server's workflow log. Drop the browser-side copy
// older builds kept, so a stale entry can never be mistaken for the real status.
try { localStorage.removeItem('lpsm_workflow_v1'); localStorage.removeItem('lpsm_workflow_seeded_v5') } catch { /* storage unavailable */ }

// Each workspace is loaded only when its route is opened. This keeps the large
// syllabus editors and PDF helpers out of the login and course-list download.
const AssignedCourses = lazy(() => import('./pages/AssignedCourses.jsx'))
const SuperuserUsers = lazy(() => import('./pages/SuperuserUsers.jsx'))
const Syllabus = lazy(() => import('./pages/Syllabus.jsx'))
const ReferenceForm = lazy(() => import('./pages/ReferenceForm.jsx'))
const TopicForm = lazy(() => import('./pages/TopicForm.jsx'))
const TLAForm = lazy(() => import('./pages/TLAForm.jsx'))
const CommentRecorder = lazy(() => import('./pages/CommentRecorder.jsx'))
const ILOForm = lazy(() => import('./pages/ILOForm.jsx'))
const SyllabusRevisions = lazy(() => import('./pages/SyllabusRevisions.jsx'))
const ApprovalCourses = lazy(() => import('./pages/ApprovalCourses.jsx'))
const ProgramHead = lazy(() => import('./pages/ProgramHead.jsx'))
const DirectorOfLibraries = lazy(() => import('./pages/DirectorOfLibraries.jsx'))
const IndustryConsultant = lazy(() => import('./pages/IndustryConsultant.jsx'))
const ProgramHeadIndustryConsultant = lazy(() => import('./pages/ProgramHeadIndustryConsultant.jsx'))
const ProgramHeadCourseOfferings = lazy(() => import('./pages/ProgramHeadCourseOfferings.jsx'))
const COAEPView = lazy(() => import('./pages/lpsm/ProgramHead/COAEPView.jsx'))
const CoPoAlignment = lazy(() => import('./pages/lpsm/ProgramHead/CoPoAlignment.jsx'))
const PoPeoAlignment = lazy(() => import('./pages/lpsm/ProgramHead/PoPeoAlignment.jsx'))
const DirectorReferenceLibrary = lazy(() => import('./pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx'))
const DirectorAddReference = lazy(() => import('./pages/lpsm/DirectorOfLibraries/AddReference.jsx'))
const DirectorViewReference = lazy(() => import('./pages/lpsm/DirectorOfLibraries/ViewReference.jsx'))
const DirectorCourseCatalog = lazy(() => import('./pages/lpsm/DirectorOfLibraries/CourseCatalog.jsx'))
const ApprovalSyllabus = lazy(() => import('./pages/ApprovalSyllabus.jsx'))
const Dean = lazy(() => import('./pages/Dean.jsx'))
const VPAA = lazy(() => import('./pages/VPAA.jsx'))

// Nothing renders until somebody is signed in, so every page below reads one
// identity for the whole flow instead of assuming a demo user. The /role/:role
// pages take the acting role from the URL, so they are also held to the role
// that signed in — otherwise one link is enough to switch accounts mid-flow.
function SessionGate({ children }) {
    const [session, setSession] = useState(() => getSession())
    const [checkingSession, setCheckingSession] = useState(true)
    const location = useLocation()

    useEffect(() => {
        let active = true
        const stopListening = onSessionChange(() => setSession(getSession()))

        void reconcileSession().finally(() => {
            if (!active) return
            setSession(getSession())
            setCheckingSession(false)
        })

        return () => {
            active = false
            stopListening()
        }
    }, [])

    if (checkingSession) return <div className="routeLoading" role="status">Checking session…</div>

    if (!session) return <Login />

    const redirect = routeGuardRedirect(session, location.pathname)
    if (redirect) return <Navigate to={redirect} replace />

    return children
}

function App() {

    return (
        <Router>
            <div className="appPage">
                <ResizeVeil />
                <OverflowTooltip />
                <ErrorBoundary>
                    <SessionGate>
                    <Suspense fallback={<div className="routeLoading" role="status">Loading page…</div>}>
                    <Routes>
                        {/* --- INSTRUCTOR / DEFAULT ROUTES --- */}
                        <Route path={'/'} element={<ErrorBoundary><AssignedCourses /></ErrorBoundary>} />
                        <Route path={'/record-comments'} element={<ErrorBoundary><CommentRecorder /></ErrorBoundary>} />

                        {/* --- COURSE EDITING ROUTES --- */}
                        <Route path={'/courses/:pcId/:revNum/:status'} element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path={'/offerings/:pcId/:status'} element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path={'/courses/:code'} element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path={'/courses/:code/:status'} element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path={'/revisions/:code'} element={<ErrorBoundary><SyllabusRevisions /></ErrorBoundary>} />

                        {/* --- FORMS --- */}
                        <Route path={'/references/form/:iloId/:status'} element={<ErrorBoundary><ReferenceForm /></ErrorBoundary>} />
                        <Route path={'/references/form/:refId'} element={<ErrorBoundary><ReferenceForm /></ErrorBoundary>} />
                        <Route path={'/references/form/:code/:refId'} element={<ErrorBoundary><ReferenceForm /></ErrorBoundary>} />
                        <Route path={'/topics/form/:iloId/:status'} element={<ErrorBoundary><TopicForm /></ErrorBoundary>} />
                        <Route path={'/topics/form/:topicId'} element={<ErrorBoundary><TopicForm /></ErrorBoundary>} />
                        <Route path={'/topics/form/:code/:topicId'} element={<ErrorBoundary><TopicForm /></ErrorBoundary>} />
                        <Route path={'/tlas/form/:iloId/:status'} element={<ErrorBoundary><TLAForm /></ErrorBoundary>} />
                        <Route path={'/tlas/form/:code/:iloId/:status'} element={<ErrorBoundary><TLAForm /></ErrorBoundary>} />
                        <Route path={'/ilos/form/:code/:iloId'} element={<ErrorBoundary><ILOForm /></ErrorBoundary>} />

                        {/* --- ROLE-BASED APPROVER ROUTES --- */}
                        <Route path={'/role/industry-consultant'} element={<ErrorBoundary><IndustryConsultant /></ErrorBoundary>} />
                        <Route path={'/role/program-head'} element={<ErrorBoundary><ProgramHead /></ErrorBoundary>} />
                        <Route path={'/role/program-head/coaep'} element={<ErrorBoundary><COAEPView /></ErrorBoundary>} />
                        <Route path={'/role/program-head/co-po-alignment'} element={<ErrorBoundary><CoPoAlignment /></ErrorBoundary>} />
                        <Route path={'/role/program-head/po-peo-alignment'} element={<ErrorBoundary><PoPeoAlignment /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries'} element={<ErrorBoundary><DirectorOfLibraries /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/reference-library'} element={<ErrorBoundary><DirectorReferenceLibrary /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/course-catalog'} element={<ErrorBoundary><DirectorCourseCatalog /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/add-reference'} element={<ErrorBoundary><DirectorAddReference /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/view-reference/:refId'} element={<ErrorBoundary><DirectorViewReference /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/edit-reference/:refId'} element={<ErrorBoundary><DirectorAddReference /></ErrorBoundary>} />
                        <Route path={'/role/program-head/industry-consultant'} element={<ErrorBoundary><ProgramHeadIndustryConsultant /></ErrorBoundary>} />
                        <Route path={'/role/program-head/course-offerings'} element={<ErrorBoundary><ProgramHeadCourseOfferings /></ErrorBoundary>} />
                        <Route path={'/role/dean'} element={<ErrorBoundary><Dean /></ErrorBoundary>} />
                        <Route path={'/role/vpaa'} element={<ErrorBoundary><VPAA /></ErrorBoundary>} />
                        <Route path={'/role/superuser'} element={<ErrorBoundary><SuperuserUsers /></ErrorBoundary>} />

                        {/* Generic role pages: default to approval-course-table */}
                        <Route path="/role/:approver">
                            <Route index element={<Navigate to="approval-course-table" replace />} />
                            <Route path="approval-course-table" element={<ErrorBoundary><ApprovalCourses /></ErrorBoundary>} />
                            <Route path="courses/:code" element={<ErrorBoundary><ApprovalSyllabus /></ErrorBoundary>} />
                        </Route>
                        {/* --- PATHS THAT USED TO WORK, AND STILL DO ---
                            Renamed for consistency (see utils/routes.js). These keep every
                            old bookmark, every link this rename missed, and every teammate's
                            branch pointing at the old path working. Declared from the same
                            list routes.test.js checks, so a redirect cannot quietly point at
                            a route that no longer exists. */}
                        {LEGACY_REDIRECTS.map(({ from, to }) => (
                            <Route key={from} path={from} element={<Navigate to={to({})} replace />} />
                        ))}

                        {/* Instructor role should use instructor course UI when browsing courses */}
                        <Route path="/role/instructor/courses/:code" element={<ErrorBoundary><Syllabus /></ErrorBoundary>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    </Suspense>
                    </SessionGate>
                </ErrorBoundary>
            </div>
        </Router>
    )
}

export default App
