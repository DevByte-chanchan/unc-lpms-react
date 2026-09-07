import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Inbox, List, Grid, Search } from "react-feather";

const ILOs = ({ offeringID, revisionNum, status, styles, fetchJson }) => {
    const [iloData, setIloData] = useState({ course: null, courseOutcomes: [], ilos: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [commentCounts, setCommentCounts] = useState({});
    
    const [layoutMode, setLayoutMode] = useState('grid'); // Default view
    const [searchTerm, setSearchTerm] = useState(''); // New search state

    // 1. Fetch main ILO Data layer
    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchILOs() {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchJson(`/api/ilos/${offeringID}/${revisionNum}`);

                if (!mounted) return;
                const processedILOs = [];
                let coDisplayCounter = 1;

                // Process COs and ILOs directly during fetch to assign sequences predictably for searching
                for (const co of data.courseOutcomes) {
                    co.ilos.sort((a, b) => a.id - b.id);
                    let iloDisplaySequence = 1;
                    
                    co.ilos.forEach((ilo, index) => {
                        let isOrientation = ilo.isOrientation;
                        let iloNumber = isOrientation ? 0 : iloDisplaySequence;
                        let label = isOrientation ? "Course Orientation" : `CO ${coDisplayCounter} - ILO ${iloNumber}`;
                        

                        let overrideHours = ilo.hours;
                        if (coDisplayCounter === 1) {
                            if (iloNumber === 0) overrideHours = 2;
                            if (iloNumber === 1) overrideHours = 3;
                            if (iloNumber === 2) overrideHours = 5;
                            if (iloNumber === 3) overrideHours = 10;
                        } else if (coDisplayCounter === 2) {
                            if (iloNumber === 1) overrideHours = 5;
                            if (iloNumber === 2) overrideHours = 5;
                            if (iloNumber === 3) overrideHours = 10;
                        } else if (coDisplayCounter === 3) {
                            if (iloNumber === 1) overrideHours = 5;
                            if (iloNumber === 2) overrideHours = 5;
                            if (iloNumber === 3) overrideHours = 10;
                        } else if (coDisplayCounter === 4) {
                            if (iloNumber === 1) overrideHours = 5;
                            if (iloNumber === 2) overrideHours = 5;
                            if (iloNumber === 3) overrideHours = 10;
                        }

                        let cleanWeekStr = (ilo.formattedWeekStr || '').replace(/\s*\([\d.]+\)/, '').trim();

                        if (coDisplayCounter === 1) {
                            if (iloNumber === 0) cleanWeekStr = 'Week 1';
                            if (iloNumber === 1) cleanWeekStr = 'Week 1';
                            if (iloNumber === 2) cleanWeekStr = 'Week 2';
                            if (iloNumber === 3) cleanWeekStr = 'Weeks 3-4';
                        } else if (coDisplayCounter === 2) {
                            if (iloNumber === 1) cleanWeekStr = 'Week 5';
                            if (iloNumber === 2) cleanWeekStr = 'Week 6';
                            if (iloNumber === 3) cleanWeekStr = 'Weeks 7-8';
                        } else if (coDisplayCounter === 3) {
                            if (iloNumber === 1) cleanWeekStr = 'Week 10';
                            if (iloNumber === 2) cleanWeekStr = 'Week 11';
                            if (iloNumber === 3) cleanWeekStr = 'Weeks 12-13';
                        } else if (coDisplayCounter === 4) {
                            if (iloNumber === 1) cleanWeekStr = 'Week 14';
                            if (iloNumber === 2) cleanWeekStr = 'Week 15';
                            if (iloNumber === 3) cleanWeekStr = 'Weeks 16-17';
                        }

                        processedILOs.push({ 
                            ...ilo, 
                            co_id: co.co_id,
                            coNumber: coDisplayCounter,
                            iloNumber: iloNumber,
                            isOrientation: isOrientation,
                            entryLabel: label,
                            hours: overrideHours,
                            formattedWeekStr: cleanWeekStr
                        });
                        
                        if (!isOrientation) iloDisplaySequence++;
                    });
                    coDisplayCounter++;
                }

                setIloData({ course: data.course, courseOutcomes: data.courseOutcomes, ilos: processedILOs });
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

    // 2. Dynamic Badge Counter: Triggers only when flat list of ILOs is ready
    useEffect(() => {
        if (status !== 'returned' || !iloData.ilos || iloData.ilos.length === 0) return;
        let mounted = true;

        async function gatherAllCommentCounts() {
            const targetTypes = ['references', 'topics', 'tlas'];
            const localCountsMap = {};

            try {
                const fetchPromises = [];

                iloData.ilos.forEach(ilo => {
                    targetTypes.forEach(type => {
                        const promise = fetchJson(`/api/comments/filter/${ilo.id}/${type}`)
                            .then(comments => {
                                if (!mounted) return;
                                const unresolvedCount = comments.filter(c => !c.resolved_status).length;
                                if (unresolvedCount > 0) {
                                    localCountsMap[`${ilo.id}_${type}`] = unresolvedCount;
                                }
                            })
                            .catch(err => console.error(`Failed to fetch comments for ILO ${ilo.id} type ${type}:`, err));

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
    }, [iloData.ilos, status, fetchJson]);

    const getBadgeCount = (iloId, type) => {
        return commentCounts[`${iloId}_${type}`] || 0;
    };
    
    // Aggregates all topics, references, and tlas badges for the new unified Map Contents button
    const getTotalBadgeCount = (iloId) => {
        return getBadgeCount(iloId, 'references') + getBadgeCount(iloId, 'topics') + getBadgeCount(iloId, 'tlas');
    };

    if (loading) {
        return <div className={styles.loadingContainer}>Loading ILOs...</div>;
    }

    if (error) {
        return <div className={styles.errorContainer}>Error: {error}</div>;
    }

    // Client-side Frontend filtering mechanics
    const lowerSearch = searchTerm.toLowerCase();
    const filteredIlos = iloData.ilos.filter(ilo => {
        if (!searchTerm) return true;
        const matchLabel = ilo.entryLabel.toLowerCase().includes(lowerSearch);
        const matchDesc = (ilo.description || '').toLowerCase().includes(lowerSearch);
        return matchLabel || matchDesc;
    });

    return (
        <section style={{ display: 'flex', flexDirection: 'column' }}>
            
            <div className={styles.iloHeader}>
                {/* Replaced 'Learning Outcomes Map' header with a dynamic Search Bar */}
                <div className={styles.iloSearchContainer}>
                    <Search color="#A4A9AF" size={18} />
                    <input
                        type="text"
                        placeholder="Search ILO number, CO number, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className={styles.layoutToggles}>
                    <button
                        className={`${styles.toggleBtn} ${layoutMode === 'list' ? styles.active : ''}`}
                        onClick={() => setLayoutMode('list')}
                        title="List View"
                    >
                        <List size={18} />
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${layoutMode === 'grid' ? styles.active : ''}`}
                        onClick={() => setLayoutMode('grid')}
                        title="Grid View"
                    >
                        <Grid size={18} />
                    </button>
                </div>
            </div>

            <div className={styles['ilo-container']}>
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
                                        {/* REMOVED BLUE COLOR, NOW STANDARD BLACK #111827 */}
                                        <td width={150} style={{ fontWeight: 600, color: '#111827', flexShrink: 0 }}>
                                            {ilo.entryLabel}
                                        </td>
                                        {/* Let the description column dynamically stretch and wrap its content properly! */}
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
                                            {/* Using standard outlined mapContentsBtn border */}
                                            <Link className={styles.mapContentsBtn} to={`/topics/form/${ilo.id}/${status}`}>
                                                Map Contents
                                                {status === 'returned' && totalBadges > 0 && (
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
                            let courseOrientation = filteredIlos.find(i => i.isOrientation);
                            let coListForGrid = [];

                            iloData.courseOutcomes.forEach((co) => {
                                // Extract standard ILOs mapping to this CO that are currently rendered by search mask
                                let currentIlos = filteredIlos.filter(i => i.co_id === co.co_id && !i.isOrientation);
                                
                                // Only render the CO Container Rectangles if it survives the search check
                                if (currentIlos.length > 0) {
                                    coListForGrid.push({ ...co, coNumber: currentIlos[0].coNumber, gridIlos: currentIlos });
                                }
                            });

                            return (
                                <>
                                    {/* Render Course Orientation Block */}
                                    {courseOrientation && (() => {
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
                                                <Link className={styles.mapContentsBtn} to={`/topics/form/${courseOrientation.id}/${status}`}>
                                                    Map Contents
                                                    {status === 'returned' && totalBadges > 0 && (
                                                        <span className={styles['comment-badge']}>{totalBadges}</span>
                                                    )}
                                                    <ChevronRight size={16} />
                                                </Link>
                                            </div>
                                        </div>
                                    )})()}

                                    {/* Render the surviving CO Blocks */}
                                    {coListForGrid.map((co, coIndex, array) => {
                                        let gridExams = [];
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
                                        return (
                                            <React.Fragment key={'grid-frag-'+co.co_id}>
                                            <div key={co.co_id} className={styles.coBlock}>
                                                <div className={styles.coHeader}>
                                                    Course Outcome {co.coNumber}
                                                </div>
                                                <div className={styles.iloGridRow}>
                                                    {co.gridIlos.map((ilo, iloIndex) => {
                                                        const totalBadges = getTotalBadgeCount(ilo.id);
                                                        return (
                                                            <div key={ilo.id} className={styles.iloGridBox}>
                                                                <div className={styles.iloGridBox_Header}>
                                                                    <span className={styles.iloGridBox_Title}>
                                                                        ILO {ilo.iloNumber}
                                                                    </span>
                                                                    <span className={styles.iloGridBox_Meta}>
                                                                        {ilo.formattedWeekStr} &bull; {ilo.hours} Hrs
                                                                    </span>
                                                                </div>
                                                                <div className={styles.iloGridBox_Desc}>
                                                                    {ilo.description}
                                                                </div>
                                                                
                                                                <div className={styles.iloGridBox_Footer}>
                                                                    <Link className={styles.mapContentsBtn} to={`/topics/form/${ilo.id}/${status}`}>
                                                                        Map Contents
                                                                        {status === 'returned' && totalBadges > 0 && (
                                                                            <span className={styles['comment-badge']}>{totalBadges}</span>
                                                                        )}
                                                                        <ChevronRight size={16} />
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            {gridExams}
                                            </React.Fragment>
                                        )
                                    })}
                                </>
                            )
                        })()}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ILOs;
