'use strict';

/**
 * Seeder: Single Course Learning Plan - "Platform Technologies"
 * Status Target: RETURNED (By Industry Consultant)
 * Uses AssignmentWorkflowLogs, Weeks, and week_id-linked Comments & CommentTargets
 *
 * Run: npx sequelize-cli db:seed --seed 20260515000000-seed-returned-lp-platform-tech.js
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
            course_description: 'Explores modern computing platforms, operating system internals, hardware virtualization, container engines, Linux system administration, Infrastructure as Code (IaC), and multi-cloud platform engineering.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} ORDER BY pc_offering_id DESC LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: '1',
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
        // 3.5 ASSIGNMENT WORKFLOW LOGS
        // Simulate Assigned -> Submitted -> Returned by Industry Consultant
        // ============================================================================
        await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
            { co_assign_id: assignId, stakeholder_id: '2', actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', is_viewed: true, createdAt: new Date('2026-06-01 09:00:00'), updatedAt: new Date('2026-06-01 09:00:00') },
            { co_assign_id: assignId, stakeholder_id: '1', actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', is_viewed: true, createdAt: new Date('2026-06-10 14:30:00'), updatedAt: new Date('2026-06-10 14:30:00') },
            { co_assign_id: assignId, stakeholder_id: '4', actor_role: 'INDUSTRY_CONSULTANT', action_type: 'RETURNED', is_viewed: false, createdAt: new Date('2026-06-15 10:15:00'), updatedAt: new Date('2026-06-15 10:15:00') },
            { co_assign_id: assignId, stakeholder_id: '2', actor_role: 'PROGRAM_HEAD', action_type: 'RETURNED', is_viewed: false, createdAt: new Date('2026-06-16 14:20:00'), updatedAt: new Date('2026-06-16 14:20:00') },
            { co_assign_id: assignId, stakeholder_id: '3', actor_role: 'LIBRARY_DIRECTOR', action_type: 'RETURNED', is_viewed: false, createdAt: new Date('2026-06-17 11:00:00'), updatedAt: new Date('2026-06-17 11:00:00') }
        ], {});

        // ============================================================================
        // 4. COURSE OUTCOMES (4 records)
        // ============================================================================
        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Analyze processor architectures, operating system kernel subsystems, and process/memory management across enterprise platforms.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Administer Linux server platforms, storage filesystems, network stacks, and automated shell/Ansible configuration workflows.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Architect and deploy Type-1/Type-2 hypervisors, Linux namespaces/cgroups, and OCI-compliant container platforms.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Provision, monitor, and secure scalable cloud infrastructure platforms using Terraform Infrastructure as Code (IaC) and SRE observability.', createdAt: now, updatedAt: now }
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
            { co_id: cos[1].co_id, po_id: 6, attainment_level: 'E', createdAt: now, updatedAt: now },

            { co_id: cos[2].co_id, po_id: 4, attainment_level: 'D', createdAt: now, updatedAt: now },
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
            { co_id: cos[0].co_id, description: 'Compare x86_64, ARM64, and RISC-V instruction set architectures and operating system kernel protection rings.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Analyze CPU process scheduling algorithms, POSIX thread synchronization, and virtual memory paging performance.', assessment_tool: 'OS Kernel & Process Diagnostics Lab', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Benchmark and tune operating system kernel parameters, I/O schedulers, and virtual memory subsystems under workload stress.', assessment_tool: 'Platform Hardware & OS Benchmarking Report', is_orientation: false },

            // CO2 (Midterm Period)
            { co_id: cos[1].co_id, description: 'Configure Linux Logical Volume Management (LVM), ZFS/ext4/XFS filesystems, systemd daemons, and POSIX ACL permissions.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Harden Linux network interfaces, nftables/iptables packet filters, SSH key-based authentication, and SELinux/AppArmor profiles.', assessment_tool: 'Linux Server Hardening & Storage Practicum', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Automate idempotent multi-node server provisioning and configuration management using Bash scripting and Ansible playbooks.', assessment_tool: 'Automated Linux Fleet Configuration Project', is_orientation: false },

            // CO3 (Semifinal Period)
            { co_id: cos[2].co_id, description: 'Distinguish hardware-assisted virtualization (VT-x/AMD-V, KVM/QEMU) from OS-level virtualization (namespaces, cgroups v2, UnionFS).', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Provision KVM/Proxmox virtual machines and construct OCI-compliant rootless containers using Docker and Podman.', assessment_tool: 'Hypervisor & Rootless Container Engine Lab', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Deploy a highly available virtualized and containerized application cluster with software-defined networking and persistent storage.', assessment_tool: 'Hybrid Virtualization & Container Platform Defense', is_orientation: false },

            // CO4 (Final Period)
            { co_id: cos[3].co_id, description: 'Evaluate IaaS/PaaS/FaaS cloud models, VPC network segmentation, IAM least-privilege policies, and Terraform state management.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Author modular Terraform Infrastructure as Code (IaC) templates to provision VPCs, compute instances, load balancers, and Prometheus/Grafana alerts.', assessment_tool: 'Terraform Cloud Provisioning & Observability Lab', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Defend an automated, production-hardened cloud platform architecture featuring IaC reproducibility, autoscaling, and disaster recovery.', assessment_tool: 'Capstone Cloud Platform Engineering Defense', is_orientation: false }
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
            { course_id: courseId, course_no: 'BIT311L', title: 'UNC Student Handbook & SCIS VMO Guidelines', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: null, type: 'Online Resources' },
            
            // TEXTBOOKS (Title, Author, ISBN, Publication Year; no link)
            { course_id: courseId, course_no: 'BIT311L', title: 'Operating System Concepts (10th Edition)', author: 'Abraham Silberschatz, Peter B. Galvin & Greg Gagne', isbn: '978-1119320913', link: null, publication_year: new Date('2018-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT311L', title: 'Modern Operating Systems (5th Edition)', author: 'Andrew S. Tanenbaum & Herbert Bos', isbn: '978-0137618880', link: null, publication_year: new Date('2022-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT311L', title: 'Systems Performance: Enterprise and the Cloud (2nd Edition)', author: 'Brendan Gregg', isbn: '978-0136820154', link: null, publication_year: new Date('2020-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT311L', title: 'UNIX and Linux System Administration Handbook (5th Edition)', author: 'Evi Nemeth, Garth Snyder, Trent R. Hein, Ben Whaley & Dan Mackin', isbn: '978-0134277554', link: null, publication_year: new Date('2017-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT311L', title: 'The Linux Programming Interface: A Linux and UNIX System Programming Handbook', author: 'Michael Kerrisk', isbn: '978-1593272203', link: null, publication_year: new Date('2010-01-01'), type: 'Textbook' },
            { course_id: courseId, course_no: 'BIT311L', title: 'Terraform: Up and Running: Writing Infrastructure as Code (3rd Edition)', author: 'Yevgeniy Brikman', isbn: '978-1098116743', link: null, publication_year: new Date('2022-01-01'), type: 'Textbook' },
            
            // OPEN EDUCATIONAL RESOURCES (Title, Author, Link, optional ISBN & Year with values)
            { course_id: courseId, course_no: 'BIT311L', title: 'Site Reliability Engineering: How Google Runs Production Systems', author: 'Betsy Beyer, Chris Jones, Jennifer Petoff & Niall Richard Murphy', isbn: '978-1491929124', link: 'https://sre.google/sre-book/table-of-contents/', publication_year: new Date('2016-01-01'), type: 'Open Educational Resources' },
            
            // ONLINE RESOURCES
            { course_id: courseId, course_no: 'BIT311L', title: 'ARM64 vs. x86_64 Server Architecture Reference Manual', author: 'ARM & Intel Developer Documentation', isbn: null, link: 'https://developer.arm.com/documentation', publication_year: null, type: 'Online Resources' },
            
            // OPEN EDUCATIONAL RESOURCES
            { course_id: courseId, course_no: 'BIT311L', title: 'The Linux Kernel Documentation (cgroups v2, Namespaces, eBPF)', author: 'The Linux Kernel Organization', isbn: '978-1935824008', link: 'https://docs.kernel.org/', publication_year: new Date('2024-01-01'), type: 'Open Educational Resources' },
            
            // ONLINE RESOURCES
            { course_id: courseId, course_no: 'BIT311L', title: 'Red Hat Enterprise Linux 9 Security & SELinux Administration Guide', author: 'Red Hat Documentation', isbn: null, link: 'https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9', publication_year: null, type: 'Online Resources' },
            { course_id: courseId, course_no: 'BIT311L', title: 'Ansible Automation Platform & Playbook Best Practices', author: 'Red Hat Ansible Community', isbn: null, link: 'https://docs.ansible.com/', publication_year: null, type: 'Online Resources' },
            { course_id: courseId, course_no: 'BIT311L', title: 'KVM / QEMU & Proxmox VE Virtualization Administration Guide', author: 'Proxmox Server Solutions', isbn: null, link: 'https://pve.proxmox.com/pve-docs/', publication_year: null, type: 'Online Resources' },
            
            // OPEN EDUCATIONAL RESOURCES
            { course_id: courseId, course_no: 'BIT311L', title: 'Open Container Initiative (OCI) Runtime & Image Specifications', author: 'Linux Foundation OCI Project', isbn: '978-1492046530', link: 'https://opencontainers.org/', publication_year: new Date('2024-01-01'), type: 'Open Educational Resources' },
            
            // ONLINE RESOURCES
            { course_id: courseId, course_no: 'BIT311L', title: 'AWS Well-Architected Framework & Cloud Security Pillar', author: 'Amazon Web Services', isbn: null, link: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/', publication_year: null, type: 'Online Resources' },
            
            // OPEN EDUCATIONAL RESOURCES
            { course_id: courseId, course_no: 'BIT311L', title: 'Prometheus Monitoring & Grafana Loki Observability Documentation', author: 'Cloud Native Computing Foundation', isbn: '978-1492034148', link: 'https://prometheus.io/docs/introduction/overview/', publication_year: new Date('2024-01-01'), type: 'Open Educational Resources' }
        ];

        await queryInterface.bulkInsert('References', referencesData.map(r => ({ ...r, createdAt: now, updatedAt: now })), {});

        const refs = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT ${referencesData.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const weekRefPairs = [
            [0, 1],   // Week 1
            [1, 8],   // Week 2
            [1, 2],   // Week 3
            [3, 9],   // Week 4
            [4, 5],   // Week 5
            [4, 10],  // Week 6
            [4, 11],  // Week 7
            [10, 11], // Week 8
            [2, 12],  // Week 9
            [9, 13],  // Week 10
            [12, 13], // Week 11
            [3, 13],  // Week 12
            [6, 14],  // Week 13
            [6, 7],   // Week 14
            [7, 15],  // Week 15
            [14, 15]  // Week 16
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
                            'Platform Technologies Syllabus, Grading System, and Server Lab Safety Rules',
                            'Ethical System Administration, Data Privacy, and Responsible AI Usage Policies'
                        ]
                    },
                    {
                        title: 'Evolution of Computing Platforms and Hardware Abstraction',
                        is_orientation: false,
                        subtopics: [
                            'Historical Progression from Bare-Metal Mainframes to Cloud-Native Platforms',
                            'Hardware-Software Interface: Firmware (UEFI/BIOS), Bootloaders, and Device Trees',
                            'Platform Engineering Principles and Internal Developer Platforms (IDPs)'
                        ]
                    }
                ]
            },
            {
                weekIdx: 1,
                topics: [
                    {
                        title: 'Processor Architectures: x86_64, ARM64, and RISC-V',
                        subtopics: [
                            'CISC vs. RISC Instruction Set Architectures (x86_64 vs. AArch64 / Graviton / Apple Silicon)',
                            'CPU Execution Pipelines, Superscalar Dispatch, Branch Prediction, and SIMD Vector Units',
                            'Cache Coherency Protocols (MESI), L1/L2/L3 Cache Hierarchies, and NUMA Topologies'
                        ]
                    },
                    {
                        title: 'Operating System Kernel Architectures and Protection Rings',
                        subtopics: [
                            'Monolithic Kernels (Linux), Microkernels (seL4/Mach), and Hybrid Kernel Designs (Windows NT)',
                            'CPU Privilege Rings (Ring 0 Kernel Mode vs. Ring 3 User Mode) and Context Switching',
                            'System Call Interfaces (POSIX API, glibc wrappers, syscall instructions) and Interrupt Handling'
                        ]
                    }
                ]
            },
            {
                weekIdx: 2,
                topics: [
                    {
                        title: 'Process Management, Scheduling, and Concurrency',
                        subtopics: [
                            'Process Control Blocks (PCB), Process States, and `fork()` / `execve()` Lifecycle',
                            'Preemptive CPU Scheduling: Linux Completely Fair Scheduler (CFS) and EEVDF',
                            'POSIX Threads (pthreads), Mutexes, Semaphores, Spinlocks, and Deadlock Avoidance'
                        ]
                    },
                    {
                        title: 'Virtual Memory Architecture and Paging Subsystems',
                        subtopics: [
                            'Virtual Address Spaces, Multi-Level Page Tables, and Translation Lookaside Buffers (TLB)',
                            'Demand Paging, Page Fault Handling, Copy-on-Write (CoW), and HugePages',
                            'Swap Thrashing, Out-of-Memory (OOM) Killer Heuristics, and Slab/Buddy Allocators'
                        ]
                    }
                ]
            },
            {
                weekIdx: 3,
                topics: [
                    {
                        title: 'Storage Subsystems, Block I/O, and NVMe Architecture',
                        subtopics: [
                            'Linux Virtual File System (VFS) Switch, Inodes, Dentries, and Page Cache',
                            'Block Layer Multi-Queue (blk-mq) I/O Schedulers and NVMe Submission/Completion Queues',
                            'RAID Levels (0, 1, 5, 6, 10) and Hardware vs. Software Storage Redundancy'
                        ]
                    },
                    {
                        title: 'Platform Performance Profiling and the USE Method',
                        subtopics: [
                            'Brendan Gregg\'s Utilization, Saturation, and Errors (USE) Methodology',
                            'Diagnosing CPU, Memory, and Disk I/O Bottlenecks (`vmstat`, `iostat`, `mpstat`, `pidstat`)',
                            'Kernel Tracing with `strace`, `perf`, and eBPF Observability Tools'
                        ]
                    }
                ]
            },

            // ---------------- CO2: Weeks 5 - 8 ----------------
            {
                weekIdx: 4,
                topics: [
                    {
                        title: 'Linux Enterprise Administration and Systemd Service Management',
                        subtopics: [
                            'Filesystem Hierarchy Standard (FHS), Boot Sequence, and `systemd` UnitTargets',
                            'Writing Custom `systemd` Service Units, Timers, Socket Activation, and `journalctl` Analysis',
                            'Sysctl Runtime Kernel Tuning (`/proc/sys`, `/etc/sysctl.d/`) and Resource Limits (`ulimit`)'
                        ]
                    },
                    {
                        title: 'Advanced Volume Management and Copy-on-Write Filesystems',
                        subtopics: [
                            'Logical Volume Manager (LVM2): Physical Volumes, Volume Groups, Thin Provisioning, and Snapshots',
                            'Journaling vs. Copy-on-Write Filesystems: ext4, XFS, Btrfs, and OpenZFS Pools',
                            'Disk Quotas, `fstab` Mount Options (`noatime`, `nosuid`, `nodev`), and `fsck` Recovery'
                        ]
                    }
                ]
            },
            {
                weekIdx: 5,
                topics: [
                    {
                        title: 'Identity, Access Control, and Mandatory Access Control (MAC)',
                        subtopics: [
                            'PAM (Pluggable Authentication Modules), `sudoers` Policies, and POSIX File Capabilities',
                            'Discretionary Access Control (DAC), SUID/SGID/Sticky Bits, and Extended POSIX ACLs (`setfacl`)',
                            'Mandatory Access Control: SELinux Contexts/Booleans and AppArmor Security Profiles'
                        ]
                    },
                    {
                        title: 'Linux Network Stack Configuration and Packet Filtering',
                        subtopics: [
                            'Network Interfaces, VLAN Tagging, Bonding/Teaming (`iproute2`, `nmcli`, `netplan`)',
                            'Stateful Firewalling and NAT Masquerading with `nftables` / `iptables` and `ufw`/`firewalld`',
                            'OpenSSH Hardening: Ed25519 Keys, Bastion Jump Hosts, Port Forwarding, and `fail2ban`'
                        ]
                    }
                ]
            },
            {
                weekIdx: 6,
                topics: [
                    {
                        title: 'Defensive Shell Scripting and POSIX Automation',
                        subtopics: [
                            'Strict Mode Bash Scripting (`set -euo pipefail`), Signal Trapping (`trap`), and Exit Codes',
                            'Text Stream Processing Pipelines Using `awk`, `sed`, `grep`, `jq`, and Regular Expressions',
                            'Automated Log Rotation (`logrotate`), Cron/Systemd Timers, and Incremental `rsync` Backups'
                        ]
                    },
                    {
                        title: 'Agentless Configuration Management with Ansible',
                        subtopics: [
                            'Ansible Architecture: Control Node, Managed Hosts, Dynamic Inventories, and SSH Transport',
                            'Writing Idempotent YAML Playbooks, Tasks, Handlers, Variables, and Jinja2 Templates',
                            'Structuring Reusable Ansible Roles, Ansible Vault Secret Encryption, and `ansible-lint`'
                        ]
                    }
                ]
            },
            {
                weekIdx: 7,
                topics: [
                    {
                        title: 'Core Network Infrastructure Services (DNS, DHCP, Reverse Proxy)',
                        subtopics: [
                            'Authoritative and Recursive DNS Resolution with BIND9 / CoreDNS and Zone Records',
                            'Dynamic Host Configuration Protocol (DHCP) Lease Management and NTP Time Synchronization (`chrony`)',
                            'High-Performance Web Serving and TLS Termination with NGINX and Let\'s Encrypt ACME'
                        ]
                    },
                    {
                        title: 'CIS Benchmark Auditing and Automated Patch Management',
                        subtopics: [
                            'Center for Internet Security (CIS) Linux Benchmark Hardening Controls',
                            'Automated Security Compliance Scanning with OpenSCAP and Lynis',
                            'Unattended Security Patching, Live Kernel Patching (`kpatch`), and Vulnerability Triage'
                        ]
                    }
                ]
            },

            // ---------------- CO3: Weeks 9 - 12 ----------------
            {
                weekIdx: 8,
                topics: [
                    {
                        title: 'Hardware-Assisted Virtualization and Hypervisor Internals',
                        subtopics: [
                            'Popek and Goldberg Virtualization Requirements, Trap-and-Emulate, and Binary Translation',
                            'Type-1 Bare-Metal (KVM, VMware ESXi, Xen) vs. Type-2 Hosted Hypervisors',
                            'CPU Virtualization Extensions (Intel VT-x/EPT, AMD-V/RVI) and VirtIO Paravirtualized Drivers'
                        ]
                    },
                    {
                        title: 'Enterprise Virtual Machine Management with KVM/QEMU and Proxmox',
                        subtopics: [
                            'KVM Kernel Module, QEMU Device Emulation, and `libvirt` (`virsh`) Management Stack',
                            'Virtual Disk Formats (`qcow2` thin provisioning, backing files, live snapshots, and `raw`)',
                            'Live VM Migration, Memory Ballooning, KSM (Kernel Same-page Merging), and PCI Passthrough (IOMMU)'
                        ]
                    }
                ]
            },
            {
                weekIdx: 9,
                topics: [
                    {
                        title: 'OS-Level Virtualization: Linux Namespaces and Control Groups',
                        subtopics: [
                            'Isolating System Views with Linux Namespaces (`pid`, `net`, `mnt`, `uts`, `ipc`, `user`, `cgroup`)',
                            'Resource Metering and Throttling with Control Groups (`cgroups v2`) for CPU, Memory, and I/O',
                            'Seccomp-BPF Syscall Filtering and Capabilities Dropping inside Unprivileged Containers'
                        ]
                    },
                    {
                        title: 'OCI Container Internals and Union Filesystems',
                        subtopics: [
                            'Open Container Initiative (OCI) Runtime (`runc`, `crun`) and Image Layer Specifications',
                            'Copy-on-Write Overlay Filesystems (`OverlayFS`: lowerdir, upperdir, workdir, merged)',
                            'Daemonless and Rootless Container Execution with Podman, Buildah, and Skopeo'
                        ]
                    }
                ]
            },
            {
                weekIdx: 10,
                topics: [
                    {
                        title: 'Software-Defined Networking (SDN) for Virtualized Platforms',
                        subtopics: [
                            'Linux Virtual Ethernet Pairs (`veth`), Linux Bridges, and Open vSwitch (OVS)',
                            'Container Network Interface (CNI) Plugins: Bridge, Host, Macvlan, Ipvlan, and VXLAN Overlays',
                            'Network Namespace Routing, Hairpin NAT, and eBPF-Accelerated Cilium Datapaths'
                        ]
                    },
                    {
                        title: 'Persistent Container Storage and Network File Systems',
                        subtopics: [
                            'Bind Mounts, Managed Volumes, tmpfs Mounts, and Container Storage Interface (CSI)',
                            'Networked Storage Protocols: NFSv4, iSCSI Block Targets, and Ceph Distributed Storage',
                            'Automated Backup, Snapshot Restoration, and Data Integrity Verification for Stateful Workloads'
                        ]
                    }
                ]
            },
            {
                weekIdx: 11,
                topics: [
                    {
                        title: 'Immutable Infrastructure and Golden Image Pipelines',
                        subtopics: [
                            'Pets vs. Cattle Paradigm and Immutable Server Replacement Workflows',
                            'Building Automated VM and Container Golden Images with HashiCorp Packer and `cloud-init`',
                            'Supply Chain Security: Image Signing with Cosign and Software Bill of Materials (Syft/Grype)'
                        ]
                    },
                    {
                        title: 'High-Availability Clustering and Load Balancing (HAProxy / Keepalived)',
                        subtopics: [
                            'Active-Active and Active-Passive High-Availability Topologies and Split-Brain Quorum',
                            'Virtual Router Redundancy Protocol (VRRP) Floating IPs with `keepalived`',
                            'Layer 4 and Layer 7 Load Balancing, Health Checks, and Connection Draining with HAProxy'
                        ]
                    }
                ]
            },

            // ---------------- CO4: Weeks 13 - 16 ----------------
            {
                weekIdx: 12,
                topics: [
                    {
                        title: 'Cloud Computing Models and Virtual Private Cloud (VPC) Architecture',
                        subtopics: [
                            'Shared Responsibility Model Across IaaS, PaaS, CaaS, and Serverless FaaS Platforms',
                            'Multi-AZ VPC Design: Public/Private Subnets, CIDR Subnetting, Route Tables, and NAT Gateways',
                            'VPC Peering, Transit Gateways, Security Groups (Stateful) vs. Network ACLs (Stateless)'
                        ]
                    },
                    {
                        title: 'Cloud Identity and Access Management (IAM) and Zero-Trust Governance',
                        subtopics: [
                            'IAM Principals, Roles, Policies, Permission Boundaries, and Instance Metadata Service (IMDSv2)',
                            'Workload Identity Federation (OIDC) for Secretless GitHub Actions to Cloud Authentication',
                            'Cloud Key Management Service (KMS) Envelope Encryption and CloudTrail Audit Logging'
                        ]
                    }
                ]
            },
            {
                weekIdx: 13,
                topics: [
                    {
                        title: 'Infrastructure as Code (IaC) with HashiCorp Terraform',
                        subtopics: [
                            'Declarative HCL Syntax: Providers, Resources, Data Sources, Variables, and Outputs',
                            'Terraform Execution Lifecycle: `init`, `plan`, `apply`, `destroy`, and Dependency Graph',
                            'Remote State Backends (S3 + DynamoDB Locking), State Drift Detection, and Workspaces'
                        ]
                    },
                    {
                        title: 'Modular Terraform Architecture and Policy-as-Code',
                        subtopics: [
                            'Authoring Reusable, Versioned Terraform Modules for Network and Compute Stacks',
                            'Testing and Static Analysis of IaC Using `tflint`, `tfsec`/`trivy`, and `terraform test`',
                            'Policy-as-Code Guardrails Using Open Policy Agent (OPA) / Sentinel in CI Pull Requests'
                        ]
                    }
                ]
            },
            {
                weekIdx: 14,
                topics: [
                    {
                        title: 'Platform Observability, Metrics Collection, and Alerting',
                        subtopics: [
                            'Prometheus Pull Model, Node Exporter Hardware Metrics, and PromQL Aggregation Queries',
                            'Centralized Log Shipping with Promtail/Vector and Grafana Loki LogQL Indexing',
                            'Alertmanager Routing Trees, PagerDuty/Webhook Escalations, and Symptom-Based Alerting'
                        ]
                    },
                    {
                        title: 'Site Reliability Engineering (SRE), Autoscaling, and Chaos Resilience',
                        subtopics: [
                            'Eliminating Operational Toil, Blameless Post-Mortems, and Error Budget Policies',
                            'Dynamic Autoscaling Groups (ASG), Target Tracking Policies, and Spot Instance Fleet Mixing',
                            'Disaster Recovery Tiers: Backup & Restore, Pilot Light, Warm Standby, and Multi-Site Active-Active'
                        ]
                    }
                ]
            },
            {
                weekIdx: 15,
                topics: [
                    {
                        title: 'Cloud FinOps, Green Computing, and Platform Cost Optimization',
                        subtopics: [
                            'Resource Tagging Governance, Cost Allocation Dashboards, and Idle Resource Reaper Automation',
                            'Evaluating Compute Cost-Performance: Spot/Preemptible Instances, Savings Plans, and ARM64 Graviton',
                            'Carbon-Aware Workload Scheduling and Data Egress Bandwidth Optimization'
                        ]
                    },
                    {
                        title: 'Capstone Cloud Platform Engineering Defense',
                        subtopics: [
                            'Live Provisioning Walkthrough of the Multi-Tier Cloud Platform via Terraform and Ansible',
                            'Demonstration of HA Failover, Container Isolation, Firewall Enforcement, and Grafana Telemetry',
                            'Technical Defense of Security Compliance, Disaster Recovery RTO/RPO, and FinOps Efficiency'
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
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'UNC VMO & Platform Engineering Charter Reading', desc: 'Read the UNC Student Handbook and SCIS VMO guide to connect platform reliability with institutional values.' },
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'Bare-Metal to Cloud Evolution Case Study', desc: 'Review an industry case study tracing a company\'s migration from on-premise physical servers to an Internal Developer Platform.' },
                    { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation & Server Lab Safety Briefing', desc: 'Interactive briefing covering syllabus outcomes, grading weights, root privilege ethics, and sandbox VM lab rules.' },
                    { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'Linux Lab VM Bootstrap & Hardware Inspection', desc: 'Hands-on workshop booting the course Linux VM and inspecting UEFI/BIOS tables, CPU topology (`lscpu`), and PCI buses (`lspci`).' },
                    { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO & Ethical SysAdmin Pledge Artifact', desc: 'Submit a personal VMO alignment pledge emphasizing ethical stewardship of privileged infrastructure credentials.' },
                    { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Platform Abstraction Layer Diagram', desc: 'Draw a layered architectural diagram illustrating firmware, kernel, hypervisor, container runtime, and orchestration layers.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'VMO & Lab Policy Comprehension Check', desc: 'Formative check verifying student understanding of course grading and lab safety policies.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Hardware & Topology CLI Inventory Check', desc: 'In-class verification of student CLI output from `lscpu`, `lsblk`, and `dmidecode`.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'VMO Alignment Pledge Rubric', desc: 'Formative evaluation of the ethical system administrator reflection.' }
                ]
            },
            // ---------------- WEEK 2 (CO1 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 1, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Silberschatz OS Structure & ISA Reference Study', desc: 'Read chapters on processor instruction sets (x86_64 vs. ARM64), cache hierarchies, privilege rings, and system calls.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Cross-Architecture Binary Compilation Prep', desc: 'Compile a C program targeting both `x86_64-linux-gnu` and `aarch64-linux-gnu` and inspect disassembly output (`objdump`).' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'ISA Trade-Offs (x86_64 vs. ARM64) & Kernel Rings Lecture', desc: 'Comparative lecture on CISC vs. RISC server processors, NUMA memory nodes, Ring 0/Ring 3 transitions, and POSIX syscalls.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Syscall Tracing & Cache Miss Profiling Laboratory', desc: 'Hands-on laboratory using `strace`, `ltrace`, and `perf stat` to measure syscall overhead and L1/L3 CPU cache miss rates.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'ARM64 Graviton vs. x86_64 Workload Analysis Report', desc: 'Analyze benchmark data comparing throughput per watt between x86_64 and ARM64 cloud instances.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Monolithic vs. Microkernel Trade-Off Essay', desc: 'Contrast Linux\'s monolithic kernel module architecture with microkernel IPC message-passing overhead.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 0, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Prelim quiz covering x86_64/ARM64 architectures, kernel protection rings, process scheduling, and virtual memory.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Syscall & Perf Counter Lab Worksheet', desc: 'Practical check of `strace` system call frequency tables and `perf` IPC calculations.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Cross-ISA Efficiency Analysis Rubric', desc: 'Formative review of the ARM64 vs. x86_64 comparative report.' }
                ]
            },
            // ---------------- WEEK 3 (CO1 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 2, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Tanenbaum Process Scheduling & Virtual Memory Study', desc: 'Study Linux CFS/EEVDF scheduling, POSIX threads, multi-level page tables, TLB caches, and Copy-on-Write paging.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Process Tree & `/proc/<pid>/maps` Exploration', desc: 'Inspect `/proc/<pid>/status`, `/proc/<pid>/smaps`, and `pstree` for running multi-threaded daemons.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'CFS/EEVDF Scheduling, Concurrency & Virtual Memory Seminar', desc: 'Walkthrough of `nice`/`chrt` priorities, mutex contention, minor/major page faults, HugePages, and OOM Killer scoring.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'OS Kernel & Process Diagnostics Laboratory', desc: 'Supervised laboratory diagnosing CPU contention, thread deadlocks, and memory leak page thrashing using `/proc`, `pidstat`, and `pmap`.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'OOM Killer Tuning & HugePages Configuration', desc: 'Configure `vm.swappiness`, `oom_score_adj`, and Transparent HugePages for a memory-intensive database workload.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Copy-on-Write (`fork`) Memory Efficiency Calculation', desc: 'Calculate physical RAM savings achieved by Copy-on-Write page sharing across forked worker processes.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 1, weight: '30', name: 'OS Kernel & Process Diagnostics Lab', desc: 'Summative Prelim laboratory assessment grading process scheduling tuning, concurrency diagnostics, and virtual memory analysis.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Page Table & TLB Hit-Ratio Spot-Check', desc: 'In-class calculation of effective memory access time with TLB hits vs. page walks.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Sysctl Memory Parameter Audit', desc: 'Formative verification of `vm.swappiness` and `vm.overcommit_memory` configurations.' }
                ]
            },
            // ---------------- WEEK 4 (CO1 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 3, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Brendan Gregg Systems Performance & USE Method Study', desc: 'Read chapters on the USE Method (Utilization, Saturation, Errors), block I/O schedulers, NVMe queues, and RAID.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Stress-ng & Fio Synthetic Workload Setup', desc: 'Install `stress-ng`, `fio`, and `sysstat` on the lab VM and configure baseline hardware telemetry collection.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Storage I/O Subsystems & USE Performance Method Lecture', desc: 'Instruction on VFS page cache, `blk-mq` schedulers (`none`, `mq-deadline`, `bfq`), RAID stripe math, and 60-second Linux crisis analysis.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Platform Hardware & OS Benchmarking Studio', desc: 'Studio laboratory running `fio` and `stress-ng` benchmarks, identifying system bottlenecks via the USE method, and tuning kernel parameters.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Prelim Platform Hardware & OS Benchmarking Report', desc: 'Submit the formal Prelim benchmarking report containing IOPS/latency graphs, bottleneck root-cause analysis, and sysctl tuning diffs.' },
                    { phase: 'postclass', by: 'S', lab: false, name: '60-Second Linux Performance Checklist Card', desc: 'Compile a personal incident-response command reference for rapid bottleneck triage (`uptime`, `dmesg`, `vmstat`, `iostat`, `sar`).' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 2, weight: '50', name: 'Platform Hardware & OS Benchmarking Report', desc: 'Major Prelim deliverable evaluating empirical OS/storage benchmarking, USE method diagnostics, and kernel tuning.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Fio IOPS & Queue Depth Analysis Check', desc: 'In-class check of random vs. sequential read/write latency measurements.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'USE Method Bottleneck Identification Rubric', desc: 'Formative review of evidence-backed bottleneck diagnosis.' }
                ]
            },

            // ---------------- WEEK 5 (CO2 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 4, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Nemeth Linux Administration: Systemd & LVM2 Study', desc: 'Read chapters on `systemd` unit files, LVM2 volume management, ext4/XFS/ZFS filesystems, and mount security options.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Virtual Block Disk Attachment Prep', desc: 'Attach three raw virtual block devices (`/dev/sdb`, `/dev/sdc`, `/dev/sdd`) to the Linux lab VM for storage provisioning.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Systemd Daemon Engineering & LVM/ZFS Storage Lecture', desc: 'Live demonstration of custom `systemd` services with security sandboxing, LVM thin pools/snapshots, and ZFS scrub/compression.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'LVM2 Storage Pool & Systemd Hardened Daemon Lab', desc: 'Hands-on laboratory provisioning LVM logical volumes with XFS/ext4, configuring persistent `/etc/fstab` mounts, and authoring a hardened `systemd` unit.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Online LVM Volume Expansion & Snapshot Rollback Drill', desc: 'Perform a zero-downtime live filesystem expansion (`lvextend -r`) and test point-in-time LVM snapshot recovery.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Copy-on-Write (ZFS/Btrfs) vs. Journaling (XFS/ext4) Brief', desc: 'Compare silent bit-rot detection, snapshot overhead, and write amplification across enterprise Linux filesystems.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 3, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Midterm quiz covering Linux systemd, LVM/filesystems, SELinux/AppArmor MAC, nftables firewalling, and Ansible.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'LVM & `/etc/fstab` Boot Persistence Check', desc: 'Practical verification that logical volumes mount cleanly across a full VM reboot.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Systemd Security Sandboxing Check', desc: 'Formative check of `systemd-analyze security` exposure scores on custom unit files.' }
                ]
            },
            // ---------------- WEEK 6 (CO2 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 5, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'RHEL Security Guide: SELinux, ACLs & Nftables Study', desc: 'Study POSIX ACLs, Linux capabilities, SELinux type enforcement (`ausearch`, `audit2allow`, `semanage`), and `nftables` rulesets.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'SSH Ed25519 Keypair & Bastion Config Prep', desc: 'Generate passphrase-protected Ed25519 SSH keys and draft a jump-host `~/.ssh/config` file.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Mandatory Access Control (SELinux) & Stateful Firewalling Seminar', desc: 'Instruction on troubleshooting SELinux AVC denials without disabling enforcing mode, configuring `nftables` chains, and hardening `sshd_config`.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Linux Server Hardening & Storage Practicum', desc: 'Supervised practicum enforcing SELinux contexts on non-standard ports, writing a default-drop `nftables` firewall, and locking down SSH.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Automated Intrusion Prevention (`fail2ban`) & Auditd Rules', desc: 'Configure `fail2ban` jails for SSH brute-force mitigation and `auditd` watches on `/etc/passwd` and `/etc/sudoers`.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Why `setenforce 0` Is an Anti-Pattern Case Note', desc: 'Document how SELinux Mandatory Access Control confines zero-day web server exploits even when running as root.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 4, weight: '30', name: 'Linux Server Hardening & Storage Practicum', desc: 'Summative Midterm practicum evaluating LVM storage, SELinux enforcing remediation, `nftables` packet filtering, and SSH hardening.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'SELinux Enforcing Mode & Context Check', desc: 'In-class verification that `getenforce` returns `Enforcing` with custom port/file labels applied.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Nftables Default-Drop & Auditd Verification', desc: 'Formative check of active firewall rulesets and kernel audit logs.' }
                ]
            },
            // ---------------- WEEK 7 (CO2) ----------------
            {
                weekIdx: 6, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Defensive Bash Scripting & Ansible Playbook Study', desc: 'Study POSIX shell strict mode (`set -euo pipefail`), `shellcheck`, and Red Hat Ansible playbook idempotency principles.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Multi-Node Ansible Inventory & SSH Trust Setup', desc: 'Configure passwordless SSH key trust from an Ansible control node to three managed Linux target containers/VMs.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Idempotent Configuration Management with Ansible Lecture', desc: 'Walkthrough of converting fragile imperative Bash scripts into declarative Ansible roles, Jinja2 templates, handlers, and Ansible Vault.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Ansible Multi-Server Provisioning & Role Engineering Lab', desc: 'Hands-on laboratory authoring Ansible roles that configure users, SSH hardening, firewalls, and web services across a server fleet.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Zero-Change Idempotency & `ansible-lint` Verification', desc: 'Run the playbook twice consecutively to prove `changed=0` idempotency and pass all `ansible-lint` and `shellcheck` rules.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Configuration Drift & Push vs. Pull Architecture Brief', desc: 'Compare agentless push automation (Ansible) against agent-based pull models (Puppet/Salt) for fleet drift remediation.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Ansible Role & Idempotency Lab Rubric', desc: 'Formative laboratory check verifying zero `changed` tasks on second playbook run and encrypted Ansible Vault secrets.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'ShellCheck & Bash Trap Error Handling Check', desc: 'In-class check of defensive Bash cleanup traps and quoting discipline.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Jinja2 Dynamic Config Template Audit', desc: 'Verification of host-specific variable interpolation and handler restarts.' }
                ]
            },
            // ---------------- WEEK 8 (CO2 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 7, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'DNS/NGINX Core Services & CIS Linux Benchmark Study', desc: 'Study CoreDNS/BIND9 zone records, NGINX TLS hardening, and CIS Linux Benchmark compliance auditing with Lynis/OpenSCAP.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Midterm Automated Fleet Configuration Prep', desc: 'Assemble Ansible roles for storage, firewalling, DNS, NGINX TLS, and CIS hardening into a master site playbook.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Core Network Infrastructure & Automated CIS Auditing Seminar', desc: 'Demonstration of internal split-horizon DNS, NGINX TLS 1.3 cipher hardening, and automated Lynis/OpenSCAP hardening index scoring.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Midterm Automated Linux Fleet Configuration Defense', desc: 'Formal Midterm demonstration provisioning a hardened Linux server fleet from scratch via a single `ansible-playbook` execution.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Lynis Hardening Index > 80 Remediation Sprint', desc: 'Address remaining CIS benchmark warnings to achieve a verified Lynis hardening score above 80 across all managed nodes.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Midterm Server Automation Post-Mortem Log', desc: 'Document how automated playbooks eliminated manual configuration drift during the Midterm fleet build.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 5, weight: '50', name: 'Automated Linux Fleet Configuration Project', desc: 'Major Midterm project assessment evaluating fully automated, CIS-hardened multi-node Linux server provisioning via Ansible.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'DNS Zone Resolution & NGINX TLS Check', desc: 'In-class verification of `dig` record resolution and TLS 1.3 handshake headers.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Lynis / OpenSCAP Compliance Score Audit', desc: 'Formative verification of the post-remediation security compliance report.' }
                ]
            },

            // ---------------- WEEK 9 (CO3 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 8, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Popek & Goldberg Virtualization & KVM/Proxmox Study', desc: 'Read literature on hardware virtualization extensions (VT-x/AMD-V), VirtIO paravirtualization, and KVM/QEMU hypervisor internals.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Nested KVM & Libvirt Verification Check', desc: 'Verify `/dev/kvm` hardware virtualization flags (`vmx`/`svm`) and configure `libvirtd` and `virsh` CLI tooling.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Hypervisor Internals (KVM/QEMU) & VirtIO Paravirtualization Lecture', desc: 'In-depth lecture on Type-1 vs. Type-2 hypervisors, EPT shadow page tables, `qcow2` copy-on-write backing chains, and live VM migration.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'KVM/Libvirt VM Provisioning & Live Snapshot Lab', desc: 'Hands-on laboratory provisioning headless KVM virtual machines using `virt-install`, `cloud-init`, and `qcow2` backing snapshots.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'VirtIO vs. Emulated e1000/IDE I/O Benchmark', desc: 'Measure network and disk throughput comparing paravirtualized `virtio-net`/`virtio-blk` drivers against full hardware emulation.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Memory Overcommit, Ballooning & KSM Analysis', desc: 'Explain how Kernel Same-page Merging (KSM) and `virtio-balloon` manage host RAM contention across dense VM hosts.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 6, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Semifinal quiz covering Type-1/Type-2 hypervisors, KVM/VirtIO, Linux namespaces/cgroups v2, OverlayFS, and SDN.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Virsh CLI & Cloud-Init Provisioning Check', desc: 'Practical check of automated KVM guest creation and serial console login.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'VirtIO Paravirtualization Benchmark Rubric', desc: 'Formative review of the VirtIO vs. emulated hardware performance report.' }
                ]
            },
            // ---------------- WEEK 10 (CO3 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 9, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Linux Kernel Namespaces, Cgroups v2 & OCI Runtime Study', desc: 'Study Linux kernel documentation on `unshare`, `cgroups v2`, `OverlayFS`, OCI `runc`, and rootless Podman.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Minimal Rootfs & OverlayFS Mount Preparation', desc: 'Extract an Alpine Linux minimal root filesystem (`rootfs`) and create `lower`, `upper`, `work`, and `merged` directories.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Building a Container from Scratch: Namespaces, Cgroups & OverlayFS', desc: 'Live kernel demonstration constructing an isolated container using raw Linux `unshare`, `pivot_root`, `OverlayFS`, and `/sys/fs/cgroup` without Docker.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Hypervisor & Rootless Container Engine Practicum', desc: 'Supervised practicum building an isolated process container via raw namespaces/cgroups v2 and migrating workloads to rootless Podman with `seccomp` profiles.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Rootless Podman Systemd Quadlet Deployment', desc: 'Generate declarative rootless Podman Quadlet (`systemd`) units running unprivileged containers mapped to subuid/subgid ranges.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Docker Daemon (Root) vs. Rootless Podman Security Audit', desc: 'Analyze how user namespaces (`userns`) mitigate container breakout vulnerabilities compared to a root-owned Docker socket.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 7, weight: '30', name: 'Hypervisor & Rootless Container Engine Lab', desc: 'Summative Semifinal laboratory assessment grading raw namespace/cgroup v2 isolation, OverlayFS layering, and rootless Podman/KVM execution.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Cgroups v2 Memory & CPU Throttle Check', desc: 'In-class verification of `memory.max` and `cpu.max` enforcement in `/sys/fs/cgroup`.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Rootless UserNS UID Mapping Verification', desc: 'Formative check confirming container root (UID 0) maps to an unprivileged host UID (`ps -eo user,pid,comm`).' }
                ]
            },
            // ---------------- WEEK 11 (CO3) ----------------
            {
                weekIdx: 10, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Linux Virtual Networking (`veth`, Bridges, VXLAN) & Storage Study', desc: 'Read documentation on Linux network namespaces, `veth` pairs, Open vSwitch, VXLAN overlays, and NFS/iSCSI storage.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Multi-Namespace Network Topology Script Prep', desc: 'Draft `ip netns` commands to create two isolated network namespaces connected via a virtual Linux bridge (`br0`).' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Software-Defined Networking (SDN) & Persistent Storage Seminar', desc: 'Instruction on wiring `veth` pairs across network namespaces, NAT masquerading, Macvlan/VXLAN overlays, and shared NFSv4/iSCSI volumes.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Custom CNI Bridge & Shared Storage Laboratory', desc: 'Hands-on laboratory building a custom container network bridge from scratch with `iproute2` and mounting persistent NFSv4 storage across VM/container nodes.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Packet Capture (`tcpdump`) Across Virtual Bridges & VXLAN', desc: 'Capture and dissect ICMP/TCP frames traversing `veth` interfaces and VXLAN UDP port 4789 tunnels.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Bridge NAT vs. Macvlan vs. Host Networking Trade-Offs', desc: 'Evaluate latency, port-mapping overhead, and L2 broadcast behavior across container networking modes.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Virtual Bridge & NFSv4 Persistence Rubric', desc: 'Formative lab check verifying cross-namespace routing, outbound NAT, and shared volume data persistence.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Veth Pair & Route Table Diagnostic Check', desc: 'In-class check of `ip -n <netns> addr` and `ip -n <netns> route` configurations.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'VXLAN Encapsulation Packet Trace Audit', desc: 'Verification of outer and inner Ethernet/IP headers in `tcpdump` captures.' }
                ]
            },
            // ---------------- WEEK 12 (CO3 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 11, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'HashiCorp Packer Immutable Images & HAProxy/Keepalived Study', desc: 'Study immutable golden image pipelines with Packer and high-availability VRRP load balancing with HAProxy and Keepalived.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Semifinal Hybrid Platform Cluster Assembly', desc: 'Prepare Packer image templates, rootless container services, and HAProxy/Keepalived failover nodes for the Semifinal defense.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Immutable Golden Images & High-Availability Failover Lecture', desc: 'Demonstration of Packer automated image builds, Syft/Grype image scanning, and sub-second VRRP floating IP failover.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Semifinal Hybrid Virtualization & Container Platform Defense', desc: 'Formal Semifinal defense demonstrating a highly available hybrid VM and rootless container platform surviving live node termination.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Automated Image Vulnerability Gate & Failover Tuning', desc: 'Add Grype CVE gating to the Packer build pipeline and tune HAProxy health-check intervals based on Semifinal test results.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Mutable Patching vs. Immutable Replacement Retrospective', desc: 'Analyze operational reliability improvements gained by replacing immutable server images rather than patching in place.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 8, weight: '50', name: 'Hybrid Virtualization & Container Platform Defense', desc: 'Major Semifinal defense evaluating the HA virtualized and containerized platform, SDN networking, and zero-downtime failover.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Packer Golden Image & SBOM Check', desc: 'In-class verification of reproducible Packer image builds and Syft SBOM output.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Keepalived VRRP Failover Latency Audit', desc: 'Formative check confirming zero dropped client connections during primary load balancer failover.' }
                ]
            },

            // ---------------- WEEK 13 (CO4 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 12, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'AWS Well-Architected VPC & IAM Zero-Trust Study', desc: 'Study Multi-AZ VPC CIDR subnetting, stateful Security Groups vs. stateless NACLs, IAM policy evaluation logic, and OIDC federation.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'VPC CIDR Subnet Calculator & IAM Policy JSON Draft', desc: 'Design a `/16` VPC CIDR allocation across 3 Availability Zones (Public, Private App, Private Data subnets) and draft least-privilege IAM policies.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Cloud VPC Network Segmentation & IAM Least-Privilege Lecture', desc: 'Lecture on Multi-AZ routing, NAT Gateways, VPC Endpoints, IMDSv2 SSRF protection, and secretless OIDC workload federation.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Multi-Tier Cloud VPC & Least-Privilege IAM Lab', desc: 'Hands-on laboratory constructing an isolated Multi-AZ VPC topology with bastion/SSM access, strict Security Group chaining, and IAM roles.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'IAM Policy Simulator & Privilege Escalation Audit', desc: 'Audit all IAM roles using IAM Access Analyzer / Parliament to detect wildcard (`*`) actions or privilege escalation paths.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Security Groups vs. Network ACLs Defense-in-Depth Brief', desc: 'Explain how combining stateful instance Security Groups with stateless subnet NACLs blocks lateral movement.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 9, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Final quiz covering cloud VPC subnetting, IAM zero-trust policies, Terraform state management, and SRE observability.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'VPC CIDR & Route Table Isolation Check', desc: 'Practical check verifying private database subnets have no direct route to the Internet Gateway.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'IAM Least-Privilege & IMDSv2 Audit', desc: 'Formative check confirming zero wildcard resource permissions and enforced IMDSv2 hop limits.' }
                ]
            },
            // ---------------- WEEK 14 (CO4 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 13, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Brikman Terraform Up and Running (3rd Ed) Study', desc: 'Read chapters on declarative HCL, remote state locking, reusable Terraform modules, and static IaC security scanning (`tfsec`/`trivy`).' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Terraform Remote State Backend & Module Skeleton', desc: 'Initialize an S3-compatible remote state backend with state locking and scaffold `network`, `compute`, and `storage` child modules.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Modular Terraform IaC & Policy-as-Code Seminar', desc: 'Live walkthrough of Terraform module composition, `for_each` dynamic blocks, state drift reconciliation, and `trivy config` security gates.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Terraform Cloud Provisioning & Observability Practicum', desc: 'Supervised practicum authoring modular Terraform IaC to provision the cloud platform and deploying Prometheus, Node Exporter, and Grafana Loki.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Automated CI Terraform Plan & Trivy IaC Gate', desc: 'Configure a GitHub Actions workflow that runs `terraform fmt -check`, `terraform validate`, `trivy config`, and posts the `terraform plan` diff.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Terraform State Locking & Secret Exposure Analysis', desc: 'Analyze why Terraform state files must be encrypted at rest and never committed to Git.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 10, weight: '30', name: 'Terraform Cloud Provisioning & Observability Lab', desc: 'Summative Final laboratory assessment grading modular Terraform IaC provisioning, remote state locking, and Prometheus/Grafana observability.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Terraform Plan Idempotency & Drift Check', desc: 'In-class check confirming `terraform plan` reports `No changes` after initial apply.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Trivy / Tfsec Zero-Misconfiguration Pass', desc: 'Formative verification that all Terraform modules pass static security scanning.' }
                ]
            },
            // ---------------- WEEK 15 (CO4) ----------------
            {
                weekIdx: 14, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Google SRE Book: Monitoring, Alerting & Toil Study', desc: 'Read chapters on symptom-based alerting, PromQL Golden Signals, autoscaling policies, and Disaster Recovery RTO/RPO tiers.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'PromQL Alert Rules & Chaos Fault Script Prep', desc: 'Write Prometheus alerting rules for high CPU saturation, disk-full prediction (`predict_linear`), and target instance down.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'SRE Observability, Autoscaling & Disaster Recovery Lecture', desc: 'Instruction on PromQL rate/histogram queries, Grafana Golden Signal dashboards, dynamic autoscaling groups, and RTO/RPO failover drills.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Chaos GameDay, Autoscaling & Backup Restore Lab', desc: 'Hands-on GameDay laboratory injecting CPU/network faults to trigger autoscaling, Alertmanager notifications, and automated backup restoration.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Blameless Post-Mortem & FinOps Cost Optimization Report', desc: 'Author a blameless SRE post-mortem from the GameDay chaos drill alongside a FinOps resource right-sizing analysis.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'RTO vs. RPO Disaster Recovery Architecture Matrix', desc: 'Compare cost and recovery speed across Backup/Restore, Pilot Light, Warm Standby, and Multi-Region Active-Active.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Chaos GameDay & Autoscaling Lab Rubric', desc: 'Formative laboratory evaluation of Prometheus alert firing accuracy, autoscaling response, and RTO/RPO recovery.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'PromQL Golden Signals Query Check', desc: 'In-class check of `rate()`, `histogram_quantile()`, and `predict_linear()` expressions.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'SRE Blameless Post-Mortem & FinOps Audit', desc: 'Verification of root-cause timeline documentation and actionable remediation items.' }
                ]
            },
            // ---------------- WEEK 16 (CO4 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 15, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Capstone Cloud Platform Architecture Dossier Prep', desc: 'Compile network topology diagrams, Terraform/Ansible repositories, CIS hardening scores, and SRE dashboards for the final defense.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Clean-Room `terraform apply` & Ansible Reproducibility Test', desc: 'Destroy and re-provision the entire platform stack from scratch to verify 100% hands-off IaC reproducibility.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Platform Engineering Production Readiness Briefing', desc: 'Instructor briefing on enterprise platform review standards, security compliance verification, and operational handoff.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Capstone Cloud Platform Engineering Defense & Live Drill', desc: 'Formal Final oral defense and live demonstration of the automated, CIS-hardened, observable cloud platform under simulated failure.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Archival IaC Repository Release & Cloud Teardown', desc: 'Tag the final v1.0.0 release of Terraform/Ansible code, archive telemetry snapshots, and execute clean `terraform destroy`.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Platform Technologies Competency Synthesis', desc: 'Complete a post-course engineering reflection synthesizing kernel, Linux, virtualization, container, and cloud IaC mastery.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 11, weight: '50', name: 'Capstone Cloud Platform Engineering Defense', desc: 'Major Final capstone defense evaluating the end-to-end automated, hardened, and observable cloud platform architecture.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Clean-Room IaC Reproducibility Check', desc: 'Verification of zero-touch platform provisioning via Terraform and Ansible.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Archival Runbook & Security Sign-Off', desc: 'Final check of platform architecture documentation and clean resource teardown.' }
                ]
            }
        ];

        const insertedTlasByWeek = [];

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
                `SELECT tla_id, tla_name FROM TeachingAndLearningActivities WHERE week_id = ${targetWeekId} ORDER BY tla_id ASC;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            insertedTlasByWeek.push(insertedTlas);

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

        // ============================================================================
        // 12. COMMENTS & COMMENT TARGETS (week_id + subtopic_id / tla_id / weekly_reference_id)
        // ============================================================================
        const subtopicsByWeek = [];
        const weeklyRefsByWeek = [];
        for (let wIdx = 0; wIdx < 16; wIdx++) {
            const wId = weeks[wIdx].week_id;
            const subs = await queryInterface.sequelize.query(
                `SELECT subtopic_id, title FROM Subtopics WHERE week_id = ${wId} ORDER BY subtopic_id ASC;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            subtopicsByWeek.push(subs);

            const wRefs = await queryInterface.sequelize.query(
                `SELECT weekly_reference_id FROM WeeklyReferences WHERE week_id = ${wId} ORDER BY weekly_reference_id ASC;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            weeklyRefsByWeek.push(wRefs);
        }

        const rawCommentsData = [
            // Comment 1: Week 2 (CO1) - Subtopic on ARM64 vs x86_64
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[1].week_id,
                comment_for: 'topics',
                target_id: subtopicsByWeek[1][0].subtopic_id,
                message: 'The processor architecture subtopic must explicitly include AWS Graviton4 and Ampere Altra cloud-native ARM64 cost-per-watt benchmarks alongside traditional x86_64 Xeon/EPYC metrics.'
            },
            // Comment 2: Week 4 (CO1) - TLA on Platform Hardware & OS Benchmarking Studio
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[3].week_id,
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[3][3].tla_id,
                message: 'In the benchmarking studio lab, require students to capture eBPF flamegraphs (using bcc/bpftrace) during the fio storage stress test rather than relying solely on legacy iostat averages.'
            },
            // Comment 3: Week 6 (CO2) - Subtopic on SELinux & AppArmor
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[5].week_id,
                comment_for: 'topics',
                target_id: subtopicsByWeek[5][2].subtopic_id,
                message: 'Ensure students are strictly prohibited from setting SELinux to permissive/disabled during troubleshooting; add custom policy module compilation (audit2allow / semanage fcontext) as a mandatory requirement.'
            },
            // Comment 4: Week 10 (CO3) - TLA on Hypervisor & Rootless Container Engine Practicum
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[9].week_id,
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[9][3].tla_id,
                message: 'Expand the rootless container practicum to require students to write a custom seccomp-bpf JSON profile that explicitly blocks dangerous syscalls (e.g., keyctl, add_key, ptrace).'
            },
            // Comment 5: Week 13 (CO4) - Subtopic on Workload Identity Federation (OIDC)
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[12].week_id,
                comment_for: 'topics',
                target_id: subtopicsByWeek[12][4].subtopic_id,
                message: 'Emphasize zero long-lived static AWS/GCP access keys in CI/CD; students must configure short-lived OIDCfederated tokens between GitHub Actions and the cloud IAM provider.'
            },
            // Comment 6: Week 14 (CO4) - WeeklyReference on Terraform Up and Running
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[13].week_id,
                comment_for: 'references',
                target_id: weeklyRefsByWeek[13][0].weekly_reference_id,
                message: 'Supplement the Terraform 3rd Edition textbook reference with the latest OpenTofu / Terraform 1.8+ native mocking and `terraform test` framework documentation.'
            },
            // Return 2 (PROGRAM_HEAD) & Return 3 (LIBRARY_DIRECTOR) Comments
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                resolved_status: false,
                week_id: weeks[1].week_id,
                comment_for: 'topics',
                target_id: subtopicsByWeek[1][3].subtopic_id,
                message: 'Align the OS kernel protection rings subtopic with the BSIT curriculum mapping by explicitly contrasting Ring 0 kernel-space vs. Ring 3 user-space syscall boundaries.'
            },
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                resolved_status: false,
                week_id: weeks[3].week_id,
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[3][2].tla_id,
                message: 'Include a structured peer-review checklist during the USE Method briefing so students validate each group bottleneck telemetry before final report submission.'
            },
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                resolved_status: false,
                week_id: weeks[5].week_id,
                comment_for: 'topics',
                target_id: subtopicsByWeek[5][5].subtopic_id,
                message: 'Add bastion host jump-server topology diagrams to the OpenSSH hardening subtopic to reinforce defense-in-depth outcomes.'
            },
            {
                co_assign_id: assignId,
                commenter_role: 'PROGRAM_HEAD',
                resolved_status: false,
                week_id: weeks[9].week_id,
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[9][4].tla_id,
                message: 'Ensure the post-class container image security audit requires documenting CVE severity remediation steps in the lab rubric.'
            },
            {
                co_assign_id: assignId,
                commenter_role: 'LIBRARY_DIRECTOR',
                resolved_status: false,
                week_id: weeks[13].week_id,
                comment_for: 'references',
                target_id: weeklyRefsByWeek[13][1].weekly_reference_id,
                message: 'Verify that the cited cloud infrastructure reference edition is within the recent 5-year library acquisition window and include the library catalog call number.'
            }
        ];

        await queryInterface.bulkInsert('Comments', rawCommentsData.map(c => {
            const roleDate = c.commenter_role === 'INDUSTRY_CONSULTANT'
                ? new Date('2026-06-15 10:15:00')
                : c.commenter_role === 'PROGRAM_HEAD'
                    ? new Date('2026-06-16 14:20:00')
                    : new Date('2026-06-17 11:00:00');
            const stakeholderId = c.commenter_role === 'INDUSTRY_CONSULTANT'
                ? '4'
                : c.commenter_role === 'PROGRAM_HEAD'
                    ? '2'
                    : '3';
            return {
                co_assign_id: c.co_assign_id,
                stakeholder_id: stakeholderId,
                commenter_role: c.commenter_role,
                message: c.message,
                resolved_status: c.resolved_status,
                week_id: c.week_id,
                comment_for: c.comment_for,
                createdAt: roleDate,
                updatedAt: roleDate
            };
        }), {});

        const insertedComments = await queryInterface.sequelize.query(
            `SELECT comment_id, message FROM Comments WHERE co_assign_id = ${assignId} ORDER BY comment_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const targetInserts = rawCommentsData.map((c, index) => ({
            comment_id: insertedComments[index].comment_id,
            target_id: c.target_id,
            createdAt: now,
            updatedAt: now
        }));

        await queryInterface.bulkInsert('CommentTargets', targetInserts, {});

        console.log("Successfully seeded 'Platform Technologies' (BIT311L) with full 16-week structure and RETURNED Industry Consultant comments.");
    },

    async down(queryInterface, Sequelize) {
        console.warn("Use npx sequelize-cli db:seed:undo:all to reset the composition database cleanly.");
    }
};
