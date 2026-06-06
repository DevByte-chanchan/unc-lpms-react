import React, { useState } from 'react'
import { Download } from 'react-feather'
import { exportSyllabusToPDF } from '../utils/pdfExport'
import { getWorkflow } from '../utils/workflowHelpers'

const PdfExportButton = ({ syllabus, courseCode, label = 'Export to PDF', variant = 'primary', className = '', onExportStart, onExportComplete }) => {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  const handleExport = async () => {
    if (!syllabus || exporting) return

    setExporting(true)
    setError(null)
    if (onExportStart) onExportStart()

    try {
      const workflow = getWorkflow(courseCode || syllabus.code)
      await exportSyllabusToPDF(syllabus, courseCode || syllabus.code || 'Course', workflow)
      if (onExportComplete) onExportComplete(true)
    } catch (err) {
      const msg = err.message || 'Failed to export PDF'
      setError(msg)
      if (onExportComplete) onExportComplete(false, msg)
    } finally {
      setExporting(false)
    }
  }

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: exporting ? 'wait' : 'pointer',
    opacity: exporting ? 0.7 : 1,
    transition: 'all 0.2s ease',
    fontFamily: "'Poppins', sans-serif"
  }

  const variantStyles = {
    primary: { background: '#19282C', color: 'white' },
    success: { background: '#059669', color: 'white' },
    outline: { background: 'transparent', color: '#19282C', border: '2px solid #19282C' },
    approved: { background: '#19282C', color: 'white' }
  }

  const style = { ...baseStyle, ...(variantStyles[variant] || variantStyles.primary) }

  return (
    <button
      onClick={handleExport}
      disabled={exporting || !syllabus}
      style={style}
      className={className}
      title="Export syllabus as PDF"
    >
      {exporting ? (
        <>⌛ Exporting...</>
      ) : (
        <><Download size={16} /> {label}</>
      )}
    </button>
  )
}

export default PdfExportButton
