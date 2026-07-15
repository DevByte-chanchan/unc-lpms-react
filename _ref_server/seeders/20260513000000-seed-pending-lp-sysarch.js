'use strict';

/**
 * Seeder: Single Course Learning Plan - "System Integration & Architecture"
 * Status Target: PENDING
 * Run: npx sequelize-cli db:seed --seed 20260513000000-seed-pending-lp-sysarch.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1. COURSE CREATION
        // ============================================================================
        await queryInterface.bulkInsert('Courses', [{
            course_no: 'BIT321L',
            course_title: 'System Integration & Architecture',
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
            `SELECT course_id FROM Courses WHERE course_no = 'BIT321L' ORDER BY course_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const courseId = course[0].course_id;

        // ============================================================================
        // 2. PROGRAM COURSE OFFERING
        // ============================================================================
        await queryInterface.bulkInsert('ProgramCourseOfferings', [{
            revision_number: 1,
            course_id: courseId,
            program_id: 1, // Assuming BSIT exists from foundational seeder
            dept_id: 3,    // Assuming SCIS exists from foundational seeder
            course_description: 'Examines the strategies, architectures, and technologies used to integrate disparate software systems and enterprise applications. Topics cover APIs, microservices, message brokers, legacy migrations, and middleware frameworks.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT (STATUS = PENDING)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: null,
            date_assigned: new Date('2026-06-01'),
            date_submitted: new Date('2026-06-15'),
            date_updated: null,
            createdAt: now,
            updatedAt: now
        }], {});

        // ============================================================================
        // 4. COURSE OUTCOMES (4 records)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Design enterprise-level integration architectures using modern API frameworks and microservices.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Implement robust data exchange protocols utilizing JSON, XML, and protocol buffers across disparate networks.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Deploy message-oriented middleware (MOM) to facilitate asynchronous, event-driven system choreographies.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Evaluate authentication, authorization, and security topologies for distributed enterprise systems.', createdAt: now, updatedAt: now }
        ], {});

        const cos = await queryInterface.sequelize.query(
            `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ${offeringId} ORDER BY co_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 4.5. PROGRAM OUTCOME ALIGNMENTS
        // ============================================================================
        // Maps the retrieved co_id records across various PO segments with scattered attainment metrics
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            // CO1 mappings
            { co_id: cos[0].co_id, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 5, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 9, attainment_level: 'D', createdAt: now, updatedAt: now },

            // CO2 mappings
            { co_id: cos[1].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 6, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now },

            // CO3 mappings
            { co_id: cos[2].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 7, attainment_level: 'E', createdAt: now, updatedAt: now },

            // CO4 mappings
            { co_id: cos[3].co_id, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 8, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 5. INTENDED LEARNING OUTCOMES (12 records, 3 per CO)
        // ============================================================================
        const iloData = [
            // CO1 (Prelim)
            { co_id: cos[0].co_id, description: 'Differentiate between monolithic and microservice architectural patterns.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Design RESTful API specifications following strict Richardson Maturity Model levels.', hours: 6 },
            { co_id: cos[0].co_id, description: 'Construct GraphQL schemas to optimize client-server data fetching constraints.', hours: 6 },
            // CO2 (Midterm)
            { co_id: cos[1].co_id, description: 'Serialize complex data structures using Protocol Buffers and gRPC.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Map legacy XML/SOAP payloads into modernized JSON data dictionaries.', hours: 6 },
            { co_id: cos[1].co_id, description: 'Implement Extract, Transform, Load (ETL) pipelines for data warehousing.', hours: 6 },
            // CO3 (Semi)
            { co_id: cos[2].co_id, description: 'Configure publish/subscribe architectures using Apache Kafka brokers.', hours: 6 },
            { co_id: cos[2].co_id, description: 'Trace asynchronous event lifecycles within an Enterprise Service Bus (ESB).', hours: 6 },
            { co_id: cos[2].co_id, description: 'Resolve distributed transaction failures using the Saga Pattern.', hours: 6 },
            // CO4 (Final)
            { co_id: cos[3].co_id, description: 'Implement OAuth 2.0 and OpenID Connect for secure cross-service delegation.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Enforce Zero Trust network policies utilizing API Gateways and Service Meshes.', hours: 6 },
            { co_id: cos[3].co_id, description: 'Diagnose JSON Web Token (JWT) vulnerabilities in stateless authentication flows.', hours: 6 }
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
            'Monolithic vs Distributed Systems', 'Microservice Design Patterns', 'RESTful API Standards', 'Richardson Maturity Model',
            'GraphQL Fundamentals', 'SOAP and Legacy Integration', 'Enterprise Service Bus (ESB)', 'Event-Driven Architecture',
            'Message-Oriented Middleware', 'Apache Kafka Topologies', 'RabbitMQ and AMQP', 'Data Serialization Techniques',
            'Protocol Buffers & gRPC', 'JSON vs XML Payloads', 'ETL Processes in Data Warehousing', 'Saga Pattern for Transactions',
            'API Gateways', 'Service Mesh (Istio/Envoy)', 'OAuth 2.0 Authorization Framework', 'OpenID Connect Authentication',
            'JSON Web Tokens (JWT)', 'Zero Trust Network Architecture', 'Active Directory & SSO', 'Webhooks and Polling',
            'Containerization with Docker', 'Kubernetes Orchestration', 'CI/CD Pipelines for Integration', 'Rate Limiting Algorithms',
            'API Versioning Strategies', 'High Availability Configurations', 'Load Balancing Topologies', 'Distributed Caching (Redis)',
            'B2B Integration (EDI/AS2)', 'Serverless Integration (AWS Lambda)', 'Fault Tolerance & Circuit Breakers'
        ];

        await queryInterface.bulkInsert('Topics', topicTitles.map(t => ({ title: t, createdAt: now, updatedAt: now })), {});
        const topics = await queryInterface.sequelize.query(
            `SELECT topic_id, title FROM Topics ORDER BY topic_id DESC LIMIT 35;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // Subtopics Generation
        const subtopicsToInsert = [];
        topics.forEach(t => {
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Core Concepts of ${t.title}`, sequence_order: 1, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Implementation & Syntax`, sequence_order: 2, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Troubleshooting & Edge Cases`, sequence_order: 3, createdAt: now, updatedAt: now });
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
            'Architecture Diagramming Lab', 'API Design Studio', 'GraphQL Schema Build', 'Legacy Code Deconstruction',
            'Kafka Broker Configuration', 'gRPC Payload Serialization', 'OAuth2 Token Capture Lab', 'Docker Compose Network Setup',
            'Service Mesh Traffic Routing', 'API Gateway Rate Limiting Lab', 'Saga Pattern Simulation', 'XML to JSON Parser Coding',
            'JWT Forgery Workshop', 'Zero Trust Policy Writing', 'ETL Pipeline Scripting', 'SSO AD Integration',
            'Redis Cache Implementation', 'Load Balancer Stress Test', 'Webhooks Listener Lab', 'Circuit Breaker Testing',
            'Microservice Deployment', 'RabbitMQ Exchange Routing', 'EDI Mapping Exercise', 'Serverless Function Triggering',
            'CI/CD Pipeline Validation', 'B2B Protocol Review', 'Database Sharding Simulation', 'Protocol Buffers Code Gen',
            'OpenID Identity Verification', 'MOM Cluster Setup', 'API Versioning Refactor', 'Distributed Tracing Log Review',
            'Monolith Strangler Fig Lab', 'High Availability Failover Test', 'System Choreography Blueprint'
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
        // Constraint: Exactly 2 per ILO
        // ============================================================================
        const iloTopicInserts = [];
        const iloReferenceInserts = [];

        for (let i = 0; i < 12; i++) {
            const iloId = ilos[i].ilo_id;

            // Map 2 distinct Topics to this ILO
            iloTopicInserts.push({ ilo_id: iloId, topic_id: topics[i * 2].topic_id, createdAt: now, updatedAt: now });
            iloTopicInserts.push({ ilo_id: iloId, topic_id: topics[(i * 2) + 1].topic_id, createdAt: now, updatedAt: now });

            // Map 2 distinct References to this ILO
            iloReferenceInserts.push({ ilo_id: iloId, reference_id: references[i * 2].reference_id, createdAt: now, updatedAt: now });
            iloReferenceInserts.push({ ilo_id: iloId, reference_id: references[(i * 2) + 1].reference_id, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ILOTopics', iloTopicInserts, {});
        await queryInterface.bulkInsert('ILOReferences', iloReferenceInserts, {});

        const iloTopics = await queryInterface.sequelize.query(
            `SELECT ilo_topic_id, ilo_id FROM ILOTopics ORDER BY ilo_topic_id DESC LIMIT 24;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 10. TOPIC TLAs
        // Constraint: Assign 1 unique TLA to each ILOTopic (Results in 2 TLAs per ILO)
        // ============================================================================
        const topicTlaInserts = [];
        for (let i = 0; i < 24; i++) {
            topicTlaInserts.push({
                ilo_topic_id: iloTopics[i].ilo_topic_id,
                tla_id: tlas[i].tla_id, // We safely use the first 24 out of the 35 created TLAs
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('TopicTLAs', topicTlaInserts, {});

        // ============================================================================
        // 11. TLA ASSESSMENTS (Criteria for Grading Math)
        // Constraint: 20/30/50 split per CO (100 total per period). Min passing 60.
        // Periods: CO1(p), CO2(m), CO3(s), CO4(f)
        // ============================================================================
        const assessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];
        const weightDistribution = [10, 15, 25]; // 10*2=20, 15*2=30, 25*2=50. Sum = 100.
        const assessmentNames = ['Quiz', 'Lab Exercise', 'Project Milestone', 'Case Analysis', 'Diagram Schema'];

        // Each ILO has exactly 2 ILOTopics, which have exactly 1 TLA each. (2 TLAs per ILO).
        for (let i = 0; i < 12; i++) {
            const coIndex = Math.floor(i / 3); // 0, 1, 2, or 3
            const iloPosInCo = i % 3;          // 0, 1, or 2

            const targetPeriod = periods[coIndex];
            const targetWeightPerAssessment = String(weightDistribution[iloPosInCo]); // Assigns 10, 15, or 25

            // Fetch the 2 TLAs we assigned to this specific ILO
            const assignedTlasForIlo = [tlas[i * 2].tla_id, tlas[(i * 2) + 1].tla_id];

            assignedTlasForIlo.forEach((tlaId, idx) => {
                assessmentInserts.push({
                    tla_id: tlaId,
                    name: assessmentNames[(i + idx) % assessmentNames.length],
                    description: `Summative evaluation metric designed to test competency and execution accuracy.`,
                    period: targetPeriod,
                    weight: targetWeightPerAssessment,
                    min_passing: 60,
                    createdAt: now,
                    updatedAt: now
                });
            });
        }

        await queryInterface.bulkInsert('TLAAssessments', assessmentInserts, {});
        console.log(`Successfully completed rigorous data mapping for pending course BIT321L.`);
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};