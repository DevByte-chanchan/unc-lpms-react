import React from "react";
import FacultyTable from "../components/FacultyTable.jsx";
import { Clock, Search, ArrowUp, ArrowDown, Upload, Clipboard, User, X } from "react-feather";
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
    Upload Faculty List
  </button>
)

const DeanFaculty = () => {
  const [showModal, setShowModal] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const fileInputRef = React.useRef(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showDetailModal, setShowDetailModal] = React.useState(false);
  const [selectedFaculty, setSelectedFaculty] = React.useState(null);
  const [roleFilter, setRoleFilter] = React.useState(null);

  const seededFaculty = [
    { 
      id: 1,
      name: 'Agnes R. Trillanes', 
      department: 'SCIS', 
      role: 'Dean',
      status: 'Active',
      sex: 'Female',
      birthdate: '1985-03-21',
      email: 'agnes.r.trillanes@unc.edu.ph',
      contact: '08171234567'
    },
    { 
      id: 2,
      name: 'June Arreb Danila', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1988-07-15',
      email: 'june.danila@unc.edu.ph',
      contact: '09171234567'
    },
    { 
      id: 3,
      name: 'Dennis Ignacio', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1990-01-10',
      email: 'dennis.ignacio@unc.edu.ph',
      contact: '09181234567'
    },
    { 
      id: 4,
      name: 'Danny B. Casimero', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1992-05-22',
      email: 'danny.casimero@unc.edu.ph',
      contact: '09191234567'
    },
    { 
      id: 5,
      name: 'Sarah K. Moore', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Female',
      birthdate: '1989-11-08',
      email: 'sarah.moore@unc.edu.ph',
      contact: '09201234567'
    },
    { 
      id: 6,
      name: 'Michael R. Lee', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1987-04-18',
      email: 'michael.lee@unc.edu.ph',
      contact: '09211234567'
    },
    { 
      id: 7,
      name: 'Rafael D. Navarro', 
      department: 'SCIS', 
      role: 'Program Head',
      status: 'Active',
      sex: 'Male',
      birthdate: '1986-09-30',
      email: 'rafael.navarro@unc.edu.ph',
      contact: '09221234567'
    },
    { 
      id: 8,
      name: 'Harold T. Lim', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1991-02-14',
      email: 'harold.lim@unc.edu.ph',
      contact: '09231234567'
    },
    { 
      id: 9,
      name: 'Bianca G. Reyes', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Female',
      birthdate: '1993-06-25',
      email: 'bianca.reyes@unc.edu.ph',
      contact: '09241234567'
    },
    { 
      id: 10,
      name: 'Victor A. Mendoza', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1988-12-03',
      email: 'victor.mendoza@unc.edu.ph',
      contact: '09251234567'
    },
    { 
      id: 11,
      name: 'Leo B. Garcia', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1989-08-17',
      email: 'leo.garcia@unc.edu.ph',
      contact: '09261234567'
    },
    { 
      id: 12,
      name: 'Marissa K. Ong', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Female',
      birthdate: '1990-10-12',
      email: 'marissa.ong@unc.edu.ph',
      contact: '09271234567'
    },
    { 
      id: 13,
      name: 'Edwin J. Ramos', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1987-03-19',
      email: 'edwin.ramos@unc.edu.ph',
      contact: '09281234567'
    },
    { 
      id: 14,
      name: 'Gabriel S. Chua', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1992-07-28',
      email: 'gabriel.chua@unc.edu.ph',
      contact: '09291234567'
    },
    { 
      id: 15,
      name: 'Patricia M. Flores', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Female',
      birthdate: '1991-05-09',
      email: 'patricia.flores@unc.edu.ph',
      contact: '09301234567'
    },
    { 
      id: 16,
      name: 'Samuel J. Bautista', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1989-09-22',
      email: 'samuel.bautista@unc.edu.ph',
      contact: '09311234567'
    },
    { 
      id: 17,
      name: 'Karen L. Dominguez', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Female',
      birthdate: '1990-04-11',
      email: 'karen.dominguez@unc.edu.ph',
      contact: '09321234567'
    },
    { 
      id: 18,
      name: 'Fernando R. Cruz', 
      department: 'SCIS', 
      role: 'Instructor',
      status: 'Active',
      sex: 'Male',
      birthdate: '1988-01-05',
      email: 'fernando.cruz@unc.edu.ph',
      contact: '09331234567'
    },
  ];

  const [faculty, setFaculty] = React.useState([]);

  const handleViewFaculty = (facultyMember) => {
    setSelectedFaculty(facultyMember);
    setShowDetailModal(true);
  };

  return (
    <div style={{ padding: 20, background: '#FFFFFF', minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Faculty</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <UploadButton onClick={() => setShowModal(true)} />
        </div>
      </div>

      {showTable && faculty.length > 0 && (
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
            <div className={'filter-container'}>
              <p>Filter by <strong>Role</strong>:</p>
              <select value={roleFilter || ''} onChange={(e) => setRoleFilter(e.target.value || null)}>
                <option value="">All</option>
                <option value="Dean">Dean</option>
                <option value="Program Head">Program Head</option>
                <option value="Instructor">Instructor</option>
              </select>
            </div>
            <div className={syllabusStyles['section-select']} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', height: 40, borderRadius: 9999, background: 'transparent', border: '1px solid #D1D5DB' }}>
              <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search faculty" style={{ border: 0, outline: 'none', background: 'transparent', width: 360, fontSize: 14 }} />
            </div>
          </div>
        </div>
      )}

      {showTable && faculty.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.4 }}>
            <Clock size={16} color="#374151" />
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Current Period: 1st Semester 2026-2027</span>
          </div>
        </div>
      )}

      {showTable && faculty.length > 0 && (
        <div className={styles['table-container']} style={{ maxHeight: 700, overflowY: 'auto', paddingBottom: 16 }}>
          <FacultyTable
            faculty={faculty.filter(f =>
              (!roleFilter || f.role === roleFilter) &&
              (!searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.department.toLowerCase().includes(searchQuery.toLowerCase()))
            )}
            onView={handleViewFaculty}
            hideDepartment={true}
          />
        </div>
      )}

      {/* Empty state when no faculty */}
      {(!showTable || faculty.length === 0) && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 100, height: 100, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clipboard size={48} color="#9CA3AF" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No faculty yet</div>
          <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420, fontSize: 14, lineHeight: '1.5' }}>You don't have any faculty uploaded. Upload a faculty list or add one to get started.</div>
        </div>
      )}

      {/* Upload Modal */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Faculty List</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
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
              <input id="faculty-file-input" type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files && e.target.files[0]; setSelectedFile(file || null); }} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setShowModal(false); }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={() => {
                if (!selectedFile) { alert('Please choose a file first'); return; }
                setFaculty(seededFaculty);
                setShowModal(false);
                setShowTable(true);
              }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2C3744', borderRadius: 8, color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Detail Modal */}
      {showDetailModal && selectedFaculty && (
        <div>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={() => setShowDetailModal(false)} />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 700, padding: 40, background: '#FFFFFF', borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 24, zIndex: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ width: 100, height: 100, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={56} color="#9CA3AF" />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{selectedFaculty.name}</div>
                  <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>
                    <span style={{ display: 'inline-block', padding: '4px 10px', background: '#D1FAE5', color: '#047857', borderRadius: 4, fontWeight: 500 }}>
                      {selectedFaculty.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{selectedFaculty.role}</div>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={24} color="#111827" />
              </button>
            </div>

            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12, textTransform: 'uppercase' }}>Personal Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Sex</div>
                    <div style={{ fontSize: 14, color: '#111827' }}>{selectedFaculty.sex}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Birthdate</div>
                    <div style={{ fontSize: 14, color: '#111827' }}>{selectedFaculty.birthdate}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12, textTransform: 'uppercase' }}>Contact Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Email Address</div>
                    <div style={{ fontSize: 14, color: '#111827' }}>{selectedFaculty.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Contact Number</div>
                    <div style={{ fontSize: 14, color: '#111827' }}>{selectedFaculty.contact}</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12, textTransform: 'uppercase' }}>Professional Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Role</div>
                    <div style={{ fontSize: 14, color: '#111827' }}>{selectedFaculty.role}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Department</div>
                    <div style={{ fontSize: 14, color: '#111827' }}>{selectedFaculty.department}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeanFaculty