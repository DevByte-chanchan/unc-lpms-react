import React, { useState, useEffect } from 'react';
import { FileText, AlertTriangle } from 'react-feather';
import EmptyState from './EmptyState.jsx';
import Spinner from './Spinner.jsx';
import TableScrollRegion from './TableScrollRegion.jsx';
import { describeCourseLoadError } from '../utils/courseLoadError.js';


const CourseDetails = ({ offeringID, revisionNum, stylesB, fetchJson }) => {
    const [courseDetailsData, setCourseDetailsData] = useState({
        code: '', name: '', description: '', credits: '', contact: '',
        prerequisites: '', class: '', cmo: '', revision: 0, year: '', sem: ''
    });
    const [courseDetailsLoading, setCourseDetailsLoading] = useState(false);
    const [courseDetailsError, setCourseDetailsError] = useState(null);

    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchCourseDetails() {
            setCourseDetailsLoading(true);
            setCourseDetailsError(null);
            try {
                const data = await fetchJson(`/api/course-details/${offeringID}/${revisionNum}`);

                if (!mounted) return;

                setCourseDetailsData({
                    code: data.code ?? '',
                    name: data.name ?? '',
                    description: data.description ?? '',
                    credits: data.credits ?? '',
                    contact: data.contact ?? '',
                    prerequisites: data.prerequisites ?? '',
                    class: data.class ?? '',
                    cmo: data.cmo ?? '',
                    revision: data.revision ?? 0,
                    year: data.year ?? '',
                    sem: data.sem ?? ''
                });
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setCourseDetailsError(describeCourseLoadError(err));
            } finally {
                if (mounted) setCourseDetailsLoading(false);
            }
        }

        fetchCourseDetails();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    if (courseDetailsLoading) {
        return <Spinner label="Loading course details…" minHeight={280} />;
    }

    if (courseDetailsError) {
        return (
            <EmptyState
                icon={<AlertTriangle size={22} strokeWidth={1.6} />}
                title="Could not load the course details"
                hint={courseDetailsError}
            />
        );
    }

    // Previously this fell through to a table of empty cells, which looks like
    // the screen loaded and lost the data.
    if (!courseDetailsData?.code && !courseDetailsData?.name) {
        return (
            <EmptyState
                icon={<FileText size={22} strokeWidth={1.6} />}
                title="No course details recorded"
                hint="The course number, title, description, credit units and contact hours will appear here once the instructor has entered them."
            />
        );
    }

    return (
        <section>
            <TableScrollRegion label="Course details" minWidth={720} className={stylesB.courseDetailsContainer}>
                <table className={stylesB.documentTable}>
                    <tbody>
                    <tr>
                        <th className={stylesB.labelCell}>Course No.</th>
                        <td className={stylesB.valueCell}>{courseDetailsData?.code || ''}</td>
                        <th className={stylesB.descHeader}>Course Description</th>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Course Title</th>
                        <td className={stylesB.valueCell}><strong>{courseDetailsData?.name || ''}</strong></td>
                        <td rowSpan="9" className={stylesB.descCell}>
                            {courseDetailsData?.description || ''}
                        </td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Credit</th>
                        <td className={stylesB.valueCell}>{courseDetailsData?.credits || ''}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Contact Hours/Week</th>
                        <td className={stylesB.valueCell}>{courseDetailsData?.contact || ''}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Pre-requisites</th>
                        <td className={stylesB.valueCell}>{courseDetailsData?.prerequisites || ''}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Classification/Field</th>
                        <td className={stylesB.valueCell}>{courseDetailsData?.class || ''}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>CMO</th>
                        <td className={stylesB.valueCell}>{courseDetailsData?.cmo || ''}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Syllabus Revision No.</th>
                        <td className={stylesB.valueCell}>{courseDetailsData?.revision ?? 0}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Year Level</th>
                        <td className={stylesB.valueCell}>{courseDetailsData?.year || ''}</td>
                    </tr>

                    <tr>
                        <th className={stylesB.labelCell}>Term</th>
                        <td className={stylesB.valueCell}>{courseDetailsData?.sem || ''}</td>
                    </tr>
                    </tbody>
                </table>
            </TableScrollRegion>
        </section>
    );
};

export default CourseDetails;
