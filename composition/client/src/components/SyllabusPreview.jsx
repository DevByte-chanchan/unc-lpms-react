import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { fetchJson } from "../utils/api";
import styles from '../styles/SyllabusPreview.module.sass';
import stylesB from "../styles/SyllabusPreview.module.sass";

// Import all shared section components
import CourseDetails from "./CourseDetails";
import OutcomeAlignment from './OutcomeAlignment';
import CourseCoverage from "./CourseCoverage";
import ReferenceSummary from "./ReferenceSummary";
import CriteriaForGrading from "./CriteriaForGrading";

const SyllabusPreview = ({ isOpen, onClose, pcId: propPcId, revNum: propRevNum, code: propCode }) => {
    // 1. Guard clause for modal visibility
    if (!isOpen) return null;

    // 2. Extract identifiers from both props and URL params to maximize flexibility
    const { status, revNum: paramRevNum, pcId: paramPcId } = useParams();

    const currentPcId = propPcId || paramPcId;
    const currentRevNum = propRevNum || paramRevNum;

    // Local section selection control state for a clean preview user experience
    const [selectedSection, setSelectedSection] = useState('Course Details');

    const handleSectionChange = (e) => {
        setSelectedSection(e.target.value);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>

                {/* Close Button */}
                <button className={styles.closeButton} onClick={onClose}>×</button>

                <h2 className={styles.previewTitle}>Syllabus Preview</h2>

                {/* Dropdown Navigation Menu */}
                <div className={styles.navi} style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    <div className={styles['section-select']}>
                        <select value={selectedSection} onChange={handleSectionChange}>
                            <option value="Course Details">Course Details</option>
                            <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                            <option value="Course Coverage">Course Coverage</option>
                            <option value="References">References</option>
                            <option value="Criteria for Grading">Criteria for Grading</option>
                        </select>
                    </div>
                </div>

                {/* Dynamic Display Rendering Panel */}
                <div className={styles['dynamic-sections']} style={{ overflowY: 'auto', maxHeight: '60vh' }}>

                    {/* ---------------- COURSE DETAILS ---------------- */}
                    {selectedSection === 'Course Details' && (
                        <CourseDetails
                            offeringID={currentPcId}
                            revisionNum={currentRevNum}
                            stylesB={stylesB}
                            fetchJson={fetchJson}
                        />
                    )}

                    {/* ---------------- CO PO ALIGNMENT ---------------- */}
                    {selectedSection === 'Course and Program Outcome Alignment' && (
                        <OutcomeAlignment
                            offeringID={currentPcId}
                            revisionNum={currentRevNum}
                            styles={styles}
                            stylesB={stylesB}
                            fetchJson={fetchJson}
                        />
                    )}

                    {/* ---------------- COURSE COVERAGE ---------------- */}
                    {selectedSection === 'Course Coverage' && (
                        <CourseCoverage
                            offeringID={currentPcId}
                            revisionNum={currentRevNum}
                            status={status}
                            selectedSection={selectedSection}
                            styles={styles}
                            stylesB={stylesB}
                            fetchJson={fetchJson}
                        />
                    )}

                    {/* ---------------- REFERENCES SUMMARY ---------------- */}
                    {selectedSection === 'References' && (
                        <ReferenceSummary
                            offeringID={currentPcId}
                            revisionNum={currentRevNum}
                            status={status}
                            selectedSection="References Summary"
                            styles={styles}
                            stylesB={stylesB}
                            fetchJson={fetchJson}
                        />
                    )}

                    {/* ---------------- CRITERIA FOR GRADING ---------------- */}
                    {selectedSection === 'Criteria for Grading' && (
                        <CriteriaForGrading
                            offeringID={currentPcId}
                            revisionNum={currentRevNum}
                            status={status}
                            styles={styles}
                            stylesB={stylesB}
                            fetchJson={fetchJson}
                        />
                    )}

                </div>
            </div>
        </div>
    );
};

export default SyllabusPreview;