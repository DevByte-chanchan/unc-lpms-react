// Academic and IT words that learning plans use and the general word list lacks: without them the checker underlined
// "inference", "relational" or "declarative" in a perfectly written comment. They count as dictionary words, so they
// are also offered as fixes. Add a word anywhere; three letters or fewer are not checked anyway.

const WORDS = `
foundational disparate choreography choreographies hypervisor hypervisors inference inferences inferential relational
orchestrate orchestrated orchestrates orchestrating orchestration logistic logistics mockup mockups evaluative
declarative imperative matrices matrix modifier modifiers idempotent idempotency recency
accessibility accreditation algorithmic analytics anonymize anonymized api apis applet architecting asynchronous
authenticate authenticated authentication authorization authorize autoscaling backend backends backlog bandwidth
benchmark benchmarking bitwise blockchain boolean bootstrap bootstrapping bytecode cache caching capstone cardinality
checksum classifier classifiers cloud clustering codebase cognitive cohesion collaborative compile compiler compilers
componentization composable computational concurrency config configurable containerization containerize containerized
coursework credential credentials cryptographic cryptography curricular cybersecurity dashboard dashboards dataset
datasets deadlock debug debugger debugging decentralized decompose decomposition decryption deduplication deployable
deserialization deserialize designate devops diagrammatic digitization discretization distributed dockerfile
downtime encapsulate encapsulated encapsulation encryption endpoint endpoints enrollment enumerate enumeration
epistemic ergonomic ergonomics extensibility extensible failover feedback firewall firewalls formative framework
frameworks frontend frontends gamification geospatial granular granularity hashing heuristic heuristics hyperparameter
hyperparameters immutability immutable implementable infographic infographics inheritance instantiate instantiation
integrative interoperability interoperable interpretability iterative iteratively javascript kernel kernels
lifecycle linter linting load-balancing localhost logarithmic lossless lossy maintainability metadata methodological
methodologies methodology microservice microservices middleware misconception misconceptions modularity modularize
multimedia multithreading mutable namespace namespaces normalization normalize normalized objectives ontology
onboarding orthogonal outlier outliers overfitting paradigm paradigms parallelism parameterize parameterized parse
parser parsers pedagogical pedagogy performant persistence pipeline pipelines plagiarism polymorphic polymorphism
portability postcondition precondition preconditions predictive preprocessing prerequisite prerequisites programmatic
programmatically prototyping pseudocode quantitative qualitative queueing recursion recursive redundancy refactor
refactored refactoring regression reinforcement remediation replicable reproducibility reproducible rubric rubrics
runtime scaffold scaffolding scalability scalable schema schemas scripting semantic semantics serialization
serialize serverless sharding simulator simulators skillset stakeholder stakeholders stateful stateless stochastic
subnet subnets summative syllabi syllabus synchronous syntactic taxonomy telemetry templating testability
throughput timestamp timestamps tokenization tokenize toolchain toolkit traceability transactional transpile
troubleshoot troubleshooting typecast unencrypted unsupervised upskilling usability validator validators vectorized
versioning virtualization virtualize virtualized visualization visualizations walkthrough walkthroughs webhook
webhooks whitelist wireframe wireframes workflow workflows workload workloads
`

export const ACADEMIC_WORDS = [...new Set(WORDS.toLowerCase().split(/\s+/).filter(word => word.length >= 4))]

export default ACADEMIC_WORDS
