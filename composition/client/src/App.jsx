import './App.css'
import {lazy, Suspense, useEffect, useLayoutEffect, useState} from 'react'
import { PageSkeleton } from './components/LoadingSkeleton.jsx'
import {BrowserRouter as Router, Routes, Route, Navigate, useLocation} from 'react-router-dom'
import { LEGACY_REDIRECTS } from "./utils/routes.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ResizeVeil from "./components/ResizeVeil.jsx";
import OverflowTooltip from "./components/OverflowTooltip.jsx";
import Login from "./pages/Login.jsx";
import Privacy from "./pages/Privacy.jsx";

import { getSession, onSessionChange, reconcileSession, routeGuardRedirect, roleToActivate, setActiveRole } from './utils/session';
import { fetchJson } from './utils/api.js';
import { refreshCatalogSettings } from './utils/referenceCatalog.js';
// A plan's approval state lives in the server's workflow log. Drop the browser-side copy
// older builds kept, so a stale entry can never be mistaken for the real status.
try { localStorage.removeItem('lpsm_workflow_v1'); localStorage.removeItem('lpsm_workflow_seeded_v5') } catch { /* storage unavailable */ }

// Each workspace is loaded only when its route is opened. This keeps the large
// syllabus editors and PDF helpers out of the login and course-list download.
const AssignedCourses = lazy(() => import('./pages/AssignedCourses.jsx'))
const SuperuserUsers = lazy(() => import('./pages/SuperuserUsers.jsx'))
const ChangePassword = lazy(() => import('./pages/ChangePassword.jsx'))
const Syllabus = lazy(() => import('./pages/Syllabus.jsx'))
const ReferenceForm = lazy(() => import('./pages/ReferenceForm.jsx'))
const TopicForm = lazy(() => import('./pages/TopicForm.jsx'))
const TLAForm = lazy(() => import('./pages/TLAForm.jsx'))
const ILOForm = lazy(() => import('./pages/ILOForm.jsx'))
const SyllabusRevisions = lazy(() => import('./pages/SyllabusRevisions.jsx'))
const ApprovalCourses = lazy(() => import('./pages/ApprovalCourses.jsx'))
const ProgramHead = lazy(() => import('./pages/ProgramHead.jsx'))
const DirectorOfLibraries = lazy(() => import('./pages/DirectorOfLibraries.jsx'))
const IndustryConsultant = lazy(() => import('./pages/IndustryConsultant.jsx'))
// Program Documents (front pages, PO and PEO, CO and PO, COAEP); OutcomesAlignment.jsx holds the tabbed page.
const ProgramDocuments = lazy(() => import('./pages/lpsm/ProgramHead/OutcomesAlignment.jsx'))
const CourseAssignment = lazy(() => import('./pages/lpsm/ProgramHead/CourseAssignment.jsx'))
const DirectorReferenceLibrary = lazy(() => import('./pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx'))
const DirectorAddReference = lazy(() => import('./pages/lpsm/DirectorOfLibraries/AddReference.jsx'))
const DirectorViewReference = lazy(() => import('./pages/lpsm/DirectorOfLibraries/ViewReference.jsx'))
const ApprovalSyllabus = lazy(() => import('./pages/ApprovalSyllabus.jsx'))
const Dean = lazy(() => import('./pages/Dean.jsx'))
const VPAA = lazy(() => import('./pages/VPAA.jsx'))

// Nothing renders until somebody is signed in, so every page below reads one
// identity for the whole flow instead of assuming a demo user. The /role/:role
// pages take the acting role from the URL, so they are also held to the role
// that signed in — otherwise one link is enough to switch accounts mid-flow.
// Pages reached from an e-mailed link (or on the way to one): they work signed out.
const AccountLinkPage = lazy(() => import('./pages/AccountLinkPage.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const PUBLIC_LINK_PAGES = { '/set-password': 'invitation', '/reset-password': 'reset' }

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

    // The Reference Library rules are the Director's, set once for everyone: fetch them once signed in.
    // The superuser administers accounts only and has no access to them.
    const needsCatalog = Boolean(session) && !(session.roles || [session.role]).every(role => role === 'superuser')
    useEffect(() => { if (needsCatalog) void refreshCatalogSettings(fetchJson) }, [needsCatalog])

    // Opening a page of another role the account holds acts as that role (multi-role accounts). Switched before
    // the page renders, so its requests already carry the right role.
    const activate = session && !session.pendingRoleChoice ? roleToActivate(session, location.pathname) : ''
    useLayoutEffect(() => { if (activate) setActiveRole(activate) }, [activate])

    if (checkingSession) return <div className="routeLoading" role="status">Checking session…</div>

    // The Privacy Notice must be readable before anyone has an account.
    if (location.pathname === '/privacy') return <Privacy />
    const linkKind = PUBLIC_LINK_PAGES[location.pathname]
    if (linkKind) return <Suspense fallback={<PageSkeleton />}><AccountLinkPage kind={linkKind} /></Suspense>
    if (location.pathname === '/forgot-password') return <Suspense fallback={<PageSkeleton />}><ForgotPassword /></Suspense>

    // Signed out, or signed in with several roles and not yet chosen which to continue as.
    if (!session || session.pendingRoleChoice) return <Login />

    if (activate) return <div className="routeLoading" role="status">Switching role…</div>

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
                    <Suspense fallback={<PageSkeleton />}>
                    <Routes>
                        {/* --- INSTRUCTOR / DEFAULT ROUTES --- */}
                        <Route path={'/'} element={<ErrorBoundary><AssignedCourses /></ErrorBoundary>} />
                        {/* The Profile page is gone; old links and bookmarks land on Change password. */}
                        <Route path={'/profile'} element={<Navigate to={'/change-password'} replace />} />
                        <Route path={'/change-password'} element={<ErrorBoundary><ChangePassword /></ErrorBoundary>} />

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
                        <Route path={'/role/program-head/program-documents'} element={<ErrorBoundary><ProgramDocuments /></ErrorBoundary>} />
                        {/* The pages Program Documents replaced: each opens its tab. */}
                        <Route path={'/role/program-head/coaep'} element={<Navigate to="/role/program-head/program-documents?tab=coaep" replace />} />
                        <Route path={'/role/program-head/outcomes-alignment'} element={<Navigate to="/role/program-head/program-documents?tab=program" replace />} />
                        <Route path={'/role/program-head/course-assignment'} element={<ErrorBoundary><CourseAssignment /></ErrorBoundary>} />
                        <Route path={'/role/program-head/co-po-alignment'} element={<Navigate to="/role/program-head/program-documents?tab=course" replace />} />
                        <Route path={'/role/program-head/po-peo-alignment'} element={<Navigate to="/role/program-head/program-documents?tab=program" replace />} />
                        <Route path={'/role/director-of-libraries'} element={<ErrorBoundary><DirectorOfLibraries /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/reference-library'} element={<ErrorBoundary><DirectorReferenceLibrary /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/course-references'} element={<Navigate to="/role/director-of-libraries/reference-library" replace />} />
                        <Route path={'/role/director-of-libraries/add-reference'} element={<ErrorBoundary><DirectorAddReference /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/view-reference/:refId'} element={<ErrorBoundary><DirectorViewReference /></ErrorBoundary>} />
                        <Route path={'/role/director-of-libraries/edit-reference/:refId'} element={<ErrorBoundary><DirectorAddReference /></ErrorBoundary>} />
                        <Route path={'/role/program-head/missing-submissions'} element={<Navigate to="/role/program-head/approval-course-table?page=Syllabus&status=not-submitted" replace />} />
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
