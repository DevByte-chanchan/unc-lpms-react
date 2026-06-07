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
        // ASSUMPTION: Prerequisites table has columns: prerequisite_id (PK), course_id (the course that requires the prerequisite),
        // and prerequisite_course_id (the course that is the prerequisite).
        // - The user requested: "add a prerequisite id of the 'Web Development II' and assign it to the course id of 'Human and Computer Interaction'."
        //   Interpreting that as: Web Development II is a prerequisite for Human and Computer Interaction.
        await queryInterface.bulkInsert('Prerequisites', [
            // Web Development II (course_id=2) is prerequisite for HCI (course_id=1)
            { prerequisite_id: 1, course_id: 1, prerequisite_course_id: 2, createdAt: now, updatedAt: now },

            // Database Systems requires Data Structures
            { prerequisite_id: 2, course_id: 3, prerequisite_course_id: 7, createdAt: now, updatedAt: now },

            // Software Engineering requires Database Systems
            { prerequisite_id: 3, course_id: 4, prerequisite_course_id: 3, createdAt: now, updatedAt: now },

            // Mobile App Dev requires Web Dev II
            { prerequisite_id: 4, course_id: 5, prerequisite_course_id: 2, createdAt: now, updatedAt: now },

            // Network Security requires Data Structures
            { prerequisite_id: 5, course_id: 6, prerequisite_course_id: 7, createdAt: now, updatedAt: now },

            // AI requires Data Structures
            { prerequisite_id: 6, course_id: 8, prerequisite_course_id: 7, createdAt: now, updatedAt: now },

            // Web Security requires Web Dev II
            { prerequisite_id: 7, course_id: 9, prerequisite_course_id: 2, createdAt: now, updatedAt: now }
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
            { pc_offering_id: 2, revision_number: 1, course_id: 2, program_id: 1, dept_id: 3, course_description: 'Advanced web development topics and frameworks.', createdAt: now, updatedAt: now },
            { pc_offering_id: 3, revision_number: 1, course_id: 3, program_id: 1, dept_id: 3, course_description: 'Database design, normalization, and SQL.', createdAt: now, updatedAt: now },
            { pc_offering_id: 4, revision_number: 1, course_id: 4, program_id: 2, dept_id: 3, course_description: 'Software development lifecycle and best practices.', createdAt: now, updatedAt: now },
            { pc_offering_id: 5, revision_number: 1, course_id: 5, program_id: 1, dept_id: 3, course_description: 'Mobile app design and deployment.', createdAt: now, updatedAt: now },
            { pc_offering_id: 6, revision_number: 1, course_id: 6, program_id: 2, dept_id: 3, course_description: 'Principles of network security and defense.', createdAt: now, updatedAt: now },
            { pc_offering_id: 7, revision_number: 1, course_id: 7, program_id: 1, dept_id: 3, course_description: 'Core algorithms and data structure implementations.', createdAt: now, updatedAt: now },
            { pc_offering_id: 8, revision_number: 1, course_id: 9, program_id: 1, dept_id: 3, course_description: 'Web performance, caching, and security practices.', createdAt: now, updatedAt: now }
        ], {});

        // --- CourseOutcomes (unchanged for HCI and other offerings) ---
        await queryInterface.bulkInsert('CourseOutcomes', [
            // HCI offering (pc_offering_id = 1)
            { co_id: 1, pc_offering_id: 1, co_description: 'CO1: Implement the core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing User Interface (UI) design for a software application.', createdAt: now, updatedAt: now },
            { co_id: 2, pc_offering_id: 1, co_description: 'CO2: Create User Experience (UX) designs for software applications by employing the User-Centered Design (UCD) process and integrating ISO 9241-210 standards', createdAt: now, updatedAt: now },
            { co_id: 3, pc_offering_id: 1, co_description: 'CO3: Develop a Front-End Prototype for the proposed software application that follows HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines', createdAt: now, updatedAt: now },
            { co_id: 4, pc_offering_id: 1, co_description: 'CO4: Defend the front-end prototype through usability testing and evaluation in UI/UX design.', createdAt: now, updatedAt: now },

            // Web Dev II (pc_offering_id = 2)
            { co_id: 5, pc_offering_id: 2, co_description: 'CO1: Build responsive web pages using modern frameworks.', createdAt: now, updatedAt: now },
            { co_id: 6, pc_offering_id: 2, co_description: 'CO2: Integrate RESTful APIs and client-side state management.', createdAt: now, updatedAt: now },
            { co_id: 7, pc_offering_id: 2, co_description: 'CO3: Optimize front-end performance and accessibility.', createdAt: now, updatedAt: now },
            { co_id: 8, pc_offering_id: 2, co_description: 'CO4: Apply security best practices for web applications.', createdAt: now, updatedAt: now },

            // Database Systems (pc_offering_id = 3)
            { co_id: 9, pc_offering_id: 3, co_description: 'CO1: Design normalized relational schemas.', createdAt: now, updatedAt: now },
            { co_id: 10, pc_offering_id: 3, co_description: 'CO2: Implement complex queries and transactions.', createdAt: now, updatedAt: now },
            { co_id: 11, pc_offering_id: 3, co_description: 'CO3: Use indexing and optimization techniques.', createdAt: now, updatedAt: now },
            { co_id: 12, pc_offering_id: 3, co_description: 'CO4: Integrate databases with application layers.', createdAt: now, updatedAt: now },

            // Software Engineering (pc_offering_id = 4)
            { co_id: 13, pc_offering_id: 4, co_description: 'CO1: Apply software engineering methodologies to project planning.', createdAt: now, updatedAt: now },
            { co_id: 14, pc_offering_id: 4, co_description: 'CO2: Use version control and CI/CD pipelines.', createdAt: now, updatedAt: now },
            { co_id: 15, pc_offering_id: 4, co_description: 'CO3: Produce design artifacts and documentation.', createdAt: now, updatedAt: now },
            { co_id: 16, pc_offering_id: 4, co_description: 'CO4: Evaluate software quality through testing strategies.', createdAt: now, updatedAt: now },

            // Mobile Dev (pc_offering_id = 5)
            { co_id: 17, pc_offering_id: 5, co_description: 'CO1: Create mobile UI prototypes and deploy to devices.', createdAt: now, updatedAt: now },
            { co_id: 18, pc_offering_id: 5, co_description: 'CO2: Integrate device APIs and persistent storage.', createdAt: now, updatedAt: now },
            { co_id: 19, pc_offering_id: 5, co_description: 'CO3: Optimize mobile performance and battery usage.', createdAt: now, updatedAt: now },
            { co_id: 20, pc_offering_id: 5, co_description: 'CO4: Apply security and privacy best practices for mobile apps.', createdAt: now, updatedAt: now }
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

        await queryInterface.bulkInsert('ProgramOutcomes', [...bsitPOs, ...bscsPOs], {});

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

            // Web Dev II COs (co_id 5..8) mapped across PO1..PO10
            { po_alignment_id: 13, co_id: 5, po_id: 1, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 14, co_id: 5, po_id: 4, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 15, co_id: 6, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 16, co_id: 6, po_id: 9, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 17, co_id: 7, po_id: 3, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 18, co_id: 7, po_id: 10, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 19, co_id: 8, po_id: 6, attainment_level: 'I', createdAt: now, updatedAt: now },

            // Database Systems COs (co_id 9..12) mapped to mid-range POs
            { po_alignment_id: 20, co_id: 9, po_id: 5, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 21, co_id: 10, po_id: 6, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 22, co_id: 11, po_id: 7, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 23, co_id: 12, po_id: 8, attainment_level: 'I', createdAt: now, updatedAt: now },

            // Software Engineering COs (co_id 13..16) mapped to higher PO ids (including PO11..PO12 if BSCS used)
            { po_alignment_id: 24, co_id: 13, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 25, co_id: 14, po_id: 2, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 26, co_id: 15, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 27, co_id: 16, po_id: 4, attainment_level: 'I', createdAt: now, updatedAt: now },

            // Mobile Dev COs (co_id 17..20) add variety and cross-linking
            { po_alignment_id: 28, co_id: 17, po_id: 9, attainment_level: 'E', createdAt: now, updatedAt: now },
            { po_alignment_id: 29, co_id: 18, po_id: 10, attainment_level: 'I', createdAt: now, updatedAt: now },
            { po_alignment_id: 30, co_id: 19, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now },
            { po_alignment_id: 31, co_id: 20, po_id: 6, attainment_level: 'E', createdAt: now, updatedAt: now }
        ], {});

        // 9) CourseOfferingAssignments
        // Each ProgramCourseOffering should have one CourseOfferingAssignment (1:1)
        // For the HCI offering (pc_offering_id = 1) create assignment with date_assigned empty (null)
        await queryInterface.bulkInsert('CourseOfferingAssignments', [
            // Draft: Human & Computer Interaction (no submitted date)
            {
                pc_offering_id: 1,
                stakeholder_id: null,
                date_assigned: new Date('2026-03-05'),
                date_submitted: null,
                date_updated: null,
                ph_date_returned: null,
                ic_date_returned: null,
                ld_date_returned: null,
                d_date_returned: null,
                ph_date_accepted: null,
                ic_date_accepted: null,
                ld_date_accepted: null,
                d_date_accepted: null,
                createdAt: now,
                updatedAt: now
            },

            // Pending/Approved examples (submitted dates present)
            {
                pc_offering_id: 2,
                stakeholder_id: null,
                date_assigned: new Date('2026-03-06'),
                date_submitted: new Date('2026-03-10'),
                date_updated: new Date('2026-03-12'),
                ph_date_returned: null,
                ic_date_returned: null,
                ld_date_returned: null,
                d_date_returned: null,
                ph_date_accepted: new Date('2026-03-11'),
                ic_date_accepted: new Date('2026-03-11'),
                ld_date_accepted: new Date('2026-03-11'),
                d_date_accepted: new Date('2026-03-11'),
                createdAt: now,
                updatedAt: now
            },
            {
                pc_offering_id: 3,
                stakeholder_id: null,
                date_assigned: new Date('2026-03-07'),
                date_submitted: new Date('2026-03-12'),
                date_updated: new Date('2026-03-14'),
                ph_date_returned: null,
                ic_date_returned: null,
                ld_date_returned: null,
                d_date_returned: null,
                ph_date_accepted: new Date('2026-03-13'),
                ic_date_accepted: new Date('2026-03-13'),
                ld_date_accepted: new Date('2026-03-13'),
                d_date_accepted: new Date('2026-03-15'),
                createdAt: now,
                updatedAt: now
            },

            // Draft records (extra two)
            {
                pc_offering_id: 4,
                stakeholder_id: null,
                date_assigned: new Date('2026-03-09'),
                date_submitted: null,
                date_updated: null,
                ph_date_returned: null,
                ic_date_returned: null,
                ld_date_returned: null,
                d_date_returned: null,
                ph_date_accepted: null,
                ic_date_accepted: null,
                ld_date_accepted: null,
                d_date_accepted: null,
                createdAt: now,
                updatedAt: now
            },
            //Pending Records
            {
                pc_offering_id: 5,
                stakeholder_id: null,
                date_assigned: new Date('2026-03-07'),
                date_submitted: new Date('2026-03-12'),
                date_updated: null,
                ph_date_returned: null,
                ic_date_returned: new Date('2026-03-14'),
                ld_date_returned: null,
                d_date_returned: null,
                ph_date_accepted: null,
                ic_date_accepted: null,
                ld_date_accepted: new Date('2026-03-15'),
                d_date_accepted: null,
                createdAt: now,
                updatedAt: now
            },

            {
                pc_offering_id: 6,
                stakeholder_id: null,
                date_assigned: new Date('2026-03-07'),
                date_submitted: new Date('2026-03-12'),
                date_updated: null,
                ph_date_returned: null,
                ic_date_returned: new Date('2026-03-14'),
                ld_date_returned: null,
                d_date_returned: null,
                ph_date_accepted: null,
                ic_date_accepted: null,
                ld_date_accepted: new Date('2026-03-13'),
                d_date_accepted: null,
                createdAt: now,
                updatedAt: now
            },

        ], {});

        //
        // 1) References (24 total: 8 TEXTBOOKS, 8 ONLINE_RESOURCES, 8 OPEN_EDU_RESOURCES)
        //
        const references = [
            // TEXTBOOKS (isbn, year, no link)
            { title: 'Foundations of Human-Computer Interaction', author: 'A. Smith', isbn: '9780134093413', link: null, publication_year: new Date('2018-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Designing Interfaces: Patterns for Effective Interaction', author: 'J. Johnson', isbn: '9781492051966', link: null, publication_year: new Date('2017-06-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Interaction Design: Beyond Human-Computer Interaction', author: 'H. Sharp', isbn: '9781118766576', link: null, publication_year: new Date('2019-03-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'The UX Book: Agile UX Design for a Quality User Experience', author: 'R. Gothelf', isbn: '9780128053423', link: null, publication_year: new Date('2018-09-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'About Face: The Essentials of Interaction Design', author: 'A. Cooper', isbn: '9781118766577', link: null, publication_year: new Date('2014-11-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Designing for Interaction', author: 'D. Saffer', isbn: '9780321643391', link: null, publication_year: new Date('2010-05-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Research Methods in Human-Computer Interaction', author: 'J. Lazar', isbn: '9781118909990', link: null, publication_year: new Date('2017-02-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Human-Computer Interaction: An Empirical Research Perspective', author: 'I. Sommerville', isbn: '9780128053904', link: null, publication_year: new Date('2016-08-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },

            // ONLINE_RESOURCES (link required, isbn null)
            { title: 'Nielsen Norman Group: Usability Heuristics', author: 'Nielsen Norman Group', isbn: null, link: 'https://www.nngroup.com/articles/ten-usability-heuristics/', publication_year: new Date('1995-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'WCAG 2.1 Overview', author: 'W3C', isbn: null, link: 'https://www.w3.org/WAI/standards-guidelines/wcag/', publication_year: new Date('2018-06-05'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Figma Documentation: Components and Variants', author: 'Figma', isbn: null, link: 'https://www.figma.com/resources/learn-design/components/', publication_year: new Date('2020-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Card Sorting: A Practical Guide', author: 'UX Collective', isbn: null, link: 'https://uxdesign.cc/card-sorting-what-why-and-how-7f6b3f6b9f3b', publication_year: new Date('2019-07-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Accessibility Insights', author: 'Microsoft', isbn: null, link: 'https://accessibilityinsights.io/', publication_year: new Date('2020-05-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Gestalt Principles in UX', author: 'Smashing Magazine', isbn: null, link: 'https://www.smashingmagazine.com/2018/02/gestalt-principles-web-design/', publication_year: new Date('2018-02-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Low-Fidelity Prototyping Techniques', author: 'UX Planet', isbn: null, link: 'https://uxplanet.org/low-fidelity-prototyping-6f3b2a3b', publication_year: new Date('2019-10-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'Usability Testing: A Practical How-To', author: 'Interaction Design Foundation', isbn: null, link: 'https://www.interaction-design.org/literature/article/usability-testing-what-it-is-and-how-to-do-it', publication_year: new Date('2017-04-01'), type: 'ONLINE', createdAt: now, updatedAt: now },

            // OPEN_EDUCATIONAL_RESOURCES (link required, no isbn)
            { title: 'Open HCI Course Materials', author: 'Open University', isbn: null, link: 'https://www.open.edu/openlearn/ocw/mod/oucontent/view.php?id=12345', publication_year: new Date('2016-09-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Introduction to UX Design (OER)', author: 'MIT OpenCourseWare', isbn: null, link: 'https://ocw.mit.edu/courses/ux-design/', publication_year: new Date('2015-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Human-Computer Interaction Lecture Notes', author: 'OpenStax', isbn: null, link: 'https://openstax.org/subjects/computer-science', publication_year: new Date('2017-03-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Usability Testing Toolkit (OER)', author: 'BCcampus', isbn: null, link: 'https://opentextbc.ca/usabilitytesting/', publication_year: new Date('2018-08-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Accessibility Guidelines (OER)', author: 'W3C Education', isbn: null, link: 'https://www.w3.org/WAI/teach-advocate/', publication_year: new Date('2019-11-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Prototyping Resources (OER)', author: 'OpenLearn', isbn: null, link: 'https://www.open.edu/openlearn/prototyping', publication_year: new Date('2016-05-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Design Research Methods (OER)', author: 'Saylor Academy', isbn: null, link: 'https://learn.saylor.org/course/view.php?id=123', publication_year: new Date('2014-07-01'), type: 'OER', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('References', references, {});

        // Fetch inserted references (we expect at least 24)
        const refsRows = await queryInterface.sequelize.query(
            'SELECT reference_id, title, type FROM `References` ORDER BY reference_id ASC LIMIT 24;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );


        //
        // 2) Intended Learning Outcomes (3 per co_id 1..4 => 12 ILOs)
        //
        const ilos = [
            // co_id:1
            { co_id: 1, description: 'Analyze the relationship between cognitive psychology and human-computer interaction.', hours: 12, createdAt: now, updatedAt: now },
            { co_id: 1, description: 'Synthesize user research data into actionable user personas and empathy maps.', hours: 10, createdAt: now, updatedAt: now },
            { co_id: 1, description: 'Structure information architecture effectively using card sorting techniques.', hours: 8, createdAt: now, updatedAt: now },

            // co_id:2
            { co_id: 2, description: "Apply Nielsen's 10 Usability Heuristics to critique existing interface designs.", hours: 10, createdAt: now, updatedAt: now },
            { co_id: 2, description: 'Create low-fidelity wireframes that solve specific user pain points.', hours: 12, createdAt: now, updatedAt: now },
            { co_id: 2, description: 'Apply Gestalt principles and color theory to enhance UI readability.', hours: 8, createdAt: now, updatedAt: now },

            // co_id:3
            { co_id: 3, description: 'Develop high-fidelity interactive prototypes using Figma components and variants.', hours: 14, createdAt: now, updatedAt: now },
            { co_id: 3, description: 'Integrate micro-interactions to provide feedback and feedforward mechanisms.', hours: 10, createdAt: now, updatedAt: now },
            { co_id: 3, description: 'Evaluate interfaces against WCAG 2.1 accessibility standards.', hours: 10, createdAt: now, updatedAt: now },

            // co_id:4
            { co_id: 4, description: 'Formulate a usability testing plan with clear metrics and tasks.', hours: 10, createdAt: now, updatedAt: now },
            { co_id: 4, description: 'Conduct moderated usability tests to gather qualitative and quantitative feedback.', hours: 12, createdAt: now, updatedAt: now },
            { co_id: 4, description: 'Propose design iterations based on empirical evidence from usability testing.', hours: 8, createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', ilos, {});

        // Fetch inserted ILOs
        const ilosRows = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, description FROM IntendedLearningOutcomes WHERE co_id IN (1,2,3,4) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        //
        // 3) ILOReference: assign 1-2 references to each ILO (use refsRows)
        //
        const iloReferences = [];
        // We'll distribute references across ilos: use refsRows cyclically
        let refIndex = 0;
        for (let i = 0; i < ilosRows.length; i++) {
            const ilo = ilosRows[i];
            // assign 1 or 2 references (alternate)
            const count = (i % 2 === 0) ? 2 : 1;
            for (let j = 0; j < count; j++) {
                const ref = refsRows[refIndex % refsRows.length];
                iloReferences.push({
                    reference_id: ref.reference_id,
                    ilo_id: ilo.ilo_id,
                    createdAt: now,
                    updatedAt: now
                });
                refIndex++;
            }
        }
        await queryInterface.bulkInsert('ILOReferences', iloReferences, {});

        //
        // 4) Topics (25 topics) — distribute across the 12 ILOs (1-3 topics per ILO to reach 25)
        //
        const topicTitles = [
            'Cognitive Models in HCI', 'User Persona Creation', 'Card Sorting Methods', 'Information Architecture Patterns',
            'Heuristic Evaluation Techniques', 'Wireframing Basics', 'Color Theory for Interfaces', 'Gestalt in UI',
            'Figma Components Workshop', 'Prototyping Interactions', 'Micro-interaction Patterns', 'Accessibility Audits',
            'Usability Metrics and KPIs', 'Moderated Testing Protocols', 'Task Design for Usability Tests', 'Data-driven Iteration',
            'User Research Synthesis', 'Affinity Mapping', 'Navigation Design', 'Content Strategy',
            'Form Design Best Practices', 'Mobile-first Layouts', 'Responsive Grid Systems', 'Visual Hierarchy', 'Feedback & Error Handling'
        ];

        // Assign topics to ilos in round-robin but ensure each ILO gets at least 1-2 topics
        const topicsToInsert = [];
        for (let i = 0; i < topicTitles.length; i++) {
            const ilo = ilosRows[i % ilosRows.length]; // round-robin across 12 ilos
            topicsToInsert.push({
                ilo_id: ilo.ilo_id,
                title: topicTitles[i],
                createdAt: now,
                updatedAt: now
            });
        }

        await queryInterface.bulkInsert('Topics', topicsToInsert, {});

        const topicsRows = await queryInterface.sequelize.query(
            'SELECT topic_id, ilo_id, title FROM `Topics` ORDER BY topic_id ASC;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // Define realistic subtopics for each topic
        const subtopicsMap = {
            'Cognitive Models in HCI': [
                'Mental models and interface design',
                'Norman’s stages of action',
                'Cognitive load in interaction'
            ],
            'User Persona Creation': [
                'Gathering demographic data',
                'Empathy mapping',
                'Validating personas with research'
            ],
            'Card Sorting Methods': [
                'Open vs closed card sorting',
                'Analyzing card sort results',
                'Tools for card sorting'
            ],
            'Information Architecture Patterns': [
                'Hierarchical structures',
                'Faceted navigation',
                'Sitemaps and flow diagrams'
            ],
            'Heuristic Evaluation Techniques': [
                'Nielsen’s 10 heuristics',
                'Severity ratings',
                'Reporting usability issues'
            ],
            'Wireframing Basics': [
                'Sketching low-fidelity wireframes',
                'Digital wireframing tools',
                'Iterating wireframes with feedback'
            ],
            'Color Theory for Interfaces': [
                'Contrast and readability',
                'Color psychology in UI',
                'Accessibility and color blindness'
            ],
            'Gestalt in UI': [
                'Proximity and grouping',
                'Similarity and consistency',
                'Closure and continuity'
            ],
            'Figma Components Workshop': [
                'Creating reusable components',
                'Variants and states',
                'Component libraries'
            ],
            'Prototyping Interactions': [
                'Click-through prototypes',
                'Transitions and animations',
                'Testing interactive flows'
            ],
            'Micro-interaction Patterns': [
                'Feedback and feedforward',
                'Loading indicators',
                'Error prevention cues'
            ],
            'Accessibility Audits': [
                'WCAG 2.1 guidelines',
                'Screen reader testing',
                'Keyboard navigation checks'
            ],
            'Usability Metrics and KPIs': [
                'Task success rate',
                'Time on task',
                'Error frequency'
            ],
            'Moderated Testing Protocols': [
                'Preparing test scripts',
                'Facilitating sessions',
                'Recording observations'
            ],
            'Task Design for Usability Tests': [
                'Scenario creation',
                'Task realism',
                'Measuring task outcomes'
            ],
            'Data-driven Iteration': [
                'Analyzing usability data',
                'Prioritizing design changes',
                'A/B testing results'
            ],
            'User Research Synthesis': [
                'Affinity diagramming',
                'Identifying themes',
                'Turning insights into requirements'
            ],
            'Affinity Mapping': [
                'Clustering qualitative data',
                'Collaborative mapping',
                'Deriving actionable insights'
            ],
            'Navigation Design': [
                'Global vs local navigation',
                'Breadcrumbs',
                'Mobile navigation patterns'
            ],
            'Content Strategy': [
                'Content audits',
                'Voice and tone',
                'Content governance'
            ],
            'Form Design Best Practices': [
                'Field grouping',
                'Error messages',
                'Progressive disclosure'
            ],
            'Mobile-first Layouts': [
                'Responsive breakpoints',
                'Touch targets',
                'Performance considerations'
            ],
            'Responsive Grid Systems': [
                '12-column grids',
                'Flexbox and CSS Grid',
                'Adaptive layouts'
            ],
            'Visual Hierarchy': [
                'Typography scale',
                'Use of whitespace',
                'Contrast and emphasis'
            ],
            'Feedback & Error Handling': [
                'Inline validation',
                'Success messages',
                'Error recovery strategies'
            ]
        };

// Build subtopicsToInsert from topicsRows using the map
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


// 6) ILOTopic join entries: assign 1-2 topics per ILO (use topicsRows)
        const iloTopicInserts = [];

// Validate source arrays
        if (!Array.isArray(topicsRows)) {
            throw new Error('topicsRows is not defined or not an array. Ensure topics are seeded/fetched earlier.');
        }
        if (!Array.isArray(ilosRows)) {
            throw new Error('ilosRows is not defined or not an array. Ensure ILOs are seeded/fetched earlier.');
        }

        const topicsByIlo = {};
        for (const t of topicsRows) {
            if (t == null || t.ilo_id == null || t.topic_id == null) continue;
            const iloId = Number(t.ilo_id);
            const topicId = Number(t.topic_id);
            topicsByIlo[iloId] = topicsByIlo[iloId] || [];
            topicsByIlo[iloId].push(topicId);
        }

        for (const ilo of ilosRows) {
            if (ilo == null || ilo.ilo_id == null) {
                console.warn('Skipping invalid ILO row:', ilo);
                continue;
            }
            const iloId = Number(ilo.ilo_id);
            const topicsForIlo = topicsByIlo[iloId] || [];

            // Skip ILOs that have no topics
            if (topicsForIlo.length === 0) {
                console.warn(`No topics found for ILO ${iloId}; skipping ILOTopic inserts for this ILO.`);
                continue;
            }

            // pick 1-2 topics (if more exist)
            const pickCount = Math.min(2, topicsForIlo.length);
            for (let k = 0; k < pickCount; k++) {
                const topicId = topicsForIlo[k % topicsForIlo.length];
                iloTopicInserts.push({
                    ilo_id: iloId,
                    topic_id: Number(topicId),
                    createdAt: now,
                    updatedAt: now
                });
            }
        }

// Optional: remove duplicates (if you want unique pairs)
        const seen = new Set();
        const deduped = [];
        for (const r of iloTopicInserts) {
            const key = `${r.ilo_id}:${r.topic_id}`;
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(r);
            }
        }

        if (deduped.length === 0) {
            console.warn('No ILOTopic rows prepared; nothing to insert.');
        } else {
            await queryInterface.bulkInsert('ILOTopics', deduped, {});
            console.log(`Inserted ${deduped.length} ILOTopic rows.`);
        }

        const iloTopicsRows = await queryInterface.sequelize.query(
            'SELECT ilo_topic_id FROM `ILOTopics`;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );



        //
        // 7) Teaching and Learning Activities (25 TLAs)
        //
        const classPhases = ['preclass', 'inclass', 'postclass'];

        const tlaSourceData = [
            {
                name: 'Lecture: Cognitive Foundations',
                is_lab: false,
                description: 'An in-depth overview of human-computer interaction principles, focusing on cognitive load theory, mental models, working memory constraints, and how users process visual information hierarchies.'
            },
            {
                name: 'Workshop: Persona Building',
                is_lab: false,
                description: 'A collaborative user profiling session where research data is synthesized into empathetic user personas, explicitly defining user goals, behaviors, frustrations, and demographic archetypes.'
            },
            {
                name: 'Card Sorting Session',
                is_lab: true,
                description: 'An interactive information architecture exercise utilizing both open and closed card sorting techniques to analyze user mental models and inform menu structures.'
            },
            {
                name: 'IA Design Lab',
                is_lab: true,
                description: 'A hands-on technical lab focused on architecting comprehensive system navigation systems, detailed user flows, and hierarchical site maps for multi-tiered application environments.'
            },
            {
                name: 'Heuristic Walkthrough',
                is_lab: false,
                description: 'An analytical evaluation session where user interfaces are systematically inspected against Nielsen’s ten usability heuristics to identify critical interaction flaws and compliance violations.'
            },
            {
                name: 'Wireframe Sprint',
                is_lab: true,
                description: 'A rapid ideation design sprint focused on sketching low-fidelity layout concepts, establishing content priority, and exploring structural UI alternatives under fixed time boundaries.'
            },
            {
                name: 'Color & Contrast Lab',
                is_lab: true,
                description: 'A practical laboratory application utilizing color theory, semantic palette construction, and strict WCAG 2.1 accessibility tools to verify contrast ratios across digital layouts.'
            },
            {
                name: 'Gestalt Demo',
                is_lab: false,
                description: 'A live interface deconstruction demo analyzing real-world application screens to illustrate principles of visual perception including proximity, similarity, continuity, and closure.'
            },
            {
                name: 'Figma Components Lab',
                is_lab: true,
                description: 'An advanced software-based design lab training students to build scalable design tokens, reusable UI atomic components, responsive auto-layouts, and modular variant component sets.'
            },
            {
                name: 'Prototype Interaction Lab',
                is_lab: true,
                description: 'A technical workspace focused on converting static low-fidelity wireframes into functional high-fidelity user flows using custom interactive transitions, gestures, triggers, and overlays.'
            },
            {
                name: 'Micro-interaction Studio',
                is_lab: true,
                description: 'A specialized visual design workshop dedicated to crafting functional animations, state-change transitions, loading sequences, and tactile system button feedback parameters.'
            },
            {
                name: 'Accessibility Checklist Session',
                is_lab: false,
                description: 'A structured evaluation session auditing interface layouts against global regulatory standards like the Web Content Accessibility Guidelines (WCAG) for screen-reader navigation.'
            },
            {
                name: 'Usability Metrics Workshop',
                is_lab: false,
                description: 'A quantitative engineering workshop covering layout efficiency benchmarks such as task completion rates, user error frequencies, time-on-task metrics, and System Usability Scale (SUS) logging.'
            },
            {
                name: 'Moderated Test Practice',
                is_lab: false,
                description: 'A simulation-driven practical training lab where teams alternate roles as usability moderators and test participants, practicing script execution, un-biased prompting, and data logging.'
            },
            {
                name: 'Task Analysis Session',
                is_lab: false,
                description: 'A behavioral breakdown exercise focusing on decomposing complex multi-step user operations into discrete, logical interaction choices to eliminate friction along user pathways.'
            },
            {
                name: 'Iteration Planning',
                is_lab: false,
                description: 'A collaborative management session where product teams evaluate post-testing usability logs, isolate critical experience bugs, and plan redesign task allocations for upcoming sprints.'
            },
            {
                name: 'Research Synthesis Clinic',
                is_lab: false,
                description: 'An analytical data processing workshop dedicated to extracting meaningful user behavior trends from raw qualitative interview notes and converting findings into actionable insights.'
            },
            {
                name: 'Affinity Mapping Workshop',
                is_lab: false,
                description: 'A physical or digital collaborative clustering exercise used to visually isolate, categorize, and prioritize scattered design ideas, feature requests, and unstructured research observations.'
            },
            {
                name: 'Navigation Prototyping',
                is_lab: true,
                description: 'A targeted prototyping laboratory exploring dynamic interactive navigation patterns, comparing the usability of slide-out drawer menus, tab bars, breadcrumbs, and step-by-step systems.'
            },
            {
                name: 'Content Strategy Clinic',
                is_lab: false,
                description: 'A specialized copy editing workshop focused on interface microcopy optimization, defining brand voice consistency, writing clear inline validation errors, and designing readable headers.'
            },
            {
                name: 'Form Design Workshop',
                is_lab: false,
                description: 'A dedicated design session centered on input optimization best practices, covering multi-column layouts, inline confirmation loops, placeholder etiquette, and assistive help positioning.'
            },
            {
                name: 'Mobile-first Lab',
                is_lab: true,
                description: 'A progressive design lab forcing the architecture of user interfaces within tightly constrained screen areas before expanding layouts outwards across larger desktop monitors.'
            },
            {
                name: 'Responsive Grid Workshop',
                is_lab: true,
                description: 'A structural layout session guiding the setup of flexible 12-column grid structures, responsive breakpoints, fluid layout units, and flexbox alignment components.'
            },
            {
                name: 'Visual Hierarchy Studio',
                is_lab: true,
                description: 'An aesthetic composition studio focused on controlling user gaze and priority layout processing through strategic deployment of scale, typographical variations, whitespace, and tonal contrast.'
            },
            {
                name: 'Feedback Handling Lab',
                is_lab: true,
                description: 'A specialized interaction workspace designing elegant screen states for real-time notifications, modal confirmation systems, missing content placeholders, and transaction successes.'
            }
        ];

        const tlasToInsert = tlaSourceData.map((tla, idx) => ({
            tla_name: tla.name,
            description: tla.description,
            performed_by: (idx % 2 === 0) ? 'T' : 'S',
            class_phase: classPhases[idx % classPhases.length],
            is_lab: tla.is_lab,
            createdAt: now,
            updatedAt: now
        }));

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlasToInsert, {});

        // Fetch TLAs to ensure identity verification runs smoothly downstream in seed files
        const tlasRows = await queryInterface.sequelize.query(
            `SELECT tla_id, tla_name FROM TeachingAndLearningActivities ORDER BY tla_id ASC LIMIT ${tlaSourceData.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

// ============================================================================
// 8) TLA Assignment: 1 shared TLA assigned to multiple ILOTopics (Grouped)
// ============================================================================
        const topicTlaInserts = [];

        if (!Array.isArray(iloTopicsRows) || iloTopicsRows.length === 0) {
            throw new Error('iloTopicsRows is not defined or empty. Ensure ILOTopics are seeded before TopicTLAs.');
        }
        if (!Array.isArray(tlasRows) || tlasRows.length === 0) {
            throw new Error('tlasRows is not defined or empty. Ensure TLAs are seeded before TopicTLAs.');
        }

// Group size decides how many ILOTopics will share each unique TLA record.
// A group size of 2 means exactly two ILOTopics get assigned to the same TLA.
        const groupSize = 2;

        for (let i = 0; i < iloTopicsRows.length; i++) {
            const iloTopic = iloTopicsRows[i];

            if (!iloTopic || (iloTopic.ilo_topic_id == null)) {
                console.warn('Skipping invalid iloTopic row:', iloTopic);
                continue;
            }

            // Math.floor(i / groupSize) guarantees that the index pointer
            // stays on the SAME TLA for 'groupSize' iterations before moving to the next one!
            const rollingGroupIndex = Math.floor(i / groupSize);
            const tla = tlasRows[rollingGroupIndex % tlasRows.length];

            if (!tla || (tla.tla_id == null)) {
                throw new Error(`Missing TLA at index ${rollingGroupIndex % tlasRows.length}`);
            }

            topicTlaInserts.push({
                ilo_topic_id: Number(iloTopic.ilo_topic_id),
                tla_id: Number(tla.tla_id),
                createdAt: now,
                updatedAt: now
            });
        }

// Deduplicate pairs to safeguard database unique index constraints
        const seen2 = new Set();
        const deduped2 = [];
        for (const r of topicTlaInserts) {
            const key = `${r.ilo_topic_id}:${r.tla_id}`;
            if (!seen2.has(key)) {
                seen2.add(key);
                deduped2.push(r);
            }
        }

        if (deduped2.length === 0) {
            console.warn('No TopicTLA rows prepared; nothing to insert.');
        } else {
            try {
                await queryInterface.bulkInsert('TopicTLAs', deduped2, {});
                console.log(`Successfully inserted ${deduped2.length} TLA rows with a grouped distribution.`);
            } catch (err) {
                console.error('bulkInsert TopicTLAs failed:', err);
                throw err;
            }
        }


// ============================================================================
// 9) TLAAssessments: Aligned directly to the grouped relations
// ============================================================================
        const topicTlaRows = await queryInterface.sequelize.query(
            `SELECT
                 tt.topic_tla_id,
                 tt.tla_id,
                 it.topic_id,
                 it.ilo_id,
                 t.title AS topic_title,
                 ta.tla_name
             FROM TopicTLAs tt
                      JOIN ILOTopics it ON tt.ilo_topic_id = it.ilo_topic_id
                      JOIN Topics t ON it.topic_id = t.topic_id
                      JOIN TeachingAndLearningActivities ta ON tt.tla_id = ta.tla_id
             ORDER BY tt.topic_tla_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const tlasByIlo = {};
        for (const row of topicTlaRows) {
            if (!row.ilo_id) continue;
            tlasByIlo[row.ilo_id] = tlasByIlo[row.ilo_id] || [];
            tlasByIlo[row.ilo_id].push({
                tla_id: row.tla_id,
                tla_name: row.tla_name,
                topic_title: row.topic_title
            });
        }

        const ilosByCo = {};
        for (const ilo of ilosRows) {
            ilosByCo[ilo.co_id] = ilosByCo[ilo.co_id] || [];
            ilosByCo[ilo.co_id].push(ilo.ilo_id);
        }

        const periods = ['p', 'm', 's', 'f'];
        const assessmentTypes = ['Quiz', 'Lab Exercise', 'Project', 'Presentation', 'Case Study'];
        const tlaAssessmentInserts = [];

        const coIds = Object.keys(ilosByCo).map(Number).sort((a, b) => a - b);
        // Explicit weight mapping for ILO1 (20), ILO2 (30), ILO3 (50)
        const weightMap = [20, 30, 50];

        for (let coIndex = 0; coIndex < coIds.length; coIndex++) {
            const coId = coIds[coIndex];
            const iloIds = ilosByCo[coId] || [];
            const periodForThisCO = periods[coIndex % periods.length];

            for (let idx = 0; idx < iloIds.length; idx++) {
                const iloId = iloIds[idx];

                // Use the map to force weights: 20, 30, 50 based on the ILO position
                const weightNum = weightMap[idx] || 50;

                const tlaEntries = tlasByIlo[iloId] || [];

                // Fallback: If no TLA found, use a placeholder so the row is still created
                const effectiveEntries = tlaEntries.length > 0
                    ? tlaEntries
                    : [{
                        tla_id: (tlasRows && tlasRows.length > 0) ? tlasRows[0].tla_id : null,
                        tla_name: 'Foundational Activity',
                        topic_title: 'General Topic'
                    }];

                const desiredAssessments = Math.min(2, Math.max(1, effectiveEntries.length));

                const base = Math.floor(weightNum / desiredAssessments);
                const remainder = weightNum - base * desiredAssessments;
                const perAssessmentWeights = Array.from({ length: desiredAssessments }, (_, i) =>
                    i === desiredAssessments - 1 ? base + remainder : base
                );

                for (let a = 0; a < desiredAssessments; a++) {
                    const entry = effectiveEntries[a % effectiveEntries.length];
                    const assessmentType = assessmentTypes[(iloId + a) % assessmentTypes.length];

                    // If even our fallback failed to get a TLA_ID, skip this specific assessment
                    // but the ILO row will still exist because of the outer loop
                    if (!entry.tla_id) continue;

                    const assignedWeight = String(perAssessmentWeights[a]);

                    // Generate a high-quality, realistic contextual description based on the assessment type and topic title
                    let contextualDescription = '';
                    switch (assessmentType) {
                        case 'Quiz':
                            contextualDescription = `A comprehensive theoretical assessment measuring memory retention, rule frameworks, and process execution criteria for ${entry.topic_title}.`;
                            break;
                        case 'Lab Exercise':
                            contextualDescription = `A hands-on practical implementation lab focused on constructing configurations, layout components, and individual feature validations targeting ${entry.topic_title}.`;
                            break;
                        case 'Project':
                            contextualDescription = `An integrated milestone build task requiring teams to engineer, document, and deploy comprehensive workspace components utilizing principles of ${entry.topic_title}.`;
                            break;
                        case 'Presentation':
                            contextualDescription = `A structured interface walkthrough and technical design defense covering workflow architectures, testing methodologies, and iteration loops used during ${entry.topic_title}.`;
                            break;
                        case 'Case Study':
                            contextualDescription = `An analytical review and systems critique of existing implementation models, isolating transaction bottlenecks and outlining optimization plans regarding ${entry.topic_title}.`;
                            break;
                        default:
                            contextualDescription = `A structured performance metric check evaluating application competencies and design constraints regarding ${entry.topic_title}.`;
                    }

                    tlaAssessmentInserts.push({
                        tla_id: entry.tla_id,
                        name: assessmentType, // Strictly maps name to the standalone Assessment Type
                        description: contextualDescription, // Maps description to long-form realistic details
                        period: periodForThisCO,
                        weight: assignedWeight,
                        min_passing: 60,
                        createdAt: now,
                        updatedAt: now
                    });
                }
            }
        }

        await queryInterface.bulkInsert('TLAAssessments', tlaAssessmentInserts, {});
        console.log(`Successfully inserted ${tlaAssessmentInserts.length} TLAAssessment rows.`);

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
