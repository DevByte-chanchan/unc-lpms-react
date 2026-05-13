import React from 'react'
import SkeletonA from "../layouts/SkeletonA.jsx"
import HeaderA from "../components/HeaderA.jsx"
import SideNavigation from "../components/SideNavigation.jsx"
import SyllabusRevisionsSections from "../components/SyllabusRevisionsSections.jsx"

const SyllabusRevisions = () => {
  return (
    <SkeletonA
      header={<HeaderA role="Instructor" name="NORTON, MONICA" />}
      content={<SyllabusRevisionsSections />}
      nav={<SideNavigation />}
    />
  )
}

export default SyllabusRevisions
