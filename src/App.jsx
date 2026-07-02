import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import AssignedTOS from "./pages/AssignedTOS.jsx";
import TOS from "./pages/TOS.jsx";
import ProgramHeadTOS from "./pages/ProgramHeadTOS.jsx";

function App() {
    return (
        <Router>
            <div className="appPage">
                <Routes>
                    <Route path={'/'} element={<Navigate to="/assignedtos" replace />} />
                    <Route path={'/assignedtos'} element={<AssignedTOS />} />
                    <Route path={'/tos/:code'} element={<TOS />} />
                    <Route path={'/role/program-head/tos'} element={<ProgramHeadTOS />} />
                </Routes>
            </div>
        </Router>
    )
}

export default App