import React, { useState, useEffect } from 'react';


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
                setCourseDetailsError(err.message);
            } finally {
                if (mounted) setCourseDetailsLoading(false);
            }
        }

        fetchCourseDetails();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    if (courseDetailsLoading) {
        return <div className={stylesB.loadingContainer}>Loading course details...</div>;
    }

    if (courseDetailsError) {
        return <div className={stylesB.errorContainer}>Error: {courseDetailsError}</div>;
    }

    return (
        <section>
            <div className={stylesB.courseDetailsContainer}>
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
            </div>
        </section>
    );
};

export default CourseDetails;