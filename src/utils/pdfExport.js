import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const PAGE_WIDTH = 210
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const FOOTER_Y = 285
const PAGE_HEIGHT = 297

const FONT_BOLD = undefined
const FONT_NORMAL = undefined

const COLORS = {
  primary: [25, 40, 44],
  secondary: [55, 65, 81],
  text: [75, 85, 99],
  light: [156, 163, 175],
  accent: [0, 102, 204],
  background: [245, 247, 250],
  white: [255, 255, 255],
  tableHead: [25, 40, 44],
  tableHeadAlt: [55, 65, 81],
  signatureLine: [200, 200, 200]
}

const safeStr = (val) => {
  if (val === null || val === undefined) return '—'
  return String(val)
}

export const exportSyllabusToPDF = (syllabus, courseCode, workflow) => {
  if (!syllabus) return

  try {
    const doc = new jsPDF('p', 'mm', 'a4')
    let y = 0
    const pageCount = { current: 1 }

    const addPage = () => {
      doc.addPage()
      pageCount.current += 1
      y = 0
      addPageHeader(doc)
    }

    const checkPage = (offset = 30) => {
      if (y + offset > PAGE_HEIGHT - 30) {
        addPage()
      }
    }

    y = 15
    addPageHeader(doc)

    doc.setFontSize(18)
    doc.setFont(FONT_BOLD, 'bold')
    doc.setTextColor(...COLORS.primary)
    doc.text('UNIVERSITY OF NUEVA CACERES', PAGE_WIDTH / 2, y, { align: 'center' })
    y += 8

    doc.setFontSize(11)
    doc.setFont(FONT_NORMAL, 'normal')
    doc.setTextColor(...COLORS.secondary)
    doc.text('Learning Plan Submission Management System', PAGE_WIDTH / 2, y, { align: 'center' })
    y += 4

    doc.setFontSize(9)
    doc.setTextColor(...COLORS.light)
    doc.text('COURSE SYLLABUS', PAGE_WIDTH / 2, y, { align: 'center' })
    y += 10

    doc.setDrawColor(...COLORS.accent)
    doc.setLineWidth(1)
    doc.line(MARGIN, y - 2, PAGE_WIDTH - MARGIN, y - 2)
    y += 4

    doc.setFontSize(16)
    doc.setFont(FONT_BOLD, 'bold')
    doc.setTextColor(...COLORS.primary)
    doc.text(`${syllabus.course || syllabus.courseName || '—'} (${courseCode})`, PAGE_WIDTH / 2, y, { align: 'center' })
    y += 12

    addSectionTitle(doc, 'COURSE DETAILS')
    y = addField(doc, 'Course Code:', courseCode, y)
    y = addField(doc, 'Course Title:', syllabus.courseName || syllabus.course || '—', y)
    y = addField(doc, 'Semester:', syllabus.semester || syllabus.sem || '—', y)
    y = addField(doc, 'Instructor:', syllabus.instructor || '—', y)
    y = addField(doc, 'Department:', syllabus.department || '—', y)
    y = addField(doc, 'Credits:', syllabus.credits || '—', y)
    y = addField(doc, 'Prerequisites:', syllabus.prerequisites || 'None', y)
    y = addField(doc, 'Status:', 'Approved', y)

    y += 6

    if (syllabus.description) {
      addSectionTitle(doc, 'COURSE DESCRIPTION')
      checkPage(40)
      doc.setFontSize(9)
      doc.setFont(FONT_NORMAL, 'normal')
      doc.setTextColor(...COLORS.text)
      const lines = doc.splitTextToSize(syllabus.description, CONTENT_WIDTH)
      doc.text(lines, MARGIN, y)
      y += lines.length * 4.5 + 8
    }

    if (syllabus.courseOutcomes && syllabus.courseOutcomes.length > 0) {
      addSectionTitle(doc, 'COURSE & PROGRAM OUTCOME ALIGNMENT')
      checkPage(30)
      const coData = syllabus.courseOutcomes.map((co, i) => [
        i + 1,
        safeStr(co.description || co.id),
        (co.poAlignments || co.poMappings || [])
          .filter(Boolean)
          .map(p => typeof p === 'string' && p.trim() ? `PO${p}` : '')
          .filter(Boolean)
          .join(', ') || '—'
      ])
      doc.autoTable({
        startY: y,
        head: [['#', 'Course Outcome', 'PO Alignment']],
        body: coData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.tableHead, textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: MARGIN, right: MARGIN },
        tableWidth: CONTENT_WIDTH,
        didDrawPage: (data) => addPageHeader(doc, data)
      })
      y = doc.lastAutoTable.finalY + 8
    }

    if (syllabus.topics && syllabus.topics.length > 0) {
      addSectionTitle(doc, 'INTENDED LEARNING OUTCOME')
      for (const topic of syllabus.topics) {
        checkPage(40)
        doc.setFontSize(10)
        doc.setFont(FONT_BOLD, 'bold')
        doc.setTextColor(...COLORS.secondary)
        doc.text(`${topic.topicName || topic.name || topic.title || '—'}`, MARGIN + 4, y)
        y += 6

        if (topic.tlas && topic.tlas.length > 0) {
          const tlaData = topic.tlas.map(t => [
            safeStr(t.tlaName || t.activity),
            safeStr(t.assessmentMethod || '—'),
            safeStr(t.hours || '—')
          ])
          doc.autoTable({
            startY: y,
            head: [['Teaching & Learning Activity', 'Assessment Method', 'Hours']],
            body: tlaData,
            theme: 'grid',
            headStyles: { fillColor: COLORS.tableHeadAlt, textColor: 255, fontSize: 8, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8 },
            margin: { left: MARGIN + 8, right: MARGIN },
            tableWidth: CONTENT_WIDTH - 8,
            didDrawPage: (data) => addPageHeader(doc, data)
          })
          y = doc.lastAutoTable.finalY + 5
        }
      }
      y += 3
    }

    if (syllabus.ilos && syllabus.ilos.length > 0) {
      addSectionTitle(doc, 'INTENDED LEARNING OUTCOMES')
      checkPage(30)
      const iloData = syllabus.ilos.map((ilo, i) => [
        i + 1,
        safeStr(ilo.id),
        safeStr(ilo.description)
      ])
      doc.autoTable({
        startY: y,
        head: [['#', 'ILO ID', 'Description']],
        body: iloData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.tableHead, textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: MARGIN, right: MARGIN },
        tableWidth: CONTENT_WIDTH,
        didDrawPage: (data) => addPageHeader(doc, data)
      })
      y = doc.lastAutoTable.finalY + 8
    }

    if (syllabus.references && syllabus.references.length > 0) {
      addSectionTitle(doc, 'REFERENCES')
      checkPage(30)
      const refData = syllabus.references.map((r, i) => [
        i + 1,
        safeStr(r.title),
        safeStr(r.authors || '—'),
        safeStr(r.year || '—')
      ])
      doc.autoTable({
        startY: y,
        head: [['#', 'Title', 'Author(s)', 'Year']],
        body: refData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.tableHead, textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: MARGIN, right: MARGIN },
        tableWidth: CONTENT_WIDTH,
        didDrawPage: (data) => addPageHeader(doc, data)
      })
      y = doc.lastAutoTable.finalY + 8
    }

    if (syllabus.criteriaForGrading && syllabus.criteriaForGrading.length > 0) {
      addSectionTitle(doc, 'CRITERIA FOR GRADING')
      checkPage(30)
      const gradeData = syllabus.criteriaForGrading.map((c, i) => [
        i + 1,
        safeStr(c.component),
        safeStr(c.percentage || '—'),
        safeStr(c.description || '—')
      ])
      doc.autoTable({
        startY: y,
        head: [['#', 'Component', 'Percentage', 'Description']],
        body: gradeData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.tableHead, textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: MARGIN, right: MARGIN },
        tableWidth: CONTENT_WIDTH,
        didDrawPage: (data) => addPageHeader(doc, data)
      })
      y = doc.lastAutoTable.finalY + 8
    }

    if (workflow) {
      addSectionTitle(doc, 'APPROVAL HISTORY')
      checkPage(40)

      const approvalData = []
      const submittedAt = workflow.submittedAt
      if (submittedAt) {
        approvalData.push(['Submitted', 'Instructor', formatDate(submittedAt), '—'])
      }
      if (workflow.parallelReview) {
        const ld = workflow.parallelReview.library_director
        if (ld) {
          approvalData.push(['Library Director', ld.completedAt ? 'Approved' : ld.status, ld.completedAt ? formatDate(ld.completedAt) : '—', ld.completedAt ? '✓' : 'Pending'])
        }
        const ic = workflow.parallelReview.industry_consultant
        if (ic) {
          approvalData.push(['Industry Consultant', ic.completedAt ? 'Approved' : ic.status, ic.completedAt ? formatDate(ic.completedAt) : '—', ic.completedAt ? '✓' : 'Pending'])
        }
      }
      if (workflow.programHead) {
        approvalData.push(['Program Head', workflow.programHead.completedAt ? 'Approved' : workflow.programHead.status, workflow.programHead.completedAt ? formatDate(workflow.programHead.completedAt) : '—', workflow.programHead.completedAt ? '✓' : 'Pending'])
      }
      if (workflow.dean) {
        approvalData.push(['Dean', workflow.dean.completedAt ? 'Approved' : workflow.dean.status, workflow.dean.completedAt ? formatDate(workflow.dean.completedAt) : '—', workflow.dean.completedAt ? '✓' : 'Pending'])
      }
      approvalData.push(['OIC-OVPAA', '—', '—', '—'])

      doc.autoTable({
        startY: y,
        head: [['Stage', 'Status', 'Date Completed', 'Result']],
        body: approvalData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.tableHead, textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: MARGIN, right: MARGIN },
        tableWidth: CONTENT_WIDTH,
        didDrawPage: (data) => addPageHeader(doc, data)
      })
      y = doc.lastAutoTable.finalY + 12

      addSectionTitle(doc, 'SIGNATORIES')
      checkPage(50)
      y = addSignatureBlock(doc, 'Prepared by:', syllabus.instructor || '_____________', 'Instructor', y)
      y = addSignatureBlock(doc, 'Reviewed by:', '_____________', 'Program Head', y)
      y = addSignatureBlock(doc, 'Approved by:', '_____________', 'Dean', y)
      y = addSignatureBlock(doc, 'Noted by:', '_____________', 'OIC-OVPAA', y)
    }

    addFooter(doc, pageCount.current)

    doc.save(`SYLLABUS_${courseCode}_Approved.pdf`)
  } catch (error) {
    console.error('PDF generation failed:', error)
    throw new Error('Failed to generate PDF. Please try again.')
  }
}

function addPageHeader(doc) {
  doc.setFontSize(7)
  doc.setFont(FONT_NORMAL, 'normal')
  doc.setTextColor(...COLORS.light)
  doc.text('UNC-LPMS | Official Document', MARGIN, 8)
  doc.text(`Page ${doc.internal.getNumberOfPages()}`, PAGE_WIDTH - MARGIN, 8, { align: 'right' })

  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, 10, PAGE_WIDTH - MARGIN, 10)
}

function addFooter(doc, pageNum) {
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, FOOTER_Y - 5, PAGE_WIDTH - MARGIN, FOOTER_Y - 5)

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  doc.setFontSize(7)
  doc.setFont(FONT_NORMAL, 'normal')
  doc.setTextColor(...COLORS.light)
  doc.text(`Generated on ${today} via UNC-LPMS`, MARGIN, FOOTER_Y - 1)
  doc.text(`${pageNum}`, PAGE_WIDTH / 2, FOOTER_Y - 1, { align: 'center' })
}

function addSectionTitle(doc, title) {
  const yPos = doc.internal.pageSize.getHeight() - doc.internal.pageSize.getMargins().bottom
  if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
    if (doc.lastAutoTable.finalY > PAGE_HEIGHT - 50) {
      doc.addPage()
      addPageHeader(doc)
    }
  }
  const currentY = doc.lastAutoTable?.finalY || 20
  if (currentY > PAGE_HEIGHT - 40) {
    doc.addPage()
    addPageHeader(doc)
  }
  doc.setFontSize(12)
  doc.setFont(FONT_BOLD, 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(title, MARGIN, currentY + (currentY > 20 ? 0 : 0))
}

function addField(doc, label, value, y) {
  if (y > PAGE_HEIGHT - 30) { doc.addPage(); addPageHeader(doc); y = 20 }
  doc.setFontSize(9)
  doc.setFont(FONT_BOLD, 'bold')
  doc.setTextColor(...COLORS.secondary)
  doc.text(label, MARGIN, y)
  doc.setFont(FONT_NORMAL, 'normal')
  doc.setTextColor(...COLORS.text)
  doc.text(safeStr(value), MARGIN + 40, y)
  return y + 5.5
}

function addSignatureBlock(doc, title, name, role, y) {
  y += 2
  doc.setFontSize(9)
  doc.setFont(FONT_NORMAL, 'normal')
  doc.setTextColor(...COLORS.secondary)
  doc.text(title, MARGIN + 10, y)
  y += 12
  doc.setDrawColor(...COLORS.signatureLine)
  doc.setLineWidth(0.5)
  doc.line(MARGIN + 10, y, MARGIN + 90, y)
  y += 4
  doc.setFontSize(9)
  doc.setFont(FONT_BOLD, 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(name, MARGIN + 10, y)
  y += 4
  doc.setFontSize(8)
  doc.setFont(FONT_NORMAL, 'normal')
  doc.setTextColor(...COLORS.text)
  doc.text(role, MARGIN + 10, y)
  return y + 8
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  } catch {
    return dateStr
  }
}
