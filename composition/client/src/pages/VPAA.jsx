import React, { useState, useMemo } from 'react'
import SkeletonA from '../layouts/SkeletonA.jsx'
import HeaderA from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import ApprovalCoursesTable from '../components/ApprovalCoursesTable.jsx'
import vpaaStyles from '../styles/VPAA.module.scss'
import tableStyles from '../styles/CoursesTable.module.sass'
import { Package, Layers, Calendar } from 'react-feather'
import { getWorkflow } from '../utils/workflowHelpers'
import { syllabiData } from '../data/syllabiData.js'

const VPAA = () => {
  const [tick, setTick] = useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(interval)
  }, [])

  const approvedCourses = useMemo(() => {
    return syllabiData.filter(s => getWorkflow(s.code).currentStage === 'approved')
  }, [tick])

  const stats = {
    total: approvedCourses.length,
    bySemester: { '1st': approvedCourses.length, '2nd': 0 }
  }

  return (
    <>
      <SkeletonA
        header={<HeaderA role="VPAA" name="GARCIA, CARLOS" />}
        nav={<SideNavigation mode="vpaa" />}
        content={
          <div className={vpaaStyles.container}>
            <ApprovalCoursesTable role="vpaa" />
          </div>
        }
      />
    </>
  )
}

export default VPAA
