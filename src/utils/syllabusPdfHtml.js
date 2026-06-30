const safe = (v, fallback = '—') => (v === null || v === undefined || v === '') ? fallback : String(v)

const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

const poLabels = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12', 'PO13']

// Available content height (px) between header and footer in a 216mm page
const PAGE_BUDGET = 540

const pageHeader = (logo) => `<table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:8px;">
  <tr>
    <td style="width:80px; min-width:80px; max-width:80px; padding:4px; border:1px solid #000; text-align:center; vertical-align:middle;">
      ${logo ? `<img src="${logo}" style="width:68px; height:68px;">` : ''}
    </td>
    <td style="text-align:center; vertical-align:middle; padding:6px; border:1px solid #000;">
      <div style="font-size:10.5pt; font-weight:bold; color:#000; line-height:1.35;">UNIVERSITY OF NUEVA CACERES</div>
      <div style="font-size:10.5pt; font-weight:bold; color:#000; line-height:1.35;">COURSE SYLLABUS</div>
      <div style="font-size:10pt; font-weight:normal; color:#000; line-height:1.35;">Form</div>
      <div style="font-size:10pt; font-weight:bold; color:#000; line-height:1.35;">OFFICE OF THE VICE PRESIDENT OF ACADEMIC AFFAIRS</div>
    </td>
    <td style="width:120px; min-width:120px; max-width:120px; padding:5px 8px; vertical-align:middle; border:1px solid #000;">
      <div style="font-size:9pt; font-weight:bold; color:#000;">Doc. Control No.:</div>
      <div style="font-size:9pt; font-weight:normal; color:#000;">UNC-FM-VPAA-01</div>
    </td>
  </tr>
</table>`

const pageFooter = (pageNum, total) => `<div style="display:flex; justify-content:space-between; padding-top:4px; font-size:8.5pt; font-family:Arial,Helvetica,sans-serif; margin-top:auto;">
  <span>Effectivity: 06/01/2024</span>
  <span>Revision No.: 0</span>
  <span>Page No.: ${pageNum} of ${total}</span>
</div>`

function page1(logo, total) {
  return `<div class="page page-break">
    ${pageHeader(logo)}
    <table style="width:100%; border-collapse:collapse; font-family:Arial, Helvetica, sans-serif; font-size:10pt; margin-bottom:12px;">
      <tr>
        <td colspan="2" style="background:#bfbfbf; font-weight:700; border:1px solid #000; padding:4px 6px; text-align:left;">UNIVERSITY</td>
      </tr>
      <tr>
        <td style="width:16%; font-weight:700; border:1px solid #000; padding:4px 6px; vertical-align:top;">VISION STATEMENT</td>
        <td style="border:1px solid #000; padding:4px 6px; text-align:justify;">Our vision is to be the top university of choice for Bicolanos everywhere. We will nurture our students through empowering, outcome-based education, to help them become purposeful, productive, and future-ready human beings who will contribute to the sustainable development of Bicol and better tomorrows for all.</td>
      </tr>
      <tr>
        <td style="font-weight:700; border:1px solid #000; padding:4px 6px; vertical-align:top;">MISSION STATEMENT</td>
        <td style="border:1px solid #000; padding:4px 6px; text-align:justify;">Our mission is to expand opportunities for every Bicolano everywhere and prepare them for a purposeful life, by providing empowering outcome-based education and a nurturing learning environment.</td>
      </tr>
      <tr>
        <td style="font-weight:700; border:1px solid #000; padding:4px 6px; vertical-align:top;">EDUCATIONAL POLICY</td>
        <td style="border:1px solid #000; padding:4px 6px; text-align:justify;">Guided by its Mission and Vision, UNC is committed to achieving its institutional objectives. UNC shall champion continuous improvement in its Educational Organization Management System (EOMS) to meet regulatory and statutory requirements, as well as international standards. UNC pledges to promote scientific and technical developments in the region through research and management of intellectual property as its social responsibility to its stakeholders and the community.</td>
      </tr>
      <tr>
        <td style="font-weight:700; border:1px solid #000; padding:4px 6px; vertical-align:top;">CORE VALUES</td>
        <td style="border:1px solid #000; padding:4px 6px;">
          <ol style="margin:0; padding-left:18px;">
            <li><strong>We Champion Excellence.</strong> We consistently strive for excellence in everything we do.</li>
            <li><strong>We Nurture Dreams.</strong> We passionately guide and inspire our students to leverage their potentials and aspire for better lives.</li>
            <li><strong>We Do The Right Things Right.</strong> We uphold integrity in everything we do.</li>
            <li><strong>We Are Dynamic and Creative.</strong> We anticipate the forces of change. We explore possibilities with intent and purpose.</li>
            <li><strong>We Respect Each Other and Work As A Team.</strong> We collaboratively maximize our talents and capabilities.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td style="font-weight:700; border:1px solid #000; padding:4px 6px; vertical-align:top;">GRADUATE ATTRIBUTES</td>
        <td style="border:1px solid #000; padding:4px 6px;">
          <p style="margin:2px 0;"><strong>Excellent Communicator.</strong> Ability to effectively use oral and written skills in sharing and receiving updated and verified information in various communication channels.</p>
          <p style="margin:2px 0;"><strong>Creative Leader.</strong> Ability to critically think of solutions and strategies that contribute to making great decisions and innovation that promote societal development.</p>
          <p style="margin:2px 0;"><strong>Ethically Responsible Citizen.</strong> Ability to harmoniously live and work with others with trust, dignity and integrity.</p>
          <p style="margin:2px 0;"><strong>Lifelong Learner.</strong> Ability to up-skill, cross-skill and re-skill, learn independently, reflect, and adapt with societal changes.</p>
        </td>
      </tr>
    </table>

    ${pageFooter(1, total)}
  </div>`
}

function page2(logo, total) {
  return `<div class="page page-break">
    ${pageHeader(logo)}

    <table style="width:100%; border-collapse:collapse; font-family:Arial, Helvetica, sans-serif; font-size:10pt; margin-bottom:12px;">
      <tr>
        <td colspan="2" style="border:1px solid #000; padding:4px 6px; background:#f2f2f2;">
          <strong>DEPARTMENT NAME</strong><br>
          Program: Bachelor of Science in _______________
        </td>
      </tr>
      <tr>
        <td style="width:20%; font-weight:700; border:1px solid #000; padding:4px 6px; vertical-align:top;">VISION STATEMENT</td>
        <td style="border:1px solid #000; padding:4px 6px;"></td>
      </tr>
      <tr>
        <td style="font-weight:700; border:1px solid #000; padding:4px 6px; vertical-align:top;">MISSION STATEMENT</td>
        <td style="border:1px solid #000; padding:4px 6px;"></td>
      </tr>
      <tr>
        <td style="font-weight:700; border:1px solid #000; padding:4px 6px; vertical-align:top;">PROGRAM EDUCATIONAL OBJECTIVES</td>
        <td style="border:1px solid #000; padding:4px 6px;"><em>per program (ie BSIT, BSCS) usually 1-3 PEOs</em></td>
      </tr>
    </table>

    <table style="width:100%; border-collapse:collapse; font-family:Arial, Helvetica, sans-serif; font-size:10pt;">
      <tr>
        <td colspan="2" style="font-weight:700; border:1px solid #000; padding:4px 6px; background:#f2f2f2;">PROGRAM EDUCATIONAL OBJECTIVES (PEOs) AND ITS RELATIONSHIP TO THE UNC MISSION STATEMENT</td>
      </tr>
      <tr>
        <th style="width:80%; font-weight:700; border:1px solid #000; padding:4px 6px; background:#fff; color:#000; text-align:center;">PROGRAM EDUCATIONAL OBJECTIVES (PEOs)</th>
        <th style="width:20%; font-weight:700; border:1px solid #000; padding:4px 6px; background:#fff; color:#000; text-align:center;">UNC MISSION STATEMENT</th>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:4px 6px; text-align:justify;">1. Utilize competently the acquired technical and non-technical skills in practicing a career in Information Technology.</td>
        <td style="border:1px solid #000; padding:4px 6px; text-align:center;">&#x2714;</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:4px 6px; text-align:justify;">2. Advance one&rsquo;s skills in Information Technology through the acquisition of best and timely practices, as supported by the foundational skills acquired.</td>
        <td style="border:1px solid #000; padding:4px 6px; text-align:center;">&#x2714;</td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:4px 6px; text-align:justify;">3. Become a globally-competitive Information Technology practitioner, through the aid of continuing education and gain leadership responsibilities, as guided by the university and the college&rsquo;s core values.</td>
        <td style="border:1px solid #000; padding:4px 6px; text-align:center;">&#x2714;</td>
      </tr>
    </table>

    ${pageFooter(2, total)}
  </div>`
}

function page3(logo, total) {
  const poData = [
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

  return `<div class="page page-break">
    ${pageHeader(logo)}
    <table style="width:100%; border-collapse:collapse; font-family:Arial, Helvetica, sans-serif; font-size:9pt;">
      <tr>
        <td colspan="9" style="font-weight:700; border:1px solid #000; padding:3px 5px;">PROGRAM OUTCOMES (POs) AND ITS RELATIONSHIP TO PROGRAM EDUCATIONAL OBJECTIVES (PEOs)</td>
      </tr>
      <tr>
        <td colspan="3" style="font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">PEOs</td>
        <td colspan="2" style="font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">PROGRAM OUTCOMES (POs)</td>
        <td colspan="4" style="font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">GRADUATE ATTRIBUTES</td>
      </tr>
      <tr>
        <td style="width:20px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">1</td>
        <td style="width:20px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">2</td>
        <td style="width:20px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">3</td>
        <td colspan="2" style="border:1px solid #000; padding:2px 4px; text-align:left;">By the time of graduation, the students of the <strong>BSIT</strong> program shall have the ability to:</td>
        <td style="width:30px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">EC</td>
        <td style="width:30px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">CL</td>
        <td style="width:30px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">ERC</td>
        <td style="width:30px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">LL</td>
      </tr>
      ${poData.map((po, i) => `<tr>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.peos.includes(1) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.peos.includes(2) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.peos.includes(3) ? '&#x2714;' : ''}</td>
        <td style="width:30px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">PO${i + 1}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:justify; overflow-wrap:break-word;">${po.text}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.gas.includes(1) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.gas.includes(2) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.gas.includes(3) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.gas.includes(4) ? '&#x2714;' : ''}</td>
      </tr>`).join('\n      ')}
    </table>

    ${pageFooter(3, total)}
  </div>`
}

function page4(syllabus, logo, total) {
  const desc = safe(syllabus.description).replace(/\n/g, '<br>')
  const L = (t) => `<td style="border:1px solid #000; padding:3px 5px; font-weight:bold; vertical-align:middle; font-size:9pt; background:#efefef;">${t}</td>`
  const VB = (t) => `<td style="border:1px solid #000; padding:3px 5px; color:#1155CC; vertical-align:middle; font-size:9pt;">${t}</td>`
  const VBB = (t) => `<td style="border:1px solid #000; padding:3px 5px; color:#1155CC; font-weight:bold; vertical-align:middle; font-size:9pt;">${t}</td>`
  const VP = (t) => `<td style="border:1px solid #000; padding:3px 5px; vertical-align:top; font-size:9pt;">${t}</td>`
  const descCell = `<td rowspan="7" style="border:1px solid #000; padding:0; vertical-align:top;">
    <div style="font-weight:bold; padding:3px 5px; border-bottom:1px solid #000; background:#efefef;">Course Description</div>
    <div style="padding:5px 7px; text-align:justify; line-height:1.45;">${desc}</div>
  </td>`
  const legendCell = `<td rowspan="3" style="border:1px solid #000; padding:4px 6px; vertical-align:top; font-size:8pt; font-style:italic; line-height:1.5;">
    <span style="font-weight:bold; font-style:italic;">Legend:</span><br>
    I &ndash; An introductory course to an outcome<br>
    E &ndash; A course that strengthens the outcome<br>
    D &ndash; A course demonstrating an outcome
  </td>`

  return `<div class="page page-break">
    ${pageHeader(logo)}
    <div style="font-size:10pt; font-weight:bold; color:#000; margin-bottom:4px;">COURSE DETAILS</div>
    <table class="course-details-table">
      <colgroup>
        <col style="width:22%;">
        <col style="width:28%;">
        <col style="width:50%;">
      </colgroup>
      <tr>
        ${L('Course No.')}
        ${VB(safe(syllabus.code))}
        ${descCell}
      </tr>
      <tr>
        ${L('Course Title')}
        ${VBB(safe(syllabus.name))}
      </tr>
      <tr>
        ${L('Credit')}
        ${VB(safe(syllabus.credits))}
      </tr>
      <tr>
        ${L('Contact Hours/Week')}
        ${VB(safe(syllabus.contact))}
      </tr>
      <tr>
        ${L('Pre-requisites')}
        ${VB(safe(syllabus.prerequisites, 'None'))}
      </tr>
      <tr>
        ${L('Classification/Field')}
        ${VB(safe(syllabus.class))}
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:3px 5px; font-weight:bold; vertical-align:top; font-size:9pt; background:#efefef;">CMO</td>
        <td style="border:1px solid #000; padding:6px 8px; vertical-align:top; color:#1155CC; font-size:9pt;">${safe(syllabus.cmo)}</td>
      </tr>
      <tr>
        ${L('Syllabus Revision No.')}
        ${VP(safe(syllabus.revision, '0'))}
        ${legendCell}
      </tr>
      <tr>
        ${L('Year Level')}
        ${VP(safe(syllabus.year))}
      </tr>
      <tr>
        ${L('Term')}
        ${VP(safe(syllabus.sem))}
      </tr>
      <tr>
        ${L('SDG Alignment')}
        ${VP('&mdash;')}
        <td style="border:1px solid #000; padding:3px 5px;"></td>
      </tr>
    </table>

    ${pageFooter(4, total)}
  </div>`
}

function page5(syllabus, logo, pageNum, total) {
  const cos = syllabus.courseOutcomes || []
  const iloCos = syllabus.ilos || []
  const courseOutcomes = cos.length > 0 ? cos
    : [...new Map(iloCos.filter(i => i.courseOutcome).map(i => [i.courseOutcome, i])).entries()]
        .map(([, v], idx) => ({ id: `CO${idx + 1}`, description: v.courseOutcome, poMappings: [] }))

  const poHeader = poLabels.map(p =>
    `<td style="border:1px solid #000; padding:2px; text-align:center; font-weight:bold; width:4.77%; font-size:8.5pt; background:#f2f2f2;">${p}</td>`
  ).join('\n        ')

  const coRows = courseOutcomes.map(co => {
    const pm = co.poMappings || []
    return `<tr>
      <td style="border:1px solid #000; padding:3px 5px; vertical-align:top; font-size:8pt;"><strong>${co.id}:</strong> ${safe(co.description)}</td>
      ${poLabels.map((_, i) =>
        `<td style="border:1px solid #000; text-align:center; vertical-align:middle; font-size:8.5pt; padding:2px 1px;">${pm[i] || ''}</td>`
      ).join('\n        ')}
    </tr>`
  }).join('\n      ')

  return [`<div class="page page-break">
    ${pageHeader(logo)}
    <table class="co-po-table" style="width:100%; border-collapse:collapse; border:1px solid #000; font-size:8.5pt; color:#000;">
      <tr>
        <td colspan="14" style="border:1px solid #000; padding:3px 6px; font-weight:bold; font-size:9pt; background:#f2f2f2;">
          COURSE OUTCOMES (COs) AND ITS RELATIONSHIP TO PROGRAM OUTCOMES (POs)
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:3px 5px; font-weight:bold; width:38%; vertical-align:middle; background:#f2f2f2;">
          After completion of the course, the student should be able to:
        </td>
        ${poHeader}
      </tr>
      ${coRows}
    </table>

    ${pageFooter(pageNum, total)}
  </div>`]
}

function computeCoverageChunks(syllabus) {
  const ilos = syllabus.ilos || []
  if (ilos.length === 0) return []

  const topMap = {}
  ;(syllabus.topics || []).forEach(t => { topMap[t.title] = t })
  const assMap = {}
  ;(syllabus.assessments || []).forEach(a => { assMap[a.tlaName] = a })
  const validCoIds = new Set((syllabus.courseOutcomes || []).map(co => co.id))

  const weekNum = w => parseInt((w || 'Week 0').replace(/Week\s*/i, ''), 10) || 0
  const sorted = [...ilos].sort((a, b) => weekNum(a.deliveryWeek) - weekNum(b.deliveryWeek))

  const getTlas = ilo => (ilo.topics || []).flatMap(tn => (topMap[tn] ? (topMap[tn].tlas || []) : [])).map(t => t.tlaName).filter(Boolean)
  const getAssessments = names => names.map(n => (assMap[n] ? assMap[n].assessmentMethod : n)).filter(Boolean)

  const PERIOD_NAMES = ['PRELIM', 'MIDTERM', 'SEMIFINAL', 'FINAL']
  const PERIOD_TOP_WEEKS = [4, 8, 12, 16]
  const getPeriod = wk => PERIOD_TOP_WEEKS.findIndex(pw => wk <= pw)

  const toBullets = arr => arr.length > 0
    ? '<ul style="margin:0; padding-left:16px;">' + arr.map(n => '<li>' + safe(n) + '</li>').join('') + '</ul>'
    : '<span style="display:inline-block; min-height:1.2em;">&mdash;</span>'

  const buildRow = (ilo, coId, coSpan, isFirst) => ({
    t: 'row',
    coId,
    showCo: isFirst || !coId,
    coSpan,
    iloText: safe(ilo.intendedLearningOutcome || ilo.description),
    topics: (ilo.topics || []).join('<br>') || '&mdash;',
    period: (ilo.deliveryWeek + ' (' + (ilo.allocatedTime || '') + ')').trim(),
    tlaHtml: toBullets(getTlas(ilo)),
    assHtml: toBullets(getAssessments(getTlas(ilo))),
    refHtml: toBullets(ilo.references || [])
  })

  // Phase 1: group sorted ILOs into sections bounded by grading-period shifts
  const sections = []
  let curSec = []
  let curPeriod = -1

  sorted.forEach(ilo => {
    const raw = ilo.id ? ilo.id.split('-')[0] : ''
    const coId = validCoIds.has(raw) ? raw : ''
    const wk = weekNum(ilo.deliveryWeek)
    const period = getPeriod(wk)

    if (period !== curPeriod && curSec.length > 0) {
      sections.push({ period: curPeriod, entries: curSec })
      curSec = []
    }
    curPeriod = period
    curSec.push({ ilo, coId })
  })
  if (curSec.length > 0) sections.push({ period: curPeriod, entries: curSec })

  // Phase 2: within each section, compute contiguous CO groups and emit rows
  const rows = []

  sections.forEach((sec, si) => {
    const secRows = []

    let gs = 0
    for (let i = 0; i < sec.entries.length; i++) {
      const { ilo, coId } = sec.entries[i]

      if (!coId) {
        if (i > gs) {
          const size = i - gs
          for (let j = gs; j < i; j++) {
            secRows.push(buildRow(sec.entries[j].ilo, sec.entries[j].coId, size, j === gs))
          }
        }
        secRows.push(buildRow(ilo, '', 1, true))
        gs = i + 1
        continue
      }

      const next = i + 1 < sec.entries.length ? sec.entries[i + 1] : null
      if (!next || next.coId !== coId) {
        const size = i - gs + 1
        for (let j = gs; j <= i; j++) {
          secRows.push(buildRow(sec.entries[j].ilo, sec.entries[j].coId, size, j === gs))
        }
        gs = i + 1
      }
    }

    rows.push(...secRows)

    if (si < sections.length - 1) {
      rows.push({ t: 'divider', label: PERIOD_NAMES[sec.period] })
    }
  })

  // Estimate row height in pixels based on content wrapping per column width
  const estRowH = (row) => {
    if (row.t === 'divider') return 28
    const CPW = { ilo: 26, topic: 26, tla: 46, assess: 23, ref: 21 }
    const countLines = (html, col) => {
      if (!html) return 1
      const text = html.replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').trim()
      if (!text || text === '—') return 1
      const maxC = CPW[col] || 40
      if (!html.includes('<li>')) return Math.max(1, Math.ceil(text.length / maxC))
      let total = 0
      for (const m of html.match(/<li>([^<]*)<\/li>/g) || []) {
        const t = m.replace(/<[^>]+>/g, '').trim()
        total += Math.max(1, Math.ceil(t.length / maxC))
      }
      return total
    }
    const iloL = countLines(row.iloText, 'ilo')
    const topL = countLines(row.topics, 'topic')
    const tlaL = countLines(row.tlaHtml, 'tla')
    const assL = countLines(row.assHtml, 'assess')
    const refL = countLines(row.refHtml, 'ref')
    const maxLines = Math.max(iloL, topL, tlaL, assL, refL)
    return Math.max(36, maxLines * 20 + 26)
  }

  const MAX_TABLE_H = 370
  const pageChunks = []
  let cur = []
  let curH = 0
  for (const row of rows) {
    const rh = estRowH(row)
    if (cur.length > 0 && curH + rh > MAX_TABLE_H) {
      pageChunks.push(cur)
      cur = []
      curH = 0
    }
    cur.push(row)
    curH += rh
  }
  if (cur.length > 0) pageChunks.push(cur)

  return pageChunks
}

function courseCoveragePages(syllabus, logo, startPageNum, total) {
  const pageChunks = computeCoverageChunks(syllabus)
  if (pageChunks.length === 0) {
    return [`<div class="page page-break">
      ${pageHeader(logo)}
      <h3>COURSE COVERAGE</h3>
      <div style="font-size:10pt; color:#888;">No course coverage data available.</div>
      ${pageFooter(startPageNum, total)}
    </div>`]
  }

  const COLS_W = { co: '6%', ilo: '16%', topic: '16%', period: '7%', tla: '28%', assess: '14%', ref: '13%' }
  const CELL = 'border:1px solid black; padding:4px 6px; vertical-align:top; font-size:10pt; font-family:Arial,Helvetica,sans-serif; line-height:1.35;'
  const TH_STYLE = CELL + 'font-weight:700; text-align:center; background:#fff; color:#000; text-transform:uppercase;'

  return pageChunks.map((chunk, ci) => {
    const pageNum = startPageNum + ci

    const firstInGroup = (arr, idx) => {
      if (idx === 0) return true
      const p = arr[idx - 1]
      return p.t === 'divider' || (p.t === 'row' && p.coId !== arr[idx].coId)
    }

    const firstTopicInGroup = (arr, idx) => {
      if (idx === 0) return true
      const p = arr[idx - 1]
      return p.t === 'divider' || (p.t === 'row' && (p.coId !== arr[idx].coId || p.topics !== arr[idx].topics))
    }

    const countForward = (arr, idx, matchField) => {
      const r = arr[idx]
      if (r.t !== 'row' || !r[matchField]) return 1
      let n = 1
      for (let j = idx + 1; j < arr.length; j++) {
        if (arr[j].t === 'divider') break
        if (arr[j].t === 'row' && arr[j][matchField] === r[matchField] && arr[j].coId === r.coId) n++
        else break
      }
      return n
    }

    const tbodyRows = chunk.map((row, idx) => {
      if (row.t === 'divider') {
        return '<tr><td colspan="7" style="background:#f2f2f2; font-weight:bold; border:1px solid black; padding:4px 6px; font-size:10pt; font-family:Arial,Helvetica,sans-serif;">' + row.label + '</td></tr>'
      }

      const fCo = firstInGroup(chunk, idx)
      const fTop = firstTopicInGroup(chunk, idx) || !row.coId
      const coSpan = fCo && row.coId ? ' rowspan="' + countForward(chunk, idx, 'coId') + '"' : ''
      const topSpan = fTop && row.coId && row.topics !== '&mdash;' ? ' rowspan="' + countForward(chunk, idx, 'topics') + '"' : ''

      return '<tr>' +
        (fCo ? '<td' + coSpan + ' style="width:' + COLS_W.co + '; ' + CELL + 'font-weight:bold; text-align:center;">' + (row.coId || '') + '</td>' : '') +
        '<td style="width:' + COLS_W.ilo + '; ' + CELL + '">' + row.iloText + '</td>' +
        (fTop ? '<td' + topSpan + ' style="width:' + COLS_W.topic + '; ' + CELL + '">' + row.topics + '</td>' : '') +
        '<td style="width:' + COLS_W.period + '; ' + CELL + '">' + row.period + '</td>' +
        '<td style="width:' + COLS_W.tla + '; ' + CELL + '">' + row.tlaHtml + '</td>' +
        '<td style="width:' + COLS_W.assess + '; ' + CELL + '">' + row.assHtml + '</td>' +
        '<td style="width:' + COLS_W.ref + '; ' + CELL + '">' + row.refHtml + '</td>' +
      '</tr>'
    }).join('\n')

    return '<div class="page' + (ci < pageChunks.length - 1 ? ' page-break' : '') + '">\n' +
      pageHeader(logo) + '\n' +
      (ci === 0 ? '<h3>COURSE COVERAGE</h3>\n' : '') +
      '<table style="width:100%; border-collapse:collapse; border:1px solid #000; table-layout:fixed;">\n' +
      (ci === 0 ? '<thead><tr>\n' +
      '<th style="width:' + COLS_W.co + '; ' + TH_STYLE + '">CO</th>\n' +
      '<th style="width:' + COLS_W.ilo + '; ' + TH_STYLE + '">Intended Learning Outcomes (ILOs)</th>\n' +
      '<th style="width:' + COLS_W.topic + '; ' + TH_STYLE + '">Topic</th>\n' +
      '<th style="width:' + COLS_W.period + '; ' + TH_STYLE + '">PERIOD<br>(hours)</th>\n' +
      '<th style="width:' + COLS_W.tla + '; ' + TH_STYLE + '">Teaching &amp; Learning Activities (TLA)</th>\n' +
      '<th style="width:' + COLS_W.assess + '; ' + TH_STYLE + '">Assessment</th>\n' +
      '<th style="width:' + COLS_W.ref + '; ' + TH_STYLE + '">Text/References</th>\n' +
      '</tr></thead>\n' : '') +
      '<tbody>\n' + tbodyRows + '\n</tbody>\n' +
      '</table>\n' +
      pageFooter(pageNum, total) + '\n' +
    '</div>'
  })
}

function computeResourceChunks(syllabus) {
  const refs = syllabus.references || []
  const buckets = [
    { name: 'TEXTBOOKS', items: refs.filter(r => (r.type || '').toLowerCase() === 'textbook'), ph: [{id:'TB1'},{id:'TB2'},{id:'TB3'},{id:'TB4'},{id:'TB5'}], isLink: false, spaceId: false },
    { name: 'OPEN EDUCATIONAL RESOURCES', items: refs.filter(r => { const t = (r.type || '').toLowerCase(); return t.includes('educational') || t === 'open educational resources' }), ph: [{id:'OE1'},{id:'OE2'},{id:'OE3'},{id:'OE4'},{id:'OE5'},{id:'OE6'}], isLink: true, spaceId: true },
    { name: 'ONLINE RESOURCES', items: refs.filter(r => (r.type || '').toLowerCase().includes('online')), ph: [{id:'OR2'},{id:'OR3'},{id:'OR4'},{id:'OR5'},{id:'OR6'},{id:'OR7'},{id:'OR8'},{id:'OR9'},{id:'OR10'}], isLink: true, spaceId: false },
  ]

  const estItemH = 26
  const TABLE_OVERHEAD = 72
  const BUDGET = 480

  const allTables = buckets.map(b => {
    const items = b.items.length > 0 ? b.items : b.ph
    const tableH = TABLE_OVERHEAD + items.length * estItemH
    return { ...b, items, tableH }
  })

  const pages = []
  let cur = []
  let curH = 0

  for (const tbl of allTables) {
    if (cur.length > 0 && curH + tbl.tableH > BUDGET) {
      pages.push(cur)
      cur = []
      curH = 0
    }
    cur.push(tbl)
    curH += tbl.tableH
  }
  if (cur.length > 0) pages.push(cur)
  if (pages.length === 0) pages.push([])

  return pages
}

function resourcesToHtml(chunks, logo, startPageNum, total) {
  const v = (x) => (x != null && x !== '' ? String(x) : '')
  const CELL = 'border:1px solid black; padding:4px 6px; vertical-align:top; font-family:Arial,Helvetica,sans-serif; font-size:10pt; overflow-wrap:break-word; word-break:break-word;'
  const CELL_CODE = CELL + 'font-weight:bold; white-space:nowrap;'
  const CELL_HDR = CELL + 'font-weight:bold; text-align:center; vertical-align:middle;'

  const section = (name, items, isLink, spaceId) => {
    let h = '<table style="width:100%; border-collapse:collapse; border:1px solid black; font-family:Arial,Helvetica,sans-serif; font-size:10pt; margin-bottom:16px; table-layout:fixed;">'
    h += '<colgroup><col style="width:5%"><col style="width:30%"><col style="width:25%"><col style="width:25%"><col style="width:15%"></colgroup>'
    h += '<tr><td colspan="5" style="background:#d9d9d9; font-weight:bold; text-align:center; text-transform:uppercase; ' + CELL + '">' + name + '</td></tr>'
    h += '<tr>' +
      '<td colspan="2" style="' + CELL_HDR + '">TITLE</td>' +
      '<td style="' + CELL_HDR + '">AUTHOR/S</td>' +
      '<td style="' + CELL_HDR + '">' + (isLink ? 'LINK' : 'ISBN') + '</td>' +
      '<td style="' + CELL_HDR + '">PUBLICATION YEAR</td>' +
    '</tr>'
    h += items.map(r => '<tr>' +
      '<td style="' + CELL_CODE + '">' + v(spaceId ? (r.id || '').replace(/^(OE)(\d+)$/i, '$1 $2') : r.id) + '</td>' +
      '<td style="' + CELL + '">' + v(r.title) + '</td>' +
      '<td style="' + CELL + '">' + v(r.authors) + '</td>' +
      '<td style="' + CELL + '">' + v(isLink ? r.link : r.isbn) + '</td>' +
      '<td style="' + CELL + '">' + v(r.year != null ? '' + r.year : '') + '</td>' +
    '</tr>').join('\n')
    h += '</table>'
    return h
  }

  return chunks.map((pageTables, ci) => {
    const pageNum = startPageNum + ci
    const tablesHtml = pageTables.map(t => section(t.name, t.items, t.isLink, t.spaceId)).join('\n')
    return '<div class="page' + (ci < chunks.length - 1 ? ' page-break' : '') + '">\n' +
      pageHeader(logo) + '\n' +
      '<h3>LIST OF RESOURCES</h3>\n' +
      tablesHtml + '\n' +
      pageFooter(pageNum, total) + '\n' +
    '</div>'
  })
}

function page14(syllabus, workflow, logo, pageNum, total) {
  const grading = syllabus.gradingSystem || []

  const gradeRows = grading.length > 0 ? grading.flatMap(g => {
    const co = g.co || ''
    return (g.ilos || []).map(ilo => ({
      co,
      iloId: ilo.id || '',
      assessment: (ilo.assessments || []).join(', '),
      weight: ilo.weight || {},
      minPassing: ilo.minPassing || ''
    }))
  }) : []

  const extractInstructorName = () => { const n = syllabus.instructor || ''; return n || '—' }
  const extractDate = (d) => d ? fmtDate(d) : '_____________'

  const signatories = [
    { label: 'Prepared by:', name: extractInstructorName(), role: 'Faculty', date: extractDate(workflow?.submittedAt) },
    { label: 'Reviewed by:', name: safe(workflow?.parallelReview?.industry_consultant?.reviewerName || '_____________'), role: 'Industry Expert/Consultant', date: extractDate(workflow?.parallelReview?.industry_consultant?.completedAt) },
    { label: 'Resources Certified by:', name: safe(workflow?.parallelReview?.library_director?.reviewerName || '_____________'), role: 'Director of Libraries', date: extractDate(workflow?.parallelReview?.library_director?.completedAt) },
    { label: 'Approved By:', name: safe(workflow?.programHead?.reviewerName || '_____________'), role: 'Program Head', date: extractDate(workflow?.programHead?.completedAt) },
    { label: 'Noted by:', name: safe(workflow?.dean?.reviewerName || '_____________'), role: 'College Dean', date: extractDate(workflow?.dean?.completedAt || workflow?.approvedAt) },
  ]

  const SIG_CELL = 'border:1px solid black; text-align:center; padding:4px 6px; font-family:Arial,Helvetica,sans-serif; vertical-align:top;'
  const bg = (v) => v && v !== '' ? '' : 'background:#d9d9d9;'

  const rows = gradeRows.length > 0 ? gradeRows.map(r => {
    const w = r.weight
    return '<tr>\n' +
      '<td class="center">' + r.co + '</td>\n' +
      '<td style="text-align:left;">' + (r.assessment || '—') + '</td>\n' +
      '<td class="center" style="' + bg(w.prelim) + '">' + (w.prelim || '') + '</td>\n' +
      '<td class="center" style="' + bg(w.midterm) + '">' + (w.midterm || '') + '</td>\n' +
      '<td class="center" style="' + bg(w.semi) + '">' + (w.semi || '') + '</td>\n' +
      '<td class="center" style="' + bg(w.final) + '">' + (w.final || '') + '</td>\n' +
      '<td class="center">' + (r.minPassing || '') + '</td>\n' +
    '</tr>'
  }).join('\n      ') : '<tr><td colspan="7" style="text-align:center;color:#888;">No grading criteria available.</td></tr>'

  return [`<div class="page">
    ${pageHeader(logo)}
    <h3>CRITERIA FOR GRADING</h3>
    <div style="display:flex; gap:2mm;">
      <div style="flex:1;">
        <table class="grading-table" style="font-size:7.5pt;">
          <tr>
            <th rowspan="2" style="width:6mm; background:#fff; color:#000;">COURSE<br>OUTCOME #</th>
            <th rowspan="2" style="width:34mm; background:#fff; color:#000;">ASSESSMENTS</th>
            <th colspan="4" style="background:#fff; color:#000;">WEIGHT</th>
            <th rowspan="2" style="width:8mm; background:#fff; color:#000;">MINIMUM PASSING %</th>
          </tr>
          <tr>
            <th style="width:7mm; background:#fff; color:#000;">Prelim<br>(25%)</th>
            <th style="width:7mm; background:#fff; color:#000;">Midterm<br>(25%)</th>
            <th style="width:7mm; background:#fff; color:#000;">Semifinal<br>(25%)</th>
            <th style="width:7mm; background:#fff; color:#000;">Final<br>(25%)</th>
          </tr>
          ${rows}
          <tr style="font-weight:bold;">
            <td colspan="2" style="text-align:right; padding-right:4px; border:1px solid #000; padding:1mm 1.5mm;">TOTAL</td>
            <td class="center">100%</td>
            <td class="center">100%</td>
            <td class="center">100%</td>
            <td class="center">100%</td>
            <td class="center"></td>
          </tr>
        </table>
      </div>
      <div style="width:36mm;">
        <table class="grading-table" style="font-size:7.5pt; table-layout:fixed;">
          <tr><th colspan="2" style="font-size:7.5pt; background:#fff; color:#000;">GRADING SCALE</th></tr>
          <tr><th style="width:18mm; background:#fff; color:#000;">Percentage<br>Grade</th><th style="width:18mm; background:#fff; color:#000;">Equivalent<br>Grade</th></tr>
          <tr><td class="center">99-100</td><td class="center">1.00</td></tr>
          <tr><td class="center">96-98</td><td class="center">1.25</td></tr>
          <tr><td class="center">93-95</td><td class="center">1.50</td></tr>
          <tr><td class="center">90-92</td><td class="center">1.75</td></tr>
          <tr><td class="center">87-89</td><td class="center">2.00</td></tr>
          <tr><td class="center">84-86</td><td class="center">2.25</td></tr>
          <tr><td class="center">81-83</td><td class="center">2.50</td></tr>
          <tr><td class="center">78-80</td><td class="center">2.75</td></tr>
          <tr><td class="center">75-77</td><td class="center">3.00</td></tr>
          <tr><td class="center">&lt;75</td><td class="center">5.00</td></tr>
          <tr><td class="center">DROPPED</td><td class="center">DRP</td></tr>
        </table>
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; border:1px solid black; font-size:8pt; margin-top:3mm;">
      <tr>
        ${signatories.map(s => '<td style="' + SIG_CELL + 'background:#d9d9d9; font-weight:bold;">' + s.label + '</td>').join('\n        ')}
      </tr>
      <tr>
        ${signatories.map(s => '<td style="' + SIG_CELL + 'font-weight:bold; padding-top:20px;">' + s.name + '<br><span style="font-size:7.5pt; font-weight:normal;">' + s.role + '</span></td>').join('\n        ')}
      </tr>
      <tr>
        ${signatories.map(s => '<td style="' + SIG_CELL + 'font-size:7.5pt;">Date: ' + s.date + '</td>').join('\n        ')}
      </tr>
    </table>

    ${pageFooter(pageNum, total)}
  </div>`]
}

export function buildSyllabusHtml(syllabus, courseCode, workflow, logoBase64) {
  if (!syllabus) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, Helvetica, sans-serif; padding: 40px; text-align: center; color: #888; }
</style></head><body>
  <h2>No syllabus data available</h2>
  <p>Course code: ${safe(courseCode)}</p>
</body></html>`
  }

  const HEAD = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { overflow: hidden; }
  body, table, td, th, div, p, span { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #000; line-height: 1.3; overflow-wrap: break-word; word-break: break-word; min-height: 0; }
  .page { box-sizing: border-box; position: relative; display: flex; flex-direction: column; }
  .page > * { min-height: 0; }
  @media screen {
    .page { background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.12); margin: 24px auto; width: 330mm; height: 216mm; overflow: visible; padding: 50px 75px 35px 75px; page-break-after: always; }
  }
  @media print {
    html, body { overflow: visible; }
    .page { box-shadow: none; margin: 0; width: 330mm; height: 216mm; overflow: hidden; padding: 50px 75px 35px 75px; page-break-after: always; }
  }
  @page { size: 330mm 216mm; margin: 0; }
  .page-break { page-break-after: always; }

  h3 { font-size: 10pt; font-weight: 700; margin: 2mm 0 1mm; text-transform: uppercase; letter-spacing: 0.3pt; }
  h4 { font-size: 9.5pt; font-weight: 600; margin: 2mm 0 1mm; }

  table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 2mm; }
  th, td { border: 1px solid #000; padding: 1mm 1.5mm; text-align: left; vertical-align: top; }
  th { background: #404040; color: #fff; font-weight: 700; text-align: center; font-size: 9pt; }
  td { text-align: justify; }
  td.center { text-align: center; }

  td.syllabus-label { font-weight: bold; color: #000; font-size: 9pt; }
  td.syllabus-value-blue { color: #1155CC; font-size: 9pt; }
  td.syllabus-value-plain { color: #000; font-size: 9pt; }

  .course-details-table { width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9pt; color: #000; }
  .course-details-table td { border: 1px solid #000; height: auto; min-height: 0; vertical-align: top; padding: 3px 5px; }
  .course-details-table tr { height: auto; }

  .co-po-table { margin-bottom: 0; }
  .co-po-table td:first-child { width: 38%; font-size: 8.5pt; vertical-align: top; padding: 3px 5px; }
  .co-po-table td:not(:first-child) { width: 4.77%; text-align: center; vertical-align: middle; padding: 2px 1px; font-size: 8.5pt; white-space: nowrap; overflow: hidden; }

  .grading-table th, .grading-table td { padding: 0.8mm 0.5mm; overflow-wrap:break-word; }
</style>
</head>
<body>`

  const FOOT = `</body></html>`

  const logo = logoBase64 || null

  const covChunks = computeCoverageChunks(syllabus)
  const resChunks = computeResourceChunks(syllabus)
  const total = 4 + 1 + covChunks.length + resChunks.length + 1

  const allPages = [
    page1(logo, total),
    page2(logo, total),
    page3(logo, total),
    page4(syllabus, logo, total),
    ...page5(syllabus, logo, 5, total),
    ...courseCoveragePages(syllabus, logo, 6, total),
    ...resourcesToHtml(resChunks, logo, 6 + covChunks.length, total),
    ...page14(syllabus, workflow, logo, 6 + covChunks.length + resChunks.length, total),
  ]

  return HEAD + allPages.join('\n') + FOOT
}