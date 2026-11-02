'use strict';

/**
 * Seeder: Single Course Learning Plan - "Statistics"
 * Status Target: RETURNED (By Industry Consultant)
 * Uses AssignmentWorkflowLogs, Weeks, and week_id-linked Comments & CommentTargets
 *
 * Run: npx sequelize-cli db:seed --seed 20260516000000-seed-returned-lp-statistics.js
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
            `SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ${courseId} ORDER BY pc_offering_id DESC LIMIT 1;`,
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
        // 3.5 ASSIGNMENT WORKFLOW LOGS
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
        // 5. PROGRAM OUTCOME ALIGNMENTS (3 per CO = 12 alignments)
        // ============================================================================
        await queryInterface.bulkInsert('ProgramOutcomeAlignments', [
            { co_id: cos[0].co_id, po_id: 1, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 2, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[0].co_id, po_id: 4, attainment_level: 'E', createdAt: now, updatedAt: now },

            { co_id: cos[1].co_id, po_id: 2, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 3, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[1].co_id, po_id: 6, attainment_level: 'D', createdAt: now, updatedAt: now },

            { co_id: cos[2].co_id, po_id: 4, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 5, attainment_level: 'D', createdAt: now, updatedAt: now },
            { co_id: cos[2].co_id, po_id: 7, attainment_level: 'E', createdAt: now, updatedAt: now },

            { co_id: cos[3].co_id, po_id: 8, attainment_level: 'I', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 9, attainment_level: 'E', createdAt: now, updatedAt: now },
            { co_id: cos[3].co_id, po_id: 10, attainment_level: 'D', createdAt: now, updatedAt: now }
        ], {});

        // ============================================================================
        // 6. INTENDED LEARNING OUTCOMES (4 for CO1 with orientation, 3 each for CO2..CO4 = 13 total)
        // ============================================================================
        const iloData = [
            // CO1 (Prelim Period)
            { co_id: cos[0].co_id, description: "Cite the value and relevance of the University's and the College's VMO as related to the course.", is_orientation: true },
            { co_id: cos[0].co_id, description: 'Compute probabilities using combinatorics, conditional probability, and Bayes theorem.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Differentiate and apply common discrete and continuous distributions (Binomial, Poisson, Normal, Exponential).', assessment_tool: 'Probability Distribution Simulation Lab', is_orientation: false },
            { co_id: cos[0].co_id, description: 'Model sampling distributions and apply the Central Limit Theorem to approximate sampling behavior.', assessment_tool: 'Prelim Monte Carlo & CLT Modeling Report', is_orientation: false },

            // CO2 (Midterm Period)
            { co_id: cos[1].co_id, description: 'Construct point and interval estimates for means and proportions and interpret confidence levels.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Perform hypothesis tests for means, proportions, and variances using t-tests, z-tests, and chi-square tests.', assessment_tool: 'Parametric & Categorical Hypothesis Testing Lab', is_orientation: false },
            { co_id: cos[1].co_id, description: 'Apply ANOVA techniques and nonparametric methods to compare multiple groups and interpret post-hoc analyses.', assessment_tool: 'Midterm Experimental Design & ANOVA Dossier', is_orientation: false },

            // CO3 (Semi-Final Period)
            { co_id: cos[2].co_id, description: 'Fit simple and multiple linear regression models and interpret coefficients, residuals, and diagnostics.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Use logistic regression for binary outcomes and evaluate model performance using ROC-AUC and confusion matrices.', assessment_tool: 'Linear & Logistic Regression Diagnostics Lab', is_orientation: false },
            { co_id: cos[2].co_id, description: 'Apply model selection techniques (AIC, BIC, k-fold cross-validation) and address multicollinearity and interaction terms.', assessment_tool: 'Semifinal Predictive Modeling & Selection Project', is_orientation: false },

            // CO4 (Final Period)
            { co_id: cos[3].co_id, description: 'Perform exploratory data analysis and create publication-quality visualizations using statistical software.', assessment_tool: 'Objective-Type Quiz', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Implement reproducible analysis workflows using R/Python notebooks; document data cleaning and transformation steps.', assessment_tool: 'Reproducible Statistical Computing Notebook', is_orientation: false },
            { co_id: cos[3].co_id, description: 'Conduct a capstone data analysis project applying the full statistical pipeline from question to inference and reporting.', assessment_tool: 'Capstone Statistical Data Analysis Defense', is_orientation: false }
        ];

        await queryInterface.bulkInsert('IntendedLearningOutcomes', iloData.map(i => ({ ...i, createdAt: now, updatedAt: now })), {});

        const ilos = await queryInterface.sequelize.query(
            `SELECT ilo_id, co_id, is_orientation FROM IntendedLearningOutcomes WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY ilo_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        const gradedIlos = ilos.filter(i => !i.is_orientation);

        // ============================================================================
        // 7. WEEKS (4 weeks per CO = 16 Weeks, hours = 5.00 each)
        // ============================================================================
        const weeksToInsert = [];
        for (let cIdx = 0; cIdx < 4; cIdx++) {
            for (let w = 0; w < 4; w++) {
                weeksToInsert.push({
                    co_id: cos[cIdx].co_id,
                    hours: 5.00,
                    createdAt: now,
                    updatedAt: now
                });
            }
        }
        await queryInterface.bulkInsert('Weeks', weeksToInsert, {});

        const weeks = await queryInterface.sequelize.query(
            `SELECT week_id, co_id FROM Weeks WHERE co_id IN (${cos.map(c => c.co_id).join(',')}) ORDER BY week_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        // ============================================================================
        // 8. REFERENCES & WEEKLY REFERENCES (2 per Week = 32 WeeklyReferences)
        // ============================================================================
        const referencesData = [
            { title: 'UNC Student Handbook & SCIS VMO Guidelines', author: 'University of Nueva Caceres', isbn: null, link: 'https://unc.edu.ph/student-handbook', publication_year: new Date('2024-06-01'), type: 'ONLINE' },
            { title: 'Applied Statistics and Probability for Engineers (7th Edition)', author: 'Douglas C. Montgomery & George C. Runger', isbn: '978-1119400363', link: null, publication_year: new Date('2018-01-01'), type: 'TEXTBOOK' },
            { title: 'Mathematical Statistics with Applications (7th Edition)', author: 'Dennis Wackerly, William Mendenhall & Richard L. Scheaffer', isbn: '978-0495110811', link: null, publication_year: new Date('2008-01-01'), type: 'TEXTBOOK' },
            { title: 'Probability and Statistics for Computer Scientists (3rd Edition)', author: 'Michael Baron', isbn: '978-1138044487', link: null, publication_year: new Date('2019-01-01'), type: 'TEXTBOOK' },
            { title: 'An Introduction to Statistical Learning: with Applications in Python/R', author: 'Gareth James, Daniela Witten, Trevor Hastie & Robert Tibshirani', isbn: '978-3031387463', link: null, publication_year: new Date('2023-01-01'), type: 'OER' },
            { title: 'Applied Linear Statistical Models (5th Edition)', author: 'Michael H. Kutner, Christopher J. Nachtsheim, John Neter & William Li', isbn: '978-0073108742', link: null, publication_year: new Date('2005-01-01'), type: 'TEXTBOOK' },
            { title: 'Applied Logistic Regression (3rd Edition)', author: 'David W. Hosmer Jr., Stanley Lemeshow & Rodney X. Sturdivant', isbn: '978-0470582473', link: null, publication_year: new Date('2013-01-01'), type: 'TEXTBOOK' },
            { title: 'R for Data Science: Import, Tidy, Transform, Visualize, and Model Data (2nd Ed)', author: 'Hadley Wickham, Mine Çetinkaya-Rundel & Garrett Grolemund', isbn: '978-1492097402', link: null, publication_year: new Date('2023-01-01'), type: 'OER' },
            { title: 'Python for Data Analysis: Data Wrangling with pandas, NumPy, and Jupyter (3rd Ed)', author: 'Wes McKinney', isbn: '978-1098104030', link: null, publication_year: new Date('2022-01-01'), type: 'TEXTBOOK' },
            { title: 'OpenIntro Statistics (4th Edition)', author: 'David Diez, Mine Çetinkaya-Rundel & Christopher Barr', isbn: null, link: 'https://www.openintro.org/book/os/', publication_year: new Date('2019-01-01'), type: 'OER' },
            { title: 'Seeing Theory: A Visual Introduction to Probability and Statistics', author: 'Brown University (Daniel Kunin et al.)', isbn: null, link: 'https://seeing-theory.brown.edu/', publication_year: new Date('2023-01-01'), type: 'ONLINE' },
            { title: 'SciPy & Statsmodels Official Statistical Computing Documentation', author: 'SciPy & Statsmodels Developers', isbn: null, link: 'https://www.statsmodels.org/stable/index.html', publication_year: new Date('2024-01-01'), type: 'ONLINE' },
            { title: 'Computer Age Statistical Inference: Algorithms, Evidence, and Data Science', author: 'Bradley Efron & Trevor Hastie', isbn: '978-1107149892', link: null, publication_year: new Date('2021-01-01'), type: 'OER' },
            { title: 'Fundamentals of Data Visualization', author: 'Claus O. Wilke', isbn: null, link: 'https://clauswilke.com/dataviz/', publication_year: new Date('2019-01-01'), type: 'OER' },
            { title: 'Quarto & Jupyter Reproducible Scientific Publishing Documentation', author: 'Posit / Project Jupyter', isbn: null, link: 'https://quarto.org/docs/guide/', publication_year: new Date('2024-01-01'), type: 'ONLINE' },
            { title: 'American Statistical Association (ASA) Ethical Guidelines for Statistical Practice', author: 'American Statistical Association', isbn: null, link: 'https://www.amstat.org/your-career/ethical-guidelines-for-statistical-practice', publication_year: new Date('2022-01-01'), type: 'ONLINE' }
        ];

        await queryInterface.bulkInsert('References', referencesData.map(r => ({ ...r, createdAt: now, updatedAt: now })), {});

        const refs = await queryInterface.sequelize.query(
            `SELECT reference_id FROM \`References\` ORDER BY reference_id DESC LIMIT ${referencesData.length};`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        ).then(res => res.reverse());

        const weekRefPairs = [
            [0, 9],   // Week 1
            [1, 3],   // Week 2
            [2, 3],   // Week 3
            [1, 10],  // Week 4
            [1, 9],   // Week 5
            [2, 11],  // Week 6
            [1, 5],   // Week 7
            [11, 12], // Week 8
            [4, 5],   // Week 9
            [5, 11],  // Week 10
            [4, 6],   // Week 11
            [4, 12],  // Week 12
            [7, 13],  // Week 13
            [7, 8],   // Week 14
            [13, 14], // Week 15
            [14, 15]  // Week 16
        ];

        const weeklyReferencesToInsert = [];
        for (let wIdx = 0; wIdx < 16; wIdx++) {
            const [r1, r2] = weekRefPairs[wIdx];
            weeklyReferencesToInsert.push({
                week_id: weeks[wIdx].week_id,
                reference_id: refs[r1].reference_id,
                is_orientation: wIdx === 0,
                createdAt: now,
                updatedAt: now
            });
            weeklyReferencesToInsert.push({
                week_id: weeks[wIdx].week_id,
                reference_id: refs[r2].reference_id,
                is_orientation: false,
                createdAt: now,
                updatedAt: now
            });
        }
        await queryInterface.bulkInsert('WeeklyReferences', weeklyReferencesToInsert, {});

        // ============================================================================
        // 9. TOPICS & SUBTOPICS (2 Topics per Week = 32 Topics; 3 Subtopics per Topic = 96 Subtopics)
        // ============================================================================
        const weeklyCurriculum = [
            // ---------------- CO1: Weeks 1 - 4 ----------------
            {
                weekIdx: 0,
                topics: [
                    {
                        title: 'Course Orientation and VMO Alignment',
                        is_orientation: true,
                        subtopics: [
                            'University of Nueva Caceres and SCIS Vision, Mission, and Core Values',
                            'Course Syllabus, Statistical Computing Requirements, and Grading System',
                            'ASA Ethical Statistical Practice and Responsible AI Usage in Data Analysis'
                        ]
                    },
                    {
                        title: 'Descriptive Statistics, Measurement Scales, and Sampling Paradigms',
                        is_orientation: false,
                        subtopics: [
                            'Populations vs. Samples, Parameter vs. Statistic, and Nominal/Ordinal/Interval/Ratio Scales',
                            'Measures of Central Tendency, Dispersion, Skewness, Kurtosis, and Five-Number Summaries',
                            'Probability Sampling Designs (Simple Random, Stratified, Cluster) and Selection Bias'
                        ]
                    }
                ]
            },
            {
                weekIdx: 1,
                topics: [
                    {
                        title: 'Combinatorics, Sample Spaces, and Kolmogorov Axioms of Probability',
                        subtopics: [
                            'Sample Spaces, Event Algebras, Permutations, Combinations, and Pigeonhole Principle',
                            'Kolmogorov Probability Axioms, Additive Rules, and Birthday/Hashing Collision Probabilities',
                            'Joint, Marginal, and Conditional Probabilities in Network Packet Reliability'
                        ]
                    },
                    {
                        title: 'Conditional Probability, Independence, and Bayes Theorem',
                        subtopics: [
                            'Statistical Independence vs. Mutual Exclusivity in Multi-Component Systems',
                            'Law of Total Probability and Prior-to-Posterior Updating via Bayes Theorem',
                            'Applied Bayesian Classification: Spam Filtering, Intrusion Detection, and Diagnostic Sensitivity/Specificity'
                        ]
                    }
                ]
            },
            {
                weekIdx: 2,
                topics: [
                    {
                        title: 'Discrete Random Variables and Probability Mass Functions',
                        subtopics: [
                            'Probability Mass Functions (PMF), Cumulative Distribution Functions (CDF), Expectation, and Variance',
                            'Bernoulli, Binomial, Geometric, and Negative Binomial Distributions in Quality Control',
                            'Poisson Process and Hypergeometric Distributions for Server Arrival Rates and Defect Sampling'
                        ]
                    },
                    {
                        title: 'Continuous Random Variables and Probability Density Functions',
                        subtopics: [
                            'Probability Density Functions (PDF), Quantiles, and Moment Generating Functions',
                            'Gaussian (Normal) Distribution, Standard Z-Transformation, and Empirical 68-95-99.7 Rule',
                            'Exponential, Gamma, Weibull, and Beta Distributions for Hardware Mean Time To Failure (MTTF)'
                        ]
                    }
                ]
            },
            {
                weekIdx: 3,
                topics: [
                    {
                        title: 'Joint Distributions, Covariance, and Law of Large Numbers',
                        subtopics: [
                            'Bivariate PMFs/PDFs, Marginalization, Covariance, and Pearson Correlation',
                            'Linear Combinations of Independent Random Variables and Variance Propagation',
                            'Markov and Chebyshev Inequalities and the Weak/Strong Law of Large Numbers (LLN)'
                        ]
                    },
                    {
                        title: 'Sampling Distributions and the Central Limit Theorem (CLT)',
                        subtopics: [
                            'Sampling Distribution of the Sample Mean and Sample Proportion (Standard Error)',
                            'Central Limit Theorem (CLT) Convergence and Continuity Correction for Discrete Approximations',
                            'Exact Chi-Square, Student\'s t, and Fisher\'s F Sampling Distributions from Normal Populations'
                        ]
                    }
                ]
            },

            // ---------------- CO2: Weeks 5 - 8 ----------------
            {
                weekIdx: 4,
                topics: [
                    {
                        title: 'Point Estimation Theory and Estimator Optimality Criteria',
                        subtopics: [
                            'Method of Moments (MoM) and Maximum Likelihood Estimation (MLE) Log-Likelihood Maximization',
                            'Unbiasedness, Bias-Variance Trade-Off, Mean Squared Error (MSE), and Consistency',
                            'Sufficient Statistics, Fisher Information, and the Cramér-Rao Lower Bound'
                        ]
                    },
                    {
                        title: 'Parametric Confidence Intervals and Sample Size Determination',
                        subtopics: [
                            'Constructing Two-Sided and One-Sided Confidence Intervals for Population Means (Z and t)',
                            'Confidence Intervals for Population Proportions (Wald vs. Wilson Score) and Variance (Chi-Square)',
                            'Margin of Error Bounds, Precision Targets, and A-Priori Sample Size Calculation'
                        ]
                    }
                ]
            },
            {
                weekIdx: 5,
                topics: [
                    {
                        title: 'Foundations of Null Hypothesis Significance Testing (NHST)',
                        subtopics: [
                            'Formulating Null ($H_0$) and Alternative ($H_1$) Hypotheses, Test Statistics, and Rejection Regions',
                            'Type I Error ($\alpha$), Type II Error ($\beta$), Statistical Power ($1-\beta$), and Effect Size (Cohen\'s d)',
                            'Interpreting p-Values, Confidence Interval Duality, and Multiple Testing Corrections (Bonferroni, Benjamini-Hochberg FDR)'
                        ]
                    },
                    {
                        title: 'One-Sample and Two-Sample Parametric Hypothesis Tests',
                        subtopics: [
                            'One-Sample Z-Test and Student\'s t-Test for Population Means and Proportions',
                            'Independent Two-Sample Welch\'s vs. Pooled t-Tests and Paired-Samples t-Test for A/B Experiments',
                            'F-Test and Levene\'s Test for Equality of Population Variances (Homoscedasticity)'
                        ]
                    }
                ]
            },
            {
                weekIdx: 6,
                topics: [
                    {
                        title: 'Categorical Data Analysis and Chi-Square Tests',
                        subtopics: [
                            'Pearson\'s Chi-Square Goodness-of-Fit Test Against Theoretical Distributions',
                            'Contingency Tables, Chi-Square Test of Independence, and Yates Continuity Correction',
                            'Fisher\'s Exact Test for Small Samples, Odds Ratios, and Cramér\'s V Association Strength'
                        ]
                    },
                    {
                        title: 'One-Way and Two-Way Analysis of Variance (ANOVA)',
                        subtopics: [
                            'Partitioning Total Sum of Squares ($SST = SSB + SSW$) and the ANOVA F-Ratio',
                            'Post-Hoc Multiple Comparisons: Tukey\'s HSD, Scheffé, and Dunnett\'s Procedures',
                            'Two-Way Factorial ANOVA, Main Effects, and Interaction Plots in Experimental Design'
                        ]
                    }
                ]
            },
            {
                weekIdx: 7,
                topics: [
                    {
                        title: 'Nonparametric Inference and Rank-Based Methods',
                        subtopics: [
                            'When Parametric Assumptions Fail: Heavy Tails, Outliers, and Ordinal Scales',
                            'Wilcoxon Signed-Rank Test and Mann-Whitney U (Wilcoxon Rank-Sum) Test',
                            'Kruskal-Wallis One-Way ANOVA by Ranks, Friedman Test, and Spearman\'s Rank Correlation ($\rho$)'
                        ]
                    },
                    {
                        title: 'Resampling Inference: Bootstrap and Permutation Tests',
                        subtopics: [
                            'Nonparametric Bootstrap Resampling with Replacement for Standard Errors',
                            'Percentile and Bias-Corrected Accelerated (BCa) Bootstrap Confidence Intervals',
                            'Exact and Monte Carlo Permutation Tests for Two-Group Exchangeability'
                        ]
                    }
                ]
            },

            // ---------------- CO3: Weeks 9 - 12 ----------------
            {
                weekIdx: 8,
                topics: [
                    {
                        title: 'Simple Linear Regression and Ordinary Least Squares (OLS)',
                        subtopics: [
                            'Simple Linear Regression Model, Gauss-Markov Theorem, and OLS Normal Equations',
                            'Standard Error of Estimate, t-Tests for Slope ($\beta_1$) and Intercept ($\beta_0$), and ANOVA for Regression',
                            'Coefficient of Determination ($R^2$), Confidence Bands for Mean Response, and Prediction Intervals'
                        ]
                    },
                    {
                        title: 'Multiple Linear Regression and Matrix Formulation',
                        subtopics: [
                            'Matrix Representation of Multiple Regression ($\hat{\beta} = (X^TX)^{-1}X^Ty$) and Partial Slopes',
                            'Adjusted $R^2$, Overall F-Test vs. Individual t-Tests, and Partial F-Tests for Nested Models',
                            'Encoding Qualitative Predictors (Dummy/One-Hot Variables, Reference Levels) and Interaction Terms'
                        ]
                    }
                ]
            },
            {
                weekIdx: 9,
                topics: [
                    {
                        title: 'Regression Diagnostics, Residual Analysis, and Influence',
                        subtopics: [
                            'Checking LINE Assumptions: Linearity, Independence (Durbin-Watson), Normality (Shapiro-Wilk/Q-Q), Equal Variance (Breusch-Pagan)',
                            'Studentized Residuals, Hat Matrix Leverage ($h_{ii}$), DFFITS, and Cook\'s Distance Influence Diagnostics',
                            'Variance Inflation Factor (VIF) for Multicollinearity and Box-Cox / Log Variance-Stabilizing Transformations'
                        ]
                    },
                    {
                        title: 'Polynomial Regression, Splines, and Robust Regression',
                        subtopics: [
                            'Polynomial Terms, Orthogonal Polynomials, and Overfitting Risks at Boundary Regions',
                            'Piecewise Polynomials and Natural Cubic Regression Splines',
                            'Heteroscedasticity-Consistent (HC/White) Standard Errors and Huber M-Estimation Robust Regression'
                        ]
                    }
                ]
            },
            {
                weekIdx: 10,
                topics: [
                    {
                        title: 'Generalized Linear Models (GLMs) and Binary Logistic Regression',
                        subtopics: [
                            'Exponential Family, Link Functions, Log-Odds (Logit) Transformation, and Sigmoid Probability Curve',
                            'Maximum Likelihood Estimation via Iteratively Reweighted Least Squares (IRLS) and Odds Ratio ($e^{\beta}$) Interpretation',
                            'Wald z-Tests, Likelihood Ratio Deviance Tests, Pseudo-$R^2$ (McFadden), and Hosmer-Lemeshow Goodness-of-Fit'
                        ]
                    },
                    {
                        title: 'Classification Evaluation, ROC-AUC, and Poisson Regression',
                        subtopics: [
                            'Confusion Matrices, Sensitivity (Recall), Specificity, Precision, F1-Score, and Threshold Tuning',
                            'Receiver Operating Characteristic (ROC) Curves, Area Under the Curve (AUC), and Precision-Recall Curves',
                            'Multinomial Logistic Regression and Poisson/Negative Binomial Log-Linear Regression for Count Data'
                        ]
                    }
                ]
            },
            {
                weekIdx: 11,
                topics: [
                    {
                        title: 'Model Selection Criteria and Cross-Validation Protocols',
                        subtopics: [
                            'Information Criteria Penalties: Akaike Information Criterion (AIC), Corrected AICc, and Bayesian Information Criterion (BIC)',
                            'Subset Selection Algorithms (Best Subset, Forward/Backward Stepwise) and Data Dredging Pitfalls',
                            'Holdout Validation, k-Fold Cross-Validation, Stratified k-Fold, and Leave-One-Out Cross-Validation (LOOCV)'
                        ]
                    },
                    {
                        title: 'Penalized Regression Regularization: Ridge, Lasso, and Elastic Net',
                        subtopics: [
                            'Bias-Variance Trade-Off in High-Dimensional Feature Spaces ($p \approx n$)',
                            'L2 Tikhonov Regularization (Ridge Regression) for Correlated Predictors and Shrinkage Paths',
                            'L1 Regularization (Lasso) for Sparse Feature Selection and Elastic Net Hyperparameter Tuning via Cross-Validation'
                        ]
                    }
                ]
            },

            // ---------------- CO4: Weeks 13 - 16 ----------------
            {
                weekIdx: 12,
                topics: [
                    {
                        title: 'Exploratory Data Analysis (EDA) and Tidy Data Wrangling',
                        subtopics: [
                            'Hadley Wickham\'s Tidy Data Principles: Pivoting, Joining, Grouping, and Window Aggregations',
                            'Missing Data Mechanisms (MCAR, MAR, MNAR) and Multiple Imputation (MICE / k-NN)',
                            'Outlier Detection (IQR Fences, Mahalanobis Distance) and Feature Scaling/Standardization'
                        ]
                    },
                    {
                        title: 'Grammar of Graphics and Publication-Quality Statistical Visualization',
                        subtopics: [
                            'Layered Grammar of Graphics (`ggplot2` / `seaborn` / `plotnine`): Aesthetics, Geoms, Facets, and Scales',
                            'Visualizing Distributions and Uncertainty: Violin/Raincloud Plots, Error Bars, and Empirical CDFs',
                            'Multivariate Visualization: Pair Plots, Correlation Heatmaps, Parallel Coordinates, and Colorblind-Safe Palettes (Viridis)'
                        ]
                    }
                ]
            },
            {
                weekIdx: 13,
                topics: [
                    {
                        title: 'Statistical Computing Workflows in R and Python',
                        subtopics: [
                            'R Statistical Ecosystem (`tidyverse`, `broom`, `car`, `emmeans`) and Formula Interface (`y ~ x1 * x2`)',
                            'Python Statistical Stack (`numpy`, `scipy.stats`, `pandas`, `statsmodels`, `pingouin`, `scikit-learn`)',
                            'Environment Reproducibility and Dependency Locking (`renv` in R, `conda`/`uv`/`poetry` in Python)'
                        ]
                    },
                    {
                        title: 'Multivariate Exploration and Time-Series Fundamentals',
                        subtopics: [
                            'Principal Component Analysis (PCA): Eigenvalue Decomposition, Scree Plots, and Biplot Loadings',
                            'Time-Series Decomposition (Trend, Seasonality, Remainder), Stationarity (ADF Test), and Autocorrelation (ACF/PACF)',
                            'Exponential Smoothing (Holt-Winters) and Autoregressive Integrated Moving Average (ARIMA) Forecasting'
                        ]
                    }
                ]
            },
            {
                weekIdx: 14,
                topics: [
                    {
                        title: 'Reproducible Research, Literate Programming, and Statistical Ethics',
                        subtopics: [
                            'Literate Programming with Quarto and Jupyter Notebooks: Interleaving Code, LaTeX Equations, and Narrative',
                            'Preventing p-Hacking, HARKing (Hypothesizing After Results are Known), and Publication Bias',
                            'Simpson\'s Paradox, Confounding Variables, Collider Bias, and Observational vs. Causal Claims'
                        ]
                    },
                    {
                        title: 'Communicating Statistical Uncertainty to Technical and Executive Audiences',
                        subtopics: [
                            'Translating Statistical Significance ($p < \alpha$) vs. Practical/Clinical/Business Effect Size',
                            'Formatting APA/IEEE Statistical Tables, Confidence Intervals, and Model Diagnostic Appendices',
                            'Structuring Reproducible Data Pipelines from Raw Data Provenance to Final Rendered Report'
                        ]
                    }
                ]
            },
            {
                weekIdx: 15,
                topics: [
                    {
                        title: 'End-to-End Capstone Statistical Pipeline Synthesis',
                        subtopics: [
                            'Formulating Testable Research Hypotheses and Pre-Analysis Plans on Real-World Computing Datasets',
                            'Executing the Full Pipeline: EDA, Assumption Checks, Parametric/Nonparametric Inference, and Regression Modeling',
                            'Sensitivity Analysis, Bootstrap Robustness Checks, and Peer Code/Reproducibility Audit'
                        ]
                    },
                    {
                        title: 'Capstone Statistical Data Analysis Presentation and Defense',
                        subtopics: [
                            'Oral Presentation of Empirical Findings, Effect Sizes, and Uncertainty Visualizations',
                            'Live Execution Walkthrough of the Reproducible R/Python Quarto Notebook',
                            'Defense of Model Assumptions, Diagnostic Remedies, Limitations, and Ethical Considerations'
                        ]
                    }
                ]
            }
        ];

        for (const weekBlock of weeklyCurriculum) {
            const targetWeekId = weeks[weekBlock.weekIdx].week_id;
            for (const topicObj of weekBlock.topics) {
                await queryInterface.bulkInsert('Topics', [{
                    title: topicObj.title,
                    createdAt: now,
                    updatedAt: now
                }], {});

                const insertedTopic = await queryInterface.sequelize.query(
                    `SELECT topic_id FROM Topics ORDER BY topic_id DESC LIMIT 1;`,
                    { type: queryInterface.sequelize.QueryTypes.SELECT }
                );
                const topicId = insertedTopic[0].topic_id;

                const subRows = topicObj.subtopics.map((subTitle, idx) => ({
                    week_id: targetWeekId,
                    topic_id: topicId,
                    title: subTitle,
                    sequence_order: idx + 1,
                    is_orientation: Boolean(topicObj.is_orientation),
                    createdAt: now,
                    updatedAt: now
                }));
                await queryInterface.bulkInsert('Subtopics', subRows, {});
            }
        }

        // ============================================================================
        // 10. TEACHING AND LEARNING ACTIVITIES (6 per Week = 96 TLAs)
        //     & 11. TLA ASSESSMENTS (3 per Week = 48 Assessments; 3 per CO linked to gradedIlos)
        // ============================================================================
        const weeklyTlasData = [
            // ---------------- WEEK 1 (CO1) ----------------
            {
                weekIdx: 0, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: true, name: 'UNC VMO & ASA Ethical Guidelines Reading', desc: 'Read the UNC Student Handbook, SCIS VMO statement, and American Statistical Association ethical guidelines.' },
                    { phase: 'preclass', by: 'S', lab: false, is_orientation: false, name: 'OpenIntro Chapter 1 Data Collection Study', desc: 'Read OpenIntro Statistics Chapter 1 on observational studies vs. randomized experiments and sampling bias.' },
                    { phase: 'inclass', by: 'T', lab: false, is_orientation: true, name: 'Course Orientation & Statistical Computing Briefing', desc: 'Interactive lecture covering syllabus outcomes, grading weights, R/Python notebook policies, and VMO alignment.' },
                    { phase: 'inclass', by: 'S', lab: true, is_orientation: false, name: 'Descriptive Summary & Sampling Bias Workshop', desc: 'Workshop computing robust vs. non-robust summary statistics (median/IQR vs. mean/SD) on skewed network latency logs.' },
                    { phase: 'postclass', by: 'S', lab: true, is_orientation: true, name: 'VMO & Statistical Integrity Commitment Note', desc: 'Submit a reflective commitment statement on honest data reporting, anti-p-hacking, and UNC core values.' },
                    { phase: 'postclass', by: 'S', lab: false, is_orientation: false, name: 'Survivorship & Selection Bias Case Critique', desc: 'Analyze three real-world technology case studies where sampling bias invalidated product analytics.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'VMO & Course Policy Check', desc: 'Formative check verifying comprehension of syllabus policies and statistical ethics.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Descriptive Statistics Worksheet', desc: 'In-class evaluation of five-number summaries, skewness, and measurement scale classifications.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Statistical Integrity Reflection Rubric', desc: 'Formative evaluation of the VMO and ethical statistics reflection.' }
                ]
            },
            // ---------------- WEEK 2 (CO1 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 1, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Baron Probability Axioms & Bayes Theorem Study', desc: 'Read Michael Baron\'s chapters on combinatorics, conditional probability, Law of Total Probability, and Bayes theorem.' },
                    { phase: 'preclass', by: 'S', lab: false, name: 'Combinatorics & Hashing Collision Problem Set', desc: 'Solve pre-class counting exercises on cryptographic hash collisions (Birthday Paradox) and password entropy.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Conditional Probability, Hashing Collisions & Bayes Seminar', desc: 'Analytical lecture deriving collision bounds, system reliability series/parallel networks, and Bayesian spam/intrusion updating.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Bayesian Intrusion & Spam Filter Simulation Lab', desc: 'Hands-on R/Python workshop implementing a Naive Bayes probability calculator and simulating false-positive base-rate fallacies.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Monte Carlo Birthday Paradox & Reliability Script', desc: 'Write a reproducible Python/R simulation empirically verifying analytical hash-collision and network-uptime probabilities.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Base-Rate Fallacy in Medical & Security Alerts Brief', desc: 'Explain why a 99% accurate security anomaly detector still yields high false-positive rates when attack prevalence is 0.01%.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 0, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Prelim quiz covering combinatorics, conditional probability, Bayes theorem, and discrete/continuous distributions.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Bayes Posterior & Reliability Lab Check', desc: 'Practical check of conditional probability tree and Bayesian posterior calculations.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Monte Carlo Collision Verification Rubric', desc: 'Formative check comparing empirical simulation frequencies against theoretical formulas.' }
                ]
            },
            // ---------------- WEEK 3 (CO1 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 2, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Montgomery Discrete & Continuous Distributions Study', desc: 'Study Binomial, Poisson, Geometric, Normal, Exponential, and Weibull distributions and their PMFs/PDFs.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Seeing Theory Interactive Distribution Exploration', desc: 'Explore parameter changes ($\lambda, n, p, \mu, \sigma$) on Brown University\'s Seeing Theory visual platform.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Stochastic Distributions for Traffic & Reliability Lecture', desc: 'Lecture modeling HTTP request arrivals via Poisson processes and server disk lifetimes via Exponential/Weibull distributions.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Probability Distribution Simulation Lab', desc: 'Supervised computational lab fitting Binomial, Poisson, Normal, and Exponential models to server request and hardware failure logs in R/Python.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Q-Q Plot & Distribution Goodness Visual Dossier', desc: 'Generate theoretical vs. empirical CDF overlays and Normal/Weibull Q-Q plots for three real-world computing datasets.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Memoryless Property of Exponential/Geometric Proof Note', desc: 'Derive the memoryless property of the Exponential distribution and explain its implications for Poisson inter-arrival times.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 1, weight: '30', name: 'Probability Distribution Simulation Lab', desc: 'Summative Prelim laboratory assessment grading reproducible R/Python simulation and fitting of discrete and continuous distributions.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Poisson & Normal Quantile Spot-Check', desc: 'In-class calculation of tail probabilities and quantiles using `scipy.stats` / R `pnorm`/`ppois`.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Empirical CDF & Q-Q Plot Audit', desc: 'Formative verification of visual distribution fit diagnostics.' }
                ]
            },
            // ---------------- WEEK 4 (CO1 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 3, period: 'p',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Wackerly Sampling Distributions & CLT Study', desc: 'Read chapters on joint distributions, covariance, Law of Large Numbers, and the Central Limit Theorem.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Non-Normal Population Sampling Script Prep', desc: 'Write a starter script drawing repeated samples of size $n \in \{5, 15, 30, 100\}$ from heavily skewed Pareto and Bimodal populations.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Law of Large Numbers, CLT & Exact Sampling Distributions Seminar', desc: 'Walkthrough of standard error scaling ($1/\sqrt{n}$), CLT convergence rates under heavy skewness, and $\chi^2, t, F$ derivations.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Prelim Monte Carlo & CLT Modeling Studio', desc: 'Studio session executing 10,000-trial Monte Carlo simulations demonstrating CLT convergence and variance propagation for SLA metrics.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Prelim Monte Carlo & CLT Modeling Report Submission', desc: 'Submit the formal Prelim report with reproducible simulation scripts, density convergence panels, and Shapiro-Wilk normality checks.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'When the CLT Fails: Cauchy & Infinite-Variance Brief', desc: 'Demonstrate why heavy-tailed distributions with undefined variance (Cauchy/Pareto $\alpha \le 2$) violate standard CLT assumptions.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 2, weight: '50', name: 'Prelim Monte Carlo & CLT Modeling Report', desc: 'Major Prelim project evaluating Monte Carlo sampling distribution simulations, Central Limit Theorem analysis, and reproducible code.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Standard Error & Variance Propagation Check', desc: 'In-class check of linear combination variance formulas ($Var(aX + bY)$).' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'CLT Sample Size Convergence Rubric', desc: 'Formative evaluation of skewness decay across increasing sample sizes.' }
                ]
            },

            // ---------------- WEEK 5 (CO2 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 4, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Point Estimation (MLE/MoM) & Confidence Intervals Study', desc: 'Read Wackerly & Montgomery chapters on Maximum Likelihood Estimation, bias-variance trade-off, and confidence intervals.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Log-Likelihood Numerical Optimization Exercise', desc: 'Derive analytical MLEs for Poisson and Exponential parameters and verify them numerically using `scipy.optimize` / R `optim`.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'MLE Optimality, Confidence Intervals & Sample Size Lecture', desc: 'In-depth lecture on Cramér-Rao efficiency, frequentist CI coverage interpretation, Wilson score intervals, and sample size planning.' },
                    { phase: 'inclass', by: 'S', lab: true, name: '95% Confidence Interval Coverage Simulation Lab', desc: 'Hands-on laboratory simulating 1,000 confidence intervals to visualize the 95% capture rate and comparing Student-t vs. Z intervals.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'A/B Test Sample Size & Margin of Error Calculator', desc: 'Build a reusable function computing required sample sizes for target margins of error in conversion rate and latency estimation.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Common Confidence Interval Misconceptions Critique', desc: 'Refute the common fallacy that a computed 95% CI has a 95% probability of containing the fixed population parameter.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 3, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Midterm quiz covering MLE/MoM estimation, confidence intervals, hypothesis testing errors/power, ANOVA, and rank tests.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'MLE & CI Coverage Simulation Check', desc: 'Practical check of empirical coverage rates for Wald vs. Wilson proportion intervals.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Sample Size Determination Audit', desc: 'Formative check of margin-of-error algebra and finite population corrections.' }
                ]
            },
            // ---------------- WEEK 6 (CO2 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 5, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Hypothesis Testing, Power & Multiple Testing Study', desc: 'Study Type I/II errors, statistical power curves, Cohen\'s $d$, Welch\'s t-test, and Bonferroni/Benjamini-Hochberg FDR corrections.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Power Curve & Minimum Detectable Effect Prep', desc: 'Plot statistical power ($1-\beta$) as a function of sample size $n$ and effect size $d$ using `statsmodels.stats.power` / R `pwr`.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Parametric Hypothesis Testing, Effect Size & FDR Seminar', desc: 'Instruction on one/two-sample t-tests, paired t-tests, variance F-tests, and controlling False Discovery Rate across multiple comparisons.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Parametric & Categorical Hypothesis Testing Practicum', desc: 'Supervised practicum executing Welch\'s t-tests, paired t-tests, Chi-Square independence tests, and Benjamini-Hochberg p-value adjustments.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'UI/UX A/B Experiment Inference & Power Report', desc: 'Analyze a multi-metric web A/B experiment dataset, reporting test statistics, p-values, Cohen\'s $d$, 95% CIs, and FDR-adjusted conclusions.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Statistical Significance vs. Practical Importance Essay', desc: 'Analyze how huge sample sizes ($n = 10^6$) produce tiny p-values for trivial effect sizes, and how confidence intervals clarify impact.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 4, weight: '30', name: 'Parametric & Categorical Hypothesis Testing Lab', desc: 'Summative Midterm laboratory assessment grading t-tests, Chi-Square contingency analysis, power calculations, and multiple-testing corrections.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Welch vs. Pooled t-Test & FDR Spot-Check', desc: 'In-class diagnostic checking Levene homoscedasticity tests and Benjamini-Hochberg q-values.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'A/B Test Power & Effect Size Rubric', desc: 'Formative review of complete inferential reporting (statistic, df, p, effect size, CI).' }
                ]
            },
            // ---------------- WEEK 7 (CO2) ----------------
            {
                weekIdx: 6, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Kutner One-Way & Two-Way Factorial ANOVA Study', desc: 'Read chapters on ANOVA sum-of-squares partitioning, F-tests, Tukey HSD post-hoc comparisons, and factorial interaction effects.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Multi-Group Algorithm Benchmark Dataset Prep', desc: 'Load benchmark execution times across 4 sorting algorithms and 3 dataset sizes for factorial ANOVA modeling.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'One-Way/Two-Way ANOVA & Post-Hoc Contrasts Lecture', desc: 'Walkthrough of $SSB/SSW$ degrees of freedom, omnibus F-tests, Tukey\'s Honestly Significant Difference, and interaction plots.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Factorial ANOVA & Tukey Post-Hoc Laboratory', desc: 'Hands-on laboratory fitting One-Way and Two-Way ANOVA models, checking residual normality/homoscedasticity, and plotting interaction effects.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Tukey HSD Pairwise Comparison & Eta-Squared ($\eta^2$) Brief', desc: 'Compute omega-squared ($\omega^2$) / eta-squared ($\eta^2$) effect sizes and visualize family-wise 95% Tukey confidence intervals.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Main Effects in the Presence of Crossover Interaction Note', desc: 'Explain why marginal main effects can be misleading when a strong crossover interaction exists in a $2 \times 2$ factorial design.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'ANOVA Table & Tukey HSD Lab Rubric', desc: 'Formative laboratory check of ANOVA sum-of-squares decomposition, interaction plots, and post-hoc pairwise family-wise error control.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'ANOVA Residual Homoscedasticity Check', desc: 'In-class verification of Levene/Bartlett tests and residual Q-Q diagnostics.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Factorial Interaction Interpretation Check', desc: 'Verification of accurate main-effect vs. simple-effect conclusions.' }
                ]
            },
            // ---------------- WEEK 8 (CO2 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 7, period: 'm',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Efron & Hastie Nonparametric & Bootstrap Resampling Study', desc: 'Study Mann-Whitney U, Wilcoxon Signed-Rank, Kruskal-Wallis, permutation tests, and BCa bootstrap confidence intervals.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Midterm Experimental Design & ANOVA Dossier Prep', desc: 'Assemble parametric ANOVA, Kruskal-Wallis rank alternatives, and bootstrap resampling scripts for the Midterm dossier.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Nonparametric Rank Tests & Bootstrap Resampling Seminar', desc: 'Demonstration of rank-based inference when normality fails, Dunn\'s post-hoc test, exact permutation tests, and 10,000-replicate bootstrapping.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Midterm Experimental Design & ANOVA Defense Studio', desc: 'Formal Midterm studio where students present their experimental comparison of multi-group computing systems using parametric, rank, and bootstrap methods.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Finalized Midterm Inferential Statistics Dossier', desc: 'Submit the complete Midterm report comparing parametric ANOVA against Kruskal-Wallis and bootstrap CIs on skewed response data.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Asymptotic Relative Efficiency (ARE) of Rank Tests Brief', desc: 'Compare the statistical power of the Mann-Whitney U test against Student\'s t-test under Gaussian vs. heavy-tailed distributions.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 5, weight: '50', name: 'Midterm Experimental Design & ANOVA Dossier', desc: 'Major Midterm project assessment evaluating multi-group experimental inference using ANOVA, post-hoc tests, nonparametric ranks, and bootstrapping.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Kruskal-Wallis & Mann-Whitney Rank Check', desc: 'In-class verification of rank tie-corrections and Dunn post-hoc adjustments.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Bootstrap Percentile & BCa Interval Audit', desc: 'Formative check of resampling reproducibility (`set.seed` / `np.random.default_rng`).' }
                ]
            },

            // ---------------- WEEK 9 (CO3 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 8, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'ISLP Chapter 3 Linear Regression & Gauss-Markov Study', desc: 'Read An Introduction to Statistical Learning (Chapter 3) on simple/multiple OLS regression, matrix formulation, and categorical dummy coding.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'OLS Normal Equations Matrix Implementation', desc: 'Implement $\hat{\beta} = (X^TX)^{-1}X^Ty$ and its covariance matrix $\hat{\sigma}^2(X^TX)^{-1}$ from scratch in NumPy/R and verify against `lm()`/`OLS()`.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Simple & Multiple Linear Regression Modeling Lecture', desc: 'In-depth lecture on OLS estimation, partial slope interpretation (ceteris paribus), $R^2$ vs. Adjusted $R^2$, dummy variables, and interaction terms.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Multiple Regression & Interaction Modeling Lab', desc: 'Hands-on laboratory fitting multiple regression models with categorical main effects and continuous-by-categorical interactions.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Confidence Band vs. Prediction Interval Visualization', desc: 'Plot 95% confidence bands for $E[Y|X]$ alongside wider 95% prediction intervals for individual new observations $\hat{y}_{new}$.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Dummy Variable Trap & Reference Category Interpretation Note', desc: 'Explain why including $k$ indicator columns alongside an intercept produces perfect collinearity ($X^TX$ singular).' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 6, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Semifinal quiz covering OLS multiple regression, residual diagnostics,VIF, logistic regression odds ratios, ROC-AUC, and AIC/BIC.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Matrix OLS & Partial F-Test Lab Check', desc: 'Practical check of nested model ANOVA comparisons and interaction slope interpretation.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Confidence vs. Prediction Interval Rubric', desc: 'Formative evaluation of uncertainty band calculations and visual clarity.' }
                ]
            },
            // ---------------- WEEK 10 (CO3 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 9, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Kutner Regression Diagnostics, VIF & Cook\'s Distance Study', desc: 'Study studentized residuals, Breusch-Pagan heteroscedasticity tests, Durbin-Watson autocorrelation, VIF, and Cook\'s distance.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Anscombe\'s Quartet & Influential Outlier Exploration', desc: 'Fit OLS regressions to Anscombe\'s Quartet and Datasaurus Dozen to observe identical $R^2$/p-values with drastically different structures.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Regression Diagnostics, Multicollinearity & Remediation Seminar', desc: 'Walkthrough of the 4-panel residual diagnostic suite, leverage vs. Cook\'s distance ($D_i > 4/n$), VIF > 5 thresholds, Box-Cox transforms, and White HC3 standard errors.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Linear & Logistic Regression Diagnostics Practicum', desc: 'Supervised practicum auditing violated regression assumptions (heteroscedasticity, high Cook\'s distance, multicollinearity) and applying Box-Cox/robust remedies.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Diagnostic Remediation Before-and-After Dossier', desc: 'Document a complete diagnostic remediation workflow showing residual plots, Breusch-Pagan/Shapiro-Wilk p-values, and VIF tables before and after transformation.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'High Leverage vs. High Influence Distinction Brief', desc: 'Contrast an extreme $X$-outlier that lies on the regression line (high leverage, low Cook\'s D) against one that pulls the slope (high Cook\'s D).' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 7, weight: '30', name: 'Linear & Logistic Regression Diagnostics Lab', desc: 'Summative Semifinal laboratory assessment grading residual diagnostics, Cook\'s distance influence analysis, VIF multicollinearity remediation, and GLM evaluation.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Breusch-Pagan, VIF & Cook\'s D Spot-Check', desc: 'In-class diagnostic identifying influential points and variance inflation in a housing/cloud-cost dataset.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Box-Cox & HC3 Robust Error Verification', desc: 'Formative check of variance stabilization and heteroscedasticity-consistent inference.' }
                ]
            },
            // ---------------- WEEK 11 (CO3) ----------------
            {
                weekIdx: 10, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Hosmer & Lemeshow Applied Logistic Regression Study', desc: 'Read chapters on the logit link function, IRLS maximum likelihood estimation, odds ratios ($e^{\beta}$), ROC-AUC, and Poisson count regression.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Customer Churn & Intrusion Binary Dataset Prep', desc: 'Clean and inspect a binary customer churn / network intrusion dataset with class imbalance.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Logistic Regression, Odds Ratios & ROC-AUC Evaluation Lecture', desc: 'Instruction on log-odds vs. probability marginal effects, likelihood ratio deviance tests, confusion matrix threshold tuning, and ROC/Precision-Recall curves.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Binary Logistic & Poisson Count Regression Lab', desc: 'Hands-on laboratory fitting binary logistic and Poisson/Negative Binomial GLMs, computing 95% profile-likelihood CIs for odds ratios, and plotting ROC curves.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Cost-Sensitive Classification Threshold Optimization', desc: 'Determine the optimal probability cutoff $p^*$ minimizing expected business cost when false negatives cost $10\times$ more than false positives.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Why OLS Linear Probability Models Fail for Binary Outcomes', desc: 'Demonstrate how linear regression on binary $Y \in \{0,1\}$ produces predicted probabilities outside $[0,1]$ and inherent heteroscedasticity.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Odds Ratio & ROC-AUC Lab Rubric', desc: 'Formative laboratory check of exponentiated coefficient interpretation ($e^{\beta}$), deviance tests, and AUC calculation.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Overdispersion in Poisson vs. Negative Binomial Check', desc: 'In-class check comparing residual deviance to degrees of freedom in count data.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Precision-Recall vs. ROC under Imbalance Audit', desc: 'Verification of threshold selection under severe class imbalance.' }
                ]
            },
            // ---------------- WEEK 12 (CO3 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 11, period: 's',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'ISLP Chapter 6 Model Selection & Regularization Study', desc: 'Study AIC/BIC information criteria, k-fold cross-validation, and Ridge (L2), Lasso (L1), and Elastic Net penalized regression.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Semifinal Predictive Modeling Pipeline Prep', desc: 'Set up a 10-fold cross-validation pipeline comparing OLS, Stepwise AIC/BIC, Ridge, Lasso, and Logistic models.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Cross-Validation, AIC/BIC & Penalized Regression Seminar', desc: 'Live demonstration of out-of-sample RMSE/log-loss estimation via k-fold CV, preventing data leakage inside CV folds, and Lasso coefficient shrinkage paths.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Semifinal Predictive Modeling & Selection Defense', desc: 'Formal Semifinal studio defense where students present and justify their final selected regression models using AIC/BIC, CV error, and diagnostic validity.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Finalized Semifinal Regression & Regularization Report', desc: 'Submit the comprehensive Semifinal modeling report comparing unpenalized MLE/OLS against cross-validated Ridge/Lasso models.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Stepwise p-Value Inflation & Data Leakage Critique', desc: 'Explain why running feature selection before splitting into cross-validation folds invalidates out-of-sample error estimates.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 8, weight: '50', name: 'Semifinal Predictive Modeling & Selection Project', desc: 'Major Semifinal project evaluating end-to-end linear/logistic regression modeling, diagnostics, AIC/BIC selection, and k-fold cross-validation.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Zero-Leakage Cross-Validation Pipeline Check', desc: 'In-class check confirming standardization and imputation occur strictly inside each training fold.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Lasso Sparsity & Lambda Tuning Audit', desc: 'Formative check of $\lambda_{min}$ vs. $\lambda_{1se}$ parsimony selection.' }
                ]
            },

            // ---------------- WEEK 13 (CO4 - Graded ILO 1: weight 20) ----------------
            {
                weekIdx: 12, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Wickham R for Data Science & Wilke Data Visualization Study', desc: 'Read chapters on Tidy Data relational transformations, missing data mechanisms (MCAR/MAR/MNAR), and Claus Wilke\'s Fundamentals of Data Visualization.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Messy Real-World Telemetry Dataset Inspection', desc: 'Inspect a raw multi-table dataset containing inconsistent date formats, structural missingness, and extreme sensor spikes.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Tidy Data Wrangling, Imputation & Grammar of Graphics Lecture', desc: 'Lecture on relational joins, pivoting, diagnosing MAR vs. MCAR missingness, MICE imputation, and designing truthful multi-dimensional statistical plots.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'EDA, Missing Data Imputation & Publication Visualization Lab', desc: 'Hands-on laboratory cleaning messy datasets and crafting raincloud plots, faceted regression panels, and Viridis heatmaps in `ggplot2`/`seaborn`.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Visual Redesign of Misleading Charts Portfolio', desc: 'Critique and re-code three truncated or perceptually distorted industry charts into publication-grade statistical graphics showing uncertainty.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Why Bar Charts of Means Hide Distribution Shape ("Barbarplots")', desc: 'Demonstrate why replacing bar charts of means with boxplots, violin plots, or raincloud plots prevents masking bimodality and sample size differences.' }
                ],
                assessments: [
                    { tlaIdx: 2, iloIdx: 9, weight: '20', name: 'Objective-Type Quiz', desc: 'Summative Final quiz covering Tidy Data EDA, missing data mechanisms, Grammar of Graphics, PCA/time-series, and reproducible research ethics.' },
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Tidy Wrangling & Raincloud Plot Lab Check', desc: 'Practical check of reproducible data tidying pipelines and perceptual plot accuracy.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Graphical Integrity & Uncertainty Visualization Rubric', desc: 'Formative check of error bars, axis scaling, and colorblind-safe palettes.' }
                ]
            },
            // ---------------- WEEK 14 (CO4 - Graded ILO 2: weight 30) ----------------
            {
                weekIdx: 13, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'McKinney Python Data Analysis, PCA & Time-Series Study', desc: 'Study Principal Component Analysis (PCA), time-series stationarity (ADF test), ACF/PACF correlograms, and `renv`/`conda` environment locking.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Reproducible `renv.lock` / `environment.yml` Setup', desc: 'Initialize a version-controlled statistical project with pinned package versions (`renv::snapshot()` or `conda env export`).' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Reproducible Statistical Computing, PCA & ARIMA Seminar', desc: 'Live walkthrough of PCA dimensionality reduction, seasonal decomposition (STL), ARIMA $(p,d,q)$ diagnostics, and Quarto literate programming.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Reproducible Statistical Computing Notebook Practicum', desc: 'Supervised practicum authoring a self-contained Quarto/Jupyter notebook executing EDA, PCA biplots, time-series forecasting, and dependency locking.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Clean-Room Notebook Reproducibility Verification', desc: 'Swap repositories with a peer and verify that their Quarto/Jupyter notebook renders to HTML/PDF from raw data in a fresh environment with zero errors.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Spurious Correlation in Non-Stationary Time Series Brief', desc: 'Illustrate how regressing two independent random walks produces artificially high $R^2$ and significant t-statistics unless differenced.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 10, weight: '30', name: 'Reproducible Statistical Computing Notebook', desc: 'Summative Final laboratory assessment grading the end-to-end Quarto/Jupyter statistical notebook, `renv`/environment lockfiles, and PCA/time-series analysis.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'PCA Scree Plot & ADF Stationarity Spot-Check', desc: 'In-class check of variance explained ratios and Augmented Dickey-Fuller p-values.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Peer Clean-Room Render Verification', desc: 'Formative check confirming one-click notebook rendering and locked dependency provenance.' }
                ]
            },
            // ---------------- WEEK 15 (CO4) ----------------
            {
                weekIdx: 14, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Quarto Scientific Publishing & Simpson\'s Paradox Study', desc: 'Study Quarto cross-referencing, APA/IEEE statistical reporting standards, Simpson\'s Paradox, collider bias, and pre-registration.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Capstone Statistical Pipeline Draft & Sensitivity Checks', desc: 'Complete the primary inferential and regression analyses for the Capstone dataset and run bootstrap/nonparametric sensitivity checks.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Causal Pitfalls (Simpson\'s Paradox) & Executive Reporting Lecture', desc: 'Lecture on confounding variables, Directed Acyclic Graphs (DAGs), avoiding causal language in observational studies, and executive statistical communication.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Capstone Reproducibility Audit & Manuscript Studio', desc: 'Hands-on studio auditing capstone methodology, verifying assumption diagnostics, and formatting publication-ready tables and figures.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Reproducible Appendix & Data Provenance Freeze', desc: 'Finalize the Capstone Quarto manuscript, data dictionary, SHA-256 dataset checksums, and reproducible technical appendix.' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'UC Berkeley Admissions Simpson\'s Paradox Case Analysis', desc: 'Deconstruct how aggregated vs. department-stratified contingency tables reverse the direction of association.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: null, weight: '0', name: 'Capstone Methodology & Diagnostic Audit Rubric', desc: 'Formative studio evaluation of statistical test appropriateness, assumption verification, and confounding controls.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Confounding vs. Collider DAG Check', desc: 'In-class check identifying which covariates to adjust for in observational regression.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Data Provenance & Reproducible Appendix Check', desc: 'Verification of raw-to-clean data scripts and ethical disclosure statements.' }
                ]
            },
            // ---------------- WEEK 16 (CO4 - Graded ILO 3: weight 50) ----------------
            {
                weekIdx: 15, period: 'f',
                tlas: [
                    { phase: 'preclass', by: 'S', lab: false, name: 'Capstone Statistical Defense Slide Deck & Q&A Prep', desc: 'Prepare the executive presentation summarizing research questions, EDA, hypothesis tests, regression diagnostics, and actionable insights.' },
                    { phase: 'preclass', by: 'S', lab: true, name: 'Final Quarto HTML/PDF Render & Environment Freeze', desc: 'Perform final verification that the Capstone Quarto report, code repository, and locked environment execute cleanly.' },
                    { phase: 'inclass', by: 'T', lab: false, name: 'Statistical Peer Review & Defense Standards Briefing', desc: 'Instructor briefing on defending statistical methodology, effect sizes, model limitations, and ethical data stewardship.' },
                    { phase: 'inclass', by: 'S', lab: true, name: 'Capstone Statistical Data Analysis Defense', desc: 'Formal Final oral defense and live code walkthrough of the end-to-end statistical data analysis project.' },
                    { phase: 'postclass', by: 'S', lab: true, name: 'Archival Reproducible Research Compendium Submission', desc: 'Submit the complete research compendium (raw data, cleaning scripts, Quarto source, rendered PDF/HTML, and `renv`/`conda` lockfile).' },
                    { phase: 'postclass', by: 'S', lab: false, name: 'Course Statistical Reasoning Synthesis Reflection', desc: 'Complete a final reflection synthesizing probability, inference, regression, and reproducible computing competencies.' }
                ],
                assessments: [
                    { tlaIdx: 3, iloIdx: 11, weight: '50', name: 'Capstone Statistical Data Analysis Defense', desc: 'Major Final capstone defense evaluating the full statistical pipeline from exploratory analysis to inference, regression modeling, and reproducible reporting.' },
                    { tlaIdx: 2, iloIdx: null, weight: '0', name: 'Statistical Manuscript & APA Table Check', desc: 'Verification of accurate test statistic, degrees of freedom, p-value, effect size, and CI formatting.' },
                    { tlaIdx: 4, iloIdx: null, weight: '0', name: 'Research Compendium Reproducibility Sign-Off', desc: 'Final verification of archival completeness and code reproducibility.' }
                ]
            }
        ];

        const insertedTlasByWeek = [];

        for (const weekItem of weeklyTlasData) {
            const targetWeekId = weeks[weekItem.weekIdx].week_id;

            const tlaRows = weekItem.tlas.map(t => ({
                week_id: targetWeekId,
                tla_name: t.name,
                description: t.desc,
                performed_by: t.by,
                class_phase: t.phase,
                is_lab: Boolean(t.lab),
                is_orientation: Boolean(t.is_orientation),
                createdAt: now,
                updatedAt: now
            }));

            await queryInterface.bulkInsert('TeachingAndLearningActivities', tlaRows, {});

            const insertedTlas = await queryInterface.sequelize.query(
                `SELECT tla_id, tla_name FROM TeachingAndLearningActivities WHERE week_id = ${targetWeekId} ORDER BY tla_id ASC;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            insertedTlasByWeek.push(insertedTlas);

            const assessRows = weekItem.assessments.map(a => ({
                tla_id: insertedTlas[a.tlaIdx].tla_id,
                ilo_id: a.iloIdx !== null ? gradedIlos[a.iloIdx].ilo_id : null,
                name: a.name,
                description: a.desc,
                period: weekItem.period,
                weight: a.weight,
                min_passing: 60,
                createdAt: now,
                updatedAt: now
            }));

            await queryInterface.bulkInsert('TLAAssessments', assessRows, {});
        }

        // ============================================================================
        // 12. COMMENTS & COMMENT TARGETS (week_id + subtopic_id / tla_id / weekly_reference_id)
        // ============================================================================
        const subtopicsByWeek = [];
        for (let wIdx = 0; wIdx < 16; wIdx++) {
            const wId = weeks[wIdx].week_id;
            const subs = await queryInterface.sequelize.query(
                `SELECT subtopic_id, title FROM Subtopics WHERE week_id = ${wId} ORDER BY subtopic_id ASC;`,
                { type: queryInterface.sequelize.QueryTypes.SELECT }
            );
            subtopicsByWeek.push(subs);
        }

        const rawCommentsData = [
            // Comment 1: Week 2 (CO1) - Subtopic on Kolmogorov Axioms & Birthday/Hashing Collision Probabilities
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[1].week_id,
                comment_for: 'topics',
                target_id: subtopicsByWeek[1][1].subtopic_id,
                message: 'The probability topic should include applied examples in computing such as hashing collision probabilities and randomized algorithms; add a short module on practical applications.'
            },
            // Comment 2: Week 3 (CO1) - TLA on Probability Distribution Simulation Lab
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[2].week_id,
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[2][3].tla_id,
                message: 'For distribution labs, require students to simulate sampling variability in code (R or Python) and submit reproducible scripts rather than static outputs.'
            },
            // Comment 3: Week 6 (CO2) - Subtopic on Multiple Testing Corrections (Bonferroni, FDR)
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[5].week_id,
                comment_for: 'topics',
                target_id: subtopicsByWeek[5][2].subtopic_id,
                message: 'Hypothesis testing section should explicitly cover multiple testing corrections (Bonferroni, FDR) when students analyze many features.'
            },
            // Comment 4: Week 10 (CO3) - TLA on Linear & Logistic Regression Diagnostics Practicum
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[9].week_id,
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[9][3].tla_id,
                message: 'Regression lab must include diagnostics for heteroscedasticity and influence (Cook\'s distance); require remediation steps when assumptions fail.'
            },
            // Comment 5: Week 14 (CO4) - Subtopic on Environment Reproducibility (renv / conda)
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[13].week_id,
                comment_for: 'topics',
                target_id: subtopicsByWeek[13][2].subtopic_id,
                message: 'R and Python essentials should include package management and environment locking (renv/conda/uv) to ensure reproducibility across environments.'
            },
            // Comment 6: Week 16 (CO4) - TLA on Capstone Statistical Data Analysis Defense
            {
                co_assign_id: assignId,
                commenter_role: 'INDUSTRY_CONSULTANT',
                resolved_status: false,
                week_id: weeks[15].week_id,
                comment_for: 'tlas',
                target_id: insertedTlasByWeek[15][3].tla_id,
                message: 'Capstone project rubric should weight data provenance, reproducibility, and ethical considerations; require a short reproducible appendix.'
            }
        ];

        await queryInterface.bulkInsert('Comments', rawCommentsData.map(c => ({
            co_assign_id: c.co_assign_id,
            commenter_role: c.commenter_role,
            message: c.message,
            resolved_status: c.resolved_status,
            week_id: c.week_id,
            comment_for: c.comment_for,
            createdAt: now,
            updatedAt: now
        })), {});

        const insertedComments = await queryInterface.sequelize.query(
            `SELECT comment_id, message FROM Comments WHERE co_assign_id = ${assignId} ORDER BY comment_id ASC;`,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const targetInserts = rawCommentsData.map((c, index) => ({
            comment_id: insertedComments[index].comment_id,
            target_id: c.target_id,
            createdAt: now,
            updatedAt: now
        }));

        await queryInterface.bulkInsert('CommentTargets', targetInserts, {});

        console.log("Successfully seeded 'Statistics' (MATH311L) with full 16-week structure and RETURNED Industry Consultant comments.");
    },

    async down(queryInterface, Sequelize) {
        console.warn("Use npx sequelize-cli db:seed:undo:all to reset the composition database cleanly.");
    }
};
