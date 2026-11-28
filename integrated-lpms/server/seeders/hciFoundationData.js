'use strict';

/**
 * Authoritative HCI (BIT313L) Learning Plan Foundational Dataset
 * Migrated verbatim from Composition module's authoritative seeder:
 *   20260512030000-seed-composition-foundation.js
 * Self-contained inside integrated-lpms/server/seeders/ (zero dependency on _ref_sources/).
 */

const hciDescription = `This course explores the principles and practices of Human-Computer Interaction (HCI), focusing on how people engage with digital systems and how to design technology that enhances user experience.

Students will examine user-centered design methodologies, usability principles, interaction design processes, and evaluation techniques. The course also emphasizes the integration of emerging technologies for software product design (UI/UX), equipping students with insights into modern tools and trends that shape interactive systems.

Through lectures, hands-on projects, and usability testing, learners will develop practical skills in designing intuitive and user-friendly interfaces that address real human needs. Drawing from foundational theories in psychology, design, and computer science, this course prepares students to create digital products that are both functional and forward-thinking, aligning with current and future developments in UI/UX design.`;

const hciCourseOutcomes = [
  'CO1: Implement the core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing User Interface (UI) design for a software application.',
  'CO2: Create User Experience (UX) designs for software applications by employing the User-Centered Design (UCD) process and integrating ISO 9241-210 standards',
  'CO3: Develop a Front-End Prototype for the proposed software application that follows HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines',
  'CO4: Defend the front-end prototype through usability testing and evaluation in UI/UX design.',
];

// CO index (0..3) -> PO alignments [{ po_id, level }]
const hciPoAlignments = [
  [{ po_id: 2, level: 'I' }, { po_id: 5, level: 'E' }, { po_id: 9, level: 'D' }],
  [{ po_id: 3, level: 'E' }, { po_id: 6, level: 'I' }, { po_id: 10, level: 'D' }],
  [{ po_id: 4, level: 'D' }, { po_id: 1, level: 'I' }, { po_id: 7, level: 'E' }],
  [{ po_id: 2, level: 'I' }, { po_id: 8, level: 'E' }, { po_id: 5, level: 'D' }],
];

// 13 ILOs per offering (index 0..12): coIdx 0 has 4 (1 orientation + 3 graded), coIdx 1..3 have 3 each
const hciIloTemplates = [
  // CO1 (Prelim)
  {
    coIdx: 0,
    description: "Cite the value and relevance of the University's and the College's VMO as related to the course",
    is_orientation: true,
    assessment_tool: null,
    prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 0,
    target: '60', ied_level: 'I', hours: 2, weeks: 0.4,
  },
  {
    coIdx: 0,
    description: 'Distinguish the core concepts, principles, and theories in designing user interfaces.',
    is_orientation: false,
    assessment_tool: 'Objective Type Quiz',
    prelim_weight: 20, midterm_weight: 0, semi_weight: 0, final_weight: 0,
    target: '60', ied_level: 'I', hours: 6, weeks: 1.2,
  },
  {
    coIdx: 0,
    description: 'Determine how to use design tools proficiently in creating and refining user interface elements.',
    is_orientation: false,
    assessment_tool: 'Objective Type Activity (Figma)',
    prelim_weight: 30, midterm_weight: 0, semi_weight: 0, final_weight: 0,
    target: '60', ied_level: 'E', hours: 6, weeks: 1.2,
  },
  {
    coIdx: 0,
    description: 'Propose a comprehensive User Interface (UI) design for a specified software application by applying the core HCI concepts, theories, and principles.',
    is_orientation: false,
    assessment_tool: 'UI Design Proposal',
    prelim_weight: 50, midterm_weight: 0, semi_weight: 0, final_weight: 0,
    target: '60', ied_level: 'D', hours: 6, weeks: 1.2,
  },
  // CO2 (Midterm)
  {
    coIdx: 1,
    description: 'Distinguish user research methodologies, user personas, and user-centered design (UCD) process frameworks.',
    is_orientation: false,
    assessment_tool: 'Objective Type Quiz (UCD)',
    prelim_weight: 0, midterm_weight: 20, semi_weight: 0, final_weight: 0,
    target: '60', ied_level: 'I', hours: 6, weeks: 1.2,
  },
  {
    coIdx: 1,
    description: 'Determine how to build structurally-sound wireframes and layout compositions based on usability conventions.',
    is_orientation: false,
    assessment_tool: 'UCD Process Document',
    prelim_weight: 0, midterm_weight: 30, semi_weight: 0, final_weight: 0,
    target: '60', ied_level: 'E', hours: 7, weeks: 1.4,
  },
  {
    coIdx: 1,
    description: 'Propose a cohesive User Experience (UX) wireframe package and user journey framework applying standard UCD principles.',
    is_orientation: false,
    assessment_tool: 'UI/UX Design Presentation',
    prelim_weight: 0, midterm_weight: 50, semi_weight: 0, final_weight: 0,
    target: '60', ied_level: 'D', hours: 7, weeks: 1.4,
  },
  // CO3 (Semifinal)
  {
    coIdx: 2,
    description: 'Distinguish dynamic visual architectures, advanced component patterns, and global accessibility standards.',
    is_orientation: false,
    assessment_tool: 'Objective Type Quiz (UX laws and Accessibility Standards)',
    prelim_weight: 0, midterm_weight: 0, semi_weight: 20, final_weight: 0,
    target: '60', ied_level: 'I', hours: 6, weeks: 1.2,
  },
  {
    coIdx: 2,
    description: 'Determine how to implement screen reader and keyboard navigation considerations in interactive prototype elements.',
    is_orientation: false,
    assessment_tool: 'UI/UX Design Implementation Document',
    prelim_weight: 0, midterm_weight: 0, semi_weight: 30, final_weight: 0,
    target: '60', ied_level: 'E', hours: 7, weeks: 1.4,
  },
  {
    coIdx: 2,
    description: 'Propose a fully-interactive high-fidelity mockup with micro-interactions, conforming to WCAG 2.1 regulatory standards.',
    is_orientation: false,
    assessment_tool: 'Front-end Code Presentation',
    prelim_weight: 0, midterm_weight: 0, semi_weight: 50, final_weight: 0,
    target: '60', ied_level: 'D', hours: 7, weeks: 1.4,
  },
  // CO4 (Final)
  {
    coIdx: 3,
    description: 'Distinguish qualitative and quantitative usability metrics, testing methodologies, and analytical protocols.',
    is_orientation: false,
    assessment_tool: 'Objective type Quiz (Usability Testing)',
    prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 20,
    target: '60', ied_level: 'I', hours: 6, weeks: 1.2,
  },
  {
    coIdx: 3,
    description: 'Determine how to analyze user performance data, time-on-task, and error rates from moderated evaluative tests.',
    is_orientation: false,
    assessment_tool: 'Prototype Evaluation Document',
    prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 30,
    target: '60', ied_level: 'E', hours: 7, weeks: 1.4,
  },
  {
    coIdx: 3,
    description: 'Propose a comprehensive Usability Evaluation and Design Handoff Report backed by empirical testing feedback.',
    is_orientation: false,
    assessment_tool: 'Front-End Prototype Presentation',
    prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 50,
    target: '60', ied_level: 'D', hours: 7, weeks: 1.4,
  },
];

// 28 original HCI references + 2 Online Subscriptions samples (total 30)
const hciReferences = [
  // TEXTBOOKS
  { reference_id: 1, course_id: 1, course_no: 'BIT313L', title: 'HCI Models, Theories, and Frameworks: Toward a Multidisciplinary Science', author: 'John M. Carroll', isbn: '978-1-55860-808-5', link: null, publisher: 'Morgan Kaufmann', publication_year: '2003-01-01', copies: 3, status: 'available', type: 'Textbook' },
  { reference_id: 2, course_id: 1, course_no: 'BIT313L', title: 'Learn Human-Computer Interaction: Fundamentals of UX/UI Design', author: 'Christopher Reid', isbn: '978-1-83882-032-9', link: null, publisher: 'Packt Publishing', publication_year: '2020-01-01', copies: 5, status: 'available', type: 'Textbook' },
  { reference_id: 3, course_id: 1, course_no: 'BIT313L', title: 'Usability Testing Essentials: Ready, Set... Test!', author: 'Carol M. Barnum', isbn: '978-0-12-375092-1', link: null, publisher: 'Morgan Kaufmann', publication_year: '2010-01-01', copies: 4, status: 'available', type: 'Textbook' },
  { reference_id: 4, course_id: 1, course_no: 'BIT313L', title: 'UX Design with Figma: User-Centered Interface Design and Prototyping with Figma', author: 'Tom Green & Kevin Golsby', isbn: '978-1-80181-424-9', link: null, publisher: 'Packt Publishing', publication_year: '2024-01-01', copies: 6, status: 'available', type: 'Textbook' },
  { reference_id: 5, course_id: 1, course_no: 'BIT313L', title: 'Web Accessibility: Web Standards and Regulatory Compliance', author: 'Jim Thatcher & Michael R. Burks', isbn: '978-1-59059-638-8', link: null, publisher: 'Apress', publication_year: '2006-01-01', copies: 2, status: 'available', type: 'Textbook' },

  // ONLINE RESOURCES
  { reference_id: 6, course_id: 1, course_no: 'BIT313L', title: 'Beyond Vibe-Coding: Systems-Level Interface Engineering', author: 'Addy Osmani', isbn: null, link: 'https://addyosmani.com/blog/software-engineering-ui', publisher: 'Web.dev / Personal Publication', publication_year: null, copies: null, status: 'available', type: 'Online Resources' },
  { reference_id: 7, course_id: 1, course_no: 'BIT313L', title: 'UX Design Principles & Interactive Patterns Guide', author: 'UXcel Platform Authors', isbn: null, link: 'https://app.uxcel.com/courses/ux-design-principles', publisher: 'UXcel', publication_year: null, copies: null, status: 'available', type: 'Online Resources' },
  { reference_id: 8, course_id: 1, course_no: 'BIT313L', title: 'Color Theory and Contrast Foundations in Digital Interfaces', author: 'Eric Hibit', isbn: null, link: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html', publisher: 'W3C WAI', publication_year: null, copies: null, status: 'available', type: 'Online Resources' },
  { reference_id: 9, course_id: 1, course_no: 'BIT313L', title: 'Universal Principles of Typography and Screen Readability', author: 'Elliot Jay Stocks', isbn: null, link: 'https://elliotjaystocks.com/typography-principles', publisher: 'Google Fonts Knowledge', publication_year: null, copies: null, status: 'available', type: 'Online Resources' },
  { reference_id: 10, course_id: 1, course_no: 'BIT313L', title: 'Atomic Design Methodology & Modular Component Architecture', author: 'Brad Frost', isbn: null, link: 'https://atomicdesign.bradfrost.com/chapter-2/', publisher: 'Brad Frost', publication_year: null, copies: null, status: 'available', type: 'Online Resources' },
  { reference_id: 11, course_id: 1, course_no: 'BIT313L', title: 'Guide to Developer Handoff and Design System Specifications', author: 'Figma Engineering Team', isbn: null, link: 'https://help.figma.com/hc/en-us/articles/360040000000-Developer-handoff-guide', publisher: 'Figma', publication_year: null, copies: null, status: 'available', type: 'Online Resources' },

  // OPEN EDUCATIONAL RESOURCES
  { reference_id: 12, course_id: 1, course_no: 'BIT313L', title: 'ISO 9241-210:2019 Ergonomics of Human-System Interaction', author: 'International Organization for Standardization', isbn: '978-92-67-10998-5', link: 'https://www.iso.org/standard/77520.html', publisher: 'ISO', publication_year: '2019-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 13, course_id: 1, course_no: 'BIT313L', title: 'Core UI Principles & Micro-Interaction Guidelines', author: 'Figma Education Collective', isbn: '978-0-9991234-1-8', link: 'https://help.figma.com/hc/en-us/articles/ui-design-fundamentals', publisher: 'Figma Education', publication_year: '2021-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 14, course_id: 1, course_no: 'BIT313L', title: 'Visual Imagery, Iconography, and Graphic Systems in UX', author: 'Interaction Design Open Library', isbn: '978-1-987654-32-1', link: 'https://www.interaction-design.org/literature/topics/icon-design', publisher: 'IxDF', publication_year: '2021-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 15, course_id: 1, course_no: 'BIT313L', title: 'Material Design 3 Guidelines: Adaptive Components & Theming', author: 'Google Material Design Team', isbn: '978-0-07-889901-2', link: 'https://m3.material.io/foundations', publisher: 'Google', publication_year: '2022-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 16, course_id: 1, course_no: 'BIT313L', title: 'Design Composition, Grid Systems, and Spatial Layouts', author: 'Open Design Project & 99designs Authors', isbn: '978-1-59253-123-4', link: 'https://99designs.com/blog/design-history-movements/layout-design-principles/', publisher: 'Open Design Project', publication_year: '2020-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 17, course_id: 1, course_no: 'BIT313L', title: 'Open UX Case Studies and Evidence-Based Usability Evaluations', author: 'Interaction Design Foundation', isbn: '978-87-92964-00-7', link: 'https://www.interaction-design.org/literature/topics/usability-evaluation', publisher: 'IxDF', publication_year: '2022-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 18, course_id: 1, course_no: 'BIT313L', title: 'Introduction to Generative AI in Interface Prototyping', author: 'Google Cloud Education Services', isbn: '978-1-4920-7711-4', link: 'https://www.cloudskillsboost.google/course_templates/536', publisher: 'Google Cloud', publication_year: '2023-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 19, course_id: 1, course_no: 'BIT313L', title: 'UXPilot: AI-Assisted User Experience Wireframing and Synthesis', author: 'UXPilot Open Research Lab', isbn: '978-9-1983053-2-6', link: 'https://uxpilot.ai/docs/research-methods', publisher: 'UXPilot', publication_year: '2024-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 20, course_id: 1, course_no: 'BIT313L', title: 'The AI-Driven Product Designer: Generative Workflows in UI/UX', author: 'LinkedIn Learning Open Hub & Chris Nodder', isbn: '978-1-4919-6234-8', link: 'https://www.linkedin.com/learning/ai-for-product-designers', publisher: 'LinkedIn Learning', publication_year: '2024-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 21, course_id: 1, course_no: 'BIT313L', title: 'Using Artificial Intelligence Across the User-Centered Design Process', author: 'LinkedIn Learning UX Track & Amanda Stockwell', isbn: '978-1-4919-8901-7', link: 'https://www.linkedin.com/learning/ai-in-ux-design', publisher: 'LinkedIn Learning', publication_year: '2024-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 22, course_id: 1, course_no: 'BIT313L', title: 'Quantitative and Qualitative UX Research Methods with Intelligent Assist', author: 'LinkedIn Learning & Cory Lebson', isbn: '978-1-4919-4321-9', link: 'https://www.linkedin.com/learning/ux-design-research', publisher: 'LinkedIn Learning', publication_year: '2024-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 23, course_id: 1, course_no: 'BIT313L', title: 'Practical AI Tools for Interface Design, Accessibility, and Design Tokens', author: 'LinkedIn Learning & Nick Babich', isbn: '978-1-4919-5432-8', link: 'https://www.linkedin.com/learning/ai-tools-for-designers', publisher: 'LinkedIn Learning', publication_year: '2024-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 24, course_id: 1, course_no: 'BIT313L', title: 'Design Thinking in the Age of Generative AI: Human-in-the-Loop Ideation', author: 'LinkedIn Learning Design Institute', isbn: '978-1-4919-7654-2', link: 'https://www.linkedin.com/learning/design-thinking-age-of-ai', publisher: 'LinkedIn Learning', publication_year: '2024-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 25, course_id: 1, course_no: 'BIT313L', title: 'Ethical, Human-Centric AI Design Frameworks and Dark Pattern Prevention', author: 'LinkedIn Learning & Kat Holmes', isbn: '978-1-4919-9876-5', link: 'https://www.linkedin.com/learning/ethical-human-centric-ai', publisher: 'LinkedIn Learning', publication_year: '2024-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 26, course_id: 1, course_no: 'BIT313L', title: 'Design to Code: Bridging Figma Design Systems with React Front-Ends', author: 'LinkedIn Learning Engineering & Emmanuel Henri', isbn: '978-1-4919-1239-0', link: 'https://www.linkedin.com/learning/design-to-code-faster', publisher: 'LinkedIn Learning', publication_year: '2024-01-01', copies: null, status: 'available', type: 'Open Educational Resources' },
  { reference_id: 27, course_id: 1, course_no: 'BIT313L', title: 'UNC Student Handbook & Institutional Academic Policies', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publisher: 'University of Nueva Caceres', publication_year: null, copies: null, status: 'available', type: 'Online Resources' },
  { reference_id: 28, course_id: 1, course_no: 'BIT313L', title: 'CCS Vision, Mission, and Quality Objectives Curated Syllabi Kit', author: "CCS Dean's Office", isbn: '978-971-0000-01-1', link: 'https://unc.edu.ph/ccs-vmo', publisher: 'UNC SCIS', publication_year: '2024-06-01', copies: null, status: 'available', type: 'Open Educational Resources' },

  // ONLINE SUBSCRIPTIONS (Library Repository curated institutional database subscriptions)
  { reference_id: 29, course_id: 1, course_no: 'BIT313L', title: 'ACM Digital Library — CHI Conference Proceedings on Human Factors in Computing Systems', author: 'Association for Computing Machinery (ACM SIGCHI)', isbn: null, link: 'https://dl.acm.org/conference/chi', publisher: 'ACM', publication_year: '2025-01-01', copies: null, status: 'available', category: 'Subscribed E-Journals', type: 'Online Subscriptions' },
  { reference_id: 30, course_id: 1, course_no: 'BIT313L', title: 'IEEE Xplore — IEEE Transactions on Human-Machine Systems', author: 'IEEE Systems, Man, and Cybernetics Society', isbn: null, link: 'https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=6221037', publisher: 'IEEE', publication_year: '2025-01-01', copies: null, status: 'available', category: 'Subscribed E-Journals', type: 'Online Subscriptions' },
];

const weeklyReferencePairs = [
  [27, 28], // Week 1
  [1, 18],  // Week 2
  [2, 7],   // Week 3
  [4, 25],  // Week 4
  [12, 22], // Week 5
  [2, 17],  // Week 6
  [4, 16],  // Week 7
  [8, 9],   // Week 8
  [10, 13], // Week 9
  [14, 15], // Week 10
  [4, 23],  // Week 11
  [5, 20],  // Week 12
  [3, 21],  // Week 13
  [3, 19],  // Week 14
  [24, 6],  // Week 15
  [11, 26], // Week 16
];

const weeklyCurriculum = [
  {
    weekIdx: 0,
    topics: [
      {
        title: 'Course Orientation and VMO Alignment',
        is_orientation: true,
        subtopics: [
          { title: 'University and College VMO, Core Values, and Quality Policy', minutes: 40 },
          { title: 'Course Outline, Course Description, and Classroom Policies', minutes: 45 },
          { title: 'AI Usage Policy and Course Requirements', minutes: 35 },
        ],
      },
      {
        title: 'Foundations of Interactive Computing and Academic Ethics',
        is_orientation: false,
        subtopics: [
          { title: 'Evolution of Interactive Computing Paradigms and Ubiquitous Systems', minutes: 65 },
          { title: 'Interdisciplinary Foundations of HCI in Psychology, Ergonomics, and Design', minutes: 60 },
          { title: 'Professional Ethics and Academic Integrity in Interface Engineering', minutes: 55 },
        ],
      },
    ],
  },
  {
    weekIdx: 1,
    topics: [
      {
        title: 'Cognitive Models in HCI',
        subtopics: [
          { title: 'Goals, Operators, Methods, and Selection Rules (GOMS) Model', minutes: 55 },
          { title: 'Keystroke-Level Model (KLM) and Execution Time Prediction', minutes: 50 },
          { title: "Fitts's Law, Hick's Law, and Mental vs. Conceptual Models", minutes: 45 },
        ],
      },
      {
        title: 'Human Information Processing and Perceptual Psychology',
        subtopics: [
          { title: 'Visual, Auditory, and Haptic Sensory Channels in Digital Interaction', minutes: 45 },
          { title: 'Working Memory Constraints, Cognitive Load Theory, and Information Chunking', minutes: 55 },
          { title: 'Selective Attention, Change Blindness, and Human Error Taxonomy', minutes: 50 },
        ],
      },
    ],
  },
  {
    weekIdx: 2,
    topics: [
      {
        title: 'Introduction to Human-Computer Interaction (HCI)',
        subtopics: [
          { title: 'Human Factors and Ergonomic Considerations in Interactive Systems', minutes: 50 },
          { title: 'Computer Systems Architecture and Interface Hardware Components', minutes: 45 },
          { title: "Norman's Execution-Evaluation Interaction Cycle and Gulf Analysis", minutes: 55 },
        ],
      },
      {
        title: 'Usability Heuristics and Interaction Paradigms',
        subtopics: [
          { title: "Don Norman's Core Principles: Affordances, Signifiers, Mapping, and Feedback", minutes: 50 },
          { title: "Jakob Nielsen's Ten Usability Heuristics for User Interface Design", minutes: 55 },
          { title: 'Direct Manipulation, Menu Selection, Form Fill-in, and Conversational Interfaces', minutes: 45 },
        ],
      },
    ],
  },
  {
    weekIdx: 3,
    topics: [
      {
        title: 'Introduction to User Interface (UI) Design',
        subtopics: [
          { title: 'Fundamentals and Visual Anatomy of Modern User Interfaces', minutes: 45 },
          { title: 'Figma Workspace Architecture, Frames, Constraints, and Vector Networks', minutes: 60 },
          { title: 'Structuring Software UI Proposals and Design Concept Specifications', minutes: 45 },
        ],
      },
      {
        title: 'Ethical AI Integration and Prompt Engineering in UI Design',
        subtopics: [
          { title: 'Artificial Intelligence Tools and Generative Workflows for UI Ideation', minutes: 50 },
          { title: 'Prompt Engineering Practices, Originality, and Proper Attribution', minutes: 55 },
          { title: 'Privacy, Data Protection, and Critical Evaluation of AI-Generated Assets', minutes: 45 },
        ],
      },
    ],
  },
  {
    weekIdx: 4,
    topics: [
      {
        title: 'User-Centered Design (UCD) Frameworks and Persona Crafting',
        subtopics: [
          { title: 'UCD Lifecycle Phases and ISO 9241-210 Human-System Interaction Standards', minutes: 55 },
          { title: 'Target Audience Demographic, Psychographic, and Behavioral Profiling', minutes: 45 },
          { title: 'Data-Driven User Persona Archetypes and Empathy Mapping Workflows', minutes: 50 },
        ],
      },
      {
        title: 'Contextual Inquiry and Qualitative User Research Methods',
        subtopics: [
          { title: 'Stakeholder Interviews, Ethnographic Field Studies, and Contextual Inquiry', minutes: 55 },
          { title: 'Affinity Diagramming and Thematic Synthesis of Qualitative Field Notes', minutes: 50 },
          { title: 'Translating User Research Insights into Actionable Problem Statements', minutes: 45 },
        ],
      },
    ],
  },
  {
    weekIdx: 5,
    topics: [
      {
        title: 'Information Architecture and User Navigation Flow',
        subtopics: [
          { title: 'Hierarchical, Sequential, Matrix, and Faceted Navigation Design Patterns', minutes: 50 },
          { title: 'Comprehensive Sitemaps and System Task Flow Diagramming', minutes: 55 },
          { title: 'Open and Closed Card Sorting Protocols for Category Optimization', minutes: 45 },
        ],
      },
      {
        title: 'Customer Journey Mapping and Task Analysis',
        subtopics: [
          { title: 'Hierarchical Task Analysis (HTA) and Sub-goal Decomposition', minutes: 50 },
          { title: 'End-to-End User Journey Mapping Across Multi-Channel Touchpoints', minutes: 55 },
          { title: 'Identifying Friction Points, Emotional Lows, and Service Recovery Opportunities', minutes: 45 },
        ],
      },
    ],
  },
  {
    weekIdx: 6,
    topics: [
      {
        title: 'Wireframing Essentials and Layout Compositions',
        subtopics: [
          { title: 'Low-Fidelity Ideation Sketches and Crazy Eights Rapid Wireframing', minutes: 45 },
          { title: 'Digital Wireframing Conventions, Content Placeholders, and Annotation Specs', minutes: 55 },
          { title: 'Responsive Grid Systems, Breakpoints, and Touch Target Sizing', minutes: 50 },
        ],
      },
      {
        title: 'Responsive Grid Architectures and Spatial Hierarchy',
        subtopics: [
          { title: 'Multi-Column, Modular, and Baseline Grid Systems for Cross-Device Layouts', minutes: 55 },
          { title: 'Visual Scanning Patterns: F-Pattern and Z-Pattern Content Placement', minutes: 45 },
          { title: 'Iterative Wireframe Walkthroughs and Structural Layout Validation', minutes: 50 },
        ],
      },
    ],
  },
  {
    weekIdx: 7,
    topics: [
      {
        title: 'Visual Design and Gestalt Principles in User Interfaces',
        subtopics: [
          { title: 'Gestalt Laws of Proximity, Similarity, Continuity, Closure, and Common Fate', minutes: 55 },
          { title: 'Color Theory, 60-30-10 Palette Ratios, and Semantic Status Colors', minutes: 50 },
          { title: 'Typographic Scales, Line Length, Vertical Rhythm, and Spatial Balance', minutes: 45 },
        ],
      },
      {
        title: 'UX Design Documentation and Stakeholder Presentation',
        subtopics: [
          { title: 'Compiling Comprehensive UCD Process and Wireframe Specification Packages', minutes: 50 },
          { title: 'Storyboarding User Scenarios to Communicate UX Value Propositions', minutes: 45 },
          { title: 'Defending Wireframe Architecture and Interaction Flows in Design Critiques', minutes: 55 },
        ],
      },
    ],
  },
  {
    weekIdx: 8,
    topics: [
      {
        title: 'Advanced Component Modeling and Responsive Systems in Figma',
        subtopics: [
          { title: 'Atomic Design Methodology: Atoms, Molecules, Organisms, and Templates', minutes: 45 },
          { title: 'Structuring Modular Figma Master Components, Variants, and Boolean Properties', minutes: 55 },
          { title: 'Responsive Component Resizing Using Nested Auto Layout Configurations', minutes: 50 },
        ],
      },
      {
        title: 'Design Tokens and Scalable UI Library Governance',
        subtopics: [
          { title: 'Defining Global, Alias, and Component-Specific Design Tokens for Color and Spacing', minutes: 50 },
          { title: 'Implementing Light, Dark, and High-Contrast Theme Modes with Figma Variables', minutes: 55 },
          { title: 'Publishing, Versioning, and Maintaining Collaborative Team Component Libraries', minutes: 45 },
        ],
      },
    ],
  },
  {
    weekIdx: 9,
    topics: [
      {
        title: 'Visual Assets, Iconography, and High-Fidelity Surface Design',
        subtopics: [
          { title: 'Vector Iconography Standards, Stroke Consistency, and Pixel Grid Alignment', minutes: 50 },
          { title: 'High-Resolution Imagery Optimization, Aspect Ratios, and Focal Point Cropping', minutes: 45 },
          { title: 'Elevation Systems, Drop Shadows, Glassmorphism, and Surface Depth Cues', minutes: 55 },
        ],
      },
      {
        title: 'Cross-Platform Design Guidelines and Adaptive Patterns',
        subtopics: [
          { title: 'Material Design 3 and Apple Human Interface Guidelines (HIG) Core Conventions', minutes: 55 },
          { title: 'Adaptive Navigation Patterns: Bottom Bars, Navigation Drawers, and Rail Systems', minutes: 50 },
          { title: 'Designing Empty States, Skeleton Loaders, and Progressive Onboarding Flows', minutes: 45 },
        ],
      },
    ],
  },
  {
    weekIdx: 10,
    topics: [
      {
        title: 'Interactive Dynamic Prototyping and Micro-interaction Workflows',
        subtopics: [
          { title: 'Interactive Noodle Connections, Smart Animate Transitions, and Contextual Overlays', minutes: 55 },
          { title: 'Trigger-Action Rules, Conditional Logic, and Variable-Driven Prototype States', minutes: 50 },
          { title: 'Designing Micro-interactions: Button States, Toggle Physics, and Pull-to-Refresh', minutes: 45 },
        ],
      },
      {
        title: 'State Management, Form Validation, and Feedback Loops',
        subtopics: [
          { title: 'Interactive Input Masks, Inline Real-Time Validation, and Error Recovery Prompts', minutes: 50 },
          { title: 'Multi-Step Wizard Flows, Progress Indicators, and Confirmation Modals', minutes: 55 },
          { title: 'Toast Notifications, Non-Blocking Alerts, and Optimistic UI Feedback States', minutes: 45 },
        ],
      },
    ],
  },
  {
    weekIdx: 11,
    topics: [
      {
        title: 'Web Accessibility Standards (WCAG 2.1) and Auditing Protocols',
        subtopics: [
          { title: 'POUR Accessibility Pillars: Perceivable, Operable, Understandable, and Robust', minutes: 50 },
          { title: 'WCAG AA/AAA Contrast Compliance, Non-Text Contrast, and Color-Blindness Simulation', minutes: 50 },
          { title: 'Keyboard-Only Navigation, Focus Ring Visibility, and Logical Tab Order Auditing', minutes: 50 },
        ],
      },
      {
        title: 'Assistive Technology Compatibility and Accessible Front-End Prototyping',
        subtopics: [
          { title: 'Screen Reader Landmarks, Semantic Heading Hierarchies, and ARIA Live Regions', minutes: 50 },
          { title: 'Accessible Form Labels, Error Announcements, and Skip-Navigation Links', minutes: 45 },
          { title: 'Presenting and Auditing Interactive Front-End Prototypes Against WCAG 2.1 Checklists', minutes: 55 },
        ],
      },
    ],
  },
  {
    weekIdx: 12,
    topics: [
      {
        title: 'Usability Evaluation Metrics and Test Formulations',
        subtopics: [
          { title: 'Formative vs. Summative Usability Evaluation Methodologies', minutes: 45 },
          { title: 'Quantitative Metrics: Task Completion Rate, Time-on-Task, and Error Frequency', minutes: 50 },
          { title: 'Drafting Comprehensive Usability Test Plans, Screener Surveys, and Consent Forms', minutes: 55 },
        ],
      },
      {
        title: 'Heuristic Inspection and Cognitive Walkthrough Protocols',
        subtopics: [
          { title: 'Executing Structured Expert Heuristic Evaluations with Severity Rating Scales', minutes: 55 },
          { title: 'Conducting Task-Based Cognitive Walkthroughs to Uncover Learnability Barriers', minutes: 50 },
          { title: 'Writing Unbiased, Representative User Testing Scenarios and Moderator Scripts', minutes: 45 },
        ],
      },
    ],
  },
  {
    weekIdx: 13,
    topics: [
      {
        title: 'Moderated Usability Testing Execution and Data Synthesis',
        subtopics: [
          { title: 'Facilitating In-Person and Remote Moderated Usability Testing Sessions', minutes: 55 },
          { title: 'Concurrent and Retrospective Think-Aloud Protocols and Observer Note-Taking', minutes: 50 },
          { title: 'Preventing Moderator Bias, Leading Questions, and Hawthorne Effect Distortions', minutes: 45 },
        ],
      },
      {
        title: 'Psychometric Usability Scales and Behavioral Analytics',
        subtopics: [
          { title: 'Administering and Scoring the System Usability Scale (SUS) Questionnaire', minutes: 50 },
          { title: 'Post-Task Single Ease Question (SEQ) and NASA-TLX Workload Assessments', minutes: 45 },
          { title: 'Analyzing Clickstream Heatmaps, Misclick Rates, and Navigation Drop-off Funnels', minutes: 55 },
        ],
      },
    ],
  },
  {
    weekIdx: 14,
    topics: [
      {
        title: 'Quantitative and Qualitative Usability Data Triangulation',
        subtopics: [
          { title: 'Synthesizing Qualitative Observation Logs with Quantitative Task Performance Metrics', minutes: 55 },
          { title: 'Categorizing Usability Defects by Frequency, Impact, and Persistence', minutes: 50 },
          { title: 'Prioritizing Design Remediation Backlogs Using Impact-Effort Matrices', minutes: 45 },
        ],
      },
      {
        title: 'Empirically-Driven UI/UX Refinement Sprints',
        subtopics: [
          { title: 'Redesigning High-Friction Navigation Flows Based on Empirical User Evidence', minutes: 55 },
          { title: 'A/B Comparison of Baseline vs. Refined Prototype Interaction Flows', minutes: 50 },
          { title: 'Validating Post-Iteration Usability Improvements Through Verification Rounds', minutes: 45 },
        ],
      },
    ],
  },
  {
    weekIdx: 15,
    topics: [
      {
        title: 'Empirically-Driven Layout Iterations and Developer Handoff',
        subtopics: [
          { title: 'Preparing Redline Specifications, Spacing Measurements, and CSS Token Exports in Figma', minutes: 55 },
          { title: 'Documenting Edge Cases, Responsive Breakpoint Behaviors, and Asset Export Pipelines', minutes: 50 },
          { title: 'Writing Professional Usability Evaluation and Engineering Handoff Reports', minutes: 45 },
        ],
      },
      {
        title: 'Capstone Front-End Prototype Defense and Portfolio Presentation',
        subtopics: [
          { title: 'Structuring an End-to-End UX Case Study: Problem, Process, Solution, and Impact', minutes: 45 },
          { title: 'Live Demonstration of the Validated High-Fidelity Front-End Prototype', minutes: 55 },
          { title: 'Oral Defense of Design Decisions, Accessibility Compliance, and Usability Metrics', minutes: 50 },
        ],
      },
    ],
  },
];

// iloIdx is 0..12 relative to each offering's 13 ILOs (null for formative)
const weeklyTlasAndAssessments = [
  {
    weekIdx: 0, period: 'p',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'UNC & CCS VMO Documentary Reading', desc: 'Students read the University of Nueva Caceres Student Handbook and CCS VMO curated materials to understand institutional core values and program outcomes.' },
      { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'Personal Learning Goal & AI Ethics Self-Survey', desc: 'Complete a diagnostic reflection survey on prior interface design exposure and ethical expectations regarding generative AI usage in coursework.' },
      { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation & Flipped Classroom Briefing', desc: 'Interactive lecture covering the course syllabus, grading system, classroom policies, MQUAP LinkedIn Learning integration, and the institutional AI usage policy.' },
      { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'Collaborative VMO-to-HCI Alignment Workshop', desc: 'Small-group workshop mapping how ethical Human-Computer Interaction practices directly support the College of Computer Studies Vision, Mission, and Objectives.' },
      { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO Visual Alignment Infographic', desc: 'Design a one-page digital infographic illustrating personal commitments to UNC core values and responsible AI citizenship in software design.' },
      { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Google Introduction to Generative AI Certification', desc: 'Self-paced completion of the introductory generative AI module to establish foundational literacy before UI ideation.' },
    ],
    assessments: [
      { tlaIdx: 2, iloIdx: null, name: 'VMO & Course Policy Reflection Check', weight: '0', desc: 'Formative check verifying student comprehension of course expectations, academic integrity rules, and VMO alignment.' },
      { tlaIdx: 3, iloIdx: null, name: 'Interactive Computing Paradigm Matrix', weight: '0', desc: 'In-class group worksheet evaluating historical shifts from command-line systems to ubiquitous computing interfaces.' },
      { tlaIdx: 4, iloIdx: null, name: 'VMO Alignment Infographic Rubric', weight: '0', desc: 'Formative evaluation of the visual clarity and institutional alignment of the student VMO poster.' },
    ],
  },
  {
    weekIdx: 1, period: 'p',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Carroll Cognitive Models Chapter Study', desc: 'Read assigned chapters on GOMS, Keystroke-Level Modeling, and human information processing from HCI Models, Theories, and Frameworks.' },
      { phase: 'preclass', by: 'S', lab: false, name: 'Everyday Interface Gulf Analysis Journal', desc: 'Document two real-world digital interfaces exhibiting wide Gulfs of Execution or Evaluation with annotated screenshots.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Cognitive Engineering & Predictive Modeling Seminar', desc: "Socratic lecture and analytical walkthrough of GOMS operators, KLM execution time formulas, Fitts's Law index of difficulty, and Hick-Hyman decision laws." },
      { phase: 'inclass', by: 'S', lab: true, name: "KLM & Fitts's Law Target Timing Laboratory", desc: "Hands-on laboratory where students calculate predicted task completion times using KLM operators and empirically test target acquisition speeds across varying UI layouts." },
      { phase: 'postclass', by: 'S', lab: true, name: 'Cognitive Load Interface Deconstruction Report', desc: 'Analyze an enterprise web form to identify working memory bottlenecks and propose chunking and recognition-over-recall improvements.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Mental vs. Conceptual Model Case Critique', desc: 'Write a comparative critique examining how mismatched designer conceptual models and user mental models induce operational errors.' },
    ],
    assessments: [
      { tlaIdx: 2, iloIdx: 1, name: 'Objective-Type Quiz', weight: '20', desc: 'Covering interactive component theories and human cognitive load.' },
      { tlaIdx: 3, iloIdx: null, name: 'KLM Execution Time Calculation Worksheet', weight: '0', desc: "Practical lab worksheet scoring accuracy of GOMS/KLM operator decompositions and Fitts's Law computations." },
      { tlaIdx: 4, iloIdx: null, name: 'Cognitive Bottleneck Audit Brief', weight: '0', desc: "Formative assessment of the student's interface cognitive load deconstruction and memory chunking recommendations." },
    ],
  },
  {
    weekIdx: 2, period: 'p',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Norman Principles & Nielsen Heuristics Reading', desc: "Study Christopher Reid's chapters on usability principles, affordances, signifiers, and Jakob Nielsen's ten usability heuristics." },
      { phase: 'preclass', by: 'S', lab: true, name: 'Figma Vector Networks & Constraints Warm-up', desc: 'Complete guided pre-lab exercises on Figma frame hierarchies, layout grids, vector pen operations, and constraint pinning.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Usability Heuristics & Interaction Styles Colloquium', desc: 'Instructor-led case analysis dissecting heuristic violations in commercial applications and contrasting direct manipulation with conversational UIs.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Figma Interface Elements & Precision Layout Practicum', desc: 'Supervised laboratory practicum where students construct reusable UI control elements, navigation bars, and cards adhering to strict usability conventions in Figma.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Ten-Heuristic UI Inspection Portfolio', desc: 'Perform a structured heuristic review of a chosen public service web portal and illustrate redesigned UI elements in Figma.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Interaction Style Comparative Essay', desc: 'Evaluate trade-offs between direct manipulation, menu-driven, and command-based interaction styles for novice versus expert users.' },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: 2, name: 'Objective Type Activity', weight: '30', desc: 'Hands-on UI layout development exercise utilizing Figma component design engines.' },
      { tlaIdx: 2, iloIdx: null, name: 'Heuristic Violation Spot-Check', weight: '0', desc: 'In-class diagnostic exercise identifying and classifying Nielsen heuristic violations from live interface screenshots.' },
      { tlaIdx: 4, iloIdx: null, name: 'UI Control Element Craftsmanship Check', weight: '0', desc: 'Formative lab review verifying pixel alignment, constraint behavior, and visual affordances of constructed Figma controls.' },
    ],
  },
  {
    weekIdx: 3, period: 'p',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'AI-Assisted UI Ideation & Attribution Guidelines Study', desc: 'Review LinkedIn Learning modules on Ethical, Human-Centric AI Design and institutional guidelines for transparent AI prompt attribution.' },
      { phase: 'preclass', by: 'S', lab: true, name: 'Problem Domain & Application Concept Brief', desc: 'Draft a preliminary software application problem statement and target user summary for the Prelim UI Design Proposal.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'UI Architecture & Prompt Engineering Masterclass', desc: 'Live demonstration of ethical AI prompt engineering for moodboarding followed by manual human refinement and HCI principle verification.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Software UI Design Proposal Studio & Critiques', desc: 'Studio session where students assemble their comprehensive User Interface Design Proposal in Figma and defend their theoretical HCI rationale.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Finalized Prelim UI Design Proposal Submission', desc: 'Package the refined UI screens, AI prompt attribution log, and theoretical HCI justification document for Prelim portfolio archiving.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Peer UI Proposal Heuristic Feedback Log', desc: "Provide structured peer review comments on two classmates' UI proposals focusing on conceptual clarity and visual signifiers." },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: 3, name: 'UI Design Proposal', weight: '50', desc: 'A thorough system layout mock proposal document outlining visual composition strategies and interaction models.' },
      { tlaIdx: 2, iloIdx: null, name: 'AI Prompt Attribution & Ethics Checklist', weight: '0', desc: 'Verification of proper prompt documentation, originality compliance, and critical human refinement of AI-assisted concepts.' },
      { tlaIdx: 5, iloIdx: null, name: 'Prelim Studio Peer Critique Rubric', weight: '0', desc: 'Formative evaluation of constructive peer feedback quality during the Prelim UI proposal studio.' },
    ],
  },
  {
    weekIdx: 4, period: 'm',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'ISO 9241-210 Standard & UCD Lifecycle Reading', desc: 'Read the ISO 9241-210:2019 ergonomics of human-system interaction guidelines and LinkedIn Learning modules on AI in UX research.' },
      { phase: 'preclass', by: 'S', lab: false, name: 'Contextual Inquiry Interview Guide Preparation', desc: 'Formulate open-ended user interview questions and observation protocols tailored to the target software application domain.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'User-Centered Design & Persona Engineering Lecture', desc: 'In-depth lecture on ISO 9241-210 iterative UCD stages, qualitative affinity diagramming, empathy mapping, and behavioral persona construction.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Affinity Mapping & Empathy Modeling Workshop', desc: 'Collaborative lab synthesizing raw user interview transcripts into thematic affinity clusters, empathy maps, and primary/secondary user personas.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Data-Driven Persona & Scenario Dossier', desc: 'Create high-resolution user persona cards and context-of-use narrative scenarios backed by empirical interview findings.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Research Bias & Demographic Inclusivity Audit', desc: 'Review persona assumptions to eliminate stereotyping and ensure edge-case user populations are represented.' },
    ],
    assessments: [
      { tlaIdx: 2, iloIdx: 4, name: 'Objective-Type Quiz', weight: '20', desc: 'Covering User-Centered Design paradigms and audience analysis methodologies.' },
      { tlaIdx: 3, iloIdx: null, name: 'Persona & Empathy Map Synthesis Rubric', weight: '0', desc: 'In-class workshop evaluation of how accurately student personas reflect synthesized qualitative research data.' },
      { tlaIdx: 4, iloIdx: null, name: 'Contextual Inquiry Protocol Review', weight: '0', desc: 'Formative check of interview script neutrality and ethical participant profiling.' },
    ],
  },
  {
    weekIdx: 5, period: 'm',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Information Architecture & Card Sorting Study', desc: 'Study Interaction Design Foundation case studies on hierarchical, matrix, and faceted information architecture and card sorting methodologies.' },
      { phase: 'preclass', by: 'S', lab: true, name: 'Content Inventory & Feature Taxonomy Spreadsheet', desc: 'Compile a complete inventory of content items, actions, and functional modules required for the target software application.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Information Architecture & Journey Mapping Seminar', desc: 'Detailed analysis of ontology, taxonomy, choreography in IA, Hierarchical Task Analysis (HTA), and multi-touchpoint customer journey maps.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Card Sorting, Sitemap & UCD Process Documentation Lab', desc: 'Hands-on laboratory conducting open/closed card sorting sessions and compiling the formal UCD Process Document with sitemaps and task flows.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Interactive System Flow & Journey Map Package', desc: 'Finalize end-to-end user journey diagrams highlighting user goals, pain points, and system state transitions.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Navigation Taxonomy Dendrogram Analysis', desc: 'Interpret card sorting similarity matrices to justify top-level and secondary navigation labels.' },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: 5, name: 'UCD Process Document', weight: '30', desc: 'A formal process document containing research-driven user profiles, empathy maps, and system site flows.' },
      { tlaIdx: 2, iloIdx: null, name: 'Card Sorting & Sitemap Coherence Check', weight: '0', desc: 'Formative evaluation of navigation hierarchy depth, breadth balance, and label clarity.' },
      { tlaIdx: 4, iloIdx: null, name: 'Hierarchical Task Analysis Diagram Audit', weight: '0', desc: 'Verification of sub-goal completeness and conditional branching in student task flow diagrams.' },
    ],
  },
  {
    weekIdx: 6, period: 'm',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Wireframing Conventions & Responsive Grids Reading', desc: "Read Tom Green & Kevin Golsby's chapters on low-to-mid fidelity wireframing, 12-column responsive grids, and spatial layout composition." },
      { phase: 'preclass', by: 'S', lab: true, name: 'Crazy Eights Rapid Paper Sketching Sprint', desc: 'Produce eight divergent low-fidelity paper sketches exploring alternative layout arrangements for the core application dashboard.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Structural Wireframing & Grid Systems Lecture', desc: 'Instruction on translating IA sitemaps into structural wireframes using 8pt spatial grids, visual scanning patterns (F and Z), and touch target standards.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Digital Mid-Fidelity Wireframing Sprint in Figma', desc: 'Laboratory sprint converting paper sketches into annotated mid-fidelity digital wireframes across desktop, tablet, and mobile breakpoints.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Multi-Viewport Wireframe Flow Refinement', desc: 'Connect mid-fidelity wireframes into a clickable structural flow demonstrating primary user task completion.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Wireframe Annotation & Edge-Case Specification Log', desc: 'Add functional annotations detailing empty states, character limits, and responsive reflow rules on all wireframe screens.' },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: null, name: 'Mid-Fidelity Wireframe Structural Rubric', weight: '0', desc: 'Formative lab evaluation of grid alignment, visual hierarchy, and absence of premature visual styling in wireframes.' },
      { tlaIdx: 2, iloIdx: null, name: 'Responsive Breakpoint & Grid Audit', weight: '0', desc: 'In-class check verifying proper 12-column desktop and 4-column mobile grid configuration in Figma.' },
      { tlaIdx: 4, iloIdx: null, name: 'Task-Flow Wireframe Walkthrough Check', weight: '0', desc: 'Formative peer walkthrough verifying that all primary user tasks can be completed without dead-end screens.' },
    ],
  },
  {
    weekIdx: 7, period: 'm',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Gestalt Psychology, Color Theory & Typography Study', desc: "Study Eric Hibit's Color Theory and Elliot Jay Stocks's Universal Principles of Typography alongside Gestalt perceptual grouping laws." },
      { phase: 'preclass', by: 'S', lab: true, name: 'Midterm UX Presentation Deck & Storyboard Prep', desc: 'Assemble the Midterm UX wireframe package, visual hierarchy rationale, and user journey storyboards for formal critique.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Gestalt Visual Hierarchy & Typographic Scale Seminar', desc: 'Demonstration of proximity, similarity, closure, figure-ground, modular type scales, and 60-30-10 color balance in complex interfaces.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Midterm UI/UX Design Presentation & Jury Critique', desc: 'Formal presentation where students defend their cohesive UX wireframe package, information architecture, and UCD process artifacts.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Post-Critique Wireframe & Visual Hierarchy Revision', desc: 'Incorporate Midterm panel feedback to resolve layout density issues and strengthen Gestalt grouping across all core screens.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Midterm UX Retrospective & Design Log', desc: 'Document key lessons learned during the UCD research-to-wireframe lifecycle and outline goals for high-fidelity prototyping.' },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: 6, name: 'UI/UX Design Presentation', weight: '50', desc: 'An interactive, formal presentation of high-priority wireframes, navigation configurations, and layout details.' },
      { tlaIdx: 2, iloIdx: null, name: 'Gestalt & Typographic Hierarchy Diagnostic', weight: '0', desc: 'In-class analytical exercise evaluating proximity, contrast, and typographic scale in sample interface layouts.' },
      { tlaIdx: 4, iloIdx: null, name: 'Midterm Jury Feedback Action Plan', weight: '0', desc: "Formative review of the student's revision roadmap addressing Midterm critique recommendations." },
    ],
  },
  {
    weekIdx: 8, period: 's',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Brad Frost Atomic Design & Figma Tokens Reading', desc: "Read Brad Frost's Atomic Design chapters and Figma documentation on component properties, variants, and design token variables." },
      { phase: 'preclass', by: 'S', lab: true, name: 'UI Component Inventory & Token Audit', desc: 'Audit the Midterm wireframes to list all recurring atoms, molecules, and organisms requiring master component standardization.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Atomic Design Systems & Responsive Auto Layout Lecture', desc: 'Deep-dive lecture on modular design systems, UX laws, global/semantic design tokens, and nested Auto Layout constraints.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Figma Master Component & Variable Token Library Lab', desc: 'Hands-on laboratory building a scalable Figma component library with interactive variants, boolean properties, and light/dark mode variables.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Design System Style Guide & Token Documentation', desc: 'Publish a structured Figma design system page documenting color tokens, typography styles, spacing scales, and component usage rules.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Component Reusability & Stress-Test Audit', desc: 'Test master components against extreme content lengths and viewport resizing to verify Auto Layout resilience.' },
    ],
    assessments: [
      { tlaIdx: 2, iloIdx: 7, name: 'Objective-Type Quiz', weight: '20', desc: 'Ergonomic patterns and WCAG 2.1 compliance specifications.' },
      { tlaIdx: 3, iloIdx: null, name: 'Atomic Component & Auto Layout Lab Check', weight: '0', desc: 'Practical inspection of nested Auto Layout responsiveness, variant naming conventions, and token bindings.' },
      { tlaIdx: 4, iloIdx: null, name: 'Design System Token Governance Rubric', weight: '0', desc: 'Formative evaluation of semantic token organization and light/dark theme switching completeness.' },
    ],
  },
  {
    weekIdx: 9, period: 's',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Material Design 3 & Apple HIG Guidelines Study', desc: 'Compare platform conventions in Google Material Design and Apple Human Interface Guidelines regarding navigation, elevation, and imagery.' },
      { phase: 'preclass', by: 'S', lab: true, name: 'Custom Vector Icon Set & Asset Preparation', desc: 'Curate and standardize a cohesive 24px vector icon set and optimized imagery assets for the high-fidelity interface.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'High-Fidelity Surface Design & Platform Patterns Seminar', desc: 'Lecture on optical alignment in iconography, elevation shadow physics, adaptive navigation patterns, and skeleton loading states.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'High-Fidelity Screen Assembly & Adaptive Layout Lab', desc: 'Laboratory session upgrading mid-fidelity wireframes into pixel-polished high-fidelity screens using the published Atomic component library.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Empty States, Onboarding & Error Screen Suite', desc: 'Design high-fidelity empty states, first-time user onboarding modals, and graceful fallback screens for offline or error conditions.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Cross-Platform Visual Consistency Self-Audit', desc: 'Verify uniform icon stroke weights, border radii, elevation levels, and imagery aspect ratios across all application views.' },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: null, name: 'High-Fidelity Visual Craftsmanship Rubric', weight: '0', desc: 'In-class lab assessment of surface polish, optical alignment, and faithful consumption of design system tokens.' },
      { tlaIdx: 2, iloIdx: null, name: 'Platform Pattern Compliance Check', weight: '0', desc: 'Formative quiz checking proper application of Material Design and HIG navigation and elevation rules.' },
      { tlaIdx: 4, iloIdx: null, name: 'Edge-Case & Empty State Completeness Audit', weight: '0', desc: 'Review of skeleton loaders, empty states, and onboarding flows for visual and instructional clarity.' },
    ],
  },
  {
    weekIdx: 10, period: 's',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Micro-interaction Physics & WCAG Operability Reading', desc: 'Study Web Accessibility standards on keyboard operability, focus management, and motion design principles for functional micro-interactions.' },
      { phase: 'preclass', by: 'S', lab: true, name: 'Interactive State Transition Matrix Mapping', desc: 'Map out trigger, rules, feedback, and loops/modes for all interactive components, forms, and navigation transitions.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Dynamic Prototyping, Smart Animate & A11y Specs Lecture', desc: 'Instruction on Figma Smart Animate, conditional variable prototyping, keyboard trigger simulation, and documenting screen reader focus hierarchies.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Interactive Micro-interaction & A11y Implementation Lab', desc: 'Hands-on laboratory wiring multi-state interactive flows, form validations, and compiling the UI/UX Design Implementation Document.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Keyboard Navigation & Screen Reader Annotation Spec', desc: 'Annotate all interactive prototype screens with explicit tab sequence indices, ARIA roles, and screen reader announcement strings.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Reduced-Motion & Cognitive Accessibility Review', desc: 'Evaluate prototype animations to ensure compliance with prefers-reduced-motion accessibility guidelines.' },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: 8, name: 'UI/UX Design Implementation Document', weight: '30', desc: 'A detailed implementation document documenting accessibility features, color contrast compliance, and screen-reader focus hierarchies.' },
      { tlaIdx: 2, iloIdx: null, name: 'Micro-interaction Trigger-Feedback Audit', weight: '0', desc: 'Formative check of Smart Animate timing curves, state transitions, and form validation feedback loops.' },
      { tlaIdx: 4, iloIdx: null, name: 'Focus Order & ARIA Landmark Verification', weight: '0', desc: 'Practical check verifying logical keyboard tab sequences and semantic screen-reader annotations.' },
    ],
  },
  {
    weekIdx: 11, period: 's',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'WCAG 2.1 POUR Auditing & Contrast Compliance Study', desc: "Read Tom Green & Kevin Golsby's Web Accessibility chapters on POUR conformance levels (A, AA, AAA) and automated/manual auditing tools." },
      { phase: 'preclass', by: 'S', lab: true, name: 'Pre-Defense Accessibility Contrast & Color-Blindness Audit', desc: 'Run contrast checkers and deuteranopia/protanopia/tritanopia simulations across all high-fidelity prototype screens.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Accessible Front-End Architecture & WCAG 2.1 Seminar', desc: 'Walkthrough of WCAG 2.1 success criteria, semantic DOM structures, accessible modal focus trapping, and front-end prototype defense standards.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Semifinal Front-End Prototype & Accessibility Defense', desc: 'Live interactive presentation and technical defense of the high-fidelity front-end prototype, demonstrating micro-interactions and WCAG 2.1 compliance.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'WCAG 2.1 Remediation & Prototype Freeze', desc: 'Resolve any accessibility or interaction defects identified during the Semifinal defense to freeze the prototype for usability testing.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Accessibility Conformance Report (ACR) Summary', desc: "Complete a Voluntary Product Accessibility Template (VPAT) style checklist summarizing the prototype's WCAG 2.1 Level AA conformance." },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: 9, name: 'Front-end Code Presentation', weight: '50', desc: 'An interactive front-end display demonstrating dynamic layout states, microcopy animations, and interactive component functions.' },
      { tlaIdx: 2, iloIdx: null, name: 'WCAG 2.1 AA Contrast & Color-Blindness Pass', weight: '0', desc: 'Verification that all text and interactive UI elements meet minimum 4.5:1 and 3:1 contrast ratios.' },
      { tlaIdx: 4, iloIdx: null, name: 'Semifinal Prototype Readiness Sign-off', weight: '0', desc: 'Formative checklist confirming the interactive prototype is feature-complete for empirical user testing.' },
    ],
  },
  {
    weekIdx: 12, period: 'f',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Carol Barnum Usability Testing Essentials Study', desc: "Read Carol M. Barnum's chapters on planning usability evaluations, defining quantitative/qualitative metrics, and participant recruitment." },
      { phase: 'preclass', by: 'S', lab: true, name: 'Participant Screener & Informed Consent Drafting', desc: 'Draft participant screening questionnaires, non-disclosure agreements (NDAs), and ethical informed consent forms for usability testing.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Usability Metrics, Test Protocols & Ethics Lecture', desc: 'Lecture covering ISO usability metrics (effectiveness, efficiency, satisfaction), formative vs. summative testing, and unbiased task scenario writing.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Usability Test Plan & Moderator Script Formulation Lab', desc: 'Laboratory workshop where teams author their complete usability test plan, task success criteria, and pilot-test their moderator scripts.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Pilot Usability Test Dry-Run & Script Calibration', desc: 'Conduct a dry-run pilot test with one peer participant to validate recording equipment, task wording clarity, and timing logs.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Ethical Research & Data Anonymization Checklist', desc: 'Verify that all data collection spreadsheets and screen recording protocols anonymize participant identities.' },
    ],
    assessments: [
      { tlaIdx: 2, iloIdx: 10, name: 'Objective-Type Quiz', weight: '20', desc: 'Covering evaluative protocol steps, metrics, and script guidelines.' },
      { tlaIdx: 3, iloIdx: null, name: 'Usability Test Plan & Scenario Rubric', weight: '0', desc: 'In-class evaluation of task scenario realism, absence of leading UI cues, and metric definition clarity.' },
      { tlaIdx: 4, iloIdx: null, name: 'Pilot Test Calibration Log Check', weight: '0', desc: 'Formative check of pilot dry-run adjustments and ethical consent readiness.' },
    ],
  },
  {
    weekIdx: 13, period: 'f',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Think-Aloud Moderation & SUS Scoring Guide Reading', desc: 'Study protocols for facilitating concurrent/retrospective think-aloud sessions and calculating System Usability Scale (SUS) percentile scores.' },
      { phase: 'preclass', by: 'S', lab: true, name: 'Testing Environment & Observation Matrix Setup', desc: 'Configure screen/audio recording tools, observer rainbow spreadsheets, and digital post-task SEQ and SUS questionnaires.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Moderated Testing Facilitation & Behavioral Analytics Seminar', desc: 'Instruction on neutral probing techniques, handling participant frustration, logging critical vs. non-critical errors, and SUS data analysis.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Moderated Usability Testing Execution & Data Synthesis Lab', desc: 'Live moderated usability testing sessions with target users followed by quantitative synthesis of completion rates, time-on-task, error logs, and SUS scores.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Moderated Usability Testing Lab & Evaluation Dossier', desc: 'Compile all recorded user error logs, System Usability Scale (SUS) calculations, rainbow observation sheets, and signed participant consent forms into the Prototype Evaluation Document.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Observer Inter-Rater Reliability Debrief', desc: 'Cross-check observer notes across team roles (moderator, data logger, tech observer) to reconcile task success and error classifications.' },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: 11, name: 'Prototype Evaluation Document', weight: '30', desc: 'A complete research report compiling recorded user error logs, System Usability Scale (SUS) surveys, and qualitative notes.' },
      { tlaIdx: 2, iloIdx: null, name: 'Moderator Neutrality & Probing Observation', weight: '0', desc: 'In-class observation of student moderation technique ensuring non-leading prompts and proper think-aloud facilitation.' },
      { tlaIdx: 4, iloIdx: null, name: 'SUS & Task Performance Statistical Check', weight: '0', desc: 'Verification of accurate System Usability Scale score computation and time-on-task summary tables.' },
    ],
  },
  {
    weekIdx: 14, period: 'f',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'Defect Severity Triangulation & Handoff Specs Study', desc: "Read Figma's Guide to Developer Handoff and LinkedIn Learning modules on AI-assisted design-to-code workflows." },
      { phase: 'preclass', by: 'S', lab: true, name: 'Usability Defect Prioritization Matrix', desc: "Rank all discovered usability issues using Jakob Nielsen's 0-4 severity scale (frequency, impact, persistence) to scope the final iteration sprint." },
      { phase: 'inclass', by: 'T', lab: false, name: 'Evidence-Based UI Remediation & Dev Handoff Lecture', desc: 'Lecture on translating usability defects into targeted UI layout revisions and preparing Figma Dev Mode redlines, CSS tokens, and asset pipelines.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Empirically-Driven Prototype Iteration & Dev Handoff Lab', desc: 'Hands-on sprint executing high-priority UI/UX fixes backed by user test evidence and annotating screens for engineering handoff.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Before-and-After Usability Remediation Showcase', desc: 'Create visual side-by-side comparison boards documenting each pre-test usability defect, empirical user evidence, and post-test design solution.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Developer Handoff Specification Audit', desc: 'Verify that all component states, spacing tokens, responsive constraints, and exportable SVG/PNG assets are cleanly documented.' },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: null, name: 'Empirical Iteration & Remediation Rubric', weight: '0', desc: 'In-class lab assessment evaluating how effectively design changes resolve documented high-severity usability defects.' },
      { tlaIdx: 2, iloIdx: null, name: 'Defect Severity & Impact-Effort Matrix Check', weight: '0', desc: 'Formative review of defect prioritization logic and alignment with quantitative error logs.' },
      { tlaIdx: 4, iloIdx: null, name: 'Figma Developer Handoff Readiness Check', weight: '0', desc: 'Inspection of redline annotations, CSS variable mapping, and asset export specifications.' },
    ],
  },
  {
    weekIdx: 15, period: 'f',
    tlas: [
      { phase: 'preclass', by: 'S', lab: false, name: 'UX Case Study Storytelling & Executive Defense Prep', desc: 'Review industry exemplars of end-to-end UX case studies and prepare executive summary slides synthesizing research, design, accessibility, and SUS outcomes.' },
      { phase: 'preclass', by: 'S', lab: true, name: 'Final Prototype & Handoff Package Freeze', desc: 'Perform final quality assurance checks on interactive prototype links, developer handoff specs, and the Usability Evaluation Report.' },
      { phase: 'inclass', by: 'T', lab: false, name: 'Industry UI/UX Portfolio & Capstone Defense Briefing', desc: 'Instructor briefing on defending UX ROI, communicating empirical usability metrics to stakeholders, and transitioning prototypes to production.' },
      { phase: 'inclass', by: 'S', lab: true, name: 'Capstone Front-End Prototype Presentation & Defense', desc: 'Formal oral defense where students present their validated front-end prototype, empirical usability testing insights, and developer handoff specifications.' },
      { phase: 'postclass', by: 'S', lab: true, name: 'Final Archival Portfolio & Case Study Publication', desc: 'Submit the complete, self-contained HCI/UI-UX project repository including research artifacts, Figma design system, and final evaluation report.' },
      { phase: 'postclass', by: 'S', lab: false, name: 'Course Synthesis & Self-Efficacy Reflection', desc: 'Complete a comprehensive post-course reflection evaluating personal growth across CO1-CO4 competencies.' },
    ],
    assessments: [
      { tlaIdx: 3, iloIdx: 12, name: 'Front-End Prototype Presentation', weight: '50', desc: 'The final capstone defense presenting a validated system prototype optimized using feedback from user testing sessions.' },
      { tlaIdx: 2, iloIdx: null, name: 'Executive UX Case Study Coherence Check', weight: '0', desc: 'Formative evaluation of narrative flow connecting user research, design iterations, and empirical SUS improvements.' },
      { tlaIdx: 4, iloIdx: null, name: 'Capstone Archival Dossier Completeness Check', weight: '0', desc: 'Final verification that all research, design system, accessibility, and evaluation deliverables are properly archived.' },
    ],
  },
];

module.exports = {
  hciDescription,
  hciCourseOutcomes,
  hciPoAlignments,
  hciIloTemplates,
  hciReferences,
  weeklyReferencePairs,
  weeklyCurriculum,
  weeklyTlasAndAssessments,
};
