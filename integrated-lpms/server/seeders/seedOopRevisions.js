'use strict';

const db = require('../models');

/**
 * Standardized unified seeder for BIT213L — Object-Oriented Programming
 * Revision 1 (1st Semester SY 2025-2026, Approved) &
 * Revision 2 (1st Semester SY 2026-2027, Approved)
 *
 * Demonstrates complete approval-cycle logs (ASSIGNED -> SUBMITTED -> RETURNED ->
 * RESUBMITTED -> LIBRARY_DIRECTOR ACCEPTED -> PROGRAM_HEAD ACCEPTED -> DEAN ACCEPTED ->
 * INDUSTRY_CONSULTANT Suggest), actionable resolved comments + CommentTargets,
 * standardized 2 non-orientation parent topics per week (exact minute budgets:
 * 120m orient / 180m reg W1 / 300m W2-W16), >=1 Textbook per week slice,
 * full COAEP ILO weights, CourseDocuments, CourseReferences, ConsultantSignoffs,
 * and ReviewRecordSnapshots.
 */

const OOP_COURSE_META = {
  course_id: 3,
  course_no: 'BIT213L',
  course_title: 'Object-Oriented Programming',
  credit: '2 LEC, 1 LAB',
  contact_hrs: '2 Hrs Lec, 3 Hrs Lab',
  classification: 'Professional Courses',
  cmo: 'CMO No. 25 S. 2015',
  year_lvl: 'SECOND YEAR',
  prerequisites_text: 'None',
  term: '1st Semester SY 2026-2027',
  semester: 1,
  academic_period_id: 2,
};

const REV1_DATA = {
  revision_number: 1,
  academic_period_id: 1,
  school_year: '2025-2026',
  semester: '1st Semester',
  has_modifications: false,
  is_revision_incremented: false,
  dates: {
    assigned: new Date('2025-06-01T09:00:00Z'),
    submitted1: new Date('2025-06-15T10:00:00Z'),
    phReturned: new Date('2025-06-19T11:30:00Z'),
    resubmitted: new Date('2025-06-25T09:00:00Z'),
    ldAccepted: new Date('2025-06-26T10:00:00Z'),
    phAccepted: new Date('2025-06-28T09:45:00Z'),
    deanApproved: new Date('2025-07-02T15:00:00Z'),
    icSuggest: new Date('2025-07-05T10:00:00Z'),
  },
  course_description:
    'Covers fundamental concepts of object-oriented programming (OOP). Topics include classes, objects, inheritance, polymorphism, encapsulation, interfaces, exception handling, graphical user interface (GUI) development, file I/O, and database connectivity.',
  courseOutcomes: [
    'CO1: Apply core object-oriented principles (encapsulation, inheritance, polymorphism) to design robust software models.',
    'CO2: Implement abstract classes, interfaces, and generic programming to develop scalable software components.',
    'CO3: Design event-driven graphical user interfaces (GUI) incorporating robust exception handling mechanisms.',
    'CO4: Integrate file I/O operations and database connectivity mechanisms within object-oriented desktop applications.',
  ],
  poAlignments: [
    { coIdx: 0, po_id: 1, attainment_level: 'I' },
    { coIdx: 0, po_id: 3, attainment_level: 'E' },
    { coIdx: 0, po_id: 6, attainment_level: 'D' },
    { coIdx: 1, po_id: 2, attainment_level: 'E' },
    { coIdx: 1, po_id: 4, attainment_level: 'D' },
    { coIdx: 1, po_id: 8, attainment_level: 'E' },
    { coIdx: 2, po_id: 5, attainment_level: 'I' },
    { coIdx: 2, po_id: 7, attainment_level: 'D' },
    { coIdx: 2, po_id: 9, attainment_level: 'E' },
    { coIdx: 3, po_id: 2, attainment_level: 'E' },
    { coIdx: 3, po_id: 3, attainment_level: 'D' },
    { coIdx: 3, po_id: 10, attainment_level: 'D' },
  ],
  ilos: [
    // Orientation
    { coIdx: 0, is_orientation: true, hours: 2, weeks: 0.4, description: "Cite the value and relevance of the University's and the College's VMO as related to the course", assessment_tool: null, prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 0, target: null, ied_level: 'I' },
    // CO1 (Prelim = 100%)
    { coIdx: 0, is_orientation: false, hours: 6, weeks: 1.2, description: 'Define class blueprints and instantiate objects with appropriate state mapping.', assessment_tool: 'Objective Type Quiz', prelim_weight: 20, midterm_weight: 0, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'I' },
    { coIdx: 0, is_orientation: false, hours: 6, weeks: 1.2, description: 'Encapsulate class state using access modifiers and property methods.', assessment_tool: 'Code Refactoring Exercise', prelim_weight: 30, midterm_weight: 0, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'E' },
    { coIdx: 0, is_orientation: false, hours: 6, weeks: 1.2, description: 'Construct hierarchical relationships using inheritance and method overriding.', assessment_tool: 'Class Diagram Implementation', prelim_weight: 50, midterm_weight: 0, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'D' },
    // CO2 (Midterm = 100%)
    { coIdx: 1, is_orientation: false, hours: 6, weeks: 1.2, description: 'Design abstract base classes to enforce structural contracts.', assessment_tool: 'Objective Type Quiz', prelim_weight: 0, midterm_weight: 20, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'E' },
    { coIdx: 1, is_orientation: false, hours: 7, weeks: 1.4, description: 'Implement multiple interfaces to achieve decoupling and polymorphism.', assessment_tool: 'Interface Design Task', prelim_weight: 0, midterm_weight: 30, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'D' },
    { coIdx: 1, is_orientation: false, hours: 7, weeks: 1.4, description: 'Utilize generic collections (Lists, Maps, Sets) for dynamic data storage.', assessment_tool: 'Data Structure Project', prelim_weight: 0, midterm_weight: 50, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'D' },
    // CO3 (Semifinal = 100%)
    { coIdx: 2, is_orientation: false, hours: 6, weeks: 1.2, description: 'Catch and handle runtime exceptions using try-catch-finally blocks.', assessment_tool: 'Objective Type Quiz', prelim_weight: 0, midterm_weight: 0, semi_weight: 20, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'I' },
    { coIdx: 2, is_orientation: false, hours: 7, weeks: 1.4, description: 'Create graphical user interface layouts using standard library components.', assessment_tool: 'Wireframe to Code Activity', prelim_weight: 0, midterm_weight: 0, semi_weight: 30, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'E' },
    { coIdx: 2, is_orientation: false, hours: 7, weeks: 1.4, description: 'Bind action listeners to UI components to handle user-driven events.', assessment_tool: 'Interactive App Prototype', prelim_weight: 0, midterm_weight: 0, semi_weight: 50, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'D' },
    // CO4 (Final = 100%)
    { coIdx: 3, is_orientation: false, hours: 6, weeks: 1.2, description: 'Serialize and deserialize object states into binary format.', assessment_tool: 'Objective Type Quiz', prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 20, target: '90% of students will score at least 60%', ied_level: 'E' },
    { coIdx: 3, is_orientation: false, hours: 7, weeks: 1.4, description: 'Read and write unstructured text data using file input/output streams.', assessment_tool: 'File Parser Script', prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 30, target: '90% of students will score at least 60%', ied_level: 'D' },
    { coIdx: 3, is_orientation: false, hours: 7, weeks: 1.4, description: 'Establish basic database connectivity (JDBC/ADO.NET) for persistent records.', assessment_tool: 'CRUD Application Integration', prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 50, target: '90% of students will score at least 60%', ied_level: 'D' },
  ],
  references: [
    // 0: ONLINE RESOURCES
    { title: 'UNC Student Handbook & SCIS Policies', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publisher: 'University of Nueva Caceres', publication_year: null, copies: null, type: 'Online Resources' },
    // 1: OER
    { title: 'CCS VMO Curated Institutional Materials', author: "CCS Dean's Office", isbn: '978-971-0000-02-8', link: 'https://unc.edu.ph/ccs-vmo', publisher: 'UNC SCIS', publication_year: '2024-06-01', copies: null, type: 'Open Educational Resources' },
    // 2-6: TEXTBOOKS
    { title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin', isbn: '978-0132350884', link: null, publisher: 'Prentice Hall', publication_year: '2008-01-01', copies: 4, type: 'Textbook' },
    { title: 'Effective Java (3rd Edition)', author: 'Joshua Bloch', isbn: '978-0134685991', link: null, publisher: 'Addison-Wesley', publication_year: '2018-01-01', copies: 5, type: 'Textbook' },
    { title: 'Head First Object-Oriented Analysis and Design', author: 'Brett D. McLaughlin, Gary Pollice & David West', isbn: '978-0596008673', link: null, publisher: "O'Reilly Media", publication_year: '2006-01-01', copies: 3, type: 'Textbook' },
    { title: 'Head First Design Patterns: Building Extensible and Maintainable Software', author: 'Eric Freeman & Elisabeth Robson', isbn: '978-0596007126', link: null, publisher: "O'Reilly Media", publication_year: '2004-01-01', copies: 4, type: 'Textbook' },
    { title: 'Core Java Volume I: Fundamentals (12th Edition)', author: 'Cay S. Horstmann', isbn: '978-0137673629', link: null, publisher: 'Oracle Press', publication_year: '2021-01-01', copies: 6, type: 'Textbook' },
    // 7-8: ONLINE RESOURCES
    { title: 'Oracle Java Platform Standard Edition Documentation', author: 'Oracle Corporation', isbn: null, link: 'https://docs.oracle.com/en/java/', publisher: 'Oracle', publication_year: null, copies: null, type: 'Online Resources' },
    { title: 'Microsoft C# Object-Oriented Programming Guide', author: 'Microsoft Developer Network', isbn: null, link: 'https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/object-oriented/', publisher: 'Microsoft', publication_year: null, copies: null, type: 'Online Resources' },
    // 9-10: OER
    { title: 'Refactoring.Guru: OOP Principles & Design Patterns Catalog', author: 'Alexander Shvets', isbn: '978-0999123449', link: 'https://refactoring.guru/', publisher: 'Refactoring.Guru', publication_year: '2024-01-01', copies: null, type: 'Open Educational Resources' },
    { title: 'Object-Oriented Programming with Java (MOOC.fi Open Course)', author: 'University of Helsinki', isbn: '978-9526038124', link: 'https://java-programming.mooc.fi/', publisher: 'University of Helsinki', publication_year: '2023-01-01', copies: null, type: 'Open Educational Resources' },
    // 11: ONLINE RESOURCES
    { title: 'JavaFX & Swing Desktop GUI Architecture Guide', author: 'OpenJFX / Oracle', isbn: null, link: 'https://openjfx.io/', publisher: 'OpenJFX', publication_year: null, copies: null, type: 'Online Resources' },
  ],
  // Every week slice (including orientation & regular W1 and W12) has >= 1 Textbook (indices 2..6)
  weekRefSpecs: [
    [
      { refIdx: 4, is_orientation: true },  // Textbook: Head First OOAD
      { refIdx: 0, is_orientation: true },  // OR: UNC Student Handbook
      { refIdx: 6, is_orientation: false }, // Textbook: Core Java Vol I
      { refIdx: 1, is_orientation: false }, // OER: CCS VMO
    ],
    [4, 10],    // Week 2: Head First OOAD (TB) & MOOC.fi (OER)
    [2, 6],     // Week 3: Clean Code (TB) & Core Java (TB)
    [3, 7],     // Week 4: Effective Java (TB) & Oracle Docs (OR)
    [4, 8],     // Week 5: Head First OOAD (TB) & Microsoft C# Guide (OR)
    [3, 5],     // Week 6: Effective Java (TB) & Head First Design Patterns (TB)
    [3, 7],     // Week 7: Effective Java (TB) & Oracle Docs (OR)
    [5, 9],     // Week 8: Head First Design Patterns (TB) & Refactoring.Guru (OER)
    [2, 6],     // Week 9: Clean Code (TB) & Core Java (TB)
    [6, 11],    // Week 10: Core Java (TB) & JavaFX/Swing Guide (OR)
    [5, 11],    // Week 11: Head First Design Patterns (TB) & JavaFX/Swing Guide (OR)
    [5, 9, 11], // Week 12: Head First Design Patterns (TB) + Refactoring.Guru (OER) + JavaFX (OR)
    [3, 6],     // Week 13: Effective Java (TB) & Core Java (TB)
    [6, 7],     // Week 14: Core Java (TB) & Oracle Docs (OR)
    [2, 7],     // Week 15: Clean Code (TB) & Oracle Docs (OR)
    [4, 9],     // Week 16: Head First OOAD (TB) & Refactoring.Guru (OER)
  ],
  weeklyCurriculum: [
    // CO1: Weeks 1-4 (W1: 1 orient topic [120m] + 2 non-orient topics [90m+90m=180m]; W2-W16: 2 topics [150m+150m=300m])
    {
      weekIdx: 0,
      topics: [
        {
          title: 'Course Orientation and VMO Alignment',
          is_orientation: true,
          subtopics: [
            { title: 'University and College VMO, Core Values', minutes: 40 },
            { title: 'Course Outline and Policies', minutes: 45 },
            { title: 'AI Usage Policy', minutes: 35 },
          ],
        },
        {
          title: 'Paradigm Shift: Procedural vs. Object-Oriented Programming',
          is_orientation: false,
          subtopics: [
            { title: 'Limitations of Global State in Procedural Programming', minutes: 30 },
            { title: 'The Four Pillars of OOP: Encapsulation, Abstraction, Inheritance, and Polymorphism', minutes: 30 },
            { title: 'Translating Real-World Domain Entities into Software Objects', minutes: 30 },
          ],
        },
        {
          title: 'OOP Development Environment and Software Modeling Basics',
          is_orientation: false,
          subtopics: [
            { title: 'JDK/SDK Toolchain Setup, Compilation Lifecycle, and Bytecode Execution', minutes: 30 },
            { title: 'Object Identity, Attributes, and Behavioral Responsibilities (CRC Cards)', minutes: 30 },
            { title: 'Clean Coding Conventions, Naming Standards, and Version Control Basics', minutes: 30 },
          ],
        },
      ],
    },
    {
      weekIdx: 1,
      topics: [
        { title: 'Classes, Objects, and State Mapping', subtopics: ['Defining Class Blueprints', 'The "new" Keyword and Instantiation', 'Constructors and "this" keyword'] },
        { title: 'Object Lifecycle, Heap Memory, and Reference Semantics', subtopics: ['Stack Frames vs. Heap Object Allocation', 'Constructor Overloading, Chaining, and Default Initialization', 'Object References, Aliasing, Null Safety, and Garbage Collection Roots'] },
      ],
    },
    {
      weekIdx: 2,
      topics: [
        { title: 'Encapsulation and Access Modifiers', subtopics: ['Public, Private, and Protected scopes', 'Getters and Setters', 'Data Hiding Principles'] },
        { title: 'Class Invariants, Immutability, and Static Members', subtopics: ['Enforcing Object State Invariants Inside Mutator Methods', 'Designing Immutable Value Objects with Final/Readonly Fields', 'Static Class Variables, Constants, and Utility Methods vs. Instance State'] },
      ],
    },
    {
      weekIdx: 3,
      topics: [
        { title: 'Inheritance and Method Overriding', subtopics: ['The "extends" keyword', 'Superclass Delegation', 'Method Overriding vs Overloading'] },
        { title: 'UML Class Diagrams and Object Association Modeling', subtopics: ['UML Class Diagram Notation: Visibility, Attributes, and Operations', 'Modeling "Is-A" Generalization vs. "Has-A" Aggregation and Composition', 'Dynamic Method Dispatch (Virtual Method Tables) and Object Root Methods (toString, equals, hashCode)'] },
      ],
    },
    // CO2: Weeks 5-8
    {
      weekIdx: 4,
      topics: [
        { title: 'Abstract Classes and Structural Contracts', subtopics: ['Defining Abstract Methods', 'Partial Implementations', 'When to use Abstract vs Concrete'] },
        { title: 'The Template Method Pattern and Hook Operations', subtopics: ['Factoring Common Algorithmic Skeletons into Abstract Base Classes', 'Protected Hook Methods vs. Abstract Primitive Operations', 'Preventing Fragile Base Class Issues with Final Template Methods'] },
      ],
    },
    {
      weekIdx: 5,
      topics: [
        { title: 'Interface Implementation and Polymorphism', subtopics: ['Interface Segregation', 'Multiple Inheritance via Interfaces', 'Dependency Injection using Interfaces'] },
        { title: 'Runtime Polymorphism, Upcasting, and Loose Coupling', subtopics: ['Programming to an Interface Rather Than a Concrete Implementation', 'Polymorphic Collections, Upcasting, and Safe Type Downcasting (instanceof)', 'Strategy Pattern: Swapping Object Behaviors Dynamically at Runtime'] },
      ],
    },
    {
      weekIdx: 6,
      topics: [
        { title: 'Generic Collections Framework', subtopics: ['Type Safety with Generics', 'Lists (ArrayList/LinkedList)', 'Maps and Sets (HashMap/HashSet)'] },
        { title: 'Iterators, Comparators, and Custom Generic Classes', subtopics: ['Authoring Parameterized Generic Classes and Methods (<T>)', 'Natural Ordering (Comparable) vs. Custom Sorting Strategies (Comparator)', 'Fail-Fast Iterators, Enhanced For-Loops, and Hash Collision Resolution'] },
      ],
    },
    {
      weekIdx: 7,
      topics: [
        { title: 'Modular Package Architecture and Component Decoupling', subtopics: ['Organizing Domain, Service, and Repository Packages/Namespaces', 'Constructor Injection and Factory Methods for Testable Components', 'Avoiding Circular Package Dependencies and Law of Demeter Violations'] },
        { title: 'Midterm Object-Oriented Component Synthesis', subtopics: ['Integrating Abstract Hierarchies, Interfaces, and Generic Collections', 'Refactoring Procedural Switch Statements into Polymorphic Dispatch', 'Verifying Component Contracts with Automated Assertion Checks'] },
      ],
    },
    // CO3: Weeks 9-12
    {
      weekIdx: 8,
      topics: [
        { title: 'Exception Handling and Try-Catch Mechanisms', subtopics: ['Checked vs Unchecked Exceptions', 'Try-Catch-Finally syntax', 'Custom Exception Generation'] },
        { title: 'Defensive Programming, Resource Cleanup, and File Logging', subtopics: ['Exception Hierarchy (Throwable, Error, Exception, RuntimeException)', 'Automatic Resource Management (try-with-resources / using statements)', 'Structured Exception Logging to Flat Files Using Custom Logger Classes'] },
      ],
    },
    {
      weekIdx: 9,
      topics: [
        { title: 'GUI Layout Design Basics', subtopics: ['Standard GUI Libraries (Swing/WPF)', 'Layout Managers (Border, Grid, Flow)', 'Component Hierarchy'] },
        { title: 'Visual Containers, Controls, and Wireframe Translation', subtopics: ['Top-Level Windows (JFrame), Panels (JPanel), and Nested Composite Layouts', 'Form Controls: TextFields, ComboBoxes, Tables (JTable), and Dialog Modals', 'Translating UI Wireframes into Responsive Desktop Component Trees'] },
      ],
    },
    {
      weekIdx: 10,
      topics: [
        { title: 'Event-Driven Programming and Listeners', subtopics: ['The Event Loop', 'Action and Mouse Listeners', 'Anonymous Inner Classes'] },
        { title: 'Observer Pattern, Event Delegation, and UI Thread Safety', subtopics: ['The Event Delegation Model: Event Sources, Event Objects, and Listener Interfaces', 'Keyboard, Focus, and Window Lifecycle Event Adapters', 'Keeping the Event Dispatch Thread (EDT) Responsive During Background Tasks'] },
      ],
    },
    {
      weekIdx: 11,
      topics: [
        { title: 'Model-View-Controller (MVC) Architecture in Desktop GUIs', subtopics: ['Separating Domain Models, GUI Views, and Event Controllers', 'Binding Domain Collection Updates to TableModel / Observable UI Lists', 'Input Validation and User-Friendly Error Dialogs in the Controller Layer'] },
        { title: 'Interactive GUI Prototype Integration and Usability Polish', subtopics: ['Multi-Window Navigation, Menu Bars, Toolbars, and Keyboard Shortcuts', 'Stateful Form Workflows: Create, Edit, Search, and Confirmation Prompts', 'End-to-End Exception Recovery and Flat-File Error Logging in GUI Apps'] },
      ],
    },
    // CO4: Weeks 13-16
    {
      weekIdx: 12,
      topics: [
        { title: 'Binary Serialization and Deserialization', subtopics: ['Serializable Interface', 'ObjectOutputStream', 'Transient Variables'] },
        { title: 'Object Graph Persistence and Versioning (serialVersionUID)', subtopics: ['Deep Object Graph Serialization and Circular Reference Handling', 'Schema Evolution and serialVersionUID Compatibility Checks', 'Protecting Sensitive Fields During Serialization (transient and Custom Hooks)'] },
      ],
    },
    {
      weekIdx: 13,
      topics: [
        { title: 'File I/O and Stream Operations', subtopics: ['Reading unstructured text', 'Writing to flat files', 'Buffer Management'] },
        { title: 'File System Paths, CSV/JSON Parsing, and Character Streams', subtopics: ['Byte Streams (InputStream/OutputStream) vs. Character Streams (Reader/Writer)', 'Buffered I/O (BufferedReader/BufferedWriter) and NIO Path/Files Utilities', 'Parsing Structured Delimited Text (CSV/TSV) into Strongly-Typed Domain Objects'] },
      ],
    },
    {
      weekIdx: 14,
      topics: [
        { title: 'Database Connectivity Fundamentals', subtopics: ['JDBC / ADO.NET Architecture', 'Connection Pooling and Prepared Statements', 'Executing Queries and Reading ResultSets'] },
        { title: 'Data Access Object (DAO) Pattern and Transaction Management', subtopics: ['Encapsulating SQL Operations Behind Domain-Oriented DAO Interfaces', 'Preventing SQL Injection Using Parameterized PreparedStatement Placeholders', 'ACID Transaction Boundaries (commit, rollback) and Mapping ResultSet Rows to Entities'] },
      ],
    },
    {
      weekIdx: 15,
      topics: [
        { title: 'Full-Stack Desktop OOP Application Synthesis', subtopics: ['Wiring MVC GUI Views to Service Classes, File Exporters, and JDBC DAOs', 'Configuration Management, Connection Pool Cleanup, and Application Packaging (Executable JAR)', 'Comprehensive Code Quality Review Against Clean Code and OOP Principles'] },
        { title: 'Capstone Object-Oriented Application Defense', subtopics: ['Presenting UML Class Hierarchies, Interface Contracts, and DAO Architecture', 'Live Demonstration of Event-Driven GUI, File I/O Export, and Database CRUD Persistence', 'Oral Defense of Encapsulation, Polymorphism, Exception Logging, and SQLi Prevention'] },
      ],
    },
  ],
  weeklyTlas: [
    {
      weekIdx: 0, period: 'p',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'VMO & Outcomes Reading Assignment', desc: 'Read the materials on UNC VMO, Student Handbook, and course syllabus expectations.' },
        { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'Procedural vs. OOP Code Comparison Reading', desc: 'Examine a procedural C/script program alongside its refactored object-oriented equivalent.' },
        { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation Lecture', desc: 'The orientation will cover course outcomes, topic outline, grading criteria, and institutional VMO alignment.' },
        { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'IDE & JDK/SDK Environment Setup Workshop', desc: 'Configure IntelliJ IDEA / Visual Studio, compiler JDK/SDK toolchains, and Git version control.' },
        { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO Visual Alignment Poster', desc: 'Create a visual poster connecting UNC core values and ethical AI usage to software craftsmanship.' },
        { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Real-World Domain Object Identification Exercise', desc: 'Identify candidate classes, attributes, and behaviors from a university library business scenario.' },
      ],
      assessments: [
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Orientation & Syllabus Comprehension Check', desc: 'Formative check of course rules, grading weights, and VMO alignment.' },
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'IDE & Compiler Verification Check', desc: 'In-class verification of working OOP compiler and debugger setup.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'VMO Alignment Poster Rubric', desc: 'Formative evaluation of the student VMO poster.' },
      ],
    },
    {
      weekIdx: 1, period: 'p',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Class Blueprints & Heap Instantiation Reading', desc: 'Read Horstmann Core Java chapters on class definitions, fields, constructors, and the new operator.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Constructor Overloading Trace Drill', desc: 'Trace stack frames and heap object addresses across overloaded constructors using this().' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Class Blueprints, Constructors & Memory Seminar', desc: 'Lecture on state mapping, instance vs. local variables, constructor chaining, and reference aliasing.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Object Instantiation & State Mapping Laboratory', desc: 'Hands-on laboratory designing domain classes (Account, Student, Product), instantiating objects, and inspecting heap state in the debugger.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Multi-Class Object Interaction Coding Task', desc: 'Implement collaborating classes where objects pass message references to invoke behaviors.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'NullPointerException & Reference Aliasing Case Log', desc: 'Analyze three code snippets exhibiting unintended state mutation due to shared object references.' },
      ],
      assessments: [
        { tlaIdx: 2, iloIdx: 0, weight: '20', name: 'Objective Type Quiz', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Objective Type Quiz.' },
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Class Blueprint & Constructor Lab Check', desc: 'Practical check of constructor overloading and this reference usage.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Object State Mapping Verification', desc: 'Formative check of object instantiation and method invocation.' },
      ],
    },
    {
      weekIdx: 2, period: 'p',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Clean Code Encapsulation & Access Modifiers Study', desc: 'Study visibility scopes (private, protected, public, package-private), getters/setters, and class invariants.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Exposed Mutable State Smell Hunt', desc: 'Identify encapsulation breaches in a legacy codebase with public fields and unvalidated setters.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Information Hiding, Invariants & Immutability Lecture', desc: 'Instruction on defensive copying, enforcing validation invariants inside setters/constructors, and designing immutable classes.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Code Refactoring Exercise: Encapsulation Lab', desc: 'Supervised laboratory refactoring anemic public-field classes into encapsulated domain models with strict invariant enforcement.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Immutable Value Object Implementation', desc: 'Build an immutable Money / DateRange class with final fields, defensive copies, and side-effect-free operations.' },
        { phase: 'postclass', by: 'S', lab: false, name: "Tell-Don't-Ask Principle Critique", desc: 'Explain how excessive getter/setter chaining violates encapsulation and how moving behavior into the class fixes it.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 1, weight: '30', name: 'Code Refactoring Exercise', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Code Refactoring Exercise.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Access Modifier Visibility Matrix Check', desc: 'In-class quiz on subclass and cross-package visibility rules.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Defensive Copy & Invariant Audit', desc: 'Formative check confirming private collections cannot be mutated externally.' },
      ],
    },
    {
      weekIdx: 3, period: 'p',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Inheritance, super Delegation & UML Notation Study', desc: 'Read chapters on extends, superclass constructor chaining, method overriding, and UML class diagrams.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'UML Class Hierarchy Blueprint Drafting', desc: 'Draft a UML class diagram modeling a multi-tier employee/payroll or vehicle hierarchy with associations and multiplicities.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Inheritance Hierarchies, Method Overriding & Dynamic Dispatch Seminar', desc: 'Walkthrough of super delegation, method overriding vs. overloading, equals()/hashCode() contracts, and composition vs. inheritance.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Class Diagram Implementation Studio', desc: 'Studio laboratory translating a formal UML Class Diagram specification into working inheritance hierarchies with overridden polymorphic methods.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Prelim UML-to-Code Portfolio Submission', desc: 'Submit the verified UML class diagram and complete source code implementation with unit tests.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Overriding equals and hashCode Contract Analysis', desc: 'Document why overriding equals() without overriding hashCode() breaks hash-based collections.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 2, weight: '50', name: 'Class Diagram Implementation', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Class Diagram Implementation.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'UML Multiplicity & Relationship Check', desc: 'In-class check distinguishing generalization, aggregation, and composition arrows.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Method Overriding & super Delegation Rubric', desc: 'Formative verification of @Override semantics and constructor chaining.' },
      ],
    },
    {
      weekIdx: 4, period: 'm',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Abstract Classes & Template Method Pattern Study', desc: 'Read Freeman & Bloch chapters on abstract classes, abstract method contracts, and the Template Method design pattern.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Duplicated Algorithm Hierarchy Audit', desc: 'Examine three concrete report-generator classes containing duplicated workflow steps and identify candidates for an abstract base class.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Abstract Base Classes & Structural Contracts Lecture', desc: 'In-depth lecture on abstract vs. concrete classes, partial implementations, protected hook operations, and enforcing structural contracts.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Abstract Hierarchy & Template Method Lab', desc: 'Hands-on laboratory extracting an abstract DataExporter / PaymentProcessor base class and implementing concrete subclasses.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Extensibility Stress-Test: Adding New Subclasses', desc: 'Extend the abstract framework with two new concrete subclasses without modifying a single line of the abstract base class.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Abstract Class vs. Concrete Superclass Decision Brief', desc: 'Justify when a base concept should be prohibited from direct instantiation via the abstract keyword.' },
      ],
      assessments: [
        { tlaIdx: 2, iloIdx: 3, weight: '20', name: 'Objective Type Quiz', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Objective Type Quiz.' },
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Abstract Method Contract Lab Check', desc: 'Practical check of abstract base class compilation and concrete override completeness.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Template Method Hook Extensibility Audit', desc: 'Formative check confirming zero code duplication across concrete subclasses.' },
      ],
    },
    {
      weekIdx: 5, period: 'm',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Interfaces, Polymorphism & Dependency Injection Reading', desc: 'Study interface segregation, multiple interface implementation, default methods, and constructor dependency injection.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Tightly Coupled Service Refactoring Prep', desc: 'Inspect a service class hardcoded to concrete infrastructure classes that cannot be unit-tested offline.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Polymorphic Interfaces & Dependency Injection Seminar', desc: 'Walkthrough of decoupling components via interfaces, multiple inheritance of type, Strategy pattern, and constructor injection.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Interface Design Task: Decoupled Architecture Lab', desc: 'Supervised laboratory designing narrow interfaces and refactoring tightly coupled classes to accept interface dependencies via constructor injection.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Mock Implementation & Swappable Strategy Plug-In', desc: 'Implement an in-memory mock repository and swap it seamlessly into the service class via its interface contract.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Diamond Problem & Interface Default Methods Note', desc: 'Explain how Java/C# resolve conflicting default method implementations when a class implements multiple interfaces.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 4, weight: '30', name: 'Interface Design Task', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Interface Design Task.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Upcasting & Polymorphic Dispatch Check', desc: 'In-class trace of runtime method resolution across interface references.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Constructor Dependency Injection Audit', desc: 'Formative verification that high-level modules depend only on abstractions.' },
      ],
    },
    {
      weekIdx: 6, period: 'm',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Generic Collections Framework (List, Set, Map) Study', desc: 'Read Effective Java & Oracle documentation on parameterized types, ArrayList vs. LinkedList, HashSet, HashMap, and Comparator.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Raw Types vs. Generics Type-Safety Exercise', desc: 'Convert legacy raw List/Map code prone to ClassCastException into strongly-typed generic collections.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Generics, Hash Tables & Custom Comparators Lecture', desc: 'Instruction on algorithmic time complexity across List, Set, Map, custom generic <T> classes, and sorting.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Generic Collections & Multi-Key Sorting Lab', desc: 'Hands-on laboratory building a custom generic Repository<T, ID> and sorting/indexing domain objects using Comparable and chained Comparators.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'HashMap Bucket Collision & Lookup Benchmark', desc: 'Compare lookup and insertion performance across ArrayList, LinkedList, HashSet, and TreeSet for 100,000 domain records.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'ConcurrentModificationException & Safe Iteration Note', desc: 'Demonstrate why removing elements inside a for-each loop throws ConcurrentModificationException and how Iterator.remove() resolves it.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Generic Repository & Comparator Lab Rubric', desc: 'Formative laboratory check of type-safe <T> generics and custom sorting logic.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Collection Complexity Selection Check', desc: 'In-class diagnostic choosing optimal collection types for deduplication, FIFO queuing, and key-value indexing.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Hash Key Immutability Verification', desc: 'Verification that mutable fields are not used as HashMap keys.' },
      ],
    },
    {
      weekIdx: 7, period: 'm',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Component Packaging & Midterm Project Architecture Prep', desc: 'Review package modularity, interface-driven services, and generic collection indexing for the Midterm Data Structure Project.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Midterm Domain Model & Generic Store Scaffolding', desc: 'Scaffold the abstract base classes, service interfaces, and generic collection stores for the Midterm project.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Scalable OOP Component Architecture & Code Review Seminar', desc: 'Live architectural walkthrough combining abstract templates, polymorphic interfaces, dependency injection, and generic Map/Set/List engines.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Midterm Data Structure Project Studio & Defense', desc: 'Formal Midterm studio where students demonstrate their in-memory OOP engine utilizing abstract classes, interfaces, and generic collections.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Finalized Midterm Data Structure Project Submission', desc: 'Submit the complete Midterm codebase with comprehensive edge-case tests and UML component documentation.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Midterm Polymorphism & Generics Retrospective', desc: 'Document how generic types and interfaces eliminated code duplication and runtime cast errors.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 5, weight: '50', name: 'Data Structure Project', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Data Structure Project.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Interface & Abstract Hierarchy Cohesion Check', desc: 'In-class check of clean separation between contract interfaces and concrete implementations.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Generic Collection Memory & Search Audit', desc: 'Formative check of optimal HashMap/TreeSet/ArrayList usage in the Midterm project.' },
      ],
    },
    {
      weekIdx: 8, period: 's',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Exception Hierarchy, Try-With-Resources & Custom Exceptions Study', desc: 'Read Clean Code Chapter 7 (Error Handling) and Effective Java chapters on checked vs. unchecked exceptions and resource cleanup.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Swallowed Exception & Resource Leak Audit', desc: 'Identify empty catch blocks and unclosed stream leaks in a buggy sample application.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Robust Exception Handling & Custom Logger Architecture Lecture', desc: 'In-depth lecture on call-stack unwinding, multi-catch blocks, try-with-resources, custom domain exceptions, and file-based error logging.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Exception Handling & Custom Domain Exception Lab', desc: 'Hands-on laboratory authoring custom domain exceptions and wiring try-catch-finally recovery.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Exception Handling Post-Class Lab: Custom Flat-File Logger', desc: 'Implement a custom Logger class that captures exception stack traces, timestamps, and severity levels to a persistent flat log file rather than standard output.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Checked vs. Runtime Exceptions Design Philosophy Brief', desc: "Compare Java's checked exception model with C#/Kotlin unchecked exceptions for recoverable vs. programming errors." },
      ],
      assessments: [
        { tlaIdx: 2, iloIdx: 6, weight: '20', name: 'Objective Type Quiz', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Objective Type Quiz.' },
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Custom Exception & Stack Unwinding Check', desc: 'Practical check of exception chaining and finally execution.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Flat-File Logger Persistence Audit', desc: 'Formative verification that all caught exceptions are formatted and appended to application.log.' },
      ],
    },
    {
      weekIdx: 9, period: 's',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'GUI Layout Design Reading & UI Wireframe Drafting', desc: 'Study desktop GUI layout managers (BorderLayout, GridLayout, FlowLayout, GridBagLayout/Flex) and draft complete UI wireframes before entering the coding lab.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Component Tree Hierarchy Sketching', desc: 'Annotate the drafted UI wireframe with exact container nesting and layout constraints.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Desktop GUI Component Trees & Composite Layout Managers Seminar', desc: 'Demonstration of nested layout managers, responsive window resizing, typography/spacing borders, and tabular data display.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Wireframe to Code Activity: GUI Layout Construction Lab', desc: 'Supervised laboratory translating the pre-class UI wireframes into a pixel-accurate, resizable desktop GUI using standard library components.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Multi-Panel Master-Detail Form & Table Layout', desc: 'Build a master-detail split view combining a searchable data table panel with a validated input form sidebar.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Why Absolute Null-Layout Pixel Positioning Fails on HiDPI Screens', desc: 'Document how layout managers adapt to cross-platform OS font scaling and screen resolutions compared to hardcoded coordinates.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 7, weight: '30', name: 'Wireframe to Code Activity', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Wireframe to Code Activity.' },
        { tlaIdx: 0, iloIdx: null, weight: '0', name: 'Pre-Lab UI Wireframe Completeness Check', desc: 'Verification of student UI wireframes and container hierarchy annotations prior to coding.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Responsive Window Resize & Layout Audit', desc: 'Formative check ensuring controls do not clip or overlap when the window is resized.' },
      ],
    },
    {
      weekIdx: 10, period: 's',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Event Delegation Model & Observer Pattern Study', desc: 'Study the GUI Event Dispatch Loop, ActionListener, MouseListener, KeyListener, anonymous inner classes, and lambda listeners.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Event Source to Listener Wiring Diagram', desc: 'Map out all button clicks, table row selections, and keyboard shortcuts to their corresponding listener callbacks.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Event-Driven Programming, Listeners & EDT Responsiveness Lecture', desc: 'Instruction on wiring action/mouse/key listeners, updating UI models dynamically, and preventing Event Dispatch Thread (EDT) freezes.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Interactive Event Listener & Form Validation Lab', desc: 'Hands-on laboratory binding event listeners to GUI forms, implementing real-time input validation, and triggering modal error dialogs.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Dynamic Table Filtering & Keyboard Shortcut Integration', desc: 'Add live keystroke search filtering and keyboard accelerators (Ctrl+S, Delete, Esc) to the desktop GUI.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Observer Pattern in GUI Toolkits Analysis', desc: 'Trace how addActionListener() implements the classic Gang of Four Observer pattern to decouple UI widgets from business logic.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Event Listener Binding & Validation Rubric', desc: 'Formative laboratory check of responsive button/table/keyboard event handling and input validation.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'EDT Thread-Safety & invokeLater Check', desc: 'In-class check verifying UI mutations occur strictly on the Event Dispatch Thread.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Live Table Search & Modal Dialog Audit', desc: 'Verification of dynamic table model updates and user confirmation prompts.' },
      ],
    },
    {
      weekIdx: 11, period: 's',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Desktop MVC Architecture & Exception Recovery Study', desc: 'Read guides on separating Model, View, and Controller classes in desktop GUI applications and integrating flat-file exception logging.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Semifinal Interactive App Prototype Assembly', desc: 'Connect the MVC controller, custom domain exceptions, flat-file logger, and generic collection stores to the desktop GUI views.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'MVC Decoupling & End-to-End GUI Exception Handling Seminar', desc: 'Live demonstration of refactoring bloated GUI event handlers into clean MVC controllers with graceful user alerts and background file logging.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Semifinal Interactive App Prototype Defense', desc: 'Formal Semifinal demonstration of the event-driven desktop application featuring complete CRUD state, custom exception handling, and responsive layouts.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'UI Polish & Controller Decoupling Refinement', desc: 'Refine MVC separation and tab-focus usability based on Semifinal critique feedback.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Smart UI Anti-Pattern vs. MVC Architecture Reflection', desc: 'Explain why embedding business rules and data storage directly inside button listener callbacks creates unmaintainable code.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 8, weight: '50', name: 'Interactive App Prototype', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Interactive App Prototype.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'MVC Layer Separation Check', desc: 'In-class verification that domain Model classes contain zero GUI library imports.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'User-Friendly Exception Modal & Log Check', desc: 'Formative check confirming runtime errors show clean UI dialogs while writing stack traces to disk.' },
      ],
    },
    {
      weekIdx: 12, period: 'f',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Binary Serialization, ObjectOutputStream & transient Study', desc: 'Read Effective Java & Horstmann chapters on Serializable, ObjectOutputStream/ObjectInputStream, serialVersionUID, and transient fields.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Object Graph Serialization Sandbox Prep', desc: 'Annotate domain entity classes with Serializable and explicit serialVersionUID constants.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Binary Object Serialization & State Persistence Lecture', desc: 'Lecture on serializing deep object graphs, protecting sensitive fields with transient, and handling InvalidClassException version mismatches.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Binary State Snapshot & Restore Laboratory', desc: 'Hands-on laboratory persisting and restoring complete application collection states to binary .dat snapshot files.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Transient Password Redaction & Custom readObject Hook', desc: 'Verify that transient credential fields are excluded from binary dumps and re-initialized safely upon deserialization.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Binary Serialization vs. Textual Formats Security Brief', desc: 'Analyze deserialization gadget-chain risks when deserializing untrusted binary streams.' },
      ],
      assessments: [
        { tlaIdx: 2, iloIdx: 9, weight: '20', name: 'Objective Type Quiz', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for Objective Type Quiz.' },
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Object Graph Round-Trip Serialization Check', desc: 'Practical check verifying serialized and deserialized objects pass .equals() assertions.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Transient Field Hex-Dump Inspection', desc: 'Formative verification that transient secrets do not appear in the binary file.' },
      ],
    },
    {
      weekIdx: 13, period: 'f',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Buffered Character Streams & NIO File I/O Study', desc: 'Study BufferedReader, BufferedWriter, Files, Path, character encodings (UTF-8), and CSV/log parsing.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Malformed CSV & Unstructured Text Sample Prep', desc: 'Prepare sample multi-thousand-line CSV and unstructured log files containing quoted commas, blank lines, and malformed records.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'High-Performance Buffered File I/O & Text Parsing Seminar', desc: 'Walkthrough of byte vs. character streams, buffer sizing, try-with-resources stream closure, and resilient line-by-line parsing.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'File Parser Script: Import/Export Engine Practicum', desc: 'Supervised laboratory building a buffered file parser and exporter that converts unstructured/CSV text files into validated domain objects while logging malformed lines.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'GUI FileChooser Import/Export Integration', desc: 'Wire file dialogs into the desktop GUI to allow users to import and export reports to CSV and text files.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Unbuffered vs. Buffered I/O Syscall Benchmark Note', desc: 'Measure elapsed wall-clock time reading a 50MB text file byte-by-byte versus buffered blocks.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 10, weight: '30', name: 'File Parser Script', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for File Parser Script.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'UTF-8 Encoding & try-with-resources Check', desc: 'In-class verification of explicit UTF-8 charset specification and automatic file handle closure.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Malformed Row Recovery & Export Audit', desc: 'Formative check ensuring a single corrupt line is logged and skipped without crashing the import.' },
      ],
    },
    {
      weekIdx: 14, period: 'f',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'JDBC / ADO.NET, PreparedStatements & DAO Pattern Study', desc: 'Study relational database drivers, connection pooling, parameterized PreparedStatement queries, ResultSet mapping, and the DAO pattern.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Local Relational Schema & JDBC Driver Setup', desc: 'Create the relational database schema, add the JDBC/ADO.NET driver dependency, and configure connection properties.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Secure Database Connectivity, PreparedStatements & DAO Lecture', desc: 'Instruction on JDBC connection pooling, preventing SQL injection via parameterized PreparedStatements, transaction commit/rollback, and DAO interfaces.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'DAO Implementation & SQL Injection Defense Lab', desc: 'Hands-on laboratory implementing a concrete JDBC Data Access Object using PreparedStatement and connection pooling.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Transactional Batch Insert & Rollback Verification', desc: 'Implement a multi-table transactional workflow that cleanly rolls back all changes if a constraint violation occurs.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'String Concatenation SQL Injection Exploit Analysis', desc: "Demonstrate how ' OR '1'='1 compromises concatenated Statement queries and how PreparedStatement parameter binding neutralizes it." },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'DAO & Parameterized PreparedStatement Rubric', desc: 'Formative laboratory check verifying zero SQL string concatenation and proper ResultSet-to-object mapping.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Connection Pool & Resource Closure Check', desc: 'In-class check confirming Connection, PreparedStatement, and ResultSet are closed in try-with-resources.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'ACID Transaction Rollback Verification', desc: 'Verification of database state consistency after simulated mid-transaction failure.' },
      ],
    },
    {
      weekIdx: 15, period: 'f',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Full-Stack OOP Desktop Application Freeze & Defense Prep', desc: 'Finalize the integration of the MVC desktop GUI, file import/export parser, flat-file logger, and JDBC DAO persistence layer.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Executable Archive Packaging & Clean Database Smoke Test', desc: 'Package the application as an executable JAR/binary and test all CRUD and file I/O workflows against a fresh database.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Object-Oriented Software Craftsmanship & Defense Briefing', desc: 'Instructor briefing on final evaluation criteria: encapsulation, polymorphism, MVC separation, exception logging, and SQLi-safe persistence.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Capstone CRUD Application Integration Defense', desc: 'Formal Final oral defense and live demonstration of the complete object-oriented desktop application with database CRUD and file I/O.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Archival OOP Source Repository & UML Documentation Release', desc: 'Submit the final version-controlled repository, SQL schema script, updated UML class diagrams, and user manual.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Object-Oriented Programming Course Retrospective', desc: 'Complete a post-course reflection evaluating personal mastery across CO1-CO4 object-oriented competencies.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 11, weight: '50', name: 'CRUD Application Integration', desc: 'Summative evaluation metric testing OOP competency and syntax accuracy for CRUD Application Integration.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'End-to-End MVC to DAO Architecture Check', desc: 'Verification of clean layering from GUI View -> Controller -> Service Interface -> JDBC DAO.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Executable Package & Repository Sign-Off', desc: 'Final check of reproducible build, SQL schema script, and documentation.' },
      ],
    },
  ],
  comments: [
    {
      commenter_role: 'PROGRAM_HEAD',
      commenter_user_id: 2,
      commenter_name: 'Olivia Vance',
      message: "REVISION REQUIRED: The topic 'Interface Implementation and Polymorphism' is currently too theoretical. Update the subtopics to explicitly include 'Dependency Injection using Interfaces', as this is a strict requirement for modern OOP architectures before approval.",
      resolved_status: true,
      weekIdx: 5,
      comment_for: 'topics',
      targetKind: 'subtopic',
      targetIdx: 2,
    },
    {
      commenter_role: 'PROGRAM_HEAD',
      commenter_user_id: 2,
      commenter_name: 'Olivia Vance',
      message: "SECURITY FLAW DETECTED: The topic 'Database Connectivity Fundamentals' needs revision. Please replace the generic 'CRUD Operations' subtopic with 'Connection Pooling and Prepared Statements' to prevent students from being taught SQL injection vulnerabilities by mistake.",
      resolved_status: true,
      weekIdx: 14,
      comment_for: 'topics',
      targetKind: 'subtopic',
      targetIdx: 1,
    },
    {
      commenter_role: 'PROGRAM_HEAD',
      commenter_user_id: 2,
      commenter_name: 'Olivia Vance',
      message: "ACTION NEEDED: In the 'Exception Handling' post-class lab, the activity description relies on generic print stacks. Change the TLA requirements to strictly force students to log exceptions to a flat file using a custom Logger class. Standard output is not sufficient for this year level.",
      resolved_status: true,
      weekIdx: 8,
      comment_for: 'tlas',
      targetKind: 'tla',
      targetIdx: 4,
    },
    {
      commenter_role: 'PROGRAM_HEAD',
      commenter_user_id: 2,
      commenter_name: 'Olivia Vance',
      message: "UPDATE REQUIRED: The 'GUI Layout Design' pre-class reading is insufficient as an activity. Add a strict requirement in this TLA description for students to specifically draft UI wireframes before entering the coding lab, to align with our software engineering design standards.",
      resolved_status: true,
      weekIdx: 9,
      comment_for: 'tlas',
      targetKind: 'tla',
      targetIdx: 0,
    },
    {
      commenter_role: 'INDUSTRY_CONSULTANT',
      commenter_user_id: 4,
      commenter_name: 'Roberto Cruz',
      message: 'Consider incorporating design pattern implementations using modern cloud-native architectures in future syllabus revisions.',
      resolved_status: false,
      weekIdx: 5,
      comment_for: 'topics',
      targetKind: 'subtopic',
      targetIdx: 2,
    },
  ],
};

const REV2_DATA = {
  revision_number: 2,
  academic_period_id: 2,
  school_year: '2026-2027',
  semester: '1st Semester',
  has_modifications: true,
  is_revision_incremented: true,
  dates: {
    assigned: new Date('2026-06-01T09:00:00Z'),
    submitted1: new Date('2026-06-12T10:00:00Z'),
    phReturned: new Date('2026-06-16T11:30:00Z'),
    resubmitted: new Date('2026-06-22T09:00:00Z'),
    ldAccepted: new Date('2026-06-23T10:00:00Z'),
    phAccepted: new Date('2026-06-25T09:45:00Z'),
    deanApproved: new Date('2026-06-28T15:00:00Z'),
    icSuggest: new Date('2026-07-02T14:00:00Z'),
  },
  course_description:
    'Covers fundamental and modern enterprise concepts of object-oriented programming (OOP). Topics include polymorphism, interfaces, SOLID principles, Gang of Four (GoF) design patterns, lambda expressions, Stream APIs, and Test-Driven Development (TDD).',
  courseOutcomes: [
    'CO1: Apply core object-oriented and SOLID principles to architect robust and decoupled software models.',
    'CO2: Implement advanced language features including generic programming, lambda expressions, and Stream APIs.',
    'CO3: Design software using foundational Gang of Four (GoF) design patterns and event-driven architectures.',
    'CO4: Validate object behavior using automated Unit Testing and integrate data persistence mechanisms.',
  ],
  poAlignments: [
    { coIdx: 0, po_id: 1, attainment_level: 'E' },
    { coIdx: 0, po_id: 3, attainment_level: 'E' },
    { coIdx: 0, po_id: 6, attainment_level: 'D' },
    { coIdx: 1, po_id: 2, attainment_level: 'D' },
    { coIdx: 1, po_id: 4, attainment_level: 'D' },
    { coIdx: 1, po_id: 8, attainment_level: 'E' },
    { coIdx: 2, po_id: 5, attainment_level: 'D' },
    { coIdx: 2, po_id: 7, attainment_level: 'D' },
    { coIdx: 2, po_id: 9, attainment_level: 'E' },
    { coIdx: 3, po_id: 2, attainment_level: 'E' },
    { coIdx: 3, po_id: 3, attainment_level: 'D' },
    { coIdx: 3, po_id: 10, attainment_level: 'D' },
  ],
  ilos: [
    // Orientation
    { coIdx: 0, is_orientation: true, hours: 2, weeks: 0.4, description: "Cite the value and relevance of the University's and the College's VMO as related to the course", assessment_tool: null, prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 0, target: null, ied_level: 'I' },
    // CO1
    { coIdx: 0, is_orientation: false, hours: 6, weeks: 1.2, description: 'Define class blueprints and encapsulate state using advanced property methods.', assessment_tool: 'Profiling Analysis', prelim_weight: 20, midterm_weight: 0, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'E' },
    { coIdx: 0, is_orientation: false, hours: 6, weeks: 1.2, description: 'Construct deep hierarchical relationships and analyze Liskov Substitution violations.', assessment_tool: 'SOLID Refactoring Lab', prelim_weight: 30, midterm_weight: 0, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'E' },
    { coIdx: 0, is_orientation: false, hours: 6, weeks: 1.2, description: 'Apply the Single Responsibility and Open/Closed principles in class design.', assessment_tool: 'Decoupled Domain Architecture', prelim_weight: 50, midterm_weight: 0, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'D' },
    // CO2
    { coIdx: 1, is_orientation: false, hours: 6, weeks: 1.2, description: 'Design interfaces to enforce structural contracts and multiple inheritance.', assessment_tool: 'Objective-Type Quiz', prelim_weight: 0, midterm_weight: 20, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'E' },
    { coIdx: 1, is_orientation: false, hours: 7, weeks: 1.4, description: 'Utilize generic collections with bounds and wildcards for type-safe data.', assessment_tool: 'Bounded Generics Practicum', prelim_weight: 0, midterm_weight: 30, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'D' },
    { coIdx: 1, is_orientation: false, hours: 7, weeks: 1.4, description: 'Implement lambda expressions and functional interfaces for declarative Stream API logic.', assessment_tool: 'Declarative Stream Pipeline Project', prelim_weight: 0, midterm_weight: 50, semi_weight: 0, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'D' },
    // CO3
    { coIdx: 2, is_orientation: false, hours: 6, weeks: 1.2, description: 'Construct objects securely using Creational patterns (Singleton, Factory).', assessment_tool: 'Objective-Type Quiz', prelim_weight: 0, midterm_weight: 0, semi_weight: 20, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'E' },
    { coIdx: 2, is_orientation: false, hours: 7, weeks: 1.4, description: 'Manage component communication using Behavioral patterns (Observer, Strategy).', assessment_tool: 'Design Pattern Implementation', prelim_weight: 0, midterm_weight: 0, semi_weight: 30, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'D' },
    { coIdx: 2, is_orientation: false, hours: 7, weeks: 1.4, description: 'Create declarative graphical user interface layouts and event listeners.', assessment_tool: 'Reactive GoF UI Architecture', prelim_weight: 0, midterm_weight: 0, semi_weight: 50, final_weight: 0, target: '90% of students will score at least 60%', ied_level: 'D' },
    // CO4
    { coIdx: 3, is_orientation: false, hours: 6, weeks: 1.2, description: 'Read, write, and serialize complex objects to JSON/XML via NIO.2 Streams.', assessment_tool: 'Objective-Type Quiz', prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 20, target: '90% of students will score at least 60%', ied_level: 'E' },
    { coIdx: 3, is_orientation: false, hours: 7, weeks: 1.4, description: 'Establish secure relational database connectivity using HikariCP connection pooling.', assessment_tool: 'TDD & Mockito Verification Suite', prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 30, target: '90% of students will score at least 60%', ied_level: 'D' },
    { coIdx: 3, is_orientation: false, hours: 7, weeks: 1.4, description: 'Write comprehensive unit tests and implement mocking for decoupled enterprise components.', assessment_tool: 'Enterprise Data Integration', prelim_weight: 0, midterm_weight: 0, semi_weight: 0, final_weight: 50, target: '90% of students will score at least 60%', ied_level: 'D' },
  ],
  references: [
    // 0: OR
    { title: 'UNC Student Handbook & Institutional VMO', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publisher: 'University of Nueva Caceres', publication_year: null, copies: null, type: 'Online Resources' },
    // 1-8: TEXTBOOKS
    { title: 'Modern Java in Action: Lambdas, Streams, and Functional Architecture', author: 'Raoul-Gabriel Urma', isbn: '978-1617293566', link: null, publisher: 'Manning Publications', publication_year: '2024-01-01', copies: 6, type: 'Textbook' },
    { title: 'Head First Design Patterns, 2nd Edition', author: 'Eric Freeman & Elisabeth Robson', isbn: '978-1492078005', link: null, publisher: "O'Reilly Media", publication_year: '2021-01-01', copies: 5, type: 'Textbook' },
    { title: "Clean Architecture: A Craftsman's Guide to Software Structure and Design", author: 'Robert C. Martin', isbn: '978-0134494166', link: null, publisher: 'Prentice Hall', publication_year: '2017-01-01', copies: 4, type: 'Textbook' },
    { title: 'Test-Driven Development: By Example', author: 'Kent Beck', isbn: '978-0321146533', link: null, publisher: 'Addison-Wesley', publication_year: '2002-01-01', copies: 3, type: 'Textbook' },
    { title: 'Refactoring: Improving the Design of Existing Code (2nd Edition)', author: 'Martin Fowler', isbn: '978-0134757599', link: null, publisher: 'Addison-Wesley', publication_year: '2018-01-01', copies: 4, type: 'Textbook' },
    { title: 'Design Patterns: Elements of Reusable Object-Oriented Software (GoF)', author: 'Erich Gamma, Richard Helm, Ralph Johnson & John Vlissides', isbn: '978-0201633610', link: null, publisher: 'Addison-Wesley', publication_year: '1994-01-01', copies: 3, type: 'Textbook' },
    { title: 'Effective Java, 3rd Edition', author: 'Joshua Bloch', isbn: '978-0134685991', link: null, publisher: 'Addison-Wesley', publication_year: '2018-01-01', copies: 5, type: 'Textbook' },
    { title: 'Domain-Driven Design: Tackling Complexity in the Heart of Software', author: 'Eric Evans', isbn: '978-0321125217', link: null, publisher: 'Addison-Wesley', publication_year: '2003-01-01', copies: 3, type: 'Textbook' },
    // 9-10: OR
    { title: 'Oracle Java 21 LTS Documentation & Stream API Guide', author: 'Oracle Corporation', isbn: null, link: 'https://docs.oracle.com/en/java/javase/21/', publisher: 'Oracle', publication_year: null, copies: null, type: 'Online Resources' },
    { title: 'Microsoft .NET 8 C# Advanced Programming Guide', author: 'Microsoft', isbn: null, link: 'https://learn.microsoft.com/en-us/dotnet/csharp/', publisher: 'Microsoft', publication_year: null, copies: null, type: 'Online Resources' },
    // 11: OER
    { title: 'Refactoring.Guru: GoF Design Patterns & SOLID Catalog', author: 'Alexander Shvets', isbn: '978-0999123449', link: 'https://refactoring.guru/design-patterns', publisher: 'Refactoring.Guru', publication_year: '2024-01-01', copies: null, type: 'Open Educational Resources' },
    // 12: OR
    { title: 'Baeldung: Guide to Java 8+ Streams & Functional Interfaces', author: 'Eugen Paraschiv', isbn: null, link: 'https://www.baeldung.com/java-8-streams', publisher: 'Baeldung', publication_year: null, copies: null, type: 'Online Resources' },
    // 13-15: OER
    { title: 'JUnit 5 User Guide & Parameterized Testing Reference', author: 'JUnit Team', isbn: '978-1449370770', link: 'https://junit.org/junit5/docs/current/user-guide/', publisher: 'JUnit', publication_year: '2025-01-01', copies: null, type: 'Open Educational Resources' },
    { title: 'Mockito Framework Official Documentation', author: 'Mockito Team', isbn: '978-1783982745', link: 'https://site.mockito.org/', publisher: 'Mockito', publication_year: '2025-01-01', copies: null, type: 'Open Educational Resources' },
    { title: 'Software Design Patterns (MIT OpenCourseWare)', author: 'MIT Press', isbn: '978-0262033848', link: 'https://ocw.mit.edu/', publisher: 'MIT Press', publication_year: '2022-01-01', copies: null, type: 'Open Educational Resources' },
  ],
  // Every week slice (including orientation & regular W1) has >= 1 Textbook (indices 1..8)
  weekRefSpecs: [
    [
      { refIdx: 1, is_orientation: true },   // Textbook: Modern Java in Action (2024)
      { refIdx: 0, is_orientation: true },   // OR: UNC Student Handbook
      { refIdx: 3, is_orientation: false },  // Textbook: Clean Architecture
      { refIdx: 11, is_orientation: false }, // OER: Refactoring.Guru
    ],
    [5, 7],   // Week 2
    [3, 5],   // Week 3
    [3, 8],   // Week 4
    [7, 9],   // Week 5
    [7, 10],  // Week 6
    [1, 12],  // Week 7
    [1, 9],   // Week 8
    [2, 6],   // Week 9
    [6, 11],  // Week 10
    [2, 11],  // Week 11
    [2, 15],  // Week 12
    [7, 9],   // Week 13
    [3, 9],   // Week 14
    [4, 13],  // Week 15
    [4, 14],  // Week 16
  ],
  weeklyCurriculum: [
    {
      weekIdx: 0,
      topics: [
        {
          title: 'Course Orientation and VMO Alignment',
          is_orientation: true,
          subtopics: [
            { title: 'University and College VMO, Core Values, and Quality Policy', minutes: 40 },
            { title: 'Revision 2 Enterprise OOP Syllabus, Grading Criteria, and Lab Rules', minutes: 45 },
            { title: 'Ethical AI Co-Pilot Usage and Code Ownership Standards', minutes: 35 },
          ],
        },
        {
          title: 'Advanced Memory Models & GC',
          is_orientation: false,
          subtopics: [
            { title: 'Stack Frames, Object Headers, and Generational Heap Allocation (Eden, Survivor, Tenured)', minutes: 30 },
            { title: 'Garbage Collection Algorithms (G1GC, ZGC) and Reachability Roots', minutes: 30 },
            { title: 'Escape Analysis, String Interning, and Preventing Memory Leaks in Object Graphs', minutes: 30 },
          ],
        },
        {
          title: 'Clean Architecture Foundations and Enterprise OOP Tooling',
          is_orientation: false,
          subtopics: [
            { title: 'Enterprise Build Pipelines (Maven/Gradle), Static Analysis, and Linting Standards', minutes: 30 },
            { title: 'Software Maintainability Metrics: Coupling, Cohesion, and Cyclomatic Complexity', minutes: 30 },
            { title: 'Profiling Runtime Allocation Hotspots with VisualVM and Java Flight Recorder', minutes: 30 },
          ],
        },
      ],
    },
    {
      weekIdx: 1,
      topics: [
        { title: 'Classes, Objects & Heap Allocation', subtopics: ['Fluent Builder Pattern, Static Factory Methods, and Telescoping Constructor Elimination', 'Deep Encapsulation Strategies: Defensive Copies and Immutable Record Types (record)', 'Value-Based Object Identity (equals, hashCode, Comparable Contracts)'] },
        { title: 'Advanced Inheritance Trees', subtopics: ['Sealed Classes and Permitted Subtype Hierarchies (sealed, permits)', 'Fragile Base Class Problem and Favoring Composition Over Inheritance', 'Covariant Return Types, Method Hiding vs. Overriding, and Virtual Dispatch Performance'] },
      ],
    },
    {
      weekIdx: 2,
      topics: [
        { title: 'Single Responsibility Principle (SRP)', subtopics: ['Identifying Actor-Driven Reasons to Change and Cohesion Metrics (LCOM)', 'Decomposing God Classes into Focused Domain Collaborators', 'Separating Business Policy Rules from Infrastructure and Formatting Logic'] },
        { title: 'Open/Closed Principle (OCP) & Liskov Substitution Principle (LSP)', subtopics: ['Designing Plugin Abstractions Open for Extension but Closed for Modification', 'Liskov Behavioral Subtyping: Preconditions, Postconditions, and History Constraints', 'Diagnosing and Refactoring Classic LSP Violations (Rectangle/Square, UnsupportedOperationException)'] },
      ],
    },
    {
      weekIdx: 3,
      topics: [
        { title: 'Interface Segregation Principle (ISP)', subtopics: ['Splitting Fat Interfaces into Role-Specific Client Contracts', 'Preventing Degenerate/No-Op Method Implementations in Subclasses', 'Adapter Facades for Fine-Grained Interface Composition'] },
        { title: 'Dependency Inversion Principle (DIP)', subtopics: ['Inverting Source Code Dependencies Against High-Level Policy Abstractions', 'IoC Containers, Constructor Injection, and Pure Dependency Graphs', 'Hexagonal (Ports and Adapters) Domain Model Isolation'] },
      ],
    },
    {
      weekIdx: 4,
      topics: [
        { title: 'Abstract Classes vs Interfaces', subtopics: ['Evolution of Interfaces: Default, Static, and Private Interface Methods', 'Mixin Composition via Multiple Interfaces vs. Stateful Abstract Base Classes', 'Designing Sealed Interfaces for Exhaustive Pattern Matching'] },
        { title: 'Generic Classes & Type Erasure', subtopics: ['Parameterized Types, Type Parameters, and Compiler Type Erasure Bridge Methods', 'Heap Pollution, @SafeVarargs, and Reifiable vs. Non-Reifiable Types', 'Implementing Generic Domain Repositories and Type-Safe Result Wrappers'] },
      ],
    },
    {
      weekIdx: 5,
      topics: [
        { title: 'Wildcards in Generics', subtopics: ['Covariance (? extends T), Contravariance (? super T), and Invariance', "Applying Joshua Bloch's PECS Rule (Producer Extends, Consumer Super)", 'Recursive Type Bounds (<T extends Comparable<? super T>>) and Type Token Capture'] },
        { title: 'High-Performance Concurrent and Immutable Collections', subtopics: ['Unmodifiable Views vs. Truly Immutable Collections (List.of, Map.copyOf)', 'Lock-Striped ConcurrentHashMap, CopyOnWriteArrayList, and Blocking Queues', 'Custom Comparator Combinators (comparing, thenComparing, nullsLast)'] },
      ],
    },
    {
      weekIdx: 6,
      topics: [
        { title: 'Lambda Expressions Syntax', subtopics: ['Lexical Scoping, Effectively Final Variable Capture, and Closure Semantics', 'Method References (Static, Bound/Unbound Instance, Constructor References)', 'State Mutation Pitfalls, Side-Effects, Immutability, and Concurrency Risks in Lambdas'] },
        { title: 'Built-in Functional Interfaces', subtopics: ['Core Functional Signatures: Predicate<T>, Function<T,R>, Consumer<T>, and Supplier<T>', 'Primitive Specializations (IntFunction, ToDoubleFunction) to Eliminate Autoboxing', 'Higher-Order Function Composition (andThen, compose, negate) and Currying'] },
      ],
    },
    {
      weekIdx: 7,
      topics: [
        { title: 'The Stream API Pipeline', subtopics: ['Lazy Evaluation, Intermediate vs. Terminal Operations, and Spliterator Internals', 'Filtering, Mapping, FlatMapping (flatMap), Slicing, and Short-Circuiting Operations', 'Stateful vs. Stateless Intermediate Transformations and Peeking Diagnostics'] },
        { title: 'Filtering and Mapping Streams & Advanced Collectors', subtopics: ['Terminal Reductions (reduce) and Mutable Reductions with Collectors', 'Downstream Multi-Level Grouping (groupingBy), Partitioning (partitioningBy), and teeing', 'Parallel Streams (ForkJoinPool), Non-Interference Rules, and When Parallelism Degrades Speed'] },
      ],
    },
    {
      weekIdx: 8,
      topics: [
        { title: 'Creational Patterns: Singleton', subtopics: ['Eager Initialization vs. Lazy Initialization Race Conditions', 'Thread-Safety Mechanisms: synchronized, Volatile Double-Checked Locking, and Bill Pugh Holder Idiom', 'Enum Singletons Against Serialization/Reflection Attacks and Dependency Injection Alternatives'] },
        { title: 'Creational Patterns: Factory Method & Abstract Factory', subtopics: ['Decoupling Client Code from Concrete Class Instantiation via Factory Methods', 'Dynamic Factory Registration Using Reflection and Supplier Maps Instead of Switch Statements', 'Abstract Factory Families for Cross-Platform UI/Driver Toolkits'] },
      ],
    },
    {
      weekIdx: 9,
      topics: [
        { title: 'Structural Patterns: Adapter & Facade', subtopics: ['Object Adapter vs. Class Adapter for Wrapping Incompatible Third-Party SDKs', 'Facade Pattern for Simplifying Complex Subsystems Behind a Unified Interface', 'Two-Way Adapters and Pluggable Protocol Translators'] },
        { title: 'Structural Patterns: Decorator, Proxy & Composite', subtopics: ['Dynamic Behavior Wrapping with the Decorator Pattern vs. Static Subclass Explosion', 'Virtual, Protection, and Caching Proxies Using Dynamic Proxy Invocation Handlers', 'Composite Pattern for Uniformly Treating Leaf Nodes and Recursive Tree Hierarchies'] },
      ],
    },
    {
      weekIdx: 10,
      topics: [
        { title: 'Behavioral Patterns: Observer', subtopics: ['Subject-Observer Subscription Contracts and Push vs. Pull Notification Payloads', 'Preventing Memory Leaks from the Lapsed Listener Problem via Explicit Unregistration and WeakReferences', 'Reactive Event Buses (Flow / Observable) and Asynchronous Subscriber Backpressure'] },
        { title: 'Behavioral Patterns: Strategy, Command & State', subtopics: ['Strategy Pattern Using Functional Interfaces to Swap Algorithms at Runtime', 'Command Pattern for Undo/Redo History Stacks and Transactional Macro Queues', 'State Pattern for Eliminating Complex Conditional State-Machine Branches'] },
      ],
    },
    {
      weekIdx: 11,
      topics: [
        { title: 'Declarative UI Component Lifecycle & Layout Managers', subtopics: ['Modern Declarative Scene Graphs, Property Binding, and Observable Collections', 'Responsive Grid, Flex/Flow, and Anchor Layout Managers in Modern Desktop UIs', 'Custom Reusable Composite UI Controls and CSS/Theme Styling'] },
        { title: 'Event-Driven Architecture & Exception Handling', subtopics: ['Command/Event Routing, Debouncing, and Non-Blocking Async UI Worker Tasks (CompletableFuture)', 'Centralized Uncaught Exception Handlers and Custom Domain Exception Hierarchies', 'Model-View-ViewModel (MVVM) / MVC Presentation Layer Decoupling'] },
      ],
    },
    {
      weekIdx: 12,
      topics: [
        { title: 'Object Serialization (JSON/XML) & Advanced File I/O (NIO.2)', subtopics: ['Jackson / Gson / System.Text.Json Polymorphic Object Mapping and Custom Type Adapters', 'Non-Blocking File I/O (NIO.2 Path, Files.lines Lazy Streams, and FileChannel)', 'Watching Directory Events (WatchService) and Safe Atomic File Writes'] },
        { title: 'Custom Domain Exceptions & Fault-Tolerant Persistence', subtopics: ['Designing Contextual Domain Exceptions with Error Codes and Remediation Hints', 'Functional Error Handling with Optional<T> and Result<T, E> Monads', 'Corrupt File Quarantine, Checksum Verification, and Structured Audit Logging'] },
      ],
    },
    {
      weekIdx: 13,
      topics: [
        { title: 'JDBC / ADO.NET Architecture & Connection Pooling', subtopics: ['DataSource Abstraction and High-Performance HikariCP Connection Pool Sizing', 'Connection Leak Detection, Timeout Thresholds, and Health Validation Queries', 'Repository and Unit-of-Work Patterns Over Relational Connections'] },
        { title: 'Prepared Statements & SQLi Prevention', subtopics: ['Parameterized PreparedStatement Execution Plans and Strict SQL Injection Defense', 'Batch Updates (addBatch/executeBatch), Generated Keys, and Optimistic Locking', 'Transaction Isolation Levels (READ_COMMITTED, SERIALIZABLE) and Rollback Recovery'] },
      ],
    },
    {
      weekIdx: 14,
      topics: [
        { title: 'Unit Testing Fundamentals (JUnit/NUnit)', subtopics: ['xUnit Lifecycle Annotations (@BeforeEach, @AfterEach, @Nested, @DisplayName)', 'Arrange-Act-Assert (AAA) Structure, Fluent Assertions (AssertJ), and Exception Testing (assertThrows)', 'Parameterized Tests (@ParameterizedTest, @CsvSource, @MethodSource) for Boundary Coverage'] },
        { title: 'Mocking Dependencies (Mockito/Moq)', subtopics: ['Test Doubles Taxonomy: Dummy, Fake, Stub, Spy, and Mock Objects', 'Stubbing Interface Collaborators (when(...).thenReturn(...)) and Argument Captors', 'Verifying Behavioral Interactions (verify(mock, times(1))) Without Over-Mocking Internals'] },
      ],
    },
    {
      weekIdx: 15,
      topics: [
        { title: 'Test-Driven Development (TDD) Lifecycle', subtopics: ["Kent Beck's Red-Green-Refactor Micro-Cycle and Writing the Test First", 'Triangulation, Obvious Implementation, and Refactoring Toward SOLID & GoF Patterns', 'Code Coverage Metrics (Line, Branch, Mutation Testing with PIT) and Legacy Seam Refactoring'] },
        { title: 'Capstone Enterprise OOP & TDD Architecture Defense', subtopics: ['Walkthrough of SOLID Boundaries, GoF Design Patterns, and Functional Stream Pipelines', 'Live Execution of the JUnit 5 / Mockito Test Suite and HikariCP Database Integration', 'Oral Defense of Thread Safety, Memory Efficiency, and Clean Architecture Decisions'] },
      ],
    },
  ],
  weeklyTlas: [
    {
      weekIdx: 0, period: 'p',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'UNC VMO & Clean Architecture Charter Reading', desc: "Read the UNC Student Handbook, SCIS VMO guide, and Robert C. Martin's Clean Architecture preface." },
        { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'JVM/CLR Generational Heap & GC Overview Study', desc: 'Study how modern managed runtimes allocate objects across Eden, Survivor, and Tenured heap spaces.' },
        { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation Lecture', desc: 'Orientation covering Rev 2 advancements (SOLID, Streams, GoF Patterns, TDD), grading weights, and VMO alignment.' },
        { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'Heap Memory Profiling Lab', desc: 'Hands-on laboratory using VisualVM / JFR profiler to inspect object allocation rates, GC pauses, and heap dumps.' },
        { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO & Software Craftsmanship Manifesto', desc: 'Author a personal engineering manifesto connecting UNC core values to testable, maintainable object-oriented code.' },
        { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Memory Leak Hunt: Static Collection Retention', desc: 'Diagnose and fix an intentional OutOfMemoryError caused by unremoved object references in a static cache.' },
      ],
      assessments: [
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'VMO & Rev 2 Syllabus Check', desc: 'Formative check of course expectations, TDD workflow rules, and VMO alignment.' },
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'VisualVM Heap Dump Inspection Check', desc: 'In-class verification of retained heap size and GC root identification.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Craftsmanship Manifesto Rubric', desc: 'Formative evaluation of the VMO alignment artifact.' },
      ],
    },
    {
      weekIdx: 1, period: 'p',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Effective Java: Builders, Records & Sealed Classes Study', desc: "Read Joshua Bloch's chapters on Builder pattern, immutable value objects, and equals/hashCode contracts." },
        { phase: 'preclass', by: 'S', lab: true, name: 'Object Instance Tracing', desc: 'Trace object construction, defensive copying, and sealed hierarchy subtype restrictions.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Deep Encapsulation, Immutable Records & Composition Seminar', desc: 'Lecture on eliminating telescoping constructors, defending internal mutable collections, and favoring composition over inheritance.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Encapsulation Breach Sandbox', desc: 'Laboratory exercise auditing and sealing encapsulation breaches in a financial domain model using Builders and immutable records.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Hierarchy Mapping Drill: Composition Refactoring', desc: 'Refactor a brittle 4-level inheritance tree suffering from the fragile base class problem into composed strategy delegates.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Symmetry & Transitivity in equals() Case Analysis', desc: 'Prove why adding value fields in a subclass instanceof equals() override violates symmetry with the superclass.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 0, weight: '20', name: 'Profiling Analysis', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Defensive Copy & Record Immutability Check', desc: 'In-class verification that returned collection views are unmodifiable.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Composition over Inheritance Refactoring Check', desc: 'Formative check of delegate forwarding methods.' },
      ],
    },
    {
      weekIdx: 2, period: 'p',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Martin Clean Architecture: SRP, OCP & LSP Study', desc: 'Study Single Responsibility, Open/Closed, and Liskov Substitution principles with code smell examples.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Liskov Violation Hunt', desc: 'Analyze a class hierarchy where overridden methods strengthen preconditions or throw UnsupportedOperationException.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'SRP Cohesion, Open/Closed Plugins & Liskov Contracts Lecture', desc: 'Walkthrough of decomposing God classes, designing OCP extension points, and enforcing LSP behavioral subtyping.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'SRP Refactoring Exercise & OCP Extensibility Lab', desc: 'Supervised practicum decomposing a monolithic OrderManager into SRP-compliant services and OCP plugin rules without modifying core code.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'LSP Contract Test Suite Implementation', desc: 'Write an abstract contract test class executed against all concrete subtypes to guarantee Liskov substitutability.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Square-Rectangle & ReadOnlyList LSP Critique', desc: 'Explain why Square extends Rectangle violates mutable geometric invariants at runtime.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 1, weight: '30', name: 'SOLID Refactoring Lab', desc: 'Summative evaluation metric testing SOLID refactoring and behavioral subtyping rigor.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'LSP Precondition/Postcondition Check', desc: 'In-class diagnostic identifying behavioral subtyping violations.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'OCP Zero-Modification Extension Audit', desc: 'Formative check confirming new pricing/tax rules require zero edits to existing classes.' },
      ],
    },
    {
      weekIdx: 3, period: 'p',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Interface Segregation (ISP) & Dependency Inversion (DIP) Study', desc: 'Read Clean Architecture chapters on role interfaces, dependency inversion across architectural boundaries, and IoC wiring.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Interface Decoupling Challenge Prep', desc: 'Map out fat interface dependencies in a sample enterprise billing module and design segregated role interfaces.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'ISP Role Contracts & DIP Hexagonal Boundaries Seminar', desc: 'Live architectural refactoring inverting database and notification dependencies so the core domain has zero outward coupling.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Dependency Injection Lab: SOLID Domain Studio', desc: 'Studio laboratory completing the Prelim SOLID domain architecture using segregated interfaces and constructor dependency injection.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Prelim SOLID Architecture Repository Submission', desc: 'Submit the refactored, 100% SOLID-compliant domain codebase with dependency graph diagrams.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Static Dependency Analysis & Cyclic Package Audit', desc: 'Verify zero upward/circular package dependencies between domain, application, and infrastructure layers.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 2, weight: '50', name: 'Decoupled Domain Architecture', desc: 'Summative evaluation metric testing decoupled SOLID architecture and dependency inversion.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Fat Interface Segregation Check', desc: 'In-class verification that no client is forced to depend on unused interface methods.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'DIP Constructor Injection Purity Audit', desc: 'Formative check confirming zero concrete infrastructure instantiations inside domain logic.' },
      ],
    },
    {
      weekIdx: 4, period: 'm',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Generic Type Erasure & Default Interface Methods Study', desc: 'Read Effective Java Item 26-30 on generic types, type erasure, bridge methods, and default interface methods.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Abstract Component Build Prep', desc: 'Inspect bytecode output of a generic class to observe compiler-inserted cast and bridge instructions.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Advanced Interfaces, Mixins & Generic Type Erasure Lecture', desc: 'In-depth lecture on stateful abstract classes vs. stateless interface mixins, generic type tokens, and heap pollution.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Generic Class Implementation Lab', desc: 'Hands-on laboratory building a type-safe heterogeneous container and a generic Result<T, E> union wrapper.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Composable Interface Mixin Library', desc: 'Implement reusable Auditable, Identifiable<ID>, and Versioned interfaces with default behavior composition.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Why Generic Instantiation Fails Under Erasure', desc: 'Explain runtime type erasure limitations and how Class<T> type tokens or Supplier<T> factories overcome them.' },
      ],
      assessments: [
        { tlaIdx: 2, iloIdx: 3, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative evaluation metric testing interface contracts and generic type erasure.' },
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Zero Unchecked Cast Warning Check', desc: 'Practical check confirming compilation with -Xlint:unchecked produces zero warnings.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Heterogeneous Type-Token Container Audit', desc: 'Formative review of Class<T>.cast() safety.' },
      ],
    },
    {
      weekIdx: 5, period: 'm',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Bloch PECS Rule (? extends / ? super) & Concurrent Collections Study', desc: 'Study bounded wildcards, variance, Comparable<? super T>, and concurrent collections.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Invariant Generic Signature Failure Drill', desc: 'Examine why List<Integer> cannot be passed to a method accepting List<Number> and how wildcards resolve it.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Bounded Wildcards (PECS) & Comparator Combinators Seminar', desc: 'Walkthrough of Producer-Extends / Consumer-Super (PECS) signatures, recursive type bounds, and functional Comparator chains.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Wildcard Boundaries Exercise', desc: 'Supervised laboratory refactoring rigid collection utility methods to use maximally flexible ? extends T and ? super T wildcard bounds.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Generic Merge & Max Utility with Recursive Bounds', desc: 'Implement a generic max utility with recursive bounds and test across subtype hierarchies.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Covariance of Arrays vs. Invariance of Generics Note', desc: 'Contrast runtime ArrayStoreException vs. compile-time generic invariance checking.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 4, weight: '30', name: 'Bounded Generics Practicum', desc: 'Summative evaluation metric testing bounded wildcards, PECS, and concurrent collections.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'PECS Producer/Consumer Signature Check', desc: 'In-class diagnostic applying ? extends and ? super to API method parameters.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Recursive Comparable Bound Verification', desc: 'Formative check that subclasses inheriting Comparable from a superclass compile cleanly.' },
      ],
    },
    {
      weekIdx: 6, period: 'm',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Urma Modern Java in Action: Lambdas & Immutability Study', desc: 'Read chapters on lambda expressions, lexical variable capture, method references, functional interfaces, and side-effect-free closures.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Lambda Syntax Drill', desc: 'Refactor anonymous inner classes (Predicate, Comparator, Callable) into concise lambda expressions and method references.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Functional Interfaces, Closures & Concurrency Pitfalls Lecture', desc: 'Instruction on composing Predicate/Function pipelines, avoiding primitive autoboxing, and preventing shared-state mutation race conditions inside lambdas.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Functional Interface Mapping Lab', desc: 'Hands-on laboratory building a declarative validation and transformation rule engine using composed Predicate and Function chains.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Side-Effect & Concurrency Audit in Functional Closures', desc: 'Eliminate external array/list mutations inside lambda bodies to guarantee thread-safe stateless execution.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'invokedynamic vs. Anonymous Inner Class Bytecode Brief', desc: 'Explain how the JVM uses invokedynamic lambda metafactories instead of generating separate .class files.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Functional Rule Engine Composition Rubric', desc: 'Formative laboratory check of Predicate.and/or/negate and Function.andThen pipelines.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Effectively Final & Side-Effect Check', desc: 'In-class check identifying unsafe mutable state capture in lambdas.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Primitive Functional Specialization Check', desc: 'Verification of IntPredicate/ToDoubleFunction usage in hot loops.' },
      ],
    },
    {
      weekIdx: 7, period: 'm',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Baeldung & Urma Stream API Collectors & Spliterators Study', desc: 'Study lazy stream pipelines, flatMap, reduce, Collectors.groupingBy, partitioningBy, teeing, and parallel stream hazards.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Imperative Nested Loops to Stream Refactoring Prep', desc: 'Select five complex imperative data-aggregation loops with nested if/for blocks for functional refactoring.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Declarative Stream Pipelines & Multi-Level Collectors Seminar', desc: 'Live demonstration of lazy short-circuiting, flatMap flattening, downstream groupingBy collectors, and parallel stream benchmarks.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Stream API Pipeline Build & Declarative Data Filtering Lab', desc: 'Formal Midterm studio building an in-memory analytics engine using pure declarative Stream pipelines, custom collectors, and bounded generics.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Midterm Stream Analytics Engine Submission', desc: 'Submit the complete Midterm functional analytics engine with zero imperative loops and verified immutability.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'When Parallel Streams Are Slower Than Sequential Streams', desc: 'Analyze ForkJoinPool thread-coordination overhead, boxing costs, and poor Spliterator locality.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 5, weight: '50', name: 'Declarative Stream Pipeline Project', desc: 'Summative evaluation metric testing functional Stream API pipelines and multi-level collectors.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Downstream groupingBy & flatMap Check', desc: 'In-class verification of multi-level collector compositions.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Stateless Non-Interfering Stream Audit', desc: 'Formative check confirming zero shared mutable accumulator bugs.' },
      ],
    },
    {
      weekIdx: 8, period: 's',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'GoF Creational Patterns: Singleton, Factory & Builder Study', desc: 'Read Head First Design Patterns (2nd Ed) and Refactoring.Guru on thread-safe Singletons, Factory Method, and Abstract Factory.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Multi-Threaded Singleton Race Condition Reproduction', desc: 'Run a 100-thread concurrency harness that breaks a naive lazy Singleton into instantiating multiple instances.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Thread-Safe Singleton (Double-Checked Locking) & Registry Factories Lecture', desc: 'In-depth lecture on volatile memory barriers in double-checked locking, Enum singletons, and registry/reflection Factory Methods eliminating switch statements.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Thread-Safe Singleton Sandbox & Factory Method Sandbox', desc: 'Hands-on laboratory implementing volatile double-checked locking Singletons and refactoring a rigid switch-based object creator into a Supplier registry / reflection Factory.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Cross-Platform Abstract Factory Toolkit Implementation', desc: 'Implement an Abstract Factory family producing matched UI/driver components without concrete class coupling.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Why volatile Is Mandatory in Double-Checked Locking', desc: 'Explain how CPU/compiler instruction reordering can expose a partially constructed object reference if volatile is omitted.' },
      ],
      assessments: [
        { tlaIdx: 2, iloIdx: 6, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative evaluation metric testing thread-safe creational GoF patterns.' },
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Double-Checked Locking & Registry Factory Check', desc: 'Practical check of thread-safe singleton stress tests and switch-free factory registration.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Abstract Factory Family Consistency Audit', desc: 'Formative verification of product family decoupling.' },
      ],
    },
    {
      weekIdx: 9, period: 's',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'GoF Structural Patterns: Adapter, Decorator, Proxy & Composite Study', desc: 'Study Structural patterns in Gamma et al. (GoF) and Freeman & Robson.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Legacy Third-Party SDK Mismatch Inspection', desc: 'Inspect an incompatible legacy XML/currency library that must be integrated behind a modern domain interface.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Structural Wrappers: Adapter, Decorator & Dynamic Proxy Seminar', desc: 'Walkthrough of Object Adapters, composable Decorator chains (logging, caching, encryption, compression), and Composite tree structures.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Legacy Code Adapter Lab & Dynamic Decorator Construction', desc: 'Supervised practicum wrapping a legacy SDK via an Object Adapter and stacking runtime Decorator layers without subclass explosion.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Caching & Timing Protection Proxy Implementation', desc: 'Build a Decorator/Proxy wrapper that adds transparent LRU caching and execution-time telemetry to any service interface.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Decorator vs. Inheritance Combinatorial Explosion Math', desc: 'Compare class count growth when combining N independent features via static inheritance vs. Decorator composition.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 7, weight: '30', name: 'Design Pattern Implementation', desc: 'Summative evaluation metric testing structural and behavioral GoF design pattern implementations.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Adapter Target Interface Conformance Check', desc: 'In-class check confirming zero legacy SDK types leak into client code.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Decorator Chain Transparency Audit', desc: 'Formative check that arbitrary decorator nesting orders preserve interface behavior.' },
      ],
    },
    {
      weekIdx: 10, period: 's',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'GoF Behavioral Patterns: Observer, Strategy & Command Study', desc: 'Read chapters on Observer event subscriptions, the Lapsed Listener memory leak problem, Strategy lambdas, and Command undo stacks.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Lapsed Listener Memory Leak Scenario Prep', desc: 'Inspect a publisher-subscriber system where short-lived views register with a long-lived subject and are never garbage-collected.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Observer Unregistration, Strategy Swapping & Command Undo Lecture', desc: 'Instruction on solving the Lapsed Listener problem via explicit AutoCloseable unregistration / WeakReference, Strategy functional injection, and Command undo/redo.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Observer Pattern Event Wiring Lab & Strategy Pattern Algorithm Swap', desc: 'Hands-on laboratory building a thread-safe Observer event bus with mandatory unregistering mechanisms and hot-swappable Strategy algorithms.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Transactional Command History with Undo/Redo Stack', desc: 'Implement reversible Command objects supporting multi-step undo and redo operations in a document/order editor.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Lapsed Listener Heap Retention Proof Note', desc: 'Document heap profiler evidence showing how unregistering listeners reclaims observer memory.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Observer Unregistration & Strategy Lab Rubric', desc: 'Formative laboratory check verifying explicit listener unregistration and runtime strategy swapping.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Command Undo/Redo State Symmetry Check', desc: 'In-class check confirming execute() followed by undo() restores exact prior state.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'WeakReference vs. Explicit Lifecycle Unsubscribe Audit', desc: 'Verification of memory leak prevention under repeated listener churn.' },
      ],
    },
    {
      weekIdx: 11, period: 's',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Declarative UI Layouts, Event Routing & Async UI Study', desc: 'Study modern declarative UI component lifecycles, Grid vs. Flex layout managers, and non-blocking CompletableFuture UI updates.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Semifinal GoF Pattern-Driven UI Architecture Prep', desc: 'Wire Creational factories, Structural decorators, and Behavioral observers/commands into the declarative desktop UI.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Pattern-Driven Reactive UI & Event Routing Seminar', desc: 'Live demonstration of combining Observer property bindings, Command buttons, Strategy sorters, and responsive Grid/Flex layouts.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Declarative UI Layout Build & Event Listener Routing Drill', desc: 'Formal Semifinal defense and live studio demonstration of the pattern-driven event-driven UI application.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Listener Lifecycle & Async Responsiveness Polish', desc: 'Ensure all UI views cleanly unregister observers on close and offload heavy tasks from the UI thread.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'GoF Pattern Synergy in UI Frameworks Synthesis', desc: 'Map how Composite, Observer, Strategy, and Command collaborate in reactive UI frameworks.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 8, weight: '50', name: 'Reactive GoF UI Architecture', desc: 'Summative evaluation metric testing reactive event-driven UI with GoF design patterns.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Grid vs. Flex Responsive Layout Check', desc: 'In-class verification of adaptive layout behavior across window dimensions.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'GoF Pattern Integration & Unsubscribe Audit', desc: 'Formative check of clean Creational, Structural, and Behavioral pattern usage.' },
      ],
    },
    {
      weekIdx: 12, period: 'f',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Jackson/Gson Polymorphic Serialization & NIO.2 Streams Study', desc: 'Study JSON/XML polymorphic serialization, NIO.2 Files.lines() lazy streams, and custom domain exception hierarchies.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Custom Exception Hierarchy & JSON Schema Prep', desc: 'Design a sealed/checked domain exception hierarchy and configure Jackson/Gson type adapters for polymorphic entities.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'NIO.2 High-Speed File Streams & Polymorphic JSON Lecture', desc: 'Lecture on memory-efficient Files.lines stream pipelines, atomic file writes, and preserving subtype metadata during JSON serialization.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'JSON Serialization Exercise & NIO.2 High-Speed File Parsing', desc: 'Hands-on laboratory streaming and parsing large NDJSON/CSV files via NIO.2 into polymorphic domain objects with structured exception auditing.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Exception Strategy Audit & Corrupt Record Quarantine', desc: 'Route malformed file records to a dead-letter quarantine file with detailed diagnostic context without aborting the stream pipeline.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Files.readAllLines vs. Files.lines Stream Heap Footprint Brief', desc: 'Compare heap allocation when processing a 2GB log file eagerly versus lazily via NIO.2 Stream.' },
      ],
      assessments: [
        { tlaIdx: 2, iloIdx: 9, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative evaluation metric testing JSON/XML serialization and NIO.2 lazy stream fundamentals.' },
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Polymorphic JSON Round-Trip & NIO.2 Check', desc: 'Practical check verifying subtype fidelity and automatic stream closure.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Domain Exception Context & Quarantine Audit', desc: 'Formative check of error recovery and diagnostic logging.' },
      ],
    },
    {
      weekIdx: 13, period: 'f',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'HikariCP Connection Pooling, DAO & SQLi Prevention Study', desc: 'Study HikariCP pool sizing formulas, PreparedStatement parameter binding, batch updates, and transaction isolation.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'HikariCP DataSource & SQL Migration Setup', desc: 'Configure HikariConfig (maximumPoolSize, connectionTimeout, leakDetectionThreshold) and initialize the relational test schema.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Enterprise DAO Architecture, Connection Pooling & SQLi Defense Seminar', desc: 'Walkthrough of HikariCP connection lifecycle, parameterized PreparedStatement batching, optimistic locking, and transaction rollback.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Database DAO Implementation, HikariCP Pool & SQL Injection Defense Lab', desc: 'Supervised laboratory building a pooled JDBC repository layer and verifying 100% immunity against SQL injection attack vectors.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Connection Pool Exhaustion & Leak Detection Stress Test', desc: 'Simulate 100 concurrent DAO threads to verify HikariCP pool queuing, zero connection leaks, and clean transaction rollback.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Why Smaller Connection Pools Often Outperform Huge Pools', desc: 'Analyze the HikariCP sizing formula and disk/CPU context-switch overhead.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 10, weight: '30', name: 'TDD & Mockito Verification Suite', desc: 'Summative evaluation metric testing HikariCP DAO persistence, Mockito isolation, and TDD rigor.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'HikariCP Leak Detection & Pool Config Check', desc: 'In-class verification of zero leaked connections under load.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Parameterized PreparedStatement & SQLi Audit', desc: 'Formative check confirming all DAO queries use parameter binding.' },
      ],
    },
    {
      weekIdx: 14, period: 'f',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Kent Beck TDD, JUnit 5 Parameterized Tests & Mockito Study', desc: "Read Kent Beck's Test-Driven Development: By Example alongside JUnit 5 and Mockito official documentation." },
        { phase: 'preclass', by: 'S', lab: true, name: 'JUnit 5 & Mockito Test Harness Bootstrap', desc: 'Configure JUnit 5 Jupiter, AssertJ, Mockito, and JaCoCo coverage reporting.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Unit Testing (JUnit 5), Test Doubles (Mockito) & TDD Lecture', desc: 'Instruction on Arrange-Act-Assert, @ParameterizedTest, stubbing DAO/gateway interfaces with Mockito, ArgumentCaptor, and Red-Green-Refactor.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'JUnit Test Writing Challenge & Mockito Stubbing Workshop', desc: 'Hands-on laboratory writing parameterized unit tests and Mockito behavioral verification tests isolating domain services from the database.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'TDD Red-Green-Refactor Lab: New Feature Kata', desc: 'Develop a new domain feature strictly following TDD (Red test -> minimal Green pass -> SOLID Refactor).' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Classical (State) vs. London-School (Mockist) Testing Brief', desc: 'Compare state-verification testing using in-memory fakes against interaction-verification testing using mocks.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: null, weight: '0', name: 'JUnit 5 & Mockito Isolation Lab Rubric', desc: 'Formative laboratory check of parameterized boundary tests, assertThrows, and Mockito verify assertions.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Zero Database Hit in Unit Tests Check', desc: 'In-class check confirming service unit tests execute in milliseconds using mocked repositories.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'TDD Red-Green-Refactor Commit Trail Audit', desc: 'Verification of test-first git commit progression and >85% branch coverage.' },
      ],
    },
    {
      weekIdx: 15, period: 'f',
      tlas: [
        { phase: 'preclass', by: 'S', lab: false, name: 'Capstone Enterprise OOP & TDD Architecture Dossier Prep', desc: 'Synthesize SOLID diagrams, GoF pattern justifications, Stream pipelines, HikariCP DAO persistence, and JaCoCo coverage reports.' },
        { phase: 'preclass', by: 'S', lab: true, name: 'Full Test Suite & Mutation Coverage Verification', desc: 'Run the complete JUnit 5 / Mockito unit and integration test suite to verify 100% green builds and zero resource leaks.' },
        { phase: 'inclass', by: 'T', lab: false, name: 'Enterprise Software Engineering Defense Briefing', desc: 'Instructor briefing on Rev 2 capstone defense standards: SOLID decoupling, thread-safe patterns, functional streams, and TDD rigor.' },
        { phase: 'inclass', by: 'S', lab: true, name: 'Capstone Enterprise Data Integration & TDD Defense', desc: 'Formal Final oral defense and live code demonstration of the enterprise OOP application, GoF patterns, pooled persistence, and automated test suite.' },
        { phase: 'postclass', by: 'S', lab: true, name: 'Archival Rev 2 Enterprise OOP Repository Release', desc: 'Tag the final v2.0.0 release containing source code, JUnit/Mockito tests, JaCoCo coverage badge, and architectural ADRs.' },
        { phase: 'postclass', by: 'S', lab: false, name: 'Rev 1 to Rev 2 Architectural Evolution Retrospective', desc: 'Reflect on how SOLID, Generics/Streams, GoF Patterns, and TDD transformed code testability and maintainability.' },
      ],
      assessments: [
        { tlaIdx: 3, iloIdx: 11, weight: '50', name: 'Enterprise Data Integration', desc: 'Summative evaluation metric testing advanced OOP competency, memory profiling, and test coverage.' },
        { tlaIdx: 2, iloIdx: null, weight: '0', name: 'JaCoCo Branch Coverage & Test Suite Check', desc: 'Verification of comprehensive unit and DAO integration test pass.' },
        { tlaIdx: 4, iloIdx: null, weight: '0', name: 'SOLID & GoF Architectural Sign-Off', desc: 'Final verification of clean enterprise OOP architecture and documentation.' },
      ],
    },
  ],
  comments: [
    {
      commenter_role: 'PROGRAM_HEAD',
      commenter_user_id: 2,
      commenter_name: 'Olivia Vance',
      message: 'The topic outline for Lambda Expressions is missing critical coverage of side-effects and immutability. You must add a specific subtopic addressing state mutation and concurrency risks before this can be approved.',
      resolved_status: true,
      weekIdx: 6,
      comment_for: 'topics',
      targetKind: 'subtopic',
      targetIdx: 2,
    },
    {
      commenter_role: 'PROGRAM_HEAD',
      commenter_user_id: 2,
      commenter_name: 'Olivia Vance',
      message: 'Your current topic breakdown for the Singleton pattern is too basic for an advanced course. Please revise the syllabus topics to explicitly include thread-safety mechanisms, specifically double-checked locking, as required subtopics.',
      resolved_status: true,
      weekIdx: 8,
      comment_for: 'topics',
      targetKind: 'subtopic',
      targetIdx: 1,
    },
    {
      commenter_role: 'PROGRAM_HEAD',
      commenter_user_id: 2,
      commenter_name: 'Olivia Vance',
      message: "The description for the 'Factory Method Sandbox' TLA is currently too vague. Revise the TLA description in the learning plan to explicitly require the use of reflection or a registry pattern, rather than basic switch statements.",
      resolved_status: true,
      weekIdx: 8,
      comment_for: 'tlas',
      targetKind: 'tla',
      targetIdx: 3,
    },
    {
      commenter_role: 'PROGRAM_HEAD',
      commenter_user_id: 2,
      commenter_name: 'Olivia Vance',
      message: "The 'Observer Pattern Event Wiring Lab' TLA must address the Lapsed Listener Problem. Update the TLA description and assessment criteria in the syllabus to explicitly require students to implement unregistering mechanisms.",
      resolved_status: true,
      weekIdx: 10,
      comment_for: 'tlas',
      targetKind: 'tla',
      targetIdx: 3,
    },
    {
      commenter_role: 'INDUSTRY_CONSULTANT',
      commenter_user_id: 4,
      commenter_name: 'Roberto Cruz',
      message: 'For future offerings, consider introducing asynchronous reactive stream patterns to prepare students for distributed enterprise backends.',
      resolved_status: false,
      weekIdx: 6,
      comment_for: 'topics',
      targetKind: 'subtopic',
      targetIdx: 2,
    },
  ],
};

async function seedSingleOopRevision(revData, { courseId, basePcOfferingId, transaction: t }) {
  const { dates } = revData;

  // 1. Offering
  const offering = await db.ProgramCourseOffering.create(
    {
      course_id: courseId,
      program_id: 1, // BSIT
      dept_id: 3,    // SCIS
      academic_period_id: revData.academic_period_id,
      school_year: revData.school_year,
      semester: revData.semester,
      revision_number: revData.revision_number,
      base_pc_offering_id: basePcOfferingId || null,
      has_modifications: revData.has_modifications,
      is_revision_incremented: revData.is_revision_incremented,
      approved_at: dates.deanApproved,
      course_description: revData.course_description,
      createdAt: dates.assigned,
      updatedAt: dates.deanApproved,
    },
    { transaction: t }
  );
  const pcId = offering.pc_offering_id;

  // 2. Assignment
  const assignment = await db.CourseOfferingAssignment.create(
    {
      pc_offering_id: pcId,
      course_id: courseId,
      program_id: 1,
      academic_period_id: revData.academic_period_id,
      course_code: OOP_COURSE_META.course_no,
      course_name: OOP_COURSE_META.course_title,
      year_level: OOP_COURSE_META.year_lvl,
      stakeholder_id: 1, // Monica Norton
      faculty_id: 1,
      faculty_name: 'Monica Norton',
      contributors: [],
      sections: ['BSIT 2A', 'BSIT 2B'],
      status: 'Active',
      date_assigned: dates.assigned,
      date_submitted: dates.submitted1,
      date_updated: dates.resubmitted,
      createdAt: dates.assigned,
      updatedAt: dates.deanApproved,
    },
    { transaction: t }
  );
  const assignId = assignment.co_assign_id;

  // 3. Workflow Logs (Full realistic cycle: Assigned -> Submitted -> PH Return -> Resubmit -> LD Accept -> PH Accept -> Dean Approve -> IC Suggest)
  const workflowLogRows = [
    { co_assign_id: assignId, stakeholder_id: '2', actor_user_id: 2, actor_name: 'Olivia Vance', actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', is_viewed: true, createdAt: dates.assigned, updatedAt: dates.assigned },
    { co_assign_id: assignId, stakeholder_id: '1', actor_user_id: 1, actor_name: 'Monica Norton', actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', is_viewed: true, createdAt: dates.submitted1, updatedAt: dates.submitted1 },
    { co_assign_id: assignId, stakeholder_id: '2', actor_user_id: 2, actor_name: 'Olivia Vance', actor_role: 'PROGRAM_HEAD', action_type: 'RETURNED', is_viewed: true, createdAt: dates.phReturned, updatedAt: dates.phReturned },
    { co_assign_id: assignId, stakeholder_id: '1', actor_user_id: 1, actor_name: 'Monica Norton', actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', is_viewed: true, createdAt: dates.resubmitted, updatedAt: dates.resubmitted },
    { co_assign_id: assignId, stakeholder_id: '3', actor_user_id: 3, actor_name: 'Maria Santos', actor_role: 'LIBRARY_DIRECTOR', action_type: 'ACCEPTED', is_viewed: true, createdAt: dates.ldAccepted, updatedAt: dates.ldAccepted },
    { co_assign_id: assignId, stakeholder_id: '2', actor_user_id: 2, actor_name: 'Olivia Vance', actor_role: 'PROGRAM_HEAD', action_type: 'ACCEPTED', is_viewed: true, createdAt: dates.phAccepted, updatedAt: dates.phAccepted },
    { co_assign_id: assignId, stakeholder_id: '5', actor_user_id: 5, actor_name: 'Sophia Sterling', actor_role: 'DEAN', action_type: 'ACCEPTED', is_viewed: revData.revision_number === 1, createdAt: dates.deanApproved, updatedAt: dates.deanApproved },
    { co_assign_id: assignId, stakeholder_id: '4', actor_user_id: 4, actor_name: 'Roberto Cruz', actor_role: 'INDUSTRY_CONSULTANT', action_type: 'Suggest', is_viewed: true, createdAt: dates.icSuggest, updatedAt: dates.icSuggest },
  ];
  await db.AssignmentWorkflowLog.bulkCreate(workflowLogRows, { transaction: t });

  // 4. Course Outcomes
  const createdCOs = [];
  for (const desc of revData.courseOutcomes) {
    const co = await db.CourseOutcome.create(
      { pc_offering_id: pcId, co_description: desc, createdAt: dates.assigned, updatedAt: dates.deanApproved },
      { transaction: t }
    );
    createdCOs.push(co);
  }

  // 5. Program Outcome Alignments
  await db.ProgramOutcomeAlignment.bulkCreate(
    revData.poAlignments.map((al) => ({
      co_id: createdCOs[al.coIdx].co_id,
      po_id: al.po_id,
      attainment_level: al.attainment_level,
      createdAt: dates.assigned,
      updatedAt: dates.deanApproved,
    })),
    { transaction: t }
  );

  // 6. Intended Learning Outcomes (1 Orientation + 12 Graded with COAEP weights)
  const createdIlos = [];
  for (const item of revData.ilos) {
    const ilo = await db.IntendedLearningOutcome.create(
      {
        co_id: createdCOs[item.coIdx].co_id,
        description: item.description,
        hours: item.hours,
        weeks: item.weeks,
        assessment_tool: item.assessment_tool,
        is_orientation: item.is_orientation,
        prelim_weight: item.prelim_weight,
        midterm_weight: item.midterm_weight,
        semi_weight: item.semi_weight,
        final_weight: item.final_weight,
        target: item.target,
        ied_level: item.ied_level,
        target_students_percent: 90,
        target_score_percent: 60,
        createdAt: dates.assigned,
        updatedAt: dates.deanApproved,
      },
      { transaction: t }
    );
    createdIlos.push(ilo);
  }
  const gradedIlos = createdIlos.filter((i) => !i.is_orientation);

  // 7. Weeks (4 per CO = 16 Weeks, 5.00 hrs each)
  const createdWeeks = [];
  for (let cIdx = 0; cIdx < 4; cIdx++) {
    for (let w = 0; w < 4; w++) {
      const wk = await db.Week.create(
        { co_id: createdCOs[cIdx].co_id, hours: 5.0, createdAt: dates.assigned, updatedAt: dates.deanApproved },
        { transaction: t }
      );
      createdWeeks.push(wk);
    }
  }

  // 8. References (reuse existing by title+course_id if already seeded, else create + link CourseReferences)
  const resolvedRefs = [];
  for (const refDef of revData.references) {
    let ref = await db.Reference.findOne({
      where: { course_id: courseId, title: refDef.title },
      transaction: t,
    });
    if (!ref) {
      ref = await db.Reference.create(
        {
          course_id: courseId,
          course_no: OOP_COURSE_META.course_no,
          title: refDef.title,
          author: refDef.author,
          isbn: refDef.isbn,
          link: refDef.link,
          publisher: refDef.publisher || null,
          publication_year: refDef.publication_year ? new Date(refDef.publication_year) : null,
          copies: refDef.copies ?? null,
          status: 'available',
          type: refDef.type,
          archived: false,
          created_by: 3, // Library Director Maria Santos
          createdAt: dates.assigned,
          updatedAt: dates.assigned,
        },
        { transaction: t }
      );
      await db.CourseReference.findOrCreate({
        where: { course_id: courseId, reference_id: ref.reference_id },
        defaults: { course_id: courseId, reference_id: ref.reference_id },
        transaction: t,
      });
    }
    resolvedRefs.push(ref);
  }

  // WeeklyReferences
  const weeklyRefsToInsert = [];
  for (let wIdx = 0; wIdx < 16; wIdx++) {
    const spec = revData.weekRefSpecs[wIdx];
    const targetWeekId = createdWeeks[wIdx].week_id;
    for (const entry of spec) {
      if (typeof entry === 'object' && entry !== null) {
        weeklyRefsToInsert.push({
          week_id: targetWeekId,
          reference_id: resolvedRefs[entry.refIdx].reference_id,
          is_orientation: Boolean(entry.is_orientation),
          createdAt: dates.assigned,
          updatedAt: dates.deanApproved,
        });
      } else {
        weeklyRefsToInsert.push({
          week_id: targetWeekId,
          reference_id: resolvedRefs[entry].reference_id,
          is_orientation: false,
          createdAt: dates.assigned,
          updatedAt: dates.deanApproved,
        });
      }
    }
  }
  await db.WeeklyReference.bulkCreate(weeklyRefsToInsert, { transaction: t });

  // 9. Topics & Subtopics (with exact minute budgets and course_id set)
  const subtopicsByWeek = Array.from({ length: 16 }, () => []);
  for (const weekBlock of revData.weeklyCurriculum) {
    const targetWeekId = createdWeeks[weekBlock.weekIdx].week_id;
    for (const topicObj of weekBlock.topics) {
      const topic = await db.Topic.create(
        {
          course_id: courseId,
          parent_topic_id: null,
          title: topicObj.title,
          createdAt: dates.assigned,
          updatedAt: dates.deanApproved,
        },
        { transaction: t }
      );

      for (let idx = 0; idx < topicObj.subtopics.length; idx++) {
        const subRaw = topicObj.subtopics[idx];
        const subTitle = typeof subRaw === 'string' ? subRaw : subRaw.title;
        const subMinutes = typeof subRaw === 'string' ? 50 : (subRaw.minutes || 50);
        const sub = await db.Subtopic.create(
          {
            week_id: targetWeekId,
            topic_id: topic.topic_id,
            parent_subtopic_id: null,
            title: subTitle,
            sequence_order: idx + 1,
            is_orientation: Boolean(topicObj.is_orientation),
            estimated_minutes: subMinutes,
            createdAt: dates.assigned,
            updatedAt: dates.deanApproved,
          },
          { transaction: t }
        );
        subtopicsByWeek[weekBlock.weekIdx].push(sub);
      }
    }
  }

  // 10. TLAs & Assessments
  const tlasByWeek = Array.from({ length: 16 }, () => []);
  for (const weekItem of revData.weeklyTlas) {
    const targetWeekId = createdWeeks[weekItem.weekIdx].week_id;
    const insertedTlas = [];
    for (const tObj of weekItem.tlas) {
      const tla = await db.TeachingAndLearningActivity.create(
        {
          week_id: targetWeekId,
          tla_name: tObj.name,
          description: tObj.desc,
          performed_by: tObj.by,
          class_phase: tObj.phase,
          is_lab: Boolean(tObj.lab),
          is_orientation: Boolean(tObj.is_orientation),
          createdAt: dates.assigned,
          updatedAt: dates.deanApproved,
        },
        { transaction: t }
      );
      insertedTlas.push(tla);
    }
    tlasByWeek[weekItem.weekIdx] = insertedTlas;

    const assessRows = weekItem.assessments.map((a) => ({
      tla_id: insertedTlas[a.tlaIdx].tla_id,
      ilo_id: a.iloIdx !== null ? gradedIlos[a.iloIdx].ilo_id : null,
      name: a.name,
      description: a.desc,
      period: weekItem.period,
      weight: a.weight,
      min_passing: 60,
      createdAt: dates.assigned,
      updatedAt: dates.deanApproved,
    }));
    await db.TLAAssessment.bulkCreate(assessRows, { transaction: t });
  }

  // 11. Actionable Comments & CommentTargets (PH resolved returns + Industry Consultant suggestion)
  const createdComments = [];
  for (const cDef of revData.comments) {
    const isConsultant = cDef.commenter_role === 'INDUSTRY_CONSULTANT';
    const createdTs = isConsultant ? dates.icSuggest : dates.phReturned;
    const resolvedTs = cDef.resolved_status ? dates.resubmitted : null;
    const targetWeekId = createdWeeks[cDef.weekIdx].week_id;

    let targetId = null;
    if (cDef.targetKind === 'subtopic') {
      targetId = subtopicsByWeek[cDef.weekIdx][cDef.targetIdx]?.subtopic_id || null;
    } else if (cDef.targetKind === 'tla') {
      targetId = tlasByWeek[cDef.weekIdx][cDef.targetIdx]?.tla_id || null;
    }

    const comment = await db.Comment.create(
      {
        co_assign_id: assignId,
        stakeholder_id: String(cDef.commenter_user_id),
        commenter_user_id: cDef.commenter_user_id,
        commenter_name: cDef.commenter_name,
        commenter_role: cDef.commenter_role,
        message: cDef.message,
        resolved_status: cDef.resolved_status,
        resolved_date: resolvedTs,
        week_id: targetWeekId,
        comment_for: cDef.comment_for,
        createdAt: createdTs,
        updatedAt: resolvedTs || createdTs,
      },
      { transaction: t }
    );
    createdComments.push(comment);

    if (targetId) {
      await db.CommentTarget.create(
        {
          comment_id: comment.comment_id,
          target_id: targetId,
          createdAt: createdTs,
          updatedAt: createdTs,
        },
        { transaction: t }
      );
    }
  }

  // 12. CourseDocuments (COAEP + CO-PO metadata records)
  const coaepJson = JSON.stringify({
    course_no: OOP_COURSE_META.course_no,
    course_title: OOP_COURSE_META.course_title,
    revision_number: revData.revision_number,
    course_outcomes: revData.courseOutcomes.map((desc, idx) => ({
      code: `CO${idx + 1}`,
      description: desc,
      ilos: revData.ilos
        .filter((i) => i.coIdx === idx)
        .map((i) => ({
          description: i.description,
          is_orientation: i.is_orientation,
          assessment_tool: i.assessment_tool,
          prelim_weight: i.prelim_weight,
          midterm_weight: i.midterm_weight,
          semi_weight: i.semi_weight,
          final_weight: i.final_weight,
          target: i.target,
          ied_level: i.ied_level,
        })),
    })),
  });

  await db.CourseDocument.bulkCreate(
    [
      {
        pc_offering_id: pcId,
        kind: 'coaep',
        file_name: `BIT213L_OOP_COAEP_REV${revData.revision_number}.json`,
        content_type: 'application/json',
        data: Buffer.from(coaepJson, 'utf8'),
        parsed_json: coaepJson,
        uploaded_by: 2,
        updatedAt: dates.deanApproved,
      },
      {
        pc_offering_id: pcId,
        kind: 'co-po',
        file_name: `BIT213L_OOP_CO_PO_REV${revData.revision_number}.json`,
        content_type: 'application/json',
        data: Buffer.from(JSON.stringify({ course_no: OOP_COURSE_META.course_no, alignments: revData.poAlignments }), 'utf8'),
        parsed_json: JSON.stringify({ course_no: OOP_COURSE_META.course_no, alignments: revData.poAlignments }),
        uploaded_by: 2,
        updatedAt: dates.deanApproved,
      },
    ],
    { transaction: t, ignoreDuplicates: true }
  );

  // 13. Industry Consultant Signoff
  await db.ConsultantSignoff.create(
    {
      offering_id: pcId,
      consultant_user_id: 4,
      consultant_name: 'Roberto Cruz',
      signed_at: dates.icSuggest,
    },
    { transaction: t }
  );

  // 14. Frozen ReviewRecordSnapshot (for approved review-record view & export)
  const snapshotPayload = {
    offering: {
      pc_offering_id: pcId,
      course_no: OOP_COURSE_META.course_no,
      course_title: OOP_COURSE_META.course_title,
      school_year: revData.school_year,
      semester: revData.semester,
      revision_number: revData.revision_number,
      approved_at: dates.deanApproved,
    },
    workflow: {
      stage: 'approved',
      libraryStatus: 'Approved',
      programHeadStatus: 'Approved',
      deanStatus: 'Approved',
    },
    logs: workflowLogRows.map((l) => ({
      actor_name: l.actor_name,
      actor_role: l.actor_role,
      action_type: l.action_type,
      createdAt: l.createdAt,
    })),
    comments: createdComments.map((c) => ({
      comment_id: c.comment_id,
      commenter_name: c.commenter_name,
      commenter_role: c.commenter_role,
      message: c.message,
      comment_for: c.comment_for,
      resolved_status: c.resolved_status,
      resolved_date: c.resolved_date,
      createdAt: c.createdAt,
    })),
  };

  await db.ReviewRecordSnapshot.create(
    {
      offering_id: pcId,
      payload: JSON.stringify(snapshotPayload),
      createdAt: dates.deanApproved,
    },
    { transaction: t }
  );

  return { pcId, assignId };
}

async function seedOopRevisions(transaction) {
  // Ensure BIT213L course exists
  await db.Course.bulkCreate([OOP_COURSE_META], { transaction, ignoreDuplicates: true });

  // Link Roberto Cruz (Industry Consultant) to BIT213L across both M1 & M3 tables
  await db.ConsultantCourse.findOrCreate({
    where: { industry_consultant_id: 1, course_id: OOP_COURSE_META.course_id },
    defaults: {
      industry_consultant_id: 1,
      course_id: OOP_COURSE_META.course_id,
      course_code: OOP_COURSE_META.course_no,
    },
    transaction,
  });
  await db.CourseConsultant.findOrCreate({
    where: { course_id: OOP_COURSE_META.course_id, consultant_user_id: 4 },
    defaults: {
      course_id: OOP_COURSE_META.course_id,
      consultant_user_id: 4,
      assigned_by_user_id: 2,
      is_active: true,
    },
    transaction,
  });

  // Check if OOP offerings already seeded
  const existing = await db.ProgramCourseOffering.count({
    where: { course_id: OOP_COURSE_META.course_id },
    transaction,
  });
  if (existing >= 2) {
    return { skipped: true };
  }

  const rev1 = await seedSingleOopRevision(REV1_DATA, {
    courseId: OOP_COURSE_META.course_id,
    basePcOfferingId: null,
    transaction,
  });

  const rev2 = await seedSingleOopRevision(REV2_DATA, {
    courseId: OOP_COURSE_META.course_id,
    basePcOfferingId: rev1.pcId,
    transaction,
  });

  return { skipped: false, rev1PcId: rev1.pcId, rev2PcId: rev2.pcId };
}

module.exports = { seedOopRevisions, OOP_COURSE_META };
