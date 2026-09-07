'use strict';

/**
 * Seeder: Single Course Learning Plan - "Statistics"
 * Status Target: RETURNED (By Industry Consultant)
 * New Schema: Uses AssignmentWorkflowLogs and isolated CommentTargets
 * * Run: npx sequelize-cli db:seed --seed 20260515000000-seed-returned-lp-statistics.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // ============================================================================
        // 1. COURSE CREATION
        // ============================================================================
        await queryInterface.bulkInsert('Courses', [{
            course_no: 'MATH311L',
            course_title: 'Statistics',
            credit: '3 LEC',
            contact_hrs: '3 Hrs Lec',
            classification: 'Professional Courses',
            cmo: 'CMO No. 25 S. 2015',
            year_lvl: 'THIRD YEAR',
            term: '1st Semester SY 2026-2027',
            createdAt: now,
            updatedAt: now
        }], {});

        const course = await queryInterface.sequelize.query(
            `SELECT course_id FROM Courses WHERE course_no = 'MATH311L' ORDER BY course_id DESC LIMIT 1;`,
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
            course_description: 'Introduces probability theory, statistical inference, regression modeling, and applied data analysis techniques. Emphasis on hypothesis testing, estimation, ANOVA, nonparametric methods, and practical use of statistical software for real-world datasets.',
            createdAt: now,
            updatedAt: now
        }], {});

        const offering = await queryInterface.sequelize.query(
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} LIMIT 1;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const offeringId = offering[0].pc_offering_id;

        // ============================================================================
        // 3. COURSE OFFERING ASSIGNMENT
        // ============================================================================
        await queryInterface.bulkInsert('CourseOfferingAssignments', [{
            pc_offering_id: offeringId,
            stakeholder_id: null,
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
        // 3.5 ASSIGNMENT WORKFLOW LOGS (NEW ARCHITECTURE)
        // Simulate Assigned -> Submitted -> Returned by Industry Consultant
        // ============================================================================

        await queryInterface.bulkInsert('AssignmentWorkflowLogs', [
            { co_assign_id: assignId, actor_role: 'PROGRAM_HEAD', action_type: 'ASSIGNED', createdAt: new Date('2026-06-01 09:00:00'), updatedAt: new Date('2026-06-01 09:00:00') },
            { co_assign_id: assignId, actor_role: 'INSTRUCTOR', action_type: 'SUBMITTED', createdAt: new Date('2026-06-10 14:30:00'), updatedAt: new Date('2026-06-10 14:30:00') },
            { co_assign_id: assignId, actor_role: 'INDUSTRY_CONSULTANT', action_type: 'RETURNED', createdAt: new Date('2026-06-15 10:15:00'), updatedAt: new Date('2026-06-15 10:15:00') }
        ], {});

        // ============================================================================
        // 4. COURSE OUTCOMES (4 records)
        // ============================================================================

        await queryInterface.bulkInsert('CourseOutcomes', [
            { pc_offering_id: offeringId, co_description: 'CO1: Apply probability theory and discrete/continuous distributions to model uncertainty in computing contexts.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO2: Perform statistical inference including point estimation, confidence intervals, and hypothesis testing for population parameters.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO3: Build and interpret linear and logistic regression models and assess model assumptions and goodness-of-fit.', createdAt: now, updatedAt: now },
            { pc_offering_id: offeringId, co_description: 'CO4: Use statistical software to conduct data analysis, visualization, and reproducible reporting for real datasets.', createdAt: now, updatedAt: now }
        ], {});

        const cos = await queryInterface.sequelize.query(
            `SELECT co_id FROM CourseOutcomes WHERE pc_offering_id = ${offeringId} ORDER BY co_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 4.5. PROGRAM OUTCOME ALIGNMENTS
        // ============================================================================

        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            { co_id: cos[0].co_id, po_id: 2, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 4, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 8, attainment_level: 'I', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 5. INTENDED LEARNING OUTCOMES (12 records, 3 per CO)
        // ============================================================================

        const iloData = [
            // CO1 (Prelim Period)
            { co_id: cos[0].co_id, description: 'Compute probabilities using combinatorics, conditional probability, and Bayes theorem.' },
            { co_id: cos[0].co_id, description: 'Differentiate and apply common discrete and continuous distributions (Binomial, Poisson, Normal, Exponential).' },
            { co_id: cos[0].co_id, description: 'Model sampling distributions and apply the Central Limit Theorem to approximate sampling behavior.' },
            // CO2 (Midterm Period)
            { co_id: cos[1].co_id, description: 'Construct point and interval estimates for means and proportions and interpret confidence levels.' },
            { co_id: cos[1].co_id, description: 'Perform hypothesis tests for means, proportions, and variances using t-tests, z-tests, and chi-square tests.' },
            { co_id: cos[1].co_id, description: 'Apply ANOVA techniques to compare multiple group means and interpret post-hoc analyses.' },
            // CO3 (Semi-Final Period)
            { co_id: cos[2].co_id, description: 'Fit simple and multiple linear regression models and interpret coefficients, residuals, and diagnostics.' },
            { co_id: cos[2].co_id, description: 'Use logistic regression for binary outcomes and evaluate model performance using ROC and confusion matrices.' },
            { co_id: cos[2].co_id, description: 'Apply model selection techniques (AIC, BIC, cross-validation) and address multicollinearity and interaction terms.' },
            // CO4 (Final Period)
            { co_id: cos[3].co_id, description: 'Perform exploratory data analysis and create publication-quality visualizations using statistical software.' },
            { co_id: cos[3].co_id, description: 'Implement reproducible analysis workflows using scripts and notebooks; document data cleaning and transformation steps.' },
            { co_id: cos[3].co_id, description: 'Conduct a capstone data analysis project applying the full statistical pipeline from question to inference and reporting.' }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', iloData.map(i => ({ ...i, createdAt: now, updatedAt: now })), {});

        const ilos = await queryInterface.sequelize.query(
            `SELECT ilo_id FROM IntendedLearningOutcomes WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 6. TOPICS & SUBTOPICS (35 records)
        // ============================================================================

        const topicTitles = [
            'Basic Probability Concepts', 'Combinatorics and Counting', 'Discrete Probability Distributions',
            'Continuous Probability Distributions', 'Sampling Distributions and CLT', 'Point Estimation and Properties',
            'Confidence Intervals', 'Hypothesis Testing Fundamentals', 't-tests and z-tests',
            'Chi-Square Tests and Contingency Tables', 'Analysis of Variance (ANOVA)', 'Nonparametric Methods',
            'Simple Linear Regression', 'Multiple Regression and Diagnostics', 'Logistic Regression',
            'Model Selection and Validation', 'Time Series Basics', 'Autocorrelation and ARIMA Models',
            'Resampling Methods (Bootstrap, Permutation)', 'Experimental Design Principles', 'Power Analysis and Sample Size',
            'Exploratory Data Analysis (EDA)', 'Data Cleaning and Transformation', 'Visualization for Statistical Reporting',
            'Categorical Data Analysis', 'Survival Analysis Introduction', 'Multivariate Techniques (PCA, Clustering)', 'Bayesian Inference Basics',
            'Statistical Software: R Essentials', 'Statistical Software: Python (pandas, statsmodels)', 'Reproducible Research with Notebooks',
            'Ethics in Data Analysis', 'Communicating Statistical Results', 'Capstone Project Planning', 'Advanced Topics in Regression'
        , 'Course Orientation and VMO Alignment'];

        await queryInterface.bulkInsert('Topics', topicTitles.map(t => ({ title: t, createdAt: now, updatedAt: now })), {});
        const topics = await queryInterface.sequelize.query(
            `SELECT topic_id, title FROM Topics ORDER BY topic_id DESC LIMIT 36;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const subtopicsToInsert = [];
        topics.forEach(t => {
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Conceptual Overview of ${t.title}`, sequence_order: 1, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Worked Examples and Problem Solving for ${t.title}`, sequence_order: 2, createdAt: now, updatedAt: now });
            subtopicsToInsert.push({ topic_id: t.topic_id, title: `Applied Case Study and Interpretation for ${t.title}`, sequence_order: 3, createdAt: now, updatedAt: now });
        });
        await queryInterface.bulkInsert('Subtopics', subtopicsToInsert, {});

        // ============================================================================
        // 7. REFERENCES (35 records)
        // ============================================================================

        const referencesData = [];
        const refAuthors = [
            'Wackerly, Mendenhall & Scheaffer', 'Montgomery & Runger', 'Casella & Berger', 'Agresti',
            'Hastie, Tibshirani & Friedman', 'James, Witten, Hastie & Tibshirani', 'Dalgaard', 'Gelman et al.',
            'Field, Miles & Field', 'Moore, McCabe & Craig', 'Rice', 'DeGroot & Schervish',
            'Efron & Tibshirani', 'Venables & Ripley', 'Kreyszig', 'Chatfield',
            'Shumway & Stoffer', 'Box, Jenkins & Reinsel', 'Cameron & Trivedi', 'Hosmer, Lemeshow & Sturdivant',
            'Kleinbaum, Kupper & Morgenstern', 'Cochran', 'Searle', 'Everitt', 'McCullagh & Nelder',
            'Collett', 'Kass & Raftery', 'Wickham', 'McKinney', 'Seabold & Perktold', 'Xie', 'Bokil', 'Tukey', 'Venables', 'Anderson'
        ];

        for (let i = 0; i < 36; i++) {
            referencesData.push({
                title: `Statistics Reference Vol ${i+1}`,
                author: refAuthors[i] || `Author ${i+1}`,
                isbn: i % 2 === 0 ? `978-0262${100 + i}` : null,
                link: i % 2 !== 0 ? `https://stats-resources.example.com/vol${i}` : null,
                publication_year: new Date(`201${(i%10)}-01-01`),
                type: i % 3 === 0 ? 'TEXTBOOK' : i % 3 === 1 ? 'ONLINE' : 'OER',
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('References', referencesData, {});

        const references = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT 36;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 8. TLAs (35 records)
        // ============================================================================

        const tlaTitles = [
            'Probability Problem Sets', 'Combinatorics Workshop', 'Binomial-Poisson Lab',
            'Normal Distribution Simulation', 'Sampling Simulation Exercise', 'Estimation and CI Lab',
            'Hypothesis Testing Practicum', 'Chi-Square Contingency Lab', 'ANOVA Group Comparison Lab',
            'Nonparametric Methods Workshop', 'Simple Regression Lab', 'Multiple Regression Diagnostics',
            'Logistic Regression Case Study', 'Model Selection Hackathon', 'Time Series Decomposition Lab',
            'ARIMA Forecasting Exercise', 'Bootstrap Resampling Lab', 'Experimental Design Simulation',
            'Power Analysis Workshop', 'EDA and Visualization Sprint', 'Data Cleaning Challenge',
            'R Scripting Essentials Lab', 'Python Statistical Analysis Lab', 'Reproducible Notebook Assignment',
            'Categorical Data Modeling Lab', 'Survival Analysis Mini-Project', 'PCA and Clustering Lab', 'Bayesian Inference Exercise',
            'ROC and Model Evaluation Lab', 'Cross-Validation Implementation', 'Regression Residuals Diagnostics',
            'Ethics Case Discussion', 'Statistical Communication Presentation', 'Capstone Data Analysis Project',
            'Advanced Regression Techniques Lab', 'Multivariate Time Series Exercise'
        , 'Course Orientation Lecture'];

        await queryInterface.bulkInsert('TeachingAndLearningActivities', tlaTitles.map((t, idx) => ({
            tla_name: t, description: `Hands-on activity focused on applied statistics: ${t}.`,
            performed_by: idx % 2 === 0 ? 'S' : 'I', class_phase: ['pre', 'in', 'post'][idx % 3], is_lab: '1', createdAt: now, updatedAt: now
        })), {});

        const tlas = await queryInterface.sequelize.query(
            `SELECT tla_id FROM TeachingAndLearningActivities ORDER BY tla_id DESC LIMIT 36;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 9. JUNCTION MAPPINGS (ILOTopics, ILOReferences)
        // Assign exactly 2 Topics, 2 References, 2 TLAs per ILO (Total 24 used)
        // ============================================================================

        const iloTopicInserts = [];
        const iloReferenceInserts = [];

        for (let i = 0; i < 12; i++) {
            const iloId = ilos[i].ilo_id;
            iloTopicInserts.push({ ilo_id: iloId, topic_id: topics[i * 2].topic_id, createdAt: now, updatedAt: now });
            iloTopicInserts.push({ ilo_id: iloId, topic_id: topics[(i * 2) + 1].topic_id, createdAt: now, updatedAt: now });

            iloReferenceInserts.push({ ilo_id: iloId, reference_id: references[i * 2].reference_id, createdAt: now, updatedAt: now });
            iloReferenceInserts.push({ ilo_id: iloId, reference_id: references[(i * 2) + 1].reference_id, createdAt: now, updatedAt: now });
        }
        
        // Orientation Map
        const oIlo = ilos.find(i => i.is_orientation) || ilos[12];
        if (oIlo) {
            iloTopicInserts.push({ ilo_id: oIlo.ilo_id, topic_id: topics[35].topic_id, createdAt: now, updatedAt: now });
            iloReferenceInserts.push({ ilo_id: oIlo.ilo_id, reference_id: references[35].reference_id, createdAt: now, updatedAt: now });
        }
        await queryInterface.bulkInsert('ILOTopics', iloTopicInserts, {});
        await queryInterface.bulkInsert('ILOReferences', iloReferenceInserts, {});


        const iloTopics = await queryInterface.sequelize.query(
            `SELECT ilo_topic_id FROM ILOTopics ORDER BY ilo_topic_id DESC LIMIT 25;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        // ============================================================================
        // 10. TOPIC TLAs
        // ============================================================================

        const topicTlaInserts = [];
        for (let i = 0; i < 25; i++) {
            topicTlaInserts.push({
                ilo_topic_id: iloTopics[i].ilo_topic_id,
                tla_id: tlas[i].tla_id,
                createdAt: now, updatedAt: now
            });
        }
        await queryInterface.bulkInsert('TopicTLAs', topicTlaInserts, {});

        // ============================================================================
        // 11. TLA ASSESSMENTS (20/30/50 Grading Logic)
        // ============================================================================

        const assessmentInserts = [];
        const periods = ['p', 'm', 's', 'f'];
        const weightDistribution = [10, 15, 25]; // Applied twice per ILO = 20, 30, 50
        const assessmentNames = ['Problem Set', 'Lab Report', 'Project Presentation', 'Data Analysis Exam', 'Modeling Assignment'];

        for (let i = 0; i < 12; i++) {
            const coIndex = Math.floor(i / 3);
            const iloPosInCo = i % 3;
            const targetPeriod = periods[coIndex];
            const targetWeightPerAssessment = String(weightDistribution[iloPosInCo]);

            const assignedTlasForIlo = [tlas[i * 2].tla_id, tlas[(i * 2) + 1].tla_id];

            assignedTlasForIlo.forEach((tlaId, idx) => {
                assessmentInserts.push({
                    tla_id: tlaId,
                    name: assessmentNames[(i + idx) % assessmentNames.length],
                    description: `Summative assessment evaluating statistical reasoning and applied analysis.`,
                    period: targetPeriod,
                    weight: targetWeightPerAssessment,
                    min_passing: 60,
                    createdAt: now,
                    updatedAt: now
                });
            });
        }
        await queryInterface.bulkInsert('TLAAssessments', assessmentInserts, {});

        // ============================================================================
        // 12. COMMENTS & COMMENT TARGETS (THE NEW WORKFLOW MECHANIC)
        // ============================================================================
        // Insert 6 realistic industry-academic critiques linked to Topics and TLAs.

        const rawCommentsData = [
            // Comment 1: Target a Topic in CO1, ILO 1 (Probability)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[0].ilo_id, comment_for: 'topics', target_id: topics[0].topic_id,
                message: 'The probability topic should include applied examples in computing such as hashing collision probabilities and randomized algorithms; add a short module on practical applications.'
            },
            // Comment 2: Target a TLA in CO1, ILO 2 (Distributions)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[1].ilo_id, comment_for: 'tlas', target_id: tlas[2].tla_id,
                message: 'For distribution labs, require students to simulate sampling variability in code (R or Python) and submit reproducible scripts rather than static outputs.'
            },
            // Comment 3: Target a Topic in CO2, ILO 2 (Inference)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[4].ilo_id, comment_for: 'topics', target_id: topics[7].topic_id,
                message: 'Hypothesis testing section should explicitly cover multiple testing corrections (Bonferroni, FDR) when students analyze many features.'
            },
            // Comment 4: Target a TLA in CO3, ILO 3 (Regression)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[7].ilo_id, comment_for: 'tlas', target_id: tlas[10].tla_id,
                message: 'Regression lab must include diagnostics for heteroscedasticity and influence (Cook\'s distance); require remediation steps when assumptions fail.'
            },
            // Comment 5: Target a Topic in CO4, ILO 2 (Software)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[10].ilo_id, comment_for: 'topics', target_id: topics[27].topic_id,
                message: 'R essentials should include package management and version control (packrat/renv) to ensure reproducibility across environments.'
            },
            // Comment 6: Target a TLA in CO4, ILO 3 (Capstone)
            {
                co_assign_id: assignId, commenter_role: 'INDUSTRY_CONSULTANT', resolved_status: false,
                ilo_id: ilos[11].ilo_id, comment_for: 'tlas', target_id: tlas[32].tla_id,
                message: 'Capstone project rubric should weight data provenance, reproducibility, and ethical considerations; require a short reproducible appendix.'
            }
        ];

        // 12a. Insert Comments
        await queryInterface.bulkInsert('Comments', rawCommentsData.map(c => ({
            co_assign_id: c.co_assign_id,
            commenter_role: c.commenter_role,
            message: c.message,
            resolved_status: c.resolved_status,
            ilo_id: c.ilo_id,
            comment_for: c.comment_for,
            createdAt: now,
            updatedAt: now
        })), {});

        // 12b. Fetch inserted comments back to get their generated `comment_id`s
        const insertedComments = await queryInterface.sequelize.query(
            `SELECT comment_id, message FROM Comments WHERE co_assign_id = ${assignId} ORDER BY comment_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // 12c. Map them into the CommentTargets junction table
        const targetInserts = rawCommentsData.map((c, index) => {
            return {
                comment_id: insertedComments[index].comment_id, // Match array sequence
                target_id: c.target_id, // The specific Topic ID or TLA ID
                createdAt: now,
                updatedAt: now
            };
        });

        await queryInterface.bulkInsert('CommentTargets', targetInserts, {});

        console.log(`Successfully mapped 'Statistics' (MATH311L) to RETURNED status with active Industry Consultant feedback loops.`);
    },

    async down(queryInterface, Sequelize) {
        console.warn("For deep LP trees across workflow tables, use npx sequelize-cli db:seed:undo:all to guarantee safe cascading.");
    }
};
