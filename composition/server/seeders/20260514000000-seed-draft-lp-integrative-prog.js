'use strict';

/**
 * Seeder: Single Course Learning Plan - "Integrative Programming and Technologies"
 * Status Target: DRAFT (Assigned, Not Submitted)
 *
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
            course_description: 'Focuses on multi-language software integration, polyglot runtime interoperability, data serialization formats (XML, JSON, YAML, Protobuf), cross-platform SDKs, webhooks, and enterprise middleware connectors.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} ORDER BY pc_offering_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT (Status = DRAFT)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: '1',
            date_assigned: new Date('2026-06-01'),
            date_submitted: null,
            date_updated: null,
            createdAt: now,
            updatedAt: now
        }], {});

        const intProgAssign = await queryInterface.sequelize.query(
            `SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ${offeringId} ORDER BY co_assign_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        if (intProgAssign.length > 0) {
            await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
                { co_assign_id: intProgAssign[0].co_assign_id, stakeholder_id: '2', actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', is_viewed: false, createdAt: new Date('2026-06-01 09:00:00'), updatedAt: new Date('2026-06-01 09:00:00') }
            ], {});
        }

        // ============================================================================
        // 4. COURSE OUTCOMES (4 records)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Analyze integrative programming paradigms, language interoperability mechanisms, and structured data exchange standards.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Develop interoperable software components using REST, SOAP/WSDL, GraphQL, and polyglot scripting bridges.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Implement secure third-party API integrations, webhooks, OAuth2 flows, and asynchronous queuing connectors.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Build, containerize, and test a polyglot multi-tier application integrating heterogeneous services and cloud SDKs.', createdAt: now, updatedAt: now }
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
            { co_id: cos[0].co_id, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now },

            { co_id: cos[1].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 6, attainment_level: 'E', createdAt: now, updatedAt: now },

            { co_id: cos[2].co_id, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 7, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 8, attainment_level: 'D', createdAt: now, updatedAt: now },

            { co_id: cos[3].co_id, po_id: 6, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 9, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 6. INTENDED LEARNING OUTCOMES (4 for CO1 with orientation, 3 each for CO2..CO4 = 13 total)
        // ============================================================================
        const iloData = [
            // CO1 (Prelim Period)
            { co_id: cos[0].co_id, description: "Cite the value and relevance of the University's and the College's VMO as related to the course.", is_orientation: true },
            { co_id: cos[0].co_id, description: 'Compare compiled, interpreted, and managed runtime environments and Foreign Function Interface (FFI) binding mechanisms.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Parse, validate, and transform complex payloads across XML/XSD, JSON Schema, YAML, and Protocol Buffers.', assessment_tool: 'Polyglot Data Serialization Practicum', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Develop a cross-language data transformation and IPC bridge connecting Python, Node.js, and JVM/C# modules.', assessment_tool: 'Cross-Runtime Interoperability Utility', is_orientation: false },

            // CO2 (Midterm Period)
            { co_id: cos[1].co_id, description: 'Contrast SOAP/WSDL XML web services, RESTful resource APIs, and GraphQL query execution engines.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Build a legacy SOAP-to-REST adapter service with automated WSDL parsing and JSON-Schema contract validation.', assessment_tool: 'SOAP-to-REST Protocol Adapter Lab', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Construct a unified polyglot BFF gateway aggregating REST, SOAP, and GraphQL upstream data sources.', assessment_tool: 'Midterm Polyglot API Gateway Project', is_orientation: false },

            // CO3 (Semifinal Period)
            { co_id: cos[2].co_id, description: 'Analyze OAuth 2.0 grant flows, HMAC webhook signature verification, and message queue worker topologies.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Implement a resilient webhook receiver and OAuth2 client integrating payment, messaging, and cloud storage SDKs.', assessment_tool: 'Third-Party SDK & Webhook Integration Lab', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Engineer an asynchronous task-processing pipeline using Redis/Celery and RabbitMQ across polyglot worker nodes.', assessment_tool: 'Asynchronous Polyglot Worker Pipeline', is_orientation: false },

            // CO4 (Final Period)
            { co_id: cos[3].co_id, description: 'Evaluate container network bridges, reverse proxy routing, and end-to-end integration test harnesses.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Configure multi-container Docker Compose environments with NGINX reverse proxies, TLS, and automated health checks.', assessment_tool: 'Multi-Container Reverse Proxy & CI Lab', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Present and defend a production-ready integrative software application uniting heterogeneous runtimes and external cloud APIs.', assessment_tool: 'Capstone Integrative Application Defense', is_orientation: false }
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
            // ONLINE RESOURCES (Title, Author, Link; no ISBN, no publication year)
            { course_id: courseId, course_no: 'BIT312L', title: 'UNC Student Handbook & SCIS Academic Policies', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: null, type: 'Online Resources' },
            
            // TEXTBOOKS (Title, Author, ISBN, Publication Year; no link)
            { course_id: courseId, course_no: 'BIT312L', title: 'Programming Language Pragmatics (4th Edition)', author: 'Michael L. Scott', isbn: '978-0124104099', link: null, publication_year: new Date('2015-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT312L', title: 'Fluent Python: Clear, Concise, and Effective Programming (2nd Edition)', author: 'Luciano Ramalho', isbn: '978-1492056355', link: null, publication_year: new Date('2022-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT312L', title: 'Node.js Design Patterns (3rd Edition)', author: 'Mario Casciaro & Luciano Mammino', isbn: '978-1839214110', link: null, publication_year: new Date('2020-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT312L', title: 'The Design of Web APIs', author: 'Arnaud Lauret', isbn: '978-1617295102', link: null, publication_year: new Date('2019-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT312L', title: 'OAuth 2 in Action', author: 'Justin Richer & Antonio Sanso', isbn: '978-1617293276', link: null, publication_year: new Date('2017-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT312L', title: 'Docker Deep Dive: Zero to Docker in a Single Book', author: 'Nigel Poulton', isbn: '978-1916585256', link: null, publication_year: new Date('2023-01-01'), type: 'Textbook' },
            
            // ONLINE RESOURCES
            { course_id: courseId, course_no: 'BIT312L', title: 'JSON Schema Specification & Validation Reference', author: 'JSON Schema Organization', isbn: null, link: 'https://json-schema.org/specification', publication_year: null, type: 'Online Resources' },
            
            // OPEN EDUCATIONAL RESOURCES (Title, Author, Link, optional ISBN & Year with values)
            { course_id: courseId, course_no: 'BIT312L', title: 'W3C XML Schema (XSD), XPath, and XSLT Standards', author: 'World Wide Web Consortium (W3C)', isbn: '978-1583482346', link: 'https://www.w3.org/XML/Schema', publication_year: new Date('2023-01-01'), type: 'Open Educational Resources' },
            
            // ONLINE RESOURCES
            { course_id: courseId, course_no: 'BIT312L', title: 'Protocol Buffers & FlatBuffers Developer Guide', author: 'Google Open Source', isbn: null, link: 'https://protobuf.dev/', publication_year: null, type: 'Online Resources' },
            
            // OPEN EDUCATIONAL RESOURCES
            { course_id: courseId, course_no: 'BIT312L', title: 'GraphQL Foundation Official Specification & Learn Portal', author: 'GraphQL Foundation', isbn: '978-1492030713', link: 'https://graphql.org/learn/', publication_year: new Date('2024-01-01'), type: 'Open Educational Resources' },
            
            // ONLINE RESOURCES
            { course_id: courseId, course_no: 'BIT312L', title: 'Stripe & GitHub Webhook Security Best Practices', author: 'Stripe Developer Engineering', isbn: null, link: 'https://docs.stripe.com/webhooks', publication_year: null, type: 'Online Resources' },
            
            // OPEN EDUCATIONAL RESOURCES
            { course_id: courseId, course_no: 'BIT312L', title: 'Celery Distributed Task Queue & Redis Broker Documentation', author: 'Celery Project', isbn: '978-1491953284', link: 'https://docs.celeryq.dev/', publication_year: new Date('2024-01-01'), type: 'Open Educational Resources' },
            
            // ONLINE RESOURCES
            { course_id: courseId, course_no: 'BIT312L', title: 'AWS SDK & Cloud Storage Integration Developer Guide', author: 'Amazon Web Services', isbn: null, link: 'https://docs.aws.amazon.com/sdkref/latest/guide/', publication_year: null, type: 'Online Resources' },
            { course_id: courseId, course_no: 'BIT312L', title: 'NGINX Reverse Proxy & API Gateway Configuration Guide', author: 'F5 NGINX Documentation', isbn: null, link: 'https://docs.nginx.com/', publication_year: null, type: 'Online Resources' },
            
            // OPEN EDUCATIONAL RESOURCES
            { course_id: courseId, course_no: 'BIT312L', title: 'OWASP API Security & Polyglot Dependency Auditing Guide', author: 'OWASP Foundation', isbn: '978-1951554125', link: 'https://owasp.org/www-project-api-security/', publication_year: new Date('2024-01-01'), type: 'Open Educational Resources' }
        ];

        await queryInterface.bulkInsert('References', referencesData.map(r => ({ ...r, createdAt: now, updatedAt: now })), {});

        const refs = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT ${referencesData.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const weekRefPairs = [
            [0, 1],   // Week 1
            [1, 2],   // Week 2
            [7, 8],   // Week 3
            [3, 9],   // Week 4
            [4, 8],   // Week 5
            [3, 4],   // Week 6
            [4, 10],  // Week 7
            [2, 10],  // Week 8
            [5, 15],  // Week 9
            [11, 13], // Week 10
            [2, 12],  // Week 11
            [3, 12],  // Week 12
            [6, 14],  // Week 13
            [6, 15],  // Week 14
            [4, 15],  // Week 15
            [6, 13]   // Week 16
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
                            'University of Nueva Caceres and SCIS Vision, Mission, and Core Values',
                            'Integrative Programming Course Syllabus, Grading System, and Lab Guidelines',
                            'Academic Integrity, Open-Source Licensing, and Responsible AI Assistance'
                        ]
                    },
                    {
                        title: 'Foundations of Integrative Programming and Polyglot Systems',
                        is_orientation: false,
                        subtopics: [
                            'Role of Integrative Programming in Heterogeneous Enterprise Environments',
                            'Scripting Glue Languages vs. Systems and Managed Runtime Languages',
                            'Architectural Trade-Offs of Polyglot Programming and Runtime Interoperability'
                        ]
                    }
                ]
            },
            {
                weekIdx: 1,
                topics: [
                    {
                        title: 'Language Execution Models and Runtime Interoperability',
                        subtopics: [
                            'Native Ahead-of-Time (AOT) Compilation vs. Bytecode Virtual Machines (JVM, CLR, V8)',
                            'Memory Management Boundaries: Garbage Collection vs. Manual Ownership across Runtimes',
                            'Application Binary Interfaces (ABI), Calling Conventions, and Shared Libraries (.so/.dll)'
                        ]
                    },
                    {
                        title: 'Foreign Function Interfaces (FFI) and Process Bridges',
                        subtopics: [
                            'Calling Native C/C++ Libraries from Python (ctypes/cffi) and Node.js (N-API)',
                            'WebAssembly (Wasm) Component Model and WASI Cross-Language Sandboxing',
                            'Subprocess Spawning, Standard I/O Pipes, and Exit Code Error Propagation'
                        ]
                    }
                ]
            },
            {
                weekIdx: 2,
                topics: [
                    {
                        title: 'Markup and Tree-Structured Data Serialization (XML, XSD, XSLT)',
                        subtopics: [
                            'XML Namespaces, Well-Formedness, and XML Schema Definition (XSD) Validation',
                            'Querying XML Trees Using XPath Expressions and DOM vs. SAX Streaming Parsers',
                            'Transforming XML Payloads into HTML/JSON Using XSLT Stylesheets'
                        ]
                    },
                    {
                        title: 'Modern Text and Binary Data Formats (JSON Schema, YAML, Protobuf)',
                        subtopics: [
                            'JSON Schema Draft 2020-12 Validation, Conditional Subschemas, and Type Coercion',
                            'YAML Anchors, Aliases, and Safe Deserialization Against Arbitrary Code Execution',
                            'Binary Serialization Formats: Protocol Buffers, MessagePack, and Apache Avro'
                        ]
                    }
                ]
            },
            {
                weekIdx: 3,
                topics: [
                    {
                        title: 'Inter-Process Communication (IPC) and Network Socket Programming',
                        subtopics: [
                            'Operating System IPC Primitives: Named Pipes (FIFOs), Shared Memory, and Unix Domain Sockets',
                            'TCP/IP and UDP Socket Programming Across Python and Node.js Runtimes',
                            'Framing Protocols, Length-Prefixed Streams, and Non-Blocking Event Loops'
                        ]
                    },
                    {
                        title: 'Data Transformation Pipelines and Schema Mapping Engines',
                        subtopics: [
                            'Building Resilient Data Adapters with Pydantic (Python) and Zod (TypeScript)',
                            'Character Encoding Normalization (UTF-8, UTF-16), Base64, and Timezone ISO-8601 Handling',
                            'Streaming Large CSV/Parquet/NDJSON Datasets Without Heap Exhaustion'
                        ]
                    }
                ]
            },

            // ---------------- CO2: Weeks 5 - 8 ----------------
            {
                weekIdx: 4,
                topics: [
                    {
                        title: 'Legacy Enterprise Web Services: SOAP, WSDL, and WS-Security',
                        subtopics: [
                            'SOAP 1.1/1.2 Envelope Anatomy: Header Blocks, Body Payloads, and Fault Elements',
                            'Web Services Description Language (WSDL) PortTypes, Bindings, and Service Endpoints',
                            'Consuming and Generating SOAP Clients Using Python Zeep and Node.js strong-soap'
                        ]
                    },
                    {
                        title: 'Protocol Adapters and Legacy-to-Modern Bridge Patterns',
                        subtopics: [
                            'Implementing the Adapter and Facade Design Patterns for Legacy Mainframe/SOAP Wrappers',
                            'Translating Stateful XML/SOAP Faults into Semantic HTTP/REST Status Codes',
                            'Connection Pooling, Timeout Enforcement, and XML External Entity (XXE) Prevention'
                        ]
                    }
                ]
            },
            {
                weekIdx: 5,
                topics: [
                    {
                        title: 'RESTful Service Integration and HTTP Client Engineering',
                        subtopics: [
                            'HTTP/1.1 vs. HTTP/2 Keep-Alive Connection Reuse, Content Negotiation, and ETags',
                            'Building Resilient HTTP Clients with Axios, Fetch, and Python HTTPX',
                            'Handling Rate Limits (HTTP 429 Retry-After), Idempotency-Key Headers, and Pagination'
                        ]
                    },
                    {
                        title: 'Middleware Chains, Interceptors, and Cross-Cutting Concerns',
                        subtopics: [
                            'Request/Response Interceptor Pipelines for Logging, Correlation IDs, and Compression',
                            'Cross-Origin Resource Sharing (CORS) Preflight Negotiation and Security Headers',
                            'Multipart/Form-Data Streaming and Chunked File Upload Integration'
                        ]
                    }
                ]
            },
            {
                weekIdx: 6,
                topics: [
                    {
                        title: 'GraphQL Schema Design and Polyglot Resolver Integration',
                        subtopics: [
                            'GraphQL Type System, Input Types, Interfaces, Unions, and Custom Scalars',
                            'Writing Resolver Functions that Stitch REST, SOAP, and SQL Data Sources',
                            'Query Depth Limiting, Complexity Cost Analysis, and Persisted Queries'
                        ]
                    },
                    {
                        title: 'Real-Time Bidirectional Integration: WebSockets and Server-Sent Events',
                        subtopics: [
                            'WebSocket Handshake Upgrade (RFC 6455), Heartbeat Ping/Pong, and Reconnection Logic',
                            'Server-Sent Events (SSE) EventStream Protocol for Unidirectional Live Feeds',
                            'Broadcasting Real-Time Events Across Polyglot Nodes Using Redis Pub/Sub Adapter'
                        ]
                    }
                ]
            },
            {
                weekIdx: 7,
                topics: [
                    {
                        title: 'Polyglot Backend-for-Frontend (BFF) Aggregation Architecture',
                        subtopics: [
                            'Designing a Unified Node.js/TypeScript BFF Layer Calling Python Data/ML Services',
                            'Parallel Upstream Fan-Out Using Promise.allSettled and Partial Failure Degradation',
                            'Response Caching with Redis TTLs and Stale-While-Revalidate Strategies'
                        ]
                    },
                    {
                        title: 'Automated SDK Generation and OpenAPI Toolchains',
                        subtopics: [
                            'Generating Type-Safe Client SDKs in Python and TypeScript from OpenAPI Specs',
                            'Schema Drift Detection and Breaking Change Linting with Optic and Spectral',
                            'Mocking Upstream Third-Party APIs Using WireMock and MSW (Mock Service Worker)'
                        ]
                    }
                ]
            },

            // ---------------- CO3: Weeks 9 - 12 ----------------
            {
                weekIdx: 8,
                topics: [
                    {
                        title: 'Delegated Authorization with OAuth 2.0 and OpenID Connect',
                        subtopics: [
                            'OAuth 2.0 Roles, Authorization Code Flow with PKCE, and Client Credentials Grant',
                            'Integrating Social and Enterprise SSO Providers (Google, GitHub, Microsoft Entra ID)',
                            'Secure Token Storage, Refresh Token Rotation, and Scope-Based Endpoint Guards'
                        ]
                    },
                    {
                        title: 'Cryptographic API Authentication: API Keys, HMAC, and Mutual TLS',
                        subtopics: [
                            'API Key Provisioning, Key Rotation, and Principle of Least Privilege Scoping',
                            'HMAC-SHA256 Request Signing, Timestamp Nonces, and Replay Attack Prevention',
                            'Managing Integration Credentials Using Environment Vaults and AWS/Doppler Secrets'
                        ]
                    }
                ]
            },
            {
                weekIdx: 9,
                topics: [
                    {
                        title: 'Webhook Architecture and Event-Driven Third-Party Callbacks',
                        subtopics: [
                            'Webhook Producer vs. Consumer Responsibilities and Fast-200 ACK Patterns',
                            'Verifying Webhook Signatures (Stripe/GitHub HMAC Headers) Using Constant-Time Comparison',
                            'Handling Out-of-Order Delivery, Duplicate Events, and Local Tunnel Testing (ngrok)'
                        ]
                    },
                    {
                        title: 'Cloud Vendor SDK Integration (Object Storage, Email, Payment)',
                        subtopics: [
                            'Integrating S3-Compatible Object Storage (AWS S3 / MinIO) with Presigned Upload URLs',
                            'Transactional Email and SMS Notification Gateways (SendGrid / Twilio SDKs)',
                            'Payment Gateway Checkout Session and Webhook Reconciliation Workflows'
                        ]
                    }
                ]
            },
            {
                weekIdx: 10,
                topics: [
                    {
                        title: 'Asynchronous Task Queues and Polyglot Worker Pools',
                        subtopics: [
                            'Offloading CPU-Bound and Slow I/O Integrations to Background Task Queues',
                            'Cross-Language Task Dispatch: Enqueuing Jobs in Node.js (BullMQ) and Python (Celery)',
                            'Task Serialization, Priority Queues, Scheduled Cron Jobs, and Rate-Limited Workers'
                        ]
                    },
                    {
                        title: 'Message Broker Connectors with Redis Streams and RabbitMQ',
                        subtopics: [
                            'Redis Streams Consumer Groups, Pending Entries List (PEL), and XACK Recovery',
                            'RabbitMQ Exchange-to-Queue Bindings Between Python Producers and Node.js Consumers',
                            'Dead-Letter Queues, Exponential Backoff Retries, and Circuit Breaking External Calls'
                        ]
                    }
                ]
            },
            {
                weekIdx: 11,
                topics: [
                    {
                        title: 'Enterprise Application Integration (EAI) Middleware and Low-Code Connectors',
                        subtopics: [
                            'Workflow Automation Engines (n8n, Node-RED, Apache Camel) for Rapid System Wiring',
                            'Building Custom Webhook and REST Connector Nodes for Internal Microservices',
                            'Auditing Execution Logs, Error Notification Channels, and Idempotent Replay'
                        ]
                    },
                    {
                        title: 'Resilience, Observability, and Fault Recovery in Third-Party Integrations',
                        subtopics: [
                            'Detecting Third-Party API Degradation and Switching to Failover Providers',
                            'Structured Correlation Logging Across Polyglot HTTP and Queue Boundaries',
                            'Graceful Degradation and Outbox Queuing When External SaaS Endpoints Are Offline'
                        ]
                    }
                ]
            },

            // ---------------- CO4: Weeks 13 - 16 ----------------
            {
                weekIdx: 12,
                topics: [
                    {
                        title: 'Containerizing Polyglot Applications with Docker',
                        subtopics: [
                            'Crafting Optimized Dockerfiles for Python (uv/pip), Node.js (pnpm), and Go/Java Services',
                            'Docker Compose Multi-Service Networking, Internal DNS Resolution, and Shared Volumes',
                            'Managing Environment Configuration and Startup Dependency Ordering (depends_on healthchecks)'
                        ]
                    },
                    {
                        title: 'Reverse Proxy Routing and API Gateway Layer with NGINX',
                        subtopics: [
                            'Configuring NGINX as a Unified Reverse Proxy Routing `/api/v1` and `/ml/v1` Backends',
                            'TLS/SSL Termination, WebSocket Upgrade Forwarding, and Gzip/Brotli Compression',
                            'Load Balancing Algorithms (Round Robin, Least Connections) and Rate-Limit Zones'
                        ]
                    }
                ]
            },
            {
                weekIdx: 13,
                topics: [
                    {
                        title: 'End-to-End Integration Testing and Service Virtualization',
                        subtopics: [
                            'Writing Cross-Service Integration Tests Using Pytest, Supertest, and Playwright',
                            'Spinning Up Ephemeral Database, Redis, and Mock S3 (LocalStack) via Testcontainers',
                            'Recording and Replaying Deterministic Third-Party HTTP Fixtures (VCR.py / Nock)'
                        ]
                    },
                    {
                        title: 'CI/CD Automation and Polyglot Dependency Security Auditing',
                        subtopics: [
                            'Multi-Language GitHub Actions Matrix Workflows for Linting, Testing, and Building',
                            'Software Bill of Materials (SBOM) and Vulnerability Auditing (npm audit, pip-audit)',
                            'Automated Container Publishing and Deployment Smoke Verification'
                        ]
                    }
                ]
            },
            {
                weekIdx: 14,
                topics: [
                    {
                        title: 'Cross-Language Performance Profiling and Memory Diagnostics',
                        subtopics: [
                            'Identifying Serialization and IPC Bottlenecks Across Polyglot Service Boundaries',
                            'Connection Pool Tuning for PostgreSQL, Redis, and Outbound HTTP Keep-Alive Agents',
                            'Benchmarking End-to-End Request Latency and Queue Drain Throughput'
                        ]
                    },
                    {
                        title: 'Security Hardening for Integrative Systems',
                        subtopics: [
                            'Preventing Server-Side Request Forgery (SSRF) in Webhook and URL Fetchers',
                            'Validating Deserialized Payloads Against Prototype Pollution and XML Bomb Attacks',
                            'Zero-Downtime Secret Rotation and Audit Trail Tamper-Evident Logging'
                        ]
                    }
                ]
            },
            {
                weekIdx: 15,
                topics: [
                    {
                        title: 'Integrative System Documentation and Developer Portal Packaging',
                        subtopics: [
                            'Publishing Interactive OpenAPI / GraphQL Playground Portals and Webhook Guides',
                            'Documenting Architecture Topology, Data Flow Diagrams, and Failure Recovery Runbooks',
                            'Reproducible One-Command Local Bootstrap (`docker compose up`) Verification'
                        ]
                    },
                    {
                        title: 'Capstone Polyglot Integrative Application Defense',
                        subtopics: [
                            'Live Demonstration of Multi-Language Service Interoperability and Cloud SDK Workflows',
                            'Walkthrough of Webhook Signature Security, Async Queue Processing, and Reverse Proxy Routing',
                            'Technical Q&A Defense on Polyglot Trade-Offs, Schema Validation, and Fault Resilience'
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
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'UNC & SCIS VMO Documentary Reading', desc: 'Read the UNC Student Handbook and SCIS VMO materials to understand how integrative software engineering supports institutional outcomes.' },
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'Polyglot Tech Stack Industry Survey', desc: 'Examine engineering blog posts from Netflix, Stripe, and Discord detailing how they combine Python, Node.js, Rust, and Go.' },
                    { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation & Syllabus Walkthrough', desc: 'Instructor briefing on course outcomes, weekly coding labs, grading distribution, and ethical open-source/AI usage policies.' },
                    { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'Multi-Runtime Environment Setup Workshop', desc: 'Hands-on lab configuring Node.js, Python virtual environments, Docker, and Git for polyglot integrative development.' },
                    { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO & Polyglot Engineer Commitment Statement', desc: 'Draft a reflective commitment statement connecting UNC core values to software interoperability and engineering quality.' },
                    { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Language Ecosystem Trade-Off Matrix', desc: 'Complete an analytical matrix comparing Python, TypeScript/Node.js, Java, and C# across concurrency, typing, and library ecosystems.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'VMO & Syllabus Policy Verification', desc: 'Formative check confirming student understanding of course expectations and academic integrity rules.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Polyglot Toolchain Environment Check', desc: 'In-class verification of working Node.js, Python, and Docker CLI setups.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'VMO Alignment Reflection Rubric', desc: 'Formative evaluation of the student VMO reflection submission.' }
                ]
            },
            // ---------------- WEEK 2 (CO1 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 1, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Scott Programming Language Pragmatics Study', desc: 'Read chapters on compilation, bytecode interpretation, ABI calling conventions, and Foreign Function Interfaces.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Shared Library & WebAssembly Sandbox Prep', desc: 'Compile a simple C mathematical function into both a shared library and a WebAssembly `.wasm` module.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Runtime Interoperability, FFI & Wasm Lecture', desc: 'Detailed lecture on bridging managed runtimes via ctypes/N-API, subprocess standard streams, and WebAssembly WASI.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Python-to-C FFI & Node.js Wasm Binding Lab', desc: 'Laboratory practicum invoking native C functions from Python via `ctypes` and executing a `.wasm` module inside Node.js.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Cross-Language Benchmark Script', desc: 'Benchmark execution time and memory overhead comparing pure Python, C-extension FFI, and Node.js Wasm calls.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Memory Safety Across FFI Boundaries Brief', desc: 'Document pointer ownership, buffer overflow risks, and marshaling costs when crossing FFI boundaries.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 0, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Prelim quiz covering runtime execution models, FFI bindings, IPC mechanisms, and serialization standards.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'FFI & Wasm Binding Execution Check', desc: 'Practical lab check verifying error-free native function invocation and type marshaling.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Marshaling Overhead Analysis Rubric', desc: 'Formative evaluation of the cross-runtime benchmark report.' }
                ]
            },
            // ---------------- WEEK 3 (CO1 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 2, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'W3C XSD, JSON Schema & Protobuf Specification Study', desc: 'Study XML Schema (XSD), JSON Schema Draft 2020-12, YAML anchors, and Protocol Buffers wire encoding.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Sample Healthcare HL7/XML & JSON Dataset Inspection', desc: 'Inspect sample heterogeneous XML and JSON clinical records requiring strict validation and canonical conversion.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Polyglot Data Serialization, XPath/XSLT & Schema Validation Seminar', desc: 'Live coding demonstration of XSD validation, XPath querying, XSLT transformation, JSON Schema enforcement, and Protobuf compilation.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Polyglot Data Serialization & Transformation Practicum', desc: 'Supervised laboratory building a bidirectional XML/XSD, JSON Schema, and Protobuf validation and conversion utility.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Automated Schema Fuzzing & Malformed Payload Test Suite', desc: 'Write automated unit tests feeding malformed XML/JSON/YAML payloads to verify strict schema rejection.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Textual vs. Binary Serialization Trade-Off Log', desc: 'Compare payload byte size, human readability, and schema evolution support across XML, JSON, and Protobuf.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 1, weight: '30', name: 'Polyglot Data Serialization Practicum', desc: 'Summative Prelim laboratory practicum grading XML/XSD, XPath/XSLT, JSON Schema, and Protocol Buffers transformation accuracy.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'XSD & JSON Schema Rule Spot-Check', desc: 'In-class diagnostic checking regex patterns, required fields, and numeric bounds in schemas.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Safe Deserialization & Fuzz Test Check', desc: 'Formative verification of YAML safe_load usage and malformed input handling.' }
                ]
            },
            // ---------------- WEEK 4 (CO1 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 3, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Unix Domain Sockets, TCP Framing & Pydantic/Zod Study', desc: 'Read documentation on OS inter-process communication, length-prefixed TCP socket framing, Pydantic, and Zod.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Cross-Runtime IPC Architecture Design', desc: 'Design the message framing protocol for a local IPC bridge connecting a Node.js ingestion service to a Python analytics engine.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'IPC Sockets, Streaming Parsers & Encoding Normalization Lecture', desc: 'Instruction on TCP/Unix domain sockets, handling partial socket reads, UTF-8 normalization, and streaming NDJSON.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Cross-Runtime Interoperability Utility Studio & Demo', desc: 'Studio session building and demonstrating the Prelim Cross-Runtime Interoperability Utility bridging Node.js and Python over sockets.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Finalized Prelim Interoperability Utility Repository', desc: 'Package the complete cross-runtime socket bridge with Pydantic/Zod schema validation and error recovery.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Backpressure & Stream Buffering Reflection', desc: 'Analyze how stream highWaterMark and socket backpressure prevent out-of-memory crashes during bulk transfers.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 2, weight: '50', name: 'Cross-Runtime Interoperability Utility', desc: 'Major Prelim project evaluating a functional cross-language IPC and schema transformation bridge between Node.js and Python.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Socket Framing & Partial Read Check', desc: 'In-class check verifying that split or concatenated TCP packets are framed accurately.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Pydantic & Zod Contract Parity Audit', desc: 'Formative check of type validation consistency across both language runtimes.' }
                ]
            },

            // ---------------- WEEK 5 (CO2 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 4, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'SOAP/WSDL Specification & Adapter Pattern Study', desc: 'Study WSDL 1.1/2.0 service descriptors, SOAP envelopes/faults, and the Gang of Four Adapter pattern.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Legacy SOAP Server Container Bootstrap', desc: 'Launch a mock legacy enterprise SOAP billing service in Docker and inspect its WSDL contract in SoapUI/Postman.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Enterprise SOAP Web Services & Legacy Modernization Lecture', desc: 'Lecture on SOAP bindings, WS-Security headers, XXE injection defenses, and wrapping legacy SOAP endpoints behind REST facades.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'SOAP-to-REST Protocol Adapter Laboratory', desc: 'Hands-on laboratory building a modern REST/JSON adapter microservice that consumes a legacy SOAP/WSDL backend using Zeep/strong-soap.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'SOAP Fault to RFC 7807 Error Translator', desc: 'Extend the protocol adapter to map XML `<soap:Fault>` codes into structured RFC 7807 JSON Problem Details.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'XXE Vulnerability & XML Parser Hardening Note', desc: 'Document parser flags required to disable external DTDs and entity expansion in Python and Node.js.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 3, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Midterm quiz covering SOAP/WSDL, REST HTTP semantics, GraphQL execution, and WebSocket/SSE protocols.' },
                    { tlaIdx: 3, iloIdx: 4, weight: '30', name: 'SOAP-to-REST Protocol Adapter Lab', desc: 'Summative Midterm laboratory assessment grading the legacy SOAP/WSDL to REST/JSON protocol adapter and fault translation.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'XXE Hardening & Timeout Config Check', desc: 'Formative check of secure XML parsing and upstream socket timeout guards.' }
                ]
            },
            // ---------------- WEEK 6 (CO2) ----------------
            {
                weekIdx: 5, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Arnaud Lauret Design of Web APIs Reading', desc: 'Read chapters on HTTP client resilience, content negotiation, ETags, conditional requests, and rate-limit headers.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'HTTP Interceptor & Retry Wrapper Skeleton', desc: 'Set up an Axios/HTTPX client instance with request/response interceptor hooks.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Resilient HTTP Client Engineering & Middleware Chains Seminar', desc: 'Walkthrough of HTTP/2 connection pooling, `Retry-After` backoff, `Idempotency-Key` headers, CORS preflight, and multipart streaming.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Fault-Tolerant Polyglot HTTP Client Lab', desc: 'Laboratory exercise implementing an HTTP integration client with automatic 429/503 retries, correlation ID injection, and ETag caching.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Multipart Stream Relay Implementation', desc: 'Build a zero-buffering proxy endpoint that streams multipart file uploads directly from a web client to an upstream storage service.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'CORS Preflight & Credentialed Request Audit', desc: 'Troubleshoot and document common `Access-Control-Allow-Origin` and cookie credential misconfigurations.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'HTTP Client Retry & ETag Lab Rubric', desc: 'Formative laboratory evaluation of exponential backoff, `If-None-Match` caching, and correlation header propagation.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'HTTP Idempotency & Status Code Check', desc: 'In-class diagnostic on HTTP method idempotency and semantic status codes.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Multipart Stream Memory Footprint Check', desc: 'Verification of constant heap usage during large file proxy transfers.' }
                ]
            },
            // ---------------- WEEK 7 (CO2) ----------------
            {
                weekIdx: 6, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'GraphQL Schema Stitching & WebSocket RFC 6455 Study', desc: 'Study GraphQL SDL, resolver chains, DataLoader batching, WebSockets, and Server-Sent Events (SSE).' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Apollo / Strawberry GraphQL Sandbox Setup', desc: 'Initialize a GraphQL server project and define types unifying User (REST) and Billing (SOAP) entities.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'GraphQL Polyglot Resolvers & Real-Time Event Streams Lecture', desc: 'Instruction on stitching heterogeneous backends in GraphQL resolvers, solving N+1 queries, and broadcasting live updates via WebSockets/SSE.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'GraphQL Unified Resolver & WebSocket Live Feed Lab', desc: 'Hands-on laboratory writing GraphQL resolvers that aggregate REST and SOAP services alongside a Redis-backed WebSocket notification channel.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'DataLoader Batching & Query Depth Guard Implementation', desc: 'Add DataLoader request batching and a maximum query depth limiter to protect upstream services from nested query abuse.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'WebSockets vs. SSE vs. Long Polling Comparison', desc: 'Evaluate protocol overhead, firewall traversal, and reconnection semantics across real-time transport options.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'GraphQL Stitching & WebSocket Lab Check', desc: 'Formative lab check verifying cross-source GraphQL resolution and real-time WebSocket message delivery.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'N+1 Resolver Query Analysis Check', desc: 'In-class trace check confirming DataLoader collapses redundant upstream HTTP calls.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'GraphQL Depth Limit Security Check', desc: 'Verification that deeply nested cyclical GraphQL queries are rejected.' }
                ]
            },
            // ---------------- WEEK 8 (CO2 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 7, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Polyglot BFF Patterns & OpenAPI SDK Generation Study', desc: 'Read documentation on Backends for Frontends (BFF), `openapi-generator`, and partial failure handling.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Midterm Polyglot Gateway Integration Prep', desc: 'Generate type-safe TypeScript and Python client SDKs from OpenAPI specs and wire them into the BFF project.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'BFF Aggregation, Partial Degradation & SDK Automation Seminar', desc: 'Live demonstration of parallel upstream fan-out, Redis fallback caching, and automated OpenAPI SDK generation.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Midterm Polyglot API Gateway Project Demonstration', desc: 'Formal Midterm demonstration of a unified polyglot BFF gateway integrating REST, SOAP, and GraphQL services with graceful degradation.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'WireMock Upstream Fault Simulation Suite', desc: 'Add WireMock/MSW integration tests verifying that the BFF returns cached partial responses when one upstream service times out.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Midterm Integration Architecture Retrospective', desc: 'Document lessons learned regarding contract synchronization and error normalization across polyglot services.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 5, weight: '50', name: 'Midterm Polyglot API Gateway Project', desc: 'Major Midterm project assessment evaluating the unified polyglot BFF gateway aggregating REST, SOAP, and GraphQL sources.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Generated SDK Type-Safety Check', desc: 'In-class verification of auto-generated OpenAPI client stubs.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Partial Failure Fallback Verification', desc: 'Formative check confirming graceful BFF degradation when an upstream service is offline.' }
                ]
            },

            // ---------------- WEEK 9 (CO3 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 8, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Richer & Sanso OAuth 2 in Action Study', desc: 'Read chapters on OAuth 2.0 Authorization Code Flow with PKCE, Client Credentials, JWT validation, and HMAC request signing.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'OAuth2 Developer App & Vault Secret Setup', desc: 'Register OAuth2 sandbox credentials (GitHub/Google) and configure `.env.vault` / Doppler secret injection.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'OAuth 2.0/OIDC Flows & Cryptographic HMAC Signing Lecture', desc: 'In-depth lecture on PKCE state parameters, token refresh rotation, machine-to-machine Client Credentials, and HMAC-SHA256 nonces.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'OAuth2 PKCE Client & HMAC Request Signing Lab', desc: 'Hands-on laboratory implementing an OAuth2/OIDC login and token-refresh workflow alongside HMAC-SHA256 signed service-to-service calls.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Replay Attack & Token Leakage Audit Script', desc: 'Write automated security tests verifying that expired timestamp nonces and tampered HMAC signatures are rejected with HTTP 401.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'OAuth2 Grant Type Selection Matrix', desc: 'Justify which OAuth 2.0 grant flow applies to SPAs, mobile apps, server-side web apps, and headless cron daemons.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 6, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Semifinal quiz covering OAuth2/OIDC grants, HMAC webhook verification, cloud SDKs, and asynchronous task queues.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'OAuth2 PKCE & Refresh Token Lab Check', desc: 'Practical check of state parameter CSRF protection and token rotation.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'HMAC Replay Prevention Verification', desc: 'Formative check of constant-time signature comparison (`crypto.timingSafeEqual`).' }
                ]
            },
            // ---------------- WEEK 10 (CO3 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 9, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Stripe/GitHub Webhook Security & AWS S3 SDK Study', desc: 'Study webhook signature verification, idempotent event processing, and AWS S3 / MinIO presigned URL workflows.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'MinIO Object Storage & Webhook CLI Listener Setup', desc: 'Start a local MinIO S3 container and configure Stripe/GitHub webhook CLI forwarding to localhost.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Webhook Engineering & Cloud SDK Integration Seminar', desc: 'Live walkthrough of raw-body HMAC webhook verification, fast-200 acknowledgment, S3 presigned URLs, and transactional email SDKs.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Third-Party SDK & Webhook Integration Practicum', desc: 'Supervised laboratory building a verified webhook receiver and integrating S3 object storage and transactional notification SDKs.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Idempotent Webhook Event Ledger Implementation', desc: 'Implement a database event-ID deduplication ledger ensuring retried webhooks are processed exactly once.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Presigned URL Security & Expiration Policy Brief', desc: 'Analyze how short-lived S3 presigned URLs offload bandwidth from application servers while maintaining access control.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 7, weight: '30', name: 'Third-Party SDK & Webhook Integration Lab', desc: 'Summative Semifinal laboratory assessment grading HMAC webhook verification, idempotent processing, and S3/notification SDK integration.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Raw-Body Webhook Signature Spot-Check', desc: 'In-class check ensuring JSON middleware does not mutate raw bytes prior to HMAC computation.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Webhook Idempotency Ledger Audit', desc: 'Formative check verifying duplicate webhook deliveries return 200 OK without re-executing side effects.' }
                ]
            },
            // ---------------- WEEK 11 (CO3) ----------------
            {
                weekIdx: 10, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Celery, BullMQ & Redis Streams Documentation Study', desc: 'Read documentation on distributed task queues, Redis Streams consumer groups, and RabbitMQ polyglot worker patterns.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Redis & RabbitMQ Multi-Worker Sandbox Setup', desc: 'Launch Redis and RabbitMQ containers and configure a Node.js API producer and Python worker environment.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Polyglot Asynchronous Task Queues & Worker Topologies Lecture', desc: 'Instruction on decoupling slow third-party integrations via BullMQ/Celery, cross-language JSON job payloads, and Dead-Letter Queues.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Node.js-to-Python Asynchronous Queue Connector Lab', desc: 'Hands-on laboratory where a Node.js web service dispatches document-processing jobs via RabbitMQ/Redis to a pool of Python workers.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Exponential Backoff & Dead-Letter Worker Recovery', desc: 'Configure automatic task retries with exponential jitter and a dead-letter inspection endpoint for permanently failed jobs.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Task Visibility Timeout & Ack Semantics Analysis', desc: 'Explain how visibility timeouts and explicit ACKs recover jobs when a worker process crashes mid-execution.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Cross-Language Queue Dispatch Rubric', desc: 'Formative laboratory check verifying clean job serialization between Node.js producers and Python workers.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Worker Prefetch & Concurrency Check', desc: 'In-class check of worker concurrency tuning and rate-limit compliance.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'DLQ & Crash Recovery Verification', desc: 'Verification that killed worker tasks are re-queued and processed without data loss.' }
                ]
            },
            // ---------------- WEEK 12 (CO3 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 11, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Workflow Automation (n8n/Camel) & Outbox Resilience Study', desc: 'Study EAI workflow automation connectors, circuit breakers for external SaaS APIs, and distributed correlation logging.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Semifinal Asynchronous Polyglot Pipeline Assembly', desc: 'Integrate OAuth2 auth, webhook ingestion, S3 storage, and polyglot RabbitMQ/Redis workers into a cohesive pipeline.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'EAI Middleware Connectors & SaaS Outage Resilience Seminar', desc: 'Demonstration of low-code EAI orchestration, secondary provider failover (e.g., SendGrid to SES), and correlation ID tracing.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Semifinal Asynchronous Polyglot Worker Pipeline Defense', desc: 'Formal Semifinal demonstration and defense of the asynchronous polyglot integration pipeline under simulated third-party API outages.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Provider Failover & Queue Drain Optimization', desc: 'Refine circuit-breaker thresholds and worker batching based on Semifinal stress-test feedback.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'End-to-End Webhook-to-Worker Traceability Log', desc: 'Document how correlation IDs link incoming third-party webhooks to asynchronous background worker logs.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 8, weight: '50', name: 'Asynchronous Polyglot Worker Pipeline', desc: 'Major Semifinal project evaluating the end-to-end webhook, cloud SDK, and polyglot background worker integration pipeline.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Secondary SaaS Provider Failover Check', desc: 'In-class verification of automatic failover when the primary external API returns 5xx errors.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Cross-Queue Correlation Logging Audit', desc: 'Formative check of unified structured JSON logs across Node.js and Python processes.' }
                ]
            },

            // ---------------- WEEK 13 (CO4 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 12, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Nigel Poulton Docker Deep Dive & NGINX Proxy Study', desc: 'Read chapters on multi-stage Docker builds, custom bridge networks, and NGINX reverse proxy routing and TLS termination.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Polyglot Service Dockerfiles & NGINX Config Draft', desc: 'Write multi-stage Dockerfiles for the Node.js BFF and Python worker services along with an `nginx.conf` gateway file.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Polyglot Container Orchestration & NGINX API Gateway Lecture', desc: 'Lecture on Docker Compose internal DNS, healthcheck dependency ordering, NGINX path-based routing, WebSocket proxying, and rate limiting.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Multi-Container Reverse Proxy & CI Laboratory', desc: 'Supervised laboratory orchestrating the polyglot application stack behind an NGINX TLS reverse proxy with Docker Compose healthchecks.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Zero-Privilege Container & Network Isolation Hardening', desc: 'Configure read-only root filesystems, non-root UIDs, and internal-only backend Docker networks so databases/workers are unexposed.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Reverse Proxy vs. Application-Level Routing Brief', desc: 'Compare offloading TLS, compression, and rate limiting at the NGINX edge versus inside application code.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 9, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Final quiz covering polyglot Docker networking, NGINX reverse proxy routing, integration test harnesses, and SSRF security.' },
                    { tlaIdx: 3, iloIdx: 10, weight: '30', name: 'Multi-Container Reverse Proxy & CI Lab', desc: 'Summative Final laboratory assessment grading multi-container Docker Compose orchestration, NGINX reverse proxy routing, and CI automation.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Backend Network Isolation Security Check', desc: 'Formative check confirming only the NGINX gateway port is exposed to the host.' }
                ]
            },
            // ---------------- WEEK 14 (CO4) ----------------
            {
                weekIdx: 13, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Testcontainers, VCR/Nock & GitHub Actions Matrix Study', desc: 'Study deterministic third-party HTTP mocking (VCR.py/Nock), Testcontainers, and multi-language CI/CD pipelines.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'GitHub Actions Polyglot Workflow File Authoring', desc: 'Draft a `.github/workflows/ci.yml` pipeline running both `pytest` and `vitest/jest` plus `npm audit` and `pip-audit`.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'End-to-End Polyglot Integration Testing & CI/CD Seminar', desc: 'Walkthrough of spinning up ephemeral Redis/Postgres/LocalStack containers in CI and replaying recorded external API cassettes.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Automated Cross-Runtime Integration Test Suite Lab', desc: 'Hands-on laboratory writing end-to-end integration tests that verify the full request lifecycle from NGINX through Node.js to Python workers.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'SBOM Generation & Dependency Vulnerability Remediation', desc: 'Generate a CycloneDX Software Bill of Materials (SBOM) and resolve any flagged CVEs across `package-lock.json` and `requirements.txt`.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Live Sandbox vs. Recorded Fixture Testing Trade-Offs', desc: 'Analyze how combining Nock/VCR fixtures with nightly contract smoke tests balances CI speed and third-party drift detection.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Cross-Runtime E2E Test Suite Rubric', desc: 'Formative laboratory evaluation of end-to-end test coverage across HTTP, queue, and database boundaries.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'GitHub Actions Matrix Pipeline Check', desc: 'In-class verification of green CI builds across both Python and Node.js jobs.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'SBOM & Dependency Audit Pass', desc: 'Verification of zero high/critical unpatched vulnerabilities in polyglot dependencies.' }
                ]
            },
            // ---------------- WEEK 15 (CO4) ----------------
            {
                weekIdx: 14, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'OWASP SSRF Prevention & Connection Pool Tuning Study', desc: 'Study Server-Side Request Forgery (SSRF) defenses for webhook/URL fetchers, prototype pollution, and connection pool sizing.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'SSRF & Malicious Payload Penetration Test Script', desc: 'Prepare security test payloads targeting private IP ranges (`127.0.0.1`, `169.254.169.254`) and prototype pollution vectors.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Polyglot Performance Profiling & Integrative Security Lecture', desc: 'Lecture on outbound HTTP/DB connection pool exhaustion, SSRF DNS-rebinding defenses, and developer portal documentation.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Security Hardening & Connection Pool Tuning Lab', desc: 'Hands-on laboratory implementing SSRF IP-allowlist/denylist validators, tuning HTTP keep-alive pools, and finalizing the API Developer Portal.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'One-Command Reproducible Bootstrap & Portal Freeze', desc: 'Verify that a fresh clone starts all polyglot services, migrations, and interactive OpenAPI/GraphQL docs via a single `docker compose up`.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Cloud Metadata SSRF Case Study Review', desc: 'Review real-world cloud breaches caused by unvalidated webhook/URL fetching and verify team mitigations.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'SSRF Defense & Pool Tuning Lab Check', desc: 'Formative check verifying rejection of internal/metadata IP targets and optimal keep-alive socket reuse.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Prototype Pollution & Deserialization Check', desc: 'In-class verification of strict schema stripping for unexpected payload keys.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Developer Portal & Bootstrap Readiness Audit', desc: 'Formative check of interactive API documentation and clean container startup.' }
                ]
            },
            // ---------------- WEEK 16 (CO4 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 15, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Capstone Integrative Architecture Deck & Demo Prep', desc: 'Prepare the final defense presentation detailing polyglot runtime bridges, protocol adapters, webhook security, and container topology.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Final End-to-End Integration Smoke Test Run', desc: 'Execute the complete automated test suite and verify live webhook, S3, and queue worker pipelines prior to defense.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Integrative Systems Engineering Standards Briefing', desc: 'Instructor briefing on capstone evaluation rubrics, live fault-recovery demonstrations, and technical Q&A expectations.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Capstone Integrative Application Defense & Live Demo', desc: 'Formal Final oral defense and live demonstration of the containerized polyglot application integrating heterogeneous services and cloud SDKs.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Final Archival Polyglot Repository & Release Tag', desc: 'Submit the tagged final repository containing all polyglot source code, Docker Compose manifests, OpenAPI/Protobuf schemas, and test suites.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Integrative Programming Course Reflection', desc: 'Complete a comprehensive post-course reflection evaluating competency mastery across CO1-CO4.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 11, weight: '50', name: 'Capstone Integrative Application Defense', desc: 'Major Final capstone defense evaluating the complete, containerized polyglot application and third-party integration ecosystem.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Architecture & Schema Documentation Check', desc: 'Verification of complete OpenAPI, GraphQL, Protobuf, and webhook security documentation.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Final Repository Reproducibility Sign-Off', desc: 'Final verification of clean build, test pass, and archival completeness.' }
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

        console.log("Successfully seeded 'Integrative Programming and Technologies' (BIT312L) with full 16-week structure (DRAFT status).");
    },

    async down(queryInterface, Sequelize) {
        console.warn("Use npx sequelize-cli db:seed:undo:all to reset the composition database cleanly.");
    }
};
