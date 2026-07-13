import { sequelize, Course, CourseOutcome, IloItem, TosStatus, AssessmentItem, ItemChoice, ItemRubric } from './models/index.js';

function resolveText(txt, ilo, cd) {
    const domain = cd.outcomes[0].description.split(' ').slice(0, 3).join(' ');
    const concept = ilo.description.split(' ').slice(0, 3).join(' ');
    const conceptA = ilo.description.split(' ').slice(0, 2).join(' ');
    const conceptB = ilo.description.split(' ').slice(2, 4).join(' ') || 'related concepts';
    const process = ilo.description.replace(/^(Describe|Compare|Configure|Analyze|Set|Create|Apply|Implement|Utilize) /, '');
    const principle = ilo.description.split(' ').slice(0, 2).join(' ');
    const technique = ilo.description;
    const approachA = ilo.description.split(' ').slice(0, 2).join(' ');
    return txt
        .replace(/{concept}/g, concept)
        .replace(/{conceptA}/g, conceptA)
        .replace(/{conceptB}/g, conceptB)
        .replace(/{process}/g, process)
        .replace(/{principle}/g, principle)
        .replace(/{domain}/g, domain)
        .replace(/{technique}/g, technique)
        .replace(/{approachA}/g, approachA)
        .replace(/{approachB}/g, 'alternative method')
        .replace(/{criteria}/g, 'efficiency and scalability');
}

const newCourses = [
    { code: 'BSCS221L', name: 'Object-Oriented Programming',        status: 'pending',  assessmentName: 'Practical Exam', instructor: 'NORTON, MONICA' },
    { code: 'BSCS222L', name: 'Discrete Structures 2',              status: 'returned', assessmentName: 'Written Exam',  instructor: 'NORTON, MONICA' },
    { code: 'BSCS312L', name: 'Information Management',             status: 'pending',  assessmentName: 'Midterm Exam',  instructor: 'DIAZ, ROSA' },
    { code: 'BSCS324L', name: 'Advanced Software Engineering',       status: 'returned', assessmentName: 'Periodic Exam', instructor: 'DIAZ, ROSA' },
    { code: 'BSCS342L', name: 'Machine Learning Fundamentals',       status: 'pending',  assessmentName: 'Practical Exam', instructor: 'NORTON, MONICA' },
    { code: 'BSCS223L', name: 'Web Development II',                 status: 'approved', assessmentName: 'Midterm Exam',  instructor: 'NORTON, MONICA' },
    { code: 'BSCS314L', name: 'Data Communications',                status: 'approved', assessmentName: 'Written Exam',  instructor: 'NORTON, MONICA' },
    { code: 'BSCS323L', name: 'Systems Analysis and Design',        status: 'approved', assessmentName: 'Periodic Exam', instructor: 'NORTON, MONICA' },
    { code: 'BSCS332L', name: 'Network Security',                   status: 'approved', assessmentName: 'Practical Exam', instructor: 'DIAZ, ROSA' },
    { code: 'BSCS413L', name: 'Capstone Project 2',                 status: 'approved', assessmentName: 'Project',        instructor: 'JEFFORDS, TERRY' },
];

const courseData = [
    {
        courseCode: 'BSCS221L',
        outcomes: [
            { co: 'CO1', description: 'Apply object-oriented programming principles using Java to build modular software components.', totalItems: 18,
                ilos: [
                    { description: 'Model real-world entities using classes, objects, inheritance, and polymorphism in Java.', hours: 6, percentage: 20, items: 4 },
                    { description: 'Implement encapsulation and abstraction using access modifiers and interfaces to enforce modular design.', hours: 5, percentage: 30, items: 5 },
                    { description: 'Apply design patterns such as Singleton, Factory, and Observer to solve recurring design problems.', hours: 4, percentage: 50, items: 9 }
                ]
            },
            { co: 'CO2', description: 'Develop robust Java applications using exception handling, collections, and I/O streams.', totalItems: 20,
                ilos: [
                    { description: 'Handle checked and unchecked exceptions using try-catch-finally and custom exception classes.', hours: 4, percentage: 20, items: 4 },
                    { description: 'Manipulate data using the Java Collections Framework including List, Set, Map, and Stream API.', hours: 6, percentage: 30, items: 6 },
                    { description: 'Perform file I/O operations using byte and character streams, serialization, and NIO APIs.', hours: 5, percentage: 50, items: 10 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS222L',
        outcomes: [
            { co: 'CO1', description: 'Apply set theory, logic, and proof techniques to solve discrete mathematics problems.', totalItems: 16,
                ilos: [
                    { description: 'Apply propositional and predicate logic to evaluate the validity of logical arguments using truth tables and inference rules.', hours: 5, percentage: 20, items: 5 },
                    { description: 'Demonstrate set operations, relations, and functions to model relationships between discrete elements.', hours: 4, percentage: 30, items: 5 },
                    { description: 'Construct mathematical proofs using direct proof, proof by contradiction, and mathematical induction.', hours: 5, percentage: 50, items: 6 }
                ]
            },
            { co: 'CO2', description: 'Apply graph theory and combinatorics to analyze networks and counting problems.', totalItems: 20,
                ilos: [
                    { description: 'Model problems using graph structures including directed, undirected, weighted, and bipartite graphs.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Apply combinatorial principles including permutations, combinations, and the pigeonhole principle to solve counting problems.', hours: 5, percentage: 30, items: 7 },
                    { description: 'Analyze graph properties such as connectivity, planarity, and coloring to solve optimization problems.', hours: 4, percentage: 50, items: 7 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS312L',
        outcomes: [
            { co: 'CO1', description: 'Design and implement relational databases using SQL and normalization techniques.', totalItems: 22,
                ilos: [
                    { description: 'Construct normalized database schemas up to BCNF by identifying functional dependencies and eliminating data redundancy.', hours: 6, percentage: 20, items: 7 },
                    { description: 'Write complex SQL queries involving joins, subqueries, CTEs, and window functions for data retrieval and analysis.', hours: 7, percentage: 30, items: 8 },
                    { description: 'Implement stored procedures, triggers, and views to encapsulate business logic at the database level.', hours: 5, percentage: 50, items: 7 }
                ]
            },
            { co: 'CO2', description: 'Manage database transactions, concurrency, and security in multi-user environments.', totalItems: 23,
                ilos: [
                    { description: 'Manage transactions with appropriate isolation levels to ensure ACID properties while balancing concurrency.', hours: 4, percentage: 20, items: 7 },
                    { description: 'Implement indexing strategies and query optimization techniques to improve database performance.', hours: 6, percentage: 30, items: 8 },
                    { description: 'Configure user authentication, role-based access control, and auditing to protect database security.', hours: 4, percentage: 50, items: 8 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS324L',
        outcomes: [
            { co: 'CO1', description: 'Apply advanced software engineering methodologies to manage complex software projects.', totalItems: 20,
                ilos: [
                    { description: 'Apply Agile and Scrum methodologies to plan, track, and deliver software increments using sprint planning and retrospectives.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Design software architectures using microservices, event-driven, and domain-driven design patterns.', hours: 6, percentage: 30, items: 7 },
                    { description: 'Conduct code reviews, static analysis, and technical debt assessment to maintain software quality.', hours: 4, percentage: 50, items: 7 }
                ]
            },
            { co: 'CO2', description: 'Implement DevOps practices including CI/CD, containerization, and infrastructure as code.', totalItems: 20,
                ilos: [
                    { description: 'Set up continuous integration and deployment pipelines using tools like Jenkins, GitHub Actions, or GitLab CI.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Containerize applications using Docker and orchestrate multi-service deployments with Kubernetes.', hours: 5, percentage: 30, items: 7 },
                    { description: 'Implement infrastructure as code using Terraform or Ansible to automate environment provisioning.', hours: 4, percentage: 50, items: 7 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS342L',
        outcomes: [
            { co: 'CO1', description: 'Apply supervised and unsupervised machine learning algorithms to solve prediction and clustering problems.', totalItems: 20,
                ilos: [
                    { description: 'Prepare and preprocess datasets by handling missing values, encoding categorical variables, and feature scaling.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Implement regression and classification models using linear regression, decision trees, and support vector machines.', hours: 7, percentage: 30, items: 7 },
                    { description: 'Apply clustering algorithms including K-Means, DBSCAN, and hierarchical clustering to discover patterns in unlabeled data.', hours: 5, percentage: 50, items: 7 }
                ]
            },
            { co: 'CO2', description: 'Evaluate and optimize machine learning models using validation techniques and performance metrics.', totalItems: 20,
                ilos: [
                    { description: 'Split datasets using cross-validation and evaluate model performance using accuracy, precision, recall, F1, and AUC-ROC.', hours: 4, percentage: 20, items: 6 },
                    { description: 'Apply hyperparameter tuning using grid search and random search to optimize model performance.', hours: 5, percentage: 30, items: 7 },
                    { description: 'Detect and mitigate overfitting using regularization, dropout, and ensemble methods like Random Forest and Gradient Boosting.', hours: 5, percentage: 50, items: 7 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS223L',
        outcomes: [
            { co: 'CO1', description: 'Build full-stack web applications using modern front-end frameworks and back-end APIs.', totalItems: 22,
                ilos: [
                    { description: 'Develop responsive user interfaces using React with hooks, context API, and state management libraries.', hours: 6, percentage: 20, items: 7 },
                    { description: 'Design and implement RESTful APIs using Node.js, Express, and middleware for request processing.', hours: 6, percentage: 30, items: 8 },
                    { description: 'Integrate authentication and authorization using JWT, OAuth, and session management for secure web applications.', hours: 4, percentage: 50, items: 7 }
                ]
            },
            { co: 'CO2', description: 'Deploy and maintain web applications using cloud services and modern deployment strategies.', totalItems: 18,
                ilos: [
                    { description: 'Deploy web applications to cloud platforms such as AWS, Azure, or Firebase using PaaS and serverless architectures.', hours: 4, percentage: 20, items: 6 },
                    { description: 'Set up monitoring, logging, and alerting using tools like Prometheus, Grafana, and the ELK stack.', hours: 5, percentage: 30, items: 6 },
                    { description: 'Implement A/B testing, canary releases, and feature flags to enable safe and gradual rollouts.', hours: 3, percentage: 50, items: 6 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS314L',
        outcomes: [
            { co: 'CO1', description: 'Analyze data communication principles including signal transmission, modulation, and multiplexing.', totalItems: 20,
                ilos: [
                    { description: 'Compare analog and digital signal transmission methods including amplitude, frequency, and phase modulation.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Analyze multiplexing techniques including FDM, TDM, and CDMA for efficient bandwidth utilization.', hours: 5, percentage: 30, items: 7 },
                    { description: 'Evaluate error detection and correction methods including parity checks, CRC, and Hamming codes for reliable data transmission.', hours: 4, percentage: 50, items: 7 }
                ]
            },
            { co: 'CO2', description: 'Design and configure computer networks using routing, switching, and network protocols.', totalItems: 22,
                ilos: [
                    { description: 'Configure IP addressing, subnetting, and VLANs to design scalable and segmented network topologies.', hours: 6, percentage: 20, items: 7 },
                    { description: 'Implement routing protocols including OSPF and BGP to enable dynamic packet forwarding between networks.', hours: 6, percentage: 30, items: 8 },
                    { description: 'Troubleshoot network issues using packet analysis tools like Wireshark and diagnostic commands to identify performance bottlenecks.', hours: 4, percentage: 50, items: 7 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS323L',
        outcomes: [
            { co: 'CO1', description: 'Analyze and document business requirements using structured and object-oriented analysis techniques.', totalItems: 18,
                ilos: [
                    { description: 'Elicit and document functional and non-functional requirements using interviews, surveys, and workshops.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Model system processes using UML diagrams including use case, activity, sequence, and state machine diagrams.', hours: 6, percentage: 30, items: 6 },
                    { description: 'Validate requirements through prototyping, reviews, and traceability matrices to ensure completeness and consistency.', hours: 4, percentage: 50, items: 6 }
                ]
            },
            { co: 'CO2', description: 'Design system architectures and create technical specifications for software solutions.', totalItems: 22,
                ilos: [
                    { description: 'Design layered, client-server, and microservices architectures that address quality attributes such as scalability and security.', hours: 5, percentage: 20, items: 7 },
                    { description: 'Create detailed technical specifications including API contracts, database schemas, and component interfaces.', hours: 6, percentage: 30, items: 8 },
                    { description: 'Evaluate architectural trade-offs using ATAM or similar methods to make informed design decisions.', hours: 4, percentage: 50, items: 7 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS332L',
        outcomes: [
            { co: 'CO1', description: 'Analyze network security threats and implement defense mechanisms using cryptographic techniques.', totalItems: 18,
                ilos: [
                    { description: 'Identify common network attacks including DoS, man-in-the-middle, and phishing, and propose appropriate countermeasures.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Apply symmetric and asymmetric encryption algorithms including AES, RSA, and ECC to secure data in transit and at rest.', hours: 6, percentage: 30, items: 6 },
                    { description: 'Implement digital signatures, certificates, and PKI infrastructure to authenticate identities and ensure non-repudiation.', hours: 4, percentage: 50, items: 6 }
                ]
            },
            { co: 'CO2', description: 'Configure and manage security infrastructure including firewalls, IDS/IPS, and VPNs.', totalItems: 20,
                ilos: [
                    { description: 'Configure firewall rules and access control lists to enforce network perimeter security policies.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Deploy and tune intrusion detection and prevention systems to identify and block malicious traffic.', hours: 5, percentage: 30, items: 7 },
                    { description: 'Set up site-to-site and remote-access VPNs using IPsec and TLS to enable secure communication over public networks.', hours: 5, percentage: 50, items: 7 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS413L',
        outcomes: [
            { co: 'CO1', description: 'Plan and execute a capstone software project using professional project management methodologies.', totalItems: 18,
                ilos: [
                    { description: 'Define project scope, objectives, and success criteria through a project charter and stakeholder agreement.', hours: 4, percentage: 20, items: 6 },
                    { description: 'Create a project plan with work breakdown structure, milestones, risk register, and resource allocation.', hours: 5, percentage: 30, items: 6 },
                    { description: 'Conduct sprint planning, daily stand-ups, and retrospectives to manage project progress using Agile methodology.', hours: 5, percentage: 50, items: 6 }
                ]
            },
            { co: 'CO2', description: 'Develop and present a complete software solution with documentation and user training materials.', totalItems: 20,
                ilos: [
                    { description: 'Implement the software solution following the designed architecture, coding standards, and test-driven development practices.', hours: 8, percentage: 20, items: 6 },
                    { description: 'Create comprehensive documentation including system architecture, API documentation, and user manuals.', hours: 4, percentage: 30, items: 7 },
                    { description: 'Prepare and deliver a final project presentation and demonstration to stakeholders with Q&A handling.', hours: 3, percentage: 50, items: 7 }
                ]
            }
        ]
    },
];

const iloTemplates = {
    ILO1: [
        { q: 'What is the primary purpose of {concept}?', l: 'Remembering', p: 1, s: 1 },
        { q: 'Explain the difference between {conceptA} and {conceptB}.', l: 'Understanding', p: 2, s: 1 },
        { q: 'Apply {principle} to classify a given scenario as either related or unrelated to {domain}.', l: 'Understanding', p: 2, s: 1, choices: [
            { label: 'A', text: 'Scenario A relates to {principle} in {domain}', isCorrect: true },
            { label: 'B', text: 'Scenario B relates to an alternative approach', isCorrect: false },
            { label: 'C', text: 'Scenario C demonstrates an exception to {principle}', isCorrect: false },
            { label: 'D', text: 'All scenarios are equally relevant', isCorrect: false },
        ]},
        { q: 'Which of the following best describes {concept}?', l: 'Remembering', p: 1, s: 1, choices: [
            { label: 'A', text: 'A method used to implement {process} in {domain}', isCorrect: true },
            { label: 'B', text: 'A tool that replaces {conceptB} entirely', isCorrect: false },
            { label: 'C', text: 'An unrelated concept from {domain}', isCorrect: false },
            { label: 'D', text: 'A metric for evaluating {principle}', isCorrect: false },
        ]},
        { q: 'Why is {principle} important in the context of {domain}?', l: 'Understanding', p: 2, s: 1 },
        { q: 'Define the term {concept} as used in {domain}.', l: 'Remembering', p: 1, s: 1, choices: [
            { label: 'A', text: 'The process of {process} applied to {domain}', isCorrect: true },
            { label: 'B', text: 'An alternative approach to {conceptA}', isCorrect: false },
            { label: 'C', text: 'A tool for measuring {criteria}', isCorrect: false },
            { label: 'D', text: 'A type of {technique} in modern systems', isCorrect: false },
        ]},
        { q: 'Analyze how {conceptA} influences decision-making in {domain}. Provide supporting arguments.', l: 'Understanding', p: 3, s: 1, rubricRows: [
            { name: 'Analysis', description: 'Identifies key factors and relationships involving {conceptA}', weight: 40 },
            { name: 'Argumentation', description: 'Presents well-supported arguments with evidence from {domain}', weight: 35 },
            { name: 'Critical Thinking', description: 'Considers alternative perspectives and counterarguments', weight: 25 },
        ]},
        { q: 'Restate {principle} in your own words and provide a concrete example.', l: 'Understanding', p: 3, s: 2, rubricRows: [
            { name: 'Accuracy', description: 'Accurately restates the meaning of {principle}', weight: 40 },
            { name: 'Relevance', description: 'Provides a relevant and concrete example', weight: 30 },
            { name: 'Clarity', description: 'Explanation is clear and logically structured', weight: 30 },
        ]},
        { q: 'What is the relationship between {conceptA} and {process}?', l: 'Remembering', p: 1, s: 1, choices: [
            { label: 'A', text: '{conceptA} is a prerequisite for understanding {process}', isCorrect: true },
            { label: 'B', text: '{process} replaces {conceptA} in modern practice', isCorrect: false },
            { label: 'C', text: 'They are competing approaches to {domain}', isCorrect: false },
            { label: 'D', text: 'There is no relationship between them', isCorrect: false },
        ]},
    ],
    ILO2: [
        { q: 'Explain the difference between {conceptA} and {conceptB} with examples.', l: 'Understanding', p: 2, s: 1 },
        { q: 'Recall the three primary components of {concept} and briefly describe each.', l: 'Understanding', p: 1, s: 1 },
        { q: 'Describe the process of {process} with a concrete example.', l: 'Applying', p: 4, s: 2, rubricRows: [
            { name: 'Completeness', description: 'Accurately describes each step of {process}', weight: 40 },
            { name: 'Relevance', description: 'Example is concrete and clearly connected', weight: 30 },
            { name: 'Organization', description: 'Writing is well-organized and easy to follow', weight: 30 },
        ]},
        { q: 'Why is {principle} important in the context of {domain}?', l: 'Understanding', p: 2, s: 1, choices: [
            { label: 'A', text: 'It provides a framework for implementing {process} effectively', isCorrect: true },
            { label: 'B', text: 'It eliminates the need for {conceptA} in modern workflows', isCorrect: false },
            { label: 'C', text: 'It is mandated by regulatory bodies in {domain}', isCorrect: false },
            { label: 'D', text: 'It reduces the cost of {criteria} by half', isCorrect: false },
        ]},
        { q: 'Create a checklist or framework that integrates {technique} with {principle} for use in {domain}.', l: 'Evaluating', p: 5, s: 2, rubricRows: [
            { name: 'Integration', description: 'Effectively combines {technique} and {principle} into a cohesive framework', weight: 35 },
            { name: 'Usability', description: 'Framework is practical and applicable to {domain} scenarios', weight: 35 },
            { name: 'Originality', description: 'Demonstrates creative thinking beyond standard approaches', weight: 30 },
        ]},
        { q: 'Provide a step-by-step guide for implementing {technique}.', l: 'Applying', p: 4, s: 2, rubricRows: [
            { name: 'Completeness', description: 'Steps are complete and logically sequenced', weight: 35 },
            { name: 'Correctness', description: 'Implementation details of {technique} are correct', weight: 35 },
            { name: 'Thoroughness', description: 'Edge cases and potential pitfalls are addressed', weight: 30 },
        ]},
        { q: 'Compare and contrast {approachA} and {approachB} in terms of {criteria}.', l: 'Analyzing', p: 3, s: 1 },
        { q: 'Evaluate the effectiveness of {technique} in {domain} scenarios.', l: 'Evaluating', p: 3, s: 1, rubricRows: [
            { name: 'Criteria Quality', description: 'Establishes clear and relevant evaluation criteria', weight: 35 },
            { name: 'Evidence', description: 'Presents evidence-based analysis of {technique}', weight: 35 },
            { name: 'Reasoning', description: 'Conclusion is well-reasoned and supported', weight: 30 },
        ]},
        { q: 'Which approach is more suitable when dealing with {criteria} constraints?', l: 'Analyzing', p: 2, s: 1, choices: [
            { label: 'A', text: '{approachA} because it emphasizes {process} flexibility', isCorrect: false },
            { label: 'B', text: 'It depends on the specific requirements of {domain}', isCorrect: true },
            { label: 'C', text: '{approachB} always performs better under {criteria}', isCorrect: false },
            { label: 'D', text: 'Both approaches handle {criteria} equally well', isCorrect: false },
        ]},
        { q: 'Demonstrate how to apply {technique} to solve a real-world problem.', l: 'Applying', p: 4, s: 2, rubricRows: [
            { name: 'Scope', description: 'Problem is clearly defined and scoped', weight: 30 },
            { name: 'Application', description: 'Application of {technique} is correct and complete', weight: 40 },
            { name: 'Practicality', description: 'Solution addresses real-world constraints', weight: 30 },
        ]},
    ],
    ILO3: [
        { q: 'Describe the process of {process} with a detailed example from {domain}.', l: 'Applying', p: 4, s: 2, rubricRows: [
            { name: 'Comprehensiveness', description: 'Comprehensive step-by-step description of {process}', weight: 35 },
            { name: 'Relevance', description: 'Example is detailed and directly relevant to {domain}', weight: 35 },
            { name: 'Integration', description: 'Connections between theory and practice are clear', weight: 30 },
        ]},
        { q: 'Define {concept} in one sentence and explain why it matters in {domain}.', l: 'Applying', p: 1, s: 1 },
        { q: 'Provide a step-by-step guide for implementing {technique}.', l: 'Applying', p: 4, s: 2 },
        { q: 'When comparing {approachA} and {approachB}, which statement is most accurate?', l: 'Analyzing', p: 2, s: 1, choices: [
            { label: 'A', text: '{approachA} prioritizes {criteria} while {approachB} prioritizes flexibility', isCorrect: false },
            { label: 'B', text: '{approachA} suits {domain} applications; {approachB} suits general cases', isCorrect: true },
            { label: 'C', text: '{approachA} and {approachB} yield identical results for {process}', isCorrect: false },
            { label: 'D', text: 'Both approaches ignore {principle} considerations entirely', isCorrect: false },
        ]},
        { q: 'Evaluate the effectiveness of {technique} when applied to {domain} scenarios.', l: 'Evaluating', p: 3, s: 1, rubricRows: [
            { name: 'Framework', description: 'Systematic evaluation framework is established', weight: 35 },
            { name: 'Depth', description: 'Specific {domain} scenarios are analyzed in depth', weight: 35 },
            { name: 'Objectivity', description: 'Assessment is balanced and evidence-based', weight: 30 },
        ]},
        { q: 'Design a solution for {process} that addresses the constraints of {domain}.', l: 'Creating', p: 5, s: 2, rubricRows: [
            { name: 'Innovation', description: 'Solution is innovative, feasible, and well-structured', weight: 35 },
            { name: 'Constraints', description: 'All relevant {domain} constraints are addressed', weight: 35 },
            { name: 'Justification', description: 'Design choices are clearly justified', weight: 30 },
        ]},
        { q: 'Summarize the key differences between {approachA} and {approachB} as they relate to {process}.', l: 'Applying', p: 2, s: 1, choices: [
            { label: 'A', text: '{approachA} focuses on structure, while {approachB} focuses on behavior', isCorrect: false },
            { label: 'B', text: '{approachA} is better suited for {domain} because of {principle}', isCorrect: true },
            { label: 'C', text: '{approachB} completely replaces {approachA} in all modern contexts', isCorrect: false },
            { label: 'D', text: 'Both approaches are identical in {domain} with minor naming differences', isCorrect: false },
        ]},
        { q: 'Assess the strengths and weaknesses of {technique} when applied to {domain}.', l: 'Evaluating', p: 3, s: 1 },
        { q: 'Create a detailed implementation plan for deploying {technique} in a {domain} environment.', l: 'Creating', p: 5, s: 2, rubricRows: [
            { name: 'Planning', description: 'Plan is comprehensive with clear phases and milestones', weight: 35 },
            { name: 'Feasibility', description: 'Resource allocation and timeline are realistic', weight: 35 },
            { name: 'Risk Management', description: 'Risk mitigation and contingency strategies are included', weight: 30 },
        ]},
        { q: 'Synthesize {conceptA} and {conceptB} to propose a novel approach for solving {process}.', l: 'Creating', p: 5, s: 2, rubricRows: [
            { name: 'Synthesis', description: 'Novel synthesis of {conceptA} and {conceptB}', weight: 35 },
            { name: 'Alignment', description: 'Proposed approach directly addresses {process}', weight: 35 },
            { name: 'Critical Analysis', description: 'Feasibility and limitations are discussed', weight: 30 },
        ]},
    ],
};

function generateItems(courseCode) {
    const cd = courseData.find(c => c.courseCode === courseCode);
    if (!cd) return [];
    const items = [];
    for (const outcome of cd.outcomes) {
        const co = outcome.co;
        outcome.ilos.forEach((ilo, iloIdx) => {
            const iloKey = `ILO${iloIdx + 1}`;
            const templates = iloTemplates[iloKey] || iloTemplates.ILO2;
            let spanSum = 0;
            let i = 0;
            while (spanSum < ilo.items) {
                const tpl = templates[i % templates.length];
                const span = tpl.s || 1;
                const effectiveSpan = Math.min(span, ilo.items - spanSum);
                if (effectiveSpan <= 0) break;
                const item = {
                    courseCode,
                    co,
                    ilo: iloKey,
                    iloIdx,
                    instruction: resolveText(tpl.q, ilo, cd),
                    points: tpl.p || 2,
                    span: effectiveSpan,
                    cognitiveLevel: tpl.l || 'Remembering',
                };
                if (tpl.choices && tpl.choices.length > 0) {
                    item.choices = tpl.choices.map(c => ({
                        label: c.label,
                        text: resolveText(c.text, ilo, cd),
                        isCorrect: c.isCorrect || false,
                    }));
                } else if (tpl.rubricRows && tpl.rubricRows.length > 0) {
                    item.rubricRows = tpl.rubricRows.map(r => ({
                        criteria: resolveText(r.name, ilo, cd),
                        description: resolveText(r.description || '', ilo, cd),
                        weight: r.weight,
                    }));
                }
                items.push(item);
                spanSum += effectiveSpan;
                i++;
            }
        });
    }
    return items;
}

async function seedNewCourses() {
    await Course.bulkCreate(newCourses);
    await TosStatus.bulkCreate(newCourses.map(c => {
        const s = { courseCode: c.code, status: c.status };
        if (c.status === 'pending') s.submittedAt = new Date('2026-06-10');
        else if (c.status === 'returned') { s.submittedAt = new Date('2026-06-10'); s.returnedAt = new Date('2026-06-19'); }
        else if (c.status === 'approved') { s.submittedAt = new Date('2026-06-09'); s.approvedAt = new Date('2026-06-16'); }
        return s;
    }));

    for (const data of courseData) {
        for (const outcome of data.outcomes) {
            const created = await CourseOutcome.create({
                co: outcome.co,
                description: outcome.description,
                totalItems: outcome.totalItems,
                courseCode: data.courseCode
            });
            if (outcome.ilos && outcome.ilos.length) {
                await IloItem.bulkCreate(
                    outcome.ilos.map(ilo => ({ ...ilo, coId: created.id }))
                );
            }
        }
    }

    const codes = newCourses.map(c => c.code);
    for (const code of codes) {
        // build iloId lookup: (courseCode, co, iloIdx) → iloId
        const outcomeRows = await CourseOutcome.findAll({
            where: { courseCode: code },
            include: [{ model: IloItem, as: 'ilos' }],
            order: [['co', 'ASC']]
        });
        const iloIdMap = {};
        outcomeRows.forEach(o => {
            (o.ilos || []).forEach((ilo, idx) => {
                iloIdMap[`${o.co}|${idx}`] = ilo.id;
            });
        });

        const items = generateItems(code);
        for (const item of items) {
            const created = await AssessmentItem.create({
                courseCode: item.courseCode,
                iloId: iloIdMap[`${item.co}|${item.iloIdx}`],
                instruction: item.instruction,
                points: item.points,
                span: item.span,
                cognitiveLevel: item.cognitiveLevel,
            });
            if (item.choices && item.choices.length > 0) {
                await ItemChoice.bulkCreate(
                    item.choices.map((c, ci) => ({
                        itemId: created.id,
                        label: c.label,
                        text: c.text,
                        isCorrect: c.isCorrect || false,
                        sortOrder: ci
                    }))
                );
            } else if (item.rubricRows && item.rubricRows.length > 0) {
                await ItemRubric.bulkCreate(
                    item.rubricRows.map((r, ri) => ({
                        itemId: created.id,
                        criteria: r.criteria,
                        description: r.description || '',
                        weight: r.weight,
                        sortOrder: ri
                    }))
                );
            }
        }
        console.log(`  Seeded ${items.length} items for ${code}`);
    }

    console.log('New courses seeded successfully');
}

export { seedNewCourses, newCourses, courseData };
