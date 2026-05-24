import { sequelize, Course, CourseOutcome, IloItem, TosStatus } from './models/index.js';

const courses = [
    { code: 'BSCS313L', name: 'Human & Computer Interaction' },
    { code: 'BSCS212L', name: 'Web Development I' },
    { code: 'BSCS111L', name: 'Fundamentals of Programming' },
    { code: 'BSCS214L', name: 'Data Structures and Algorithms' },
    { code: 'BSCS315L', name: 'Operating Systems' },
    { code: 'BSCS321L', name: 'Database Management Systems' },
    { code: 'BSCS322L', name: 'Software Engineering' },
    { code: 'BSCS331L', name: 'Computer Networks' },
    { code: 'BSCS341L', name: 'Artificial Intelligence' },
    { code: 'BSCS351L', name: 'Cybersecurity Fundamentals' }
];

const statuses = [
    { courseCode: 'BSCS313L', status: 'DRAFT' },
    { courseCode: 'BSCS212L', status: 'DRAFT' },
    { courseCode: 'BSCS111L', status: 'DRAFT' },
    { courseCode: 'BSCS214L', status: 'pending' },
    { courseCode: 'BSCS315L', status: 'approved' },
    { courseCode: 'BSCS321L', status: 'DRAFT' },
    { courseCode: 'BSCS322L', status: 'pending' },
    { courseCode: 'BSCS331L', status: 'approved' },
    { courseCode: 'BSCS341L', status: 'DRAFT' },
    { courseCode: 'BSCS351L', status: 'pending' }
];

const courseData = [
    {
        courseCode: 'BSCS313L',
        outcomes: [
            {
                co: 'CO1', description: 'Apply core concepts of HCI in proposing a UI design using Figma.', totalItems: 0,
                ilos: [
                    { description: 'Analyze cognitive psychology principles to understand how users perceive, process, and interact with digital interfaces.', hours: 3, percentage: 20, items: 0 },
                    { description: 'Synthesize user research data into actionable personas and empathy maps that capture user goals, pain points, and behavioral patterns.', hours: 3, percentage: 30, items: 0 },
                    { description: 'Structure information architecture by applying card sorting and tree testing techniques to create intuitive navigation systems.', hours: 6, percentage: 50, items: 0 }
                ]
            },
            {
                co: 'CO2', description: 'Develop UX design following UCD principles and ISO 9241-210.', totalItems: 0,
                ilos: [
                    { description: 'Apply Nielsen\'s 10 Usability Heuristics to systematically critique and identify usability issues in existing interface designs.', hours: 3, percentage: 20, items: 0 },
                    { description: 'Create low-fidelity wireframes and interactive prototypes that address specific user pain points identified through research.', hours: 3, percentage: 30, items: 0 },
                    { description: 'Apply Gestalt principles and color theory to enhance visual hierarchy, readability, and overall UI aesthetics.', hours: 6, percentage: 50, items: 0 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS212L',
        outcomes: [
            {
                co: 'CO1', description: 'Build responsive web pages using HTML5, CSS3, and JavaScript.', totalItems: 0,
                ilos: [
                    { description: 'Construct semantic HTML5 documents that properly structure content using meaningful elements for accessibility.', hours: 4, percentage: 20, items: 0 },
                    { description: 'Implement responsive layouts using CSS Flexbox and Grid that adapt seamlessly across desktop, tablet, and mobile viewports.', hours: 4, percentage: 30, items: 0 },
                    { description: 'Add interactivity to web pages using DOM manipulation and event handling in JavaScript.', hours: 4, percentage: 50, items: 0 }
                ]
            },
            {
                co: 'CO2', description: 'Develop client-side applications using modern JavaScript frameworks.', totalItems: 0,
                ilos: [
                    { description: 'Manage application state using component-based architecture to build maintainable and reusable UI components.', hours: 5, percentage: 20, items: 0 },
                    { description: 'Implement client-side routing and data fetching to create single-page applications with multiple views.', hours: 5, percentage: 30, items: 0 },
                    { description: 'Debug and optimize front-end performance using browser developer tools and performance profiling.', hours: 2, percentage: 50, items: 0 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS111L',
        outcomes: [
            {
                co: 'CO1', description: 'Apply core programming concepts using Python to solve computational problems.', totalItems: 20,
                ilos: [
                    { description: 'Design algorithms using sequence, selection, and iteration to break down computational problems into logical steps.', hours: 6, percentage: 20, items: 7 },
                    { description: 'Implement functions and modular code with well-defined parameters and return values to promote code reuse.', hours: 4, percentage: 30, items: 6 },
                    { description: 'Manipulate built-in data structures such as lists, dictionaries, and tuples to store and organize data efficiently.', hours: 6, percentage: 50, items: 7 }
                ]
            },
            {
                co: 'CO2', description: 'Develop small-scale programs following test-driven development.', totalItems: 25,
                ilos: [
                    { description: 'Write unit tests to verify program correctness before implementing features, following the red-green-refactor cycle.', hours: 4, percentage: 20, items: 6 },
                    { description: 'Read from and write to files for persistent data storage between program executions.', hours: 4, percentage: 30, items: 9 },
                    { description: 'Handle exceptions and validate user input to build robust programs that fail gracefully.', hours: 4, percentage: 50, items: 10 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS214L',
        outcomes: [
            {
                co: 'CO1', description: 'Analyze time and space complexity of algorithms.', totalItems: 0,
                ilos: [
                    { description: 'Apply Big-O notation to analyze and classify the time efficiency of algorithms in terms of worst-case and average-case performance.', hours: 4, percentage: 20, items: 0 },
                    { description: 'Implement common sorting and searching algorithms including quicksort, mergesort, and binary search.', hours: 5, percentage: 30, items: 0 },
                    { description: 'Compare recursive and iterative approaches to problem solving, identifying when each strategy is more appropriate.', hours: 3, percentage: 50, items: 0 }
                ]
            },
            {
                co: 'CO2', description: 'Implement fundamental data structures and their operations.', totalItems: 0,
                ilos: [
                    { description: 'Build and traverse linked lists, stacks, and queues to understand pointer-based data structures.', hours: 5, percentage: 20, items: 0 },
                    { description: 'Construct hash tables and balanced trees to enable efficient data retrieval and storage.', hours: 5, percentage: 30, items: 0 },
                    { description: 'Apply graph algorithms including breadth-first search, depth-first search, and shortest path algorithms to solve real-world problems.', hours: 4, percentage: 50, items: 0 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS315L',
        outcomes: [
            {
                co: 'CO1', description: 'Explain OS concepts including process management and memory hierarchy.', totalItems: 0,
                ilos: [
                    { description: 'Describe process states, scheduling algorithms, and context switching mechanisms used by modern operating systems.', hours: 5, percentage: 20, items: 0 },
                    { description: 'Compare paging, segmentation, and virtual memory techniques for managing memory allocation.', hours: 4, percentage: 30, items: 0 },
                    { description: 'Analyze deadlock detection, prevention, and avoidance strategies in concurrent systems.', hours: 3, percentage: 50, items: 0 }
                ]
            },
            {
                co: 'CO2', description: 'Implement concurrency and IPC mechanisms.', totalItems: 0,
                ilos: [
                    { description: 'Create multi-threaded programs using synchronization primitives such as mutexes, semaphores, and condition variables.', hours: 5, percentage: 20, items: 0 },
                    { description: 'Implement inter-process communication using pipes, message queues, and shared memory.', hours: 5, percentage: 30, items: 0 },
                    { description: 'Simulate CPU scheduling algorithms including FCFS, SJF, and Round Robin to compute average waiting and turnaround times.', hours: 4, percentage: 50, items: 0 }
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
                co: 'CO1', description: 'Apply SDLC methodologies to plan and document software projects.', totalItems: 0,
                ilos: [
                    { description: 'Gather and document functional and non-functional requirements using interviews, surveys, and use case analysis.', hours: 4, percentage: 20, items: 0 },
                    { description: 'Model system behavior using UML diagrams including use case, sequence, and class diagrams.', hours: 5, percentage: 30, items: 0 },
                    { description: 'Estimate project effort using COCOMO and planning poker techniques to produce realistic timelines.', hours: 3, percentage: 50, items: 0 }
                ]
            },
            {
                co: 'CO2', description: 'Implement and test software following agile practices.', totalItems: 0,
                ilos: [
                    { description: 'Write user stories and manage a product backlog using Agile prioritization techniques such as MoSCoW.', hours: 3, percentage: 20, items: 0 },
                    { description: 'Apply continuous integration and version control workflows using feature branches and pull requests.', hours: 5, percentage: 30, items: 0 },
                    { description: 'Design and execute unit, integration, and system tests to validate software quality at multiple levels.', hours: 4, percentage: 50, items: 0 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS331L',
        outcomes: [
            {
                co: 'CO1', description: 'Explain network architectures, protocols, and the OSI model.', totalItems: 0,
                ilos: [
                    { description: 'Describe encapsulation, addressing, and packet switching principles that enable data transmission across networks.', hours: 4, percentage: 20, items: 0 },
                    { description: 'Configure IP subnets and routing tables to segment networks and control traffic flow.', hours: 5, percentage: 30, items: 0 },
                    { description: 'Analyze TCP and UDP behavior using Wireshark captures to understand connection establishment and flow control.', hours: 3, percentage: 50, items: 0 }
                ]
            },
            {
                co: 'CO2', description: 'Design and secure small-to-medium enterprise networks.', totalItems: 0,
                ilos: [
                    { description: 'Set up VLANs, STP, and link aggregation to segment broadcast domains and improve network redundancy.', hours: 5, percentage: 20, items: 0 },
                    { description: 'Configure firewall rules and access control lists to enforce network security policies.', hours: 5, percentage: 30, items: 0 },
                    { description: 'Troubleshoot connectivity issues using ping, traceroute, and DNS lookup tools to isolate network problems.', hours: 4, percentage: 50, items: 0 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS341L',
        outcomes: [
            {
                co: 'CO1', description: 'Explain foundational AI concepts including search and knowledge representation.', totalItems: 0,
                ilos: [
                    { description: 'Compare uninformed and informed search strategies such as BFS, DFS, and A* in terms of completeness and optimality.', hours: 4, percentage: 20, items: 0 },
                    { description: 'Represent knowledge using propositional and first-order logic to encode facts and infer new conclusions.', hours: 4, percentage: 30, items: 0 },
                    { description: 'Implement constraint satisfaction problem solvers using backtracking and forward checking techniques.', hours: 4, percentage: 50, items: 0 }
                ]
            },
            {
                co: 'CO2', description: 'Apply machine learning algorithms to structured datasets.', totalItems: 0,
                ilos: [
                    { description: 'Train and evaluate supervised learning models including linear regression, decision trees, and support vector machines.', hours: 6, percentage: 20, items: 0 },
                    { description: 'Cluster unlabeled data using K-means and hierarchical clustering to discover natural groupings.', hours: 4, percentage: 30, items: 0 },
                    { description: 'Preprocess features through scaling, encoding, and dimensionality reduction to improve model performance.', hours: 4, percentage: 50, items: 0 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS351L',
        outcomes: [
            {
                co: 'CO1', description: 'Identify cybersecurity threats, vulnerabilities, and risk management frameworks.', totalItems: 0,
                ilos: [
                    { description: 'Classify common attack vectors including phishing, malware, DDoS, and man-in-the-middle attacks based on their impact.', hours: 4, percentage: 20, items: 0 },
                    { description: 'Perform risk assessments using NIST and ISO 27001 standards to identify and prioritize security risks.', hours: 4, percentage: 30, items: 0 },
                    { description: 'Apply cryptographic primitives including symmetric encryption, asymmetric encryption, and hashing to protect data.', hours: 4, percentage: 50, items: 0 }
                ]
            },
            {
                co: 'CO2', description: 'Implement security controls for network and application defence.', totalItems: 0,
                ilos: [
                    { description: 'Configure intrusion detection systems and SIEM tools to monitor network traffic and detect suspicious activity.', hours: 5, percentage: 20, items: 0 },
                    { description: 'Conduct vulnerability scans and interpret penetration test results to identify weaknesses in systems.', hours: 5, percentage: 30, items: 0 },
                    { description: 'Develop incident response playbooks and recovery procedures to guide teams through security incidents.', hours: 4, percentage: 50, items: 0 }
                ]
            }
        ]
    }
];

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

    console.log('Database seeded successfully');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
