import { syllabiData } from '../data/syllabiData.js';

const STORAGE_KEY = 'lpms_curriculum_alignment_v1'

const defaultPoData = [
  { text: 'Apply knowledge in computing, science, and mathematics in developing IT solutions.', peos: [1,2], gas: [2,3,4] },
  { text: 'Apply best practices and standards in developing IT solutions.', peos: [1,2], gas: [3,4] },
  { text: 'Define the computing requirements appropriate to the solution of a complex problem.', peos: [1,2], gas: [1,3,4] },
  { text: 'Analyze user needs in the selection, creation, evaluation, and administration of computer-based systems.', peos: [1,2], gas: [1,3,4] },
  { text: 'Develop IT solutions to meet the needs and requirements under various constraints.', peos: [1,2,3], gas: [1,2] },
  { text: 'Integrate IT-based solutions into the user environment.', peos: [1,2,3], gas: [1,3,4] },
  { text: 'Apply knowledge through the use of current techniques, skills, tools, and practices necessary for the IT profession.', peos: [1,3], gas: [1,2,3,4] },
  { text: 'Function effectively as a member or leader of a development team recognizing the different roles to accomplish common goals.', peos: [1,3], gas: [1,2,3] },
  { text: 'Provide technical assistance in the creation of an effective IT project plan.', peos: [1,3], gas: [1,3] },
  { text: 'Communicate effectively, both oral and written with the computing community and society.', peos: [1,2,3], gas: [1,2,3,4] },
  { text: 'Analyze the local and global impact of computing information technology on individuals, organizations, and society.', peos: [2,3], gas: [3,4] },
  { text: 'Apply appropriate professional, ethical, and legal practices in the utilization of information technology.', peos: [1,2,3], gas: [1,2,3] },
  { text: 'Develop the skills needed to engage in independent and lifelong learning.', peos: [2,3], gas: [2,4] },
]

const defaultGasLabels = ['EC (Expert in Chosen Field)', 'CL (Collaborative Leader)', 'ERC (Ethical and Responsible Citizen)', 'LL (Lifelong Learner)']

let _cache = null

const _read = () => {
  if (_cache) return _cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    _cache = raw ? JSON.parse(raw) : { programs: {} }
  } catch { _cache = { programs: {} } }
  return _cache
}

const _write = (data) => {
  _cache = data
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* ignore storage errors */ }
}

export const extractProgramPrefix = (code) => {
  if (!code) return null
  const m = code.match(/^([A-Za-z]+)/)
  if (!m) return null
  const p = m[1].toUpperCase()
  if (p.startsWith('BSCS')) return 'BSCS'
  if (p.startsWith('BSIT')) return 'BSIT'
  if (p.startsWith('BSCPE') || p.startsWith('BSCP')) return 'BSCpE'
  if (p.startsWith('BSBA')) return 'BSBA'
  if (p.startsWith('BSA')) return 'BSA'
  if (p.startsWith('BSMA')) return 'BSMA'
  if (p.startsWith('BSHM')) return 'BSHM'
  if (p.startsWith('BSTM')) return 'BSTM'
  if (p.startsWith('BSE')) return 'BSE'
  if (p.startsWith('BSPSYCH')) return 'BSPsych'
  if (p.startsWith('BSN')) return 'BSN'
  if (p.startsWith('BSRT')) return 'BSRT'
  if (p.startsWith('BSMT')) return 'BSMT'
  if (p.startsWith('BSPH')) return 'BSPH'
  if (p.startsWith('BSPT')) return 'BSPT'
  if (p.startsWith('BSARCH')) return 'BSARCH'
  if (p.startsWith('BSEE')) return 'BSEE'
  if (p.startsWith('BSCIE') || p.startsWith('BSCE')) return 'BSCIE'
  if (p.startsWith('BSME')) return 'BSME'
  if (p.startsWith('BSCH')) return 'BSChE'
  if (p.startsWith('BSIE')) return 'BSIE'
  if (p.startsWith('BSECE') || p.startsWith('BSELEC')) return 'BSECE'
  if (p.startsWith('GE')) return 'GE'
  if (p.startsWith('MATH') || p.startsWith('MAT')) return 'MATH'
  if (p.startsWith('BIT')) return 'BIT'
  if (p.startsWith('BSC')) return 'BSC'
  return p
}

export const getAllPrograms = () => {
  const seen = {}
  syllabiData.forEach(s => {
    const p = extractProgramPrefix(s.code)
    if (p) seen[p] = true
  })
  return Object.keys(seen).sort()
}

export const getProgramName = (prefix) => {
  const names = {
    BSCS: 'BS Computer Science',
    BSIT: 'BS Information Technology',
    BIT: 'BS Information Technology',
    BSCpE: 'BS Computer Engineering',
    BSBA: 'BS Business Administration',
    BSA: 'BS Accountancy',
    BSMA: 'BS Management Accounting',
    BSHM: 'BS Hospitality Management',
    BSTM: 'BS Tourism Management',
    BSE: 'BS Education',
    BSPsych: 'BS Psychology',
    BSN: 'BS Nursing',
    BSRT: 'BS Radiologic Technology',
    BSMT: 'BS Medical Technology',
    BSPH: 'BS Public Health',
    BSPT: 'BS Physical Therapy',
    BSARCH: 'BS Architecture',
    BSEE: 'BS Electrical Engineering',
    BSCIE: 'BS Civil Engineering',
    BSME: 'BS Mechanical Engineering',
    BSChE: 'BS Chemical Engineering',
    BSIE: 'BS Industrial Engineering',
    BSECE: 'BS Electronics Engineering',
    GE: 'General Education',
    MATH: 'Mathematics',
    BSC: 'BS Computer Science',
  }
  return names[prefix] || prefix
}

export const getProgramCourses = (programPrefix) => {
  return syllabiData
    .filter(s => extractProgramPrefix(s.code) === programPrefix)
    .map(s => ({ code: s.code, name: s.name }))
}

// ---------------------------------------------------------------------------
// One program, one key.
//
// COAEPUpload used to key records by the server's `Program.name` ("BS
// Information Technology") while every other alignment page keys by the short
// prefix `extractProgramPrefix` returns ("BIT"). The same program then had two
// entries in this store, and a COAEP saved while the server was reachable
// disappeared on the offline fallback. The prefix is the key; anything already
// saved under a long name is folded into it here rather than orphaned.
// ---------------------------------------------------------------------------

const PROGRAM_KEY_ALIASES = (() => {
  const aliases = {}
  getAllPrograms().forEach(prefix => {
    const name = getProgramName(prefix)
    if (name && name !== prefix) aliases[name.toLowerCase()] = prefix
  })
  return aliases
})()

// The canonical key for a program entry: the prefix itself, the prefix a long
// program name maps to, or the prefix of a course filed under it.
export const canonicalProgramKey = (key, courseCodes = []) => {
  if (!key) return key
  const known = getAllPrograms()
  if (known.includes(key)) return key
  const byName = PROGRAM_KEY_ALIASES[String(key).toLowerCase()]
  if (byName) return byName
  const fromCourse = courseCodes.map(extractProgramPrefix).find(Boolean)
  return fromCourse || key
}

export const migrateLegacyProgramKeys = (store) => {
  const programs = store?.programs || {}
  let moved = 0

  Object.keys(programs).forEach(key => {
    const entry = programs[key] || {}
    const target = canonicalProgramKey(key, Object.keys(entry.courses || {}))
    if (target === key) return

    const dest = programs[target] || { courses: {} }
    dest.courses = dest.courses || {}
    // Never overwrite: a record already saved under the canonical key wins.
    Object.entries(entry.courses || {}).forEach(([courseCode, data]) => {
      dest.courses[courseCode] = { ...data, ...(dest.courses[courseCode] || {}) }
    })
    if (entry.poPeoAlignment && !dest.poPeoAlignment) dest.poPeoAlignment = entry.poPeoAlignment

    programs[target] = dest
    delete programs[key]
    moved += 1
  })

  return { store, moved }
}

let _migrated = false
const _readMigrated = () => {
  const current = _read()
  if (_migrated) return current
  _migrated = true
  const { moved } = migrateLegacyProgramKeys(current)
  if (moved > 0) _write(current)
  return current
}

export const getPoPeoData = (programCode) => {
  const store = _readMigrated()
  const prog = store.programs[programCode]
  if (prog?.poPeoAlignment) return prog.poPeoAlignment
  return { programOutcomes: JSON.parse(JSON.stringify(defaultPoData)), gasLabels: [...defaultGasLabels] }
}

export const savePoPeoData = (programCode, data) => {
  const store = _readMigrated()
  if (!store.programs[programCode]) store.programs[programCode] = { courses: {} }
  store.programs[programCode].poPeoAlignment = JSON.parse(JSON.stringify(data))
  _write(store)
}

export const getCoPoData = (programCode, courseCode) => {
  const store = _readMigrated()
  const prog = store.programs[programCode]
  const saved = prog?.courses?.[courseCode]?.coPoAlignment
  if (saved) return saved
  const course = syllabiData.find(s => s.code.replace(/\s/g, '') === (courseCode || '').replace(/\s/g, ''))
  if (course?.courseOutcomes) return { courseOutcomes: course.courseOutcomes }
  return { courseOutcomes: [] }
}

export const saveCoPoData = (programCode, courseCode, data) => {
  const store = _readMigrated()
  if (!store.programs[programCode]) store.programs[programCode] = { courses: {} }
  if (!store.programs[programCode].courses[courseCode]) store.programs[programCode].courses[courseCode] = {}
  store.programs[programCode].courses[courseCode].coPoAlignment = JSON.parse(JSON.stringify(data))
  _write(store)
}

export const getCoaepData = (programCode, courseCode) => {
  const store = _readMigrated()
  const prog = store.programs[programCode]
  return prog?.courses?.[courseCode]?.coaep || null
}

export const saveCoaepData = (programCode, courseCode, data) => {
  const store = _readMigrated()
  if (!store.programs[programCode]) store.programs[programCode] = { courses: {} }
  if (!store.programs[programCode].courses[courseCode]) store.programs[programCode].courses[courseCode] = {}
  store.programs[programCode].courses[courseCode].coaep = JSON.parse(JSON.stringify(data))
  _write(store)
}

export const resetPoPeoDefaults = (programCode) => {
  savePoPeoData(programCode, { programOutcomes: JSON.parse(JSON.stringify(defaultPoData)), gasLabels: [...defaultGasLabels] })
}
