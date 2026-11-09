import os

seeder_content = r''''use strict';

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

        // 1.5) AcademicPeriods
        await queryInterface.bulkInsert('AcademicPeriods', [
            { academic_period_id: 1, start_date: '2026-07-20', end_date: '2026-11-25', midterm_deadline: '2026-10-08', finals_deadline: '2026-12-01', createdAt: now, updatedAt: now },
            { academic_period_id: 2, start_date: '2027-12-09', end_date: '2027-04-24', midterm_deadline: '2027-02-25', finals_deadline: '2027-05-04', createdAt: now, updatedAt: now }
        ], {});

        // 1.6) DepartmentAcademicPeriods (many-to-many)
        const dapRecords = [];
        let dapId = 1;
        for (let dept_id = 1; dept_id <= 5; dept_id++) {
            dapRecords.push({ department_academic_period_id: dapId++, dept_id, academic_period_id: 1, createdAt: now, updatedAt: now });
            dapRecords.push({ department_academic_period_id: dapId++, dept_id, academic_period_id: 2, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('DepartmentAcademicPeriods', dapRecords, {});

        // 2) Programs
        await queryInterface.bulkInsert('Programs', [
            { program_id: 1, dept_id: 3, name: 'Bachelor of Science in Information Technology', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 2, dept_id: 3, name: 'Bachelor of Science in Computer Science', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 3, dept_id: 3, name: 'Associate in Computer Technology', stakeholder_id: null, createdAt: now, updatedAt: now },
            { program_id: 4, dept_id: 3, name: 'Bachelor of Library and Information Science', stakeholder_id: null, createdAt: now, updatedAt: now }
        ], {});

        // 3) Courses (Only HCI and Web Dev II)
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
            }
        ], {});

        // 4) Prerequisites
        await queryInterface.bulkInsert('Prerequisites', [
            { prerequisite_id: 1, course_id: 1, prerequisite_course_id: 2, createdAt: now, updatedAt: now }
        ], {});

        // 5) ProgramCourseOfferings (Only HCI)
        await queryInterface.bulkInsert('ProgramCourseOfferings', [
            {
                pc_offering_id: 1,
                revision_number: 1,
                course_id: 1,
                program_id: 1,
                dept_id: 3,
                course_description: 'This course explores the principles and practices of Human-Computer Interaction (HCI)',
                createdAt: now, updatedAt: now
            }
        ], {});

        // 6) CourseOutcomes (Only HCI CO1..CO4)
        await queryInterface.bulkInsert('CourseOutcomes', [
            { co_id: 1, pc_offering_id: 1, co_description: 'CO1: Implement the core concepts.', createdAt: now, updatedAt: now },
            { co_id: 2, pc_offering_id: 1, co_description: 'CO2: Create UX designs.', createdAt: now, updatedAt: now },
            { co_id: 3, pc_offering_id: 1, co_description: 'CO3: Develop Front-End Prototype.', createdAt: now, updatedAt: now },
            { co_id: 4, pc_offering_id: 1, co_description: 'CO4: Defend prototype.', createdAt: now, updatedAt: now }
        ], {});

        // 7) ProgramOutcomes (Only BSIT)
        const bsitPOs = [];
        for (let i = 1; i <= 10; i++) {
            bsitPOs.push({
                po_id: i,
                program_id: 1,
                description: `BSIT-PO${i}: Program outcome description ${i}.`,
                createdAt: now,
                updatedAt: now
            });
        }
        await queryInterface.bulkInsert('ProgramOutcomes', bsitPOs, {});

        // 8) ProgramOutcomeAlignments
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

        // 9) CourseOfferingAssignments
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

        // 10) References
        const references = [
            { reference_id: 1, title: 'HCI Models, Theories, and Frameworks', author: 'John M. Carroll', isbn: '1-55860-808-7', link: null, publication_year: new Date('2003-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { reference_id: 2, title: 'Learn Human-Computer Interaction', author: 'Christopher Reid', isbn: '978-1-83882-032-9', link: null, publication_year: new Date('2020-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now }
        ];
        await queryInterface.bulkInsert('References', references, {});

        // 11) IntendedLearningOutcomes (removed hours, weeks)
        const ilos = [
            { ilo_id: 1, co_id: 1, description: "Cite the value and relevance of the University's VMO", is_orientation: true, assessment_tool: 'Orientation Quiz', createdAt: now, updatedAt: now },
            { ilo_id: 2, co_id: 1, description: 'Distinguish the core concepts, principles, and theories in designing user interfaces.', assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { ilo_id: 3, co_id: 1, description: 'Determine how to use design tools proficiently in creating and refining user interface elements.', assessment_tool: 'Objective Type Activity (Figma)', createdAt: now, updatedAt: now },
            { ilo_id: 4, co_id: 1, description: 'Propose a comprehensive User Interface (UI) design for a specified software application.', assessment_tool: 'UI Design Proposal', createdAt: now, updatedAt: now },
            { ilo_id: 5, co_id: 2, description: 'Distinguish user research methodologies, user personas, and user-centered design (UCD) process frameworks.', assessment_tool: 'Objective Type Quiz (UCD)', createdAt: now, updatedAt: now },
            { ilo_id: 6, co_id: 2, description: 'Determine how to build structurally-sound wireframes and layout compositions.', assessment_tool: 'UCD Process Document', createdAt: now, updatedAt: now },
            { ilo_id: 7, co_id: 2, description: 'Propose a cohesive User Experience (UX) wireframe package and user journey framework.', assessment_tool: 'UI/UX Design Presentation', createdAt: now, updatedAt: now },
            { ilo_id: 8, co_id: 3, description: 'Distinguish dynamic visual architectures, advanced component patterns, and global accessibility standards.', assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { ilo_id: 9, co_id: 3, description: 'Determine how to implement screen reader and keyboard navigation considerations in interactive prototypes.', assessment_tool: 'UI/UX Design Implementation', createdAt: now, updatedAt: now },
            { ilo_id: 10, co_id: 3, description: 'Propose a fully-interactive high-fidelity mockup with micro-interactions, conforming to WCAG 2.1.', assessment_tool: 'Front-end Code Presentation', createdAt: now, updatedAt: now },
            { ilo_id: 11, co_id: 4, description: 'Distinguish qualitative and quantitative usability metrics, testing methodologies, and analytical protocols.', assessment_tool: 'Objective type Quiz (Usability Testing)', createdAt: now, updatedAt: now },
            { ilo_id: 12, co_id: 4, description: 'Determine how to analyze user performance data, time-on-task, and error rates.', assessment_tool: 'Prototype Evaluation Document', createdAt: now, updatedAt: now },
            { ilo_id: 13, co_id: 4, description: 'Propose a comprehensive Usability Evaluation and Design Handoff Report.', assessment_tool: 'Front-End Prototype Presentation', createdAt: now, updatedAt: now }
        ];
        await queryInterface.bulkInsert('IntendedLearningOutcomes', ilos, {});

        // 11.5) ILO References
        const iloReferences = [];
        for (let i = 1; i <= 13; i++) {
            iloReferences.push({ ilo_id: i, reference_id: (i % 2) + 1, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ILOReferences', iloReferences, {});

        // 12) Topics (2 per ILO = 26 Topics)
        const topics = [];
        let t_id = 1;
        for (let i = 0; i < ilos.length; i++) {
            topics.push({ topic_id: t_id++, title: `Theory / Concept for ILO ${i+1}`, createdAt: now, updatedAt: now });
            topics.push({ topic_id: t_id++, title: `Practical Application for ILO ${i+1}`, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('Topics', topics, {});

        // 13) Subtopics (2 per Topic = 52 Subtopics)
        const subtopics = [];
        let st_id = 1;
        for (let t = 1; t <= 26; t++) {
            subtopics.push({ subtopic_id: st_id++, topic_id: t, title: `Subtopic A for Topic ${t}`, sequence_order: 1, createdAt: now, updatedAt: now });
            subtopics.push({ subtopic_id: st_id++, topic_id: t, title: `Subtopic B for Topic ${t}`, sequence_order: 2, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('Subtopics', subtopics, {});

        // 14) ILOTopics (2 topics for each ILO)
        const iloTopics = [];
        let ilotopicid = 1;
        for (let iloNum = 1; iloNum <= 13; iloNum++) {
            const topicNum1 = (iloNum - 1) * 2 + 1;
            const topicNum2 = (iloNum - 1) * 2 + 2;
            iloTopics.push({ ilo_topic_id: ilotopicid++, ilo_id: iloNum, topic_id: topicNum1, createdAt: now, updatedAt: now });
            iloTopics.push({ ilo_topic_id: ilotopicid++, ilo_id: iloNum, topic_id: topicNum2, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ILOTopics', iloTopics, {});

        // 15) TLAs (3 per ILO: pre, in, post)
        const tlasList = [];
        let tla_id = 1;
        for (let iloNum = 1; iloNum <= 13; iloNum++) {
            tlasList.push({ tla_id: tla_id++, tla_name: `Pre-Class Prep (ILO ${iloNum})`, description: 'Preparation activities', performed_by: 'S', class_phase: 'preclass', is_lab: false, createdAt: now, updatedAt: now });
            tlasList.push({ tla_id: tla_id++, tla_name: `In-Class Activity (ILO ${iloNum})`, description: 'Main lecture and hands-on', performed_by: 'T', class_phase: 'inclass', is_lab: true, createdAt: now, updatedAt: now });
            tlasList.push({ tla_id: tla_id++, tla_name: `Post-Class Assignment (ILO ${iloNum})`, description: 'Post-assessment tasks', performed_by: 'S', class_phase: 'postclass', is_lab: true, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlasList, {});

        // 16) TopicTLA (Map each TLA to BOTH Topics of that ILO)
        const topicTlas = [];
        let topictlaid = 1;
        for (let iloNum = 1; iloNum <= 13; iloNum++) {
            const currentTlaStart = (iloNum - 1) * 3 + 1;
            const currentIloTopicStart = (iloNum - 1) * 2 + 1;
            
            for (let i = 0; i < 3; i++) { // For each of the 3 TLAs
                const thisTlaId = currentTlaStart + i;
                topicTlas.push({ topic_tla_id: topictlaid++, ilo_topic_id: currentIloTopicStart,     tla_id: thisTlaId, createdAt: now, updatedAt: now });
                topicTlas.push({ topic_tla_id: topictlaid++, ilo_topic_id: currentIloTopicStart + 1, tla_id: thisTlaId, createdAt: now, updatedAt: now });
            }
        }
        await queryInterface.bulkInsert('TopicTLAs', topicTlas, {});

        // 17) Assessments
        const assessments = [];
        let assessId = 1;
        for (let tlaId = 1; tlaId <= 39; tlaId++) {
            if (tlaId % 3 === 0) { // Add assessment on post-class
                assessments.push({
                    tla_assessment_id: assessId++,
                    tla_id: tlaId,
                    name: 'Summative Quiz',
                    description: 'Quiz evaluating learning from this segment',
                    period: null, weight: null, min_passing: 60,
                    createdAt: now, updatedAt: now
                });
            }
        }
        await queryInterface.bulkInsert('TLAAssessments', assessments, {});

    },
    async down (queryInterface, Sequelize) {
        await queryInterface.dropTable('DepartmentAcademicPeriods');
        await queryInterface.dropTable('AcademicPeriods');
        await queryInterface.bulkDelete('TLAAssessments', null, {});
        await queryInterface.bulkDelete('TopicTLAs', null, {});
        await queryInterface.bulkDelete('TeachingAndLearningActivities', null, {});
        await queryInterface.bulkDelete('ILOTopics', null, {});
        await queryInterface.bulkDelete('Subtopics', null, {});
        await queryInterface.bulkDelete('Topics', null, {});
        await queryInterface.bulkDelete('ILOReferences', null, {});
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
'''

with open('composition/server/seeders/20260512030000-seed-composition-foundation.js', 'w') as f:
    f.write(seeder_content)
