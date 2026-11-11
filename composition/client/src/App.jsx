import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import Dashboard from "./pages/Dashboard.jsx";
import AssignedCourses from "./pages/AssignedCourses.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import ReferenceForm from "./pages/ReferenceForm.jsx";
import TopicForm from "./pages/TopicForm.jsx";
import TLAForm from "./pages/TLAForm.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { CurrentUserProvider } from "./services/currentUser.jsx";


function App() {

    return (
        <Router>
            <CurrentUserProvider>
                <div className="appPage">
                    <Routes>
                        <Route path={'/login'} element={<Login />} />
                        <Route path={'/forgot-password'} element={<ForgotPassword />} />
                        <Route
                            path={'/change-password'}
                            element={
                                <RequireAuth allowMustChangePassword>
                                    <ChangePassword />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path={'/'}
                            element={
                                <RequireAuth>
                                    <Dashboard />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path={'/dashboard'}
                            element={
                                <RequireAuth>
                                    <Dashboard />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path={'/assigned-courses'}
                            element={
                                <RequireAuth>
                                    <AssignedCourses />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path={'/courses'}
                            element={
                                <RequireAuth>
                                    <AssignedCourses />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path={'/courses/:pcId/:revNum/:status'}
                            element={
                                <RequireAuth>
                                    <Syllabus />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path={'/references/form/:iloId/:status'}
                            element={
                                <RequireAuth>
                                    <ReferenceForm />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path={'/topics/form/:iloId/:status'}
                            element={
                                <RequireAuth>
                                    <TopicForm />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path={'/tlas/form/:iloId/:status'}
                            element={
                                <RequireAuth>
                                    <TLAForm />
                                </RequireAuth>
                            }
                        />
                        <Route path={'*'} element={<Navigate to={'/'} replace />} />
                    </Routes>
                </div>
            </CurrentUserProvider>
        </Router>

    )
}

export default App
