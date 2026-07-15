'use strict';

/**
 * Seeder: Single Course Learning Plan - "Integrative Programming and Technologies"
 * Status Target: DRAFT (date_submitted: null)
 * Run: npx sequelize-cli db:seed --seed 20260514000000-seed-draft-lp-integrative-prog.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1) Course Creation
        // ============================================================================
        await queryInterface.bulkInsert('Courses', [{
            course_no: 'BIT312L',
            course_title: 'Integrative Programming and Technologies',
            credit: '2 LEC, 1 LAB',
            contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
            classification: 'Professional Courses',
            cmo: 'CMO No. 25 S. 2015',
            year_lvl: 'THIRD YEAR',
            term: '1st Semester SY 2026-2027',
            createdAt: now,
            updatedAt: now
        }], {});

        const courseRecord = await queryInterface.sequelize.query(
            `SELECT course_id FROM Courses WHERE course_no = 'BIT312L' ORDER BY course_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const courseId = courseRecord[0].course_id;

        // ============================================================================
        // 2) Program Course Offering
        // ============================================================================
        await queryInterface.bulkInsert('ProgramCourseOfferings', [{
            revision_number: 1,
            course_id: courseId,
            program_id: 1, // BSIT
            dept_id: 3,    // SCIS
            course_description: 'Examines the methodologies, architectural blueprints, and modern middleware technologies required to safely integrate heterogeneous enterprise applications and distributed components. Students explore API-first paradigms, service-oriented system interactions, data normalization, message brokers, asynchronous choreographies, and enterprise security configurations spanning multi-platform software environments.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offeringRecord = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} ORDER BY pc_offering_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const pcId = offeringRecord[0].pc_offering_id;

        // ============================================================================
        // 3) Course Offering Assignment (STATUS: DRAFT)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: pcId,
            stakeholder_id: null,
            date_assigned: new Date('2026-06-01'),
            date_submitted: null, // STRICTLY ENFORCING DRAFT STATUS
            date_updated: null,
            createdAt: now,
            updatedAt: now
        }], {});

        // ============================================================================
        // 4) Course Outcomes
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: pcId, co_description: 'CO1: Formulate and design robust integration architectures across heterogeneous ecosystems using advanced API-first design principles and structured middleware solutions.', createdAt: now, updatedAt: now },
            { pc_offering_id: pcId, co_description: 'CO2: Construct high-performance data transformation channels using structured multi-platform serialization formats to securely synchronize decoupled database models.', createdAt: now, updatedAt: now },
            { pc_offering_id: pcId, co_description: 'CO3: Coordinate asynchronous processes and enterprise software pipelines through event-driven brokers, message-oriented middleware patterns, and reactive workflows.', createdAt: now, updatedAt: now },
            { pc_offering_id: pcId, co_description: 'CO4: Validate, optimize, and audit security layers, token distribution models, and performance thresholds of data nodes functioning in microservice arrangements.', createdAt: now, updatedAt: now }
        ], {});

        const cosRows = await queryInterface.sequelize.query(
            `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ${pcId} ORDER BY co_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 5) Program Outcome Alignments
        // ============================================================================
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            { co_id: cosRows[0].co_id, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, po_id: 5, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, po_id: 9, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, po_id: 6, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, po_id: 7, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, po_id: 8, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 6) References (Curated & Real-world Aligned)
        // ============================================================================
        const references = [
            // Textbooks
            { title: 'Enterprise Integration Patterns', author: 'Gregor Hohpe', isbn: '978-0321200686', link: null, publication_year: new Date('2003-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Building Microservices', author: 'Sam Newman', isbn: '978-1491950357', link: null, publication_year: new Date('2021-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', isbn: '978-1449373320', link: null, publication_year: new Date('2017-01-01'), type: 'TEXTBOOK', createdAt: now, updatedAt: now },
            // Online/OER
            { title: 'AWS Well-Architected Framework', author: 'Amazon Web Services', isbn: null, link: 'https://aws.amazon.com/architecture/', publication_year: new Date('2024-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'The Twelve-Factor App', author: 'Adam Wiggins', isbn: null, link: 'https://12factor.net/', publication_year: new Date('2017-01-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'GraphQL Specification', author: 'GraphQL Foundation', isbn: null, link: 'https://spec.graphql.org/', publication_year: new Date('2024-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            { title: 'Kafka: The Definitive Guide', author: 'Confluent', isbn: null, link: 'https://www.confluent.io/', publication_year: new Date('2023-01-01'), type: 'OER', createdAt: now, updatedAt: now },
            // Required Orientation Docs
            { title: 'UNC Student Handbook', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: new Date('2024-06-01'), type: 'ONLINE', createdAt: now, updatedAt: now },
            { title: 'CCS VMO Curated Materials', author: 'CCS Dean\'s Office', isbn: null, link: 'https://unc.edu.ph/ccs-vmo', publication_year: new Date('2024-06-01'), type: 'OER', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('References', references, {});

        const refsRows = await queryInterface.sequelize.query(
            `SELECT reference_id, title, type FROM \`References\` ORDER BY reference_id DESC LIMIT ${references.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 7) Intended Learning Outcomes
        // ============================================================================
        const ilos = [
            // CO1
            { co_id: cosRows[0].co_id, description: "Cite the value and relevance of the University's and the College's VMO as related to the course", weeks: 1.0, hours: 2, is_orientation: true, createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, description: 'Analyze enterprise architectural abstractions to distinguish between remote procedure interfaces and loosely coupled system hooks.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, description: 'Establish clean RESTful design schemas and GraphQL contracts matching the Richardson Maturity Framework.', weeks: 1.0, hours: 5, assessment_tool: 'Schema Design Activity', createdAt: now, updatedAt: now },
            { co_id: cosRows[0].co_id, description: 'Model interface translation modules capable of interconnecting legacy monolithic databases with microservices.', weeks: 2.0, hours: 10, assessment_tool: 'Architecture Blueprint Proposal', createdAt: now, updatedAt: now },
            // CO2
            { co_id: cosRows[1].co_id, description: 'Execute cross-platform data serializations using language-agnostic engines (Protocol Buffers, Avro, JSON).', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, description: 'Implement optimized data communication backbones utilizing low-latency gRPC patterns over HTTP/2.', weeks: 1.0, hours: 5, assessment_tool: 'Implementation Document', createdAt: now, updatedAt: now },
            { co_id: cosRows[1].co_id, description: 'Build automated transformation adapters to remediate structural fields moving between relational datasets.', weeks: 2.0, hours: 10, assessment_tool: 'Adapter Code Presentation', createdAt: now, updatedAt: now },
            // CO3
            { co_id: cosRows[2].co_id, description: 'Configure multi-node message-oriented middleware platforms to support scalable event subscriptions.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, description: 'Deploy resilient exception handshakes and callback routines to protect runtime data pipelines.', weeks: 1.0, hours: 5, assessment_tool: 'Pipeline Schematic', createdAt: now, updatedAt: now },
            { co_id: cosRows[2].co_id, description: 'Manage compound state actions traversing detached databases guided by the Saga design pattern.', weeks: 2.0, hours: 10, assessment_tool: 'Saga State Workflow Presentation', createdAt: now, updatedAt: now },
            // CO4
            { co_id: cosRows[3].co_id, description: 'Apply identity management and multi-tenant authorization policies utilizing OAuth 2.0 and JSON Web Tokens.', weeks: 1.0, hours: 5, assessment_tool: 'Objective Type Quiz', createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, description: 'Establish zero-trust transaction perimeters by routing application traffic through API gateways.', weeks: 1.0, hours: 5, assessment_tool: 'Security Implementation Document', createdAt: now, updatedAt: now },
            { co_id: cosRows[3].co_id, description: 'Analyze distributed tracing spans to identify microservice request blockages and processing inefficiencies.', weeks: 2.0, hours: 10, assessment_tool: 'Tracing Report Defense', createdAt: now, updatedAt: now }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', ilos, {});

        const ilosRows = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, description, is_orientation FROM IntendedLearningOutcomes WHERE co_id IN (${cosRows.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 8) ILOReferences Assignment
        // ============================================================================
        const orientationIloResult = await queryInterface.sequelize.query(
            'SELECT ilo_id FROM IntendedLearningOutcomes WHERE is_orientation = true ORDER BY ilo_id DESC LIMIT 1;',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const orientationIlo = orientationIloResult.length > 0 ? orientationIloResult[0] : null;

        const textbooks = refsRows.filter(r => r.type === 'TEXTBOOK');
        const others = refsRows.filter(r => r.type !== 'TEXTBOOK');
        const technicalIlos = ilosRows.filter(ilo => !ilo.is_orientation);

        const iloReferences = [];

        // Handle Orientation References
        if (orientationIlo) {
            const studentHandbook = refsRows.find(r => r.title.includes('UNC Student Handbook'));
            const vmoMaterials = refsRows.find(r => r.title.includes('CCS VMO'));

            if (studentHandbook) iloReferences.push({ reference_id: studentHandbook.reference_id, ilo_id: orientationIlo.ilo_id, createdAt: now, updatedAt: now });
            if (vmoMaterials) iloReferences.push({ reference_id: vmoMaterials.reference_id, ilo_id: orientationIlo.ilo_id, createdAt: now, updatedAt: now });
        }

        // Handle Technical References Round-Robin
        for (let i = 0; i < technicalIlos.length; i++) {
            const ilo = technicalIlos[i];
            const textbookRef = textbooks[i % textbooks.length];
            const onlineRef = others[i % others.length];

            if (textbookRef) iloReferences.push({ reference_id: textbookRef.reference_id, ilo_id: ilo.ilo_id, createdAt: now, updatedAt: now });
            if (onlineRef) iloReferences.push({ reference_id: onlineRef.reference_id, ilo_id: ilo.ilo_id, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ILOReferences', iloReferences, {});

        // ============================================================================
        // 9) Topics
        // ============================================================================
        const topicTitles = [
            'Course Orientation and VMO Alignment',
            'Enterprise Integration Architectural Abstractions',
            'RESTful API Design and Richardson Maturity Model',
            'Legacy System Integrations and Translators',
            'Cross-Platform Data Serialization Protocols',
            'gRPC and HTTP/2 Transport Rules',
            'Automated Data Transformation Adapters',
            'Message-Oriented Middleware Configurations',
            'Resilient Exception Handshakes and Callbacks',
            'Saga Design Pattern and Orchestration',
            'OAuth 2.0 and JSON Web Tokens',
            'API Gateways and Mutual TLS',
            'Distributed Tracing and Overhead Analysis'
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
            'Course Orientation and VMO Alignment': [
                'University and College VMO, Core Values, and Quality Policy',
                'Course Outline, Course Description, and Classroom Policies',
                'AI Usage Policy and Course Requirements'
            ],
            'Enterprise Integration Architectural Abstractions': [
                'RPC vs Loosely Coupled Systems', 'Microservice Design Paradigms', 'Component De-coupling'
            ],
            'RESTful API Design and Richardson Maturity Model': [
                'HATEOAS Integration', 'Idempotency in API Endpoints', 'GraphQL Schema Differences'
            ],
            'Legacy System Integrations and Translators': [
                'Anti-Corruption Layers', 'Strangler Fig Pattern', 'WSDL Contract Deconstruction'
            ],
            'Cross-Platform Data Serialization Protocols': [
                'JSON vs XML vs YAML', 'Protocol Buffers Efficiency', 'Avro Schema Evolution'
            ],
            'gRPC and HTTP/2 Transport Rules': [
                'Bi-directional Streaming', 'Multiplexing Connections', 'Latency Mitigation'
            ],
            'Automated Data Transformation Adapters': [
                'ETL Pipelines', 'Relational to Document Mappings', 'Data Cleansing Hooks'
            ],
            'Message-Oriented Middleware Configurations': [
                'Publish/Subscribe Paradigms', 'Kafka Topics and Partitions', 'RabbitMQ Exchanges'
            ],
            'Resilient Exception Handshakes and Callbacks': [
                'Circuit Breakers', 'Exponential Backoff and Retries', 'Dead Letter Queues'
            ],
            'Saga Design Pattern and Orchestration': [
                'Choreography vs Orchestration', 'Compensating Transactions', 'Handling Eventual Consistency'
            ],
            'OAuth 2.0 and JSON Web Tokens': [
                'Authorization Grant Flows', 'JWT Signature Forgery Risks', 'Identity Federation'
            ],
            'API Gateways and Mutual TLS': [
                'Rate Limiting Algorithms', 'Service Mesh Traversal', 'mTLS Policy Enforcement'
            ],
            'Distributed Tracing and Overhead Analysis': [
                'OpenTelemetry Integration', 'Identifying Network Bottlenecks', 'Log Aggregation'
            ]
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
        const orientationTopic = topicsRows.find(t => t.title === 'Course Orientation and VMO Alignment');

        if (orientationIlo && orientationTopic) {
            iloTopicInserts.push({
                ilo_id: Number(orientationIlo.ilo_id),
                topic_id: Number(orientationTopic.topic_id),
                createdAt: now, updatedAt: now
            });
        }

        const technicalTopicsRows = topicsRows.filter(t => t.title !== 'Course Orientation and VMO Alignment');
        const technicalIlosRows = await queryInterface.sequelize.query(
            `SELECT ilo_id FROM IntendedLearningOutcomes WHERE (is_orientation = false OR is_orientation IS NULL) AND co_id IN (${cosRows.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        for (let i = 0; i < technicalTopicsRows.length; i++) {
            const currentTopic = technicalTopicsRows[i];
            const matchingIlo = technicalIlosRows[i % technicalIlosRows.length];
            iloTopicInserts.push({
                ilo_id: Number(matchingIlo.ilo_id),
                topic_id: Number(currentTopic.topic_id),
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
                tlasToInsert.push({ tla_name: 'VMO & Outcomes Reading Assignment', description: 'Read the materials on UNC VMO and CCS VMO, Program Educational Objectives (PEOs), and Program Outcomes (POs)', performed_by: 'S', class_phase: 'preclass', is_lab: true, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: 'Course Orientation Lecture & Collaborative Forum', description: 'The orientation will cover course outcomes and topic outline, assessment and evaluation activities, grading and class policies, and the flipped classroom approach. It will also introduce LinkedIn courses under MQUAP and explain the AI usage policy.', performed_by: 'T', class_phase: 'inclass', is_lab: false, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: 'VMO Visual Alignment Poster & Foundation AI Course', description: 'Self-paced completion of the Google Introduction to Generative AI', performed_by: 'S', class_phase: 'postclass', is_lab: true, createdAt: now, updatedAt: now });
            } else {
                tlasToInsert.push({ tla_name: `Core Materials Reading of ${topic.title}`, description: `Students execute self-paced prep learning by reading target chapters, lecture slides, and online course files. Students prepare personal reference summaries noting key conceptual distinctions.`, performed_by: 'S', class_phase: 'preclass', is_lab: true, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: `Structured Seminar ${topic.title}`, description: `An in-depth theoretical analysis and system discussion covering core criteria, system mechanics, and enterprise architectural guidelines. Includes live demonstrations and real-time interactive assessment quizzes.`, performed_by: 'T', class_phase: 'inclass', is_lab: false, createdAt: now, updatedAt: now });
                tlasToInsert.push({ tla_name: `Integration Review & Implementation of ${topic.title}`, description: `A practical laboratory follow-up where the instructor reviews previous quizzes to identify pain points, coordinates tailored feedback, and executes independent integration code updates.`, performed_by: 'S', class_phase: 'postclass', is_lab: true, createdAt: now, updatedAt: now });
            }
        });

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlasToInsert, {});

        const tlasRows = await queryInterface.sequelize.query(
            `SELECT tla_id, tla_name FROM TeachingAndLearningActivities ORDER BY tla_id DESC LIMIT ${tlasToInsert.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 13) TopicTLAs Assignment
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
        // 14) TLAAssessments (20/30/50 Rigorous Weight Mapping)
        // ============================================================================
        const tlaAssessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];

        for (let i = 0; i < technicalIlosRows.length; i++) {
            const coIndex = Math.floor(i / 3);
            const iloIndex = i % 3;
            const currentPeriod = periods[coIndex];

            // Assigned TLA matches the IN-CLASS phase of the specific topic (i + 1 due to orientation index 0)
            const assignedTlaId = tlasRows[(i + 1) * 3 + 1].tla_id;

            let assessmentName = '';
            let assessmentDescription = '';
            let assessmentWeight = '20';

            if (iloIndex === 0) {
                assessmentName = 'Objective-Type Quiz';
                assessmentWeight = '20';

                if (coIndex === 0) assessmentDescription = 'Covering architectural abstractions, API boundaries, and middleware decoupling techniques.';
                else if (coIndex === 1) assessmentDescription = 'Covering serialization methodologies and efficient data transport formatting constraints.';
                else if (coIndex === 2) assessmentDescription = 'Covering asynchronous event-driven models, publish/subscribe theories, and Kafka mechanics.';
                else assessmentDescription = 'Covering distributed identity management, OAuth 2.0 flows, and robust zero-trust policies.';
            } else if (iloIndex === 1) {
                assessmentWeight = '30';

                if (coIndex === 0) {
                    assessmentName = 'Schema Design Activity';
                    assessmentDescription = 'A structured exercise involving the design of RESTful constraints and GraphQL schemas.';
                } else if (coIndex === 1) {
                    assessmentName = 'Implementation Document';
                    assessmentDescription = 'A technical implementation record specifying the deployment of gRPC tunnels and JSON structures.';
                } else if (coIndex === 2) {
                    assessmentName = 'Pipeline Schematic';
                    assessmentDescription = 'A visual configuration detailing broker pathways, dead letter queues, and exception catch blocks.';
                } else {
                    assessmentName = 'Security Implementation Document';
                    assessmentDescription = 'A formal security audit report evaluating gateway traversal rules and active mTLS endpoints.';
                }
            } else {
                assessmentWeight = '50';

                if (coIndex === 0) {
                    assessmentName = 'Architecture Blueprint Proposal';
                    assessmentDescription = 'A comprehensive capstone blueprint proposing end-to-end integration mapping for legacy systems.';
                } else if (coIndex === 1) {
                    assessmentName = 'Adapter Code Presentation';
                    assessmentDescription = 'An interactive presentation showcasing automated data transformation pipelines across heterogeneous endpoints.';
                } else if (coIndex === 2) {
                    assessmentName = 'Saga State Workflow Presentation';
                    assessmentDescription = 'An interactive demonstration resolving distributed transaction failures through compensating saga state events.';
                } else {
                    assessmentName = 'Tracing Report Defense';
                    assessmentDescription = 'A final presentation utilizing OpenTelemetry spans to isolate, analyze, and diagnose microservice inefficiencies.';
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
        console.log(`Successfully completed rigorous data mapping for DRAFT course BIT312L using foundational flow.`);
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};