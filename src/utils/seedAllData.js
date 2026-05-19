export function seedAllData() {
  // Clear all known localStorage keys
  const keys = [
    'lpms_syllabi_v1',
    'lpsm_workflow_v1',
    'lpsm_workflow_seeded_v3',
    'lpsm_suggestions_v1',
    'lpsm_reference_library_v1',
    'lpsm_reference_comments_v1',
    'approval_comments_v1',
    'lpsm_documents_v1',
    'lpsm_uploads_v1',
  ]
  keys.forEach(k => {
    try { localStorage.removeItem(k) } catch (e) {}
  })

  // Seed reference library from refPool
  const refPool = [
    { id: "TB1", title: "Software Engineering: A Practitioner's Approach", type: "Textbook", authors: "Roger S. Pressman", year: 2020, isbn: "978-1260548006", link: "" },
    { id: "TB2", title: "Software Engineering", type: "Textbook", authors: "Ian Sommerville", year: 2021, isbn: "978-0133943030", link: "" },
    { id: "TB3", title: "Clean Architecture", type: "Textbook", authors: "Robert C. Martin", year: 2018, isbn: "978-0134494166", link: "" },
    { id: "TB4", title: "Operating System Concepts", type: "Textbook", authors: "Silberschatz, Galvin, Gagne", year: 2019, isbn: "978-1119456339", link: "" },
    { id: "TB5", title: "Computer Networking: A Top-Down Approach", type: "Textbook", authors: "Kurose & Ross", year: 2022, isbn: "978-0136681557", link: "" },
    { id: "TB6", title: "Database System Concepts", type: "Textbook", authors: "Silberschatz, Korth, Sudarshan", year: 2020, isbn: "978-1260084504", link: "" },
    { id: "TB7", title: "Discrete Mathematics and Its Applications", type: "Textbook", authors: "Kenneth H. Rosen", year: 2019, isbn: "978-1259676512", link: "" },
    { id: "TB8", title: "Introduction to Algorithms", type: "Textbook", authors: "Cormen, Leiserson, Rivest, Stein", year: 2022, isbn: "978-0262046305", link: "" },
    { id: "OE1", title: "SWEBOK (Software Engineering Body of Knowledge)", type: "Open Educational Resources", authors: "IEEE Computer Society", year: 2021, isbn: "", link: "https://www.computer.org/education/bodies-of-knowledge/software-engineering" },
    { id: "OE2", title: "MIT 6.828: Operating Systems Engineering", type: "Open Educational Resources", authors: "MIT OpenCourseWare", year: 2022, isbn: "", link: "https://pdos.csail.mit.edu/6.828/" },
    { id: "OE3", title: "Beej's Guide to Network Programming", type: "Open Educational Resources", authors: "Brian Hall", year: 2023, isbn: "", link: "https://beej.us/guide/bgnet/" },
    { id: "OE4", title: "Stanford Database Course", type: "Open Educational Resources", authors: "Jennifer Widom", year: 2021, isbn: "", link: "https://cs145-fb.stanford.edu/" },
    { id: "OE5", title: "FreeCodeCamp Web Design Certification", type: "Open Educational Resources", authors: "FreeCodeCamp", year: 2023, isbn: "", link: "https://www.freecodecamp.org/" },
    { id: "OR1", title: "Agile Manifesto", type: "Online Resources", authors: "Agile Alliance", year: 2001, isbn: "", link: "https://agilemanifesto.org/" },
    { id: "OR2", title: "OWASP Top Ten", type: "Online Resources", authors: "OWASP Foundation", year: 2021, isbn: "", link: "https://owasp.org/www-project-top-ten/" },
    { id: "OR3", title: "MDN Web Docs", type: "Online Resources", authors: "Mozilla", year: 2023, isbn: "", link: "https://developer.mozilla.org/" },
    { id: "OR4", title: "NIST Cybersecurity Framework", type: "Online Resources", authors: "NIST", year: 2024, isbn: "", link: "https://www.nist.gov/cyberframework" },
    { id: "OR5", title: "PostgreSQL Documentation", type: "Online Resources", authors: "PostgreSQL Global Development Group", year: 2024, isbn: "", link: "https://www.postgresql.org/docs/" },
    { id: "OR6", title: "Scikit-learn Documentation", type: "Online Resources", authors: "Scikit-learn Developers", year: 2024, isbn: "", link: "https://scikit-learn.org/stable/" },
  ]
  localStorage.setItem('lpsm_reference_library_v1', JSON.stringify(refPool))

  // Seed workflow data (clears seed flag so seedDemoWorkflows can re-run)
  const { seedDemoWorkflows } = require('./workflowHelpers')
  seedDemoWorkflows()

  // approval_comments_v1 starts empty
  localStorage.setItem('approval_comments_v1', JSON.stringify([]))
  // suggestions start empty
  localStorage.setItem('lpsm_suggestions_v1', JSON.stringify([]))
  // documents start empty
  localStorage.setItem('lpsm_documents_v1', JSON.stringify({}))
  // uploads start empty
  localStorage.setItem('lpsm_uploads_v1', JSON.stringify({}))
}
