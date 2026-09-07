'use strict';

/**
 * Seeder: composition foundational data
 * - Inserts Departments, Programs, Courses, Prerequisites (assumes prerequisite_course_id exists),
 *   ProgramCourseOfferings, CourseOutcomes, ProgramOutcomes, ProgramOutcomeAlignments,
 *   CourseOfferingAssignments.
 *
 * Run: npx sequelize-cli db:seed:all
 */

module.exports = {
    async up (queryInterface, Sequelize) {
        const now = new Date();

        // 1) Departments
        await queryInterface.bulkInsert('Departments', [
            { dept_id: 1, stakeholder_id: null, name: 'School of Business and Accountancy', code: 'SBA', createdAt: now, updatedAt: now },
            { dept_id: 2, stakeholder_id: null, name: 'College of Engineering and Architecture', code: 'CEA', createdAt: now, updatedAt: now },
            { dept_id: 3, stakeholder_id: null, name: 'School of Computer and Information Sciences', code: 'SCIS', createdAt: now, updatedAt: now },
            { dept_id: 4, stakeholder_id: null, name: 'College of Nursing', code: 'CON', createdAt: now, updatedAt: now },
            { dept_id: 5, stakeholder_id: null, name: 'Criminal Justice Education', code: 'CJE', createdAt: now, updatedAt: now }
        ], {});

        // 2) Programs
        // Add the requested programs to dept_id = 3 (SCIS)
        await queryInterface.bulkInsert('Programs', [
            { program_id: 1, dept_id: 3, name: 'Bachelor of Science in Information Technology', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 2, dept_id: 3, name: 'Bachelor of Science in Computer Science', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 3, dept_id: 3, name: 'Associate in Computer Technology', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 4, dept_id: 3, name: 'Bachelor of Library and Information Science', stakeholder_id: null, createdAt: now, updatedAt: now },

            // Add a few programs for other departments so ProgramOutcomes can be attached
            { program_id: 5, dept_id: 1, name: 'Bachelor of Science in Accountancy', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 6, dept_id: 2, name: 'Bachelor of Science in Civil Engineering', stakeholder_id: null, createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
// 3) Courses
// course_id explicit so we can reference them in prerequisites and offerings
// ============================================================================
        await queryInterface.bulkInsert('Courses', [
            {
                course_id: 1,
                course_no: "BIT313L",
                course_title: 'Human and Computer Interaction',
                credit: '2 LEC, 1 LAB',
                contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
                classification: 'Professional Courses',
                cmo: 'CMO No. 25 S. 2015',
                year_lvl: 'THIRD YEAR',
                term: '1st Semester SY 2025-2026',
                createdAt: now, updatedAt: now
            },
            {
                course_id: 2,
                course_no: "BIT302",
                course_title: 'Web Development II',
                credit: '2 LEC, 1 LAB',
                contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
                classification: 'Professional Courses',
                cmo: 'CMO No. 12 S. 2018',
                year_lvl: 'SECOND YEAR',
                term: '2nd Semester SY 2024-2025',
                createdAt: now, updatedAt: now
            },
{
                course_id: 4,
                course_no: "BIT202",
                course_title: 'Software Engineering',
                credit: '3 LEC, 0 LAB',
                contact_hrs: '3 Hrs Lec, 0 Hrs Lab',
                classification: 'Core Courses',
                cmo: 'CMO No. 9 S. 2017',
                year_lvl: 'THIRD YEAR',
                term: '2nd Semester SY 2024-2025',
                createdAt: now, updatedAt: now
            },
            {
                course_id: 5,
                course_no: "BIT203",
                course_title: 'Mobile Application Development',
                credit: '2 LEC, 1 LAB',
                contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
                classification: 'Elective',
                cmo: 'CMO No. 14 S. 2019',
                year_lvl: 'THIRD YEAR',
                term: '1st Semester SY 2025-2026',
                createdAt: now, updatedAt: now
            },
            {
                course_id: 6,
                course_no: "BIT204",
                course_title: 'Network Security',
                credit: '2 LEC, 1 LAB',
                contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
                classification: 'Professional Courses',
                cmo: 'CMO No. 20 S. 2020',
                year_lvl: 'THIRD YEAR',
                term: '1st Semester SY 2025-2026',
                createdAt: now, updatedAt: now
            },
            {
                course_id: 7,
                course_no: "BIT205",
                course_title: 'Data Structures and Algorithms',
                credit: '2 LEC, 1 LAB',
                contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
                classification: 'Core Courses',
                cmo: 'CMO No. 7 S. 2016',
                year_lvl: 'SECOND YEAR',
                term: '2nd Semester SY 2024-2025',
                createdAt: now, updatedAt: now
            },
            {
                course_id: 8,
                course_no: "BIT206",
                course_title: 'Introduction to Artificial Intelligence',
                credit: '3 LEC, 0 LAB',
                contact_hrs: '3 Hrs Lec, 0 Hrs Lab',
                classification: 'Elective',
                cmo: 'CMO No. 22 S. 2021',
                year_lvl: 'THIRD YEAR',
                term: '2nd Semester SY 2025-2026',
                createdAt: now, updatedAt: now
            },
            {
                course_id: 9,
                course_no: "BIT207",
                course_title: 'Web Security and Performance',
                credit: '2 LEC, 1 LAB',
                contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
                classification: 'Elective',
                cmo: 'CMO No. 18 S. 2019',
                year_lvl: 'THIRD YEAR',
                term: '1st Semester SY 2025-2026',
                createdAt: now, updatedAt: now
            }
        ], {});



        // 4) Prerequisites
        // ASSUMPTION: Prerequisites table has columns: prerequisite_id (PK), course_id (the course that requires the prerequisite),
        // and prerequisite_course_id (the course that is the prerequisite).
        // - The user requested: "add a prerequisite id of the 'Web Development II' and assign it to the course id of 'Human and Computer Interaction'."
        //   Interpreting that as: Web Development II is a prerequisite for Human and Computer Interaction.
        await queryInterface.bulkInsert('Prerequisites', [
            // Web Development II (course_id=2) is prerequisite for HCI (course_id=1)
            { prerequisite_id: 1, course_id: 1, prerequisite_course_id: 2, createdAt: now, updatedAt: now },

            // Database Systems requires Data Structures
// Software Engineering requires Database Systems
// Mobile App Dev requires Web Dev II
// Network Security requires Data Structures
// AI requires Data Structures
// Web Security requires Web Dev II
], {});


        // 5) ProgramCourseOfferings
        // Create offering for HCI under BSIT (program_id = 1) and dept_id = 3 (SCIS)
        await queryInterface.bulkInsert('ProgramCourseOfferings', [
            {
                pc_offering_id: 1,
                revision_number: 1,
                course_id: 1,
                program_id: 1,
                dept_id: 3,
                course_description: `This course explores the principles and practices of Human-Computer Interaction (HCI), focusing on how people engage with digital systems and how to design technology that enhances user experience.

Students will examine user-centered design methodologies, usability principles, interaction design processes, and evaluation techniques. The course also emphasizes the integration of emerging technologies for software product design (UI/UX), equipping students with insights into modern tools and trends that shape interactive systems.

Through lectures, hands-on projects, and usability testing, learners will develop practical skills in designing intuitive and user-friendly interfaces that address real human needs. Drawing from foundational theories in psychology, design, and computer science, this course prepares students to create digital products that are both functional and forward-thinking, aligning with current and future developments in UI/UX design.`,
                createdAt: now, updatedAt: now
            },

            // 7 more realistic program course offerings (mix programs and courses)

        ], {});

        // --- CourseOutcomes (unchanged for HCI and other offerings) ---
        await queryInterface.bulkInsert('CourseOutcomes', [
            // HCI offering (pc_offering_id = 1)
            { co_id: 1, pc_offering_id: 1, co_description: 'CO1: Implement the core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing User Interface (UI) design for a software application.', createdAt: now, updatedAt: now },
            { co_id: 2, pc_offering_id: 1, co_description: 'CO2: Create User Experience (UX) designs for software applications by employing the User-Centered Design (UCD) process and integrating ISO 9241-210 standards', createdAt: now, updatedAt: now },
            { co_id: 3, pc_offering_id: 1, co_description: 'CO3: Develop a Front-End Prototype for the proposed software application that follows HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines', createdAt: now, updatedAt: now },
            { co_id: 4, pc_offering_id: 1, co_description: 'CO4: Defend the front-end prototype through usability testing and evaluation in UI/UX design.', createdAt: now, updatedAt: now },

], {});

// --- ProgramOutcomes (BSIT program_id = 1) create 10 POs ---
        const bsitPOs = [];
        for (let i = 1; i <= 10; i++) {
            bsitPOs.push({
                po_id: i,
                program_id: 1,
                description: `BSIT-PO${i}: Program outcome description ${i} (realistic outcome for BSIT).`,
                createdAt: now,
                updatedAt: now
            });
        }

// BSCS POs (continue ids 11..20)
        const bscsPOs = [];
        for (let i = 11; i <= 20; i++) {
            bscsPOs.push({
                po_id: i,
                program_id: 2,
                description: `BSCS-PO${i-10}: Program outcome description ${i-10} (realistic outcome for BSCS).`,
                createdAt: now,
                updatedAt: now
            });
        }

        await queryInterface.bulkInsert('ProgramOutcomes', [...bsitPOs], {});

// --- ProgramOutcomeAlignments (more scattered, cover PO1..PO10) ---
// Ensure mappings are varied (not diagonal) and include multiple PO links per CO where appropriate.
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            // HCI COs (co_id 1..4) mapped across many POs (1..10)
            { po_alignment_id: 1, co_id: 1, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 2, co_id: 1, po_id: 5, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 3, co_id: 1, po_id: 9, attainment_level: 'D', createdAt: now, updatedAt: now },

            { po_alignment_id: 4, co_id: 2, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 5, co_id: 2, po_id: 6, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 6, co_id: 2, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now },

            { po_alignment_id: 7, co_id: 3, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 8, co_id: 3, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 9, co_id: 3, po_id: 7, attainment_level: 'E', createdAt: now, updatedAt: now },

            { po_alignment_id: 10, co_id: 4, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 11, co_id: 4, po_id: 8, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 12, co_id: 4, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now },

], {});

        // 9) CourseOfferingAssignments
        // Each ProgramCourseOffering should have one CourseOfferingAssignment (1:1)
        // Streamlined to exclude all dropped role-specific date columns
        await queryInterface.bulkInsert('CourseOfferingAssignments', [
            // Draft: Human & Computer Interaction (no assigned/submitted dates)
            {
                pc_offering_id: 1,
                stakeholder_id: null,
                date_assigned: now,
                date_submitted: null,
                date_updated: null,
                createdAt: now,
                updatedAt: now
            },

        ], {});


        // ============================================================================
        // 1) References (Curated & Real-world Aligned)
        // ============================================================================
        const references = [
            // TEXTBOOKS (with standard ISBN, publication year, no link)
            { title: 'HCI Models, Theories, and Frameworks', author: 'John M. Carroll', isbn: '1-55860-808-7', link: null, publication_year: new Date('2003-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Learn Human-Computer Interaction', author: 'Christopher Reid', isbn: '978-1-83882-032-9', link: null, publication_year: new Date('2020-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Usability Testing Essentials', author: 'Carol M. Barnum', isbn: '978-0-12-375092-1', link: null, publication_year: new Date('2010-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'UX Design with Figma: User-Centered Interface Design and Prototyping with Figma', author: 'Tom Green & Kevin Golsby', isbn: '2945-7793', link: null, publication_year: new Date('2024-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Web Accessibility: Web Standards and Regulatory Compliance', author: 'Tom Green & Kevin Golsby', isbn: '978-1-59059-638-8', link: null, publication_year: new Date('2006-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },

            // ONLINE / OER / TECHNICAL GUIDELINES (with URLs)
            { title: 'Beyond Vibe-coding', author: 'Addy Osmani', isbn: null, link: 'https://oreilly.com', publication_year: new Date('2024-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'UX Design Principles', author: 'UXcel', isbn: null, link: 'https://app.uxcel.com', publication_year: new Date('2023-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Color Theory For Dummies', author: 'Eric Hibit', isbn: null, link: 'https://oreilly.com', publication_year: new Date('2022-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Universal Principles of Typography', author: 'Elliot Jay Stocks', isbn: null, link: 'https://oreilly.com', publication_year: new Date('2023-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Atomic Design', author: 'Brad Frost', isbn: null, link: 'https://atomicdesign.bradfrost.com', publication_year: new Date('2016-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Guide to Developer Handoff', author: 'Figma', isbn: null, link: 'https://figma.com', publication_year: new Date('2023-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'ISO 9241-210:2019 Ergonomics of human-system interaction', author: 'ISO', isbn: null, link: 'https://iso.org', publication_year: new Date('2019-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'UI Principles', author: 'Figma', isbn: null, link: 'https://figma.com', publication_year: new Date('2021-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Imagery', author: 'Figma', isbn: null, link: 'https://figma.com', publication_year: new Date('2021-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Design Guidelines', author: 'Material Design', isbn: null, link: 'https://m2.material.io', publication_year: new Date('2021-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Design Composition and Layout', author: '99Designs', isbn: null, link: 'https://99designs.com', publication_year: new Date('2020-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'UX Case Studies', author: 'Interaction Design Foundation', isbn: null, link: 'https://interaction-design.org', publication_year: new Date('2022-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Introduction to Generative AI', author: 'Google Certification', isbn: null, link: 'https://cloud.google.com', publication_year: new Date('2023-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'UXPilot', author: 'UXPilot', isbn: null, link: 'https://uxpilot.ai', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },

            // LINKEDIN LEARNING AI-DRIVEN DESIGN COURSES
            { title: 'The AI-Driven Product Designer', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Using AI in the UX Design Process', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Using AI for UX Design and Research', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Using AI Tools for UX Design', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Design Thinking in the Age of AI', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Ethical, Human-Centric AI Design', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Design to Code: Using AI to Build Faster', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'UNC Student Handbook', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: new Date('2024-06-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'CCS VMO Curated Materials', author: 'CCS Dean\'s Office', isbn: null, link: 'https://unc.edu.ph/ccs-vmo', publication_year: new Date('2024-06-01'), type: 'OER', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('References', references, {});

        // Fetch inserted references
        const refsRows = await queryInterface.sequelize.query(
            'SELECT reference_id, title, type FROM `References` ORDER BY reference_id ASC LIMIT 31;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 2) Intended Learning Outcomes (Structured with week, hours, assessment_tool)
        // ============================================================================
        const ilos = [
            // CO1 (Prelim Academic Period)
            { co_id: 1, description: " Cite the value and relevance \n" +
                    " of  the University's and the \n" +
                    " College's VMO as related to \n" +
                    " the course ", is_orientation: true, createdAt: now, updatedAt: now },
            { co_id: 1, description: 'Distinguish the core concepts, principles, and theories in designing user interfaces.', assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: 1, description: 'Determine how to use design tools proficiently in creating and refining user interface elements.', assessment_tool: 'Objective Type Activity (Figma)', createdAt: now, updatedAt: now },
            { co_id: 1, description: 'Propose a comprehensive User Interface (UI) design for a specified software application by applying the core HCI concepts, theories, and principles.', assessment_tool: 'UI Design Proposal', createdAt: now, updatedAt: now },

            // CO2 (Midterm Academic Period)
            { co_id: 2, description: 'Distinguish user research methodologies, user personas, and user-centered design (UCD) process frameworks.', assessment_tool: 'Objective Type Quiz (UCD)', createdAt: now, updatedAt: now },
            { co_id: 2, description: 'Determine how to build structurally-sound wireframes and layout compositions based on usability conventions.', assessment_tool: 'UCD Process Document', createdAt: now, updatedAt: now },
            { co_id: 2, description: 'Propose a cohesive User Experience (UX) wireframe package and user journey framework applying standard UCD principles.', assessment_tool: 'UI/UX Design Presentation', createdAt: now, updatedAt: now },

            // CO3 (Semifinal Academic Period)
            { co_id: 3, description: 'Distinguish dynamic visual architectures, advanced component patterns, and global accessibility standards.', assessment_tool: 'Objective Type Quiz (UX laws and Accessibility Standards)', createdAt: now, updatedAt: now },
            { co_id: 3, description: 'Determine how to implement screen reader and keyboard navigation considerations in interactive prototype elements.', assessment_tool: 'UI/UX Design Implementation Document', createdAt: now, updatedAt: now },
            { co_id: 3, description: 'Propose a fully-interactive high-fidelity mockup with micro-interactions, conforming to WCAG 2.1 regulatory standards.', assessment_tool: 'Front-end Code Presentation', createdAt: now, updatedAt: now },

            // CO4 (Final Academic Period)
            { co_id: 4, description: 'Distinguish qualitative and quantitative usability metrics, testing methodologies, and analytical protocols.', assessment_tool: 'Objective type Quiz (Usability Testing)', createdAt: now, updatedAt: now },
            { co_id: 4, description: 'Determine how to analyze user performance data, time-on-task, and error rates from moderated evaluative tests.', assessment_tool: 'Prototype Evaluation Document', createdAt: now, updatedAt: now },
            { co_id: 4, description: 'Propose a comprehensive Usability Evaluation and Design Handoff Report backed by empirical testing feedback.', assessment_tool: 'Front-End Prototype Presentation', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', ilos, {});

        // Fetch inserted ILOs
        const ilosRows = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, description FROM IntendedLearningOutcomes WHERE co_id IN (1,2,3,4) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 3) ILOReference: Assign relevant textbooks & OERs to each ILO
        // ============================================================================

        // Fetch and cache orientation ILO
        let orientationIloResult = await queryInterface.sequelize.query(
            'SELECT ilo_id FROM IntendedLearningOutcomes WHERE is_orientation = true LIMIT 1;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        let orientationIlo = orientationIloResult.length > 0 ? orientationIloResult[0] : null;

        const textbooks = refsRows.filter(r => r.type === 'TEXTBOOK');
        const others = refsRows.filter(r => r.type !== 'TEXTBOOK');
        const technicalIlos = ilosRows.filter(ilo => !ilo.is_orientation);

        const iloReferences = [];
        if (orientationIlo) {
            const studentHandbook = refsRows.find(r => r.title === 'UNC Student Handbook' || r.title === 'Student Handbook');
            const vmoMaterials = refsRows.find(r => r.title === 'CCS VMO Curated Materials' || r.title === 'Curated Material');

            if (studentHandbook) {
                iloReferences.push({ reference_id: studentHandbook.reference_id, ilo_id: orientationIlo.ilo_id, createdAt: now, updatedAt: now });
            }
            if (vmoMaterials) {
                iloReferences.push({ reference_id: vmoMaterials.reference_id, ilo_id: orientationIlo.ilo_id, createdAt: now, updatedAt: now });
            }
        }

        // Handle Technical References
        for (let i = 0; i < technicalIlos.length; i++) {
            const ilo = technicalIlos[i];
            const textbookRef = textbooks[i % textbooks.length];
            const onlineRef = others[i % others.length];

            if (textbookRef) {
                iloReferences.push({ reference_id: textbookRef.reference_id, ilo_id: ilo.ilo_id, createdAt: now, updatedAt: now });
            }
            if (onlineRef) {
                iloReferences.push({ reference_id: onlineRef.reference_id, ilo_id: ilo.ilo_id, createdAt: now, updatedAt: now });
            }
        }
        await queryInterface.bulkInsert('ILOReferences', iloReferences, {});

        // ============================================================================
        // 4) Topics (Original + 13 Added for 2 Topics/ILO logic)
        // ============================================================================
        const originalTopicTitles = [
            'Course Orientation and VMO Alignment',
            'Cognitive Models in HCI',
            'Introduction to Human-Computer Interaction (HCI)',
            'Introduction to User Interface (UI) Design',
            'Information Architecture and User Navigation Flow',
            'User-Centered Design (UCD) Frameworks and Persona Crafting',
            'Wireframing Essentials and Layout Compositions',
            'Visual Design and Gestalt Principles in User Interfaces',
            'Advanced Component Modeling and Responsive Systems in Figma',
            'Interactive Dynamic Prototyping and Micro-interaction Workflows',
            'Web Accessibility Standards (WCAG 2.1) and Auditing Protocols',
            'Usability Evaluation Metrics and Test Formulations',
            'Moderated Usability Testing Execution and Data Synthesis',
            'Empirically-Driven Layout Iterations and Developer Handoff'
        ];
        
        const topicsToInsert = [];
        let t_id = 1;
        
        for (const title of originalTopicTitles) {
            topicsToInsert.push({ title: title, createdAt: now, updatedAt: now });
        }
        
        const addedTopicTitles = [
            'Additional Orientation Activity (VMO Extension)',
            'Practical Exercises in Cognitive Models',
            'Interactive HCI Explorations',
            'Advanced UI Design Implementations',
            'Workshop on Information Architecture',
            'Creating High-Fidelity Personas',
            'Wireframing Sprints',
            'Applying Gestalt in UI Layouts',
            'Building Reusable Figma Components',
            'Micro-Interaction Prototyping Workshop',
            'Accessibility Auditing Sprint',
            'Usability Evaluation Planning',
            'Conducting Mock Testing Sessions'
        ];
        
        for (const title of addedTopicTitles) {
            topicsToInsert.push({ title: title, createdAt: now, updatedAt: now });
        }

        await queryInterface.bulkInsert('Topics', topicsToInsert, {});

        const topicsRows = await queryInterface.sequelize.query(
            'SELECT topic_id, title FROM `Topics` ORDER BY topic_id ASC;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 5) Subtopics Mapping
        // ============================================================================
        const subtopicsMap = {
            'Course Orientation and VMO Alignment': [
                'University and College VMO, Core Values, and Quality Policy',
                'Course Outline, Course Description, and Classroom Policies',
                'AI Usage Policy and Course Requirements'
            ],
            'Cognitive Models in HCI': [
                'GOMS Model',
                'Keystroke-Level Model (KLM)',
                'Fitts\'s Law & Hick\'s Law',
                'Mental Models & Conceptual Models',
            ],
            'Introduction to Human-Computer Interaction (HCI)': [
                'Human Factors in Interaction',
                'Computer Systems and Interface Components',
                'Interaction Models and Frameworks',
                'User Interface (UI) and User Experience (UX)',
                'Usability Principles and User-Centered Design (UCD)'
            ],
            'Introduction to User Interface (UI) Design': [
                'Fundamentals of UI Design',
                'Principles of UI Design',
                'Artificial Intelligence (AI) Tools for UI Design',
                'Etiquette in Utilizing AI Tools for UI Design',
                'Respect for Originality and Creativity',
                'Proper Attribution and Transparency',
                'Effective Prompt Engineering Practices for Better Results',
                'Ethical Use of AI-Generated Assets',
                'Privacy and Data Protection',
                'Critical Evaluation of AI Output'
            ],
            'Information Architecture and User Navigation Flow': [
                'Hierarchical structures and faceted navigation design patterns',
                'Sitemaps and comprehensive system flow diagrams',
                'Open versus closed card sorting protocols',
                'Data-driven categories for navigation optimization'
            ],
            'User-Centered Design (UCD) Frameworks and Persona Crafting': [
                'UCD lifecycle phases and core industry standards',
                'Target audience demographic and behavioral profiling',
                'Empathy mapping and scenario definition workflows',
                'Translating user research data into explicit feature requirements'
            ],
            'Wireframing Essentials and Layout Compositions': [
                'Sketching low-fidelity interface ideas and design constraints',
                'Digital wireframing software tools and layout options',
                'Grid structures, touch targets, and visual hierarchy grids',
                'Iterative user feedback loops for wireframe revision'
            ],
            'Visual Design and Gestalt Principles in User Interfaces': [
                'Gestalt principles of proximity, similarity, continuity, and closure',
                'Color theory, semantic palettes, contrast ratios, and readability',
                'Scale and typographical composition guidelines',
                'Whitespace allocation, density, and spatial balance'
            ],
            'Advanced Component Modeling and Responsive Systems in Figma': [
                'Structuring modular Figma parent components and UI tokens',
                'Creating flexible variants, variables, and properties',
                'Responsive design layouts using nested Auto Layout configurations',
                'Structuring scalable and collaborative team libraries'
            ],
            'Interactive Dynamic Prototyping and Micro-interaction Workflows': [
                'Interactive transitions, visual overlays, and smart animate features',
                'User-triggered motions, keyboard triggers, and delay states',
                'Structuring loading sequences and informative state modifications',
                'Designing form field validation flags and success notifications'
            ],
            'Web Accessibility Standards (WCAG 2.1) and Auditing Protocols': [
                'Global accessibility standards: Perceivable, Operable, Understandable, Robust',
                'Screen reader testing, focus order, and HTML document structures',
                'Accessible color contrast and alternative textual elements',
                'Formulating accessible keyboard-only navigation pathways'
            ],
            'Usability Evaluation Metrics and Test Formulations': [
                'Drafting ethical, comprehensive usability test plans',
                'Quantitative metrics: task completion rates, error logging, and time',
                'Qualitative models: think-aloud strategies and system questionnaires',
                'Writing clear, representative, unbiased user test scenarios'
            ],
            'Moderated Usability Testing Execution and Data Synthesis': [
                'Facilitating moderated research sessions with users',
                'Unbiased prompt scripts, objective moderation, and detail logging',
                'Applying the System Usability Scale (SUS) questionnaire',
                'Consolidating research insights across test cohorts'
            ],
            'Empirically-Driven Layout Iterations and Developer Handoff': [
                'Isolating high-priority design updates from evaluation logs',
                'Executing usability-informed layout revision sprints',
                'Figma developer handoff layouts, code inspections, and specs',
                'Writing comprehensive, professional evaluation reports'
            ]
        };

        const subtopicsToInsert = [];
        for (const t of topicsRows) {
            const subs = subtopicsMap[t.title] || ['Practical Component A', 'Practical Component B'];
            subs.forEach((subTitle, idx) => {
                subtopicsToInsert.push({
                    topic_id: t.topic_id,
                    title: subTitle,
                    sequence_order: idx + 1,
                    createdAt: now,
                    updatedAt: now
                });
            });
        }
        await queryInterface.bulkInsert('Subtopics', subtopicsToInsert, {});

        // ============================================================================
        // 6) ILOTopic Join Entries (2 Topics per ILO)
        // ============================================================================
        const iloTopicInserts = [];
        orientationIloResult = await queryInterface.sequelize.query(
            'SELECT ilo_id FROM IntendedLearningOutcomes WHERE is_orientation = true ORDER BY ilo_id LIMIT 1;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        orientationIlo = orientationIloResult.length > 0 ? orientationIloResult[0] : null;
        
        if (orientationIlo) {
            const otopic1 = topicsRows.find(t => t.title === 'Course Orientation and VMO Alignment');
            const otopic2 = topicsRows.find(t => t.title === 'Additional Orientation Activity (VMO Extension)');
            if (otopic1) iloTopicInserts.push({ ilo_id: Number(orientationIlo.ilo_id), topic_id: Number(otopic1.topic_id), createdAt: now, updatedAt: now });
            if (otopic2) iloTopicInserts.push({ ilo_id: Number(orientationIlo.ilo_id), topic_id: Number(otopic2.topic_id), createdAt: now, updatedAt: now });
        }

        const technicalIlosRows = await queryInterface.sequelize.query(
            'SELECT ilo_id FROM IntendedLearningOutcomes WHERE is_orientation = false OR is_orientation IS NULL ORDER BY ilo_id ASC;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // Orig topics (excluding orientation): index 1 to 13 (length 13)
        // Added topics (excluding VMO Extension): The array addedTopicTitles has VMO at index 0, so indices 14 to 26 in topicsRows
        const techTopics1 = topicsRows.slice(1, 14); 
        const techTopics2 = topicsRows.slice(15, 27); // 12 items. wait, 13 new topics, 1 is orientation, 12 technical.
        // Wait! We have 12 technical ILOs. So 12 added technical topics are perfect!
        
        
        // We have techTopics1 (length 13) and techTopics2 (length 12). Total 25 topics.
        // We have 12 technical ILOs.
        // Assign each of the 25 topics to an ILO sequentially to guarantee usage of all topics, 
        // ensuring each ILO gets at least 2 (25 / 12 = 2 with 1 remainder, so one gets 3).
        
        const combinedTechTopics = [...techTopics1, ...techTopics2];
        for (let i = 0; i < combinedTechTopics.length; i++) {
            const currentTopic = combinedTechTopics[i];
            const currentIlo = technicalIlosRows[i % technicalIlosRows.length];
            
            iloTopicInserts.push({
                ilo_id: Number(currentIlo.ilo_id),
                topic_id: Number(currentTopic.topic_id),
                createdAt: now,
                updatedAt: now
            });
        }

        await queryInterface.bulkInsert('ILOTopics', iloTopicInserts, {});

        const iloTopicsRows = await queryInterface.sequelize.query(
            'SELECT ilo_topic_id, ilo_id, topic_id FROM `ILOTopics` ORDER BY ilo_topic_id ASC;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 7) Teaching and Learning Activities (3 TLAs per ILO)
        // ============================================================================
        const allIlosRows = await queryInterface.sequelize.query(
            'SELECT ilo_id, is_orientation FROM IntendedLearningOutcomes ORDER BY ilo_id ASC;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        
        const tlasToInsert = [];
        
        // Ensure 3 TLA creation PER ILO!
        allIlosRows.forEach((ilo, idx) => {
            if (ilo.is_orientation) {
                tlasToInsert.push({ tla_name: 'VMO & Outcomes Reading Assignment', description: 'Read the materials on UNC VMO and CCS VMO, Program Educational Objectives (PEOs), and Program Outcomes (POs)', performed_by: 'S', class_phase: 'preclass', is_lab: true, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: 'Course Orientation Lecture & Collaborative Forum', description: 'The orientation will cover course outcomes and topic outline, assessment and evaluation activities, grading and class policies, and the flipped classroom approach. It will also introduce LinkedIn courses under MQUAP and explain the AI usage policy.', performed_by: 'T', class_phase: 'inclass', is_lab: false, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: 'VMO Visual Alignment Poster', description: 'Self-paced completion of the Google Introduction to Generative AI', performed_by: 'S', class_phase: 'postclass', is_lab: true, createdAt: now, updatedAt: now });
            } else {
                tlasToInsert.push({ tla_name: `Core Materials Reading (ILO ${idx+1})`, description: `Students execute self-paced prep learning by reading target chapters, lecture slides, and online course files.`, performed_by: 'S', class_phase: 'preclass', is_lab: true, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: `Structured Seminar (ILO ${idx+1})`, description: `An in-depth theoretical analysis and system discussion covering core criteria, system mechanics, and industry guidelines.`, performed_by: 'T', class_phase: 'inclass', is_lab: false, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: `Design Review & Implementation (ILO ${idx+1})`, description: `A practical laboratory follow-up where the instructor reviews the previous quizzes to identify common pain points.`, performed_by: 'S', class_phase: 'postclass', is_lab: true, createdAt: now, updatedAt: now });
            }
        });

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlasToInsert, {});
        
        const tlasRows = await queryInterface.sequelize.query(
            'SELECT tla_id, tla_name FROM TeachingAndLearningActivities ORDER BY tla_id ASC;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 8) TopicTLAs Assignment: Map 3 TLAs of an ILO to ALL its topics
        // ============================================================================
        const topicTlaInserts = [];
        
        const iloTopicGroups = {};
        iloTopicsRows.forEach(row => {
            if (!iloTopicGroups[row.ilo_id]) iloTopicGroups[row.ilo_id] = [];
            iloTopicGroups[row.ilo_id].push(row);
        });
        
        allIlosRows.forEach((ilo, i) => {
            const preTla = tlasRows[i * 3];
            const inTla = tlasRows[i * 3 + 1];
            const postTla = tlasRows[i * 3 + 2];
            const itRows = iloTopicGroups[ilo.ilo_id] || [];
            
            itRows.forEach(itRow => {
                if (preTla) topicTlaInserts.push({ ilo_topic_id: itRow.ilo_topic_id, tla_id: preTla.tla_id, createdAt: now, updatedAt: now });
                if (inTla) topicTlaInserts.push({ ilo_topic_id: itRow.ilo_topic_id, tla_id: inTla.tla_id, createdAt: now, updatedAt: now });
                if (postTla) topicTlaInserts.push({ ilo_topic_id: itRow.ilo_topic_id, tla_id: postTla.tla_id, createdAt: now, updatedAt: now });
            });
        });
        
        await queryInterface.bulkInsert('TopicTLAs', topicTlaInserts, {});

        // ============================================================================
        // 9) TLAAssessments: Map to exact assessment_tool & Weight Constraints (20, 30, 50)
        // ============================================================================
        const tlaAssessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];

        for (let i = 0; i < technicalIlosRows.length; i++) {
            const coIndex = Math.floor(i / 3);
            const iloIndex = i % 3;

            const currentPeriod = periods[coIndex];

            // In our structure, orientation is index 0. Technical ILOs start from array index 1 (corresponding to ILO 2).
            // TLA matching this ILO is at index (i + 1) * 3
            // The IN-CLASS TLA for this technical ILO is index (i + 1) * 3 + 1
            const assignedTlaId = tlasRows[(i + 1) * 3 + 1].tla_id;

            let assessmentName = '';
            let assessmentDescription = '';
            let assessmentWeight = '20';

            if (iloIndex === 0) {
                assessmentName = 'Objective-Type Quiz';
                assessmentWeight = '20';
                if (coIndex === 0) assessmentDescription = 'Covering interactive component theories and human cognitive load.';
                else if (coIndex === 1) assessmentDescription = 'Covering User-Centered Design paradigms and audience analysis methodologies.';
                else if (coIndex === 2) assessmentDescription = 'Ergonomic patterns and WCAG 2.1 compliance specifications.';
                else assessmentDescription = 'Covering evaluative protocol steps, metrics, and script guidelines.';
            } else if (iloIndex === 1) {
                assessmentWeight = '30';
                if (coIndex === 0) { assessmentName = 'Objective Type Activity'; assessmentDescription = 'Hands-on UI layout development exercise utilizing Figma component design engines.'; }
                else if (coIndex === 1) { assessmentName = 'UCD Process Document'; assessmentDescription = 'A formal process document containing research-driven user profiles, empathy maps, and system site flows.'; }
                else if (coIndex === 2) { assessmentName = 'UI/UX Design Implementation Document'; assessmentDescription = 'A detailed implementation document documenting accessibility features, color contrast compliance, and screen-reader focus hierarchies.'; }
                else { assessmentName = 'Prototype Evaluation Document'; assessmentDescription = 'A complete research report compiling recorded user error logs, System Usability Scale (SUS) surveys, and qualitative notes.'; }
            } else {
                assessmentWeight = '50';
                if (coIndex === 0) { assessmentName = 'UI Design Proposal'; assessmentDescription = 'A thorough system layout mock proposal document outlining visual composition strategies and interaction models.'; }
                else if (coIndex === 1) { assessmentName = 'UI/UX Design Presentation'; assessmentDescription = 'An interactive, formal presentation of high-priority wireframes, navigation configurations, and layout details.'; }
                else if (coIndex === 2) { assessmentName = 'Front-end Code Presentation'; assessmentDescription = 'An interactive front-end display demonstrating dynamic layout states, microcopy animations, and interactive component functions.'; }
                else { assessmentName = 'Front-End Prototype Presentation'; assessmentDescription = 'The final capstone defense presenting a validated system prototype optimized using feedback from user testing sessions.'; }
            }

            tlaAssessmentInserts.push({
                tla_id: assignedTlaId,
                name: assessmentName,
                description: assessmentDescription,
                period: currentPeriod,
                weight: assessmentWeight,
                min_passing: 60,
                createdAt: now,
                updatedAt: now
            });
        }

        await queryInterface.bulkInsert('TLAAssessments', tlaAssessmentInserts, {});
        // end here
console.log(`Successfully completed high-fidelity seeding of references, ILOs, Topics, and strictly aligned TLAs.`);
        // insert here
    },


    async down (queryInterface, Sequelize) {
        // Delete in reverse order to avoid FK constraint issues
        await queryInterface.bulkDelete('CourseOfferingAssignments', null, {});
        await queryInterface.bulkDelete('ProgramOutcomeAlignments', null, {});
        await queryInterface.bulkDelete('ProgramOutcomes', null, {});
        await queryInterface.bulkDelete('CourseOutcomes', null, {});
        await queryInterface.bulkDelete('ProgramCourseOfferings', null, {});
        await queryInterface.bulkDelete('Prerequisites', null, {});
        await queryInterface.bulkDelete('Courses', null, {});
        await queryInterface.bulkDelete('Programs', null, {});
        await queryInterface.bulkDelete('Departments', null, {});
        await queryInterface.bulkDelete('TLAAssessments', null, {});
        await queryInterface.bulkDelete('TopicTLAs', null, {});
        await queryInterface.bulkDelete('TeachingAndLearningActivities', null, {});
        await queryInterface.bulkDelete('ILOTopics', null, {});
        await queryInterface.bulkDelete('Subtopics', null, {});
        await queryInterface.bulkDelete('Topics', null, {});
        await queryInterface.bulkDelete('ILOReferences', null, {});
        await queryInterface.bulkDelete('IntendedLearningOutcomes', null, {});
        await queryInterface.bulkDelete('References', null, {});
    }

};
