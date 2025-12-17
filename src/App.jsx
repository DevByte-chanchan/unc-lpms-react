
import './App.css'
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import AssignedCourses from "./pages/AssignedCourses.jsx";
import Syllabus from "./pages/Syllabus.jsx";
import ReferenceForm from "./pages/ReferenceForm.jsx";
import TopicForm from "./pages/TopicForm.jsx";
import ILOForm from "./pages/ILOForm.jsx";
import AssignedTOS from "./pages/AssignedTOS.jsx";
import AssessmentForm from "./pages/AssessmentForm.jsx";
import TOS from "./pages/TOS.jsx";

function App() {

  return (
      <Router>
              <div className="appPage">
                  <Routes>
                      <Route path={'/'} element={<AssignedCourses />} />
                      <Route path={'/assignedtos'} element={<AssignedTOS />} />
                      <Route path={'/courses/:code'} element={<Syllabus />} />
                      <Route path={'/references/form/:id'} element={<ReferenceForm />} />
                      <Route path={'/references/form/:code/:refId'} element={<ReferenceForm />} />
                      <Route path={'/topics/form/:id'} element={<TopicForm />} />
                      <Route path={'/topics/form/:code/:topicId'} element={<TopicForm />} />
                      <Route path={'/ilos/form/:code/:iloId'} element={<ILOForm />} />
                      <Route path={'/assessments/form/:code/:assessmentId'} element={<AssessmentForm />} />
                      <Route path={'/tos/:code'} element={<TOS />} />


                  </Routes>
              </div>
      </Router>

  )
}

export default App
