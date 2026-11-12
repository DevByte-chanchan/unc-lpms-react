import { Comment, CourseOutcome, AssessmentItem, TosStatus, IloItem } from './models/index.js';

const returnedCourses = ['BSCS214L', 'BSCS222L', 'BSCS324L', 'BSCS341L'];

// Allowed Bloom's levels per ILO:
//   ILO1 -> Remembering, Understanding
//   ILO2 -> Applying, Analyzing
//   ILO3 -> Evaluating, Creating
//
// Comment target types in commentsData:
//   1. TOS Report cognitive cell: { co, ilo, cognitiveLevel: '<BloomLevel>' } (no rowIndex)
//   2. File card comment:         { co, ilo, cognitiveLevel: '<filename.pdf>' } (no rowIndex)
//   3. Point row comment:         { co, ilo, cognitiveLevel: '<BloomLevel>', rowIndex: 0 | 1 }
const commentsData = [
    // ── BSCS214L – Data Structures and Algorithms (Returned, Round 1) ──────────
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Remembering',
        body: 'ILO1 Remembering items should cover asymptotic notation definitions (Big-O, Big-Omega, Big-Theta) before moving into growth-rate comparisons.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        rowIndex: 1,
        body: 'In Part II (Understanding), clarify whether students should compare time complexity growth rates graphically or algebraically.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        body: 'The Applying-level items for sorting algorithms currently ask students to trace execution rather than implement. Revise instructions to require actual implementation of quicksort and mergesort.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Project Rubric.pdf',
        body: 'In Project Rubric.pdf, separate the grading criteria for code correctness and algorithmic efficiency so each carries an explicit weight.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        rowIndex: 0,
        body: 'Items 1-5 under Evaluating should require students to justify when recursion is preferable over iteration in terms of both time and call-stack space.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        body: 'Include a Creating-level task where students design a hybrid sorting strategy tailored to nearly-sorted datasets.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Midterm Exam - Part A.pdf',
        body: 'In Midterm Exam - Part A.pdf, add a diagram reference for the pointer manipulation questions on singly and doubly linked lists.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        rowIndex: 1,
        body: 'Part II should explicitly ask students to explain how sentinel nodes simplify boundary conditions in linked list insertion and deletion.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        rowIndex: 0,
        body: 'Items 1-5 should require handling edge cases (empty list, single-node tree, hash table resize) in the modular implementation.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Analyzing',
        body: 'The Analyzing-level items for hash tables should explicitly ask students to compare collision resolution strategies (chaining vs. open addressing) with load-factor trade-offs.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        body: 'Graph algorithm items need an Evaluating component where students assess which shortest-path algorithm (Dijkstra, Bellman-Ford, A*) best fits a given graph topology.'
    },
    {
        courseCode: 'BSCS214L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        rowIndex: 1,
        body: 'In Part II (Creating), require students to design a custom graph representation and traversal routine for a multi-constraint delivery routing problem.'
    },

    // ── BSCS222L – Discrete Structures 2 (Return 1 – Resolved) ─────────────────
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Remembering',
        body: 'Ensure basic logical connectives and quantifier notation are proportionately represented in the Remembering items.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        rowIndex: 1,
        body: 'Part II asks students to explain the difference between propositional and predicate logic — set a concise response guideline in the exam instructions.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        body: 'Include items requiring students to construct truth tables and equivalence proofs for compound propositions with 3–4 variables.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Analyzing',
        rowIndex: 1,
        body: 'Part II should test partial orders and equivalence relations by having students analyze whether given relation matrices are reflexive, symmetric, and transitive.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        body: 'Add an Evaluating item where students critique a flawed mathematical induction proof and pinpoint the invalid inductive step.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        rowIndex: 1,
        body: 'Proof by induction in Part II is properly tagged at Creating — include a clear scoring breakdown for base case, inductive hypothesis, and inductive step.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        body: 'The graph terminology items should include at least one task where students interpret degree sequences and isomorphism conditions.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        body: 'The Applying-level combinatorics items are too formulaic. Include a word problem where students must determine whether permutations or combinations apply.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Project Rubric.pdf',
        body: 'In Project Rubric.pdf, weight combinatorial modeling and application at 60% and terminology/definitions at 40%.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        rowIndex: 0,
        body: 'Items 1-5 should require students to evaluate which graph model (directed, weighted, bipartite) best fits a real-world network scenario.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        body: 'Students should have a Creating-level task to design a graph-coloring schedule for an exam timetable with conflict constraints.',
        returnNumber: 1
    },

    // ── BSCS222L – Return 2 (Active – Program Head follow-up) ──────────────────
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Midterm Exam - Part A.pdf',
        body: 'In Midterm Exam - Part A.pdf, one option in the logical fallacy item is ambiguous — add a brief clarification in the answer key.',
        returnNumber: 2
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        rowIndex: 0,
        body: 'The updated truth-table item in Items 1-5 is well-structured, but please specify how partial credit is awarded when a row is omitted.',
        returnNumber: 2
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Analyzing',
        rowIndex: 1,
        body: 'Part II edge-case criterion for set operations needs a clearer descriptor: "Addresses empty, universal, and overlapping sets accurately."',
        returnNumber: 2
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        body: 'The proof-by-induction items under Creating are appropriate, but please include one divisibility or inequality induction option.',
        returnNumber: 2
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        body: 'The combinatorics word problem is a great addition, but reword the prompt so it does not give away whether order matters.',
        returnNumber: 2
    },
    {
        courseCode: 'BSCS222L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        rowIndex: 0,
        body: 'Items 1-5 graph evaluation now covers directed vs. undirected graphs — add a 20% justification requirement for the chosen model.',
        returnNumber: 2
    },

    // ── BSCS324L – Advanced Software Engineering (Returned, Round 1) ───────────
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Remembering',
        rowIndex: 0,
        body: 'Items 1-5 should balance Agile ceremony definitions with software process metrics terminology.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        rowIndex: 1,
        body: 'In Part II, require students to explain the prioritization rationale (e.g., MoSCoW or WSJF) when organizing a sprint backlog.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        body: 'The Applying-level items for Scrum sprint planning should include team velocity and capacity constraints.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Project Rubric.pdf',
        body: 'In Project Rubric.pdf, include teamsize, service discovery, and observability criteria for the microservices vs. monolith design task.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        body: 'Consider adding an Evaluating-level task where students assess a codebase using static analysis findings and prioritize refactoring recommendations.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        rowIndex: 1,
        body: 'In Part II (Creating), require students to cite established refactoring patterns (e.g., Fowler) when proposing an architectural redesign.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Remembering',
        rowIndex: 0,
        body: 'Items 1-5 on CI/CD pipeline stages should distinguish between build, test, artifact staging, and deployment gates.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        rowIndex: 1,
        body: 'Part II asks students to compare continuous delivery and continuous deployment — specify the expected depth and release-governance examples.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        rowIndex: 0,
        body: 'Items 1-5 CI/CD pipeline implementation should require handling pipeline failure and automated rollback scenarios.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Analyzing',
        body: 'The Kubernetes orchestration items at Analyzing level should reference real-world constraints such as cost, latency, and zero-downtime availability.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        rowIndex: 0,
        body: 'In Items 1-5, ensure rolling-update vs. blue-green deployment trade-offs are evaluated against rollback speed and infrastructure cost.'
    },
    {
        courseCode: 'BSCS324L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        body: 'For the Creating-level Infrastructure-as-Code task, require remote state management, state locking, and service dependency configuration.'
    },

    // ── BSCS341L – Artificial Intelligence (Pending after Return 1 – Resolved) ─
    {
        courseCode: 'BSCS341L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Remembering',
        rowIndex: 0,
        body: 'Items 1-5 on uninformed and informed search should explicitly distinguish completeness and optimality guarantees.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS341L',
        co: 'CO1',
        ilo: 'ILO1',
        cognitiveLevel: 'Understanding',
        rowIndex: 1,
        body: 'In Part II on A* search, explicitly state admissible vs. consistent heuristic requirements for the grid scenario.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS341L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        rowIndex: 0,
        body: 'Items 1-5 converting natural-language statements to first-order logic should include nested quantifiers and scope-ordering cases.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS341L',
        co: 'CO1',
        ilo: 'ILO2',
        cognitiveLevel: 'Analyzing',
        body: 'The Analyzing-level items for CSP solving should compare backtracking with and without forward checking and arc consistency (AC-3).',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS341L',
        co: 'CO1',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        rowIndex: 0,
        body: 'In Items 1-5, include criteria for evaluating variable-ordering (MRV) and value-ordering (LCV) heuristics in constraint satisfaction.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS341L',
        co: 'CO2',
        ilo: 'ILO1',
        cognitiveLevel: 'Midterm Exam - Part A.pdf',
        body: 'In Midterm Exam - Part A.pdf, include a non-linearly separable dataset scenario so students can demonstrate kernel selection concepts.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS341L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Applying',
        rowIndex: 0,
        body: 'Items 1-5 on clustering should include selecting K using the elbow method from a provided SSE table and comparing Euclidean vs. Manhattan distance.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS341L',
        co: 'CO2',
        ilo: 'ILO2',
        cognitiveLevel: 'Analyzing',
        body: 'Include an Analyzing-level task where students interpret a hierarchical clustering dendrogram to determine the optimal cluster cut.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS341L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Evaluating',
        body: 'Add an Evaluating-level item where students compare precision, recall, F1-score, and PCA variance trade-offs for a given deployment priority.',
        returnNumber: 1
    },
    {
        courseCode: 'BSCS341L',
        co: 'CO2',
        ilo: 'ILO3',
        cognitiveLevel: 'Creating',
        rowIndex: 1,
        body: 'In Part II, the end-to-end preprocessing pipeline design should require justification for feature scaling, missing-value imputation, and categorical encoding.',
        returnNumber: 1
    }
];

export async function seedReturnedComments() {
    const coMap = {};
    const allOutcomes = await CourseOutcome.findAll({ where: { courseCode: returnedCourses } });
    allOutcomes.forEach(o => {
        const key = o.courseCode + '|' + o.co;
        coMap[key] = o.id;
    });

    const allIlos = await IloItem.findAll();
    const allItems = await AssessmentItem.findAll({ where: { courseCode: returnedCourses }, order: [['id', 'ASC']] });

    // Map courseCode|co|iloLabel -> Array of AssessmentItems
    const iloToItems = {};
    for (const c of returnedCourses) {
        const cOutcomes = allOutcomes.filter(o => o.courseCode === c);
        for (const co of cOutcomes) {
            const coIlos = allIlos.filter(i => i.coId === co.id).sort((a, b) => a.id - b.id);
            coIlos.forEach((ilo, idx) => {
                const iloLabel = 'ILO' + (idx + 1);
                const items = allItems.filter(i => Number(i.iloId) === Number(ilo.id));
                iloToItems[c + '|' + co.co + '|' + iloLabel] = items;
            });
        }
    }

    // Replace existing comments for the returned demo courses cleanly
    await Comment.destroy({ where: { courseCode: returnedCourses } });

    for (const data of commentsData) {
        const coKey = data.courseCode + '|' + data.co;
        const key = data.courseCode + '|' + data.co + '|' + data.ilo;
        const items = iloToItems[key] || [];
        let assessmentItemId = null;
        let cogLevel = data.cognitiveLevel || '';

        if (typeof data.rowIndex === 'number' && items.length > 0) {
            const targetItem = items[data.rowIndex] || items[0];
            assessmentItemId = targetItem.id;
            cogLevel = targetItem.cognitiveLevel || cogLevel;
        }

        await Comment.create({
            courseCode: data.courseCode,
            examPeriod: 'Midterm',
            co: data.co || '',
            ilo: data.ilo || '',
            cognitiveLevel: cogLevel,
            itemNumber: '',
            type: '',
            body: data.body,
            courseOutcomeId: coMap[coKey] || null,
            assessmentItemId,
            returnNumber: data.returnNumber || 1,
            resolved: false
        });
    }
    console.log(`Seeded ${commentsData.length} comments for returned courses: ${returnedCourses.join(', ')}`);

    // Mark Return 1 comments for BSCS222L as resolved (previous cycle)
    await Comment.update(
        { resolved: true },
        { where: { courseCode: 'BSCS222L', returnNumber: 1 } }
    );
    const resolvedCount = await Comment.count({ where: { courseCode: 'BSCS222L', returnNumber: 1, resolved: true } });
    console.log(`Marked ${resolvedCount} BSCS222L Return 1 comments as resolved`);

    // Mark BSCS341L Return 1 comments as resolved (pending — instructor already submitted)
    await Comment.update(
        { resolved: true },
        { where: { courseCode: 'BSCS341L', returnNumber: 1 } }
    );
    const bscs341lResolved = await Comment.count({ where: { courseCode: 'BSCS341L', returnNumber: 1, resolved: true } });
    console.log(`Marked ${bscs341lResolved} BSCS341L Return 1 comments as resolved`);

    // update TosStatus for returned courses so returnCount reflects the actual cycle
    const statuses = await TosStatus.findAll({ where: { courseCode: returnedCourses } });
    for (const st of statuses) {
        if (st.status === 'returned' && (!st.returnCount || st.returnCount < 1)) {
            const is222 = st.courseCode === 'BSCS222L';
            st.returnCount = is222 ? 2 : 1;
            st.returnDates = is222
                ? JSON.stringify(['2026-10-12T00:00:00.000Z', '2026-10-19T00:00:00.000Z'])
                : JSON.stringify(['2026-10-19T00:00:00.000Z']);
            await st.save();
        }
    }
    const updated = statuses.filter(s => s.status === 'returned').length;
    const with2 = statuses.filter(s => s.courseCode === 'BSCS222L' && s.status === 'returned').length;
    console.log(`Updated TosStatus — ${updated} returned courses (${with2} with returnCount → 2)`);
}

if (process.argv[1] && process.argv[1].endsWith('seed_comments.js')) {
    seedReturnedComments()
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
}
