import React from 'react'
import SkeletonA from '../layouts/SkeletonA.jsx'
import HeaderA from '../components/HeaderA.jsx'
import SideNavigation from '../components/SideNavigation.jsx'
import ApprovalCoursesTable from '../components/ApprovalCoursesTable.jsx'
import vpaaStyles from '../styles/VPAA.module.scss'

const VPAA = () => {
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
