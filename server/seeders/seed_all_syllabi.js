const mysql = require('mysql2/promise')

const now = new Date()

const programMap = {
  BSCS: 2,
  BIT: 1,
  IT: 1,
}

function getProgram(code) {
  if (code.startsWith('BSCS')) return 2
  if (code.startsWith('BIT')) return 1
  if (code.startsWith('IT ')) return 1
  return 1
}

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: 'rootpassword',
    database: 'lpms_composition',
  })

  // get existing course_no values
  const [existing] = await conn.query('SELECT course_no, course_id FROM Courses')
  const existingNos = new Set(existing.map(r => r.course_no))
  const existingByNo = {}
  existing.forEach(r => { existingByNo[r.course_no] = r.course_id })

  // get max course_id
  const [[{ maxId }]] = await conn.query('SELECT COALESCE(MAX(course_id), 0) as maxId FROM Courses')
  let nextCourseId = maxId + 1

  // get max pc_offering_id
  const [[{ maxPcoId }]] = await conn.query('SELECT COALESCE(MAX(pc_offering_id), 0) as maxPcoId FROM ProgramCourseOfferings')
  let nextPcoId = maxPcoId + 1

  // get max co_assign_id
  const [[{ maxCoaId }]] = await conn.query('SELECT COALESCE(MAX(co_assign_id), 0) as maxCoaId FROM CourseOfferingAssignments')
  let nextCoaId = maxCoaId + 1

  // read syllabiData
  const { syllabiData } = require('../../src/data/syllabiData.js')

  const courseInserts = []
  const pcoInserts = []
  const coaInserts = []

  for (const s of syllabiData) {
    if (existingNos.has(s.code)) continue

    const courseId = nextCourseId++
    const pcoId = nextPcoId++
    const coaId = nextCoaId++

    courseInserts.push([
      courseId,
      s.code,
      (s.name || '').substring(0, 100),
      (s.credits || 'N/A').substring(0, 30),
      (s.contact || 'N/A').substring(0, 30),
      (s.class || 'N/A').substring(0, 50),
      (s.cmo || 'N/A').substring(0, 30),
      (s.year || 'N/A').substring(0, 30),
      (s.sem || 'N/A').substring(0, 30),
      now, now,
    ])

    const programId = getProgram(s.code)
    pcoInserts.push([
      pcoId,
      1,
      courseId,
      programId,
      1,
      (s.name || '') + ' - syllabus',
      now, now,
    ])

    coaInserts.push([
      coaId,
      pcoId,
      null,
      s.update ? new Date(s.update) : new Date('2026-03-05'),
      null, null, null, null, null, null,
      null, null, null, null,
      now, now,
    ])
  }

  if (courseInserts.length === 0) {
    console.log('All courses already exist in DB. Nothing to seed.')
    await conn.end()
    return
  }

  console.log(`Inserting ${courseInserts.length} new courses...`)

  await conn.query(
    'INSERT INTO Courses (course_id, course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt) VALUES ?',
    [courseInserts]
  )

  await conn.query(
    'INSERT INTO ProgramCourseOfferings (pc_offering_id, revision_number, course_id, program_id, dept_id, course_description, createdAt, updatedAt) VALUES ?',
    [pcoInserts]
  )

  await conn.query(
    `INSERT INTO CourseOfferingAssignments (co_assign_id, pc_offering_id, stakeholder_id, date_assigned, date_submitted, date_updated, ph_date_returned, ic_date_returned, ld_date_returned, d_date_returned, ph_date_accepted, ic_date_accepted, ld_date_accepted, d_date_accepted, createdAt, updatedAt) VALUES ?`,
    [coaInserts]
  )

  console.log(`Seeded ${courseInserts.length} courses with offerings and assignments.`)
  await conn.end()
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
