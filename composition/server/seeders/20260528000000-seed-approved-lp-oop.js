'use strict';

/**
 * Seeder: Single Course Learning Plan - "Object-Oriented Programming"
 * Status Target: APPROVED
 * Revision: 1
 * Run: npx sequelize-cli db:seed --seed 20260528000000-seed-approved-lp-oop.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1) Course Creation
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

        const courseRecord = await queryInterface.sequelize.query(
            `SELECT course_id FROM Courses WHERE course_no = 'BIT213L' ORDER BY course_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const courseId = courseRecord[0].course_id;

        // ============================================================================
        // 2) Program Course Offering (Revision 1)
        // ============================================================================
        await queryInterface.bulkInsert('ProgramCourseOfferings', [{
            revision_number: 1,
            course_id: courseId,
            program_id: 1, // BSIT
            dept_id: 3,    // SCIS
            course_description: 'Covers fundamental concepts of object-oriented programming (OOP). Topics include classes, objects, inheritance, polymorphism, encapsulation, interfaces, exception handling, graphical user interface (GUI) development, file I/O, and database connectivity.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offeringRecord = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} AND revision_number = 1 ORDER BY pc_offering_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const pcId = offeringRecord[0].pc_offering_id;

        // ============================================================================
        // 3) Course Offering Assignment (STATUS: APPROVED)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: pcId,
            stakeholder_id: null,
            date_assigned: new Date('2025-06-01 09:00:00'),
            date_submitted: new Date('2025-06-15 10:00:00'),
            date_updated: new Date('2025-06-25 09:00:00'), // Resolution and resubmission date
            createdAt: now,
            updatedAt: now
        }], {});

        const assignment = await queryInterface.sequelize.query(
            `SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ${pcId} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const assignId = assignment[0].co_assign_id;

        // ============================================================================
        // 3.5) Assignment Workflow Logs (The Realistic Revision Trail)
        // ============================================================================
        await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', createdAt: new Date('2025-06-01 09:00:00'), updatedAt: new Date('2025-06-01 09:00:00') },
            { co_assign_id: assignId, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2025-06-15 10:00:00'), updatedAt: new Date('2025-06-15 10:00:00') },
            // Returns requiring revisions
            { co_assign_id: assignId, actor_role: 'INDUSTRY_CONSULTANT', action_type: 'RETURNED', createdAt: new Date('2025-06-18 14:00:00'), updatedAt: new Date('2025-06-18 14:00:00') },
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'RETURNED', createdAt: new Date('2025-06-19 11:30:00'), updatedAt: new Date('2025-06-19 11:30:00') },
            // Instructor fixes and resubmits
            { co_assign_id: assignId, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2025-06-25 09:00:00'), updatedAt: new Date('2025-06-25 09:00:00') },
            // Final Approvals
            { co_assign_id: assignId, actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', createdAt: new Date('2025-06-26 10:00:00'), updatedAt: new Date('2025-06-26 10:00:00') },
            { co_assign_id: assignId, actor_role: 'INDUSTRY_CONSULTANT', action_type: 'ACCEPTED', createdAt: new Date('2025-06-27 13:00:00'), updatedAt: new Date('2025-06-27 13:00:00') },
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'ACCEPTED', createdAt: new Date('2025-06-28 09:45:00'), updatedAt: new Date('2025-06-28 09:45:00') },
            { co_assign_id: assignId, actor_role: 'DEAN', action_type: 'ACCEPTED', createdAt: new Date('2025-07-02 15:00:00'), updatedAt: new Date('2025-07-02 15:00:00') }
        ], {});

        // ============================================================================
        // 4) Course Outcomes (4 records)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: pcId, co_description: 'CO1: Apply core object-oriented principles (encapsulation, inheritance, polymorphism) to design robust software models.', createdAt: now, updatedAt: now },
            { pc_offering_id: pcId, co_description: 'CO2: Implement abstract classes, interfaces, and generic programming to develop scalable software components.', createdAt: now, updatedAt: now },
            { pc_offering_id: pcId, co_description: 'CO3: Design event-driven graphical user interfaces (GUI) incorporating robust exception handling mechanisms.', createdAt: now, updatedAt: now },
            { pc_offering_id: pcId, co_description: 'CO4: Integrate file I/O operations and database connectivity mechanisms within object-oriented desktop applications.', createdAt: now, updatedAt: now }
        ], {});

        const cosRows = await queryInterface.sequelize.query(
            `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ${pcId} ORDER BY co_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 5) Program Outcome Alignments (3 per CO = 12 alignments)
        // ============================================================================
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            { co_id: cosRows[0].co_id, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, po_id: 6, attainment_level: 'D', createdAt: now, updatedAt: now },

            { co_id: cosRows[1].co_id, po_id: 2, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, po_id: 8, attainment_level: 'E', createdAt: now, updatedAt: now },

            { co_id: cosRows[2].co_id, po_id: 5, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, po_id: 7, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, po_id: 9, attainment_level: 'E', createdAt: now, updatedAt: now },

            { co_id: cosRows[3].co_id, po_id: 2, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, po_id: 3, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 6) Intended Learning Outcomes (1 Orientation + 12 Technical = 13 total)
        // ============================================================================
        const ilos = [
            // Orientation
            { co_id: cosRows[0].co_id, description: "Cite the value and relevance of the University's and the College's VMO as related to the course", is_orientation: true, createdAt: now, updatedAt: now },
            // CO1
            { co_id: cosRows[0].co_id, description: 'Define class blueprints and instantiate objects with appropriate state mapping.', assessment_tool: 'Objective Type Quiz', is_orientation: false, createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, description: 'Encapsulate class state using access modifiers and property methods.', assessment_tool: 'Code Refactoring Exercise', is_orientation: false, createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, description: 'Construct hierarchical relationships using inheritance and method overriding.', assessment_tool: 'Class Diagram Implementation', is_orientation: false, createdAt: now, updatedAt: now },
            // CO2
            { co_id: cosRows[1].co_id, description: 'Design abstract base classes to enforce structural contracts.', assessment_tool: 'Objective Type Quiz', is_orientation: false, createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, description: 'Implement multiple interfaces to achieve decoupling and polymorphism.', assessment_tool: 'Interface Design Task', is_orientation: false, createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, description: 'Utilize generic collections (Lists, Maps, Sets) for dynamic data storage.', assessment_tool: 'Data Structure Project', is_orientation: false, createdAt: now, updatedAt: now },
            // CO3
            { co_id: cosRows[2].co_id, description: 'Catch and handle runtime exceptions using try-catch-finally blocks.', assessment_tool: 'Objective Type Quiz', is_orientation: false, createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, description: 'Create graphical user interface layouts using standard library components.', assessment_tool: 'Wireframe to Code Activity', is_orientation: false, createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, description: 'Bind action listeners to UI components to handle user-driven events.', assessment_tool: 'Interactive App Prototype', is_orientation: false, createdAt: now, updatedAt: now },
            // CO4
            { co_id: cosRows[3].co_id, description: 'Serialize and deserialize object states into binary format.', assessment_tool: 'Objective Type Quiz', is_orientation: false, createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, description: 'Read and write unstructured text data using file input/output streams.', assessment_tool: 'File Parser Script', is_orientation: false, createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, description: 'Establish basic database connectivity (JDBC/ADO.NET) for persistent records.', assessment_tool: 'CRUD Application Integration', is_orientation: false, createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', ilos, {});

        const ilosRows = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, description, is_orientation FROM IntendedLearningOutcomes WHERE co_id IN (${cosRows.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const gradedIlos = ilosRows.filter(i => !i.is_orientation);

        // ============================================================================
        // 7) Weeks (4 weeks per CO = 16 Weeks, hours = 5.00 each)
        // ============================================================================
        const weeksToInsert = [];
        for (let cIdx = 0; cIdx < 4; cIdx++) {
            for (let w = 0; w < 4; w++) {
                weeksToInsert.push({
                    co_id: cosRows[cIdx].co_id,
                    hours: 5.00,
                    createdAt: now,
                    updatedAt: now
                });
            }
        }
        await queryInterface.bulkInsert('Weeks', weeksToInsert, {});

        const weeks = await queryInterface.sequelize.query(
            `SELECT week_id, co_id FROM Weeks WHERE co_id IN (${cosRows.map(c => c.co_id).join(',')}) ORDER BY week_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 8) References & WeeklyReferences (2 per Week = 32 WeeklyReferences)
        // ============================================================================
        const references = [
            { title: 'UNC Student Handbook', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: new Date('2024-06-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'CCS VMO Curated Materials', author: 'CCS Dean\'s Office', isbn: null, link: 'https://unc.edu.ph/ccs-vmo', publication_year: new Date('2024-06-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', isbn: '978-0132350884', link: null, publication_year: new Date('2008-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Effective Java (3rd Edition)', author: 'Joshua Bloch', isbn: '978-0134685991', link: null, publication_year: new Date('2018-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Head First Object-Oriented Analysis and Design', author: 'Brett D. McLaughlin, Gary Pollice & David West', isbn: '978-0596008673', link: null, publication_year: new Date('2006-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Head First Design Patterns', author: 'Eric Freeman & Elisabeth Robson', isbn: '978-0596007126', link: null, publication_year: new Date('2004-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Core Java Volume I: Fundamentals (12th Edition)', author: 'Cay S. Horstmann', isbn: '978-0137673629', link: null, publication_year: new Date('2021-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Oracle Java Platform Standard Edition Documentation', author: 'Oracle Corporation', isbn: null, link: 'https://docs.oracle.com/en/java/', publication_year: new Date('2025-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Microsoft C# Object-Oriented Programming Guide', author: 'Microsoft Developer Network', isbn: null, link: 'https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/', publication_year: new Date('2025-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Refactoring.Guru: OOP Principles & Design Patterns', author: 'Alexander Shvets', isbn: null, link: 'https://refactoring.guru/', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Object-Oriented Programming with Java (MOOC.fi)', author: 'University of Helsinki', isbn: null, link: 'https://java-programming.mooc.fi/', publication_year: new Date('2023-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'JavaFX & Swing Desktop GUI Architecture Guide', author: 'OpenJFX / Oracle', isbn: null, link: 'https://openjfx.io/', publication_year: new Date('2024-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('References', references, {});

        const refsRows = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT ${references.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const weekRefPairs = [
            [0, 1],   // Week 1: UNC Student Handbook & CCS VMO Curated Materials
            [4, 10],  // Week 2: Head First OOAD & MOOC.fi OOP
            [2, 6],   // Week 3: Clean Code & Core Java Vol I
            [3, 7],   // Week 4: Effective Java & Oracle Java Docs
            [4, 8],   // Week 5: Head First OOAD & Microsoft C# OOP Guide
            [3, 5],   // Week 6: Effective Java & Head First Design Patterns
            [3, 7],   // Week 7: Effective Java & Oracle Java Docs
            [5, 9],   // Week 8: Head First Design Patterns & Refactoring.Guru
            [2, 6],   // Week 9: Clean Code & Core Java Vol I
            [6, 11],  // Week 10: Core Java Vol I & JavaFX/Swing Guide
            [5, 11],  // Week 11: Head First Design Patterns & JavaFX/Swing Guide
            [9, 11],  // Week 12: Refactoring.Guru & JavaFX/Swing Guide
            [3, 6],   // Week 13: Effective Java & Core Java Vol I
            [6, 7],   // Week 14: Core Java Vol I & Oracle Java Docs
            [2, 7],   // Week 15: Clean Code & Oracle Java Docs
            [4, 9]    // Week 16: Head First OOAD & Refactoring.Guru
        ];

        const weeklyReferencesToInsert = [];
        for (let wIdx = 0; wIdx < 16; wIdx++) {
            const [r1, r2] = weekRefPairs[wIdx];
            weeklyReferencesToInsert.push({
                week_id: weeks[wIdx].week_id,
                reference_id: refsRows[r1].reference_id,
                is_orientation: wIdx === 0,
                createdAt: now,
                updatedAt: now
            });
            weeklyReferencesToInsert.push({
                week_id: weeks[wIdx].week_id,
                reference_id: refsRows[r2].reference_id,
                is_orientation: false,
                createdAt: now,
                updatedAt: now
            });
        }
        await queryInterface.bulkInsert('WeeklyReferences', weeklyReferencesToInsert, {});

        // ============================================================================
        // 9) Topics & Subtopics (2 Topics per Week = 32 Topics; 3 Subtopics per Topic = 96 Subtopics)
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
                            'University and College VMO, Core Values',
                            'Course Outline and Policies',
                            'AI Usage Policy'
                        ]
                    },
                    {
                        title: 'Paradigm Shift: Procedural vs. Object-Oriented Programming',
                        is_orientation: false,
                        subtopics: [
                            'Limitations of Global State in Procedural Programming',
                            'The Four Pillars of OOP: Encapsulation, Abstraction, Inheritance, and Polymorphism',
                            'Translating Real-World Domain Entities into Software Objects'
                        ]
                    }
                ]
            },
            {
                weekIdx: 1,
                topics: [
                    {
                        title: 'Classes, Objects, and State Mapping',
                        subtopics: [
                            'Defining Class Blueprints',
                            'The "new" Keyword and Instantiation',
                            'Constructors and "this" keyword'
                        ]
                    },
                    {
                        title: 'Object Lifecycle, Heap Memory, and Reference Semantics',
                        subtopics: [
                            'Stack Frames vs. Heap Object Allocation',
                            'Constructor Overloading, Chaining, and Default Initialization',
                            'Object References, Aliasing, Null Safety, and Garbage Collection Roots'
                        ]
                    }
                ]
            },
            {
                weekIdx: 2,
                topics: [
                    {
                        title: 'Encapsulation and Access Modifiers',
                        subtopics: [
                            'Public, Private, and Protected scopes',
                            'Getters and Setters',
                            'Data Hiding Principles'
                        ]
                    },
                    {
                        title: 'Class Invariants, Immutability, and Static Members',
                        subtopics: [
                            'Enforcing Object State Invariants Inside Mutator Methods',
                            'Designing Immutable Value Objects with Final/Readonly Fields',
                            'Static Class Variables, Constants, and Utility Methods vs. Instance State'
                        ]
                    }
                ]
            },
            {
                weekIdx: 3,
                topics: [
                    {
                        title: 'Inheritance and Method Overriding',
                        subtopics: [
                            'The "extends" keyword',
                            'Superclass Delegation',
                            'Method Overriding vs Overloading'
                        ]
                    },
                    {
                        title: 'UML Class Diagrams and Object Association Modeling',
                        subtopics: [
                            'UML Class Diagram Notation: Visibility, Attributes, and Operations',
                            'Modeling "Is-A" Generalization vs. "Has-A" Aggregation and Composition',
                            'Dynamic Method Dispatch (Virtual Method Tables) and `Object` Root Methods (`toString`, `equals`, `hashCode`)'
                        ]
                    }
                ]
            },

            // ---------------- CO2: Weeks 5 - 8 ----------------
            {
                weekIdx: 4,
                topics: [
                    {
                        title: 'Abstract Classes and Structural Contracts',
                        subtopics: [
                            'Defining Abstract Methods',
                            'Partial Implementations',
                            'When to use Abstract vs Concrete'
                        ]
                    },
                    {
                        title: 'The Template Method Pattern and Hook Operations',
                        subtopics: [
                            'Factoring Common Algorithmic Skeletons into Abstract Base Classes',
                            'Protected Hook Methods vs. Abstract Primitive Operations',
                            'Preventing Fragile Base Class Issues with Final Template Methods'
                        ]
                    }
                ]
            },
            {
                weekIdx: 5,
                topics: [
                    {
                        title: 'Interface Implementation and Polymorphism',
                        subtopics: [
                            'Interface Segregation',
                            'Multiple Inheritance via Interfaces',
                            'Dependency Injection using Interfaces'
                        ]
                    },
                    {
                        title: 'Runtime Polymorphism, Upcasting, and Loose Coupling',
                        subtopics: [
                            'Programming to an Interface Rather Than a Concrete Implementation',
                            'Polymorphic Collections, Upcasting, and Safe Type Downcasting (`instanceof`)',
                            'Strategy Pattern: Swapping Object Behaviors Dynamically at Runtime'
                        ]
                    }
                ]
            },
            {
                weekIdx: 6,
                topics: [
                    {
                        title: 'Generic Collections Framework',
                        subtopics: [
                            'Type Safety with Generics',
                            'Lists (ArrayList/LinkedList)',
                            'Maps and Sets (HashMap/HashSet)'
                        ]
                    },
                    {
                        title: 'Iterators, Comparators, and Custom Generic Classes',
                        subtopics: [
                            'Authoring Parameterized Generic Classes and Methods (`<T>`)',
                            'Natural Ordering (`Comparable`) vs. Custom Sorting Strategies (`Comparator`)',
                            'Fail-Fast Iterators, Enhanced For-Loops, and Hash Collision Resolution'
                        ]
                    }
                ]
            },
            {
                weekIdx: 7,
                topics: [
                    {
                        title: 'Modular Package Architecture and Component Decoupling',
                        subtopics: [
                            'Organizing Domain, Service, and Repository Packages/Namespaces',
                            'Constructor Injection and Factory Methods for Testable Components',
                            'Avoiding Circular Package Dependencies and Law of Demeter Violations'
                        ]
                    },
                    {
                        title: 'Midterm Object-Oriented Component Synthesis',
                        subtopics: [
                            'Integrating Abstract Hierarchies, Interfaces, and Generic Collections',
                            'Refactoring Procedural Switch Statements into Polymorphic Dispatch',
                            'Verifying Component Contracts with Automated Assertion Checks'
                        ]
                    }
                ]
            },

            // ---------------- CO3: Weeks 9 - 12 ----------------
            {
                weekIdx: 8,
                topics: [
                    {
                        title: 'Exception Handling and Try-Catch Mechanisms',
                        subtopics: [
                            'Checked vs Unchecked Exceptions',
                            'Try-Catch-Finally syntax',
                            'Custom Exception Generation'
                        ]
                    },
                    {
                        title: 'Defensive Programming, Resource Cleanup, and File Logging',
                        subtopics: [
                            'Exception Hierarchy (`Throwable`, `Error`, `Exception`, `RuntimeException`)',
                            'Automatic Resource Management (`try-with-resources` / `using` statements)',
                            'Structured Exception Logging to Flat Files Using Custom Logger Classes'
                        ]
                    }
                ]
            },
            {
                weekIdx: 9,
                topics: [
                    {
                        title: 'GUI Layout Design Basics',
                        subtopics: [
                            'Standard GUI Libraries (Swing/WPF)',
                            'Layout Managers (Border, Grid, Flow)',
                            'Component Hierarchy'
                        ]
                    },
                    {
                        title: 'Visual Containers, Controls, and Wireframe Translation',
                        subtopics: [
                            'Top-Level Windows (`JFrame`), Panels (`JPanel`), and Nested Composite Layouts',
                            'Form Controls: TextFields, ComboBoxes, Tables (`JTable`), and Dialog Modals',
                            'Translating UI Wireframes into Responsive Desktop Component Trees'
                        ]
                    }
                ]
            },
            {
                weekIdx: 10,
                topics: [
                    {
                        title: 'Event-Driven Programming and Listeners',
                        subtopics: [
                            'The Event Loop',
                            'Action and Mouse Listeners',
                            'Anonymous Inner Classes'
                        ]
                    },
                    {
                        title: 'Observer Pattern, Event Delegation, and UI Thread Safety',
                        subtopics: [
                            'The Event Delegation Model: Event Sources, Event Objects, and Listener Interfaces',
                            'Keyboard, Focus, and Window Lifecycle Event Adapters',
                            'Keeping the Event Dispatch Thread (EDT) Responsive During Background Tasks'
                        ]
                    }
                ]
            },
            {
                weekIdx: 11,
                topics: [
                    {
                        title: 'Model-View-Controller (MVC) Architecture in Desktop GUIs',
                        subtopics: [
                            'Separating Domain Models, GUI Views, and Event Controllers',
                            'Binding Domain Collection Updates to `TableModel` / Observable UI Lists',
                            'Input Validation and User-Friendly Error Dialogs in the Controller Layer'
                        ]
                    },
                    {
                        title: 'Interactive GUI Prototype Integration and Usability Polish',
                        subtopics: [
                            'Multi-Window Navigation, Menu Bars, Toolbars, and Keyboard Shortcuts',
                            'Stateful Form Workflows: Create, Edit, Search, and Confirmation Prompts',
                            'End-to-End Exception Recovery and Flat-File Error Logging in GUI Apps'
                        ]
                    }
                ]
            },

            // ---------------- CO4: Weeks 13 - 16 ----------------
            {
                weekIdx: 12,
                topics: [
                    {
                        title: 'Binary Serialization and Deserialization',
                        subtopics: [
                            'Serializable Interface',
                            'ObjectOutputStream',
                            'Transient Variables'
                        ]
                    },
                    {
                        title: 'Object Graph Persistence and Versioning (`serialVersionUID`)',
                        subtopics: [
                            'Deep Object Graph Serialization and Circular Reference Handling',
                            'Schema Evolution and `serialVersionUID` Compatibility Checks',
                            'Protecting Sensitive Fields During Serialization (`transient` and Custom Hooks)'
                        ]
                    }
                ]
            },
            {
                weekIdx: 13,
                topics: [
                    {
                        title: 'File I/O and Stream Operations',
                        subtopics: [
                            'Reading unstructured text',
                            'Writing to flat files',
                            'Buffer Management'
                        ]
                    },
                    {
                        title: 'File System Paths, CSV/JSON Parsing, and Character Streams',
                        subtopics: [
                            'Byte Streams (`InputStream`/`OutputStream`) vs. Character Streams (`Reader`/`Writer`)',
                            'Buffered I/O (`BufferedReader`/`BufferedWriter`) and NIO `Path`/`Files` Utilities',
                            'Parsing Structured Delimited Text (CSV/TSV) into Strongly-Typed Domain Objects'
                        ]
                    }
                ]
            },
            {
                weekIdx: 14,
                topics: [
                    {
                        title: 'Database Connectivity Fundamentals',
                        subtopics: [
                            'JDBC / ADO.NET Architecture',
                            'Connection Pooling and Prepared Statements',
                            'Executing Queries and Reading ResultSets'
                        ]
                    },
                    {
                        title: 'Data Access Object (DAO) Pattern and Transaction Management',
                        subtopics: [
                            'Encapsulating SQL Operations Behind Domain-Oriented DAO Interfaces',
                            'Preventing SQL Injection Using Parameterized `PreparedStatement` Placeholders',
                            'ACID Transaction Boundaries (`commit`, `rollback`) and Mapping `ResultSet` Rows to Entities'
                        ]
                    }
                ]
            },
            {
                weekIdx: 15,
                topics: [
                    {
                        title: 'Full-Stack Desktop OOP Application Synthesis',
                        subtopics: [
                            'Wiring MVC GUI Views to Service Classes, File Exporters, and JDBC DAOs',
                            'Configuration Management, Connection Pool Cleanup, and Application Packaging (Executable JAR)',
                            'Comprehensive Code Quality Review Against Clean Code and OOP Principles'
                        ]
                    },
                    {
                        title: 'Capstone Object-Oriented Application Defense',
                        subtopics: [
                            'Presenting UML Class Hierarchies, Interface Contracts, and DAO Architecture',
                            'Live Demonstration of Event-Driven GUI, File I/O Export, and Database CRUD Persistence',
                            'Oral Defense of Encapsulation, Polymorphism, Exception Logging, and SQLi Prevention'
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
        // 10) Teaching and Learning Activities (6 per Week = 96 TLAs)
        //     & 11) TLAAssessments (3 per Week = 48 Assessments; 3 per CO linked to gradedIlos)
        // ============================================================================
        const weeklyTlasData = [
            // ---------------- WEEK 1 (CO1) ----------------
            {
                weekIdx: 0, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'VMO & Outcomes Reading Assignment', desc: 'Read the materials on UNC VMO, Student Handbook, and course syllabus expectations.' },
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'Procedural vs. OOP Code Comparison Reading', desc: 'Examine a procedural C/script program alongside its refactored object-oriented equivalent.' },
                    { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation Lecture', desc: 'The orientation will cover course outcomes, topic outline, grading criteria, and institutional VMO alignment.' },
                    { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'IDE & JDK/SDK Environment Setup Workshop', desc: 'Configure IntelliJ IDEA / Visual Studio, compiler JDK/SDK toolchains, and Git version control.' },
                    { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO Visual Alignment Poster', desc: 'Create a visual poster connecting UNC core values and ethical AI usage to software craftsmanship.' },
                    { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Real-World Domain Object Identification Exercise', desc: 'Identify candidate classes, attributes, and behaviors from a university library business scenario.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Orientation & Syllabus Comprehension Check', desc: 'Formative check of course rules, grading weights, and VMO alignment.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'IDE & Compiler Verification Check', desc: 'In-class verification of working OOP compiler and debugger setup.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'VMO Alignment Poster Rubric', desc: 'Formative evaluation of the student VMO poster.' }
                ]
            },
            // ---------------- WEEK 2 (CO1 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 1, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Class Blueprints & Heap Instantiation Reading', desc: 'Read Horstmann Core Java chapters on class definitions, fields, constructors, and the `new` operator.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Constructor Overloading Trace Drill', desc: 'Trace stack frames and heap object addresses across overloaded constructors using `this()`.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Class Blueprints, Constructors & Memory Seminar', desc: 'Lecture on state mapping, instance vs. local variables, constructor chaining, and reference aliasing.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Object Instantiation & State Mapping Laboratory', desc: 'Hands-on laboratory designing domain classes (`Account`, `Student`, `Product`), instantiating objects, and inspecting heap state in the debugger.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Multi-Class Object Interaction Coding Task', desc: 'Implement collaborating classes where objects pass message references to invoke behaviors.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'NullPointerException & Reference Aliasing Case Log', desc: 'Analyze three code snippets exhibiting unintended state mutation due to shared object references.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 0, weight: '20', name: 'Objective Type Quiz', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Objective Type Quiz.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Class Blueprint & Constructor Lab Check', desc: 'Practical check of constructor overloading and `this` reference usage.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Object State Mapping Verification', desc: 'Formative check of object instantiation and method invocation.' }
                ]
            },
            // ---------------- WEEK 3 (CO1 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 2, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Clean Code Encapsulation & Access Modifiers Study', desc: 'Study visibility scopes (`private`, `protected`, `public`, package-private), getters/setters, and class invariants.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Exposed Mutable State Smell Hunt', desc: 'Identify encapsulation breaches in a legacy codebase with public fields and unvalidated setters.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Information Hiding, Invariants & Immutability Lecture', desc: 'Instruction on defensive copying, enforcing validation invariants inside setters/constructors, and designing immutable classes.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Code Refactoring Exercise: Encapsulation Lab', desc: 'Supervised laboratory refactoring anemic public-field classes into encapsulated domain models with strict invariant enforcement.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Immutable Value Object Implementation', desc: 'Build an immutable `Money` / `DateRange` class with `final` fields, defensive copies, and side-effect-free operations.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Tell-Don\'t-Ask Principle Critique', desc: 'Explain how excessive getter/setter chaining violates encapsulation and how moving behavior into the class fixes it.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 1, weight: '30', name: 'Code Refactoring Exercise', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Code Refactoring Exercise.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Access Modifier Visibility Matrix Check', desc: 'In-class quiz on subclass and cross-package visibility rules.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Defensive Copy & Invariant Audit', desc: 'Formative check confirming private collections cannot be mutated externally.' }
                ]
            },
            // ---------------- WEEK 4 (CO1 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 3, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Inheritance, `super` Delegation & UML Notation Study', desc: 'Read chapters on `extends`, superclass constructor chaining (`super()`), method overriding (`@Override`), and UML class diagrams.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'UML Class Hierarchy Blueprint Drafting', desc: 'Draft a UML class diagram modeling a multi-tier employee/payroll or vehicle hierarchy with associations and multiplicities.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Inheritance Hierarchies, Method Overriding & Dynamic Dispatch Seminar', desc: 'Walkthrough of `super` delegation, method overriding vs. overloading, `equals()`/`hashCode()` contracts, and composition vs. inheritance.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Class Diagram Implementation Studio', desc: 'Studio laboratory translating a formal UML Class Diagram specification into working inheritance hierarchies with overridden polymorphic methods.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Prelim UML-to-Code Portfolio Submission', desc: 'Submit the verified UML class diagram and complete source code implementation with unit tests.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Overriding `equals` and `hashCode` Contract Analysis', desc: 'Document why overriding `equals()` without overriding `hashCode()` breaks hash-based collections.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 2, weight: '50', name: 'Class Diagram Implementation', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Class Diagram Implementation.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'UML Multiplicity & Relationship Check', desc: 'In-class check distinguishing generalization, aggregation, and composition arrows.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Method Overriding & `super` Delegation Rubric', desc: 'Formative verification of `@Override` semantics and constructor chaining.' }
                ]
            },

            // ---------------- WEEK 5 (CO2 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 4, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Abstract Classes & Template Method Pattern Study', desc: 'Read Freeman & Bloch chapters on abstract classes, abstract method contracts, and the Template Method design pattern.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Duplicated Algorithm Hierarchy Audit', desc: 'Examine three concrete report-generator classes containing duplicated workflow steps and identify candidates for an abstract base class.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Abstract Base Classes & Structural Contracts Lecture', desc: 'In-depth lecture on abstract vs. concrete classes, partial implementations, protected hook operations, and enforcing structural contracts.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Abstract Hierarchy & Template Method Lab', desc: 'Hands-on laboratory extracting an abstract `DataExporter` / `PaymentProcessor` base class and implementing concrete subclasses.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Extensibility Stress-Test: Adding New Subclasses', desc: 'Extend the abstract framework with two new concrete subclasses without modifying a single line of the abstract base class.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Abstract Class vs. Concrete Superclass Decision Brief', desc: 'Justify when a base concept should be prohibited from direct instantiation via the `abstract` keyword.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 3, weight: '20', name: 'Objective Type Quiz', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Objective Type Quiz.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Abstract Method Contract Lab Check', desc: 'Practical check of abstract base class compilation and concrete override completeness.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Template Method Hook Extensibility Audit', desc: 'Formative check confirming zero code duplication across concrete subclasses.' }
                ]
            },
            // ---------------- WEEK 6 (CO2 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 5, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Interfaces, Polymorphism & Dependency Injection Reading', desc: 'Study interface segregation, multiple interface implementation, default methods, and constructor dependency injection.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Tightly Coupled Service Refactoring Prep', desc: 'Inspect a service class hardcoded to `new MySQLRepository()` and `new SmtpEmailSender()` that cannot be unit-tested offline.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Polymorphic Interfaces & Dependency Injection Seminar', desc: 'Walkthrough of decoupling components via interfaces, multiple inheritance of type, Strategy pattern, and constructor injection.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Interface Design Task: Decoupled Architecture Lab', desc: 'Supervised laboratory designing narrow interfaces and refactoring tightly coupled classes to accept interface dependencies via constructor injection.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Mock Implementation & Swappable Strategy Plug-In', desc: 'Implement an in-memory mock repository and swap it seamlessly into the service class via its interface contract.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Diamond Problem & Interface Default Methods Note', desc: 'Explain how Java/C# resolve conflicting default method implementations when a class implements multiple interfaces.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 4, weight: '30', name: 'Interface Design Task', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Interface Design Task.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Upcasting & Polymorphic Dispatch Check', desc: 'In-class trace of runtime method resolution across interface references.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Constructor Dependency Injection Audit', desc: 'Formative verification that high-level modules depend only on abstractions.' }
                ]
            },
            // ---------------- WEEK 7 (CO2) ----------------
            {
                weekIdx: 6, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Generic Collections Framework (`List`, `Set`, `Map`) Study', desc: 'Read Effective Java & Oracle documentation on parameterized types, `ArrayList` vs. `LinkedList`, `HashSet`, `HashMap`, and `Comparator`.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Raw Types vs. Generics Type-Safety Exercise', desc: 'Convert legacy raw `List`/`Map` code prone to `ClassCastException` into strongly-typed generic collections.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Generics, Hash Tables & Custom Comparators Lecture', desc: 'Instruction on algorithmic time complexity ($O(1)$ vs $O(n)$ vs $O(\log n)$) across `List`, `Set`, `Map`, custom generic `<T>` classes, and sorting.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Generic Collections & Multi-Key Sorting Lab', desc: 'Hands-on laboratory building a custom generic `Repository<T, ID>` and sorting/indexing domain objects using `Comparable` and chained `Comparator`s.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'HashMap Bucket Collision & Lookup Benchmark', desc: 'Compare lookup and insertion performance across `ArrayList`, `LinkedList`, `HashSet`, and `TreeSet` for 100,000 domain records.' },
                    { phase: 'postclass', by: 'S', lab: false, name: '`ConcurrentModificationException` & Safe Iteration Note', desc: 'Demonstrate why removing elements inside a for-each loop throws `ConcurrentModificationException` and how `Iterator.remove()` resolves it.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Generic Repository & Comparator Lab Rubric', desc: 'Formative laboratory check of type-safe `<T>` generics and custom sorting logic.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Collection Complexity Selection Check', desc: 'In-class diagnostic choosing optimal collection types for deduplication, FIFO queuing, and key-value indexing.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Hash Key Immutability Verification', desc: 'Verification that mutable fields are not used as `HashMap` keys.' }
                ]
            },
            // ---------------- WEEK 8 (CO2 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 7, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Component Packaging & Midterm Project Architecture Prep', desc: 'Review package modularity, interface-driven services, and generic collection indexing for the Midterm Data Structure Project.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Midterm Domain Model & Generic Store Scaffolding', desc: 'Scaffold the abstract base classes, service interfaces, and generic collection stores for the Midterm project.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Scalable OOP Component Architecture & Code Review Seminar', desc: 'Live architectural walkthrough combining abstract templates, polymorphic interfaces, dependency injection, and generic `Map`/`Set`/`List` engines.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Midterm Data Structure Project Studio & Defense', desc: 'Formal Midterm studio where students demonstrate their in-memory OOP engine utilizing abstract classes, interfaces, and generic collections.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Finalized Midterm Data Structure Project Submission', desc: 'Submit the complete Midterm codebase with comprehensive edge-case tests and UML component documentation.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Midterm Polymorphism & Generics Retrospective', desc: 'Document how generic types and interfaces eliminated code duplication and runtime cast errors.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 5, weight: '50', name: 'Data Structure Project', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Data Structure Project.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Interface & Abstract Hierarchy Cohesion Check', desc: 'In-class check of clean separation between contract interfaces and concrete implementations.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Generic Collection Memory & Search Audit', desc: 'Formative check of optimal `HashMap`/`TreeSet`/`ArrayList` usage in the Midterm project.' }
                ]
            },

            // ---------------- WEEK 9 (CO3 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 8, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Exception Hierarchy, Try-With-Resources & Custom Exceptions Study', desc: 'Read Clean Code Chapter 7 (Error Handling) and Effective Java chapters on checked vs. unchecked exceptions and resource cleanup.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Swallowed Exception & Resource Leak Audit', desc: 'Identify empty `catch (Exception e) {}` blocks and unclosed stream leaks in a buggy sample application.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Robust Exception Handling & Custom Logger Architecture Lecture', desc: 'In-depth lecture on call-stack unwinding, multi-catch blocks, `try-with-resources`, custom domain exceptions, and file-based error logging.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Exception Handling & Custom Domain Exception Lab', desc: 'Hands-on laboratory authoring custom domain exceptions (`InsufficientFundsException`, `DuplicateRecordException`) and wiring `try-catch-finally` recovery.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Exception Handling Post-Class Lab: Custom Flat-File Logger', desc: 'Implement a custom `Logger` class that captures exception stack traces, timestamps, and severity levels to a persistent flat log file rather than standard output.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Checked vs. Runtime Exceptions Design Philosophy Brief', desc: 'Compare Java\'s checked exception model with C#/Kotlin unchecked exceptions for recoverable vs. programming errors.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 6, weight: '20', name: 'Objective Type Quiz', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Objective Type Quiz.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Custom Exception & Stack Unwinding Check', desc: 'Practical check of exception chaining (`initCause` / `super(msg, cause)`) and `finally` execution.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Flat-File Logger Persistence Audit', desc: 'Formative verification that all caught exceptions are formatted and appended to `application.log`.' }
                ]
            },
            // ---------------- WEEK 10 (CO3 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 9, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'GUI Layout Design Reading & UI Wireframe Drafting', desc: 'Study desktop GUI layout managers (`BorderLayout`, `GridLayout`, `FlowLayout`, `GridBagLayout`/Flex) and draft complete UI wireframes before entering the coding lab.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Component Tree Hierarchy Sketching', desc: 'Annotate the drafted UI wireframe with exact container nesting (`JFrame` -> `JPanel` -> `JScrollPane` -> `JTable`) and layout constraints.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Desktop GUI Component Trees & Composite Layout Managers Seminar', desc: 'Demonstration of nested layout managers, responsive window resizing, typography/spacing borders, and tabular data display.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Wireframe to Code Activity: GUI Layout Construction Lab', desc: 'Supervised laboratory translating the pre-class UI wireframes into a pixel-accurate, resizable desktop GUI using standard library components.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Multi-Panel Master-Detail Form & Table Layout', desc: 'Build a master-detail split view combining a searchable data table panel with a validated input form sidebar.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Why Absolute Null-Layout Pixel Positioning Fails on HiDPI Screens', desc: 'Document how layout managers adapt to cross-platform OS font scaling and screen resolutions compared to hardcoded coordinates.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 7, weight: '30', name: 'Wireframe to Code Activity', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Wireframe to Code Activity.' },
                    { tlaIdx: 0, iloIdx: null, weight: '0', name: 'Pre-Lab UI Wireframe Completeness Check', desc: 'Verification of student UI wireframes and container hierarchy annotations prior to coding.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Responsive Window Resize & Layout Audit', desc: 'Formative check ensuring controls do not clip or overlap when the window is resized.' }
                ]
            },
            // ---------------- WEEK 11 (CO3) ----------------
            {
                weekIdx: 10, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Event Delegation Model & Observer Pattern Study', desc: 'Study the GUI Event Dispatch Loop, `ActionListener`, `MouseListener`, `KeyListener`, anonymous inner classes, and lambda listeners.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Event Source to Listener Wiring Diagram', desc: 'Map out all button clicks, table row selections, and keyboard shortcuts to their corresponding listener callbacks.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Event-Driven Programming, Listeners & EDT Responsiveness Lecture', desc: 'Instruction on wiring action/mouse/key listeners, updating UI models dynamically, and preventing Event Dispatch Thread (EDT) freezes.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Interactive Event Listener & Form Validation Lab', desc: 'Hands-on laboratory binding event listeners to GUI forms, implementing real-time input validation, and triggering modal error dialogs.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Dynamic Table Filtering & Keyboard Shortcut Integration', desc: 'Add live keystroke search filtering and keyboard accelerators (`Ctrl+S`, `Delete`, `Esc`) to the desktop GUI.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Observer Pattern in GUI Toolkits Analysis', desc: 'Trace how `addActionListener()` implements the classic Gang of Four Observer pattern to decouple UI widgets from business logic.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Event Listener Binding & Validation Rubric', desc: 'Formative laboratory check of responsive button/table/keyboard event handling and input validation.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'EDT Thread-Safety & `invokeLater` Check', desc: 'In-class check verifying UI mutations occur strictly on the Event Dispatch Thread.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Live Table Search & Modal Dialog Audit', desc: 'Verification of dynamic table model updates and user confirmation prompts.' }
                ]
            },
            // ---------------- WEEK 12 (CO3 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 11, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Desktop MVC Architecture & Exception Recovery Study', desc: 'Read guides on separating Model, View, and Controller classes in desktop GUI applications and integrating flat-file exception logging.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Semifinal Interactive App Prototype Assembly', desc: 'Connect the MVC controller, custom domain exceptions, flat-file logger, and generic collection stores to the desktop GUI views.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'MVC Decoupling & End-to-End GUI Exception Handling Seminar', desc: 'Live demonstration of refactoring bloated GUI event handlers into clean MVC controllers with graceful user alerts and background file logging.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Semifinal Interactive App Prototype Defense', desc: 'Formal Semifinal demonstration of the event-driven desktop application featuring complete CRUD state, custom exception handling, and responsive layouts.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'UI Polish & Controller Decoupling Refinement', desc: 'Refine MVC separation and tab-focus usability based on Semifinal critique feedback.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Smart UI Anti-Pattern vs. MVC Architecture Reflection', desc: 'Explain why embedding business rules and data storage directly inside button listener callbacks creates unmaintainable code.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 8, weight: '50', name: 'Interactive App Prototype', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Interactive App Prototype.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'MVC Layer Separation Check', desc: 'In-class verification that domain Model classes contain zero GUI library imports.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'User-Friendly Exception Modal & Log Check', desc: 'Formative check confirming runtime errors show clean UI dialogs while writing stack traces to disk.' }
                ]
            },

            // ---------------- WEEK 13 (CO4 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 12, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Binary Serialization, `ObjectOutputStream` & `transient` Study', desc: 'Read Effective Java & Horstmann chapters on `Serializable`, `ObjectOutputStream`/`ObjectInputStream`, `serialVersionUID`, and `transient` fields.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Object Graph Serialization Sandbox Prep', desc: 'Annotate domain entity classes with `Serializable` and explicit `serialVersionUID` constants.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Binary Object Serialization & State Persistence Lecture', desc: 'Lecture on serializing deep object graphs, protecting sensitive fields with `transient`, and handling `InvalidClassException` version mismatches.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Binary State Snapshot & Restore Laboratory', desc: 'Hands-on laboratory persisting and restoring complete application collection states to binary `.dat` snapshot files.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Transient Password Redaction & Custom `readObject` Hook', desc: 'Verify that `transient` credential fields are excluded from binary dumps and re-initialized safely upon deserialization.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Binary Serialization vs. Textual Formats Security Brief', desc: 'Analyze deserialization gadget-chain risks when deserializing untrusted binary streams.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 9, weight: '20', name: 'Objective Type Quiz', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Objective Type Quiz.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Object Graph Round-Trip Serialization Check', desc: 'Practical check verifying serialized and deserialized objects pass `.equals()` assertions.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Transient Field Hex-Dump Inspection', desc: 'Formative verification that `transient` secrets do not appear in the binary file.' }
                ]
            },
            // ---------------- WEEK 14 (CO4 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 13, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Buffered Character Streams & NIO File I/O Study', desc: 'Study `BufferedReader`, `BufferedWriter`, `Files`, `Path`, character encodings (`StandardCharsets.UTF_8`), and CSV/log parsing.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Malformed CSV & Unstructured Text Sample Prep', desc: 'Prepare sample multi-thousand-line CSV and unstructured log files containing quoted commas, blank lines, and malformed records.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'High-Performance Buffered File I/O & Text Parsing Seminar', desc: 'Walkthrough of byte vs. character streams, buffer sizing, `try-with-resources` stream closure, and resilient line-by-line parsing.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'File Parser Script: Import/Export Engine Practicum', desc: 'Supervised laboratory building a buffered file parser and exporter that converts unstructured/CSV text files into validated domain objects while logging malformed lines.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'GUI FileChooser Import/Export Integration', desc: 'Wire `JFileChooser` / file dialogs into the desktop GUI to allow users to import and export reports to CSV and text files.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Unbuffered vs. Buffered I/O Syscall Benchmark Note', desc: 'Measure elapsed wall-clock time reading a 50MB text file byte-by-byte (`FileReader`) versus buffered blocks (`BufferedReader`).' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 10, weight: '30', name: 'File Parser Script', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for File Parser Script.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'UTF-8 Encoding & `try-with-resources` Check', desc: 'In-class verification of explicit UTF-8 charset specification and automatic file handle closure.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Malformed Row Recovery & Export Audit', desc: 'Formative check ensuring a single corrupt line is logged and skipped without crashing the import.' }
                ]
            },
            // ---------------- WEEK 15 (CO4) ----------------
            {
                weekIdx: 14, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'JDBC / ADO.NET, PreparedStatements & DAO Pattern Study', desc: 'Study relational database drivers, connection pooling, parameterized `PreparedStatement` queries, `ResultSet` mapping, and the DAO pattern.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Local Relational Schema & JDBC Driver Setup', desc: 'Create the relational database schema (`CREATE TABLE`), add the JDBC/ADO.NET driver dependency, and configure connection properties.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Secure Database Connectivity, PreparedStatements & DAO Lecture', desc: 'Instruction on JDBC connection pooling, preventing SQL injection via parameterized `PreparedStatement`s, transaction commit/rollback, and DAO interfaces.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'DAO Implementation & SQL Injection Defense Lab', desc: 'Hands-on laboratory implementing a concrete JDBC Data Access Object (`create`, `findById`, `findAll`, `update`, `delete`) using `PreparedStatement` and connection pooling.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Transactional Batch Insert & Rollback Verification', desc: 'Implement a multi-table transactional workflow (`setAutoCommit(false)`) that cleanly rolls back all changes if a constraint violation occurs.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'String Concatenation SQL Injection Exploit Analysis', desc: 'Demonstrate how `' + "' OR '1'='1" + '` compromises concatenated `Statement` queries and how `PreparedStatement` parameter binding neutralizes it.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'DAO & Parameterized PreparedStatement Rubric', desc: 'Formative laboratory check verifying zero SQL string concatenation and proper `ResultSet`-to-object mapping.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Connection Pool & Resource Closure Check', desc: 'In-class check confirming `Connection`, `PreparedStatement`, and `ResultSet` are closed in `try-with-resources`.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'ACID Transaction Rollback Verification', desc: 'Verification of database state consistency after simulated mid-transaction failure.' }
                ]
            },
            // ---------------- WEEK 16 (CO4 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 15, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Full-Stack OOP Desktop Application Freeze & Defense Prep', desc: 'Finalize the integration of the MVC desktop GUI, file import/export parser, flat-file logger, and JDBC DAO persistence layer.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Executable Archive Packaging & Clean Database Smoke Test', desc: 'Package the application as an executable JAR/binary and test all CRUD and file I/O workflows against a fresh database.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Object-Oriented Software Craftsmanship & Defense Briefing', desc: 'Instructor briefing on final evaluation criteria: encapsulation, polymorphism, MVC separation, exception logging, and SQLi-safe persistence.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Capstone CRUD Application Integration Defense', desc: 'Formal Final oral defense and live demonstration of the complete object-oriented desktop application with database CRUD and file I/O.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Archival OOP Source Repository & UML Documentation Release', desc: 'Submit the final version-controlled repository, SQL schema script, updated UML class diagrams, and user manual.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Object-Oriented Programming Course Retrospective', desc: 'Complete a post-course reflection evaluating personal mastery across CO1-CO4 object-oriented competencies.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 11, weight: '50', name: 'CRUD Application Integration', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for CRUD Application Integration.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'End-to-End MVC to DAO Architecture Check', desc: 'Verification of clean layering from GUI View -> Controller -> Service Interface -> JDBC DAO.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Executable Package & Repository Sign-Off', desc: 'Final check of reproducible build, SQL schema script, and documentation.' }
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
        // 12) COMMENTS & COMMENT TARGETS (Actionable Workflow Trail - RESOLVED)
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

        const icReturnDate = new Date('2025-06-18 14:00:00');
        const phReturnDate = new Date('2025-06-19 11:30:00');
        const resolutionDate = new Date('2025-06-25 09:00:00');

        const rawCommentsData = [
            // Industry Consultant focusing on Topics (Subtopics)
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "REVISION REQUIRED: The topic 'Interface Implementation and Polymorphism' is currently too theoretical. Update the subtopics to explicitly include 'Dependency Injection using Interfaces', as this is a strict requirement for modern OOP architectures before approval.",
                resolved_status: true,
                resolved_date: resolutionDate,
                week_id: weeks[5].week_id, // Week 6: Interface Implementation and Polymorphism
                comment_for: 'topics',
                target_id: subtopicsByWeek[5][2].subtopic_id, // 'Dependency Injection using Interfaces'
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "SECURITY FLAW DETECTED: The topic 'Database Connectivity Fundamentals' needs revision. Please replace the generic 'CRUD Operations' subtopic with 'Connection Pooling and Prepared Statements' to prevent students from being taught SQL injection vulnerabilities by mistake.",
                resolved_status: true,
                resolved_date: resolutionDate,
                week_id: weeks[14].week_id, // Week 15: Database Connectivity Fundamentals
                comment_for: 'topics',
                target_id: subtopicsByWeek[14][1].subtopic_id, // 'Connection Pooling and Prepared Statements'
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            // Program Head focusing on TLAs
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "ACTION NEEDED: In the 'Exception Handling' post-class lab, the activity description relies on generic print stacks. Change the TLA requirements to strictly force students to log exceptions to a flat file using a custom Logger class. Standard output is not sufficient for this year level.",
                resolved_status: true,
                resolved_date: resolutionDate,
                week_id: weeks[8].week_id, // Week 9: Exception Handling
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[8][4].tla_id, // Post-class TLA: Custom Flat-File Logger
                createdAt: phReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "UPDATE REQUIRED: The 'GUI Layout Design' pre-class reading is insufficient as an activity. Add a strict requirement in this TLA description for students to specifically draft UI wireframes before entering the coding lab, to align with our software engineering design standards.",
                resolved_status: true,
                resolved_date: resolutionDate,
                week_id: weeks[9].week_id, // Week 10: GUI Layout Design Basics
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[9][0].tla_id, // Pre-class TLA: GUI Layout Design Reading & UI Wireframe Drafting
                createdAt: phReturnDate,
                updatedAt: resolutionDate
            }
        ];

        await queryInterface.bulkInsert('Comments', rawCommentsData.map(c => ({
            co_assign_id: c.co_assign_id,
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

        console.log("Successfully completed realistic workflow and ACTIONABLE comment log integration for APPROVED course BIT213L (Rev 1) with 16-week structure.");
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};
