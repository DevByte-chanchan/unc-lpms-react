'use strict';

/**
 * Seeder: Single Course Learning Plan - "Object-Oriented Programming" (REVISION 2)
 * Status Target: APPROVED
 * Notes: Advances the Rev 1 syllabus to include SOLID Principles, Design Patterns, Streams, and TDD.
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

        if (existingCourse.length === 0) {
            throw new Error("Course BIT213L not found. Please ensure Revision 1 seeder has run successfully.");
        }

        const courseId = existingCourse[0].course_id;

        // ============================================================================
        // 2. PROGRAM COURSE OFFERING (REVISION 2)
        // ============================================================================
        await queryInterface.bulkInsert('ProgramCourseOfferings', [{
            revision_number: 2,
            course_id: courseId,
            program_id: 1,
            dept_id: 3,
            course_description: 'Covers fundamental and modern enterprise concepts of object-oriented programming (OOP). Topics include polymorphism, interfaces, SOLID principles, Gang of Four (GoF) design patterns, lambda expressions, Stream APIs, and Test-Driven Development (TDD).',
            createdAt: now,
            updatedAt: now
        }], {});

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
            stakeholder_id: '1',
            date_assigned: new Date('2026-06-01 09:00:00'),
            date_submitted: new Date('2026-06-12 10:00:00'),
            date_updated: new Date('2026-06-22 09:00:00'),
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
            { co_assign_id: assignId, stakeholder_id: '2', actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', createdAt: new Date('2026-06-01 09:00:00'), updatedAt: new Date('2026-06-01 09:00:00') },
            { co_assign_id: assignId, stakeholder_id: '1', actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2026-06-12 10:00:00'), updatedAt: new Date('2026-06-12 10:00:00') },
            // Returns
            { co_assign_id: assignId, stakeholder_id: '4', actor_role: 'INDUSTRY_CONSULTANT', action_type: 'RETURNED', createdAt: new Date('2026-06-15 14:00:00'), updatedAt: new Date('2026-06-15 14:00:00') },
            { co_assign_id: assignId, stakeholder_id: '2', actor_role: 'PROGRAM_HEAD', action_type: 'RETURNED', createdAt: new Date('2026-06-16 11:30:00'), updatedAt: new Date('2026-06-16 11:30:00') },
            // Revision Resubmitted
            { co_assign_id: assignId, stakeholder_id: '1', actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2026-06-22 09:00:00'), updatedAt: new Date('2026-06-22 09:00:00') },
            // Final Approvals
            { co_assign_id: assignId, stakeholder_id: '3', actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', createdAt: new Date('2026-06-23 10:00:00'), updatedAt: new Date('2026-06-23 10:00:00') },
            { co_assign_id: assignId, stakeholder_id: '4', actor_role: 'INDUSTRY_CONSULTANT', action_type: 'ACCEPTED', createdAt: new Date('2026-06-24 13:00:00'), updatedAt: new Date('2026-06-24 13:00:00') },
            { co_assign_id: assignId, stakeholder_id: '2', actor_role: 'PROGRAM_HEAD', action_type: 'ACCEPTED', createdAt: new Date('2026-06-25 09:45:00'), updatedAt: new Date('2026-06-25 09:45:00') },
            { co_assign_id: assignId, stakeholder_id: '5', actor_role: 'DEAN', action_type: 'ACCEPTED', createdAt: new Date('2026-06-28 15:00:00'), updatedAt: new Date('2026-06-28 15:00:00') }
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
        // 5. PROGRAM OUTCOME ALIGNMENTS (3 per CO = 12 alignments)
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
        // 6. INTENDED LEARNING OUTCOMES (1 Orientation + 12 Technical = 13 total)
        // ============================================================================
        const iloData = [
            // Orientation
            { co_id: cos[0].co_id, description: "Cite the value and relevance of the University's and the College's VMO as related to the course", is_orientation: true },
            // CO1
            { co_id: cos[0].co_id, description: 'Define class blueprints and encapsulate state using advanced property methods.', assessment_tool: 'Profiling Analysis', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Construct deep hierarchical relationships and analyze Liskov Substitution violations.', assessment_tool: 'SOLID Refactoring Lab', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Apply the Single Responsibility and Open/Closed principles in class design.', assessment_tool: 'Decoupled Domain Architecture', is_orientation: false },
            // CO2
            { co_id: cos[1].co_id, description: 'Design interfaces to enforce structural contracts and multiple inheritance.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Utilize generic collections with bounds and wildcards for type-safe data.', assessment_tool: 'Bounded Generics Practicum', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Implement lambda expressions and functional interfaces for declarative Stream API logic.', assessment_tool: 'Declarative Stream Pipeline Project', is_orientation: false },
            // CO3
            { co_id: cos[2].co_id, description: 'Construct objects securely using Creational patterns (Singleton, Factory).', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Manage component communication using Behavioral patterns (Observer, Strategy).', assessment_tool: 'Design Pattern Implementation', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Create declarative graphical user interface layouts and event listeners.', assessment_tool: 'Reactive GoF UI Architecture', is_orientation: false },
            // CO4
            { co_id: cos[3].co_id, description: 'Read, write, and serialize complex objects to JSON/XML via NIO.2 Streams.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Establish secure relational database connectivity using HikariCP connection pooling.', assessment_tool: 'TDD & Mockito Verification Suite', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Write comprehensive unit tests and implement mocking for decoupled enterprise components.', assessment_tool: 'Enterprise Data Integration', is_orientation: false }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', iloData.map(i => ({ ...i, createdAt: now, updatedAt: now })), {});

        const ilos = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, is_orientation FROM IntendedLearningOutcomes WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const gradedIlos = ilos.filter(i => !i.is_orientation);

        // ============================================================================
        // 7. WEEKS (4 weeks per CO = 16 Weeks, hours = 5.00 each)
        // ============================================================================
        const weeksToInsert = [];
        for (let cIdx = 0; cIdx < 4; cIdx++) {
            for (let w = 0; w < 4; w++) {
                weeksToInsert.push({
                    co_id: cos[cIdx].co_id,
                    hours: 5.00,
                    createdAt: now,
                    updatedAt: now
                });
            }
        }
        await queryInterface.bulkInsert('Weeks', weeksToInsert, {});

        const weeks = await queryInterface.sequelize.query(
            `SELECT week_id, co_id FROM Weeks WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY week_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 8. REFERENCES & WEEKLY REFERENCES (2 per Week = 32 WeeklyReferences)
        // ============================================================================
        const referenceData = [
            { title: 'UNC Student Handbook & Institutional VMO', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: new Date('2024-06-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Modern Java in Action: Lambdas, streams, functional and reactive programming', author: 'Raoul-Gabriel Urma', isbn: '978-1617293566', link: null, publication_year: new Date('2019-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Head First Design Patterns, 2nd Edition', author: 'Eric Freeman & Elisabeth Robson', isbn: '978-1492078005', link: null, publication_year: new Date('2021-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Clean Architecture: A Craftsman\'s Guide to Software Structure and Design', author: 'Robert C. Martin', isbn: '978-0134494166', link: null, publication_year: new Date('2017-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Test-Driven Development: By Example', author: 'Kent Beck', isbn: '978-0321146533', link: null, publication_year: new Date('2002-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Refactoring: Improving the Design of Existing Code (2nd Edition)', author: 'Martin Fowler', isbn: '978-0134757599', link: null, publication_year: new Date('2018-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Design Patterns: Elements of Reusable Object-Oriented Software (GoF)', author: 'Erich Gamma, Richard Helm, Ralph Johnson & John Vlissides', isbn: '978-0201633610', link: null, publication_year: new Date('1994-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Effective Java, 3rd Edition', author: 'Joshua Bloch', isbn: '978-0134685991', link: null, publication_year: new Date('2018-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Domain-Driven Design: Tackling Complexity in the Heart of Software', author: 'Eric Evans', isbn: '978-0321125217', link: null, publication_year: new Date('2003-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Oracle Java 21 LTS Documentation & Stream API Guide', author: 'Oracle Corporation', isbn: null, link: 'https://docs.oracle.com/en/java/javase/21/', publication_year: new Date('2025-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Microsoft .NET 8 C# Advanced Programming Guide', author: 'Microsoft', isbn: null, link: 'https://learn.microsoft.com/en-us/dotnet/csharp/', publication_year: new Date('2025-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Refactoring.Guru: GoF Design Patterns & SOLID Catalog', author: 'Alexander Shvets', isbn: null, link: 'https://refactoring.guru/design-patterns', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Baeldung: Guide to Java 8+ Streams & Functional Interfaces', author: 'Eugen Paraschiv', isbn: null, link: 'https://www.baeldung.com/java-8-streams', publication_year: new Date('2025-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'JUnit 5 User Guide & Parameterized Testing Reference', author: 'JUnit Team', isbn: null, link: 'https://junit.org/junit5/docs/current/user-guide/', publication_year: new Date('2025-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Mockito Framework Official Documentation', author: 'Mockito Team', isbn: null, link: 'https://site.mockito.org/', publication_year: new Date('2025-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Software Design Patterns (MIT OpenCourseWare)', author: 'MIT Press', isbn: null, link: 'https://ocw.mit.edu/', publication_year: new Date('2022-01-01'), type: 'OER', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('References', referenceData, {});

        const references = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT ${referenceData.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const weekRefPairs = [
            [0, 3],   // Week 1
            [5, 7],   // Week 2
            [3, 5],   // Week 3
            [3, 8],   // Week 4
            [7, 9],   // Week 5
            [7, 10],  // Week 6
            [1, 12],  // Week 7
            [1, 9],   // Week 8
            [2, 6],   // Week 9
            [6, 11],  // Week 10
            [2, 11],  // Week 11
            [2, 15],  // Week 12
            [7, 9],   // Week 13
            [3, 9],   // Week 14
            [4, 13],  // Week 15
            [4, 14]   // Week 16
        ];

        const weeklyReferencesToInsert = [];
        for (let wIdx = 0; wIdx < 16; wIdx++) {
            const [r1, r2] = weekRefPairs[wIdx];
            weeklyReferencesToInsert.push({
                week_id: weeks[wIdx].week_id,
                reference_id: references[r1].reference_id,
                is_orientation: wIdx === 0,
                createdAt: now,
                updatedAt: now
            });
            weeklyReferencesToInsert.push({
                week_id: weeks[wIdx].week_id,
                reference_id: references[r2].reference_id,
                is_orientation: false,
                createdAt: now,
                updatedAt: now
            });
        }
        await queryInterface.bulkInsert('WeeklyReferences', weeklyReferencesToInsert, {});

        // ============================================================================
        // 9. TOPICS & SUBTOPICS (2 Topics per Week = 32 Topics; 3 Subtopics per Topic = 96 Subtopics)
        // ============================================================================
        const weeklyCurriculum = [
            // ---------------- CO1: Weeks 1 - 4 ----------------
            {
                weekIdx: 0,
                topics: [
                    {
                        title: 'Course Orientation and VMO Alignment',
                        is_orientation: true,
                        subtopics: [
                            'University and College VMO, Core Values, and Quality Policy',
                            'Revision 2 Enterprise OOP Syllabus, Grading Criteria, and Lab Rules',
                            'Ethical AI Co-Pilot Usage and Code Ownership Standards'
                        ]
                    },
                    {
                        title: 'Advanced Memory Models & GC',
                        is_orientation: false,
                        subtopics: [
                            'Stack Frames, Object Headers, and Generational Heap Allocation (Eden, Survivor, Tenured)',
                            'Garbage Collection Algorithms (G1GC, ZGC) and Reachability Roots',
                            'Escape Analysis, String Interning, and Preventing Memory Leaks in Object Graphs'
                        ]
                    }
                ]
            },
            {
                weekIdx: 1,
                topics: [
                    {
                        title: 'Classes, Objects & Heap Allocation',
                        subtopics: [
                            'Fluent Builder Pattern, Static Factory Methods, and Telescoping Constructor Elimination',
                            'Deep Encapsulation Strategies: Defensive Copies and Immutable Record Types (`record`)',
                            'Value-Based Object Identity (`equals`, `hashCode`, `Comparable` Contracts)'
                        ]
                    },
                    {
                        title: 'Advanced Inheritance Trees',
                        subtopics: [
                            'Sealed Classes and Permitted Subtype Hierarchies (`sealed`, `permits`)',
                            'Fragile Base Class Problem and Favoring Composition Over Inheritance',
                            'Covariant Return Types, Method Hiding vs. Overriding, and Virtual Dispatch Performance'
                        ]
                    }
                ]
            },
            {
                weekIdx: 2,
                topics: [
                    {
                        title: 'Single Responsibility Principle (SRP)',
                        subtopics: [
                            'Identifying Actor-Driven Reasons to Change and Cohesion Metrics (LCOM)',
                            'Decomposing God Classes into Focused Domain Collaborators',
                            'Separating Business Policy Rules from Infrastructure and Formatting Logic'
                        ]
                    },
                    {
                        title: 'Open/Closed Principle (OCP) & Liskov Substitution Principle (LSP)',
                        subtopics: [
                            'Designing Plugin Abstractions Open for Extension but Closed for Modification',
                            'Liskov Behavioral Subtyping: Preconditions, Postconditions, and History Constraints',
                            'Diagnosing and Refactoring Classic LSP Violations (Rectangle/Square, UnsupportedOperationException)'
                        ]
                    }
                ]
            },
            {
                weekIdx: 3,
                topics: [
                    {
                        title: 'Interface Segregation Principle (ISP)',
                        subtopics: [
                            'Splitting Fat Interfaces into Role-Specific Client Contracts',
                            'Preventing Degenerate/No-Op Method Implementations in Subclasses',
                            'Adapter Facades for Fine-Grained Interface Composition'
                        ]
                    },
                    {
                        title: 'Dependency Inversion Principle (DIP)',
                        subtopics: [
                            'Inverting Source Code Dependencies Against High-Level Policy Abstractions',
                            'IoC Containers, Constructor Injection, and Pure Dependency Graphs',
                            'Hexagonal (Ports and Adapters) Domain Model Isolation'
                        ]
                    }
                ]
            },

            // ---------------- CO2: Weeks 5 - 8 ----------------
            {
                weekIdx: 4,
                topics: [
                    {
                        title: 'Abstract Classes vs Interfaces',
                        subtopics: [
                            'Evolution of Interfaces: Default, Static, and Private Interface Methods',
                            'Mixin Composition via Multiple Interfaces vs. Stateful Abstract Base Classes',
                            'Designing Sealed Interfaces for Exhaustive Pattern Matching'
                        ]
                    },
                    {
                        title: 'Generic Classes & Type Erasure',
                        subtopics: [
                            'Parameterized Types, Type Parameters, and Compiler Type Erasure Bridge Methods',
                            'Heap Pollution, `@SafeVarargs`, and Reifiable vs. Non-Reifiable Types',
                            'Implementing Generic Domain Repositories and Type-Safe Result Wrappers'
                        ]
                    }
                ]
            },
            {
                weekIdx: 5,
                topics: [
                    {
                        title: 'Wildcards in Generics',
                        subtopics: [
                            'Covariance (`? extends T`), Contravariance (`? super T`), and Invariance',
                            'Applying Joshua Bloch\'s PECS Rule (Producer Extends, Consumer Super)',
                            'Recursive Type Bounds (`<T extends Comparable<? super T>>`) and Type Token Capture'
                        ]
                    },
                    {
                        title: 'High-Performance Concurrent and Immutable Collections',
                        subtopics: [
                            'Unmodifiable Views vs. Truly Immutable Collections (`List.of`, `Map.copyOf`)',
                            'Lock-Striped `ConcurrentHashMap`, `CopyOnWriteArrayList`, and Blocking Queues',
                            'Custom `Comparator` Combinators (`comparing`, `thenComparing`, `nullsLast`)'
                        ]
                    }
                ]
            },
            {
                weekIdx: 6,
                topics: [
                    {
                        title: 'Lambda Expressions Syntax',
                        subtopics: [
                            'Lexical Scoping, Effectively Final Variable Capture, and Closure Semantics',
                            'Method References (Static, Bound/Unbound Instance, Constructor References)',
                            'State Mutation Pitfalls, Side-Effects, Immutability, and Concurrency Risks in Lambdas'
                        ]
                    },
                    {
                        title: 'Built-in Functional Interfaces',
                        subtopics: [
                            'Core Functional Signatures: `Predicate<T>`, `Function<T,R>`, `Consumer<T>`, and `Supplier<T>`',
                            'Primitive Specializations (`IntFunction`, `ToDoubleFunction`) to Eliminate Autoboxing',
                            'Higher-Order Function Composition (`andThen`, `compose`, `negate`) and Currying'
                        ]
                    }
                ]
            },
            {
                weekIdx: 7,
                topics: [
                    {
                        title: 'The Stream API Pipeline',
                        subtopics: [
                            'Lazy Evaluation, Intermediate vs. Terminal Operations, and Spliterator Internals',
                            'Filtering, Mapping, FlatMapping (`flatMap`), Slicing, and Short-Circuiting Operations',
                            'Stateful vs. Stateless Intermediate Transformations and Peeking Diagnostics'
                        ]
                    },
                    {
                        title: 'Filtering and Mapping Streams & Advanced Collectors',
                        subtopics: [
                            'Terminal Reductions (`reduce`) and Mutable Reductions with `Collectors`',
                            'Downstream Multi-Level Grouping (`groupingBy`), Partitioning (`partitioningBy`), and `teeing`',
                            'Parallel Streams (`ForkJoinPool`), Non-Interference Rules, and When Parallelism Degrades Speed'
                        ]
                    }
                ]
            },

            // ---------------- CO3: Weeks 9 - 12 ----------------
            {
                weekIdx: 8,
                topics: [
                    {
                        title: 'Creational Patterns: Singleton',
                        subtopics: [
                            'Eager Initialization vs. Lazy Initialization Race Conditions',
                            'Thread-Safety Mechanisms: `synchronized`, Volatile Double-Checked Locking, and Bill Pugh Holder Idiom',
                            'Enum Singletons Against Serialization/Reflection Attacks and Dependency Injection Alternatives'
                        ]
                    },
                    {
                        title: 'Creational Patterns: Factory Method & Abstract Factory',
                        subtopics: [
                            'Decoupling Client Code from Concrete Class Instantiation via Factory Methods',
                            'Dynamic Factory Registration Using Reflection and Supplier Maps Instead of Switch Statements',
                            'Abstract Factory Families for Cross-Platform UI/Driver Toolkits'
                        ]
                    }
                ]
            },
            {
                weekIdx: 9,
                topics: [
                    {
                        title: 'Structural Patterns: Adapter & Facade',
                        subtopics: [
                            'Object Adapter vs. Class Adapter for Wrapping Incompatible Third-Party SDKs',
                            'Facade Pattern for Simplifying Complex Subsystems Behind a Unified Interface',
                            'Two-Way Adapters and Pluggable Protocol Translators'
                        ]
                    },
                    {
                        title: 'Structural Patterns: Decorator, Proxy & Composite',
                        subtopics: [
                            'Dynamic Behavior Wrapping with the Decorator Pattern vs. Static Subclass Explosion',
                            'Virtual, Protection, and Caching Proxies Using Dynamic Proxy Invocation Handlers',
                            'Composite Pattern for Uniformly Treating Leaf Nodes and Recursive Tree Hierarchies'
                        ]
                    }
                ]
            },
            {
                weekIdx: 10,
                topics: [
                    {
                        title: 'Behavioral Patterns: Observer',
                        subtopics: [
                            'Subject-Observer Subscription Contracts and Push vs. Pull Notification Payloads',
                            'Preventing Memory Leaks from the Lapsed Listener Problem via Explicit Unregistration and WeakReferences',
                            'Reactive Event Buses (`Flow` / `Observable`) and Asynchronous Subscriber Backpressure'
                        ]
                    },
                    {
                        title: 'Behavioral Patterns: Strategy, Command & State',
                        subtopics: [
                            'Strategy Pattern Using Functional Interfaces to Swap Algorithms at Runtime',
                            'Command Pattern for Undo/Redo History Stacks and Transactional Macro Queues',
                            'State Pattern for Eliminating Complex Conditional State-Machine Branches'
                        ]
                    }
                ]
            },
            {
                weekIdx: 11,
                topics: [
                    {
                        title: 'Declarative UI Component Lifecycle & Layout Managers',
                        subtopics: [
                            'Modern Declarative Scene Graphs, Property Binding, and Observable Collections',
                            'Responsive Grid, Flex/Flow, and Anchor Layout Managers in Modern Desktop UIs',
                            'Custom Reusable Composite UI Controls and CSS/Theme Styling'
                        ]
                    },
                    {
                        title: 'Event-Driven Architecture & Exception Handling',
                        subtopics: [
                            'Command/Event Routing, Debouncing, and Non-Blocking Async UI Worker Tasks (`CompletableFuture`)',
                            'Centralized Uncaught Exception Handlers and Custom Domain Exception Hierarchies',
                            'Model-View-ViewModel (MVVM) / MVC Presentation Layer Decoupling'
                        ]
                    }
                ]
            },

            // ---------------- CO4: Weeks 13 - 16 ----------------
            {
                weekIdx: 12,
                topics: [
                    {
                        title: 'Object Serialization (JSON/XML) & Advanced File I/O (NIO.2)',
                        subtopics: [
                            'Jackson / Gson / System.Text.Json Polymorphic Object Mapping and Custom Type Adapters',
                            'Non-Blocking File I/O (NIO.2 `Path`, `Files.lines` Lazy Streams, and `FileChannel`)',
                            'Watching Directory Events (`WatchService`) and Safe Atomic File Writes'
                        ]
                    },
                    {
                        title: 'Custom Domain Exceptions & Fault-Tolerant Persistence',
                        subtopics: [
                            'Designing Contextual Domain Exceptions with Error Codes and Remediation Hints',
                            'Functional Error Handling with `Optional<T>` and `Result<T, E>` Monads',
                            'Corrupt File Quarantine, Checksum Verification, and Structured Audit Logging'
                        ]
                    }
                ]
            },
            {
                weekIdx: 13,
                topics: [
                    {
                        title: 'JDBC / ADO.NET Architecture & Connection Pooling',
                        subtopics: [
                            'DataSource Abstraction and High-Performance HikariCP Connection Pool Sizing',
                            'Connection Leak Detection, Timeout Thresholds, and Health Validation Queries',
                            'Repository and Unit-of-Work Patterns Over Relational Connections'
                        ]
                    },
                    {
                        title: 'Prepared Statements & SQLi Prevention',
                        subtopics: [
                            'Parameterized `PreparedStatement` Execution Plans and Strict SQL Injection Defense',
                            'Batch Updates (`addBatch`/`executeBatch`), Generated Keys, and Optimistic Locking',
                            'Transaction Isolation Levels (`READ_COMMITTED`, `SERIALIZABLE`) and Rollback Recovery'
                        ]
                    }
                ]
            },
            {
                weekIdx: 14,
                topics: [
                    {
                        title: 'Unit Testing Fundamentals (JUnit/NUnit)',
                        subtopics: [
                            'xUnit Lifecycle Annotations (`@BeforeEach`, `@AfterEach`, `@Nested`, `@DisplayName`)',
                            'Arrange-Act-Assert (AAA) Structure, Fluent Assertions (`AssertJ`), and Exception Testing (`assertThrows`)',
                            'Parameterized Tests (`@ParameterizedTest`, `@CsvSource`, `@MethodSource`) for Boundary Coverage'
                        ]
                    },
                    {
                        title: 'Mocking Dependencies (Mockito/Moq)',
                        subtopics: [
                            'Test Doubles Taxonomy: Dummy, Fake, Stub, Spy, and Mock Objects',
                            'Stubbing Interface Collaborators (`when(...).thenReturn(...)`) and Argument Captors',
                            'Verifying Behavioral Interactions (`verify(mock, times(1))`) Without Over-Mocking Internals'
                        ]
                    }
                ]
            },
            {
                weekIdx: 15,
                topics: [
                    {
                        title: 'Test-Driven Development (TDD) Lifecycle',
                        subtopics: [
                            'Kent Beck\'s Red-Green-Refactor Micro-Cycle and Writing the Test First',
                            'Triangulation, Obvious Implementation, and Refactoring Toward SOLID & GoF Patterns',
                            'Code Coverage Metrics (Line, Branch, Mutation Testing with PIT) and Legacy Seam Refactoring'
                        ]
                    },
                    {
                        title: 'Capstone Enterprise OOP & TDD Architecture Defense',
                        subtopics: [
                            'Walkthrough of SOLID Boundaries, GoF Design Patterns, and Functional Stream Pipelines',
                            'Live Execution of the JUnit 5 / Mockito Test Suite and HikariCP Database Integration',
                            'Oral Defense of Thread Safety, Memory Efficiency, and Clean Architecture Decisions'
                        ]
                    }
                ]
            }
        ];

        for (const weekBlock of weeklyCurriculum) {
            const targetWeekId = weeks[weekBlock.weekIdx].week_id;
            for (const topicObj of weekBlock.topics) {
                await queryInterface.bulkInsert('Topics', [{
                    title: topicObj.title,
                    createdAt: now,
                    updatedAt: now
                }], {});

                const insertedTopic = await queryInterface.sequelize.query(
                    `SELECT topic_id FROM Topics ORDER BY topic_id DESC LIMIT 1;`,
                    { type: queryInterface.sequelize.QueryTypes.SELECT }
                );
                const topicId = insertedTopic[0].topic_id;

                const subRows = topicObj.subtopics.map((subTitle, idx) => ({
                    week_id: targetWeekId,
                    topic_id: topicId,
                    title: subTitle,
                    sequence_order: idx + 1,
                    is_orientation: Boolean(topicObj.is_orientation),
                    createdAt: now,
                    updatedAt: now
                }));
                await queryInterface.bulkInsert('Subtopics', subRows, {});
            }
        }

        // ============================================================================
        // 10. TEACHING AND LEARNING ACTIVITIES (6 per Week = 96 TLAs)
        //     & 11. TLA ASSESSMENTS (3 per Week = 48 Assessments; 3 per CO linked to gradedIlos)
        // ============================================================================
        const weeklyTlasData = [
            // ---------------- WEEK 1 (CO1) ----------------
            {
                weekIdx: 0, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'UNC VMO & Clean Architecture Charter Reading', desc: 'Read the UNC Student Handbook, SCIS VMO guide, and Robert C. Martin\'s Clean Architecture preface.' },
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'JVM/CLR Generational Heap & GC Overview Study', desc: 'Study how modern managed runtimes allocate objects across Eden, Survivor, and Tenured heap spaces.' },
                    { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation Lecture', desc: 'Orientation covering Rev 2 advancements (SOLID, Streams, GoF Patterns, TDD), grading weights, and VMO alignment.' },
                    { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'Heap Memory Profiling Lab', desc: 'Hands-on laboratory using VisualVM / JFR profiler to inspect object allocation rates, GC pauses, and heap dumps.' },
                    { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO & Software Craftsmanship Manifesto', desc: 'Author a personal engineering manifesto connecting UNC core values to testable, maintainable object-oriented code.' },
                    { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Memory Leak Hunt: Static Collection Retention', desc: 'Diagnose and fix an intentional `OutOfMemoryError` caused by unremoved object references in a static cache.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'VMO & Rev 2 Syllabus Check', desc: 'Formative check of course expectations, TDD workflow rules, and VMO alignment.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'VisualVM Heap Dump Inspection Check', desc: 'In-class verification of retained heap size and GC root identification.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Craftsmanship Manifesto Rubric', desc: 'Formative evaluation of the VMO alignment artifact.' }
                ]
            },
            // ---------------- WEEK 2 (CO1 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 1, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Effective Java: Builders, Records & Sealed Classes Study', desc: 'Read Joshua Bloch\'s chapters on Builder pattern, immutable value objects, and `equals`/`hashCode` contracts.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Object Instance Tracing', desc: 'Trace object construction, defensive copying, and sealed hierarchy subtype restrictions.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Deep Encapsulation, Immutable Records & Composition Seminar', desc: 'Lecture on eliminating telescoping constructors, defending internal mutable collections, and favoring composition over inheritance.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Encapsulation Breach Sandbox', desc: 'Laboratory exercise auditing and sealing encapsulation breaches in a financial domain model using Builders and immutable records.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Hierarchy Mapping Drill: Composition Refactoring', desc: 'Refactor a brittle 4-level inheritance tree suffering from the fragile base class problem into composed strategy delegates.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Symmetry & Transitivity in `equals()` Case Analysis', desc: 'Prove why adding value fields in a subclass `instanceof` `equals()` override violates symmetry with the superclass.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 0, weight: '20', name: 'Profiling Analysis', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Defensive Copy & Record Immutability Check', desc: 'In-class verification that returned collection views are unmodifiable.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Composition over Inheritance Refactoring Check', desc: 'Formative check of delegate forwarding methods.' }
                ]
            },
            // ---------------- WEEK 3 (CO1 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 2, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Martin Clean Architecture: SRP, OCP & LSP Study', desc: 'Study Single Responsibility, Open/Closed, and Liskov Substitution principles with code smell examples.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Liskov Violation Hunt', desc: 'Analyze a class hierarchy where overridden methods strengthen preconditions or throw `UnsupportedOperationException`.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'SRP Cohesion, Open/Closed Plugins & Liskov Contracts Lecture', desc: 'Walkthrough of decomposing God classes, designing OCP extension points, and enforcing LSP behavioral subtyping.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'SRP Refactoring Exercise & OCP Extensibility Lab', desc: 'Supervised practicum decomposing a monolithic `OrderManager` into SRP-compliant services and OCP plugin rules without modifying core code.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'LSP Contract Test Suite Implementation', desc: 'Write an abstract contract test class executed against all concrete subtypes to guarantee Liskov substitutability.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Square-Rectangle & ReadOnlyList LSP Critique', desc: 'Explain why `Square extends Rectangle` violates mutable geometric invariants at runtime.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 1, weight: '30', name: 'Profiling Analysis', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'LSP Precondition/Postcondition Check', desc: 'In-class diagnostic identifying behavioral subtyping violations.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'OCP Zero-Modification Extension Audit', desc: 'Formative check confirming new pricing/tax rules require zero edits to existing classes.' }
                ]
            },
            // ---------------- WEEK 4 (CO1 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 3, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Interface Segregation (ISP) & Dependency Inversion (DIP) Study', desc: 'Read Clean Architecture chapters on role interfaces, dependency inversion across architectural boundaries, and IoC wiring.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Interface Decoupling Challenge Prep', desc: 'Map out fat interface dependencies in a sample enterprise billing module and design segregated role interfaces.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'ISP Role Contracts & DIP Hexagonal Boundaries Seminar', desc: 'Live architectural refactoring inverting database and notification dependencies so the core domain has zero outward coupling.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Dependency Injection Lab: SOLID Domain Studio', desc: 'Studio laboratory completing the Prelim SOLID domain architecture using segregated interfaces and constructor dependency injection.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Prelim SOLID Architecture Repository Submission', desc: 'Submit the refactored, 100% SOLID-compliant domain codebase with dependency graph diagrams.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Static Dependency Analysis & Cyclic Package Audit', desc: 'Verify zero upward/circular package dependencies between domain, application, and infrastructure layers.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 2, weight: '50', name: 'Profiling Analysis', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Fat Interface Segregation Check', desc: 'In-class verification that no client is forced to depend on unused interface methods.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'DIP Constructor Injection Purity Audit', desc: 'Formative check confirming zero `new ConcreteInfra()` instantiations inside domain logic.' }
                ]
            },

            // ---------------- WEEK 5 (CO2 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 4, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Generic Type Erasure & Default Interface Methods Study', desc: 'Read Effective Java Item 26-30 on generic types, type erasure, bridge methods, and default interface methods.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Abstract Component Build Prep', desc: 'Inspect bytecode output (`javap -c`) of a generic class to observe compiler-inserted cast and bridge instructions.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Advanced Interfaces, Mixins & Generic Type Erasure Lecture', desc: 'In-depth lecture on stateful abstract classes vs. stateless interface mixins, generic type tokens (`Class<T>`), and heap pollution.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Generic Class Implementation Lab', desc: 'Hands-on laboratory building a type-safe heterogeneous container and a generic `Result<T, E>` union wrapper.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Composable Interface Mixin Library', desc: 'Implement reusable `Auditable`, `Identifiable<ID>`, and `Versioned` interfaces with default behavior composition.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Why `new T()` and `instanceof List<String>` Fail Under Erasure', desc: 'Explain runtime type erasure limitations and how `Class<T>` type tokens or `Supplier<T>` factories overcome them.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 3, weight: '20', name: 'Design Pattern Implementation', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Zero Unchecked Cast Warning Check', desc: 'Practical check confirming compilation with `-Xlint:unchecked` produces zero warnings.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Heterogeneous Type-Token Container Audit', desc: 'Formative review of `Class<T>.cast()` safety.' }
                ]
            },
            // ---------------- WEEK 6 (CO2 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 5, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Bloch PECS Rule (`? extends` / `? super`) & Concurrent Collections Study', desc: 'Study bounded wildcards, variance, `Comparable<? super T>`, and concurrent collections.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Invariant Generic Signature Failure Drill', desc: 'Examine why `List<Integer>` cannot be passed to a method accepting `List<Number>` and how wildcards resolve it.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Bounded Wildcards (PECS) & Comparator Combinators Seminar', desc: 'Walkthrough of Producer-Extends / Consumer-Super (PECS) signatures, recursive type bounds, and functional `Comparator` chains.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Wildcard Boundaries Exercise', desc: 'Supervised laboratory refactoring rigid collection utility methods to use maximally flexible `? extends T` and `? super T` wildcard bounds.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Generic Merge & Max Utility with Recursive Bounds', desc: 'Implement a generic `max(Collection<? extends T>)` where `<T extends Object & Comparable<? super T>>` and test across subtype hierarchies.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Covariance of Arrays vs. Invariance of Generics Note', desc: 'Contrast why `Object[] = new String[1]` compiles (and throws `ArrayStoreException` at runtime) while `List<Object> = new ArrayList<String>()` is caught at compile time.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 4, weight: '30', name: 'Design Pattern Implementation', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'PECS Producer/Consumer Signature Check', desc: 'In-class diagnostic applying `? extends` and `? super` to API method parameters.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Recursive Comparable Bound Verification', desc: 'Formative check that subclasses inheriting `Comparable` from a superclass compile cleanly.' }
                ]
            },
            // ---------------- WEEK 7 (CO2) ----------------
            {
                weekIdx: 6, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Urma Modern Java in Action: Lambdas & Immutability Study', desc: 'Read chapters on lambda expressions, lexical variable capture, method references, functional interfaces, and side-effect-free closures.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Lambda Syntax Drill', desc: 'Refactor anonymous inner classes (`Predicate`, `Comparator`, `Callable`) into concise lambda expressions and method references.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Functional Interfaces, Closures & Concurrency Pitfalls Lecture', desc: 'Instruction on composing `Predicate`/`Function` pipelines, avoiding primitive autoboxing, and preventing shared-state mutation race conditions inside lambdas.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Functional Interface Mapping Lab', desc: 'Hands-on laboratory building a declarative validation and transformation rule engine using composed `Predicate<T>` and `Function<T, R>` chains.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Side-Effect & Concurrency Audit in Functional Closures', desc: 'Eliminate external array/list mutations inside lambda bodies to guarantee thread-safe stateless execution.' },
                    { phase: 'postclass', by: 'S', lab: false, name: '`invokedynamic` vs. Anonymous Inner Class Bytecode Brief', desc: 'Explain how the JVM uses `invokedynamic` lambda metafactories instead of generating separate `.class` files.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Functional Rule Engine Composition Rubric', desc: 'Formative laboratory check of `Predicate.and/or/negate` and `Function.andThen` pipelines.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Effectively Final & Side-Effect Check', desc: 'In-class check identifying unsafe mutable state capture in lambdas.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Primitive Functional Specialization Check', desc: 'Verification of `IntPredicate`/`ToDoubleFunction` usage in hot loops.' }
                ]
            },
            // ---------------- WEEK 8 (CO2 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 7, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Baeldung & Urma Stream API Collectors & Spliterators Study', desc: 'Study lazy stream pipelines, `flatMap`, `reduce`, `Collectors.groupingBy`, `partitioningBy`, `teeing`, and parallel stream hazards.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Imperative Nested Loops to Stream Refactoring Prep', desc: 'Select five complex imperative data-aggregation loops with nested `if`/`for` blocks for functional refactoring.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Declarative Stream Pipelines & Multi-Level Collectors Seminar', desc: 'Live demonstration of lazy short-circuiting, `flatMap` flattening, downstream `groupingBy`/`mapping`/`reducing` collectors, and parallel stream benchmarks.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Stream API Pipeline Build & Declarative Data Filtering Lab', desc: 'Formal Midterm studio building an in-memory analytics engine using pure declarative Stream pipelines, custom collectors, and bounded generics.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Midterm Stream Analytics Engine Submission', desc: 'Submit the complete Midterm functional analytics engine with zero imperative loops and verified immutability.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'When Parallel Streams Are Slower Than Sequential Streams', desc: 'Analyze `ForkJoinPool` thread-coordination overhead, boxing costs, and poor `Spliterator` locality (`LinkedList`).' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 5, weight: '50', name: 'Design Pattern Implementation', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Downstream `groupingBy` & `flatMap` Check', desc: 'In-class verification of multi-level collector compositions.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Stateless Non-Interfering Stream Audit', desc: 'Formative check confirming zero shared mutable accumulator bugs.' }
                ]
            },

            // ---------------- WEEK 9 (CO3 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 8, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'GoF Creational Patterns: Singleton, Factory & Builder Study', desc: 'Read Head First Design Patterns (2nd Ed) and Refactoring.Guru on thread-safe Singletons, Factory Method, and Abstract Factory.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Multi-Threaded Singleton Race Condition Reproduction', desc: 'Run a 100-thread concurrency harness (`CountDownLatch`) that breaks a naive lazy Singleton into instantiating multiple instances.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Thread-Safe Singleton (Double-Checked Locking) & Registry Factories Lecture', desc: 'In-depth lecture on `volatile` memory barriers in double-checked locking, Enum singletons, and registry/reflection Factory Methods eliminating `switch` statements.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Thread-Safe Singleton Sandbox & Factory Method Sandbox', desc: 'Hands-on laboratory implementing volatile double-checked locking Singletons and refactoring a rigid switch-based object creator into a `Supplier<T>` registry / reflection Factory.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Cross-Platform Abstract Factory Toolkit Implementation', desc: 'Implement an Abstract Factory family producing matched UI/driver components without concrete class coupling.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Why `volatile` Is Mandatory in Double-Checked Locking', desc: 'Explain how CPU/compiler instruction reordering can expose a partially constructed object reference if `volatile` is omitted.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 6, weight: '20', name: 'Concurrency Project', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Double-Checked Locking & Registry Factory Check', desc: 'Practical check of thread-safe singleton stress tests and switch-free factory registration.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Abstract Factory Family Consistency Audit', desc: 'Formative verification of product family decoupling.' }
                ]
            },
            // ---------------- WEEK 10 (CO3 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 9, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'GoF Structural Patterns: Adapter, Decorator, Proxy & Composite Study', desc: 'Study Structural patterns in Gamma et al. (GoF) and Freeman & Robson.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Legacy Third-Party SDK Mismatch Inspection', desc: 'Inspect an incompatible legacy XML/currency library that must be integrated behind a modern domain interface.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Structural Wrappers: Adapter, Decorator & Dynamic Proxy Seminar', desc: 'Walkthrough of Object Adapters, composable Decorator chains (logging, caching, encryption, compression), and Composite tree structures.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Legacy Code Adapter Lab & Dynamic Decorator Construction', desc: 'Supervised practicum wrapping a legacy SDK via an Object Adapter and stacking runtime Decorator layers without subclass explosion.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Caching & Timing Protection Proxy Implementation', desc: 'Build a Decorator/Proxy wrapper that adds transparent LRU caching and execution-time telemetry to any service interface.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Decorator vs. Inheritance Combinatorial Explosion Math', desc: 'Compare class count growth when combining $N$ independent features via static inheritance ($2^N$) vs. Decorator composition ($N$).' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 7, weight: '30', name: 'Concurrency Project', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Adapter Target Interface Conformance Check', desc: 'In-class check confirming zero legacy SDK types leak into client code.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Decorator Chain Transparency Audit', desc: 'Formative check that arbitrary decorator nesting orders preserve interface behavior.' }
                ]
            },
            // ---------------- WEEK 11 (CO3) ----------------
            {
                weekIdx: 10, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'GoF Behavioral Patterns: Observer, Strategy & Command Study', desc: 'Read chapters on Observer event subscriptions, the Lapsed Listener memory leak problem, Strategy lambdas, and Command undo stacks.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Lapsed Listener Memory Leak Scenario Prep', desc: 'Inspect a publisher-subscriber system where short-lived views register with a long-lived subject and are never garbage-collected.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Observer Unregistration, Strategy Swapping & Command Undo Lecture', desc: 'Instruction on solving the Lapsed Listener problem via explicit `AutoCloseable` unregistration / `WeakReference`, Strategy functional injection, and Command undo/redo.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Observer Pattern Event Wiring Lab & Strategy Pattern Algorithm Swap', desc: 'Hands-on laboratory building a thread-safe Observer event bus with mandatory unregistering mechanisms and hot-swappable Strategy algorithms.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Transactional Command History with Undo/Redo Stack', desc: 'Implement reversible `Command` objects supporting multi-step undo and redo operations in a document/order editor.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Lapsed Listener Heap Retention Proof Note', desc: 'Document heap profiler evidence showing how unregistering listeners reclaims observer memory.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Observer Unregistration & Strategy Lab Rubric', desc: 'Formative laboratory check verifying explicit listener unregistration and runtime strategy swapping.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Command Undo/Redo State Symmetry Check', desc: 'In-class check confirming `execute()` followed by `undo()` restores exact prior state.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'WeakReference vs. Explicit Lifecycle Unsubscribe Audit', desc: 'Verification of memory leak prevention under repeated listener churn.' }
                ]
            },
            // ---------------- WEEK 12 (CO3 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 11, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Declarative UI Layouts, Event Routing & Async UI Study', desc: 'Study modern declarative UI component lifecycles, Grid vs. Flex layout managers, and non-blocking `CompletableFuture` UI updates.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Semifinal GoF Pattern-Driven UI Architecture Prep', desc: 'Wire Creational factories, Structural decorators, and Behavioral observers/commands into the declarative desktop UI.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Pattern-Driven Reactive UI & Event Routing Seminar', desc: 'Live demonstration of combining Observer property bindings, Command buttons, Strategy sorters, and responsive Grid/Flex layouts.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Declarative UI Layout Build & Event Listener Routing Drill', desc: 'Formal Semifinal defense and live studio demonstration of the pattern-driven event-driven UI application.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Listener Lifecycle & Async Responsiveness Polish', desc: 'Ensure all UI views cleanly unregister observers on close and offload heavy tasks from the UI thread.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'GoF Pattern Synergy in UI Frameworks Synthesis', desc: 'Map how Composite (component tree), Observer (listeners), Strategy (layout managers), and Command (actions) collaborate.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 8, weight: '50', name: 'Concurrency Project', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Grid vs. Flex Responsive Layout Check', desc: 'In-class verification of adaptive layout behavior across window dimensions.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'GoF Pattern Integration & Unsubscribe Audit', desc: 'Formative check of clean Creational, Structural, and Behavioral pattern usage.' }
                ]
            },

            // ---------------- WEEK 13 (CO4 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 12, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Jackson/Gson Polymorphic Serialization & NIO.2 Streams Study', desc: 'Study JSON/XML polymorphic serialization, NIO.2 `Files.lines()` lazy streams, and custom domain exception hierarchies.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Custom Exception Hierarchy & JSON Schema Prep', desc: 'Design a sealed/checked domain exception hierarchy and configure Jackson/Gson type adapters for polymorphic entities.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'NIO.2 High-Speed File Streams & Polymorphic JSON Lecture', desc: 'Lecture on memory-efficient `Files.lines` stream pipelines, atomic file writes, and preserving subtype metadata during JSON serialization.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'JSON Serialization Exercise & NIO.2 High-Speed File Parsing', desc: 'Hands-on laboratory streaming and parsing large NDJSON/CSV files via NIO.2 into polymorphic domain objects with structured exception auditing.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Exception Strategy Audit & Corrupt Record Quarantine', desc: 'Route malformed file records to a dead-letter quarantine file with detailed diagnostic context without aborting the stream pipeline.' },
                    { phase: 'postclass', by: 'S', lab: false, name: '`Files.readAllLines` vs. `Files.lines` Stream Heap Footprint Brief', desc: 'Compare heap allocation when processing a 2GB log file eagerly versus lazily via NIO.2 Stream.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 9, weight: '20', name: 'Enterprise Data Integration', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Polymorphic JSON Round-Trip & NIO.2 Check', desc: 'Practical check verifying subtype fidelity and automatic stream closure.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Domain Exception Context & Quarantine Audit', desc: 'Formative check of error recovery and diagnostic logging.' }
                ]
            },
            // ---------------- WEEK 14 (CO4 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 13, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'HikariCP Connection Pooling, DAO & SQLi Prevention Study', desc: 'Study HikariCP pool sizing formulas, `PreparedStatement` parameter binding, batch updates, and transaction isolation.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'HikariCP DataSource & SQL Migration Setup', desc: 'Configure `HikariConfig` (`maximumPoolSize`, `connectionTimeout`, `leakDetectionThreshold`) and initialize the relational test schema.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Enterprise DAO Architecture, Connection Pooling & SQLi Defense Seminar', desc: 'Walkthrough of HikariCP connection lifecycle, parameterized `PreparedStatement` batching, optimistic locking, and transaction rollback.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Database DAO Implementation, HikariCP Pool & SQL Injection Defense Lab', desc: 'Supervised laboratory building a pooled JDBC repository layer and verifying 100% immunity against SQL injection attack vectors.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Connection Pool Exhaustion & Leak Detection Stress Test', desc: 'Simulate 100 concurrent DAO threads to verify HikariCP pool queuing, zero connection leaks, and clean transaction rollback.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Why Smaller Connection Pools Often Outperform Huge Pools', desc: 'Analyze the PostgreSQL/HikariCP formula ($connections = (core\_count \times 2) + effective\_spindle\_count$) and disk/CPU context-switch overhead.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 10, weight: '30', name: 'Enterprise Data Integration', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'HikariCP Leak Detection & Pool Config Check', desc: 'In-class verification of zero leaked connections under load.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Parameterized PreparedStatement & SQLi Audit', desc: 'Formative check confirming all DAO queries use `?` parameter binding.' }
                ]
            },
            // ---------------- WEEK 15 (CO4) ----------------
            {
                weekIdx: 14, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Kent Beck TDD, JUnit 5 Parameterized Tests & Mockito Study', desc: 'Read Kent Beck\'s Test-Driven Development: By Example alongside JUnit 5 and Mockito official documentation.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'JUnit 5 & Mockito Test Harness Bootstrap', desc: 'Configure JUnit 5 Jupiter, AssertJ, Mockito (`@ExtendWith(MockitoExtension.class)`), and JaCoCo coverage reporting.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Unit Testing (JUnit 5), Test Doubles (Mockito) & TDD Lecture', desc: 'Instruction on Arrange-Act-Assert, `@ParameterizedTest`, stubbing DAO/gateway interfaces with Mockito, `ArgumentCaptor`, and Red-Green-Refactor.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'JUnit Test Writing Challenge & Mockito Stubbing Workshop', desc: 'Hands-on laboratory writing parameterized unit tests and Mockito behavioral verification tests isolating domain services from the database.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'TDD Red-Green-Refactor Lab: New Feature Kata', desc: 'Develop a new domain feature strictly following TDD (commit history showing failing Red test -> minimal Green pass -> SOLID Refactor).' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Classical (State) vs. London-School (Mockist) Testing Brief', desc: 'Compare state-verification testing using in-memory fakes against interaction-verification testing using mocks.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'JUnit 5 & Mockito Isolation Lab Rubric', desc: 'Formative laboratory check of parameterized boundary tests, `assertThrows`, and Mockito `verify`/`ArgumentCaptor` assertions.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Zero Database Hit in Unit Tests Check', desc: 'In-class check confirming service unit tests execute in milliseconds using mocked repositories.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'TDD Red-Green-Refactor Commit Trail Audit', desc: 'Verification of test-first git commit progression and >85% branch coverage.' }
                ]
            },
            // ---------------- WEEK 16 (CO4 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 15, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Capstone Enterprise OOP & TDD Architecture Dossier Prep', desc: 'Synthesize SOLID diagrams, GoF pattern justifications, Stream pipelines, HikariCP DAO persistence, and JaCoCo coverage reports.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Full Test Suite & Mutation Coverage Verification', desc: 'Run the complete JUnit 5 / Mockito unit and integration test suite to verify 100% green builds and zero resource leaks.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Enterprise Software Engineering Defense Briefing', desc: 'Instructor briefing on Rev 2 capstone defense standards: SOLID decoupling, thread-safe patterns, functional streams, and TDD rigor.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Capstone Enterprise Data Integration & TDD Defense', desc: 'Formal Final oral defense and live code demonstration of the enterprise OOP application, GoF patterns, pooled persistence, and automated test suite.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Archival Rev 2 Enterprise OOP Repository Release', desc: 'Tag the final v2.0.0 release containing source code, JUnit/Mockito tests, JaCoCo coverage badge, and architectural ADRs.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Rev 1 to Rev 2 Architectural Evolution Retrospective', desc: 'Reflect on how SOLID, Generics/Streams, GoF Patterns, and TDD transformed code testability and maintainability.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 11, weight: '50', name: 'Enterprise Data Integration', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'JaCoCo Branch Coverage & Test Suite Check', desc: 'Verification of comprehensive unit and DAO integration test pass.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'SOLID & GoF Architectural Sign-Off', desc: 'Final verification of clean enterprise OOP architecture and documentation.' }
                ]
            }
        ];

        const insertedTlasByWeek = [];

        for (const weekItem of weeklyTlasData) {
            const targetWeekId = weeks[weekItem.weekIdx].week_id;

            const tlaRows = weekItem.tlas.map(t => ({
                week_id: targetWeekId,
                tla_name: t.name,
                description: t.desc,
                performed_by: t.by,
                class_phase: t.phase,
                is_lab: Boolean(t.lab),
                is_orientation: Boolean(t.is_orientation),
                createdAt: now,
                updatedAt: now
            }));

            await queryInterface.bulkInsert('TeachingAndLearningActivities', tlaRows, {});

            const insertedTlas = await queryInterface.sequelize.query(
                `SELECT tla_id, tla_name FROM TeachingAndLearningActivities WHERE week_id = ${targetWeekId} ORDER BY tla_id ASC;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            insertedTlasByWeek.push(insertedTlas);

            const assessRows = weekItem.assessments.map(a => ({
                tla_id: insertedTlas[a.tlaIdx].tla_id,
                ilo_id: a.iloIdx !== null ? gradedIlos[a.iloIdx].ilo_id : null,
                name: a.name,
                description: a.desc,
                period: weekItem.period,
                weight: a.weight,
                min_passing: 60,
                createdAt: now,
                updatedAt: now
            }));

            await queryInterface.bulkInsert('TLAAssessments', assessRows, {});
        }

        // ============================================================================
        // 12. COMMENTS & COMMENT TARGETS (New 2026 Revision Trail - RESOLVED)
        // ============================================================================
        const subtopicsByWeek = [];
        for (let wIdx = 0; wIdx < 16; wIdx++) {
            const wId = weeks[wIdx].week_id;
            const subs = await queryInterface.sequelize.query(
                `SELECT subtopic_id, title FROM Subtopics WHERE week_id = ${wId} ORDER BY subtopic_id ASC;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            subtopicsByWeek.push(subs);
        }

        const icReturnDate = new Date('2026-06-15 14:05:00');
        const phReturnDate = new Date('2026-06-16 11:35:00');
        const resolutionDate = new Date('2026-06-22 08:50:00');

        const rawCommentsData = [
            // Industry Consultant focusing on Topics (Subtopics)
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "The topic outline for Lambda Expressions is missing critical coverage of side-effects and immutability. You must add a specific subtopic addressing state mutation and concurrency risks before this can be approved.",
                resolved_status: true,
                resolved_date: resolutionDate,
                week_id: weeks[6].week_id, // Week 7: Lambda Expressions Syntax
                comment_for: 'topics',
                target_id: subtopicsByWeek[6][2].subtopic_id, // 'State Mutation Pitfalls, Side-Effects, Immutability, and Concurrency Risks in Lambdas'
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "Your current topic breakdown for the Singleton pattern is too basic for an advanced course. Please revise the syllabus topics to explicitly include thread-safety mechanisms, specifically double-checked locking, as required subtopics.",
                resolved_status: true,
                resolved_date: resolutionDate,
                week_id: weeks[8].week_id, // Week 9: Creational Patterns: Singleton
                comment_for: 'topics',
                target_id: subtopicsByWeek[8][1].subtopic_id, // 'Thread-Safety Mechanisms: synchronized, Volatile Double-Checked Locking, and Bill Pugh Holder Idiom'
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            // Program Head focusing on TLAs
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "The description for the 'Factory Method Sandbox' TLA is currently too vague. Revise the TLA description in the learning plan to explicitly require the use of reflection or a registry pattern, rather than basic switch statements.",
                resolved_status: true,
                resolved_date: resolutionDate,
                week_id: weeks[8].week_id, // Week 9: Creational Patterns
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[8][3].tla_id, // 'Thread-Safe Singleton Sandbox & Factory Method Sandbox'
                createdAt: phReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "The 'Observer Pattern Event Wiring Lab' TLA must address the Lapsed Listener Problem. Update the TLA description and assessment criteria in the syllabus to explicitly require students to implement unregistering mechanisms.",
                resolved_status: true,
                resolved_date: resolutionDate,
                week_id: weeks[10].week_id, // Week 11: Behavioral Patterns: Observer
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[10][3].tla_id, // 'Observer Pattern Event Wiring Lab & Strategy Pattern Algorithm Swap'
                createdAt: phReturnDate,
                updatedAt: resolutionDate
            }
        ];

        await queryInterface.bulkInsert('Comments', rawCommentsData.map(c => ({
            co_assign_id: c.co_assign_id,
            stakeholder_id: c.commenter_role === 'INDUSTRY_CONSULTANT' ? '4' : '2',
            commenter_role: c.commenter_role,
            message: c.message,
            resolved_status: c.resolved_status,
            resolved_date: c.resolved_date,
            week_id: c.week_id,
            comment_for: c.comment_for,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        })), {});

        const insertedComments = await queryInterface.sequelize.query(
            `SELECT comment_id, message FROM Comments WHERE co_assign_id = ${assignId};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

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

        console.log("Successfully completed realistic workflow and comment log integration for APPROVED course BIT213L (REVISION 2) with 16-week structure.");
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};
