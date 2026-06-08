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
    {
        code: 'BSCS322L',
        name: 'Software Engineering',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS313L HCI',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'THIRD YEAR',
        sem: '2nd Semester',
        description: 'This course covers the principles, practices, and methodologies of software engineering for building scalable, maintainable, and reliable software systems.',
        references: [
            { id: "TB1", title: "Software Engineering: A Practitioner's Approach", type: "Textbook", authors: "Roger S. Pressman", year: 2019, isbn: "978-1259872976", link: "" },
            { id: "TB2", title: "Software Engineering", type: "Textbook", authors: "Ian Sommerville", year: 2020, isbn: "978-0137035151", link: "" },
            { id: "TB3", title: "Clean Architecture", type: "Textbook", authors: "Robert C. Martin", year: 2017, isbn: "978-0134494166", link: "" },
            { id: "OR1", title: "Agile Manifesto", type: "Online Resources", authors: "Agile Alliance", year: 2001, isbn: "", link: "https://agilemanifesto.org/" },
            { id: "OR2", title: "Git Flow Guide", type: "Online Resources", authors: "Atlassian", year: 2023, isbn: "", link: "https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow" },
            { id: "OE1", title: "Software Engineering Body of Knowledge (SWEBOK)", type: "Open Educational Resources", authors: "IEEE Computer Society", year: 2014, isbn: "", link: "https://www.computer.org/education/bodies-of-knowledge/software-engineering" },
            { id: "OE2", title: "The Cathedral and the Bazaar", type: "Open Educational Resources", authors: "Eric S. Raymond", year: 2001, isbn: "", link: "https://www.oreilly.com/library/view/the-cathedral/0596001088/" }
        ],
        topics: [
            {
                id: "T1", title: "Software Process Models",
                subtopics: [{ id: "S1", value: "Waterfall Model" }, { id: "S2", value: "Agile and Scrum" }, { id: "S3", value: "DevOps and CI/CD" }],
                tlas: [
                    { id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Process Models Lecture", tlaDescription: "Overview of various software development life cycle models and their applications.", laboratory: false },
                    { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Scrum Sprint Simulation", tlaDescription: "Students simulate a Scrum sprint including daily standups, sprint planning, and retrospective.", laboratory: true }
                ]
            },
            {
                id: "T2", title: "Requirements Engineering",
                subtopics: [{ id: "S4", value: "Functional vs Non-functional Requirements" }, { id: "S5", value: "User Stories and Acceptance Criteria" }, { id: "S6", value: "Use Case Modeling" }],
                tlas: [
                    { id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "Requirements Workshop", tlaDescription: "Groups decompose a project brief into user stories with acceptance criteria in a structured workshop.", laboratory: true }
                ]
            },
            {
                id: "T3", title: "Software Architecture & Design",
                subtopics: [{ id: "S7", value: "Architectural Patterns (MVC, Layered, Microservices)" }, { id: "S8", value: "SOLID Principles" }, { id: "S9", value: "Design Patterns (GoF)" }],
                tlas: [
                    { id: "TLA4", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Architecture Patterns Lecture", tlaDescription: "Lecture comparing architectural patterns with real-world case studies.", laboratory: false },
                    { id: "TLA5", classPhase: "In-class", performedBy: "Student", tlaName: "Design Pattern Implementation", tlaDescription: "Students implement Singleton, Factory, and Observer patterns in a coding exercise.", laboratory: true }
                ]
            },
            {
                id: "T4", title: "Software Testing",
                subtopics: [{ id: "S10", value: "Unit Testing and TDD" }, { id: "S11", value: "Integration Testing" }, { id: "S12", value: "Acceptance Testing" }],
                tlas: [
                    { id: "TLA6", classPhase: "In-class", performedBy: "Student", tlaName: "TDD Exercise", tlaDescription: "Students practice Test-Driven Development by writing tests before implementation for a given problem.", laboratory: true },
                    { id: "TLA7", classPhase: "Post-class", performedBy: "Student", tlaName: "Test Suite Report", tlaDescription: "Submission of a comprehensive test suite with coverage report for a mini-project.", laboratory: false }
                ]
            },
            {
                id: "T5", title: "Software Project Management",
                subtopics: [{ id: "S13", value: "Estimation Techniques" }, { id: "S14", value: "Risk Management" }, { id: "S15", value: "Version Control and Collaboration" }],
                tlas: [
                    { id: "TLA8", classPhase: "In-class", performedBy: "Student", tlaName: "Project Planning Session", tlaDescription: "Groups create a project plan including timeline, resource allocation, and risk assessment.", laboratory: true }
                ]
            }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Apply appropriate software process models and methodologies to manage software development projects.', poMappings: ['E', 'I', '', '', '', 'I', '', '', ''] },
            { id: 'CO2', description: 'Analyze and specify software requirements using industry-standard documentation techniques.', poMappings: ['', 'E', 'I', '', '', '', 'E', '', ''] },
            { id: 'CO3', description: 'Design and implement software solutions applying architectural patterns, design principles, and testing strategies.', poMappings: ['', '', 'E', 'E', 'D', '', '', 'I', ''] },
            { id: 'CO4', description: 'Evaluate software quality through systematic testing and apply project management practices for timely delivery.', poMappings: ['D', '', '', '', '', '', '', 'E', 'I'] }
        ],
        coAssessmentMethodSets: {
            CO1: [
                { value: "Requirements Document", description: "Students analyze a project brief and produce a formal software requirements specification document." },
                { value: "Process Model Comparison", description: "Students compare and contrast different software process models for a given project scenario." },
                { value: "Project Plan Proposal", description: "Students develop a project plan including timeline, resource allocation, and risk assessment for a software project." }
            ],
            CO2: [
                { value: "Use Case Diagrams", description: "Students model system functionality using UML use case diagrams with actors and relationships." },
                { value: "User Story Map", description: "Students decompose requirements into a structured user story map with acceptance criteria." },
                { value: "Acceptance Criteria Checklist", description: "Students define measurable acceptance criteria for each functional requirement." }
            ],
            CO3: [
                { value: "System Design Specification", description: "Students produce a detailed system design document covering architecture, components, and interfaces." },
                { value: "Design Patterns Implementation", description: "Students implement Gang of Four design patterns to solve common software design problems." },
                { value: "Architecture Trade-off Analysis", description: "Students evaluate architectural alternatives using ATAM and justify their design decisions." }
            ],
            CO4: [
                { value: "Test Plan Document", description: "Students create a comprehensive test plan covering unit, integration, and acceptance testing strategies." },
                { value: "Code Review Report", description: "Students perform a structured code review and document findings with improvement recommendations." },
                { value: "Sprint Retrospective", description: "Students conduct a retrospective and document lessons learned with actionable process improvements." }
            ]
        },
        assessments: [
            { id: 'A1', tlaName: 'Scrum Sprint Simulation', phase: 'In-class', assessmentMethod: 'Process Model Application', assessmentDescription: 'Students simulate a Scrum sprint and submit a sprint retrospective report evaluating team performance and process adherence.', hasRubric: false },
            { id: 'A2', tlaName: 'Requirements Workshop', phase: 'In-class', assessmentMethod: 'Requirements Specification', assessmentDescription: 'Groups decompose a project brief into user stories with acceptance criteria and submit a formal requirements document.', hasRubric: false },
            { id: 'A3', tlaName: 'Design Pattern Implementation', phase: 'In-class', assessmentMethod: 'Code Implementation', assessmentDescription: 'Students implement Singleton, Factory, and Observer patterns in a cohesive coding exercise demonstrating OOP principles.', hasRubric: false },
            { id: 'A4', tlaName: 'Test Suite Report', phase: 'Post-class', assessmentMethod: 'Test Documentation', assessmentDescription: 'Submission of a comprehensive test suite with coverage metrics, test cases, and a testing summary report.', hasRubric: false }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Apply appropriate software process models and methodologies to manage software development projects.", intendedLearningOutcome: "Differentiate between various software process models based on project characteristics.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Software Process Models"], references: ["TB1 - Software Engineering: A Practitioner's Approach", "OR1 - Agile Manifesto"] },
            { id: "CO1-ILO2", courseOutcome: "Apply appropriate software process models and methodologies to manage software development projects.", intendedLearningOutcome: "Apply Scrum framework to manage a simulated software project.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["Software Process Models"], references: ["TB1 - Software Engineering: A Practitioner's Approach", "OE1 - Software Engineering Body of Knowledge (SWEBOK)"] },
            { id: "CO2-ILO1", courseOutcome: "Analyze and specify software requirements using industry-standard documentation techniques.", intendedLearningOutcome: "Elicit and document functional and non-functional requirements from stakeholders.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["Requirements Engineering"], references: ["TB2 - Software Engineering", "TB3 - Clean Architecture"] },
            { id: "CO2-ILO2", courseOutcome: "Analyze and specify software requirements using industry-standard documentation techniques.", intendedLearningOutcome: "Transform requirements into well-structured user stories with acceptance criteria.", deliveryWeek: "Week 4", allocatedTime: "2 hours", topics: ["Requirements Engineering"], references: ["TB2 - Software Engineering", "OR1 - Agile Manifesto"] },
            { id: "CO3-ILO1", courseOutcome: "Design and implement software solutions applying architectural patterns, design principles, and testing strategies.", intendedLearningOutcome: "Design software architecture using appropriate architectural patterns.", deliveryWeek: "Week 6", allocatedTime: "3 hours", topics: ["Software Architecture & Design"], references: ["TB3 - Clean Architecture", "TB1 - Software Engineering: A Practitioner's Approach"] },
            { id: "CO3-ILO2", courseOutcome: "Design and implement software solutions applying architectural patterns, design principles, and testing strategies.", intendedLearningOutcome: "Implement design patterns to solve common software design problems.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Software Architecture & Design"], references: ["TB3 - Clean Architecture"] },
            { id: "CO3-ILO3", courseOutcome: "Design and implement software solutions applying architectural patterns, design principles, and testing strategies.", intendedLearningOutcome: "Develop unit tests using TDD methodology to ensure software correctness.", deliveryWeek: "Week 9", allocatedTime: "3 hours", topics: ["Software Testing"], references: ["TB1 - Software Engineering: A Practitioner's Approach", "TB2 - Software Engineering"] },
            { id: "CO4-ILO1", courseOutcome: "Evaluate software quality through systematic testing and apply project management practices for timely delivery.", intendedLearningOutcome: "Design and execute a comprehensive test plan for a software system.", deliveryWeek: "Week 10", allocatedTime: "2 hours", topics: ["Software Testing"], references: ["TB2 - Software Engineering"] },
            { id: "CO4-ILO2", courseOutcome: "Evaluate software quality through systematic testing and apply project management practices for timely delivery.", intendedLearningOutcome: "Create project estimates and manage risks in a software development context.", deliveryWeek: "Week 11", allocatedTime: "2 hours", topics: ["Software Project Management"], references: ["OE1 - Software Engineering Body of Knowledge (SWEBOK)", "OE2 - The Cathedral and the Bazaar"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Process Model Report"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Scrum Simulation Output"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Requirements Document"], weight: { prelim: "", midterm: "60", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["User Story Map"], weight: { prelim: "", midterm: "40", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Architecture Design Document"], weight: { prelim: "", midterm: "", semi: "40", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Design Patterns Implementation"], weight: { prelim: "", midterm: "", semi: "30", final: "" }, minPassing: "60" }, { id: "ILO3", assessments: ["TDD Test Suite"], weight: { prelim: "", midterm: "", semi: "30", final: "" }, minPassing: "60" }] },
            { co: "CO4", ilos: [{ id: "ILO1", assessments: ["Test Plan and Results"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }, { id: "ILO2", assessments: ["Project Management Plan"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS351L',
        name: 'Cybersecurity Fundamentals',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS322L Software Engineering',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'THIRD YEAR',
        sem: '2nd Semester',
        description: 'An introduction to cybersecurity principles, threat landscapes, and defensive strategies for protecting systems and data.',
        references: [
            { id: "TB1", title: "Computer Security: Principles and Practice", type: "Textbook", authors: "William Stallings", year: 2018, isbn: "978-0134794105", link: "" },
            { id: "TB2", title: "The Web Application Hacker's Handbook", type: "Textbook", authors: "Dafydd Stuttard, Marcus Pinto", year: 2011, isbn: "978-1118026472", link: "" },
            { id: "TB3", title: "Cybersecurity Essentials", type: "Textbook", authors: "Charles Brooks et al.", year: 2018, isbn: "978-1119362395", link: "" },
            { id: "OR1", title: "OWASP Top Ten", type: "Online Resources", authors: "OWASP Foundation", year: 2021, isbn: "", link: "https://owasp.org/www-project-top-ten/" },
            { id: "OR2", title: "NIST Cybersecurity Framework", type: "Online Resources", authors: "NIST", year: 2018, isbn: "", link: "https://www.nist.gov/cyberframework" },
            { id: "OE1", title: "Cybersecurity & Infrastructure Security Agency Resources", type: "Open Educational Resources", authors: "CISA", year: 2024, isbn: "", link: "https://www.cisa.gov/cybersecurity" }
        ],
        topics: [
            {
                id: "T1", title: "Introduction to Cybersecurity",
                subtopics: [{ id: "S1", value: "CIA Triad" }, { id: "S2", value: "Threat Actors and Attack Vectors" }, { id: "S3", value: "Security Policies and Governance" }],
                tlas: [
                    { id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Security Fundamentals Lecture", tlaDescription: "Introduction to core security concepts, the CIA triad, and common threat actors.", laboratory: false },
                    { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Threat Modeling Exercise", tlaDescription: "Students perform a STRIDE threat modeling exercise on a sample web application.", laboratory: true }
                ]
            },
            {
                id: "T2", title: "Network Security",
                subtopics: [{ id: "S4", value: "Firewalls and IDS/IPS" }, { id: "S5", value: "VPN Protocols" }, { id: "S6", value: "Network Segmentation" }],
                tlas: [
                    { id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "Firewall Configuration Lab", tlaDescription: "Students configure firewall rules using iptables to implement a DMZ architecture.", laboratory: true }
                ]
            },
            {
                id: "T3", title: "Web Application Security",
                subtopics: [{ id: "S7", value: "OWASP Top 10 Overview" }, { id: "S8", value: "SQL Injection and XSS" }, { id: "S9", value: "Authentication and Session Management" }],
                tlas: [
                    { id: "TLA4", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Web Vulnerabilities Lecture", tlaDescription: "Deep dive into OWASP Top 10 vulnerabilities with real-world breach examples.", laboratory: false },
                    { id: "TLA5", classPhase: "In-class", performedBy: "Student", tlaName: "Vulnerability Assessment Lab", tlaDescription: "Students use Burp Suite to identify and exploit SQL injection and XSS in a sandboxed environment.", laboratory: true }
                ]
            },
            {
                id: "T4", title: "Cryptography",
                subtopics: [{ id: "S10", value: "Symmetric vs Asymmetric Encryption" }, { id: "S11", value: "Hashing and Digital Signatures" }, { id: "S12", value: "PKI and Certificate Management" }],
                tlas: [
                    { id: "TLA6", classPhase: "In-class", performedBy: "Student", tlaName: "Encryption Implementation", tlaDescription: "Students implement symmetric and asymmetric encryption in Python and compare performance.", laboratory: true }
                ]
            },
            {
                id: "T5", title: "Incident Response & Forensics",
                subtopics: [{ id: "S13", value: "Incident Response Lifecycle" }, { id: "S14", value: "Digital Forensics Principles" }, { id: "S15", value: "Log Analysis and SIEM" }],
                tlas: [
                    { id: "TLA7", classPhase: "Post-class", performedBy: "Student", tlaName: "Incident Response Plan", tlaDescription: "Students draft a comprehensive incident response plan for a simulated breach scenario.", laboratory: false },
                    { id: "TLA8", classPhase: "In-class", performedBy: "Student", tlaName: "Log Analysis Lab", tlaDescription: "Students analyze system logs using SIEM tools to trace a simulated attack chain.", laboratory: true }
                ]
            }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Analyze cybersecurity threats, attack vectors, and risk landscapes to recommend appropriate security controls.', poMappings: ['E', 'I', '', '', '', '', 'E', '', ''] },
            { id: 'CO2', description: 'Apply cryptographic techniques and network security measures to protect data in transit and at rest.', poMappings: ['', 'E', '', 'E', '', 'I', '', '', ''] },
            { id: 'CO3', description: 'Identify and mitigate common web application vulnerabilities following OWASP standards.', poMappings: ['', '', 'E', '', 'D', '', '', 'I', ''] },
            { id: 'CO4', description: 'Develop incident response plans and apply forensic analysis techniques to investigate security incidents.', poMappings: ['D', '', '', '', '', '', '', 'E', 'I'] }
        ],
        coAssessmentMethodSets: {
            CO1: [
                { value: "Threat Model Diagram", description: "Students create a STRIDE threat model for a given system and document identified threats and mitigations." },
                { value: "Security Policy Document", description: "Students draft an organizational security policy covering access control, data protection, and incident response." },
                { value: "Risk Assessment Matrix", description: "Students perform a qualitative risk assessment and map risks to likelihood and impact categories." }
            ],
            CO2: [
                { value: "Encryption Implementation", description: "Students implement symmetric and asymmetric encryption algorithms to secure data in transit." },
                { value: "Firewall Configuration Report", description: "Students configure firewall rules and document the security posture of a segmented network." },
                { value: "Network Security Audit", description: "Students audit a network setup for security gaps and recommend hardening measures." }
            ],
            CO3: [
                { value: "Vulnerability Assessment Report", description: "Students use scanning tools to identify vulnerabilities and document findings with severity ratings." },
                { value: "Penetration Test Results", description: "Students conduct controlled exploitation of web vulnerabilities and document remediation steps." },
                { value: "Security Code Review", description: "Students review source code for security flaws and produce a findings report with fixes." }
            ],
            CO4: [
                { value: "Incident Response Plan", description: "Students develop a detailed incident response plan aligned with the NIST framework for a simulated organization." },
                { value: "Forensic Analysis Report", description: "Students analyze digital evidence from a simulated breach and reconstruct the attack timeline." },
                { value: "Log Analysis Summary", description: "Students examine system and network logs to detect indicators of compromise and document findings." }
            ]
        },
        assessments: [
            { id: 'A1', tlaName: 'Threat Modeling Exercise', phase: 'In-class', assessmentMethod: 'Threat Model Document', assessmentDescription: 'Students perform STRIDE threat modeling on a sample web application and submit a structured threat analysis report.', hasRubric: false },
            { id: 'A2', tlaName: 'Firewall Configuration Lab', phase: 'In-class', assessmentMethod: 'Network Security Configuration', assessmentDescription: 'Students configure firewall rules using iptables to implement a DMZ architecture and submit a configuration summary.', hasRubric: false },
            { id: 'A3', tlaName: 'Vulnerability Assessment Lab', phase: 'In-class', assessmentMethod: 'Vulnerability Assessment Report', assessmentDescription: 'Students use Burp Suite to identify and document SQL injection and XSS vulnerabilities in a sandboxed environment.', hasRubric: false },
            { id: 'A4', tlaName: 'Incident Response Plan', phase: 'Post-class', assessmentMethod: 'Incident Response Plan Document', assessmentDescription: 'Students draft a comprehensive incident response plan aligned with the NIST framework for a simulated breach scenario.', hasRubric: false }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Analyze cybersecurity threats, attack vectors, and risk landscapes to recommend appropriate security controls.", intendedLearningOutcome: "Identify and categorize common threat actors and attack vectors.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Introduction to Cybersecurity"], references: ["TB1 - Computer Security: Principles and Practice", "OE1 - Cybersecurity & Infrastructure Security Agency Resources"] },
            { id: "CO1-ILO2", courseOutcome: "Analyze cybersecurity threats, attack vectors, and risk landscapes to recommend appropriate security controls.", intendedLearningOutcome: "Perform threat modeling using STRIDE methodology.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["Introduction to Cybersecurity"], references: ["TB1 - Computer Security: Principles and Practice"] },
            { id: "CO2-ILO1", courseOutcome: "Apply cryptographic techniques and network security measures to protect data in transit and at rest.", intendedLearningOutcome: "Implement firewall rules and network segmentation strategies.", deliveryWeek: "Week 3", allocatedTime: "2 hours", topics: ["Network Security"], references: ["TB1 - Computer Security: Principles and Practice"] },
            { id: "CO2-ILO2", courseOutcome: "Apply cryptographic techniques and network security measures to protect data in transit and at rest.", intendedLearningOutcome: "Apply symmetric and asymmetric encryption to secure communications.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Cryptography"], references: ["TB1 - Computer Security: Principles and Practice", "TB3 - Cybersecurity Essentials"] },
            { id: "CO3-ILO1", courseOutcome: "Identify and mitigate common web application vulnerabilities following OWASP standards.", intendedLearningOutcome: "Identify OWASP Top 10 vulnerabilities in web applications.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Web Application Security"], references: ["OR1 - OWASP Top Ten", "TB2 - The Web Application Hacker's Handbook"] },
            { id: "CO3-ILO2", courseOutcome: "Identify and mitigate common web application vulnerabilities following OWASP standards.", intendedLearningOutcome: "Exploit and remediate SQL injection and XSS vulnerabilities.", deliveryWeek: "Week 8", allocatedTime: "3 hours", topics: ["Web Application Security"], references: ["TB2 - The Web Application Hacker's Handbook"] },
            { id: "CO4-ILO1", courseOutcome: "Develop incident response plans and apply forensic analysis techniques to investigate security incidents.", intendedLearningOutcome: "Create an incident response plan aligned with NIST framework.", deliveryWeek: "Week 10", allocatedTime: "2 hours", topics: ["Incident Response & Forensics"], references: ["OR2 - NIST Cybersecurity Framework", "TB3 - Cybersecurity Essentials"] },
            { id: "CO4-ILO2", courseOutcome: "Develop incident response plans and apply forensic analysis techniques to investigate security incidents.", intendedLearningOutcome: "Analyze security logs to reconstruct attack scenarios.", deliveryWeek: "Week 11", allocatedTime: "3 hours", topics: ["Incident Response & Forensics"], references: ["TB3 - Cybersecurity Essentials"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Threat Identification Report"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Threat Model Document"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Network Security Configuration"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Encryption Implementation"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Vulnerability Assessment Report"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Exploit & Remediation Lab"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }] },
            { co: "CO4", ilos: [{ id: "ILO1", assessments: ["Incident Response Plan"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }, { id: "ILO2", assessments: ["Forensic Analysis Report"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS314L',
        name: 'Operating Systems',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS313L HCI',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'THIRD YEAR',
        sem: '1st Semester',
        description: 'This course explores the design and implementation of operating systems, including process management, memory management, file systems, and I/O operations.',
        references: [
            { id: "TB1", title: "Operating System Concepts", type: "Textbook", authors: "Abraham Silberschatz, Peter B. Galvin, Greg Gagne", year: 2018, isbn: "978-1119800361", link: "" },
            { id: "TB2", title: "Modern Operating Systems", type: "Textbook", authors: "Andrew S. Tanenbaum", year: 2014, isbn: "978-0133591620", link: "" },
            { id: "TB3", title: "Operating Systems: Three Easy Pieces", type: "Textbook", authors: "Remzi Arpaci-Dusseau, Andrea Arpaci-Dusseau", year: 2018, isbn: "978-1985086593", link: "" },
            { id: "OR1", title: "Linux Kernel Documentation", type: "Online Resources", authors: "Linux Kernel Community", year: 2024, isbn: "", link: "https://www.kernel.org/doc/" },
            { id: "OE1", title: "MIT 6.828: Operating Systems Engineering", type: "Open Educational Resources", authors: "MIT", year: 2021, isbn: "", link: "https://pdos.csail.mit.edu/6.828/2021/" },
            { id: "OE2", title: "OSDev Wiki", type: "Open Educational Resources", authors: "OSDev Community", year: 2024, isbn: "", link: "https://wiki.osdev.org/" }
        ],
        topics: [
            {
                id: "T1", title: "Operating System Overview",
                subtopics: [{ id: "S1", value: "OS Structures and Services" }, { id: "S2", value: "System Calls" }, { id: "S3", value: "OS Kernel Architecture" }],
                tlas: [
                    { id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "OS Fundamentals Lecture", tlaDescription: "Overview of OS components, kernel architectures, and system call interfaces.", laboratory: false },
                    { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "System Call Tracing Lab", tlaDescription: "Students use strace to trace system calls of running processes and analyze OS interactions.", laboratory: true }
                ]
            },
            {
                id: "T2", title: "Process Management",
                subtopics: [{ id: "S4", value: "Process States and Transitions" }, { id: "S5", value: "CPU Scheduling Algorithms" }, { id: "S6", value: "Inter-process Communication" }],
                tlas: [
                    { id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "CPU Scheduler Simulation", tlaDescription: "Students implement and compare FCFS, SJF, Round Robin scheduling algorithms in C.", laboratory: true },
                    { id: "TLA4", classPhase: "Post-class", performedBy: "Student", tlaName: "IPC Implementation", tlaDescription: "Students implement inter-process communication using pipes and shared memory.", laboratory: true }
                ]
            },
            {
                id: "T3", title: "Threads and Concurrency",
                subtopics: [{ id: "S7", value: "Multithreading Models" }, { id: "S8", value: "Mutexes and Semaphores" }, { id: "S9", value: "Deadlock Detection and Prevention" }],
                tlas: [
                    { id: "TLA5", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Concurrency Lecture", tlaDescription: "Lecture on threading, race conditions, and synchronization primitives.", laboratory: false },
                    { id: "TLA6", classPhase: "In-class", performedBy: "Student", tlaName: "Producer-Consumer Problem", tlaDescription: "Students implement the producer-consumer problem using semaphores to demonstrate synchronization.", laboratory: true }
                ]
            },
            {
                id: "T4", title: "Memory Management",
                subtopics: [{ id: "S10", value: "Paging and Segmentation" }, { id: "S11", value: "Virtual Memory" }, { id: "S12", value: "Page Replacement Algorithms" }],
                tlas: [
                    { id: "TLA7", classPhase: "In-class", performedBy: "Student", tlaName: "Page Replacement Simulator", tlaDescription: "Students simulate FIFO, LRU, and Optimal page replacement algorithms and compare performance.", laboratory: true }
                ]
            },
            {
                id: "T5", title: "File Systems and I/O",
                subtopics: [{ id: "S13", value: "File System Architecture" }, { id: "S14", value: "Disk Scheduling" }, { id: "S15", value: "I/O Management" }],
                tlas: [
                    { id: "TLA8", classPhase: "In-class", performedBy: "Student", tlaName: "File System Investigation", tlaDescription: "Students explore Linux file system structures and implement a simple virtual file system.", laboratory: true }
                ]
            }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Explain the structure and services of modern operating systems and how they manage system resources.', poMappings: ['E', 'I', '', '', '', '', 'I', '', ''] },
            { id: 'CO2', description: 'Implement process and thread management solutions using appropriate scheduling and synchronization techniques.', poMappings: ['', 'E', 'E', '', '', 'I', '', '', ''] },
            { id: 'CO3', description: 'Design memory management strategies applying paging, segmentation, and virtual memory concepts.', poMappings: ['', '', 'D', 'E', '', '', '', 'I', ''] },
            { id: 'CO4', description: 'Analyze file system architectures and I/O management techniques to optimize storage performance.', poMappings: ['E', '', '', '', 'D', '', '', '', 'I'] }
        ],
        coAssessmentMethodSets: {
            CO1: [
                { value: "System Call Analysis Report", description: "Students trace and analyze system calls to understand how user-space programs interact with the OS kernel." },
                { value: "Kernel Architecture Comparison", description: "Students compare monolithic, microkernel, and hybrid kernel architectures with real-world examples." },
                { value: "OS Component Diagram", description: "Students create a detailed diagram of OS components and their interactions." }
            ],
            CO2: [
                { value: "CPU Scheduler Simulation", description: "Students implement and compare FCFS, SJF, and Round Robin scheduling algorithms with performance metrics." },
                { value: "Synchronization Implementation", description: "Students solve the producer-consumer problem using semaphores and mutexes to demonstrate thread safety." },
                { value: "Process State Diagram", description: "Students model process state transitions and document scheduling decisions." }
            ],
            CO3: [
                { value: "Page Replacement Simulation", description: "Students simulate FIFO, LRU, and Optimal page replacement algorithms and evaluate their performance." },
                { value: "Virtual Memory Mapping Report", description: "Students explain address translation using page tables and TLBs with worked examples." },
                { value: "Memory Allocation Algorithm", description: "Students implement contiguous memory allocation strategies and compare fragmentation rates." }
            ],
            CO4: [
                { value: "File System Implementation", description: "Students implement a simple virtual file system with directory structures and allocation strategies." },
                { value: "Disk Scheduling Simulation", description: "Students simulate FCFS, SSTF, SCAN, and C-SCAN disk scheduling algorithms and compare seek times." },
                { value: "I/O Performance Analysis", description: "Students measure and analyze I/O performance under different buffering and caching strategies." }
            ]
        },
        assessments: [
            { id: 'A1', tlaName: 'System Call Tracing Lab', phase: 'In-class', assessmentMethod: 'System Call Analysis Report', assessmentDescription: 'Students use strace to trace system calls of running processes and submit an analysis of OS-user space interactions.', hasRubric: false },
            { id: 'A2', tlaName: 'CPU Scheduler Simulation', phase: 'In-class', assessmentMethod: 'Scheduler Implementation', assessmentDescription: 'Students implement FCFS, SJF, and Round Robin scheduling algorithms and submit a comparative performance analysis.', hasRubric: false },
            { id: 'A3', tlaName: 'Producer-Consumer Problem', phase: 'In-class', assessmentMethod: 'Synchronization Implementation', assessmentDescription: 'Students implement the producer-consumer problem using semaphores to demonstrate thread synchronization.', hasRubric: false },
            { id: 'A4', tlaName: 'Page Replacement Simulator', phase: 'In-class', assessmentMethod: 'Simulation Report', assessmentDescription: 'Students simulate FIFO, LRU, and Optimal page replacement algorithms and submit a performance comparison report.', hasRubric: false }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Explain the structure and services of modern operating systems and how they manage system resources.", intendedLearningOutcome: "Trace and analyze system calls to understand OS-user space interaction.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Operating System Overview"], references: ["TB1 - Operating System Concepts", "OE1 - MIT 6.828: Operating Systems Engineering"] },
            { id: "CO1-ILO2", courseOutcome: "Explain the structure and services of modern operating systems and how they manage system resources.", intendedLearningOutcome: "Compare monolithic, microkernel, and hybrid kernel architectures.", deliveryWeek: "Week 2", allocatedTime: "2 hours", topics: ["Operating System Overview"], references: ["TB2 - Modern Operating Systems"] },
            { id: "CO2-ILO1", courseOutcome: "Implement process and thread management solutions using appropriate scheduling and synchronization techniques.", intendedLearningOutcome: "Implement CPU scheduling algorithms and analyze their performance.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["Process Management"], references: ["TB1 - Operating System Concepts", "TB3 - Operating Systems: Three Easy Pieces"] },
            { id: "CO2-ILO2", courseOutcome: "Implement process and thread management solutions using appropriate scheduling and synchronization techniques.", intendedLearningOutcome: "Solve synchronization problems using mutexes and semaphores.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Threads and Concurrency"], references: ["TB3 - Operating Systems: Three Easy Pieces"] },
            { id: "CO3-ILO1", courseOutcome: "Design memory management strategies applying paging, segmentation, and virtual memory concepts.", intendedLearningOutcome: "Simulate page replacement algorithms and evaluate their efficiency.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Memory Management"], references: ["TB1 - Operating System Concepts", "TB2 - Modern Operating Systems"] },
            { id: "CO3-ILO2", courseOutcome: "Design memory management strategies applying paging, segmentation, and virtual memory concepts.", intendedLearningOutcome: "Explain virtual memory mapping using page tables and TLB.", deliveryWeek: "Week 8", allocatedTime: "2 hours", topics: ["Memory Management"], references: ["TB1 - Operating System Concepts"] },
            { id: "CO4-ILO1", courseOutcome: "Analyze file system architectures and I/O management techniques to optimize storage performance.", intendedLearningOutcome: "Implement disk scheduling algorithms to minimize seek time.", deliveryWeek: "Week 10", allocatedTime: "2 hours", topics: ["File Systems and I/O"], references: ["TB2 - Modern Operating Systems", "OR1 - Linux Kernel Documentation"] },
            { id: "CO4-ILO2", courseOutcome: "Analyze file system architectures and I/O management techniques to optimize storage performance.", intendedLearningOutcome: "Design a simple file system with directory structures and allocation strategies.", deliveryWeek: "Week 11", allocatedTime: "3 hours", topics: ["File Systems and I/O"], references: ["TB3 - Operating Systems: Three Easy Pieces", "OE2 - OSDev Wiki"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["System Call Analysis Report"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Kernel Comparison Essay"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Scheduling Algorithm Simulation"], weight: { prelim: "", midterm: "60", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Synchronization Implementation"], weight: { prelim: "", midterm: "40", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Page Replacement Simulation"], weight: { prelim: "", midterm: "", semi: "60", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Memory Mapping Report"], weight: { prelim: "", midterm: "", semi: "40", final: "" }, minPassing: "60" }] },
            { co: "CO4", ilos: [{ id: "ILO1", assessments: ["Disk Scheduling Implementation"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }, { id: "ILO2", assessments: ["Virtual File System Project"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS331L',
        name: 'Computer Networks',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS314L Operating Systems',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'FOURTH YEAR',
        sem: '1st Semester',
        description: 'A comprehensive study of computer networking protocols, architecture, and technologies that enable data communication across systems.',
        references: [
            { id: "TB1", title: "Computer Networking: A Top-Down Approach", type: "Textbook", authors: "James Kurose, Keith Ross", year: 2020, isbn: "978-0136681556", link: "" },
            { id: "TB2", title: "TCP/IP Illustrated, Volume 1", type: "Textbook", authors: "Kevin Fall, W. Richard Stevens", year: 2011, isbn: "978-0321336316", link: "" },
            { id: "TB3", title: "Data Communications and Networking", type: "Textbook", authors: "Behrouz Forouzan", year: 2017, isbn: "978-1258781818", link: "" },
            { id: "OR1", title: "RFC Editor", type: "Online Resources", authors: "IETF", year: 2024, isbn: "", link: "https://www.rfc-editor.org/" },
            { id: "OE1", title: "Beej's Guide to Network Programming", type: "Open Educational Resources", authors: "Brian Hall", year: 2022, isbn: "", link: "https://beej.us/guide/bgnet/" },
            { id: "OE2", title: "Cisco Networking Academy Free Courses", type: "Open Educational Resources", authors: "Cisco", year: 2024, isbn: "", link: "https://www.netacad.com/" }
        ],
        topics: [
            {
                id: "T1", title: "Network Architecture & Models",
                subtopics: [{ id: "S1", value: "OSI Reference Model" }, { id: "S2", value: "TCP/IP Protocol Suite" }, { id: "S3", value: "Network Topologies" }],
                tlas: [
                    { id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Network Models Lecture", tlaDescription: "Introduction to the OSI and TCP/IP models with layer-by-layer analysis.", laboratory: false },
                    { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Packet Analysis Lab", tlaDescription: "Students use Wireshark to capture and dissect packets, mapping each protocol to its OSI layer.", laboratory: true }
                ]
            },
            {
                id: "T2", title: "Application Layer Protocols",
                subtopics: [{ id: "S4", value: "HTTP/HTTPS" }, { id: "S5", value: "DNS and DHCP" }, { id: "S6", value: "Email Protocols (SMTP, POP3, IMAP)" }],
                tlas: [
                    { id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "HTTP Analysis", tlaDescription: "Students analyze HTTP request/response headers and implement a simple HTTP client.", laboratory: true }
                ]
            },
            {
                id: "T3", title: "Transport Layer",
                subtopics: [{ id: "S7", value: "TCP Flow and Congestion Control" }, { id: "S8", value: "UDP vs TCP" }, { id: "S9", value: "Socket Programming" }],
                tlas: [
                    { id: "TLA4", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Transport Layer Lecture", tlaDescription: "In-depth lecture on TCP state machine, flow control, and congestion avoidance.", laboratory: false },
                    { id: "TLA5", classPhase: "In-class", performedBy: "Student", tlaName: "Socket Programming Lab", tlaDescription: "Students build a client-server application using TCP sockets in Python.", laboratory: true }
                ]
            },
            {
                id: "T4", title: "Network Layer & Routing",
                subtopics: [{ id: "S10", value: "IP Addressing and Subnetting" }, { id: "S11", value: "Routing Algorithms (RIP, OSPF, BGP)" }, { id: "S12", value: "NAT and IPv6" }],
                tlas: [
                    { id: "TLA6", classPhase: "In-class", performedBy: "Student", tlaName: "Subnetting Exercise", tlaDescription: "Students design IP addressing schemes and configure routing tables for a simulated enterprise network.", laboratory: true },
                    { id: "TLA7", classPhase: "Post-class", performedBy: "Student", tlaName: "Routing Protocol Simulation", tlaDescription: "Students simulate OSPF and BGP routing using Mininet and analyze convergence times.", laboratory: true }
                ]
            },
            {
                id: "T5", title: "Link Layer & Physical Layer",
                subtopics: [{ id: "S13", value: "Ethernet and MAC Addressing" }, { id: "S14", value: "ARP and Switching" }, { id: "S15", value: "Wireless Networks" }],
                tlas: [
                    { id: "TLA8", classPhase: "In-class", performedBy: "Student", tlaName: "Switch Configuration Lab", tlaDescription: "Students configure VLANs and STP on simulated switches using Packet Tracer.", laboratory: true }
                ]
            }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Analyze network architectures using the OSI and TCP/IP models to explain data flow across networks.', poMappings: ['E', 'I', '', '', '', '', 'I', '', ''] },
            { id: 'CO2', description: 'Implement application and transport layer protocols through socket programming and traffic analysis.', poMappings: ['', 'E', 'E', '', '', 'I', '', '', ''] },
            { id: 'CO3', description: 'Design IP addressing schemes and configure routing protocols for enterprise networks.', poMappings: ['', '', 'D', 'E', '', '', '', 'I', ''] },
            { id: 'CO4', description: 'Configure link layer technologies including Ethernet switching, VLANs, and wireless networks.', poMappings: ['D', '', '', '', 'E', '', '', '', 'I'] }
        ],
        coAssessmentMethodSets: {
            CO1: [
                { value: "Network Topology Diagram", description: "Students design and draw a network topology mapping devices to OSI layers with protocol annotations." },
                { value: "Protocol Stack Analysis", description: "Students capture network traffic and map each packet to its corresponding OSI or TCP/IP layer." },
                { value: "Packet Capture Report", description: "Students use Wireshark to capture packets and document protocol headers and data flow patterns." }
            ],
            CO2: [
                { value: "Socket Program Implementation", description: "Students build a TCP client-server application in Python demonstrating reliable data transmission." },
                { value: "HTTP Traffic Analysis", description: "Students analyze HTTP request-response pairs and document caching, compression, and connection behavior." },
                { value: "TCP State Diagram", description: "Students trace TCP connection states and document the three-way handshake and teardown process." }
            ],
            CO3: [
                { value: "Subnet Design Document", description: "Students design an IP addressing scheme with VLSM for a multi-branch enterprise network." },
                { value: "Routing Table Configuration", description: "Students configure static and dynamic routing tables and verify connectivity across routers." },
                { value: "OSPF/BGP Simulation", description: "Students simulate OSPF and BGP routing protocols and analyze route convergence and path selection." }
            ],
            CO4: [
                { value: "VLAN Configuration Report", description: "Students configure VLANs and inter-VLAN routing on managed switches and document the setup." },
                { value: "ARP Analysis", description: "Students capture and analyze ARP packets to understand MAC-to-IP address resolution." },
                { value: "Ethernet Frame Structure Diagram", description: "Students dissect Ethernet frames and document header fields including MAC addresses and CRC." }
            ]
        },
        assessments: [
            { id: 'A1', tlaName: 'Packet Analysis Lab', phase: 'In-class', assessmentMethod: 'Packet Analysis Report', assessmentDescription: 'Students use Wireshark to capture and dissect network packets, mapping each protocol to its OSI layer.', hasRubric: false },
            { id: 'A2', tlaName: 'Socket Programming Lab', phase: 'In-class', assessmentMethod: 'Socket Program Implementation', assessmentDescription: 'Students build a TCP client-server application in Python demonstrating reliable data transmission.', hasRubric: false },
            { id: 'A3', tlaName: 'Subnetting Exercise', phase: 'In-class', assessmentMethod: 'Subnet Design Document', assessmentDescription: 'Students design IP addressing schemes and configure routing tables for a simulated enterprise network topology.', hasRubric: false },
            { id: 'A4', tlaName: 'Routing Protocol Simulation', phase: 'Post-class', assessmentMethod: 'Routing Simulation Report', assessmentDescription: 'Students simulate OSPF and BGP routing using Mininet and analyze convergence times in a multi-area network.', hasRubric: false }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Analyze network architectures using the OSI and TCP/IP models to explain data flow across networks.", intendedLearningOutcome: "Identify protocols at each OSI layer through packet-level analysis.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Network Architecture & Models"], references: ["TB1 - Computer Networking: A Top-Down Approach", "OE1 - Beej's Guide to Network Programming"] },
            { id: "CO1-ILO2", courseOutcome: "Analyze network architectures using the OSI and TCP/IP models to explain data flow across networks.", intendedLearningOutcome: "Describe encapsulation and data flow through network layers.", deliveryWeek: "Week 2", allocatedTime: "2 hours", topics: ["Network Architecture & Models"], references: ["TB3 - Data Communications and Networking"] },
            { id: "CO2-ILO1", courseOutcome: "Implement application and transport layer protocols through socket programming and traffic analysis.", intendedLearningOutcome: "Analyze HTTP and DNS protocol interactions using traffic captures.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["Application Layer Protocols"], references: ["TB1 - Computer Networking: A Top-Down Approach", "OR1 - RFC Editor"] },
            { id: "CO2-ILO2", courseOutcome: "Implement application and transport layer protocols through socket programming and traffic analysis.", intendedLearningOutcome: "Build a client-server application using TCP socket programming.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Transport Layer"], references: ["OE1 - Beej's Guide to Network Programming", "TB2 - TCP/IP Illustrated, Volume 1"] },
            { id: "CO3-ILO1", courseOutcome: "Design IP addressing schemes and configure routing protocols for enterprise networks.", intendedLearningOutcome: "Design subnet masks and IP allocation schemes for network segmentation.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Network Layer & Routing"], references: ["TB1 - Computer Networking: A Top-Down Approach"] },
            { id: "CO3-ILO2", courseOutcome: "Design IP addressing schemes and configure routing protocols for enterprise networks.", intendedLearningOutcome: "Configure OSPF routing protocol for dynamic routing in a multi-area network.", deliveryWeek: "Week 8", allocatedTime: "3 hours", topics: ["Network Layer & Routing"], references: ["TB3 - Data Communications and Networking", "OE2 - Cisco Networking Academy Free Courses"] },
            { id: "CO4-ILO1", courseOutcome: "Configure link layer technologies including Ethernet switching, VLANs, and wireless networks.", intendedLearningOutcome: "Configure VLANs and inter-VLAN routing on managed switches.", deliveryWeek: "Week 10", allocatedTime: "2 hours", topics: ["Link Layer & Physical Layer"], references: ["TB3 - Data Communications and Networking"] },
            { id: "CO4-ILO2", courseOutcome: "Configure link layer technologies including Ethernet switching, VLANs, and wireless networks.", intendedLearningOutcome: "Analyze ARP and Ethernet frame structures in a switched network.", deliveryWeek: "Week 11", allocatedTime: "2 hours", topics: ["Link Layer & Physical Layer"], references: ["TB2 - TCP/IP Illustrated, Volume 1"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Packet Analysis Report"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["OSI Layer Quiz"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Protocol Analysis Lab"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Socket Programming Project"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Subnet Design Exercise"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Routing Protocol Lab"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }] },
            { co: "CO4", ilos: [{ id: "ILO1", assessments: ["VLAN Configuration Lab"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }, { id: "ILO2", assessments: ["Ethernet Frame Analysis"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'IT 312',
        name: 'Web Systems & Technologies',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS313L HCI',
        class: 'Information Technology',
        cmo: '25 S, 2015',
        year: 'THIRD YEAR',
        sem: '2nd Semester',
        description: 'A study of web technologies, frameworks, and best practices for developing modern web applications.',
        references: [
            { id: "TB1", title: "Learning Web Design", type: "Textbook", authors: "Jennifer Robbins", year: 2018, isbn: "978-1491960202", link: "" },
            { id: "TB2", title: "Eloquent JavaScript", type: "Textbook", authors: "Marijn Haverbeke", year: 2018, isbn: "978-1593279509", link: "" },
            { id: "TB3", title: "HTML and CSS: Design and Build Websites", type: "Textbook", authors: "Jon Duckett", year: 2011, isbn: "978-1118008188", link: "" },
            { id: "OR1", title: "MDN Web Docs", type: "Online Resources", authors: "Mozilla Developer Network", year: 2024, isbn: "", link: "https://developer.mozilla.org/" },
            { id: "OE1", title: "FreeCodeCamp Web Design Certification", type: "Open Educational Resources", authors: "FreeCodeCamp", year: 2024, isbn: "", link: "https://www.freecodecamp.org/learn/" },
            { id: "OE2", title: "The Odin Project", type: "Open Educational Resources", authors: "The Odin Project", year: 2024, isbn: "", link: "https://www.theodinproject.com/" }
        ],
        topics: [
            {
                id: "T1", title: "HTML5 & Semantic Markup",
                subtopics: [{ id: "S1", value: "Document Structure and Elements" }, { id: "S2", value: "Forms and Input Validation" }, { id: "S3", value: "Accessibility and ARIA" }],
                tlas: [
                    { id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "HTML Fundamentals Lecture", tlaDescription: "Overview of HTML5 semantic elements, form controls, and accessibility best practices.", laboratory: false },
                    { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Semantic HTML Markup", tlaDescription: "Students convert a plain document into semantic HTML5 with proper accessibility attributes.", laboratory: true }
                ]
            },
            {
                id: "T2", title: "CSS3 & Responsive Design",
                subtopics: [{ id: "S4", value: "Flexbox and Grid Layout" }, { id: "S5", value: "Media Queries" }, { id: "S6", value: "CSS Animations" }],
                tlas: [
                    { id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "Responsive Layout Challenge", tlaDescription: "Students build a responsive landing page using Flexbox and CSS Grid that adapts to mobile, tablet, and desktop.", laboratory: true }
                ]
            },
            {
                id: "T3", title: "JavaScript & DOM Manipulation",
                subtopics: [{ id: "S7", value: "Variables, Functions, and Events" }, { id: "S8", value: "DOM Traversal and Manipulation" }, { id: "S9", value: "Fetch API and AJAX" }],
                tlas: [
                    { id: "TLA4", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "JavaScript Core Concepts Lecture", tlaDescription: "Lecture on ES6+ features, closures, promises, and async/await patterns.", laboratory: false },
                    { id: "TLA5", classPhase: "In-class", performedBy: "Student", tlaName: "Interactive DOM Project", tlaDescription: "Students build an interactive to-do list application using vanilla JavaScript DOM manipulation.", laboratory: true }
                ]
            },
            {
                id: "T4", title: "Frontend Frameworks (React)",
                subtopics: [{ id: "S10", value: "Components and Props" }, { id: "S11", value: "State Management" }, { id: "S12", value: "React Hooks" }],
                tlas: [
                    { id: "TLA6", classPhase: "In-class", performedBy: "Student", tlaName: "React Component Lab", tlaDescription: "Students build a component tree with state management using React hooks (useState, useEffect).", laboratory: true },
                    { id: "TLA7", classPhase: "Post-class", performedBy: "Student", tlaName: "Single Page Application Project", tlaDescription: "Students develop a complete SPA with routing, API integration, and state management.", laboratory: true }
                ]
            },
            {
                id: "T5", title: "Web APIs & Backend Integration",
                subtopics: [{ id: "S13", value: "RESTful API Design" }, { id: "S14", value: "Authentication and JWT" }, { id: "S15", value: "WebSockets and Real-time Data" }],
                tlas: [
                    { id: "TLA8", classPhase: "In-class", performedBy: "Student", tlaName: "API Integration Lab", tlaDescription: "Students consume a REST API using Fetch and display data dynamically in a React frontend.", laboratory: true }
                ]
            }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Develop semantic, accessible HTML5 structures with responsive CSS3 layouts.', poMappings: ['E', 'I', '', '', '', '', 'I', '', ''] },
            { id: 'CO2', description: 'Implement interactive client-side functionality using JavaScript and DOM manipulation.', poMappings: ['', 'E', 'E', '', '', 'I', '', '', ''] },
            { id: 'CO3', description: 'Build modern single-page applications using React framework with component-based architecture.', poMappings: ['', '', 'D', 'E', '', '', '', 'I', ''] },
            { id: 'CO4', description: 'Integrate web applications with backend services through RESTful APIs and authentication.', poMappings: ['D', '', '', '', 'E', '', '', '', 'I'] }
        ],
        coAssessmentMethodSets: {
            CO1: [
                { value: "Semantic HTML Document", description: "Students convert a plain document into semantic HTML5 with proper accessibility attributes and ARIA labels." },
                { value: "Responsive Layout Design", description: "Students build a responsive web page using Flexbox and CSS Grid that adapts to all screen sizes." },
                { value: "Accessibility Audit Report", description: "Students audit a web page for WCAG compliance and document violations with remediation recommendations." }
            ],
            CO2: [
                { value: "Interactive Web Application", description: "Students build an interactive to-do list application using JavaScript DOM manipulation and event handling." },
                { value: "DOM Manipulation Exercise", description: "Students demonstrate DOM traversal and manipulation techniques to dynamically update page content." },
                { value: "API Integration Demo", description: "Students consume a REST API using the Fetch API and display retrieved data in a dynamic interface." }
            ],
            CO3: [
                { value: "React Component Library", description: "Students build a set of reusable React components with props, state, and proper component composition." },
                { value: "SPA Project Submission", description: "Students develop a complete single-page application with React Router and state management." },
                { value: "State Management Implementation", description: "Students implement global state management using React Context or Redux for a multi-page application." }
            ],
            CO4: [
                { value: "REST API Design Document", description: "Students design a RESTful API specification with endpoints, request-response formats, and status codes." },
                { value: "Authentication Implementation", description: "Students implement JWT-based authentication in a full-stack web application." },
                { value: "Full-Stack Integration", description: "Students integrate a React frontend with a backend API and demonstrate end-to-end data flow." }
            ]
        },
        assessments: [
            { id: 'A1', tlaName: 'Semantic HTML Markup', phase: 'In-class', assessmentMethod: 'HTML Markup Output', assessmentDescription: 'Students convert a plain document into semantic HTML5 with proper accessibility attributes and ARIA labels.', hasRubric: false },
            { id: 'A2', tlaName: 'Responsive Layout Challenge', phase: 'In-class', assessmentMethod: 'Responsive Layout Output', assessmentDescription: 'Students build a responsive landing page using Flexbox and CSS Grid that adapts to mobile, tablet, and desktop viewports.', hasRubric: false },
            { id: 'A3', tlaName: 'Interactive DOM Project', phase: 'In-class', assessmentMethod: 'Interactive JavaScript Application', assessmentDescription: 'Students build an interactive to-do list application using vanilla JavaScript DOM manipulation and event handling.', hasRubric: false },
            { id: 'A4', tlaName: 'Single Page Application Project', phase: 'Post-class', assessmentMethod: 'SPA Project Submission', assessmentDescription: 'Students develop a complete SPA with React routing, API integration, and state management.', hasRubric: false }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Develop semantic, accessible HTML5 structures with responsive CSS3 layouts.", intendedLearningOutcome: "Construct semantic HTML5 pages with proper accessibility attributes.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["HTML5 & Semantic Markup"], references: ["TB3 - HTML and CSS: Design and Build Websites", "OR1 - MDN Web Docs"] },
            { id: "CO1-ILO2", courseOutcome: "Develop semantic, accessible HTML5 structures with responsive CSS3 layouts.", intendedLearningOutcome: "Create responsive layouts using Flexbox and CSS Grid.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["CSS3 & Responsive Design"], references: ["TB1 - Learning Web Design", "OR1 - MDN Web Docs"] },
            { id: "CO2-ILO1", courseOutcome: "Implement interactive client-side functionality using JavaScript and DOM manipulation.", intendedLearningOutcome: "Manipulate the DOM to create dynamic user interfaces.", deliveryWeek: "Week 4", allocatedTime: "3 hours", topics: ["JavaScript & DOM Manipulation"], references: ["TB2 - Eloquent JavaScript", "OE1 - FreeCodeCamp Web Design Certification"] },
            { id: "CO2-ILO2", courseOutcome: "Implement interactive client-side functionality using JavaScript and DOM manipulation.", intendedLearningOutcome: "Fetch and display data from web APIs using Fetch API.", deliveryWeek: "Week 5", allocatedTime: "2 hours", topics: ["JavaScript & DOM Manipulation"], references: ["TB2 - Eloquent JavaScript", "OR1 - MDN Web Docs"] },
            { id: "CO3-ILO1", courseOutcome: "Build modern single-page applications using React framework with component-based architecture.", intendedLearningOutcome: "Build reusable React components with props and state.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Frontend Frameworks (React)"], references: ["OR1 - MDN Web Docs", "OE2 - The Odin Project"] },
            { id: "CO3-ILO2", courseOutcome: "Build modern single-page applications using React framework with component-based architecture.", intendedLearningOutcome: "Implement React hooks for state management and side effects.", deliveryWeek: "Week 8", allocatedTime: "3 hours", topics: ["Frontend Frameworks (React)"], references: ["OE2 - The Odin Project"] },
            { id: "CO4-ILO1", courseOutcome: "Integrate web applications with backend services through RESTful APIs and authentication.", intendedLearningOutcome: "Design and consume RESTful API endpoints.", deliveryWeek: "Week 10", allocatedTime: "2 hours", topics: ["Web APIs & Backend Integration"], references: ["OR1 - MDN Web Docs"] },
            { id: "CO4-ILO2", courseOutcome: "Integrate web applications with backend services through RESTful APIs and authentication.", intendedLearningOutcome: "Implement JWT authentication in a full-stack web application.", deliveryWeek: "Week 11", allocatedTime: "3 hours", topics: ["Web APIs & Backend Integration"], references: ["OE1 - FreeCodeCamp Web Design Certification"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Semantic HTML Project"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Responsive Layout Exercise"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Interactive JS Project"], weight: { prelim: "", midterm: "60", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["API Integration Lab"], weight: { prelim: "", midterm: "40", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["React Component Library"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["SPA Project Milestone"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }] },
            { co: "CO4", ilos: [{ id: "ILO1", assessments: ["API Design Document"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }, { id: "ILO2", assessments: ["Full-stack Integration Project"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS411L',
        name: 'Machine Learning',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS121 Discrete Mathematics',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'FOURTH YEAR',
        sem: '1st Semester',
        description: 'An introduction to machine learning algorithms, supervised and unsupervised learning, and practical applications of AI technologies.',
        references: [
            { id: "TB1", title: "Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow", type: "Textbook", authors: "Aurelien Geron", year: 2022, isbn: "978-1098125974", link: "" },
            { id: "TB2", title: "Introduction to Statistical Learning", type: "Textbook", authors: "Gareth James, Daniela Witten, Trevor Hastie, Robert Tibshirani", year: 2021, isbn: "978-1071614186", link: "" },
            { id: "TB3", title: "Pattern Recognition and Machine Learning", type: "Textbook", authors: "Christopher Bishop", year: 2006, isbn: "978-0387310732", link: "" },
            { id: "OR1", title: "Scikit-learn Documentation", type: "Online Resources", authors: "Scikit-learn Developers", year: 2024, isbn: "", link: "https://scikit-learn.org/stable/documentation.html" },
            { id: "OE1", title: "Andrew Ng's Machine Learning Course (Coursera)", type: "Open Educational Resources", authors: "Andrew Ng, Stanford University", year: 2022, isbn: "", link: "https://www.coursera.org/learn/machine-learning" },
            { id: "OE2", title: "Kaggle Learn: Machine Learning", type: "Open Educational Resources", authors: "Kaggle", year: 2024, isbn: "", link: "https://www.kaggle.com/learn" }
        ],
        topics: [
            {
                id: "T1", title: "Introduction to Machine Learning",
                subtopics: [{ id: "S1", value: "Types of ML: Supervised, Unsupervised, Reinforcement" }, { id: "S2", value: "The ML Pipeline" }, { id: "S3", value: "Overfitting and Underfitting" }],
                tlas: [
                    { id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "ML Fundamentals Lecture", tlaDescription: "Introduction to ML paradigms, the bias-variance tradeoff, and evaluation metrics.", laboratory: false },
                    { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Exploratory Data Analysis", tlaDescription: "Students perform EDA on a real dataset using Pandas and visualize patterns with Matplotlib.", laboratory: true }
                ]
            },
            {
                id: "T2", title: "Linear Regression & Regularization",
                subtopics: [{ id: "S4", value: "Simple and Multiple Linear Regression" }, { id: "S5", value: "Gradient Descent" }, { id: "S6", value: "Ridge and Lasso Regularization" }],
                tlas: [
                    { id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "Regression from Scratch", tlaDescription: "Students implement linear regression using gradient descent in Python and compare with Scikit-learn.", laboratory: true },
                    { id: "TLA4", classPhase: "Post-class", performedBy: "Student", tlaName: "Regression Analysis Report", tlaDescription: "Students apply regression techniques to a house price prediction dataset and compare model performances.", laboratory: false }
                ]
            },
            {
                id: "T3", title: "Classification Algorithms",
                subtopics: [{ id: "S7", value: "Logistic Regression" }, { id: "S8", value: "Decision Trees and Random Forests" }, { id: "S9", value: "Support Vector Machines" }],
                tlas: [
                    { id: "TLA5", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Classification Lecture", tlaDescription: "Lecture on classification algorithms, decision boundaries, and ensemble methods.", laboratory: false },
                    { id: "TLA6", classPhase: "In-class", performedBy: "Student", tlaName: "Classifier Comparison Lab", tlaDescription: "Students train and compare multiple classifiers on a classification dataset.", laboratory: true }
                ]
            },
            {
                id: "T4", title: "Unsupervised Learning",
                subtopics: [{ id: "S10", value: "K-Means Clustering" }, { id: "S11", value: "Hierarchical Clustering" }, { id: "S12", value: "Dimensionality Reduction (PCA)" }],
                tlas: [
                    { id: "TLA7", classPhase: "In-class", performedBy: "Student", tlaName: "Clustering Exercise", tlaDescription: "Students apply K-Means and DBSCAN clustering to customer segmentation data.", laboratory: true }
                ]
            },
            {
                id: "T5", title: "Neural Networks & Deep Learning",
                subtopics: [{ id: "S13", value: "Perceptron and Multi-layer Networks" }, { id: "S14", value: "Backpropagation" }, { id: "S15", value: "Introduction to CNNs" }],
                tlas: [
                    { id: "TLA8", classPhase: "In-class", performedBy: "Student", tlaName: "Neural Network from Scratch", tlaDescription: "Students implement a feedforward neural network with backpropagation using NumPy.", laboratory: true },
                    { id: "TLA9", classPhase: "Post-class", performedBy: "Student", tlaName: "Deep Learning Project", tlaDescription: "Students build and train a CNN for image classification using TensorFlow/Keras.", laboratory: true }
                ]
            }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Apply the ML pipeline including data preprocessing, feature engineering, and model evaluation to solve real-world problems.', poMappings: ['E', 'I', '', '', '', '', 'E', '', ''] },
            { id: 'CO2', description: 'Implement regression and classification algorithms using appropriate libraries and evaluate model performance.', poMappings: ['', 'E', 'E', 'I', '', '', '', '', ''] },
            { id: 'CO3', description: 'Apply unsupervised learning techniques for clustering and dimensionality reduction.', poMappings: ['', '', 'D', 'E', '', 'I', '', '', ''] },
            { id: 'CO4', description: 'Build and train neural network models for supervised learning tasks using deep learning frameworks.', poMappings: ['D', '', '', '', 'E', '', '', 'I', ''] }
        ],
        coAssessmentMethodSets: {
            CO1: [
                { value: "EDA Report", description: "Students perform exploratory data analysis on a real dataset using Pandas and visualize patterns with Matplotlib." },
                { value: "Data Preprocessing Pipeline", description: "Students build a data preprocessing pipeline including cleaning, feature encoding, and scaling." },
                { value: "Model Evaluation Summary", description: "Students split data into training and test sets, train a baseline model, and report performance metrics." }
            ],
            CO2: [
                { value: "Linear Regression Implementation", description: "Students implement linear regression using gradient descent and evaluate using MSE and R-squared." },
                { value: "Classifier Comparison Report", description: "Students train and compare Logistic Regression, Decision Trees, and SVM using accuracy and F1-score." },
                { value: "Feature Engineering Analysis", description: "Students create new features and evaluate their impact on model performance through ablation studies." }
            ],
            CO3: [
                { value: "Clustering Analysis Report", description: "Students apply K-Means clustering and evaluate cluster quality using silhouette score and elbow method." },
                { value: "PCA Visualization", description: "Students apply PCA for dimensionality reduction and create 2D/3D visualizations of high-dimensional data." },
                { value: "Dimensionality Reduction Summary", description: "Students compare PCA, t-SNE, and feature selection techniques and document trade-offs." }
            ],
            CO4: [
                { value: "Neural Network Implementation", description: "Students implement a feedforward neural network with backpropagation from scratch using NumPy." },
                { value: "CNN Model Submission", description: "Students build and train a convolutional neural network for image classification using TensorFlow or PyTorch." },
                { value: "Model Performance Report", description: "Students evaluate model performance using confusion matrices, ROC curves, and training history plots." }
            ]
        },
        assessments: [
            { id: 'A1', tlaName: 'Exploratory Data Analysis', phase: 'In-class', assessmentMethod: 'EDA Report', assessmentDescription: 'Students perform EDA on a real dataset using Pandas and submit visualizations identifying key patterns and anomalies.', hasRubric: false },
            { id: 'A2', tlaName: 'Regression from Scratch', phase: 'In-class', assessmentMethod: 'Regression Implementation', assessmentDescription: 'Students implement linear regression using gradient descent in Python and compare performance with Scikit-learn.', hasRubric: false },
            { id: 'A3', tlaName: 'Classifier Comparison Lab', phase: 'In-class', assessmentMethod: 'Classifier Evaluation Report', assessmentDescription: 'Students train and compare Logistic Regression, Decision Trees, and SVM classifiers on a dataset.', hasRubric: false },
            { id: 'A4', tlaName: 'Deep Learning Project', phase: 'Post-class', assessmentMethod: 'Deep Learning Model Submission', assessmentDescription: 'Students build and train a CNN for image classification using TensorFlow/Keras and submit a model performance report.', hasRubric: false }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Apply the ML pipeline including data preprocessing, feature engineering, and model evaluation to solve real-world problems.", intendedLearningOutcome: "Preprocess and visualize datasets using Pandas and Matplotlib.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Introduction to Machine Learning"], references: ["TB1 - Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow", "OE2 - Kaggle Learn: Machine Learning"] },
            { id: "CO1-ILO2", courseOutcome: "Apply the ML pipeline including data preprocessing, feature engineering, and model evaluation to solve real-world problems.", intendedLearningOutcome: "Identify and mitigate overfitting using regularization and cross-validation.", deliveryWeek: "Week 2", allocatedTime: "2 hours", topics: ["Introduction to Machine Learning"], references: ["TB2 - Introduction to Statistical Learning"] },
            { id: "CO2-ILO1", courseOutcome: "Implement regression and classification algorithms using appropriate libraries and evaluate model performance.", intendedLearningOutcome: "Implement linear regression with gradient descent and evaluate using MSE and R-squared.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["Linear Regression & Regularization"], references: ["TB1 - Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow", "OR1 - Scikit-learn Documentation"] },
            { id: "CO2-ILO2", courseOutcome: "Implement regression and classification algorithms using appropriate libraries and evaluate model performance.", intendedLearningOutcome: "Train and evaluate classification models using accuracy, precision, recall, and F1-score.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Classification Algorithms"], references: ["TB2 - Introduction to Statistical Learning", "OE1 - Andrew Ng's Machine Learning Course (Coursera)"] },
            { id: "CO3-ILO1", courseOutcome: "Apply unsupervised learning techniques for clustering and dimensionality reduction.", intendedLearningOutcome: "Apply K-Means clustering for customer segmentation and evaluate using silhouette score.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Unsupervised Learning"], references: ["TB1 - Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow"] },
            { id: "CO3-ILO2", courseOutcome: "Apply unsupervised learning techniques for clustering and dimensionality reduction.", intendedLearningOutcome: "Reduce dimensionality using PCA for data visualization and feature extraction.", deliveryWeek: "Week 8", allocatedTime: "2 hours", topics: ["Unsupervised Learning"], references: ["TB3 - Pattern Recognition and Machine Learning"] },
            { id: "CO4-ILO1", courseOutcome: "Build and train neural network models for supervised learning tasks using deep learning frameworks.", intendedLearningOutcome: "Implement a multi-layer perceptron with backpropagation from scratch.", deliveryWeek: "Week 10", allocatedTime: "3 hours", topics: ["Neural Networks & Deep Learning"], references: ["TB3 - Pattern Recognition and Machine Learning"] },
            { id: "CO4-ILO2", courseOutcome: "Build and train neural network models for supervised learning tasks using deep learning frameworks.", intendedLearningOutcome: "Build and train a CNN for image classification using TensorFlow.", deliveryWeek: "Week 11", allocatedTime: "3 hours", topics: ["Neural Networks & Deep Learning"], references: ["TB1 - Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow", "OE1 - Andrew Ng's Machine Learning Course (Coursera)"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["EDA Report"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Cross-validation Lab"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Regression Implementation"], weight: { prelim: "", midterm: "60", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Classifier Comparison Lab"], weight: { prelim: "", midterm: "40", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Clustering Analysis"], weight: { prelim: "", midterm: "", semi: "60", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["PCA Visualization"], weight: { prelim: "", midterm: "", semi: "40", final: "" }, minPassing: "60" }] },
            { co: "CO4", ilos: [{ id: "ILO1", assessments: ["Neural Network from Scratch"], weight: { prelim: "", midterm: "", semi: "", final: "40" }, minPassing: "60" }, { id: "ILO2", assessments: ["CNN Image Classifier"], weight: { prelim: "", midterm: "", semi: "", final: "60" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'IT 211',
        name: 'Database Management Systems',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS313L HCI',
        class: 'Information Technology',
        cmo: '25 S, 2015',
        year: 'SECOND YEAR',
        sem: '2nd Semester',
        description: 'A comprehensive study of relational database design, SQL, normalization, and database management system architecture.',
        references: [
            { id: "TB1", title: "Database System Concepts", type: "Textbook", authors: "Abraham Silberschatz, Henry Korth, S. Sudarshan", year: 2019, isbn: "978-0078022159", link: "" },
            { id: "TB2", title: "Database Systems: A Practical Approach to Design, Implementation, and Management", type: "Textbook", authors: "Thomas Connolly, Carolyn Begg", year: 2014, isbn: "978-0132943260", link: "" },
            { id: "TB3", title: "Learning SQL", type: "Textbook", authors: "Alan Beaulieu", year: 2020, isbn: "978-1492057611", link: "" },
            { id: "OR1", title: "PostgreSQL Documentation", type: "Online Resources", authors: "PostgreSQL Global Development Group", year: 2024, isbn: "", link: "https://www.postgresql.org/docs/" },
            { id: "OE1", title: "SQL Tutorial (W3Schools)", type: "Open Educational Resources", authors: "W3Schools", year: 2024, isbn: "", link: "https://www.w3schools.com/sql/" },
            { id: "OE2", title: "Stanford Database Course", type: "Open Educational Resources", authors: "Prof. Jennifer Widom, Stanford University", year: 2013, isbn: "", link: "https://www.youtube.com/playlist?list=PLroEs25KGvwzmTgsSGSH8jLf8YaqYpsFa" }
        ],
        topics: [
            {
                id: "T1", title: "Relational Database Concepts",
                subtopics: [{ id: "S1", value: "Relational Model and Terminology" }, { id: "S2", value: "Keys and Constraints" }, { id: "S3", value: "Entity-Relationship Modeling" }],
                tlas: [
                    { id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Relational Model Lecture", tlaDescription: "Introduction to the relational model, integrity constraints, and ER diagram notations.", laboratory: false },
                    { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "ER Diagram Exercise", tlaDescription: "Students design an ER diagram for a given business scenario using appropriate notations.", laboratory: true }
                ]
            },
            {
                id: "T2", title: "SQL Fundamentals",
                subtopics: [{ id: "S4", value: "DDL: CREATE, ALTER, DROP" }, { id: "S5", value: "DML: SELECT, INSERT, UPDATE, DELETE" }, { id: "S6", value: "Joins and Subqueries" }],
                tlas: [
                    { id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "SQL Query Lab", tlaDescription: "Students write complex SQL queries involving multiple joins, subqueries, and aggregate functions.", laboratory: true }
                ]
            },
            {
                id: "T3", title: "Normalization",
                subtopics: [{ id: "S7", value: "1NF, 2NF, 3NF" }, { id: "S8", value: "Boyce-Codd Normal Form" }, { id: "S9", value: "Denormalization for Performance" }],
                tlas: [
                    { id: "TLA4", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Normalization Lecture", tlaDescription: "Lecture on functional dependencies and normalization forms with examples.", laboratory: false },
                    { id: "TLA5", classPhase: "In-class", performedBy: "Student", tlaName: "Normalization Exercise", tlaDescription: "Students normalize a denormalized table through successive normal forms.", laboratory: true }
                ]
            },
            {
                id: "T4", title: "Transaction Management",
                subtopics: [{ id: "S10", value: "ACID Properties" }, { id: "S11", value: "Concurrency Control" }, { id: "S12", value: "Recovery Mechanisms" }],
                tlas: [
                    { id: "TLA6", classPhase: "In-class", performedBy: "Student", tlaName: "Transaction Simulation", tlaDescription: "Students simulate concurrent transactions and observe locking and isolation behavior.", laboratory: true }
                ]
            },
            {
                id: "T5", title: "Database Design Project",
                subtopics: [{ id: "S13", value: "Requirements Analysis" }, { id: "S14", value: "Schema Design and Implementation" }, { id: "S15", value: "Query Optimization" }],
                tlas: [
                    { id: "TLA7", classPhase: "Post-class", performedBy: "Student", tlaName: "Database Design Project", tlaDescription: "Students design and implement a complete database from requirements, including ERD, schema, and sample queries.", laboratory: true }
                ]
            }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Design conceptual and logical database models using entity-relationship modeling and normalization.', poMappings: ['E', 'I', '', '', '', '', 'E', '', ''] },
            { id: 'CO2', description: 'Implement and query relational databases using SQL DDL and DML statements.', poMappings: ['', 'E', 'E', 'I', '', '', '', '', ''] },
            { id: 'CO3', description: 'Manage database transactions ensuring ACID properties and appropriate concurrency control.', poMappings: ['', '', 'D', 'E', '', 'I', '', '', ''] },
            { id: 'CO4', description: 'Design and implement a complete database solution from requirements through deployment.', poMappings: ['D', '', '', '', 'E', '', '', 'I', ''] }
        ],
        coAssessmentMethodSets: {
            CO1: [
                { value: "ER Diagram", description: "Students design an entity-relationship diagram for a given business scenario with cardinality constraints." },
                { value: "Normalization Worksheet", description: "Students normalize a denormalized table through 1NF, 2NF, and 3NF, documenting functional dependencies." },
                { value: "Relational Schema Design", description: "Students convert an ER diagram into a relational schema with primary keys, foreign keys, and constraints." }
            ],
            CO2: [
                { value: "SQL DDL Script", description: "Students write SQL DDL statements to create database tables with appropriate data types and constraints." },
                { value: "Complex Query Output", description: "Students write SQL queries involving joins, subqueries, and aggregate functions on a provided dataset." },
                { value: "Database Creation Script", description: "Students create a complete database script including tables, indexes, views, and seed data." }
            ],
            CO3: [
                { value: "Transaction Isolation Report", description: "Students demonstrate different transaction isolation levels and document observed concurrency anomalies." },
                { value: "Concurrency Control Simulation", description: "Students simulate concurrent transactions and analyze locking and deadlock behavior." },
                { value: "ACID Properties Analysis", description: "Students analyze a transaction log and document how ACID properties are maintained." }
            ],
            CO4: [
                { value: "Database Design Document", description: "Students produce a complete database design document including ERD, schema, and data dictionary." },
                { value: "Query Optimization Report", description: "Students analyze query execution plans and optimize slow queries using indexes and query rewriting." },
                { value: "Implementation Project", description: "Students implement a fully functional database from requirements with sample queries and documentation." }
            ]
        },
        assessments: [
            { id: 'A1', tlaName: 'ER Diagram Exercise', phase: 'In-class', assessmentMethod: 'ER Diagram Submission', assessmentDescription: 'Students design an ER diagram for a given business scenario using appropriate notations and cardinality constraints.', hasRubric: false },
            { id: 'A2', tlaName: 'SQL Query Lab', phase: 'In-class', assessmentMethod: 'SQL Query Output', assessmentDescription: 'Students write complex SQL queries involving multiple joins, subqueries, and aggregate functions on a provided dataset.', hasRubric: false },
            { id: 'A3', tlaName: 'Normalization Exercise', phase: 'In-class', assessmentMethod: 'Normalization Worksheet', assessmentDescription: 'Students normalize a denormalized table through 1NF, 2NF, and 3NF, documenting functional dependencies.', hasRubric: false },
            { id: 'A4', tlaName: 'Database Design Project', phase: 'Post-class', assessmentMethod: 'Database Design Submission', assessmentDescription: 'Students design and implement a complete database from requirements including ERD, normalized schema, and sample queries.', hasRubric: false }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Design conceptual and logical database models using entity-relationship modeling and normalization.", intendedLearningOutcome: "Create ER diagrams representing real-world business scenarios.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Relational Database Concepts"], references: ["TB1 - Database System Concepts", "TB2 - Database Systems: A Practical Approach to Design, Implementation, and Management"] },
            { id: "CO1-ILO2", courseOutcome: "Design conceptual and logical database models using entity-relationship modeling and normalization.", intendedLearningOutcome: "Normalize database schemas up to 3NF to eliminate data redundancy.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Normalization"], references: ["TB1 - Database System Concepts", "OE2 - Stanford Database Course"] },
            { id: "CO2-ILO1", courseOutcome: "Implement and query relational databases using SQL DDL and DML statements.", intendedLearningOutcome: "Write SQL DDL statements to create and modify database schemas.", deliveryWeek: "Week 2", allocatedTime: "2 hours", topics: ["SQL Fundamentals"], references: ["TB3 - Learning SQL", "OE1 - SQL Tutorial (W3Schools)"] },
            { id: "CO2-ILO2", courseOutcome: "Implement and query relational databases using SQL DDL and DML statements.", intendedLearningOutcome: "Write complex SQL queries with joins, subqueries, and aggregate functions.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["SQL Fundamentals"], references: ["TB3 - Learning SQL", "OR1 - PostgreSQL Documentation"] },
            { id: "CO3-ILO1", courseOutcome: "Manage database transactions ensuring ACID properties and appropriate concurrency control.", intendedLearningOutcome: "Explain ACID properties and their importance in transaction processing.", deliveryWeek: "Week 7", allocatedTime: "2 hours", topics: ["Transaction Management"], references: ["TB1 - Database System Concepts"] },
            { id: "CO3-ILO2", courseOutcome: "Manage database transactions ensuring ACID properties and appropriate concurrency control.", intendedLearningOutcome: "Implement transaction isolation levels to prevent concurrency anomalies.", deliveryWeek: "Week 8", allocatedTime: "2 hours", topics: ["Transaction Management"], references: ["TB1 - Database System Concepts", "OR1 - PostgreSQL Documentation"] },
            { id: "CO4-ILO1", courseOutcome: "Design and implement a complete database solution from requirements through deployment.", intendedLearningOutcome: "Design a complete database schema from business requirements.", deliveryWeek: "Week 10", allocatedTime: "3 hours", topics: ["Database Design Project"], references: ["TB2 - Database Systems: A Practical Approach to Design, Implementation, and Management"] },
            { id: "CO4-ILO2", courseOutcome: "Design and implement a complete database solution from requirements through deployment.", intendedLearningOutcome: "Optimize SQL queries using indexes and execution plan analysis.", deliveryWeek: "Week 11", allocatedTime: "3 hours", topics: ["Database Design Project"], references: ["OR1 - PostgreSQL Documentation", "TB3 - Learning SQL"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["ER Diagram Exercise"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Normalization Exercise"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["SQL DDL Lab"], weight: { prelim: "", midterm: "40", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Complex Queries Lab"], weight: { prelim: "", midterm: "60", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Transaction Concepts Quiz"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Isolation Level Lab"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }] },
            { co: "CO4", ilos: [{ id: "ILO1", assessments: ["Database Design Project"], weight: { prelim: "", midterm: "", semi: "", final: "60" }, minPassing: "60" }, { id: "ILO2", assessments: ["Query Optimization Lab"], weight: { prelim: "", midterm: "", semi: "", final: "40" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS121',
        name: 'Discrete Mathematics',
        credits: '3 LEC',
        contact: '3',
        prerequisites: 'None',
        class: 'Core Courses',
        cmo: '25 S, 2015',
        year: 'FIRST YEAR',
        sem: '2nd Semester',
        description: 'A foundational course covering discrete structures essential for computer science, including sets, graphs, logic, and combinatorics.',
        references: [
            { id: "TB1", title: "Discrete Mathematics and Its Applications", type: "Textbook", authors: "Kenneth Rosen", year: 2018, isbn: "978-1259676512", link: "" },
            { id: "TB2", title: "Concrete Mathematics", type: "Textbook", authors: "Ronald Graham, Donald Knuth, Oren Patashnik", year: 1994, isbn: "978-0201558029", link: "" },
            { id: "TB3", title: "Discrete Mathematics for Computer Scientists", type: "Textbook", authors: "Clifford Stein, Robert Drysdale, Kenneth Bogart", year: 2010, isbn: "978-0132122719", link: "" },
            { id: "OR1", title: "OEIS (Online Encyclopedia of Integer Sequences)", type: "Online Resources", authors: "OEIS Foundation", year: 2024, isbn: "", link: "https://oeis.org/" },
            { id: "OE1", title: "MIT 6.042J: Mathematics for Computer Science", type: "Open Educational Resources", authors: "Prof. Albert Meyer, Prof. Tom Leighton", year: 2015, isbn: "", link: "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/" },
            { id: "OE2", title: "Brilliant Discrete Mathematics", type: "Open Educational Resources", authors: "Brilliant", year: 2024, isbn: "", link: "https://brilliant.org/discrete-mathematics/" }
        ],
        topics: [
            {
                id: "T1", title: "Mathematical Logic",
                subtopics: [{ id: "S1", value: "Propositional Logic" }, { id: "S2", value: "Predicate Logic" }, { id: "S3", value: "Rules of Inference" }],
                tlas: [
                    { id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Logic Foundations Lecture", tlaDescription: "Introduction to propositional and predicate logic, truth tables, and logical equivalences.", laboratory: false },
                    { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Logic Proof Practice", tlaDescription: "Students practice constructing logical proofs using rules of inference and resolution.", laboratory: true }
                ]
            },
            {
                id: "T2", title: "Set Theory and Functions",
                subtopics: [{ id: "S4", value: "Set Operations" }, { id: "S5", value: "Functions and Relations" }, { id: "S6", value: "Cardinality" }],
                tlas: [
                    { id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "Set Operations Lab", tlaDescription: "Students solve problems involving set operations, relations, and function composition.", laboratory: true }
                ]
            },
            {
                id: "T3", title: "Counting and Combinatorics",
                subtopics: [{ id: "S7", value: "Permutations and Combinations" }, { id: "S8", value: "Pigeonhole Principle" }, { id: "S9", value: "Inclusion-Exclusion" }],
                tlas: [
                    { id: "TLA4", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Combinatorics Lecture", tlaDescription: "Lecture on counting principles, permutations, combinations, and the pigeonhole principle.", laboratory: false },
                    { id: "TLA5", classPhase: "In-class", performedBy: "Student", tlaName: "Counting Problem Session", tlaDescription: "Students solve combinatorial problems involving permutations, combinations, and binomial coefficients.", laboratory: true }
                ]
            },
            {
                id: "T4", title: "Graph Theory",
                subtopics: [{ id: "S10", value: "Graph Terminology and Types" }, { id: "S11", value: "Euler and Hamiltonian Paths" }, { id: "S12", value: "Graph Coloring" }],
                tlas: [
                    { id: "TLA6", classPhase: "In-class", performedBy: "Student", tlaName: "Graph Algorithms Lab", tlaDescription: "Students implement graph traversal algorithms and solve shortest path problems.", laboratory: true },
                    { id: "TLA7", classPhase: "Post-class", performedBy: "Student", tlaName: "Graph Theory Project", tlaDescription: "Students apply graph theory to model and solve a real-world problem (e.g., social network analysis).", laboratory: false }
                ]
            },
            {
                id: "T5", title: "Probability Theory",
                subtopics: [{ id: "S13", value: "Sample Spaces and Events" }, { id: "S14", value: "Conditional Probability" }, { id: "S15", value: "Bayes' Theorem" }],
                tlas: [
                    { id: "TLA8", classPhase: "In-class", performedBy: "Student", tlaName: "Probability Problem Set", tlaDescription: "Students solve probability problems including conditional probability and expected value.", laboratory: true }
                ]
            }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Apply mathematical logic to construct and evaluate logical arguments and proofs.', poMappings: ['E', 'I', '', '', '', '', 'E', '', ''] },
            { id: 'CO2', description: 'Apply set theory, functions, and relations to model computational structures.', poMappings: ['', 'E', 'I', '', '', '', '', '', ''] },
            { id: 'CO3', description: 'Solve counting problems using combinatorial principles and probability theory.', poMappings: ['', '', 'E', 'I', '', 'E', '', '', ''] },
            { id: 'CO4', description: 'Model and solve problems using graph theory concepts and algorithms.', poMappings: ['D', '', '', 'E', '', '', '', 'I', ''] }
        ],
        coAssessmentMethodSets: {
            CO1: [
                { value: "Truth Table Construction", description: "Students construct truth tables for compound propositions and determine logical equivalence." },
                { value: "Proof Derivation", description: "Students construct formal proofs using rules of inference and natural deduction." },
                { value: "Logical Equivalence Proof", description: "Students prove logical equivalences using laws of propositional logic." }
            ],
            CO2: [
                { value: "Set Operations Problem Set", description: "Students solve problems involving union, intersection, complement, and Cartesian product of sets." },
                { value: "Function Composition Exercise", description: "Students compute compositions of functions and determine injective, surjective, and bijective properties." },
                { value: "Relation Classification", description: "Students classify relations as reflexive, symmetric, transitive, or equivalence relations." }
            ],
            CO3: [
                { value: "Permutation and Combination Problem Set", description: "Students solve counting problems using permutations, combinations, and the pigeonhole principle." },
                { value: "Probability Calculation Exercise", description: "Students calculate probabilities using sample spaces, conditional probability, and Bayes' theorem." },
                { value: "Binomial Theorem Application", description: "Students expand binomial expressions and solve problems using binomial coefficients." }
            ],
            CO4: [
                { value: "Graph Traversal Implementation", description: "Students implement BFS and DFS algorithms and analyze their time and space complexity." },
                { value: "Shortest Path Algorithm", description: "Students implement Dijkstra's algorithm and find shortest paths in weighted graphs." },
                { value: "Graph Coloring Problem", description: "Students apply graph coloring concepts to solve scheduling and register allocation problems." }
            ]
        },
        assessments: [
            { id: 'A1', tlaName: 'Logic Proof Practice', phase: 'In-class', assessmentMethod: 'Proof Construction Exercise', assessmentDescription: 'Students construct logical proofs using rules of inference and resolution for given propositional logic statements.', hasRubric: false },
            { id: 'A2', tlaName: 'Set Operations Lab', phase: 'In-class', assessmentMethod: 'Set Theory Problem Set', assessmentDescription: 'Students solve problems involving set operations, relations, and function compositions.', hasRubric: false },
            { id: 'A3', tlaName: 'Counting Problem Session', phase: 'In-class', assessmentMethod: 'Combinatorics Problem Set', assessmentDescription: 'Students solve combinatorial problems involving permutations, combinations, and binomial coefficients.', hasRubric: false },
            { id: 'A4', tlaName: 'Graph Theory Project', phase: 'Post-class', assessmentMethod: 'Graph Theory Project Report', assessmentDescription: 'Students apply graph theory to model and solve a real-world problem such as social network analysis or route optimization.', hasRubric: false }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Apply mathematical logic to construct and evaluate logical arguments and proofs.", intendedLearningOutcome: "Translate natural language statements into propositional and predicate logic.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Mathematical Logic"], references: ["TB1 - Discrete Mathematics and Its Applications", "OE1 - MIT 6.042J: Mathematics for Computer Science"] },
            { id: "CO1-ILO2", courseOutcome: "Apply mathematical logic to construct and evaluate logical arguments and proofs.", intendedLearningOutcome: "Construct logical proofs using rules of inference.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["Mathematical Logic"], references: ["TB1 - Discrete Mathematics and Its Applications", "TB3 - Discrete Mathematics for Computer Scientists"] },
            { id: "CO2-ILO1", courseOutcome: "Apply set theory, functions, and relations to model computational structures.", intendedLearningOutcome: "Perform set operations and describe relations between sets.", deliveryWeek: "Week 3", allocatedTime: "2 hours", topics: ["Set Theory and Functions"], references: ["TB1 - Discrete Mathematics and Its Applications"] },
            { id: "CO2-ILO2", courseOutcome: "Apply set theory, functions, and relations to model computational structures.", intendedLearningOutcome: "Classify functions and relations by their mathematical properties.", deliveryWeek: "Week 4", allocatedTime: "2 hours", topics: ["Set Theory and Functions"], references: ["TB2 - Concrete Mathematics"] },
            { id: "CO3-ILO1", courseOutcome: "Solve counting problems using combinatorial principles and probability theory.", intendedLearningOutcome: "Calculate permutations and combinations for counting problems.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Counting and Combinatorics"], references: ["TB1 - Discrete Mathematics and Its Applications", "TB2 - Concrete Mathematics"] },
            { id: "CO3-ILO2", courseOutcome: "Solve counting problems using combinatorial principles and probability theory.", intendedLearningOutcome: "Apply probability rules including conditional probability and Bayes' theorem.", deliveryWeek: "Week 10", allocatedTime: "3 hours", topics: ["Probability Theory"], references: ["TB3 - Discrete Mathematics for Computer Scientists"] },
            { id: "CO4-ILO1", courseOutcome: "Model and solve problems using graph theory concepts and algorithms.", intendedLearningOutcome: "Apply graph traversal algorithms to solve path-finding problems.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Graph Theory"], references: ["TB1 - Discrete Mathematics and Its Applications", "OE1 - MIT 6.042J: Mathematics for Computer Science"] },
            { id: "CO4-ILO2", courseOutcome: "Model and solve problems using graph theory concepts and algorithms.", intendedLearningOutcome: "Model real-world problems using graph structures and apply graph coloring concepts.", deliveryWeek: "Week 8", allocatedTime: "2 hours", topics: ["Graph Theory"], references: ["TB1 - Discrete Mathematics and Its Applications", "OE2 - Brilliant Discrete Mathematics"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Logic Translation Exercise"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Proof Construction Lab"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Set Theory Quiz"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Functions and Relations Lab"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Combinatorics Problem Set"], weight: { prelim: "", midterm: "", semi: "60", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Probability Exercise"], weight: { prelim: "", midterm: "", semi: "40", final: "" }, minPassing: "60" }] },
            { co: "CO4", ilos: [{ id: "ILO1", assessments: ["Graph Algorithms Lab"], weight: { prelim: "", midterm: "", semi: "", final: "60" }, minPassing: "60" }, { id: "ILO2", assessments: ["Graph Theory Project"], weight: { prelim: "", midterm: "", semi: "", final: "40" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'IT 321',
        name: 'Information Assurance & Security',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS351L Cybersecurity Fundamentals',
        class: 'Information Technology',
        cmo: '25 S, 2015',
        year: 'FOURTH YEAR',
        sem: '2nd Semester',
        description: 'Advanced study of information security, risk management, and compliance frameworks for protecting organizational data assets.',
        references: [
            { id: "TB1", title: "Information Security: Principles and Practice", type: "Textbook", authors: "Mark Stamp", year: 2011, isbn: "978-0470626399", link: "" },
            { id: "TB2", title: "Security Engineering", type: "Textbook", authors: "Ross Anderson", year: 2020, isbn: "978-1119642787", link: "" },
            { id: "TB3", title: "Information Security Governance", type: "Textbook", authors: "S. Posthumus, R. Von Solms", year: 2011, isbn: "978-3642263033", link: "" },
            { id: "OR1", title: "ISO 27001 Information Security Management", type: "Online Resources", authors: "ISO", year: 2022, isbn: "", link: "https://www.iso.org/isoiec-27001-information-security.html" },
            { id: "OR2", title: "NIST SP 800-53 Security Controls", type: "Online Resources", authors: "NIST", year: 2020, isbn: "", link: "https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final" },
            { id: "OE1", title: "SANS Security Awareness Training", type: "Open Educational Resources", authors: "SANS Institute", year: 2024, isbn: "", link: "https://www.sans.org/security-awareness-training/" }
        ],
        topics: [
            {
                id: "T1", title: "Information Security Governance",
                subtopics: [{ id: "S1", value: "Security Policies and Standards" }, { id: "S2", value: "Compliance Frameworks (ISO 27001, NIST)" }, { id: "S3", value: "Security Metrics and Reporting" }],
                tlas: [
                    { id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Governance Lecture", tlaDescription: "Overview of information security governance frameworks and regulatory compliance requirements.", laboratory: false },
                    { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Policy Development Workshop", tlaDescription: "Students draft an information security policy aligned with ISO 27001 controls.", laboratory: true }
                ]
            },
            {
                id: "T2", title: "Risk Management",
                subtopics: [{ id: "S4", value: "Risk Assessment Methodologies" }, { id: "S5", value: "Business Impact Analysis" }, { id: "S6", value: "Risk Treatment Strategies" }],
                tlas: [
                    { id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "Risk Assessment Lab", tlaDescription: "Students perform a quantitative risk assessment for a simulated organization using FAIR methodology.", laboratory: true },
                    { id: "TLA4", classPhase: "Post-class", performedBy: "Student", tlaName: "Risk Management Plan", tlaDescription: "Students develop a comprehensive risk management plan including mitigation strategies.", laboratory: false }
                ]
            },
            {
                id: "T3", title: "Access Control & Identity Management",
                subtopics: [{ id: "S7", value: "Authentication Methods (MFA, SSO)" }, { id: "S8", value: "RBAC and ABAC" }, { id: "S9", value: "Privileged Access Management" }],
                tlas: [
                    { id: "TLA5", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Access Control Lecture", tlaDescription: "Lecture on authentication, authorization models, and identity management best practices.", laboratory: false },
                    { id: "TLA6", classPhase: "In-class", performedBy: "Student", tlaName: "IAM Configuration Lab", tlaDescription: "Students configure RBAC policies for a multi-department enterprise application.", laboratory: true }
                ]
            },
            {
                id: "T4", title: "Business Continuity & Disaster Recovery",
                subtopics: [{ id: "S10", value: "BCP Methodology" }, { id: "S11", value: "DRP Strategies" }, { id: "S12", value: "Backup and Restoration" }],
                tlas: [
                    { id: "TLA7", classPhase: "In-class", performedBy: "Student", tlaName: "BCP Tabletop Exercise", tlaDescription: "Students participate in a tabletop exercise simulating a major security incident and practice BCP activation.", laboratory: true }
                ]
            },
            {
                id: "T5", title: "Audit and Compliance",
                subtopics: [{ id: "S13", value: "Internal Audit Processes" }, { id: "S14", value: "Evidence Collection" }, { id: "S15", value: "Remediation Planning" }],
                tlas: [
                    { id: "TLA8", classPhase: "Post-class", performedBy: "Student", tlaName: "Audit Report Project", tlaDescription: "Students conduct a mock security audit and produce a formal audit report with findings and recommendations.", laboratory: false }
                ]
            }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Develop information security governance frameworks aligned with industry standards and regulations.', poMappings: ['E', 'I', '', '', '', '', 'E', '', ''] },
            { id: 'CO2', description: 'Perform risk assessments and develop risk management strategies for organizational assets.', poMappings: ['', 'E', 'E', 'I', '', '', '', '', ''] },
            { id: 'CO3', description: 'Implement access control models and identity management solutions for enterprise environments.', poMappings: ['', '', 'D', 'E', '', 'I', '', '', ''] },
            { id: 'CO4', description: 'Design business continuity and disaster recovery plans with compliance audit capabilities.', poMappings: ['D', '', '', '', 'E', '', '', 'I', ''] }
        ],
        coAssessmentMethodSets: {
            CO1: [
                { value: "Security Policy Document", description: "Students draft an organizational security policy aligned with ISO 27001 and NIST control frameworks." },
                { value: "Control Framework Mapping", description: "Students map security controls between ISO 27001 and NIST SP 800-53 frameworks." },
                { value: "Compliance Checklist", description: "Students develop a compliance audit checklist for regulatory requirements such as GDPR or HIPAA." }
            ],
            CO2: [
                { value: "Risk Assessment Report", description: "Students perform a quantitative risk assessment using FAIR methodology and document risk exposure." },
                { value: "Business Impact Analysis", description: "Students conduct a BIA to identify critical assets and determine recovery priorities." },
                { value: "Risk Treatment Plan", description: "Students develop risk treatment strategies including mitigation, transfer, avoidance, and acceptance." }
            ],
            CO3: [
                { value: "RBAC Configuration Document", description: "Students design and configure role-based access control policies for a multi-department enterprise system." },
                { value: "IAM Implementation Report", description: "Students implement identity and access management solutions including MFA and SSO integration." },
                { value: "Access Control Matrix", description: "Students create an access control matrix mapping subjects, objects, and permissions." }
            ],
            CO4: [
                { value: "Business Continuity Plan", description: "Students develop a BCP with recovery time objectives and recovery point objectives for critical functions." },
                { value: "Disaster Recovery Plan", description: "Students design a DRP including backup strategies, failover procedures, and restoration testing." },
                { value: "Audit Report", description: "Students conduct a mock security audit and produce a formal report with findings and remediation recommendations." }
            ]
        },
        assessments: [
            { id: 'A1', tlaName: 'Policy Development Workshop', phase: 'In-class', assessmentMethod: 'Security Policy Document', assessmentDescription: 'Students draft an information security policy aligned with ISO 27001 controls for a simulated organization.', hasRubric: false },
            { id: 'A2', tlaName: 'Risk Assessment Lab', phase: 'In-class', assessmentMethod: 'Risk Assessment Report', assessmentDescription: 'Students perform a quantitative risk assessment using FAIR methodology and submit a risk analysis report.', hasRubric: false },
            { id: 'A3', tlaName: 'IAM Configuration Lab', phase: 'In-class', assessmentMethod: 'IAM Configuration Output', assessmentDescription: 'Students configure RBAC policies for a multi-department enterprise application and submit the access control matrix.', hasRubric: false },
            { id: 'A4', tlaName: 'Audit Report Project', phase: 'Post-class', assessmentMethod: 'Audit Report Submission', assessmentDescription: 'Students conduct a mock security audit and produce a formal audit report with findings, risk ratings, and recommendations.', hasRubric: false }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Develop information security governance frameworks aligned with industry standards and regulations.", intendedLearningOutcome: "Draft information security policies aligned with ISO 27001 control objectives.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Information Security Governance"], references: ["TB3 - Information Security Governance", "OR1 - ISO 27001 Information Security Management"] },
            { id: "CO1-ILO2", courseOutcome: "Develop information security governance frameworks aligned with industry standards and regulations.", intendedLearningOutcome: "Map security controls between NIST SP 800-53 and ISO 27001 frameworks.", deliveryWeek: "Week 2", allocatedTime: "2 hours", topics: ["Information Security Governance"], references: ["TB3 - Information Security Governance", "OR2 - NIST SP 800-53 Security Controls"] },
            { id: "CO2-ILO1", courseOutcome: "Perform risk assessments and develop risk management strategies for organizational assets.", intendedLearningOutcome: "Conduct quantitative risk assessments using FAIR methodology.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["Risk Management"], references: ["TB1 - Information Security: Principles and Practice", "TB2 - Security Engineering"] },
            { id: "CO2-ILO2", courseOutcome: "Perform risk assessments and develop risk management strategies for organizational assets.", intendedLearningOutcome: "Develop risk treatment plans with mitigation, transfer, and acceptance strategies.", deliveryWeek: "Week 4", allocatedTime: "2 hours", topics: ["Risk Management"], references: ["TB2 - Security Engineering"] },
            { id: "CO3-ILO1", courseOutcome: "Implement access control models and identity management solutions for enterprise environments.", intendedLearningOutcome: "Configure RBAC policies for enterprise applications.", deliveryWeek: "Week 6", allocatedTime: "3 hours", topics: ["Access Control & Identity Management"], references: ["TB1 - Information Security: Principles and Practice"] },
            { id: "CO3-ILO2", courseOutcome: "Implement access control models and identity management solutions for enterprise environments.", intendedLearningOutcome: "Implement multi-factor authentication and SSO solutions.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Access Control & Identity Management"], references: ["TB2 - Security Engineering"] },
            { id: "CO4-ILO1", courseOutcome: "Design business continuity and disaster recovery plans with compliance audit capabilities.", intendedLearningOutcome: "Develop business continuity plans with recovery time and recovery point objectives.", deliveryWeek: "Week 9", allocatedTime: "2 hours", topics: ["Business Continuity & Disaster Recovery"], references: ["TB2 - Security Engineering", "OR2 - NIST SP 800-53 Security Controls"] },
            { id: "CO4-ILO2", courseOutcome: "Design business continuity and disaster recovery plans with compliance audit capabilities.", intendedLearningOutcome: "Conduct internal security audits and produce formal audit reports.", deliveryWeek: "Week 11", allocatedTime: "3 hours", topics: ["Audit and Compliance"], references: ["TB3 - Information Security Governance", "OR1 - ISO 27001 Information Security Management"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Security Policy Document"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Control Mapping Matrix"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Risk Assessment Report"], weight: { prelim: "", midterm: "60", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Risk Treatment Plan"], weight: { prelim: "", midterm: "40", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["RBAC Configuration Lab"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["IAM Implementation Lab"], weight: { prelim: "", midterm: "", semi: "50", final: "" }, minPassing: "60" }] },
            { co: "CO4", ilos: [{ id: "ILO1", assessments: ["BCP Document"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }, { id: "ILO2", assessments: ["Audit Report"], weight: { prelim: "", midterm: "", semi: "", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS221L',
        name: 'Data Structures & Algorithms',
        update: 'Feb 10, 2026',
        status: 'DRAFT', approved: '', revision: '0',
        credits: '2 LEC, 1 LAB', contact: '3',
        prerequisites: 'BSCS121 Computer Programming 2',
        class: 'Computer Science', cmo: '25 S, 2015',
        year: 'SECOND YEAR', sem: '1st Semester',
        description: 'Fundamentals of data structures including arrays, linked lists, stacks, queues, trees, graphs, and hash tables. Covers algorithm analysis, sorting, searching, and problem-solving techniques.',
        references: [
            { id: "TB1", title: "Introduction to Algorithms", type: "Textbook", authors: "Thomas H. Cormen", year: 2022, isbn: "978-0262046305", link: "" },
            { id: "TB2", title: "Data Structures and Algorithm Analysis", type: "Textbook", authors: "Mark A. Weiss", year: 2014, isbn: "978-0133406498", link: "" },
            { id: "OR1", title: "Big-O Cheatsheet", type: "Online Resources", authors: "Eric Rowell", year: 2024, isbn: "", link: "https://www.bigocheatsheet.com/" }
        ],
        topics: [
            { id: "T1", title: "Algorithm Analysis", subtopics: [{ id: "S1", value: "Asymptotic Notation" }, { id: "S2", value: "Big-O, Omega, Theta" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Complexity Lecture", tlaDescription: "Introduction to algorithm complexity analysis.", laboratory: false }] },
            { id: "T2", title: "Sorting Algorithms", subtopics: [{ id: "S3", value: "Merge Sort" }, { id: "S4", value: "Quick Sort" }, { id: "S5", value: "Heap Sort" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Sorting Lab", tlaDescription: "Implement and compare sorting algorithm performance.", laboratory: true }] },
            { id: "T3", title: "Tree Structures", subtopics: [{ id: "S6", value: "Binary Search Trees" }, { id: "S7", value: "AVL Trees" }], tlas: [{ id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "BST Implementation", tlaDescription: "Implement BST with balanced tree operations.", laboratory: true }] },
            { id: "T4", title: "Graph Algorithms", subtopics: [{ id: "S8", value: "BFS/DFS" }, { id: "S9", value: "Shortest Path" }], tlas: [{ id: "TLA4", classPhase: "Post-class", performedBy: "Student", tlaName: "Graph Project", tlaDescription: "Implement shortest path algorithms on real-world graph data.", laboratory: false }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Analyze time and space complexity of algorithms.', poMappings: ['E', 'I', 'I', '', 'E', '', '', '', ''] },
            { id: 'CO2', description: 'Implement and apply fundamental data structures.', poMappings: ['D', 'E', 'E', '', '', 'I', '', '', ''] },
            { id: 'CO3', description: 'Design algorithms for sorting, searching, and graph problems.', poMappings: ['', 'E', 'D', 'I', 'E', '', '', '', ''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Analyze time and space complexity of algorithms.", intendedLearningOutcome: "Determine asymptotic complexity of algorithms using Big-O notation.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Algorithm Analysis"], references: ["TB1 - Introduction to Algorithms", "OR1 - Big-O Cheatsheet"] },
            { id: "CO2-ILO1", courseOutcome: "Implement and apply fundamental data structures.", intendedLearningOutcome: "Implement linked lists, stacks, and queues from scratch.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["Linear Data Structures"], references: ["TB2 - Data Structures and Algorithm Analysis"] },
            { id: "CO3-ILO1", courseOutcome: "Design algorithms for sorting, searching, and graph problems.", intendedLearningOutcome: "Implement sorting algorithms and analyze their performance characteristics.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Sorting Algorithms"], references: ["TB1 - Introduction to Algorithms"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Complexity Analysis Exercises"], weight: { prelim: "40", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Data Structure Implementation"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Sorting & Graph Algorithms"], weight: { prelim: "", midterm: "", semi: "50", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS223L',
        name: 'Object-Oriented Programming',
        update: 'Feb 12, 2026',
        status: 'DRAFT', approved: '', revision: '0',
        credits: '2 LEC, 1 LAB', contact: '3',
        prerequisites: 'BSCS121 Computer Programming 2',
        class: 'Computer Science', cmo: '25 S, 2015',
        year: 'SECOND YEAR', sem: '1st Semester',
        description: 'Principles of object-oriented programming including encapsulation, inheritance, polymorphism, and abstraction. Covers design patterns, UML modeling, and software architecture using Java.',
        references: [
            { id: "TB1", title: "Effective Java", type: "Textbook", authors: "Joshua Bloch", year: 2018, isbn: "978-0134685991", link: "" },
            { id: "TB2", title: "Design Patterns: Elements of Reusable OO Software", type: "Textbook", authors: "Gang of Four", year: 1994, isbn: "978-0201633610", link: "" },
            { id: "OR1", title: "Java Documentation", type: "Online Resources", authors: "Oracle", year: 2025, isbn: "", link: "https://docs.oracle.com/javase/" }
        ],
        topics: [
            { id: "T1", title: "OOP Principles", subtopics: [{ id: "S1", value: "Encapsulation and Information Hiding" }, { id: "S2", value: "Inheritance and Composition" }, { id: "S3", value: "Polymorphism and Abstraction" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "OOP Lecture", tlaDescription: "Fundamentals of object-oriented programming.", laboratory: false }] },
            { id: "T2", title: "Design Patterns", subtopics: [{ id: "S4", value: "Creational Patterns" }, { id: "S5", value: "Structural Patterns" }, { id: "S6", value: "Behavioral Patterns" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Pattern Lab", tlaDescription: "Implement common design patterns in Java.", laboratory: true }] },
            { id: "T3", title: "UML Modeling", subtopics: [{ id: "S7", value: "Class Diagrams" }, { id: "S8", value: "Sequence Diagrams" }], tlas: [{ id: "TLA3", classPhase: "Post-class", performedBy: "Student", tlaName: "UML Project", tlaDescription: "Model a real-world system using UML diagrams.", laboratory: false }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Apply OOP principles to design modular software systems.', poMappings: ['E', 'I', '', 'E', '', '', '', '', ''] },
            { id: 'CO2', description: 'Implement design patterns to solve common software problems.', poMappings: ['D', 'E', 'E', '', '', 'I', '', '', ''] },
            { id: 'CO3', description: 'Create UML models to communicate software architecture.', poMappings: ['', '', 'I', 'E', 'D', '', '', '', ''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Apply OOP principles to design modular software systems.", intendedLearningOutcome: "Design classes using encapsulation, inheritance, and polymorphism.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["OOP Principles"], references: ["TB1 - Effective Java"] },
            { id: "CO2-ILO1", courseOutcome: "Implement design patterns to solve common software problems.", intendedLearningOutcome: "Apply creational and structural design patterns in Java applications.", deliveryWeek: "Week 6", allocatedTime: "3 hours", topics: ["Design Patterns"], references: ["TB2 - Design Patterns"] },
            { id: "CO3-ILO1", courseOutcome: "Create UML models to communicate software architecture.", intendedLearningOutcome: "Produce class and sequence diagrams for a given system specification.", deliveryWeek: "Week 8", allocatedTime: "2 hours", topics: ["UML Modeling"], references: ["OR1 - Java Documentation"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["OOP Design Exercise"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Design Pattern Implementation"], weight: { prelim: "", midterm: "60", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["UML Project"], weight: { prelim: "", midterm: "", semi: "40", final: "60" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS224L',
        name: 'Software Engineering',
        update: 'Mar 01, 2026',
        status: 'DRAFT', approved: '', revision: '0',
        credits: '2 LEC, 1 LAB', contact: '3',
        prerequisites: 'BSCS223L Object-Oriented Programming',
        class: 'Computer Science', cmo: '25 S, 2015',
        year: 'SECOND YEAR', sem: '2nd Semester',
        description: 'Software development life cycle, requirements engineering, agile methodologies, software testing, and project management. Emphasizes team-based development using industry-standard tools.',
        references: [
            { id: "TB1", title: "Software Engineering: A Practitioner's Approach", type: "Textbook", authors: "Roger S. Pressman", year: 2019, isbn: "978-1259872976", link: "" },
            { id: "TB2", title: "Clean Code", type: "Textbook", authors: "Robert C. Martin", year: 2008, isbn: "978-0132350884", link: "" },
            { id: "OR1", title: "Scrum Guide", type: "Online Resources", authors: "Ken Schwaber & Jeff Sutherland", year: 2020, isbn: "", link: "https://scrumguides.org/" }
        ],
        topics: [
            { id: "T1", title: "SDLC & Agile", subtopics: [{ id: "S1", value: "Waterfall vs Agile" }, { id: "S2", value: "Scrum Framework" }, { id: "S3", value: "User Stories" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "Sprint Planning", tlaDescription: "Conduct a sprint planning session with user story estimation.", laboratory: true }] },
            { id: "T2", title: "Requirements Engineering", subtopics: [{ id: "S4", value: "Functional & Non-functional Requirements" }, { id: "S5", value: "Use Case Modeling" }], tlas: [{ id: "TLA2", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Requirements Lecture", tlaDescription: "Requirements elicitation and specification techniques.", laboratory: false }] },
            { id: "T3", title: "Software Testing", subtopics: [{ id: "S6", value: "Unit Testing" }, { id: "S7", value: "Integration Testing" }, { id: "S8", value: "Test-Driven Development" }], tlas: [{ id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "TDD Lab", tlaDescription: "Implement features using test-driven development.", laboratory: true }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Apply agile methodologies to manage software projects.', poMappings: ['I', 'I', '', 'E', 'E', '', '', '', ''] },
            { id: 'CO2', description: 'Elicit and document software requirements.', poMappings: ['E', 'E', '', '', 'I', 'I', '', '', ''] },
            { id: 'CO3', description: 'Implement and execute software testing strategies.', poMappings: ['D', '', 'E', 'E', '', '', 'I', 'I', ''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Apply agile methodologies to manage software projects.", intendedLearningOutcome: "Plan and execute a Scrum sprint with user stories and task estimation.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["SDLC & Agile"], references: ["OR1 - Scrum Guide"] },
            { id: "CO2-ILO1", courseOutcome: "Elicit and document software requirements.", intendedLearningOutcome: "Produce requirement specifications and use case diagrams.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Requirements Engineering"], references: ["TB1 - Software Engineering: A Practitioner's Approach"] },
            { id: "CO3-ILO1", courseOutcome: "Implement and execute software testing strategies.", intendedLearningOutcome: "Write unit tests and apply TDD principles in a team project.", deliveryWeek: "Week 9", allocatedTime: "3 hours", topics: ["Software Testing"], references: ["TB2 - Clean Code"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Sprint Planning & Execution"], weight: { prelim: "40", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Requirements Document"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Test Suite & TDD"], weight: { prelim: "", midterm: "", semi: "50", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS412L',
        name: 'Machine Learning',
        update: 'Mar 15, 2026',
        status: 'DRAFT', approved: '', revision: '0',
        credits: '2 LEC, 1 LAB', contact: '3',
        prerequisites: 'BSCS351L Cybersecurity Fundamentals',
        class: 'Computer Science', cmo: '25 S, 2015',
        year: 'FOURTH YEAR', sem: '1st Semester',
        description: 'Introduction to machine learning concepts including supervised and unsupervised learning, neural networks, and deep learning. Covers data preprocessing, model evaluation, and deployment.',
        references: [
            { id: "TB1", title: "Hands-On Machine Learning with Scikit-Learn & TensorFlow", type: "Textbook", authors: "Aurelien Geron", year: 2022, isbn: "978-1098125974", link: "" },
            { id: "TB2", title: "Pattern Recognition and Machine Learning", type: "Textbook", authors: "Christopher Bishop", year: 2006, isbn: "978-0387310732", link: "" },
            { id: "OR1", title: "Scikit-Learn Documentation", type: "Online Resources", authors: "Scikit-Learn", year: 2025, isbn: "", link: "https://scikit-learn.org/" }
        ],
        topics: [
            { id: "T1", title: "Supervised Learning", subtopics: [{ id: "S1", value: "Linear & Logistic Regression" }, { id: "S2", value: "Decision Trees & Random Forests" }, { id: "S3", value: "Support Vector Machines" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "Regression Lab", tlaDescription: "Build regression models on real datasets.", laboratory: true }] },
            { id: "T2", title: "Unsupervised Learning", subtopics: [{ id: "S4", value: "K-Means Clustering" }, { id: "S5", value: "PCA" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Clustering Lab", tlaDescription: "Apply clustering algorithms to unlabeled data.", laboratory: true }] },
            { id: "T3", title: "Neural Networks", subtopics: [{ id: "S6", value: "Perceptron & MLP" }, { id: "S7", value: "Backpropagation" }, { id: "S8", value: "Deep Learning Basics" }], tlas: [{ id: "TLA3", classPhase: "Post-class", performedBy: "Student", tlaName: "Neural Network Project", tlaDescription: "Build and train a neural network for image classification.", laboratory: false }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Apply supervised learning algorithms to classification and regression problems.', poMappings: ['E', 'D', 'E', '', 'E', '', '', '', ''] },
            { id: 'CO2', description: 'Apply unsupervised learning techniques for data exploration.', poMappings: ['', 'E', 'D', 'I', '', 'I', '', '', ''] },
            { id: 'CO3', description: 'Design and train neural networks for complex pattern recognition.', poMappings: ['D', '', 'E', 'E', 'D', '', '', '', ''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Apply supervised learning algorithms to classification and regression problems.", intendedLearningOutcome: "Train and evaluate regression and classification models.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["Supervised Learning"], references: ["TB1 - Hands-On Machine Learning"] },
            { id: "CO2-ILO1", courseOutcome: "Apply unsupervised learning techniques for data exploration.", intendedLearningOutcome: "Perform clustering and dimensionality reduction on datasets.", deliveryWeek: "Week 6", allocatedTime: "3 hours", topics: ["Unsupervised Learning"], references: ["TB1 - Hands-On Machine Learning"] },
            { id: "CO3-ILO1", courseOutcome: "Design and train neural networks for complex pattern recognition.", intendedLearningOutcome: "Build and train a multi-layer perceptron for a classification task.", deliveryWeek: "Week 10", allocatedTime: "3 hours", topics: ["Neural Networks"], references: ["TB2 - Pattern Recognition and Machine Learning"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Supervised Learning Models"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Unsupervised Learning Lab"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Neural Network Project"], weight: { prelim: "", midterm: "", semi: "50", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'BSCS421L',
        name: 'Mobile Application Development',
        update: 'Mar 20, 2026',
        status: 'DRAFT', approved: '', revision: '0',
        credits: '2 LEC, 1 LAB', contact: '3',
        prerequisites: 'BSCS224L Software Engineering',
        class: 'Computer Science', cmo: '25 S, 2015',
        year: 'FOURTH YEAR', sem: '1st Semester',
        description: 'Cross-platform mobile app development using React Native. Covers UI/UX design for mobile, state management, native APIs, app deployment, and performance optimization.',
        references: [
            { id: "TB1", title: "Learning React Native", type: "Textbook", authors: "Bonnie Eisenman", year: 2017, isbn: "978-1491989142", link: "" },
            { id: "TB2", title: "Mobile Design Pattern Gallery", type: "Textbook", authors: "Theresa Neil", year: 2014, isbn: "978-1449363636", link: "" },
            { id: "OR1", title: "React Native Documentation", type: "Online Resources", authors: "Meta", year: 2025, isbn: "", link: "https://reactnative.dev/" }
        ],
        topics: [
            { id: "T1", title: "React Native Fundamentals", subtopics: [{ id: "S1", value: "Components & Props" }, { id: "S2", value: "State & Hooks" }, { id: "S3", value: "Navigation" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "RN Lecture", tlaDescription: "Introduction to React Native architecture.", laboratory: false }] },
            { id: "T2", title: "Mobile UI/UX", subtopics: [{ id: "S4", value: "Mobile Design Principles" }, { id: "S5", value: "Responsive Layouts" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "UI Design Lab", tlaDescription: "Build responsive mobile UIs using flexbox.", laboratory: true }] },
            { id: "T3", title: "Native APIs & Deployment", subtopics: [{ id: "S6", value: "Camera & Geolocation" }, { id: "S7", value: "Push Notifications" }, { id: "S8", value: "App Store Deployment" }], tlas: [{ id: "TLA3", classPhase: "Post-class", performedBy: "Student", tlaName: "Capstone App", tlaDescription: "Develop and deploy a complete mobile application.", laboratory: false }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Build cross-platform mobile applications using React Native.', poMappings: ['D', 'E', 'D', '', 'E', 'I', '', '', ''] },
            { id: 'CO2', description: 'Design mobile interfaces following platform-specific guidelines.', poMappings: ['E', '', 'I', 'D', '', 'E', '', '', ''] },
            { id: 'CO3', description: 'Integrate native device APIs and publish apps to app stores.', poMappings: ['D', 'E', '', 'E', '', '', 'I', 'I', ''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Build cross-platform mobile applications using React Native.", intendedLearningOutcome: "Create a multi-screen mobile app with navigation and state management.", deliveryWeek: "Week 4", allocatedTime: "3 hours", topics: ["React Native Fundamentals"], references: ["TB1 - Learning React Native", "OR1 - React Native Documentation"] },
            { id: "CO2-ILO1", courseOutcome: "Design mobile interfaces following platform-specific guidelines.", intendedLearningOutcome: "Design adaptive UIs that follow Material Design and HIG guidelines.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Mobile UI/UX"], references: ["TB2 - Mobile Design Pattern Gallery"] },
            { id: "CO3-ILO1", courseOutcome: "Integrate native device APIs and publish apps to app stores.", intendedLearningOutcome: "Integrate camera and geolocation APIs and prepare app for deployment.", deliveryWeek: "Week 11", allocatedTime: "3 hours", topics: ["Native APIs & Deployment"], references: ["OR1 - React Native Documentation"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["React Native App Prototype"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["UI Design Showcase"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Final Mobile App"], weight: { prelim: "", midterm: "", semi: "50", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'IT 311',
        name: 'Web Systems & Technologies',
        update: 'Jan 25, 2026',
        status: 'DRAFT', approved: '', revision: '0',
        credits: '2 LEC, 1 LAB', contact: '3',
        prerequisites: 'IT 211 Web Development Fundamentals',
        class: 'Information Technology', cmo: '25 S, 2015',
        year: 'THIRD YEAR', sem: '1st Semester',
        description: 'Full-stack web development covering frontend frameworks, backend APIs, database integration, authentication, and cloud deployment using modern JavaScript technologies.',
        references: [
            { id: "TB1", title: "Full Stack Open", type: "Open Educational Resources", authors: "University of Helsinki", year: 2025, isbn: "", link: "https://fullstackopen.com/" },
            { id: "OR1", title: "MDN Web Docs", type: "Online Resources", authors: "Mozilla", year: 2025, isbn: "", link: "https://developer.mozilla.org/" },
            { id: "OR2", title: "React Documentation", type: "Online Resources", authors: "Meta", year: 2025, isbn: "", link: "https://react.dev/" }
        ],
        topics: [
            { id: "T1", title: "Frontend Development", subtopics: [{ id: "S1", value: "React Fundamentals" }, { id: "S2", value: "State & Effect Hooks" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "React Lecture", tlaDescription: "Introduction to React component architecture.", laboratory: false }] },
            { id: "T2", title: "Backend APIs", subtopics: [{ id: "S3", value: "RESTful APIs" }, { id: "S4", value: "Express.js" }, { id: "S5", value: "Database Integration" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "API Lab", tlaDescription: "Build a REST API with Express and PostgreSQL.", laboratory: true }] },
            { id: "T3", title: "Authentication & Security", subtopics: [{ id: "S6", value: "JWT Authentication" }, { id: "S7", value: "Session Management" }, { id: "S8", value: "Web Security" }], tlas: [{ id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "Auth Lab", tlaDescription: "Implement JWT authentication in a full-stack app.", laboratory: true }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Develop frontend interfaces using modern JavaScript frameworks.', poMappings: ['E', 'E', 'D', '', 'E', 'I', '', '', ''] },
            { id: 'CO2', description: 'Build RESTful APIs with database persistence.', poMappings: ['D', 'E', 'E', 'I', '', '', '', '', ''] },
            { id: 'CO3', description: 'Implement authentication and security measures in web applications.', poMappings: ['E', '', '', 'D', 'E', 'E', 'I', '', ''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Develop frontend interfaces using modern JavaScript frameworks.", intendedLearningOutcome: "Build interactive UIs with React components and hooks.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["Frontend Development"], references: ["OR1 - MDN Web Docs", "OR2 - React Documentation"] },
            { id: "CO2-ILO1", courseOutcome: "Build RESTful APIs with database persistence.", intendedLearningOutcome: "Create REST endpoints connected to a database.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Backend APIs"], references: ["TB1 - Full Stack Open"] },
            { id: "CO3-ILO1", courseOutcome: "Implement authentication and security measures in web applications.", intendedLearningOutcome: "Implement JWT-based authentication with role-based access control.", deliveryWeek: "Week 8", allocatedTime: "3 hours", topics: ["Authentication & Security"], references: ["TB1 - Full Stack Open"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["React Frontend Project"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["REST API Implementation"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Full-Stack Web App"], weight: { prelim: "", midterm: "", semi: "50", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'IT 322',
        name: 'Database Administration',
        update: 'Feb 05, 2026',
        status: 'DRAFT', approved: '', revision: '0',
        credits: '2 LEC, 1 LAB', contact: '3',
        prerequisites: 'IT 312 Data Management',
        class: 'Information Technology', cmo: '25 S, 2015',
        year: 'THIRD YEAR', sem: '2nd Semester',
        description: 'Database design, management, and administration. Covers SQL optimization, indexing, backup/recovery, security, and NoSQL databases. Prepares for enterprise database administration.',
        references: [
            { id: "TB1", title: "Database System Concepts", type: "Textbook", authors: "Silberschatz, Korth, Sudarshan", year: 2019, isbn: "978-1260084504", link: "" },
            { id: "TB2", title: "SQL Performance Explained", type: "Textbook", authors: "Markus Winand", year: 2012, isbn: "978-3950307825", link: "" },
            { id: "OR1", title: "PostgreSQL Documentation", type: "Online Resources", authors: "PostgreSQL Global Development Group", year: 2025, isbn: "", link: "https://www.postgresql.org/docs/" }
        ],
        topics: [
            { id: "T1", title: "SQL Optimization", subtopics: [{ id: "S1", value: "Query Execution Plans" }, { id: "S2", value: "Indexing Strategies" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "Query Tuning Lab", tlaDescription: "Analyze and optimize slow SQL queries using execution plans.", laboratory: true }] },
            { id: "T2", title: "Backup & Recovery", subtopics: [{ id: "S3", value: "Backup Strategies" }, { id: "S4", value: "Point-in-Time Recovery" }, { id: "S5", value: "Replication" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Backup Lab", tlaDescription: "Configure automated backups and perform restore operations.", laboratory: true }] },
            { id: "T3", title: "NoSQL Databases", subtopics: [{ id: "S6", value: "Document Stores (MongoDB)" }, { id: "S7", value: "Key-Value Stores (Redis)" }], tlas: [{ id: "TLA3", classPhase: "Post-class", performedBy: "Student", tlaName: "NoSQL Project", tlaDescription: "Design a data model for a NoSQL database solution.", laboratory: false }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Optimize database queries and design efficient indexing strategies.', poMappings: ['E', 'E', 'I', '', '', '', '', 'I', ''] },
            { id: 'CO2', description: 'Implement backup, recovery, and replication for high availability.', poMappings: ['D', 'E', '', 'I', 'E', '', '', '', ''] },
            { id: 'CO3', description: 'Design and implement NoSQL data models for modern applications.', poMappings: ['E', '', 'D', 'E', '', 'I', '', '', ''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Optimize database queries and design efficient indexing strategies.", intendedLearningOutcome: "Use EXPLAIN plans to identify and resolve query performance bottlenecks.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["SQL Optimization"], references: ["TB2 - SQL Performance Explained"] },
            { id: "CO2-ILO1", courseOutcome: "Implement backup, recovery, and replication for high availability.", intendedLearningOutcome: "Configure point-in-time recovery and streaming replication.", deliveryWeek: "Week 7", allocatedTime: "3 hours", topics: ["Backup & Recovery"], references: ["OR1 - PostgreSQL Documentation"] },
            { id: "CO3-ILO1", courseOutcome: "Design and implement NoSQL data models for modern applications.", intendedLearningOutcome: "Design document schemas for MongoDB and caching strategies for Redis.", deliveryWeek: "Week 10", allocatedTime: "3 hours", topics: ["NoSQL Databases"], references: ["TB1 - Database System Concepts"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["SQL Optimization Report"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Backup & Recovery Plan"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["NoSQL Database Design"], weight: { prelim: "", midterm: "", semi: "50", final: "50" }, minPassing: "60" }] }
        ]
    },
    {
        code: 'IT 323',
        name: 'Systems Integration & Architecture',
        update: 'Feb 18, 2026',
        status: 'DRAFT', approved: '', revision: '0',
        credits: '2 LEC, 1 LAB', contact: '3',
        prerequisites: 'IT 311 Web Systems & Technologies',
        class: 'Information Technology', cmo: '25 S, 2015',
        year: 'FOURTH YEAR', sem: '1st Semester',
        description: 'Enterprise system integration patterns, SOA, microservices architecture, API gateways, message brokering, and cloud-native application design.',
        references: [
            { id: "TB1", title: "Building Microservices", type: "Textbook", authors: "Sam Newman", year: 2021, isbn: "978-1492034025", link: "" },
            { id: "TB2", title: "Enterprise Integration Patterns", type: "Textbook", authors: "Gregor Hohpe, Bobby Woolf", year: 2003, isbn: "978-0321200686", link: "" },
            { id: "OR1", title: "AWS Well-Architected Framework", type: "Online Resources", authors: "Amazon Web Services", year: 2025, isbn: "", link: "https://aws.amazon.com/architecture/well-architected/" }
        ],
        topics: [
            { id: "T1", title: "Microservices Architecture", subtopics: [{ id: "S1", value: "Service Decomposition" }, { id: "S2", value: "Inter-Service Communication" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Microservices Lecture", tlaDescription: "Principles of microservices and service-oriented architecture.", laboratory: false }] },
            { id: "T2", title: "API Gateway & Message Brokering", subtopics: [{ id: "S3", value: "API Gateway Patterns" }, { id: "S4", value: "Message Queues" }, { id: "S5", value: "Event-Driven Architecture" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Integration Lab", tlaDescription: "Implement an API gateway with RabbitMQ message broker.", laboratory: true }] },
            { id: "T3", title: "Cloud-Native Design", subtopics: [{ id: "S6", value: "Containerization (Docker)" }, { id: "S7", value: "Orchestration (Kubernetes)" }, { id: "S8", value: "CI/CD Pipelines" }], tlas: [{ id: "TLA3", classPhase: "Post-class", performedBy: "Student", tlaName: "Cloud Project", tlaDescription: "Deploy a microservices application on Kubernetes.", laboratory: false }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Design microservice-based architectures following enterprise patterns.', poMappings: ['E', 'D', 'E', '', '', 'I', '', '', ''] },
            { id: 'CO2', description: 'Implement API gateways and message brokering for system integration.', poMappings: ['D', 'E', 'D', 'E', '', '', 'I', '', ''] },
            { id: 'CO3', description: 'Deploy cloud-native applications using containers and orchestration.', poMappings: ['D', '', 'E', 'D', 'E', '', '', 'I', 'I'] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: "Design microservice-based architectures following enterprise patterns.", intendedLearningOutcome: "Decompose a monolithic application into microservices.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["Microservices Architecture"], references: ["TB1 - Building Microservices"] },
            { id: "CO2-ILO1", courseOutcome: "Implement API gateways and message brokering for system integration.", intendedLearningOutcome: "Configure an API gateway and implement asynchronous messaging.", deliveryWeek: "Week 6", allocatedTime: "3 hours", topics: ["API Gateway & Message Brokering"], references: ["TB2 - Enterprise Integration Patterns"] },
            { id: "CO3-ILO1", courseOutcome: "Deploy cloud-native applications using containers and orchestration.", intendedLearningOutcome: "Containerize services with Docker and deploy to Kubernetes.", deliveryWeek: "Week 10", allocatedTime: "3 hours", topics: ["Cloud-Native Design"], references: ["OR1 - AWS Well-Architected Framework"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["Microservices Design Document"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Integration Implementation"], weight: { prelim: "", midterm: "50", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO3", ilos: [{ id: "ILO1", assessments: ["Cloud Deployment Project"], weight: { prelim: "", midterm: "", semi: "50", final: "50" }, minPassing: "60" }] }
        ]
    },
    { code: 'BSCS101', name: 'Discrete Mathematics', credits: '3 LEC', contact: '3', prerequisites: 'None', class: 'General Education', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '1st Semester', description: 'An introduction to discrete mathematical structures.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS102', name: 'Programming Fundamentals', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'None', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '1st Semester', description: 'Introduction to programming using structured and object-oriented paradigms.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS103', name: 'Data Structures & Algorithms', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS102 Programming Fundamentals', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '2nd Semester', description: 'Study of fundamental data structures and algorithm design techniques.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS201', name: 'Object-Oriented Programming', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS102 Programming Fundamentals', class: 'Professional Courses', cmo: '25 S, 2015', year: 'SECOND YEAR', sem: '1st Semester', description: 'Advanced programming concepts using OOP principles.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS202', name: 'Database Management Systems', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS103 Data Structures', class: 'Professional Courses', cmo: '25 S, 2015', year: 'SECOND YEAR', sem: '2nd Semester', description: 'Design and implementation of relational database systems.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS203', name: 'Discrete Structures II', credits: '3 LEC', contact: '3', prerequisites: 'BSCS101 Discrete Mathematics', class: 'General Education', cmo: '25 S, 2015', year: 'SECOND YEAR', sem: '1st Semester', description: 'Advanced topics in discrete structures for computing.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS301', name: 'Automata Theory', credits: '3 LEC', contact: '3', prerequisites: 'BSCS103 Data Structures', class: 'Professional Courses', cmo: '25 S, 2015', year: 'THIRD YEAR', sem: '1st Semester', description: 'Study of abstract machines, formal languages, and computational complexity.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS302', name: 'Compiler Design', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS301 Automata Theory', class: 'Professional Courses', cmo: '25 S, 2015', year: 'THIRD YEAR', sem: '2nd Semester', description: 'Principles and techniques for designing and implementing compilers.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS303', name: 'Numerical Methods', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS103 Data Structures', class: 'Professional Courses', cmo: '25 S, 2015', year: 'THIRD YEAR', sem: '2nd Semester', description: 'Numerical techniques for solving mathematical problems.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS401', name: 'Software Quality Assurance', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS322L Software Engineering', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'Principles and practices of software quality assurance and testing.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS402', name: 'Machine Learning', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS301 Automata Theory', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'An introduction to machine learning algorithms and their applications.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS403', name: 'Parallel Computing', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS314L Operating Systems', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Study of parallel computing architectures and programming models.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS404', name: 'Computer Graphics', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS103 Data Structures', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'Fundamentals of computer graphics, rendering, and visualization.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS405', name: 'Natural Language Processing', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS301 Automata Theory', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Study of computational approaches to natural language understanding and generation.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS406', name: 'Embedded Systems', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS314L Operating Systems', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Design and programming of embedded systems and IoT devices.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS407', name: 'Advanced Algorithms', credits: '3 LEC', contact: '3', prerequisites: 'BSCS103 Data Structures', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'Advanced algorithmic techniques and complexity analysis.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS408', name: 'Distributed Systems', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS331L Computer Networks', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'Principles and design of distributed computing systems.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS409', name: 'Blockchain Technology', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS351L Cybersecurity', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Study of blockchain architecture, smart contracts, and decentralized applications.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS501', name: 'Capstone Project 1', credits: '3 LEC', contact: '3', prerequisites: 'BSCS409 Blockchain Technology', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'First phase of the capstone project focusing on proposal and research.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS502', name: 'Capstone Project 2', credits: '3 LEC', contact: '3', prerequisites: 'BSCS501 Capstone Project 1', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Second phase focusing on implementation, testing, and defense.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS503', name: 'Professional Ethics in Computing', credits: '3 LEC', contact: '3', prerequisites: 'None', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'Ethical and legal issues in computing and technology.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS504', name: 'Technical Writing for CS', credits: '3 LEC', contact: '3', prerequisites: 'None', class: 'General Education', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Technical communication and documentation for computer science.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS505', name: 'Software Architecture', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS322L Software Engineering', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'Design and evaluation of software architecture patterns.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS506', name: 'Data Mining', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS303 Numerical Methods', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Techniques for discovering patterns in large datasets.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS507', name: 'Computer Vision', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS404 Computer Graphics', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'Image processing, feature detection, and object recognition.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS508', name: 'Quantum Computing', credits: '3 LEC', contact: '3', prerequisites: 'BSCS301 Automata Theory', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Introduction to quantum computing principles and algorithms.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS509', name: 'Big Data Analytics', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS506 Data Mining', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Distributed processing and analysis of large-scale data.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS510', name: 'Advanced Web Development', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'IT 312 Web Systems', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'Full-stack web development with modern frameworks.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS511', name: 'Mobile Game Development', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS421L Mobile App Development', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '2nd Semester', description: 'Design and development of games for mobile platforms.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
    { code: 'BSCS512', name: 'IT Infrastructure Management', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BSCS331L Computer Networks', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester', description: 'Management and optimization of IT infrastructure.', references: [], topics: [], courseOutcomes: [], coAssessmentMethodSets: {}, assessments: [], ilos: [], gradingSystem: [] },
]

// Always use built-in data — clear old localStorage cache on app init

// Always use built-in data — clear old localStorage cache on app init
try {
  localStorage.removeItem('lpms_syllabi_v1')
} catch (e) {}

export const getSyllabusByCode = (code) => {
  try {
    const raw = localStorage.getItem('lpms_syllabi_v1')
    if (raw) {
      const data = JSON.parse(raw)
      const found = data.find(s => s.code === code)
      if (found) {
        found.instructor = 'CASIMERO, DANNY'
        return found
      }
    }
  } catch (e) {}
  return syllabiData.find(s => s.code === code)
};