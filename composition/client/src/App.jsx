import './App.css'
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'
import AssignedCourses from "./pages/AssignedCourses.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import ReferenceForm from "./pages/ReferenceForm.jsx";
import TopicForm from "./pages/TopicForm.jsx";
import TLAForm from "./pages/TLAForm.jsx";


function App() {

    return (
        <Router>
            <div className="appPage">
                <Routes>
                    <Route path={'/'} element={<AssignedCourses />} />
                    <Route path={'/courses/:pcId/:revNum/:status'} element={<Syllabus />} />
                    <Route path={'/references/form/:iloId/:status'} element={<ReferenceForm />} />
                    <Route path={'/topics/form/:iloId/:status'} element={<TopicForm />} />
                    <Route path={'/tlas/form/:iloId/:status'} element={<TLAForm />} />
                </Routes>
            </div>
        </Router>

    )
}

export default App