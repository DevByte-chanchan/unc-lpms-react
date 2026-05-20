import React, { useState } from "react";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams } from "react-router-dom";
import SideNavigation from "../components/SideNavigation.jsx";
import TopicSelector from "../components/TopicSelector.jsx";

const TopicForm = () => {
    const navigate = useNavigate();

    const goBackHandler = () => {
        navigate(-1);
    };

    const sampleTopics = [
        { id: "T1", title: "Information Architecture (IA)", subtopics: [
                { id: "S1", value: "Organization Schemes and Structures" },
                { id: "S2", value: "Labeling Systems" },
                { id: "S3", value: "Navigation Design Patterns" },
                { id: "S4", value: "Card Sorting Techniques" }
            ]},
        { id: "T2", title: "Visual Design Principles", subtopics: [
                { id: "S5", value: "Color Theory & Accessibility" },
                { id: "S6", value: "Typography & Hierarchy" },
                { id: "S7", value: "Grid Systems and Layouts" },
                { id: "S8", value: "Iconography and Imagery" },
                { id: "S9", value: "Spacing and Visual Rhythm" }
            ]},
        { id: "T3", title: "User Research Methods", subtopics: [
                { id: "S10", value: "Contextual Inquiry" },
                { id: "S11", value: "Persona Development" },
                { id: "S12", value: "Journey Mapping" },
                { id: "S13", value: "Competitive Audit" }
            ]},
        { id: "T4", title: "Usability Testing", subtopics: [
                { id: "S14", value: "Moderated vs Unmoderated Testing" },
                { id: "S15", value: "Heuristic Evaluation" },
                { id: "S16", value: "Eye Tracking Analysis" },
                { id: "S17", value: "System Usability Scale (SUS)" }
            ]},
        { id: "T5", title: "Interaction Design", subtopics: [
                { id: "S18", value: "Micro-interactions" },
                { id: "S19", value: "State Changes & Feedback" },
                { id: "S20", value: "Gestural Navigation" },
                { id: "S21", value: "Fitts's Law Applications" }
            ]},
        { id: "T6", title: "Accessibility (A11y)", subtopics: [
                { id: "S22", value: "WCAG 2.1 Guidelines" },
                { id: "S23", value: "Screen Reader Compatibility" },
                { id: "S24", value: "Keyboard Focus Management" },
                { id: "S25", value: "Semantic HTML Fundamentals" },
                { id: "S26", value: "ARIA Roles and Attributes" }
            ]},
        { id: "T7", title: "Design Systems", subtopics: [
                { id: "S27", value: "Atomic Design Methodology" },
                { id: "S28", value: "Component Libraries" },
                { id: "S29", value: "Style Guides vs Pattern Libraries" },
                { id: "S30", value: "Design Tokens" }
            ]},
        { id: "T8", title: "Wireframing & Prototyping", subtopics: [
                { id: "S31", value: "Low-Fidelity Sketching" },
                { id: "S32", value: "Interactive Component States" },
                { id: "S33", value: "User Flow Diagrams" },
                { id: "S34", value: "High-Fidelity Interactive Prototypes" }
            ]},
        { id: "T9", title: "Information Search & Retrieval", subtopics: [
                { id: "S35", value: "Boolean Search Logic" },
                { id: "S36", value: "Faceted Search Design" },
                { id: "S37", value: "Auto-complete & Suggestion Patterns" },
                { id: "S38", value: "Search Result Filtering" }
            ]},
        { id: "T10", title: "Design Psychology", subtopics: [
                { id: "S39", value: "Cognitive Load Theory" },
                { id: "S40", value: "Hick's Law" },
                { id: "S41", value: "Gestalt Principles" },
                { id: "S42", value: "Mental Models in UX" },
                { id: "S43", value: "Aesthetic-Usability Effect" }
            ]}
    ];

    const [selectedTopics, setSelectedTopics] = useState([]);




    return (
        <Skeleton
            header={<Header role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    <FormNavigation goBack={goBackHandler}  />

                    <div className={styles['form-container']}>
                        <h2>Topics Assignment</h2>
                        <TopicSelector
                            options={sampleTopics}
                            value={selectedTopics}
                            onChange={setSelectedTopics}
                        />

                    </div>


                </div>
            }
        />
    )
}

export default TopicForm;