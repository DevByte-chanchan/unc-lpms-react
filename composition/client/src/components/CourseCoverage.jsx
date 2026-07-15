import React, { useState, useEffect } from 'react';

const TlaGroup = ({ title, tlas, stylesB }) => {
    if (!tlas || tlas.length === 0) return null;
    return (
        <div className={stylesB.tlaGroupBlock}>
            <div className={stylesB.tlaPhaseHeader}>{title}</div>
            {tlas.map(tla => (
                <div key={tla.id} className={stylesB.tlaItem}>
                    <div className={stylesB.tlaNameLine}>
                        <span className={stylesB.perfTag}>
                            {tla.performedBy === 'Instructor' ? '[I]' : '[S]'}
                        </span>
                        <span className={stylesB.boldText}> {tla.tlaName}</span>
                        {tla.laboratory && <span className={stylesB.labTag}> (Lab)</span>}
                    </div>
                    <div className={stylesB.descText}>{tla.tlaDescription}</div>
                </div>
            ))}
        </div>
    );
};

const CourseCoverage = ({ offeringID, revisionNum, status, selectedSection, styles, stylesB, fetchJson }) => {
    const [coverageData, setCoverageData] = useState({ ilos: [], topics: [], assessments: [] });
    const [isMatrixLoading, setIsMatrixLoading] = useState(true);
    const [coverageCommentCounts, setCoverageCommentCounts] = useState({});

    // 1. Fetch live coverage database records
    useEffect(() => {
        if (!offeringID || !revisionNum || selectedSection !== 'Course Coverage') return;
        let mounted = true;

        async function fetchLiveCoverageMatrix() {
            try {
                setIsMatrixLoading(true);
                const data = await fetchJson(`/api/course-coverage/${offeringID}/${revisionNum}`);
                if (!mounted) return;
                setCoverageData(data);
            } catch (err) {
                console.error("Error communicating with dynamic course coverage components:", err);
            } finally {
                if (mounted) setIsMatrixLoading(false);
            }
        }

        fetchLiveCoverageMatrix();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, selectedSection, fetchJson]);

    // 2. Fetch related workflow resolution badges
    useEffect(() => {
        if (status !== 'returned' || selectedSection !== 'Course Coverage' || !coverageData.ilos || coverageData.ilos.length === 0) return;
        let mounted = true;

        async function gatherCoverageCommentCounts() {
            const localCountsMap = {};
            const commentSubGroups = ['references', 'topics', 'tlas'];

            try {
                const fetchPromises = [];

                coverageData.ilos.forEach(ilo => {
                    // Normalize standard relational reference keys
                    const targetIloId = ilo.db_id || ilo.ilo_id || ilo.id;

                    commentSubGroups.forEach(type => {
                        const promise = fetchJson(`/api/comments/filter/${targetIloId}/${type}`)
                            .then(comments => {
                                if (!mounted) return;

                                const unresolvedCount = comments.filter(c => {
                                    return c.resolved_status === false || c.resolved_status === 0 || String(c.resolved_status).toLowerCase() === 'false';
                                }).length;

                                if (unresolvedCount > 0) {
                                    localCountsMap[`${targetIloId}_${type}`] = unresolvedCount;
                                }
                            })
                            .catch(err => console.error(`Coverage comment mismatch on ILO ${targetIloId}:`, err));

                        fetchPromises.push(promise);
                    });
                });

                await Promise.all(fetchPromises);
                if (mounted) setCoverageCommentCounts(localCountsMap);
            } catch (error) {
                console.error("Error parsing layout badge parameters:", error);
            }
        }

        gatherCoverageCommentCounts();
        return () => { mounted = false; };
    }, [coverageData.ilos, status, selectedSection, fetchJson]);

    if (isMatrixLoading) {
        return (
            <div className={stylesB.ccContainer}>
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>
                    Loading Course Coverage Data Matrix...
                </div>
            </div>
        );
    }

    const ilos = coverageData.ilos || [];
    const allTopics = coverageData.topics || [];
    const allAssessments = coverageData.assessments || [];

    const colWidths = {
        co: '60px',
        ilo: '220px',
        topic: '250px',
        period: '100px',
        tla: '350px',
        assess: '220px',
        ref: '100px'
    };

    const getILOTopics = (ilo) => {
        return ilo.topics.map(topicTitle =>
            allTopics.find(t => t.title === topicTitle)
        ).filter(Boolean);
    };

    const getTLAsByPhase = (topics, phase) => {
        let tlas = [];
        topics.forEach(topic => {
            if (topic.tlas) {
                const filtered = topic.tlas.filter(t => t.classPhase && t.classPhase.toLowerCase() === phase.toLowerCase());
                tlas = [...tlas, ...filtered];
            }
        });
        return tlas;
    };

    const getAssessmentsForTLAs = (tlas) => {
        return tlas.flatMap(tla =>
            allAssessments.filter(a => a.tlaId === tla.tlaId)
        );
    };

    const getRefId = (refString) => refString.split(' - ')[0];

    return (
        <div className={stylesB.ccContainer}>
            <div className={stylesB.ccScrollWrapper}>
                <table className={stylesB.ccTable}>
                    <thead>
                    <tr>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.co }}>CO</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.ilo }}>ILO</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.topic }}>TOPIC</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.period }}>PERIOD</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.tla }}>TEACHING & LEARNING ACTIVITIES (TLAs)</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.assess }}>ASSESSMENT</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.ref }}>RESOURCES</th>
                    </tr>
                    </thead>
                    <tbody>
                    {(() => {
                        let lastCoPrefix = null;
                        let iloDisplaySequence = 0;
                        let coItemIndex = 0; // Tracks the element's position within its current CO group

                        return ilos.length > 0 ? ilos.map((ilo, index) => {
                            const rowTopics = getILOTopics(ilo);

                            const preTLAs = getTLAsByPhase(rowTopics, 'Pre-class');
                            const inTLAs = getTLAsByPhase(rowTopics, 'In-class');
                            const postTLAs = getTLAsByPhase(rowTopics, 'Post-class');

                            const allRowTLAs = [...preTLAs, ...inTLAs, ...postTLAs];
                            const rawAssessments = getAssessmentsForTLAs(allRowTLAs);

                            const uniqueAssessments = [];
                            const seenAssessKeys = new Set();

                            rawAssessments.forEach(assess => {
                                const key = `${assess.id}-${assess.assessmentName}`.toLowerCase();
                                if (!seenAssessKeys.has(key)) {
                                    seenAssessKeys.add(key);
                                    uniqueAssessments.push(assess);
                                }
                            });

                            const currentCoPrefix = ilo.id.split('-')[0];

                            // 1. Reset or increment the inner position index when crossing CO boundaries
                            if (currentCoPrefix !== lastCoPrefix) {
                                lastCoPrefix = currentCoPrefix;
                                coItemIndex = 0;
                            } else {
                                coItemIndex++;
                            }

                            // 2. Count the total number of ILOs assigned to this specific CO prefix
                            const totalIlosInCo = ilos.filter(item => item.id.startsWith(currentCoPrefix + '-')).length;

                            // 3. Condition: If there are exactly 4 rows in this CO, automatically flag the 1st one (index 0)
                            const isCourseOrientation = (totalIlosInCo === 4 && coItemIndex === 0);

                            // 4. Handle sequential numbering shifts based on the flag
                            if (coItemIndex === 0) {
                                iloDisplaySequence = isCourseOrientation ? 0 : 1;
                            } else {
                                if (!isCourseOrientation) {
                                    iloDisplaySequence++;
                                }
                            }

                            // 5. Build dynamic cleanILOId or leave blank if it matches Course Orientation
                            const cleanILOId = isCourseOrientation ? "" : `ILO${iloDisplaySequence}`;

                            const isFirstOfCO = index === ilos.findIndex(item => item.id.startsWith(currentCoPrefix + '-'));
                            const coRowCount = totalIlosInCo;

                            // Target identifier calculations for badge logic
                            const targetIloId = ilo.db_id || ilo.ilo_id || ilo.id;
                            const refCount = coverageCommentCounts[`${targetIloId}_references`] || 0;
                            const topicCount = coverageCommentCounts[`${targetIloId}_topics`] || 0;
                            const tlaCount = coverageCommentCounts[`${targetIloId}_tlas`] || 0;
                            const totalRowUnresolved = refCount + topicCount + tlaCount;

                            return (
                                <tr key={ilo.id}>
                                {/* CO COLUMN */}
                                {isFirstOfCO && (
                                    <td
                                        rowSpan={coRowCount}
                                        className={`${stylesB.ccCell} ${stylesB.centerText} ${stylesB.boldText}`}
                                        style={{ width: colWidths.co }}
                                    >
                                        {currentCoPrefix}
                                    </td>
                                )}

                                {/* ILO COLUMN */}
                                <td className={stylesB.ccCell} style={{ width: colWidths.ilo }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span className={stylesB.boldText}>{cleanILOId}</span>
                                        {status === 'returned' && totalRowUnresolved > 0 && (
                                            <span className={styles['comment-badge']}>
                                                {totalRowUnresolved}
                                            </span>
                                        )}
                                    </div>
                                    {ilo.intendedLearningOutcome}
                                </td>

                                {/* TOPIC COLUMN */}
                                <td className={stylesB.ccCell} style={{ width: colWidths.topic }}>
                                    {rowTopics.map(t => (
                                        <div key={t.id} className={stylesB.topicBlock}>
                                            <div className={stylesB.topicTitle}>{t.title}</div>
                                            <ul className={stylesB.subtopicList}>
                                                {t.subtopics && t.subtopics.map(sub => (
                                                    <li key={sub.id}>{sub.value}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </td>

                                {/* PERIOD COLUMN */}
                                <td className={`${stylesB.ccCell} ${stylesB.centerText}`} style={{ width: colWidths.period }}>
                                    <div className={stylesB.boldText}>{ilo.deliveryWeek}</div>
                                    <div>{ilo.allocatedTime}</div>
                                </td>

                                {/* MERGED TLA COLUMN */}
                                <td className={stylesB.ccCell} style={{ width: colWidths.tla }}>
                                    <TlaGroup title="PRE-CLASS" tlas={preTLAs} stylesB={stylesB} />
                                    <TlaGroup title="IN-CLASS" tlas={inTLAs} stylesB={stylesB} />
                                    <TlaGroup title="POST-CLASS" tlas={postTLAs} stylesB={stylesB} />

                                    {allRowTLAs.length === 0 && <span className={stylesB.descText}>No activities listed.</span>}
                                </td>

                                {/* ASSESSMENT COLUMN */}
                                <td className={stylesB.ccCell} style={{ width: colWidths.assess }}>
                                    {uniqueAssessments.map((assess, i) => (
                                        <div key={i} className={stylesB.assessItem}>
                                            <div className={stylesB.boldText}>{assess.assessmentMethod}</div>
                                            {assess.description && (
                                                <div className={stylesB.descText}>{assess.description}</div>
                                            )}
                                        </div>
                                    ))}
                                    {uniqueAssessments.length === 0 && <span className={stylesB.descText}>No assessments listed.</span>}
                                </td>

                                {/* RESOURCES COLUMN */}
                                <td className={`${stylesB.ccCell} ${stylesB.centerText}`} style={{ width: colWidths.ref }}>
                                    {ilo.references.map((ref, i) => (
                                        <div key={i}>{getRefId(ref)}</div>
                                    ))}
                                </td>
                            </tr>
                            );
                        }) : (
                            <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>No coverage data available.</td></tr>
                        );
                    })()} {/* <-- Add this closing signature right before </tbody> */}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CourseCoverage;