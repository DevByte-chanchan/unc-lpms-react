import React from "react";
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { Search, ArrowUp, ArrowDown, Upload, Clipboard, ChevronRight, X } from "react-feather";
import ConsultantsTable from '../components/ConsultantsTable.jsx'
import styles from '../styles/CoursesTable.module.sass'
import TableScrollRegion from '../components/TableScrollRegion.jsx'

import syllabusStyles from '../styles/SyllabusSections.module.sass'
import pageStyles from '../styles/ProgramHeadWorkspace.module.sass'
import { getVisibleCourseOfferings } from '../utils/courseOfferingView.js'

const UploadButton = ({ onClick }) => (
    <button
        onClick={onClick}
        className={pageStyles.uploadButton}
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
    const [sortOrder, setSortOrder] = React.useState('title-asc');
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
    const [, setConsultants] = React.useState(initialConsultants);
    const visibleCourses = getVisibleCourseOfferings(coursesList, {
        query: searchQuery,
        yearLevel: selectedYearFilter,
        sortOrder,
    });
    const clearFilters = () => {
        setSearchQuery('');
        setSelectedYearFilter(null);
    };
    const pageContent = (
        <div className={pageStyles.managementPage}>
            <div className={pageStyles.pageHeader}>
                <div className={pageStyles.titleBlock}>
                    <h2>Course Offerings</h2>
                    <p className={pageStyles.pageSubtitle}>Browse and manage the courses for the current offering.</p>
                </div>
                <div className={pageStyles.pageHeaderActions}>
                    <UploadButton onClick={() => setShowModal(true)} />
                </div>
            </div>

            {showTable && coursesList.length > 0 && (
                <div className={`${syllabusStyles.header} ${pageStyles.dataToolbar}`}>
                    <div className={pageStyles.toolbarSort}>
                        <div className={pageStyles.sortControl}>
                            <button
                                type="button"
                                className={pageStyles.sortButton}
                                onClick={() => setSortOpen((v) => !v)}
                                aria-expanded={sortOpen}
                                aria-controls="course-offering-sort-options"
                            >
                                {sortOrder === 'title-asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                <span>Title: {sortOrder === 'title-asc' ? 'A to Z' : 'Z to A'}</span>
                            </button>
                            {sortOpen && (
                                <div id="course-offering-sort-options" className={pageStyles.sortMenu} aria-label="Sort courses by title">
                                    <button type="button" aria-pressed={sortOrder === 'title-asc'} onClick={() => { setSortOrder('title-asc'); setSortOpen(false); }}>
                                        <ArrowUp size={16} />
                                        <span>Title: A to Z</span>
                                    </button>
                                    <button type="button" aria-pressed={sortOrder === 'title-desc'} onClick={() => { setSortOrder('title-desc'); setSortOpen(false); }}>
                                        <ArrowDown size={16} />
                                        <span>Title: Z to A</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={pageStyles.toolbarControls}>
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
                        <div className={`${syllabusStyles['section-select']} ${pageStyles.searchShell}`}>
                            <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search courses" aria-label="Search course offerings by code, title, or instructor" className={pageStyles.searchInput} />
                            {searchQuery && <button type="button" className={pageStyles.searchClear} onClick={() => setSearchQuery('')} aria-label="Clear course search"><X size={15} /></button>}
                        </div>
                    </div>
                </div>
            )}

            {showTable && coursesList.length > 0 && (
                <div className={pageStyles.resultsSummary} role="status" aria-live="polite">
                    Showing {visibleCourses.length} of {coursesList.length} course offerings
                    {(searchQuery || selectedYearFilter) && <button type="button" onClick={clearFilters}>Clear filters</button>}
                </div>
            )}

            {showTable && coursesList.length > 0 && (
                <TableScrollRegion
                    label="Course Offerings"
                    minWidth={760}
                    className={styles['table-container']}
                >
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
                            {visibleCourses.map((row, idx) => (
                                <tr key={idx}>
                                    <td width={120}>{row.code}</td>
                                    <td width={350}>{row.title}</td>
                                    <td width={200}>{row.year}</td>
                                    <td width={200}>{row.instructor}</td>
                                    <td className={styles.fill} style={{ minWidth: 160, paddingRight: 10 }}>
                                        <a href="#" className={styles.actionLink} onClick={(e) => { e.preventDefault(); setSelectedCourseDetails(row); setDetailsOpen(true); }} style={{ color: '#111827', display: 'inline-flex', alignItems: 'center' }}>
                                            <span style={{ marginRight: 8 }}>View</span>
                                            <span className={styles.actionIcon} style={{ color: '#111827' }}><ChevronRight size={16} /></span>
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {visibleCourses.length === 0 && (
                                <tr><td colSpan={5} className={pageStyles.noResults}>No course offerings match your search or filters. <button type="button" onClick={clearFilters}>Clear filters</button></td></tr>
                            )}
                        </tbody>
                    </table>
                </TableScrollRegion>
            )}

            {/* Empty state when no courses */}
            {(!showTable || coursesList.length === 0) && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ width: 92, height: 92, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clipboard size={40} color="#9CA3AF" />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No courses yet</div>
                    <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>Upload a course list to get started.</div>
                    <button type="button" className={pageStyles.secondaryButton} onClick={() => setShowModal(true)}>Choose a file</button>
                </div>
            )}

            {showModal && (
                <div>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={() => setShowModal(false)} />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="course-offering-upload-title"
                        className={`${pageStyles.managementDialog} ${pageStyles.dialogWide}`}
                    >
                        <div className={pageStyles.dialogHeader}>
                            <h2 id="course-offering-upload-title" className={pageStyles.dialogTitle}>Upload Course Offerings</h2>
                            <button type="button" className="app-icon-close" onClick={() => setShowModal(false)} aria-label="Close upload dialog"><X size={16} /></button>
                        </div>

                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Choose a course offerings file"
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                            onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files && e.dataTransfer.files[0]; if (file) { setSelectedFile(file); } }}
                            className={pageStyles.dialogDropZone}
                        >
                            <div style={{ width: 64, height: 64, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Upload size={36} color="#9CA3AF" />
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{selectedFile ? selectedFile.name : 'Drag & drop file here'}</div>
                            <div style={{ color: '#6B7280', fontSize: 13 }}>Upload .xlsx, .xls or .csv</div>
                            <input id="course-offerings-file-input" type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files && e.target.files[0]; setSelectedFile(file || null); }} style={{ display: 'none' }} />
                        </div>
                        {selectedFile && <p className={pageStyles.fileFeedback} role="status">Selected: {selectedFile.name}</p>}

                        <div className={pageStyles.managementDialogActions}>
                            <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setShowModal(false); }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                            <button disabled={!selectedFile} onClick={() => {
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
                        className={`${pageStyles.managementDialog} ${pageStyles.dialogNarrow} ${pageStyles.dialogElevated}`}
                    >
                        <div className={pageStyles.dialogHeader}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Assign Course Offerings</h2>
                        </div>

                        <div className={pageStyles.dialogContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clipboard size={20} color={'#111827'} />
                                <span style={{ color: '#111827', fontWeight: 500 }}>Course Offerings</span>
                            </div>
                            <div style={{ width: '100%' }}>
                                {/*<DropdownMultiSelectE options={courses} initialValue={selectedCourse} onChange={setSelectedCourse} />*/}
                            </div>
                        </div>

                        <div className={pageStyles.managementDialogActions}>
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
                        className={`${pageStyles.managementDialog} ${pageStyles.dialogMedium} ${pageStyles.dialogElevated}`}
                    >
                        <div className={pageStyles.dialogHeader} style={{ marginBottom: 8 }}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Course Details</h2>
                            <button
                                type="button"
                                className="app-icon-close"
                                onClick={() => setDetailsOpen(false)}
                                aria-label="Close course details"
                            >
                                <X size={16} strokeWidth={2} />
                            </button>
                        </div>

                        <div className={pageStyles.dialogContent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            header={<Header role="Program Head" name="DANILA, JUNAR" />}
            nav={<SideNavigation mode="program-head" />}
            content={pageContent}
        />
    );
}

export default ProgramHeadCourseOfferings;
