import React, { useState, useRef, useEffect } from 'react';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { Upload, Clipboard, Eye } from 'react-feather';
import coaepStyles from '../../../styles/COAEPUpload.module.sass';
import * as XLSX from 'xlsx';

const A4_PAPER = {
  maxWidth: 816, margin: '0 auto', background: '#FFFFFF',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 40,
  fontFamily: "'Poppins', 'Times New Roman', serif",
};

const UploadButton = ({ onClick, hasUploaded }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
            padding: '8px 18px', gap: 8, width: hasUploaded ? 160 : 240, height: 40,
            background: hasUploaded ? '#1F2937' : '#EA1212', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
        }}
    >
        <span style={{ width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={18} color="#FFFFFF" />
        </span>
        {hasUploaded ? 'Update COAEP' : 'Upload COAEP'}
    </button>
);

const excelDateToJSDate = (serial) => {
    if (serial === null || serial === undefined || serial === '') return '';
    const num = typeof serial === 'string' ? Number(serial) : serial;
    if (isNaN(num) || num < 1 || num > 100000) return String(serial);
    const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(num)));
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
};

const formatDateValue = (val) => {
    if (!val) return '';
    return excelDateToJSDate(val);
};

const COAEPUpload = () => {
    const [showModal, setShowModal] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showModal]);

    useEffect(() => {
        setParsedData({
            header: {
                facultyName: 'SANTOS, MARIA C.',
                schoolYear: '2024-2025',
                course: 'BSCS 313L - Software Engineering',
                semester: '1st Semester',
                preparedBy: 'MARIA C. SANTOS',
                approvedBy: 'DENNIS E. IGNACIO',
                dateSubmitted: '09/13/2025',
                effectivityDate: '06/01/2024',
                revisionNo: '0',
                pageNo: '1 of 1',
            },
            cos: [
                {
                    number: '1',
                    statement: 'Apply software engineering principles and practices in the development of software systems.',
                    ilos: [
                        { outcome: 'Define software engineering and differentiate it from other engineering disciplines.', assessmentTool: 'Written Examination', performanceTarget: '75% of students will achieve a passing score of 70% or higher.' },
                        { outcome: 'Identify and describe the phases of the software development life cycle (SDLC).', assessmentTool: 'Recitation / Quiz', performanceTarget: '80% of students will correctly identify all SDLC phases.' },
                        { outcome: 'Apply the concept of process models (Waterfall, Agile, etc.) in a given scenario.', assessmentTool: 'Case Study Analysis', performanceTarget: '70% of students will demonstrate proficiency in selecting the appropriate process model.' },
                    ],
                },
                {
                    number: '2',
                    statement: 'Analyze and model software requirements using appropriate techniques and tools.',
                    ilos: [
                        { outcome: 'Elicit and document software requirements from stakeholders.', assessmentTool: 'Group Project Documentation', performanceTarget: '85% of groups will produce a complete SRS document.' },
                        { outcome: 'Create UML diagrams (Use Case, Class, Sequence) to model software requirements.', assessmentTool: 'Practical Exercise (UML)', performanceTarget: '80% of students will create correct UML diagrams for a given system.' },
                        { outcome: 'Validate and verify software requirements against stakeholder needs.', assessmentTool: 'Peer Review / Checklist', performanceTarget: '75% of students will identify at least 3 requirement inconsistencies.' },
                    ],
                },
                {
                    number: '3',
                    statement: 'Design, implement, and test software solutions following industry-standard practices.',
                    ilos: [
                        { outcome: 'Design software architecture using appropriate design patterns.', assessmentTool: 'Design Document Submission', performanceTarget: '80% of groups will apply at least one design pattern correctly.' },
                        { outcome: 'Implement a software module using an object-oriented programming language.', assessmentTool: 'Coding Exercise', performanceTarget: '70% of students will produce a working implementation meeting the given specifications.' },
                        { outcome: 'Develop and execute unit tests to verify software correctness.', assessmentTool: 'Unit Test Output / JUnit', performanceTarget: '75% of students will achieve at least 70% code coverage.' },
                    ],
                },
                {
                    number: '4',
                    statement: 'Evaluate software quality through systematic testing, code reviews, and adherence to software engineering standards.',
                    ilos: [
                        { outcome: 'Identify and classify different types of software testing (unit, integration, system, acceptance).', assessmentTool: 'Written Examination', performanceTarget: '80% of students will correctly classify testing types with 75% accuracy.' },
                        { outcome: 'Perform a code review and identify common coding violations and anti-patterns.', assessmentTool: 'Code Review Checklist', performanceTarget: '85% of students will identify at least 5 code quality issues in a sample codebase.' },
                        { outcome: 'Measure and evaluate software quality using metrics such as cyclomatic complexity and code coverage.', assessmentTool: 'Lab Report / Static Analysis', performanceTarget: '70% of students will achieve acceptable metric thresholds on a given codebase.' },
                    ],
                },
            ],
        });
        setShowTable(true);
    }, []);

    const handleFileUpload = () => {
        if (!selectedFile) { alert('Please choose a file first'); return; }

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const workbook = XLSX.read(evt.target.result, { type: 'array' });
                const sheetName = 'Course AssessPlan';
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                    setError(`Error: Sheet '${sheetName}' not found in the uploaded file. Please upload the correct COAEP Excel template.`);
                    setShowModal(false);
                    return;
                }

                const data = parseCOAEP(worksheet);
                console.log('Parsed COAEP Data:', data);
                
                if (!data || data.cos.length === 0) {
                    setError('The form appears to be blank. No Course Outcome data was found.');
                    setShowModal(false);
                    return;
                }

                setParsedData(data);
                setShowTable(true);
                setShowModal(false);
                setError(null);
            } catch (err) {
                console.error('COAEP parse error:', err);
                setError(`Error: Failed to parse the Excel file. ${err.message || 'Please check the format.'}`);
                setShowModal(false);
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const parseCOAEP = (worksheet) => {
        const getCellValue = (rowIdx, colIdx) => {
            const ref = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
            const cell = worksheet[ref];
            return cell ? (cell.w !== undefined ? cell.w : cell.v) : '';
        };

        const rows = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, defval: '', raw: false 
        });

        console.log('DEBUG rows 6-25:');
        rows.slice(6, 25).forEach((r, i) => {
            console.log(`Row ${i+6}:`, r.slice(0, 8));
        });

        const header = {
            facultyName: getCellValue(6, 2) || '',
            schoolYear: getCellValue(6, 6) || '',
            course: getCellValue(7, 2) || '',
            semester: getCellValue(7, 6) || '',
            preparedBy: '',
            approvedBy: '',
            dateSubmitted: '',
            effectivityDate: '',
            revisionNo: '',
            pageNo: '',
        };

        const cos = [];
        let currentCO = null;

        const footerKeywords = [
            'prepared by', 'approved by', 'date submitted',
            'revision no', 'effectivity', 'page no', 'reminders'
        ];

        for (let i = 10; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const rowText = row.join(' ').toLowerCase();

            if (footerKeywords.some(kw => rowText.includes(kw))) {
                if (rowText.includes('prepared by')) {
                    header.preparedBy = row[2] || row[3] || '';
                }
                if (rowText.includes('approved by')) {
                    header.approvedBy = row[4] || row[5] || row[6] || '';
                }
                if (rowText.includes('date submitted')) {
                    const raw = row[3] || row[4] || '';
                    header.dateSubmitted = raw ? excelDateToJSDate(raw) : '';
                }
                if (rowText.includes('effectivity')) {
                    const raw = row[2] || row[3] || '';
                    header.effectivityDate = raw 
                        ? (raw.toString().match(/\d{2}\/\d{2}\/\d{4}/) 
                            ? raw 
                            : excelDateToJSDate(raw))
                        : '';
                }
                if (rowText.includes('revision')) {
                    header.revisionNo = row.find(c => 
                        c && c.toString().trim().match(/^\d+$/)
                    ) || '0';
                }
                break;
            }

            if (row.every(c => !c || c.toString().trim() === '')) continue;
            if (rowText.includes('course outcome statement')) continue;

            const colA = row[0] ? row[0].toString().trim() : '';
            const colB = row[1] ? row[1].toString().trim() : '';
            const colC = row[2] ? row[2].toString().trim() : '';
            const colD = row[3] ? row[3].toString().trim() : '';
            const colE = row[4] ? row[4].toString().trim() : '';

            const isNewCO = colA.match(/^\d+(\.\d+)?$/) || colA.match(/^\d+\.?$/);

            if (isNewCO) {
                currentCO = {
                    number: colA,
                    statement: colB,
                    ilos: []
                };
                cos.push(currentCO);

                currentCO.ilos.push({
                    outcome: colC,
                    assessmentTool: colD,
                    performanceTarget: colE
                });
            } else if (currentCO) {
                if (colC || colD || colE) {
                    currentCO.ilos.push({
                        outcome: colC,
                        assessmentTool: colD,
                        performanceTarget: colE
                    });
                }
            }
        }

        cos.forEach(co => {
            while (co.ilos.length < 3) {
                co.ilos.push({ 
                    outcome: '', 
                    assessmentTool: '', 
                    performanceTarget: '' 
                });
            }
        });

        return { header, cos };
    };

    const pageContent = (
        <div style={{ padding: 20, background: '#FFFFFF', minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontWeight: 600 }}>Course Assessment & Evaluation Plan (COAEP)</h2>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {showTable && (
                            <button onClick={() => setPreviewOpen(true)} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '8px 18px', gap: 8, height: 40, background: '#1F2937', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <Eye size={18} /> View COAEP
                            </button>
                        )}
                        <UploadButton onClick={() => { setShowModal(true); setSelectedFile(null); }} hasUploaded={showTable} />
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16 }}>
                    <p style={{ margin: 0, color: '#dc2626', fontSize: 14, fontWeight: 500 }}>{error}</p>
                </div>
            )}

            {showTable && parsedData && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ width: 92, height: 92, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clipboard size={40} color="#9CA3AF" />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>COAEP ready for preview</div>
                    <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>Your COAEP file has been uploaded successfully. Click "View COAEP" to see the table in the document viewer.</div>
                </div>
            )}

            {!showTable && !error && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ width: 92, height: 92, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clipboard size={40} color="#9CA3AF" />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No COAEP file uploaded yet</div>
                    <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>You don't have any COAEP file uploaded. Upload a COAEP Excel file to get started.</div>
                </div>
            )}

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowModal(false)} />
                    <div
                        style={{
                            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: 767, padding: 20, background: '#FFFFFF', borderRadius: 10,
                            display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload COAEP</div>
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
                            <input id="coaep-file-input" type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files && e.target.files[0]; setSelectedFile(file || null); }} style={{ display: 'none' }} />
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                            <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setShowModal(false); }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                            <button onClick={handleFileUpload} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1F2937', borderRadius: 8, color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Upload</button>
                        </div>
                    </div>
                </div>
            )}

            {previewOpen && parsedData && (
                <PDFViewerModal
                    file={{ file_name: 'COAEP — Course Assessment & Evaluation Plan' }}
                    kind="COAEP"
                    onClose={() => setPreviewOpen(false)}
                    onExport={() => {}}
                >
                    <div style={A4_PAPER}>
                        <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px solid #1e3a5f', paddingBottom: 14 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f', letterSpacing: '0.03em' }}>COURSE ASSESSMENT & EVALUATION PLAN</div>
                            <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{parsedData.header.facultyName} &middot; {parsedData.header.course} &middot; {parsedData.header.schoolYear} ({parsedData.header.semester})</div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #CBD5E1', fontSize: 11.5 }}>
                            <thead>
                                <tr style={{ background: '#1e3a5f', color: '#FFFFFF' }}>
                                    <th style={{ padding: '10px 12px', border: '1px solid #334155', fontWeight: 600, textAlign: 'left' }}>Course Outcome Statement</th>
                                    <th style={{ padding: '10px 12px', border: '1px solid #334155', fontWeight: 600, textAlign: 'left' }}>Intended Learning Outcome</th>
                                    <th style={{ padding: '10px 12px', border: '1px solid #334155', fontWeight: 600, textAlign: 'left' }}>Assessment Tool</th>
                                    <th style={{ padding: '10px 12px', border: '1px solid #334155', fontWeight: 600, textAlign: 'left' }}>Performance Target</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.cos.map((co, coIdx) => (
                                    <React.Fragment key={coIdx}>
                                        {co.ilos.map((ilo, iloIdx) => (
                                            <tr key={`${coIdx}-${iloIdx}`} style={{ background: iloIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                                                {iloIdx === 0 ? (
                                                    <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', verticalAlign: 'top', fontWeight: 600 }} rowSpan={co.ilos.length}>
                                                        {co.number}. {co.statement}
                                                    </td>
                                                ) : null}
                                                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>{ilo.outcome}</td>
                                                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>{ilo.assessmentTool}</td>
                                                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>{ilo.performanceTarget}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
                            <span>Prepared by: {parsedData.header.preparedBy}</span>
                            <span>Approved by: {parsedData.header.approvedBy}</span>
                            <span>Date: {parsedData.header.dateSubmitted}</span>
                        </div>
                    </div>
                </PDFViewerModal>
            )}
        </div>
    );

    return (
        <SkeletonA
            header={<HeaderA role="Program Head" name="DANILA, JUNAR" />}
            nav={<SideNavigation mode="program-head" />}
            content={pageContent}
        />
    );
};

export default COAEPUpload;
