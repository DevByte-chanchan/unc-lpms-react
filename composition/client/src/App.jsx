import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import AssignedCourses from "./pages/AssignedCourses.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import ReferenceForm from "./pages/ReferenceForm.jsx";
import TopicForm from "./pages/TopicForm.jsx";

import SyllabusRevisions from "./pages/SyllabusRevisions.jsx";
import TLAForm from "./pages/TLAForm.jsx";


function App() {

    return (
        <Router>
            <div className="appPage">
                <Routes>
                    <Route path={'/'} element={<AssignedCourses />} />
                    <Route path={'/courses/:code'} element={<Syllabus />} />
                    <Route path={'/revisions/:code'} element={<SyllabusRevisions />} />
                    <Route path={'/references/form/:code/:iloId'} element={<ReferenceForm />} />
                    <Route path={'/topics/form/:code/:iloId'} element={<TopicForm />} />
                    <Route path={'/tlas/form/:code/:iloId'} element={<TLAForm />} />
                </Routes>
            </div>
        </Router>

    )
}

export default App