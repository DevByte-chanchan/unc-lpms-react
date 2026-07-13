'use strict';

/**
 * Seeder: Single Course Learning Plan - "Integrative Programming and Technologies"
 * Status Target: DRAFT
 * Run: npx sequelize-cli db:seed --seed 20260514000000-seed-draft-lp-integrative-prog.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1. COURSE CREATION
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

        const course = await queryInterface.sequelize.query(
            `SELECT course_id FROM Courses WHERE course_no = 'BIT312L' ORDER BY course_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const courseId = course[0].course_id;

        // ============================================================================
        // 2. PROGRAM COURSE OFFERING
        // ============================================================================
        await queryInterface.bulkInsert('ProgramCourseOfferings', [{
            revision_number: 1,
            course_id: courseId,
            program_id: 1, // BSIT Program
            dept_id: 3,    // SCIS Department
            course_description: 'Examines the methodologies, architectural blueprints, and modern middleware technologies required to safely integrate heterogeneous enterprise applications and distributed components. Students explore api-first paradigms, service-oriented system interactions, data normalization across conflicting schemas, message brokers, asynchronous choreographies, and enterprise security configurations spanning multi-platform software environments.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT (STATUS = DRAFT)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: null,
            date_assigned: new Date('2026-06-01'),
            date_submitted: null, // Left null deliberately to strictly enforce DRAFT status
            date_updated: null,
            createdAt: now,
            updatedAt: now
        }], {});

        // ============================================================================
        // 4. COURSE OUTCOMES (4 records)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Formulate and design robust integration architectures across heterogeneous ecosystems using advanced API-first design principles and structured middleware solutions.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Construct high-performance data transformation channels using structured multi-platform serialization formats to securely synchronize decoupled relational and non-relational database models.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Coordinate asynchronous processes and enterprise software pipelines through event-driven brokers, message-oriented middleware patterns, and reactive workflows.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Validate, optimize, and audit security layers, token distribution models, and performance thresholds of data nodes functioning in microservice arrangements.', createdAt: now, updatedAt: now }
        ], {});

        const cos = await queryInterface.sequelize.query(
            `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ${offeringId} ORDER BY co_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 4.5. PROGRAM OUTCOME ALIGNMENTS
        // ============================================================================
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            // CO1 Alignments
            { co_id: cos[0].co_id, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 5, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 9, attainment_level: 'D', createdAt: now, updatedAt: now },

            // CO2 Alignments
            { co_id: cos[1].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 6, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now },

            // CO3 Alignments
            { co_id: cos[2].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 7, attainment_level: 'E', createdAt: now, updatedAt: now },

            // CO4 Alignments
            { co_id: cos[3].co_id, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 8, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 5. INTENDED LEARNING OUTCOMES (12 records, 3 per CO)
        // ============================================================================
        const iloData = [
            // CO1 (Prelim Period)
            { co_id: cos[0].co_id, description: 'Analyze enterprise architectural abstractions to distinguish between remote procedure interfaces and loosely coupled system hooks.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Establish clean RESTful design schemas and GraphQL contracts matching the upper tiers of the Richardson Maturity Framework.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Model interface translation modules capable of safely interconnecting legacy monolithic databases with contemporary microservices.', hours: 6 },
            // CO2 (Midterm Period)
            { co_id: cos[1].co_id, description: 'Execute cross-platform data serializations using language-agnostic engines including Protocol Buffers, Avro, and JSON specifications.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Implement optimized data communication backbones utilizing low-latency gRPC patterns running directly over HTTP/2 transport rules.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Build automated transformation adapters to remediate structural fields moving between relational datasets and unindexed document storage warehouses.', hours: 6 },
            // CO3 (Semi-Final Period)
            { co_id: cos[2].co_id, description: 'Configure multi-node message-oriented middleware platforms to support scalable point-to-point queues and event subscriptions.', hours: 6 },
            { co_id: cos[2].co_id, description: 'Deploy resilient exception handshakes and callback routines to protect runtime data pipelines against sporadic infrastructure interruptions.', hours: 6 },
            { co_id: cos[2].co_id, description: 'Manage compound state actions traversing detached databases by orchestrating asynchronous message paths guided by the Saga design pattern.', hours: 6 },
            // CO4 (Final Period)
            { co_id: cos[3].co_id, description: 'Apply identity management and multi-tenant authorization policies utilizing secure OAuth 2.0 structures and signed JSON Web Tokens.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Establish zero-trust transaction perimeters by routing application traffic through API gateways running active mutual TLS validations.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Analyze distributed tracing spans to identify microservice request blockages, parsing overheads, and network processing inefficiencies.', hours: 6 }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', iloData.map(i => ({ ...i, createdAt: now, updatedAt: now })), {});

        const ilos = await queryInterface.sequelize.query(
            `SELECT ilo_id FROM IntendedLearningOutcomes WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 6. TOPICS & SUBTOPICS (35 records)
        // ============================================================================
        const topicTitles = [
            'Foundations of Systems Integration', 'Enterprise Integration Patterns (EIP)', 'Service-Oriented Architecture (SOA) Principles',
            'API-First Development Methodologies', 'RESTful API Design and Richardson Maturity', 'GraphQL Schema Definition and Optimization',
            'gRPC and High-Performance RPC Frameworks', 'Data Serialization Formats (JSON, XML, YAML)', 'Advanced Schema Validation Techniques',
            'Middleware Architecture Foundations', 'Message-Oriented Middleware (MOM)', 'Publish-Subscribe Messaging Models',
            'Point-to-Point Message Queuing', 'Apache Kafka and Event Streaming', 'RabbitMQ and AMQP Standardizations',
            'Asynchronous Programming and Callbacks', 'Webhooks and Real-Time Event Notifications', 'Enterprise Service Bus (ESB) Configurations',
            'Data Transformation and Mapping Pipelines', 'Distributed Database Synchronization', 'Two-Phase Commit vs. Saga Patterns',
            'API Gateway Routing and Management', 'Service Discovery and Registry Patterns', 'Distributed Caching Topologies (Redis)',
            'Rate Limiting and Throttling Core Logic', 'Circuit Breaker and Retry Resiliencies', 'OAuth 2.0 Authorization Protocols',
            'JSON Web Tokens (JWT) Security Framework', 'Identity Federation and Single Sign-On (SSO)', 'Mutual TLS (mTLS) and Transport Encryption',
            'API Performance Metrics and Latency Analysis', 'Distributed Tracing and Logging (OpenTelemetry)', 'Containerization for Integration Systems',
            'Cloud-Native Hybrid Integrations', 'End-to-End Integration Testing Strategies'
        ];

        await queryInterface.bulkInsert('Topics', topicTitles.map(t => ({ title: t, createdAt: now, updatedAt: now })), {});
        const topics = await queryInterface.sequelize.query(
            `SELECT topic_id, title FROM Topics ORDER BY topic_id DESC LIMIT 35;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const subtopicsToInsert = [];
        topics.forEach(t => {
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Core Theoretical Architectures of ${t.title}`, sequence_order: 1, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Practical Programming and Deployment Workflows`, sequence_order: 2, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Security Assessments and System Resiliency Engineering`, sequence_order: 3, createdAt: now, updatedAt: now });
        });
        await queryInterface.bulkInsert('Subtopics', subtopicsToInsert, {});

        // ============================================================================
        // 7. REFERENCES (35 records)
        // ============================================================================
        const textbooks = [
            { title: 'Enterprise Integration Patterns', author: 'Gregor Hohpe', isbn: '978-0321200686', pubYear: '2003' },
            { title: 'Building Microservices', author: 'Sam Newman', isbn: '978-1491950357', pubYear: '2021' },
            { title: 'Clean Architecture', author: 'Robert C. Martin', isbn: '978-0134494166', pubYear: '2017' },
            { title: 'Domain-Driven Design', author: 'Eric Evans', isbn: '978-0321125217', pubYear: '2003' },
            { title: 'Patterns of Enterprise Application Architecture', author: 'Martin Fowler', isbn: '978-0321127426', pubYear: '2002' },
            { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', isbn: '978-1449373320', pubYear: '2017' },
            { title: 'RESTful Web Services', author: 'Leonard Richardson', isbn: '978-0596529260', pubYear: '2007' },
            { title: 'Cloud Native Patterns', author: 'Cornelia Davis', isbn: '978-1617294297', pubYear: '2019' },
            { title: 'Service-Oriented Architecture', author: 'Thomas Erl', isbn: '978-0131858589', pubYear: '2005' },
            { title: 'Site Reliability Engineering', author: 'Betsy Beyer', isbn: '978-1491929124', pubYear: '2016' },
            { title: 'The Phoenix Project', author: 'Gene Kim', isbn: '978-1942788294', pubYear: '2013' },
            { title: 'Implementing Domain-Driven Design', author: 'Vaughn Vernon', isbn: '978-0321834577', pubYear: '2013' }
        ];

        const onlineResources = [
            { title: 'AWS Well-Architected Framework', author: 'Amazon Web Services', link: 'https://aws.amazon.com/architecture/well-architected/', pubYear: '2024' },
            { title: 'Azure Architecture Center', author: 'Microsoft', link: 'https://learn.microsoft.com/en-us/azure/architecture/', pubYear: '2025' },
            { title: 'Google Cloud Architecture Framework', author: 'Google', link: 'https://cloud.google.com/architecture/framework', pubYear: '2025' },
            { title: 'The Twelve-Factor App', author: 'Adam Wiggins', link: 'https://12factor.net/', pubYear: '2017' },
            { title: 'RedHat Integration Guide', author: 'RedHat', link: 'https://access.redhat.com/documentation/en-us/red_hat_fuse/', pubYear: '2023' },
            { title: 'Martin Fowler Blog: Microservices', author: 'Martin Fowler', link: 'https://martinfowler.com/microservices/', pubYear: '2024' },
            { title: 'Docker Official Documentation', author: 'Docker Inc.', link: 'https://docs.docker.com/', pubYear: '2026' },
            { title: 'Kubernetes Documentation', author: 'CNCF', link: 'https://kubernetes.io/docs/home/', pubYear: '2026' },
            { title: 'GraphQL Specification', author: 'Facebook/GraphQL Foundation', link: 'https://spec.graphql.org/', pubYear: '2024' },
            { title: 'Spring Integration Reference', author: 'VMware', link: 'https://docs.spring.io/spring-integration/reference/', pubYear: '2025' },
            { title: 'Nginx Architecture Overview', author: 'F5 Inc', link: 'https://www.nginx.com/blog/inside-nginx/', pubYear: '2022' },
            { title: 'Kafka: The Definitive Guide', author: 'Confluent', link: 'https://www.confluent.io/resources/kafka-the-definitive-guide/', pubYear: '2023' }
        ];

        const oerResources = [
            { title: 'Software Engineering (MIT OCW)', author: 'MIT Press', link: 'https://ocw.mit.edu/', pubYear: '2020' },
            { title: 'Operating Systems and Middleware', author: 'Max Hailperin', link: 'https://gustavus.edu/mcs/max/os-book/', pubYear: '2018' },
            { title: 'Introduction to Computer Architecture', author: 'OpenStax', link: 'https://openstax.org/', pubYear: '2021' },
            { title: 'Software Architecture for Developers', author: 'Simon Brown', link: 'https://softwarearchitecturefordevelopers.com/', pubYear: '2019' },
            { title: 'Distributed Systems for Web Developers', author: 'OER Commons', link: 'https://www.oercommons.org/', pubYear: '2022' },
            { title: 'Web Programming Foundations', author: 'University of Minnesota', link: 'https://open.umn.edu/opentextbooks/', pubYear: '2023' },
            { title: 'Foundations of Software Testing', author: 'Various', link: 'https://oer.galileo.usg.edu/', pubYear: '2020' },
            { title: 'Data Structures and Algorithms', author: 'Lafore', link: 'https://www.oercommons.org/courseware/', pubYear: '2019' },
            { title: 'Cloud Computing Concepts', author: 'UIUC', link: 'https://www.coursera.org/learn/cloud-computing', pubYear: '2021' },
            { title: 'Network Security Essentials', author: 'OER Project', link: 'https://www.oercommons.org/', pubYear: '2020' },
            { title: 'Programming Language Design', author: 'PL Design Archive', link: 'https://www.oercommons.org/', pubYear: '2022' }
        ];

        const referenceData = [
            ...textbooks.map(b => ({ title: b.title, author: b.author, isbn: b.isbn, link: null, publication_year: new Date(`${b.pubYear}-01-01`), type: 'TEXTBOOK', createdAt: now, updatedAt: now })),
            ...onlineResources.map(o => ({ title: o.title, author: o.author, isbn: null, link: o.link, publication_year: new Date(`${o.pubYear}-01-01`), type: 'ONLINE', createdAt: now, updatedAt: now })),
            ...oerResources.map(o => ({ title: o.title, author: o.author, isbn: null, link: o.link, publication_year: new Date(`${o.pubYear}-01-01`), type: 'OER', createdAt: now, updatedAt: now }))
        ];

        await queryInterface.bulkInsert('References', referenceData, {});

        const references = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT 35;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 8. TLAs (35 records)
        // ============================================================================
        const tlaTitles = [
            'System Connectivity Mapping', 'API Schema Validation Lab', 'GraphQL Query Optimization Studio', 'Legacy Adapter Configuration',
            'Distributed Queue Orchestration', 'gRPC Multicast Implementation', 'OAuth Token Audit Session', 'Docker Integration Bridge Build',
            'Service Mesh Traversal Exercise', 'Gateway Throttling Configuration Lab', 'Saga Workflow Simulation', 'XML Payload Refactoring',
            'JWT Vulnerability Assessment', 'mTLS Policy Definition Session', 'Data Pipeline Aggregator Build', 'Identity Federation Workshop',
            'Redis Cluster Hydration Drills', 'Load-Balanced Gateway Stress Test', 'Webhook Callback Receiver Code', 'Circuit Breaker Injection Lab',
            'Microservice Route Registry Tasks', 'RabbitMQ Exchange Configurations', 'B2B Protocol Translation Audits', 'Cloud Function Data Triggering',
            'CI/CD Deployment Integrity Checks', 'Integration Security Analysis', 'Distributed Database Shard Syncs', 'Protobuf Schema Interoperability Labs',
            'OIDC Signature Checks', 'MOM High Availability Deployments', 'API In-Place Version Migration', 'OpenTelemetry Tracing Analysis',
            'Strangler Pattern Infrastructure Builds', 'Failover Recovery Tests', 'Enterprise Integration Architecture Blueprinting'
        ];

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlaTitles.map((t, idx) => ({
            tla_name: t, description: `Comprehensive practical engagement focusing on executing concepts related to ${t}.`,
            performed_by: idx % 2 === 0 ? 'S' : 'I', class_phase: ['pre', 'in', 'post'][idx % 3], is_lab: idx % 2 === 0 ? '1' : '0', createdAt: now, updatedAt: now
        })), {});

        const tlas = await queryInterface.sequelize.query(
            `SELECT tla_id FROM TeachingAndLearningActivities ORDER BY tla_id DESC LIMIT 35;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 9. JUNCTION MAPPINGS (ILOTopics, ILOReferences)
        // ============================================================================
        const iloTopicInserts = [];
        const iloReferenceInserts = [];

        for (let i = 0; i < 12; i++) {
            const iloId = ilos[i].ilo_id;

            iloTopicInserts.push({ ilo_id: iloId, topic_id: topics[i * 2].topic_id, createdAt: now, updatedAt: now });
            iloTopicInserts.push({ ilo_id: iloId, topic_id: topics[(i * 2) + 1].topic_id, createdAt: now, updatedAt: now });

            iloReferenceInserts.push({ ilo_id: iloId, reference_id: references[i * 2].reference_id, createdAt: now, updatedAt: now });
            iloReferenceInserts.push({ ilo_id: iloId, reference_id: references[(i * 2) + 1].reference_id, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ILOTopics', iloTopicInserts, {});
        await queryInterface.bulkInsert('ILOReferences', iloReferenceInserts, {});

        const iloTopics = await queryInterface.sequelize.query(
            `SELECT ilo_topic_id FROM ILOTopics ORDER BY ilo_topic_id DESC LIMIT 24;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 10. TOPIC TLAs
        // ============================================================================
        const topicTlaInserts = [];
        for (let i = 0; i < 24; i++) {
            topicTlaInserts.push({
                ilo_topic_id: iloTopics[i].ilo_topic_id,
                tla_id: tlas[i].tla_id,
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('TopicTLAs', topicTlaInserts, {});

        // ============================================================================
        // 11. TLA ASSESSMENTS
        // Constraint: 20/30/50 grading matrix per period. Min passing 60.
        // Periods: CO1(p), CO2(m), CO3(s), CO4(f)
        // ============================================================================
        const assessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];
        const weightDistribution = [10, 15, 25]; // Forms 10*2=20, 15*2=30, 25*2=50. Total = 100 per term.
        const assessmentNames = ['Technical Examination', 'Laboratory Project', 'Integration Exercise', 'Architecture Presentation', 'Code Review Checklist'];

        for (let i = 0; i < 12; i++) {
            const coIndex = Math.floor(i / 3);
            const iloPosInCo = i % 3;

            const targetPeriod = periods[coIndex];
            const targetWeightPerAssessment = String(weightDistribution[iloPosInCo]);

            const assignedTlasForIlo = [tlas[i * 2].tla_id, tlas[(i * 2) + 1].tla_id];

            assignedTlasForIlo.forEach((tlaId, idx) => {
                assessmentInserts.push({
                    tla_id: tlaId,
                    name: assessmentNames[(i + idx) % assessmentNames.length],
                    description: `Summative integration test configured to calculate functional logic execution metrics.`,
                    period: targetPeriod,
                    weight: targetWeightPerAssessment,
                    min_passing: 60,
                    createdAt: now,
                    updatedAt: now
                });
            });
        }

        await queryInterface.bulkInsert('TLAAssessments', assessmentInserts, {});
        console.log(`Successfully completed rigorous data mapping for draft course BIT312L.`);
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};