
import React from "react";
import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import DepartmentsTable from "../components/DepartmentsTable.jsx";
import DropdownA from "../components/DropdownA.jsx";
import { Upload, Clock, X, Search, ArrowUp, ArrowDown } from "react-feather";

const UploadButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      padding: '15px 30px', gap: '5px', width: '243px', height: '54px',
      background: '#EA1212', borderRadius: '5px', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
    }}
  >
    <Upload size={18} />
    Upload Department List
  </button>
)

const HRStaff = () => {
  // UI state for modal and table visibility
  const [showModal, setShowModal] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const fileInputRef = React.useRef(null);
  const [department, setDepartment] = React.useState("");

  const onUploadClick = () => setShowModal(true);
  const onConfirmUpload = () => {
    if (!selectedFile) {
      alert('Please choose a file first');
      return;
    }
    setShowModal(false);
    setShowTable(true);
  };
  const onCancelUpload = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowModal(false);
  };
  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) setSelectedFile(file);
  };

  return (
    <SkeletonA
      header={<HeaderA role="HR Staff" name="NORTON, MONICA" />}
      nav={<SideNavigation />}
      content={
        // Make the department page content area white while preserving the overall layout gap
        <div style={{ padding: 20, background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Departments</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <UploadButton onClick={onUploadClick} />
              {showTable && (
                <div style={{ color: '#6B7280', fontSize: 14 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} color={'#6B7280'} />
                    Current Period: 2nd Semester 2022-2023
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Controls shown only after upload */}
          {showTable && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
              background: '#FFFFFF', padding: '10px 0'
            }}>
              {/* Sort button with inactive style */}
              <button
                style={{
                  width: 147, height: 52,
                  display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
                  padding: '15px 30px', gap: 10,
                  background: '#FFFFFF', border: '1px solid #A4A9AF', borderRadius: 5,
                  color: '#595959', cursor: 'pointer'
                }}
              >
                {/* Up/Down sort icon */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 6 }}>
                  <ArrowUp size={18} color="#595959" />
                  <ArrowDown size={18} color="#595959" />
                </span>
                <span style={{ fontWeight: 600, fontSize: 16, lineHeight: '22px' }}>Sort</span>
              </button>

              {/* Right-side controls (Filter + Search) as one line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, justifyContent: 'flex-end' }}>
                {/* Instructor-styled DropdownA in compact inline mode */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <DropdownA
                    label="Filter by Department"
                    disabled={false}
                    initialValue={department}
                    onChange={(val) => setDepartment(val)}
                    inline={true}
                    options={[
                      'College of Education',
                      'College of Engineering and Architecture',
                      'Criminal Justice Education',
                      'School of Business and Accountancy',
                      'School of Computer and Information Technology',
                      'School of Nursing and Allied Health Sciences',
                      'School of Social and Natural Sciences'
                    ]}
                  />
                </div>

                {/* Smaller Search pill to fit alongside filter */}
                <div style={{
                  width: 420, height: 44, display: 'flex', flexDirection: 'row', alignItems: 'center',
                  padding: '8px 16px', gap: 12,
                  border: '1px solid #A4A9AF', borderRadius: 24, background: '#FFFFFF'
                }}>
                  <Search size={20} color="#A4A9AF" />
                  <input
                    type="text"
                    placeholder="Search"
                    style={{
                      flex: 1, height: 22, border: 'none', outline: 'none',
                      fontSize: 16, color: '#111827', background: 'transparent'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Table appears only after upload */}
          {showTable && <DepartmentsTable />}

          {/* Centered Upload Modal */}
          {showModal && (
            <div>
              {/* overlay */}
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={onCancelUpload} />
              {/* modal */}
              <div
                style={{
                  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 767, height: 289, padding: 40, background: '#FFFFFF', borderRadius: 10,
                  display: 'flex', flexDirection: 'column', gap: 20, zIndex: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Department List</div>
                  <button onClick={onCancelUpload} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Choose File row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <label
                    htmlFor="dept-file-input"
                    style={{ cursor: 'pointer', borderRadius: 5, background: '#9CA3AF', color: '#FFFFFF', padding: '12px 32px' }}
                  >
                    Choose File
                  </label>
                  <input
                    id="dept-file-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    accept=".csv,.xlsx,.xls"
                    style={{ display: 'none' }}
                  />
                  <span style={{ color: '#374151' }}>
                    {selectedFile ? selectedFile.name : 'No file chosen'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    onClick={onCancelUpload}
                    style={{
                      padding: '10px 16px', height: 40,
                      background: '#FFFFFF', border: '2px solid #111827', borderRadius: 6, color: '#111827', cursor: 'pointer', minWidth: 120
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirmUpload}
                    style={{
                      padding: '10px 16px', height: 40,
                      background: '#1F2937', borderRadius: 6, color: '#FFFFFF', border: 'none', cursor: 'pointer', minWidth: 120
                    }}
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

export default HRStaff;
