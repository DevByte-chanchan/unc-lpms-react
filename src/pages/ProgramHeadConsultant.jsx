import React from "react";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { Clock, Search, ArrowUp, ArrowDown, Upload, User, Clipboard, Briefcase } from "react-feather";
import ConsultantsTable from '../components/ConsultantsTable.jsx'

const UploadButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      padding: '15px 30px', gap: 8, width: '280px', height: '54px',
      background: '#EA1212', borderRadius: '5px', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
    }}
  >
    <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Upload size={20} color="#FFFFFF" />
    </span>
    Upload Consultant List
  </button>
)

// ConsultantsTable component moved to components/ConsultantsTable.jsx

const ProgramHeadConsultant = () => {
  const [showModal, setShowModal] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [selectedCourse, setSelectedCourse] = React.useState('');
  const [selectedConsultantIndex, setSelectedConsultantIndex] = React.useState(null);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const fileInputRef = React.useRef(null);
  const programName = 'Bachelor of Science in Information Technology';
  // Upload-first: no table initially
  const consultant = { name: 'Dennis Ignacio', department: 'School of Computer and Information Sciences' };
  const courses = [
    'BSCS313L – Human & Computer Interaction',
    'BSCS212L – Web Development I',
    'BSCS111L – Fundamentals of Programming',
  ];
  const initialConsultants = [
    { name: 'Dennis Ignacio', department: 'School of Computer and Information Sciences' },
    // second row removed as requested
  ];
  const [consultants, setConsultants] = React.useState(initialConsultants);
  const [selectedConsultant, setSelectedConsultant] = React.useState(null);

  return (
    <Skeleton
      header={<Header role="Program Head" name="DANILA, JUNE ARREB C." />}
      nav={<SideNavigation mode="program-head" />}
      content={
        <div style={{ padding: 20, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Industry Consultant</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <UploadButton onClick={() => setShowModal(true)} />
            </div>
          </div>

          {/* After upload: show Assign button and controls */}
          {showTable && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <button
                  style={{
                    width: 147, height: 52,
                    display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                    padding: '15px 30px', gap: 6,
                    background: '#FFFFFF', border: '1px solid #A4A9AF', borderRadius: 5,
                    color: '#595959', cursor: 'pointer'
                  }}
                  onClick={() => setSortOpen((v) => !v)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 4 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 17V5" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 8l3-3 3 3" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 7v12" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13 16l3 3 3-3" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 16, lineHeight: '22px', letterSpacing: 0.1 }}>Sort</span>
                </button>
                {sortOpen && (
                  <div style={{
                    position: 'absolute', top: '110%', left: 0,
                    background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 6,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    width: 180, padding: 8, zIndex: 5
                  }}>
                    <button
                      onClick={() => setSortOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                        padding: '8px 10px', borderRadius: 6, color: '#111827'
                      }}
                    >
                      <ArrowUp size={18} color="#374151" />
                      <span style={{ fontSize: 14 }}>A to Z</span>
                    </button>
                    <button
                      onClick={() => setSortOpen(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                        padding: '8px 10px', borderRadius: 6, color: '#111827'
                      }}
                    >
                      <ArrowDown size={18} color="#374151" />
                      <span style={{ fontSize: 14 }}>Z to A</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Removed page-level Assign button; assignment is triggered from each table row */}
            </div>
          )}

          {/* Upload-first: only header and button */}

          {/* Program header removed per request */}

          {/* No table rendered until upload is handled */}
          {showTable && (
            <ConsultantsTable
              consultants={consultants}
              onAssign={(c, idx) => {
                setSelectedConsultant(c);
                setSelectedConsultantIndex(idx);
                // initialize dropdown with existing assigned course if present
                setSelectedCourse(c.assignedCourse || '');
                setAssignOpen(true);
              }}
            />
          )}

          {showModal && (
            <div>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={() => setShowModal(false)} />
              <div
                style={{
                  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 767, padding: 40, background: '#FFFFFF', borderRadius: 10,
                  display: 'flex', flexDirection: 'column', gap: 20, zIndex: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Consultant List</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <label htmlFor="consultant-file-input" style={{ cursor: 'pointer', borderRadius: 5, background: '#9CA3AF', color: '#FFFFFF', padding: '12px 32px' }}>{selectedFile ? 'Change File' : 'Choose File'}</label>
                  <input id="consultant-file-input" type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files && e.target.files[0]; setSelectedFile(file || null); }} style={{ display: 'none' }} />
                  <span style={{ color: '#374151' }}>{selectedFile ? selectedFile.name : 'No file chosen'}</span>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setShowModal(false); }} style={{ flex: 1, padding: '12px 32px', background: '#FFFFFF', border: '2px solid #111827', borderRadius: 6, color: '#111827', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => { if (!selectedFile) { alert('Please choose a file first'); return; } setShowModal(false); setShowTable(true); }} style={{ flex: 1, padding: '12px 32px', background: '#1F2937', borderRadius: 6, color: '#FFFFFF', border: 'none', cursor: 'pointer' }}>Upload</button>
                </div>
              </div>
            </div>
          )}

          {assignOpen && (
            <div>
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={() => setAssignOpen(false)} />
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 431, background: '#FFFFFF', borderRadius: 10, padding: 20,
                  display: 'flex', flexDirection: 'column', gap: 20, zIndex: 40,
                  fontFamily: 'Poppins, sans-serif'
                }}
              >
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Assign Industry Consultant</h2>

                {/* Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={20} color={'#111827'} />
                    <span style={{ color: '#111827' }}>Name</span>
                  </div>
                  <div style={{ padding: '12px 16px', color: '#111827' }}>{(selectedConsultant && selectedConsultant.name) || consultant.name}</div>
                </div>

                {/* Department */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Briefcase size={20} color={'#111827'} />
                    <span style={{ color: '#111827' }}>Department</span>
                  </div>
                  <div style={{ padding: '12px 16px', color: '#111827' }}>{(selectedConsultant && selectedConsultant.department) || consultant.department}</div>
                </div>

                {/* Course Offerings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clipboard size={20} color={'#111827'} />
                    <span style={{ color: '#111827' }}>Course Offerings</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8, color: '#111827', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">No selected</option>
                      {courses.map((course) => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                    <svg style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: '#4B5563', pointerEvents: 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Assign */}
                <button
                  onClick={() => {
                    // persist assigned course (blank if none selected)
                    setConsultants(prev => prev.map((item, i) => i === selectedConsultantIndex ? { ...item, assignedCourse: selectedCourse || '' } : item));
                    setAssignOpen(false);
                    setSelectedCourse('');
                    setSelectedConsultantIndex(null);
                  }}
                  style={{ width: '100%', padding: '12px 16px', background: '#2C3744', color: '#FFFFFF', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Clipboard size={20} />
                  <span>Assign</span>
                </button>

                {/* Cancel */}
                <button
                  onClick={() => setAssignOpen(false)}
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #111827', background: '#FFFFFF', borderRadius: 8, color: '#111827', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}

export default ProgramHeadConsultant;
