'use strict';

// The SCIS programs' PEOs and POs as the University publishes them (unc.edu.ph, School of Computer & Information
// Sciences, "Program Educational Objectives" / "Program Outcomes"), in place of the foundation seeder's placeholder
// BSIT outcomes, so every program's documents are complete before a plan is started (utils/programReadiness.js).
//
// Which PO supports which PEO, and which graduate attributes (1 EC, 2 CL, 3 ERC, 4 LL) it builds, is not on the
// website. BSIT and BSCS carry the official ticks (`links`, one [PEOs, GAs] per PO): BSIT from UNC's Syllabus
// TEMPLATE.docx, BSCS from the Enhanced Syllabus [BSCS] MATH311L. ACT and BLIS have no source yet, so theirs are a
// reading of the statements (DEMO ONLY, `peosFor` below, no GAs); the Program Head sets them in Program Documents.
//
// BSIT keeps its PO rows in order (po_id order is the PO number, and the demo plans' CO-PO marks point at them):
// the first ten are reworded, the rest added.

const PEO = (career) => [
    `Utilize competently the acquired technical and non-technical skills in practicing a career in ${career}.`,
    `Advance one's skills in ${career} through the acquisition of best and timely practices, as supported by the foundational skills acquired.`,
    `Become a globally-competitive ${career} practitioner, through the aid of continuing education and gain leadership responsibilities, as guided by the university and the college's core values.`,
];

const PROGRAMS = {
    'Bachelor of Science in Information Technology': {
        peos: PEO('Information Technology'),
        pos: [
            'Apply knowledge in computing, science, and mathematics in developing IT solutions.',
            'Apply best practices and standards in developing IT solutions.',
            'Define the computing requirements appropriate to the solution of a complex problem.',
            'Analyze user needs in the selection, creation, evaluation and administration of computer-based systems.',
            'Develop IT solutions to meet the needs and requirements under various constraints.',
            'Integrate IT-based solutions into the user environment.',
            'Apply knowledge through the use of current techniques, skills, tools, and practices necessary for the IT profession.',
            'Function effectively as a member or leader of the development team recognizing the different roles to accomplish a common goal.',
            'Provide technical assistance in the creation of an effective IT project plan.',
            'Communicate effectively, both oral and written, with the computing community and society.',
            'Analyze the local and global impact of computing information technology on individuals, organization and society.',
            'Apply appropriate professional, ethical, and legal practices in the utilization of information technology.',
            'Develop the skills needed to engage in independent and lifelong learning.',
        ],
        links: [
            [[1, 2], [2, 3, 4]], [[1, 2], [3, 4]], [[1, 2], [2, 3, 4]], [[1, 2], [2, 3, 4]], [[1, 2, 3], [2, 3]],
            [[1, 2, 3], [2, 3, 4]], [[1, 3], [1, 2, 3, 4]], [[1, 3], [1, 2, 3]], [[1, 3], [1, 3]], [[1, 2, 3], [1, 2, 3, 4]],
            [[2, 3], [2, 3, 4]], [[1, 2, 3], [1, 2, 3]], [[2, 3], [2, 4]],
        ],
    },
    'Bachelor of Science in Computer Science': {
        peos: [
            'Utilize competently the acquired technical and non-technical skills in practicing a career in Computing Science.',
            "Advance one's Computing skills through the acquisition of best and timely practices, as supported by the foundational skills acquired in Computer Science education.",
            "Become a globally-competitive practitioner of computer science, through the aid of continuing education and gain leadership responsibilities, as guided by the university and the college's core values.",
        ],
        pos: [
            'Apply knowledge of computing fundamentals, specialization, and domain knowledge in the conceptualization of computing solutions from defined problems and requirements.',
            'Formulate solutions for complex computing problems and requirements using fundamental principles of mathematics, computing sciences, and relevant domain principles based on literature.',
            'Apply mathematical foundation, algorithmic principles, and computing theories in the modeling and design of computing solutions.',
            'Identify the information security issues in relation to the design and development of computer-based systems.',
            'Develop solutions for complex computing problems to meet specified needs with appropriate consideration to cultural, societal, and environmental considerations.',
            'Apply appropriate techniques, resources, and modern computing tools to solve complex computing activities.',
            'Function effectively as a member or leader of the development team recognizing the different roles to accomplish a common goal.',
            'Communicate effectively, both oral and written, with the computing community and society.',
            'Apply appropriate professional, ethical, and legal practices in the utilization of computer technology.',
            'Develop the skills needed to engage in independent and lifelong learning.',
        ],
        links: [
            [[1, 2], [2, 3, 4]], [[1, 2], [2, 3, 4]], [[1, 2], [1, 2, 3, 4]], [[1, 2], [1, 3, 4]], [[1, 2, 3], [2, 3, 4]],
            [[1, 2, 3], [1, 2, 3, 4]], [[1, 3], [1, 2, 3]], [[1, 3], [1, 2, 3]], [[1, 3], [1, 2, 3, 4]], [[1, 2, 3], [2, 3, 4]],
        ],
    },
    'Associate in Computer Technology': {
        peos: PEO('Computer Technology'),
        pos: [
            'Recognize the need, and have the ability, to engage in independent learning for continual development as a computing professional.',
            'Effectively communicate orally and in writing using both English and Filipino.',
            'Work effectively either independently or as a member of a team.',
            'Act in recognition of professional, social, and ethical responsibility.',
            'Preserve and promote "Filipino historical and cultural heritage" (based on RA 7722).',
            'Assist in analyzing complex problems.',
            'Apply modern computing technologies to solve problems.',
            'Develop computing solutions.',
        ],
    },
    'Bachelor of Library and Information Science': {
        peos: [
            'Utilize competently the acquired technical and non-technical skills in practicing a career in Library Information Science.',
            "Advance one's skills in Library Information Science through the acquisition of best and timely practices, as supported by the foundational skills acquired.",
            "Become a globally-competitive librarian through the aid of continuing education and by gaining leadership responsibilities as guided by the university and the college's core values.",
        ],
        pos: [
            'Select, evaluate, organize, and disseminate print, multimedia, electronic and digital information resources.',
            'Communicate effectively, both oral and written, using appropriate levels of discourse.',
            'Demonstrate logical and systematic approaches to the accomplishment of tasks.',
            'Formulate objectives, policies and processes as well as design and manage resources in anticipation of future educational or organizational changes.',
            'Propose effective library information science-based solutions appropriate to identified problems and requirements.',
            'Identify the information needs of the users to be able to evaluate and improve the practices and services of the library.',
            'Work well in groups and seek ways to build team efforts toward solving problems and achieving common goals.',
            'Determine the different library automation systems and the use of computer hardware, software, and peripherals for library use.',
            'Develop information technology solutions for libraries.',
            'Conduct significant research projects that will benefit the library and the organization.',
            'Evaluate information policy and ethical issues applicable in local, national or global context.',
            'Participate in continuing education activities organized by library associations and other entities.',
        ],
    },
};

// The demo PO-to-PEO links for programs without official ones (see the note at the top).
const peosFor = (text) => [
    1,
    /lifelong|independent learning|continual|continuing education|best practices|current techniques|modern computing|research/i.test(text) && 2,
    /leader|team|groups|communicat|ethic|global|societ|professional|heritage/i.test(text) && 3,
].filter(Boolean);

module.exports = {
    async up(queryInterface) {
        const { sequelize } = queryInterface;
        const select = (sql, replacements = []) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
        const now = new Date();
        for (const [name, data] of Object.entries(PROGRAMS)) {
            const [program] = await select('SELECT program_id FROM Programs WHERE name = ?', [name]);
            if (!program) continue;
            const id = program.program_id;

            await queryInterface.bulkDelete('ProgramEducationalObjectives', { program_id: id }, {});
            await queryInterface.bulkInsert('ProgramEducationalObjectives',
                data.peos.map(statement => ({ program_id: id, statement, mission_aligned: true, createdAt: now, updatedAt: now })), {});

            const existing = await select('SELECT po_id FROM ProgramOutcomes WHERE program_id = ? ORDER BY po_id', [id]);
            for (const [index, text] of data.pos.entries()) {
                const [peos, gas] = data.links ? data.links[index] : [peosFor(text), []];
                const fields = { description: text, peo_numbers: JSON.stringify(peos), ga_numbers: JSON.stringify(gas), updatedAt: now };
                if (existing[index]) await queryInterface.bulkUpdate('ProgramOutcomes', fields, { po_id: existing[index].po_id });
                else await queryInterface.bulkInsert('ProgramOutcomes', [{ program_id: id, ...fields, createdAt: now }], {});
            }
        }
    },

    async down() {
        // Demo data only; undo by re-seeding.
    }
};
