
import styles from '../styles/SyllabusSections.module.sass'
import {ChevronLeft, ChevronRight, Plus, Search} from 'react-feather';
import { Info } from 'react-feather';
import React, {useState} from "react";
import TextField from "./TextField.jsx";
import TextArea from "./TextArea.jsx";
import {Link, useParams, useSearchParams} from "react-router-dom";
import {getSyllabusByCode} from "../data/syllabiData.js";

const syllabusSections = ({status}) => {

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Course Details';

    const handleSectionChange = (e) => {
        setSearchParams({ section: e.target.value })

    }

    // COURSE AND PROGRAM OUTCOME ALIGNMENT
    const courseOutcomes = [
        { id: 'CO1', description: 'Apply core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing a User Interface (UI) design using Figma to translate a design brief into interactive screen layouts and UI components with a high-fidelity prototype demonstrating clarity, consistency, and appropriate use of visual hierarchy.' },
        { id: 'CO2', description: 'User-Centered Design (UCD) principles and ISO 9241-210 standards with given user personas, contextual task flows, and feedback artifacts to develop a User Experience (UX) design that demonstrates user involvement, iterative refinement, and contextual understanding, as evaluated against established UX design criteria.' },
        { id: 'CO3', description: 'Construct a front-end prototype for a proposed software application by applying HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines that demonstrate compliance with best practices in usability, inclusivity, and user engagement.' },
        { id: 'CO4', description: 'Justify the front-end prototype of a proposed software application based on usability testing results and user feedback by providing evidence-based rationale that addresses at least 80% of identified usability issues and aligns with user experience goals.' },
    ];

    const programOutcomes = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9'];

    const CriteriaForm = React.lazy(() => import('../pages/CriteriaForGradingForm.jsx'));

    const { code } = useParams();
    const syllabus = getSyllabusByCode(code);

    return(
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
                        <option value="References">References</option>
                        <option value="Topics">Topics & Teaching and Learning Activities</option>
                        <option value="Intended Learning Outcomes">Intended Learning Outcomes</option>
                        <option value="Assessments">Assessments</option>
                        <option value="Criteria for Grading">Criteria for Grading</option>
                    </select>
                </div>

                <div className={styles.draft}>Save as Draft</div>

                <div className={styles.submit}>Submit</div>
            </div>

            <div className={styles['dynamic-sections']}>

                {selectedSection === 'Course Details' &&
                    <section>
                        {/*<div className={styles.header}>*/}
                        {/*    <h2>Course Details</h2>*/}
                        {/*</div>*/}

                        <div className={styles.form}>
                            <div className={styles['double-field']}>
                                <div className={styles.colA}>
                                    <TextField
                                        initialValue={'Human & Computer Interaction'}
                                        disabled={true}
                                        label="Course Name"
                                    />
                                    <TextField
                                        initialValue={'BSCS313L'}
                                        disabled={true}
                                        label="Course Number"
                                    />
                                    <TextField
                                        initialValue={'3'}
                                        disabled={true}
                                        label="Contact Hours"
                                    />
                                    <TextField
                                        initialValue={'BSCS313L'}
                                        disabled={true}
                                        label="Course Number"
                                    />
                                    <TextField
                                        initialValue={'THIRD YEAR'}
                                        disabled={true}
                                        label="Year Level"
                                    />

                                </div>
                                <div className={styles.colB}>
                                    <TextField
                                        initialValue={'0'}
                                        disabled={true}
                                        label="Syllabus Revision No"
                                    />
                                    <TextField
                                        initialValue={'2 LEC, 1 LAB'}
                                        disabled={true}
                                        label="Credits"
                                    />
                                    <TextField
                                        initialValue={'Professional Courses'}
                                        disabled={true}
                                        label="Classification/Field"
                                    />
                                    <TextField
                                        initialValue={'25 S, 2015'}
                                        disabled={true}
                                        label="CMO"
                                    />
                                    <TextField
                                        initialValue={'1st Semester'}
                                        disabled={true}
                                        label="Term"
                                    />
                                </div>
                            </div>

                            <TextArea
                                initialValue={'This course explores the principles and practices of Human-Computer Interaction (HCI), focusing on how people engage with digital systems and how to design technology that enhances user experience.\n' +
                                    '\n' +
                                    'Students will examine user-centered design methodologies, usability principles, interaction design processes, and evaluation techniques. The course also emphasizes the integration of emerging technologies for software product design (UI/UX), equipping students with insights into modern tools and trends that shape interactive systems.\n' +
                                    '\n' +
                                    'Through lectures, hands-on projects, and usability testing, learners will develop practical skills in designing intuitive and user-friendly interfaces that address real human needs. Drawing from foundational theories in psychology, design, and computer science, this course prepares students to create digital products that are both functional and forward-thinking, aligning with current and future developments\n' +
                                    'in UI/UX design.\n' +
                                    '\n'}
                                disabled={false}
                                label="Course Descrption"
                                rows={10}
                            />
                            <br/><br/><br/>
                        </div>

                    </section>
                }

                {selectedSection === 'Course and Program Outcome Alignment' &&

                    <section>
                        <div className={styles['cpa-container']}>

                            <div className={styles.legend}>
                                <p>Legend</p>
                                <div className={styles.legends}>
                                    <p><strong>I</strong> - An Introductory Course</p>
                                    <p><strong>E</strong> - An Introductory Course</p>
                                    <p><strong>D</strong> - An Introductory Course</p>
                                </div>
                            </div>

                            <table>
                                <thead>
                                    <tr>
                                        <th className={styles['course-descrip']}>After completing the course, the student should be  able to:</th>
                                        <th width={82}>PO1 <Info strokeWidth={1.7}  size={18}/></th>
                                        <th width={82}>PO2 <Info strokeWidth={1.7}  size={18}/></th>
                                        <th width={82}>PO3 <Info strokeWidth={1.7}  size={18}/></th>
                                        <th width={82}>PO4 <Info strokeWidth={1.7}  size={18}/></th>
                                        <th width={82}>PO5 <Info strokeWidth={1.7}  size={18}/></th>
                                        <th width={82}>PO6 <Info strokeWidth={1.7}  size={18}/></th>
                                        <th width={82}>PO7 <Info strokeWidth={1.7}  size={18}/></th>
                                        <th width={82}>PO8 <Info strokeWidth={1.7}  size={18}/></th>
                                        <th width={82}>PO9 <Info strokeWidth={1.7}  size={18}/></th>
                                    </tr>
                                </thead>

                                <tbody>
                                {/* Loop over each item in the courseOutcomes array to create one row (<tr>) per outcome */}
                                {courseOutcomes.map((co, coIndex) => (
                                    // The key must be on the outermost element of the map (the <tr>)
                                    <tr key={co.id}>

                                        {/* Column 1: Course Outcome ID */}
                                        <td className={styles.courseNo}>
                                            {co.id}
                                        </td>

                                        {/* Column 2: Description (using the data from the current 'co' object) */}
                                        <td className={styles.courseDescripInput}>
                                            <TextArea initialValue={co.description} rows={8} />
                                        </td>

                                        {/* Columns 3 onwards: The 9 dropdown options */}
                                        {/* We map over a fixed array [9] to generate the <td> elements */}
                                        {[...Array(9)].map((_, poIndex) => (
                                            <td className={styles.dropdownOptions} key={poIndex}>
                                                <select>
                                                    <option value=" "></option>
                                                    <option value="I">I</option>
                                                    <option value="E">E</option>
                                                    <option value="D">D</option>
                                                </select>
                                            </td>
                                        ))}

                                    </tr>
                                ))}
                                </tbody>
                            </table>

                        </div>
                    </section>

                }

                {selectedSection === 'References' &&
                    <section>
                        <div className={styles['references-container']}>
                            <div className={styles['references-header']}>
                                <div className={'search-container'}>
                                    <div className={'search-bar'}>
                                            <Search size={18}/>
                                        <input placeholder={"Search reference name"} type="text"/>
                                    </div>
                                </div>

                                <div className={'filter-container'}>
                                    <p>Filter by <strong>Reference Type</strong>:</p>
                                    <select name="" >
                                        <option value="">Textbook</option>
                                        <option value="">Online Resources</option>
                                    </select>
                                </div>

                                <Link to={'/references/form/:id'}>
                                    <div className={'add-button'}>
                                        <Plus size={16} strokeWidth={3}/> Add Reference
                                    </div>
                                </Link>

                            </div>

                            <table>
                                <thead>
                                   <tr>
                                       <th width={200}>REFERENCE ID</th>
                                       <th width={400}>TITLE</th>
                                       <th className={styles.fill} ></th>
                                   </tr>
                                </thead>
                                <tbody>
                                    {syllabus.references.map((ref) => (
                                        <tr key={ref.id}>
                                            <td width={200}>{ref.id}</td>
                                            <td width={400}>{ref.title}</td>
                                            <td className={styles.fill}>
                                                <Link className={'actionLink'} to={`/references/form/${code}/${ref.id}`}>
                                                    Open <ChevronRight size={18} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                        </div>
                    </section>
                }

                {selectedSection === 'Topics' &&
                    <section>
                        <div className={styles['topics-container']}>
                            <div className={styles['topics-header']}>
                                <div className={'search-container'}>
                                    <div className={'search-bar'}>
                                        <Search size={18}/>
                                        <input placeholder={"Search topic name"} type="text"/>
                                    </div>
                                </div>

                                <Link to={'/topics/form/:id'}>

                                    
                                    <div className={'add-button'}>
                                        <Plus size={16} strokeWidth={3}/> Add Topic
                                    </div>
                                </Link>
                            </div>

                            <table>
                                <thead>
                                <tr>
                                    <th width={400}>TITLE</th>
                                    <th className={styles.fill} ></th>
                                </tr>
                                </thead>
                                <tbody>
                                {syllabus.topics.map((topic) => (
                                    <tr key={topic.id}>
                                        <td>{topic.title}</td>
                                        <td className={styles.fill}>
                                            <Link className={'actionLink'} to={`/topics/form/${code}/${topic.id}`}>
                                                Open <ChevronRight size={18}/>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>

                        </div>
                    </section>
                }

                {selectedSection === 'Intended Learning Outcomes' &&
                    <section>
                        <div className={styles['ilo-container']}>
                            <table>
                                <thead>
                                <tr>
                                    <th width={400}>Entry ID</th>
                                    <th className={styles.fill} ></th>
                                </tr>
                                </thead>
                                <tbody>
                                {syllabus.ilos.map((ilo) => (
                                    <tr key={ilo.id}>
                                        <td>{ilo.id}</td>
                                        <td className={styles.fill}>
                                            <Link className={'actionLink'} to={`/ilos/form/${code}/${ilo.id}`}>
                                                Open <ChevronRight size={18}/>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>

                        </div>
                    </section>
                }

                {selectedSection === 'Assessments' &&
                    <section>
                        <div className={styles['assessments-container']}>

                            <div className={styles['assessments-header']}>
                                <div className={'search-container'}>
                                    <div className={'search-bar'}>
                                        <Search size={18}/>
                                        <input placeholder={"Search TLA name"} type="text"/>
                                    </div>
                                </div>

                                <div className={'filter-container'}>
                                    <p>Filter by <strong>Class Phase</strong>:</p>
                                    <select name="phase">
                                        <option value="">All</option>
                                        <option value="Pre-Class">Pre-Class</option>
                                        <option value="In-Class">In-Class</option>
                                        <option value="Post-Class">Post-Class</option>
                                    </select>
                                </div>
                            </div>

                            <table>
                                <thead>
                                <tr>
                                    <th width={400}>TLA NAME</th>
                                    <th width={400}>TOPIC</th>
                                    <th width={350}>CLASS PHASE</th>
                                    <th className={styles.fill}></th>
                                </tr>
                                </thead>

                                <tbody>
                                {syllabus.assessments.map((assessment) => (
                                    <tr key={assessment.id}>
                                        <td width={400}>{assessment.tlaName}</td>
                                        <td width={400}>{assessment.topic}</td>
                                        <td width={350}>{assessment.phase}</td>
                                        <td className={styles.fill}>
                                            <Link
                                                className={'actionLink'}
                                                to={`/assessments/form/${code}/${assessment.id}`}
                                            >
                                                Open <ChevronRight size={18}/>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                }
                {selectedSection === 'Criteria for Grading' && (
                    <section>
                        <React.Suspense fallback={<div></div>}>
                            <CriteriaForm syllabusCode={code} />
                        </React.Suspense>
                    </section>
                )}
            </div>
        </div>
    )
}

export default syllabusSections;