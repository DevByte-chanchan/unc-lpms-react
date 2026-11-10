'use strict';

const bcrypt = require('bcryptjs');

/**
 * Seeder: Stakeholders (Faculty, Industry Consultants) & User Accounts
 * Mirrors the demo accounts from the Course Assignment module (origin/feature/course-assignment)
 * plus additional faculty instructor records.
 *
 * Stakeholder / UserAccount ID Mapping:
 *   1 -> Monica Norton        (Instructor)             monica.norton@unc.edu.ph      / Instructor@2026
 *   2 -> Olivia Vance         (Program Head, Instructor) olivia.vance@unc.edu.ph     / ProgramHead@2026
 *   3 -> Maria Santos         (Director of Libraries)  maria.santos@unc.edu.ph       / Library@2026
 *   4 -> Roberto Cruz         (Industry Consultant)    roberto.cruz@unc.edu.ph       / Consultant@2026
 *   5 -> Sophia Sterling      (Dean)                   sophia.sterling@unc.edu.ph    / Dean@2026
 *   6 -> Carlos Garcia        (VPAA)                   carlos.garcia@unc.edu.ph      / Vpaa@2026
 *   7 -> Juan Dela Cruz       (Instructor)             juan.delacruz@unc.edu.ph      / Instructor@2026
 *   8 -> Elena Reyes          (Instructor)             elena.reyes@unc.edu.ph        / Instructor@2026
 *   9 -> Marco Villanueva     (Instructor)             marco.villanueva@unc.edu.ph   / Instructor@2026
 */
module.exports = {
    async up(queryInterface) {
        const now = new Date();

        // Clean existing rows if re-running
        await queryInterface.bulkDelete('user_accounts', null, {});
        await queryInterface.bulkDelete('industry_consultants', null, {});
        await queryInterface.bulkDelete('faculty', null, {});

        // 1. Seed Faculty records
        await queryInterface.bulkInsert('faculty', [
            {
                id: 1,
                name: 'Monica Norton',
                sex: 'Female',
                birthdate: '1992-04-15',
                email: 'monica.norton@unc.edu.ph',
                contact_number: '0917-555-0101',
                department_id: 3, // SCIS
                position: 'Instructor',
                employment_type: 'Full-time',
                status: 'Active',
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                name: 'Olivia Vance',
                sex: 'Female',
                birthdate: '1986-08-22',
                email: 'olivia.vance@unc.edu.ph',
                contact_number: '0917-555-0102',
                department_id: 3, // SCIS
                position: 'Program Head',
                employment_type: 'Full-time',
                status: 'Active',
                created_at: now,
                updated_at: now,
            },
            {
                id: 3,
                name: 'Maria Santos',
                sex: 'Female',
                birthdate: '1980-11-10',
                email: 'maria.santos@unc.edu.ph',
                contact_number: '0917-555-0103',
                department_id: 3,
                position: 'Director of Libraries',
                employment_type: 'Full-time',
                status: 'Active',
                created_at: now,
                updated_at: now,
            },
            {
                id: 4,
                name: 'Sophia Sterling',
                sex: 'Female',
                birthdate: '1978-02-19',
                email: 'sophia.sterling@unc.edu.ph',
                contact_number: '0917-555-0105',
                department_id: 3, // SCIS Dean
                position: 'Dean',
                employment_type: 'Full-time',
                status: 'Active',
                created_at: now,
                updated_at: now,
            },
            {
                id: 5,
                name: 'Carlos Garcia',
                sex: 'Male',
                birthdate: '1975-06-30',
                email: 'carlos.garcia@unc.edu.ph',
                contact_number: '0917-555-0106',
                department_id: 3,
                position: 'VPAA',
                employment_type: 'Full-time',
                status: 'Active',
                created_at: now,
                updated_at: now,
            },
            {
                id: 6,
                name: 'Juan Dela Cruz',
                sex: 'Male',
                birthdate: '1990-01-12',
                email: 'juan.delacruz@unc.edu.ph',
                contact_number: '0917-555-0107',
                department_id: 3, // SCIS
                position: 'Instructor',
                employment_type: 'Full-time',
                status: 'Active',
                created_at: now,
                updated_at: now,
            },
            {
                id: 7,
                name: 'Elena Reyes',
                sex: 'Female',
                birthdate: '1993-09-05',
                email: 'elena.reyes@unc.edu.ph',
                contact_number: '0917-555-0108',
                department_id: 3, // SCIS
                position: 'Instructor',
                employment_type: 'Full-time',
                status: 'Active',
                created_at: now,
                updated_at: now,
            },
            {
                id: 8,
                name: 'Marco Villanueva',
                sex: 'Male',
                birthdate: '1991-12-03',
                email: 'marco.villanueva@unc.edu.ph',
                contact_number: '0917-555-0109',
                department_id: 3, // SCIS
                position: 'Instructor',
                employment_type: 'Part-time',
                status: 'Active',
                created_at: now,
                updated_at: now,
            },
        ], {});

        // 2. Seed Industry Consultants
        await queryInterface.bulkInsert('industry_consultants', [
            {
                id: 1,
                name: 'Roberto Cruz',
                assigned_course_code: 'BIT313L',
                assigned_course_id: null,
                created_at: now,
                updated_at: now,
            },
        ], {});

        // 3. Seed User Accounts (deterministic IDs 1..9)
        const instructorHash = await bcrypt.hash('Instructor@2026', 10);
        const programHeadHash = await bcrypt.hash('ProgramHead@2026', 10);
        const libraryHash = await bcrypt.hash('Library@2026', 10);
        const consultantHash = await bcrypt.hash('Consultant@2026', 10);
        const deanHash = await bcrypt.hash('Dean@2026', 10);
        const vpaaHash = await bcrypt.hash('Vpaa@2026', 10);

        await queryInterface.bulkInsert('user_accounts', [
            {
                id: 1,
                email: 'monica.norton@unc.edu.ph',
                password_hash: instructorHash,
                full_name: 'Monica Norton',
                roles: JSON.stringify(['Instructor']),
                active_role: 'Instructor',
                faculty_id: 1,
                industry_consultant_id: null,
                status: 'Active',
                must_change_password: false,
                created_at: now,
                updated_at: now,
            },
            {
                id: 2,
                email: 'olivia.vance@unc.edu.ph',
                password_hash: programHeadHash,
                full_name: 'Olivia Vance',
                roles: JSON.stringify(['Program Head', 'Instructor']),
                active_role: 'Program Head',
                faculty_id: 2,
                industry_consultant_id: null,
                status: 'Active',
                must_change_password: false,
                created_at: now,
                updated_at: now,
            },
            {
                id: 3,
                email: 'maria.santos@unc.edu.ph',
                password_hash: libraryHash,
                full_name: 'Maria Santos',
                roles: JSON.stringify(['Director of Libraries']),
                active_role: 'Director of Libraries',
                faculty_id: 3,
                industry_consultant_id: null,
                status: 'Active',
                must_change_password: false,
                created_at: now,
                updated_at: now,
            },
            {
                id: 4,
                email: 'roberto.cruz@unc.edu.ph',
                password_hash: consultantHash,
                full_name: 'Roberto Cruz',
                roles: JSON.stringify(['Industry Consultant']),
                active_role: 'Industry Consultant',
                faculty_id: null,
                industry_consultant_id: 1,
                status: 'Active',
                must_change_password: false,
                created_at: now,
                updated_at: now,
            },
            {
                id: 5,
                email: 'sophia.sterling@unc.edu.ph',
                password_hash: deanHash,
                full_name: 'Sophia Sterling',
                roles: JSON.stringify(['Dean']),
                active_role: 'Dean',
                faculty_id: 4,
                industry_consultant_id: null,
                status: 'Active',
                must_change_password: false,
                created_at: now,
                updated_at: now,
            },
            {
                id: 6,
                email: 'carlos.garcia@unc.edu.ph',
                password_hash: vpaaHash,
                full_name: 'Carlos Garcia',
                roles: JSON.stringify(['VPAA']),
                active_role: 'VPAA',
                faculty_id: 5,
                industry_consultant_id: null,
                status: 'Active',
                must_change_password: false,
                created_at: now,
                updated_at: now,
            },
            {
                id: 7,
                email: 'juan.delacruz@unc.edu.ph',
                password_hash: instructorHash,
                full_name: 'Juan Dela Cruz',
                roles: JSON.stringify(['Instructor']),
                active_role: 'Instructor',
                faculty_id: 6,
                industry_consultant_id: null,
                status: 'Active',
                must_change_password: false,
                created_at: now,
                updated_at: now,
            },
            {
                id: 8,
                email: 'elena.reyes@unc.edu.ph',
                password_hash: instructorHash,
                full_name: 'Elena Reyes',
                roles: JSON.stringify(['Instructor']),
                active_role: 'Instructor',
                faculty_id: 7,
                industry_consultant_id: null,
                status: 'Active',
                must_change_password: false,
                created_at: now,
                updated_at: now,
            },
            {
                id: 9,
                email: 'marco.villanueva@unc.edu.ph',
                password_hash: instructorHash,
                full_name: 'Marco Villanueva',
                roles: JSON.stringify(['Instructor']),
                active_role: 'Instructor',
                faculty_id: 8,
                industry_consultant_id: null,
                status: 'Active',
                must_change_password: false,
                created_at: now,
                updated_at: now,
            },
        ], {});
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('user_accounts', null, {});
        await queryInterface.bulkDelete('industry_consultants', null, {});
        await queryInterface.bulkDelete('faculty', null, {});
    },
};
