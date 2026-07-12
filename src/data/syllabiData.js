export const syllabiData = [
    {
        code: 'BIT313L',
        name: 'Human Computer Interaction (HCI)',
        update: 'Aug 01, 2025',
        status: 'DRAFT',
        approved: '',
        revision: '2',
        credits: '2 LEC, 1 LAB',
        contact: '2Hrs Lec, 3 Hrs Lab',
        prerequisites: 'BIT222L Web Development 2',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'THIRD YEAR',
        sem: '1st Semester SY 2025-2026',
        sdg: 'SDG1 - No Poverty',
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

        courseOutcomes: [
            {
                id: 'CO1',
                description: 'Apply core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing a User Interface (UI) design using Figma to translate a design brief into interactive screen layouts and UI components with a high-fidelity prototype demonstrating clarity, consistency, and appropriate use of visual hierarchy.',
                poMappings: ['I','','','','','','','','','','I','','']
            },
            {
                id: 'CO2',
                description: 'User-Centered Design (UCD) principles and ISO 9241-210 standards with given user personas, contextual task flows, and feedback artifacts to develop a User Experience (UX) design that demonstrates user involvement, iterative refinement, and contextual understanding, as evaluated against established UX design criteria.',
                poMappings: ['','','E','E','','','','','','E','E','E','']
            },
            {
                id: 'CO3',
                description: 'Construct a front-end prototype for a proposed software application by applying HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines that demonstrate compliance with best practices in usability, inclusivity, and user engagement.',
                poMappings: ['','','','D','','D','','','','E','E','','']
            },
            {
                id: 'CO4',
                description: 'Justify the front-end prototype of a proposed software application based on usability testing results and user feedback by providing evidence-based rationale that addresses at least 80% of identified usability issues and aligns with user experience goals.',
                poMappings: ['','','','','','','','','','','','D','D']
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
            { id: 'CO1', description: 'Apply appropriate software process models and methodologies to manage software development projects.', poMappings: ['E','I','','','','I','','','','I','E','',''] },
            { id: 'CO2', description: 'Analyze and specify software requirements using industry-standard documentation techniques.', poMappings: ['','E','I','','','','E','','','E','I','E',''] },
            { id: 'CO3', description: 'Design and implement software solutions applying architectural patterns, design principles, and testing strategies.', poMappings: ['','','E','E','D','','','I','','I','E','',''] },
            { id: 'CO4', description: 'Evaluate software quality through systematic testing and apply project management practices for timely delivery.', poMappings: ['D','','','','','','','E','I','I','E','E',''] }
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
            { id: 'CO1', description: 'Analyze cybersecurity threats, attack vectors, and risk landscapes to recommend appropriate security controls.', poMappings: ['E','I','','','','','E','','','I','I','E','E'] },
            { id: 'CO2', description: 'Apply cryptographic techniques and network security measures to protect data in transit and at rest.', poMappings: ['','E','','E','','I','','','','I','I','','E'] },
            { id: 'CO3', description: 'Identify and mitigate common web application vulnerabilities following OWASP standards.', poMappings: ['','','E','','D','','','I','','I','I','',''] },
            { id: 'CO4', description: 'Develop incident response plans and apply forensic analysis techniques to investigate security incidents.', poMappings: ['D','','','','','','','E','I','I','E','E','E'] }
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
            { id: 'CO1', description: 'Explain the structure and services of modern operating systems and how they manage system resources.', poMappings: ['E','I','','','','','I','','','E','I','',''] },
            { id: 'CO2', description: 'Implement process and thread management solutions using appropriate scheduling and synchronization techniques.', poMappings: ['','E','E','','','I','','','','I','E','',''] },
            { id: 'CO3', description: 'Design memory management strategies applying paging, segmentation, and virtual memory concepts.', poMappings: ['','','D','E','','','','I','','I','E','',''] },
            { id: 'CO4', description: 'Analyze file system architectures and I/O management techniques to optimize storage performance.', poMappings: ['E','','','','D','','','','I','I','I','E',''] }
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
            { id: "OE2", title: "Cisco Networking Academy Free Courses", type: "Open Educational Resources", authors: "Cisco", year: 2024, isbn: "", link: "https://www.netacad.com/" },
            { id: "TB-DEP-001", title: "Introduction to Algorithms (3rd Edition)", type: "Textbook", authors: "Cormen, T., Leiserson, C., Rivest, R., Stein, C.", year: 2009, isbn: "978-0-262-03384-8", link: "" },
            { id: "OR-ISS-001", title: "Legacy Software Architecture Patterns", type: "Online Resources", authors: "Garcia, M.", year: 2014, isbn: "", link: "https://example.com/legacy-arch" },
            { id: "OE-DEP-002", title: "Foundations of Computer Science (Outdated Edition)", type: "Open Educational Resources", authors: "Aho, A., Ullman, J.", year: 2010, isbn: "", link: "https://example.com/old-cs-foundations" },
            { id: "TB-VOLD-001", title: "The C Programming Language (1st Edition)", type: "Textbook", authors: "Kernighan, B.W., Ritchie, D.M.", year: 1978, isbn: "0-13-110163-3", link: "" }
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
            { id: 'CO1', description: 'Analyze network architectures using the OSI and TCP/IP models to explain data flow across networks.', poMappings: ['E','I','','','','','I','','','E','I','E',''] },
            { id: 'CO2', description: 'Implement application and transport layer protocols through socket programming and traffic analysis.', poMappings: ['','E','E','','','I','','','','I','E','',''] },
            { id: 'CO3', description: 'Design IP addressing schemes and configure routing protocols for enterprise networks.', poMappings: ['','','D','E','','','','I','','I','E','',''] },
            { id: 'CO4', description: 'Configure link layer technologies including Ethernet switching, VLANs, and wireless networks.', poMappings: ['D','','','','E','','','','I','I','I','',''] }
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
            { id: 'CO1', description: 'Develop semantic, accessible HTML5 structures with responsive CSS3 layouts.', poMappings: ['E','I','','','','','I','','','I','E','',''] },
            { id: 'CO2', description: 'Implement interactive client-side functionality using JavaScript and DOM manipulation.', poMappings: ['','E','E','','','I','','','','I','E','',''] },
            { id: 'CO3', description: 'Build modern single-page applications using React framework with component-based architecture.', poMappings: ['','','D','E','','','','I','','I','I','',''] },
            { id: 'CO4', description: 'Integrate web applications with backend services through RESTful APIs and authentication.', poMappings: ['D','','','','E','','','','I','I','I','',''] }
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
            { id: 'CO1', description: 'Apply the ML pipeline including data preprocessing, feature engineering, and model evaluation to solve real-world problems.', poMappings: ['E','I','','','','','E','','','I','I','E',''] },
            { id: 'CO2', description: 'Implement regression and classification algorithms using appropriate libraries and evaluate model performance.', poMappings: ['','E','E','I','','','','','','I','E','E',''] },
            { id: 'CO3', description: 'Apply unsupervised learning techniques for clustering and dimensionality reduction.', poMappings: ['','','D','E','','I','','','','I','I','E',''] },
            { id: 'CO4', description: 'Build and train neural network models for supervised learning tasks using deep learning frameworks.', poMappings: ['D','','','','E','','','I','','I','I','E',''] }
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
            { id: 'CO1', description: 'Design conceptual and logical database models using entity-relationship modeling and normalization.', poMappings: ['E','I','','','','','E','','','I','E','',''] },
            { id: 'CO2', description: 'Implement and query relational databases using SQL DDL and DML statements.', poMappings: ['','E','E','I','','','','','','I','E','',''] },
            { id: 'CO3', description: 'Manage database transactions ensuring ACID properties and appropriate concurrency control.', poMappings: ['','','D','E','','I','','','','I','I','',''] },
            { id: 'CO4', description: 'Design and implement a complete database solution from requirements through deployment.', poMappings: ['D','','','','E','','','I','','I','E','',''] }
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
            { id: "CO2-ILO3", courseOutcome: "Implement and query relational databases using SQL DDL and DML statements.", intendedLearningOutcome: "Normalize database schemas up to 3NF to eliminate data redundancy.", deliveryWeek: "Week 5", allocatedTime: "3 hours", topics: ["Normalization"], references: ["TB1 - Database System Concepts", "OE2 - Stanford Database Course"] },
            { id: "CO2-ILO1", courseOutcome: "Implement and query relational databases using SQL DDL and DML statements.", intendedLearningOutcome: "Write SQL DDL statements to create and modify database schemas.", deliveryWeek: "Week 2", allocatedTime: "2 hours", topics: ["SQL Fundamentals"], references: ["TB3 - Learning SQL", "OE1 - SQL Tutorial (W3Schools)"] },
            { id: "CO2-ILO2", courseOutcome: "Implement and query relational databases using SQL DDL and DML statements.", intendedLearningOutcome: "Write complex SQL queries with joins, subqueries, and aggregate functions.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["SQL Fundamentals"], references: ["TB3 - Learning SQL", "OR1 - PostgreSQL Documentation"] },
            { id: "CO3-ILO1", courseOutcome: "Manage database transactions ensuring ACID properties and appropriate concurrency control.", intendedLearningOutcome: "Explain ACID properties and their importance in transaction processing.", deliveryWeek: "Week 7", allocatedTime: "2 hours", topics: ["Transaction Management"], references: ["TB1 - Database System Concepts"] },
            { id: "CO3-ILO2", courseOutcome: "Manage database transactions ensuring ACID properties and appropriate concurrency control.", intendedLearningOutcome: "Implement transaction isolation levels to prevent concurrency anomalies.", deliveryWeek: "Week 8", allocatedTime: "2 hours", topics: ["Transaction Management"], references: ["TB1 - Database System Concepts", "OR1 - PostgreSQL Documentation"] },
            { id: "CO4-ILO1", courseOutcome: "Design and implement a complete database solution from requirements through deployment.", intendedLearningOutcome: "Design a complete database schema from business requirements.", deliveryWeek: "Week 10", allocatedTime: "3 hours", topics: ["Database Design Project"], references: ["TB2 - Database Systems: A Practical Approach to Design, Implementation, and Management"] },
            { id: "CO4-ILO2", courseOutcome: "Design and implement a complete database solution from requirements through deployment.", intendedLearningOutcome: "Optimize SQL queries using indexes and execution plan analysis.", deliveryWeek: "Week 11", allocatedTime: "3 hours", topics: ["Database Design Project"], references: ["OR1 - PostgreSQL Documentation", "TB3 - Learning SQL"] }
        ],
        gradingSystem: [
            { co: "CO1", ilos: [{ id: "ILO1", assessments: ["ER Diagram Exercise"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] },
            { co: "CO2", ilos: [{ id: "ILO1", assessments: ["SQL DDL Lab"], weight: { prelim: "", midterm: "30", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Complex Queries Lab"], weight: { prelim: "", midterm: "40", semi: "", final: "" }, minPassing: "60" }, { id: "ILO3", assessments: ["Normalization Exercise"], weight: { prelim: "", midterm: "30", semi: "", final: "" }, minPassing: "60" }] },
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
            { id: 'CO1', description: 'Apply mathematical logic to construct and evaluate logical arguments and proofs.', poMappings: ['E','I','','','','','E','','','I','I','E',''] },
            { id: 'CO2', description: 'Apply set theory, functions, and relations to model computational structures.', poMappings: ['','E','I','','','','','','','I','I','',''] },
            { id: 'CO3', description: 'Solve counting problems using combinatorial principles and probability theory.', poMappings: ['','','E','I','','E','','','','I','I','',''] },
            { id: 'CO4', description: 'Model and solve problems using graph theory concepts and algorithms.', poMappings: ['D','','','E','','','','I','','I','I','',''] }
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
            { id: 'CO1', description: 'Develop information security governance frameworks aligned with industry standards and regulations.', poMappings: ['E','I','','','','','E','','','I','E','','E'] },
            { id: 'CO2', description: 'Perform risk assessments and develop risk management strategies for organizational assets.', poMappings: ['','E','E','I','','','','','','I','E','',''] },
            { id: 'CO3', description: 'Implement access control models and identity management solutions for enterprise environments.', poMappings: ['','','D','E','','I','','','','I','E','',''] },
            { id: 'CO4', description: 'Design business continuity and disaster recovery plans with compliance audit capabilities.', poMappings: ['D','','','','E','','','I','','I','E','',''] }
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
            { id: 'CO1', description: 'Analyze time and space complexity of algorithms.', poMappings: ['E','I','I','','E','','','','','I','I','E',''] },
            { id: 'CO2', description: 'Implement and apply fundamental data structures.', poMappings: ['D','E','E','','','I','','','','I','E','',''] },
            { id: 'CO3', description: 'Design algorithms for sorting, searching, and graph problems.', poMappings: ['','E','D','I','E','','','','','I','E','',''] }
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
            { id: 'CO1', description: 'Apply OOP principles to design modular software systems.', poMappings: ['E','I','','E','','','','','','I','E','',''] },
            { id: 'CO2', description: 'Implement design patterns to solve common software problems.', poMappings: ['D','E','E','','','I','','','','I','E','',''] },
            { id: 'CO3', description: 'Create UML models to communicate software architecture.', poMappings: ['','','I','E','D','','','','','E','E','',''] }
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
            { id: 'CO1', description: 'Apply agile methodologies to manage software projects.', poMappings: ['I','I','','E','E','','','','','I','E','',''] },
            { id: 'CO2', description: 'Elicit and document software requirements.', poMappings: ['E','E','','','I','I','','','','E','I','',''] },
            { id: 'CO3', description: 'Implement and execute software testing strategies.', poMappings: ['D','','E','E','','','I','I','','I','E','',''] }
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
            { id: 'CO1', description: 'Apply supervised learning algorithms to classification and regression problems.', poMappings: ['E','D','E','','E','','','','','I','I','E',''] },
            { id: 'CO2', description: 'Apply unsupervised learning techniques for data exploration.', poMappings: ['','E','D','I','','I','','','','I','I','E',''] },
            { id: 'CO3', description: 'Design and train neural networks for complex pattern recognition.', poMappings: ['D','','E','E','D','','','','','I','E','',''] }
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
            { id: 'CO1', description: 'Build cross-platform mobile applications using React Native.', poMappings: ['D','E','D','','E','I','','','','I','I','',''] },
            { id: 'CO2', description: 'Design mobile interfaces following platform-specific guidelines.', poMappings: ['E','','I','D','','E','','','','I','E','',''] },
            { id: 'CO3', description: 'Integrate native device APIs and publish apps to app stores.', poMappings: ['D','E','','E','','','I','I','','I','I','',''] }
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
            { id: 'CO1', description: 'Develop frontend interfaces using modern JavaScript frameworks.', poMappings: ['E','E','D','','E','I','','','','I','E','',''] },
            { id: 'CO2', description: 'Build RESTful APIs with database persistence.', poMappings: ['D','E','E','I','','','','','','I','I','',''] },
            { id: 'CO3', description: 'Implement authentication and security measures in web applications.', poMappings: ['E','','','D','E','E','I','','','I','E','','E'] }
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
            { id: 'CO1', description: 'Optimize database queries and design efficient indexing strategies.', poMappings: ['E','E','I','','','','','I','','I','E','',''] },
            { id: 'CO2', description: 'Implement backup, recovery, and replication for high availability.', poMappings: ['D','E','','I','E','','','','','I','E','',''] },
            { id: 'CO3', description: 'Design and implement NoSQL data models for modern applications.', poMappings: ['E','','D','E','','I','','','','I','E','',''] }
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
            { id: 'CO1', description: 'Design microservice-based architectures following enterprise patterns.', poMappings: ['E','D','E','','','I','','','','I','E','',''] },
            { id: 'CO2', description: 'Implement API gateways and message brokering for system integration.', poMappings: ['D','E','D','E','','','I','','','I','E','',''] },
            { id: 'CO3', description: 'Deploy cloud-native applications using containers and orchestration.', poMappings: ['D','','E','D','E','','','I','I','I','I','',''] }
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
    {
        code: "BSCS101",
        name: "Discrete Mathematics",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "None",
        class: "General Education",
        cmo: "25 S, 2015",
        year: "FIRST YEAR",
        sem: "1st Semester",
        description: "An introduction to discrete mathematical structures.",
        references: [
        {
          id: "TB1",
          title: "Discrete Mathematics and Its Applications",
          type: "Textbook",
          authors: "Kenneth Rosen",
          year: 2019,
          isbn: "978-1259676512",
          link: ""
        },
        {
          id: "TB2",
          title: "Concrete Mathematics",
          type: "Textbook",
          authors: "Ronald Graham, Donald Knuth",
          year: 1994,
          isbn: "978-0201558029",
          link: ""
        },
        {
          id: "OR1",
          title: "Discrete Math Tutorial",
          type: "Online Resources",
          authors: "TrevTutor",
          year: 2024,
          link: "https://www.trevtutor.com/discrete"
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Propositional Logic",
          subtopics: [
            {
              id: "S1",
              value: "Truth Tables"
            },
            {
              id: "S2",
              value: "Logical Equivalences"
            },
            {
              id: "S3",
              value: "Predicates and Quantifiers"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Logic Lecture",
              tlaDescription: "Introduction to propositional logic, truth tables, and logical equivalences.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Logic Exercises",
              tlaDescription: "Students solve propositional logic problems and construct truth tables.",
              laboratory: false
            }
          ]
        },
        {
          id: "T2",
          title: "Set Theory",
          subtopics: [
            {
              id: "S4",
              value: "Set Operations"
            },
            {
              id: "S5",
              value: "Functions and Relations"
            },
            {
              id: "S6",
              value: "Cardinality"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Set Theory Lecture",
              tlaDescription: "Lecture on set operations, functions, and relations.",
              laboratory: false
            },
            {
              id: "TLA4",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Set Problems",
              tlaDescription: "Students solve problems involving set operations and relations.",
              laboratory: false
            }
          ]
        },
        {
          id: "T3",
          title: "Graph Theory",
          subtopics: [
            {
              id: "S7",
              value: "Graph Types"
            },
            {
              id: "S8",
              value: "Euler and Hamiltonian Paths"
            },
            {
              id: "S9",
              value: "Tree Traversals"
            }
          ],
          tlas: [
            {
              id: "TLA5",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Graph Lab",
              tlaDescription: "Students model problems using graph structures and analyze graph properties.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Apply logical reasoning and set theory to formulate and solve computational problems.",
          poMappings: ["I","","","","","","","","","I","I","",""]
        },
        {
          id: "CO2",
          description: "Analyze relations and functions to determine their properties and applications in computing.",
          poMappings: ["I","","","","","","","","","I","I","",""]
        },
        {
          id: "CO3",
          description: "Apply graph theory concepts to model and solve real-world problems.",
          poMappings: ["","E","I","","","","","","","I","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Logic Problem Set",
            description: "Problem set covering propositional logic, truth tables, and logical equivalences."
          },
          {
            value: "Set Theory Quiz",
            description: "Quiz on set operations, functions, and relations."
          }
        ],
        CO2: [
          {
            value: "Relations Worksheet",
            description: "Worksheet on properties of relations and functions."
          }
        ],
        CO3: [
          {
            value: "Graph Theory Project",
            description: "Project applying graph algorithms to a real-world problem."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Logic Lecture",
          phase: "Pre-class",
          assessmentMethod: "Problem Set",
          assessmentDescription: "Problem set on propositional logic.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Logic Exercises",
          phase: "In-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on logical equivalences and quantifiers.",
          hasRubric: false
        },
        {
          id: "A3",
          tlaName: "Graph Lab",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Graph theory analysis report.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis depth",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Apply logical reasoning and set theory to formulate and solve computational problems.",
          intendedLearningOutcome: "Construct truth tables and evaluate logical expressions.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Propositional Logic"
          ],
          references: [
            "TB1 - Discrete Mathematics"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Analyze relations and functions to determine their properties and applications in computing.",
          intendedLearningOutcome: "Determine properties of relations and classify functions.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Set Theory"
          ],
          references: [
            "TB1 - Discrete Mathematics"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Apply graph theory concepts to model and solve real-world problems.",
          intendedLearningOutcome: "Implement graph traversal algorithms and analyze their complexity.",
          deliveryWeek: "Week 7",
          allocatedTime: "3 hours",
          topics: [
            "Graph Theory"
          ],
          references: [
            "TB2 - Concrete Mathematics"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Logic Problem Set"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            },
            {
              id: "ILO2",
              assessments: [
                "Set Theory Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Relations Worksheet"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Graph Theory Project"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "60",
                final: "60"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS102",
        name: "Programming Fundamentals",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "None",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FIRST YEAR",
        sem: "1st Semester",
        description: "Introduction to programming using structured and object-oriented paradigms.",
        references: [
        {
          id: "TB1",
          title: "Starting Out with Programming Logic & Design",
          type: "Textbook",
          authors: "Tony Gaddis",
          year: 2020,
          isbn: "978-0134801155",
          link: ""
        },
        {
          id: "TB2",
          title: "Introduction to Programming in Python",
          type: "Textbook",
          authors: "John Zelle",
          year: 2016,
          isbn: "978-1590282755",
          link: ""
        },
        {
          id: "OR1",
          title: "Python.org Tutorial",
          type: "Online Resources",
          authors: "Python Software Foundation",
          year: 2024,
          link: "https://docs.python.org/3/tutorial/"
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Programming Basics",
          subtopics: [
            {
              id: "S1",
              value: "Variables and Data Types"
            },
            {
              id: "S2",
              value: "Input/Output"
            },
            {
              id: "S3",
              value: "Arithmetic Operations"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Intro Programming Lecture",
              tlaDescription: "Introduction to programming concepts, variables, and data types.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Basic Programs Lab",
              tlaDescription: "Students write simple programs using variables and I/O.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Control Structures",
          subtopics: [
            {
              id: "S4",
              value: "Conditional Statements"
            },
            {
              id: "S5",
              value: "Loops"
            },
            {
              id: "S6",
              value: "Nested Control Structures"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Control Flow Lab",
              tlaDescription: "Students implement programs using conditionals and loops.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Functions and Arrays",
          subtopics: [
            {
              id: "S7",
              value: "Function Definition"
            },
            {
              id: "S8",
              value: "Parameters and Return"
            },
            {
              id: "S9",
              value: "Array Operations"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Functions Lab",
              tlaDescription: "Students write programs with functions and arrays.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Design and implement programs using fundamental programming constructs.",
          poMappings: ["I","","","","","","","","","I","E","",""]
        },
        {
          id: "CO2",
          description: "Develop programs using control structures and modular design.",
          poMappings: ["I","","","","","","","","","I","E","",""]
        },
        {
          id: "CO3",
          description: "Create programs that manipulate data using arrays and functions.",
          poMappings: ["","E","I","","","","","","","I","E","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Programming Quiz",
            description: "Quiz on programming fundamentals."
          },
          {
            value: "Lab Exercises",
            description: "Basic programming lab exercises."
          }
        ],
        CO2: [
          {
            value: "Control Structures Lab",
            description: "Lab exercise on conditionals and loops."
          }
        ],
        CO3: [
          {
            value: "Functions Assignment",
            description: "Assignment on functions and arrays."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Intro Programming Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on programming basics.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Basic Programs Lab",
          phase: "In-class",
          assessmentMethod: "Lab Submission",
          assessmentDescription: "Submit working programs.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Code style",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Functions Lab",
          phase: "In-class",
          assessmentMethod: "Code Submission",
          assessmentDescription: "Programs demonstrating functions and arrays.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Functionality",
              maxScore: "70"
            },
            {
              id: 2,
              criteria: "Code organization",
              maxScore: "30"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Design and implement programs using fundamental programming constructs.",
          intendedLearningOutcome: "Write programs using variables, data types, and I/O operations.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Programming Basics"
          ],
          references: [
            "TB1 - Starting Out with Programming Logic"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Develop programs using control structures and modular design.",
          intendedLearningOutcome: "Implement conditional and iterative logic to solve problems.",
          deliveryWeek: "Week 3",
          allocatedTime: "3 hours",
          topics: [
            "Control Structures"
          ],
          references: [
            "TB2 - Introduction to Programming in Python"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Create programs that manipulate data using arrays and functions.",
          intendedLearningOutcome: "Design functions with appropriate parameters and return values.",
          deliveryWeek: "Week 6",
          allocatedTime: "3 hours",
          topics: [
            "Functions and Arrays"
          ],
          references: [
            "OR1 - Python.org Tutorial"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Lab Exercises"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Control Structures Lab"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Functions Assignment"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "60",
                final: "60"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS103",
        name: "Data Structures & Algorithms",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS102 Programming Fundamentals",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FIRST YEAR",
        sem: "2nd Semester",
        description: "Study of fundamental data structures and algorithm design techniques.",
        references: [
        {
          id: "TB1",
          title: "Data Structures and Algorithm Analysis in C++",
          type: "Textbook",
          authors: "Mark Allen Weiss",
          year: 2020,
          isbn: "978-0134853765",
          link: ""
        },
        {
          id: "TB2",
          title: "Introduction to Algorithms",
          type: "Textbook",
          authors: "Thomas H. Cormen",
          year: 2022,
          isbn: "978-0262046305",
          link: ""
        },
        {
          id: "OE1",
          title: "Visualgo.net",
          type: "Open Educational Resources",
          authors: "Steven Halim",
          year: 2024,
          link: "https://visualgo.net/"
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Linear Data Structures",
          subtopics: [
            {
              id: "S1",
              value: "Arrays and Linked Lists"
            },
            {
              id: "S2",
              value: "Stacks and Queues"
            },
            {
              id: "S3",
              value: "Hash Tables"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "DS Lecture",
              tlaDescription: "Lecture on linear data structures and their implementations.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "DS Implementation Lab",
              tlaDescription: "Students implement linked lists, stacks, and queues.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Trees and Graphs",
          subtopics: [
            {
              id: "S4",
              value: "Binary Search Trees"
            },
            {
              id: "S5",
              value: "AVL Trees"
            },
            {
              id: "S6",
              value: "Graph Representations"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Tree Lab",
              tlaDescription: "Students implement BST and tree traversal algorithms.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Sorting and Searching",
          subtopics: [
            {
              id: "S7",
              value: "Merge Sort and Quick Sort"
            },
            {
              id: "S8",
              value: "Binary Search"
            },
            {
              id: "S9",
              value: "Complexity Analysis"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Sorting Lab",
              tlaDescription: "Students implement and benchmark sorting algorithms.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Implement and analyze fundamental data structures and their operations.",
          poMappings: ["I","","","","","","E","","","I","E","E",""]
        },
        {
          id: "CO2",
          description: "Apply appropriate data structures to solve computational problems efficiently.",
          poMappings: ["E","I","","","","","","","","I","E","E",""]
        },
        {
          id: "CO3",
          description: "Design and analyze algorithms for sorting, searching, and graph processing.",
          poMappings: ["","E","E","I","","","","","","I","E","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "DS Implementation",
            description: "Implement core data structures from scratch."
          },
          {
            value: "DS Quiz",
            description: "Quiz on data structure properties and operations."
          }
        ],
        CO2: [
          {
            value: "Problem Solving",
            description: "Select and apply appropriate data structures."
          }
        ],
        CO3: [
          {
            value: "Algorithm Analysis",
            description: "Analyze and compare algorithm performance."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "DS Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on data structure concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "DS Implementation Lab",
          phase: "In-class",
          assessmentMethod: "Code Submission",
          assessmentDescription: "Working implementations of data structures.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Efficiency",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Sorting Lab",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Sorting algorithm benchmark analysis.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Implementation",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Implement and analyze fundamental data structures and their operations.",
          intendedLearningOutcome: "Implement linked lists, stacks, and queues with their core operations.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Linear Data Structures"
          ],
          references: [
            "TB1 - Data Structures and Algorithm Analysis"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply appropriate data structures to solve computational problems efficiently.",
          intendedLearningOutcome: "Select the optimal data structure for a given problem scenario.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Trees and Graphs"
          ],
          references: [
            "OE1 - Visualgo.net"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Design and analyze algorithms for sorting, searching, and graph processing.",
          intendedLearningOutcome: "Implement sorting algorithms and analyze time complexity.",
          deliveryWeek: "Week 7",
          allocatedTime: "3 hours",
          topics: [
            "Sorting and Searching"
          ],
          references: [
            "TB2 - Introduction to Algorithms"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "DS Implementation"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Problem Solving"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Algorithm Analysis"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "60",
                final: "60"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS201",
        name: "Object-Oriented Programming",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS102 Programming Fundamentals",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "SECOND YEAR",
        sem: "1st Semester",
        description: "Advanced programming concepts using OOP principles.",
        references: [
        {
          id: "TB1",
          title: "Object-Oriented Programming in Java",
          type: "Textbook",
          authors: "David J. Barnes",
          year: 2020,
          isbn: "978-0134821498",
          link: ""
        },
        {
          id: "TB2",
          title: "Head First Design Patterns",
          type: "Textbook",
          authors: "Eric Freeman",
          year: 2020,
          isbn: "978-1492078005",
          link: ""
        },
        {
          id: "OR1",
          title: "Java Tutorials",
          type: "Online Resources",
          authors: "Oracle",
          year: 2024,
          link: "https://docs.oracle.com/javase/tutorial/"
        }
      ],
        topics: [
        {
          id: "T1",
          title: "OOP Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Classes and Objects"
            },
            {
              id: "S2",
              value: "Encapsulation"
            },
            {
              id: "S3",
              value: "Constructors and Methods"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "OOP Lecture",
              tlaDescription: "Introduction to object-oriented programming concepts.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "OOP Lab 1",
              tlaDescription: "Students create classes with methods and properties.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Inheritance and Polymorphism",
          subtopics: [
            {
              id: "S4",
              value: "Inheritance Hierarchies"
            },
            {
              id: "S5",
              value: "Polymorphism"
            },
            {
              id: "S6",
              value: "Abstract Classes and Interfaces"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "OOP Lab 2",
              tlaDescription: "Students implement inheritance hierarchies and polymorphic behavior.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Exception Handling and I/O",
          subtopics: [
            {
              id: "S7",
              value: "Try-Catch-Finally"
            },
            {
              id: "S8",
              value: "File I/O"
            },
            {
              id: "S9",
              value: "Serialization"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "I/O Lab",
              tlaDescription: "Students implement file I/O and exception handling.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Design and implement classes applying OOP principles.",
          poMappings: ["I","","","","","","","","","I","E","",""]
        },
        {
          id: "CO2",
          description: "Create reusable software components using inheritance and polymorphism.",
          poMappings: ["I","","","","E","","","","","I","E","",""]
        },
        {
          id: "CO3",
          description: "Develop robust applications with proper exception handling and file I/O.",
          poMappings: ["","E","I","","","","","","","I","E","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Class Design Exercise",
            description: "Design and implement classes for given specifications."
          },
          {
            value: "OOP Quiz",
            description: "Quiz on OOP principles."
          }
        ],
        CO2: [
          {
            value: "Inheritance Project",
            description: "Implement an inheritance hierarchy with polymorphic behavior."
          }
        ],
        CO3: [
          {
            value: "I/O Assignment",
            description: "Program with file I/O and exception handling."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "OOP Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on OOP concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "OOP Lab 1",
          phase: "In-class",
          assessmentMethod: "Code Submission",
          assessmentDescription: "Class implementation exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Design",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Implementation",
              maxScore: "50"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "OOP Lab 2",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Inheritance and polymorphism implementation.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Code quality",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Design and implement classes applying OOP principles.",
          intendedLearningOutcome: "Create classes with fields, constructors, and methods.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "OOP Fundamentals"
          ],
          references: [
            "TB1 - Object-Oriented Programming in Java"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Create reusable software components using inheritance and polymorphism.",
          intendedLearningOutcome: "Design class hierarchies using inheritance and interfaces.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Inheritance and Polymorphism"
          ],
          references: [
            "TB2 - Head First Design Patterns"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Develop robust applications with proper exception handling and file I/O.",
          intendedLearningOutcome: "Implement try-catch blocks and file read/write operations.",
          deliveryWeek: "Week 7",
          allocatedTime: "3 hours",
          topics: [
            "Exception Handling and I/O"
          ],
          references: [
            "OR1 - Java Tutorials"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Class Design Exercise"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Inheritance Project"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "I/O Assignment"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "60",
                final: "60"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS202",
        name: "Database Management Systems",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS103 Data Structures",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "SECOND YEAR",
        sem: "2nd Semester",
        description: "Design and implementation of relational database systems.",
        references: [
        {
          id: "TB1",
          title: "Database Management Systems: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Database Management Systems Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to database management systems.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on database management systems fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply database management systems concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in database management systems.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of database management systems.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply database management systems techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in database management systems.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on database management systems fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in database management systems."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced database management systems topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on database management systems concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on database management systems exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on database management systems trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of database management systems.",
          intendedLearningOutcome: "Describe the core principles of database management systems.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Database Management Systems"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply database management systems techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using database management systems techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in database management systems.",
          intendedLearningOutcome: "Analyze current research and trends in database management systems.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Database Management Systems"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS203",
        name: "Discrete Structures II",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "BSCS101 Discrete Mathematics",
        class: "General Education",
        cmo: "25 S, 2015",
        year: "SECOND YEAR",
        sem: "1st Semester",
        description: "Advanced topics in discrete structures for computing.",
        references: [
        {
          id: "TB1",
          title: "Discrete Structures II: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Discrete Structures II Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to discrete structures ii.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on discrete structures ii fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply discrete structures ii concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of discrete structures ii.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply discrete structures ii techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on discrete structures ii fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in discrete structures ii."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on discrete structures ii concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on discrete structures ii exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of discrete structures ii.",
          intendedLearningOutcome: "Describe the core principles of discrete structures ii.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Discrete Structures II"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply discrete structures ii techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using discrete structures ii techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS301",
        name: "Automata Theory",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "BSCS103 Data Structures",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "THIRD YEAR",
        sem: "1st Semester",
        description: "Study of abstract machines, formal languages, and computational complexity.",
        references: [
        {
          id: "TB1",
          title: "Automata Theory: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Automata Theory Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to automata theory.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on automata theory fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply automata theory concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in automata theory.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of automata theory.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply automata theory techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in automata theory.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on automata theory fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in automata theory."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced automata theory topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on automata theory concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on automata theory exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on automata theory trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of automata theory.",
          intendedLearningOutcome: "Describe the core principles of automata theory.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Automata Theory"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply automata theory techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using automata theory techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in automata theory.",
          intendedLearningOutcome: "Analyze current research and trends in automata theory.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Automata Theory"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS302",
        name: "Compiler Design",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS301 Automata Theory",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "THIRD YEAR",
        sem: "2nd Semester",
        description: "Principles and techniques for designing and implementing compilers.",
        references: [
        {
          id: "TB1",
          title: "Compiler Design: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Compiler Design Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to compiler design.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on compiler design fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply compiler design concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in compiler design.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of compiler design.",
          poMappings: ["I","","","","","","","","","E","E","",""]
        },
        {
          id: "CO2",
          description: "Apply compiler design techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","E","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in compiler design.",
          poMappings: ["","","","","","","D","","","I","E","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on compiler design fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in compiler design."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced compiler design topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on compiler design concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on compiler design exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on compiler design trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of compiler design.",
          intendedLearningOutcome: "Describe the core principles of compiler design.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Compiler Design"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply compiler design techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using compiler design techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in compiler design.",
          intendedLearningOutcome: "Analyze current research and trends in compiler design.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Compiler Design"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS303",
        name: "Numerical Methods",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS103 Data Structures",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "THIRD YEAR",
        sem: "2nd Semester",
        description: "Numerical techniques for solving mathematical problems.",
        references: [
        {
          id: "TB1",
          title: "Numerical Methods: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Numerical Methods Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to numerical methods.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on numerical methods fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply numerical methods concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of numerical methods.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply numerical methods techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on numerical methods fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in numerical methods."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on numerical methods concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on numerical methods exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of numerical methods.",
          intendedLearningOutcome: "Describe the core principles of numerical methods.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Numerical Methods"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply numerical methods techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using numerical methods techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS401",
        name: "Software Quality Assurance",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS322L Software Engineering",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Principles and practices of software quality assurance and testing.",
        references: [
        {
          id: "TB1",
          title: "Software Quality Assurance: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Software Quality Assurance Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to software quality assurance.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on software quality assurance fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply software quality assurance concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in software quality assurance.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of software quality assurance.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply software quality assurance techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in software quality assurance.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on software quality assurance fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in software quality assurance."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced software quality assurance topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on software quality assurance concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on software quality assurance exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on software quality assurance trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of software quality assurance.",
          intendedLearningOutcome: "Describe the core principles of software quality assurance.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Software Quality Assurance"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply software quality assurance techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using software quality assurance techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in software quality assurance.",
          intendedLearningOutcome: "Analyze current research and trends in software quality assurance.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Software Quality Assurance"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS402",
        name: "Machine Learning",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS301 Automata Theory",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "An introduction to machine learning algorithms and their applications.",
        references: [
        {
          id: "TB1",
          title: "Machine Learning: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Machine Learning Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to machine learning.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on machine learning fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply machine learning concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in machine learning.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of machine learning.",
          poMappings: ["I","","","","","","","","","E","I","E",""]
        },
        {
          id: "CO2",
          description: "Apply machine learning techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","E",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in machine learning.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on machine learning fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in machine learning."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced machine learning topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on machine learning concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on machine learning exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on machine learning trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of machine learning.",
          intendedLearningOutcome: "Describe the core principles of machine learning.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Machine Learning"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply machine learning techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using machine learning techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in machine learning.",
          intendedLearningOutcome: "Analyze current research and trends in machine learning.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Machine Learning"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS403",
        name: "Parallel Computing",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS314L Operating Systems",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Study of parallel computing architectures and programming models.",
        references: [
        {
          id: "TB1",
          title: "Parallel Computing: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Parallel Computing Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to parallel computing.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on parallel computing fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply parallel computing concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of parallel computing.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply parallel computing techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on parallel computing fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in parallel computing."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on parallel computing concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on parallel computing exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of parallel computing.",
          intendedLearningOutcome: "Describe the core principles of parallel computing.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Parallel Computing"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply parallel computing techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using parallel computing techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS404",
        name: "Computer Graphics",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS103 Data Structures",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Fundamentals of computer graphics, rendering, and visualization.",
        references: [
        {
          id: "TB1",
          title: "Computer Graphics: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Computer Graphics Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to computer graphics.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on computer graphics fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply computer graphics concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in computer graphics.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of computer graphics.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply computer graphics techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in computer graphics.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on computer graphics fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in computer graphics."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced computer graphics topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on computer graphics concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on computer graphics exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on computer graphics trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of computer graphics.",
          intendedLearningOutcome: "Describe the core principles of computer graphics.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Computer Graphics"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply computer graphics techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using computer graphics techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in computer graphics.",
          intendedLearningOutcome: "Analyze current research and trends in computer graphics.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Computer Graphics"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS405",
        name: "Natural Language Processing",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS301 Automata Theory",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Study of computational approaches to natural language understanding and generation.",
        references: [
        {
          id: "TB1",
          title: "Natural Language Processing: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Natural Language Processing Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to natural language processing.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on natural language processing fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply natural language processing concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of natural language processing.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply natural language processing techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on natural language processing fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in natural language processing."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on natural language processing concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on natural language processing exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of natural language processing.",
          intendedLearningOutcome: "Describe the core principles of natural language processing.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Natural Language Processing"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply natural language processing techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using natural language processing techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS406",
        name: "Embedded Systems",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS314L Operating Systems",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Design and programming of embedded systems and IoT devices.",
        references: [
        {
          id: "TB1",
          title: "Embedded Systems: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Embedded Systems Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to embedded systems.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on embedded systems fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply embedded systems concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in embedded systems.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of embedded systems.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply embedded systems techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in embedded systems.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on embedded systems fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in embedded systems."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced embedded systems topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on embedded systems concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on embedded systems exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on embedded systems trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of embedded systems.",
          intendedLearningOutcome: "Describe the core principles of embedded systems.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Embedded Systems"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply embedded systems techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using embedded systems techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in embedded systems.",
          intendedLearningOutcome: "Analyze current research and trends in embedded systems.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Embedded Systems"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS407",
        name: "Advanced Algorithms",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "BSCS103 Data Structures",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Advanced algorithmic techniques and complexity analysis.",
        references: [
        {
          id: "TB1",
          title: "Advanced Algorithms: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Advanced Algorithms Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to advanced algorithms.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on advanced algorithms fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply advanced algorithms concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of advanced algorithms.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply advanced algorithms techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on advanced algorithms fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in advanced algorithms."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on advanced algorithms concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on advanced algorithms exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of advanced algorithms.",
          intendedLearningOutcome: "Describe the core principles of advanced algorithms.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Advanced Algorithms"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply advanced algorithms techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using advanced algorithms techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS408",
        name: "Distributed Systems",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS331L Computer Networks",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Principles and design of distributed computing systems.",
        references: [
        {
          id: "TB1",
          title: "Distributed Systems: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Distributed Systems Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to distributed systems.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on distributed systems fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply distributed systems concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in distributed systems.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of distributed systems.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply distributed systems techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in distributed systems.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on distributed systems fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in distributed systems."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced distributed systems topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on distributed systems concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on distributed systems exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on distributed systems trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of distributed systems.",
          intendedLearningOutcome: "Describe the core principles of distributed systems.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Distributed Systems"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply distributed systems techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using distributed systems techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in distributed systems.",
          intendedLearningOutcome: "Analyze current research and trends in distributed systems.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Distributed Systems"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS409",
        name: "Blockchain Technology",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS351L Cybersecurity",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Study of blockchain architecture, smart contracts, and decentralized applications.",
        references: [
        {
          id: "TB1",
          title: "Blockchain Technology: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Blockchain Technology Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to blockchain technology.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on blockchain technology fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply blockchain technology concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in blockchain technology.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of blockchain technology.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply blockchain technology techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in blockchain technology.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on blockchain technology fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in blockchain technology."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced blockchain technology topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on blockchain technology concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on blockchain technology exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on blockchain technology trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of blockchain technology.",
          intendedLearningOutcome: "Describe the core principles of blockchain technology.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Blockchain Technology"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply blockchain technology techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using blockchain technology techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in blockchain technology.",
          intendedLearningOutcome: "Analyze current research and trends in blockchain technology.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Blockchain Technology"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS501",
        name: "Capstone Project 1",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "BSCS409 Blockchain Technology",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "First phase of the capstone project focusing on proposal and research.",
        references: [
        {
          id: "TB1",
          title: "Capstone Project 1: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Capstone Project 1 Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to capstone project 1.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on capstone project 1 fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply capstone project 1 concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of capstone project 1.",
          poMappings: ["I","","","","","","","","","E","E","",""]
        },
        {
          id: "CO2",
          description: "Apply capstone project 1 techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","E","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on capstone project 1 fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in capstone project 1."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on capstone project 1 concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on capstone project 1 exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of capstone project 1.",
          intendedLearningOutcome: "Describe the core principles of capstone project 1.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Capstone Project 1"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply capstone project 1 techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using capstone project 1 techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS502",
        name: "Capstone Project 2",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "BSCS501 Capstone Project 1",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Second phase focusing on implementation, testing, and defense.",
        references: [
        {
          id: "TB1",
          title: "Capstone Project 2: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Capstone Project 2 Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to capstone project 2.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on capstone project 2 fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply capstone project 2 concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of capstone project 2.",
          poMappings: ["I","","","","","","","","","E","E","",""]
        },
        {
          id: "CO2",
          description: "Apply capstone project 2 techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","E","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on capstone project 2 fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in capstone project 2."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on capstone project 2 concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on capstone project 2 exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of capstone project 2.",
          intendedLearningOutcome: "Describe the core principles of capstone project 2.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Capstone Project 2"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply capstone project 2 techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using capstone project 2 techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS503",
        name: "Professional Ethics in Computing",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "None",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Ethical and legal issues in computing and technology.",
        references: [
        {
          id: "TB1",
          title: "Professional Ethics in Computing: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Professional Ethics in Computing Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to professional ethics in computing.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on professional ethics in computing fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply professional ethics in computing concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of professional ethics in computing.",
          poMappings: ["I","","","","","","","","","E","I","","E"]
        },
        {
          id: "CO2",
          description: "Apply professional ethics in computing techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","","E"]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on professional ethics in computing fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in professional ethics in computing."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on professional ethics in computing concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on professional ethics in computing exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of professional ethics in computing.",
          intendedLearningOutcome: "Describe the core principles of professional ethics in computing.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Professional Ethics in Computing"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply professional ethics in computing techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using professional ethics in computing techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS504",
        name: "Technical Writing for CS",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "None",
        class: "General Education",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Technical communication and documentation for computer science.",
        references: [
        {
          id: "TB1",
          title: "Technical Writing for CS: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Technical Writing for CS Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to technical writing for cs.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on technical writing for cs fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply technical writing for cs concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of technical writing for cs.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply technical writing for cs techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on technical writing for cs fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in technical writing for cs."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on technical writing for cs concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on technical writing for cs exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of technical writing for cs.",
          intendedLearningOutcome: "Describe the core principles of technical writing for cs.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Technical Writing for CS"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply technical writing for cs techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using technical writing for cs techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS505",
        name: "Software Architecture",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS322L Software Engineering",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Design and evaluation of software architecture patterns.",
        references: [
        {
          id: "TB1",
          title: "Software Architecture: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Software Architecture Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to software architecture.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on software architecture fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply software architecture concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in software architecture.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of software architecture.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply software architecture techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in software architecture.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on software architecture fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in software architecture."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced software architecture topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on software architecture concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on software architecture exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on software architecture trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of software architecture.",
          intendedLearningOutcome: "Describe the core principles of software architecture.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Software Architecture"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply software architecture techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using software architecture techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in software architecture.",
          intendedLearningOutcome: "Analyze current research and trends in software architecture.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Software Architecture"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS506",
        name: "Data Mining",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS303 Numerical Methods",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Techniques for discovering patterns in large datasets.",
        references: [
        {
          id: "TB1",
          title: "Data Mining: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Data Mining Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to data mining.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on data mining fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply data mining concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in data mining.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of data mining.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply data mining techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in data mining.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on data mining fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in data mining."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced data mining topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on data mining concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on data mining exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on data mining trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of data mining.",
          intendedLearningOutcome: "Describe the core principles of data mining.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Data Mining"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply data mining techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using data mining techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in data mining.",
          intendedLearningOutcome: "Analyze current research and trends in data mining.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Data Mining"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS507",
        name: "Computer Vision",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS404 Computer Graphics",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Image processing, feature detection, and object recognition.",
        references: [
        {
          id: "TB1",
          title: "Computer Vision: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Computer Vision Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to computer vision.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on computer vision fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply computer vision concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in computer vision.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of computer vision.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply computer vision techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in computer vision.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on computer vision fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in computer vision."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced computer vision topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on computer vision concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on computer vision exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on computer vision trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of computer vision.",
          intendedLearningOutcome: "Describe the core principles of computer vision.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Computer Vision"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply computer vision techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using computer vision techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in computer vision.",
          intendedLearningOutcome: "Analyze current research and trends in computer vision.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Computer Vision"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS508",
        name: "Quantum Computing",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "BSCS301 Automata Theory",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Introduction to quantum computing principles and algorithms.",
        references: [
        {
          id: "TB1",
          title: "Quantum Computing: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Quantum Computing Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to quantum computing.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on quantum computing fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply quantum computing concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of quantum computing.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply quantum computing techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on quantum computing fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in quantum computing."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on quantum computing concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on quantum computing exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of quantum computing.",
          intendedLearningOutcome: "Describe the core principles of quantum computing.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Quantum Computing"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply quantum computing techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using quantum computing techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS509",
        name: "Big Data Analytics",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS506 Data Mining",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Distributed processing and analysis of large-scale data.",
        references: [
        {
          id: "TB1",
          title: "Big Data Analytics: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Big Data Analytics Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to big data analytics.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on big data analytics fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply big data analytics concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of big data analytics.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply big data analytics techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on big data analytics fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in big data analytics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on big data analytics concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on big data analytics exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of big data analytics.",
          intendedLearningOutcome: "Describe the core principles of big data analytics.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Big Data Analytics"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply big data analytics techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using big data analytics techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS510",
        name: "Advanced Web Development",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "IT 312 Web Systems",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Full-stack web development with modern frameworks.",
        references: [
        {
          id: "TB1",
          title: "Advanced Web Development: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Advanced Web Development Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to advanced web development.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on advanced web development fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply advanced web development concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in advanced web development.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of advanced web development.",
          poMappings: ["I","","","","","","","","","E","E","",""]
        },
        {
          id: "CO2",
          description: "Apply advanced web development techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","E","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in advanced web development.",
          poMappings: ["","","","","","","D","","","I","E","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on advanced web development fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in advanced web development."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced advanced web development topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on advanced web development concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on advanced web development exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on advanced web development trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of advanced web development.",
          intendedLearningOutcome: "Describe the core principles of advanced web development.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Advanced Web Development"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply advanced web development techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using advanced web development techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in advanced web development.",
          intendedLearningOutcome: "Analyze current research and trends in advanced web development.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Advanced Web Development"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS511",
        name: "Mobile Game Development",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS421L Mobile App Development",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Design and development of games for mobile platforms.",
        references: [
        {
          id: "TB1",
          title: "Mobile Game Development: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Mobile Game Development Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to mobile game development.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on mobile game development fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply mobile game development concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of mobile game development.",
          poMappings: ["I","","","","","","","","","E","E","",""]
        },
        {
          id: "CO2",
          description: "Apply mobile game development techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","E","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on mobile game development fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in mobile game development."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on mobile game development concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on mobile game development exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of mobile game development.",
          intendedLearningOutcome: "Describe the core principles of mobile game development.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Mobile Game Development"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply mobile game development techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using mobile game development techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS512",
        name: "IT Infrastructure Management",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS331L Computer Networks",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Management and optimization of IT infrastructure.",
        references: [
        {
          id: "TB1",
          title: "IT Infrastructure Management: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "IT Infrastructure Management Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to it infrastructure management.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on it infrastructure management fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply it infrastructure management concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in it infrastructure management.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of it infrastructure management.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply it infrastructure management techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in it infrastructure management.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on it infrastructure management fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in it infrastructure management."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced it infrastructure management topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on it infrastructure management concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on it infrastructure management exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on it infrastructure management trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of it infrastructure management.",
          intendedLearningOutcome: "Describe the core principles of it infrastructure management.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - IT Infrastructure Management"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply it infrastructure management techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using it infrastructure management techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in it infrastructure management.",
          intendedLearningOutcome: "Analyze current research and trends in it infrastructure management.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - IT Infrastructure Management"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS513",
        name: "Information Assurance & Security",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS351L Cybersecurity",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Principles of information assurance, risk management, and security policies.",
        references: [
        {
          id: "TB1",
          title: "Information Assurance & Security: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Information Assurance & Security Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to information assurance & security.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on information assurance & security fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply information assurance & security concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in information assurance & security.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of information assurance & security.",
          poMappings: ["I","","","","","","","","","E","I","","E"]
        },
        {
          id: "CO2",
          description: "Apply information assurance & security techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","","E"]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in information assurance & security.",
          poMappings: ["","","","","","","D","","","I","I","E","E"]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on information assurance & security fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in information assurance & security."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced information assurance & security topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on information assurance & security concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on information assurance & security exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on information assurance & security trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of information assurance & security.",
          intendedLearningOutcome: "Describe the core principles of information assurance & security.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Information Assurance & Security"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply information assurance & security techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using information assurance & security techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in information assurance & security.",
          intendedLearningOutcome: "Analyze current research and trends in information assurance & security.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Information Assurance & Security"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS514",
        name: "Human Language Technologies",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS405 Natural Language Processing",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Advanced topics in speech recognition, machine translation, and dialogue systems.",
        references: [
        {
          id: "TB1",
          title: "Human Language Technologies: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Human Language Technologies Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to human language technologies.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on human language technologies fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply human language technologies concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of human language technologies.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply human language technologies techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on human language technologies fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in human language technologies."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on human language technologies concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on human language technologies exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of human language technologies.",
          intendedLearningOutcome: "Describe the core principles of human language technologies.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Human Language Technologies"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply human language technologies techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using human language technologies techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS515",
        name: "Cloud Computing",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS408 Distributed Systems",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Cloud service models, virtualization, and distributed storage systems.",
        references: [
        {
          id: "TB1",
          title: "Cloud Computing: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Cloud Computing Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to cloud computing.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on cloud computing fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply cloud computing concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in cloud computing.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of cloud computing.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply cloud computing techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in cloud computing.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on cloud computing fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in cloud computing."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced cloud computing topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on cloud computing concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on cloud computing exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on cloud computing trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of cloud computing.",
          intendedLearningOutcome: "Describe the core principles of cloud computing.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Cloud Computing"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply cloud computing techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using cloud computing techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in cloud computing.",
          intendedLearningOutcome: "Analyze current research and trends in cloud computing.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Cloud Computing"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS516",
        name: "Software Project Management",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "BSCS322L Software Engineering",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Planning, estimation, and management of software projects.",
        references: [
        {
          id: "TB1",
          title: "Software Project Management: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Software Project Management Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to software project management.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on software project management fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply software project management concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in software project management.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of software project management.",
          poMappings: ["I","","","","","","","","","E","E","",""]
        },
        {
          id: "CO2",
          description: "Apply software project management techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","E","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in software project management.",
          poMappings: ["","","","","","","D","","","I","E","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on software project management fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in software project management."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced software project management topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on software project management concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on software project management exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on software project management trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of software project management.",
          intendedLearningOutcome: "Describe the core principles of software project management.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Software Project Management"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply software project management techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using software project management techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in software project management.",
          intendedLearningOutcome: "Analyze current research and trends in software project management.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Software Project Management"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS517",
        name: "Internet of Things",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS406 Embedded Systems",
        class: "Professional Courses",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "IoT architecture, protocols, and application development.",
        references: [
        {
          id: "TB1",
          title: "Internet of Things: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Internet of Things Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to internet of things.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on internet of things fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply internet of things concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of internet of things.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply internet of things techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on internet of things fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in internet of things."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on internet of things concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on internet of things exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of internet of things.",
          intendedLearningOutcome: "Describe the core principles of internet of things.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Internet of Things"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply internet of things techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using internet of things techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "BSCS518",
        name: "Entrepreneurship in Computing",
        credits: "3 LEC",
        contact: "3",
        prerequisites: "None",
        class: "General Education",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Business models, innovation, and entrepreneurship in technology.",
        references: [
        {
          id: "TB1",
          title: "Entrepreneurship in Computing: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Entrepreneurship in Computing Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to entrepreneurship in computing.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on entrepreneurship in computing fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply entrepreneurship in computing concepts to a practical project.",
              laboratory: true
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of entrepreneurship in computing.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply entrepreneurship in computing techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on entrepreneurship in computing fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in entrepreneurship in computing."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on entrepreneurship in computing concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on entrepreneurship in computing exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of entrepreneurship in computing.",
          intendedLearningOutcome: "Describe the core principles of entrepreneurship in computing.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Entrepreneurship in Computing"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply entrepreneurship in computing techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using entrepreneurship in computing techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "IT 411",
        name: "Information Management",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS202 Database Systems",
        class: "Information Technology",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "1st Semester",
        description: "Management of information resources and enterprise data.",
        references: [
        {
          id: "TB1",
          title: "Information Management: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Information Management Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to information management.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on information management fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply information management concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in information management.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of information management.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply information management techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in information management.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on information management fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in information management."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced information management topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on information management concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on information management exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on information management trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of information management.",
          intendedLearningOutcome: "Describe the core principles of information management.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Information Management"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply information management techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using information management techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in information management.",
          intendedLearningOutcome: "Analyze current research and trends in information management.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Information Management"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "IT 412",
        name: "Network Administration",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "BSCS331L Computer Networks",
        class: "Information Technology",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Configuration and administration of network infrastructure.",
        references: [
        {
          id: "TB1",
          title: "Network Administration: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Network Administration Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to network administration.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on network administration fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply network administration concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in network administration.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of network administration.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply network administration techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in network administration.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on network administration fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in network administration."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced network administration topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on network administration concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on network administration exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on network administration trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of network administration.",
          intendedLearningOutcome: "Describe the core principles of network administration.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Network Administration"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply network administration techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using network administration techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in network administration.",
          intendedLearningOutcome: "Analyze current research and trends in network administration.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Network Administration"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: "IT 413",
        name: "Systems Administration & Maintenance",
        credits: "2 LEC, 1 LAB",
        contact: "3",
        prerequisites: "IT 412 Network Administration",
        class: "Information Technology",
        cmo: "25 S, 2015",
        year: "FOURTH YEAR",
        sem: "2nd Semester",
        description: "Server administration, backup, and disaster recovery.",
        references: [
        {
          id: "TB1",
          title: "Systems Administration & Maintenance: A Comprehensive Guide",
          type: "Textbook",
          authors: "Academic Press",
          year: 2022,
          isbn: "978-0000000000",
          link: ""
        },
        {
          id: "OR1",
          title: "Systems Administration & Maintenance Online Resources",
          type: "Online Resources",
          authors: "Open Access",
          year: 2024,
          link: ""
        }
      ],
        topics: [
        {
          id: "T1",
          title: "Fundamentals",
          subtopics: [
            {
              id: "S1",
              value: "Core Concepts"
            },
            {
              id: "S2",
              value: "Principles and Practices"
            },
            {
              id: "S3",
              value: "Key Methodologies"
            }
          ],
          tlas: [
            {
              id: "TLA1",
              classPhase: "Pre-class",
              performedBy: "Instructor",
              tlaName: "Lecture",
              tlaDescription: "Introduction to systems administration & maintenance.",
              laboratory: false
            },
            {
              id: "TLA2",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Activity",
              tlaDescription: "Hands-on exercise on systems administration & maintenance fundamentals.",
              laboratory: true
            }
          ]
        },
        {
          id: "T2",
          title: "Applications",
          subtopics: [
            {
              id: "S4",
              value: "Implementation"
            },
            {
              id: "S5",
              value: "Case Studies"
            },
            {
              id: "S6",
              value: "Best Practices"
            }
          ],
          tlas: [
            {
              id: "TLA3",
              classPhase: "In-class",
              performedBy: "Student",
              tlaName: "Project Lab",
              tlaDescription: "Students apply systems administration & maintenance concepts to a practical project.",
              laboratory: true
            }
          ]
        },
        {
          id: "T3",
          title: "Advanced Topics",
          subtopics: [
            {
              id: "S7",
              value: "Advanced Concepts"
            },
            {
              id: "S8",
              value: "Emerging Trends"
            },
            {
              id: "S9",
              value: "Research Directions"
            }
          ],
          tlas: [
            {
              id: "TLA4",
              classPhase: "Post-class",
              performedBy: "Student",
              tlaName: "Research Assignment",
              tlaDescription: "Students research emerging trends in systems administration & maintenance.",
              laboratory: false
            }
          ]
        }
      ],
        courseOutcomes: [
        {
          id: "CO1",
          description: "Explain the fundamental concepts and principles of systems administration & maintenance.",
          poMappings: ["I","","","","","","","","","E","I","",""]
        },
        {
          id: "CO2",
          description: "Apply systems administration & maintenance techniques to solve practical problems.",
          poMappings: ["","","E","","","","","","","E","I","",""]
        },
        {
          id: "CO3",
          description: "Evaluate emerging trends and advanced concepts in systems administration & maintenance.",
          poMappings: ["","","","","","","D","","","I","I","E",""]
        }
      ],
        coAssessmentMethodSets: {
        CO1: [
          {
            value: "Concept Quiz",
            description: "Quiz on systems administration & maintenance fundamentals."
          }
        ],
        CO2: [
          {
            value: "Practical Exercise",
            description: "Applied exercise in systems administration & maintenance."
          }
        ],
        CO3: [
          {
            value: "Research Paper",
            description: "Research paper on advanced systems administration & maintenance topics."
          }
        ]
      },
        assessments: [
        {
          id: "A1",
          tlaName: "Lecture",
          phase: "Pre-class",
          assessmentMethod: "Quiz",
          assessmentDescription: "Quiz on systems administration & maintenance concepts.",
          hasRubric: false
        },
        {
          id: "A2",
          tlaName: "Activity",
          phase: "In-class",
          assessmentMethod: "Lab Report",
          assessmentDescription: "Lab report on systems administration & maintenance exercise.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Correctness",
              maxScore: "60"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "40"
            }
          ]
        },
        {
          id: "A3",
          tlaName: "Research Assignment",
          phase: "Post-class",
          assessmentMethod: "Research Paper",
          assessmentDescription: "Research paper on systems administration & maintenance trends.",
          hasRubric: true,
          rubrics: [
            {
              id: 1,
              criteria: "Research depth",
              maxScore: "50"
            },
            {
              id: 2,
              criteria: "Analysis",
              maxScore: "50"
            }
          ]
        }
      ],
        ilos: [
        {
          id: "CO1-ILO1",
          courseOutcome: "Explain the fundamental concepts and principles of systems administration & maintenance.",
          intendedLearningOutcome: "Describe the core principles of systems administration & maintenance.",
          deliveryWeek: "Week 1",
          allocatedTime: "3 hours",
          topics: [
            "Fundamentals"
          ],
          references: [
            "TB1 - Systems Administration & Maintenance"
          ]
        },
        {
          id: "CO2-ILO1",
          courseOutcome: "Apply systems administration & maintenance techniques to solve practical problems.",
          intendedLearningOutcome: "Implement solutions using systems administration & maintenance techniques.",
          deliveryWeek: "Week 4",
          allocatedTime: "3 hours",
          topics: [
            "Applications"
          ],
          references: [
            "OR1 - Online Resources"
          ]
        },
        {
          id: "CO3-ILO1",
          courseOutcome: "Evaluate emerging trends and advanced concepts in systems administration & maintenance.",
          intendedLearningOutcome: "Analyze current research and trends in systems administration & maintenance.",
          deliveryWeek: "Week 8",
          allocatedTime: "3 hours",
          topics: [
            "Advanced Topics"
          ],
          references: [
            "TB1 - Systems Administration & Maintenance"
          ]
        }
      ],
        gradingSystem: [
        {
          co: "CO1",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Concept Quiz"
              ],
              weight: {
                prelim: "50",
                midterm: "",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO2",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Practical Exercise"
              ],
              weight: {
                prelim: "",
                midterm: "60",
                semi: "",
                final: ""
              },
              minPassing: "60"
            }
          ]
        },
        {
          co: "CO3",
          ilos: [
            {
              id: "ILO1",
              assessments: [
                "Research Paper"
              ],
              weight: {
                prelim: "",
                midterm: "",
                semi: "50",
                final: "50"
              },
              minPassing: "60"
            }
          ]
        }
      ]
    },
    {
        code: 'IT 313',
        name: 'Networking 1',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'None',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'SECOND YEAR',
        sem: '1st Semester',
        description: 'This course provides a comprehensive introduction to computer networking concepts, protocols, and architectures. Students will learn about the OSI and TCP/IP models, IP addressing, subnetting, routing, switching, and network security fundamentals.',
        references: [
            { id: "TB1", title: "Computer Networking: A Top-Down Approach", type: "Textbook", authors: "James Kurose, Keith Ross", year: 2021, isbn: "978-0136681557", link: "" },
            { id: "OR1", title: "CCNA Routing and Switching", type: "Online Resources", authors: "Cisco Networking Academy", year: 2024, isbn: "", link: "https://www.netacad.com/courses/ccna" },
            { id: "OE1", title: "Computer Network Tutorial", type: "Open Educational Resources", authors: "GeeksforGeeks", year: 2024, isbn: "", link: "https://www.geeksforgeeks.org/computer-network-tutorials/" }
        ],
        topics: [
            { id: "T1", title: "Network Fundamentals & OSI Model", subtopics: [{ id: "S1", value: "Network Topologies" }, { id: "S2", value: "OSI and TCP/IP Models" }, { id: "S3", value: "Data Encapsulation" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Networking Basics Lecture", tlaDescription: "Lecture covering network types, topologies, and the OSI model layers with real-world examples.", laboratory: false }, { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Packet Tracer Lab", tlaDescription: "Students use Cisco Packet Tracer to build a small network and observe data encapsulation across layers.", laboratory: true }] },
            { id: "T2", title: "IP Addressing & Subnetting", subtopics: [{ id: "S4", value: "IPv4 and IPv6 Addressing" }, { id: "S5", value: "Subnet Mask and CIDR" }, { id: "S6", value: "VLSM and Route Summarization" }], tlas: [{ id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "Subnetting Exercise", tlaDescription: "Hands-on exercise where students calculate subnets, host ranges, and broadcast addresses for given network scenarios.", laboratory: true }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Explain the fundamental concepts of computer networking, including the OSI and TCP/IP models, and differentiate between various network topologies and protocols.', poMappings: ['I','','','','','','','','','E','I','',''] },
            { id: 'CO2', description: 'Design and implement IP addressing schemes using subnetting, VLSM, and CIDR techniques for given network requirements.', poMappings: ['','','','E','E','','','','','I','E','',''] },
            { id: 'CO3', description: 'Configure basic routing and switching in a simulated network environment using industry-standard tools.', poMappings: ['','','','','D','','D','','','I','I','',''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: 'Explain the fundamental concepts of computer networking, including the OSI and TCP/IP models, and differentiate between various network topologies and protocols.', intendedLearningOutcome: "Identify the functions of each OSI layer and map them to TCP/IP model equivalents.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Network Fundamentals & OSI Model"], references: ["TB1 - Computer Networking: A Top-Down Approach"] },
            { id: "CO1-ILO2", courseOutcome: 'Explain the fundamental concepts of computer networking, including the OSI and TCP/IP models, and differentiate between various network topologies and protocols.', intendedLearningOutcome: "Describe data encapsulation and decapsulation processes across network layers.", deliveryWeek: "Week 2", allocatedTime: "2 hours", topics: ["Network Fundamentals & OSI Model"], references: ["OE1 - Computer Network Tutorial"] },
            { id: "CO2-ILO1", courseOutcome: 'Design and implement IP addressing schemes using subnetting, VLSM, and CIDR techniques for given network requirements.', intendedLearningOutcome: "Calculate subnet masks, network addresses, and host ranges using CIDR notation.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["IP Addressing & Subnetting"], references: ["TB1 - Computer Networking: A Top-Down Approach"] },
            { id: "CO2-ILO2", courseOutcome: 'Design and implement IP addressing schemes using subnetting, VLSM, and CIDR techniques for given network requirements.', intendedLearningOutcome: "Apply VLSM to optimize IP address allocation in multi-subnet scenarios.", deliveryWeek: "Week 4", allocatedTime: "3 hours", topics: ["IP Addressing & Subnetting"], references: ["OE1 - Computer Network Tutorial"] },
            { id: "CO3-ILO1", courseOutcome: 'Configure basic routing and switching in a simulated network environment using industry-standard tools.', intendedLearningOutcome: "Configure static routes and default gateways on Cisco routers.", deliveryWeek: "Week 5", allocatedTime: "4 hours", topics: ["IP Addressing & Subnetting"], references: ["OR1 - CCNA Routing and Switching"] }
        ],
        coAssessmentMethodSets: { CO1: [{ value: "Network Topology Quiz", description: "Quiz covering OSI layers, protocols, and topology identification." }], CO2: [{ value: "Subnetting Design Task", description: "Design an IP addressing plan for a given enterprise network." }], CO3: [{ value: "Packet Tracer Lab Report", description: "Submit a working Packet Tracer file with configured routers and a written report." }] },
        assessments: [
            { id: 'A1', tlaName: 'Packet Tracer Lab', phase: 'In-class', assessmentMethod: 'Lab Output', assessmentDescription: 'Working Packet Tracer file demonstrating a functional small network.', hasRubric: false },
            { id: 'A2', tlaName: 'Subnetting Exercise', phase: 'In-class', assessmentMethod: 'Subnetting Design Task', assessmentDescription: 'Completed subnetting worksheet with calculations.', hasRubric: false }
        ],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Networking Basics Quiz"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Layer Functions Quiz"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] }, { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Subnetting Design Task"], weight: { prelim: "", midterm: "100", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BSCS 422L',
        name: 'Artificial Intelligence',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS103 Data Structures',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'FOURTH YEAR',
        sem: '1st Semester',
        description: 'This course introduces the fundamental principles and techniques of artificial intelligence. Topics include search algorithms, knowledge representation, machine learning, neural networks, and ethical considerations in AI development.',
        references: [
            { id: "TB1", title: "Artificial Intelligence: A Modern Approach", type: "Textbook", authors: "Stuart Russell, Peter Norvig", year: 2020, isbn: "978-0134610993", link: "" },
            { id: "OR1", title: "Google AI Education", type: "Online Resources", authors: "Google AI", year: 2024, isbn: "", link: "https://ai.google/education/" },
            { id: "OE1", title: "Elements of AI", type: "Open Educational Resources", authors: "University of Helsinki", year: 2024, isbn: "", link: "https://www.elementsofai.com/" }
        ],
        topics: [
            { id: "T1", title: "Search Algorithms", subtopics: [{ id: "S1", value: "Uninformed Search (BFS, DFS)" }, { id: "S2", value: "Informed Search (A*, Greedy)" }, { id: "S3", value: "Local Search and Hill Climbing" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Search Algorithms Lecture", tlaDescription: "Lecture covering uninformed and informed search strategies with algorithm complexity analysis.", laboratory: false }, { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Search Algorithm Implementation", tlaDescription: "Students implement BFS, DFS, and A* search to solve pathfinding problems in a grid environment.", laboratory: true }] },
            { id: "T2", title: "Machine Learning Fundamentals", subtopics: [{ id: "S4", value: "Supervised vs Unsupervised Learning" }, { id: "S5", value: "Decision Trees and Random Forests" }, { id: "S6", value: "Neural Networks Basics" }], tlas: [{ id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "ML Model Training Lab", tlaDescription: "Students train and evaluate decision tree and neural network models using scikit-learn on a provided dataset.", laboratory: true }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Implement and compare various search algorithms to solve well-defined problems in AI.', poMappings: ['I','','E','','','','','','','I','E','',''] },
            { id: 'CO2', description: 'Apply machine learning techniques to classify and predict outcomes from structured datasets.', poMappings: ['','E','','','D','','','','','','I','',''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: 'Implement and compare various search algorithms to solve well-defined problems in AI.', intendedLearningOutcome: "Differentiate between uninformed and informed search strategies and their use cases.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Search Algorithms"], references: ["TB1 - Artificial Intelligence: A Modern Approach"] },
            { id: "CO1-ILO2", courseOutcome: 'Implement and compare various search algorithms to solve well-defined problems in AI.', intendedLearningOutcome: "Implement BFS, DFS, and A* search to find optimal paths in state-space problems.", deliveryWeek: "Week 2", allocatedTime: "4 hours", topics: ["Search Algorithms"], references: ["TB1 - Artificial Intelligence: A Modern Approach"] },
            { id: "CO2-ILO1", courseOutcome: 'Apply machine learning techniques to classify and predict outcomes from structured datasets.', intendedLearningOutcome: "Prepare datasets through cleaning, normalization, and train-test splitting.", deliveryWeek: "Week 3", allocatedTime: "3 hours", topics: ["Machine Learning Fundamentals"], references: ["OE1 - Elements of AI"] },
            { id: "CO2-ILO2", courseOutcome: 'Apply machine learning techniques to classify and predict outcomes from structured datasets.', intendedLearningOutcome: "Train decision tree and neural network models and evaluate their performance using accuracy and F1-score.", deliveryWeek: "Week 4", allocatedTime: "4 hours", topics: ["Machine Learning Fundamentals"], references: ["OR1 - Google AI Education"] }
        ],
        coAssessmentMethodSets: { CO1: [{ value: "Search Algorithm Report", description: "Written report comparing search algorithm performance on pathfinding problems." }], CO2: [{ value: "ML Model Evaluation", description: "Train and evaluate ML models on a provided dataset with metrics analysis." }] },
        assessments: [
            { id: 'A1', tlaName: 'Search Algorithm Implementation', phase: 'In-class', assessmentMethod: 'Code Submission', assessmentDescription: 'Submit Python implementations of BFS, DFS, and A* search.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Correctness of implementation', maxScore: '40' }, { id: 2, criteria: 'Code quality and documentation', maxScore: '30' }, { id: 3, criteria: 'Performance analysis', maxScore: '30' }] },
            { id: 'A2', tlaName: 'ML Model Training Lab', phase: 'In-class', assessmentMethod: 'Lab Report', assessmentDescription: 'Submit Jupyter notebook with trained models and evaluation metrics.', hasRubric: false }
        ],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Search Algorithms Quiz"], weight: { prelim: "40", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Search Algorithm Implementation"], weight: { prelim: "60", midterm: "", semi: "", final: "" }, minPassing: "60" }] }, { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Data Prep Quiz"], weight: { prelim: "", midterm: "30", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["ML Model Evaluation"], weight: { prelim: "", midterm: "70", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'IT 431',
        name: 'Multimedia Systems',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BIT313L Human Computer Interaction (HCI)',
        class: 'Information Technology',
        cmo: '25 S, 2015',
        year: 'THIRD YEAR',
        sem: '2nd Semester',
        description: 'This course covers the principles and technologies of multimedia systems including digital audio, image, video processing, compression standards, multimedia authoring, and web-based multimedia applications.',
        references: [
            { id: "TB1", title: "Multimedia: Making It Work", type: "Textbook", authors: "Tay Vaughan", year: 2014, isbn: "978-0071832885", link: "" },
            { id: "OR1", title: "MDN Web Docs: Multimedia", type: "Online Resources", authors: "Mozilla Developer Network", year: 2024, isbn: "", link: "https://developer.mozilla.org/en-US/docs/Web/Media" }
        ],
        topics: [
            { id: "T1", title: "Digital Audio and Image Fundamentals", subtopics: [{ id: "S1", value: "Sampling and Quantization" }, { id: "S2", value: "Color Models and Spaces" }, { id: "S3", value: "Lossless vs Lossy Compression" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Multimedia Basics Lecture", tlaDescription: "Lecture on digital audio and image representation, sampling theory, and compression techniques.", laboratory: false }] },
            { id: "T2", title: "Video Compression and Streaming", subtopics: [{ id: "S4", value: "MPEG and H.264 Standards" }, { id: "S5", value: "Adaptive Bitrate Streaming" }, { id: "S6", value: "HTML5 Video and Audio APIs" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Video Compression Lab", tlaDescription: "Students use FFmpeg to compress videos with different codecs and compare quality and file size tradeoffs.", laboratory: true }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Explain the fundamental concepts of digital media representation, compression, and storage for audio, image, and video formats.', poMappings: ['I','','','','','','','','','E','I','',''] },
            { id: 'CO2', description: 'Create and optimize multimedia content using industry-standard tools and techniques for web deployment.', poMappings: ['','E','','','E','','D','','','I','E','',''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: 'Explain the fundamental concepts of digital media representation, compression, and storage for audio, image, and video formats.', intendedLearningOutcome: "Compare lossless and lossy compression techniques and their impact on media quality.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Digital Audio and Image Fundamentals"], references: ["TB1 - Multimedia: Making It Work"] },
            { id: "CO2-ILO1", courseOutcome: 'Create and optimize multimedia content using industry-standard tools and techniques for web deployment.', intendedLearningOutcome: "Compress video files using FFmpeg with appropriate codecs and settings for web delivery.", deliveryWeek: "Week 2", allocatedTime: "4 hours", topics: ["Video Compression and Streaming"], references: ["OR1 - MDN Web Docs: Multimedia"] }
        ],
        coAssessmentMethodSets: { CO1: [{ value: "Compression Analysis Report", description: "Write a report comparing different compression techniques and their tradeoffs." }], CO2: [{ value: "Multimedia Project", description: "Create a web page with optimized multimedia content including audio, image, and video." }] },
        assessments: [{ id: 'A1', tlaName: 'Video Compression Lab', phase: 'In-class', assessmentMethod: 'Lab Output', assessmentDescription: 'Submit compressed video files with a comparison table of codec settings.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Compression Quiz"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BSCS 432L',
        name: 'Information Assurance and Security',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS331L Computer Networks',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'FOURTH YEAR',
        sem: '2nd Semester',
        description: 'This course covers the principles of information security including cryptography, network security, access control, security policies, risk management, and security auditing. Students will learn to identify vulnerabilities and implement security measures.',
        references: [
            { id: "TB1", title: "Security+ Guide to Network Security Fundamentals", type: "Textbook", authors: "Mark Ciampa", year: 2022, isbn: "978-0357689244", link: "" },
            { id: "OE1", title: "OWASP Top Ten", type: "Open Educational Resources", authors: "OWASP Foundation", year: 2024, isbn: "", link: "https://owasp.org/www-project-top-ten/" },
            { id: "OR1", title: "NIST Cybersecurity Framework", type: "Online Resources", authors: "National Institute of Standards and Technology", year: 2024, isbn: "", link: "https://www.nist.gov/cyberframework" }
        ],
        topics: [
            { id: "T1", title: "Cryptography and Access Control", subtopics: [{ id: "S1", value: "Symmetric and Asymmetric Cryptography" }, { id: "S2", value: "Digital Signatures and Certificates" }, { id: "S3", value: "Access Control Models (DAC, MAC, RBAC)" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Cryptography Lecture", tlaDescription: "Lecture on encryption algorithms, hashing, digital signatures, and PKI infrastructure.", laboratory: false }] },
            { id: "T2", title: "Network Security and Risk Management", subtopics: [{ id: "S4", value: "Firewalls and IDS/IPS" }, { id: "S5", value: "Vulnerability Assessment" }, { id: "S6", value: "Risk Management Framework" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Security Audit Lab", tlaDescription: "Students perform vulnerability scans using Nmap and Wireshark, then document findings and recommendations.", laboratory: true }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Apply cryptographic techniques to protect data confidentiality, integrity, and authenticity.', poMappings: ['I','','','','','','','','','','','E',''] },
            { id: 'CO2', description: 'Assess network vulnerabilities and implement appropriate security controls using industry frameworks.', poMappings: ['','E','','','','E','','','','','','D',''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: 'Apply cryptographic techniques to protect data confidentiality, integrity, and authenticity.', intendedLearningOutcome: "Differentiate between symmetric and asymmetric encryption algorithms and their appropriate use cases.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Cryptography and Access Control"], references: ["TB1 - Security+ Guide"] },
            { id: "CO1-ILO2", courseOutcome: 'Apply cryptographic techniques to protect data confidentiality, integrity, and authenticity.', intendedLearningOutcome: "Implement encryption and hashing in a simple application using OpenSSL.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["Cryptography and Access Control"], references: ["TB1 - Security+ Guide"] },
            { id: "CO2-ILO1", courseOutcome: 'Assess network vulnerabilities and implement appropriate security controls using industry frameworks.', intendedLearningOutcome: "Conduct a vulnerability scan on a test network and prioritize findings by severity.", deliveryWeek: "Week 3", allocatedTime: "4 hours", topics: ["Network Security and Risk Management"], references: ["OR1 - NIST Cybersecurity Framework", "OE1 - OWASP Top Ten"] }
        ],
        coAssessmentMethodSets: { CO1: [{ value: "Cryptography Implementation", description: "Implement a secure communication system using symmetric and asymmetric encryption." }], CO2: [{ value: "Security Audit Report", description: "Conduct a security audit and produce a report with risk assessments and recommendations." }] },
        assessments: [
            { id: 'A1', tlaName: 'Security Audit Lab', phase: 'In-class', assessmentMethod: 'Audit Report', assessmentDescription: 'Submit a security audit report with scan results, vulnerability analysis, and remediation plan.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Scan methodology and coverage', maxScore: '25' }, { id: 2, criteria: 'Vulnerability identification accuracy', maxScore: '25' }, { id: 3, criteria: 'Risk prioritization', maxScore: '25' }, { id: 4, criteria: 'Remediation recommendations', maxScore: '25' }] }
        ],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Cryptography Quiz"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Encryption Lab"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'IT 441',
        name: 'Web Development',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS103 Data Structures',
        class: 'Information Technology',
        cmo: '25 S, 2015',
        year: 'SECOND YEAR',
        sem: '2nd Semester',
        description: 'This course covers modern full-stack web development including HTML5, CSS3, JavaScript, frontend frameworks, server-side programming, database integration, and RESTful API design. Students will build a complete web application.',
        references: [
            { id: "TB1", title: "Web Development with Node and Express", type: "Textbook", authors: "Ethan Brown", year: 2019, isbn: "978-1492053514", link: "" },
            { id: "OR1", title: "MDN Web Docs", type: "Online Resources", authors: "Mozilla Developer Network", year: 2024, isbn: "", link: "https://developer.mozilla.org/" },
            { id: "OE1", title: "FreeCodeCamp Web Dev Curriculum", type: "Open Educational Resources", authors: "FreeCodeCamp", year: 2024, isbn: "", link: "https://www.freecodecamp.org/" }
        ],
        topics: [
            { id: "T1", title: "Frontend Development", subtopics: [{ id: "S1", value: "HTML5 Semantics and Accessibility" }, { id: "S2", value: "CSS Flexbox and Grid" }, { id: "S3", value: "JavaScript DOM Manipulation" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Frontend Fundamentals Lecture", tlaDescription: "Lecture on modern HTML5, CSS3 layout techniques, and JavaScript event handling.", laboratory: false }, { id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Responsive Layout Lab", tlaDescription: "Students build a responsive landing page using HTML5 semantic elements and CSS Grid/Flexbox.", laboratory: true }] },
            { id: "T2", title: "Backend Development and APIs", subtopics: [{ id: "S4", value: "Node.js and Express Framework" }, { id: "S5", value: "RESTful API Design" }, { id: "S6", value: "Database Integration (MongoDB/SQL)" }], tlas: [{ id: "TLA3", classPhase: "In-class", performedBy: "Student", tlaName: "API Development Lab", tlaDescription: "Students create a RESTful API with Express that performs CRUD operations on a MongoDB database.", laboratory: true }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Build responsive user interfaces using modern HTML5, CSS3, and JavaScript techniques.', poMappings: ['','','','','I','','D','','','I','I','',''] },
            { id: 'CO2', description: 'Develop server-side applications and RESTful APIs using Node.js and database integration.', poMappings: ['','','','','D','','D','','E','I','E','',''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: 'Build responsive user interfaces using modern HTML5, CSS3, and JavaScript techniques.', intendedLearningOutcome: "Create semantically structured HTML5 documents that meet WCAG accessibility standards.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Frontend Development"], references: ["OR1 - MDN Web Docs"] },
            { id: "CO1-ILO2", courseOutcome: 'Build responsive user interfaces using modern HTML5, CSS3, and JavaScript techniques.', intendedLearningOutcome: "Implement responsive layouts using CSS Flexbox and Grid that adapt to mobile, tablet, and desktop.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["Frontend Development"], references: ["OE1 - FreeCodeCamp"] },
            { id: "CO2-ILO1", courseOutcome: 'Develop server-side applications and RESTful APIs using Node.js and database integration.', intendedLearningOutcome: "Design and implement RESTful API endpoints following best practices.", deliveryWeek: "Week 3", allocatedTime: "4 hours", topics: ["Backend Development and APIs"], references: ["TB1 - Web Development with Node and Express"] },
            { id: "CO2-ILO2", courseOutcome: 'Develop server-side applications and RESTful APIs using Node.js and database integration.', intendedLearningOutcome: "Integrate a database with a Node.js application to persist and retrieve data.", deliveryWeek: "Week 4", allocatedTime: "4 hours", topics: ["Backend Development and APIs"], references: ["TB1 - Web Development with Node and Express", "OR1 - MDN Web Docs"] }
        ],
        coAssessmentMethodSets: { CO1: [{ value: "Responsive Web Page", description: "Build a responsive multi-section landing page for a fictional product." }], CO2: [{ value: "Full-Stack CRUD API", description: "Develop a complete RESTful API with database integration and frontend consumption." }] },
        assessments: [
            { id: 'A1', tlaName: 'Responsive Layout Lab', phase: 'In-class', assessmentMethod: 'Web Page Output', assessmentDescription: 'Submit a responsive HTML/CSS landing page that passes mobile-first validation.', hasRubric: false },
            { id: 'A2', tlaName: 'API Development Lab', phase: 'In-class', assessmentMethod: 'API Submission', assessmentDescription: 'Submit a working Express API with at least 5 endpoints and database integration.', hasRubric: true, rubrics: [{ id: 1, criteria: 'API design and REST conventions', maxScore: '30' }, { id: 2, criteria: 'Database integration', maxScore: '30' }, { id: 3, criteria: 'Error handling and validation', maxScore: '40' }] }
        ],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["HTML Semantics Quiz"], weight: { prelim: "40", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Responsive Layout Lab"], weight: { prelim: "60", midterm: "", semi: "", final: "" }, minPassing: "60" }] }, { co: "CO2", ilos: [{ id: "ILO1", assessments: ["API Design Quiz"], weight: { prelim: "", midterm: "40", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["API Development Lab"], weight: { prelim: "", midterm: "60", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BSCS 442L',
        name: 'Systems Integration and Architecture',
        credits: '2 LEC, 1 LAB',
        contact: '3',
        prerequisites: 'BSCS322L Software Engineering',
        class: 'Professional Courses',
        cmo: '25 S, 2015',
        year: 'FOURTH YEAR',
        sem: '1st Semester',
        description: 'This course covers enterprise systems integration patterns, service-oriented architecture, microservices, API gateways, message queuing, and middleware technologies. Students will design and implement integrated system solutions.',
        references: [
            { id: "TB1", title: "Building Microservices", type: "Textbook", authors: "Sam Newman", year: 2021, isbn: "978-1492034025", link: "" },
            { id: "OR1", title: "Enterprise Integration Patterns", type: "Online Resources", authors: "Gregor Hohpe", year: 2024, isbn: "", link: "https://www.enterpriseintegrationpatterns.com/" },
            { id: "OE1", title: "Microservices.io", type: "Open Educational Resources", authors: "Chris Richardson", year: 2024, isbn: "", link: "https://microservices.io/" }
        ],
        topics: [
            { id: "T1", title: "Service-Oriented Architecture", subtopics: [{ id: "S1", value: "SOA Principles and Governance" }, { id: "S2", value: "Web Services (SOAP/REST)" }, { id: "S3", value: "ESB and Middleware" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "SOA Lecture", tlaDescription: "Overview of service-oriented architecture principles, web services standards, and enterprise service bus concepts.", laboratory: false }] },
            { id: "T2", title: "Microservices and API Management", subtopics: [{ id: "S4", value: "Microservices Design Patterns" }, { id: "S5", value: "API Gateway Pattern" }, { id: "S6", value: "Message Queues and Event-Driven Architecture" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Microservices Lab", tlaDescription: "Students design and deploy a simple microservices-based system with Docker, API gateway, and message queue.", laboratory: true }] }
        ],
        courseOutcomes: [
            { id: 'CO1', description: 'Design enterprise integration solutions using SOA principles and middleware technologies.', poMappings: ['I','','','','E','','','','','I','E','',''] },
            { id: 'CO2', description: 'Implement microservices-based architectures with API gateways and event-driven communication.', poMappings: ['','D','','','D','E','','','','','','I',''] }
        ],
        ilos: [
            { id: "CO1-ILO1", courseOutcome: 'Design enterprise integration solutions using SOA principles and middleware technologies.', intendedLearningOutcome: "Analyze enterprise integration scenarios and select appropriate integration patterns.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Service-Oriented Architecture"], references: ["OR1 - Enterprise Integration Patterns"] },
            { id: "CO1-ILO2", courseOutcome: 'Design enterprise integration solutions using SOA principles and middleware technologies.', intendedLearningOutcome: "Design SOAP and REST web services that comply with WS-* standards.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["Service-Oriented Architecture"], references: ["TB1 - Building Microservices"] },
            { id: "CO2-ILO1", courseOutcome: 'Implement microservices-based architectures with API gateways and event-driven communication.', intendedLearningOutcome: "Containerize microservices using Docker and orchestrate them with Docker Compose.", deliveryWeek: "Week 3", allocatedTime: "4 hours", topics: ["Microservices and API Management"], references: ["OE1 - Microservices.io"] },
            { id: "CO2-ILO2", courseOutcome: 'Implement microservices-based architectures with API gateways and event-driven communication.', intendedLearningOutcome: "Implement an API gateway with rate limiting, authentication, and routing.", deliveryWeek: "Week 4", allocatedTime: "4 hours", topics: ["Microservices and API Management"], references: ["TB1 - Building Microservices", "OR1 - Enterprise Integration Patterns"] }
        ],
        coAssessmentMethodSets: { CO1: [{ value: "Integration Design Document", description: "Design document for an enterprise integration solution with architecture diagrams and pattern selection rationale." }], CO2: [{ value: "Microservices Deployment", description: "Deploy a working microservices system with Docker, API gateway, and message queue." }] },
        assessments: [
            { id: 'A1', tlaName: 'Microservices Lab', phase: 'In-class', assessmentMethod: 'Deployment Output', assessmentDescription: 'Submit Docker Compose configuration and demonstrate running microservices with inter-service communication.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Microservice decomposition quality', maxScore: '25' }, { id: 2, criteria: 'API gateway configuration', maxScore: '25' }, { id: 3, criteria: 'Message queue integration', maxScore: '25' }, { id: 4, criteria: 'Docker setup and documentation', maxScore: '25' }] }
        ],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Integration Patterns Quiz"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Web Service Design"], weight: { prelim: "50", midterm: "", semi: "", final: "" }, minPassing: "60" }] }, { co: "CO2", ilos: [{ id: "ILO1", assessments: ["Docker Setup"], weight: { prelim: "", midterm: "40", semi: "", final: "" }, minPassing: "60" }, { id: "ILO2", assessments: ["Microservices Lab"], weight: { prelim: "", midterm: "60", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BIT101', name: 'Introduction to Computing', credits: '3 LEC', contact: '3', prerequisites: 'None', class: 'General Education', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '1st Semester',
        description: 'Foundational concepts of computing including hardware, software, data representation, and problem-solving using computers.',
        references: [{ id: "TB1", title: "Computing Essentials", type: "Textbook", authors: "Timothy J. O'Leary", year: 2021, isbn: "978-1260092855", link: "" }],
        topics: [{ id: "T1", title: "Computing Fundamentals", subtopics: [{ id: "S1", value: "History of Computing" }, { id: "S2", value: "Hardware Components" }, { id: "S3", value: "Software Categories" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Intro Lecture", tlaDescription: "Overview of computing history, hardware, and software concepts.", laboratory: false }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Explain fundamental computing concepts including hardware, software, and data representation.', poMappings: ['I','','','','','','','','','E','I','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Explain fundamental computing concepts including hardware, software, and data representation.', intendedLearningOutcome: "Identify the major components of a computer system and their functions.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Computing Fundamentals"], references: ["TB1 - Computing Essentials"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Computing Basics Quiz", description: "Quiz covering hardware, software, and terminology." }] },
        assessments: [{ id: 'A1', tlaName: 'Intro Lecture', phase: 'Pre-class', assessmentMethod: 'Quiz', assessmentDescription: 'Conceptual quiz on computing fundamentals.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Computing Basics Quiz"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BIT102', name: 'Computer Programming 1', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BIT101 Introduction to Computing', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '2nd Semester',
        description: 'Introduction to programming using a high-level language. Covers variables, control structures, functions, arrays, and basic algorithms.',
        references: [{ id: "TB1", title: "Starting Out with Programming Logic & Design", type: "Textbook", authors: "Tony Gaddis", year: 2020, isbn: "978-0134801155", link: "" }],
        topics: [{ id: "T1", title: "Programming Fundamentals", subtopics: [{ id: "S1", value: "Variables and Data Types" }, { id: "S2", value: "Control Structures" }, { id: "S3", value: "Functions and Arrays" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "Programming Lab 1", tlaDescription: "Students write basic programs using variables, conditionals, and loops.", laboratory: true }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Design and implement simple programs using fundamental programming constructs.', poMappings: ['I','','','','','','','','','I','E','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Design and implement simple programs using fundamental programming constructs.', intendedLearningOutcome: "Write programs using variables, conditionals, and loops to solve basic problems.", deliveryWeek: "Week 1", allocatedTime: "4 hours", topics: ["Programming Fundamentals"], references: ["TB1 - Starting Out with Programming Logic & Design"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Programming Exercise", description: "Complete programming exercises demonstrating control structures and functions." }] },
        assessments: [{ id: 'A1', tlaName: 'Programming Lab 1', phase: 'In-class', assessmentMethod: 'Code Submission', assessmentDescription: 'Submit working programs with proper syntax and logic.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Correctness', maxScore: '50' }, { id: 2, criteria: 'Code style', maxScore: '50' }] }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Programming Exercise"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BIT103', name: 'Computer Programming 2', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BIT102 Computer Programming 1', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '2nd Semester',
        description: 'Advanced programming concepts including object-oriented programming, inheritance, polymorphism, file I/O, and exception handling.',
        references: [{ id: "TB1", title: "Object-Oriented Programming in Java", type: "Textbook", authors: "David J. Barnes", year: 2020, isbn: "978-0134821498", link: "" }],
        topics: [{ id: "T1", title: "Object-Oriented Programming", subtopics: [{ id: "S1", value: "Classes and Objects" }, { id: "S2", value: "Inheritance and Polymorphism" }, { id: "S3", value: "File I/O and Exceptions" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "OOP Lab", tlaDescription: "Students implement classes with inheritance hierarchies and file persistence.", laboratory: true }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Apply object-oriented programming principles to design and implement software solutions.', poMappings: ['I','','','','E','','','','','I','E','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Apply object-oriented programming principles to design and implement software solutions.', intendedLearningOutcome: "Design class hierarchies using inheritance and polymorphism.", deliveryWeek: "Week 1", allocatedTime: "4 hours", topics: ["Object-Oriented Programming"], references: ["TB1 - Object-Oriented Programming in Java"] }],
        coAssessmentMethodSets: { CO1: [{ value: "OOP Project", description: "Design and implement an application using OOP principles." }] },
        assessments: [{ id: 'A1', tlaName: 'OOP Lab', phase: 'In-class', assessmentMethod: 'Project Output', assessmentDescription: 'Working OOP application with class hierarchy and file persistence.', hasRubric: true, rubrics: [{ id: 1, criteria: 'OOP design quality', maxScore: '50' }, { id: 2, criteria: 'Functionality', maxScore: '50' }] }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["OOP Project"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BIT104', name: 'Discrete Mathematics', credits: '3 LEC', contact: '3', prerequisites: 'BIT101 Introduction to Computing', class: 'General Education', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '2nd Semester',
        description: 'Study of discrete mathematical structures including logic, set theory, combinatorics, graph theory, and Boolean algebra.',
        references: [{ id: "TB1", title: "Discrete Mathematics and Its Applications", type: "Textbook", authors: "Kenneth Rosen", year: 2019, isbn: "978-1259676512", link: "" }],
        topics: [{ id: "T1", title: "Logic and Set Theory", subtopics: [{ id: "S1", value: "Propositional Logic" }, { id: "S2", value: "Predicate Logic" }, { id: "S3", value: "Set Operations" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Discrete Math Lecture", tlaDescription: "Lecture on propositional logic, truth tables, and set theory fundamentals.", laboratory: false }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Apply discrete mathematical concepts to solve computing problems.', poMappings: ['I','','','','','','','','','I','I','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Apply discrete mathematical concepts to solve computing problems.', intendedLearningOutcome: "Construct truth tables and evaluate logical expressions.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Logic and Set Theory"], references: ["TB1 - Discrete Mathematics and Its Applications"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Problem Set", description: "Complete problem sets covering logic, sets, and combinatorics." }] },
        assessments: [{ id: 'A1', tlaName: 'Discrete Math Lecture', phase: 'Pre-class', assessmentMethod: 'Problem Set', assessmentDescription: 'Written problem set on logic and set theory.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Problem Set"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BIT201', name: 'Data Structures and Algorithms', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BIT103 Computer Programming 2', class: 'Professional Courses', cmo: '25 S, 2015', year: 'SECOND YEAR', sem: '1st Semester',
        description: 'Study of fundamental data structures (arrays, linked lists, trees, graphs, hash tables) and algorithm analysis techniques.',
        references: [{ id: "TB1", title: "Data Structures and Algorithm Analysis in C++", type: "Textbook", authors: "Mark Allen Weiss", year: 2020, isbn: "978-0134853765", link: "" }],
        topics: [{ id: "T1", title: "Linear Data Structures", subtopics: [{ id: "S1", value: "Arrays and Linked Lists" }, { id: "S2", value: "Stacks and Queues" }, { id: "S3", value: "Hash Tables" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "DS Lab", tlaDescription: "Students implement linked lists, stacks, and queues from scratch.", laboratory: true }] }, { id: "T2", title: "Trees and Graphs", subtopics: [{ id: "S4", value: "Binary Search Trees" }, { id: "S5", value: "Graph Representations" }, { id: "S6", value: "Traversal Algorithms" }], tlas: [{ id: "TLA2", classPhase: "In-class", performedBy: "Student", tlaName: "Tree Lab", tlaDescription: "Students implement BST operations and graph traversal algorithms.", laboratory: true }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Implement and analyze fundamental data structures and their operations.', poMappings: ['I','','','','','','D','','','I','E','E',''] }, { id: 'CO2', description: 'Apply appropriate data structures to solve computational problems efficiently.', poMappings: ['E','','','','D','','','','','I','E','E',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Implement and analyze fundamental data structures and their operations.', intendedLearningOutcome: "Implement linked list, stack, and queue data structures with their core operations.", deliveryWeek: "Week 1", allocatedTime: "4 hours", topics: ["Linear Data Structures"], references: ["TB1 - Data Structures and Algorithm Analysis"] }, { id: "CO2-ILO1", courseOutcome: 'Apply appropriate data structures to solve computational problems efficiently.', intendedLearningOutcome: "Select and implement the appropriate data structure for a given problem scenario.", deliveryWeek: "Week 2", allocatedTime: "3 hours", topics: ["Trees and Graphs"], references: ["TB1 - Data Structures and Algorithm Analysis"] }],
        coAssessmentMethodSets: { CO1: [{ value: "DS Implementation", description: "Implement core data structures from scratch." }], CO2: [{ value: "Algorithm Design", description: "Design algorithms using appropriate data structures." }] },
        assessments: [{ id: 'A1', tlaName: 'DS Lab', phase: 'In-class', assessmentMethod: 'Code Submission', assessmentDescription: 'Working implementations of linked lists, stacks, and queues.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Implementation correctness', maxScore: '60' }, { id: 2, criteria: 'Time complexity analysis', maxScore: '40' }] }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["DS Implementation"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BIT202', name: 'Database Management Systems', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BIT201 Data Structures and Algorithms', class: 'Professional Courses', cmo: '25 S, 2015', year: 'SECOND YEAR', sem: '2nd Semester',
        description: 'Fundamentals of database systems including relational model, SQL, normalization, transaction processing, and database design.',
        references: [{ id: "TB1", title: "Database System Concepts", type: "Textbook", authors: "Abraham Silberschatz", year: 2020, isbn: "978-0078022159", link: "" }],
        topics: [{ id: "T1", title: "Relational Databases and SQL", subtopics: [{ id: "S1", value: "Relational Model" }, { id: "S2", value: "SQL Queries and Joins" }, { id: "S3", value: "Normalization" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "SQL Lab", tlaDescription: "Students write complex SQL queries including joins, subqueries, and aggregations.", laboratory: true }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Design and implement relational databases using entity-relationship modeling and SQL.', poMappings: ['I','','','','E','','','','','I','E','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Design and implement relational databases using entity-relationship modeling and SQL.', intendedLearningOutcome: "Write SQL queries to create, read, update, and delete data in relational databases.", deliveryWeek: "Week 1", allocatedTime: "4 hours", topics: ["Relational Databases and SQL"], references: ["TB1 - Database System Concepts"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Database Design Project", description: "Design and implement a database for a given business scenario." }] },
        assessments: [{ id: 'A1', tlaName: 'SQL Lab', phase: 'In-class', assessmentMethod: 'Query Submission', assessmentDescription: 'Submit SQL queries demonstrating joins, aggregations, and subqueries.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Query correctness', maxScore: '50' }, { id: 2, criteria: 'Query optimization', maxScore: '50' }] }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Database Design Project"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BIT203', name: 'Object-Oriented Programming', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BIT103 Computer Programming 2', class: 'Professional Courses', cmo: '25 S, 2015', year: 'SECOND YEAR', sem: '1st Semester',
        description: 'In-depth study of object-oriented programming concepts including design patterns, UML modeling, GUI programming, and event-driven programming.',
        references: [{ id: "TB1", title: "Head First Design Patterns", type: "Textbook", authors: "Eric Freeman", year: 2020, isbn: "978-1492078005", link: "" }],
        topics: [{ id: "T1", title: "Design Patterns", subtopics: [{ id: "S1", value: "Creational Patterns" }, { id: "S2", value: "Structural Patterns" }, { id: "S3", value: "Behavioral Patterns" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "Patterns Lab", tlaDescription: "Students implement Singleton, Factory, Observer, and Strategy patterns.", laboratory: true }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Apply design patterns and UML modeling to create maintainable object-oriented applications.', poMappings: ['','','E','','E','','','','','I','E','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Apply design patterns and UML modeling to create maintainable object-oriented applications.', intendedLearningOutcome: "Identify and implement appropriate design patterns for given software design problems.", deliveryWeek: "Week 1", allocatedTime: "4 hours", topics: ["Design Patterns"], references: ["TB1 - Head First Design Patterns"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Pattern Application Project", description: "Apply multiple design patterns in a single application." }] },
        assessments: [{ id: 'A1', tlaName: 'Patterns Lab', phase: 'In-class', assessmentMethod: 'Code Submission', assessmentDescription: 'Implement at least 3 design patterns in a cohesive application.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Pattern selection appropriateness', maxScore: '40' }, { id: 2, criteria: 'Implementation quality', maxScore: '60' }] }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Pattern Application Project"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BIT204', name: 'Information Management', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BIT202 Database Management Systems', class: 'Professional Courses', cmo: '25 S, 2015', year: 'SECOND YEAR', sem: '2nd Semester',
        description: 'Concepts and technologies for managing information assets including data warehousing, data mining, business intelligence, and information governance.',
        references: [{ id: "TB1", title: "Data Mining: Concepts and Techniques", type: "Textbook", authors: "Jiawei Han", year: 2022, isbn: "978-0128117606", link: "" }],
        topics: [{ id: "T1", title: "Data Warehousing and BI", subtopics: [{ id: "S1", value: "Data Warehouse Architecture" }, { id: "S2", value: "ETL Processes" }, { id: "S3", value: "OLAP and Reporting" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "DW Lecture", tlaDescription: "Lecture on data warehouse concepts, star schema, and ETL pipelines.", laboratory: false }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Design and implement data management solutions using warehousing and business intelligence tools.', poMappings: ['','','','E','D','','','','','I','E','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Design and implement data management solutions using warehousing and business intelligence tools.', intendedLearningOutcome: "Design a star schema data warehouse for a given business domain.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Data Warehousing and BI"], references: ["TB1 - Data Mining: Concepts and Techniques"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Data Warehouse Design", description: "Design a complete data warehouse solution with ETL processes." }] },
        assessments: [{ id: 'A1', tlaName: 'DW Lecture', phase: 'Pre-class', assessmentMethod: 'Design Document', assessmentDescription: 'Submit data warehouse schema design with ETL plan.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Data Warehouse Design"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BSCS111', name: 'Calculus 1', credits: '3 LEC', contact: '3', prerequisites: 'None', class: 'General Education', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '1st Semester',
        description: 'Limits, continuity, differentiation, and applications of derivatives. Introduction to integration.',
        references: [{ id: "TB1", title: "Calculus: Early Transcendentals", type: "Textbook", authors: "James Stewart", year: 2020, isbn: "978-1337613927", link: "" }],
        topics: [{ id: "T1", title: "Limits and Derivatives", subtopics: [{ id: "S1", value: "Limits and Continuity" }, { id: "S2", value: "Differentiation Rules" }, { id: "S3", value: "Applications of Derivatives" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Calculus Lecture", tlaDescription: "Lecture on limit theorems, differentiation rules, and optimization applications.", laboratory: false }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Apply differentiation techniques to solve problems in optimization and rate of change.', poMappings: ['I','','','','','','','','','I','I','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Apply differentiation techniques to solve problems in optimization and rate of change.', intendedLearningOutcome: "Compute derivatives using power, product, quotient, and chain rules.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Limits and Derivatives"], references: ["TB1 - Calculus: Early Transcendentals"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Derivative Problem Set", description: "Problem set covering differentiation rules and applications." }] },
        assessments: [{ id: 'A1', tlaName: 'Calculus Lecture', phase: 'Pre-class', assessmentMethod: 'Problem Set', assessmentDescription: 'Problem set on limits and derivatives.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Derivative Problem Set"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BSCS112', name: 'Calculus 2', credits: '3 LEC', contact: '3', prerequisites: 'BSCS111 Calculus 1', class: 'General Education', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '2nd Semester',
        description: 'Integration techniques, applications of integrals, sequences, series, and parametric equations.',
        references: [{ id: "TB1", title: "Calculus: Early Transcendentals", type: "Textbook", authors: "James Stewart", year: 2020, isbn: "978-1337613927", link: "" }],
        topics: [{ id: "T1", title: "Integration Techniques", subtopics: [{ id: "S1", value: "Substitution and Integration by Parts" }, { id: "S2", value: "Trigonometric Integrals" }, { id: "S3", value: "Partial Fractions" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Integration Lecture", tlaDescription: "Lecture on advanced integration techniques and their applications.", laboratory: false }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Apply integration techniques to compute areas, volumes, and solve applied problems.', poMappings: ['I','','','','','','','','','I','I','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Apply integration techniques to compute areas, volumes, and solve applied problems.', intendedLearningOutcome: "Evaluate integrals using substitution, integration by parts, and partial fractions.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Integration Techniques"], references: ["TB1 - Calculus: Early Transcendentals"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Integration Problem Set", description: "Problem set covering various integration techniques." }] },
        assessments: [{ id: 'A1', tlaName: 'Integration Lecture', phase: 'Pre-class', assessmentMethod: 'Problem Set', assessmentDescription: 'Problem set on integration techniques.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Integration Problem Set"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BSCS113', name: 'Linear Algebra', credits: '3 LEC', contact: '3', prerequisites: 'BSCS111 Calculus 1', class: 'General Education', cmo: '25 S, 2015', year: 'SECOND YEAR', sem: '1st Semester',
        description: 'Vector spaces, matrices, linear transformations, eigenvalues, eigenvectors, and applications in computing.',
        references: [{ id: "TB1", title: "Linear Algebra and Its Applications", type: "Textbook", authors: "David C. Lay", year: 2021, isbn: "978-0135851258", link: "" }],
        topics: [{ id: "T1", title: "Matrices and Vector Spaces", subtopics: [{ id: "S1", value: "Matrix Operations" }, { id: "S2", value: "Vector Spaces and Subspaces" }, { id: "S3", value: "Linear Transformations" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Linear Algebra Lecture", tlaDescription: "Lecture on matrix operations, vector spaces, and linear transformations.", laboratory: false }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Solve systems of linear equations and apply matrix operations in computational contexts.', poMappings: ['I','','','','','','','','','I','I','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Solve systems of linear equations and apply matrix operations in computational contexts.', intendedLearningOutcome: "Perform matrix operations including multiplication, inversion, and determinant calculation.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Matrices and Vector Spaces"], references: ["TB1 - Linear Algebra and Its Applications"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Matrix Operations Quiz", description: "Quiz on matrix operations and vector space concepts." }] },
        assessments: [{ id: 'A1', tlaName: 'Linear Algebra Lecture', phase: 'Pre-class', assessmentMethod: 'Quiz', assessmentDescription: 'Quiz on matrix operations and vector spaces.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Matrix Operations Quiz"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'BSCS114', name: 'Probability and Statistics', credits: '3 LEC', contact: '3', prerequisites: 'BSCS112 Calculus 2', class: 'General Education', cmo: '25 S, 2015', year: 'SECOND YEAR', sem: '2nd Semester',
        description: 'Probability theory, random variables, probability distributions, sampling, hypothesis testing, and regression analysis.',
        references: [{ id: "TB1", title: "Probability and Statistics for Engineers and Scientists", type: "Textbook", authors: "Walpole, Myers", year: 2020, isbn: "978-0134115856", link: "" }],
        topics: [{ id: "T1", title: "Probability and Distributions", subtopics: [{ id: "S1", value: "Probability Rules" }, { id: "S2", value: "Random Variables" }, { id: "S3", value: "Normal and Binomial Distributions" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "Stats Lecture", tlaDescription: "Lecture on probability theory, distributions, and expected values.", laboratory: false }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Apply statistical methods to analyze data and make data-driven decisions.', poMappings: ['I','','','','','','','','','I','I','E',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Apply statistical methods to analyze data and make data-driven decisions.', intendedLearningOutcome: "Calculate probabilities using probability rules and distribution functions.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Probability and Distributions"], references: ["TB1 - Probability and Statistics"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Statistical Analysis", description: "Perform statistical analysis on a dataset with hypothesis testing." }] },
        assessments: [{ id: 'A1', tlaName: 'Stats Lecture', phase: 'Pre-class', assessmentMethod: 'Problem Set', assessmentDescription: 'Problem set on probability and distributions.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Statistical Analysis"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'IT 221', name: 'IT Fundamentals', credits: '3 LEC', contact: '3', prerequisites: 'None', class: 'General Education', cmo: '25 S, 2015', year: 'FIRST YEAR', sem: '1st Semester',
        description: 'Overview of information technology covering computer systems, networks, databases, web technologies, and IT career paths.',
        references: [{ id: "TB1", title: "Technology in Action", type: "Textbook", authors: "Alan Evans", year: 2021, isbn: "978-0135438695", link: "" }],
        topics: [{ id: "T1", title: "IT Overview", subtopics: [{ id: "S1", value: "Computer Systems" }, { id: "S2", value: "Networking Basics" }, { id: "S3", value: "Web Technologies" }], tlas: [{ id: "TLA1", classPhase: "Pre-class", performedBy: "Instructor", tlaName: "IT Overview Lecture", tlaDescription: "Overview of IT domains including systems, networks, web, and databases.", laboratory: false }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Explain the core domains of information technology and their interrelationships.', poMappings: ['I','','','','','','','','','E','I','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Explain the core domains of information technology and their interrelationships.', intendedLearningOutcome: "Identify the major components of IT infrastructure in an organization.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["IT Overview"], references: ["TB1 - Technology in Action"] }],
        coAssessmentMethodSets: { CO1: [{ value: "IT Domain Report", description: "Research report on the various domains of IT." }] },
        assessments: [{ id: 'A1', tlaName: 'IT Overview Lecture', phase: 'Pre-class', assessmentMethod: 'Quiz', assessmentDescription: 'Quiz on IT domains and career paths.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["IT Domain Report"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'IT 222', name: 'Systems Analysis and Design', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'BIT202 Database Management Systems', class: 'Professional Courses', cmo: '25 S, 2015', year: 'THIRD YEAR', sem: '1st Semester',
        description: 'Structured approach to analyzing business requirements and designing information systems using UML, use cases, and agile methodologies.',
        references: [{ id: "TB1", title: "Systems Analysis and Design", type: "Textbook", authors: "Alan Dennis", year: 2020, isbn: "978-1119496489", link: "" }],
        topics: [{ id: "T1", title: "Requirements Analysis", subtopics: [{ id: "S1", value: "Requirement Gathering" }, { id: "S2", value: "Use Case Modeling" }, { id: "S3", value: "UML Diagrams" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "UML Lab", tlaDescription: "Students create use case diagrams, class diagrams, and sequence diagrams for a given system.", laboratory: true }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Analyze business requirements and design information systems using industry-standard modeling techniques.', poMappings: ['','','E','E','I','','','','','I','E','E',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Analyze business requirements and design information systems using industry-standard modeling techniques.', intendedLearningOutcome: "Create UML diagrams including use case, class, and sequence diagrams.", deliveryWeek: "Week 1", allocatedTime: "4 hours", topics: ["Requirements Analysis"], references: ["TB1 - Systems Analysis and Design"] }],
        coAssessmentMethodSets: { CO1: [{ value: "System Design Document", description: "Complete system analysis and design document for a business scenario." }] },
        assessments: [{ id: 'A1', tlaName: 'UML Lab', phase: 'In-class', assessmentMethod: 'Diagram Submission', assessmentDescription: 'Submit complete UML diagrams for a given system specification.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Diagram accuracy', maxScore: '50' }, { id: 2, criteria: 'Completeness', maxScore: '50' }] }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["System Design Document"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'IT 223', name: 'Business Process Management', credits: '3 LEC', contact: '3', prerequisites: 'IT 222 Systems Analysis and Design', class: 'Professional Courses', cmo: '25 S, 2015', year: 'THIRD YEAR', sem: '2nd Semester',
        description: 'Concepts and techniques for modeling, analyzing, and optimizing business processes using BPMN and process mining tools.',
        references: [{ id: "TB1", title: "Fundamentals of Business Process Management", type: "Textbook", authors: "Marlon Dumas", year: 2018, isbn: "978-3662565081", link: "" }],
        topics: [{ id: "T1", title: "Process Modeling", subtopics: [{ id: "S1", value: "BPMN Notation" }, { id: "S2", value: "Process Analysis" }, { id: "S3", value: "Process Redesign" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "BPMN Lab", tlaDescription: "Students model business processes using BPMN tools and identify improvement opportunities.", laboratory: true }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Model and analyze business processes to identify improvement opportunities.', poMappings: ['','','E','E','','','','','','I','I','E',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Model and analyze business processes to identify improvement opportunities.', intendedLearningOutcome: "Create BPMN diagrams for business processes and identify inefficiencies.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Process Modeling"], references: ["TB1 - Fundamentals of Business Process Management"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Process Redesign Proposal", description: "Analyze a business process and propose improvements with BPMN models." }] },
        assessments: [{ id: 'A1', tlaName: 'BPMN Lab', phase: 'In-class', assessmentMethod: 'Model Submission', assessmentDescription: 'Submit BPMN diagrams with process analysis and recommendations.', hasRubric: false }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Process Redesign Proposal"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'IT 224', name: 'IT Project Management', credits: '3 LEC', contact: '3', prerequisites: 'IT 222 Systems Analysis and Design', class: 'Professional Courses', cmo: '25 S, 2015', year: 'THIRD YEAR', sem: '2nd Semester',
        description: 'Project management principles applied to IT projects including scope, time, cost, quality, risk management, and agile project management.',
        references: [{ id: "TB1", title: "A Guide to the Project Management Body of Knowledge", type: "Textbook", authors: "PMI", year: 2021, isbn: "978-1628256642", link: "" }],
        topics: [{ id: "T1", title: "Project Planning and Agile", subtopics: [{ id: "S1", value: "Work Breakdown Structure" }, { id: "S2", value: "Scheduling and Budgeting" }, { id: "S3", value: "Agile and Scrum" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "Project Plan Lab", tlaDescription: "Students create a WBS, Gantt chart, and risk register for an IT project.", laboratory: true }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Plan, execute, and monitor IT projects using industry-standard project management practices.', poMappings: ['','','','','E','','','','','I','E','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Plan, execute, and monitor IT projects using industry-standard project management practices.', intendedLearningOutcome: "Create project plans with work breakdown structures and schedules.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Project Planning and Agile"], references: ["TB1 - PMBOK Guide"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Project Plan", description: "Develop a complete project plan for an IT project." }] },
        assessments: [{ id: 'A1', tlaName: 'Project Plan Lab', phase: 'In-class', assessmentMethod: 'Plan Submission', assessmentDescription: 'Submit WBS, schedule, budget, and risk management plan.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Plan completeness', maxScore: '50' }, { id: 2, criteria: 'Risk identification', maxScore: '50' }] }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Project Plan"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'IT 225', name: 'Social and Professional Issues', credits: '3 LEC', contact: '3', prerequisites: 'None', class: 'General Education', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester',
        description: 'Social, ethical, legal, and professional issues in computing including privacy, intellectual property, cybersecurity ethics, and professional conduct.',
        references: [{ id: "TB1", title: "Ethics in Information Technology", type: "Textbook", authors: "George Reynolds", year: 2022, isbn: "978-0357415406", link: "" }],
        topics: [{ id: "T1", title: "Computing Ethics and Law", subtopics: [{ id: "S1", value: "Ethical Frameworks" }, { id: "S2", value: "Privacy and Data Protection" }, { id: "S3", value: "Intellectual Property" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "Ethics Debate", tlaDescription: "Students debate ethical scenarios in computing including privacy, AI ethics, and professional responsibility.", laboratory: false }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Analyze ethical and professional issues in computing and formulate reasoned positions.', poMappings: ['','','','','','','','','','','','I',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Analyze ethical and professional issues in computing and formulate reasoned positions.', intendedLearningOutcome: "Apply ethical frameworks to analyze computing-related ethical dilemmas.", deliveryWeek: "Week 1", allocatedTime: "3 hours", topics: ["Computing Ethics and Law"], references: ["TB1 - Ethics in Information Technology"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Ethics Position Paper", description: "Write a position paper on a current ethical issue in computing." }] },
        assessments: [{ id: 'A1', tlaName: 'Ethics Debate', phase: 'In-class', assessmentMethod: 'Position Paper', assessmentDescription: 'Research and write a position paper on an ethical issue in computing.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Argument quality', maxScore: '40' }, { id: 2, criteria: 'Use of ethical frameworks', maxScore: '30' }, { id: 3, criteria: 'Research depth', maxScore: '30' }] }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Ethics Position Paper"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
    {
        code: 'IT 226', name: 'Capstone Project Preparation', credits: '2 LEC, 1 LAB', contact: '3', prerequisites: 'IT 224 IT Project Management', class: 'Professional Courses', cmo: '25 S, 2015', year: 'FOURTH YEAR', sem: '1st Semester',
        description: 'Preparation for the IT capstone project including proposal writing, literature review, methodology selection, and project planning.',
        references: [{ id: "TB1", title: "Writing the Capstone Project", type: "Textbook", authors: "Larry Page", year: 2022, isbn: "978-1284225831", link: "" }],
        topics: [{ id: "T1", title: "Proposal Development", subtopics: [{ id: "S1", value: "Problem Identification" }, { id: "S2", value: "Literature Review" }, { id: "S3", value: "Methodology Design" }], tlas: [{ id: "TLA1", classPhase: "In-class", performedBy: "Student", tlaName: "Proposal Workshop", tlaDescription: "Students develop capstone project proposals with problem statements, objectives, and methodology.", laboratory: true }] }],
        courseOutcomes: [{ id: 'CO1', description: 'Develop a comprehensive capstone project proposal with clear problem definition and methodology.', poMappings: ['','','','','','','','','E','I','E','',''] }],
        ilos: [{ id: "CO1-ILO1", courseOutcome: 'Develop a comprehensive capstone project proposal with clear problem definition and methodology.', intendedLearningOutcome: "Write a problem statement and research objectives for an IT capstone project.", deliveryWeek: "Week 1", allocatedTime: "4 hours", topics: ["Proposal Development"], references: ["TB1 - Writing the Capstone Project"] }],
        coAssessmentMethodSets: { CO1: [{ value: "Proposal Document", description: "Complete capstone proposal with problem statement, literature review, and methodology." }] },
        assessments: [{ id: 'A1', tlaName: 'Proposal Workshop', phase: 'In-class', assessmentMethod: 'Proposal Submission', assessmentDescription: 'Submit a complete capstone project proposal document.', hasRubric: true, rubrics: [{ id: 1, criteria: 'Problem definition', maxScore: '25' }, { id: 2, criteria: 'Literature review quality', maxScore: '25' }, { id: 3, criteria: 'Methodology appropriateness', maxScore: '25' }, { id: 4, criteria: 'Project plan', maxScore: '25' }] }],
        gradingSystem: [{ co: "CO1", ilos: [{ id: "ILO1", assessments: ["Proposal Document"], weight: { prelim: "100", midterm: "", semi: "", final: "" }, minPassing: "60" }] }]
    },
]

import { enrichSyllabi } from './syllabiDataEnricher.js'
enrichSyllabi(syllabiData)

// Always use built-in data — clear old localStorage cache on app init
try {
  localStorage.removeItem('lpms_syllabi_v1')
} catch (e) { console.warn('Failed to clear localStorage syllabi cache:', e) }

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
  } catch (e) { console.warn('getSyllabusByCode failed:', e) }
  const found = syllabiData.find(s => s.code === code)
  if (found && (!found.courseOutcomes || found.courseOutcomes.length === 0)) {
    enrichSyllabi([found])
  }
  return found || null
};