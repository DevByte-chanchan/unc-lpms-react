import { sequelize, Course, CourseOutcome, IloItem, TosStatus, AssessmentItem, ItemChoice, ItemRubric } from './models/index.js';
import { seedNewCourses } from './seed_new_courses.js';
import { seedReturnedComments } from './seed_comments.js';

const courses = [
    { code: 'BSCS313L', name: 'Human & Computer Interaction', instructor: 'NORTON, MONICA' },
    { code: 'BSCS212L', name: 'Web Development I', assessmentName: 'Written Exam', instructor: 'NORTON, MONICA' },
    { code: 'BSCS111L', name: 'Fundamentals of Programming', assessmentName: 'Written Exam', instructor: 'NORTON, MONICA' },
    { code: 'BSCS214L', name: 'Data Structures and Algorithms', assessmentName: 'Written Exam', instructor: 'NORTON, MONICA' },
    { code: 'BSCS315L', name: 'Operating Systems', assessmentName: 'Periodic Exam', instructor: 'DIAZ, ROSA' },
    { code: 'BSCS321L', name: 'Database Management Systems', instructor: 'NORTON, MONICA' },
    { code: 'BSCS322L', name: 'Software Engineering', assessmentName: 'Midterm Exam', instructor: 'DIAZ, ROSA' },
    { code: 'BSCS331L', name: 'Computer Networks', assessmentName: 'Periodic Exam', instructor: 'JEFFORDS, TERRY' },
    { code: 'BSCS341L', name: 'Artificial Intelligence', assessmentName: 'Written Exam', instructor: 'NORTON, MONICA' },
    { code: 'BSCS351L', name: 'Cybersecurity Fundamentals', assessmentName: 'Midterm Exam', instructor: 'DIAZ, ROSA' }
];

const statuses = [
    { courseCode: 'BSCS313L', status: 'draft' },
    { courseCode: 'BSCS212L', status: 'draft' },
    { courseCode: 'BSCS111L', status: 'draft' },
    { courseCode: 'BSCS214L', status: 'returned', submittedAt: new Date('2026-06-09'), returnedAt: new Date('2026-06-18') },
    { courseCode: 'BSCS315L', status: 'approved', submittedAt: new Date('2026-06-09'), approvedAt: new Date('2026-06-16') },
    { courseCode: 'BSCS321L', status: 'draft' },
    { courseCode: 'BSCS322L', status: 'draft' },
    { courseCode: 'BSCS331L', status: 'pending', submittedAt: new Date('2026-06-10') },
    { courseCode: 'BSCS341L', status: 'pending', submittedAt: new Date('2026-06-11') },
    { courseCode: 'BSCS351L', status: 'draft' }
];

const courseData = [
    {
        courseCode: 'BSCS313L',
        outcomes: [
            {
                co: 'CO1', description: 'Apply core concepts, theories, and principles of Human-Computer Interaction (HCI) in proposing a User Interface (UI) design using Figma.', totalItems: 18,
                ilos: [
                    { description: 'Analyze the relationship between cognitive psychology and human-computer interaction.', hours: 3, percentage: 20, items: 4 },
                    { description: 'Synthesize user research data into actionable user personas and empathy maps.', hours: 3, percentage: 30, items: 5 },
                    { description: 'Structure information architecture effectively using card sorting techniques.', hours: 6, percentage: 50, items: 9 }
                ]
            },
            {
                co: 'CO2', description: 'Apply User-Centered Design (UCD) principles and ISO 9241-210 standards to develop a User Experience (UX) design.', totalItems: 22,
                ilos: [
                    { description: 'Apply Nielsen\'s 10 Usability Heuristics to critique existing interface designs.', hours: 3, percentage: 20, items: 4 },
                    { description: 'Create low-fidelity wireframes that solve specific user pain points.', hours: 3, percentage: 30, items: 7 },
                    { description: 'Apply Gestalt principles and color theory to enhance UI readability.', hours: 6, percentage: 50, items: 11 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS212L',
        outcomes: [
            {
                co: 'CO1', description: 'Build responsive web pages using HTML5, CSS3, and JavaScript.', totalItems: 23,
                ilos: [
                    { description: 'Construct semantic HTML5 documents that properly structure content using meaningful elements for accessibility.', hours: 4, percentage: 20, items: 6 },
                    { description: 'Implement responsive layouts using CSS Flexbox and Grid that adapt seamlessly across desktop, tablet, and mobile viewports.', hours: 4, percentage: 30, items: 7 },
                    { description: 'Add interactivity to web pages using DOM manipulation and event handling in JavaScript.', hours: 4, percentage: 50, items: 10 }
                ]
            },
            {
                co: 'CO2', description: 'Develop client-side applications using modern JavaScript frameworks.', totalItems: 19,
                ilos: [
                    { description: 'Manage application state using component-based architecture to build maintainable and reusable UI components.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Implement client-side routing and data fetching to create single-page applications with multiple views.', hours: 5, percentage: 30, items: 8 },
                    { description: 'Debug and optimize front-end performance using browser developer tools and performance profiling.', hours: 2, percentage: 50, items: 5 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS111L',
        outcomes: [
            {
                co: 'CO1', description: 'Apply core programming concepts using Python to solve computational problems.', totalItems: 22,
                ilos: [
                    { description: 'Design algorithms using sequence, selection, and iteration to break down computational problems into logical steps.', hours: 6, percentage: 20, items: 4 },
                    { description: 'Implement functions and modular code with well-defined parameters and return values to promote code reuse.', hours: 4, percentage: 30, items: 7 },
                    { description: 'Manipulate built-in data structures such as lists, dictionaries, and tuples to store and organize data efficiently.', hours: 6, percentage: 50, items: 11 }
                ]
            },
            {
                co: 'CO2', description: 'Develop small-scale programs following test-driven development.', totalItems: 26,
                ilos: [
                    { description: 'Write unit tests to verify program correctness before implementing features, following the red-green-refactor cycle.', hours: 4, percentage: 20, items: 5 },
                    { description: 'Read from and write to files for persistent data storage between program executions.', hours: 4, percentage: 30, items: 8 },
                    { description: 'Handle exceptions and validate user input to build robust programs that fail gracefully.', hours: 4, percentage: 50, items: 13 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS214L',
        outcomes: [
            {
                co: 'CO1', description: 'Analyze time and space complexity of algorithms.', totalItems: 20,
                ilos: [
                    { description: 'Apply Big-O notation to analyze and classify the time efficiency of algorithms in terms of worst-case and average-case performance.', hours: 4, percentage: 20, items: 7 },
                    { description: 'Implement common sorting and searching algorithms including quicksort, mergesort, and binary search.', hours: 5, percentage: 30, items: 6 },
                    { description: 'Compare recursive and iterative approaches to problem solving, identifying when each strategy is more appropriate.', hours: 3, percentage: 50, items: 7 }
                ]
            },
            {
                co: 'CO2', description: 'Implement fundamental data structures and their operations.', totalItems: 25,
                ilos: [
                    { description: 'Build and traverse linked lists, stacks, and queues to understand pointer-based data structures.', hours: 5, percentage: 20, items: 8 },
                    { description: 'Construct hash tables and balanced trees to enable efficient data retrieval and storage.', hours: 5, percentage: 30, items: 9 },
                    { description: 'Apply graph algorithms including breadth-first search, depth-first search, and shortest path algorithms to solve real-world problems.', hours: 4, percentage: 50, items: 8 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS315L',
        outcomes: [
            {
                co: 'CO1', description: 'Explain OS concepts including process management and memory hierarchy.', totalItems: 16,
                ilos: [
                    { description: 'Describe process states, scheduling algorithms, and context switching mechanisms used by modern operating systems.', hours: 5, percentage: 20, items: 6 },
                    { description: 'Compare paging, segmentation, and virtual memory techniques for managing memory allocation.', hours: 4, percentage: 30, items: 5 },
                    { description: 'Analyze deadlock detection, prevention, and avoidance strategies in concurrent systems.', hours: 3, percentage: 50, items: 5 }
                ]
            },
            {
                co: 'CO2', description: 'Implement concurrency and IPC mechanisms.', totalItems: 16,
                ilos: [
                    { description: 'Create multi-threaded programs using synchronization primitives such as mutexes, semaphores, and condition variables.', hours: 5, percentage: 20, items: 5 },
                    { description: 'Implement inter-process communication using pipes, message queues, and shared memory.', hours: 5, percentage: 30, items: 5 },
                    { description: 'Simulate CPU scheduling algorithms including FCFS, SJF, and Round Robin to compute average waiting and turnaround times.', hours: 4, percentage: 50, items: 6 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS321L',
        outcomes: [
            {
                co: 'CO1', description: 'Design relational database schemas using normalization and ER modeling.', totalItems: 0,
                ilos: [
                    { description: 'Create entity-relationship diagrams that accurately capture entities, attributes, and relationships for a given domain.', hours: 4, percentage: 20, items: 0 },
                    { description: 'Normalize tables up to Third Normal Form and Boyce-Codd Normal Form to eliminate data redundancy.', hours: 4, percentage: 30, items: 0 },
                    { description: 'Write complex SQL queries involving joins, subqueries, and aggregate functions to retrieve and analyze data.', hours: 6, percentage: 50, items: 0 }
                ]
            },
            {
                co: 'CO2', description: 'Implement database transactions, indexing, and security.', totalItems: 0,
                ilos: [
                    { description: 'Manage transactions with ACID properties and appropriate isolation levels to ensure data consistency.', hours: 3, percentage: 20, items: 0 },
                    { description: 'Optimize query performance using indexes, execution plan analysis, and query restructuring.', hours: 4, percentage: 30, items: 0 },
                    { description: 'Configure user roles, permissions, and backup strategies to protect database security and availability.', hours: 3, percentage: 50, items: 0 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS322L',
        outcomes: [
            {
                co: 'CO1', description: 'Apply SDLC methodologies to plan and document software projects.', totalItems: 18,
                ilos: [
                    { description: 'Gather and document functional and non-functional requirements using interviews, surveys, and use case analysis.', hours: 4, percentage: 20, items: 4 },
                    { description: 'Model system behavior using UML diagrams including use case, sequence, and class diagrams.', hours: 5, percentage: 30, items: 5 },
                    { description: 'Estimate project effort using COCOMO and planning poker techniques to produce realistic timelines.', hours: 3, percentage: 50, items: 9 }
                ]
            },
            {
                co: 'CO2', description: 'Implement and test software following agile practices.', totalItems: 22,
                ilos: [
                    { description: 'Write user stories and manage a product backlog using Agile prioritization techniques such as MoSCoW.', hours: 3, percentage: 20, items: 4 },
                    { description: 'Apply continuous integration and version control workflows using feature branches and pull requests.', hours: 5, percentage: 30, items: 7 },
                    { description: 'Design and execute unit, integration, and system tests to validate software quality at multiple levels.', hours: 4, percentage: 50, items: 11 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS331L',
        outcomes: [
            {
                co: 'CO1', description: 'Explain network architectures, protocols, and the OSI model.', totalItems: 16,
                ilos: [
                    { description: 'Describe encapsulation, addressing, and packet switching principles that enable data transmission across networks.', hours: 4, percentage: 20, items: 5 },
                    { description: 'Configure IP subnets and routing tables to segment networks and control traffic flow.', hours: 5, percentage: 30, items: 6 },
                    { description: 'Analyze TCP and UDP behavior using Wireshark captures to understand connection establishment and flow control.', hours: 3, percentage: 50, items: 5 }
                ]
            },
            {
                co: 'CO2', description: 'Design and secure small-to-medium enterprise networks.', totalItems: 16,
                ilos: [
                    { description: 'Set up VLANs, STP, and link aggregation to segment broadcast domains and improve network redundancy.', hours: 5, percentage: 20, items: 5 },
                    { description: 'Configure firewall rules and access control lists to enforce network security policies.', hours: 5, percentage: 30, items: 6 },
                    { description: 'Troubleshoot connectivity issues using ping, traceroute, and DNS lookup tools to isolate network problems.', hours: 4, percentage: 50, items: 5 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS341L',
        outcomes: [
            {
                co: 'CO1', description: 'Explain foundational AI concepts including search and knowledge representation.', totalItems: 15,
                ilos: [
                    { description: 'Compare uninformed and informed search strategies such as BFS, DFS, and A* in terms of completeness and optimality.', hours: 4, percentage: 20, items: 5 },
                    { description: 'Represent knowledge using propositional and first-order logic to encode facts and infer new conclusions.', hours: 4, percentage: 30, items: 5 },
                    { description: 'Implement constraint satisfaction problem solvers using backtracking and forward checking techniques.', hours: 4, percentage: 50, items: 5 }
                ]
            },
            {
                co: 'CO2', description: 'Apply machine learning algorithms to structured datasets.', totalItems: 20,
                ilos: [
                    { description: 'Train and evaluate supervised learning models including linear regression, decision trees, and support vector machines.', hours: 6, percentage: 20, items: 7 },
                    { description: 'Cluster unlabeled data using K-means and hierarchical clustering to discover natural groupings.', hours: 4, percentage: 30, items: 7 },
                    { description: 'Preprocess features through scaling, encoding, and dimensionality reduction to improve model performance.', hours: 4, percentage: 50, items: 6 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS351L',
        outcomes: [
            {
                co: 'CO1', description: 'Identify cybersecurity threats, vulnerabilities, and risk management frameworks.', totalItems: 16,
                ilos: [
                    { description: 'Classify common attack vectors including phishing, malware, DDoS, and man-in-the-middle attacks based on their impact.', hours: 4, percentage: 20, items: 5 },
                    { description: 'Perform risk assessments using NIST and ISO 27001 standards to identify and prioritize security risks.', hours: 4, percentage: 30, items: 5 },
                    { description: 'Apply cryptographic primitives including symmetric encryption, asymmetric encryption, and hashing to protect data.', hours: 4, percentage: 50, items: 6 }
                ]
            },
            {
                co: 'CO2', description: 'Implement security controls for network and application defence.', totalItems: 24,
                ilos: [
                    { description: 'Configure intrusion detection systems and SIEM tools to monitor network traffic and detect suspicious activity.', hours: 5, percentage: 20, items: 8 },
                    { description: 'Conduct vulnerability scans and interpret penetration test results to identify weaknesses in systems.', hours: 5, percentage: 30, items: 8 },
                    { description: 'Develop incident response playbooks and recovery procedures to guide teams through security incidents.', hours: 4, percentage: 50, items: 8 }
                ]
            }
        ]
    }
];

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

async function createItemsForCourse(courseCode) {
    const cd = courseData.find(c => c.courseCode === courseCode);
    if (!cd) return;

    // lookup iloId by (outcome.co, position within outcome)
    const outcomeRows = await CourseOutcome.findAll({
        where: { courseCode },
        include: [{ model: IloItem, as: 'ilos' }],
        order: [['co', 'ASC']]
    });
    const iloIdMap = {};
    outcomeRows.forEach(o => {
        (o.ilos || []).forEach((ilo, idx) => {
            iloIdMap[`${o.co}|${idx}`] = ilo.id;
        });
    });

    for (const outcome of cd.outcomes) {
        for (let iloIdx = 0; iloIdx < outcome.ilos.length; iloIdx++) {
            const ilo = outcome.ilos[iloIdx];
            const iloKey = `ILO${iloIdx + 1}`;
            const templates = iloTemplates[iloKey] || iloTemplates.ILO2;
            let spanSum = 0;
            let i = 0;
            const target = ilo.items || 0;
            if (target === 0) continue;
            while (spanSum < target) {
                const tpl = templates[i % templates.length];
                const span = tpl.s || 1;
                const effectiveSpan = Math.min(span, target - spanSum);
                if (effectiveSpan <= 0) break;
                const made = await AssessmentItem.create({
                    courseCode,
                    iloId: iloIdMap[`${outcome.co}|${iloIdx}`],
                    instruction: resolveText(tpl.q, ilo, cd),
                    points: tpl.p || 2,
                    span: effectiveSpan,
                    cognitiveLevel: tpl.l || 'Remembering',
                });
                if (tpl.choices && tpl.choices.length > 0) {
                    await ItemChoice.bulkCreate(
                        tpl.choices.map((c, ci) => ({
                            itemId: made.id,
                            label: c.label,
                            text: resolveText(c.text, ilo, cd),
                            isCorrect: c.isCorrect || false,
                            sortOrder: ci
                        }))
                    );
                } else if (tpl.rubricRows && tpl.rubricRows.length > 0) {
                    await ItemRubric.bulkCreate(
                        tpl.rubricRows.map((r, ri) => ({
                            itemId: made.id,
                            criteria: resolveText(r.name, ilo, cd),
                            description: resolveText(r.description || '', ilo, cd),
                            weight: r.weight,
                            sortOrder: ri
                        }))
                    );
                }
                spanSum += effectiveSpan;
                i++;
            }
        }
    }
}

async function seed() {
    await sequelize.sync({ force: true });
    await Course.bulkCreate(courses);
    await TosStatus.bulkCreate(statuses);

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

    await createItemsForCourse('BSCS313L');
    await createItemsForCourse('BSCS111L');
    await createItemsForCourse('BSCS212L');
    await createItemsForCourse('BSCS214L');
    await createItemsForCourse('BSCS322L');
    await createItemsForCourse('BSCS341L');
    await createItemsForCourse('BSCS351L');
    await createItemsForCourse('BSCS315L');
    await createItemsForCourse('BSCS331L');

    await seedNewCourses();
    await seedReturnedComments();

    console.log('Database seeded successfully');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
