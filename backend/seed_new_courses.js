import { Course, CourseOutcome, IloItem, TosStatus, AssessmentItem } from './models/index.js';
import { createItemsForCourse } from './seed.js';
import { structureTopics } from './topics.js';

const newCourses = [
    { code: 'BSCS221L', name: 'Object-Oriented Programming',        status: 'pending',  assessmentName: 'Practical Exam', instructor: 'NORTON, MONICA', learningPlanApproved: true, examPeriod: 'Midterm' },
    { code: 'BSCS222L', name: 'Discrete Structures 2',              status: 'returned', assessmentName: 'Written Exam',  instructor: 'NORTON, MONICA', learningPlanApproved: false, examPeriod: 'Midterm' },
    { code: 'BSCS312L', name: 'Information Management',             status: 'pending',  assessmentName: 'Midterm Exam',  instructor: 'DIAZ, ROSA', learningPlanApproved: true, examPeriod: 'Midterm' },
    { code: 'BSCS324L', name: 'Advanced Software Engineering',       status: 'returned', assessmentName: 'Periodic Exam', instructor: 'DIAZ, ROSA', learningPlanApproved: true, examPeriod: 'Midterm' },
    { code: 'BSCS342L', name: 'Machine Learning Fundamentals',       status: 'pending',  assessmentName: 'Practical Exam', instructor: 'NORTON, MONICA', learningPlanApproved: true, examPeriod: 'Midterm' },
    { code: 'BSCS223L', name: 'Web Development II',                 status: 'approved', assessmentName: 'Midterm Exam',  instructor: 'NORTON, MONICA', learningPlanApproved: true, examPeriod: 'Midterm' },
    { code: 'BSCS314L', name: 'Data Communications',                status: 'approved', assessmentName: 'Written Exam',  instructor: 'NORTON, MONICA', learningPlanApproved: true, examPeriod: 'Midterm' },
    { code: 'BSCS323L', name: 'Systems Analysis and Design',        status: 'approved', assessmentName: 'Periodic Exam', instructor: 'NORTON, MONICA', learningPlanApproved: true, examPeriod: 'Midterm' },
    { code: 'BSCS332L', name: 'Network Security',                   status: 'approved', assessmentName: 'Practical Exam', instructor: 'DIAZ, ROSA', learningPlanApproved: true, examPeriod: 'Midterm' },
    { code: 'BSCS413L', name: 'Capstone Project 2',                 status: 'approved', assessmentName: 'Project',        instructor: 'JEFFORDS, TERRY', learningPlanApproved: true, examPeriod: 'Midterm' },
];

const courseData = [
    {
        courseCode: 'BSCS221L',
        outcomes: [
            {
                co: 'CO1', description: `Apply object-oriented programming principles using Java to build modular software components.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Model real-world entities using classes, objects, inheritance, and polymorphism in Java.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Implement encapsulation and abstraction using access modifiers and interfaces to enforce modular design.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Apply design patterns such as Singleton, Factory, and Observer to solve recurring design problems.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Develop robust Java applications using exception handling, collections, and I/O streams.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Handle checked and unchecked exceptions using try-catch-finally and custom exception classes.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Manipulate data using the Java Collections Framework including List, Set, Map, and Stream API.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Perform file I/O operations using byte and character streams, serialization, and NIO APIs.`, hours: 6, percentage: 50, items: 16 }
                  ]
            }
        ]
    },
    {
        courseCode: 'BSCS222L',
        outcomes: [
            {
                co: 'CO1', description: `Apply set theory, logic, and proof techniques to solve discrete mathematics problems.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Apply propositional and predicate logic to evaluate the validity of logical arguments using truth tables and inference rules.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Demonstrate set operations, relations, and functions to model relationships between discrete elements.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Construct mathematical proofs using direct proof, proof by contradiction, and mathematical induction.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Apply graph theory and combinatorics to analyze networks and counting problems.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Model problems using graph structures including directed, undirected, weighted, and bipartite graphs.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Apply combinatorial principles including permutations, combinations, and the pigeonhole principle to solve counting problems.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Analyze graph properties such as connectivity, planarity, and coloring to solve optimization problems.`, hours: 6, percentage: 50, items: 16 }
                  ]
            }
        ]
    },
    {
        courseCode: 'BSCS312L',
        outcomes: [
            {
                co: 'CO1', description: `Design and implement relational databases using SQL and normalization techniques.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Construct normalized database schemas up to BCNF by identifying functional dependencies and eliminating data redundancy.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Write complex SQL queries involving joins, subqueries, CTEs, and window functions for data retrieval and analysis.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Implement stored procedures, triggers, and views to encapsulate business logic at the database level.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Manage database transactions, concurrency, and security in multi-user environments.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Manage transactions with appropriate isolation levels to ensure ACID properties while balancing concurrency.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Implement indexing strategies and query optimization techniques to improve database performance.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Configure user authentication, role-based access control, and auditing to protect database security.`, hours: 6, percentage: 50, items: 16 }
                  ]
            }
        ]
    },
    {
        courseCode: 'BSCS324L',
        outcomes: [
            {
                co: 'CO1', description: `Apply advanced software engineering methodologies to manage complex software projects.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Apply Agile and Scrum methodologies to plan, track, and deliver software increments using sprint planning and retrospectives.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Design software architectures using microservices, event-driven, and domain-driven design patterns.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Conduct code reviews, static analysis, and technical debt assessment to maintain software quality.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Implement DevOps practices including CI/CD, containerization, and infrastructure as code.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Set up continuous integration and deployment pipelines using tools like Jenkins, GitHub Actions, or GitLab CI.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Containerize applications using Docker and orchestrate multi-service deployments with Kubernetes.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Implement infrastructure as code using Terraform or Ansible to automate environment provisioning.`, hours: 6, percentage: 50, items: 16 }
                  ]
            }
        ]
    },
    {
        courseCode: 'BSCS342L',
        outcomes: [
            {
                co: 'CO1', description: `Apply supervised and unsupervised machine learning algorithms to solve prediction and clustering problems.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Prepare and preprocess datasets by handling missing values, encoding categorical variables, and feature scaling.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Implement regression and classification models using linear regression, decision trees, and support vector machines.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Apply clustering algorithms including K-Means, DBSCAN, and hierarchical clustering to discover patterns in unlabeled data.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Evaluate and optimize machine learning models using validation techniques and performance metrics.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Split datasets using cross-validation and evaluate model performance using accuracy, precision, recall, F1, and AUC-ROC.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Apply hyperparameter tuning using grid search and random search to optimize model performance.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Detect and mitigate overfitting using regularization, dropout, and ensemble methods like Random Forest and Gradient Boosting.`, hours: 6, percentage: 50, items: 16 }
                  ]
            },
            {
                co: 'CO3', description: `Evaluate machine learning models using appropriate metrics.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Compute evaluation metrics for classification and regression tasks.`, hours: 5, percentage: 50, items: 13 },
                    { description: `Optimize hyperparameters using grid search and random search.`, hours: 5, percentage: 50, items: 12 }
                  ]
            },
            {
                co: 'CO4', description: `Deploy machine learning models to production.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Wrap models in REST APIs for production use.`, hours: 5, percentage: 50, items: 13 },
                    { description: `Monitor deployed models for data drift and degradation.`, hours: 5, percentage: 50, items: 12 }
                  ]
            }
        ]
    },
    {
        courseCode: 'BSCS223L',
        outcomes: [
            {
                co: 'CO1', description: `Build full-stack web applications using modern front-end frameworks and back-end APIs.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Develop responsive user interfaces using React with hooks, context API, and state management libraries.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Design and implement RESTful APIs using Node.js, Express, and middleware for request processing.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Integrate authentication and authorization using JWT, OAuth, and session management for secure web applications.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Deploy and maintain web applications using cloud services and modern deployment strategies.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Deploy web applications to cloud platforms such as AWS, Azure, or Firebase using PaaS and serverless architectures.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Set up monitoring, logging, and alerting using tools like Prometheus, Grafana, and the ELK stack.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Implement A/B testing, canary releases, and feature flags to enable safe and gradual rollouts.`, hours: 6, percentage: 50, items: 16 }
                  ]
            }
        ]
    },
    {
        courseCode: 'BSCS314L',
        outcomes: [
            {
                co: 'CO1', description: `Analyze data communication principles including signal transmission, modulation, and multiplexing.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Compare analog and digital signal transmission methods including amplitude, frequency, and phase modulation.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Analyze multiplexing techniques including FDM, TDM, and CDMA for efficient bandwidth utilization.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Evaluate error detection and correction methods including parity checks, CRC, and Hamming codes for reliable data transmission.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Design and configure computer networks using routing, switching, and network protocols.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Configure IP addressing, subnetting, and VLANs to design scalable and segmented network topologies.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Implement routing protocols including OSPF and BGP to enable dynamic packet forwarding between networks.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Troubleshoot network issues using packet analysis tools like Wireshark and diagnostic commands to identify performance bottlenecks.`, hours: 6, percentage: 50, items: 16 }
                  ]
            }
        ]
    },
    {
        courseCode: 'BSCS323L',
        outcomes: [
            {
                co: 'CO1', description: `Analyze and document business requirements using structured and object-oriented analysis techniques.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Elicit and document functional and non-functional requirements using interviews, surveys, and workshops.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Model system processes using UML diagrams including use case, activity, sequence, and state machine diagrams.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Validate requirements through prototyping, reviews, and traceability matrices to ensure completeness and consistency.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Design system architectures and create technical specifications for software solutions.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Design layered, client-server, and microservices architectures that address quality attributes such as scalability and security.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Create detailed technical specifications including API contracts, database schemas, and component interfaces.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Evaluate architectural trade-offs using ATAM or similar methods to make informed design decisions.`, hours: 6, percentage: 50, items: 16 }
                  ]
            }
        ]
    },
    {
        courseCode: 'BSCS332L',
        outcomes: [
            {
                co: 'CO1', description: `Analyze network security threats and implement defense mechanisms using cryptographic techniques.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Identify common network attacks including DoS, man-in-the-middle, and phishing, and propose appropriate countermeasures.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Apply symmetric and asymmetric encryption algorithms including AES, RSA, and ECC to secure data in transit and at rest.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Implement digital signatures, certificates, and PKI infrastructure to authenticate identities and ensure non-repudiation.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Configure and manage security infrastructure including firewalls, IDS/IPS, and VPNs.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Configure firewall rules and access control lists to enforce network perimeter security policies.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Deploy and tune intrusion detection and prevention systems to identify and block malicious traffic.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Set up site-to-site and remote-access VPNs using IPsec and TLS to enable secure communication over public networks.`, hours: 6, percentage: 50, items: 16 }
                  ]
            }
        ]
    },
    {
        courseCode: 'BSCS413L',
        outcomes: [
            {
                co: 'CO1', description: `Plan and execute a capstone software project using professional project management methodologies.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Define project scope, objectives, and success criteria through a project charter and stakeholder agreement.`, hours: 1.5, percentage: 20, items: 2 },
                    { description: `Create a project plan with work breakdown structure, milestones, risk register, and resource allocation.`, hours: 3, percentage: 30, items: 5 },
                    { description: `Conduct sprint planning, daily stand-ups, and retrospectives to manage project progress using Agile methodology.`, hours: 6, percentage: 50, items: 18 }
                  ]
            },
            {
                co: 'CO2', description: `Develop and present a complete software solution with documentation and user training materials.`, totalItems: 25, topics: JSON.stringify([{"title":"Fundamentals of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Advanced Concepts of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Practical Applications of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Analysis of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Design of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Implementation of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Testing of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Ethics of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]},{"title":"Case Studies of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples","Common challenges and solutions"]},{"title":"Future Trends of the Subject","subtopics":["Introduction and Overview","Core principles and definitions","Real-world applications and examples"]}]),
                ilos: [
                    { description: `Implement the software solution following the designed architecture, coding standards, and test-driven development practices.`, hours: 2, percentage: 20, items: 2 },
                    { description: `Create comprehensive documentation including system architecture, API documentation, and user manuals.`, hours: 4, percentage: 30, items: 7 },
                    { description: `Prepare and deliver a final project presentation and demonstration to stakeholders with Q&A handling.`, hours: 6, percentage: 50, items: 16 }
                  ]
            }
        ]
    }
];

async function seedNewCourses() {
    await Course.bulkCreate(newCourses);
    
    const statusesToCreate = [];
    for (const c of newCourses) {
        const s = { courseCode: c.code, status: c.status, examPeriod: c.examPeriod || 'Midterm' };
        if (c.status === 'pending') s.submittedAt = new Date('2026-10-10');
        else if (c.status === 'returned') { s.submittedAt = new Date('2026-10-10'); s.returnedAt = new Date('2026-10-19'); }
        else if (c.status === 'approved') { s.submittedAt = new Date('2026-10-09'); s.approvedAt = new Date('2026-10-16'); }
        statusesToCreate.push(s);
        
        if (c.code === 'BSCS342L') {
            statusesToCreate.push({
                courseCode: c.code,
                examPeriod: 'Midterm',
                status: 'approved',
                submittedAt: new Date('2026-10-10'),
                approvedAt: new Date('2026-10-15')
            });
        }
    }
    await TosStatus.bulkCreate(statusesToCreate);


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
                    outcome.ilos.map(ilo => ({ ...ilo, coId: created.id }))
                );
            }
        }
    }

        const codes = newCourses.map(c => c.code);
    for (const code of codes) {
        await createItemsForCourse(code);
        console.log(`  Seeded items for ${code}`);
    }

    console.log('New courses seeded successfully');
}

export { seedNewCourses, newCourses, courseData };




