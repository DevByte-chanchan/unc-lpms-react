import { escapeHtml } from './sanitize.js'
const safe = (v, fallback = '—') => (v === null || v === undefined || v === '') ? fallback : escapeHtml(String(v))

const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

const poLabels = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12', 'PO13']

const activePoColumns = (courseOutcomes) => {
  const active = []
  for (let i = 0; i < poLabels.length; i++) {
    if (courseOutcomes.some(co => (co.poMappings || [])[i] && (co.poMappings || [])[i].trim())) {
      active.push(i)
    }
  }
  return active
}

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

const pageFooter = (pageNum, total) => `<div style="position:absolute; left:85px; right:85px; bottom:26px; display:flex; justify-content:space-between; padding-top:4px; font-size:8.5pt; font-family:Arial,Helvetica,sans-serif;">
  <span>Effectivity: 06/01/2024</span>
  <span>Revision No.: 0</span>
  <span>Page No.: <span class="pgno">${pageNum}</span> of <span class="pgtot">${total}</span></span>
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
            <li><strong>We Do The Right Things Right.</strong> We uphold integrity in everything we do. We hold ourselves to high standards for accountability and character. We do things right.</li>
            <li><strong>We Are Dynamic and Creative.</strong> We anticipate the forces of change. We explore possibilities with intent and purpose.</li>
            <li><strong>We Respect Each Other and Work As A Team.</strong> We collaboratively maximize our talents and capabilities. We hold each other in high regard and passionately realize our shared purpose, priorities and promises.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td style="font-weight:700; border:1px solid #000; padding:4px 6px; vertical-align:top;">GRADUATE ATTRIBUTES</td>
        <td style="border:1px solid #000; padding:4px 6px;">
          <p style="margin:2px 0;"><strong>Excellent Communicator.</strong> Ability to effectively use oral and written skills in sharing and receiving updated and verified information in various communication channels.</p>
          <p style="margin:2px 0;"><strong>Creative Leader.</strong> Ability to critically think of solutions and strategies that contribute to making great decisions and innovation that promote societal development.</p>
          <p style="margin:2px 0;"><strong>Ethically Responsible Citizen.</strong> Ability to harmoniously live and work with others with trust, dignity and integrity, promoting respect for human rights, multicultural understanding, and preservation of cultural heritage.</p>
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
        <td style="width:34px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">1</td>
        <td style="width:34px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">2</td>
        <td style="width:34px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">3</td>
        <td colspan="2" style="border:1px solid #000; padding:2px 4px; text-align:left;">By the time of graduation, the students of the <strong>BSIT</strong> program shall have the ability to:</td>
        <td style="width:36px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">EC</td>
        <td style="width:36px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">CL</td>
        <td style="width:36px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">ERC</td>
        <td style="width:36px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">LL</td>
      </tr>
      ${poData.map((po, i) => `<tr>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.peos.includes(1) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.peos.includes(2) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.peos.includes(3) ? '&#x2714;' : ''}</td>
        <td style="width:52px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">PO${i + 1}</td>
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
        ${VP(safe(syllabus.sdg, '&mdash;'))}
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

  const activeCols = activePoColumns(courseOutcomes)
  const poCount = activeCols.length

  const poHeader = activeCols.map(i =>
    `<td style="border:1px solid #000; padding:2px; text-align:center; font-weight:bold; font-size:8.5pt; background:#f2f2f2;">${poLabels[i]}</td>`
  ).join('\n        ')

  const coRows = courseOutcomes.map(co => {
    const pm = co.poMappings || []
    return `<tr>
      <td style="border:1px solid #000; padding:3px 5px; vertical-align:top; font-size:8pt;">${safe(co.description)}</td>
      ${activeCols.map(i =>
        `<td style="border:1px solid #000; text-align:center; vertical-align:middle; font-size:8.5pt; padding:2px 1px;">${pm[i] || ''}</td>`
      ).join('\n        ')}
    </tr>`
  }).join('\n      ')

  return [`<div class="page page-break">
    ${pageHeader(logo)}
    <table class="co-po-table" style="width:100%; border-collapse:collapse; border:1px solid #000; font-size:8.5pt; color:#000;">
      <tr>
        <td colspan="${1 + poCount}" style="border:1px solid #000; padding:3px 6px; font-weight:bold; font-size:9pt; background:#f2f2f2;">
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

  const weekNum = w => parseInt((w || 'Week 0').replace(/Week\s*/i, ''), 10) || 0
  const sorted = [...ilos].sort((a, b) => weekNum(a.deliveryWeek) - weekNum(b.deliveryWeek))

  const PHASES = ['Pre-class', 'In-class', 'Post-class']
  const PHASE_LABELS = { 'Pre-class': 'Pre-class', 'In-class': 'In-class', 'Post-class': 'Post-class' }

  const getTlasByIlo = ilo => {
    const ph = { 'Pre-class': [], 'In-class': [], 'Post-class': [] }
    const phaseOrder = []
    ;(ilo.topics || []).forEach(tn => {
      const topic = topMap[tn]
      if (!topic) return
      ;(topic.tlas || []).forEach(t => {
        const p = t.classPhase || 'In-class'
        const norm = PHASES.includes(p) ? p : 'In-class'
        if (!ph[norm].length) phaseOrder.push(norm)
        ph[norm].push(t)
      })
    })
    return { ph, phaseOrder }
  }

  const oneTlaLi = (t) => {
    let label = safe(t.tlaName || '')
    if (t.performedBy === 'Instructor') label += ' [I]'
    if (t.performedBy === 'Student') label += ' [S]'
    if (t.laboratory) label += ' <span style="font-size:8pt;color:#555;">(Lab)</span>'
    if (t.tlaDescription) label += '<br><span style="font-size:8pt;color:#555;">' + safe(t.tlaDescription) + '</span>'
    return '<li>' + label + '</li>'
  }

  // Fine-grained splittable units: a phase label, then each activity as its own
  // <ul><li>. These are the boundaries at which a too-tall row is split across
  // pages, so even a single phase with many activities can paginate cleanly.
  const buildTlaParts = (ilo) => {
    const { ph, phaseOrder } = getTlasByIlo(ilo)
    const units = []
    phaseOrder.filter(p => ph[p].length).forEach(p => {
      // Keep each phase label attached to its FIRST activity so the label and its
      // bullets are always in the same row (never split into separate pieces, which
      // would let a tall neighbouring column push the bullets far below the label).
      const label = '<div style="font-weight:600;font-size:8pt;text-decoration:underline;margin:2px 0 1px;">' + PHASE_LABELS[p] + '</div>'
      ph[p].forEach((t, idx) => {
        units.push((idx === 0 ? label : '') + '<ul style="margin:0; padding-left:16px;">' + oneTlaLi(t) + '</ul>')
      })
    })
    return units.length ? units : ['&mdash;']
  }

  const buildAssessmentsHtml = (ilo) => {
    const seen = {}
    const items = []
    ;(ilo.topics || []).forEach(tn => {
      const topic = topMap[tn]
      if (!topic) return
      ;(topic.tlas || []).forEach(t => {
        const a = assMap[t.tlaName]
        if (!a) return
        const key = a.id || a.assessmentMethod
        if (seen[key]) return
        seen[key] = true
        let label = safe(a.assessmentMethod || '')
        if (a.description) label += '<br><span style="font-size:8pt;color:#555;">' + safe(a.description) + '</span>'
        items.push('<li>' + label + '</li>')
      })
    })
    return items.length ? '<ul style="margin:0; padding-left:16px;">' + items.join('') + '</ul>' : '&mdash;'
  }

  const buildTopicsHtml = (ilo) => {
    if (!ilo.topics || !ilo.topics.length) return '&mdash;'
    const parts = []
    ilo.topics.forEach(tn => {
      const topic = topMap[tn]
      if (!topic) return
      let html = '<div style="font-weight:600;">' + safe(tn) + '</div>'
      if (topic.subtopics && topic.subtopics.length) {
        html += '<ul style="margin:0 0 4px 16px;padding:0;">' + topic.subtopics.map(s =>
          '<li style="font-size:8.5pt;">' + safe(s.value || s.title || '') + '</li>'
        ).join('') + '</ul>'
      }
      parts.push(html)
    })
    return parts.join('<br>')
  }

  const PERIOD_NAMES = ['PRELIM', 'MIDTERM', 'SEMIFINAL', 'FINAL']
  const PERIOD_TOP_WEEKS = [4, 8, 12, 16]
  const getPeriod = wk => PERIOD_TOP_WEEKS.findIndex(pw => wk <= pw)

  const toBullets = arr => arr.length > 0
    ? '<ul style="margin:0; padding-left:16px;">' + arr.map(n => '<li>' + safe(n) + '</li>').join('') + '</ul>'
    : '<span style="display:inline-block; min-height:1.2em;">&mdash;</span>'

  const buildRow = (ilo, coId, coSpan, isFirst) => {
    const tlaParts = buildTlaParts(ilo)
    return {
      t: 'row',
      coId,
      showCo: isFirst || !coId,
      coSpan,
      iloText: safe(ilo.intendedLearningOutcome || ilo.description),
      topics: buildTopicsHtml(ilo),
      period: (ilo.deliveryWeek + ' (' + (ilo.allocatedTime || '') + ')').trim(),
      tlaHtml: tlaParts.join(''),
      tlaParts,
      assHtml: buildAssessmentsHtml(ilo),
      refHtml: toBullets(ilo.references || [])
    }
  }

  // Phase 1: group sorted ILOs into sections bounded by grading-period shifts
  const sections = []
  let curSec = []
  let curPeriod = -1

  sorted.forEach(ilo => {
    const coId = ilo.id ? ilo.id.split('-')[0] : ''
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

  // Stamp a stable CO-group id (_cg) and topic-group id (_tk) on each row. The
  // client's measured re-pagination uses these to rebuild the CO/Topic rowspans
  // after it re-packs rows by their real (measured) heights. A new group starts
  // whenever the CO changes, the topic text changes, or a period divider appears.
  {
    let cg = 0, tk = 0, ig = 0
    let prevCo = ' ', prevTopic = ' ', brk = true
    rows.forEach((r) => {
      if (r.t === 'divider') { brk = true; return }
      const co = r.coId || ''
      const coChanged = brk || co !== prevCo || !co
      if (coChanged) cg++
      if (coChanged || r.topics !== prevTopic) tk++
      r._cg = cg
      r._tk = tk
      r._ig = ++ig
      prevCo = co; prevTopic = r.topics; brk = false
    })
  }

  // Estimate a cell's rendered pixel height. Accounts for the fact that description
  // text is 8pt (fits more characters per line and is shorter per line) while names,
  // ILO/topic text, etc. are 10pt — so dense TLA cells are no longer ~1.7× over-counted.
  const cellHeight = (html, cpw10, cpw8) => {
    if (!html || html === '&mdash;') return 20
    let h = 8 // cell vertical padding
    // phase labels (8pt bold underline divs) ~16px each
    h += ((html.match(/text-decoration:underline/g) || []).length) * 16
    // 8pt description / detail spans: ~14px per line, ~cpw8 chars per line
    const descRe = /font-size:8pt[^>]*>([\s\S]*?)<\/span>/g
    let m
    while ((m = descRe.exec(html))) {
      const t = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (t) h += Math.max(1, Math.ceil(t.length / cpw8)) * 14
    }
    // remaining 10pt text (names, ilo/topic text, plain bullets): ~18px per line
    const rest = html
      .replace(descRe, ' ')
      .replace(/<div[^>]*text-decoration:underline[\s\S]*?<\/div>/g, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/li>|<li>|<\/div>|<div[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ')
    rest.split('\n').forEach((s) => {
      const t = s.replace(/\s+/g, ' ').trim()
      if (t && t !== '—') h += Math.max(1, Math.ceil(t.length / cpw10)) * 18
    })
    return h
  }

  const estRowH = (row) => {
    if (row.t === 'divider') return 28
    const heights = [
      cellHeight(row.iloText, 30, 30),
      cellHeight(row.topics, 30, 30),
      cellHeight(row.tlaHtml, 46, 62),
      cellHeight(row.assHtml, 30, 46),
      cellHeight(row.refHtml, 26, 26),
    ]
    return Math.max(40, Math.max(...heights))
  }

  // Per-page budget for the coverage table body, set close to the true usable
  // height so pages fill efficiently. Continuation pages have the full height;
  // the first coverage page is shorter because it also carries the section title,
  // so it gets FIRST_H3 less. A split piece must fit even that shorter first page.
  const MAX_TABLE_H = 525
  const FIRST_H3 = 26

  // ── Split only over-tall ILOs ────────────────────────────────────────────────
  // Keep each ILO as ONE row so its TLA activities flow naturally in a single cell
  // (no internal gaps even when a neighbouring column like Topic is tall). Split an
  // ILO into page-sized pieces ONLY when the whole ILO is taller than a page, so
  // nothing is ever un-paginatable. Split pieces share _ig/_cg/_tk and merge by
  // border; the ILO/period/assessment/reference cells appear on the first piece only.
  const MAX_ROW_H = MAX_TABLE_H - FIRST_H3
  const partH = (p) => cellHeight(p, 46, 62)
  const atoms = []
  for (const row of rows) {
    if (row.t !== 'row' || !row.tlaParts || row.tlaParts.length <= 1 || estRowH(row) <= MAX_ROW_H) {
      atoms.push(row); continue
    }
    // group the ILO's TLA parts into page-sized pieces
    const groups = []
    let g = [], gh = 0
    for (const p of row.tlaParts) {
      const h = partH(p)
      if (g.length && gh + h > MAX_ROW_H) { groups.push(g); g = []; gh = 0 }
      g.push(p); gh += h
    }
    if (g.length) groups.push(g)
    groups.forEach((gp, gi) => {
      const first = gi === 0
      const last = gi === groups.length - 1
      atoms.push({
        ...row,
        tlaHtml: gp.join(''),
        tlaParts: gp,
        iloText: first ? row.iloText : '',
        period: first ? row.period : '',
        assHtml: first ? row.assHtml : '',
        refHtml: first ? row.refHtml : '',
        mergeUp: !first || !!row.mergeUp,
        mergeDown: !last || !!row.mergeDown,
      })
    })
  }

  // Per-column merge flags (GLOBAL, pagination-independent). Instead of rowspan,
  // each column hides the internal border between two consecutive atoms that belong
  // to the same group (CO / topic / ILO), which reads exactly like a merged cell.
  // The CO and topic LABEL is shown only on the first atom of its group; the rest
  // are blank. Because the table's own outer border is drawn at page edges, this
  // stays correct no matter where the page break lands — so the client only has to
  // distribute atoms into pages, never re-touch borders or rowspans.
  atoms.forEach((a, i) => {
    if (a.t === 'divider') return
    const pv = i > 0 && atoms[i - 1].t !== 'divider' ? atoms[i - 1] : null
    const nx = i < atoms.length - 1 && atoms[i + 1].t !== 'divider' ? atoms[i + 1] : null
    a._showCo = !pv || pv._cg !== a._cg
    a._showTk = !pv || pv._tk !== a._tk
    a._mCoTop = !!(pv && pv._cg === a._cg); a._mCoBot = !!(nx && nx._cg === a._cg)
    a._mTkTop = !!(pv && pv._tk === a._tk); a._mTkBot = !!(nx && nx._tk === a._tk)
    a._mIgTop = !!(pv && pv._ig === a._ig); a._mIgBot = !!(nx && nx._ig === a._ig)
  })

  // Estimate-based packing of the atoms — this is only the FALLBACK layout used if
  // the client's measured re-pagination script does not run. The measured script
  // re-packs these same atoms using their real heights to fill each page exactly.
  const pageChunks = []
  let cur = []
  let curH = 0
  for (const a of atoms) {
    const rh = estRowH(a)
    const budget = MAX_TABLE_H - (pageChunks.length === 0 ? FIRST_H3 : 0)
    if (cur.length > 0 && curH + rh > budget) {
      const carried = []
      while (cur.length && cur[cur.length - 1].t === 'divider') carried.unshift(cur.pop())
      if (cur.length > 0) {
        pageChunks.push(cur)
        cur = carried
        curH = carried.reduce((s, r) => s + estRowH(r), 0)
      }
    }
    cur.push(a)
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

    // Per-column border-merge: hide the internal border between two atoms of the
    // same group so each column reads like one merged (rowspan) cell — but with no
    // rowspan, so the client can freely move atoms between pages. The table's own
    // outer border draws the edge wherever a page break lands.
    const mb = (top, bot) => (top ? 'border-top:none;' : '') + (bot ? 'border-bottom:none;' : '')

    const tbodyRows = chunk.map((row) => {
      if (row.t === 'divider') {
        return '<tr data-div="1"><td data-c="div" colspan="7" style="background:#f2f2f2; font-weight:bold; border:1px solid black; padding:4px 6px; font-size:10pt; font-family:Arial,Helvetica,sans-serif;">' + row.label + '</td></tr>'
      }
      const coBm = mb(row._mCoTop, row._mCoBot)
      const tkBm = mb(row._mTkTop, row._mTkBot)
      const igBm = mb(row._mIgTop, row._mIgBot)
      // collapse inter-atom vertical padding so a split ILO's pieces (e.g. a phase
      // label and its bullets) sit tight together, like one continuous cell.
      const igPad = (row._mIgTop ? 'padding-top:0;' : '') + (row._mIgBot ? 'padding-bottom:0;' : '')
      const igStyle = igBm + igPad
      const attrs = ' data-cg="' + (row._cg || '') + '" data-tk="' + (row._tk || '') + '" data-ig="' + (row._ig || '') + '"'
      return '<tr' + attrs + '>' +
        '<td data-c="co" style="width:' + COLS_W.co + '; ' + CELL + coBm + 'font-weight:bold; text-align:center;">' + (row._showCo ? (row.coId || '') : '') + '</td>' +
        '<td data-c="ilo" style="width:' + COLS_W.ilo + '; ' + CELL + igStyle + '">' + row.iloText + '</td>' +
        '<td data-c="topic" style="width:' + COLS_W.topic + '; ' + CELL + tkBm + '">' + (row._showTk ? row.topics : '') + '</td>' +
        '<td data-c="period" style="width:' + COLS_W.period + '; ' + CELL + igStyle + '">' + row.period + '</td>' +
        '<td data-c="tla" style="width:' + COLS_W.tla + '; ' + CELL + igStyle + '">' + row.tlaHtml + '</td>' +
        '<td data-c="assess" style="width:' + COLS_W.assess + '; ' + CELL + igStyle + '">' + row.assHtml + '</td>' +
        '<td data-c="ref" style="width:' + COLS_W.ref + '; ' + CELL + igStyle + '">' + row.refHtml + '</td>' +
      '</tr>'
    }).join('\n')

    const colgroup = '<colgroup>' +
      '<col style="width:' + COLS_W.co + '">' +
      '<col style="width:' + COLS_W.ilo + '">' +
      '<col style="width:' + COLS_W.topic + '">' +
      '<col style="width:' + COLS_W.period + '">' +
      '<col style="width:' + COLS_W.tla + '">' +
      '<col style="width:' + COLS_W.assess + '">' +
      '<col style="width:' + COLS_W.ref + '">' +
    '</colgroup>\n'

    return '<div class="page cov-pg' + (ci < pageChunks.length - 1 ? ' page-break' : '') + '">\n' +
      pageHeader(logo) + '\n' +
      (ci === 0 ? '<h3 class="cov-h3">COURSE COVERAGE</h3>\n' : '') +
      '<table class="cov-table" style="width:100%; border-collapse:collapse; border:1px solid #000; table-layout:fixed;">\n' +
      colgroup +
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

  const prefixMap = { TEXTBOOKS: 'TB', 'OPEN EDUCATIONAL RESOURCES': 'OE', 'ONLINE RESOURCES': 'OR' }
  const rawBuckets = [
    { name: 'TEXTBOOKS', items: refs.filter(r => (r.type || '').toLowerCase() === 'textbook'), isLink: false },
    { name: 'OPEN EDUCATIONAL RESOURCES', items: refs.filter(r => { const t = (r.type || '').toLowerCase(); return t.includes('educational') || t === 'open educational resources' }), isLink: true },
    { name: 'ONLINE RESOURCES', items: refs.filter(r => (r.type || '').toLowerCase().includes('online')), isLink: true },
  ]

  const estItemH = 34
  const TABLE_OVERHEAD = 72
  const BUDGET = 470

  const buckets = rawBuckets
    .filter(b => b.items.length > 0)
    .map(b => {
      const pref = prefixMap[b.name] || 'ID'
      const labeled = b.items.map((r, i) => ({ ...r, _displayId: pref + (i + 1) }))
      const tableH = TABLE_OVERHEAD + labeled.length * estItemH
      return { ...b, items: labeled, tableH }
    })

  const pages = []
  let cur = []
  let curH = 0

  for (const tbl of buckets) {
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

  const section = (name, items, isLink) => {
    let h = '<table style="width:100%; border-collapse:collapse; border:1px solid black; font-family:Arial,Helvetica,sans-serif; font-size:10pt; margin-bottom:16px; table-layout:fixed;">'
    h += '<colgroup><col style="width:5%"><col style="width:30%"><col style="width:25%"><col style="width:25%"><col style="width:15%"></colgroup>'
    h += '<tr><td colspan="5" style="background:#d9d9d9; font-weight:bold; text-align:center; text-transform:uppercase; ' + CELL + '">' + name + '</td></tr>'
    h += '<tr>' +
      '<td style="' + CELL_HDR + '">ID</td>' +
      '<td style="' + CELL_HDR + '">TITLE</td>' +
      '<td style="' + CELL_HDR + '">AUTHOR/S</td>' +
      '<td style="' + CELL_HDR + '">' + (isLink ? 'LINK' : 'ISBN') + '</td>' +
      '<td style="' + CELL_HDR + '">PUBLICATION YEAR</td>' +
    '</tr>'
    h += items.map(r => '<tr>' +
      '<td style="' + CELL_CODE + '">' + v(r._displayId || r.id) + '</td>' +
      '<td style="' + CELL + '">' + v(r.title) + '</td>' +
      '<td style="' + CELL + '">' + v(r.authors) + '</td>' +
      '<td style="' + CELL + '">' + (isLink && r.link ? '<a href="' + r.link.replace(/"/g,'&quot;') + '" style="color:#0000EE; text-decoration:underline;">' + v(r.link) + '</a>' : v(r.isbn)) + '</td>' +
      '<td style="' + CELL + '">' + v(r.year != null ? '' + r.year : '') + '</td>' +
    '</tr>').join('\n')
    h += '</table>'
    return h
  }

  return chunks.map((pageTables, ci) => {
    const pageNum = startPageNum + ci
    const tablesHtml = pageTables.map(t => section(t.name, t.items, t.isLink)).join('\n')
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
    return (g.ilos || []).map((ilo, idx) => ({
      co,
      iloNum: idx + 1,
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
      '<td class="center">ILO ' + r.iloNum + '</td>\n' +
      '<td style="text-align:left;">' + (r.assessment || '—') + '</td>\n' +
      '<td class="center" style="' + bg(w.prelim) + '">' + (w.prelim || '') + '</td>\n' +
      '<td class="center" style="' + bg(w.midterm) + '">' + (w.midterm || '') + '</td>\n' +
      '<td class="center" style="' + bg(w.semi) + '">' + (w.semi || '') + '</td>\n' +
      '<td class="center" style="' + bg(w.final) + '">' + (w.final || '') + '</td>\n' +
      '<td class="center">' + (r.minPassing || '') + '</td>\n' +
    '</tr>'
  }).join('\n      ') : '<tr><td colspan="8" style="text-align:center;color:#888;">No grading criteria available.</td></tr>'

  return [`<div class="page">
    ${pageHeader(logo)}
    <h3>CRITERIA FOR GRADING</h3>
    <div style="display:flex; gap:2mm;">
      <div style="flex:1;">
        <table class="grading-table" style="font-size:7.5pt;">
          <tr>
            <th rowspan="2" style="width:6mm; background:#fff; color:#000;">COURSE<br>OUTCOME #</th>
            <th rowspan="2" style="width:6mm; background:#fff; color:#000;">ILO #</th>
            <th rowspan="2" style="width:30mm; background:#fff; color:#000;">ASSESSMENTS</th>
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
            <td colspan="3" style="text-align:right; padding-right:4px; border:1px solid #000; padding:1mm 1.5mm;">TOTAL</td>
            <td class="center">100%</td>
            <td class="center">100%</td>
            <td class="center">100%</td>
            <td class="center">100%</td>
            <td class="center"></td>
          </tr>
        </table>
      </div>
      <div style="width:50mm;">
        <table class="grading-table" style="font-size:7.5pt; table-layout:fixed;">
          <tr><th colspan="2" style="font-size:7.5pt; background:#fff; color:#000;">GRADING SCALE</th></tr>
          <tr><th style="width:25mm; background:#fff; color:#000;">Percentage Grade</th><th style="width:25mm; background:#fff; color:#000;">Equivalent Grade</th></tr>
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
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; line-height: 1.35; overflow-wrap: break-word; word-break: normal; }
  .page { box-sizing: border-box; position: relative; display: flex; flex-direction: column; }
  .page > * { min-height: 0; flex-shrink: 1; flex-basis: auto; }
  @media screen {
    .page { background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.12); margin: 24px auto; width: 330mm; height: 216mm; overflow: hidden; padding: 42px 85px 32px 85px; page-break-after: always; }
  }
  @media print {
    html, body { overflow: visible; }
    .page { box-shadow: none; margin: 0; width: 330mm; height: 216mm; overflow: hidden; padding: 42px 85px 32px 85px; page-break-after: always; }
    table { page-break-inside: auto; }
    tr, td, th { page-break-inside: avoid; break-inside: avoid; }
    thead { display: table-header-group; }
    img { page-break-inside: avoid; }
  }
  @page { size: 330mm 216mm; margin: 0; }
  .page-break { page-break-after: always; }
  h3 { font-size: 10pt; font-weight: 700; margin: 2mm 0 1mm; text-transform: uppercase; letter-spacing: 0.3pt; }
  h4 { font-size: 9.5pt; font-weight: 600; margin: 2mm 0 1mm; }

  table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 2mm; }
  th, td { border: 1px solid #000; padding: 1mm 1.5mm; text-align: left; vertical-align: top; }
  th { background: #404040; color: #fff; font-weight: 700; text-align: center; font-size: 9pt; }
  td.center { text-align: center; }

  .course-details-table { width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9pt; color: #000; }
  .course-details-table td { border: 1px solid #000; height: auto; min-height: 0; vertical-align: top; padding: 3px 5px; }
  .course-details-table tr { height: auto; }

  .co-po-table { margin-bottom: 0; }
  .co-po-table td:first-child { width: 38%; font-size: 8.5pt; vertical-align: top; padding: 3px 5px; }
  .co-po-table td:not(:first-child) { text-align: center; vertical-align: middle; padding: 2px 1px; font-size: 8.5pt; white-space: nowrap; overflow: hidden; }

  .grading-table th, .grading-table td { padding: 0.8mm 0.5mm; overflow-wrap:break-word; }
  /* Coverage pages: keep natural heights so the fill-to-footer script measures rows reliably. */
  .cov-pg > * { flex-shrink: 0; }
</style>
</head>
<body>`

  // Measured re-pagination: after the browser lays out the estimate-based coverage
  // pages, this script measures the REAL height of every coverage row and re-packs
  // them so each page fills right up near the footer — consistently on every page,
  // never overflowing. It rebuilds the CO/Topic rowspans per page (so tables stay
  // continuous, not "putol-putol") and renumbers all footers. Runs in both the
  // preview iframe and the Puppeteer export. Any error falls back to the estimate
  // layout untouched. Only cell CONTENT moves between pages — nothing is restyled.
  const REPAG_SCRIPT = `<script>
(function(){
  function renumber(){
    var all=document.querySelectorAll('.page');var tot=all.length;
    for(var i=0;i<all.length;i++){
      var n=all[i].querySelector('.pgno');if(n)n.textContent=(i+1);
      var t=all[i].querySelector('.pgtot');if(t)t.textContent=tot;
    }
  }
  function footLimit(pg){
    // viewport Y of the "designated line" — just above the fixed footer
    var pn=pg.querySelector('.pgno');var foot=pn?pn.parentNode:null;
    while(foot&&foot.tagName!=='DIV')foot=foot.parentNode;
    return foot?foot.getBoundingClientRect().top-4:1e9;
  }
  // Extend a finished page's table down to the SAME line on every page, so all
  // pages look identical in height. A seamless empty filler row (no top border,
  // merges with the last row) carries the table's bottom border to the line.
  function addFiller(pg){
    var tbl=pg.querySelector('table.cov-table');if(!tbl)return;
    var tb=tbl.querySelector('tbody');if(!tb||!tb.children.length)return;
    var gap=footLimit(pg)-tbl.getBoundingClientRect().bottom;
    if(gap<=3)return;
    var lastRow=tb.lastElementChild;
    if(lastRow)for(var c=0;c<lastRow.children.length;c++)lastRow.children[c].style.borderBottom='none';
    var tr=document.createElement('tr');
    for(var k=0;k<7;k++){var td=document.createElement('td');td.style.cssText='border:1px solid black;border-top:none;padding:0;';tr.appendChild(td);}
    tr.style.height=gap+'px';
    tb.appendChild(tr);
  }
  // A "unit" is one bullet (<li>) or a top-level block (e.g. a topic name / phase
  // label <div>). These are the smallest chunks we move between pages.
  function unitCount(cell){
    var n=0,ch=cell.children;
    for(var i=0;i<ch.length;i++){ if(ch[i].tagName==='UL') n+=ch[i].querySelectorAll(':scope>li').length; else n++; }
    return n;
  }
  function popLastUnit(cell){
    var last=cell.lastElementChild;
    while(last){
      if(last.tagName==='UL'){
        var li=last.lastElementChild;
        if(li){ last.removeChild(li); if(!last.lastElementChild)cell.removeChild(last); return true; }
        cell.removeChild(last); last=cell.lastElementChild; continue;
      }
      cell.removeChild(last); return true;
    }
    return false;
  }
  function removeFirstUnit(cell){
    var first=cell.firstElementChild;
    while(first){
      if(first.tagName==='UL'){
        var li=first.firstElementChild;
        if(li){ first.removeChild(li); if(!first.firstElementChild)cell.removeChild(first); return true; }
        cell.removeChild(first); first=cell.firstElementChild; continue;
      }
      cell.removeChild(first); return true;
    }
    return false;
  }
  // Split a too-tall row at the footer line by trimming ONLY the TLA column (the
  // list of activities, which naturally continues across pages). The ILO's context
  // — Topic, ILO text, Assessment, References — always stays WHOLE on the head, so
  // a topic never gets stranded on the continuation page. If the row still doesn't
  // fit after trimming TLA down to its first item (e.g. the Topic alone is too tall
  // for the space left), we give up and move the WHOLE ILO to the next page. Returns
  // the continuation row, or null to move the whole row down.
  function splitRowToFit(tr,limit){
    var tla=tr.querySelector('td[data-c="tla"]');
    if(!tla)return null;
    var orig=tr.cloneNode(true);
    var removed=0,g=0;
    while(tr.getBoundingClientRect().bottom>limit && unitCount(tla)>1 && g++<1500){
      if(popLastUnit(tla))removed++; else break;
    }
    if(removed===0 || tr.getBoundingClientRect().bottom>limit){
      // couldn't fit even with TLA trimmed — restore and move the whole row down
      while(tr.firstChild)tr.removeChild(tr.firstChild);
      while(orig.firstChild)tr.appendChild(orig.firstChild);
      return null;
    }
    // continuation carries only the leftover TLA items; all context stays on head
    var cont=orig.cloneNode(true);
    ['co','ilo','period','topic','assess','ref'].forEach(function(c){
      var cell=cont.querySelector('td[data-c="'+c+'"]'); if(cell)cell.innerHTML='';
    });
    var ctla=cont.querySelector('td[data-c="tla"]');
    if(ctla){ var g2=0; while(unitCount(ctla)>removed && g2++<3000){ if(!removeFirstUnit(ctla))break; } }
    return cont;
  }
  function repaginate(){
    try{
      var pages=Array.prototype.slice.call(document.querySelectorAll('.cov-pg'));
      if(pages.length<2){renumber();return;}
      // guard: only run when a REAL layout is available (skip in headless/no-layout)
      var probeTbl=pages[0].querySelector('table.cov-table');
      if(!probeTbl){renumber();return;}
      var avail=footLimit(pages[0])-probeTbl.getBoundingClientRect().top;
      if(!(avail>200)){renumber();return;}
      var firstTpl=pages[0];var contTpl=pages[1];
      var parent=firstTpl.parentNode;var anchor=pages[pages.length-1].nextSibling;
      // collect every atom row, in order
      var atomTrs=[];
      pages.forEach(function(pg){
        var tb=pg.querySelector('table.cov-table tbody');if(!tb)return;
        Array.prototype.slice.call(tb.children).forEach(function(tr){atomTrs.push(tr);});
      });
      if(!atomTrs.length){renumber();return;}
      function makePage(isFirst){
        var pg=(isFirst?firstTpl:contTpl).cloneNode(true);
        pg.className='page cov-pg page-break';
        var tb=pg.querySelector('table.cov-table tbody');
        while(tb.firstChild)tb.removeChild(tb.firstChild);
        return pg;
      }
      // remove originals; build fresh pages and fill each to the REAL footer line
      pages.forEach(function(p){if(p.parentNode)p.parentNode.removeChild(p);});
      var built=[];
      function newPageForRow(tr){
        addFiller(cur);            // top the finished page off to the shared line
        built.push(cur);
        cur=makePage(false);parent.insertBefore(cur,anchor);
        tb=cur.querySelector('table.cov-table tbody');limit=footLimit(cur);
        if(tr)tb.appendChild(tr);
      }
      var cur=makePage(true);parent.insertBefore(cur,anchor);
      var tb=cur.querySelector('table.cov-table tbody');
      var limit=footLimit(cur); // fixed designated line for this page
      var i=0,guard=0;
      while(i<atomTrs.length&&guard++<100000){
        var tr=atomTrs[i];
        tb.appendChild(tr);
        // measure the ACTUAL rendered bottom of this row (survives flex/clip)
        if(tb.children.length>1 && tr.getBoundingClientRect().bottom>limit){
          var cont=splitRowToFit(tr,limit);
          if(cont){
            atomTrs.splice(i+1,0,cont); // leftover continues on the next page
            newPageForRow(null);        // head fills this page
          }else{
            tb.removeChild(tr);
            newPageForRow(tr);          // whole row moves to a fresh page
          }
        }
        i++;
      }
      built.push(cur);
      renumber();
    }catch(e){try{renumber();}catch(_){ }}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(repaginate,0);});
  else setTimeout(repaginate,0);
})();
</script>`

  const FOOT = REPAG_SCRIPT + `</body></html>`

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

const alignmentHead = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { overflow: hidden; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; line-height: 1.35; overflow-wrap: break-word; word-break: normal; }
  .page { box-sizing: border-box; position: relative; display: flex; flex-direction: column; }
  .page > * { min-height: 0; flex-shrink: 1; flex-basis: auto; }
  @media screen {
    .page { background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.12); margin: 24px auto; width: 330mm; height: 216mm; overflow: hidden; padding: 42px 85px 32px 85px; page-break-after: always; }
  }
  @media print {
    html, body { overflow: visible; }
    .page { box-shadow: none; margin: 0; width: 330mm; height: 216mm; overflow: hidden; padding: 42px 85px 32px 85px; page-break-after: always; }
    table { page-break-inside: auto; }
    tr, td, th { page-break-inside: avoid; break-inside: avoid; }
    thead { display: table-header-group; }
    img { page-break-inside: avoid; }
  }
  @page { size: 330mm 216mm; margin: 0; }
  .page-break { page-break-after: always; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 2mm; }
  th, td { border: 1px solid #000; padding: 1mm 1.5mm; text-align: left; vertical-align: top; }
</style>
</head>
<body>`

const alignmentFoot = `</body></html>`

export function buildPoPeoHtml(logoBase64, programCode = 'BSIT', poData = null) {
  const prog = safe(programCode)
  const logo = logoBase64 || null
  if (!poData) {
    poData = [
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
  }
  const body = `<div class="page page-break">
    ${pageHeader(logo)}
    <table style="width:100%; border-collapse:collapse; font-family:Arial,Helvetica,sans-serif; font-size:9pt;">
      <tr>
        <td colspan="9" style="font-weight:700; border:1px solid #000; padding:3px 5px;">PROGRAM OUTCOMES (POs) AND ITS RELATIONSHIP TO PROGRAM EDUCATIONAL OBJECTIVES (PEOs)</td>
      </tr>
      <tr>
        <td colspan="3" style="font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">PEOs</td>
        <td colspan="2" style="font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">PROGRAM OUTCOMES (POs)</td>
        <td colspan="4" style="font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">GRADUATE ATTRIBUTES</td>
      </tr>
      <tr>
        <td style="width:34px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">1</td>
        <td style="width:34px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">2</td>
        <td style="width:34px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">3</td>
        <td colspan="2" style="border:1px solid #000; padding:2px 4px; text-align:left;">By the time of graduation, the students of the <strong>${prog}</strong> program shall have the ability to:</td>
        <td style="width:36px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">EC</td>
        <td style="width:36px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">CL</td>
        <td style="width:36px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">ERC</td>
        <td style="width:36px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">LL</td>
      </tr>
      ${poData.map((po, i) => `<tr>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.peos.includes(1) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.peos.includes(2) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.peos.includes(3) ? '&#x2714;' : ''}</td>
        <td style="width:52px; font-weight:700; border:1px solid #000; padding:2px 4px; text-align:center;">PO${i + 1}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:justify; overflow-wrap:break-word;">${po.text}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.gas.includes(1) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.gas.includes(2) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.gas.includes(3) ? '&#x2714;' : ''}</td>
        <td style="border:1px solid #000; padding:2px 4px; text-align:center;">${po.gas.includes(4) ? '&#x2714;' : ''}</td>
      </tr>`).join('\n      ')}
    </table>
    ${pageFooter(1, 1)}
  </div>`
  return alignmentHead + body + alignmentFoot
}

export function buildCoPoHtml(cos, courseCode, courseName, logoBase64) {
  const logo = logoBase64 || null
  const activeCols = activePoColumns(cos)
  const poCount = activeCols.length

  const coRows = cos.map(co => {
    const pm = co.poMappings || []
    return `<tr>
      <td style="border:1px solid #000; padding:3px 5px; vertical-align:top; font-size:8pt;">${safe(co.description)}</td>
      ${activeCols.map(i =>
        `<td style="border:1px solid #000; text-align:center; vertical-align:middle; font-size:8.5pt; padding:2px 1px;">${pm[i] || ''}</td>`
      ).join('\n        ')}
    </tr>`
  }).join('\n      ')
  const body = `<div class="page page-break">
    ${pageHeader(logo)}
    <div style="font-size:9pt; margin-bottom:4px;"><strong>Course:</strong> ${safe(courseCode)} — ${safe(courseName)}</div>
    <table style="width:100%; border-collapse:collapse; border:1px solid #000; font-size:8.5pt; color:#000;">
      <tr>
        <td colspan="${1 + poCount}" style="border:1px solid #000; padding:3px 6px; font-weight:bold; font-size:9pt; background:#f2f2f2;">
          COURSE OUTCOMES (COs) AND ITS RELATIONSHIP TO PROGRAM OUTCOMES (POs)
        </td>
      </tr>
      <tr>
        <td style="border:1px solid #000; padding:3px 5px; font-weight:bold; width:38%; vertical-align:middle; background:#f2f2f2;">
          After completion of the course, the student should be able to:
        </td>
        ${activeCols.map(i =>
          `<td style="border:1px solid #000; padding:2px; text-align:center; font-weight:bold; font-size:8.5pt; background:#f2f2f2;">${poLabels[i]}</td>`
        ).join('\n        ')}
      </tr>
      ${coRows}
    </table>
    ${pageFooter(1, 1)}
  </div>`
  return alignmentHead + body + alignmentFoot
}

export function buildCoaepHtml(coaepData, logoBase64) {
  const logo = logoBase64 || null
  const h = coaepData.header || {}
  const DEFAULT_TARGET = 'At least 90% of enrolled students with a rating of at least 60% of the total score'
  const target = (ilo) => safe(ilo.performanceTarget || coaepData.performanceTarget || DEFAULT_TARGET, DEFAULT_TARGET)

  // COAEP official form header (UNC-FM-VPAA-02) — distinct from the syllabus header
  const coaepHeader = `<table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:8px;">
    <tr>
      <td style="width:80px; min-width:80px; max-width:80px; padding:4px; border:1px solid #000; text-align:center; vertical-align:middle;">
        ${logo ? `<img src="${logo}" style="width:68px; height:68px;">` : ''}
      </td>
      <td style="text-align:center; vertical-align:middle; padding:6px; border:1px solid #000;">
        <div style="font-size:10.5pt; font-weight:bold; color:#000; line-height:1.35;">UNIVERSITY OF NUEVA CACERES</div>
        <div style="font-size:13pt; font-weight:bold; color:#000; line-height:1.35;">COURSE ASSESSMENT &amp; EVALUATION PLAN</div>
        <div style="font-size:10pt; font-weight:normal; color:#000; line-height:1.35;">Form</div>
        <div style="font-size:10pt; font-weight:bold; color:#000; line-height:1.35;">Office of the Vice President for Academic Affairs</div>
      </td>
      <td style="width:120px; min-width:120px; max-width:120px; padding:5px 8px; vertical-align:middle; border:1px solid #000;">
        <div style="font-size:9pt; font-weight:bold; color:#000;">Doc. Control No.:</div>
        <div style="font-size:9pt; font-weight:bold; color:#000;">UNC-FM-VPAA-02</div>
      </td>
    </tr>
  </table>`

  // Bigger, more readable table cells (9.5pt) — content is split across pages
  // (2 COs per page) so everything fits, including the Reminders block.
  const coBlock = (co, idx) => {
    const ilos = (co.ilos || []).length ? co.ilos : [{ outcome: '', assessmentTool: '' }]
    const firstRow = ilos[0]
    const rest = ilos.slice(1).map(ilo => `<tr>
      <td style="border:1px solid #000; padding:6px 7px; vertical-align:top; font-size:9.5pt; line-height:1.35;">${safe(ilo.outcome)}</td>
      <td style="border:1px solid #000; padding:6px 7px; vertical-align:top; font-size:9.5pt; line-height:1.35;">${safe(ilo.assessmentTool)}</td>
      <td style="border:1px solid #000; padding:6px 7px; vertical-align:top; font-size:9pt; line-height:1.35;">${target(ilo)}</td>
    </tr>`).join('\n      ')
    return `<tr>
      <td style="border:1px solid #000; padding:6px 4px; vertical-align:top; text-align:center; font-size:9.5pt; font-weight:bold;" rowspan="${ilos.length}">${idx + 1}</td>
      <td style="border:1px solid #000; padding:6px 7px; vertical-align:top; font-size:9.5pt; line-height:1.35;" rowspan="${ilos.length}">${safe(co.statement)}</td>
      <td style="border:1px solid #000; padding:6px 7px; vertical-align:top; font-size:9.5pt; line-height:1.35;">${safe(firstRow.outcome)}</td>
      <td style="border:1px solid #000; padding:6px 7px; vertical-align:top; font-size:9.5pt; line-height:1.35;">${safe(firstRow.assessmentTool)}</td>
      <td style="border:1px solid #000; padding:6px 7px; vertical-align:top; font-size:9pt; line-height:1.35;">${target(firstRow)}</td>
    </tr>${rest}`
  }

  const tableHead = `<tr>
        <th style="border:1px solid #000; padding:6px 3px; width:3%; font-size:9.5pt;"></th>
        <th style="border:1px solid #000; padding:6px 7px; width:21%; font-size:9.5pt;">Course Outcome Statement</th>
        <th style="border:1px solid #000; padding:6px 7px; width:29%; font-size:9.5pt;">Intended Learning Outcome</th>
        <th style="border:1px solid #000; padding:6px 7px; width:22%; font-size:9.5pt;">Assessment Tool</th>
        <th style="border:1px solid #000; padding:6px 7px; width:25%; font-size:9.5pt;">Performance Target</th>
      </tr>`

  const metaBlock = `<table style="width:100%; border-collapse:collapse; font-size:9.5pt; margin-bottom:8px;">
      <tr>
        <td style="white-space:nowrap; padding:2px 4px 2px 0; font-weight:bold;">Name of Faculty:</td>
        <td style="border-bottom:1px solid #000; padding:2px 4px; width:44%;">${safe(h.facultyName, '')}</td>
        <td style="width:14%;"></td>
        <td style="white-space:nowrap; padding:2px 4px 2px 0; font-weight:bold; text-align:right;">School Year</td>
        <td style="border-bottom:1px solid #000; padding:2px 4px; width:16%;">${safe(h.schoolYear, '')}</td>
      </tr>
      <tr>
        <td style="white-space:nowrap; padding:2px 4px 2px 0; font-weight:bold;">Course:</td>
        <td style="border-bottom:1px solid #000; padding:2px 4px;">${safe(h.course, '')}</td>
        <td></td>
        <td style="white-space:nowrap; padding:2px 4px 2px 0; font-weight:bold; text-align:right;">Semester</td>
        <td style="border-bottom:1px solid #000; padding:2px 4px;">${safe(h.semester, '')}</td>
      </tr>
    </table>`

  const reminders = safe(coaepData.reminders, 'This template should be accomplished for each course handled by the faculty.')
  const notes = safe(coaepData.notes, 'Course Outcomes and ILOs must be SMART; Each CO should be granularized into an introductory, enabling and demonstrative ILO; ILOs should NOT be teaching learning activities; Sample Performance target:  At least 70% of students with 60% proficiency or score 12 out of 20.')

  const signBlock = `<table style="width:100%; border-collapse:collapse; font-size:9.5pt; margin-top:14px;">
      <tr>
        <td style="white-space:nowrap; padding:2px 4px 2px 0; font-weight:bold; width:12%;">Prepared by:</td>
        <td style="border-bottom:1px solid #000; padding:2px 4px; width:34%;">${safe(coaepData.preparedBy, '')}</td>
        <td style="width:6%;"></td>
        <td style="white-space:nowrap; padding:2px 4px 2px 0; font-weight:bold; width:13%;">Approved by:</td>
        <td style="padding:2px 4px; width:35%; font-weight:bold;">${safe(coaepData.approvedBy, '')}</td>
      </tr>
      <tr>
        <td style="white-space:nowrap; padding:2px 4px 2px 0; font-weight:bold;">Date Submitted:</td>
        <td style="padding:2px 4px;">${safe(coaepData.dateSubmitted, '')}</td>
        <td></td>
        <td style="white-space:nowrap; padding:2px 4px 2px 0; font-weight:bold;">Date:</td>
        <td style="padding:2px 4px;">${safe(coaepData.approvalDate, '')}</td>
      </tr>
    </table>
    <div style="font-size:9pt; font-style:italic; margin-top:12px; line-height:1.45;">
      <span style="font-weight:bold;">Reminders:</span>&nbsp; ${reminders}<br>
      ${notes}
    </div>`

  // Split COs across pages: 2 per page keeps rows large and leaves room for
  // the signature + reminders block on the last page.
  const cos = coaepData.cos || []
  const COS_PER_PAGE = 2
  const chunks = []
  for (let i = 0; i < cos.length; i += COS_PER_PAGE) chunks.push(cos.slice(i, i + COS_PER_PAGE))
  if (chunks.length === 0) chunks.push([])
  const totalPages = chunks.length

  const body = chunks.map((chunk, pi) => {
    const rows = chunk.map((co, ci) => coBlock(co, pi * COS_PER_PAGE + ci)).join('\n      ')
    const isFirst = pi === 0
    const isLast = pi === totalPages - 1
    return `<div class="page">
    ${coaepHeader}
    ${isFirst ? metaBlock : ''}
    <table style="width:100%; border-collapse:collapse; font-size:9.5pt;">
      ${tableHead}
      ${rows}
    </table>
    ${isLast ? signBlock : ''}
    ${pageFooter(pi + 1, totalPages)}
  </div>`
  }).join('\n')

  return alignmentHead + body + alignmentFoot
}