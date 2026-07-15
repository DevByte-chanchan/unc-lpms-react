'use strict';

/**
 * Seeder: Single Course Learning Plan - "Object-Oriented Programming" (REVISION 2)
 * Status Target: APPROVED
 * Notes: Advances the Rev 1 syllabus to include Design Patterns, Streams, and TDD.
 * Run: npx sequelize-cli db:seed --seed 20260528000001-seed-approved-lp-oop-rev2.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
// 1. FETCH EXISTING COURSE (No creation, just linking)
// ============================================================================
        const existingCourse = await queryInterface.sequelize.query(
            `SELECT course_id FROM Courses WHERE course_no = 'BIT213L' LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

// Safety check: Ensure the course exists before trying to attach a revision
        if (existingCourse.length === 0) {
            throw new Error("Course BIT213L not found. Please ensure Revision 1 seeder has run successfully.");
        }

        const courseId = existingCourse[0].course_id;

// ============================================================================
// 2. PROGRAM COURSE OFFERING (REVISION 2)
// ============================================================================
        await queryInterface.bulkInsert('ProgramCourseOfferings', [{
            revision_number: 2,
            course_id: courseId, // Using the ID fetched from the database
            program_id: 1,
            dept_id: 3,
            course_description: 'Covers fundamental and modern enterprise concepts of object-oriented programming (OOP). Topics include polymorphism, interfaces, SOLID principles, Gang of Four (GoF) design patterns, lambda expressions, Stream APIs, and Test-Driven Development (TDD).',
            createdAt: new Date(),
            updatedAt: new Date()
        }], {});

// Optional: If you need the ID of this new offering for further seeding (like assignments)
        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings
             WHERE course_id = ${courseId} AND revision_number = 2
             ORDER BY pc_offering_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT (STATUS = APPROVED)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: null,
            date_assigned: new Date('2026-06-01 09:00:00'),
            date_submitted: new Date('2026-06-12 10:00:00'),
            date_updated: new Date('2026-06-22 09:00:00'), // When instructor resolved and resubmitted
            createdAt: now,
            updatedAt: now
        }], {});

        const assignment = await queryInterface.sequelize.query(
            `SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ${offeringId} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const assignId = assignment[0].co_assign_id;

        // ============================================================================
        // 3.5 ASSIGNMENT WORKFLOW LOGS (2026 Revision Trail)
        // ============================================================================
        await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', createdAt: new Date('2026-06-01 09:00:00'), updatedAt: new Date('2026-06-01 09:00:00') },
            { co_assign_id: assignId, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2026-06-12 10:00:00'), updatedAt: new Date('2026-06-12 10:00:00') },

            // Returns
            { co_assign_id: assignId, actor_role: 'INDUSTRY_CONSULTANT', action_type: 'RETURNED', createdAt: new Date('2026-06-15 14:00:00'), updatedAt: new Date('2026-06-15 14:00:00') },
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'RETURNED', createdAt: new Date('2026-06-16 11:30:00'), updatedAt: new Date('2026-06-16 11:30:00') },

            // Revision Resubmitted
            { co_assign_id: assignId, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2026-06-22 09:00:00'), updatedAt: new Date('2026-06-22 09:00:00') },

            // Final Approvals
            { co_assign_id: assignId, actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', createdAt: new Date('2026-06-23 10:00:00'), updatedAt: new Date('2026-06-23 10:00:00') },
            { co_assign_id: assignId, actor_role: 'INDUSTRY_CONSULTANT', action_type: 'ACCEPTED', createdAt: new Date('2026-06-24 13:00:00'), updatedAt: new Date('2026-06-24 13:00:00') },
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'ACCEPTED', createdAt: new Date('2026-06-25 09:45:00'), updatedAt: new Date('2026-06-25 09:45:00') },
            { co_assign_id: assignId, actor_role: 'DEAN', action_type: 'ACCEPTED', createdAt: new Date('2026-06-28 15:00:00'), updatedAt: new Date('2026-06-28 15:00:00') }
        ], {});

        // ============================================================================
        // 4. COURSE OUTCOMES (Advanced for Rev 2)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Apply core object-oriented and SOLID principles to architect robust and decoupled software models.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Implement advanced language features including generic programming, lambda expressions, and Stream APIs.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Design software using foundational Gang of Four (GoF) design patterns and event-driven architectures.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Validate object behavior using automated Unit Testing and integrate data persistence mechanisms.', createdAt: now, updatedAt: now }
        ], {});

        const cos = await queryInterface.sequelize.query(
            `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ${offeringId} ORDER BY co_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 4.5. PROGRAM OUTCOME ALIGNMENTS
        // ============================================================================
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            { co_id: cos[0].co_id, po_id: 1, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 6, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 2, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 8, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 7, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 9, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 2, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 3, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 5. INTENDED LEARNING OUTCOMES (12 records, 3 per CO - Rev 2 Focus)
        // ============================================================================
        const iloData = [
            { co_id: cos[0].co_id, description: 'Define class blueprints and encapsulate state using advanced property methods.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Construct deep hierarchical relationships and analyze Liskov Substitution violations.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Apply the Single Responsibility and Open/Closed principles in class design.', hours: 6 },

            { co_id: cos[1].co_id, description: 'Design interfaces to enforce structural contracts and multiple inheritance.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Utilize generic collections with bounds and wildcards for type-safe data.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Implement lambda expressions and functional interfaces for declarative logic.', hours: 6 },

            { co_id: cos[2].co_id, description: 'Construct objects securely using Creational patterns (Singleton, Factory).', hours: 6 },
            { co_id: cos[2].co_id, description: 'Manage component communication using Behavioral patterns (Observer, Strategy).', hours: 6 },
            { co_id: cos[2].co_id, description: 'Create declarative graphical user interface layouts and event listeners.', hours: 6 },

            { co_id: cos[3].co_id, description: 'Read, write, and serialize complex objects to JSON/XML via Streams.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Establish secure relational database connectivity using connection pooling.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Write comprehensive unit tests and implement mocking for decoupled components.', hours: 6 }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', iloData.map(i => ({ ...i, createdAt: now, updatedAt: now })), {});
        const ilos = await queryInterface.sequelize.query(
            `SELECT ilo_id FROM IntendedLearningOutcomes WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 6. TOPICS & SUBTOPICS (35 Advanced Records)
        // ============================================================================
        const topicTitles = [
            'Advanced Memory Models & GC', 'Classes, Objects & Heap Allocation', 'Deep Encapsulation Strategies', 'Advanced Inheritance Trees',
            'Single Responsibility Principle (SRP)', 'Open/Closed Principle (OCP)', 'Liskov Substitution Principle', 'Interface Segregation Principle',
            'Dependency Inversion Principle', 'Abstract Classes vs Interfaces', 'Generic Classes & Type Erasure', 'Wildcards in Generics',
            'Lambda Expressions Syntax', 'Built-in Functional Interfaces', 'The Stream API Pipeline', 'Filtering and Mapping Streams',
            'Creational Patterns: Singleton', 'Creational Patterns: Factory Method', 'Structural Patterns: Adapter', 'Structural Patterns: Decorator',
            'Behavioral Patterns: Observer', 'Behavioral Patterns: Strategy', 'Declarative UI Component Lifecycle', 'Layout Managers in Modern UI',
            'Event-Driven Architecture', 'Exception Handling & Stack Traces', 'Custom Domain Exceptions', 'Object Serialization (JSON/XML)',
            'Advanced File I/O (NIO.2)', 'JDBC / ADO.NET Architecture', 'Connection Pooling & Data Sources', 'Prepared Statements & SQLi Prevention',
            'Unit Testing Fundamentals (JUnit/NUnit)', 'Mocking Dependencies (Mockito/Moq)', 'Test-Driven Development (TDD) Lifecycle'
        ];

        await queryInterface.bulkInsert('Topics', topicTitles.map(t => ({ title: t, createdAt: now, updatedAt: now })), {});
        const topics = await queryInterface.sequelize.query(
            `SELECT topic_id, title FROM Topics ORDER BY topic_id DESC LIMIT 35;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const subtopicsToInsert = [];
        topics.forEach(t => {
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Modern Theory of ${t.title}`, sequence_order: 1, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Enterprise Implementation & Syntax`, sequence_order: 2, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Security & Edge Case Handling`, sequence_order: 3, createdAt: now, updatedAt: now });
        });
        await queryInterface.bulkInsert('Subtopics', subtopicsToInsert, {});

        // ============================================================================
        // 7. REFERENCES (35 updated records for 2026 context)
        // ============================================================================
        const textbooks = [
            { title: 'Modern Java in Action: Lambdas, streams, functional and reactive programming', author: 'Raoul-Gabriel Urma', isbn: '978-1617293566', pubYear: '2019' },
            { title: 'Head First Design Patterns, 2nd Edition', author: 'Eric Freeman', isbn: '978-1492078005', pubYear: '2021' },
            { title: 'C# 10 in a Nutshell', author: 'Joseph Albahari', isbn: '978-1098121952', pubYear: '2022' },
            { title: 'Clean Architecture', author: 'Robert C. Martin', isbn: '978-0134494166', pubYear: '2017' },
            { title: 'Test-Driven Development: By Example', author: 'Kent Beck', isbn: '978-0321146533', pubYear: '2002' }, // Classic
            { title: 'Pro C# 10 with .NET 6', author: 'Andrew Troelsen', isbn: '978-1484278680', pubYear: '2022' },
            { title: 'Java: The Complete Reference, 12th Edition', author: 'Herbert Schildt', isbn: '978-1260463415', pubYear: '2021' },
            { title: 'Refactoring, 2nd Edition', author: 'Martin Fowler', isbn: '978-0134757599', pubYear: '2018' },
            { title: 'Design Patterns (GoF)', author: 'Erich Gamma', isbn: '978-0201633610', pubYear: '1994' },
            { title: 'Effective Java, 3rd Edition', author: 'Joshua Bloch', isbn: '978-0134685991', pubYear: '2018' },
            { title: 'Working Effectively with Legacy Code', author: 'Michael Feathers', isbn: '978-0131177055', pubYear: '2004' },
            { title: 'Domain-Driven Design', author: 'Eric Evans', isbn: '978-0321125217', pubYear: '2003' }
        ];

        const onlineResources = [
            { title: 'Oracle Java 17 Documentation', author: 'Oracle', link: 'https://docs.oracle.com/en/java/javase/17/', pubYear: '2025' },
            { title: 'Microsoft .NET 6 C# Guide', author: 'Microsoft', link: 'https://learn.microsoft.com/en-us/dotnet/csharp/', pubYear: '2025' },
            { title: 'Refactoring.Guru: Design Patterns', author: 'Alexander Shvets', link: 'https://refactoring.guru/design-patterns', pubYear: '2024' },
            { title: 'Baeldung: Guide to Java Streams', author: 'Eugen Paraschiv', link: 'https://www.baeldung.com/java-8-streams', pubYear: '2025' },
            { title: 'SOLID Principles for Modern Devs', author: 'DigitalOcean', link: 'https://www.digitalocean.com/', pubYear: '2024' },
            { title: 'Mockito Framework Docs', author: 'Mockito Team', link: 'https://site.mockito.org/', pubYear: '2025' },
            { title: 'JUnit 5 User Guide', author: 'JUnit Team', link: 'https://junit.org/junit5/docs/current/user-guide/', pubYear: '2025' },
            { title: 'Stack Overflow: Architecture', author: 'Community', link: 'https://stackoverflow.com/', pubYear: '2026' },
            { title: 'W3Schools Advanced Java', author: 'W3Schools', link: 'https://www.w3schools.com/java/', pubYear: '2026' },
            { title: 'MDN Web Docs: Modern OOP', author: 'Mozilla', link: 'https://developer.mozilla.org/', pubYear: '2026' },
            { title: 'Codecademy: Intermediate Java', author: 'Codecademy', link: 'https://www.codecademy.com/', pubYear: '2025' },
            { title: 'Martin Fowler: Microservices & OOP', author: 'Martin Fowler', link: 'https://martinfowler.com/', pubYear: '2024' }
        ];

        const oerResources = [
            { title: 'Advanced Java Programming (OER)', author: 'OER Consortium', link: 'https://www.oercommons.org/', pubYear: '2022' },
            { title: 'Think Java 2nd Edition', author: 'Allen B. Downey', link: 'https://greenteapress.com/', pubYear: '2020' },
            { title: 'Open Data Structures (in Java)', author: 'Pat Morin', link: 'http://opendatastructures.org/', pubYear: '2021' },
            { title: 'Software Design Patterns (MIT OCW)', author: 'MIT Press', link: 'https://ocw.mit.edu/', pubYear: '2021' },
            { title: 'CS106B: Programming Abstractions', author: 'Stanford University', link: 'https://see.stanford.edu/', pubYear: '2020' },
            { title: 'Object-Oriented Design Using Java', author: 'University of Helsinki', link: 'https://java-programming.mooc.fi/', pubYear: '2023' },
            { title: 'Building Skills in Object-Oriented Design', author: 'Steven F. Lott', link: 'https://slott56.github.io/', pubYear: '2021' },
            { title: 'TDD Fundamentals (OER)', author: 'Open Textbooks', link: 'https://open.umn.edu/opentextbooks/', pubYear: '2022' },
            { title: 'Introduction to C# and .NET Core', author: 'University of Washington', link: 'https://www.coursera.org/', pubYear: '2022' },
            { title: 'Principles of Modern OOP', author: 'OER Project', link: 'https://www.oercommons.org/', pubYear: '2023' },
            { title: 'Data Abstraction and Problem Solving', author: 'Open Textbooks', link: 'https://open.umn.edu/', pubYear: '2024' }
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
        // 8. TLAs (35 updated records for Rev 2)
        // ============================================================================
        const tlaTitles = [
            'Heap Memory Profiling Lab', 'Object Instance Tracing', 'Encapsulation Breach Sandbox', 'Hierarchy Mapping Drill',
            'SRP Refactoring Exercise', 'OCP Extensibility Lab', 'Liskov Violation Hunt', 'Interface Decoupling Challenge',
            'Dependency Injection Lab', 'Abstract Component Build', 'Generic Class Implementation', 'Wildcard Boundaries Exercise',
            'Lambda Syntax Drill', 'Functional Interface Mapping', 'Stream API Pipeline Build', 'Declarative Data Filtering Lab',
            'Thread-Safe Singleton Sandbox', 'Factory Method Sandbox', 'Legacy Code Adapter Lab', 'Dynamic Decorator Construction',
            'Observer Pattern Event Wiring Lab', 'Strategy Pattern Algorithm Swap', 'Declarative UI Layout Build', 'Grid vs Flex UI Lab',
            'Event Listener Routing Drill', 'Custom Exception Hierarchy', 'Exception Strategy Audit', 'JSON Serialization Exercise',
            'NIO.2 High-Speed File Parsing', 'Database DAO Implementation', 'HikariCP Pool Configuration Lab', 'SQL Injection Defense Lab',
            'JUnit Test Writing Challenge', 'Mockito Stubbing Workshop', 'TDD Red-Green-Refactor Lab'
        ];

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlaTitles.map((t, idx) => ({
            tla_name: t, description: `Advanced practical engagement focusing on implementing ${t} in a modern enterprise context.`,
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
        const assessmentNames = ['Architecture Review', 'Refactoring Exam', 'Design Pattern Project', 'Unit Test Coverage Metric', 'Full-Stack Integration'];

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
                    description: `Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.`,
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
        // 12. COMMENTS & COMMENT TARGETS (New 2026 Revision Trail)
        // ============================================================================
        const icReturnDate = new Date('2026-06-15 14:05:00');
        const phReturnDate = new Date('2026-06-16 11:35:00');
        const resolutionDate = new Date('2026-06-22 08:50:00');

        // Relationship Math strictly followed: ilos[i] owns topics[i*2] & topics[i*2+1], and tlas[i*2] & tlas[i*2+1]

        const rawCommentsData = [
            // ---------------------------------------------------------
            // Industry Consultant focusing on Topics
            // ---------------------------------------------------------
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "Functional interfaces are great, but please emphasize avoiding side-effects within lambda bodies. Junior devs often mutate external state here, causing huge concurrency bugs.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilos[6].ilo_id,         // ilos[6] owns topics 12 and 13
                comment_for: 'topics',
                target_id: topics[12].topic_id, // Matches topics[12]: 'Lambda Expressions Syntax'
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "Ensure the Singleton pattern topic explicitly covers thread-safety mechanisms (e.g., double-checked locking). Naïve implementations fail immediately in enterprise web applications.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilos[8].ilo_id,         // ilos[8] owns topics 16 and 17
                comment_for: 'topics',
                target_id: topics[16].topic_id, // Matches topics[16]: 'Creational Patterns: Singleton'
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            // ---------------------------------------------------------
            // Program Head focusing on TLAs
            // ---------------------------------------------------------
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "For the 'Factory Method Sandbox' lab, do not let them just use a massive Switch statement inside the creator. Force them to use a registry pattern or reflection to earn full points.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilos[8].ilo_id,         // ilos[8] owns TLAs 16 and 17
                comment_for: 'tlas',
                target_id: tlas[17].tla_id,     // Matches tlas[17]: 'Factory Method Sandbox'
                createdAt: phReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "In the 'Observer Pattern Event Wiring Lab', students must demonstrate how to properly unregister listeners to prevent memory leaks (Lapsed Listener Problem). Update the rubric.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilos[10].ilo_id,        // ilos[10] owns TLAs 20 and 21
                comment_for: 'tlas',
                target_id: tlas[20].tla_id,     // Matches tlas[20]: 'Observer Pattern Event Wiring Lab'
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

        // 12b. Fetch the inserted comments (Selecting the message as well for exact identification)
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

        console.log(`Successfully completed realistic workflow and comment log integration for APPROVED course BIT213L (REVISION 2).`);
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};