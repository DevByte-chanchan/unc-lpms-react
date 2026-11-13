import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import AssignedTOS from "./pages/AssignedTOS.jsx";
import TOS from "./pages/TOS.jsx";
import ProgramHeadTOS from "./pages/ProgramHeadTOS.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProgramHeadDashboard from "./pages/ProgramHeadDashboard.jsx";
import Login from "./pages/Login.jsx";
import AttachmentViewerPage from "./pages/AttachmentViewerPage.jsx";

function App() {
    return (
        <Router>
            <div className="appPage">
                <Routes>
                    <Route path={'/'} element={<Navigate to="/dashboard" replace />} />
                    <Route path={'/login'} element={<Login />} />
                    <Route path={'/dashboard'} element={<Dashboard />} />
                    <Route path={'/assignedtos'} element={<AssignedTOS />} />
                    <Route path={'/tos/:code'} element={<TOS />} />
                    <Route path={'/role/program-head/dashboard'} element={<ProgramHeadDashboard />} />
                    <Route path={'/role/program-head/tos'} element={<ProgramHeadTOS />} />
                    <Route path={'/preview-attachment'} element={<AttachmentViewerPage />} />
                </Routes>
            </div>
        </Router>
    )
}

export default App