import styles from '../styles/SyllabusSections.module.sass'
import stylesB from '../styles/SyllabusPreview.module.sass'; // Ensure this has the new modal CSS classes
import {ChevronLeft, ChevronRight, Plus, Search, Inbox, Play, Send, MoreVertical} from 'react-feather';
import React, {useEffect, useRef, useState} from "react";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import SyllabusPreview from "./SyllabusPreview.jsx";
import Revisions from "./Revisions.jsx"; // 1. Imported the Revisions component
import {fetchJson} from "../utils/api";

import CourseDetails from "./CourseDetails";
import OutcomeAlignment from './OutcomeAlignment';
import ILOs from "./ILOs";
import CriteriaForGrading from "./CriteriaForGrading";
import CourseCoverage from "./CourseCoverage";
import ReferenceSummary from "./ReferenceSummary";


const SyllabusSections = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Course Details';

    // Extracted directly from route: /courses/:pcId/:revNum/:status
    const { status, revNum: revisionNum, pcId: offeringID } = useParams();

    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isRevisionsOpen, setIsRevisionsOpen] = useState(false); // 2. Added state hook to track modal visibility

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [selectedSection]);

    const handleSectionChange = (e) => {
        setSearchParams({ section: e.target.value });
    };

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const toggleMenu = (event) => {
        event.stopPropagation();
        setIsOpen(prev => !prev);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={styles.container}>
            <div className={styles.navi}>
                <Link  to={`/`} className={'actionLink'} >
                    <div className={styles.return}>
                        <ChevronLeft size={22}/>
                    </div>
                </Link>

                <div className={styles['section-select']}>
                    <select value={selectedSection} onChange={handleSectionChange}>
                        <option value="Course Details">Course Details</option>
                        <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                        {(status === 'approved' || status === 'pending') &&
                            <>
                                <option value="Course Coverage">Course Coverage</option>
                                <option value="References Summary">References</option>
                            </>
                        }
                        {(status === 'draft' || status === 'returned') &&
                            <option value="Intended Learning Outcomes">Intended Learning Outcomes</option>
                        }
                        <option value="Criteria for Grading">Criteria for Grading</option>
                    </select>
                </div>

                {(status === 'draft' || status === 'returned') &&
                    <>
                        <div onClick={() => setIsPreviewOpen(true)} className={styles.draft}>
                            <Play size={14} />
                            Preview
                        </div>

                        <div  className={styles.submit}>
                            <Send size={14}/>
                            Submit
                        </div></>
                }

                {
                    status === 'approved' &&
                    <>
                        <div className={styles.divider}>
                            <div className={styles.line}></div>
                        </div>

                        <div onClick={toggleMenu} ref={dropdownRef} className={`${styles.more} ${isOpen ? styles.active : ''}`}>
                            <div className={styles.moreIcon} >
                                <MoreVertical strokeWidth={2} size={16} />
                            </div>

                            <div className={styles.dropdownMenu}>
                                {/* 3. Updated click handler to open the modal and stop parent menu bubbling */}

                                {
                                    status === 'approved' &&
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsRevisionsOpen(true); setIsOpen(false); }}>
                                        Revisions
                                    </button>
                                }

                            </div>
                        </div>
                    </>
                }




            </div>

            <div className={styles['dynamic-sections']}>
                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                    </div>
                ) : (
                    <>
                        {selectedSection === 'Course Details' &&
                            <CourseDetails
                                offeringID={offeringID}
                                revisionNum={revisionNum}
                                stylesB={stylesB}
                                fetchJson={fetchJson}
                            />
                        }

                        {selectedSection === 'Course and Program Outcome Alignment' &&
                            <OutcomeAlignment
                                offeringID={offeringID}
                                revisionNum={revisionNum}
                                styles={styles}
                                stylesB={stylesB}
                                fetchJson={fetchJson}
                            />
                        }

                        {selectedSection === 'Intended Learning Outcomes' && (
                            <ILOs
                                offeringID={offeringID}
                                revisionNum={revisionNum}
                                status={status}
                                styles={styles}
                                fetchJson={fetchJson}
                            />
                        )}

                        {selectedSection === 'Criteria for Grading' && (
                            <CriteriaForGrading
                                offeringID={offeringID}
                                revisionNum={revisionNum}
                                status={status}
                                styles={styles}
                                stylesB={stylesB}
                                fetchJson={fetchJson}
                            />
                        )}

                        {selectedSection === 'Course Coverage' && (
                            <CourseCoverage
                                offeringID={offeringID}
                                revisionNum={revisionNum}
                                status={status}
                                selectedSection={selectedSection}
                                styles={styles}
                                stylesB={stylesB}
                                fetchJson={fetchJson}
                            />
                        )}

                        {selectedSection === 'References Summary' && (
                            <ReferenceSummary
                                offeringID={offeringID}
                                revisionNum={revisionNum}
                                status={status}
                                selectedSection={selectedSection}
                                styles={styles}
                                stylesB={stylesB}
                                fetchJson={fetchJson}
                            />
                        )}

                        <SyllabusPreview
                            isOpen={isPreviewOpen}
                            onClose={() => setIsPreviewOpen(false)}
                        />

                        {/* 4. Rendered the dynamic Revisions overlay portal here */}
                        <Revisions
                            isOpen={isRevisionsOpen}
                            onClose={() => setIsRevisionsOpen(false)}
                            courseId={revisionNum} // Pass the variable from useParams here
                            offeringID={offeringID}
                        />
                    </>
                )}
            </div>
        </div>
    )
}

export default SyllabusSections;