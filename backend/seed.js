import process from 'process';
import { sequelize, Course, CourseOutcome, IloItem, TosStatus, AssessmentItem, IloAttachment } from './models/index.js';
import { structureTopics } from './topics.js';
import path from 'path';
import fsMod from 'fs';
import { seedNewCourses } from './seed_new_courses.js';
import { seedReturnedComments } from './seed_comments.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const courses = [
    { code: 'BSCS313L', name: 'Human & Computer Interaction', instructor: 'Monica Norton' },
    { code: 'BSCS212L', name: 'Web Development I', assessmentName: 'Written Exam', instructor: 'Monica Norton' },
    { code: 'BSCS111L', name: 'Fundamentals of Programming', assessmentName: 'Written Exam', instructor: 'Monica Norton' },
    { code: 'BSCS214L', name: 'Data Structures and Algorithms', assessmentName: 'Written Exam', instructor: 'Monica Norton' },
    { code: 'BSCS315L', name: 'Operating Systems', assessmentName: 'Periodic Exam', instructor: 'Rosa Diaz' },
    { code: 'BSCS321L', name: 'Database Management Systems', instructor: 'Monica Norton', learningPlanApproved: false },
    { code: 'BSCS322L', name: 'Software Engineering', assessmentName: 'Midterm Exam', instructor: 'Rosa Diaz' },
    { code: 'BSCS331L', name: 'Computer Networks', assessmentName: 'Periodic Exam', instructor: 'Terry Jeffords' },
    { code: 'BSCS341L', name: 'Artificial Intelligence', assessmentName: 'Written Exam', instructor: 'Monica Norton' },
    { code: 'BSCS351L', name: 'Cybersecurity Fundamentals', assessmentName: 'Midterm Exam', instructor: 'Rosa Diaz' }
];

const statuses = [
    { courseCode: 'BSCS313L', examPeriod: 'Midterm', status: 'draft' },
    { courseCode: 'BSCS212L', examPeriod: 'Midterm', status: 'draft' },
    { courseCode: 'BSCS111L', examPeriod: 'Midterm', status: 'draft' },
    { courseCode: 'BSCS214L', examPeriod: 'Midterm', status: 'returned', returnCount: 1, returnDates: JSON.stringify([new Date('2026-10-18').toISOString()]), submittedAt: new Date('2026-10-09'), returnedAt: new Date('2026-10-18') },
    { courseCode: 'BSCS315L', examPeriod: 'Midterm', status: 'approved', submittedAt: new Date('2026-10-09'), approvedAt: new Date('2026-10-16') },
    { courseCode: 'BSCS321L', examPeriod: 'Midterm', status: 'draft' },
    { courseCode: 'BSCS322L', examPeriod: 'Midterm', status: 'draft' },
    { courseCode: 'BSCS331L', examPeriod: 'Midterm', status: 'pending', submittedAt: new Date('2026-10-10') },
    { courseCode: 'BSCS341L', examPeriod: 'Midterm', status: 'pending', returnCount: 1, returnDates: JSON.stringify([new Date('2026-10-20').toISOString()]), submittedAt: new Date('2026-10-24'), returnedAt: new Date('2026-10-20') },
    { courseCode: 'BSCS351L', examPeriod: 'Midterm', status: 'draft' }
];const courseData = [
    {
        courseCode: 'BSCS313L',
        outcomes: [
            {
                co: 'CO1', description: `Apply core concepts, theories, and principles of Human-Computer Interaction (HCI) in proposing a User Interface (UI) design using Figma.`, totalItems: 25, topics: JSON.stringify(["Introduction to Human  Computer Interaction","Fundamentals of Human","Advanced Human Techniques","Computer Methodologies","Analyzing Human  Computer Interaction Systems","Implementing Human in Practice","Evaluating Computer Outcomes","Security and Ethics in Human  Computer Interaction","Case Studies in Human","Future Trends in Human  Computer Interaction"]),
                ilos: [
                    { description: `Analyze the relationship between cognitive psychology and human-computer interaction.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Synthesize user research data into actionable user personas and empathy maps.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Structure information architecture effectively using card sorting techniques.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Apply User-Centered Design (UCD) principles and ISO 9241-210 standards to develop a User Experience (UX) design.`, totalItems: 25, topics: JSON.stringify(["Introduction to Human  Computer Interaction","Fundamentals of Human","Advanced Human Techniques","Computer Methodologies","Analyzing Human  Computer Interaction Systems","Implementing Human in Practice","Evaluating Computer Outcomes","Security and Ethics in Human  Computer Interaction","Case Studies in Human","Future Trends in Human  Computer Interaction"]),
                ilos: [
                    { description: `Apply Nielsen's 10 Usability Heuristics to critique existing interface designs.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Create low-fidelity wireframes that solve specific user pain points.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Apply Gestalt principles and color theory to enhance UI readability.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS212L',
        outcomes: [
            {
                co: 'CO1', description: `Build responsive web pages using HTML5, CSS3, and JavaScript.`, totalItems: 25, topics: JSON.stringify(["Introduction to Web Development I","Fundamentals of Development","Advanced Development Techniques","Design Methodologies","Analyzing Web Development I Systems","Implementing Development in Practice","Evaluating Design Outcomes","Security and Ethics in Web Development I","Case Studies in Development","Future Trends in Web Development I"]),
                ilos: [
                    { description: `Construct semantic HTML5 documents that properly structure content using meaningful elements for accessibility.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Implement responsive layouts using CSS Flexbox and Grid that adapt seamlessly across desktop, tablet, and mobile viewports.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Add interactivity to web pages using DOM manipulation and event handling in JavaScript.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Develop client-side applications using modern JavaScript frameworks.`, totalItems: 25, topics: JSON.stringify(["Introduction to Web Development I","Fundamentals of Development","Advanced Development Techniques","Design Methodologies","Analyzing Web Development I Systems","Implementing Development in Practice","Evaluating Design Outcomes","Security and Ethics in Web Development I","Case Studies in Development","Future Trends in Web Development I"]),
                ilos: [
                    { description: `Manage application state using component-based architecture to build maintainable and reusable UI components.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Implement client-side routing and data fetching to create single-page applications with multiple views.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Debug and optimize front-end performance using browser developer tools and performance profiling.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS111L',
        outcomes: [
            {
                co: 'CO1', description: `Apply core programming concepts using Python to solve computational problems.`, totalItems: 25, topics: JSON.stringify(["Introduction to Fundamentals of Programming","Fundamentals of Fundamentals","Advanced Fundamentals Techniques","Programming Methodologies","Analyzing Fundamentals of Programming Systems","Implementing Fundamentals in Practice","Evaluating Programming Outcomes","Security and Ethics in Fundamentals of Programming","Case Studies in Fundamentals","Future Trends in Fundamentals of Programming"]),
                ilos: [
                    { description: `Design algorithms using sequence, selection, and iteration to break down computational problems into logical steps.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Implement functions and modular code with well-defined parameters and return values to promote code reuse.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Manipulate built-in data structures such as lists, dictionaries, and tuples to store and organize data efficiently.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Develop small-scale programs following test-driven development.`, totalItems: 25, topics: JSON.stringify(["Introduction to Fundamentals of Programming","Fundamentals of Fundamentals","Advanced Fundamentals Techniques","Programming Methodologies","Analyzing Fundamentals of Programming Systems","Implementing Fundamentals in Practice","Evaluating Programming Outcomes","Security and Ethics in Fundamentals of Programming","Case Studies in Fundamentals","Future Trends in Fundamentals of Programming"]),
                ilos: [
                    { description: `Write unit tests to verify program correctness before implementing features, following the red-green-refactor cycle.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Read from and write to files for persistent data storage between program executions.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Handle exceptions and validate user input to build robust programs that fail gracefully.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS214L',
        outcomes: [
            {
                co: 'CO1', description: `Analyze time and space complexity of algorithms.`, totalItems: 25, topics: JSON.stringify(["Introduction to Data Structures and Algorithms","Fundamentals of Data","Advanced Data Techniques","Structures Methodologies","Analyzing Data Structures and Algorithms Systems","Implementing Data in Practice","Evaluating Structures Outcomes","Security and Ethics in Data Structures and Algorithms","Case Studies in Data","Future Trends in Data Structures and Algorithms"]),
                ilos: [
                    { description: `Apply Big-O notation to analyze and classify the time efficiency of algorithms in terms of worst-case and average-case performance.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Implement common sorting and searching algorithms including quicksort, mergesort, and binary search.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Compare recursive and iterative approaches to problem solving, identifying when each strategy is more appropriate.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Implement fundamental data structures and their operations.`, totalItems: 25, topics: JSON.stringify(["Introduction to Data Structures and Algorithms","Fundamentals of Data","Advanced Data Techniques","Structures Methodologies","Analyzing Data Structures and Algorithms Systems","Implementing Data in Practice","Evaluating Structures Outcomes","Security and Ethics in Data Structures and Algorithms","Case Studies in Data","Future Trends in Data Structures and Algorithms"]),
                ilos: [
                    { description: `Build and traverse linked lists, stacks, and queues to understand pointer-based data structures.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Construct hash tables and balanced trees to enable efficient data retrieval and storage.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Apply graph algorithms including breadth-first search, depth-first search, and shortest path algorithms to solve real-world problems.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS315L',
        outcomes: [
            {
                co: 'CO1', description: `Explain OS concepts including process management and memory hierarchy.`, totalItems: 25, topics: JSON.stringify(["Introduction to Operating Systems","Fundamentals of Operating","Advanced Operating Techniques","Systems Methodologies","Analyzing Operating Systems Systems","Implementing Operating in Practice","Evaluating Systems Outcomes","Security and Ethics in Operating Systems","Case Studies in Operating","Future Trends in Operating Systems"]),
                ilos: [
                    { description: `Describe process states, scheduling algorithms, and context switching mechanisms used by modern operating systems.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Compare paging, segmentation, and virtual memory techniques for managing memory allocation.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Analyze deadlock detection, prevention, and avoidance strategies in concurrent systems.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Implement concurrency and IPC mechanisms.`, totalItems: 25, topics: JSON.stringify(["Introduction to Operating Systems","Fundamentals of Operating","Advanced Operating Techniques","Systems Methodologies","Analyzing Operating Systems Systems","Implementing Operating in Practice","Evaluating Systems Outcomes","Security and Ethics in Operating Systems","Case Studies in Operating","Future Trends in Operating Systems"]),
                ilos: [
                    { description: `Create multi-threaded programs using synchronization primitives such as mutexes, semaphores, and condition variables.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Implement inter-process communication using pipes, message queues, and shared memory.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Simulate CPU scheduling algorithms including FCFS, SJF, and Round Robin to compute average waiting and turnaround times.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS321L',
        outcomes: [
            {
                co: 'CO1', description: `Design relational database schemas using normalization and ER modeling.`, totalItems: 25, topics: JSON.stringify(["Introduction to Database Management Systems","Fundamentals of Database","Advanced Database Techniques","Management Methodologies","Analyzing Database Management Systems Systems","Implementing Database in Practice","Evaluating Management Outcomes","Security and Ethics in Database Management Systems","Case Studies in Database","Future Trends in Database Management Systems"]),
                ilos: [
                    { description: `Create entity-relationship diagrams that accurately capture entities, attributes, and relationships for a given domain.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Normalize tables up to Third Normal Form and Boyce-Codd Normal Form to eliminate data redundancy.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Write complex SQL queries involving joins, subqueries, and aggregate functions to retrieve and analyze data.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Implement database transactions, indexing, and security.`, totalItems: 25, topics: JSON.stringify(["Introduction to Database Management Systems","Fundamentals of Database","Advanced Database Techniques","Management Methodologies","Analyzing Database Management Systems Systems","Implementing Database in Practice","Evaluating Management Outcomes","Security and Ethics in Database Management Systems","Case Studies in Database","Future Trends in Database Management Systems"]),
                ilos: [
                    { description: `Manage transactions with ACID properties and appropriate isolation levels to ensure data consistency.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Optimize query performance using indexes, execution plan analysis, and query restructuring.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Configure user roles, permissions, and backup strategies to protect database security and availability.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS322L',
        outcomes: [
            {
                co: 'CO1', description: `Apply SDLC methodologies to plan and document software projects.`, totalItems: 25, topics: JSON.stringify(["Introduction to Software Engineering","Fundamentals of Software","Advanced Software Techniques","Engineering Methodologies","Analyzing Software Engineering Systems","Implementing Software in Practice","Evaluating Engineering Outcomes","Security and Ethics in Software Engineering","Case Studies in Software","Future Trends in Software Engineering"]),
                ilos: [
                    { description: `Gather and document functional and non-functional requirements using interviews, surveys, and use case analysis.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Model system behavior using UML diagrams including use case, sequence, and class diagrams.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Estimate project effort using COCOMO and planning poker techniques to produce realistic timelines.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Implement and test software following agile practices.`, totalItems: 25, topics: JSON.stringify(["Introduction to Software Engineering","Fundamentals of Software","Advanced Software Techniques","Engineering Methodologies","Analyzing Software Engineering Systems","Implementing Software in Practice","Evaluating Engineering Outcomes","Security and Ethics in Software Engineering","Case Studies in Software","Future Trends in Software Engineering"]),
                ilos: [
                    { description: `Write user stories and manage a product backlog using Agile prioritization techniques such as MoSCoW.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Apply continuous integration and version control workflows using feature branches and pull requests.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Design and execute unit, integration, and system tests to validate software quality at multiple levels.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS331L',
        outcomes: [
            {
                co: 'CO1', description: `Explain network architectures, protocols, and the OSI model.`, totalItems: 25, topics: JSON.stringify(["Introduction to Computer Networks","Fundamentals of Computer","Advanced Computer Techniques","Networks Methodologies","Analyzing Computer Networks Systems","Implementing Computer in Practice","Evaluating Networks Outcomes","Security and Ethics in Computer Networks","Case Studies in Computer","Future Trends in Computer Networks"]),
                ilos: [
                    { description: `Describe encapsulation, addressing, and packet switching principles that enable data transmission across networks.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Configure IP subnets and routing tables to segment networks and control traffic flow.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Analyze TCP and UDP behavior using Wireshark captures to understand connection establishment and flow control.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Design and secure small-to-medium enterprise networks.`, totalItems: 25, topics: JSON.stringify(["Introduction to Computer Networks","Fundamentals of Computer","Advanced Computer Techniques","Networks Methodologies","Analyzing Computer Networks Systems","Implementing Computer in Practice","Evaluating Networks Outcomes","Security and Ethics in Computer Networks","Case Studies in Computer","Future Trends in Computer Networks"]),
                ilos: [
                    { description: `Set up VLANs, STP, and link aggregation to segment broadcast domains and improve network redundancy.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Configure firewall rules and access control lists to enforce network security policies.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Troubleshoot connectivity issues using ping, traceroute, and DNS lookup tools to isolate network problems.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS341L',
        outcomes: [
            {
                co: 'CO1', description: `Explain foundational AI concepts including search and knowledge representation.`, totalItems: 25, topics: JSON.stringify(["Introduction to Artificial Intelligence","Fundamentals of Artificial","Advanced Artificial Techniques","Intelligence Methodologies","Analyzing Artificial Intelligence Systems","Implementing Artificial in Practice","Evaluating Intelligence Outcomes","Security and Ethics in Artificial Intelligence","Case Studies in Artificial","Future Trends in Artificial Intelligence"]),
                ilos: [
                    { description: `Compare uninformed and informed search strategies such as BFS, DFS, and A* in terms of completeness and optimality.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Represent knowledge using propositional and first-order logic to encode facts and infer new conclusions.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Implement constraint satisfaction problem solvers using backtracking and forward checking techniques.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Apply machine learning algorithms to structured datasets.`, totalItems: 25, topics: JSON.stringify(["Introduction to Artificial Intelligence","Fundamentals of Artificial","Advanced Artificial Techniques","Intelligence Methodologies","Analyzing Artificial Intelligence Systems","Implementing Artificial in Practice","Evaluating Intelligence Outcomes","Security and Ethics in Artificial Intelligence","Case Studies in Artificial","Future Trends in Artificial Intelligence"]),
                ilos: [
                    { description: `Train and evaluate supervised learning models including linear regression, decision trees, and support vector machines.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Cluster unlabeled data using K-means and hierarchical clustering to discover natural groupings.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Preprocess features through scaling, encoding, and dimensionality reduction to improve model performance.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    },
    {
        courseCode: 'BSCS351L',
        outcomes: [
            {
                co: 'CO1', description: `Identify cybersecurity threats, vulnerabilities, and risk management frameworks.`, totalItems: 25, topics: JSON.stringify(["Introduction to Cybersecurity Fundamentals","Fundamentals of Cybersecurity","Advanced Cybersecurity Techniques","Fundamentals Methodologies","Analyzing Cybersecurity Fundamentals Systems","Implementing Cybersecurity in Practice","Evaluating Fundamentals Outcomes","Security and Ethics in Cybersecurity Fundamentals","Case Studies in Cybersecurity","Future Trends in Cybersecurity Fundamentals"]),
                ilos: [
                    { description: `Classify common attack vectors including phishing, malware, DDoS, and man-in-the-middle attacks based on their impact.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Perform risk assessments using NIST and ISO 27001 standards to identify and prioritize security risks.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Apply cryptographic primitives including symmetric encryption, asymmetric encryption, and hashing to protect data.`, hours: 10, percentage: 50, items: 16 }
                ]
            },
            {
                co: 'CO2', description: `Implement security controls for network and application defence.`, totalItems: 25, topics: JSON.stringify(["Introduction to Cybersecurity Fundamentals","Fundamentals of Cybersecurity","Advanced Cybersecurity Techniques","Fundamentals Methodologies","Analyzing Cybersecurity Fundamentals Systems","Implementing Cybersecurity in Practice","Evaluating Fundamentals Outcomes","Security and Ethics in Cybersecurity Fundamentals","Case Studies in Cybersecurity","Future Trends in Cybersecurity Fundamentals"]),
                ilos: [
                    { description: `Configure intrusion detection systems and SIEM tools to monitor network traffic and detect suspicious activity.`, hours: 4, percentage: 20, items: 3 },
                    { description: `Conduct vulnerability scans and interpret penetration test results to identify weaknesses in systems.`, hours: 6, percentage: 30, items: 6 },
                    { description: `Develop incident response playbooks and recovery procedures to guide teams through security incidents.`, hours: 10, percentage: 50, items: 16 }
                ]
            }
        ]
    }
];

// Detailed, domain-specific assessment tools per course, outcome, and ILO
export const ASSESSMENT_TOOLS = {
    BSCS313L: {
        CO1: ['Objective-Type Assessment', 'Persona & Empathy Map Rubric', 'Card Sorting & IA Design Rubric'],
        CO2: ['Heuristic Evaluation Rubric', 'Low-Fidelity Wireframing Rubric', 'UI Prototype & Visual Design Rubric']
    },
    BSCS212L: {
        CO1: ['Objective-Type Assessment', 'Responsive Layout Lab Exam', 'DOM Manipulation Practical Exam'],
        CO2: ['Component Architecture Rubric', 'SPA Routing & Fetching Lab', 'Performance Profiling Exercise']
    },
    BSCS111L: {
        CO1: ['Written Logic & Flowchart Exam', 'Modular Programming Practical', 'Data Structures Coding Task'],
        CO2: ['TDD Unit Testing Lab', 'File I/O Programming Exercise', 'Exception Handling Practical Exam']
    },
    BSCS214L: {
        CO1: ['Objective-Type Written Exam', 'Algorithm Implementation Lab', 'Complexity Analysis Problem Set'],
        CO2: ['Pointer Manipulation Practical', 'Balanced Trees Coding Task', 'Graph Algorithms Lab Exam']
    },
    BSCS315L: {
        CO1: ['Objective-Type Assessment', 'Memory Management Problem Set', 'Deadlock Analysis Case Study'],
        CO2: ['Multithreading & Concurrency Lab', 'IPC Socket/Pipe Programming', 'CPU Scheduling Simulation Task']
    },
    BSCS321L: {
        CO1: ['ER Diagram Design Rubric', 'Schema Normalization Exercise', 'Complex SQL Query Exam'],
        CO2: ['Transaction & ACID Practical', 'Index Optimization Lab Task', 'Database Security Configuration Rubric']
    },
    BSCS322L: {
        CO1: ['Requirements Specification Rubric', 'UML Modeling Design Task', 'Effort Estimation Worksheet'],
        CO2: ['Agile Backlog & Sprint Plan', 'CI/CD Pipeline Configuration Lab', 'Test Suite Execution Rubric']
    },
    BSCS331L: {
        CO1: ['Protocol Analysis Written Exam', 'Subnetting & Addressing Worksheet', 'Wireshark Packet Analysis Lab'],
        CO2: ['VLAN & Switching Configuration', 'Firewall & ACL Lab Exam', 'Network Troubleshooting Practical']
    },
    BSCS341L: {
        CO1: ['Search Algorithms Written Exam', 'First-Order Logic Problem Set', 'CSP Solver Programming Lab'],
        CO2: ['Supervised Learning Practical', 'Clustering Analysis Lab Exam', 'Data Preprocessing Pipeline Rubric']
    },
    BSCS351L: {
        CO1: ['Threat Modeling Written Exam', 'NIST Risk Assessment Report', 'Cryptographic Protocol Lab'],
        CO2: ['IDS/SIEM Configuration Lab', 'Vulnerability Assessment Report', 'Incident Response Playbook Rubric']
    },
    BSCS221L: {
        CO1: ['OOP Concepts Written Exam', 'Encapsulation & Modular Design Lab', 'Design Patterns Coding Project'],
        CO2: ['Exception Handling Practical', 'Collections & Streams Coding Task', 'File I/O Stream Programming Lab']
    },
    BSCS222L: {
        CO1: ['Objective-Type Written Exam', 'Truth Tables & Set Relations Worksheet', 'Mathematical Proof Construction'],
        CO2: ['Graph Theory Problem Set', 'Combinatorics Application Problems', 'Graph Coloring Optimization Task']
    },
    BSCS312L: {
        CO1: ['Database Design Written Exam', 'Advanced SQL & Window Functions Lab', 'Stored Procedures & Triggers Practical'],
        CO2: ['Concurrency Control Lab Task', 'Query Optimization Exercise', 'Role-Based Access Control Rubric']
    },
    BSCS324L: {
        CO1: ['Agile & Scrum Written Exam', 'Microservices Architecture Rubric', 'Static Analysis & Code Quality Review'],
        CO2: ['CI/CD Automated Deployment Lab', 'Docker Containerization Practical', 'Infrastructure-as-Code Terraform Task']
    },
    BSCS342L: {
        CO1: ['Data Preprocessing Lab Exam', 'Supervised Model Training Practical', 'Unsupervised Clustering Task'],
        CO2: ['Cross-Validation & Metrics Lab', 'Hyperparameter Tuning Task', 'Ensemble & Regularization Exercise'],
        CO3: ['Model Evaluation Problem Set', 'Grid Search Lab Task'],
        CO4: ['Model REST API Packaging Lab', 'Model Monitoring Dashboard Rubric']
    },
    BSCS223L: {
        CO1: ['React Component Architecture Lab', 'REST API Backend Implementation', 'JWT/OAuth Authentication Practical'],
        CO2: ['Cloud Deployment Practical Exam', 'Observability & Logging Task', 'Feature Flag Rollout Plan']
    },
    BSCS314L: {
        CO1: ['Signal Modulation Written Exam', 'Multiplexing Analysis Worksheet', 'Error Detection & CRC Problem Set'],
        CO2: ['IP Subnetting Configuration Lab', 'OSPF & BGP Routing Practical', 'Wireshark Diagnostic Exam']
    },
    BSCS323L: {
        CO1: ['Requirements Elicitation Rubric', 'UML Process Modeling Task', 'Traceability Matrix Review'],
        CO2: ['System Architecture Rubric', 'Technical Specification Document', 'ATAM Architecture Evaluation']
    },
    BSCS332L: {
        CO1: ['Network Threat Written Exam', 'Cryptographic Ciphers Lab Task', 'PKI & Digital Certificates Practical'],
        CO2: ['Firewall Rules Configuration Lab', 'Snort IDS/IPS Tuning Practical', 'IPsec & TLS VPN Deployment Rubric']
    },
    BSCS413L: {
        CO1: ['Project Charter & Scope Document', 'WBS & Risk Register Rubric', 'Agile Sprint Review & Defense'],
        CO2: ['Full-Stack Implementation Rubric', 'Technical System Documentation', 'Final Oral Presentation & Defense']
    }
};

export function getAssessmentTool(courseCode, co, iloIdx) {
    const courseMap = ASSESSMENT_TOOLS[courseCode];
    if (courseMap && courseMap[co] && courseMap[co][iloIdx]) {
        return courseMap[co][iloIdx];
    }
    return (iloIdx + 1) % 2 === 1 ? 'Objective-Type Assessment' : 'Performance Task Rubric';
}

export function getAttachmentDisplayFilename(courseCode, co, iloIdx, type) {
    if (type === 'objective') {
        return iloIdx === 0
            ? `${courseCode}_Midterm_Exam_PartA.pdf`
            : `${courseCode}_Midterm_Exam_PartB.pdf`;
    }
    return `${courseCode}_Project_Rubric.pdf`;
}

export function getAttachmentSize(courseCode, co, iloIdx, type) {
    const base = type === 'objective' ? (iloIdx === 0 ? 185 * 1024 : 260 * 1024) : 420 * 1024;
    const seedVal = (courseCode.charCodeAt(4) || 65) * 19 + (co.charCodeAt(2) || 1) * 37 + iloIdx * 83;
    const offset = ((seedVal % 15) * 16 + (seedVal % 7) * 4) * 1024;
    return base + offset;
}

export function getPointRowInstructions(courseCode, co, iloIdx) {
    const RETURNED_COURSES = ['BSCS214L', 'BSCS222L', 'BSCS324L', 'BSCS341L'];
    if (RETURNED_COURSES.includes(courseCode)) {
        return { ref1: 'Items 1-5', ref2: 'Part II' };
    }

    const INSTRUCTION_VARIANTS = {
        BSCS313L: [
            { ref1: 'Test I: Multiple Choice (Q1–Q3)', ref2: 'Test II: Conceptual Identification' },
            { ref1: 'Rubric Criterion 1: Persona Quality', ref2: 'Rubric Criterion 2: Empathy Mapping' },
            { ref1: 'Test III: Usability Critique', ref2: 'Test IV: UI Prototype Design' }
        ],
        BSCS212L: [
            { ref1: 'Test I: HTML5 Semantics (Q1–Q3)', ref2: 'Test II: Code Snippet Analysis' },
            { ref1: 'Lab Task 1: Responsive Layout Grid', ref2: 'Lab Task 2: Flexbox Media Queries' },
            { ref1: 'Test III: DOM Event Handling', ref2: 'Test IV: SPA Client Routing' }
        ],
        BSCS111L: [
            { ref1: 'Test I: Syntax & Logic (Q1–Q3)', ref2: 'Test II: Flowchart Interpretation' },
            { ref1: 'Lab Task 1: Modular Function', ref2: 'Lab Task 2: Parameter Passing' },
            { ref1: 'Test III: Code Refactoring', ref2: 'Test IV: Exception Handling Design' }
        ],
        BSCS315L: [
            { ref1: 'Test I: OS Concepts (Q1–Q3)', ref2: 'Test II: State Diagram Analysis' },
            { ref1: 'Lab Task 1: Mutex Synchronization', ref2: 'Lab Task 2: Deadlock Detection' },
            { ref1: 'Test III: Paging & Virtual Memory', ref2: 'Test IV: Kernel Architecture' }
        ],
        BSCS321L: [
            { ref1: 'Test I: Relational Model (Q1–Q3)', ref2: 'Test II: ER Model Evaluation' },
            { ref1: 'Lab Task 1: Normalization to BCNF', ref2: 'Lab Task 2: Complex Join Queries' },
            { ref1: 'Test III: Query Plan Optimization', ref2: 'Test IV: Transaction ACID Guard' }
        ],
        BSCS322L: [
            { ref1: 'Test I: SDLC Terminology (Q1–Q3)', ref2: 'Test II: Requirements Elicitation' },
            { ref1: 'Rubric Criterion 1: UML Sequence', ref2: 'Rubric Criterion 2: Use Case Specs' },
            { ref1: 'Test III: Design Pattern Assessment', ref2: 'Test IV: Architecture Proposal' }
        ],
        BSCS331L: [
            { ref1: 'Test I: OSI & TCP/IP Model (Q1–Q3)', ref2: 'Test II: Protocol Header Analysis' },
            { ref1: 'Lab Task 1: Subnetting Calculation', ref2: 'Lab Task 2: Route Table Config' },
            { ref1: 'Test III: Packet Trace Evaluation', ref2: 'Test IV: Network Redundancy Plan' }
        ],
        BSCS351L: [
            { ref1: 'Test I: Threat Vectors (Q1–Q3)', ref2: 'Test II: Vulnerability Classification' },
            { ref1: 'Lab Task 1: NIST Framework Mapping', ref2: 'Lab Task 2: Cryptographic Cipher Lab' },
            { ref1: 'Test III: Vulnerability Severity', ref2: 'Test IV: Security Playbook Design' }
        ],
        BSCS221L: [
            { ref1: 'Test I: OOP Core Principles (Q1–Q3)', ref2: 'Test II: Inheritance Hierarchy' },
            { ref1: 'Lab Task 1: Interface Abstraction', ref2: 'Lab Task 2: Design Pattern Coding' },
            { ref1: 'Test III: Collections & Stream API', ref2: 'Test IV: Concurrent Java Program' }
        ],
        BSCS312L: [
            { ref1: 'Test I: Schema Design Concepts', ref2: 'Test II: Relational Algebra' },
            { ref1: 'Lab Task 1: Window Functions & CTE', ref2: 'Lab Task 2: Trigger & Stored Proc' },
            { ref1: 'Test III: Index Strategy Review', ref2: 'Test IV: Security Role Definition' }
        ],
        BSCS342L: [
            { ref1: 'Test I: ML Foundations (Q1–Q3)', ref2: 'Test II: Bias-Variance Tradeoff' },
            { ref1: 'Lab Task 1: Cross-Validation Split', ref2: 'Lab Task 2: Hyperparameter Tuning' },
            { ref1: 'Test III: Model Metrics Analysis', ref2: 'Test IV: End-to-End Pipeline' }
        ],
        BSCS223L: [
            { ref1: 'Test I: React Hooks & State', ref2: 'Test II: Context API Evaluation' },
            { ref1: 'Lab Task 1: REST Endpoint Creation', ref2: 'Lab Task 2: JWT Auth Middleware' },
            { ref1: 'Test III: Performance Audit', ref2: 'Test IV: Cloud Deployment Arch' }
        ],
        BSCS314L: [
            { ref1: 'Test I: Signal Modulation (Q1–Q3)', ref2: 'Test II: Multiplexing Comparison' },
            { ref1: 'Lab Task 1: CRC Polynomial Check', ref2: 'Lab Task 2: Hamming Code Trace' },
            { ref1: 'Test III: Protocol Efficiency', ref2: 'Test IV: Transmission Topology' }
        ],
        BSCS323L: [
            { ref1: 'Test I: Systems Analysis Concepts', ref2: 'Test II: Use Case Validation' },
            { ref1: 'Rubric Criterion 1: Activity Model', ref2: 'Rubric Criterion 2: Process Specs' },
            { ref1: 'Test III: Architecture Tradeoffs', ref2: 'Test IV: Technical Contract Design' }
        ],
        BSCS332L: [
            { ref1: 'Test I: Cryptography Principles', ref2: 'Test II: Attack Surface Analysis' },
            { ref1: 'Lab Task 1: Firewall Rule Defense', ref2: 'Lab Task 2: Snort Rule Tuning' },
            { ref1: 'Test III: PenTest Report Critique', ref2: 'Test IV: Zero-Trust Network Design' }
        ],
        BSCS413L: [
            { ref1: 'Milestone 1: Project Charter', ref2: 'Milestone 2: Stakeholder Agreement' },
            { ref1: 'Sprint Review 1: Backlog Delivery', ref2: 'Sprint Review 2: Velocity Tracking' },
            { ref1: 'Final Defense: Architecture Specs', ref2: 'Final Defense: Technical Demo' }
        ]
    };

    const courseList = INSTRUCTION_VARIANTS[courseCode];
    if (courseList && courseList[iloIdx]) {
        return courseList[iloIdx];
    }
    return {
        ref1: `Test I (Q1–Q${iloIdx + 3})`,
        ref2: `Test II: Problem Solving`
    };
}

export async function createItemsForCourse(courseCode) {
    const statusRow = await TosStatus.findOne({ where: { courseCode, examPeriod: 'Midterm' } });
    const isDraft = !statusRow || statusRow.status === 'draft';
    if (isDraft && courseCode !== 'BSCS313L') return;

    const outcomeRows = await CourseOutcome.findAll({
        where: { courseCode, co: ['CO1', 'CO2'] },
        include: [{ model: IloItem, as: 'ilos' }],
        order: [['co', 'ASC']]
    });

    const getCognitiveLevelsForIlo = (iloIdx) => {
        if (iloIdx === 0) return ['Remembering', 'Understanding'];
        if (iloIdx === 1) return ['Applying', 'Analyzing'];
        return ['Evaluating', 'Creating'];
    };

    const uploadDir = path.join(__dirname, 'uploads');
    if (!fsMod.existsSync(uploadDir)) fsMod.mkdirSync(uploadDir, { recursive: true });

    const createPdf = (filename, content) => {
        const filepath = path.join(uploadDir, filename);
        if (!fsMod.existsSync(filepath)) {
            const pdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 50 700 Td (${content}) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \n0000000293 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n388\n%%EOF`;
            fsMod.writeFileSync(filepath, pdf);
        }
    };

    for (const o of outcomeRows) {
        for (let iloIdx = 0; iloIdx < (o.ilos || []).length; iloIdx++) {
            const ilo = o.ilos[iloIdx];
            const target = ilo.items || 0;
            if (target === 0) continue;

            const levels = getCognitiveLevelsForIlo(iloIdx);
            let pts1, pts2;
            if (o.co === 'CO1') {
                if (iloIdx === 0) { pts1 = 1; pts2 = 2; }
                else if (iloIdx === 1) { pts1 = 3; pts2 = 3; }
                else { pts1 = 8; pts2 = 8; }
            } else {
                if (iloIdx === 0) { pts1 = 2; pts2 = 1; }
                else if (iloIdx === 1) { pts1 = 3; pts2 = 3; }
                else { pts1 = 7; pts2 = 9; }
            }
            const { ref1, ref2 } = getPointRowInstructions(courseCode, o.co, iloIdx);
            const rowsToCreate = [];
            if (pts1 > 0) rowsToCreate.push({ points: pts1, cognitiveLevel: levels[0], ref: ref1 });
            if (pts2 > 0) rowsToCreate.push({ points: pts2, cognitiveLevel: levels[1], ref: ref2 });

            const type = iloIdx % 2 === 0 ? 'objective' : 'non-objective';
            const filename = `${courseCode}_${o.co}_ILO${iloIdx+1}_${type}.pdf`;
            const displayFilename = getAttachmentDisplayFilename(courseCode, o.co, iloIdx, type);
            const fileSize = getAttachmentSize(courseCode, o.co, iloIdx, type);
            
            createPdf(filename, `Sample ${type} assessment for ${courseCode}`);

            const att = await IloAttachment.create({
                courseCode: courseCode,
                examPeriod: 'Midterm',
                iloId: ilo.id,
                filename: displayFilename,
                filepath: filename,
                type,
                size: fileSize
            });

            for (const row of rowsToCreate) {
                await AssessmentItem.create({
                    courseCode: courseCode,
                    examPeriod: 'Midterm',
                    iloId: ilo.id,
                    attachmentId: att.id,
                    instruction: row.ref,
                    points: row.points,
                    span: row.points,
                    cognitiveLevel: row.cognitiveLevel
                });
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
                courseCode: data.courseCode,
                topics: structureTopics(outcome.topics)
            });
            if (outcome.ilos && outcome.ilos.length) {
                await IloItem.bulkCreate(
                    outcome.ilos.map((ilo, idx) => ({
                        ...ilo,
                        coId: created.id,
                        assessmentTool: getAssessmentTool(data.courseCode, outcome.co, idx)
                    }))
                );
            }
        }
    }

    for (const data of courseData) {
        await createItemsForCourse(data.courseCode);
    }
    
    await seedNewCourses();
    
    await seedReturnedComments();
}

export { seed, courses, statuses, courseData };

seed().catch(err => { console.error(err); process.exit(1); }).then(() => { console.log('Seed completed successfully'); process.exit(0); });



