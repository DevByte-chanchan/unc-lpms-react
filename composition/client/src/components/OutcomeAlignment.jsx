import React, { useState, useEffect } from 'react';
import {Inbox} from "react-feather";

const OutcomeAlignment = ({ offeringID, revisionNum, styles, stylesB, fetchJson }) => {
    const [cpaData, setCpaData] = useState({
        course: { code: '', title: '' }, programOutcomes: [], courseOutcomes: []
    });
    const [cpaLoading, setCpaLoading] = useState(false);
    const [cpaError, setCpaError] = useState(null);

    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchCPA() {
            setCpaLoading(true);
            setCpaError(null);
            try {
                const data = await fetchJson(`/api/course-outcome-alignment/${offeringID}/${revisionNum}`);

                if (!mounted) return;

                setCpaData({
                    course: data.course ?? { code: '', title: '' },
                    programOutcomes: data.programOutcomes ?? [],
                    courseOutcomes: data.courseOutcomes ?? []
                });
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setCpaError(err.message);
            } finally {
                if (mounted) setCpaLoading(false);
            }
        }

        fetchCPA();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    if (cpaLoading) {
        return <div className={stylesB.loadingContainer}>Loading alignment matrix...</div>;
    }

    if (cpaError) {
        return <div className={stylesB.errorContainer}>Error: {cpaError}</div>;
    }

    return (
        <section>
            <div className={stylesB['cpa-container']}>
                <div className={stylesB.legend}>
                    <span className={stylesB.legendTitle}>Legend:</span>
                    <div className={stylesB.legendItems}>
                        <span><strong>I</strong> – Introductory</span>
                        <span><strong>E</strong> – Enabling</span>
                        <span><strong>D</strong> – Demonstrative</span>
                    </div>
                </div>

                <div style={{ border: "none" }} className={stylesB.tableScrollWrapper}>
                    <table className={stylesB.alignmentTable}>
                        <thead>
                        <tr>
                            <th className={stylesB.firstColHeader}>
                                After completion of the course, the student should be able to:
                            </th>

                            {/* Render dynamic PO headers from cpaData.programOutcomes */}
                            {cpaData.programOutcomes && cpaData.programOutcomes.length > 0
                                ? cpaData.programOutcomes.map(po => (
                                    <th key={po.key} className={stylesB.poHeader}>{po.key}</th>
                                ))
                                : // fallback to PO1..PO9 if none returned
                                ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9'].map(po => (
                                    <th key={po} className={stylesB.poHeader}>{po}</th>
                                ))
                            }
                        </tr>
                        </thead>

                        <tbody>
                        {cpaData.courseOutcomes && cpaData.courseOutcomes.length > 0 ? (
                            cpaData.courseOutcomes.map(co => (
                                <tr key={co.id}>
                                    <td className={stylesB.descCell}>
                                        {co.description}
                                    </td>

                                    {/* Render mapping cells; ensure we render as many columns as programOutcomes length */}
                                    {(cpaData.programOutcomes.length > 0 ? cpaData.programOutcomes : Array(9).fill(null)).map((po, idx) => (
                                        <td key={idx} className={stylesB.mappingCell}>
                                            {co.poMappings && co.poMappings[idx] ? co.poMappings[idx] : ''}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr className={styles.emptyRow}>
                                <td colSpan={(cpaData.programOutcomes.length || 9) + 1}>
                                    <div className={styles.emptyStateContainer}>
                                        <Inbox size={40} strokeWidth={1} />
                                        <span>No course outcomes / alignments found for this course.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

export default OutcomeAlignment;