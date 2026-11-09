'use strict';

/**
 * Seeder: composition foundational data
 * - Inserts Departments, Programs, Courses, Prerequisites,
 *   ProgramCourseOfferings, CourseOutcomes, ProgramOutcomes, ProgramOutcomeAlignments,
 *   CourseOfferingAssignments, References, IntendedLearningOutcomes, Weeks,
 *   Topics, Subtopics, WeeklyReferences, TeachingAndLearningActivities, TLAAssessments.
 *
 * Run: npx sequelize-cli db:seed --seed 20260512030000-seed-composition-foundation.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1) Departments
        // ============================================================================
        await queryInterface.bulkInsert('Departments', [
            { dept_id: 1, stakeholder_id: null, name: 'School of Business and Accountancy', code: 'SBA', createdAt: now, updatedAt: now },
            { dept_id: 2, stakeholder_id: null, name: 'College of Engineering and Architecture', code: 'CEA', createdAt: now, updatedAt: now },
            { dept_id: 3, stakeholder_id: null, name: 'School of Computer and Information Sciences', code: 'SCIS', createdAt: now, updatedAt: now },
            { dept_id: 4, stakeholder_id: null, name: 'College of Nursing', code: 'CON', createdAt: now, updatedAt: now },
            { dept_id: 5, stakeholder_id: null, name: 'Criminal Justice Education', code: 'CJE', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 2) Programs
        // ============================================================================
        await queryInterface.bulkInsert('Programs', [
            { program_id: 1, dept_id: 3, name: 'Bachelor of Science in Information Technology', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 2, dept_id: 3, name: 'Bachelor of Science in Computer Science', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 3, dept_id: 3, name: 'Associate in Computer Technology', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 4, dept_id: 3, name: 'Bachelor of Library and Information Science', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 5, dept_id: 1, name: 'Bachelor of Science in Accountancy', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 6, dept_id: 2, name: 'Bachelor of Science in Civil Engineering', stakeholder_id: null, createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 3) Courses
        // ============================================================================
        await queryInterface.bulkInsert('Courses', [
            {
                course_id: 1,
                course_no: 'BIT313L',
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
                course_no: 'BIT302',
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
                course_no: 'BIT202',
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
                course_no: 'BIT203',
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
                course_no: 'BIT204',
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
                course_no: 'BIT205',
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
                course_no: 'BIT206',
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
                course_no: 'BIT207',
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

        // ============================================================================
        // 4) Prerequisites
        // ============================================================================
        await queryInterface.bulkInsert('Prerequisites', [
            { prerequisite_id: 1, course_id: 1, prerequisite_course_id: 2, createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 5) ProgramCourseOfferings
        // ============================================================================
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
            }
        ], {});

        // ============================================================================
        // 6) CourseOutcomes (4 COs per Program Course Offering)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { co_id: 1, pc_offering_id: 1, co_description: 'CO1: Implement the core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing User Interface (UI) design for a software application.', createdAt: now, updatedAt: now },
            { co_id: 2, pc_offering_id: 1, co_description: 'CO2: Create User Experience (UX) designs for software applications by employing the User-Centered Design (UCD) process and integrating ISO 9241-210 standards', createdAt: now, updatedAt: now },
            { co_id: 3, pc_offering_id: 1, co_description: 'CO3: Develop a Front-End Prototype for the proposed software application that follows HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines', createdAt: now, updatedAt: now },
            { co_id: 4, pc_offering_id: 1, co_description: 'CO4: Defend the front-end prototype through usability testing and evaluation in UI/UX design.', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 7) ProgramOutcomes (BSIT program_id = 1)
        // ============================================================================
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
        await queryInterface.bulkInsert('ProgramOutcomes', bsitPOs, {});

        // ============================================================================
        // 8) ProgramOutcomeAlignments
        // ============================================================================
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
            { po_alignment_id: 12, co_id: 4, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 9) CourseOfferingAssignments
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [
            {
                pc_offering_id: 1,
                stakeholder_id: null,
                date_assigned: now,
                date_submitted: null,
                date_updated: null,
                createdAt: now,
                updatedAt: now
            }
        ], {});

        // ============================================================================
        // 10) References (Curated & Real-world Aligned)
        // ============================================================================
        const references = [
            // TEXTBOOKS (with standard ISBN, publication year, no link)
            { reference_id: 1, title: 'HCI Models, Theories, and Frameworks', author: 'John M. Carroll', isbn: '1-55860-808-7', link: null, publication_year: new Date('2003-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { reference_id: 2, title: 'Learn Human-Computer Interaction', author: 'Christopher Reid', isbn: '978-1-83882-032-9', link: null, publication_year: new Date('2020-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { reference_id: 3, title: 'Usability Testing Essentials', author: 'Carol M. Barnum', isbn: '978-0-12-375092-1', link: null, publication_year: new Date('2010-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { reference_id: 4, title: 'UX Design with Figma: User-Centered Interface Design and Prototyping with Figma', author: 'Tom Green & Kevin Golsby', isbn: '2945-7793', link: null, publication_year: new Date('2024-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { reference_id: 5, title: 'Web Accessibility: Web Standards and Regulatory Compliance', author: 'Tom Green & Kevin Golsby', isbn: '978-1-59059-638-8', link: null, publication_year: new Date('2006-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },

            // ONLINE / OER / TECHNICAL GUIDELINES (with URLs)
            { reference_id: 6, title: 'Beyond Vibe-coding', author: 'Addy Osmani', isbn: null, link: 'https://oreilly.com', publication_year: new Date('2024-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { reference_id: 7, title: 'UX Design Principles', author: 'UXcel', isbn: null, link: 'https://app.uxcel.com', publication_year: new Date('2023-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { reference_id: 8, title: 'Color Theory For Dummies', author: 'Eric Hibit', isbn: null, link: 'https://oreilly.com', publication_year: new Date('2022-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { reference_id: 9, title: 'Universal Principles of Typography', author: 'Elliot Jay Stocks', isbn: null, link: 'https://oreilly.com', publication_year: new Date('2023-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { reference_id: 10, title: 'Atomic Design', author: 'Brad Frost', isbn: null, link: 'https://atomicdesign.bradfrost.com', publication_year: new Date('2016-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { reference_id: 11, title: 'Guide to Developer Handoff', author: 'Figma', isbn: null, link: 'https://figma.com', publication_year: new Date('2023-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { reference_id: 12, title: 'ISO 9241-210:2019 Ergonomics of human-system interaction', author: 'ISO', isbn: null, link: 'https://iso.org', publication_year: new Date('2019-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 13, title: 'UI Principles', author: 'Figma', isbn: null, link: 'https://figma.com', publication_year: new Date('2021-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 14, title: 'Imagery', author: 'Figma', isbn: null, link: 'https://figma.com', publication_year: new Date('2021-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 15, title: 'Design Guidelines', author: 'Material Design', isbn: null, link: 'https://m2.material.io', publication_year: new Date('2021-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 16, title: 'Design Composition and Layout', author: '99Designs', isbn: null, link: 'https://99designs.com', publication_year: new Date('2020-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 17, title: 'UX Case Studies', author: 'Interaction Design Foundation', isbn: null, link: 'https://interaction-design.org', publication_year: new Date('2022-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 18, title: 'Introduction to Generative AI', author: 'Google Certification', isbn: null, link: 'https://cloud.google.com', publication_year: new Date('2023-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 19, title: 'UXPilot', author: 'UXPilot', isbn: null, link: 'https://uxpilot.ai', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },

            // LINKEDIN LEARNING AI-DRIVEN DESIGN COURSES & INSTITUTIONAL RESOURCES
            { reference_id: 20, title: 'The AI-Driven Product Designer', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 21, title: 'Using AI in the UX Design Process', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 22, title: 'Using AI for UX Design and Research', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 23, title: 'Using AI Tools for UX Design', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 24, title: 'Design Thinking in the Age of AI', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 25, title: 'Ethical, Human-Centric AI Design', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 26, title: 'Design to Code: Using AI to Build Faster', author: 'LinkedIn Learning', isbn: null, link: 'https://linkedin.com/learning', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { reference_id: 27, title: 'UNC Student Handbook', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: new Date('2024-06-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { reference_id: 28, title: 'CCS VMO Curated Materials', author: 'CCS Dean\'s Office', isbn: null, link: 'https://unc.edu.ph/ccs-vmo', publication_year: new Date('2024-06-01'), type: 'OER', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('References', references, {});

        // ============================================================================
        // 11) Intended Learning Outcomes (4 for CO1 with orientation, 3 each for CO2..CO4)
        // ============================================================================
        const ilos = [
            // CO1 (Prelim Academic Period) - 4 ILOs (1 Orientation + 3 Graded)
            {
                ilo_id: 1,
                co_id: 1,
                description: " Cite the value and relevance \n of  the University's and the \n College's VMO as related to \n the course ",
                is_orientation: true,
                createdAt: now,
                updatedAt: now
            },
            { ilo_id: 2, co_id: 1, description: 'Distinguish the core concepts, principles, and theories in designing user interfaces.', assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { ilo_id: 3, co_id: 1, description: 'Determine how to use design tools proficiently in creating and refining user interface elements.', assessment_tool: 'Objective Type Activity (Figma)', createdAt: now, updatedAt: now },
            { ilo_id: 4, co_id: 1, description: 'Propose a comprehensive User Interface (UI) design for a specified software application by applying the core HCI concepts, theories, and principles.', assessment_tool: 'UI Design Proposal', createdAt: now, updatedAt: now },

            // CO2 (Midterm Academic Period) - 3 ILOs
            { ilo_id: 5, co_id: 2, description: 'Distinguish user research methodologies, user personas, and user-centered design (UCD) process frameworks.', assessment_tool: 'Objective Type Quiz (UCD)', createdAt: now, updatedAt: now },
            { ilo_id: 6, co_id: 2, description: 'Determine how to build structurally-sound wireframes and layout compositions based on usability conventions.', assessment_tool: 'UCD Process Document', createdAt: now, updatedAt: now },
            { ilo_id: 7, co_id: 2, description: 'Propose a cohesive User Experience (UX) wireframe package and user journey framework applying standard UCD principles.', assessment_tool: 'UI/UX Design Presentation', createdAt: now, updatedAt: now },

            // CO3 (Semifinal Academic Period) - 3 ILOs
            { ilo_id: 8, co_id: 3, description: 'Distinguish dynamic visual architectures, advanced component patterns, and global accessibility standards.', assessment_tool: 'Objective Type Quiz (UX laws and Accessibility Standards)', createdAt: now, updatedAt: now },
            { ilo_id: 9, co_id: 3, description: 'Determine how to implement screen reader and keyboard navigation considerations in interactive prototype elements.', assessment_tool: 'UI/UX Design Implementation Document', createdAt: now, updatedAt: now },
            { ilo_id: 10, co_id: 3, description: 'Propose a fully-interactive high-fidelity mockup with micro-interactions, conforming to WCAG 2.1 regulatory standards.', assessment_tool: 'Front-end Code Presentation', createdAt: now, updatedAt: now },

            // CO4 (Final Academic Period) - 3 ILOs
            { ilo_id: 11, co_id: 4, description: 'Distinguish qualitative and quantitative usability metrics, testing methodologies, and analytical protocols.', assessment_tool: 'Objective type Quiz (Usability Testing)', createdAt: now, updatedAt: now },
            { ilo_id: 12, co_id: 4, description: 'Determine how to analyze user performance data, time-on-task, and error rates from moderated evaluative tests.', assessment_tool: 'Prototype Evaluation Document', createdAt: now, updatedAt: now },
            { ilo_id: 13, co_id: 4, description: 'Propose a comprehensive Usability Evaluation and Design Handoff Report backed by empirical testing feedback.', assessment_tool: 'Front-End Prototype Presentation', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', ilos, {});

        // ============================================================================
        // 12) Weeks (4 weeks per Course Outcome = 16 Weeks total, hours = 5.00 each)
        // ============================================================================
        const weeks = [];
        let weekCounter = 1;
        for (let coId = 1; coId <= 4; coId++) {
            for (let w = 1; w <= 4; w++) {
                weeks.push({
                    week_id: weekCounter++,
                    co_id: coId,
                    hours: 5.00,
                    createdAt: now,
                    updatedAt: now
                });
            }
        }
        await queryInterface.bulkInsert('Weeks', weeks, {});

        // ============================================================================
        // 13) WeeklyReferences (2 curated references per Week = 32 records)
        // ============================================================================
        // Mapped thoughtfully so each week's references directly support its 2 topics
        const weeklyReferencePairs = [
            [27, 28], // Week 1: UNC Student Handbook & CCS VMO Curated Materials
            [1, 18],  // Week 2: HCI Models, Theories, and Frameworks & Introduction to Generative AI
            [2, 7],   // Week 3: Learn Human-Computer Interaction & UX Design Principles
            [4, 25],  // Week 4: UX Design with Figma & Ethical, Human-Centric AI Design
            [12, 22], // Week 5: ISO 9241-210:2019 Ergonomics & Using AI for UX Design and Research
            [2, 17],  // Week 6: Learn Human-Computer Interaction & UX Case Studies
            [4, 16],  // Week 7: UX Design with Figma & Design Composition and Layout
            [8, 9],   // Week 8: Color Theory For Dummies & Universal Principles of Typography
            [10, 13], // Week 9: Atomic Design & UI Principles
            [14, 15], // Week 10: Imagery & Material Design Guidelines
            [4, 23],  // Week 11: UX Design with Figma & Using AI Tools for UX Design
            [5, 20],  // Week 12: Web Accessibility & The AI-Driven Product Designer
            [3, 21],  // Week 13: Usability Testing Essentials & Using AI in the UX Design Process
            [3, 19],  // Week 14: Usability Testing Essentials & UXPilot
            [24, 6],  // Week 15: Design Thinking in the Age of AI & Beyond Vibe-coding
            [11, 26]  // Week 16: Guide to Developer Handoff & Design to Code: Using AI to Build Faster
        ];

        const weeklyReferences = [];
        let wrId = 1;
        for (let wIdx = 0; wIdx < 16; wIdx++) {
            const weekId = wIdx + 1;
            const [ref1, ref2] = weeklyReferencePairs[wIdx];
            weeklyReferences.push({
                weekly_reference_id: wrId++,
                week_id: weekId,
                reference_id: ref1,
                is_orientation: weekId === 1,
                createdAt: now,
                updatedAt: now
            });
            weeklyReferences.push({
                weekly_reference_id: wrId++,
                week_id: weekId,
                reference_id: ref2,
                is_orientation: false,
                createdAt: now,
                updatedAt: now
            });
        }
        await queryInterface.bulkInsert('WeeklyReferences', weeklyReferences, {});

        // ============================================================================
        // 14) Topics & Subtopics (2 parent Topics per Week = 32 Topics;
        //     3 Subtopics per Topic = 6 Subtopics per Week = 96 Subtopics total)
        // ============================================================================
        const weeklyCurriculum = [
            // ---------------- CO1: Weeks 1 - 4 ----------------
            {
                week_id: 1,
                topics: [
                    {
                        title: 'Course Orientation and VMO Alignment',
                        is_orientation: true,
                        subtopics: [
                            'University and College VMO, Core Values, and Quality Policy',
                            'Course Outline, Course Description, and Classroom Policies',
                            'AI Usage Policy and Course Requirements'
                        ]
                    },
                    {
                        title: 'Foundations of Interactive Computing and Academic Ethics',
                        is_orientation: false,
                        subtopics: [
                            'Evolution of Interactive Computing Paradigms and Ubiquitous Systems',
                            'Interdisciplinary Foundations of HCI in Psychology, Ergonomics, and Design',
                            'Professional Ethics and Academic Integrity in Interface Engineering'
                        ]
                    }
                ]
            },
            {
                week_id: 2,
                topics: [
                    {
                        title: 'Cognitive Models in HCI',
                        subtopics: [
                            'Goals, Operators, Methods, and Selection Rules (GOMS) Model',
                            'Keystroke-Level Model (KLM) and Execution Time Prediction',
                            'Fitts\'s Law, Hick\'s Law, and Mental vs. Conceptual Models'
                        ]
                    },
                    {
                        title: 'Human Information Processing and Perceptual Psychology',
                        subtopics: [
                            'Visual, Auditory, and Haptic Sensory Channels in Digital Interaction',
                            'Working Memory Constraints, Cognitive Load Theory, and Information Chunking',
                            'Selective Attention, Change Blindness, and Human Error Taxonomy'
                        ]
                    }
                ]
            },
            {
                week_id: 3,
                topics: [
                    {
                        title: 'Introduction to Human-Computer Interaction (HCI)',
                        subtopics: [
                            'Human Factors and Ergonomic Considerations in Interactive Systems',
                            'Computer Systems Architecture and Interface Hardware Components',
                            'Norman\'s Execution-Evaluation Interaction Cycle and Gulf Analysis'
                        ]
                    },
                    {
                        title: 'Usability Heuristics and Interaction Paradigms',
                        subtopics: [
                            'Don Norman\'s Core Principles: Affordances, Signifiers, Mapping, and Feedback',
                            'Jakob Nielsen\'s Ten Usability Heuristics for User Interface Design',
                            'Direct Manipulation, Menu Selection, Form Fill-in, and Conversational Interfaces'
                        ]
                    }
                ]
            },
            {
                week_id: 4,
                topics: [
                    {
                        title: 'Introduction to User Interface (UI) Design',
                        subtopics: [
                            'Fundamentals and Visual Anatomy of Modern User Interfaces',
                            'Figma Workspace Architecture, Frames, Constraints, and Vector Networks',
                            'Structuring Software UI Proposals and Design Concept Specifications'
                        ]
                    },
                    {
                        title: 'Ethical AI Integration and Prompt Engineering in UI Design',
                        subtopics: [
                            'Artificial Intelligence Tools and Generative Workflows for UI Ideation',
                            'Prompt Engineering Practices, Originality, and Proper Attribution',
                            'Privacy, Data Protection, and Critical Evaluation of AI-Generated Assets'
                        ]
                    }
                ]
            },

            // ---------------- CO2: Weeks 5 - 8 ----------------
            {
                week_id: 5,
                topics: [
                    {
                        title: 'User-Centered Design (UCD) Frameworks and Persona Crafting',
                        subtopics: [
                            'UCD Lifecycle Phases and ISO 9241-210 Human-System Interaction Standards',
                            'Target Audience Demographic, Psychographic, and Behavioral Profiling',
                            'Data-Driven User Persona Archetypes and Empathy Mapping Workflows'
                        ]
                    },
                    {
                        title: 'Contextual Inquiry and Qualitative User Research Methods',
                        subtopics: [
                            'Stakeholder Interviews, Ethnographic Field Studies, and Contextual Inquiry',
                            'Affinity Diagramming and Thematic Synthesis of Qualitative Field Notes',
                            'Translating User Research Insights into Actionable Problem Statements'
                        ]
                    }
                ]
            },
            {
                week_id: 6,
                topics: [
                    {
                        title: 'Information Architecture and User Navigation Flow',
                        subtopics: [
                            'Hierarchical, Sequential, Matrix, and Faceted Navigation Design Patterns',
                            'Comprehensive Sitemaps and System Task Flow Diagramming',
                            'Open and Closed Card Sorting Protocols for Category Optimization'
                        ]
                    },
                    {
                        title: 'Customer Journey Mapping and Task Analysis',
                        subtopics: [
                            'Hierarchical Task Analysis (HTA) and Sub-goal Decomposition',
                            'End-to-End User Journey Mapping Across Multi-Channel Touchpoints',
                            'Identifying Friction Points, Emotional Lows, and Service Recovery Opportunities'
                        ]
                    }
                ]
            },
            {
                week_id: 7,
                topics: [
                    {
                        title: 'Wireframing Essentials and Layout Compositions',
                        subtopics: [
                            'Low-Fidelity Ideation Sketches and Crazy Eights Rapid Wireframing',
                            'Digital Wireframing Conventions, Content Placeholders, and Annotation Specs',
                            'Responsive Grid Systems, Breakpoints, and Touch Target Sizing'
                        ]
                    },
                    {
                        title: 'Responsive Grid Architectures and Spatial Hierarchy',
                        subtopics: [
                            'Multi-Column, Modular, and Baseline Grid Systems for Cross-Device Layouts',
                            'Visual Scanning Patterns: F-Pattern and Z-Pattern Content Placement',
                            'Iterative Wireframe Walkthroughs and Structural Layout Validation'
                        ]
                    }
                ]
            },
            {
                week_id: 8,
                topics: [
                    {
                        title: 'Visual Design and Gestalt Principles in User Interfaces',
                        subtopics: [
                            'Gestalt Laws of Proximity, Similarity, Continuity, Closure, and Common Fate',
                            'Color Theory, 60-30-10 Palette Ratios, and Semantic Status Colors',
                            'Typographic Scales, Line Length, Vertical Rhythm, and Spatial Balance'
                        ]
                    },
                    {
                        title: 'UX Design Documentation and Stakeholder Presentation',
                        subtopics: [
                            'Compiling Comprehensive UCD Process and Wireframe Specification Packages',
                            'Storyboarding User Scenarios to Communicate UX Value Propositions',
                            'Defending Wireframe Architecture and Interaction Flows in Design Critiques'
                        ]
                    }
                ]
            },

            // ---------------- CO3: Weeks 9 - 12 ----------------
            {
                week_id: 9,
                topics: [
                    {
                        title: 'Advanced Component Modeling and Responsive Systems in Figma',
                        subtopics: [
                            'Atomic Design Methodology: Atoms, Molecules, Organisms, and Templates',
                            'Structuring Modular Figma Master Components, Variants, and Boolean Properties',
                            'Responsive Component Resizing Using Nested Auto Layout Configurations'
                        ]
                    },
                    {
                        title: 'Design Tokens and Scalable UI Library Governance',
                        subtopics: [
                            'Defining Global, Alias, and Component-Specific Design Tokens for Color and Spacing',
                            'Implementing Light, Dark, and High-Contrast Theme Modes with Figma Variables',
                            'Publishing, Versioning, and Maintaining Collaborative Team Component Libraries'
                        ]
                    }
                ]
            },
            {
                week_id: 10,
                topics: [
                    {
                        title: 'Visual Assets, Iconography, and High-Fidelity Surface Design',
                        subtopics: [
                            'Vector Iconography Standards, Stroke Consistency, and Pixel Grid Alignment',
                            'High-Resolution Imagery Optimization, Aspect Ratios, and Focal Point Cropping',
                            'Elevation Systems, Drop Shadows, Glassmorphism, and Surface Depth Cues'
                        ]
                    },
                    {
                        title: 'Cross-Platform Design Guidelines and Adaptive Patterns',
                        subtopics: [
                            'Material Design 3 and Apple Human Interface Guidelines (HIG) Core Conventions',
                            'Adaptive Navigation Patterns: Bottom Bars, Navigation Drawers, and Rail Systems',
                            'Designing Empty States, Skeleton Loaders, and Progressive Onboarding Flows'
                        ]
                    }
                ]
            },
            {
                week_id: 11,
                topics: [
                    {
                        title: 'Interactive Dynamic Prototyping and Micro-interaction Workflows',
                        subtopics: [
                            'Interactive Noodle Connections, Smart Animate Transitions, and Contextual Overlays',
                            'Trigger-Action Rules, Conditional Logic, and Variable-Driven Prototype States',
                            'Designing Micro-interactions: Button States, Toggle Physics, and Pull-to-Refresh'
                        ]
                    },
                    {
                        title: 'State Management, Form Validation, and Feedback Loops',
                        subtopics: [
                            'Interactive Input Masks, Inline Real-Time Validation, and Error Recovery Prompts',
                            'Multi-Step Wizard Flows, Progress Indicators, and Confirmation Modals',
                            'Toast Notifications, Non-Blocking Alerts, and Optimistic UI Feedback States'
                        ]
                    }
                ]
            },
            {
                week_id: 12,
                topics: [
                    {
                        title: 'Web Accessibility Standards (WCAG 2.1) and Auditing Protocols',
                        subtopics: [
                            'POUR Accessibility Pillars: Perceivable, Operable, Understandable, and Robust',
                            'WCAG AA/AAA Contrast Compliance, Non-Text Contrast, and Color-Blindness Simulation',
                            'Keyboard-Only Navigation, Focus Ring Visibility, and Logical Tab Order Auditing'
                        ]
                    },
                    {
                        title: 'Assistive Technology Compatibility and Accessible Front-End Prototyping',
                        subtopics: [
                            'Screen Reader Landmarks, Semantic Heading Hierarchies, and ARIA Live Regions',
                            'Accessible Form Labels, Error Announcements, and Skip-Navigation Links',
                            'Presenting and Auditing Interactive Front-End Prototypes Against WCAG 2.1 Checklists'
                        ]
                    }
                ]
            },

            // ---------------- CO4: Weeks 13 - 16 ----------------
            {
                week_id: 13,
                topics: [
                    {
                        title: 'Usability Evaluation Metrics and Test Formulations',
                        subtopics: [
                            'Formative vs. Summative Usability Evaluation Methodologies',
                            'Quantitative Metrics: Task Completion Rate, Time-on-Task, and Error Frequency',
                            'Drafting Comprehensive Usability Test Plans, Screener Surveys, and Consent Forms'
                        ]
                    },
                    {
                        title: 'Heuristic Inspection and Cognitive Walkthrough Protocols',
                        subtopics: [
                            'Executing Structured Expert Heuristic Evaluations with Severity Rating Scales',
                            'Conducting Task-Based Cognitive Walkthroughs to Uncover Learnability Barriers',
                            'Writing Unbiased, Representative User Testing Scenarios and Moderator Scripts'
                        ]
                    }
                ]
            },
            {
                week_id: 14,
                topics: [
                    {
                        title: 'Moderated Usability Testing Execution and Data Synthesis',
                        subtopics: [
                            'Facilitating In-Person and Remote Moderated Usability Testing Sessions',
                            'Concurrent and Retrospective Think-Aloud Protocols and Observer Note-Taking',
                            'Preventing Moderator Bias, Leading Questions, and Hawthorne Effect Distortions'
                        ]
                    },
                    {
                        title: 'Psychometric Usability Scales and Behavioral Analytics',
                        subtopics: [
                            'Administering and Scoring the System Usability Scale (SUS) Questionnaire',
                            'Post-Task Single Ease Question (SEQ) and NASA-TLX Workload Assessments',
                            'Analyzing Clickstream Heatmaps, Misclick Rates, and Navigation Drop-off Funnels'
                        ]
                    }
                ]
            },
            {
                week_id: 15,
                topics: [
                    {
                        title: 'Quantitative and Qualitative Usability Data Triangulation',
                        subtopics: [
                            'Synthesizing Qualitative Observation Logs with Quantitative Task Performance Metrics',
                            'Categorizing Usability Defects by Frequency, Impact, and Persistence',
                            'Prioritizing Design Remediation Backlogs Using Impact-Effort Matrices'
                        ]
                    },
                    {
                        title: 'Empirically-Driven UI/UX Refinement Sprints',
                        subtopics: [
                            'Redesigning High-Friction Navigation Flows Based on Empirical User Evidence',
                            'A/B Comparison of Baseline vs. Refined Prototype Interaction Flows',
                            'Validating Post-Iteration Usability Improvements Through Verification Rounds'
                        ]
                    }
                ]
            },
            {
                week_id: 16,
                topics: [
                    {
                        title: 'Empirically-Driven Layout Iterations and Developer Handoff',
                        subtopics: [
                            'Preparing Redline Specifications, Spacing Measurements, and CSS Token Exports in Figma',
                            'Documenting Edge Cases, Responsive Breakpoint Behaviors, and Asset Export Pipelines',
                            'Writing Professional Usability Evaluation and Engineering Handoff Reports'
                        ]
                    },
                    {
                        title: 'Capstone Front-End Prototype Defense and Portfolio Presentation',
                        subtopics: [
                            'Structuring an End-to-End UX Case Study: Problem, Process, Solution, and Impact',
                            'Live Demonstration of the Validated High-Fidelity Front-End Prototype',
                            'Oral Defense of Design Decisions, Accessibility Compliance, and Usability Metrics'
                        ]
                    }
                ]
            }
        ];

        const topicsToInsert = [];
        const subtopicsToInsert = [];
        let topicIdCounter = 1;
        let subtopicIdCounter = 1;

        for (const weekBlock of weeklyCurriculum) {
            for (const topicObj of weekBlock.topics) {
                const currentTopicId = topicIdCounter++;
                topicsToInsert.push({
                    topic_id: currentTopicId,
                    title: topicObj.title,
                    createdAt: now,
                    updatedAt: now
                });

                topicObj.subtopics.forEach((subTitle, idx) => {
                    subtopicsToInsert.push({
                        subtopic_id: subtopicIdCounter++,
                        week_id: weekBlock.week_id,
                        topic_id: currentTopicId,
                        title: subTitle,
                        sequence_order: idx + 1,
                        is_orientation: Boolean(topicObj.is_orientation),
                        createdAt: now,
                        updatedAt: now
                    });
                });
            }
        }

        await queryInterface.bulkInsert('Topics', topicsToInsert, {});
        await queryInterface.bulkInsert('Subtopics', subtopicsToInsert, {});

        // ============================================================================
        // 15) Teaching and Learning Activities (6 TLAs per Week: 2 preclass, 2 inclass, 2 postclass = 96 TLAs)
        //     & 16) TLAAssessments (3 assessments per Week = 48 TLAAssessments;
        //           including 3 fixed ILO assessments per CO with ilo_id for Criteria for Grading)
        // ============================================================================
        const weeklyTlasAndAssessments = [
            // ---------------- WEEK 1 (CO1) ----------------
            {
                week_id: 1,
                period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'UNC & CCS VMO Documentary Reading', desc: 'Students read the University of Nueva Caceres Student Handbook and CCS VMO curated materials to understand institutional core values and program outcomes.' },
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'Personal Learning Goal & AI Ethics Self-Survey', desc: 'Complete a diagnostic reflection survey on prior interface design exposure and ethical expectations regarding generative AI usage in coursework.' },
                    { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation & Flipped Classroom Briefing', desc: 'Interactive lecture covering the course syllabus, grading system, classroom policies, MQUAP LinkedIn Learning integration, and the institutional AI usage policy.' },
                    { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'Collaborative VMO-to-HCI Alignment Workshop', desc: 'Small-group workshop mapping how ethical Human-Computer Interaction practices directly support the College of Computer Studies Vision, Mission, and Objectives.' },
                    { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO Visual Alignment Infographic', desc: 'Design a one-page digital infographic illustrating personal commitments to UNC core values and responsible AI citizenship in software design.' },
                    { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Google Introduction to Generative AI Certification', desc: 'Self-paced completion of the introductory generative AI module to establish foundational literacy before UI ideation.' }
                ],
                assessments: [
                    { tlaIdx: 2, ilo_id: null, name: 'VMO & Course Policy Reflection Check', weight: '0', desc: 'Formative check verifying student comprehension of course expectations, academic integrity rules, and VMO alignment.' },
                    { tlaIdx: 3, ilo_id: null, name: 'Interactive Computing Paradigm Matrix', weight: '0', desc: 'In-class group worksheet evaluating historical shifts from command-line systems to ubiquitous computing interfaces.' },
                    { tlaIdx: 4, ilo_id: null, name: 'VMO Alignment Infographic Rubric', weight: '0', desc: 'Formative evaluation of the visual clarity and institutional alignment of the student VMO poster.' }
                ]
            },

            // ---------------- WEEK 2 (CO1 - Graded ILO 1: ilo_id = 2) ----------------
            {
                week_id: 2,
                period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Carroll Cognitive Models Chapter Study', desc: 'Read assigned chapters on GOMS, Keystroke-Level Modeling, and human information processing from HCI Models, Theories, and Frameworks.' },
                    { phase: 'preclass', by: 'S', lab: false, name: 'Everyday Interface Gulf Analysis Journal', desc: 'Document two real-world digital interfaces exhibiting wide Gulfs of Execution or Evaluation with annotated screenshots.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Cognitive Engineering & Predictive Modeling Seminar', desc: 'Socratic lecture and analytical walkthrough of GOMS operators, KLM execution time formulas, Fitts\'s Law index of difficulty, and Hick-Hyman decision laws.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'KLM & Fitts\'s Law Target Timing Laboratory', desc: 'Hands-on laboratory where students calculate predicted task completion times using KLM operators and empirically test target acquisition speeds across varying UI layouts.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Cognitive Load Interface Deconstruction Report', desc: 'Analyze an enterprise web form to identify working memory bottlenecks and propose chunking and recognition-over-recall improvements.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Mental vs. Conceptual Model Case Critique', desc: 'Write a comparative critique examining how mismatched designer conceptual models and user mental models induce operational errors.' }
                ],
                assessments: [
                    { tlaIdx: 2, ilo_id: 2, name: 'Objective-Type Quiz', weight: '20', desc: 'Covering interactive component theories and human cognitive load.' },
                    { tlaIdx: 3, ilo_id: null, name: 'KLM Execution Time Calculation Worksheet', weight: '0', desc: 'Practical lab worksheet scoring accuracy of GOMS/KLM operator decompositions and Fitts\'s Law computations.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Cognitive Bottleneck Audit Brief', weight: '0', desc: 'Formative assessment of the student\'s interface cognitive load deconstruction and memory chunking recommendations.' }
                ]
            },

            // ---------------- WEEK 3 (CO1 - Graded ILO 2: ilo_id = 3) ----------------
            {
                week_id: 3,
                period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Norman Principles & Nielsen Heuristics Reading', desc: 'Study Christopher Reid\'s chapters on usability principles, affordances, signifiers, and Jakob Nielsen\'s ten usability heuristics.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Figma Vector Networks & Constraints Warm-up', desc: 'Complete guided pre-lab exercises on Figma frame hierarchies, layout grids, vector pen operations, and constraint pinning.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Usability Heuristics & Interaction Styles Colloquium', desc: 'Instructor-led case analysis dissecting heuristic violations in commercial applications and contrasting direct manipulation with conversational UIs.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Figma Interface Elements & Precision Layout Practicum', desc: 'Supervised laboratory practicum where students construct reusable UI control elements, navigation bars, and cards adhering to strict usability conventions in Figma.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Ten-Heuristic UI Inspection Portfolio', desc: 'Perform a structured heuristic review of a chosen public service web portal and illustrate redesigned UI elements in Figma.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Interaction Style Comparative Essay', desc: 'Evaluate trade-offs between direct manipulation, menu-driven, and command-based interaction styles for novice versus expert users.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: 3, name: 'Objective Type Activity', weight: '30', desc: 'Hands-on UI layout development exercise utilizing Figma component design engines.' },
                    { tlaIdx: 2, ilo_id: null, name: 'Heuristic Violation Spot-Check', weight: '0', desc: 'In-class diagnostic exercise identifying and classifying Nielsen heuristic violations from live interface screenshots.' },
                    { tlaIdx: 4, ilo_id: null, name: 'UI Control Element Craftsmanship Check', weight: '0', desc: 'Formative lab review verifying pixel alignment, constraint behavior, and visual affordances of constructed Figma controls.' }
                ]
            },

            // ---------------- WEEK 4 (CO1 - Graded ILO 3: ilo_id = 4) ----------------
            {
                week_id: 4,
                period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'AI-Assisted UI Ideation & Attribution Guidelines Study', desc: 'Review LinkedIn Learning modules on Ethical, Human-Centric AI Design and institutional guidelines for transparent AI prompt attribution.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Problem Domain & Application Concept Brief', desc: 'Draft a preliminary software application problem statement and target user summary for the Prelim UI Design Proposal.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'UI Architecture & Prompt Engineering Masterclass', desc: 'Live demonstration of ethical AI prompt engineering for moodboarding followed by manual human refinement and HCI principle verification.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Software UI Design Proposal Studio & Critiques', desc: 'Studio session where students assemble their comprehensive User Interface Design Proposal in Figma and defend their theoretical HCI rationale.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Finalized Prelim UI Design Proposal Submission', desc: 'Package the refined UI screens, AI prompt attribution log, and theoretical HCI justification document for Prelim portfolio archiving.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Peer UI Proposal Heuristic Feedback Log', desc: 'Provide structured peer review comments on two classmates\' UI proposals focusing on conceptual clarity and visual signifiers.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: 4, name: 'UI Design Proposal', weight: '50', desc: 'A thorough system layout mock proposal document outlining visual composition strategies and interaction models.' },
                    { tlaIdx: 2, ilo_id: null, name: 'AI Prompt Attribution & Ethics Checklist', weight: '0', desc: 'Verification of proper prompt documentation, originality compliance, and critical human refinement of AI-assisted concepts.' },
                    { tlaIdx: 5, ilo_id: null, name: 'Prelim Studio Peer Critique Rubric', weight: '0', desc: 'Formative evaluation of constructive peer feedback quality during the Prelim UI proposal studio.' }
                ]
            },

            // ---------------- WEEK 5 (CO2 - Graded ILO 1: ilo_id = 5) ----------------
            {
                week_id: 5,
                period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'ISO 9241-210 Standard & UCD Lifecycle Reading', desc: 'Read the ISO 9241-210:2019 ergonomics of human-system interaction guidelines and LinkedIn Learning modules on AI in UX research.' },
                    { phase: 'preclass', by: 'S', lab: false, name: 'Contextual Inquiry Interview Guide Preparation', desc: 'Formulate open-ended user interview questions and observation protocols tailored to the target software application domain.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'User-Centered Design & Persona Engineering Lecture', desc: 'In-depth lecture on ISO 9241-210 iterative UCD stages, qualitative affinity diagramming, empathy mapping, and behavioral persona construction.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Affinity Mapping & Empathy Modeling Workshop', desc: 'Collaborative lab synthesizing raw user interview transcripts into thematic affinity clusters, empathy maps, and primary/secondary user personas.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Data-Driven Persona & Scenario Dossier', desc: 'Create high-resolution user persona cards and context-of-use narrative scenarios backed by empirical interview findings.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Research Bias & Demographic Inclusivity Audit', desc: 'Review persona assumptions to eliminate stereotyping and ensure edge-case user populations are represented.' }
                ],
                assessments: [
                    { tlaIdx: 2, ilo_id: 5, name: 'Objective-Type Quiz', weight: '20', desc: 'Covering User-Centered Design paradigms and audience analysis methodologies.' },
                    { tlaIdx: 3, ilo_id: null, name: 'Persona & Empathy Map Synthesis Rubric', weight: '0', desc: 'In-class workshop evaluation of how accurately student personas reflect synthesized qualitative research data.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Contextual Inquiry Protocol Review', weight: '0', desc: 'Formative check of interview script neutrality and ethical participant profiling.' }
                ]
            },

            // ---------------- WEEK 6 (CO2 - Graded ILO 2: ilo_id = 6) ----------------
            {
                week_id: 6,
                period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Information Architecture & Card Sorting Study', desc: 'Study Interaction Design Foundation case studies on hierarchical, matrix, and faceted information architecture and card sorting methodologies.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Content Inventory & Feature Taxonomy Spreadsheet', desc: 'Compile a complete inventory of content items, actions, and functional modules required for the target software application.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Information Architecture & Journey Mapping Seminar', desc: 'Detailed analysis of ontology, taxonomy, choreography in IA, Hierarchical Task Analysis (HTA), and multi-touchpoint customer journey maps.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Card Sorting, Sitemap & UCD Process Documentation Lab', desc: 'Hands-on laboratory conducting open/closed card sorting sessions and compiling the formal UCD Process Document with sitemaps and task flows.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Interactive System Flow & Journey Map Package', desc: 'Finalize end-to-end user journey diagrams highlighting user goals, pain points, and system state transitions.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Navigation Taxonomy Dendrogram Analysis', desc: 'Interpret card sorting similarity matrices to justify top-level and secondary navigation labels.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: 6, name: 'UCD Process Document', weight: '30', desc: 'A formal process document containing research-driven user profiles, empathy maps, and system site flows.' },
                    { tlaIdx: 2, ilo_id: null, name: 'Card Sorting & Sitemap Coherence Check', weight: '0', desc: 'Formative evaluation of navigation hierarchy depth, breadth balance, and label clarity.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Hierarchical Task Analysis Diagram Audit', weight: '0', desc: 'Verification of sub-goal completeness and conditional branching in student task flow diagrams.' }
                ]
            },

            // ---------------- WEEK 7 (CO2) ----------------
            {
                week_id: 7,
                period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Wireframing Conventions & Responsive Grids Reading', desc: 'Read Tom Green & Kevin Golsby\'s chapters on low-to-mid fidelity wireframing, 12-column responsive grids, and spatial layout composition.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Crazy Eights Rapid Paper Sketching Sprint', desc: 'Produce eight divergent low-fidelity paper sketches exploring alternative layout arrangements for the core application dashboard.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Structural Wireframing & Grid Systems Lecture', desc: 'Instruction on translating IA sitemaps into structural wireframes using 8pt spatial grids, visual scanning patterns (F and Z), and touch target standards.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Digital Mid-Fidelity Wireframing Sprint in Figma', desc: 'Laboratory sprint converting paper sketches into annotated mid-fidelity digital wireframes across desktop, tablet, and mobile breakpoints.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Multi-Viewport Wireframe Flow Refinement', desc: 'Connect mid-fidelity wireframes into a clickable structural flow demonstrating primary user task completion.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Wireframe Annotation & Edge-Case Specification Log', desc: 'Add functional annotations detailing empty states, character limits, and responsive reflow rules on all wireframe screens.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: null, name: 'Mid-Fidelity Wireframe Structural Rubric', weight: '0', desc: 'Formative lab evaluation of grid alignment, visual hierarchy, and absence of premature visual styling in wireframes.' },
                    { tlaIdx: 2, ilo_id: null, name: 'Responsive Breakpoint & Grid Audit', weight: '0', desc: 'In-class check verifying proper 12-column desktop and 4-column mobile grid configuration in Figma.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Task-Flow Wireframe Walkthrough Check', weight: '0', desc: 'Formative peer walkthrough verifying that all primary user tasks can be completed without dead-end screens.' }
                ]
            },

            // ---------------- WEEK 8 (CO2 - Graded ILO 3: ilo_id = 7) ----------------
            {
                week_id: 8,
                period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Gestalt Psychology, Color Theory & Typography Study', desc: 'Study Eric Hibit\'s Color Theory and Elliot Jay Stocks\'s Universal Principles of Typography alongside Gestalt perceptual grouping laws.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Midterm UX Presentation Deck & Storyboard Prep', desc: 'Assemble the Midterm UX wireframe package, visual hierarchy rationale, and user journey storyboards for formal critique.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Gestalt Visual Hierarchy & Typographic Scale Seminar', desc: 'Demonstration of proximity, similarity, closure, figure-ground, modular type scales, and 60-30-10 color balance in complex interfaces.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Midterm UI/UX Design Presentation & Jury Critique', desc: 'Formal presentation where students defend their cohesive UX wireframe package, information architecture, and UCD process artifacts.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Post-Critique Wireframe & Visual Hierarchy Revision', desc: 'Incorporate Midterm panel feedback to resolve layout density issues and strengthen Gestalt grouping across all core screens.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Midterm UX Retrospective & Design Log', desc: 'Document key lessons learned during the UCD research-to-wireframe lifecycle and outline goals for high-fidelity prototyping.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: 7, name: 'UI/UX Design Presentation', weight: '50', desc: 'An interactive, formal presentation of high-priority wireframes, navigation configurations, and layout details.' },
                    { tlaIdx: 2, ilo_id: null, name: 'Gestalt & Typographic Hierarchy Diagnostic', weight: '0', desc: 'In-class analytical exercise evaluating proximity, contrast, and typographic scale in sample interface layouts.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Midterm Jury Feedback Action Plan', weight: '0', desc: 'Formative review of the student\'s revision roadmap addressing Midterm critique recommendations.' }
                ]
            },

            // ---------------- WEEK 9 (CO3 - Graded ILO 1: ilo_id = 8) ----------------
            {
                week_id: 9,
                period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Brad Frost Atomic Design & Figma Tokens Reading', desc: 'Read Brad Frost\'s Atomic Design chapters and Figma documentation on component properties, variants, and design token variables.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'UI Component Inventory & Token Audit', desc: 'Audit the Midterm wireframes to list all recurring atoms, molecules, and organisms requiring master component standardization.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Atomic Design Systems & Responsive Auto Layout Lecture', desc: 'Deep-dive lecture on modular design systems, UX laws, global/semantic design tokens, and nested Auto Layout constraints.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Figma Master Component & Variable Token Library Lab', desc: 'Hands-on laboratory building a scalable Figma component library with interactive variants, boolean properties, and light/dark mode variables.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Design System Style Guide & Token Documentation', desc: 'Publish a structured Figma design system page documenting color tokens, typography styles, spacing scales, and component usage rules.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Component Reusability & Stress-Test Audit', desc: 'Test master components against extreme content lengths and viewport resizing to verify Auto Layout resilience.' }
                ],
                assessments: [
                    { tlaIdx: 2, ilo_id: 8, name: 'Objective-Type Quiz', weight: '20', desc: 'Ergonomic patterns and WCAG 2.1 compliance specifications.' },
                    { tlaIdx: 3, ilo_id: null, name: 'Atomic Component & Auto Layout Lab Check', weight: '0', desc: 'Practical inspection of nested Auto Layout responsiveness, variant naming conventions, and token bindings.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Design System Token Governance Rubric', weight: '0', desc: 'Formative evaluation of semantic token organization and light/dark theme switching completeness.' }
                ]
            },

            // ---------------- WEEK 10 (CO3) ----------------
            {
                week_id: 10,
                period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Material Design 3 & Apple HIG Guidelines Study', desc: 'Compare platform conventions in Google Material Design and Apple Human Interface Guidelines regarding navigation, elevation, and imagery.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Custom Vector Icon Set & Asset Preparation', desc: 'Curate and standardize a cohesive 24px vector icon set and optimized imagery assets for the high-fidelity interface.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'High-Fidelity Surface Design & Platform Patterns Seminar', desc: 'Lecture on optical alignment in iconography, elevation shadow physics, adaptive navigation patterns, and skeleton loading states.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'High-Fidelity Screen Assembly & Adaptive Layout Lab', desc: 'Laboratory session upgrading mid-fidelity wireframes into pixel-polished high-fidelity screens using the published Atomic component library.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Empty States, Onboarding & Error Screen Suite', desc: 'Design high-fidelity empty states, first-time user onboarding modals, and graceful fallback screens for offline or error conditions.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Cross-Platform Visual Consistency Self-Audit', desc: 'Verify uniform icon stroke weights, border radii, elevation levels, and imagery aspect ratios across all application views.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: null, name: 'High-Fidelity Visual Craftsmanship Rubric', weight: '0', desc: 'In-class lab assessment of surface polish, optical alignment, and faithful consumption of design system tokens.' },
                    { tlaIdx: 2, ilo_id: null, name: 'Platform Pattern Compliance Check', weight: '0', desc: 'Formative quiz checking proper application of Material Design and HIG navigation and elevation rules.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Edge-Case & Empty State Completeness Audit', weight: '0', desc: 'Review of skeleton loaders, empty states, and onboarding flows for visual and instructional clarity.' }
                ]
            },

            // ---------------- WEEK 11 (CO3 - Graded ILO 2: ilo_id = 9) ----------------
            {
                week_id: 11,
                period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Micro-interaction Physics & WCAG Operability Reading', desc: 'Study Web Accessibility standards on keyboard operability, focus management, and motion design principles for functional micro-interactions.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Interactive State Transition Matrix Mapping', desc: 'Map out trigger, rules, feedback, and loops/modes for all interactive components, forms, and navigation transitions.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Dynamic Prototyping, Smart Animate & A11y Specs Lecture', desc: 'Instruction on Figma Smart Animate, conditional variable prototyping, keyboard trigger simulation, and documenting screen reader focus hierarchies.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Interactive Micro-interaction & A11y Implementation Lab', desc: 'Hands-on laboratory wiring multi-state interactive flows, form validations, and compiling the UI/UX Design Implementation Document.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Keyboard Navigation & Screen Reader Annotation Spec', desc: 'Annotate all interactive prototype screens with explicit tab sequence indices, ARIA roles, and screen reader announcement strings.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Reduced-Motion & Cognitive Accessibility Review', desc: 'Evaluate prototype animations to ensure compliance with prefers-reduced-motion accessibility guidelines.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: 9, name: 'UI/UX Design Implementation Document', weight: '30', desc: 'A detailed implementation document documenting accessibility features, color contrast compliance, and screen-reader focus hierarchies.' },
                    { tlaIdx: 2, ilo_id: null, name: 'Micro-interaction Trigger-Feedback Audit', weight: '0', desc: 'Formative check of Smart Animate timing curves, state transitions, and form validation feedback loops.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Focus Order & ARIA Landmark Verification', weight: '0', desc: 'Practical check verifying logical keyboard tab sequences and semantic screen-reader annotations.' }
                ]
            },

            // ---------------- WEEK 12 (CO3 - Graded ILO 3: ilo_id = 10) ----------------
            {
                week_id: 12,
                period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'WCAG 2.1 POUR Auditing & Contrast Compliance Study', desc: 'Read Tom Green & Kevin Golsby\'s Web Accessibility chapters on POUR conformance levels (A, AA, AAA) and automated/manual auditing tools.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Pre-Defense Accessibility Contrast & Color-Blindness Audit', desc: 'Run contrast checkers and deuteranopia/protanopia/tritanopia simulations across all high-fidelity prototype screens.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Accessible Front-End Architecture & WCAG 2.1 Seminar', desc: 'Walkthrough of WCAG 2.1 success criteria, semantic DOM structures, accessible modal focus trapping, and front-end prototype defense standards.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Semifinal Front-End Prototype & Accessibility Defense', desc: 'Live interactive presentation and technical defense of the high-fidelity front-end prototype, demonstrating micro-interactions and WCAG 2.1 compliance.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'WCAG 2.1 Remediation & Prototype Freeze', desc: 'Resolve any accessibility or interaction defects identified during the Semifinal defense to freeze the prototype for usability testing.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Accessibility Conformance Report (ACR) Summary', desc: 'Complete a Voluntary Product Accessibility Template (VPAT) style checklist summarizing the prototype\'s WCAG 2.1 Level AA conformance.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: 10, name: 'Front-end Code Presentation', weight: '50', desc: 'An interactive front-end display demonstrating dynamic layout states, microcopy animations, and interactive component functions.' },
                    { tlaIdx: 2, ilo_id: null, name: 'WCAG 2.1 AA Contrast & Color-Blindness Pass', weight: '0', desc: 'Verification that all text and interactive UI elements meet minimum 4.5:1 and 3:1 contrast ratios.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Semifinal Prototype Readiness Sign-off', weight: '0', desc: 'Formative checklist confirming the interactive prototype is feature-complete for empirical user testing.' }
                ]
            },

            // ---------------- WEEK 13 (CO4 - Graded ILO 1: ilo_id = 11) ----------------
            {
                week_id: 13,
                period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Carol Barnum Usability Testing Essentials Study', desc: 'Read Carol M. Barnum\'s chapters on planning usability evaluations, defining quantitative/qualitative metrics, and participant recruitment.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Participant Screener & Informed Consent Drafting', desc: 'Draft participant screening questionnaires, non-disclosure agreements (NDAs), and ethical informed consent forms for usability testing.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Usability Metrics, Test Protocols & Ethics Lecture', desc: 'Lecture covering ISO usability metrics (effectiveness, efficiency, satisfaction), formative vs. summative testing, and unbiased task scenario writing.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Usability Test Plan & Moderator Script Formulation Lab', desc: 'Laboratory workshop where teams author their complete usability test plan, task success criteria, and pilot-test their moderator scripts.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Pilot Usability Test Dry-Run & Script Calibration', desc: 'Conduct a dry-run pilot test with one peer participant to validate recording equipment, task wording clarity, and timing logs.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Ethical Research & Data Anonymization Checklist', desc: 'Verify that all data collection spreadsheets and screen recording protocols anonymize participant identities.' }
                ],
                assessments: [
                    { tlaIdx: 2, ilo_id: 11, name: 'Objective-Type Quiz', weight: '20', desc: 'Covering evaluative protocol steps, metrics, and script guidelines.' },
                    { tlaIdx: 3, ilo_id: null, name: 'Usability Test Plan & Scenario Rubric', weight: '0', desc: 'In-class evaluation of task scenario realism, absence of leading UI cues, and metric definition clarity.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Pilot Test Calibration Log Check', weight: '0', desc: 'Formative check of pilot dry-run adjustments and ethical consent readiness.' }
                ]
            },

            // ---------------- WEEK 14 (CO4 - Graded ILO 2: ilo_id = 12) ----------------
            {
                week_id: 14,
                period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Think-Aloud Moderation & SUS Scoring Guide Reading', desc: 'Study protocols for facilitating concurrent/retrospective think-aloud sessions and calculating System Usability Scale (SUS) percentile scores.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Testing Environment & Observation Matrix Setup', desc: 'Configure screen/audio recording tools, observer rainbow spreadsheets, and digital post-task SEQ and SUS questionnaires.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Moderated Testing Facilitation & Behavioral Analytics Seminar', desc: 'Instruction on neutral probing techniques, handling participant frustration, logging critical vs. non-critical errors, and SUS data analysis.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Moderated Usability Testing Execution & Data Synthesis Lab', desc: 'Live moderated usability testing sessions with target users followed by quantitative synthesis of completion rates, time-on-task, error logs, and SUS scores.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Moderated Usability Testing Lab & Evaluation Dossier', desc: 'Compile all recorded user error logs, System Usability Scale (SUS) calculations, rainbow observation sheets, and signed participant consent forms into the Prototype Evaluation Document.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Observer Inter-Rater Reliability Debrief', desc: 'Cross-check observer notes across team roles (moderator, data logger, tech observer) to reconcile task success and error classifications.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: 12, name: 'Prototype Evaluation Document', weight: '30', desc: 'A complete research report compiling recorded user error logs, System Usability Scale (SUS) surveys, and qualitative notes.' },
                    { tlaIdx: 2, ilo_id: null, name: 'Moderator Neutrality & Probing Observation', weight: '0', desc: 'In-class observation of student moderation technique ensuring non-leading prompts and proper think-aloud facilitation.' },
                    { tlaIdx: 4, ilo_id: null, name: 'SUS & Task Performance Statistical Check', weight: '0', desc: 'Verification of accurate System Usability Scale score computation and time-on-task summary tables.' }
                ]
            },

            // ---------------- WEEK 15 (CO4) ----------------
            {
                week_id: 15,
                period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Defect Severity Triangulation & Handoff Specs Study', desc: 'Read Figma\'s Guide to Developer Handoff and LinkedIn Learning modules on AI-assisted design-to-code workflows.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Usability Defect Prioritization Matrix', desc: 'Rank all discovered usability issues using Jakob Nielsen\'s 0-4 severity scale (frequency, impact, persistence) to scope the final iteration sprint.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Evidence-Based UI Remediation & Dev Handoff Lecture', desc: 'Lecture on translating usability defects into targeted UI layout revisions and preparing Figma Dev Mode redlines, CSS tokens, and asset pipelines.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Empirically-Driven Prototype Iteration & Dev Handoff Lab', desc: 'Hands-on sprint executing high-priority UI/UX fixes backed by user test evidence and annotating screens for engineering handoff.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Before-and-After Usability Remediation Showcase', desc: 'Create visual side-by-side comparison boards documenting each pre-test usability defect, empirical user evidence, and post-test design solution.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Developer Handoff Specification Audit', desc: 'Verify that all component states, spacing tokens, responsive constraints, and exportable SVG/PNG assets are cleanly documented.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: null, name: 'Empirical Iteration & Remediation Rubric', weight: '0', desc: 'In-class lab assessment evaluating how effectively design changes resolve documented high-severity usability defects.' },
                    { tlaIdx: 2, ilo_id: null, name: 'Defect Severity & Impact-Effort Matrix Check', weight: '0', desc: 'Formative review of defect prioritization logic and alignment with quantitative error logs.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Figma Developer Handoff Readiness Check', weight: '0', desc: 'Inspection of redline annotations, CSS variable mapping, and asset export specifications.' }
                ]
            },

            // ---------------- WEEK 16 (CO4 - Graded ILO 3: ilo_id = 13) ----------------
            {
                week_id: 16,
                period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'UX Case Study Storytelling & Executive Defense Prep', desc: 'Review industry exemplars of end-to-end UX case studies and prepare executive summary slides synthesizing research, design, accessibility, and SUS outcomes.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Final Prototype & Handoff Package Freeze', desc: 'Perform final quality assurance checks on interactive prototype links, developer handoff specs, and the Usability Evaluation Report.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Industry UI/UX Portfolio & Capstone Defense Briefing', desc: 'Instructor briefing on defending UX ROI, communicating empirical usability metrics to stakeholders, and transitioning prototypes to production.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Capstone Front-End Prototype Presentation & Defense', desc: 'Formal oral defense where students present their validated front-end prototype, empirical usability testing insights, and developer handoff specifications.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Final Archival Portfolio & Case Study Publication', desc: 'Submit the complete, self-contained HCI/UI-UX project repository including research artifacts, Figma design system, and final evaluation report.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Course Synthesis & Self-Efficacy Reflection', desc: 'Complete a comprehensive post-course reflection evaluating personal growth across CO1-CO4 competencies.' }
                ],
                assessments: [
                    { tlaIdx: 3, ilo_id: 13, name: 'Front-End Prototype Presentation', weight: '50', desc: 'The final capstone defense presenting a validated system prototype optimized using feedback from user testing sessions.' },
                    { tlaIdx: 2, ilo_id: null, name: 'Executive UX Case Study Coherence Check', weight: '0', desc: 'Formative evaluation of narrative flow connecting user research, design iterations, and empirical SUS improvements.' },
                    { tlaIdx: 4, ilo_id: null, name: 'Capstone Archival Dossier Completeness Check', weight: '0', desc: 'Final verification that all research, design system, accessibility, and evaluation deliverables are properly archived.' }
                ]
            }
        ];

        const tlasToInsert = [];
        const tlaAssessmentsToInsert = [];
        let tlaIdCounter = 1;
        let methodIdCounter = 1;

        for (const weekData of weeklyTlasAndAssessments) {
            const currentWeekTlaIds = [];

            for (const tlaObj of weekData.tlas) {
                const currentTlaId = tlaIdCounter++;
                currentWeekTlaIds.push(currentTlaId);

                tlasToInsert.push({
                    tla_id: currentTlaId,
                    week_id: weekData.week_id,
                    tla_name: tlaObj.name,
                    description: tlaObj.desc,
                    performed_by: tlaObj.by,
                    class_phase: tlaObj.phase,
                    is_lab: tlaObj.lab,
                    is_orientation: Boolean(tlaObj.is_orientation),
                    createdAt: now,
                    updatedAt: now
                });
            }

            for (const assessObj of weekData.assessments) {
                const targetTlaId = currentWeekTlaIds[assessObj.tlaIdx];
                tlaAssessmentsToInsert.push({
                    method_id: methodIdCounter++,
                    tla_id: targetTlaId,
                    ilo_id: assessObj.ilo_id,
                    name: assessObj.name,
                    description: assessObj.desc,
                    period: weekData.period,
                    weight: assessObj.weight,
                    min_passing: 60,
                    createdAt: now,
                    updatedAt: now
                });
            }
        }

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlasToInsert, {});
        await queryInterface.bulkInsert('TLAAssessments', tlaAssessmentsToInsert, {});

        console.log('Successfully completed high-fidelity seeding of COs, ILOs, Weeks, Topics, Subtopics, WeeklyReferences, TLAs, and TLAAssessments.');
    },

    async down(queryInterface, Sequelize) {
        // Delete in reverse order to avoid FK constraint issues
        await queryInterface.bulkDelete('TLAAssessments', null, {});
        await queryInterface.bulkDelete('TeachingAndLearningActivities', null, {});
        await queryInterface.bulkDelete('Subtopics', null, {});
        await queryInterface.bulkDelete('Topics', null, {});
        await queryInterface.bulkDelete('WeeklyReferences', null, {});
        await queryInterface.bulkDelete('Weeks', null, {});
        await queryInterface.bulkDelete('IntendedLearningOutcomes', null, {});
        await queryInterface.bulkDelete('References', null, {});
        await queryInterface.bulkDelete('CourseOfferingAssignments', null, {});
        await queryInterface.bulkDelete('ProgramOutcomeAlignments', null, {});
        await queryInterface.bulkDelete('ProgramOutcomes', null, {});
        await queryInterface.bulkDelete('CourseOutcomes', null, {});
        await queryInterface.bulkDelete('ProgramCourseOfferings', null, {});
        await queryInterface.bulkDelete('Prerequisites', null, {});
        await queryInterface.bulkDelete('Courses', null, {});
        await queryInterface.bulkDelete('Programs', null, {});
        await queryInterface.bulkDelete('Departments', null, {});
    }
};
