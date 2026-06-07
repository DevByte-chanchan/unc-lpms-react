import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import ApprovalCoursesTable from "../components/ApprovalCoursesTable.jsx";
import RoleUploadPanel from "../components/RoleUploadPanel/RoleUploadPanel.jsx";
import { DocumentService } from "../services/documentService.js";
import uploadStyles from "../styles/UploadPages.module.sass";
import { useEffect, useState } from 'react';

const ProgramHead = () => {
  const uploadSlots = [
    { id: 'program_outcomes_peo_alignment', label: 'Program Outcome and PEO Alignment', acceptedTypes: '.pdf,.docx' },
    { id: 'coaep', label: 'COAEP', acceptedTypes: '.pdf,.docx' },
    { id: 'course_outcomes_po_alignment', label: 'Course Outcomes & PO Alignment', acceptedTypes: '.pdf,.docx' }
  ]

  const [uploads, setUploads] = useState({})
  const completedCount = Object.keys(uploads).length
  const totalCount = uploadSlots.length
  const allUploaded = completedCount === totalCount

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (!user.role) {
        localStorage.setItem('user', JSON.stringify({ ...user, role: 'program-head', name: 'DANILA, JUNAR' }))
      }
    } catch (e) {
      localStorage.setItem('user', JSON.stringify({ role: 'program-head', name: 'DANILA, JUNAR' }))
    }

    const all = DocumentService.getAllDocuments()
    setUploads(all['program-head'] || {})
  }, [])

  return (
    <SkeletonA
      header={<HeaderA role="Program Head" name="DANILA, JUNAR" />}
      nav={<SideNavigation mode="program-head" />}
      content={
        <div style={{ padding: 20, display: 'grid', gap: 16 }}>
          <ApprovalCoursesTable role="program-head" />

          <h2>Program Head - Document Uploads</h2>
          <p>Upload supporting documents for learning plan review.</p>
          <RoleUploadPanel role={'program-head'} courseCode={undefined} uploadSlots={uploadSlots} onUploadsChange={setUploads} />
          <p className={uploadStyles.subtleText}>{`${completedCount} of ${totalCount} documents uploaded`}</p>
          <div className={uploadStyles.bottomActions}>
            <button type="button" className={uploadStyles.btnOutline}>Save as Draft</button>
            <button type="button" className={uploadStyles.btnPrimary} disabled={!allUploaded}>Submit for Review</button>
          </div>
        </div>
      }
    />
  );
};

export default ProgramHead;
