import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Inbox, Search, Edit2 } from "react-feather";
import { offeringKey, revisionOf } from '../utils/offeringKey.js'

const ILOs = ({ offeringID, revisionNum, status, styles, fetchJson }) => {
    const [iloData, setIloData] = useState({ course: null, courseOutcomes: [], ilos: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [commentCounts, setCommentCounts] = useState({});

    const [_layoutMode] = useState('grid'); // Fixed to grid view
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch main ILO Data layer
    useEffect(() => {
        if (!offeringID) return;
        let mounted = true;

        async function fetchILOs() {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchJson(`/api/ilos/${offeringKey(offeringID, revisionNum)}`);

                if (!mounted) return;
                const processedILOs = [];
                const processedCourseOutcomes = [];
                let coDisplayCounter = 1;

                // Process COs and ILOs directly during fetch to assign sequences predictably for searching
                for (const co of data.courseOutcomes) {
                    const sortedIlos = [...(co.ilos || [])].sort((a, b) => a.id - b.id);
                    let iloDisplaySequence = 1;
                    const cleanCoDescription = (co.description || '').replace(/^CO\s*\d+\s*:\s*/i, '').trim();

                    sortedIlos.forEach((ilo) => {
                        const isOrientation = Boolean(ilo.isOrientation);
                        const iloNumber = isOrientation ? 0 : iloDisplaySequence;
                        const label = isOrientation ? "Course Orientation" : `CO ${coDisplayCounter} - ILO ${iloNumber}`;

                        processedILOs.push({
                            ...ilo,
                            co_id: co.co_id,
                            coNumber: coDisplayCounter,
                            coDescription: cleanCoDescription,
                            iloNumber: iloNumber,
                            isOrientation: isOrientation,
                            entryLabel: label,
                            hours: isOrientation ? (ilo.hours || 2) : (ilo.hours || 0),
                            formattedWeekStr: isOrientation ? (ilo.formattedWeekStr || 'Week 1') : (ilo.formattedWeekStr || '')
                        });

                        if (!isOrientation) iloDisplaySequence++;
                    });

                    processedCourseOutcomes.push({
                        ...co,
                        coNumber: coDisplayCounter,
                        description: cleanCoDescription,
                        hours: co.hours ?? 0,
                        formattedWeekStr: co.formattedWeekStr || ''
                    });

                    coDisplayCounter++;
                }

                setIloData({ course: data.course, courseOutcomes: processedCourseOutcomes, ilos: processedILOs });
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchILOs();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    // 2. Dynamic Badge Counter: Fetches unresolved comment counts per week
    useEffect(() => {
        if (status === 'approved' || !iloData.courseOutcomes || iloData.courseOutcomes.length === 0) return;
        let mounted = true;

        async function gatherAllCommentCounts() {
            const targetTypes = ['references', 'topics', 'tlas'];
            const localCountsMap = {};

            try {
                const fetchPromises = [];
                const allWeeks = iloData.courseOutcomes.flatMap(co => co.weeks || []);

                allWeeks.forEach(w => {
                    targetTypes.forEach(type => {
                        const promise = fetchJson(`/api/comments/filter/${w.week_id}/${type}`)
                            .then(comments => {
                                if (!mounted || !Array.isArray(comments)) return;
                                const unresolvedCount = comments.filter(c => !c.resolved_status).length;
                                if (unresolvedCount > 0) {
                                    localCountsMap[`${w.week_id}_${type}`] = unresolvedCount;
                                }
                            })
                            .catch(err => console.error(`Failed to fetch comments for Week ${w.week_id} type ${type}:`, err));

                        fetchPromises.push(promise);
                    });
                });

                await Promise.all(fetchPromises);

                if (mounted) {
                    setCommentCounts(localCountsMap);
                }
            } catch (error) {
                console.error("Error batching comment layout parameters:", error);
            }
        }

        gatherAllCommentCounts();
        return () => { mounted = false; };
    }, [iloData.courseOutcomes, status, fetchJson]);

    const getBadgeCount = (weekId, type) => {
        return commentCounts[`${weekId}_${type}`] || 0;
    };

    // Aggregates all topics, references, and tlas badges for a week
    const getTotalBadgeCount = (weekId) => {
        return getBadgeCount(weekId, 'references') + getBadgeCount(weekId, 'topics') + getBadgeCount(weekId, 'tlas');
    };

    if (loading) {
        return <div className={styles.loadingContainer}>Loading ILOs...</div>;
    }

    if (error) {
        return <div className={styles.errorContainer}>Error: {error}</div>;
    }

    // Client-side Frontend filtering mechanics
    // The offering rides along on links, so the forms can load and scope to this plan.
    const offeringQuery = `pcId=${offeringID}${revisionOf(revisionNum) ? `&rev=${revisionOf(revisionNum)}` : ''}`;
    const IED_NAME = { I: 'Introductory', E: 'Enabling', D: 'Demonstrative' };

    const lowerSearch = searchTerm.toLowerCase();
    const filteredIlos = iloData.ilos.filter(ilo => {
        if (!searchTerm) return true;
        const matchLabel = ilo.entryLabel.toLowerCase().includes(lowerSearch);
        const matchDesc = (ilo.description || '').toLowerCase().includes(lowerSearch);
        const matchCoDesc = (ilo.coDescription || '').toLowerCase().includes(lowerSearch);
        return matchLabel || matchDesc || matchCoDesc;
    });

    return (
        <section style={{ display: 'flex', flexDirection: 'column' }}>

            <div className={styles.iloHeader}>
                <div className={styles.iloSearchContainer}>
                    <Search color="#A4A9AF" size={18} />
                    <input
                        type="text"
                        placeholder="Search ILO number, CO number, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles['ilo-container']}>
                {/* List View Mode (Commented out as view mode is fixed to Grid)
                {layoutMode === 'list' ? (
                    <table style={{ minWidth: '100%', width: '100%' }}>
                        <tbody>
                        {filteredIlos.length > 0 ? (
                            filteredIlos.map((ilo, index, array) => {
                                let examsToRender = [];
                                const nextIlo = array[index + 1];

                                if (ilo.coNumber === 1 && (!nextIlo || nextIlo.coNumber === 2) && !searchTerm) {
                                    examsToRender.push(
                                        <tr key='prelim-row' style={{ flexWrap: 'nowrap', backgroundColor: '#f9fafb' }}>
                                            <td width={150} style={{ fontWeight: 600, color: '#111827', flexShrink: 0, paddingLeft: '15px', borderLeft: '4px solid #6366f1' }}>
                                                Prelim
                                            </td>
                                            <td style={{ flex: 1, paddingRight: '20px', minWidth: '200px' }}></td>
                                            <td width={190} style={{ color: '#4b5563', fontSize: '13px', flexShrink: 0, fontWeight: 500 }}>
                                            </td>
                                            <td style={{ width: 'auto', minWidth: '160px', flexShrink: 0, paddingRight: '15px' }}></td>
                                        </tr>
                                    );
                                }
                                if (ilo.coNumber === 2 && (!nextIlo || nextIlo.coNumber === 3) && !searchTerm) {
                                    examsToRender.push(
                                        <tr key='midterm-row' style={{ flexWrap: 'nowrap', backgroundColor: '#f9fafb' }}>
                                            <td width={150} style={{ fontWeight: 600, color: '#111827', flexShrink: 0, paddingLeft: '15px', borderLeft: '4px solid #6366f1' }}>
                                                Midterm
                                            </td>
                                            <td style={{ flex: 1, paddingRight: '20px', minWidth: '200px' }}></td>
                                            <td width={190} style={{ color: '#4b5563', fontSize: '13px', flexShrink: 0, fontWeight: 500 }}>
                                                Week 9 • 5 Hr
                                            </td>
                                            <td style={{ width: 'auto', minWidth: '160px', flexShrink: 0, paddingRight: '15px' }}></td>
                                        </tr>
                                    );
                                }
                                if (ilo.coNumber === 3 && (!nextIlo || nextIlo.coNumber === 4) && !searchTerm) {
                                    examsToRender.push(
                                        <tr key='semifinal-row' style={{ flexWrap: 'nowrap', backgroundColor: '#f9fafb' }}>
                                            <td width={150} style={{ fontWeight: 600, color: '#111827', flexShrink: 0, paddingLeft: '15px', borderLeft: '4px solid #6366f1' }}>
                                                Semifinal
                                            </td>
                                            <td style={{ flex: 1, paddingRight: '20px', minWidth: '200px' }}></td>
                                            <td width={190} style={{ color: '#4b5563', fontSize: '13px', flexShrink: 0, fontWeight: 500 }}>
                                            </td>
                                            <td style={{ width: 'auto', minWidth: '160px', flexShrink: 0, paddingRight: '15px' }}></td>
                                        </tr>
                                    );
                                }
                                if (ilo.coNumber === 4 && (!nextIlo || nextIlo.coNumber > 4) && !searchTerm) {
                                    examsToRender.push(
                                        <tr key='finals-row' style={{ flexWrap: 'nowrap', backgroundColor: '#f9fafb' }}>
                                            <td width={150} style={{ fontWeight: 600, color: '#111827', flexShrink: 0, paddingLeft: '15px', borderLeft: '4px solid #6366f1' }}>
                                                Final
                                            </td>
                                            <td style={{ flex: 1, paddingRight: '20px', minWidth: '200px' }}></td>
                                            <td width={190} style={{ color: '#4b5563', fontSize: '13px', flexShrink: 0, fontWeight: 500 }}>
                                                Week 18 • 5 Hr
                                            </td>
                                            <td style={{ width: 'auto', minWidth: '160px', flexShrink: 0, paddingRight: '15px' }}></td>
                                        </tr>
                                    );
                                }
                                return (
                                    <React.Fragment key={'frag-'+ilo.id}>
                                    <tr key={ilo.id} style={{ flexWrap: 'nowrap' }}>
                                        <td width={150} style={{ fontWeight: 600, color: '#111827', flexShrink: 0 }}>
                                            {ilo.entryLabel}
                                        </td>
                                        <td style={{ 
                                            flex: 1, 
                                            lineHeight: '1.5', 
                                            whiteSpace: 'normal', 
                                            wordBreak: 'break-word', 
                                            paddingRight: '20px', 
                                            minWidth: '200px' 
                                        }}>
                                            {ilo.description}
                                        </td>
                                        <td width={190} style={{ color: '#4b5563', fontSize: '13px', flexShrink: 0 }}>
                                            {ilo.formattedWeekStr} &bull; {ilo.hours} Hr
                                        </td>
                                        <td className={styles.fill} style={{ width: 'auto', minWidth: '160px', flexShrink: 0, paddingRight: '15px' }}>
                                            <Link className={styles.mapContentsBtn} to={`/topics/form/${ilo.id}/${status}`}>
                                                Map Contents
                                                {totalBadges > 0 && (
                                                    <span className={styles['comment-badge']}>{totalBadges}</span>
                                                )}
                                                <ChevronRight size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                    {examsToRender}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <tr className={styles.emptyRow}>
                                <td colSpan={3}>
                                    <div className={styles.emptyStateContainer} style={{ padding: '40px' }}>
                                        <Inbox size={40} strokeWidth={1} />
                                        <span>No matching results found.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                ) : (
                */}
                <div className={styles.gridContainer}>
                    {(() => {
                        if (filteredIlos.length === 0) {
                            return (
                                <div className={styles.emptyStateContainer} style={{ padding: '40px' }}>
                                    <Inbox size={40} strokeWidth={1} />
                                    <span>No matching results found.</span>
                                </div>
                            );
                        }

                        // 1. Process COs and extract Course Orientation via mapped sequence cache
                        const courseOrientation = filteredIlos.find(i => i.isOrientation);
                        const coListForGrid = [];

                        iloData.courseOutcomes.forEach((co) => {
                            // Extract standard ILOs mapping to this CO that are currently rendered by search mask
                            const currentIlos = filteredIlos.filter(i => i.co_id === co.co_id && !i.isOrientation);

                            // Only render the CO Container Rectangles if it survives the search check
                            if (currentIlos.length > 0) {
                                coListForGrid.push({
                                    ...co,
                                    coNumber: co.coNumber || currentIlos[0].coNumber,
                                    gridIlos: currentIlos
                                });
                            }
                        });

                        return (
                            <>
                                {/* Render Course Orientation Block */}
                                {courseOrientation && (() => {
                                    const orientationWeekId = iloData.courseOutcomes[0]?.weeks?.[0]?.week_id || courseOrientation.id;
                                    const totalBadges = getTotalBadgeCount(courseOrientation.id);
                                    return (
                                        <div className={`${styles.coBlock} ${styles.courseOrientationBox}`}>
                                            <div className={styles.iloGridBox_Header}>
                                                <span className={styles.iloGridBox_Title}>Course Orientation</span>
                                                <span className={styles.iloGridBox_Meta}>
                                                    {courseOrientation.formattedWeekStr} &bull; {courseOrientation.hours} Hrs
                                                </span>
                                            </div>
                                            <div className={styles.iloGridBox_Desc}>
                                                {courseOrientation.description}
                                            </div>
                                            <div className={styles.iloGridBox_Footer}>
                                                <Link className={styles.mapContentsBtn} to={`/topics/form/${orientationWeekId}/${status}?orientation=true&${offeringQuery}`}>
                                                    Map Weekly Content
                                                    {totalBadges > 0 && (
                                                        <span className={styles['comment-badge']}>{totalBadges}</span>
                                                    )}
                                                    <ChevronRight size={16} />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Render the surviving CO Blocks */}
                                {coListForGrid.map((co, coIndex, array) => {
                                    const gridExams = [];
                                    const nextCo = array[coIndex + 1];

                                    if (co.coNumber === 1 && (!nextCo || nextCo.coNumber === 2) && !searchTerm) {
                                        gridExams.push(
                                            <div key='grid-prelim' className={styles.coBlock} style={{ borderLeft: '4px solid #6366f1', padding: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>Prelim</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (co.coNumber === 2 && (!nextCo || nextCo.coNumber === 3) && !searchTerm) {
                                        gridExams.push(
                                            <div key='grid-midterm' className={styles.coBlock} style={{ borderLeft: '4px solid #6366f1', padding: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>Midterm</span>
                                                    <span style={{ color: '#4b5563', fontSize: '14px', fontWeight: '500' }}>Week 9 • 5 Hr</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (co.coNumber === 3 && (!nextCo || nextCo.coNumber === 4) && !searchTerm) {
                                        gridExams.push(
                                            <div key='grid-semifinal' className={styles.coBlock} style={{ borderLeft: '4px solid #6366f1', padding: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>Semifinal</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (co.coNumber === 4 && (!nextCo || nextCo.coNumber > 4) && !searchTerm) {
                                        gridExams.push(
                                            <div key='grid-finals' className={styles.coBlock} style={{ borderLeft: '4px solid #6366f1', padding: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>Final</span>
                                                    <span style={{ color: '#4b5563', fontSize: '14px', fontWeight: '500' }}>Week 18 • 5 Hr</span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const coTotalBadges = (co.weeks || []).reduce(
                                        (sum, w) => sum + getTotalBadgeCount(w.week_id),
                                        0
                                    );
                                    const targetWeekId = co.weeks?.[0]?.week_id || co.gridIlos[0]?.id || co.co_id;

                                    return (
                                        <React.Fragment key={'grid-frag-' + co.co_id}>
                                            <div key={co.co_id} className={styles.coBlock}>
                                                <div className={styles.coHeader}>
                                                    <div className={styles.coHeaderTop}>
                                                        <span className={styles.coTitle}>
                                                            Course Outcome {co.coNumber}
                                                        </span>
                                                        <span className={styles.iloGridBox_Meta}>
                                                            {co.formattedWeekStr} &bull; {co.hours} Hrs
                                                        </span>
                                                    </div>
                                                    {co.description && (
                                                        <div className={styles.coDescription}>
                                                            {co.description}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={styles.iloGridRow}>
                                                    {co.gridIlos.map((ilo) => (
                                                        <div key={ilo.id} className={styles.iloGridBox}>
                                                            <div className={styles.iloGridBox_Header}>
                                                                <span className={styles.iloGridBox_Title}>
                                                                    ILO {ilo.iloNumber}
                                                                </span>
                                                                {ilo.ied_level && (
                                                                    <span className={styles.iloGridBox_Meta} title={IED_NAME[ilo.ied_level]}>
                                                                        {IED_NAME[ilo.ied_level] || ilo.ied_level}
                                                                    </span>
                                                                )}
                                                                {status !== 'approved' && (
                                                                    <Link
                                                                        className={styles.iloGridBox_Meta}
                                                                        to={`/ilos/form/${encodeURIComponent(iloData.course?.course_no || 'course')}/${ilo.id}?${offeringQuery}`}
                                                                        title="Edit this ILO: text, IED level and performance target"
                                                                    >
                                                                        <Edit2 size={12} /> Edit ILO
                                                                    </Link>
                                                                )}
                                                            </div>
                                                            <div className={styles.iloGridBox_Desc}>
                                                                {ilo.description}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className={styles.coFooter}>
                                                    <Link className={styles.mapContentsBtn} to={`/topics/form/${targetWeekId}/${status}?${offeringQuery}`}>
                                                        Map Weekly Content
                                                        {coTotalBadges > 0 && (
                                                            <span className={styles['comment-badge']}>{coTotalBadges}</span>
                                                        )}
                                                        <ChevronRight size={16} />
                                                    </Link>
                                                </div>
                                            </div>
                                            {gridExams}
                                        </React.Fragment>
                                    );
                                })}
                            </>
                        );
                    })()}
                </div>
            </div>
        </section>
    );
};

export default ILOs;
