import { Comment, CourseOutcome, AssessmentItem } from './models/index.js';

const returnedCourses = ['BSCS214L', 'BSCS222L', 'BSCS324L'];

const commentsData = [
    // ── BSCS214L – Data Structures and Algorithms ──────────────────────────
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Number of Items',
        type: 'Item count',
        body: 'The item count for ILO1 (7 items) is insufficient to cover Big-O notation across worst-case, average-case, and best-case scenarios for multiple algorithm types. Consider increasing to at least 10 items.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        type: 'Cognitive level',
        body: 'The Applying-level items for sorting algorithms currently ask students to trace execution rather than implement. Revise instructions to require actual implementation of quicksort and mergesort to properly target the Applying level.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Creating',
        type: 'Other',
        body: 'No Creating-level items found for linked list operations. Consider adding a design task where students propose a novel linked list variant optimized for a specific use case (e.g., memory-constrained environment).'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Analyzing',
        type: 'Cognitive level',
        body: 'The Analyzing-level items for hash tables are well-distributed, but they should explicitly ask students to compare collision resolution strategies (chaining vs. open addressing) with trade-off analysis rather than just identifying them.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Understanding',
        type: 'Cognitive level',
        body: 'The Understanding-level items for ILO3 focus on definitions rather than conceptual comparison. Consider replacing one item with a task requiring students to explain when recursion is preferable over iteration.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Remembering',
        type: 'Item count',
        body: 'ILO1 has 7 items but only 2 tagged at Remembering. Basic terminology and notation recognition should have a stronger foundation before moving to higher cognitive levels. Please add 2–3 more Remembering items.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        type: 'Other',
        body: 'Graph algorithm items lack an Evaluating-level component. Consider adding a rubric-based item where students evaluate which shortest-path algorithm (Dijkstra, Bellman-Ford, A*) is appropriate for a given graph topology.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Number of Items',
        type: 'Item count',
        body: 'The total allocation of 9 items for hash tables and trees under ILO2 seems unbalanced — trees receive roughly double the items of hash tables. Redistribute to ensure both topics have adequate coverage.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Remembering',
        type: 'Question',
        itemNumber: '1',
        body: 'Item 1 asks "What is the primary purpose of Big-O notation?" The wording is too broad — specify whether you want the theoretical purpose (bounding growth rates) or the practical purpose (algorithm comparison).'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Applying',
        type: 'Cognitive level',
        body: 'The linked list implementation item at Applying level does not require students to handle edge cases (empty list, single node). Please update the rubric to credit proper edge-case handling.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        type: 'Other',
        body: 'Consider adding a Creating-level item where students design a novel graph algorithm for a real-world routing problem (e.g., delivery route optimization with multiple constraints).'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Number of Items',
        type: 'Item count',
        body: 'ILO2 has 6 items total, of which 3 are multiple-choice. For sorting algorithm mastery, students should complete at least 2 hands-on coding items. Please convert one multiple-choice to a coding task.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Analyzing',
        type: 'Cognitive level',
        body: 'The Analyzing-level item comparing recursive and iterative approaches is well-written, but it should explicitly ask students to analyze space complexity differences, not just time complexity.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        type: 'Rubrics',
        itemNumber: '7',
        body: 'Item 7 asks students to analyze how Big-O influences decision-making. The rubric awards full points for a single correct conclusion, but should include partial credit for identifying relevant trade-offs even if the final conclusion is incomplete.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Understanding',
        type: 'Choices',
        itemNumber: '12',
        body: 'Item 12 asks "Why is implementing common algorithms important?" The multiple-choice options are too similar — two answers both reference efficiency but from slightly different angles. Redesign one option to focus on correctness rather than performance.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Remembering',
        type: 'Choices',
        itemNumber: '24',
        body: 'Item 24 is a multiple-choice question asking "Which of the following best describes building and traversing?" One distractor describes array iteration rather than linked list traversal. This is a valid confusion point — please add a follow-up or reword the incorrect option.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        type: 'Rubrics',
        itemNumber: '36',
        body: 'Item 36 asks students to provide a step-by-step guide for implementing hash tables and balanced trees. The rubric evaluates only the final solution. Add separate criteria for correct hash function selection and tree balancing logic.'
    },

    // ── BSCS222L – Discrete Structures 2 ───────────────────────────────────
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Applying',
        type: 'Cognitive level',
        body: 'The Applying-level items for propositional logic rely heavily on multiple-choice recognition. Add at least one rubric-based item requiring students to construct truth tables for compound propositions with 3–4 variables.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Number of Items',
        type: 'Item count',
        body: 'Only 5 items allocated to set operations. Students need more practice with union, intersection, difference, and Cartesian product across diverse problem contexts. Recommend increasing to 8 items.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Remembering',
        type: 'Item count',
        body: 'Several Remembering-level items under ILO2 (combinatorial principles) appear to overlap with ILO3 (graph properties). Clarify the scope boundary between these two ILOs to avoid content redundancy.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Evaluating',
        type: 'Other',
        body: 'No Evaluating-level items tagged for graph modeling. Consider adding a rubric-graded item where students evaluate which graph type (directed, weighted, bipartite) best models a given real-world scenario.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        type: 'Cognitive level',
        body: 'Proof by induction is inherently a Creating-level cognitive task, but the current items are tagged at lower levels. Re-tag the proof construction items to Creating to accurately reflect the cognitive demand.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        type: 'Question',
        itemNumber: '2',
        body: 'Item 2 asks students to explain the difference between propositional logic and predicate logic. The question is phrased as a short-answer with no word limit — please set a maximum (e.g., 100 words) or provide a rubric to guide scoring.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        type: 'Cognitive level',
        body: 'The Applying-level combinatorics items are too formulaic. Students should encounter at least one word problem that requires them to determine whether to use permutations or combinations before applying the formula.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Number of Items',
        type: 'Item count',
        body: 'Only 7 items for graph coloring and planarity. These are conceptually challenging topics that typically require more practice. Suggest increasing to at least 10 items with a mix of algorithmic and proof-based tasks.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Understanding',
        type: 'Cognitive level',
        body: 'The Understanding-level items for functions and relations do not cover partial orders or equivalence relations. These are essential concepts in discrete structures and should be tested.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        type: 'Other',
        body: 'Students should have a Creating-level opportunity to design a graph coloring scheme for a real-world scheduling problem (e.g., exam timetable with conflict constraints).'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        type: 'Rubrics',
        itemNumber: '8',
        body: 'Item 8 asks students to describe the process of set operations for modeling relationships. The rubric should include a criterion for correctly handling edge cases (empty sets, universal sets, overlapping sets) not just the standard cases.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Analyzing',
        type: 'Choices',
        itemNumber: '16',
        body: 'Item 16 presents a multiple-choice question comparing mathematical proof methods. One distractor is technically correct but uses an invalid approach — please revise to ensure all incorrect options are clearly distinguishable from the correct answer.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        type: 'Rubrics',
        itemNumber: '25',
        body: 'Item 25 asks students to describe combinatorial principles. The rubric gives equal weight to definitions and applications. Since application is the higher-order skill, consider weighting application at 60% and definitions at 40%.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Analyzing',
        type: 'Choices',
        itemNumber: '35',
        body: 'Item 35 is a multiple-choice question comparing graph analysis methods. Two options describe valid approaches with identical performance characteristics, making the question ambiguous. Add a distinguishing constraint (e.g., directed vs undirected graph).'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Number of Items',
        type: 'Item count',
        body: 'Mathematical induction is one of the most challenging topics, yet ILO3 only has 6 items. Consider adding 2–3 more items with varying difficulty levels (simple summation, divisibility, inequality proofs).'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        type: 'Question',
        body: 'The graph terminology items rely heavily on multiple-choice recognition. Consider adding at least one open-ended item where students must draw or describe a graph given a set of vertices and edges.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Analyzing',
        type: 'Cognitive level',
        body: 'No Analyzing-level items for logical argument evaluation. Consider adding a task where students analyze a given logical argument, identify any fallacies, and explain whether the conclusion follows from the premises.'
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Understanding',
        type: 'Item count',
        body: 'The Understanding-level items for ILO3 cover basic definitions, but there is no item asking students to explain the four-color theorem or its implications. Add one to connect theory to a well-known result.'
    },

    // ── BSCS324L – Advanced Software Engineering ────────────────────────────
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Applying',
        type: 'Cognitive level',
        body: 'The Applying-level rubric for Scrum sprint planning should include a "Team Collaboration" criterion since Scrum is fundamentally a team-based methodology. The current rubric focuses only on individual deliverables.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Number of Items',
        type: 'Item count',
        body: 'Only 7 items for microservices architecture topics. The scope is too broad — consider splitting into two ILOs: one for architectural patterns and another for inter-service communication.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Remembering',
        type: 'Question',
        itemNumber: '21',
        body: 'Item 21 asks "List the stages of a CI/CD pipeline" but provides no point allocation for partial credit. Please add a rubric to distinguish between listing stage names vs. explaining their purpose.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Creating',
        type: 'Other',
        body: 'The Docker Compose multi-service deployment item at Creating level is excellent, but the rubric should also evaluate network configuration correctness and service dependency management.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Analyzing',
        type: 'Other',
        body: 'Code review analysis items should require students to cite specific anti-patterns from established literature (e.g., Fowler, Martin) rather than making general observations about code quality.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Applying',
        type: 'Cognitive level',
        body: 'The CI/CD pipeline implementation items at Applying level are solid, but they do not require students to handle pipeline failure scenarios. Add a rubric criterion for error recovery and rollback strategies.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Number of Items',
        type: 'Item count',
        body: 'Only 6 items for Agile/Scrum under ILO1. Given that Scrum covers sprint planning, daily stand-ups, sprint reviews, and retrospectives, each ceremony deserves at least one dedicated assessment item.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        type: 'Other',
        body: 'No Creating-level items for infrastructure as code. Students should design a Terraform module that provisions a complete cloud environment with networking, compute, and storage resources.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Analyzing',
        type: 'Cognitive level',
        body: 'The Kubernetes orchestration items at Analyzing level ask students to compare deployment strategies but do not reference real-world constraints like cost, latency, or availability. Add context to make analysis more authentic.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Number of Items',
        type: 'Item count',
        body: 'ILO3 code quality has 7 items but only 1 addresses technical debt measurement. Technical debt quantification is a key skill — suggest adding 1–2 more items on tools like SonarQube or NDepend.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Evaluating',
        type: 'Rubrics',
        body: 'The microservices architecture evaluation rubric lacks consideration of operational concerns. Please add criteria for monitoring, logging, and service discovery, which are essential for microservices in production.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Applying',
        type: 'Cognitive level',
        body: 'The IaC implementation items test Terraform syntax but do not require state management understanding. Add a question about remote state backends and state locking to cover real-world IaC workflows.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Remembering',
        type: 'Item count',
        body: 'Only 2 Remembering-level items for ILO2. Students need a stronger foundation in architecture pattern definitions (layered, event-driven, microservices) before they can evaluate trade-offs at higher cognitive levels.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        type: 'Question',
        itemNumber: '22',
        body: 'Item 22 asks students to explain the difference between continuous delivery and continuous deployment. The question needs a word limit or rubric because student answers tend to vary widely in depth.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Evaluating',
        type: 'Rubrics',
        itemNumber: '12',
        body: 'The rubric for the microservices vs. monolith evaluation item (Item 12) does not consider team size or organizational structure as evaluation criteria. Please add these as they are critical factors in architectural decisions.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Creating',
        type: 'Choices',
        body: 'The multiple-choice deployment strategy items in CO2/ILO2 describe a Docker Compose scenario where one option describes "rolling update" but uses terminology more appropriate for "blue-green deployment." Please correct the terminology.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        type: 'Rubrics',
        itemNumber: '2',
        body: 'Item 2 asks students to create a sprint backlog. The rubric only evaluates completeness but not prioritization quality. Add a criterion for proper MoSCoW prioritization of backlog items.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        type: 'Other',
        body: 'Consider adding an Evaluating-level item where students assess a provided codebase using a standard static analysis tool and produce a prioritized list of refactoring recommendations with justifications.'
    },
];

export async function seedReturnedComments() {
    const coMap = {};
    const allOutcomes = await CourseOutcome.findAll({ where: { courseCode: returnedCourses } });
    allOutcomes.forEach(o => {
        const key = `${o.courseCode}|${o.co}`;
        coMap[key] = o.id;
    });

    const allItems = await AssessmentItem.findAll({ where: { courseCode: returnedCourses }, order: [['id', 'ASC']] });
    // build a label→id map per course (same numMap logic as frontend)
    const labelToItemId = {};
    for (const courseCode of returnedCourses) {
        const items = allItems.filter(i => i.courseCode === courseCode);
        let counter = 0;
        items.forEach(i => {
            const start = counter + 1;
            counter += (i.span || 1);
            for (let n = start; n <= counter; n++) {
                labelToItemId[`${courseCode}|${n}`] = i.id;
            }
        });
    }

    for (const data of commentsData) {
        const coKey = `${data.courseCode}|${data.co}`;
        let assessmentItemId = null;
        if (data.itemNumber) {
            const parts = data.itemNumber.split('\u2013');
            const label = parseInt(parts[0], 10);
            if (!isNaN(label)) {
                assessmentItemId = labelToItemId[`${data.courseCode}|${label}`] || null;
            }
        }
        await Comment.create({
            courseCode: data.courseCode,
            co: data.co,
            ilo: data.ilo || '',
            cognitiveLevel: data.cognitiveLevel || '',
            itemNumber: data.itemNumber || '',
            type: data.type || '',
            body: data.body,
            courseOutcomeId: coMap[coKey] || null,
            assessmentItemId,
        });
    }
    console.log(`Seeded ${commentsData.length} comments for returned courses: ${returnedCourses.join(', ')}`);
}
