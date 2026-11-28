export const syllabiData = [
    {
        code: 'BSCS313L',
        name: 'Human & Computer Interaction',
        update: 'Aug 01, 2025',
        status: 'DRAFT',
        approved: '',
        revision: '0',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BCS222L Web Development 2',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'THIRD YEAR',
        sem: '1st Semester',
        description: 'This course explores the principles and practices of Human-Computer Interaction (HCI), focusing on how people engage with digital systems and how to design technology that enhances user experience.\n' +
            '\n' +
            'Students will examine user-centered design methodologies, usability principles, interaction design processes, and evaluation techniques. The course also emphasizes the integration of emerging technologies for software product design (UI/UX), equipping students with insights into modern tools and trends that shape interactive systems.\n' +
            '\n' +
            'Through lectures, hands-on projects, and usability testing, learners will develop practical skills in designing intuitive and user-friendly interfaces that address real human needs. Drawing from foundational theories in psychology, design, and computer science, this course prepares students to create digital products that are both functional and forward-thinking, aligning with current and future developments\n' +
            'in UI/UX design.\n' +
            '\n',
        references: [
            // --- TEXTBOOKS (Needs ISBN, Year) ---
            {
                id: "TB1",
                title: "The Design of Everyday Things",
                type: "Textbook",
                authors: "Don Norman",
                year: 2013,
                isbn: "978-0465050659",
                link: ""
            },
            {
                id: "TB2",
                title: "Don't Make Me Think, Revisited",
                type: "Textbook",
                authors: "Steve Krug",
                year: 2014,
                isbn: "978-0321965516",
                link: ""
            },
            {
                id: "TB3",
                title: "About Face: The Essentials of Interaction Design",
                type: "Textbook",
                authors: "Alan Cooper, Robert Reimann, David Cronin",
                year: 2014,
                isbn: "978-1118766576",
                link: ""
            },
            {
                id: "TB4",
                title: "Designing with the Mind in Mind",
                type: "Textbook",
                authors: "Jeff Johnson",
                year: 2020,
                isbn: "978-0128182024",
                link: ""
            },
            {
                id: "TB5",
                title: "Universal Principles of Design",
                type: "Textbook",
                authors: "William Lidwell, Kritina Holden, Jill Butler",
                year: 2010,
                isbn: "978-1592535873",
                link: ""
            },

            // --- ONLINE RESOURCES (Needs Link, Year optional) ---
            {
                id: "OR1",
                title: "10 Usability Heuristics for User Interface Design",
                type: "Online Resources",
                authors: "Jakob Nielsen",
                year: 2020, // Updated article date
                isbn: "",
                link: "https://www.nngroup.com/articles/ten-usability-heuristics/"
            },
            {
                id: "OR2",
                title: "Material Design 3 Guidelines",
                type: "Online Resources",
                authors: "Google Design Team",
                year: 2023,
                isbn: "",
                link: "https://m3.material.io/"
            },
            {
                id: "OR3",
                title: "Human Interface Guidelines",
                type: "Online Resources",
                authors: "Apple Inc.",
                year: 2024,
                isbn: "",
                link: "https://developer.apple.com/design/human-interface-guidelines"
            },
            {
                id: "OR4",
                title: "Laws of UX",
                type: "Online Resources",
                authors: "Jon Yablonski",
                year: 2021,
                isbn: "",
                link: "https://lawsofux.com/"
            },
            {
                id: "OR5",
                title: "Smashing Magazine: UX Design Category",
                type: "Online Resources",
                authors: "Various Authors",
                year: 2024,
                isbn: "",
                link: "https://www.smashingmagazine.com/category/ux"
            },

            // --- OPEN EDUCATIONAL RESOURCES (Needs Link, Year) ---
            {
                id: "OE1",
                title: "The Encyclopedia of Human-Computer Interaction, 2nd Ed.",
                type: "Open Educational Resources",
                authors: "Mads Soegaard, Rikke Friis Dam",
                year: 2014,
                isbn: "",
                link: "https://www.interaction-design.org/literature/book/the-encyclopedia-of-human-computer-interaction-2nd-ed"
            },
            {
                id: "OE2",
                title: "Web Content Accessibility Guidelines (WCAG) 2.2",
                type: "Open Educational Resources",
                authors: "W3C Web Accessibility Initiative",
                year: 2023,
                isbn: "",
                link: "https://www.w3.org/TR/WCAG22/"
            },
            {
                id: "OE3",
                title: "MIT OpenCourseWare: User Interface Design and Implementation",
                type: "Open Educational Resources",
                authors: "Prof. Robert Miller",
                year: 2011,
                isbn: "",
                link: "https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/6-831-user-interface-design-and-implementation-spring-2011/"
            },
            {
                id: "OE4",
                title: "Usability.gov: User Experience Basics",
                type: "Open Educational Resources",
                authors: "GSA Technology Transformation Services",
                year: 2019,
                isbn: "",
                link: "https://www.usability.gov/what-and-why/user-experience.html"
            },
            {
                id: "OE5",
                title: "The A11Y Project Checklist",
                type: "Open Educational Resources",
                authors: "The A11Y Project Team",
                year: 2023,
                isbn: "",
                link: "https://www.a11yproject.com/checklist/"
            }
        ],
        topics: [
            {
                id: "T1",
                title: "Introduction to HCI & Cognitive Foundations",
                subtopics: [
                    { id: "S1", value: "History and Evolution of HCI" },
                    { id: "S2", value: "The Human Information Processor" },
                    { id: "S3", value: "Mental Models and Metaphors" },
                    { id: "S4", value: "Gulf of Execution and Evaluation" }
                ],
                tlas: [
                    {
                        id: "TLA1",
                        classPhase: "Pre-class",
                        performedBy: "Instructor",
                        tlaName: "Foundations Lecture",
                        tlaDescription: "An in-depth overview of the multi-disciplinary nature of HCI, exploring how psychology, design, and computer science intersect. This session introduces Don Norman’s fundamental principles of design.",
                        laboratory: false
                    },
                    {
                        id: "TLA2",
                        classPhase: "In-class",
                        performedBy: "Student",
                        tlaName: "Bad Design Hunt",
                        tlaDescription: "Students explore the campus or digital environments to capture examples of 'bad design.' They must analyze and present which cognitive principles (e.g., affordance, signifiers, mapping) were violated.",
                        laboratory: true
                    }
                ]
            },
            {
                id: "T2",
                title: "User Research Methodologies",
                subtopics: [
                    { id: "S5", value: "Quantitative vs. Qualitative Research" },
                    { id: "S6", value: "Contextual Inquiry and Observation" },
                    { id: "S7", value: "Interview Techniques" },
                    { id: "S8", value: "Ethical Considerations in Research" }
                ],
                tlas: [
                    {
                        id: "TLA3",
                        classPhase: "In-class",
                        performedBy: "Student",
                        tlaName: "Mock Interview Session",
                        tlaDescription: "Students pair up to conduct semi-structured user interviews based on a provided problem statement. One acts as the researcher and the other as the user, focusing on avoiding leading questions.",
                        laboratory: false
                    },
                    {
                        id: "TLA4",
                        classPhase: "Post-class",
                        performedBy: "Student",
                        tlaName: "Research Plan Proposal",
                        tlaDescription: "Students draft a formal research plan outlining their objectives, target methodology, and recruitment screener for their term project.",
                        laboratory: false
                    }
                ]
            },
            {
                id: "T3",
                title: "User Modeling & Requirements",
                subtopics: [
                    { id: "S9", value: "Creating User Personas" },
                    { id: "S10", value: "Empathy Mapping" },
                    { id: "S11", value: "User Stories and Scenarios" },
                    { id: "S12", value: "Journey Mapping" }
                ],
                tlas: [
                    {
                        id: "TLA5",
                        classPhase: "In-class",
                        performedBy: "Student",
                        tlaName: "Persona Workshop",
                        tlaDescription: "Using data gathered from the research phase, student groups synthesize findings into three distinct personas (Primary, Secondary, Negative) using professional templates.",
                        laboratory: true
                    }
                ]
            },
            {
                id: "T4",
                title: "Information Architecture (IA)",
                subtopics: [
                    { id: "S13", value: "Organization Schemes and Structures" },
                    { id: "S14", value: "Labeling Systems" },
                    { id: "S15", value: "Navigation Design Patterns" },
                    { id: "S16", value: "Card Sorting Techniques" }
                ],
                tlas: [
                    {
                        id: "TLA6",
                        classPhase: "In-class",
                        performedBy: "Student",
                        tlaName: "Card Sorting Exercise",
                        tlaDescription: "Groups perform an open card sort activity using sticky notes to organize 50+ content items into logical categories, creating a proposed site map for an e-commerce application.",
                        laboratory: true
                    }
                ]
            },
            {
                id: "T5",
                title: "Interaction Design Principles",
                subtopics: [
                    { id: "S17", value: "Nielsen’s 10 Usability Heuristics" },
                    { id: "S18", value: "Shneiderman’s Eight Golden Rules" },
                    { id: "S19", value: "Fitts’ Law and Hick’s Law" },
                    { id: "S20", value: "Error Prevention and Recovery" }
                ],
                tlas: [
                    {
                        id: "TLA7",
                        classPhase: "Pre-class",
                        performedBy: "Instructor",
                        tlaName: "Heuristics Deep Dive",
                        tlaDescription: "A lecture analyzing real-world interfaces against Nielsen’s heuristics, demonstrating both violations and adherences in popular software products.",
                        laboratory: false
                    },
                    {
                        id: "TLA8",
                        classPhase: "Post-class",
                        performedBy: "Student",
                        tlaName: "Heuristic Evaluation Report",
                        tlaDescription: "Students select a mobile application and perform a rigorous heuristic evaluation, documenting at least 5 major usability issues with severity ratings.",
                        laboratory: false
                    }
                ]
            },
            {
                id: "T6",
                title: "Visual Design & UI Fundamentals",
                subtopics: [
                    { id: "S21", value: "Color Theory and Psychology" },
                    { id: "S22", value: "Typography and Readability" },
                    { id: "S23", value: "Grid Systems and Layout" },
                    { id: "S24", value: "Gestalt Principles in UI" }
                ],
                tlas: [
                    {
                        id: "TLA9",
                        classPhase: "In-class",
                        performedBy: "Student",
                        tlaName: "UI Component Audit",
                        tlaDescription: "Students audit a design system (e.g., Material Design), analyzing how atoms, molecules, and organisms are constructed visually.",
                        laboratory: true
                    }
                ]
            },
            {
                id: "T7",
                title: "Low-Fidelity Prototyping",
                subtopics: [
                    { id: "S25", value: "Sketching and Storyboarding" },
                    { id: "S26", value: "Paper Prototyping" },
                    { id: "S27", value: "Wireframing Concepts" },
                    { id: "S28", value: "Design Fidelity Levels" }
                ],
                tlas: [
                    {
                        id: "TLA10",
                        classPhase: "In-class",
                        performedBy: "Student",
                        tlaName: "Crazy 8s Sketching",
                        tlaDescription: "A rapid ideation exercise where students must generate 8 distinct interface layout ideas for a single screen in 8 minutes to overcome design fixation.",
                        laboratory: true
                    },
                    {
                        id: "TLA11",
                        classPhase: "In-class",
                        performedBy: "Instructor",
                        tlaName: "Paper Prototype Demo",
                        tlaDescription: "Instructor demonstrates how to simulate user interactions (clicks, scrolls, transitions) using only paper, scissors, and transparency sheets.",
                        laboratory: false
                    }
                ]
            },
            {
                id: "T8",
                title: "High-Fidelity Prototyping",
                subtopics: [
                    { id: "S29", value: "Introduction to Figma/Adobe XD" },
                    { id: "S30", value: "Components, Variants, and Auto-Layout" },
                    { id: "S31", value: "Interactive States (Hover, Pressed)" },
                    { id: "S32", value: "Micro-interactions" }
                ],
                tlas: [
                    {
                        id: "TLA12",
                        classPhase: "In-class",
                        performedBy: "Instructor",
                        tlaName: "Figma Masterclass",
                        tlaDescription: "Live coding/design session covering advanced Figma features including component properties, boolean variables, and prototyping smart animate transitions.",
                        laboratory: true
                    },
                    {
                        id: "TLA13",
                        classPhase: "Post-class",
                        performedBy: "Student",
                        tlaName: "Clickable Prototype Build",
                        tlaDescription: "Students translate their wireframes into a fully functional high-fidelity prototype with linked screens and realistic data.",
                        laboratory: true
                    }
                ]
            },
            {
                id: "T9",
                title: "Usability Testing",
                subtopics: [
                    { id: "S33", value: "Planning a Usability Test" },
                    { id: "S34", value: "Recruiting Participants" },
                    { id: "S35", value: "Moderated vs. Unmoderated Testing" },
                    { id: "S36", value: "Measuring Success (Success Rate, Time on Task)" }
                ],
                tlas: [
                    {
                        id: "TLA14",
                        classPhase: "In-class",
                        performedBy: "Student",
                        tlaName: "Live Usability Test",
                        tlaDescription: "Students perform a moderated usability test on their high-fidelity prototypes with invited participants, recording observations and critical incidents.",
                        laboratory: true
                    }
                ]
            },
            {
                id: "T10",
                title: "Accessibility & Ethics in AI",
                subtopics: [
                    { id: "S37", value: "WCAG 2.1 Guidelines (POUR)" },
                    { id: "S38", value: "Assistive Technologies (Screen Readers)" },
                    { id: "S39", value: "Dark Patterns in UX" },
                    { id: "S40", value: "Designing for AI Trust" }
                ],
                tlas: [
                    {
                        id: "TLA15",
                        classPhase: "Pre-class",
                        performedBy: "Instructor",
                        tlaName: "Accessibility Lecture",
                        tlaDescription: "Discussion on the importance of inclusive design, demonstrating how screen readers interpret semantic HTML and ARIA labels.",
                        laboratory: false
                    },
                    {
                        id: "TLA16",
                        classPhase: "In-class",
                        performedBy: "Student",
                        tlaName: "Accessibility Audit",
                        tlaDescription: "Students use automated tools (like WAVE or Lighthouse) and manual checks to audit a government website for accessibility violations.",
                        laboratory: true
                    }
                ]
            }
        ],
        ilos: [
            // --- CO1: Foundations & Analysis ---
            {
                id: "CO1-ILO1",
                courseOutcome: "Apply core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing a User Interface (UI) design using Figma to translate a design brief into interactive screen layouts and UI components with a high-fidelity prototype demonstrating clarity, consistency, and appropriate use of visual hierarchy.",
                intendedLearningOutcome: "Analyze the relationship between cognitive psychology and human-computer interaction.",
                deliveryWeek: "Week 1",
                allocatedTime: "3 hours",
                topics: [
                    "Introduction to HCI & Cognitive Foundations",
                    "User Research Methodologies"
                ],
                references: [
                    "TB1 - The Design of Everyday Things",
                    "TB4 - Designing with the Mind in Mind"
                ]
            },
            {
                id: "CO1-ILO2",
                courseOutcome: "Apply core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing a User Interface (UI) design using Figma to translate a design brief into interactive screen layouts and UI components with a high-fidelity prototype demonstrating clarity, consistency, and appropriate use of visual hierarchy.",
                intendedLearningOutcome: "Synthesize user research data into actionable user personas and empathy maps.",
                deliveryWeek: "Week 2",
                allocatedTime: "3 hours",
                topics: [
                    "User Research Methodologies",
                    "User Modeling & Requirements"
                ],
                references: [
                    "OE1 - The Encyclopedia of Human-Computer Interaction, 2nd Ed.",
                    "TB3 - About Face: The Essentials of Interaction Design"
                ]
            },
            {
                id: "CO1-ILO3",
                courseOutcome: "Apply core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing a User Interface (UI) design using Figma to translate a design brief into interactive screen layouts and UI components with a high-fidelity prototype demonstrating clarity, consistency, and appropriate use of visual hierarchy.",
                intendedLearningOutcome: "Structure information architecture effectively using card sorting techniques.",
                deliveryWeek: "Week 3",
                allocatedTime: "2 hours",
                topics: [
                    "Information Architecture (IA)",
                    "User Modeling & Requirements"
                ],
                references: [
                    "TB2 - Don't Make Me Think, Revisited",
                    "OE4 - Usability.gov: User Experience Basics"
                ]
            },

            // --- CO2: Design Strategy & Low-Fi ---
            {
                id: "CO2-ILO1",
                courseOutcome: "User-Centered Design (UCD) principles and ISO 9241-210 standards with given user personas, contextual task flows, and feedback artifacts to develop a User Experience (UX) design that demonstrates user involvement, iterative refinement, and contextual understanding, as evaluated against established UX design criteria.",
                intendedLearningOutcome: "Apply Nielsen's 10 Usability Heuristics to critique existing interface designs.",
                deliveryWeek: "Week 4",
                allocatedTime: "3 hours",
                topics: [
                    "Interaction Design Principles",
                    "Introduction to HCI & Cognitive Foundations"
                ],
                references: [
                    "OR1 - 10 Usability Heuristics for User Interface Design",
                    "TB5 - Universal Principles of Design"
                ]
            },
            {
                id: "CO2-ILO2",
                courseOutcome: "User-Centered Design (UCD) principles and ISO 9241-210 standards with given user personas, contextual task flows, and feedback artifacts to develop a User Experience (UX) design that demonstrates user involvement, iterative refinement, and contextual understanding, as evaluated against established UX design criteria.",
                intendedLearningOutcome: "Create low-fidelity wireframes that solve specific user pain points.",
                deliveryWeek: "Week 5",
                allocatedTime: "3 hours",
                topics: [
                    "Low-Fidelity Prototyping",
                    "Visual Design & UI Fundamentals"
                ],
                references: [
                    "OR4 - Laws of UX",
                    "TB3 - About Face: The Essentials of Interaction Design"
                ]
            },
            {
                id: "CO2-ILO3",
                courseOutcome: "User-Centered Design (UCD) principles and ISO 9241-210 standards with given user personas, contextual task flows, and feedback artifacts to develop a User Experience (UX) design that demonstrates user involvement, iterative refinement, and contextual understanding, as evaluated against established UX design criteria.",
                intendedLearningOutcome: "Apply Gestalt principles and color theory to enhance UI readability.",
                deliveryWeek: "Week 6",
                allocatedTime: "2 hours",
                topics: [
                    "Visual Design & UI Fundamentals",
                    "Interaction Design Principles"
                ],
                references: [
                    "OR2 - Material Design 3 Guidelines",
                    "OR3 - Human Interface Guidelines"
                ]
            },

            // --- CO3: High-Fi Construction ---
            {
                id: "CO3-ILO1",
                courseOutcome: "Construct a front-end prototype for a proposed software application by applying HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines that demonstrate compliance with best practices in usability, inclusivity, and user engagement.",
                intendedLearningOutcome: "Develop high-fidelity interactive prototypes using Figma components and variants.",
                deliveryWeek: "Week 8",
                allocatedTime: "4 hours",
                topics: [
                    "High-Fidelity Prototyping",
                    "Visual Design & UI Fundamentals"
                ],
                references: [
                    "OR2 - Material Design 3 Guidelines",
                    "OR5 - Smashing Magazine: UX Design Category"
                ]
            },
            {
                id: "CO3-ILO2",
                courseOutcome: "Construct a front-end prototype for a proposed software application by applying HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines that demonstrate compliance with best practices in usability, inclusivity, and user engagement.",
                intendedLearningOutcome: "Integrate micro-interactions to provide feedback and feedforward mechanisms.",
                deliveryWeek: "Week 9",
                allocatedTime: "3 hours",
                topics: [
                    "High-Fidelity Prototyping",
                    "Interaction Design Principles"
                ],
                references: [
                    "TB4 - Designing with the Mind in Mind",
                    "OR3 - Human Interface Guidelines"
                ]
            },
            {
                id: "CO3-ILO3",
                courseOutcome: "Construct a front-end prototype for a proposed software application by applying HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines that demonstrate compliance with best practices in usability, inclusivity, and user engagement.",
                intendedLearningOutcome: "Evaluate interfaces against WCAG 2.1 accessibility standards.",
                deliveryWeek: "Week 10",
                allocatedTime: "2 hours",
                topics: [
                    "Accessibility & Ethics in AI",
                    "User Research Methodologies"
                ],
                references: [
                    "OE2 - Web Content Accessibility Guidelines (WCAG) 2.2",
                    "OE5 - The A11Y Project Checklist"
                ]
            },

            // --- CO4: Justification & Testing ---
            {
                id: "CO4-ILO1",
                courseOutcome: "Justify the front-end prototype of a proposed software application based on usability testing results and user feedback by providing evidence-based rationale that addresses at least 80% of identified usability issues and aligns with user experience goals.",
                intendedLearningOutcome: "Formulate a usability testing plan with clear metrics and tasks.",
                deliveryWeek: "Week 11",
                allocatedTime: "2 hours",
                topics: [
                    "Usability Testing",
                    "User Research Methodologies"
                ],
                references: [
                    "OE4 - Usability.gov: User Experience Basics",
                    "TB2 - Don't Make Me Think, Revisited"
                ]
            },
            {
                id: "CO4-ILO2",
                courseOutcome: "Justify the front-end prototype of a proposed software application based on usability testing results and user feedback by providing evidence-based rationale that addresses at least 80% of identified usability issues and aligns with user experience goals.",
                intendedLearningOutcome: "Conduct moderated usability tests to gather qualitative and quantitative feedback.",
                deliveryWeek: "Week 12",
                allocatedTime: "4 hours",
                topics: [
                    "Usability Testing",
                    "High-Fidelity Prototyping"
                ],
                references: [
                    "OR1 - 10 Usability Heuristics for User Interface Design",
                    "TB1 - The Design of Everyday Things"
                ]
            },
            {
                id: "CO4-ILO3",
                courseOutcome: "Justify the front-end prototype of a proposed software application based on usability testing results and user feedback by providing evidence-based rationale that addresses at least 80% of identified usability issues and aligns with user experience goals.",
                intendedLearningOutcome: "Propose design iterations based on empirical evidence from usability testing.",
                deliveryWeek: "Week 13",
                allocatedTime: "3 hours",
                topics: [
                    "Usability Testing",
                    "Interaction Design Principles"
                ],
                references: [
                    "OE3 - MIT OpenCourseWare: User Interface Design and Implementation",
                    "OR4 - Laws of UX"
                ]
            }
        ],

        coAssessmentMethodSets: {
            CO1: [
                {
                    value: "Observation Report",
                    description: "Students observe interfaces or environments and document how cognitive and design principles are applied or violated."
                },
                {
                    value: "Interview Synthesis",
                    description: "Students analyze and synthesize interview data into meaningful insights about user behavior and needs."
                },
                {
                    value: "Persona Creation",
                    description: "Students convert research data into representative user personas and empathy profiles."
                }
            ],

            CO2: [
                {
                    value: "Heuristic Evaluation",
                    description: "Students evaluate interfaces using Nielsen’s usability heuristics to identify usability problems."
                },
                {
                    value: "Wireframe Output",
                    description: "Students produce low‑fidelity wireframes that solve identified user and usability problems."
                },
                {
                    value: "UX Critique",
                    description: "Students justify design decisions using UX principles and user‑centered design standards."
                }
            ],

            CO3: [
                {
                    value: "High‑Fidelity Prototype",
                    description: "Students construct interactive high‑fidelity UI prototypes using professional design tools."
                },
                {
                    value: "Usability Test Log",
                    description: "Students record, categorize, and interpret usability testing observations and issues."
                },
                {
                    value: "Interaction Demo",
                    description: "Students demonstrate interactive UI behavior including feedback, micro‑interactions, and transitions."
                }
            ],

            CO4: [
                {
                    value: "Evaluation Report",
                    description: "Students analyze usability test results and justify design quality using evidence."
                },
                {
                    value: "Redesign Proposal",
                    description: "Students propose interface improvements based on usability findings and UX principles."
                },
                {
                    value: "Reflection Paper",
                    description: "Students critically reflect on design, testing, and iteration decisions using UX frameworks."
                }
            ]
        },
        assessments: [
            {
                id: 'A1',
                tlaName: 'Bad Design Hunt',
                phase: 'In-class',
                assessmentMethod: 'Observation Report',
                assessmentDescription:
                    'Students document "bad design" examples and present an analysis of violated cognitive principles (affordance, signifiers, mapping).',
                hasRubric: false
            },

            {
                id: 'A2',
                tlaName: 'Mock Interview Session',
                phase: 'In-class',
                assessmentMethod: 'Interview Synthesis',
                assessmentDescription:
                    'Students summarize the interview findings and reflect on the effectiveness of their non-leading questioning technique.',
                hasRubric: false
            },

            {
                id: 'A3',
                tlaName: 'Research Plan Proposal',
                phase: 'Post-class',
                assessmentMethod: 'Research Plan Document',
                assessmentDescription:
                    'Submission of a formal research plan including objectives, methodology, and screener questions.',
                hasRubric: true,
                rubrics: [
                    { id: 1, criteria: 'Clarity of research objectives', maxScore: '25' },
                    { id: 2, criteria: 'Appropriateness of methodology', maxScore: '25' },
                    { id: 3, criteria: 'Quality of participant screener', maxScore: '10' },
                    { id: 4, criteria: 'Ethical considerations addressed', maxScore: '10' },
                    { id: 5, criteria: 'Organization and completeness', maxScore: '30' }
                ]
            },

            {
                id: 'A4',
                tlaName: 'Persona Workshop',
                phase: 'In-class',
                assessmentMethod: 'Persona Creation',
                assessmentDescription:
                    'Group submission of three distinct user personas (Primary, Secondary, Negative) based on research data.',
                hasRubric: true,
                rubrics: [
                    { id: 1, criteria: 'Accuracy of persona data', maxScore: '10' },
                    { id: 2, criteria: 'Behavioral realism', maxScore: '10' },
                    { id: 3, criteria: 'Use of research evidence', maxScore: '15' },
                    { id: 4, criteria: 'Clarity of goals and pain points', maxScore: '15' },
                    { id: 5, criteria: 'Professional presentation', maxScore: '20' }
                ]
            },

            {
                id: 'A5',
                tlaName: 'Card Sorting Exercise',
                phase: 'In-class',
                assessmentMethod: 'Information Architecture Map',
                assessmentDescription:
                    'Proposed site map for an e-commerce application derived from the card sorting activity.',
                hasRubric: false
            },

            {
                id: 'A6',
                tlaName: 'Heuristic Evaluation Report',
                phase: 'Post-class',
                assessmentMethod: 'Evaluation Report',
                assessmentDescription:
                    'Document detailing at least 5 major usability issues in a selected app with severity ratings.',
                hasRubric: true,
                rubrics: [
                    { id: 1, criteria: 'Correct use of heuristics', maxScore: '25' },
                    { id: 2, criteria: 'Quality of issue identification', maxScore: '5' },
                    { id: 3, criteria: 'Severity rating accuracy', maxScore: '10' },
                    { id: 4, criteria: 'Clarity of explanations', maxScore: '40' },
                    { id: 5, criteria: 'Report structure and readability', maxScore: '20' }
                ]
            },

            {
                id: 'A7',
                tlaName: 'UI Component Audit',
                phase: 'In-class',
                assessmentMethod: 'Audit Checklist',
                assessmentDescription:
                    'Analysis of atomic, molecular, and organism components within a chosen design system.',
                hasRubric: false
            },

            {
                id: 'A8',
                tlaName: 'Crazy 8s Sketching',
                phase: 'In-class',
                assessmentMethod: 'Sketch Output',
                assessmentDescription:
                    'Submission of 8 distinct interface layout sketches generated during the rapid ideation session.',
                hasRubric: false
            },

            {
                id: 'A9',
                tlaName: 'Clickable Prototype Build',
                phase: 'Post-class',
                assessmentMethod: 'High-Fidelity Prototype',
                assessmentDescription:
                    'Fully functional high-fidelity prototype with linked screens submitted via Figma link.',
                hasRubric: true,
                rubrics: [
                    { id: 1, criteria: 'Screen completeness', maxScore: '20' },
                    { id: 2, criteria: 'Navigation and flow', maxScore: '20' },
                    { id: 3, criteria: 'Visual consistency', maxScore: '20' },
                    { id: 4, criteria: 'Interaction quality', maxScore: '20' },
                    { id: 5, criteria: 'Prototype fidelity', maxScore: '20' }
                ]
            },

            {
                id: 'A10',
                tlaName: 'Live Usability Test',
                phase: 'In-class',
                assessmentMethod: 'Usability Test Log',
                assessmentDescription:
                    'Record of observations and critical incidents captured during the moderated testing session.',
                hasRubric: false
            },

            {
                id: 'A11',
                tlaName: 'Accessibility Audit',
                phase: 'In-class',
                assessmentMethod: 'Audit Report',
                assessmentDescription:
                    'Report highlighting accessibility violations found using automated tools and manual checks.',
                hasRubric: true,
                rubrics: [
                    { id: 1, criteria: 'Correct WCAG identification', maxScore: '25' },
                    { id: 2, criteria: 'Accuracy of violations', maxScore: '15' },
                    { id: 3, criteria: 'Use of testing tools', maxScore: '30' },
                    { id: 4, criteria: 'Clarity of explanations', maxScore: '10' },
                    { id: 5, criteria: 'Quality of recommendations', maxScore: '20' }
                ]
            }
        ],
        gradingSystem: [
            {
                co: "CO1",
                ilos: [
                    {
                        id: "ILO1", // Clean ID
                        assessments: ["Intro to Heuristics Brief"],
                        weight: { prelim: "30", midterm: "", semi: "", final: "" },
                        minPassing: "60"
                    },
                    {
                        id: "ILO2",
                        assessments: ["Persona & Scenario Workshop"],
                        weight: { prelim: "40", midterm: "", semi: "", final: "" },
                        minPassing: "60"
                    },
                    {
                        id: "ILO3",
                        assessments: ["User Requirements Review"],
                        weight: { prelim: "30", midterm: "", semi: "", final: "" },
                        minPassing: "60"
                    }
                ]
            },
            {
                co: "CO2",
                ilos: [
                    {
                        id: "ILO1",
                        assessments: ["UI Evaluation Checklist"],
                        weight: { prelim: "", midterm: "30", semi: "", final: "" },
                        minPassing: "60"
                    },
                    {
                        id: "ILO2",
                        assessments: ["Refined User Flow Output"],
                        weight: { prelim: "", midterm: "40", semi: "", final: "" },
                        minPassing: "60"
                    },
                    {
                        id: "ILO3",
                        assessments: ["Heuristic Evaluation Activity"],
                        weight: { prelim: "", midterm: "30", semi: "", final: "" },
                        minPassing: "60"
                    }
                ]
            },
            {
                co: "CO3",
                ilos: [
                    {
                        id: "ILO1",
                        assessments: ["Prototype Usability Test"],
                        weight: { prelim: "", midterm: "", semi: "40", final: "" },
                        minPassing: "60"
                    },
                    {
                        id: "ILO2",
                        assessments: ["Redesign & Reflection Output"],
                        weight: { prelim: "", midterm: "", semi: "30", final: "" },
                        minPassing: "60"
                    },
                    {
                        id: "ILO3",
                        assessments: ["Usability Issue Prioritization Report"],
                        weight: { prelim: "", midterm: "", semi: "30", final: "" },
                        minPassing: "60"
                    }
                ]
            },
            {
                co: "CO4",
                ilos: [
                    {
                        id: "ILO1",
                        assessments: ["User Requirements Review"],
                        weight: { prelim: "", midterm: "", semi: "", final: "30" },
                        minPassing: "60"
                    },
                    {
                        id: "ILO2",
                        assessments: ["Prototype Usability Test"],
                        weight: { prelim: "", midterm: "", semi: "", final: "40" },
                        minPassing: "60"
                    },
                    {
                        id: "ILO3",
                        assessments: ["Redesign & Reflection Output"],
                        weight: { prelim: "", midterm: "", semi: "", final: "30" },
                        minPassing: "60"
                    }
                ]
            }
        ],
    },
]

export const getSyllabusByCode = (code) => syllabiData.find(s => s.code === code);