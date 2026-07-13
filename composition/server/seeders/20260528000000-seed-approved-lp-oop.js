'use strict';

/**
 * Seeder: Single Course Learning Plan - "Object-Oriented Programming"
 * Status Target: APPROVED
 * Run: npx sequelize-cli db:seed --seed 20260528000000-seed-approved-lp-oop.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1. COURSE CREATION
        // ============================================================================
        await queryInterface.bulkInsert('Courses', [{
            course_no: 'BIT213L',
            course_title: 'Object-Oriented Programming',
            credit: '2 LEC, 1 LAB',
            contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
            classification: 'Professional Courses',
            cmo: 'CMO No. 25 S. 2015',
            year_lvl: 'SECOND YEAR',
            term: '1st Semester SY 2026-2027',
            createdAt: now,
            updatedAt: now
        }], {});

        const course = await queryInterface.sequelize.query(
            `SELECT course_id FROM Courses WHERE course_no = 'BIT213L' ORDER BY course_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const courseId = course[0].course_id;

        // ============================================================================
        // 2. PROGRAM COURSE OFFERING
        // ============================================================================
        await queryInterface.bulkInsert('ProgramCourseOfferings', [{
            revision_number: 1,
            course_id: courseId,
            program_id: 1, // Assuming BSIT exists from foundational seeder
            dept_id: 3,    // Assuming SCIS exists from foundational seeder
            course_description: 'Covers fundamental concepts of object-oriented programming (OOP). Topics include classes, objects, inheritance, polymorphism, encapsulation, interfaces, exception handling, and graphical user interface (GUI) development.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT (STATUS = APPROVED)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: null,
            date_assigned: new Date('2025-06-01 09:00:00'),
            date_submitted: new Date('2025-06-15 10:00:00'),
            date_updated: new Date('2025-06-25 09:00:00'), // When instructor resolved and resubmitted
            createdAt: now,
            updatedAt: now
        }], {});

        const assignment = await queryInterface.sequelize.query(
            `SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ${offeringId} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const assignId = assignment[0].co_assign_id;

        // ============================================================================
        // 3.5 ASSIGNMENT WORKFLOW LOGS (The Realistic Revision Trail)
        // Timeline: Submitted -> Returned (IC) -> Returned (PH) -> Resubmitted -> Fully Approved
        // ============================================================================
        await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
            // 1. Initial Assignment & Submission
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', createdAt: new Date('2025-06-01 09:00:00'), updatedAt: new Date('2025-06-01 09:00:00') },
            { co_assign_id: assignId, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2025-06-15 10:00:00'), updatedAt: new Date('2025-06-15 10:00:00') },

            // 2. The Returns (Industry Consultant & Program Head find issues)
            { co_assign_id: assignId, actor_role: 'INDUSTRY_CONSULTANT', action_type: 'RETURNED', createdAt: new Date('2025-06-18 14:00:00'), updatedAt: new Date('2025-06-18 14:00:00') },
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'RETURNED', createdAt: new Date('2025-06-19 11:30:00'), updatedAt: new Date('2025-06-19 11:30:00') },

            // 3. The Revision (Instructor updates and resubmits)
            { co_assign_id: assignId, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2025-06-25 09:00:00'), updatedAt: new Date('2025-06-25 09:00:00') },

            // 4. The Final Approvals
            { co_assign_id: assignId, actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', createdAt: new Date('2025-06-26 10:00:00'), updatedAt: new Date('2025-06-26 10:00:00') },
            { co_assign_id: assignId, actor_role: 'INDUSTRY_CONSULTANT', action_type: 'ACCEPTED', createdAt: new Date('2025-06-27 13:00:00'), updatedAt: new Date('2025-06-27 13:00:00') },
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'ACCEPTED', createdAt: new Date('2025-06-28 09:45:00'), updatedAt: new Date('2025-06-28 09:45:00') },
            { co_assign_id: assignId, actor_role: 'DEAN', action_type: 'ACCEPTED', createdAt: new Date('2025-07-02 15:00:00'), updatedAt: new Date('2025-07-02 15:00:00') }
        ], {});

        // ============================================================================
        // 4. COURSE OUTCOMES (4 records)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Apply core object-oriented principles (encapsulation, inheritance, polymorphism) to design robust software models.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Implement abstract classes, interfaces, and generic programming to develop scalable software components.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Design event-driven graphical user interfaces (GUI) incorporating robust exception handling mechanisms.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Integrate file I/O operations and data persistence mechanisms within object-oriented desktop applications.', createdAt: now, updatedAt: now }
        ], {});

        const cos = await queryInterface.sequelize.query(
            `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ${offeringId} ORDER BY co_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 4.5. PROGRAM OUTCOME ALIGNMENTS
        // ============================================================================
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            { co_id: cos[0].co_id, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 6, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 2, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 8, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 5, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 7, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 9, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 2, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 3, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 5. INTENDED LEARNING OUTCOMES (12 records, 3 per CO)
        // ============================================================================
        const iloData = [
            { co_id: cos[0].co_id, description: 'Define class blueprints and instantiate objects with appropriate state mapping.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Encapsulate class state using access modifiers and property methods.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Construct hierarchical relationships using inheritance and method overriding.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Design abstract base classes to enforce structural contracts.', hours: 6 },
            { co_id: line => cos[1].co_id, description: 'Implement multiple interfaces to achieve decoupling and polymorphism.', hours: 6 }, // Fixed dynamic co_id assignment bug via object instantiation
            { co_id: cos[1].co_id, description: 'Utilize generic collections (Lists, Maps, Sets) for dynamic data storage.', hours: 6 },
            { co_id: cos[2].co_id, description: 'Catch and handle runtime exceptions using try-catch-finally blocks.', hours: 6 },
            { co_id: cos[2].co_id, description: 'Create graphical user interface layouts using standard library components.', hours: 6 },
            { co_id: cos[2].co_id, description: 'Bind action listeners to UI components to handle user-driven events.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Serialize and deserialize object states into binary format.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Read and write unstructured text data using file input/output streams.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Establish basic database connectivity (JDBC/ADO.NET) for persistent records.', hours: 6 }
        ];

        // Sanitize object insertion (fixing the inline arrow function artifact above)
        iloData[4].co_id = cos[1].co_id;

        await queryInterface.bulkInsert('IntendedLearningOutcomes', iloData.map(i => ({ ...i, createdAt: now, updatedAt: now })), {});
        const ilos = await queryInterface.sequelize.query(
            `SELECT ilo_id FROM IntendedLearningOutcomes WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 6. TOPICS & SUBTOPICS (35 records)
        // ============================================================================
        const topicTitles = [
            'Introduction to OOP Paradigms', 'Classes and Objects', 'Access Modifiers & Encapsulation', 'Constructors & Destructors',
            'The "this" Keyword', 'Garbage Collection & Memory Management', 'Static Variables & Methods', 'Inheritance Fundamentals',
            'The "super" Keyword', 'Method Overriding vs Overloading', 'Polymorphism (Compile-time vs Runtime)', 'Abstract Classes',
            'Interface Declarations', 'Multiple Inheritance via Interfaces', 'Exception Handling Basics', 'Try-Catch-Finally Blocks',
            'Custom Exceptions Generation', 'Generic Classes', 'Generic Methods', 'Java/C# Collections Framework',
            'Lists, Sets, and Maps', 'Event-Driven Programming Paradigm', 'GUI Components (Buttons, Labels)', 'Layout Managers',
            'Action and Mouse Listeners', 'File Input/Output Streams', 'Serialization & Deserialization', 'Object Streams',
            'String Manipulation & Regex', 'SOLID Principles Introduction', 'Unit Testing in OOP', 'Refactoring Techniques',
            'MVC Pattern Introduction', 'Database Connectivity Fundamentals', 'CRUD Operations in OOP'
        ];

        await queryInterface.bulkInsert('Topics', topicTitles.map(t => ({ title: t, createdAt: now, updatedAt: now })), {});
        const topics = await queryInterface.sequelize.query(
            `SELECT topic_id, title FROM Topics ORDER BY topic_id DESC LIMIT 35;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const subtopicsToInsert = [];
        topics.forEach(t => {
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Core Concepts of ${t.title}`, sequence_order: 1, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Implementation & Syntax`, sequence_order: 2, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Troubleshooting & Edge Cases`, sequence_order: 3, createdAt: now, updatedAt: now });
        });
        await queryInterface.bulkInsert('Subtopics', subtopicsToInsert, {});

        // ============================================================================
        // 7. REFERENCES (35 records)
        // ============================================================================
        const textbooks = [
            { title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', isbn: '978-0132350884', pubYear: '2008' },
            { title: 'Effective Java', author: 'Joshua Bloch', isbn: '978-0134685991', pubYear: '2017' },
            { title: 'Head First Design Patterns', author: 'Eric Freeman', isbn: '978-0596007126', pubYear: '2004' },
            { title: 'C# in Depth', author: 'Jon Skeet', isbn: '978-1617294532', pubYear: '2019' },
            { title: 'Object-Oriented Analysis and Design', author: 'Grady Booch', isbn: '978-0201895513', pubYear: '2007' },
            { title: 'Design Patterns: Elements of Reusable Object-Oriented Software', author: 'Erich Gamma', isbn: '978-0201633610', pubYear: '1994' },
            { title: 'Java: The Complete Reference', author: 'Herbert Schildt', isbn: '978-1260440232', pubYear: '2018' },
            { title: 'Pro C# 9 with .NET 5', author: 'Andrew Troelsen', isbn: '978-1484269381', pubYear: '2021' },
            { title: 'Refactoring: Improving the Design of Existing Code', author: 'Martin Fowler', isbn: '978-0134757599', pubYear: '2018' },
            { title: 'Thinking in Java', author: 'Bruce Eckel', isbn: '978-0131872486', pubYear: '2006' },
            { title: 'The Pragmatic Programmer', author: 'David Thomas', isbn: '978-0135957059', pubYear: '2019' },
            { title: 'Agile Principles, Patterns, and Practices', author: 'Robert C. Martin', isbn: '978-0131857254', pubYear: '2006' }
        ];

        const onlineResources = [
            { title: 'Oracle Java Documentation', author: 'Oracle', link: 'https://docs.oracle.com/en/java/', pubYear: '2025' },
            { title: 'Microsoft C# Programming Guide', author: 'Microsoft', link: 'https://learn.microsoft.com/en-us/dotnet/csharp/', pubYear: '2025' },
            { title: 'Baeldung: Guide to Java', author: 'Eugen Paraschiv', link: 'https://www.baeldung.com/', pubYear: '2025' },
            { title: 'Refactoring.Guru', author: 'Alexander Shvets', link: 'https://refactoring.guru/', pubYear: '2024' },
            { title: 'GeeksforGeeks OOP Concepts', author: 'GeeksforGeeks', link: 'https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/', pubYear: '2023' },
            { title: 'JavaTpoint: OOPs Concepts', author: 'JavaTpoint', link: 'https://www.javatpoint.com/java-oops-concepts', pubYear: '2024' },
            { title: 'TutorialsPoint C# Guide', author: 'TutorialsPoint', link: 'https://www.tutorialspoint.com/csharp/index.htm', pubYear: '2022' },
            { title: 'Stack Overflow: Best Practices', author: 'Community', link: 'https://stackoverflow.com/', pubYear: '2025' },
            { title: 'SOLID Principles Explained', author: 'DigitalOcean', link: 'https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design', pubYear: '2021' },
            { title: 'W3Schools Java Tutorial', author: 'W3Schools', link: 'https://www.w3schools.com/java/', pubYear: '2025' },
            { title: 'MDN Web Docs: Object-Oriented JS', author: 'Mozilla', link: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Object-oriented_programming', pubYear: '2025' },
            { title: 'Codecademy: OOP Curriculum', author: 'Codecademy', link: 'https://www.codecademy.com/learn/learn-java', pubYear: '2024' }
        ];

        const oerResources = [
            { title: 'Introduction to Programming in Java (MIT OCW)', author: 'MIT Press', link: 'https://ocw.mit.edu/', pubYear: '2020' },
            { title: 'Think Java: How to Think Like a Computer Scientist', author: 'Allen B. Downey', link: 'https://greenteapress.com/wp/think-java/', pubYear: '2019' },
            { title: 'Open Data Structures (in Java)', author: 'Pat Morin', link: 'http://opendatastructures.org/', pubYear: '2021' },
            { title: 'Object-Oriented Programming in C#', author: 'Rob Miles', link: 'https://www.robmiles.com/c-yellow-book/', pubYear: '2019' },
            { title: 'CS106A: Programming Methodology', author: 'Stanford University', link: 'https://see.stanford.edu/Course/CS106A', pubYear: '2018' },
            { title: 'Java, Java, Java: Object-Oriented Problem Solving', author: 'Ralph Morelli', link: 'https://www.oercommons.org/', pubYear: '2017' },
            { title: 'Building Skills in Object-Oriented Design', author: 'Steven F. Lott', link: 'https://slott56.github.io/building-skills-in-oo-design/build/html/index.html', pubYear: '2020' },
            { title: 'Software Design Patterns (OER)', author: 'OER Consortium', link: 'https://www.oercommons.org/', pubYear: '2022' },
            { title: 'Introduction to C# and .NET', author: 'University of Washington', link: 'https://www.coursera.org/', pubYear: '2021' },
            { title: 'Principles of Object-Oriented Programming', author: 'OER Project', link: 'https://www.oercommons.org/', pubYear: '2020' },
            { title: 'Data Abstraction and Problem Solving', author: 'Open Textbooks', link: 'https://open.umn.edu/opentextbooks/', pubYear: '2023' }
        ];

        const referenceData = [
            ...textbooks.map(b => ({ title: b.title, author: b.author, isbn: b.isbn, link: null, publication_year: new Date(`${b.pubYear}-01-01`), type: 'TEXTBOOK', createdAt: now, updatedAt: now })),
            ...onlineResources.map(o => ({ title: o.title, author: o.author, isbn: null, link: o.link, publication_year: new Date(`${o.pubYear}-01-01`), type: 'ONLINE', createdAt: now, updatedAt: now })),
            ...oerResources.map(o => ({ title: o.title, author: o.author, isbn: null, link: o.link, publication_year: new Date(`${o.pubYear}-01-01`), type: 'OER', createdAt: now, updatedAt: now }))
        ];

        await queryInterface.bulkInsert('References', referenceData, {});

        const references = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT 35;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 8. TLAs (35 records)
        // ============================================================================
        const tlaTitles = [
            'Class Blueprinting Exercise', 'Object Instantiation Lab', 'Access Modifier Treasure Hunt', 'Constructor Overloading Lab',
            'Context Keyword Trace', 'Garbage Collection Demo', 'Static Member Tracker', 'Inheritance Tree Mapping',
            'Superclass Delegation Lab', 'Method Override Simulator', 'Polymorphic Array Sort', 'Abstract Factory Build',
            'Interface Contract Writing', 'Multiple Inheritance Puzzle', 'Exception Trace Analysis', 'Try-Catch Escape Room',
            'Custom Exception Sandbox', 'Generics Type Safety Lab', 'Generic Method Sort', 'Collections Performance Test',
            'HashMap Lookup Exercise', 'Event Loop Trace', 'GUI Wireframe Translation', 'Layout Manager Tetris',
            'Action Listener Wiring', 'Flat File Reader Script', 'Binary Serialization Lab', 'Data Stream Parsing',
            'String Regex Matcher', 'SOLID Refactoring Challenge', 'JUnit Test Writing Lab', 'Code Smell Remediation',
            'MVC Architecture Sandbox', 'JDBC Connection Setup', 'Basic CRUD Application Lab'
        ];

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlaTitles.map((t, idx) => ({
            tla_name: t, description: `Comprehensive practical engagement focusing on executing OOP concepts related to ${t}.`,
            performed_by: idx % 2 === 0 ? 'S' : 'I', class_phase: ['pre', 'in', 'post'][idx % 3], is_lab: idx % 2 === 0 ? '1' : '0', createdAt: now, updatedAt: now
        })), {});

        const tlas = await queryInterface.sequelize.query(
            `SELECT tla_id FROM TeachingAndLearningActivities ORDER BY tla_id DESC LIMIT 35;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 9. JUNCTION MAPPINGS (ILOTopics, ILOReferences)
        // ============================================================================
        const iloTopicInserts = [];
        const iloReferenceInserts = [];

        for (let i = 0; i < 12; i++) {
            const iloId = ilos[i].ilo_id;
            iloTopicInserts.push({ ilo_id: iloId, topic_id: topics[i * 2].topic_id, createdAt: now, updatedAt: now });
            iloTopicInserts.push({ ilo_id: iloId, topic_id: topics[(i * 2) + 1].topic_id, createdAt: now, updatedAt: now });

            iloReferenceInserts.push({ ilo_id: iloId, reference_id: references[i * 2].reference_id, createdAt: now, updatedAt: now });
            iloReferenceInserts.push({ ilo_id: iloId, reference_id: references[(i * 2) + 1].reference_id, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ILOTopics', iloTopicInserts, {});
        await queryInterface.bulkInsert('ILOReferences', iloReferenceInserts, {});

        const iloTopics = await queryInterface.sequelize.query(
            `SELECT ilo_topic_id, ilo_id FROM ILOTopics ORDER BY ilo_topic_id DESC LIMIT 24;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 10. TOPIC TLAs
        // ============================================================================
        const topicTlaInserts = [];
        for (let i = 0; i < 24; i++) {
            topicTlaInserts.push({
                ilo_topic_id: iloTopics[i].ilo_topic_id,
                tla_id: tlas[i].tla_id,
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('TopicTLAs', topicTlaInserts, {});

        // ============================================================================
        // 11. TLA ASSESSMENTS
        // ============================================================================
        const assessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];
        const weightDistribution = [10, 15, 25];
        const assessmentNames = ['Code Review', 'Programming Exam', 'System Module Submission', 'Logic Trace Quiz', 'GUI Prototype'];

        for (let i = 0; i < 12; i++) {
            const coIndex = Math.floor(i / 3);
            const iloPosInCo = i % 3;

            const targetPeriod = periods[coIndex];
            const targetWeightPerAssessment = String(weightDistribution[iloPosInCo]);

            const assignedTlasForIlo = [tlas[i * 2].tla_id, tlas[(i * 2) + 1].tla_id];

            assignedTlasForIlo.forEach((tlaId, idx) => {
                assessmentInserts.push({
                    tla_id: tlaId,
                    name: assessmentNames[(i + idx) % assessmentNames.length],
                    description: `Summative evaluation metric testing OOP competency and syntax accuracy.`,
                    period: targetPeriod,
                    weight: targetWeightPerAssessment,
                    min_passing: 60,
                    createdAt: now,
                    updatedAt: now
                });
            });
        }
        await queryInterface.bulkInsert('TLAAssessments', assessmentInserts, {});

// ============================================================================
        // 12. COMMENTS & COMMENT TARGETS (Realistic Revision Trail)
        // ============================================================================
        const icReturnDate = new Date('2025-06-18 14:00:00');
        const phReturnDate = new Date('2025-06-19 11:30:00');
        const resolutionDate = new Date('2025-06-25 09:00:00');

        // Relationship Math: ilos[i] owns topics[i*2] & topics[i*2+1], and tlas[i*2] & tlas[i*2+1]
        const rawCommentsData = [
            // ---------------------------------------------------------
            // Industry Consultant focusing on Topics
            // ---------------------------------------------------------
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "The topic 'The \"this\" Keyword' needs to explicitly cover variable shadowing, as this is a common source of bugs in enterprise Java/C# applications.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilos[2].ilo_id,         // ilos[2] owns topics 4 and 5
                comment_for: 'topics',
                target_id: topics[4].topic_id,  // Matches topics[4]
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "Please ensure 'Abstract Classes' strongly emphasizes Interface Segregation. Students need to understand decoupling before building complex polymorphic structures.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilos[5].ilo_id,         // ilos[5] owns topics 10 and 11
                comment_for: 'topics',
                target_id: topics[11].topic_id, // Matches topics[11]
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            // ---------------------------------------------------------
            // Program Head focusing on TLAs
            // ---------------------------------------------------------
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "For the 'Exception Trace Analysis' TLA, ensure the rubric requires students to write custom exceptions mapped to business logic, not just catching generic system exceptions.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilos[7].ilo_id,         // ilos[7] owns TLAs 14 and 15
                comment_for: 'tlas',
                target_id: tlas[14].tla_id,     // Matches tlas[14]
                createdAt: phReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "In the 'GUI Wireframe Translation' lab, restrict the use of drag-and-drop IDE builders. Students must hand-code the Layout Managers to pass this assessment.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilos[11].ilo_id,        // ilos[11] owns TLAs 22 and 23
                comment_for: 'tlas',
                target_id: tlas[22].tla_id,     // Matches tlas[22]
                createdAt: phReturnDate,
                updatedAt: resolutionDate
            }
        ];

        // 12a. Insert the Comments
        await queryInterface.bulkInsert('Comments', rawCommentsData.map(c => ({
            co_assign_id: c.co_assign_id,
            commenter_role: c.commenter_role,
            message: c.message,
            resolved_status: c.resolved_status,
            resolved_date: c.resolved_date,
            ilo_id: c.ilo_id,
            comment_for: c.comment_for,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        })), {});

        // 12b. Fetch the inserted comments (Selecting the message as well for identification)
        const insertedComments = await queryInterface.sequelize.query(
            `SELECT comment_id, message FROM Comments WHERE co_assign_id = ${assignId};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // 12c. Map them into the CommentTargets junction table using string matching
        // This guarantees the right target_id attaches to the right comment_id regardless of DB insertion order
        const targetInserts = rawCommentsData.map((c) => {
            const matchedDbComment = insertedComments.find(dbComment => dbComment.message === c.message);

            return {
                comment_id: matchedDbComment.comment_id,
                target_id: c.target_id,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt
            };
        });

        await queryInterface.bulkInsert('CommentTargets', targetInserts, {});

        console.log(`Successfully completed realistic workflow and comment log integration for APPROVED course BIT213L.`);
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};