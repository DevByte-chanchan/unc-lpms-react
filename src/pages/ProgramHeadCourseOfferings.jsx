import React from "react";
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { Clock, Search, ArrowUp, ArrowDown, Upload, Sliders, Clipboard, Briefcase, ChevronRight, X } from "react-feather";
import ConsultantsTable from '../components/ConsultantsTable.jsx'
import styles from '../styles/CoursesTable.module.sass'
import DropdownMultiSelectE from '../components/DropdownMultiSelectE.jsx'
import syllabusStyles from '../styles/SyllabusSections.module.sass'

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
        Upload Course Offerings
    </button>
)

const ProgramHeadCourseOfferings = () => {
    const [showModal, setShowModal] = React.useState(false);
    const [sortOpen, setSortOpen] = React.useState(false);
    const [showTable, setShowTable] = React.useState(false);
    const [assignOpen, setAssignOpen] = React.useState(false);
    const [detailsOpen, setDetailsOpen] = React.useState(false);
    const [selectedCourse, setSelectedCourse] = React.useState([]);
    const [selectedCourseDetails, setSelectedCourseDetails] = React.useState(null);
    const [selectedConsultantIndex, setSelectedConsultantIndex] = React.useState(null);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [coursesList, setCoursesList] = React.useState([]);
    const [selectedYearFilter, setSelectedYearFilter] = React.useState(null);
    const fileInputRef = React.useRef(null);
    const programName = 'Bachelor of Science in Information Technology';
    const consultant = { name: 'Dennis Ignacio', department: 'School of Computer and Information Sciences' };
    const courses = [
        'BSCS313L – Human & Computer Interaction',
        'BSCS111L – Fundamentals of Programming',
        'BSIT212L - Mobile Application Development',
        'BSIT213L - Database Management Systems',
        'BSIT214L - Software Development Life Cycle',
        'BSIT215L - Systems Analysis and Design',
        'BSIT216L - Network Administration',
        'BSIT217L - Cybersecurity Fundamentals',
        'BSIT218L - Cloud Technologies',
        'BSIT219L - Data Analytics',
    ];
    const initialConsultants = [];
    const seededConsultants = [
        { name: 'Maria Santos' },
        { name: 'Jose Dela Cruz' },
        { name: 'Liza Reyes' },
        { name: 'Antonio Villanueva' },
        { name: 'Ramon Bautista' },
    ];
    const seededCourseRows = [
        { code: 'BSCS111L', title: 'Fundamentals of Programming', year: 'First Year', instructor: 'Dr. A. Lopez' },
        { code: 'BSIT212L', title: 'Mobile Application Development', year: 'Second Year', instructor: 'Prof. M. Cruz' },
        { code: 'BSCS313L', title: 'Human & Computer Interaction', year: 'Third Year', instructor: 'Dr. S. Reyes' },
        { code: 'BSIT213L', title: 'Database Management Systems', year: 'Second Year', instructor: 'Prof. L. Garcia' },
        { code: 'BSIT217L', title: 'Cybersecurity Fundamentals', year: 'Third Year', instructor: 'Dr. R. Bautista' },
        { code: 'BSCS111L', title: 'Fundamentals of Programming', year: 'First Year', instructor: 'Dr. A. Lopez' },
        { code: 'BSIT212L', title: 'Mobile Application Development', year: 'Second Year', instructor: 'Prof. M. Cruz' },
        { code: 'BSCS313L', title: 'Human & Computer Interaction', year: 'Third Year', instructor: 'Dr. S. Reyes' },
        { code: 'BSIT213L', title: 'Database Management Systems', year: 'Second Year', instructor: 'Prof. L. Garcia' },
        { code: 'BSIT217L', title: 'Cybersecurity Fundamentals', year: 'Third Year', instructor: 'Dr. R. Bautista' },
        { code: 'BSCS111L', title: 'Fundamentals of Programming', year: 'First Year', instructor: 'Dr. A. Lopez' },
        { code: 'BSIT212L', title: 'Mobile Application Development', year: 'Second Year', instructor: 'Prof. M. Cruz' },
        { code: 'BSCS313L', title: 'Human & Computer Interaction', year: 'Third Year', instructor: 'Dr. S. Reyes' },
        { code: 'BSIT213L', title: 'Database Management Systems', year: 'Second Year', instructor: 'Prof. L. Garcia' },
        { code: 'BSIT217L', title: 'Cybersecurity Fundamentals', year: 'Third Year', instructor: 'Dr. R. Bautista' },
        { code: 'BSCS111L', title: 'Fundamentals of Programming', year: 'First Year', instructor: 'Dr. A. Lopez' },
        { code: 'BSIT212L', title: 'Mobile Application Development', year: 'Second Year', instructor: 'Prof. M. Cruz' },
        { code: 'BSCS313L', title: 'Human & Computer Interaction', year: 'Third Year', instructor: 'Dr. S. Reyes' },
        { code: 'BSIT213L', title: 'Database Management Systems', year: 'Second Year', instructor: 'Prof. L. Garcia' },
        { code: 'BSIT217L', title: 'Cybersecurity Fundamentals', year: 'Third Year', instructor: 'Dr. R. Bautista' } 
    ];
    const [consultants, setConsultants] = React.useState(initialConsultants);
    const [selectedConsultant, setSelectedConsultant] = React.useState(null);

    const pageContent = (
        <div style={{ padding: 20, background: '#FFFFFF', minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Course Offerings</h2>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    <UploadButton onClick={() => setShowModal(true)} />
                </div>
            </div>

            {showTable && coursesList.length > 0 && (
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
                            <p>Filter by <strong>Year Level</strong>:</p>
                            <select value={selectedYearFilter || ''} onChange={(e) => setSelectedYearFilter(e.target.value || null)}>
                                <option value="">All</option>
                                <option value="First Year">First Year</option>
                                <option value="Second Year">Second Year</option>
                                <option value="Third Year">Third Year</option>
                                <option value="Fourth Year">Fourth Year</option>
                            </select>
                        </div>
                        <div className={syllabusStyles['section-select']} style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', height: 40, borderRadius: 9999, background: 'transparent', border: '1px solid #D1D5DB' }}>
                            <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search courses" style={{ border: 0, outline: 'none', background: 'transparent', width: 360, fontSize: 14 }} />
                        </div>
                    </div>
                </div>
            )}

            {showTable && coursesList.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.4 }}>
                        <Clock size={16} color="#374151" />
                        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Current Period: 1st Semester 2026-2027</span>
                    </div>
                </div>
            )}

            {showTable && coursesList.length > 0 && (
                <div className={styles['table-container']} style={{ maxHeight: 700, overflowY: 'auto', paddingBottom: 16 }}>
                    <table style={{ width: '100%' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
                            <tr>
                                <th width={120}>CODE</th>
                                <th width={350}>COURSE TITLE</th>
                                <th width={200}>YEAR LEVEL</th>
                                <th width={200}>INSTRUCTOR</th>
                                <th className={styles.fill}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {coursesList.filter(r => (
                                (!searchQuery || r.code.toLowerCase().includes(searchQuery.toLowerCase()) || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.instructor.toLowerCase().includes(searchQuery.toLowerCase())) &&
                                (!selectedYearFilter || r.year === selectedYearFilter)
                            )).map((row, idx) => (
                                <tr key={idx}>
                                    <td width={120}>{row.code}</td>
                                    <td width={350}>{row.title}</td>
                                    <td width={200}>{row.year}</td>
                                    <td width={200}>{row.instructor}</td>
                                    <td className={styles.fill} style={{ minWidth: 160, paddingRight: 10 }}>
                                        <a href="#" className={styles.actionLink} onClick={(e) => { e.preventDefault(); setSelectedCourseDetails(row); setDetailsOpen(true); }} style={{ color: '#111827', display: 'inline-flex', alignItems: 'center' }}>
                                            <span style={{ marginRight: 8 }}>View</span>
                                            <span className={styles.actionIcon} style={{ color: '#111827' }}><ChevronRight size={18} /></span>
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty state when no courses */}
            {(!showTable || coursesList.length === 0) && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ width: 92, height: 92, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clipboard size={40} color="#9CA3AF" />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No courses yet</div>
                    <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>You don't have any courses uploaded. Upload a course list or add one to get started.</div>
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
                            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload Course Offerings</div>
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
                            <input id="consultant-file-input" type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files && e.target.files[0]; setSelectedFile(file || null); }} style={{ display: 'none' }} />
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setShowModal(false); }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                            <button onClick={() => {
                                if (!selectedFile) { alert('Please choose a file first'); return; }
                                // simulate upload and seed some data so the table isn't empty
                                setCoursesList(seededCourseRows);
                                setConsultants(seededConsultants);
                                setShowModal(false);
                                setShowTable(true);
                            }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1F2937', borderRadius: 8, color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Upload</button>
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
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Assign Course Offerings</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clipboard size={20} color={'#111827'} />
                                <span style={{ color: '#111827', fontWeight: 500 }}>Course Offerings</span>
                            </div>
                            <div style={{ width: '100%' }}>
                                {/*<DropdownMultiSelectE options={courses} initialValue={selectedCourse} onChange={setSelectedCourse} />*/}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => setAssignOpen(false)}
                                style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: 'pointer', fontWeight: 500 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setConsultants(prev => prev.map((item, i) => i === selectedConsultantIndex ? { ...item, assignedCourse: selectedCourse } : item));
                                    setAssignOpen(false);
                                    setSelectedCourse([]);
                                    setSelectedConsultantIndex(null);
                                }}
                                style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2C3744', color: '#FFFFFF', borderRadius: 8, border: 'none', cursor: 'pointer', gap: 8, fontWeight: 500 }}
                            >
                                <Clipboard size={16} />
                                <span>Assign</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detailsOpen && selectedCourseDetails && (
                <div>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={() => setDetailsOpen(false)} />
                    <div
                        role="dialog"
                        aria-modal="true"
                        style={{
                            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: 500, background: '#FFFFFF', borderRadius: 10, padding: 24,
                            display: 'flex', flexDirection: 'column', gap: 20, zIndex: 40,
                            fontFamily: 'Poppins, sans-serif',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Course Details</h2>
                            <button
                                onClick={() => setDetailsOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
                            >
                                <X size={24} strokeWidth={2} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Course No.</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>{selectedCourseDetails.code}</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Course Title</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>{selectedCourseDetails.title}</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Instructors</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>{selectedCourseDetails.instructor}</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Credit</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>3 Units</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Hours/Week</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>3 Hours (3 Lecture Hours)</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Pre-requisites</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>N/A</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Classification/Field</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>Core Requirement</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>CMO</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>CMO No. 25 S. 2015</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Year Level</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>{selectedCourseDetails.year}</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Term</label>
                                <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#111827', fontWeight: 500 }}>1st Sem, A.Y. 2025-26</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <Skeleton
            header={<Header role="Program Head" name="DANILA, JUNE ARREB" />}
            nav={<SideNavigation mode="program-head" />}
            content={pageContent}
        />
    );
}

export default ProgramHeadCourseOfferings;
