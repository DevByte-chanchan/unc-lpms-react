'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models');
const {
  hciDescription,
  hciCourseOutcomes,
  hciPoAlignments,
  hciIloTemplates,
  hciReferences,
  weeklyReferencePairs,
  weeklyCurriculum,
  weeklyTlasAndAssessments,
} = require('./hciFoundationData');
const { seedOopRevisions } = require('./seedOopRevisions');

async function seedIntegratedMaster() {
  const existingUsers = await db.User.count();
  const existingOfferings = await db.ProgramCourseOffering.count();

  if (existingUsers >= 6 && existingOfferings >= 4) {
    console.log('[db:seed] Database already seeded (idempotent check passed). Skipping duplicate inserts.');
    return { skipped: true };
  }

  const now = new Date();
  const prevTermAssigned = new Date('2025-06-01T08:00:00Z');
  const prevTermSubmitted = new Date('2025-06-10T09:00:00Z');
  const prevTermApproved = new Date('2025-06-15T16:00:00Z');

  await db.sequelize.transaction(async (t) => {
    // ------------------------------------------------------------------
    // 1. Academic Periods
    // ------------------------------------------------------------------
    await db.AcademicPeriod.bulkCreate([
      {
        academic_period_id: 1,
        label: '1st Semester SY 2025-2026',
        school_year: '2025-2026',
        semester: '1st Semester',
        is_active: false,
        sort_order: 1,
        status: 'Closed',
        closed_at: new Date('2025-10-31T23:59:59Z'),
        start_date: '2025-06-02',
        end_date: '2025-10-25',
        classes_start: '2025-06-16',
        prelim_exam: '2025-07-18',
        midterm_exam: '2025-08-22',
        semifinal_exam: '2025-09-26',
        final_exam: '2025-10-24',
      },
      {
        academic_period_id: 2,
        label: '1st Semester SY 2026-2027',
        school_year: '2026-2027',
        semester: '1st Semester',
        is_active: true,
        sort_order: 2,
        status: 'Active',
        closed_at: null,
        start_date: '2026-06-01',
        end_date: '2026-10-30',
        classes_start: '2026-06-15',
        prelim_exam: '2026-07-17',
        midterm_exam: '2026-08-21',
        semifinal_exam: '2026-09-25',
        final_exam: '2026-10-23',
      },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 2. Unified Role Accounts (All 6 Roles)
    // ------------------------------------------------------------------
    const saltRounds = 10;
    const [
      instructorHash,
      phHash,
      libHash,
      consultantHash,
      deanHash,
      vpaaHash,
    ] = await Promise.all([
      bcrypt.hash('Instructor@2026', saltRounds),
      bcrypt.hash('ProgramHead@2026', saltRounds),
      bcrypt.hash('Library@2026', saltRounds),
      bcrypt.hash('Consultant@2026', saltRounds),
      bcrypt.hash('Dean@2026', saltRounds),
      bcrypt.hash('Vpaa@2026', saltRounds),
    ]);

    await db.User.bulkCreate([
      {
        user_id: 1,
        name: 'Monica Norton',
        email: 'monica.norton@unc.edu.ph',
        password_hash: instructorHash,
        role: 'Instructor',
        roles: ['Instructor'],
        active_role: 'Instructor',
        status: 'Active',
        is_active: true,
      },
      {
        user_id: 2,
        name: 'Olivia Vance',
        email: 'olivia.vance@unc.edu.ph',
        password_hash: phHash,
        role: 'Program Head',
        roles: ['Program Head', 'Instructor'],
        active_role: 'Program Head',
        status: 'Active',
        is_active: true,
      },
      {
        user_id: 3,
        name: 'Maria Santos',
        email: 'maria.santos@unc.edu.ph',
        password_hash: libHash,
        role: 'Director of Libraries',
        roles: ['Director of Libraries'],
        active_role: 'Director of Libraries',
        status: 'Active',
        is_active: true,
      },
      {
        user_id: 4,
        name: 'Roberto Cruz',
        email: 'roberto.cruz@unc.edu.ph',
        password_hash: consultantHash,
        role: 'Industry Consultant',
        roles: ['Industry Consultant'],
        active_role: 'Industry Consultant',
        status: 'Active',
        is_active: true,
      },
      {
        user_id: 5,
        name: 'Sophia Sterling',
        email: 'sophia.sterling@unc.edu.ph',
        password_hash: deanHash,
        role: 'Dean',
        roles: ['Dean'],
        active_role: 'Dean',
        status: 'Active',
        is_active: true,
      },
      {
        user_id: 6,
        name: 'Carlos Garcia',
        email: 'carlos.garcia@unc.edu.ph',
        password_hash: vpaaHash,
        role: 'VPAA',
        roles: ['VPAA'],
        active_role: 'VPAA',
        status: 'Active',
        is_active: true,
      },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 3. Departments
    // ------------------------------------------------------------------
    await db.Department.bulkCreate([
      { dept_id: 1, name: 'School of Business and Accountancy', code: 'SBA', dean: 'Dr. Arturo Mendoza', dean_email: 'arturo.mendoza@unc.edu.ph', stakeholder_id: null, status: 'Active', academic_period_id: 2 },
      { dept_id: 2, name: 'College of Engineering and Architecture', code: 'CEA', dean: 'Engr. Ricardo Ramos', dean_email: 'ricardo.ramos@unc.edu.ph', stakeholder_id: null, status: 'Active', academic_period_id: 2 },
      { dept_id: 3, name: 'School of Computer and Information Sciences', code: 'SCIS', dean: 'Sophia Sterling', dean_email: 'sophia.sterling@unc.edu.ph', stakeholder_id: 5, status: 'Active', academic_period_id: 2 },
      { dept_id: 4, name: 'College of Nursing', code: 'CON', dean: 'Dr. Lourdes Bautista', dean_email: 'lourdes.bautista@unc.edu.ph', stakeholder_id: null, status: 'Active', academic_period_id: 2 },
      { dept_id: 5, name: 'Criminal Justice Education', code: 'CJE', dean: 'Dr. Ramon Villanueva', dean_email: 'ramon.villanueva@unc.edu.ph', stakeholder_id: null, status: 'Active', academic_period_id: 2 },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 4. Faculty (M1 Course Assignment Roster)
    // ------------------------------------------------------------------
    await db.Faculty.bulkCreate([
      { faculty_id: 1, name: 'Monica Norton', role: 'Instructor', department: 'School of Computer and Information Sciences', department_id: 3, employment_type: 'Full-time', status: 'Active', email: 'monica.norton@unc.edu.ph', contact_number: '0917-555-0101', academic_period_id: 2 },
      { faculty_id: 2, name: 'Olivia Vance', role: 'Program Head', department: 'School of Computer and Information Sciences', department_id: 3, employment_type: 'Full-time', status: 'Active', email: 'olivia.vance@unc.edu.ph', contact_number: '0917-555-0102', academic_period_id: 2 },
      { faculty_id: 3, name: 'Sophia Sterling', role: 'Dean', department: 'School of Computer and Information Sciences', department_id: 3, employment_type: 'Full-time', status: 'Active', email: 'sophia.sterling@unc.edu.ph', contact_number: '0917-555-0105', academic_period_id: 2 },
      { faculty_id: 4, name: 'Juan Dela Cruz', role: 'Instructor', department: 'School of Computer and Information Sciences', department_id: 3, employment_type: 'Full-time', status: 'Active', email: 'juan.delacruz@unc.edu.ph', contact_number: '0917-555-0107', academic_period_id: 2 },
      { faculty_id: 5, name: 'Elena Reyes', role: 'Instructor', department: 'School of Computer and Information Sciences', department_id: 3, employment_type: 'Part-time', status: 'Active', email: 'elena.reyes@unc.edu.ph', contact_number: '0917-555-0108', academic_period_id: 2 },
    ], { transaction: t, ignoreDuplicates: true });

    // Link faculty_id on Users
    await db.User.update({ faculty_id: 1 }, { where: { user_id: 1 }, transaction: t });
    await db.User.update({ faculty_id: 2 }, { where: { user_id: 2 }, transaction: t });
    await db.User.update({ faculty_id: 3 }, { where: { user_id: 5 }, transaction: t });

    // ------------------------------------------------------------------
    // 5. Programs
    // ------------------------------------------------------------------
    await db.Program.bulkCreate([
      { program_id: 1, code: 'BSIT', name: 'Bachelor of Science in Information Technology', dept_id: 3, program_head: 'Olivia Vance', program_head_id: 2, stakeholder_id: 2, status: 'Active', academic_period_id: 2 },
      { program_id: 2, code: 'BSCS', name: 'Bachelor of Science in Computer Science', dept_id: 3, program_head: null, program_head_id: null, stakeholder_id: null, status: 'Active', academic_period_id: 2 },
      { program_id: 3, code: 'ACT', name: 'Associate in Computer Technology', dept_id: 3, program_head: null, program_head_id: null, stakeholder_id: null, status: 'Active', academic_period_id: 2 },
      { program_id: 4, code: 'BLIS', name: 'Bachelor of Library and Information Science', dept_id: 3, program_head: null, program_head_id: null, stakeholder_id: null, status: 'Active', academic_period_id: 2 },
      { program_id: 5, code: 'BSA', name: 'Bachelor of Science in Accountancy', dept_id: 1, program_head: null, program_head_id: null, stakeholder_id: null, status: 'Active', academic_period_id: 2 },
      { program_id: 6, code: 'BSCE', name: 'Bachelor of Science in Civil Engineering', dept_id: 2, program_head: null, program_head_id: null, stakeholder_id: null, status: 'Active', academic_period_id: 2 },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 6. Courses & Prerequisites (All 8 BSIT Courses from HCI Seeder)
    // ------------------------------------------------------------------
    await db.Course.bulkCreate([
      { course_id: 1, course_no: 'BIT313L', course_title: 'Human and Computer Interaction', credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Professional Courses', cmo: 'CMO No. 25 S. 2015', year_lvl: 'THIRD YEAR', prerequisites_text: 'BIT302', term: '1st Semester SY 2026-2027', semester: 1, academic_period_id: 2 },
      { course_id: 2, course_no: 'BIT302', course_title: 'Web Development II', credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Professional Courses', cmo: 'CMO No. 12 S. 2018', year_lvl: 'SECOND YEAR', prerequisites_text: 'None', term: '2nd Semester SY 2024-2025', semester: 2, academic_period_id: 2 },
      { course_id: 4, course_no: 'BIT202', course_title: 'Software Engineering', credit: '3 LEC, 0 LAB', contact_hrs: '3 Hrs Lec, 0 Hrs Lab', classification: 'Core Courses', cmo: 'CMO No. 9 S. 2017', year_lvl: 'THIRD YEAR', prerequisites_text: 'BIT205', term: '2nd Semester SY 2024-2025', semester: 2, academic_period_id: 2 },
      { course_id: 5, course_no: 'BIT203', course_title: 'Mobile Application Development', credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Elective', cmo: 'CMO No. 14 S. 2019', year_lvl: 'THIRD YEAR', prerequisites_text: 'BIT302', term: '1st Semester SY 2025-2026', semester: 1, academic_period_id: 2 },
      { course_id: 6, course_no: 'BIT204', course_title: 'Network Security', credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Professional Courses', cmo: 'CMO No. 20 S. 2020', year_lvl: 'THIRD YEAR', prerequisites_text: 'None', term: '1st Semester SY 2025-2026', semester: 1, academic_period_id: 2 },
      { course_id: 7, course_no: 'BIT205', course_title: 'Data Structures and Algorithms', credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Core Courses', cmo: 'CMO No. 7 S. 2016', year_lvl: 'SECOND YEAR', prerequisites_text: 'None', term: '2nd Semester SY 2024-2025', semester: 2, academic_period_id: 2 },
      { course_id: 8, course_no: 'BIT206', course_title: 'Introduction to Artificial Intelligence', credit: '3 LEC, 0 LAB', contact_hrs: '3 Hrs Lec, 0 Hrs Lab', classification: 'Elective', cmo: 'CMO No. 22 S. 2021', year_lvl: 'THIRD YEAR', prerequisites_text: 'BIT205', term: '2nd Semester SY 2025-2026', semester: 2, academic_period_id: 2 },
      { course_id: 9, course_no: 'BIT207', course_title: 'Web Security and Performance', credit: '2 LEC, 1 LAB', contact_hrs: '2 Hrs Lec, 3 Hrs Lab', classification: 'Elective', cmo: 'CMO No. 18 S. 2019', year_lvl: 'THIRD YEAR', prerequisites_text: 'BIT302', term: '1st Semester SY 2025-2026', semester: 1, academic_period_id: 2 },
    ], { transaction: t, ignoreDuplicates: true });

    await db.Prerequisite.bulkCreate([
      { prerequisite_id: 1, course_id: 1, prerequisite_course_id: 2 },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 7. Industry Consultants (Bridged across M1 & M3)
    // ------------------------------------------------------------------
    await db.IndustryConsultant.bulkCreate([
      {
        industry_consultant_id: 1,
        name: 'Roberto Cruz',
        email: 'roberto.cruz@unc.edu.ph',
        user_id: 4,
        assigned_course_code: 'BIT313L',
        assigned_course_id: 1,
        status: 'Active',
        academic_period_id: 2,
      },
    ], { transaction: t, ignoreDuplicates: true });

    await db.User.update({ industry_consultant_id: 1 }, { where: { user_id: 4 }, transaction: t });

    await db.ConsultantCourse.bulkCreate([
      { consultant_course_id: 1, industry_consultant_id: 1, course_id: 1, course_code: 'BIT313L' },
    ], { transaction: t, ignoreDuplicates: true });

    await db.CourseConsultant.bulkCreate([
      { course_consultant_id: 1, course_id: 1, consultant_user_id: 4, assigned_by_user_id: 2, is_active: true },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 8. Institutional Statements, Form Settings, Catalog Settings, PEOs & Deadlines
    // ------------------------------------------------------------------
    await db.UniversityStatement.bulkCreate([
      {
        university_statement_id: 1,
        vision: 'The University of Nueva Caceres, a private non-sectarian institution, is Bicol’s first university. Guided by its motto, "Non Scholae, Sed Vitae" (Not of school, but of life), and attuned to the demands of a highly dynamic global environment, the University commits itself to quality and excellent education for all to transform the youth into future-ready, globally competitive, and socially responsible leaders.',
        mission: 'To champion guided self-directed learning, industry-aligned curricula, and transformative community engagement that produce ethical, innovative, and employable graduates.',
        educational_policy: 'The University of Nueva Caceres is committed to delivering outcomes-based education aligned with CHED standards and continuous quality improvement.',
        core_values: [
          'Academic Excellence',
          'Integrity and Transparency',
          'Innovation and Future-Readiness',
          'Social Responsibility and Service',
          'Respect and Inclusivity',
        ],
        graduate_attributes: [
          'GA1: Professionally Competent and Industry-Ready',
          'GA2: Critical and Creative Problem Solver',
          'GA3: Effective Communicator and Collaborator',
          'GA4: Ethical Leader and Socially Responsible Citizen',
          'GA5: Lifelong Self-Directed Learner',
        ],
        status: 'Active',
        uploaded_by: 'Carlos Garcia',
      },
    ], { transaction: t, ignoreDuplicates: true });

    await db.DepartmentStatement.bulkCreate([
      {
        department_statement_id: 1,
        department_code: 'SCIS',
        department_name: 'School of Computer and Information Sciences',
        vision: 'To be a premier center of excellence in computing, digital innovation, and human-centered information technology education in the Bicol Region.',
        mission: 'To cultivate globally competitive, ethically grounded, and innovative computing professionals equipped with strong foundations in software engineering, human-computer interaction, and emerging technologies.',
        status: 'Active',
        uploaded_by: 'Sophia Sterling',
      },
    ], { transaction: t, ignoreDuplicates: true });

    await db.FormSetting.bulkCreate([
      { form_key: 'learning-plan', doc_control_no: 'UNC-FM-VPAA-01', revision_no: '03', effectivity: 'June 2026', updated_by_name: 'Carlos Garcia' },
      { form_key: 'syllabus', doc_control_no: 'UNC-FM-VPAA-02', revision_no: '02', effectivity: 'June 2026', updated_by_name: 'Carlos Garcia' },
      { form_key: 'coaep', doc_control_no: 'UNC-FM-VPAA-03', revision_no: '02', effectivity: 'June 2026', updated_by_name: 'Carlos Garcia' },
      { form_key: 'co-po', doc_control_no: 'UNC-FM-VPAA-04', revision_no: '01', effectivity: 'June 2026', updated_by_name: 'Carlos Garcia' },
      { form_key: 'po-peo', doc_control_no: 'UNC-FM-VPAA-05', revision_no: '01', effectivity: 'June 2026', updated_by_name: 'Carlos Garcia' },
    ], { transaction: t, ignoreDuplicates: true });

    await db.CatalogSetting.bulkCreate([
      { id: 1, recency_years: 5, enforce_recency: true, require_availability: true, updated_by_name: 'Maria Santos' },
    ], { transaction: t, ignoreDuplicates: true });

    await db.ProgramEducationalObjective.bulkCreate([
      { peo_id: 1, program_id: 1, statement: 'PEO1: Practice as competent Information Technology professionals capable of designing, developing, and managing secure and user-centered computing solutions.', mission_aligned: true },
      { peo_id: 2, program_id: 1, statement: 'PEO2: Demonstrate leadership, ethical accountability, and collaborative communication in multidisciplinary software and digital product teams.', mission_aligned: true },
      { peo_id: 3, program_id: 1, statement: 'PEO3: Engage in continuous lifelong learning, research, and emerging technology adoption to uplift organizations and local communities.', mission_aligned: true },
    ], { transaction: t, ignoreDuplicates: true });

    await db.TermDeadline.bulkCreate([
      {
        id: 1,
        program_id: 1,
        school_year: '2026-2027',
        semester: '1st Semester',
        syllabus_due: '2026-06-12',
        remind_before: '7,3,1,0',
        overdue_every: 3,
        set_by: 2,
      },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 9. ProgramOutcomes (10 Realistic BSIT Program Outcomes)
    // ------------------------------------------------------------------
    const bsitPoDescriptions = [
      'BSIT-PO1: Apply knowledge of computing, science, and mathematics appropriate to the Information Technology discipline.',
      'BSIT-PO2: Understand best practices, standards, and user-centered methodologies in software and interface engineering.',
      'BSIT-PO3: Analyze complex computing problems and identify and define the user and system requirements appropriate to their solution.',
      'BSIT-PO4: Identify and analyze user needs and take them into account in the selection, creation, evaluation, and administration of computer-based systems.',
      'BSIT-PO5: Design, implement, and evaluate computer-based systems, processes, components, or programs to meet desired needs and usability requirements.',
      'BSIT-PO6: Integrate IT-based solutions into the user environment effectively following ISO and WCAG accessibility guidelines.',
      'BSIT-PO7: Apply knowledge through the use of current techniques, skills, tools, and modern prototyping practices necessary for the IT profession.',
      'BSIT-PO8: Function effectively as a member or leader of a multidisciplinary development team recognizing distinct user and stakeholder roles.',
      'BSIT-PO9: Assist in the creation of an effective IT project plan and communicate design decisions clearly to technical and non-technical audiences.',
      'BSIT-PO10: Understand professional, ethical, legal, security, and social issues and responsibilities in computing and AI-assisted design.',
    ];

    await db.ProgramOutcome.bulkCreate(
      bsitPoDescriptions.map((description, idx) => ({
        po_id: idx + 1,
        program_id: 1,
        description,
        peo_numbers: JSON.stringify([(idx % 3) + 1]),
        ga_numbers: JSON.stringify([(idx % 5) + 1]),
      })),
      { transaction: t, ignoreDuplicates: true }
    );

    // ------------------------------------------------------------------
    // 10. References (28 HCI Curated + 2 Online Subscriptions = 30) + CourseReferences
    // ------------------------------------------------------------------
    await db.Reference.bulkCreate(
      hciReferences.map((r) => ({
        ...r,
        publication_year: r.publication_year ? new Date(r.publication_year) : null,
        created_by: 3, // Library Director Maria Santos
      })),
      { transaction: t, ignoreDuplicates: true }
    );

    await db.CourseReference.bulkCreate(
      hciReferences.map((r, idx) => ({
        id: idx + 1,
        course_id: 1,
        reference_id: r.reference_id,
        added_by: 3,
        createdAt: now,
      })),
      { transaction: t, ignoreDuplicates: true }
    );

    // ------------------------------------------------------------------
    // 11. ProgramCourseOfferings (Offering #1 Approved SY 2025-2026 + Offering #2 Active Draft SY 2026-2027)
    // ------------------------------------------------------------------
    await db.ProgramCourseOffering.bulkCreate([
      {
        pc_offering_id: 1,
        course_id: 1,
        program_id: 1,
        dept_id: 3,
        academic_period_id: 1,
        school_year: '2025-2026',
        semester: '1st Semester',
        revision_number: 1,
        base_pc_offering_id: null,
        has_modifications: false,
        is_revision_incremented: false,
        approved_at: prevTermApproved,
        course_description: hciDescription,
        createdAt: prevTermAssigned,
        updatedAt: prevTermApproved,
      },
      {
        pc_offering_id: 2,
        course_id: 1,
        program_id: 1,
        dept_id: 3,
        academic_period_id: 2,
        school_year: '2026-2027',
        semester: '1st Semester',
        revision_number: 1,
        base_pc_offering_id: 1,
        has_modifications: false,
        is_revision_incremented: false,
        approved_at: null,
        course_description: hciDescription,
        createdAt: now,
        updatedAt: now,
      },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 12. CourseOutcomes, ProgramOutcomeAlignments, IntendedLearningOutcomes, Weeks
    //     for BOTH Offering #1 (co_id 1..4, ilo_id 1..13, week_id 1..16)
    //     and Offering #2 (co_id 5..8, ilo_id 14..26, week_id 17..32)
    // ------------------------------------------------------------------
    const coRows = [];
    const poAlignRows = [];
    const iloRows = [];
    const weekRows = [];

    let poAlignId = 1;
    let iloId = 1;
    let weekId = 1;

    const offeringConfigs = [
      { pc_offering_id: 1, coStart: 1, iloStart: 1, weekStart: 1, tsCreated: prevTermAssigned, tsUpdated: prevTermApproved },
      { pc_offering_id: 2, coStart: 5, iloStart: 14, weekStart: 17, tsCreated: now, tsUpdated: now },
    ];

    for (const cfg of offeringConfigs) {
      hciCourseOutcomes.forEach((desc, idx) => {
        const co_id = cfg.coStart + idx;
        coRows.push({
          co_id,
          pc_offering_id: cfg.pc_offering_id,
          co_description: desc,
          createdAt: cfg.tsCreated,
          updatedAt: cfg.tsUpdated,
        });

        for (const align of hciPoAlignments[idx]) {
          poAlignRows.push({
            po_alignment_id: poAlignId++,
            co_id,
            po_id: align.po_id,
            attainment_level: align.level,
            createdAt: cfg.tsCreated,
            updatedAt: cfg.tsUpdated,
          });
        }

        for (let w = 0; w < 4; w++) {
          weekRows.push({
            week_id: weekId++,
            co_id,
            hours: 5.0,
            createdAt: cfg.tsCreated,
            updatedAt: cfg.tsUpdated,
          });
        }
      });

      hciIloTemplates.forEach((tpl) => {
        iloRows.push({
          ilo_id: iloId++,
          co_id: cfg.coStart + tpl.coIdx,
          description: tpl.description,
          hours: tpl.hours,
          weeks: tpl.weeks,
          assessment_tool: tpl.assessment_tool,
          is_orientation: tpl.is_orientation,
          prelim_weight: tpl.prelim_weight,
          midterm_weight: tpl.midterm_weight,
          semi_weight: tpl.semi_weight,
          final_weight: tpl.final_weight,
          target: tpl.target,
          ied_level: tpl.ied_level,
          target_students_percent: 90,
          target_score_percent: 60,
          createdAt: cfg.tsCreated,
          updatedAt: cfg.tsUpdated,
        });
      });
    }

    await db.CourseOutcome.bulkCreate(coRows, { transaction: t, ignoreDuplicates: true });
    await db.ProgramOutcomeAlignment.bulkCreate(poAlignRows, { transaction: t, ignoreDuplicates: true });
    await db.IntendedLearningOutcome.bulkCreate(iloRows, { transaction: t, ignoreDuplicates: true });
    await db.Week.bulkCreate(weekRows, { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 13. Weekly Content (Topics, Subtopics, TLAs, TLAAssessments, WeeklyReferences)
    //     Seeded ONLY for Offering #1 (Approved Baseline SY 2025-2026).
    //     Offering #2 (Active Draft SY 2026-2027, base_pc_offering_id = 1) starts with
    //     empty weekly content (blank slate) while retaining Offering #1 as its prior
    //     approved baseline so "Import Previous" loads previous term content on demand.
    // ------------------------------------------------------------------
    const topicsToInsert = [];
    const subtopicsToInsert = [];
    const tlasToInsert = [];
    const tlaAssessmentsToInsert = [];
    const weeklyRefsToInsert = [];

    let topicIdCounter = 1;
    let subtopicIdCounter = 1;
    let tlaIdCounter = 1;
    let methodIdCounter = 1;
    let wrIdCounter = 1;

    const baselineCfg = offeringConfigs[0];

    // Weekly References (Offering #1 only — supports both { refId, is_orientation } objects and plain numeric ref IDs)
    for (let wIdx = 0; wIdx < 16; wIdx++) {
      const currentWeekId = baselineCfg.weekStart + wIdx;
      const refEntries = weeklyReferencePairs[wIdx] || [];
      for (const entry of refEntries) {
        const refId = typeof entry === 'object' && entry !== null ? entry.refId : entry;
        const isOrientation = typeof entry === 'object' && entry !== null ? Boolean(entry.is_orientation) : false;
        weeklyRefsToInsert.push({
          weekly_reference_id: wrIdCounter++,
          week_id: currentWeekId,
          reference_id: refId,
          is_orientation: isOrientation,
          createdAt: baselineCfg.tsCreated,
          updatedAt: baselineCfg.tsUpdated,
        });
      }
    }

    // Topics & Subtopics (Offering #1 only)
    for (const weekBlock of weeklyCurriculum) {
      const currentWeekId = baselineCfg.weekStart + weekBlock.weekIdx;
      for (const topicObj of weekBlock.topics) {
        const currentTopicId = topicIdCounter++;

        topicsToInsert.push({
          topic_id: currentTopicId,
          course_id: 1,
          parent_topic_id: null,
          title: topicObj.title,
          createdAt: baselineCfg.tsCreated,
          updatedAt: baselineCfg.tsUpdated,
        });

        topicObj.subtopics.forEach((subItem, idx) => {
          const currentSubId = subtopicIdCounter++;

          subtopicsToInsert.push({
            subtopic_id: currentSubId,
            week_id: currentWeekId,
            topic_id: currentTopicId,
            parent_subtopic_id: null,
            title: subItem.title,
            sequence_order: idx + 1,
            is_orientation: Boolean(topicObj.is_orientation),
            estimated_minutes: subItem.minutes || 50,
            createdAt: baselineCfg.tsCreated,
            updatedAt: baselineCfg.tsUpdated,
          });
        });
      }
    }

    // TLAs & Assessments (Offering #1 only)
    for (const weekData of weeklyTlasAndAssessments) {
      const currentWeekId = baselineCfg.weekStart + weekData.weekIdx;
      const currentWeekTlaIds = [];

      for (const tlaObj of weekData.tlas) {
        const currentTlaId = tlaIdCounter++;
        currentWeekTlaIds.push(currentTlaId);
        tlasToInsert.push({
          tla_id: currentTlaId,
          week_id: currentWeekId,
          tla_name: tlaObj.name,
          description: tlaObj.desc,
          performed_by: tlaObj.by,
          class_phase: tlaObj.phase,
          is_lab: Boolean(tlaObj.lab),
          is_orientation: Boolean(tlaObj.is_orientation),
          createdAt: baselineCfg.tsCreated,
          updatedAt: baselineCfg.tsUpdated,
        });
      }

      for (const assessObj of weekData.assessments) {
        const targetTlaId = currentWeekTlaIds[assessObj.tlaIdx];
        const mappedIloId = assessObj.iloIdx != null ? baselineCfg.iloStart + assessObj.iloIdx : null;
        tlaAssessmentsToInsert.push({
          method_id: methodIdCounter++,
          tla_id: targetTlaId,
          ilo_id: mappedIloId,
          name: assessObj.name,
          description: assessObj.desc,
          period: weekData.period,
          weight: assessObj.weight,
          min_passing: 60,
          createdAt: baselineCfg.tsCreated,
          updatedAt: baselineCfg.tsUpdated,
        });
      }
    }

    await db.WeeklyReference.bulkCreate(weeklyRefsToInsert, { transaction: t, ignoreDuplicates: true });
    await db.Topic.bulkCreate(topicsToInsert, { transaction: t, ignoreDuplicates: true });
    await db.Subtopic.bulkCreate(subtopicsToInsert, { transaction: t, ignoreDuplicates: true });
    await db.TeachingAndLearningActivity.bulkCreate(tlasToInsert, { transaction: t, ignoreDuplicates: true });
    await db.TLAAssessment.bulkCreate(tlaAssessmentsToInsert, { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 14. CourseOfferingAssignments & AssignmentWorkflowLogs
    // ------------------------------------------------------------------
    await db.CourseOfferingAssignment.bulkCreate([
      {
        co_assign_id: 1,
        pc_offering_id: 1,
        course_id: 1,
        program_id: 1,
        academic_period_id: 1,
        course_code: 'BIT313L',
        course_name: 'Human and Computer Interaction',
        year_level: 'THIRD YEAR',
        stakeholder_id: 1,
        faculty_id: 1,
        faculty_name: 'Monica Norton',
        contributors: [],
        sections: ['BSIT 3A', 'BSIT 3B'],
        status: 'Active',
        date_assigned: prevTermAssigned,
        date_submitted: prevTermSubmitted,
        date_updated: prevTermApproved,
        createdAt: prevTermAssigned,
        updatedAt: prevTermApproved,
      },
      {
        co_assign_id: 2,
        pc_offering_id: 2,
        course_id: 1,
        program_id: 1,
        academic_period_id: 2,
        course_code: 'BIT313L',
        course_name: 'Human and Computer Interaction',
        year_level: 'THIRD YEAR',
        stakeholder_id: 1,
        faculty_id: 1,
        faculty_name: 'Monica Norton',
        contributors: ['Juan Dela Cruz'],
        sections: ['BSIT 3A', 'BSIT 3B'],
        status: 'Active',
        date_assigned: new Date('2026-06-01T08:00:00Z'),
        date_submitted: null,
        date_updated: null,
        createdAt: now,
        updatedAt: now,
      },
    ], { transaction: t, ignoreDuplicates: true });

    await db.AssignmentWorkflowLog.bulkCreate([
      // Offering #1 full historical approval chain
      { log_id: 1, co_assign_id: 1, stakeholder_id: '2', actor_user_id: 2, actor_name: 'Olivia Vance', actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', is_viewed: true, createdAt: prevTermAssigned, updatedAt: prevTermAssigned },
      { log_id: 2, co_assign_id: 1, stakeholder_id: '1', actor_user_id: 1, actor_name: 'Monica Norton', actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', is_viewed: true, createdAt: prevTermSubmitted, updatedAt: prevTermSubmitted },
      { log_id: 3, co_assign_id: 1, stakeholder_id: '3', actor_user_id: 3, actor_name: 'Maria Santos', actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', is_viewed: true, createdAt: new Date('2025-06-11T10:00:00Z'), updatedAt: new Date('2025-06-11T10:00:00Z') },
      { log_id: 4, co_assign_id: 1, stakeholder_id: '2', actor_user_id: 2, actor_name: 'Olivia Vance', actor_role: 'PROGRAM_HEAD', action_type: 'ACCEPTED', is_viewed: true, createdAt: new Date('2025-06-12T14:00:00Z'), updatedAt: new Date('2025-06-12T14:00:00Z') },
      { log_id: 5, co_assign_id: 1, stakeholder_id: '5', actor_user_id: 5, actor_name: 'Sophia Sterling', actor_role: 'DEAN', action_type: 'ACCEPTED', is_viewed: true, createdAt: prevTermApproved, updatedAt: prevTermApproved },
      // Offering #2 initial assignment log
      { log_id: 6, co_assign_id: 2, stakeholder_id: '2', actor_user_id: 2, actor_name: 'Olivia Vance', actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', is_viewed: false, createdAt: now, updatedAt: now },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 15. Seeded CourseDocuments (COAEP + CO-PO metadata records for Offering #2)
    // ------------------------------------------------------------------
    const coaepParsedJson = JSON.stringify({
      course_no: 'BIT313L',
      course_title: 'Human and Computer Interaction',
      course_outcomes: hciCourseOutcomes.map((desc, idx) => ({
        code: `CO${idx + 1}`,
        description: desc,
        ilos: hciIloTemplates
          .filter((item) => item.coIdx === idx)
          .map((item) => ({
            description: item.description,
            is_orientation: item.is_orientation,
            assessment_tool: item.assessment_tool,
            prelim_weight: item.prelim_weight,
            midterm_weight: item.midterm_weight,
            semi_weight: item.semi_weight,
            final_weight: item.final_weight,
            target: item.target,
            ied_level: item.ied_level,
          })),
      })),
    });

    await db.CourseDocument.bulkCreate([
      {
        course_document_id: 1,
        pc_offering_id: 2,
        kind: 'coaep',
        file_name: 'BIT313L_HCI_COAEP_2026.json',
        content_type: 'application/json',
        data: Buffer.from(coaepParsedJson, 'utf8'),
        parsed_json: coaepParsedJson,
        uploaded_by: 2,
        updatedAt: now,
      },
      {
        course_document_id: 2,
        pc_offering_id: 2,
        kind: 'co-po',
        file_name: 'BIT313L_HCI_CO_PO_2026.json',
        content_type: 'application/json',
        data: Buffer.from(JSON.stringify({ course_no: 'BIT313L', alignments: hciPoAlignments }), 'utf8'),
        parsed_json: JSON.stringify({ course_no: 'BIT313L', alignments: hciPoAlignments }),
        uploaded_by: 2,
        updatedAt: now,
      },
    ], { transaction: t, ignoreDuplicates: true });

    // Initial welcome notification for Instructor Monica Norton
    await db.Notification.bulkCreate([
      {
        id: 1,
        recipient_user_id: 1,
        academic_period_id: 2,
        type: 'assignment',
        title: 'Course Assigned: BIT313L',
        message: 'Program Head Olivia Vance assigned you as Lead Instructor for BIT313L — Human and Computer Interaction (1st Semester SY 2026-2027).',
        link: '/courses/2/1/draft',
        offering_id: 2,
        actor_role: 'PROGRAM_HEAD',
        sent_by_account_id: 2,
        is_read: false,
        created_at: now,
      },
    ], { transaction: t, ignoreDuplicates: true });

    // ------------------------------------------------------------------
    // 16. Standardized OOP (BIT213L) Approved Rev 1 (SY 2025-2026) & Rev 2 (SY 2026-2027)
    // ------------------------------------------------------------------
    await seedOopRevisions(t);
  });

  console.log('[db:seed] Successfully seeded unified UNC-LPMS database (6 roles, 2 periods, 5 depts, 6 programs, 9 courses, HCI BIT313L Approved baseline + Draft, and OOP BIT213L Approved Rev 1 & Rev 2).');
  return { skipped: false };
}

if (require.main === module) {
  seedIntegratedMaster()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[db:seed] Failed:', err);
      process.exit(1);
    });
}

module.exports = { seedIntegratedMaster };
