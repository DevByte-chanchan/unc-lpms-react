'use strict';

/**
 * Seeder: Single Course Learning Plan - "System Integration & Architecture"
 * Status Target: PENDING (Submitted, Not Returned)
 *
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
            program_id: 1, // BSIT Program
            dept_id: 3,    // SCIS Department
            course_description: 'Examines enterprise system integration patterns, service-oriented and microservices architectures, message brokers, API gateways, container orchestration, and cloud-native deployment strategies for heterogeneous enterprise environments.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} ORDER BY pc_offering_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT (Status = PENDING)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: '1',
            date_assigned: new Date('2026-06-01'),
            date_submitted: new Date('2026-06-15'),
            date_updated: null,
            createdAt: now,
            updatedAt: now
        }], {});

        const sysarchAssign = await queryInterface.sequelize.query(
            `SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ${offeringId} ORDER BY co_assign_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        if (sysarchAssign.length > 0) {
            await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
                { co_assign_id: sysarchAssign[0].co_assign_id, stakeholder_id: '2', actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', is_viewed: true, createdAt: new Date('2026-06-01 09:00:00'), updatedAt: new Date('2026-06-01 09:00:00') },
                { co_assign_id: sysarchAssign[0].co_assign_id, stakeholder_id: '1', actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', is_viewed: true, createdAt: new Date('2026-06-15 10:00:00'), updatedAt: new Date('2026-06-15 10:00:00') }
            ], {});
        }

        // ============================================================================
        // 4. COURSE OUTCOMES (4 records)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Analyze enterprise architecture frameworks, architectural styles, and quality attribute trade-offs in complex information systems.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Design and implement synchronous and asynchronous system integration solutions using RESTful APIs, GraphQL, gRPC, and enterprise message brokers.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Architect resilient microservices ecosystems incorporating API gateways, service discovery, distributed tracing, and fault-tolerance patterns.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Deploy, secure, and validate an integrated cloud-native enterprise system using containerized CI/CD pipelines and identity federation.', createdAt: now, updatedAt: now }
        ], {});

        const cos = await queryInterface.sequelize.query(
            `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ${offeringId} ORDER BY co_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 5. PROGRAM OUTCOME ALIGNMENTS (3 per CO = 12 alignments)
        // ============================================================================
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            { co_id: cos[0].co_id, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 2, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },

            { co_id: cos[1].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 7, attainment_level: 'E', createdAt: now, updatedAt: now },

            { co_id: cos[2].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 6, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 9, attainment_level: 'D', createdAt: now, updatedAt: now },

            { co_id: cos[3].co_id, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 8, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 6. INTENDED LEARNING OUTCOMES (4 for CO1 with orientation, 3 each for CO2..CO4 = 13 total)
        // ============================================================================
        const iloData = [
            // CO1 (Prelim Period) - 1 Orientation + 3 Graded
            { co_id: cos[0].co_id, description: "Cite the value and relevance of the University's and the College's VMO as related to the course.", is_orientation: true },
            { co_id: cos[0].co_id, description: 'Evaluate monolithic, layered, event-driven, and service-oriented architectural styles against non-functional quality attributes.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Model enterprise domain boundaries and integration contexts using TOGAF ADM phases and C4 architectural diagrams.', assessment_tool: 'C4 Architecture Modeling Blueprint', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Propose an Enterprise System Architecture Specification addressing scalability, interoperability, and legacy modernization.', assessment_tool: 'Enterprise Architecture Proposal', is_orientation: false },

            // CO2 (Midterm Period) - 3 Graded
            { co_id: cos[1].co_id, description: 'Differentiate synchronous RPC/REST/GraphQL protocols and asynchronous message-queuing integration patterns.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Implement contract-first RESTful and gRPC data integration services with schema validation and canonical data models.', assessment_tool: 'API & Messaging Middleware Practicum', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Build an event-driven integration pipeline utilizing RabbitMQ and Apache Kafka for decoupled enterprise messaging.', assessment_tool: 'Event-Driven Integration Prototype', is_orientation: false },

            // CO3 (Semifinal Period) - 3 Graded
            { co_id: cos[2].co_id, description: 'Analyze distributed data management challenges, CAP/PACELC theorems, and saga orchestration vs. choreography.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Configure API gateways, dynamic service discovery, circuit breakers, and rate limiters for fault-tolerant service meshes.', assessment_tool: 'Resilient Microservices Mesh Lab', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Develop a multi-service enterprise backend implementing distributed sagas and centralized observability.', assessment_tool: 'Microservices Ecosystem Defense', is_orientation: false },

            // CO4 (Final Period) - 3 Graded
            { co_id: cos[3].co_id, description: 'Examine zero-trust API security, OAuth2/OIDC identity federation, and container orchestration architectures.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Automate multi-container builds, Kubernetes manifests, and end-to-end contract testing in a CI/CD pipeline.', assessment_tool: 'Cloud-Native CI/CD & Security Audit', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Defend a production-grade integrated enterprise system demonstrating high availability, security compliance, and telemetry.', assessment_tool: 'Capstone System Integration Defense', is_orientation: false }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', iloData.map(i => ({ ...i, createdAt: now, updatedAt: now })), {});

        const ilos = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, is_orientation FROM IntendedLearningOutcomes WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const gradedIlos = ilos.filter(i => !i.is_orientation);

        // ============================================================================
        // 7. WEEKS (4 weeks per CO = 16 Weeks, hours = 5.00 each)
        // ============================================================================
        const weeksToInsert = [];
        for (let cIdx = 0; cIdx < 4; cIdx++) {
            for (let w = 0; w < 4; w++) {
                weeksToInsert.push({
                    co_id: cos[cIdx].co_id,
                    hours: 5.00,
                    createdAt: now,
                    updatedAt: now
                });
            }
        }
        await queryInterface.bulkInsert('Weeks', weeksToInsert, {});

        const weeks = await queryInterface.sequelize.query(
            `SELECT week_id, co_id FROM Weeks WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY week_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 8. REFERENCES & WEEKLY REFERENCES (2 per Week = 32 WeeklyReferences)
        // ============================================================================
        const referencesData = [
            { title: 'UNC Student Handbook & Institutional VMO Guide', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: new Date('2024-06-01'), type: 'ONLINE' },
            { title: 'Fundamentals of Software Architecture: An Engineering Approach', author: 'Mark Richards & Neal Ford', isbn: '978-1492043454', link: null, publication_year: new Date('2020-01-01'), type: 'TEXTBOOK' },
            { title: 'Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions', author: 'Gregor Hohpe & Bobby Woolf', isbn: '978-0321200686', link: null, publication_year: new Date('2003-01-01'), type: 'TEXTBOOK' },
            { title: 'Building Microservices: Designing Fine-Grained Systems (2nd Edition)', author: 'Sam Newman', isbn: '978-1492034025', link: null, publication_year: new Date('2021-01-01'), type: 'TEXTBOOK' },
            { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', isbn: '978-1449373320', link: null, publication_year: new Date('2017-01-01'), type: 'TEXTBOOK' },
            { title: 'Microservices Patterns: With Examples in Java', author: 'Chris Richardson', isbn: '978-1617294549', link: null, publication_year: new Date('2018-01-01'), type: 'TEXTBOOK' },
            { title: 'Software Architecture: The Hard Parts', author: 'Neal Ford, Mark Richards, Pramod Sadalage & Zhamak Dehghani', isbn: '978-1492086895', link: null, publication_year: new Date('2021-01-01'), type: 'TEXTBOOK' },
            { title: 'RESTful Web APIs: Services for a Changing World', author: 'Leonard Richardson & Mike Amundsen', isbn: '978-1449358068', link: null, publication_year: new Date('2013-01-01'), type: 'TEXTBOOK' },
            { title: 'The TOGAF Standard, 10th Edition Architecture Development Method', author: 'The Open Group', isbn: null, link: 'https://pubs.opengroup.org/togaf-standard/', publication_year: new Date('2022-01-01'), type: 'ONLINE' },
            { title: 'The C4 Model for Visualizing Software Architecture', author: 'Simon Brown', isbn: null, link: 'https://c4model.com/', publication_year: new Date('2023-01-01'), type: 'OER' },
            { title: 'OpenAPI 3.1 Specification & Contract-First Design Guide', author: 'OpenAPI Initiative', isbn: null, link: 'https://spec.openapis.org/oas/latest.html', publication_year: new Date('2024-01-01'), type: 'ONLINE' },
            { title: 'gRPC & Protocol Buffers Official Engineering Documentation', author: 'Cloud Native Computing Foundation', isbn: null, link: 'https://grpc.io/docs/', publication_year: new Date('2024-01-01'), type: 'ONLINE' },
            { title: 'RabbitMQ AMQP 0-9-1 Messaging Broker Tutorials', author: 'VMware Tanzu / RabbitMQ Team', isbn: null, link: 'https://www.rabbitmq.com/tutorials', publication_year: new Date('2024-01-01'), type: 'ONLINE' },
            { title: 'Apache Kafka Event Streaming Platform Documentation', author: 'Apache Software Foundation', isbn: null, link: 'https://kafka.apache.org/documentation/', publication_year: new Date('2024-01-01'), type: 'OER' },
            { title: 'OpenTelemetry Distributed Tracing & Observability Framework', author: 'CNCF OpenTelemetry Project', isbn: null, link: 'https://opentelemetry.io/docs/', publication_year: new Date('2024-01-01'), type: 'OER' },
            { title: 'Kubernetes Production Orchestration & Zero-Trust OAuth2 Security', author: 'Kubernetes & OAuth Working Group', isbn: null, link: 'https://kubernetes.io/docs/home/', publication_year: new Date('2025-01-01'), type: 'ONLINE' }
        ];

        await queryInterface.bulkInsert('References', referencesData.map(r => ({ ...r, createdAt: now, updatedAt: now })), {});

        const refs = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT ${referencesData.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const weekRefPairs = [
            [0, 1],   // Week 1: UNC Handbook & Fundamentals of Software Architecture
            [1, 8],   // Week 2: Fundamentals of Software Architecture & TOGAF 10th Ed
            [8, 9],   // Week 3: TOGAF 10th Ed & C4 Model
            [1, 6],   // Week 4: Fundamentals of Software Architecture & Software Architecture: The Hard Parts
            [2, 7],   // Week 5: Enterprise Integration Patterns & RESTful Web APIs
            [7, 10],  // Week 6: RESTful Web APIs & OpenAPI 3.1 Spec
            [11, 12], // Week 7: gRPC Docs & RabbitMQ AMQP Tutorials
            [2, 13],  // Week 8: Enterprise Integration Patterns & Apache Kafka Docs
            [3, 5],   // Week 9: Building Microservices & Microservices Patterns
            [4, 5],   // Week 10: Designing Data-Intensive Applications & Microservices Patterns
            [3, 14],  // Week 11: Building Microservices & OpenTelemetry Docs
            [5, 6],   // Week 12: Microservices Patterns & Software Architecture: The Hard Parts
            [3, 15],  // Week 13: Building Microservices & Kubernetes / OAuth2 Security
            [14, 15], // Week 14: OpenTelemetry & Kubernetes Production Orchestration
            [4, 10],  // Week 15: Designing Data-Intensive Applications & OpenAPI Contract Testing
            [6, 15]   // Week 16: Software Architecture: The Hard Parts & Kubernetes Orchestration
        ];

        const weeklyReferencesToInsert = [];
        for (let wIdx = 0; wIdx < 16; wIdx++) {
            const [r1, r2] = weekRefPairs[wIdx];
            weeklyReferencesToInsert.push({
                week_id: weeks[wIdx].week_id,
                reference_id: refs[r1].reference_id,
                is_orientation: wIdx === 0,
                createdAt: now,
                updatedAt: now
            });
            weeklyReferencesToInsert.push({
                week_id: weeks[wIdx].week_id,
                reference_id: refs[r2].reference_id,
                is_orientation: false,
                createdAt: now,
                updatedAt: now
            });
        }
        await queryInterface.bulkInsert('WeeklyReferences', weeklyReferencesToInsert, {});

        // ============================================================================
        // 9. TOPICS & SUBTOPICS (2 Topics per Week = 32 Topics; 3 Subtopics per Topic = 96 Subtopics)
        // ============================================================================
        const weeklyCurriculum = [
            // ---------------- CO1: Weeks 1 - 4 ----------------
            {
                weekIdx: 0,
                topics: [
                    {
                        title: 'Course Orientation and Institutional VMO Alignment',
                        is_orientation: true,
                        subtopics: [
                            'University of Nueva Caceres and SCIS Vision, Mission, and Objectives',
                            'System Integration Syllabus, Grading Criteria, and Laboratory Safety Policies',
                            'Ethical Engineering Standards and AI Attribution Guidelines in Architecture Design'
                        ]
                    },
                    {
                        title: 'Foundations of Enterprise Systems and Integration Challenges',
                        is_orientation: false,
                        subtopics: [
                            'Evolution of Enterprise Computing from Mainframe Silos to Distributed Ecosystems',
                            'Information Silos, Data Redundancy, and Heterogeneous System Friction',
                            'Business Drivers for System Integration: Agility, Real-Time Visibility, and Compliance'
                        ]
                    }
                ]
            },
            {
                weekIdx: 1,
                topics: [
                    {
                        title: 'Software Architecture Styles and Structural Taxonomy',
                        subtopics: [
                            'Monolithic Architectures: Layered (N-Tier), Modular Monoliths, and Microkernel Styles',
                            'Distributed Architectures: Service-Oriented (SOA), Event-Driven, and Space-Based Styles',
                            'Comparing Partitioning Strategies: Technical Layering vs. Domain-Driven Partitioning'
                        ]
                    },
                    {
                        title: 'Architectural Quality Attributes and Trade-Off Analysis',
                        subtopics: [
                            'Operational Quality Attributes: Scalability, Elasticity, Availability, and Fault Tolerance',
                            'Structural Quality Attributes: Maintainability, Testability, Deployability, and Extensibility',
                            'Architecture Tradeoff Analysis Method (ATAM) and Architectural Fitness Functions'
                        ]
                    }
                ]
            },
            {
                weekIdx: 2,
                topics: [
                    {
                        title: 'Enterprise Architecture Frameworks (TOGAF & Zachman)',
                        subtopics: [
                            'TOGAF Architecture Development Method (ADM) Lifecycle Phases and Governance',
                            'Business, Data, Application, and Technology Architecture Domains (BDAT)',
                            'Zachman Enterprise Framework Matrix and Federal Enterprise Architecture Reference Models'
                        ]
                    },
                    {
                        title: 'Visualizing Software Architecture with the C4 Model',
                        subtopics: [
                            'Level 1 System Context and Level 2 Container Diagrams for Enterprise Landscapes',
                            'Level 3 Component and Level 4 Code Diagrams for Granular Integration Modules',
                            'Architecture Decision Records (ADRs) and Diagram-as-Code with Structurizr and PlantUML'
                        ]
                    }
                ]
            },
            {
                weekIdx: 3,
                topics: [
                    {
                        title: 'Domain-Driven Design (DDD) Strategic Modeling',
                        subtopics: [
                            'Ubiquitous Language, Core Domains, Supporting Subdomains, and Generic Subdomains',
                            'Bounded Contexts and Context Mapping Relationships (ACL, Conformist, Shared Kernel)',
                            'Event Storming Workshops to Discover Domain Events, Commands, and Aggregates'
                        ]
                    },
                    {
                        title: 'Legacy System Modernization and Migration Strategies',
                        subtopics: [
                            'The Strangler Fig Application Pattern for Incremental Legacy Replacement',
                            'Anti-Corruption Layers (ACL) and Adapter Gateways for Mainframe/ERP Interfacing',
                            'Evaluating the 7 Rs of Migration: Refactor, Replatform, Repurchase, and Retire'
                        ]
                    }
                ]
            },

            // ---------------- CO2: Weeks 5 - 8 ----------------
            {
                weekIdx: 4,
                topics: [
                    {
                        title: 'Fundamental Enterprise Integration Styles',
                        subtopics: [
                            'File Transfer, Shared Database, Remote Procedure Invocation, and Messaging Styles',
                            'Point-to-Point Spaghetti Integration vs. Hub-and-Spoke and Enterprise Service Bus (ESB)',
                            'Coupling Dimensions in Integration: Temporal, Spatial, Platform, and Data Format Coupling'
                        ]
                    },
                    {
                        title: 'Data-Level Integration, ETL/ELT, and Change Data Capture',
                        subtopics: [
                            'Batch Extract-Transform-Load (ETL) vs. Modern Cloud ELT Data Pipelines',
                            'Log-Based Change Data Capture (CDC) Using Debezium for Real-Time State Sync',
                            'Master Data Management (MDM), Schema Evolution, and Data Replication Topologies'
                        ]
                    }
                ]
            },
            {
                weekIdx: 5,
                topics: [
                    {
                        title: 'RESTful API Architecture and Richardson Maturity Model',
                        subtopics: [
                            'REST Architectural Constraints, Resource URI Design, and HTTP Semantic Methods',
                            'Richardson Maturity Model Levels 0-3 and Hypermedia as the Engine of Application State (HATEOAS)',
                            'API Versioning Strategies, Pagination, Filtering, and RFC 7807 Problem Details'
                        ]
                    },
                    {
                        title: 'Contract-First API Engineering with OpenAPI and GraphQL',
                        subtopics: [
                            'Designing OpenAPI 3.1 Specifications, JSON Schema Validation, and Mock Servers',
                            'GraphQL Schema Definition Language (SDL), Queries, Mutations, and Resolver Chains',
                            'Apollo Federation and Solving the N+1 Query Problem with DataLoader Batching'
                        ]
                    }
                ]
            },
            {
                weekIdx: 6,
                topics: [
                    {
                        title: 'High-Performance RPC with gRPC and Protocol Buffers',
                        subtopics: [
                            'Protocol Buffers (Protobuf v3) Binary Serialization and Backward/Forward Compatibility',
                            'gRPC Service Definitions: Unary, Server Streaming, Client Streaming, and Bidirectional RPCs',
                            'HTTP/2 Multiplexing, Deadline Propagation, and gRPC-Web Gateway Translation'
                        ]
                    },
                    {
                        title: 'Message-Oriented Middleware (MOM) and AMQP with RabbitMQ',
                        subtopics: [
                            'AMQP 0-9-1 Architecture: Producers, Exchanges, Bindings, Queues, and Consumers',
                            'Exchange Routing Topologies: Direct, Fanout, Topic, and Headers Exchanges',
                            'Consumer Acknowledgments, Prefetch QoS, Dead-Letter Exchanges (DLX), and Retry Queues'
                        ]
                    }
                ]
            },
            {
                weekIdx: 7,
                topics: [
                    {
                        title: 'Enterprise Integration Routing and Transformation Patterns',
                        subtopics: [
                            'Message Routing Patterns: Content-Based Router, Splitter, Aggregator, and Scatter-Gather',
                            'Message Transformation Patterns: Canonical Data Model, Envelope Wrapper, and Content Enricher',
                            'Idempotent Receiver, Transactional Outbox Pattern, and Competing Consumers'
                        ]
                    },
                    {
                        title: 'Distributed Event Streaming with Apache Kafka',
                        subtopics: [
                            'Kafka Broker Architecture: Topics, Partitions, Offsets, and Consumer Groups',
                            'Producer Partitioning Keys, ISR Replication, and Acks Durability Guarantees',
                            'Event Sourcing Fundamentals and Stream Processing with Kafka Streams'
                        ]
                    }
                ]
            },

            // ---------------- CO3: Weeks 9 - 12 ----------------
            {
                weekIdx: 8,
                topics: [
                    {
                        title: 'Microservices Decomposition and Granularity Principles',
                        subtopics: [
                            'Decomposing by Business Capability and Subdomain vs. Technical Layer',
                            'Sizing Microservices: Granularity Disintegrators and Integrators',
                            'Avoiding the Distributed Monolith Anti-Pattern and Nano-Service Pitfalls'
                        ]
                    },
                    {
                        title: 'Database-per-Service and Polyglot Persistence',
                        subtopics: [
                            'Enforcing Private Data Ownership and Schema Encapsulation per Microservice',
                            'Selecting Polyglot Storage Engines: Relational, Document, Key-Value, and Graph Stores',
                            'Shared Database Refactoring Patterns and Data Domain Ownership Boundaries'
                        ]
                    }
                ]
            },
            {
                weekIdx: 9,
                topics: [
                    {
                        title: 'Distributed Transactions and the Saga Pattern',
                        subtopics: [
                            'Limitations of Two-Phase Commit (2PC/XA) in High-Throughput Distributed Systems',
                            'Choreography-Based Sagas Using Domain Events vs. Orchestration-Based Sagas',
                            'Designing Compensating Transactions, Semantic Locks, and Pivot Transactions'
                        ]
                    },
                    {
                        title: 'CQRS and Eventual Consistency Models',
                        subtopics: [
                            'Command Query Responsibility Segregation (CQRS) Write and Read Model Separation',
                            'Materialized Read Views and Asynchronous Projection Synchronization',
                            'CAP Theorem and PACELC Trade-Offs in Partitioned Enterprise Networks'
                        ]
                    }
                ]
            },
            {
                weekIdx: 10,
                topics: [
                    {
                        title: 'API Gateways and Backends for Frontends (BFF)',
                        subtopics: [
                            'Edge Routing, Protocol Translation, Request Aggregation, and SSL Termination',
                            'Backends for Frontends (BFF) Pattern for Web, Mobile, and Third-Party Partner Clients',
                            'Configuring Kong / Envoy API Gateways with Rate Limiting and Request Transformation'
                        ]
                    },
                    {
                        title: 'Service Discovery and Service Mesh Architectures',
                        subtopics: [
                            'Client-Side vs. Server-Side Service Discovery and Health-Check Registries (Consul/Eureka)',
                            'Sidecar Proxy Architecture (Envoy/Istio) for Traffic Splitting and Mutual TLS (mTLS)',
                            'East-West Traffic Management, Canary Routing, and Shadow Traffic Mirroring'
                        ]
                    }
                ]
            },
            {
                weekIdx: 11,
                topics: [
                    {
                        title: 'Resilience Engineering and Fault-Tolerance Patterns',
                        subtopics: [
                            'Circuit Breaker State Machines (Closed, Open, Half-Open) and Fallback Strategies',
                            'Bulkhead Isolation, Exponential Backoff with Jitter, Timeouts, and Load Shedding',
                            'Chaos Engineering Principles and Fault Injection Testing in Distributed Services'
                        ]
                    },
                    {
                        title: 'Distributed Observability: Metrics, Logs, and Tracing',
                        subtopics: [
                            'The Three Pillars of Observability and the OpenTelemetry Instrumentation Standard',
                            'Distributed Context Propagation (W3C Trace Context), Spans, and Jaeger Flamegraphs',
                            'Structured JSON Log Aggregation (ELK/Loki) and RED/USE Prometheus Metrics Dashboards'
                        ]
                    }
                ]
            },

            // ---------------- CO4: Weeks 13 - 16 ----------------
            {
                weekIdx: 12,
                topics: [
                    {
                        title: 'Identity Federation, OAuth 2.1, and OpenID Connect (OIDC)',
                        subtopics: [
                            'Centralized Identity Providers (Keycloak/Auth0), Authorization Code Flow with PKCE',
                            'JSON Web Tokens (JWT) Structure, Cryptographic Signing (RS256), and Claims Verification',
                            'Token Introspection, Refresh Token Rotation, and Role/Attribute-Based Access Control'
                        ]
                    },
                    {
                        title: 'Zero-Trust API Security and OWASP API Top 10 Mitigation',
                        subtopics: [
                            'Mitigating Broken Object Level Authorization (BOLA) and Mass Assignment Vulnerabilities',
                            'Mutual TLS (mTLS) Service-to-Service Authentication and Secrets Management (Vault)',
                            'Web Application Firewalls (WAF), Payload Sanitization, and DDoS Throttling Policies'
                        ]
                    }
                ]
            },
            {
                weekIdx: 13,
                topics: [
                    {
                        title: 'Containerization and Multi-Service Docker Orchestration',
                        subtopics: [
                            'Multi-Stage Dockerfiles, Distroless Base Images, and Container Layer Optimization',
                            'Docker Compose Topologies: Custom Bridge Networks, Healthchecks, and Volume Mounts',
                            'Container Image Vulnerability Scanning (Trivy) and Private Registry Management'
                        ]
                    },
                    {
                        title: 'Kubernetes Cloud-Native Deployment Fundamentals',
                        subtopics: [
                            'Kubernetes Control Plane, Pods, Deployments, ReplicaSets, and StatefulSets',
                            'ClusterIP, NodePort, LoadBalancer Services, and Ingress Controller Routing',
                            'ConfigMaps, Secrets, Liveness/Readiness Probes, and Horizontal Pod Autoscaling (HPA)'
                        ]
                    }
                ]
            },
            {
                weekIdx: 14,
                topics: [
                    {
                        title: 'Consumer-Driven Contract Testing and Integration QA',
                        subtopics: [
                            'The Microservices Testing Pyramid: Unit, Component, Contract, and End-to-End Tests',
                            'Consumer-Driven Contract Testing with Pact Brokers to Prevent Breaking API Changes',
                            'Ephemeral Integration Testing Environments Using Testcontainers for DBs and Brokers'
                        ]
                    },
                    {
                        title: 'Continuous Integration, GitOps, and Progressive Delivery',
                        subtopics: [
                            'Automated CI/CD Pipelines (GitHub Actions) for Building, Testing, and Tagging Services',
                            'Declarative GitOps Deployment Workflows with ArgoCD and Helm Chart Packaging',
                            'Zero-Downtime Deployment Strategies: Blue-Green, Canary Releases, and Feature Flags'
                        ]
                    }
                ]
            },
            {
                weekIdx: 15,
                topics: [
                    {
                        title: 'Performance Benchmarking, SLA/SLO Governance, and FinOps',
                        subtopics: [
                            'Defining Service Level Indicators (SLIs), Objectives (SLOs), and Error Budgets',
                            'Load, Stress, and Spike Testing Integrated APIs Using k6 and Locust',
                            'Cloud FinOps, Resource Right-Sizing, and Caching Layers (Redis Read-Through/Write-Behind)'
                        ]
                    },
                    {
                        title: 'Capstone Enterprise System Integration Defense',
                        subtopics: [
                            'End-to-End Architecture Walkthrough: C4 Diagrams, API Contracts, and Event Topologies',
                            'Live Demonstration of Multi-Service Saga Execution, Fault Recovery, and Traceability',
                            'Post-Mortem Analysis, Security Audit Verification, and Production Readiness Sign-Off'
                        ]
                    }
                ]
            }
        ];

        for (const weekBlock of weeklyCurriculum) {
            const targetWeekId = weeks[weekBlock.weekIdx].week_id;
            for (const topicObj of weekBlock.topics) {
                await queryInterface.bulkInsert('Topics', [{
                    title: topicObj.title,
                    createdAt: now,
                    updatedAt: now
                }], {});

                const insertedTopic = await queryInterface.sequelize.query(
                    `SELECT topic_id FROM Topics ORDER BY topic_id DESC LIMIT 1;`,
                    { type: queryInterface.sequelize.QueryTypes.SELECT }
                );
                const topicId = insertedTopic[0].topic_id;

                const subRows = topicObj.subtopics.map((subTitle, idx) => ({
                    week_id: targetWeekId,
                    topic_id: topicId,
                    title: subTitle,
                    sequence_order: idx + 1,
                    is_orientation: Boolean(topicObj.is_orientation),
                    createdAt: now,
                    updatedAt: now
                }));
                await queryInterface.bulkInsert('Subtopics', subRows, {});
            }
        }

        // ============================================================================
        // 10. TEACHING AND LEARNING ACTIVITIES (6 per Week = 96 TLAs)
        //     & 11. TLA ASSESSMENTS (3 per Week = 48 Assessments; 3 per CO linked to gradedIlos)
        // ============================================================================
        const weeklyTlasData = [
            // ---------------- WEEK 1 (CO1) ----------------
            {
                weekIdx: 0, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'UNC VMO & Curriculum Orientation Reading', desc: 'Read the UNC Student Handbook and SCIS VMO guide to contextualize enterprise architecture competencies within institutional goals.' },
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'Enterprise Silo Failure Case Reading', desc: 'Analyze a documented industry case study where disconnected legacy databases caused critical operational bottlenecks.' },
                    { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation & Syllabus Briefing', desc: 'Interactive orientation covering course outcomes, weekly project milestones, grading rubrics, and laboratory policies.' },
                    { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'Enterprise System Landscape Inventory Workshop', desc: 'Group workshop mapping heterogeneous applications, data silos, and integration pain points in a sample university ecosystem.' },
                    { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO-to-Enterprise Architect Role Reflection', desc: 'Submit a structured reflection aligning UNC core values with ethical responsibilities in designing mission-critical enterprise systems.' },
                    { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Integration Driver Matrix Brief', desc: 'Compile a comparative brief categorizing business, regulatory, and technical drivers for enterprise system integration.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Course Orientation & Policy Check', desc: 'Formative verification of student alignment with syllabus policies, grading weights, and VMO commitments.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Enterprise Silo Audit Worksheet', desc: 'In-class evaluation of the group application inventory and identified data redundancy points.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'VMO Alignment Reflection Rubric', desc: 'Formative rubric scoring the depth of institutional VMO synthesis.' }
                ]
            },
            // ---------------- WEEK 2 (CO1 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 1, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Richards & Ford Architecture Styles Study', desc: 'Read chapters on monolithic versus distributed architectural styles and architectural characteristics from Fundamentals of Software Architecture.' },
                    { phase: 'preclass', by: 'S', lab: false, name: 'Quality Attribute Scenarios Worksheet', desc: 'Draft three measurable stimulus-response quality attribute scenarios for scalability, availability, and modifiability.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Architectural Styles & ATAM Trade-Off Colloquium', desc: 'Instructor-led analysis comparing layered, microkernel, event-driven, and SOA topologies using star ratings and ATAM matrices.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Architecture Characteristics & Fitness Function Lab', desc: 'Laboratory session defining automated architectural fitness functions and trade-off matrices for an e-commerce platform.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Modular Monolith vs. Distributed Trade-Off Report', desc: 'Author a technical decision report justifying when to retain a modular monolith versus migrating to distributed services.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Architectural Anti-Patterns Case Review', desc: 'Identify and document Big Ball of Mud and Vendor Lock-In anti-patterns from historical enterprise post-mortems.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 0, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative quiz evaluating architectural styles, quality attribute trade-offs, and enterprise framework principles.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'ATAM Trade-Off Matrix Lab Check', desc: 'Practical check of student quality attribute scenarios and architectural fitness function definitions.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Architecture Style Decision Brief', desc: 'Formative evaluation of the comparative trade-off justification report.' }
                ]
            },
            // ---------------- WEEK 3 (CO1 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 2, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'TOGAF ADM & Simon Brown C4 Model Reading', desc: 'Study the TOGAF 10th Edition ADM cycle and Simon Brown\'s C4 model hierarchical abstraction levels.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Structurizr DSL & PlantUML Setup Exercise', desc: 'Configure Diagram-as-Code tooling (PlantUML/Structurizr) and render a sample System Context diagram.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'TOGAF BDAT Domains & C4 Modeling Lecture', desc: 'Walkthrough of Business, Data, Application, and Technology architecture alignment and C4 container/component notation rules.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'C4 Architecture Modeling & ADR Studio Lab', desc: 'Hands-on laboratory constructing Level 1 Context, Level 2 Container, and Level 3 Component diagrams alongside Architecture Decision Records.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Diagram-as-Code Repository Submission', desc: 'Commit version-controlled PlantUML/Structurizr C4 diagrams and three formal ADRs to the team Git repository.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Peer C4 Diagram Notation Audit', desc: 'Audit a peer team\'s C4 diagrams for unambiguous arrow labels, protocol annotations, and abstraction consistency.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 1, weight: '30', name: 'C4 Architecture Modeling Blueprint', desc: 'Summative laboratory deliverable grading Level 1-3 C4 architectural diagrams, BDAT alignment, and ADR rigor.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'TOGAF ADM Phase Mapping Check', desc: 'In-class diagnostic exercise matching enterprise artifacts to TOGAF ADM phases.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Diagram-as-Code Syntax Verification', desc: 'Formative check ensuring all C4 containers specify runtime technology and communication protocols.' }
                ]
            },
            // ---------------- WEEK 4 (CO1 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 3, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'DDD Bounded Contexts & Strangler Fig Study', desc: 'Read Software Architecture: The Hard Parts chapters on Domain-Driven Design context mapping and legacy modernization.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Domain Event Storming Prep Board', desc: 'Prepare digital sticky-note boards listing candidate domain events, commands, actors, and external legacy systems.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Strategic DDD, Anti-Corruption Layers & Migration Seminar', desc: 'Detailed instruction on Bounded Context integration patterns (ACL, Open Host Service) and phased Strangler Fig migration.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Enterprise Architecture Proposal Studio & Defense', desc: 'Studio workshop finalizing the Prelim Enterprise Architecture Proposal with DDD context maps and legacy modernization roadmaps.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Finalized Prelim Enterprise Architecture Dossier', desc: 'Submit the complete Enterprise System Architecture Specification incorporating panel critique revisions.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Context Map Coupling Retrospective', desc: 'Write a post-studio reflection analyzing upstream/downstream team dependencies in the proposed context map.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 2, weight: '50', name: 'Enterprise Architecture Proposal', desc: 'Major Prelim deliverable evaluating the comprehensive Enterprise System Architecture Specification and DDD Context Map.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Event Storming & Bounded Context Check', desc: 'In-class verification of aggregate root boundaries and anti-corruption layer placement.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Legacy Strangler Migration Rubric', desc: 'Formative review of the incremental cutover and rollback strategy.' }
                ]
            },

            // ---------------- WEEK 5 (CO2 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 4, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Hohpe & Woolf Enterprise Integration Patterns Reading', desc: 'Read chapters 1-3 of Enterprise Integration Patterns comparing File Transfer, Shared Database, RPC, and Messaging.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Change Data Capture & ETL Pipeline Sandbox Setup', desc: 'Set up local PostgreSQL and Debezium Docker containers to inspect transaction log events.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Integration Topologies & CDC Data Synchronization Lecture', desc: 'Comparative lecture on Point-to-Point vs. Hub-and-Spoke/ESB architectures, batch ETL/ELT, and log-based Change Data Capture.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Database Replication & CDC Outbox Laboratory', desc: 'Hands-on laboratory configuring a transactional outbox table and streaming row-level database mutations across heterogeneous schemas.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Canonical Data Model Schema Mapping Spec', desc: 'Design a Canonical Data Model (CDM) that normalizes customer records across CRM, ERP, and Billing systems without N-squared translators.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Temporal & Spatial Coupling Analysis Essay', desc: 'Compare synchronous blocking RPC calls against asynchronous message channels under partial network partition scenarios.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 3, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Midterm quiz covering enterprise integration styles, coupling dimensions, REST/GraphQL/gRPC, and MOM concepts.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'CDC & Transactional Outbox Lab Check', desc: 'Practical verification of real-time change data capture event emission.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Canonical Data Model Transformation Audit', desc: 'Formative evaluation of schema normalization and translator reduction.' }
                ]
            },
            // ---------------- WEEK 6 (CO2 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 5, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'OpenAPI 3.1 & Richardson Maturity Model Study', desc: 'Study RESTful resource modeling, HTTP idempotency semantics, RFC 7807 error contracts, and GraphQL federation.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Swagger Editor & Postman Contract Drafting', desc: 'Author a draft OpenAPI 3.1 YAML specification defining request/response schemas for an Order Integration API.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Contract-First REST & Federated GraphQL Engineering Seminar', desc: 'Demonstration of contract-first API code generation, HATEOAS links, cursor pagination, and GraphQL DataLoader batching.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'REST & GraphQL Integration Gateway Practicum', desc: 'Supervised laboratory building a contract-validated RESTful API and a GraphQL aggregation layer resolving data from two backend services.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Automated Postman & Newman API Contract Suite', desc: 'Create an automated Newman CLI test collection verifying status codes, JSON schema compliance, and idempotency keys.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'REST vs. GraphQL Over-Fetching Benchmark Note', desc: 'Measure payload sizes and round-trip latencies comparing composite REST endpoints against GraphQL queries.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 4, weight: '30', name: 'API & Messaging Middleware Practicum', desc: 'Summative laboratory practicum evaluating contract-first OpenAPI 3.1 implementation, schema validation, and GraphQL aggregation.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'OpenAPI 3.1 Linting & RFC 7807 Check', desc: 'In-class verification of strict OpenAPI schema rules and standardized error responses.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Newman Contract Test Pass Report', desc: 'Formative check of automated API contract test execution.' }
                ]
            },
            // ---------------- WEEK 7 (CO2) ----------------
            {
                weekIdx: 6, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Protobuf Binary Wire Format & AMQP 0-9-1 Study', desc: 'Read CNCF gRPC documentation on Protocol Buffers field numbering and RabbitMQ tutorials on AMQP exchanges and bindings.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Proto3 Compiler & RabbitMQ Management Container Setup', desc: 'Compile a sample `.proto` service file into stub code and launch the RabbitMQ Management UI locally.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'High-Performance gRPC Streaming & RabbitMQ Routing Lecture', desc: 'Deep-dive into HTTP/2 multiplexing, bidirectional gRPC streams, AMQP Direct/Topic/Fanout exchanges, and Dead-Letter Queues.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'gRPC Micro-Adapter & RabbitMQ DLX Laboratory', desc: 'Hands-on lab implementing an internal gRPC inventory service and wiring RabbitMQ topic exchanges with retry and dead-letter routing.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Poison Message & Idempotent Consumer Exercise', desc: 'Implement an idempotent message consumer with Redis deduplication keys that safely routes poison messages to a DLX.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'JSON over REST vs. Protobuf over gRPC Throughput Log', desc: 'Document serialization CPU overhead and wire payload compression ratios across 10,000 simulated requests.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'gRPC & AMQP Exchange Wiring Rubric', desc: 'Formative laboratory check of `.proto` contract compilation, topic routing keys, and DLX fallback queues.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'AMQP Ack & Prefetch QoS Spot-Check', desc: 'In-class diagnostic verifying manual consumer acknowledgments and backpressure control.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Idempotent Consumer Deduplication Check', desc: 'Verification that duplicate message deliveries do not corrupt downstream state.' }
                ]
            },
            // ---------------- WEEK 8 (CO2 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 7, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Apache Kafka Log Compaction & EIP Routing Study', desc: 'Study Apache Kafka partitioned log architecture, consumer group rebalancing, and Hohpe\'s Splitter/Aggregator patterns.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Midterm Event-Driven Integration Prototype Prep', desc: 'Prepare multi-container Docker Compose definitions linking REST/gRPC producers, RabbitMQ/Kafka brokers, and worker consumers.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Kafka Event Streaming & Enterprise Routing Patterns Seminar', desc: 'Live walkthrough of Kafka partition keys, offset commits, Content-Based Routers, Scatter-Gather, and Event Sourcing logs.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Event-Driven Integration Prototype Demonstration & Critique', desc: 'Formal Midterm laboratory demonstration of an end-to-end synchronous and asynchronous enterprise integration pipeline.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Consumer Lag & Throughput Optimization Revision', desc: 'Tune Kafka partition counts and RabbitMQ consumer prefetch settings based on Midterm load-test feedback.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Broker vs. Event Log Architectural Comparison', desc: 'Synthesize a technical comparison distinguishing smart-broker/dumb-consumer (RabbitMQ) from dumb-broker/smart-consumer (Kafka).' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 5, weight: '50', name: 'Event-Driven Integration Prototype', desc: 'Major Midterm project assessment evaluating a working event-driven integration pipeline using REST/gRPC and RabbitMQ/Kafka.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'EIP Splitter & Aggregator Routing Check', desc: 'In-class evaluation of message correlation IDs and aggregation completion strategies.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Kafka Partition & Offset Durability Audit', desc: 'Formative check of consumer group failover and zero-message-loss configuration.' }
                ]
            },

            // ---------------- WEEK 9 (CO3 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 8, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Sam Newman Building Microservices Decomposition Study', desc: 'Read Sam Newman\'s chapters on decomposing monoliths, bounded context alignment, and avoiding distributed monolith traps.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Shared Database Coupling Audit', desc: 'Analyze a legacy SQL schema with cross-domain foreign keys and propose table-ownership splits per microservice.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Microservices Granularity & Polyglot Persistence Lecture', desc: 'In-depth lecture on service disintegrators/integrators, Database-per-Service encapsulation, and polyglot storage selection.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Database Decomposition & Private Schema Refactoring Lab', desc: 'Laboratory workshop splitting a monolithic database into isolated PostgreSQL, MongoDB, and Redis service stores.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Cross-Service Data Join Elimination Blueprint', desc: 'Replace cross-schema SQL joins with API composition and replicated read-model projections.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Distributed Monolith Smell Checklist', desc: 'Evaluate the team\'s service boundaries against lockstep deployment and shared-library coupling smells.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 6, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Semifinal quiz covering microservices granularity, CAP/PACELC theorems, Saga patterns, and CQRS.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Polyglot Schema Encapsulation Check', desc: 'Practical lab check ensuring no microservice directly queries another service\'s database.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Service Boundary Cohesion Rubric', desc: 'Formative review of domain cohesion and loose coupling across decomposed services.' }
                ]
            },
            // ---------------- WEEK 10 (CO3) ----------------
            {
                weekIdx: 9, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Chris Richardson Saga Pattern & CQRS Study', desc: 'Read Microservices Patterns chapters on managing distributed transactions with Sagas and implementing CQRS read models.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Compensating Transaction State Machine Design', desc: 'Draw a state machine diagram for an Order-Payment-Inventory workflow detailing forward pivot steps and backward compensations.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Distributed Sagas (Orchestration vs. Choreography) & CQRS Seminar', desc: 'Analytical walkthrough of 2PC limitations, Saga orchestration state machines, event choreography, and CQRS eventual consistency.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Saga Orchestrator & Compensating Rollback Lab', desc: 'Hands-on laboratory implementing a Saga orchestrator that automatically triggers compensating refunds when inventory reservation fails.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'CQRS Read-Model Projection Implementation', desc: 'Build an event-driven query projection service that maintains a denormalized view updated via Kafka domain events.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Semantic Lock & Lost Update Prevention Brief', desc: 'Document countermeasures for isolation anomalies (dirty reads, lost updates) in eventually consistent sagas.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Saga Compensation Rollback Verification', desc: 'Formative laboratory check verifying clean state rollback upon simulated downstream payment/inventory failure.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Orchestration vs. Choreography Trade-Off Check', desc: 'In-class analytical exercise contrasting cyclic dependency risks in choreography against orchestrator centralization.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'CQRS Eventual Consistency Projection Audit', desc: 'Verification of read-model synchronization latency and idempotency.' }
                ]
            },
            // ---------------- WEEK 11 (CO3 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 10, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'API Gateways, BFF & Circuit Breaker Patterns Reading', desc: 'Study API Gateway routing, Backends for Frontends (BFF), dynamic service discovery, and Michael Nygard\'s Release It! resilience patterns.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Gateway Routing & Consul Discovery Config Prep', desc: 'Prepare declarative gateway route configurations and health-check endpoints for three backend microservices.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'API Gateway, Service Discovery & Fault-Tolerance Lecture', desc: 'Instruction on edge routing, rate limiting, Consul/Eureka discovery, sidecar service meshes, Circuit Breakers, and Bulkheads.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Resilient Microservices Mesh & Circuit Breaker Practicum', desc: 'Supervised laboratory configuring an API Gateway with token bucket rate limiting, dynamic service discovery, and Resilience4j/Polly circuit breakers.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Chaos Fault-Injection & Graceful Degradation Drill', desc: 'Inject artificial 2000ms network latency and 503 errors into a downstream service to verify circuit breaker opening and fallback responses.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Retry Storm & Exponential Backoff Jitter Analysis', desc: 'Calculate how randomized jitter prevents synchronized client retry storms during partial outage recovery.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 7, weight: '30', name: 'Resilient Microservices Mesh Lab', desc: 'Summative Semifinal laboratory assessment grading API gateway routing, service discovery, rate limiting, and circuit breaker fault tolerance.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Circuit Breaker State Transition Check', desc: 'In-class verification of Closed, Open, and Half-Open threshold configurations.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Chaos Fault-Injection Resilience Report', desc: 'Formative check of graceful fallback execution without cascading thread exhaustion.' }
                ]
            },
            // ---------------- WEEK 12 (CO3 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 11, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'OpenTelemetry Distributed Tracing & Observability Study', desc: 'Read CNCF OpenTelemetry documentation on W3C Trace Context propagation, Jaeger spans, Prometheus metrics, and structured logging.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Jaeger, Prometheus & Grafana Stack Bootstrap', desc: 'Launch the observability telemetry stack via Docker Compose and instrument service HTTP/messaging headers with trace IDs.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Distributed Tracing, Correlation IDs & RED Metrics Seminar', desc: 'Live walkthrough of tracing asynchronous Kafka/RabbitMQ hops, correlating structured JSON logs, and building Grafana RED dashboards.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Semifinal Microservices Ecosystem Defense & Live Chaos Test', desc: 'Formal Semifinal defense where teams demonstrate their multi-service ecosystem under live fault injection with full Jaeger trace visibility.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Telemetry Bottleneck Remediation & Trace Freeze', desc: 'Resolve N+1 RPC bottlenecks identified in Jaeger flamegraphs and freeze the microservices mesh for Final cloud deployment.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Observability vs. Traditional Monitoring Synthesis', desc: 'Document how high-cardinality distributed traces diagnose unknown-unknown failure modes in microservices.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 8, weight: '50', name: 'Microservices Ecosystem Defense', desc: 'Major Semifinal defense evaluating the resilient multi-service backend, Saga coordination, API gateway, and OpenTelemetry observability.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'W3C Trace Context Propagation Check', desc: 'Verification that trace_id and span_id propagate seamlessly across gateway, HTTP, and message broker boundaries.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Grafana RED Metrics Dashboard Audit', desc: 'Formative check of Request Rate, Error Rate, and Duration (p95/p99) telemetry panels.' }
                ]
            },

            // ---------------- WEEK 13 (CO4 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 12, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'OAuth 2.1, OIDC & OWASP API Security Top 10 Study', desc: 'Study OAuth 2.1 Authorization Code Flow with PKCE, OpenID Connect ID/Access tokens, and OWASP API Security Top 10 mitigations.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Keycloak Identity Realm & RSA Keypair Setup', desc: 'Configure a local Keycloak Identity Provider realm with client scopes, roles, and RS256 public key endpoints (JWKS).' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Zero-Trust Identity Federation, JWT & mTLS Security Lecture', desc: 'Lecture on centralized OIDC authentication, gateway JWT signature verification, RBAC/ABAC claims, and mTLS zero-trust networking.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Keycloak OIDC Federation & BOLA Mitigation Lab', desc: 'Hands-on laboratory securing the API Gateway and microservices with Keycloak JWT validation and resource-level BOLA authorization checks.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Automated OWASP ZAP API Penetration Scan', desc: 'Run an OWASP ZAP security scan against the integrated API endpoints and patch any token leakage or injection vulnerabilities.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Stateless JWT vs. Opaque Token Introspection Brief', desc: 'Analyze revocation trade-offs between stateless self-contained JWTs and reference tokens with Phantom Token patterns.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 9, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Final quiz covering OAuth2/OIDC identity federation, OWASP API security, Docker/Kubernetes orchestration, and contract testing.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'OIDC JWKS & RBAC Enforcement Lab Check', desc: 'Practical check verifying gateway rejection of expired/tampered JWTs and unauthorized role claims.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'OWASP API Security Remediation Log', desc: 'Formative audit of BOLA and mass-assignment vulnerability patches.' }
                ]
            },
            // ---------------- WEEK 14 (CO4 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 13, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Kubernetes Workloads, Services & Ingress Documentation Study', desc: 'Read Kubernetes documentation on Deployments, StatefulSets, ConfigMaps, Secrets, Liveness/Readiness probes, and HPA.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Multi-Stage Dockerfile Optimization & Trivy Scan', desc: 'Refactor service Dockerfiles into multi-stage non-root builds and scan images for CVEs using Trivy.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Kubernetes Orchestration, Probes & Autoscaling Seminar', desc: 'Instruction on declarative K8s manifests, zero-downtime rolling updates, Ingress routing, and Horizontal Pod Autoscaling.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Kubernetes Cluster Deployment & CI/CD Pipeline Lab', desc: 'Supervised laboratory deploying the integrated microservices stack to a Kubernetes cluster with automated GitHub Actions CI/CD workflows.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Pact Consumer-Driven Contract Test Integration', desc: 'Integrate Pact contract verification steps into the GitHub Actions pipeline to block breaking API schema deployments.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Liveness vs. Readiness Probe Misconfiguration Case Analysis', desc: 'Analyze how overly aggressive liveness probes trigger cascading pod restart loops under database slowdowns.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 10, weight: '30', name: 'Cloud-Native CI/CD & Security Audit', desc: 'Summative Final laboratory assessment grading multi-stage containerization, Kubernetes manifests, CI/CD automation, and security hardening.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Dockerfile Non-Root & Image Size Check', desc: 'In-class check verifying minimal container attack surface and zero critical CVEs.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Pact Contract & K8s Probe Verification', desc: 'Formative check of automated CI contract gates and Kubernetes readiness health probes.' }
                ]
            },
            // ---------------- WEEK 15 (CO4) ----------------
            {
                weekIdx: 14, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'SRE SLI/SLO Error Budgets & Load Testing Study', desc: 'Study Google SRE guidelines on Service Level Indicators, Objectives, Error Budgets, and k6 performance testing scripts.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'k6 Load & Spike Test Script Authoring', desc: 'Write k6 JavaScript load-testing scripts simulating 500 concurrent virtual users executing end-to-end integration workflows.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Performance Tuning, Redis Caching & Canary Delivery Lecture', desc: 'Lecture on diagnosing tail-latency (p99) bottlenecks, Redis read-through caching, connection pooling, and ArgoCD canary rollouts.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'End-to-End Load Benchmarking & Bottleneck Remediation Lab', desc: 'Hands-on laboratory running k6 stress tests against the Kubernetes deployment, tuning HPA thresholds, and adding Redis caching layers.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Production Readiness & SLA/SLO Runbook Package', desc: 'Compile the formal Production Readiness Review (PRR) runbook detailing SLO targets, alert rules, and disaster recovery procedures.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Cache Invalidation & Thundering Herd Mitigation Note', desc: 'Document how mutex locks and TTL jitter prevent cache stampedes on cold start.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'k6 Tail-Latency & HPA Scaling Rubric', desc: 'Formative lab evaluation of p95/p99 latency improvements and Kubernetes Horizontal Pod Autoscaler responsiveness.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'SLI/SLO & Error Budget Calculation Check', desc: 'In-class check of availability math (99.9% vs 99.99%) and alert threshold definitions.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Production Readiness Runbook Audit', desc: 'Verification of incident response playbooks and rollback procedures.' }
                ]
            },
            // ---------------- WEEK 16 (CO4 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 15, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Executive Architecture Defense & Post-Mortem Prep', desc: 'Synthesize C4 architectural blueprints, OpenAPI/Protobuf contracts, security scan reports, and k6 telemetry into the Capstone Defense deck.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Production Cluster Freeze & Smoke Test Verification', desc: 'Execute final end-to-end automated smoke tests across all integrated services, message brokers, and identity providers.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Enterprise Architecture Governance & Sign-Off Briefing', desc: 'Instructor briefing on enterprise architecture review board (EARB) evaluation criteria and production handoff standards.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Capstone System Integration Defense & Live Chaos Demo', desc: 'Formal Final oral defense and live demonstration of the cloud-native integrated enterprise system under simulated load and node failure.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Archival Enterprise Integration Repository Release', desc: 'Tag the v1.0.0 release in Git containing all source code, Helm/K8s manifests, C4 diagrams, ADRs, and observability dashboards.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Course Architectural Retrospective & Competency Log', desc: 'Submit an individual engineering retrospective evaluating growth across CO1-CO4 integration and architecture outcomes.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 11, weight: '50', name: 'Capstone System Integration Defense', desc: 'Major Final capstone defense evaluating the complete, secured, and observable cloud-native enterprise system integration.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'EARB Architecture Dossier Completeness Check', desc: 'Verification of complete C4 diagrams, ADRs, OpenAPI/Protobuf contracts, and security audit reports.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Git Release & Runbook Archival Sign-Off', desc: 'Final check of repository reproducibility and documentation quality.' }
                ]
            }
        ];

        for (const weekItem of weeklyTlasData) {
            const targetWeekId = weeks[weekItem.weekIdx].week_id;

            const tlaRows = weekItem.tlas.map(t => ({
                week_id: targetWeekId,
                tla_name: t.name,
                description: t.desc,
                performed_by: t.by,
                class_phase: t.phase,
                is_lab: Boolean(t.lab),
                is_orientation: Boolean(t.is_orientation),
                createdAt: now,
                updatedAt: now
            }));

            await queryInterface.bulkInsert('TeachingAndLearningActivities', tlaRows, {});

            const insertedTlas = await queryInterface.sequelize.query(
                `SELECT tla_id FROM TeachingAndLearningActivities WHERE week_id = ${targetWeekId} ORDER BY tla_id ASC;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );

            const assessRows = weekItem.assessments.map(a => ({
                tla_id: insertedTlas[a.tlaIdx].tla_id,
                ilo_id: a.iloIdx !== null ? gradedIlos[a.iloIdx].ilo_id : null,
                name: a.name,
                description: a.desc,
                period: weekItem.period,
                weight: a.weight,
                min_passing: 60,
                createdAt: now,
                updatedAt: now
            }));

            await queryInterface.bulkInsert('TLAAssessments', assessRows, {});
        }

        console.log("Successfully seeded 'System Integration & Architecture' (BIT321L) with full 16-week structure (PENDING status).");
    },

    async down(queryInterface, Sequelize) {
        console.warn("Use npx sequelize-cli db:seed:undo:all to reset the composition database cleanly.");
    }
};
