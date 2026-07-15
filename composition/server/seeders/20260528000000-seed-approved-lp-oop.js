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
            course_description: 'Covers fundamental concepts of object-oriented programming (OOP). Topics include classes, objects, inheritance, polymorphism, encapsulation, interfaces, exception handling, and graphical user interface (GUI) development.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offeringRecord = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} ORDER BY pc_offering_id DESC LIMIT 1;`,
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
        // 4) Course Outcomes
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
        // 5) Program Outcome Alignments
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
        // 6) References
        // ============================================================================
        const references = [
            // Textbooks
            { title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', isbn: '978-0132350884', link: null, publication_year: new Date('2008-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Effective Java', author: 'Joshua Bloch', isbn: '978-0134685991', link: null, publication_year: new Date('2017-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Head First Design Patterns', author: 'Eric Freeman', isbn: '978-0596007126', link: null, publication_year: new Date('2004-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            // Online/OER
            { title: 'Oracle Java Documentation', author: 'Oracle', isbn: null, link: 'https://docs.oracle.com/en/java/', publication_year: new Date('2025-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Microsoft C# Programming Guide', author: 'Microsoft', isbn: null, link: 'https://learn.microsoft.com/en-us/dotnet/csharp/', publication_year: new Date('2025-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Refactoring.Guru', author: 'Alexander Shvets', isbn: null, link: 'https://refactoring.guru/', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            // Orientation Docs
            { title: 'UNC Student Handbook', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: new Date('2024-06-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'CCS VMO Curated Materials', author: 'CCS Dean\'s Office', isbn: null, link: 'https://unc.edu.ph/ccs-vmo', publication_year: new Date('2024-06-01'), type: 'OER', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('References', references, {});

        const refsRows = await queryInterface.sequelize.query(
            `SELECT reference_id, title, type FROM \`References\` ORDER BY reference_id DESC LIMIT ${references.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 7) Intended Learning Outcomes (1 Orientation + 12 Technical)
        // ============================================================================
        const ilos = [
            // Orientation
            { co_id: cosRows[0].co_id, description: "Cite the value and relevance of the University's and the College's VMO as related to the course", weeks: 1.0, hours: 2, is_orientation: true, createdAt: now, updatedAt: now },
            // CO1
            { co_id: cosRows[0].co_id, description: 'Define class blueprints and instantiate objects with appropriate state mapping.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, description: 'Encapsulate class state using access modifiers and property methods.', weeks: 1.0, hours: 5, assessment_tool: 'Code Refactoring Exercise', createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, description: 'Construct hierarchical relationships using inheritance and method overriding.', weeks: 2.0, hours: 10, assessment_tool: 'Class Diagram Implementation', createdAt: now, updatedAt: now },
            // CO2
            { co_id: cosRows[1].co_id, description: 'Design abstract base classes to enforce structural contracts.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, description: 'Implement multiple interfaces to achieve decoupling and polymorphism.', weeks: 1.0, hours: 5, assessment_tool: 'Interface Design Task', createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, description: 'Utilize generic collections (Lists, Maps, Sets) for dynamic data storage.', weeks: 2.0, hours: 10, assessment_tool: 'Data Structure Project', createdAt: now, updatedAt: now },
            // CO3
            { co_id: cosRows[2].co_id, description: 'Catch and handle runtime exceptions using try-catch-finally blocks.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, description: 'Create graphical user interface layouts using standard library components.', weeks: 1.0, hours: 5, assessment_tool: 'Wireframe to Code Activity', createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, description: 'Bind action listeners to UI components to handle user-driven events.', weeks: 2.0, hours: 10, assessment_tool: 'Interactive App Prototype', createdAt: now, updatedAt: now },
            // CO4
            { co_id: cosRows[3].co_id, description: 'Serialize and deserialize object states into binary format.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, description: 'Read and write unstructured text data using file input/output streams.', weeks: 1.0, hours: 5, assessment_tool: 'File Parser Script', createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, description: 'Establish basic database connectivity (JDBC/ADO.NET) for persistent records.', weeks: 2.0, hours: 10, assessment_tool: 'CRUD Application Integration', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', ilos, {});

        const ilosRows = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, description, is_orientation FROM IntendedLearningOutcomes WHERE co_id IN (${cosRows.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 8) ILOReferences Assignment
        // ============================================================================
        const orientationIlo = ilosRows.find(ilo => ilo.is_orientation);
        const textbooks = refsRows.filter(r => r.type === 'TEXTBOOK');
        const others = refsRows.filter(r => r.type !== 'TEXTBOOK');
        const technicalIlos = ilosRows.filter(ilo => !ilo.is_orientation);

        const iloReferences = [];

        if (orientationIlo) {
            const studentHandbook = refsRows.find(r => r.title.includes('UNC Student Handbook'));
            const vmoMaterials = refsRows.find(r => r.title.includes('CCS VMO'));
            if (studentHandbook) iloReferences.push({ reference_id: studentHandbook.reference_id, ilo_id: orientationIlo.ilo_id, createdAt: now, updatedAt: now });
            if (vmoMaterials) iloReferences.push({ reference_id: vmoMaterials.reference_id, ilo_id: orientationIlo.ilo_id, createdAt: now, updatedAt: now });
        }

        for (let i = 0; i < technicalIlos.length; i++) {
            const ilo = technicalIlos[i];
            const textbookRef = textbooks[i % textbooks.length];
            const onlineRef = others[i % others.length];
            if (textbookRef) iloReferences.push({ reference_id: textbookRef.reference_id, ilo_id: ilo.ilo_id, createdAt: now, updatedAt: now });
            if (onlineRef) iloReferences.push({ reference_id: onlineRef.reference_id, ilo_id: ilo.ilo_id, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ILOReferences', iloReferences, {});

        // ============================================================================
        // 9) Topics (13 mapped 1-to-1)
        // ============================================================================
        const topicTitles = [
            'Course Orientation and VMO Alignment',
            'Classes, Objects, and State Mapping',
            'Encapsulation and Access Modifiers',
            'Inheritance and Method Overriding',
            'Abstract Classes and Structural Contracts',
            'Interface Implementation and Polymorphism',
            'Generic Collections Framework',
            'Exception Handling and Try-Catch Mechanisms',
            'GUI Layout Design Basics',
            'Event-Driven Programming and Listeners',
            'Binary Serialization and Deserialization',
            'File I/O and Stream Operations',
            'Database Connectivity Fundamentals'
        ];

        await queryInterface.bulkInsert('Topics', topicTitles.map(t => ({ title: t, createdAt: now, updatedAt: now })), {});

        const topicsRows = await queryInterface.sequelize.query(
            `SELECT topic_id, title FROM Topics ORDER BY topic_id DESC LIMIT ${topicTitles.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 10) Subtopics
        // ============================================================================
        const subtopicsMap = {
            'Course Orientation and VMO Alignment': ['University and College VMO, Core Values', 'Course Outline and Policies', 'AI Usage Policy'],
            'Classes, Objects, and State Mapping': ['Defining Class Blueprints', 'The "new" Keyword and Instantiation', 'Constructors and "this" keyword'],
            'Encapsulation and Access Modifiers': ['Public, Private, and Protected scopes', 'Getters and Setters', 'Data Hiding Principles'],
            'Inheritance and Method Overriding': ['The "extends" keyword', 'Superclass Delegation', 'Method Overriding vs Overloading'],
            'Abstract Classes and Structural Contracts': ['Defining Abstract Methods', 'Partial Implementations', 'When to use Abstract vs Concrete'],
            'Interface Implementation and Polymorphism': ['Interface Segregation', 'Multiple Inheritance via Interfaces', 'Dependency Injection using Interfaces'], // DI added based on IC comment
            'Generic Collections Framework': ['Type Safety with Generics', 'Lists (ArrayList/LinkedList)', 'Maps and Sets (HashMap/HashSet)'],
            'Exception Handling and Try-Catch Mechanisms': ['Checked vs Unchecked Exceptions', 'Try-Catch-Finally syntax', 'Custom Exception Generation'],
            'GUI Layout Design Basics': ['Standard GUI Libraries (Swing/WPF)', 'Layout Managers (Border, Grid, Flow)', 'Component Hierarchy'],
            'Event-Driven Programming and Listeners': ['The Event Loop', 'Action and Mouse Listeners', 'Anonymous Inner Classes'],
            'Binary Serialization and Deserialization': ['Serializable Interface', 'ObjectOutputStream', 'Transient Variables'],
            'File I/O and Stream Operations': ['Reading unstructured text', 'Writing to flat files', 'Buffer Management'],
            'Database Connectivity Fundamentals': ['JDBC / ADO.NET Architecture', 'Connection Pooling and Prepared Statements', 'Executing Queries and Reading ResultSets'] // Prepared statements added based on IC comment
        };

        const subtopicsToInsert = [];
        for (const t of topicsRows) {
            const subs = subtopicsMap[t.title] || [];
            subs.forEach((subTitle, idx) => {
                subtopicsToInsert.push({ topic_id: t.topic_id, title: subTitle, sequence_order: idx + 1, createdAt: now, updatedAt: now });
            });
        }
        await queryInterface.bulkInsert('Subtopics', subtopicsToInsert, {});

        // ============================================================================
        // 11) ILOTopics (1-to-1 Mapping)
        // ============================================================================
        const iloTopicInserts = [];
        for (let i = 0; i < ilosRows.length; i++) {
            iloTopicInserts.push({
                ilo_id: Number(ilosRows[i].ilo_id),
                topic_id: Number(topicsRows[i].topic_id),
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('ILOTopics', iloTopicInserts, {});

        const iloTopicsRows = await queryInterface.sequelize.query(
            `SELECT ilo_topic_id FROM ILOTopics ORDER BY ilo_topic_id DESC LIMIT ${topicTitles.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 12) Teaching and Learning Activities (3 per Topic)
        // ============================================================================
        const tlasToInsert = [];
        topicsRows.forEach((topic) => {
            if (topic.title === 'Course Orientation and VMO Alignment') {
                tlasToInsert.push({ tla_name: 'VMO Reading', description: 'Read materials on UNC VMO and PEOs', performed_by: 'S', class_phase: 'preclass', is_lab: true, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: 'Course Orientation Lecture', description: 'Interactive orientation covering course outcomes and topics.', performed_by: 'T', class_phase: 'inclass', is_lab: false, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: 'VMO Visual Alignment Poster', description: 'Self-paced completion of the alignment poster.', performed_by: 'S', class_phase: 'postclass', is_lab: true, createdAt: now, updatedAt: now });
            } else {
                tlasToInsert.push({ tla_name: `Pre-Class Reading: ${topic.title}`, description: `Students execute self-paced prep learning. Note: For GUI Layouts, students must specifically draft UI wireframes prior to entering the coding lab.`, performed_by: 'S', class_phase: 'preclass', is_lab: true, createdAt: now, updatedAt: now }); // Wireframe drafting added based on PH comment
                tlasToInsert.push({ tla_name: `Interactive Seminar: ${topic.title}`, description: `In-depth lecture and live syntax demonstration by the instructor covering core criteria of the topic.`, performed_by: 'T', class_phase: 'inclass', is_lab: false, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: `Implementation Lab: ${topic.title}`, description: `Practical lab. Note: For Exception Handling, students are strictly required to log generated exceptions to a persistent flat file using a custom Logger class rather than relying on generic print stack traces.`, performed_by: 'S', class_phase: 'postclass', is_lab: true, createdAt: now, updatedAt: now }); // Logging requirement added based on PH comment
            }
        });

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlasToInsert, {});

        const tlasRows = await queryInterface.sequelize.query(
            `SELECT tla_id FROM TeachingAndLearningActivities ORDER BY tla_id DESC LIMIT ${tlasToInsert.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 13) TopicTLAs Assignment
        // ============================================================================
        const topicTlaInserts = [];
        for (let i = 0; i < iloTopicsRows.length; i++) {
            const jRow = iloTopicsRows[i];
            topicTlaInserts.push(
                { ilo_topic_id: jRow.ilo_topic_id, tla_id: tlasRows[i * 3].tla_id, createdAt: now, updatedAt: now },
                { ilo_topic_id: jRow.ilo_topic_id, tla_id: tlasRows[i * 3 + 1].tla_id, createdAt: now, updatedAt: now },
                { ilo_topic_id: jRow.ilo_topic_id, tla_id: tlasRows[i * 3 + 2].tla_id, createdAt: now, updatedAt: now }
            );
        }
        await queryInterface.bulkInsert('TopicTLAs', topicTlaInserts, {});

        // ============================================================================
        // 14) TLAAssessments (20/30/50 Weight Mapping)
        // ============================================================================
        const tlaAssessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];

        // Filter out the orientation ILO to only map assessments to the 12 technical ILOs
        const technicalIloTopics = iloTopicsRows.slice(1);

        for (let i = 0; i < technicalIloTopics.length; i++) {
            const coIndex = Math.floor(i / 3);
            const iloIndex = i % 3;
            const currentPeriod = periods[coIndex];

            // Assigned TLA matches the IN-CLASS phase of the specific topic (i + 1 due to orientation offset)
            const assignedTlaId = tlasRows[(i + 1) * 3 + 1].tla_id;

            let assessmentName = '';
            let assessmentWeight = '20';

            if (iloIndex === 0) {
                assessmentName = 'Objective Type Quiz';
                assessmentWeight = '20';
            } else if (iloIndex === 1) {
                assessmentName = coIndex === 0 ? 'Code Refactoring Exercise' : (coIndex === 1 ? 'Interface Design Task' : (coIndex === 2 ? 'Wireframe to Code Activity' : 'File Parser Script'));
                assessmentWeight = '30';
            } else {
                assessmentName = coIndex === 0 ? 'Class Diagram Implementation' : (coIndex === 1 ? 'Data Structure Project' : (coIndex === 2 ? 'Interactive App Prototype' : 'CRUD Application Integration'));
                assessmentWeight = '50';
            }

            tlaAssessmentInserts.push({
                tla_id: assignedTlaId,
                name: assessmentName,
                description: `Summative evaluation metric testing OOP competency and syntax accuracy for ${assessmentName}.`,
                period: currentPeriod,
                weight: assessmentWeight,
                min_passing: 60,
                createdAt: now,
                updatedAt: now
            });
        }
        await queryInterface.bulkInsert('TLAAssessments', tlaAssessmentInserts, {});

        // ============================================================================
        // 15. COMMENTS & COMMENT TARGETS (Actionable Workflow Trail)
        // ============================================================================
        const icReturnDate = new Date('2025-06-18 14:00:00');
        const phReturnDate = new Date('2025-06-19 11:30:00');
        const resolutionDate = new Date('2025-06-25 09:00:00');

        const rawCommentsData = [
            // ---------------------------------------------------------
            // Industry Consultant focusing on Topics
            // ---------------------------------------------------------
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "REVISION REQUIRED: The topic 'Interface Implementation and Polymorphism' is currently too theoretical. Update the subtopics to explicitly include 'Dependency Injection using Interfaces', as this is a strict requirement for modern OOP architectures before approval.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilosRows[5].ilo_id, // Maps to Topic 5: Interface Implementation
                comment_for: 'topics',
                target_id: topicsRows[5].topic_id,
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                message: "SECURITY FLAW DETECTED: The topic 'Database Connectivity Fundamentals' needs revision. Please replace the generic 'CRUD Operations' subtopic with 'Connection Pooling and Prepared Statements' to prevent students from being taught SQL injection vulnerabilities by mistake.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilosRows[12].ilo_id, // Maps to Topic 12: DB Connectivity
                comment_for: 'topics',
                target_id: topicsRows[12].topic_id,
                createdAt: icReturnDate,
                updatedAt: resolutionDate
            },
            // ---------------------------------------------------------
            // Program Head focusing on TLAs
            // ---------------------------------------------------------
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "ACTION NEEDED: In the 'Exception Handling' post-class lab, the activity description relies on generic print stacks. Change the TLA requirements to strictly force students to log exceptions to a flat file using a custom Logger class. Standard output is not sufficient for this year level.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilosRows[7].ilo_id, // Maps to Topic 7 (Exception Handling)
                comment_for: 'tlas',
                target_id: tlasRows[7 * 3 + 2].tla_id, // Post-class TLA for Exception Handling
                createdAt: phReturnDate,
                updatedAt: resolutionDate
            },
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                message: "UPDATE REQUIRED: The 'GUI Layout Design' pre-class reading is insufficient as an activity. Add a strict requirement in this TLA description for students to specifically draft UI wireframes before entering the coding lab, to align with our software engineering design standards.",
                resolved_status: true,
                resolved_date: resolutionDate,
                ilo_id: ilosRows[8].ilo_id, // Maps to Topic 8 (GUI Layouts)
                comment_for: 'tlas',
                target_id: tlasRows[8 * 3 + 0].tla_id, // Pre-class TLA for GUI Layouts
                createdAt: phReturnDate,
                updatedAt: resolutionDate
            }
        ];

        // Insert Comments
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

        const insertedComments = await queryInterface.sequelize.query(
            `SELECT comment_id, message FROM Comments WHERE co_assign_id = ${assignId};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // Map to CommentTargets
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

        console.log(`Successfully completed realistic workflow and ACTIONABLE comment log integration for APPROVED course BIT213L (Rev 1).`);
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};