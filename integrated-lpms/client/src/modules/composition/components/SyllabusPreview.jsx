import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { X } from "react-feather";
import Select from "./Select.jsx";
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
    const { status, revNum: paramRevNum, pcId: paramPcId } = useParams();
    const [selectedSection, setSelectedSection] = useState('Course Details');

    if (!isOpen) return null;

    const currentPcId = propPcId || paramPcId;
    const currentRevNum = propRevNum || paramRevNum;

    const handleSectionChange = (e) => {
        setSelectedSection(e.target.value);
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.previewHeader}>
                    <h2 className={styles.previewTitle}>Syllabus Preview</h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close syllabus preview"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Dropdown Navigation Menu */}
                <div className={styles.navi}>
                    <div className={styles['section-select']}>
                        <Select
                            value={selectedSection}
                            onChange={handleSectionChange}
                            aria-label="Syllabus preview section"
                            size="lg"
                            block
                        >
                            <option value="Course Details">Course Details</option>
                            <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                            <option value="Course Coverage">Course Coverage</option>
                            <option value="References">References</option>
                            <option value="Criteria for Grading">Criteria for Grading</option>
                        </Select>
                    </div>
                </div>

                {/* Dynamic Display Rendering Panel */}
                <div className={styles['dynamic-sections']}>

                    {/* ---------------- COURSE DETAILS ---------------- */}
                    {selectedSection === 'Course Details' && (
                        <CourseDetails isReadOnly={true} offeringID={currentPcId}
                            revisionNum={currentRevNum}
                            stylesB={stylesB}
                            fetchJson={fetchJson}
                        />
                    )}

                    {/* ---------------- CO PO ALIGNMENT ---------------- */}
                    {selectedSection === 'Course and Program Outcome Alignment' && (
                        <OutcomeAlignment isReadOnly={true} offeringID={currentPcId}
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
                        <CriteriaForGrading isReadOnly={true} offeringID={currentPcId}
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