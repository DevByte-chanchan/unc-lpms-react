const { Topic, Subtopic, ILOTopic, TopicTLA, sequelize, IntendedLearningOutcome, CourseOutcome, ProgramCourseOffering, Course } = require('../models');
const { Op } = require('sequelize');

// Fetch topics that are EITHER unassigned OR assigned to the current iloId
async function getAvailableTopics(req, res) {
    try {
        const iloId = Number(req.query.iloId);
        if (!iloId) return res.status(400).json({ message: 'iloId is required' });

        // Find all topic IDs that are currently assigned to OTHER ILOs
        const assignedToOthers = await ILOTopic.findAll({
            where: { ilo_id: { [Op.ne]: iloId } },
            attributes: ['topic_id']
        });
        const excludedTopicIds = assignedToOthers.map(t => Number(t.topic_id));

        // Fetch topics not in the excluded list, include their subtopics
        const topics = await Topic.findAll({
            where: {
                topic_id: { [Op.notIn]: excludedTopicIds.length ? excludedTopicIds : [0] }
            },
            include: [{
                model: Subtopic,
                as: 'subtopics',
                attributes: ['subtopic_id', 'title', 'sequence_order']
            }],
            order: [['title', 'ASC']]
        });

        return res.json(topics);
    } catch (err) {
        console.error('getAvailableTopics error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Fetch currently assigned topics for a specific ILO
async function getAssignedTopics(req, res) {
    try {
        const iloId = Number(req.params.iloId);
        if (!iloId) return res.status(400).json({ message: 'iloId is required' });

        const assignments = await ILOTopic.findAll({
            where: { ilo_id: iloId },
            include: [{
                model: Topic,
                as: 'topic',
                include: [{
                    model: Subtopic,
                    as: 'subtopics',
                    attributes: ['subtopic_id', 'title', 'sequence_order']
                }]
            }]
        });

        // Map the array to extract the nested topic objects safely
        const assigned = assignments
            .map(a => a.topic)
            .filter(Boolean);

        // Sort the topics by title alphabetically for a clean UI presentation
        assigned.sort((a, b) => String(a.title).localeCompare(String(b.title)));

        return res.json(assigned);
    } catch (err) {
        console.error('getAssignedTopics error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Master sync function: Creates custom topics, updates edits, and manages assignments
async function assignTopicsToILO(req, res) {
    const t = await sequelize.transaction();
    try {
        const rawIloId = req.body.ilo_id;
        const topics = req.body.topics;

        if (!rawIloId || !Array.isArray(topics)) {
            await t.rollback();
            return res.status(400).json({ message: 'ilo_id and topics array are required' });
        }

        const ilo_id = Number(rawIloId);
        const finalTopicIds = [];

        // 1. Process each topic (Create or Update)
        for (const topicData of topics) {
            let currentTopicId = topicData.topic_id ? Number(topicData.topic_id) : null;

            if (!currentTopicId) {
                // It's a manual/custom topic from the frontend
                const newTopic = await Topic.create({
                    title: topicData.title,
                    ilo_id: ilo_id // Satisfies non-nullable FK on backend model
                }, { transaction: t });
                currentTopicId = newTopic.topic_id;
            } else {
                // It's an existing topic, update its title in case they edited it inline
                await Topic.update(
                    { title: topicData.title },
                    { where: { topic_id: currentTopicId }, transaction: t }
                );
            }

            finalTopicIds.push(currentTopicId);

            // Sync Subtopics: Delete existing ones first to clean the slate
            await Subtopic.destroy({ where: { topic_id: currentTopicId }, transaction: t });

            if (topicData.subtopics && topicData.subtopics.length > 0) {
                const subsToCreate = topicData.subtopics.map((s, idx) => ({
                    topic_id: currentTopicId,
                    title: s.title,
                    sequence_order: s.sequence_order ?? idx
                }));
                await Subtopic.bulkCreate(subsToCreate, { transaction: t });
            }
        }

        // 2. Re-map the relationships SAFELY (Preserving ilo_topic_id for TLA connections)
        const existingMappings = await ILOTopic.findAll({ where: { ilo_id }, transaction: t });

        // CRITICAL FIX: Force both DB arrays and Frontend arrays to be integers
        const existingTopicIds = existingMappings.map(m => Number(m.topic_id));
        const incomingTopicIds = finalTopicIds.map(id => Number(id));

        const topicsToRemove = existingTopicIds.filter(id => !incomingTopicIds.includes(id));
        const topicsToAdd = incomingTopicIds.filter(id => !existingTopicIds.includes(id));

        // Only delete the mappings that were explicitly removed by the user
        if (topicsToRemove.length > 0) {
            const iloTopicsToRemove = existingMappings.filter(m => topicsToRemove.includes(Number(m.topic_id)));
            const iloTopicIdsToRemove = iloTopicsToRemove.map(m => Number(m.ilo_topic_id));

            // Cleanup orphaned TLAs linked to the removed topics
            await TopicTLA.destroy({ where: { ilo_topic_id: iloTopicIdsToRemove }, transaction: t });
            await ILOTopic.destroy({ where: { ilo_topic_id: iloTopicIdsToRemove }, transaction: t });
        }

        // Only create new mappings for freshly added topics
        if (topicsToAdd.length > 0) {
            const mappings = topicsToAdd.map(tid => ({ ilo_id, topic_id: tid }));
            await ILOTopic.bulkCreate(mappings, { transaction: t });
        }

        await t.commit();
        return res.json({ message: 'Topics successfully assigned', assignedCount: finalTopicIds.length });
    } catch (err) {
        await t.rollback();
        console.error('assignTopicsToILO error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// AI-Driven Topic Suggestions using Google Gemini
async function suggestTopicsWithAI(req, res) {
    try {
        const { iloId, courseCode, currentTopics = [], alreadySuggested = [], count = 6, useSample = false } = req.body;

        // 1. Fetch academic context from DB
        let iloDescription = '';
        let coDescription = '';
        let courseTitle = '';
        let courseDescription = '';
        let courseNo = courseCode || '';

        if (iloId) {
            try {
                const ilo = await IntendedLearningOutcome.findByPk(iloId);
                if (ilo) {
                    iloDescription = (ilo.description || '').replace(/\s+/g, ' ').trim();
                    if (ilo.co_id) {
                        const co = await CourseOutcome.findByPk(ilo.co_id, {
                            include: [{
                                model: ProgramCourseOffering,
                                include: [{ model: Course }]
                            }]
                        });
                        if (co) {
                            coDescription = (co.co_description || '').replace(/\s+/g, ' ').trim();
                            if (co.ProgramCourseOffering) {
                                courseDescription = (co.ProgramCourseOffering.course_description || '').replace(/\s+/g, ' ').trim();
                                if (co.ProgramCourseOffering.Course) {
                                    courseNo = co.ProgramCourseOffering.Course.course_no || courseNo;
                                    courseTitle = co.ProgramCourseOffering.Course.course_title || '';
                                }
                            }
                        }
                    }
                }
            } catch (dbErr) {
                console.warn('Could not query full context from DB:', dbErr.message);
            }
        }

        const contextInfo = {
            courseNo,
            courseTitle,
            courseDescription,
            coDescription,
            iloDescription
        };

        const apiKey = process.env.GEMINI_API_KEY;

        // If sample mode explicitly requested or API key not present
        if (useSample || !apiKey) {
            const fallbackTopics = generateFallbackAcademicTopics({
                courseNo,
                courseTitle,
                coDescription,
                iloDescription,
                alreadySuggested,
                currentTopics,
                count: Number(count) || 6
            });

            return res.json({
                topics: fallbackTopics,
                isSample: !apiKey || useSample,
                error: !apiKey ? 'MISSING_API_KEY' : null,
                message: !apiKey ? 'Gemini API key is not configured in composition/server/.env' : null,
                context: contextInfo
            });
        }

        // 2. Prepare Gemini Prompt
        const topicsToAvoid = [
            ...currentTopics,
            ...alreadySuggested
        ].filter(Boolean);

        const prompt = `You are a distinguished university curriculum designer and syllabus architect.
Generate high-quality, academic lecture topics and subtopics for a university course learning plan.

COURSE CONTEXT:
- Course Number: ${courseNo || 'N/A'}
- Course Title: ${courseTitle || 'N/A'}
- Course Description: ${courseDescription || 'Standard tertiary level academic curriculum.'}
- Relevant Course Outcome (CO): ${coDescription || 'Core competency and applied knowledge.'}

👉 **CRITICAL TARGET FOCUS - TARGET INTENDED LEARNING OUTCOME (ILO):**
"${iloDescription || 'Theoretical foundations and practical implementation.'}"

[WARNING: The topics you generate MUST be extremely specific to this exact Target ILO. DO NOT generate general topics about the overall Course or the parent Course Outcome. Focus ONLY on the specific micro-level skills and knowledge described in the Target ILO!]

${topicsToAvoid.length > 0 ? `TOPICS TO EXCLUDE (DO NOT duplicate or closely rephrase any of these):
${topicsToAvoid.map(t => `- ${t}`).join('\n')}
` : ''}

CRITICAL REQUIREMENTS:
1. Generate exactly ${Number(count) || 6} distinct, pedagogical lecture topics that TEACH EXACTLY the Target Intended Learning Outcome. Overrule the broader Course Description if it distracts from focusing precisely on the ILO.
2. For EVERY topic, provide a FIXED count of EXACTLY 5 realistic, rigorous, and practical subtopics / lecture bullet points (do not provide 3 or 4, each topic MUST have exactly 5 subtopics).
3. Keep all names concise, professional, and directly suitable for an official academic syllabus.
4. Output MUST be strictly valid JSON without markdown fences or explanation, following this schema:
{
  "topics": [
    {
      "title": "Topic Name",
      "subtopics": [
        "Subtopic Title 1",
        "Subtopic Title 2",
        "Subtopic Title 3",
        "Subtopic Title 4",
        "Subtopic Title 5"
      ]
    }
  ]
}`;

        // 3. Call Google Gemini API (gemini-2.0-flash / gemini-1.5-flash)
        const models = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.8-flash'];
        let lastError = null;
        let data = null;

        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [{ text: prompt }]
                            }
                        ],
                        generationConfig: {
                            responseMimeType: 'application/json',
                            temperature: 0.7
                        }
                    })
                });

                if (!response.ok) {
                    const errBody = await response.text();
                    lastError = new Error(`Gemini API HTTP ${response.status}: ${errBody}`);
                    continue; // fallback to next model
                }

                data = await response.json();
                break;
            } catch (err) {
                lastError = err;
            }
        }

        if (!data) {
            console.error('All Gemini model calls failed:', lastError);
            // Fallback gracefully so the professor isn't left empty-handed
            const fallbackTopics = generateFallbackAcademicTopics({
                courseNo, courseTitle, coDescription, iloDescription,
                alreadySuggested, currentTopics, count: Number(count) || 6
            });
            return res.json({
                topics: fallbackTopics,
                isSample: true,
                warning: 'Gemini API call failed, loaded fallback topics.',
                context: contextInfo
            });
        }

        // 4. Parse response
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
            throw new Error('No content returned from Gemini model');
        }

        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (e) {
            const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
        }

        const rawList = Array.isArray(parsed) ? parsed : (parsed.topics || []);
        const formattedTopics = rawList.map((t, idx) => {
            let subs = Array.isArray(t.subtopics) ? t.subtopics.map(s => (typeof s === 'string' ? s : (s.title || ''))).filter(Boolean) : [];
            // Strictly guarantee exactly 5 subtopics
            if (subs.length > 5) {
                subs = subs.slice(0, 5);
            }
            while (subs.length < 5) {
                subs.push(`Practical Application & Lab Exercise ${subs.length + 1}`);
            }

            return {
                id: `ai-suggest-${Date.now()}-${idx}-${Math.random()}`,
                title: t.title || t.topic || `Suggested Topic ${idx + 1}`,
                subtopics: subs.map((s, sIdx) => ({
                    id: `ai-sub-${Date.now()}-${idx}-${sIdx}`,
                    title: s
                }))
            };
        });

        return res.json({
            topics: formattedTopics,
            context: contextInfo,
            isSample: false
        });

    } catch (err) {
        console.error('suggestTopicsWithAI error:', err);
        return res.status(500).json({
            error: 'AI_SUGGESTION_FAILED',
            message: err.message || 'Error occurred while contacting Gemini AI'
        });
    }
}

// Generates high quality, context-aware academic topics for testing or offline fallback with EXACTLY 5 subtopics each
function generateFallbackAcademicTopics({ courseTitle, iloDescription, alreadySuggested = [], currentTopics = [], count = 6 }) {
    const isHci = (courseTitle || '').toLowerCase().includes('human') || (iloDescription || '').toLowerCase().includes('interface') || (iloDescription || '').toLowerCase().includes('ui');
    const isDb = (courseTitle || '').toLowerCase().includes('database') || (iloDescription || '').toLowerCase().includes('data');

    let bank = [];

    if (isHci) {
        bank = [
            {
                title: "Fundamentals of User-Centered Design (UCD)",
                subtopics: [
                    "Principles of Human-Centered Development",
                    "Affordances, Signifiers, and Feedback Loops",
                    "Mapping Conceptual Models to Mental Models",
                    "User Goal Analysis & Task Breakdown",
                    "Iterative Design Life Cycle Implementation"
                ]
            },
            {
                title: "Heuristic Evaluation & Usability Inspection",
                subtopics: [
                    "Nielsen's 10 Usability Heuristics",
                    "Conducting Cognitive Walkthroughs",
                    "Severity Rating & Usability Reporting",
                    "Expert Review Methodologies",
                    "Defect Categorization & Action Planning"
                ]
            },
            {
                title: "Wireframing & Interactive Prototyping",
                subtopics: [
                    "Low-Fidelity vs High-Fidelity Mockups",
                    "Information Architecture & Task Flows",
                    "Prototyping with Modern Design Tools",
                    "Interactive Component Linking & Transitions",
                    "Design System Integration & Token Mapping"
                ]
            },
            {
                title: "Visual Design Systems & Accessibility (a11y)",
                subtopics: [
                    "WCAG 2.1 Color Contrast and Typography",
                    "Micro-Interactions and Animation Physics",
                    "Design Tokens and Component Libraries",
                    "Screen Reader Compatibility & Assistive Tech",
                    "Dark Mode & Responsive Visual Adaptation"
                ]
            },
            {
                title: "User Research & Persona Development",
                subtopics: [
                    "Qualitative & Quantitative User Interviews",
                    "Empathy Maps and Journey Mapping",
                    "Formulating Actionable Problem Statements",
                    "User Persona Archetypes & Synthesis",
                    "Surveys, Questionnaires, and Data Triangulation"
                ]
            },
            {
                title: "Usability Testing & Empirical Evaluation",
                subtopics: [
                    "Planning Lab vs Remote Usability Tests",
                    "Measuring Task Completion Rates & SUS Scores",
                    "A/B Testing & Iterative Design Refinement",
                    "Think-Aloud Protocols & Observer Notes",
                    "Translating Usability Findings into Roadmaps"
                ]
            },
            {
                title: "Cognitive Psychology & Human Factors",
                subtopics: [
                    "Hick's Law and Fitts's Law in UI Layouts",
                    "Working Memory Limitations and Chunking",
                    "Visual Hierarchy and Gestalt Principles",
                    "Cognitive Load Theory in Interface Design",
                    "Attention Economics and Perceptual Processing"
                ]
            },
            {
                title: "Emerging Interaction Paradigms",
                subtopics: [
                    "Voice User Interfaces (VUI) & Conversational UI",
                    "Gesture Control and Spatial Computing",
                    "Accessible Multi-Modal Interfaces",
                    "Haptic Feedback and Tactile Interactions",
                    "Future Trends in Ambient Intelligence"
                ]
            }
        ];
    } else if (isDb) {
        bank = [
            {
                title: "Relational Database Design & Normalization",
                subtopics: [
                    "Entity-Relationship Modeling (ERD)",
                    "First through Third Normal Forms (1NF-3NF)",
                    "Boyce-Codd Normal Form (BCNF) Application",
                    "Denormalization Trade-offs for Performance",
                    "Conceptual to Physical Schema Mapping"
                ]
            },
            {
                title: "Advanced SQL Query Optimization",
                subtopics: [
                    "Index Creation (B-Tree and Hash)",
                    "Analyzing Query Execution Plans",
                    "Joins, Subqueries, and CTEs Performance",
                    "Cost-Based Query Optimizer Mechanics",
                    "Query Rewriting & Hint Utilization"
                ]
            },
            {
                title: "Transaction Management & ACID Properties",
                subtopics: [
                    "Concurrency Control and Deadlock Prevention",
                    "Isolation Levels and Dirty Reads",
                    "Write-Ahead Logging (WAL) and Recovery",
                    "Two-Phase Locking (2PL) Mechanisms",
                    "Distributed Transactions and 2PC Protocols"
                ]
            },
            {
                title: "Database Security & Role-Based Access",
                subtopics: [
                    "SQL Injection Prevention Techniques",
                    "Privilege Delegation and Views",
                    "Data Encryption at Rest and in Transit",
                    "Auditing and Access Monitoring",
                    "Backup Strategy and Disaster Recovery"
                ]
            },
            {
                title: "NoSQL Paradigms & Document Stores",
                subtopics: [
                    "Document vs Key-Value vs Graph Databases",
                    "CAP Theorem and Eventual Consistency",
                    "Schema Design for MongoDB",
                    "Sharding and Horizontal Partitioning",
                    "Replication Sets and High Availability"
                ]
            },
            {
                title: "Data Warehousing & ETL Pipelines",
                subtopics: [
                    "Star and Snowflake Schemas",
                    "Extract, Transform, and Load Workflows",
                    "Analytical Query Processing (OLAP)",
                    "Columnar Storage Architectures",
                    "Data Lakehouse Foundations"
                ]
            }
        ];
    } else {
        bank = [
            {
                title: "Core Architectural Patterns & Principles",
                subtopics: [
                    "Separation of Concerns (SoC)",
                    "Domain-Driven Design Fundamentals",
                    "Modular Component Structuring",
                    "Dependency Injection & Inversion of Control",
                    "Layered and Hexagonal Architecture"
                ]
            },
            {
                title: "State Management & Asynchronous Data Flow",
                subtopics: [
                    "Unidirectional Data Architectures",
                    "Optimistic UI Updates and Side Effects",
                    "Error Boundaries and Fallback States",
                    "Global vs Local State Co-location",
                    "Event-Driven Message Pipelines"
                ]
            },
            {
                title: "Component Reusability & Design Systems",
                subtopics: [
                    "Atomic Design Methodology",
                    "Encapsulated Theming and Tokens",
                    "Accessibility Compliance Guidelines",
                    "Component Reusability Guidelines",
                    "Documentation with Storybook"
                ]
            },
            {
                title: "Performance Optimization & Profiling",
                subtopics: [
                    "Virtual DOM Reconciliation Mechanics",
                    "Lazy Loading and Code Splitting",
                    "Memory Leak Diagnosis and Cleanup",
                    "Bundle Size Auditing & Tree-Shaking",
                    "Web Vitals & Rendering Milestones"
                ]
            },
            {
                title: "Security Best Practices & Data Validation",
                subtopics: [
                    "Input Sanitization and Cross-Site Scripting (XSS)",
                    "Cross-Origin Resource Sharing (CORS)",
                    "Authentication Flow and JWT Security",
                    "CSRF Protection Strategies",
                    "Rate Limiting and API Gateway Policies"
                ]
            },
            {
                title: "Automated Testing & Continuous Verification",
                subtopics: [
                    "Unit Testing Core Business Logic",
                    "Integration Testing for User Flows",
                    "End-to-End Regression Automation",
                    "Mocking External APIs and Test Doubles",
                    "Code Coverage Analysis & Quality Gates"
                ]
            }
        ];
    }

    const avoidTitles = new Set([...alreadySuggested, ...currentTopics].map(t => String(t).trim().toLowerCase()));
    const filtered = bank.filter(b => !avoidTitles.has(b.title.toLowerCase()));
    const selected = (filtered.length >= count ? filtered : bank).slice(0, count);

    return selected.map((t, idx) => ({
        id: `sample-topic-${Date.now()}-${idx}-${Math.random()}`,
        title: t.title,
        subtopics: t.subtopics.slice(0, 5).map((s, sIdx) => ({
            id: `sample-sub-${Date.now()}-${idx}-${sIdx}`,
            title: s
        }))
    }));
}

module.exports = { getAvailableTopics, getAssignedTopics, assignTopicsToILO, suggestTopicsWithAI };
