'use strict';

/**
 * Seeder: composition foundational data
 * - Inserts Departments, Programs, Courses, Prerequisites (assumes prerequisite_course_id exists),
 * ProgramCourseOfferings, CourseOutcomes, ProgramOutcomes, ProgramOutcomeAlignments,
 * CourseOfferingAssignments.
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
                course_id: 3,
                course_no: "BIT201",
                course_title: 'Database Systems',
                credit: '2 LEC, 1 LAB',
                contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
                classification: 'Core Courses',
                cmo: 'CMO No. 8 S. 2017',
                year_lvl: 'SECOND YEAR',
                term: '1st Semester SY 2024-2025',
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
        await queryInterface.bulkInsert('Prerequisites', [
            { prerequisite_id: 1, course_id: 1, prerequisite_course_id: 2, createdAt: now, updatedAt: now },
            { prerequisite_id: 2, course_id: 3, prerequisite_course_id: 7, createdAt: now, updatedAt: now },
            { prerequisite_id: 3, course_id: 4, prerequisite_course_id: 3, createdAt: now, updatedAt: now },
            { prerequisite_id: 4, course_id: 5, prerequisite_course_id: 2, createdAt: now, updatedAt: now },
            { prerequisite_id: 5, course_id: 6, prerequisite_course_id: 7, createdAt: now, updatedAt: now },
            { prerequisite_id: 6, course_id: 8, prerequisite_course_id: 7, createdAt: now, updatedAt: now },
            { prerequisite_id: 7, course_id: 9, prerequisite_course_id: 2, createdAt: now, updatedAt: now }
        ], {});

        // 5) ProgramCourseOfferings
        await queryInterface.bulkInsert('ProgramCourseOfferings', [
            {
                pc_offering_id: 1,
                revision_number: 1,
                course_id: 1,
                program_id: 1,
                dept_id: 3,
                course_description: `This course explores the principles and practices of Human-Computer Interaction (HCI)...`,
                createdAt: now, updatedAt: now
            },
            { pc_offering_id: 2, revision_number: 1, course_id: 2, program_id: 1, dept_id: 3, course_description: 'Advanced web development topics and frameworks.', createdAt: now, updatedAt: now },
            { pc_offering_id: 3, revision_number: 1, course_id: 3, program_id: 1, dept_id: 3, course_description: 'Database design, normalization, and SQL.', createdAt: now, updatedAt: now },
            { pc_offering_id: 4, revision_number: 1, course_id: 4, program_id: 2, dept_id: 3, course_description: 'Software development lifecycle and best practices.', createdAt: now, updatedAt: now },
            { pc_offering_id: 5, revision_number: 1, course_id: 5, program_id: 1, dept_id: 3, course_description: 'Mobile app design and deployment.', createdAt: now, updatedAt: now },
            { pc_offering_id: 6, revision_number: 1, course_id: 6, program_id: 2, dept_id: 3, course_description: 'Principles of network security and defense.', createdAt: now, updatedAt: now },
            { pc_offering_id: 7, revision_number: 1, course_id: 7, program_id: 1, dept_id: 3, course_description: 'Core algorithms and data structure implementations.', createdAt: now, updatedAt: now },
            { pc_offering_id: 8, revision_number: 1, course_id: 9, program_id: 1, dept_id: 3, course_description: 'Web performance, caching, and security practices.', createdAt: now, updatedAt: now }
        ], {});

        // CourseOutcomes
        await queryInterface.bulkInsert('CourseOutcomes', [
            { co_id: 1, pc_offering_id: 1, co_description: 'CO1: Implement the core concepts, theories, and principles...', createdAt: now, updatedAt: now },
            { co_id: 2, pc_offering_id: 1, co_description: 'CO2: Create User Experience (UX) designs...', createdAt: now, updatedAt: now },
            { co_id: 3, pc_offering_id: 1, co_description: 'CO3: Develop a Front-End Prototype...', createdAt: now, updatedAt: now },
            { co_id: 4, pc_offering_id: 1, co_description: 'CO4: Defend the front-end prototype through usability testing...', createdAt: now, updatedAt: now },
            { co_id: 5, pc_offering_id: 2, co_description: 'CO1: Build responsive web pages using modern frameworks.', createdAt: now, updatedAt: now },
            { co_id: 6, pc_offering_id: 2, co_description: 'CO2: Integrate RESTful APIs and client-side state management.', createdAt: now, updatedAt: now },
            { co_id: 7, pc_offering_id: 2, co_description: 'CO3: Optimize front-end performance and accessibility.', createdAt: now, updatedAt: now },
            { co_id: 8, pc_offering_id: 2, co_description: 'CO4: Apply security best practices for web applications.', createdAt: now, updatedAt: now },
            { co_id: 9, pc_offering_id: 3, co_description: 'CO1: Design normalized relational schemas.', createdAt: now, updatedAt: now },
            { co_id: 10, pc_offering_id: 3, co_description: 'CO2: Implement complex queries and transactions.', createdAt: now, updatedAt: now },
            { co_id: 11, pc_offering_id: 3, co_description: 'CO3: Use indexing and optimization techniques.', createdAt: now, updatedAt: now },
            { co_id: 12, pc_offering_id: 3, co_description: 'CO4: Integrate databases with application layers.', createdAt: now, updatedAt: now },
            { co_id: 13, pc_offering_id: 4, co_description: 'CO1: Apply software engineering methodologies to project planning.', createdAt: now, updatedAt: now },
            { co_id: 14, pc_offering_id: 4, co_description: 'CO2: Use version control and CI/CD pipelines.', createdAt: now, updatedAt: now },
            { co_id: 15, pc_offering_id: 4, co_description: 'CO3: Produce design artifacts and documentation.', createdAt: now, updatedAt: now },
            { co_id: 16, pc_offering_id: 4, co_description: 'CO4: Evaluate software quality through testing strategies.', createdAt: now, updatedAt: now },
            { co_id: 17, pc_offering_id: 5, co_description: 'CO1: Create mobile UI prototypes and deploy to devices.', createdAt: now, updatedAt: now },
            { co_id: 18, pc_offering_id: 5, co_description: 'CO2: Integrate device APIs and persistent storage.', createdAt: now, updatedAt: now },
            { co_id: 19, pc_offering_id: 5, co_description: 'CO3: Optimize mobile performance and battery usage.', createdAt: now, updatedAt: now },
            { co_id: 20, pc_offering_id: 5, co_description: 'CO4: Apply security and privacy best practices for mobile apps.', createdAt: now, updatedAt: now }
        ], {});

        // ProgramOutcomes
        const bsitPOs = [];
        for (let i = 1; i <= 10; i++) {
            bsitPOs.push({ po_id: i, program_id: 1, description: `BSIT-PO${i}: Program outcome description ${i}.`, createdAt: now, updatedAt: now });
        }
        const bscsPOs = [];
        for (let i = 11; i <= 20; i++) {
            bscsPOs.push({ po_id: i, program_id: 2, description: `BSCS-PO${i-10}: Program outcome description ${i-10}.`, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ProgramOutcomes', [...bsitPOs, ...bscsPOs], {});

        // ProgramOutcomeAlignments
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
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
            { po_alignment_id: 13, co_id: 5, po_id: 1, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 14, co_id: 5, po_id: 4, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 15, co_id: 6, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 16, co_id: 6, po_id: 9, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 17, co_id: 7, po_id: 3, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 18, co_id: 7, po_id: 10, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 19, co_id: 8, po_id: 6, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 20, co_id: 9, po_id: 5, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 21, co_id: 10, po_id: 6, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 22, co_id: 11, po_id: 7, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 23, co_id: 12, po_id: 8, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 24, co_id: 13, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 25, co_id: 14, po_id: 2, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 26, co_id: 15, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 27, co_id: 16, po_id: 4, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 28, co_id: 17, po_id: 9, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 29, co_id: 18, po_id: 10, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 30, co_id: 19, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 31, co_id: 20, po_id: 6, attainment_level: 'E', createdAt: now, updatedAt: now }
        ], {});

        // CourseOfferingAssignments
        await queryInterface.bulkInsert('CourseOfferingAssignments', [
            { pc_offering_id: 1, stakeholder_id: null, date_assigned: now, date_submitted: null, date_updated: null, createdAt: now, updatedAt: now }
        ], {});

        // References
        const references = [
            { title: 'HCI Models, Theories, and Frameworks', author: 'John M. Carroll', isbn: '1-55860-808-7', link: null, publication_year: new Date('2003-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Learn Human-Computer Interaction', author: 'Christopher Reid', isbn: '978-1-83882-032-9', link: null, publication_year: new Date('2020-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Usability Testing Essentials', author: 'Carol M. Barnum', isbn: '978-0-12-375092-1', link: null, publication_year: new Date('2010-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'UX Design with Figma...', author: 'Tom Green & Kevin Golsby', isbn: '2945-7793', link: null, publication_year: new Date('2024-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Web Accessibility...', author: 'Tom Green & Kevin Golsby', isbn: '978-1-59059-638-8', link: null, publication_year: new Date('2006-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Beyond Vibe-coding', author: 'Addy Osmani', isbn: null, link: 'https://oreilly.com', publication_year: new Date('2024-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'UX Design Principles', author: 'UXcel', isbn: null, link: 'https://app.uxcel.com', publication_year: new Date('2023-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Color Theory For Dummies', author: 'Eric Hibit', isbn: null, link: 'https://oreilly.com', publication_year: new Date('2022-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Universal Principles of Typography', author: 'Elliot Jay Stocks', isbn: null, link: 'https://oreilly.com', publication_year: new Date('2023-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Atomic Design', author: 'Brad Frost', isbn: null, link: 'https://atomicdesign.bradfrost.com', publication_year: new Date('2016-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Guide to Developer Handoff', author: 'Figma', isbn: null, link: 'https://figma.com', publication_year: new Date('2023-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'ISO 9241-210:2019...', author: 'ISO', isbn: null, link: 'https://iso.org', publication_year: new Date('2019-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'UI Principles', author: 'Figma', isbn: null, link: 'https://figma.com', publication_year: new Date('2021-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Imagery', author: 'Figma', isbn: null, link: 'https://figma.com', publication_year: new Date('2021-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Design Guidelines', author: 'Material Design', isbn: null, link: 'https://m2.material.io', publication_year: new Date('2021-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Design Composition and Layout', author: '99Designs', isbn: null, link: 'https://99designs.com', publication_year: new Date('2020-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'UX Case Studies', author: 'Interaction Design Foundation', isbn: null, link: 'https://interaction-design.org', publication_year: new Date('2022-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Introduction to Generative AI', author: 'Google Certification', isbn: null, link: 'https://cloud.google.com', publication_year: new Date('2023-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'UXPilot', author: 'UXPilot', isbn: null, link: 'https://uxpilot.ai', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
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
            'SELECT reference_id, title, type FROM `References` ORDER BY reference_id ASC;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 2) Intended Learning Outcomes
        // ============================================================================
        const ilos = [
            // CO1 (Prelim Academic Period)
            { co_id: 1, description: "Cite the value and relevance of the University's and the College's VMO...", weeks: 1.0, hours: 2, is_orientation: true, createdAt: now, updatedAt: now },
            { co_id: 1, description: 'Distinguish the core concepts, principles, and theories in designing user interfaces.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: 1, description: 'Determine how to use design tools proficiently in creating and refining user interface elements.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Activity (Figma)', createdAt: now, updatedAt: now },
            { co_id: 1, description: 'Propose a comprehensive User Interface (UI) design for a specified software application...', weeks: 2.0, hours: 10, assessment_tool: 'UI Design Proposal', createdAt: now, updatedAt: now },

            // CO2 (Midterm Academic Period)
            { co_id: 2, description: 'Distinguish user research methodologies, user personas, and user-centered design...', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz (UCD)', createdAt: now, updatedAt: now },
            { co_id: 2, description: 'Determine how to build structurally-sound wireframes and layout compositions...', weeks: 1.0, hours: 5, assessment_tool: 'UCD Process Document', createdAt: now, updatedAt: now },
            { co_id: 2, description: 'Propose a cohesive User Experience (UX) wireframe package and user journey framework...', weeks: 2.0, hours: 10, assessment_tool: 'UI/UX Design Presentation', createdAt: now, updatedAt: now },

            // CO3 (Semifinal Academic Period)
            { co_id: 3, description: 'Distinguish dynamic visual architectures, advanced component patterns, and global accessibility standards.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz (UX laws and Accessibility Standards)', createdAt: now, updatedAt: now },
            { co_id: 3, description: 'Determine how to implement screen reader and keyboard navigation considerations...', weeks: 1.0, hours: 5, assessment_tool: 'UI/UX Design Implementation Document', createdAt: now, updatedAt: now },
            { co_id: 3, description: 'Propose a fully-interactive high-fidelity mockup with micro-interactions...', weeks: 2.0, hours: 10, assessment_tool: 'Front-end Code Presentation', createdAt: now, updatedAt: now },

            // CO4 (Final Academic Period)
            { co_id: 4, description: 'Distinguish qualitative and quantitative usability metrics, testing methodologies, and analytical protocols.', weeks: 1.0, hours: 5, assessment_tool: 'Objective type Quiz (Usability Testing)', createdAt: now, updatedAt: now },
            { co_id: 4, description: 'Determine how to analyze user performance data, time-on-task, and error rates...', weeks: 1.0, hours: 5, assessment_tool: 'Prototype Evaluation Document', createdAt: now, updatedAt: now },
            { co_id: 4, description: 'Propose a comprehensive Usability Evaluation and Design Handoff Report...', weeks: 2.0, hours: 10, assessment_tool: 'Front-End Prototype Presentation', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', ilos, {});

        // FIX: Added 'is_orientation' to selection list so array filtering works below
        const ilosRows = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, description, is_orientation FROM IntendedLearningOutcomes WHERE co_id IN (1,2,3,4) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // Fetch and cache orientation ILO
        const orientationIloResult = await queryInterface.sequelize.query(
            'SELECT ilo_id FROM IntendedLearningOutcomes WHERE is_orientation = true LIMIT 1;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const orientationIlo = orientationIloResult.length > 0 ? orientationIloResult[0] : null;

        const textbooks = refsRows.filter(r => r.type === 'TEXTBOOK');
        const others = refsRows.filter(r => r.type !== 'TEXTBOOK');
        const technicalIlos = ilosRows.filter(ilo => !ilo.is_orientation);

        const iloReferences = [];

        // Handle Orientation References
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
        // 4) Topics
        // ============================================================================
        const topicTitles = [
            'Course Orientation and VMO Alignment',
            'Cognitive Models in HCI',
            'User Persona Creation',
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

        const topicsToInsert = topicTitles.map(title => ({ title, createdAt: now, updatedAt: now }));
        await queryInterface.bulkInsert('Topics', topicsToInsert, {});

        // FIX: Removed 'LIMIT 12' so all 15 topics are successfully retrieved
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
            'Introduction to Human-Computer Interaction (HCI)': [
                'Human Factors in Interaction',
                'Computer Systems and Interface Components',
                'Interaction Models and Frameworks',
                'User Interface (UI) and User Experience (UX)',
                'Usability Principles and User-Centered Design (UCD)'
            ],
            'Introduction to User Interface (UI) Design': [
                'Fundamentals of UI Design', 'Principles of UI Design', 'Artificial Intelligence (AI) Tools for UI Design',
                'Etiquette in Utilizing AI Tools for UI Design', 'Respect for Originality and Creativity',
                'Proper Attribution and Transparency', 'Effective Prompt Engineering Practices for Better Results',
                'Ethical Use of AI-Generated Assets', 'Privacy and Data Protection', 'Critical Evaluation of AI Output'
            ],
            'Information Architecture and User Navigation Flow': [
                'Hierarchical structures and faceted navigation design patterns', 'Sitemaps and comprehensive system flow diagrams',
                'Open versus closed card sorting protocols', 'Data-driven categories for navigation optimization'
            ],
            'User-Centered Design (UCD) Frameworks and Persona Crafting': [
                'UCD lifecycle phases and core industry standards', 'Target audience demographic and behavioral profiling',
                'Empathy mapping and scenario definition workflows', 'Translating user research data into explicit feature requirements'
            ],
            'Wireframing Essentials and Layout Compositions': [
                'Sketching low-fidelity interface ideas and design constraints', 'Digital wireframing software tools and layout options',
                'Grid structures, touch targets, and visual hierarchy grids', 'Iterative user feedback loops for wireframe revision'
            ],
            'Visual Design and Gestalt Principles in User Interfaces': [
                'Gestalt principles of proximity, similarity, continuity, and closure', 'Color theory, semantic palettes, contrast ratios, and readability',
                'Scale and typographical composition guidelines', 'Whitespace allocation, density, and spatial balance'
            ],
            'Advanced Component Modeling and Responsive Systems in Figma': [
                'Structuring modular Figma parent components and UI tokens', 'Creating flexible variants, variables, and properties',
                'Responsive design layouts using nested Auto Layout configurations', 'Structuring scalable and collaborative team libraries'
            ],
            'Interactive Dynamic Prototyping and Micro-interaction Workflows': [
                'Interactive transitions, visual overlays, and smart animate features', 'User-triggered motions, keyboard triggers, and delay states',
                'Structuring loading sequences and informative state modifications', 'Designing form field validation flags and success notifications'
            ],
            'Web Accessibility Standards (WCAG 2.1) and Auditing Protocols': [
                'Global accessibility standards: Perceivable, Operable, Understandable, Robust', 'Screen reader testing, focus order, and HTML document structures',
                'Accessible color contrast and alternative textual elements', 'Formulating accessible keyboard-only navigation pathways'
            ],
            'Usability Evaluation Metrics and Test Formulations': [
                'Drafting ethical, comprehensive usability test plans', 'Quantitative metrics: task completion rates, error logging, and time',
                'Qualitative models: think-aloud strategies and system questionnaires', 'Writing clear, representative, unbiased user test scenarios'
            ],
            'Moderated Usability Testing Execution and Data Synthesis': [
                'Facilitating moderated research sessions with users', 'Unbiased prompt scripts, objective moderation, and detail logging',
                'Applying the System Usability Scale (SUS) questionnaire', 'Consolidating research insights across test cohorts'
            ],
            'Empirically-Driven Layout Iterations and Developer Handoff': [
                'Isolating high-priority design updates from evaluation logs', 'Executing usability-informed layout revision sprints',
                'Figma developer handoff layouts, code inspections, and specs', 'Writing comprehensive, professional evaluation reports'
            ]
        };

        const subtopicsToInsert = [];
        for (const t of topicsRows) {
            const subs = subtopicsMap[t.title] || [];
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
        // 6) ILOTopic Join Entries
        // ============================================================================
        const iloTopicInserts = [];
        const orientationTopic = topicsRows.find(t => t.title === 'Course Orientation and VMO Alignment');

        if (orientationIlo && orientationTopic) {
            iloTopicInserts.push({
                ilo_id: Number(orientationIlo.ilo_id),
                topic_id: Number(orientationTopic.topic_id),
                createdAt: now,
                updatedAt: now
            });
        }

        const technicalTopicsRows = topicsRows.filter(t => t.title !== 'Course Orientation and VMO Alignment');

        // FIX: Modified query condition to handle database NULL variables properly
        const technicalIlosRows = await queryInterface.sequelize.query(
            'SELECT ilo_id FROM IntendedLearningOutcomes WHERE is_orientation = false OR is_orientation IS NULL ORDER BY ilo_id ASC;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        for (let i = 0; i < technicalTopicsRows.length; i++) {
            const currentTopic = technicalTopicsRows[i];
            const matchingIlo = technicalIlosRows[i % technicalIlosRows.length];

            iloTopicInserts.push({
                ilo_id: Number(matchingIlo.ilo_id),
                topic_id: Number(currentTopic.topic_id),
                createdAt: now,
                updatedAt: now
            });
        }
        await queryInterface.bulkInsert('ILOTopics', iloTopicInserts, {});

        const iloTopicsRows = await queryInterface.sequelize.query(
            'SELECT ilo_topic_id FROM ILOTopics ORDER BY ilo_topic_id ASC;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 7) Teaching and Learning Activities
        // ============================================================================
        const tlasToInsert = [];
        topicsRows.forEach((topic) => {
            if (topic.title === 'Course Orientation and VMO Alignment') {
                tlasToInsert.push({
                    tla_name: 'VMO & Outcomes Reading Assignment',
                    description: 'Students execute self-paced prep learning by reading target documents...',
                    performed_by: 'S', class_phase: 'preclass', is_lab: true, createdAt: now, updatedAt: now
                });
                tlasToInsert.push({
                    tla_name: 'Course Orientation Lecture & Collaborative Forum',
                    description: 'Structured seminar outlining course objectives...',
                    performed_by: 'T', class_phase: 'inclass', is_lab: false, createdAt: now, updatedAt: now
                });
                tlasToInsert.push({
                    tla_name: 'VMO Visual Alignment Poster & Foundation AI Course',
                    description: 'Self-paced completion of the Google Introduction to Generative AI...',
                    performed_by: 'S', class_phase: 'postclass', is_lab: true, createdAt: now, updatedAt: now
                });
            } else {
                tlasToInsert.push({
                    tla_name: `Core Materials Reading of ${topic.title}`,
                    description: `Students execute self-paced prep learning by reading target chapters, lecture slides, and online course files. Students prepare personal reference summaries noting key conceptual distinctions and complete end-of-chapter diagnostic tests to evaluate their base understanding.`,
                    performed_by: 'S', class_phase: 'preclass', is_lab: true, createdAt: now, updatedAt: now
                });
                tlasToInsert.push({
                    tla_name: `Structured Seminar ${topic.title}`,
                    description: `An in-depth theoretical analysis and system discussion covering core criteria, system mechanics, and industry guidelines. This includes live UI/UX platform demonstrations and active student engagement through real-time interactive assessment quizzes.`,
                    performed_by: 'T', class_phase: 'inclass', is_lab: false, createdAt: now, updatedAt: now
                });
                tlasToInsert.push({
                    tla_name: `Design Review & Implementation of ${topic.title}`,
                    description: `A practical laboratory follow-up where the instructor reviews the previous quizzes to identify common pain points, coordinates tailored feedback, and reviews layout progress. Students proceed with self-paced system courses and execute independent UI updates.`,
                    performed_by: 'S', class_phase: 'postclass', is_lab: true, createdAt: now, updatedAt: now
                });
            }
        });

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlasToInsert, {});

        const tlasRows = await queryInterface.sequelize.query(
            `SELECT tla_id, tla_name FROM TeachingAndLearningActivities ORDER BY tla_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 8) TopicTLAs Assignment
        // ============================================================================
        const topicTlaInserts = [];
        for (let i = 0; i < iloTopicsRows.length; i++) {
            const jRow = iloTopicsRows[i];
            const preTla = tlasRows[i * 3];
            const inTla = tlasRows[i * 3 + 1];
            const postTla = tlasRows[i * 3 + 2];

            topicTlaInserts.push(
                { ilo_topic_id: jRow.ilo_topic_id, tla_id: preTla.tla_id, createdAt: now, updatedAt: now },
                { ilo_topic_id: jRow.ilo_topic_id, tla_id: inTla.tla_id, createdAt: now, updatedAt: now },
                { ilo_topic_id: jRow.ilo_topic_id, tla_id: postTla.tla_id, createdAt: now, updatedAt: now }
            );
        }
        await queryInterface.bulkInsert('TopicTLAs', topicTlaInserts, {});

        // ============================================================================
        // 9) TLAAssessments: Map to exact assessment_tool & Weight Constraints (20, 30, 50)
        // ============================================================================
        const tlaAssessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];

        // FIX: Now iterating securely over technicalIlosRows to keep the 20-30-50 logic properly aligned
        for (let i = 0; i < technicalIlosRows.length; i++) {
            const coIndex = Math.floor(i / 3);
            const iloIndex = i % 3;

            const currentPeriod = periods[coIndex];

            // Technical topics start at index 1 in topicsRows (since index 0 is orientation)
            // Therefore, the assigned TLA matches (i + 1)
            const assignedTlaId = tlasRows[(i + 1) * 3 + 1].tla_id;

            let assessmentName = '';
            let assessmentDescription = '';
            let assessmentWeight = '20';

            if (iloIndex === 0) {
                assessmentName = 'Objective-Type Quiz';
                assessmentWeight = '20';

                if (coIndex === 0) {
                    assessmentDescription = 'Covering interactive component theories and human cognitive load.';
                } else if (coIndex === 1) {
                    assessmentDescription = 'Covering User-Centered Design paradigms and audience analysis methodologies.';
                } else if (coIndex === 2) {
                    assessmentDescription = 'Ergonomic patterns and WCAG 2.1 compliance specifications.';
                } else {
                    assessmentDescription = 'Covering evaluative protocol steps, metrics, and script guidelines.';
                }
            } else if (iloIndex === 1) {
                assessmentWeight = '30';

                if (coIndex === 0) {
                    assessmentName = 'Objective Type Activity';
                    assessmentDescription = 'Hands-on UI layout development exercise utilizing Figma component design engines.';
                } else if (coIndex === 1) {
                    assessmentName = 'UCD Process Document';
                    assessmentDescription = 'A formal process document containing research-driven user profiles, empathy maps, and system site flows.';
                } else if (coIndex === 2) {
                    assessmentName = 'UI/UX Design Implementation Document';
                    assessmentDescription = 'A detailed implementation document documenting accessibility features, color contrast compliance, and screen-reader focus hierarchies.';
                } else {
                    assessmentName = 'Prototype Evaluation Document';
                    assessmentDescription = 'A complete research report compiling recorded user error logs, System Usability Scale (SUS) surveys, and qualitative notes.';
                }
            } else {
                assessmentWeight = '50';

                if (coIndex === 0) {
                    assessmentName = 'UI Design Proposal';
                    assessmentDescription = 'A thorough system layout mock proposal document outlining visual composition strategies and interaction models.';
                } else if (coIndex === 1) {
                    assessmentName = 'UI/UX Design Presentation';
                    assessmentDescription = 'An interactive, formal presentation of high-priority wireframes, navigation configurations, and layout details.';
                } else if (coIndex === 2) {
                    assessmentName = 'Front-end Code Presentation';
                    assessmentDescription = 'An interactive front-end display demonstrating dynamic layout states, microcopy animations, and interactive component functions.';
                } else {
                    assessmentName = 'Front-End Prototype Presentation';
                    assessmentDescription = 'The final capstone defense presenting a validated system prototype optimized using feedback from user testing sessions.';
                }
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
        console.log(`Successfully completed high-fidelity seeding of references, ILOs, Topics, and strictly aligned TLAs.`);
    },

    async down (queryInterface, Sequelize) {
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