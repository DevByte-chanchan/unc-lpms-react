import React from "react";
import ProgramsTable from "../components/ProgramsTable.jsx";
import { Clock, Search, ArrowUp, ArrowDown, Upload, Clipboard, ChevronRight, X, UserPlus } from "react-feather";
import styles from '../styles/CoursesTable.module.sass';
import syllabusStyles from '../styles/SyllabusSections.module.sass';

const UploadButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      padding: '8px 18px', gap: 8, width: 240, height: 40,
      background: '#EA1212', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
    }}
  >
    <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Upload size={18} color="#FFFFFF" />
    </span>
    Upload Program List
  </button>
);

const DeanPrograms = () => {
  const [showModal, setShowModal] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [programsList, setProgramsList] = React.useState([]);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [selectedProgram, setSelectedProgram] = React.useState(null);
  const [selectedProgramIndex, setSelectedProgramIndex] = React.useState(null);
  const fileInputRef = React.useRef(null);

  const seededPrograms = [
    { code: 'BSCS', name: 'Bachelor of Science in Computer Science', head: '' },
    { code: 'BSIT', name: 'Bachelor of Science in Information Technology', head: '' },
    { code: 'BSIS', name: 'Bachelor of Science in Information Systems', head: '' },
    { code: 'BSCE', name: 'Bachelor of Science in Computer Engineering', head: '' },
    { code: 'BSSE', name: 'Bachelor of Science in Software Engineering', head: '' },
    { code: 'BSDA', name: 'Bachelor of Science in Data Analytics', head: '' },
    { code: 'ACT', name: 'Associate in Computer Technology', head: '' },
  ];

  const programHeadList = [
    'Agnes R. Trillanes',
    'June Arreb Danila',
    'Dennis Ignacio',
    'Danny B. Casimero'
  ];

  const pageContent = (
    <div style={{ padding: 20, background: '#FFFFFF', minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Programs</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <UploadButton onClick={() => setShowModal(true)} />
        </div>
      </div>

      {showTable && programsList.length > 0 && (
        <div className={syllabusStyles.header} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <button
                style={{
                  width: 120, height: 40,
                  display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                  padding: '8px 12px', gap: 2,
                  background: 'transparent', border: '1px solid #D1D5DB', borderRadius: 9999,
                  color: '#595959', cursor: 'pointer', fontSize: 14, fontWeight: 600
                }}
                onClick={() => setSortOpen((v) => !v)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 17V5" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 8l3-3 3 3" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 7v12" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 16l3 3 3-3" stroke="#595959" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span>Sort</span>
              </button>
              {sortOpen && (
                <div style={{ position: 'absolute', top: '110%', left: 0, background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 120, padding: 8, zIndex: 5 }}>
                  <button onClick={() => setSortOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 6, color: '#111827' }}>
                    <ArrowUp size={16} color="#374151" />
                    <span style={{ fontSize: 14 }}>A to Z</span>
                  </button>
                  <button onClick={() => setSortOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: 6, color: '#111827' }}>
                    <ArrowDown size={16} color="#374151" />
                    <span style={{ fontSize: 14 }}>Z to A</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={syllabusStyles['section-select']} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', height: 40, borderRadius: 9999, background: 'transparent', border: '1px solid #D1D5DB' }}>
              <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search programs" style={{ border: 0, outline: 'none', background: 'transparent', width: 360, fontSize: 14 }} />
            </div>
          </div>
        </div>
      )}

      {showTable && programsList.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.4 }}>
            <Clock size={16} color="#374151" />
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Current Period: 1st Semester 2026-2027</span>
          </div>
        </div>
      )}

      {showTable && programsList.length > 0 && (
        <div className={styles['table-container']} style={{ maxHeight: 700, overflowY: 'auto', paddingBottom: 16 }}>
          <ProgramsTable
            programs={programsList.filter(p =>
              !searchQuery || p.code.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            onAssign={(program, idx) => {
              setSelectedProgram(program);
              setSelectedProgramIndex(idx);
              setShowAssignModal(true);
            }}
          />
        </div>
      )}

      {/* Empty state when no programs */}
      {(!showTable || programsList.length === 0) && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 100, height: 100, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clipboard size={48} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No programs yet</div>
          <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420, fontSize: 14, lineHeight: '1.5' }}>You don't have any programs uploaded. Upload a program list or add one to get started.</div>
        </div>
      )}

      {showModal && (
        <div>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={() => setShowModal(false)} />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 767, padding: 20, background: '#FFFFFF', borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 20, zIndex: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Program List</div>
            </div>

            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
              onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files && e.dataTransfer.files[0]; if (file) { setSelectedFile(file); } }}
              style={{
                border: '2px dashed #D1D5DB', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={36} color="#9CA3AF" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{selectedFile ? selectedFile.name : 'Drag & drop file here'}</div>
              <div style={{ color: '#6B7280', fontSize: 13 }}>Upload .xlsx, .xls or .csv</div>
              <input id="program-file-input" type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files && e.target.files[0]; setSelectedFile(file || null); }} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setShowModal(false); }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={() => {
                if (!selectedFile) { alert('Please choose a file first'); return; }
                setProgramsList(seededPrograms);
                setShowModal(false);
                setShowTable(true);
              }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1F2937', borderRadius: 8, color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Program Head Modal */}
      {showAssignModal && selectedProgram && (
        <div>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={() => setShowAssignModal(false)} />
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
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Assign Program Head</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={20} color={'#111827'} />
              <span style={{ color: '#111827', fontWeight: 500 }}>Program Head</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <select
                  value={programsList[selectedProgramIndex]?.head || ''}
                  onChange={(e) => {
                    setProgramsList(prev => {
                      const updated = [...prev];
                      updated[selectedProgramIndex] = { ...updated[selectedProgramIndex], head: e.target.value };
                      return updated;
                    });
                  }}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #D1D5DB',
                    fontSize: 14, color: '#111827', backgroundColor: '#FFFFFF', fontWeight: 500,
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    backgroundSize: '20px',
                    paddingRight: '40px'
                  }}
                >
                  <option value="" style={{ color: '#6B7280' }}>Select a Program Head</option>
                  {programHeadList.map((head, idx) => (
                    <option key={idx} value={head} style={{ color: '#111827' }}>{head}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Assign logic here
                  setShowAssignModal(false);
                }}
                style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2C3744', color: '#FFFFFF', borderRadius: 8, border: 'none', cursor: 'pointer', gap: 8, fontWeight: 500 }}
              >
                <UserPlus size={16} />
                <span>Assign</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return pageContent;
};

export default DeanPrograms;
