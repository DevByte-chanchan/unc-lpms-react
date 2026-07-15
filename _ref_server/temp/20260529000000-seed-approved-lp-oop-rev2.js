'use strict';

/**
 * Seeder: Revision 2 - "Object-Oriented Programming"
 * Status Target: APPROVED (2026 Curriculum Review Workflow)
 * Run: npx sequelize-cli db:seed --seed 20260529000000-seed-approved-lp-oop-rev2.js
 * Description: Appends the second revision of BIT213L without duplicating base records.
 * Fixes relational comment mismatches by mapping target_id precisely to topic_tla_id.
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1. FETCH BASE COURSE (REUSE existing Course Record)
        // ============================================================================
        const course = await queryInterface.sequelize.query(
            `SELECT course_id FROM Courses WHERE course_no = 'BIT213L' ORDER BY course_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (!course || course.length === 0) {
            throw new Error("Base course BIT213L not found! Please run the Revision 1 seeder first.");
        }
        const courseId = course[0].course_id;

        // ============================================================================
        // 2. PROGRAM COURSE OFFERING (REVISION 2)
        // ============================================================================
        await queryInterface.bulkInsert('ProgramCourseOfferings', [{
            revision_number: 2,
            course_id: courseId,
            program_id: 1,
            dept_id: 3,
            course_description: 'Covers fundamental concepts of object-oriented programming (OOP) alongside modern upgrades including distributed REST APIs consumption, NoSQL document mapping, and application resilience patterns.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} AND revision_number = 2 LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT (STATUS = APPROVED WITH 2026 TIMESTAMPS)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: null,
            date_assigned: new Date('2026-05-10'),
            date_submitted: new Date('2026-05-25'),
            date_updated: new Date('2026-06-05'),
            ph_date_returned: null,
            ic_date_returned: null,
            ld_date_returned: null,
            d_date_returned: null,
            ph_date_accepted: new Date('2026-06-10'),
            ic_date_accepted: new Date('2026-06-12'),
            ld_date_accepted: new Date('2026-06-18'),
            d_date_accepted: new Date('2026-06-25'),
            createdAt: now,
            updatedAt: now
        }], {});

        // ============================================================================
        // 4. COURSE OUTCOMES (CO1-CO3 match Rev 1, CO4 is explicitly updated)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Apply core object-oriented principles (encapsulation, inheritance, polymorphism) to design robust software models.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Implement abstract classes, interfaces, and generic programming to develop scalable software components.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Design event-driven graphical user interfaces (GUI) incorporating robust exception handling mechanisms.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Integrate cloud-native data persistence, NoSQL databases, and asynchronous REST API communications into modern object-oriented applications.', createdAt: now, updatedAt: now }
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
            { co_id: cos[1].co_id, po_id: 2, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 5, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 7, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 2, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 5. INTENDED LEARNING OUTCOMES (ILOs 1-9 are retained; 10-12 are modernized)
        // ============================================================================
        const iloData = [
            { co_id: cos[0].co_id, description: 'Define class blueprints and instantiate objects with appropriate state mapping.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Encapsulate class state using access modifiers and property methods.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Construct hierarchical relationships using inheritance and method overriding.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Design abstract base classes to enforce structural contracts.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Implement multiple interfaces to achieve decoupling and polymorphism.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Utilize generic collections (Lists, Maps, Sets) for dynamic data storage.', hours: 6 },
            { co_id: cos[2].co_id, description: 'Catch and handle runtime exceptions using try-catch-finally blocks.', hours: 6 },
            { co_id: cos[2].co_id, description: 'Create graphical user interface layouts using standard library components.', hours: 6 },
            { co_id: cos[2].co_id, description: 'Bind action listeners to UI components to handle user-driven events.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Consume RESTful web services asynchronously and parse JSON structures into strongly-typed objects.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Design and implement NoSQL document data models using object-document mappers (ODMs).', hours: 6 },
            { co_id: cos[3].co_id, description: 'Implement centralized exception handling and request retry policies for distributed operations.', hours: 6 }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', iloData.map(i => ({ ...i, createdAt: now, updatedAt: now })), {});
        const ilos = await queryInterface.sequelize.query(
            `SELECT ilo_id FROM IntendedLearningOutcomes WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 6. FETCH EXISTING PARAMS & INSERT ONLY UNIQUE REVISION ITEMS (Prevents Duplication)
        // ============================================================================
        const existingTopics = await queryInterface.sequelize.query(`SELECT topic_id FROM Topics ORDER BY topic_id ASC;`, { type: queryInterface.sequelize.QueryTypes.SELECT });
        const existingRefs = await queryInterface.sequelize.query(`SELECT reference_id FROM \`References\` ORDER BY reference_id ASC;`, { type: queryInterface.sequelize.QueryTypes.SELECT });
        const existingTlas = await queryInterface.sequelize.query(`SELECT tla_id FROM TeachingAndLearningActivities ORDER BY tla_id ASC;`, { type: queryInterface.sequelize.QueryTypes.SELECT });

        const newTopicTitles = [
            'Asynchronous OOP & REST APIs',
            'NoSQL Document Store Integration (MongoDB)',
            'Resiliency Patterns & Fault Tolerance'
        ];
        await queryInterface.bulkInsert('Topics', newTopicTitles.map(t => ({ title: t, createdAt: now, updatedAt: now })), {});
        const newTopics = await queryInterface.sequelize.query(
            `SELECT topic_id, title FROM Topics WHERE title IN (${newTopicTitles.map(t => `'${t}'`).join(',')}) ORDER BY topic_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const subtopicsToInsert = [];
        newTopics.forEach(t => {
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Core Architecture of ${t.title}`, sequence_order: 1, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Implementation Syntaxes`, sequence_order: 2, createdAt: now, updatedAt: now });
        });
        await queryInterface.bulkInsert('Subtopics', subtopicsToInsert, {});

        const newReferenceData = [
            { title: 'Designing Data-Intensive Applications (2026 Edition)', author: 'Martin Kleppmann', isbn: '978-1449373320', link: null, publication_year: new Date('2026-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Official MongoDB Object-Mapping Ecosystem Manual', author: 'MongoDB Documentation Team', isbn: null, link: 'https://www.mongodb.com/docs/drivers/', publication_year: new Date('2026-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now }
        ];
        await queryInterface.bulkInsert('References', newReferenceData, {});
        const newRefs = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` WHERE title IN ('Designing Data-Intensive Applications (2026 Edition)', 'Official MongoDB Object-Mapping Ecosystem Manual') ORDER BY reference_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const newTlaTitles = [
            'Asynchronous REST API Integration Lab',
            'MongoDB Document-Object Mapping Workshop'
        ];
        await queryInterface.bulkInsert('TeachingAndLearningActivities', newTlaTitles.map((t, idx) => ({
            tla_name: t, description: `Advanced system interaction modeling lab covering ${t}.`,
            performed_by: 'S', class_phase: 'in', is_lab: '1', createdAt: now, updatedAt: now
        })), {});
        const newTlas = await queryInterface.sequelize.query(
            `SELECT tla_id FROM TeachingAndLearningActivities WHERE tla_name IN ('Asynchronous REST API Integration Lab', 'MongoDB Document-Object Mapping Workshop') ORDER BY tla_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 7. JUNCTION MAPPING STRUCTURING (ILOTopics, ILOReferences)
        // ============================================================================
        const iloTopicInserts = [];
        const iloReferenceInserts = [];

        for (let i = 0; i < 12; i++) {
            const iloId = ilos[i].ilo_id;

            if (i < 9) {
                iloTopicInserts.push({ ilo_id: iloId, topic_id: existingTopics[i * 2].topic_id, createdAt: now, updatedAt: now });
                iloTopicInserts.push({ ilo_id: iloId, topic_id: existingTopics[(i * 2) + 1].topic_id, createdAt: now, updatedAt: now });

                iloReferenceInserts.push({ ilo_id: iloId, reference_id: existingRefs[i * 2].reference_id, createdAt: now, updatedAt: now });
                iloReferenceInserts.push({ ilo_id: iloId, reference_id: existingRefs[(i * 2) + 1].reference_id, createdAt: now, updatedAt: now });
            } else {
                const upgradeIndex = i - 9;
                iloTopicInserts.push({ ilo_id: iloId, topic_id: newTopics[upgradeIndex].topic_id, createdAt: now, updatedAt: now });
                iloTopicInserts.push({ ilo_id: iloId, topic_id: existingTopics[i].topic_id, createdAt: now, updatedAt: now });

                iloReferenceInserts.push({ ilo_id: iloId, reference_id: newRefs[upgradeIndex % newRefs.length].reference_id, createdAt: now, updatedAt: now });
                iloReferenceInserts.push({ ilo_id: iloId, reference_id: existingRefs[i].reference_id, createdAt: now, updatedAt: now });
            }
        }
        await queryInterface.bulkInsert('ILOTopics', iloTopicInserts, {});
        await queryInterface.bulkInsert('ILOReferences', iloReferenceInserts, {});

        const currentIloTopics = await queryInterface.sequelize.query(
            `SELECT ilo_topic_id, ilo_id, topic_id FROM ILOTopics WHERE ilo_id IN (${ilos.map(i => i.ilo_id).join(',')}) ORDER BY ilo_topic_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 8. TOPIC TLAs & TLA ASSESSMENTS
        // ============================================================================
        const topicTlaInserts = [];
        let baseTlaCursor = 0;

        for (let i = 0; i < currentIloTopics.length; i++) {
            const row = currentIloTopics[i];
            const isNewTopicNode = newTopics.some(nt => nt.topic_id === row.topic_id);
            let targetedTlaId;

            if (isNewTopicNode) {
                const targetMatchIdx = newTopics.findIndex(nt => nt.topic_id === row.topic_id);
                targetedTlaId = newTlas[targetMatchIdx % newTlas.length].tla_id;
            } else {
                targetedTlaId = existingTlas[baseTlaCursor % existingTlas.length].tla_id;
                baseTlaCursor++;
            }

            topicTlaInserts.push({
                ilo_topic_id: row.ilo_topic_id,
                tla_id: targetedTlaId,
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('TopicTLAs', topicTlaInserts, {});

        const assessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];
        const activeTlaPool = [...existingTlas.map(t => t.tla_id), ...newTlas.map(t => t.tla_id)];

        for (let i = 0; i < 12; i++) {
            const periodKey = periods[Math.floor(i / 3)];
            assessmentInserts.push({
                tla_id: activeTlaPool[i % activeTlaPool.length],
                name: i >= 9 ? 'Asynchronous System Integration Project' : 'Programming Module Evaluation',
                description: 'Evaluation criteria measuring applied paradigm implementation performance.',
                period: periodKey,
                weight: '25',
                min_passing: 60,
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('TLAAssessments', assessmentInserts, {});

        // ============================================================================
        // 9. EXTRA REAL-TIME EXTRACTIONS (Guarantees Valid Comment Linkages)
        // ============================================================================
        const currentTopicTlas = await queryInterface.sequelize.query(
            `SELECT tt.topic_tla_id, it.ilo_id 
             FROM TopicTLAs tt
             JOIN ILOTopics it ON tt.ilo_topic_id = it.ilo_topic_id
             WHERE it.ilo_id IN (${ilos.map(i => i.ilo_id).join(',')}) ORDER BY tt.topic_tla_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const currentIloReferences = await queryInterface.sequelize.query(
            `SELECT ir.reference_id, ir.ilo_id FROM ILOReferences ir WHERE ir.ilo_id IN (${ilos.map(i => i.ilo_id).join(',')}) ORDER BY ir.ilo_reference_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 10. REVISION AUDIT COMMENTS TRAIL
        // ============================================================================
        const auditComments = [];
        const verificationAuditDate = new Date('2026-06-15');

        const topicFeedback = ["Verified structural alignment with current curriculum updates.", "Topic scope is structurally sound for implementation depth.", "Logical structural build patterns approved.", "Sequence flows effectively support concept tracking."];
        const refFeedback = ["Resource alignment confirmed with academic currency guidelines.", "Literature satisfies the 5-year acceptable publication window.", "Active web reference handles confirmed for remote student lookup.", "Reading material offers comprehensive baseline depth."];
        const tlaFeedback = ["Active learning mechanism fully satisfies application performance mapping.", "Practical assignment schema maps explicitly to course requirements.", "Activity satisfies the required hands-on computing rigor standard.", "Sufficient student scaffolding provided inside lesson tasks."];

        ilos.forEach((iloNode, index) => {
            const iloId = iloNode.ilo_id;

            // 1. Map Comments for Topics (target_id = topic_id)
            const matchingTopics = currentIloTopics.filter(t => t.ilo_id === iloId);
            matchingTopics.forEach((t, tIdx) => {
                auditComments.push({
                    commenter_role: index >= 9 ? 'Industry Consultant' : 'Curriculum Reviewer',
                    message: index >= 9
                        ? `Appended Revision 2 update: Shifting to asynchronous patterns is crucial for modern enterprise alignment. Approved.`
                        : topicFeedback[(index + tIdx) % topicFeedback.length],
                    resolved_status: true,
                    ilo_id: iloId,
                    comment_for: 'topics',
                    target_id: t.topic_id,
                    createdAt: verificationAuditDate, updatedAt: verificationAuditDate
                });
            });

            // 2. Map Comments for References (target_id = reference_id)
            const matchingRefs = currentIloReferences.filter(r => r.ilo_id === iloId);
            matchingRefs.forEach((r, rIdx) => {
                auditComments.push({
                    commenter_role: index >= 9 ? 'Library Director' : 'Academic Committee',
                    message: index >= 9
                        ? `Verified and linked updated cloud infrastructure literature to replace legacy flat file streams.`
                        : refFeedback[(index + rIdx) % refFeedback.length],
                    resolved_status: true,
                    ilo_id: iloId,
                    comment_for: 'references',
                    target_id: r.reference_id,
                    createdAt: verificationAuditDate, updatedAt: verificationAuditDate
                });
            });

            // 3. Map Comments for TLAs (CRITICAL FIX: target_id = topic_tla_id)
            const matchingTlas = currentTopicTlas.filter(tt => tt.ilo_id === iloId);
            matchingTlas.forEach((tt, ttIdx) => {
                auditComments.push({
                    commenter_role: index >= 9 ? 'Program Chair' : 'Department Head',
                    message: index >= 9
                        ? `Modified practical labs to incorporate direct asynchronous thread tracking. Closes 2025 audit findings.`
                        : tlaFeedback[(index + ttIdx) % tlaFeedback.length],
                    resolved_status: true,
                    ilo_id: iloId,
                    comment_for: 'tlas',
                    target_id: tt.topic_tla_id, // TARGET FIXED HERE
                    createdAt: verificationAuditDate, updatedAt: verificationAuditDate
                });
            });
        });

        if (auditComments.length > 0) {
            await queryInterface.bulkInsert('Comments', auditComments);
        }

        console.log(`Successfully compiled Revision 2 of BIT213L. Relational comment chains are fully linked.`);
    },

    async down(queryInterface, Sequelize) {
        console.warn("To wipe nested relational structures safely, use: npx sequelize-cli db:seed:undo:all");
    }
};