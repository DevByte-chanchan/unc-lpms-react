import React from "react";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { Clock, Search, ArrowUp, ArrowDown, Upload } from "react-feather";

const UploadButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      padding: '15px 30px', gap: 8, width: '310px', height: '54px',
      background: '#EA1212', borderRadius: '5px', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
    }}
  >
    <span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Upload size={20} color="#FFFFFF" />
    </span>
    Upload Program Outcome List
  </button>
)

const OutcomesTable = ({ outcomes = [] }) => (
  <div style={{ background: '#FFFFFF' }}>
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
      <thead>
        <tr style={{ background: '#F3F4F6', color: '#111827', textAlign: 'left' }}>
          <th style={{ padding: '12px 16px', width: 120 }}>ID</th>
          <th style={{ padding: '12px 16px' }}>DESCRIPTION</th>
        </tr>
      </thead>
      <tbody>
        {outcomes.map((row, idx) => (
          <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
            <td style={{ padding: '12px 16px', width: 120 }}>{row.id}</td>
            <td style={{ padding: '12px 16px' }}>{row.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const ProgramHeadOutcomes = () => {
  const [showModal, setShowModal] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const programName = 'Bachelor of Science in Information Technology';
  // Upload-first: no table initially
  const [outcomes, setOutcomes] = React.useState([
    { id: 'PO1', description: 'Apply computing knowledge and skills to solve complex problems in professional practice.' },
    { id: 'PO2', description: 'Design, implement, and evaluate computer-based systems, processes, components, or programs to meet desired needs.' },
    { id: 'PO3', description: 'Communicate effectively with diverse audiences and function effectively on teams to accomplish common goals.' },
  ]);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const fileInputRef = React.useRef(null);

  return (
    <Skeleton
      header={<Header role="Program Head" name="DANILA, JUNE ARREB C." />}
      nav={<SideNavigation mode="program-head" />}
      content={
        <div style={{ padding: 20, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Program Outcomes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <UploadButton onClick={() => setShowModal(true)} />
            </div>
          </div>

          {/* Upload-first: only header and button */}

          {/* Program header removed per request */}

          {/* After upload, show controls and table */}
          {showTable && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
                background: '#FFFFFF', padding: '10px 0'
              }}>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, justifyContent: 'flex-end' }}>
                  <div style={{
                    width: 420, height: 44, display: 'flex', flexDirection: 'row', alignItems: 'center',
                    padding: '8px 16px', gap: 12,
                    border: '1px solid #A4A9AF', borderRadius: 24, background: '#FFFFFF'
                  }}>
                    <Search size={20} color="#A4A9AF" />
                    <input type="text" placeholder="Search" style={{ flex: 1, height: 22, border: 'none', outline: 'none', fontSize: 16, color: '#111827', background: 'transparent' }} />
                  </div>
                </div>
              </div>

              {/* Outcomes table after upload */}
              <OutcomesTable outcomes={outcomes} />
            </>
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
                  <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Program Outcome List</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <label htmlFor="outcomes-file-input" style={{ cursor: 'pointer', borderRadius: 5, background: '#9CA3AF', color: '#FFFFFF', padding: '12px 32px' }}>{selectedFile ? 'Change File' : 'Choose File'}</label>
                  <input id="outcomes-file-input" type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files && e.target.files[0]; setSelectedFile(file || null); }} style={{ display: 'none' }} />
                  <span style={{ color: '#374151' }}>{selectedFile ? selectedFile.name : 'No file chosen'}</span>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setShowModal(false); }} style={{ flex: 1, padding: '12px 32px', background: '#FFFFFF', border: '2px solid #111827', borderRadius: 6, color: '#111827', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => { if (!selectedFile) { alert('Please choose a file first'); return; } setShowModal(false); setShowTable(true); }} style={{ flex: 1, padding: '12px 32px', background: '#1F2937', borderRadius: 6, color: '#FFFFFF', border: 'none', cursor: 'pointer' }}>Upload</button>
                </div>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}

export default ProgramHeadOutcomes;
