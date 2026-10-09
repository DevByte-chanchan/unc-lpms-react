import React, { useState, useEffect } from 'react';
import { offeringKey } from '../utils/offeringKey.js'
import { Inbox, Grid, AlertTriangle } from "react-feather";
import EmptyState from './EmptyState.jsx';
import Spinner from './Spinner.jsx';
import TableScrollRegion from './TableScrollRegion.jsx';
import { describeCourseLoadError } from '../utils/courseLoadError.js';

const OutcomeAlignment = ({ offeringID, revisionNum, styles, stylesB, fetchJson }) => {
    const [cpaData, setCpaData] = useState({
        course: { code: '', title: '' }, programOutcomes: [], courseOutcomes: []
    });
    const [cpaLoading, setCpaLoading] = useState(false);
    const [cpaError, setCpaError] = useState(null);

    useEffect(() => {
        if (!offeringID) return;
        let mounted = true;

        async function fetchCPA() {
            setCpaLoading(true);
            setCpaError(null);
            try {
                const data = await fetchJson(`/api/course-outcome-alignment/${offeringKey(offeringID, revisionNum)}`);

                if (!mounted) return;

                setCpaData({
                    course: data.course ?? { code: '', title: '' },
                    programOutcomes: data.programOutcomes ?? [],
                    courseOutcomes: data.courseOutcomes ?? []
                });
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setCpaError(describeCourseLoadError(err));
            } finally {
                if (mounted) setCpaLoading(false);
            }
        }

        fetchCPA();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    // The same three states every panel in this module now has: waiting,
    // failed, and legitimately empty. They were a line of grey text, a line of
    // red text, and — for empty — an alignment table with no rows in it, which
    // is the one that reads as a broken page rather than an empty one.
    if (cpaLoading) {
        return <Spinner label="Loading alignment matrix…" minHeight={280} />;
    }

    if (cpaError) {
        return (
            <EmptyState
                icon={<AlertTriangle size={22} strokeWidth={1.6} />}
                title="Could not load the alignment matrix"
                hint={cpaError}
            />
        );
    }

    const hasOutcomes = !!(cpaData?.courseOutcomes?.length || cpaData?.programOutcomes?.length);
    if (!hasOutcomes) {
        return (
            <EmptyState
                icon={<Grid size={22} strokeWidth={1.6} />}
                title="No outcome alignment recorded"
                hint="Course outcomes mapped against the programme outcomes will appear here as a matrix once the instructor has filled them in."
            />
        );
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

                <TableScrollRegion
                    label="Course and program outcome alignment"
                    minWidth={1000}
                    className={stylesB.tableScrollWrapper}
                >
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
                </TableScrollRegion>
            </div>
        </section>
    );
};

export default OutcomeAlignment;
