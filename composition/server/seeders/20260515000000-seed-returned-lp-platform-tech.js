'use strict';

/**
 * Seeder: Single Course Learning Plan - "Platform Technologies"
 * Status Target: RETURNED (By Industry Consultant)
 * New Schema: Uses AssignmentWorkflowLogs and isolated CommentTargets
 * * Run: npx sequelize-cli db:seed --seed 20260515000000-seed-returned-lp-platform-tech.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1. COURSE CREATION
        // ============================================================================
        await queryInterface.bulkInsert('Courses', [{
            course_no: 'BIT311L',
            course_title: 'Platform Technologies',
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
            `SELECT course_id FROM Courses WHERE course_no = 'BIT311L' ORDER BY course_id DESC LIMIT 1;`,
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
            course_description: 'Explores the foundational platforms, hardware abstraction engines, and infrastructure-as-code orchestration frameworks that power modern distributed applications. Students engage with bare-metal hypervisors, containerized workload management using Docker and Kubernetes, cloud-native deployment paradigms across major IaaS providers, and robust network virtualization configurations.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: null,
            date_assigned: new Date('2026-06-01'),
            date_submitted: new Date('2026-06-10'),
            date_updated: null,
            createdAt: now,
            updatedAt: now
        }], {});

        const assignment = await queryInterface.sequelize.query(
            `SELECT co_assign_id FROM CourseOfferingAssignments WHERE pc_offering_id = ${offeringId} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const assignId = assignment[0].co_assign_id;

        // ============================================================================
        // 3.5 ASSIGNMENT WORKFLOW LOGS (NEW ARCHITECTURE)
        // Simulate Assigned -> Submitted -> Returned by Industry Consultant
        // ============================================================================
        await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', createdAt: new Date('2026-06-01 09:00:00'), updatedAt: new Date('2026-06-01 09:00:00') },
            { co_assign_id: assignId, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2026-06-10 14:30:00'), updatedAt: new Date('2026-06-10 14:30:00') },
            { co_assign_id: assignId, actor_role: 'INDUSTRY_CONSULTANT', action_type: 'RETURNED', createdAt: new Date('2026-06-15 10:15:00'), updatedAt: new Date('2026-06-15 10:15:00') }
        ], {});

        // ============================================================================
        // 4. COURSE OUTCOMES (4 records)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Evaluate foundational hardware abstractions, kernel architectures, and operating system scheduling mechanisms that enable platform computing.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Architect and provision robust virtualization layers utilizing enterprise-grade bare-metal hypervisors and virtual network switches.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Orchestrate scalable microservice ecosystems utilizing modern container runtimes, registry management, and Kubernetes clusters.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Automate cloud infrastructure provisioning, state management, and configuration pipelines utilizing Infrastructure as Code (IaC) principles.', createdAt: now, updatedAt: now }
        ], {});

        const cos = await queryInterface.sequelize.query(
            `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ${offeringId} ORDER BY co_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 4.5. PROGRAM OUTCOME ALIGNMENTS
        // ============================================================================
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            { co_id: cos[0].co_id, po_id: 2, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 8, attainment_level: 'E', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 5. INTENDED LEARNING OUTCOMES (12 records, 3 per CO)
        // ============================================================================
        const iloData = [
            // CO1 (Prelim Period)
            { co_id: cos[0].co_id, description: 'Analyze the evolutionary transition from monolithic hardware-bound operating systems to modular, API-driven core kernels.' },
            { co_id: cos[0].co_id, description: 'Distinguish the structural differences between Windows Server environments and POSIX-compliant Linux distributions.' },
            { co_id: cos[0].co_id, description: 'Evaluate standard storage protocols (SAN, NAS, block, object) to determine optimal data tiering configurations.' },
            // CO2 (Midterm Period)
            { co_id: cos[1].co_id, description: 'Deploy and initialize Type-1 (Bare Metal) hypervisors such as VMware ESXi and Microsoft Hyper-V into server hardware.' },
            { co_id: cos[1].co_id, description: 'Configure virtual network adapters, bridged connections, and NAT firewalls to securely route inter-VM traffic.' },
            { co_id: cos[1].co_id, description: 'Execute virtual machine migration pipelines and high-availability clustered failover routines.' },
            // CO3 (Semi-Final Period)
            { co_id: cos[2].co_id, description: 'Construct optimized Dockerfiles employing multi-stage builds to dramatically reduce container image footprints.' },
            { co_id: cos[2].co_id, description: 'Orchestrate multi-container applications and local development networks utilizing Docker Compose YAML configurations.' },
            { co_id: cos[2].co_id, description: 'Deploy, scale, and manage containerized workloads across clustered nodes utilizing Kubernetes (K8s) deployment manifests.' },
            // CO4 (Final Period)
            { co_id: cos[3].co_id, description: 'Compare Infrastructure as a Service (IaaS), Platform as a Service (PaaS), and Serverless cloud consumption models.' },
            { co_id: cos[3].co_id, description: 'Write declarative configuration files using HashiCorp Configuration Language (HCL) to provision Terraform modules.' },
            { co_id: cos[3].co_id, description: 'Automate post-provisioning server state configurations using Ansible playbooks and YAML-based execution logic.' }
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
            'Foundations of Platform Architecture', 'Kernel Space vs User Space Operations', 'Process Scheduling and Resource Allocation',
            'Windows Server Administration Protocols', 'Linux System Administration and Bash Scripting', 'Identity Management (Active Directory / LDAP)',
            'Direct Attached Storage vs Network Attached Storage', 'Storage Area Networks (SAN) & iSCSI', 'RAID Configurations and Redundancy',
            'Hardware Abstraction Layers', 'Type-1 vs Type-2 Hypervisors', 'VMware ESXi Enterprise Installation',
            'Hyper-V Architecture and Feature Sets', 'Virtual CPU (vCPU) and Memory Ballooning', 'Software-Defined Networking (SDN) Fundamentals',
            'Virtual LANs (VLAN) and Trunking', 'Virtual Switches (vSwitch) and Routing', 'High Availability (HA) Clustering in VMs',
            'Live Migration Strategies (vMotion)', 'Disaster Recovery and Snapshot Management', 'Introduction to Linux Namespaces and Cgroups',
            'Docker Engine Architecture', 'Dockerfile Optimization and Layer Caching', 'Docker Compose and Service Orchestration',
            'Kubernetes (K8s) Control Plane Architecture', 'Kubernetes Pods, Deployments, and Services', 'K8s Ingress Controllers and Load Balancing',
            'Cloud Computing Service Models (IaaS, PaaS, SaaS)', 'Public Cloud Core Infrastructure (AWS, Azure, GCP)', 'Identity and Access Management (IAM) in the Cloud',
            'Infrastructure as Code (IaC) Methodologies', 'Terraform State Management and Modules', 'Immutable Infrastructure Principles',
            'Configuration Management with Ansible', 'CI/CD Pipelines for Infrastructure Automation',
            'Course Orientation and VMO Alignment'
        ];

        await queryInterface.bulkInsert('Topics', topicTitles.map(t => ({ title: t, createdAt: now, updatedAt: now })), {});
        const topics = await queryInterface.sequelize.query(
            `SELECT topic_id, title FROM Topics ORDER BY topic_id DESC LIMIT 36;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const subtopicsToInsert = [];
        topics.forEach(t => {
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Theoretical Principles of ${t.title}`, sequence_order: 1, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Practical Deployment & CLI Execution`, sequence_order: 2, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Security and Resource Optimization`, sequence_order: 3, createdAt: now, updatedAt: now });
        });
        await queryInterface.bulkInsert('Subtopics', subtopicsToInsert, {});

        // ============================================================================
        // 7. REFERENCES (35 records)
        // ============================================================================
        const referencesData = [];
        for (let i = 0; i < 36; i++) {
            referencesData.push({
                title: `Platform Technologies Handbook: Vol ${i+1}`,
                author: `Tech Author ${i+1}`,
                isbn: i % 2 === 0 ? `978-0134${i}94166` : null,
                link: i % 2 !== 0 ? `https://platform-docs.com/vol${i}` : null,
                publication_year: new Date(`202${(i%5)+1}-01-01`),
                type: i % 3 === 0 ? 'TEXTBOOK' : i % 3 === 1 ? 'ONLINE' : 'OER',
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('References', referencesData, {});

        const references = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT 36;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 8. TLAs (35 records)
        // ============================================================================
        const tlaTitles = [
            'Kernel Module Inspection Lab', 'Bash Shell Scripting Challenge', 'Active Directory Forest Setup',
            'iSCSI Target Mapping Exercise', 'RAID Rebuild Simulation', 'ESXi Bare Metal Installation Lab',
            'Hyper-V Nested Virtualization Sandbox', 'vCPU Overcommitment Analysis', 'VLAN Tagging and Trunk Port Drill',
            'vSwitch Distributed Routing Configuration', 'vMotion Live Migration Stress Test', 'VM Snapshot Tree Recovery Scenario',
            'Docker Image Build Sprint', 'Multi-Stage Dockerfile Refactoring', 'Docker Compose Microservices Launch',
            'Minikube Cluster Initialization Lab', 'K8s Deployment Manifest Writing', 'Ingress Controller Load Test',
            'AWS VPC Architecture Blueprinting', 'IAM Role Policy Simulation', 'Terraform AWS Provider Initialization',
            'Terraform State Collision Resolution', 'Ansible Inventory Playbook Execution', 'Jenkins Pipeline for IaC Build',
            'Prometheus Metrics Dashboarding Lab', 'Linux Privilege Escalation Audit', 'Windows Server Role Configuration',
            'Object Storage S3 Integration Code', 'K8s Secrets Management Lab', 'Docker Swarm vs K8s Debate',
            'PaaS Heroku App Deployment', 'Serverless AWS Lambda Coding', 'Network Latency Troubleshooting Lab',
            'Terraform Module Reuse Workshop', 'Comprehensive Cloud Infrastructure Build',
            'Course Orientation Lecture'
        ];

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlaTitles.map((t, idx) => ({
            tla_name: t, description: `Comprehensive practical lab focusing on enterprise execution related to ${t}.`,
            performed_by: idx % 2 === 0 ? 'S' : 'I', class_phase: ['pre', 'in', 'post'][idx % 3], is_lab: '1', createdAt: now, updatedAt: now
        })), {});

        const tlas = await queryInterface.sequelize.query(
            `SELECT tla_id FROM TeachingAndLearningActivities ORDER BY tla_id DESC LIMIT 36;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 9. JUNCTION MAPPINGS (ILOTopics, ILOReferences)
        // Assign exactly 2 Topics, 2 References, 2 TLAs per ILO (Total 24 used)
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
        
        // Orientation Map
        const oIlo = ilos.find(i => i.is_orientation) || ilos[12];
        if (oIlo) {
            iloTopicInserts.push({ ilo_id: oIlo.ilo_id, topic_id: topics[35].topic_id, createdAt: now, updatedAt: now });
            iloReferenceInserts.push({ ilo_id: oIlo.ilo_id, reference_id: references[35].reference_id, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ILOTopics', iloTopicInserts, {});
        await queryInterface.bulkInsert('ILOReferences', iloReferenceInserts, {});


        const iloTopics = await queryInterface.sequelize.query(
            `SELECT ilo_topic_id FROM ILOTopics ORDER BY ilo_topic_id DESC LIMIT 25;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 10. TOPIC TLAs
        // ============================================================================
        const topicTlaInserts = [];
        for (let i = 0; i < 25; i++) {
            topicTlaInserts.push({
                ilo_topic_id: iloTopics[i].ilo_topic_id,
                tla_id: tlas[i].tla_id,
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('TopicTLAs', topicTlaInserts, {});

        // ============================================================================
        // 11. TLA ASSESSMENTS (20/30/50 Grading Logic)
        // ============================================================================
        const assessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];
        const weightDistribution = [10, 15, 25]; // Applied twice per ILO = 20, 30, 50
        const assessmentNames = ['Practical Server Config', 'Lab Troubleshooting', 'Network Provisioning Task', 'Architecture Presentation', 'Deployment Simulation'];

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
                    description: `Summative integration test evaluating platform technology execution metrics.`,
                    period: targetPeriod,
                    weight: targetWeightPerAssessment,
                    min_passing: 60,
                    createdAt: now,
                    updatedAt: now
                });
            });
        }
        await queryInterface.bulkInsert('TLAAssessments', assessmentInserts, {});

        // ============================================================================
        // 12. COMMENTS & COMMENT TARGETS (THE NEW WORKFLOW MECHANIC)
        // ============================================================================
        // We will insert 6 highly realistic industry-standard critiques linked explicitly
        // to specific Topics and TLAs within specific ILOs.

        const rawCommentsData = [
            // Comment 1: Target a Topic in CO2, ILO 1 (Virtualization basics)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[3].ilo_id, comment_for: 'topics', target_id: topics[6].topic_id,
                message: 'In modern enterprise environments, managing Hyper-V and ESXi from the CLI is just as critical as the GUI. Ensure this virtualization topic explicitly lists PowerShell and ESXCLI commands.'
            },
            // Comment 2: Target a TLA in CO2, ILO 2 (Virtual Networking)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[4].ilo_id, comment_for: 'tlas', target_id: tlas[8].tla_id,
                message: 'This VLAN lab is too theoretical. Students need to actively configure 802.1Q trunking on virtual switches. Please adjust the TLA description to require a working trunk port demonstration.'
            },
            // Comment 3: Target a Topic in CO3, ILO 3 (Kubernetes)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[8].ilo_id, comment_for: 'topics', target_id: topics[16].topic_id,
                message: 'You cannot teach Kubernetes effectively without covering Role-Based Access Control (RBAC). Add RBAC and Security Contexts to this topic before moving on to deployments.'
            },
            // Comment 4: Target a TLA in CO3, ILO 3 (K8s TLA)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[8].ilo_id, comment_for: 'tlas', target_id: tlas[17].tla_id,
                message: 'Instead of running Minikube locally for this assessment, consider using a free tier of a managed service like EKS or GKE. Industry practice rarely involves local clusters for production modeling.'
            },
            // Comment 5: Target a Topic in CO4, ILO 2 (Terraform)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[10].ilo_id, comment_for: 'topics', target_id: topics[20].topic_id,
                message: 'Terraform State Management is listed, but there is no mention of state locking or backend remote storage (like S3/DynamoDB). This is critical to prevent state corruption in teams.'
            },
            // Comment 6: Target a TLA in CO4, ILO 3 (Ansible)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[11].ilo_id, comment_for: 'tlas', target_id: tlas[23].tla_id,
                message: 'The Ansible playbook execution lab should require writing idempotent tasks. Update the parameters to grade students based on whether their playbooks safely handle multiple consecutive runs.'
            }
        ];

        // 12a. Insert Comments
        await queryInterface.bulkInsert('Comments', rawCommentsData.map(c => ({
            co_assign_id: c.co_assign_id,
            commenter_role: c.commenter_role,
            message: c.message,
            resolved_status: c.resolved_status,
            ilo_id: c.ilo_id,
            comment_for: c.comment_for,
            createdAt: now,
            updatedAt: now
        })), {});

        // 12b. Fetch inserted comments back to get their generated `comment_id`s
        const insertedComments = await queryInterface.sequelize.query(
            `SELECT comment_id, message FROM Comments WHERE co_assign_id = ${assignId} ORDER BY comment_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // 12c. Map them into the CommentTargets junction table
        const targetInserts = rawCommentsData.map((c, index) => {
            return {
                comment_id: insertedComments[index].comment_id, // Match array sequence
                target_id: c.target_id, // The specific Topic ID or TLA ID
                createdAt: now,
                updatedAt: now
            };
        });

        await queryInterface.bulkInsert('CommentTargets', targetInserts, {});

        console.log(`Successfully mapped 'Platform Technologies' (BIT311L) to RETURNED status with active Industry Consultant feedback loops.`);
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees across workflow tables, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};