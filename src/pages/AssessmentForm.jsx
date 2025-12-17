import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import {useNavigate, useParams} from "react-router-dom";
import TextField from "../components/TextField.jsx";
import TextArea from "../components/TextArea.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import {useState} from "react";
import {X} from "react-feather";
import Duplicator from "../components/Duplicator.jsx";
import {getSyllabusByCode} from "../data/syllabiData.js";

const AssessmentForm = () => {
    const navigate = useNavigate();
    const goBackHandler = () => navigate(-1);

    const { code, assessmentId } = useParams();
    const syllabus = getSyllabusByCode(code);
    const assessmentData = syllabus?.assessments.find(a => a.id === assessmentId) || {};

    const [method, setMethod] = useState(assessmentData.assessmentMethod || '');
    const [description, setDescription] = useState(assessmentData.assessmentDescription || '');
    const [rubric, setRubric] = useState(assessmentData.hasRubric || false);

    const createEmptyRubricRows = (count = 3) =>
        Array.from({ length: count }, () => ({
            id: Date.now() + Math.random(),
            criteria: '',
            maxScore: '',
            weight: ''
        }));

    const [rubricRows, setRubricRows] = useState(
        assessmentData.rubrics && assessmentData.rubrics.length > 0
            ? assessmentData.rubrics
            : createEmptyRubricRows(3)
    );

    const handleRubricAdd = () => {
        const newRow = { id: Date.now() + Math.random(), criteria: '', maxScore: '', weight: '' };
        setRubricRows([...rubricRows, newRow]);
    };

    const handleRubricDelete = (id) => {
        if (rubricRows.length === 1) return;
        setRubricRows(rubricRows.filter(row => row.id !== id));
    };

    const handleRubricChange = (id, field, value) => {
        setRubricRows(rubricRows.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    return (
        <SkeletonA
            header={<HeaderA role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    <FormNavigation goBack={goBackHandler} />
                    <div className={styles['form-container']}>

                        <h2>Topic</h2>
                        <TextField
                            initialValue={assessmentData.topic || 'No topic linked.'}
                            disabled={true}
                            readOnly={true}
                        />

                        <h2>TLA Details</h2>
                        <TextField
                            label={'TLA Name'}
                            disabled={true}
                            initialValue={assessmentData.tlaName || ''}
                            readOnly={true}
                        />
                        <TextArea
                            label={'TLA Description'}
                            disabled={true}
                            initialValue={assessmentData.tlaDescription || 'No description available.'}
                            readOnly={true}
                        />

                        <h2>Assessment Details</h2>
                        <div className={styles['tlas']}>
                            <TextField
                                label={'Assessment Method'}
                                initialValue={method}
                                onChange={(value) => setMethod(value)}
                            />
                            <TextArea
                                label={'Assessment Description'}
                                initialValue={description}
                                onChange={(value) => setDescription(value)}
                            />
                            <div className={'checkbox'}>
                                <input
                                    type="checkbox"
                                    checked={rubric}
                                    onChange={() => setRubric(!rubric)}
                                />
                                Include Rubric
                            </div>
                        </div>

                        {rubric && (
                            <>
                                <h2>Rubric Criteria</h2>
                                <div className={styles['rubrics']}>
                                    <div className={styles['rubric-header']}>
                                        <div className={styles['rubric-cell']}>Criteria</div>
                                        <div className={styles['rubric-cell']}>Max Score</div>
                                        <div className={styles['rubric-cell']}>Weight</div>
                                        <div className={styles['rubric-cell']}></div>
                                    </div>
                                    {rubricRows.map((row) => (
                                        <div key={row.id} className={styles['rubric-row']}>
                                            <TextField
                                                initialValue={row.criteria}
                                                onChange={(val) => handleRubricChange(row.id, 'criteria', val)}
                                            />
                                            <TextField
                                                initialValue={row.maxScore}
                                                onChange={(val) => handleRubricChange(row.id, 'maxScore', val)}
                                            />
                                            <TextField
                                                initialValue={row.weight}
                                                onChange={(val) => handleRubricChange(row.id, 'weight', val)}
                                            />
                                            <div onClick={() => handleRubricDelete(row.id)} className={styles['x']}>
                                                <X size={20} color={'white'}/>
                                            </div>
                                        </div>
                                    ))}
                                    <div className={styles['rubric-row']}>
                                        <TextField
                                            initialValue={'TOTAL'}
                                            disabled={true}
                                            readOnly={true}
                                        />
                                        <TextField
                                            initialValue={rubricRows.reduce((sum, r) => sum + Number(r.maxScore || 0), 0)}
                                            disabled={true}
                                            readOnly={true}
                                        />
                                        <TextField
                                            initialValue={rubricRows.reduce((sum, r) => sum + Number(r.weight || 0), 0)}
                                            disabled={true}
                                            readOnly={true}
                                        />
                                        <div className={styles['x']} style={{ visibility: 'hidden' }}>
                                            <X size={20} color={'transparent'} />
                                        </div>
                                    </div>
                                    <div className={styles['rubric-add']}>
                                            <Duplicator onAdd={handleRubricAdd} name={'Add Row'} />
                                        </div>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            }
        />
    )
}

export default AssessmentForm;
