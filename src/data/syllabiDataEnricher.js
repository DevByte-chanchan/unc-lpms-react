// Short, generic assessment method names (matches the compact style used in 5174)
// so the Criteria table cells stay one line instead of wrapping to tall boxes.
const ASSESSMENT_METHODS = ['Quiz', 'Lab Exercise', 'Project Milestone', 'Case Analysis', 'Diagram Schema', 'Presentation', 'Report', 'Rubric Evaluation']

function generateCOSBase(code, name) {
  const n = name.toLowerCase()
  if (n.includes('discrete') && !n.includes('ii')) return [
    { id:'CO1', description:'Apply set theory, logic, and proof techniques to solve discrete math problems.', poMappings:['E','I','','','','','','',''] },
    { id:'CO2', description:'Analyze combinatorial structures including graphs, trees, and permutations.', poMappings:['','E','I','','','','','',''] },
    { id:'CO3', description:'Apply recurrence relations and generating functions in algorithm analysis.', poMappings:['','','D','E','I','','','',''] },
  ]
  if (n.includes('programming') && n.includes('fundamental')) return [
    { id:'CO1', description:'Write structured programs using variables, control flow, and functions.', poMappings:['E','','','I','','','','',''] },
    { id:'CO2', description:'Design programs using arrays, strings, and file I/O operations.', poMappings:['','E','I','','','','','',''] },
    { id:'CO3', description:'Apply object-oriented programming concepts including classes and inheritance.', poMappings:['','','E','E','','','','',''] },
  ]
  if (n.includes('data structure') && (n.includes('algo') || n === 'data structures & algorithms')) return [
    { id:'CO1', description:'Implement fundamental data structures including linked lists, stacks, and queues.', poMappings:['E','E','','','','','','',''] },
    { id:'CO2', description:'Analyze time and space complexity of algorithms using asymptotic notation.', poMappings:['','E','I','I','','','','',''] },
    { id:'CO3', description:'Design and implement sorting, searching, and graph algorithms.', poMappings:['','','E','E','D','','','',''] },
  ]
  if (n.includes('object') && n.includes('orient')) return [
    { id:'CO1', description:'Apply OOP principles including encapsulation, inheritance, and polymorphism.', poMappings:['E','E','','I','','','','',''] },
    { id:'CO2', description:'Implement design patterns to solve recurring software design problems.', poMappings:['D','E','E','','','','','',''] },
    { id:'CO3', description:'Create UML diagrams to model software system architecture.', poMappings:['','','D','E','I','','','',''] },
  ]
  if ((n.includes('database') || n.includes('information management')) && !n.includes('admin')) return [
    { id:'CO1', description:'Design normalized relational database schemas based on requirements analysis.', poMappings:['E','E','I','','','','','',''] },
    { id:'CO2', description:'Implement complex SQL queries with joins, subqueries, and aggregations.', poMappings:['','E','E','I','','','','',''] },
    { id:'CO3', description:'Apply indexing, query optimization, and transaction management techniques.', poMappings:['','','D','E','E','I','','',''] },
  ]
  if (n.includes('automata') || n.includes('theory')) return [
    { id:'CO1', description:'Design finite automata and regular expressions for language recognition.', poMappings:['I','E','','','','','','',''] },
    { id:'CO2', description:'Construct context-free grammars and pushdown automata.', poMappings:['','E','D','','','','','',''] },
    { id:'CO3', description:'Analyze computational complexity and decidability of problems.', poMappings:['','','E','I','','','','',''] },
  ]
  if (n.includes('compiler')) return [
    { id:'CO1', description:'Implement lexical analysis and parsing techniques for programming languages.', poMappings:['E','E','','','','','','',''] },
    { id:'CO2', description:'Design syntax-directed translation schemes for code generation.', poMappings:['','E','E','I','','','','',''] },
    { id:'CO3', description:'Apply optimization techniques to intermediate code representations.', poMappings:['D','','E','E','','','','',''] },
  ]
  if (n.includes('numerical')) return [
    { id:'CO1', description:'Implement numerical methods for solving equations and interpolation.', poMappings:['E','','I','','','','','',''] },
    { id:'CO2', description:'Apply numerical differentiation and integration techniques.', poMappings:['','E','E','','','','','',''] },
    { id:'CO3', description:'Solve systems of linear equations using direct and iterative methods.', poMappings:['','','E','D','I','','','',''] },
  ]
  if (n.includes('quality') || n.includes('assurance')) return [
    { id:'CO1', description:'Develop test plans and test cases for software quality verification.', poMappings:['E','E','','','I','','','',''] },
    { id:'CO2', description:'Apply automated testing frameworks for unit, integration, and system testing.', poMappings:['D','E','E','','','I','','',''] },
    { id:'CO3', description:'Evaluate software quality metrics and implement continuous improvement.', poMappings:['','','D','E','','','I','',''] },
  ]
  if (n.includes('machine learning')) return [
    { id:'CO1', description:'Apply supervised learning algorithms for classification and regression problems.', poMappings:['I','E','','','','','','',''] },
    { id:'CO2', description:'Implement unsupervised learning techniques for data clustering.', poMappings:['','E','D','I','','','','',''] },
    { id:'CO3', description:'Design and evaluate neural network models for pattern recognition.', poMappings:['D','','E','E','','','','',''] },
  ]
  if (n.includes('parallel') || n.includes('computing')) return [
    { id:'CO1', description:'Design parallel algorithms using shared-memory and distributed-memory models.', poMappings:['E','E','I','','','','','',''] },
    { id:'CO2', description:'Implement parallel programs using OpenMP and MPI frameworks.', poMappings:['D','E','E','','','','','',''] },
    { id:'CO3', description:'Analyze performance and scalability of parallel applications.', poMappings:['','','E','D','I','','','',''] },
  ]
  if (n.includes('computer') && n.includes('graphic')) return [
    { id:'CO1', description:'Implement fundamental computer graphics rendering pipelines.', poMappings:['E','','I','','','','','',''] },
    { id:'CO2', description:'Apply geometric transformations and projections for 2D/3D visualization.', poMappings:['','E','E','','','','','',''] },
    { id:'CO3', description:'Design image processing algorithms for feature detection and recognition.', poMappings:['D','','E','E','','','','',''] },
  ]
  if (n.includes('language') || n.includes('nlp')) return [
    { id:'CO1', description:'Apply text preprocessing and feature extraction for NLP tasks.', poMappings:['I','E','','','','','','',''] },
    { id:'CO2', description:'Implement sequence models for language understanding and generation.', poMappings:['','E','E','','','','','',''] },
    { id:'CO3', description:'Design and evaluate machine translation and dialogue systems.', poMappings:['D','','E','I','','','','',''] },
  ]
  if (n.includes('embedded') || n.includes('iot') || n.includes('internet of things')) return [
    { id:'CO1', description:'Design embedded systems using microcontrollers and sensors.', poMappings:['E','','E','','','','','',''] },
    { id:'CO2', description:'Implement real-time firmware for IoT device communication protocols.', poMappings:['','E','E','I','','','','',''] },
    { id:'CO3', description:'Apply power management and security best practices for embedded systems.', poMappings:['D','','','E','I','','','',''] },
  ]
  if ((n.includes('advanced') && n.includes('algorithm')) || (!n.includes('data') && n.includes('algorithm'))) return [
    { id:'CO1', description:'Design algorithms using greedy, dynamic programming, and divide-and-conquer.', poMappings:['E','E','','','','','','',''] },
    { id:'CO2', description:'Apply amortized and competitive analysis to algorithm performance.', poMappings:['','E','I','I','','','','',''] },
    { id:'CO3', description:'Implement algorithms for NP-complete problems using approximation.', poMappings:['','','E','E','D','','','',''] },
  ]
  if (n.includes('distributed')) return [
    { id:'CO1', description:'Design distributed systems using client-server and peer-to-peer architectures.', poMappings:['E','','E','','','','','',''] },
    { id:'CO2', description:'Implement distributed consensus protocols and replication strategies.', poMappings:['','E','E','','','I','','',''] },
    { id:'CO3', description:'Apply fault tolerance and consistency models in distributed applications.', poMappings:['D','','E','E','','','I','',''] },
  ]
  if (n.includes('blockchain')) return [
    { id:'CO1', description:'Explain blockchain architecture, consensus, and cryptographic foundations.', poMappings:['I','E','','','','','','',''] },
    { id:'CO2', description:'Develop smart contracts using Solidity for decentralized applications.', poMappings:['','E','E','','','','','',''] },
    { id:'CO3', description:'Evaluate blockchain platforms for different enterprise use cases.', poMappings:['','','E','D','I','','','',''] },
  ]
  if (n.includes('capstone') && n.includes('1')) return [
    { id:'CO1', description:'Formulate a research problem and develop a project proposal with methodology.', poMappings:['E','','I','E','','','','',''] },
    { id:'CO2', description:'Conduct literature review and requirements gathering for the proposed system.', poMappings:['','E','I','E','','','','',''] },
    { id:'CO3', description:'Design system architecture and create project documentation.', poMappings:['','','E','E','I','','','',''] },
  ]
  if (n.includes('capstone') && n.includes('2')) return [
    { id:'CO1', description:'Implement the proposed system using appropriate technologies.', poMappings:['','E','E','','D','','','',''] },
    { id:'CO2', description:'Conduct system testing and user acceptance testing.', poMappings:['E','','E','E','','I','','',''] },
    { id:'CO3', description:'Present and defend the completed project through oral defense.', poMappings:['','','E','E','','I','','',''] },
  ]
  if (n.includes('ethics') || n.includes('professional')) return [
    { id:'CO1', description:'Analyze ethical and legal issues including privacy and intellectual property.', poMappings:['I','E','','','','','','',''] },
    { id:'CO2', description:'Apply professional codes of ethics to resolve technology dilemmas.', poMappings:['','E','','I','','','','',''] },
    { id:'CO3', description:'Evaluate societal impacts of emerging technologies and AI systems.', poMappings:['','','I','E','','','','',''] },
  ]
  if (n.includes('writing') || n.includes('communication')) return [
    { id:'CO1', description:'Produce technical documentation including API docs and user manuals.', poMappings:['E','','','I','','','','',''] },
    { id:'CO2', description:'Prepare and deliver effective technical presentations.', poMappings:['','E','','E','','','','',''] },
    { id:'CO3', description:'Apply information design principles to accessible technical content.', poMappings:['','','I','E','D','','','',''] },
  ]
  if (n.includes('architecture')) return [
    { id:'CO1', description:'Design software architectures using layered and microservices patterns.', poMappings:['E','E','','','','','','',''] },
    { id:'CO2', description:'Evaluate architectural trade-offs using quality attribute scenarios.', poMappings:['D','E','E','','','I','','',''] },
    { id:'CO3', description:'Document architectural decisions using ADRs and diagrams.', poMappings:['','','D','E','E','','','',''] },
  ]
  if (n.includes('mining') || n.includes('analytics') || n.includes('big data')) return [
    { id:'CO1', description:'Apply data mining techniques including classification and clustering.', poMappings:['I','E','','','','','','',''] },
    { id:'CO2', description:'Implement distributed data processing with MapReduce and Spark.', poMappings:['','E','E','','','','','',''] },
    { id:'CO3', description:'Evaluate model performance using cross-validation and metrics.', poMappings:['','','E','D','I','','','',''] },
  ]
  if (n.includes('quantum')) return [
    { id:'CO1', description:'Explain quantum computing principles including superposition and entanglement.', poMappings:['I','E','','','','','','',''] },
    { id:'CO2', description:'Implement quantum algorithms including Grover search.', poMappings:['','E','E','','','','','',''] },
    { id:'CO3', description:'Evaluate quantum vs classical algorithm complexity trade-offs.', poMappings:['','','E','D','I','','','',''] },
  ]
  if ((n.includes('web') && !n.includes('security')) || n.includes('systems & technologies')) return [
    { id:'CO1', description:'Build full-stack web applications using modern frameworks and APIs.', poMappings:['E','E','','','I','','','',''] },
    { id:'CO2', description:'Design responsive user interfaces following UX best practices.', poMappings:['','E','D','E','','','','',''] },
    { id:'CO3', description:'Implement authentication, authorization, and data persistence.', poMappings:['D','','E','E','','I','','',''] },
  ]
  if (n.includes('game')) return [
    { id:'CO1', description:'Design game mechanics and interactive experiences for mobile platforms.', poMappings:['E','','I','','','','','',''] },
    { id:'CO2', description:'Implement 2D game systems including physics and collision detection.', poMappings:['','E','E','','','','','',''] },
    { id:'CO3', description:'Optimize game performance for mobile device constraints.', poMappings:['','','E','E','D','','','',''] },
  ]
  if (n.includes('infrastructure')) return [
    { id:'CO1', description:'Design and manage enterprise IT infrastructure including servers and networks.', poMappings:['E','','','I','E','','','',''] },
    { id:'CO2', description:'Implement virtualization, containerization, and cloud resource management.', poMappings:['','E','E','','','I','','',''] },
    { id:'CO3', description:'Apply IT service management frameworks for incident and change management.', poMappings:['','','D','E','','','','',''] },
  ]
  if (n.includes('security') || n.includes('assurance')) return [
    { id:'CO1', description:'Identify security threats, vulnerabilities, and risk mitigation strategies.', poMappings:['I','E','','','','','','',''] },
    { id:'CO2', description:'Implement security controls including encryption and access control.', poMappings:['','E','E','','','I','','',''] },
    { id:'CO3', description:'Develop security policies and incident response plans.', poMappings:['','','E','E','','','I','',''] },
  ]
  if (n.includes('cloud')) return [
    { id:'CO1', description:'Design cloud-native applications using IaaS, PaaS, and SaaS models.', poMappings:['E','','E','','','','','',''] },
    { id:'CO2', description:'Implement containerized microservices for cloud deployment.', poMappings:['','E','E','','','I','','',''] },
    { id:'CO3', description:'Apply cloud cost optimization, auto-scaling, and disaster recovery.', poMappings:['D','','E','E','','','','',''] },
  ]
  if (n.includes('project') || n.includes('management')) return [
    { id:'CO1', description:'Develop project plans with scope, schedule, and risk estimation.', poMappings:['E','','','E','I','','','',''] },
    { id:'CO2', description:'Apply agile project management practices including sprints.', poMappings:['','E','','E','D','','','',''] },
    { id:'CO3', description:'Monitor project execution using earned value management.', poMappings:['','','D','E','I','','','',''] },
  ]
  if (n.includes('entrepreneurship')) return [
    { id:'CO1', description:'Develop business models and go-to-market strategies for tech ventures.', poMappings:['E','','','I','','','','',''] },
    { id:'CO2', description:'Analyze market opportunities for technology products.', poMappings:['','E','','E','','','','',''] },
    { id:'CO3', description:'Create MVPs and pitch presentations for investor funding.', poMappings:['','','I','E','D','','','',''] },
  ]
  if (n.includes('network admin')) return [
    { id:'CO1', description:'Configure routers, switches, and firewalls for network infrastructure.', poMappings:['E','','E','','','','','',''] },
    { id:'CO2', description:'Implement network monitoring and performance optimization.', poMappings:['','E','E','I','','','','',''] },
    { id:'CO3', description:'Design secure network architectures with VLANs and VPNs.', poMappings:['D','','','E','E','','','',''] },
  ]
  if (n.includes('admin') || n.includes('maintenance') || n.includes('systems admin')) return [
    { id:'CO1', description:'Administer server OS including installation, configuration, and patching.', poMappings:['E','','E','','','','','',''] },
    { id:'CO2', description:'Implement backup strategies, disaster recovery, and monitoring.', poMappings:['','E','E','','','I','','',''] },
    { id:'CO3', description:'Automate system administration tasks using scripting tools.', poMappings:['D','','','E','E','','','',''] },
  ]
  if (n.includes('multimedia')) return [
    { id:'CO1', description:'Process digital audio, image, and video using compression standards.', poMappings:['E','','I','','','','','',''] },
    { id:'CO2', description:'Create multimedia authoring projects for web-based delivery.', poMappings:['','E','E','','','','','',''] },
    { id:'CO3', description:'Evaluate multimedia quality and performance trade-offs.', poMappings:['','','E','D','I','','','',''] },
  ]
  return [
    { id:'CO1', description:`Apply principles of ${name} to solve computing problems.`, poMappings:['E','I','','','','','','',''] },
    { id:'CO2', description:`Design solutions using ${name} concepts and methodologies.`, poMappings:['','E','E','','','','','',''] },
    { id:'CO3', description:`Evaluate effectiveness of ${name} approaches in real-world scenarios.`, poMappings:['','','E','D','I','','','',''] },
  ]
}

// Ensure a course exposes a consistent set of 4 course outcomes (CO-PO alignment standard).
// Pads shorter lists with a synthesized final outcome; longer lists are left untouched.
function padToFourCOs(cos, name) {
  if (!Array.isArray(cos) || cos.length >= 4) return cos
  const poLen = (cos[0] && cos[0].poMappings && cos[0].poMappings.length) || 9
  const baseName = String(name || '').replace(/:.+/, '').trim() || 'the course'
  const padded = [...cos]
  while (padded.length < 4) {
    const idx = padded.length
    padded.push({
      id: `CO${idx + 1}`,
      description: `Evaluate and justify ${baseName} solutions using appropriate criteria, standards, and evidence-based reasoning.`,
      poMappings: Array.from({ length: poLen }, (_, k) => (k === Math.min(poLen - 1, 4) ? 'E' : '')),
    })
  }
  return padded
}

function generateCOS(code, name) {
  return padToFourCOs(generateCOSBase(code, name), name)
}

function generateILOs(code, name, cos, topics) {
  const n = name.toLowerCase()
  const isLight = n.includes('ethics') || n.includes('writing') || n.includes('entrepreneurship') || n.includes('numerical') || n.includes('automata') || n.includes('quantum') || n.includes('discrete') || n.includes('compiler') || n.includes('project') || n.includes('management')
  const ilos = []
  cos.forEach((co, i) => {
    const count = isLight ? 1 : Math.min(2, 3 - i)
    for (let j = 1; j <= count; j++) {
      // Pick a topic title that actually exists in the generated topics array
      const topicIndex = (i * count + (j - 1)) % topics.length
      const topicTitle = topics[topicIndex]?.title || name.replace(/:.+/, '').trim()
      ilos.push({
        id: `CO${i+1}-ILO${j}`,
        courseOutcome: co.description,
        intendedLearningOutcome: j === 1
          ? `Analyze and apply ${name} concepts in computing contexts.`
          : `Implement solutions using ${name} techniques and tools.`,
        deliveryWeek: `Week ${(i * 3) + j}`,
        allocatedTime: `${isLight ? 2 : 3} hours`,
        topics: [topicTitle],
        references: [`TB1 - ${name}: Principles and Practice`, `OR1 - ${name} Learning Resources`],
      })
    }
  })
  return ilos
}

function generateTopics(name) {
  return [
    { id:"T1", title:`${name.replace(/:.+/, '').trim()} Fundamentals`, subtopics:[
      { id:"S1", value:"Core Concepts and Principles" },
      { id:"S2", value:"Key Methodologies" },
    ], tlas:[
      { id:"TLA1", classPhase:"Pre-class", performedBy:"Instructor", tlaName:"Intro Lecture", tlaDescription:`Introduction to ${name} principles and applications.`, laboratory:false },
      { id:"TLA2", classPhase:"In-class", performedBy:"Student", tlaName:"Application Lab", tlaDescription:`Hands-on exercises applying ${name} concepts.`, laboratory:true },
    ]},
    { id:"T2", title:`Advanced ${name.replace(/:.+/, '').trim()}`, subtopics:[
      { id:"S3", value:"Advanced Techniques" },
      { id:"S4", value:"Best Practices" },
    ], tlas:[
      { id:"TLA3", classPhase:"In-class", performedBy:"Student", tlaName:"Project Lab", tlaDescription:`Build a project applying advanced ${name} techniques.`, laboratory:true },
    ]},
  ]
}

function generateReferences(name) {
  return [
    { id:"TB1", title:`${name}: Principles and Practice`, authors:"Academic Press", year:2022, isbn:"978-0123456789", link:"" },
    { id:"OR1", title:`${name} Learning Resources`, authors:"Open Education", year:2024, isbn:"", link:"https://example.edu/learning" },
  ]
}

function generateAssessments(cos, topics) {
  return cos.map((co, i) => ({
    id: `A${i+1}`,
    tlaName: i < topics.length ? (topics[i].tlas?.[0]?.tlaName || 'Assessment') : 'Assessment',
    phase: i === 0 ? 'Prelim' : i === 1 ? 'Midterm' : 'Finals',
    assessmentMethod: ASSESSMENT_METHODS[i % ASSESSMENT_METHODS.length],
    assessmentDescription: `Assessment for ${co.description.substring(0, 50)}`,
    hasRubric: i === 0,
  }))
}

function generateGradingSystem(cos) {
  return cos.map((co, i) => {
    const w = { prelim:'', midterm:'', semi:'', final:'' }
    if (i === 0) w.prelim = '50'
    else if (i === 1) w.midterm = '50'
    else { w.semi = '50'; w.final = '50' }
    return {
      co: `CO${i+1}`,
      ilos: [{ id:"ILO1", assessments:[`CO${i+1} Assessment`], weight:w, minPassing:"60" }],
    }
  })
}

function generateCoAssessmentMethodSets(cos) {
  const sets = {}
  cos.forEach(co => {
    sets[co.id] = [{ value: co.description.substring(0, 50), description: co.description }]
  })
  return sets
}

/**
 * Expand courses that already have courseOutcomes but have too few topics/TLAs/assessments.
 * Working courses (BSCS322L etc.) have: 5 topics, 3 subtopics each, ~8 TLAs, ~8 assessments.
 * This function brings sparse courses up to that standard.
 */
const ILO_TEMPLATES = {
  CO1: [
    (desc) => `Explain the core principles and foundational concepts of ${desc}.`,
    (desc) => `Apply fundamental ${desc} techniques to solve basic computing problems.`,
  ],
  CO2: [
    (desc) => `Analyze ${desc} problems using appropriate methodologies and tools.`,
    (desc) => `Design solutions for ${desc} scenarios using established patterns and practices.`,
  ],
  CO3: [
    (desc) => `Develop ${desc} implementations following design specifications and best practices.`,
    (desc) => `Integrate ${desc} components into cohesive working systems.`,
  ],
  CO4: [
    (desc) => `Evaluate ${desc} outcomes against quality metrics and performance criteria.`,
    (desc) => `Critique ${desc} approaches and justify recommendations with evidence-based reasoning.`,
  ],
}

function improveILODescriptions(s) {
  const desc = (s.description || '').replace(/\.$/, '').trim()
  // Description is mid-sentence context; name is a proper noun kept as-is
  const ctx = desc.length < 80 ? desc.charAt(0).toLowerCase() + desc.slice(1) : s.name
  const ilos = s.ilos || []
  ilos.forEach(ilo => {
    const [coId] = ilo.id.split('-')
    const num = parseInt(ilo.id.split('ILO')[1], 10) - 1
    const templates = ILO_TEMPLATES[coId]
    if (templates && templates[num]) {
      ilo.intendedLearningOutcome = templates[num](ctx)
    }
  })
}

function expandSparseData(s) {
  const topics = s.topics || []
  // If course already has 4+ topics, it's already well-formed (like the working courses)
  if (topics.length >= 4) return

  const name = s.name
  const cos = s.courseOutcomes || []
  const baseName = name.replace(/:.+/, '').trim()

  // Build 5 rich topics with 3 subtopics and TLAs each (matching working pattern)
  const topicTemplates = [
    { suffix: 'Fundamentals', subs: ['Core Principles', 'Key Terminology', 'Historical Context'],
      tlas: [
        { phase: 'Pre-class', by: 'Instructor', name: `${baseName} Introduction Lecture`, desc: `Comprehensive introduction to ${name} principles, terminology, and foundational concepts.`, lab: false },
        { phase: 'In-class', by: 'Student', name: `${baseName} Fundamentals Workshop`, desc: `Hands-on workshop applying fundamental ${name} concepts through guided exercises.`, lab: true },
      ]
    },
    { suffix: 'Core Methods', subs: ['Primary Techniques', 'Analysis Methods', 'Implementation Strategies'],
      tlas: [
        { phase: 'In-class', by: 'Student', name: `${baseName} Methods Lab`, desc: `Laboratory session implementing core ${name} methods and techniques.`, lab: true },
      ]
    },
    { suffix: 'Design & Implementation', subs: ['Design Patterns', 'System Architecture', 'Best Practices'],
      tlas: [
        { phase: 'Pre-class', by: 'Instructor', name: `${baseName} Design Lecture`, desc: `Lecture on design principles and architectural considerations for ${name}.`, lab: false },
        { phase: 'In-class', by: 'Student', name: `${baseName} Implementation Lab`, desc: `Students implement ${name} solutions following design specifications.`, lab: true },
      ]
    },
    { suffix: 'Testing & Evaluation', subs: ['Testing Strategies', 'Performance Metrics', 'Quality Assurance'],
      tlas: [
        { phase: 'In-class', by: 'Student', name: `${baseName} Testing Exercise`, desc: `Students perform testing and evaluation of ${name} implementations.`, lab: true },
        { phase: 'Post-class', by: 'Student', name: `${baseName} Evaluation Report`, desc: `Comprehensive evaluation report analyzing ${name} outcomes and quality metrics.`, lab: false },
      ]
    },
    { suffix: 'Applications & Integration', subs: ['Real-world Applications', 'System Integration', 'Case Studies'],
      tlas: [
        { phase: 'In-class', by: 'Student', name: `${baseName} Integration Project`, desc: `Capstone integration project applying ${name} concepts to real-world scenarios.`, lab: true },
      ]
    },
  ]

  // Preserve any existing topic titles that match what we'd generate, but rebuild all
  const newTopics = topicTemplates.map((tmpl, idx) => ({
    id: `T${idx + 1}`,
    title: `${baseName} ${tmpl.suffix}`,
    subtopics: tmpl.subs.map((sub, si) => ({ id: `S${idx * 3 + si + 1}`, value: sub })),
    tlas: tmpl.tlas.map((tla, ti) => ({
      id: `TLA${idx * 2 + ti + 1}`,
      classPhase: tla.phase,
      performedBy: tla.by,
      tlaName: tla.name,
      tlaDescription: tla.desc,
      laboratory: tla.lab,
    })),
  }))

  // Collect all TLA names for assessment generation
  const allTLAs = newTopics.flatMap(t => t.tlas)

  // Build assessments: one per TLA (matching working pattern of ~8 assessments)
  const newAssessments = allTLAs.map((tla, idx) => ({
    id: `A${idx + 1}`,
    tlaName: tla.tlaName,
    phase: tla.classPhase,
    assessmentMethod: ASSESSMENT_METHODS[idx % ASSESSMENT_METHODS.length],
    assessmentDescription: `Assessment for ${tla.tlaDescription.substring(0, 80)}`,
    hasRubric: idx === 0,
  }))

  // Build ILOs: distribute topics across COs (matching working pattern)
  const newIlos = []
  cos.forEach((co, i) => {
    // Each CO gets 2 ILOs (except last CO gets 1), matching working courses' ~8 ILOs for 4 COs
    const iloCount = (i < cos.length - 1) ? 2 : (8 - newIlos.length > 0 ? Math.max(1, 8 - newIlos.length) : 1)
    for (let j = 0; j < iloCount && newIlos.length < 9; j++) {
      const topicIdx = (newIlos.length) % newTopics.length
      newIlos.push({
        id: `${co.id}-ILO${j + 1}`,
        courseOutcome: co.description,
        intendedLearningOutcome: j === 0
          ? `Analyze and apply ${name} concepts related to ${newTopics[topicIdx].title.toLowerCase()}.`
          : `Implement solutions using ${name} techniques for ${newTopics[topicIdx].title.toLowerCase()}.`,
        deliveryWeek: `Week ${newIlos.length + 1}`,
        allocatedTime: '3 hours',
        topics: [newTopics[topicIdx].title],
        references: (s.references || []).slice(0, 2).map(r => `${r.id} - ${r.title}`),
      })
    }
  })

  // Apply the expanded data
  s.topics = newTopics
  s.assessments = newAssessments
  s.ilos = newIlos
}

export function enrichSyllabi(data) {
  let enriched = 0
  data.forEach(s => {
    if (!s.sdg) s.sdg = 'SDG4 - Quality Education'

    // Pass 1: Generate all data for courses with no courseOutcomes at all
    if (!s.courseOutcomes || s.courseOutcomes.length === 0) {
      const cos = generateCOS(s.code, s.name)
      s.courseOutcomes = cos
      s.topics = generateTopics(s.name)
      s.ilos = generateILOs(s.code, s.name, cos, s.topics)
      s.references = generateReferences(s.name)
      s.assessments = generateAssessments(cos, s.topics)
      s.coAssessmentMethodSets = generateCoAssessmentMethodSets(cos)
      s.gradingSystem = generateGradingSystem(cos)
      enriched++
    }

    // Pass 2: Expand sparse courses that have courseOutcomes but too few topics/TLAs
    expandSparseData(s)

    // Pass 3a: Repair broken CO-PO alignment. Some hand-authored courses have
    // duplicate CO descriptions or course outcomes with no PO mappings at all,
    // which makes the CO-PO table render blank/duplicated. Regenerate the whole
    // set from the course-aware template when that happens.
    if (Array.isArray(s.courseOutcomes) && s.courseOutcomes.length > 0) {
      const descs = s.courseOutcomes.map(c => String(c.description || '').trim().toLowerCase())
      const hasDupDesc = new Set(descs).size !== descs.length
      const hasEmptyMapping = s.courseOutcomes.some(c => !Array.isArray(c.poMappings) || !c.poMappings.some(v => v && String(v).trim()))
      if (hasDupDesc || hasEmptyMapping) {
        s.courseOutcomes = generateCOS(s.code, s.name)
      }
    }

    // Pass 3b: Guarantee a consistent set of 4 course outcomes for CO-PO alignment
    if (Array.isArray(s.courseOutcomes) && s.courseOutcomes.length > 0 && s.courseOutcomes.length < 4) {
      s.courseOutcomes = padToFourCOs(s.courseOutcomes, s.name)
    }

    // Pass 3c: Ensure exactly 3 ILOs per CO (ILO1-ILO3) so Course Coverage and Criteria
    // both render three rows per CO (previously some COs only had 1-2 ILOs).
    if (Array.isArray(s.courseOutcomes) && s.courseOutcomes.length > 0) {
      const topicTitles = (s.topics || []).map(t => t.title).filter(Boolean)
      const allRefs = (s.ilos || []).flatMap(i => i.references || [])
      const refPool = allRefs.length ? [...new Set(allRefs)] : (s.references || []).map(r => `${r.id} - ${r.title}`)
      const ILO_VERBS = ['Explain', 'Apply', 'Evaluate']
      const byCo = {}
      for (const ilo of (s.ilos || [])) {
        const co = String(ilo.id).split('-')[0]
        ;(byCo[co] = byCo[co] || []).push(ilo)
      }
      const rebuilt = []
      s.courseOutcomes.forEach((co, ci) => {
        const coKey = `CO${ci + 1}`
        const existing = byCo[coKey] || byCo[co.id] || []
        for (let j = 0; j < 3; j++) {
          if (existing[j]) {
            existing[j].id = `${coKey}-ILO${j + 1}`
            existing[j].courseOutcome = co.description
            rebuilt.push(existing[j])
          } else {
            const topic = topicTitles.length ? topicTitles[(ci * 3 + j) % topicTitles.length] : co.description
            rebuilt.push({
              id: `${coKey}-ILO${j + 1}`,
              courseOutcome: co.description,
              intendedLearningOutcome: `${ILO_VERBS[j]} ${s.name} concepts and techniques in applied contexts.`,
              deliveryWeek: `Week ${ci * 3 + j + 1}`,
              allocatedTime: '3 hours',
              topics: topic ? [topic] : [],
              references: refPool.slice(0, 2),
            })
          }
        }
      })
      s.ilos = rebuilt
    }

    // Pass 4: Replace template ILO descriptions with meaningful ones using course context
    improveILODescriptions(s)

    // Pass 5: Normalize assessment method names to short generic labels for EVERY course
    // (incl. hand-authored ones) so the Criteria table cells stay compact like 5174.
    if (Array.isArray(s.assessments)) {
      s.assessments.forEach((a, i) => {
        a.assessmentMethod = ASSESSMENT_METHODS[i % ASSESSMENT_METHODS.length]
      })
    }

    // Pass 6: Ensure a 2-sentence course description exists (Course Details should never be blank).
    {
      let desc = String(s.description || '').trim()
      if (!desc) {
        desc = `This course introduces the core principles, methods, and practical applications of ${s.name}.`
      }
      // Guarantee at least two sentences by appending a second one when needed.
      if ((desc.match(/[.!?]/g) || []).length < 2) {
        if (!/[.!?]$/.test(desc)) desc += '.'
        desc += ` Through lectures, hands-on activities, and assessments, students develop the practical skills needed to apply ${s.name} concepts to real-world computing problems.`
      }
      s.description = desc
    }

    // Pass 7: Normalize the grading system to 3 ILOs per CO (ILO1-ILO3), each CO mapped to
    // one assessment period with weights that sum to 100 (20/30/50), matching 5174's Criteria table.
    if (Array.isArray(s.courseOutcomes) && s.courseOutcomes.length > 0) {
      const PERIODS = ['prelim', 'midterm', 'semi', 'final']
      const ILO_WEIGHTS = ['20', '30', '50']
      s.gradingSystem = s.courseOutcomes.map((co, ci) => {
        const period = PERIODS[ci % 4]
        return {
          co: `CO${ci + 1}`,
          ilos: [0, 1, 2].map(j => {
            const weight = { prelim: '', midterm: '', semi: '', final: '' }
            weight[period] = ILO_WEIGHTS[j]
            return {
              id: `ILO${j + 1}`,
              assessments: [
                ASSESSMENT_METHODS[(ci * 3 + j) % ASSESSMENT_METHODS.length],
                ASSESSMENT_METHODS[(ci * 3 + j + 1) % ASSESSMENT_METHODS.length],
              ],
              weight,
              minPassing: '60',
            }
          }),
        }
      })
    }
  })
  return data
}
